import axios from 'axios';
import PhoneNumber from '../models/PhoneNumber.js';
import Account from '../models/Account.js';
import ApiKey from '../models/ApiKey.js';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { broadcastPhoneStatusChange } from '../services/socketService.js';

/**
 * Settings Controller
 * Manages WhatsApp configurations, profile, API keys, and security
 */

/**
 * GET /api/settings/phone-numbers - Get all phone numbers for account
 */
export const getPhoneNumbers = async (req, res) => {
  try {
    // PhoneNumber collection stores accountId as String (Account.accountId e.g., "2600003")
    const accountId = req.account.accountId; // Use String accountId
    
    console.log('📱 [GET PHONE NUMBERS] Fetching status for account:');
    console.log('  req.account.accountId:', req.account.accountId);
    console.log('  req.account._id:', req.account._id);
    console.log('  accountId used for query:', accountId);
    console.log('  accountId type:', typeof accountId);
    console.log('  accountId value:', String(accountId));
    
    if (!accountId) {
      console.error('❌ NO ACCOUNT ID IN REQUEST!');
      return res.status(401).json({
        success: false,
        message: 'Account ID not found in request. Authentication failed.'
      });
    }
    
    // Get account info to return WABA/Business ID status
    const account = await Account.findOne({ accountId }).select('wabaId businessId metaSync');
    
    // Query using ObjectId accountId - PhoneNumber stores accountId as ObjectId
    const query = { accountId };
    console.log('  Query object:', JSON.stringify(query, null, 2));
    
    const phoneNumbers = await PhoneNumber.find(query)
      .select('-accessToken') // Don't expose token
      .sort({ isActive: -1, createdAt: -1 })
      .lean();
    
    console.log('✅ Found phone numbers:', phoneNumbers.length);
    
    // ✅ CRITICAL FIX: Ensure status fields are included in response
    const phoneNumbersWithStatus = phoneNumbers.map(phone => ({
      ...phone,
      // Ensure these fields are always present for UI
      isActive: phone.isActive ?? false,
      qualityRating: (phone.qualityRating || 'unknown').toLowerCase(),  // ✅ FIXED: Ensure lowercase
      displayPhoneNumber: phone.displayPhone || phone.phoneNumberId,  // ✅ FIXED: Use correct schema field
      lastTestedAt: phone.lastTestedAt || null,
      verifiedName: phone.verifiedName || 'Not verified',
      messageCount: {
        total: phone.messageCount?.total || 0,
        sent: phone.messageCount?.sent || 0,
        received: phone.messageCount?.received || 0
      }
    }));
    
    // Verbose logging disabled - uncomment for debugging
    // console.log('📊 Returning phone numbers with status:');
    // phoneNumbersWithStatus.forEach((p, i) => {
    //   console.log(`  [${i+1}] ${p.displayPhoneNumber} - Active: ${p.isActive}, Quality: ${p.qualityRating}`);
    // });
    
    // ✅ NEW: Include WABA connection status even if no phone numbers exist yet
    const wabaConnected = !!(account?.wabaId && account?.businessId);
    const syncStatus = account?.metaSync?.status || 'not_synced';
    
    res.json({
      success: true,
      phoneNumbers: phoneNumbersWithStatus,
      // ✅ NEW FIELDS: Account's WABA connection status
      wabaConnected,
      wabaId: account?.wabaId || null,
      businessId: account?.businessId || null,
      metaSyncStatus: syncStatus,
      message: wabaConnected && phoneNumbersWithStatus.length === 0 
        ? '✅ WhatsApp Business Account connected. Phone numbers will be fetched automatically. You can also manually add phone numbers below.' 
        : null
    });
    
  } catch (error) {
    console.error('❌ Get phone numbers error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/settings/phone-numbers - Add new phone number
 */
export const addPhoneNumber = async (req, res) => {
  try {
    const accountId = req.account?.accountId; // Use String accountId
    const { phoneNumberId, wabaId, accessToken, displayName, displayPhone, phone } = req.body;
    
    if (!phoneNumberId || !wabaId || !accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phoneNumberId, wabaId, accessToken'
      });
    }
    
    // ✅ FIXED: Use req.account.accountId (String) - matches PhoneNumber schema
    const stringAccountId = req.account.accountId;
    if (!stringAccountId) {
      return res.status(404).json({
        success: false,
        message: 'Account not found - authentication failed'
      });
    }
    
    // Check if phone number already exists FOR THIS ACCOUNT
    const existing = await PhoneNumber.findOne({ 
      accountId: stringAccountId,
      phoneNumberId
    });
    
    if (existing) {
      // ✅ AUTO-SYNC: Update existing record with latest data
      console.log('📱 Auto-syncing existing phone number...');
      existing.wabaId = wabaId;
      existing.accessToken = accessToken;
      existing.isConnected = true;
      existing.displayName = displayName || existing.displayName || 'WhatsApp Business';
      existing.displayPhone = displayPhone || phone || existing.displayPhone || phoneNumberId;
      existing.phone = phone || existing.phone;
      existing.syncedAt = new Date();
      await existing.save();
      
      return res.json({
        success: true,
        message: 'Phone number synced successfully',
        phoneNumber: existing,
        synced: true
      });
    }
    
    // Check if phone exists in another account (shouldn't happen after unique index fix)
    // But if it does, allow it - each account can have its own instance
    const existingInOtherAccount = await PhoneNumber.findOne({ 
      phoneNumberId,
      accountId: { $ne: stringAccountId }
    });
    
    if (existingInOtherAccount) {
      console.warn(`⚠️  Phone ${phoneNumberId} exists in another account, but allowing this account to add it`);
    }
    
    // Check if this is the first phone number for this account
    const count = await PhoneNumber.countDocuments({ 
      accountId: stringAccountId
    });
    const isFirst = count === 0;
    
    try {
      const phoneNumber = await PhoneNumber.create({
        accountId: stringAccountId,  // Store String accountId (e.g. 'eno_2600003')
        phoneNumberId,
        wabaId,
        accessToken,
        phone: phone || displayPhone || phoneNumberId,  // ✅ NEW: Store actual phone number
        displayName: displayName || 'WhatsApp Business',
        displayPhone: displayPhone || phoneNumberId,
        isActive: isFirst, // First phone number is active by default
        isConnected: true,  // ✅ NEW: Mark as connected immediately
        verifiedAt: new Date(),
        syncedAt: new Date()  // ✅ NEW: Track sync time
      });
      
      // ✅ NEW: Save wabaId to Account for webhook routing
      await Account.findOneAndUpdate(
        { accountId: stringAccountId },
        { $set: { wabaId } },
        { new: true }
      );
      console.log('✅ WABA ID saved to account for webhook routing:', wabaId);
      
      res.json({
        success: true,
        message: 'Phone number added successfully',
        phoneNumber: {
          _id: phoneNumber._id,
          phoneNumberId: phoneNumber.phoneNumberId,
          wabaId: phoneNumber.wabaId,
          displayName: phoneNumber.displayName,
          displayPhone: phoneNumber.displayPhone,
          isActive: phoneNumber.isActive
        }
      });
    } catch (createError) {
      // Handle E11000 duplicate key error
      if (createError.code === 11000) {
        const field = Object.keys(createError.keyPattern || {})[0];
        
        // If it's phoneNumberId, check if it's from this account
        if (field === 'phoneNumberId') {
          const duplicate = await PhoneNumber.findOne({ phoneNumberId });
          
          if (duplicate && duplicate.accountId.toString() === mongoAccountId.toString()) {
            return res.status(400).json({
              success: false,
              message: 'This phone number is already connected to your account',
              duplicateId: duplicate._id
            });
          } else {
            // Different account has it - try with a different strategy
            console.warn(`Attempting to handle cross-account duplicate: ${phoneNumberId}`);
            throw createError;
          }
        }
        
        throw createError;
      }
      
      throw createError;
    }
    
  } catch (error) {
    console.error('❌ Add phone number error:', error);
    
    // Better error messages
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(409).json({
        success: false,
        message: `This ${field} is already in use. Please try a different phone number.`,
        code: 'DUPLICATE_KEY',
        field
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add phone number'
    });
  }
};

/**
 * PUT /api/settings/phone-numbers/:id - Update phone number
 */
export const updatePhoneNumber = async (req, res) => {
  try {
    const accountId = req.account?.accountId; // Use String accountId
    const { id } = req.params;
    const { displayName, displayPhone, accessToken, isActive } = req.body;
    
    // ✅ CRITICAL: Validate ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number ID format'
      });
    }
    
    const phoneNumber = await PhoneNumber.findOne({ _id: id, accountId });
    
    if (!phoneNumber) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not found'
      });
    }
    
    // Update fields
    if (displayName !== undefined) phoneNumber.displayName = displayName;
    if (displayPhone !== undefined) phoneNumber.displayPhone = displayPhone;
    if (accessToken !== undefined) {
      phoneNumber.accessToken = accessToken;
      phoneNumber.tokenUpdatedAt = new Date();
    }
    
    // Handle isActive toggle
    if (isActive !== undefined && isActive === true) {
      // Deactivate all other phone numbers
      await PhoneNumber.updateMany(
        { accountId, _id: { $ne: id } },
        { isActive: false }
      );
      phoneNumber.isActive = true;
    } else if (isActive !== undefined) {
      phoneNumber.isActive = false;
    }
    
    await phoneNumber.save();
    
    res.json({
      success: true,
      message: 'Phone number updated successfully',
      phoneNumber: {
        _id: phoneNumber._id,
        phoneNumberId: phoneNumber.phoneNumberId,
        wabaId: phoneNumber.wabaId,
        displayName: phoneNumber.displayName,
        displayPhone: phoneNumber.displayPhone,
        isActive: phoneNumber.isActive
      }
    });
    
  } catch (error) {
    console.error('❌ Update phone number error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE /api/settings/phone-numbers/:id - Delete phone number
 */
export const deletePhoneNumber = async (req, res) => {
  try {
    const accountId = req.account?.accountId; // Use String accountId
    const { id } = req.params;
    
    // ✅ CRITICAL: Validate ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number ID format'
      });
    }
    
    const phoneNumber = await PhoneNumber.findOne({ _id: id, accountId });
    
    if (!phoneNumber) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not found'
      });
    }
    
    // Don't allow deleting the active phone number if it's the only one
    if (phoneNumber.isActive) {
      const count = await PhoneNumber.countDocuments({ accountId });
      if (count === 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the only active phone number. Add another one first.'
        });
      }
    }
    
    await phoneNumber.deleteOne();
    
    res.json({
      success: true,
      message: 'Phone number deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Delete phone number error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/settings/phone-numbers/:id/test - Test phone number connection
 * 
 * CRITICAL: Validates phone number is properly configured and ACTIVE
 */
export const testPhoneNumber = async (req, res) => {
  let phoneNumber;
  try {
    const accountId = req.account?.accountId; // Use String accountId
    const { id } = req.params;
    
    console.log('🧪 Testing phone number:', { id, accountId });
    
    // ✅ CRITICAL: Validate ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number ID format'
      });
    }
    
    // ✅ CRITICAL FIX: Fetch full phone config with access token
    phoneNumber = await PhoneNumber.findOne({ _id: id, accountId }).select('+accessToken');
    
    if (!phoneNumber) {
      console.error('❌ Phone number not found in DB');
      return res.status(404).json({
        success: false,
        message: 'Phone number not found',
        error: 'PHONE_NUMBER_NOT_FOUND'
      });
    }
    
    console.log('✅ Found phone number:', { 
      phoneNumberId: phoneNumber.phoneNumberId,
      isActive: phoneNumber.isActive,
      hasToken: !!phoneNumber.accessToken
    });
    
    // ✅ CRITICAL FIX: Verify access token exists and is valid
    if (!phoneNumber.accessToken) {
      console.error('❌ Access token is missing');
      return res.status(400).json({
        success: false,
        message: 'Access token is missing or invalid. Please reconnect your phone number.',
        error: 'MISSING_ACCESS_TOKEN'
      });
    }
    
    // ✅ CRITICAL FIX: Validate token format (should be alphanumeric, not include Bearer prefix)
    const token = phoneNumber.accessToken;
    
    // Check if token looks decrypted (should be a long alphanumeric string)
    // Real Meta tokens are typically 200+ characters
    // If it's short or contains colons, it's likely still encrypted (decryption failed)
    const isLikelyEncrypted = token.includes(':') || token.length < 50;
    
    if (!token || token.length < 10) {
      console.error('❌ Token is missing or too short:', token?.substring(0, 30) || 'null');
      return res.status(400).json({
        success: false,
        message: 'Access token is missing or invalid. Please reconnect your phone number.',
        error: 'INVALID_TOKEN_FORMAT'
      });
    }
    
    if (token.includes('Bearer ')) {
      console.error('❌ Token still has Bearer prefix (should not):', token.substring(0, 20));
      return res.status(400).json({
        success: false,
        message: 'Access token format is invalid. Please reconnect your phone number.',
        error: 'TOKEN_BEARER_PREFIX'
      });
    }
    
    if (isLikelyEncrypted) {
      console.error('❌ Token appears encrypted/corrupted:', token.substring(0, 30));
      return res.status(400).json({
        success: false,
        message: 'Access token could not be decrypted. Server configuration issue (JWT_SECRET mismatch). Please reconnect your phone number.',
        error: 'TOKEN_DECRYPTION_FAILED',
        hint: 'This usually means JWT_SECRET was changed. Re-add your phone number to fix this.'
      });
    }
    
    // Test connection to WhatsApp API
    const axios = (await import('axios')).default;
    const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';
    
    console.log('🚀 Calling Meta API:', {
      endpoint: `${GRAPH_API_URL}/${phoneNumber.phoneNumberId}`,
      tokenLength: token.length,
      tokenStarts: token.substring(0, 30)
    });
    
    const response = await axios.get(
      `${GRAPH_API_URL}/${phoneNumber.phoneNumberId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000 // 10 second timeout
      }
    );
    
    console.log('✅ Meta API response:', response.data);
    
    // ✅ CRITICAL FIX: Validate quality rating
    const qualityRating = response.data.quality_rating;
    const displayPhone = response.data.display_phone_number;
    
    if (!qualityRating) {
      console.warn('⚠️  Warning: Phone quality rating not shown. Phone may still be provisioning.');
    }
    
    // ✅ CRITICAL FIX: Update ALL status fields and ENSURE isActive is set
    phoneNumber.lastTestedAt = new Date();
    phoneNumber.displayPhone = displayPhone;  // ✅ FIXED: Use correct field name from schema
    phoneNumber.qualityRating = (qualityRating || 'yellow').toLowerCase();  // ✅ FIXED: Lowercase to match schema enum
    phoneNumber.verifiedName = response.data.verified_name || 'Not verified';  // ✅ FIXED: Better default
    phoneNumber.isActive = true;  // ✅ CRITICAL: Set to true if test passes
    
    // Save using the model (not .lean() to trigger hooks)
    const savedPhone = await phoneNumber.save();
    
    console.log('✅ Phone number test successful, config updated:', {
      phoneNumberId: savedPhone.phoneNumberId,
      isActive: savedPhone.isActive,
      qualityRating: savedPhone.qualityRating,
      lastTestedAt: savedPhone.lastTestedAt
    });
    
    // 🎯 CRITICAL FIX: Broadcast phone status change to frontend in real-time
    try {
      if (req.app && req.app.io && savedPhone) {
        broadcastPhoneStatusChange(req.app.io, accountId, savedPhone);
        console.log('📡 Phone status broadcast sent successfully');
      } else {
        console.warn('⚠️  Socket.io broadcast skipped:', {
          hasApp: !!req.app,
          hasIo: !!req.app?.io,
          hasSavedPhone: !!savedPhone
        });
      }
    } catch (broadcastError) {
      console.error('⚠️  Failed to broadcast phone status:', broadcastError?.message || String(broadcastError));
    }
    
    res.json({
      success: true,
      message: 'Connection test successful',
      error: null,
      details: {
        phoneNumberId: savedPhone.phoneNumberId,
        displayPhoneNumber: displayPhone,
        verifiedName: savedPhone.verifiedName,
        qualityRating: qualityRating || 'YELLOW (Provisioning)',
        status: 'ACTIVE',
        isActive: true,
        lastTestedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('❌ Test phone number error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      metaError: error.response?.data?.error
    });
    
    // ✅ CRITICAL FIX: Return detailed error information
    const metaError = error.response?.data?.error;
    const errorCode = metaError?.code || error.response?.status || error.code;
    const errorMessage = metaError?.message || error.message;
    
    let userMessage = 'Failed to test connection to WhatsApp API';
    let suggestion = '';
    let debugInfo = {};
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      userMessage = 'Connection timeout - backend cannot reach Meta API';
      suggestion = 'Check your internet connection and firewall settings.';
      debugInfo.timeout = true;
    } else if (errorCode === 400 || errorMessage?.includes('Invalid')) {
      userMessage = 'Phone Number ID is invalid or not found on Meta';
      suggestion = 'Verify your Phone Number ID is correct and exists in your Meta business account.';
    } else if (errorCode === 403 || errorMessage?.includes('Unauthorized') || errorMessage?.includes('Invalid OAuth')) {
      userMessage = 'Access token is invalid or expired';
      suggestion = 'Reconnect your WhatsApp account in Settings > Add Phone Number. Token may have expired.';
      debugInfo.tokenInvalid = true;
    } else if (errorCode === 404) {
      userMessage = 'Phone number not found in WhatsApp system';
      suggestion = 'Ensure this phone number is properly connected to your WhatsApp Business Account.';
    } else if (errorMessage?.includes('Network') || errorMessage?.includes('ENOTFOUND')) {
      userMessage = 'Cannot reach Meta API - network error';
      suggestion = 'Check your internet connection and firewall. Meta may be temporarily unavailable.';
      debugInfo.networkError = true;
    } else if (error.message.includes('jwt')) {
      userMessage = 'Token encryption/decryption error';
      suggestion = 'This is a server configuration issue. Contact support.';
      debugInfo.encryptionError = true;
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      message: userMessage,
      error: 'CONNECTION_TEST_FAILED',
      metaErrorCode: errorCode,
      details: {
        errorMessage,
        suggestion,
        action: 'Please verify your configuration and try again.',
        ...(Object.keys(debugInfo).length > 0 && { debugInfo })
      }
    });
  }
};

/**
 * GET /api/settings/profile - Get user profile
 */
export const getProfile = async (req, res) => {
  try {
    const accountId = req.account._id;
    
    console.log('📝 GET PROFILE - Fetching account:');
    console.log('  req.account._id:', accountId);
    console.log('  req.account.accountId:', req.account.accountId);
    
    const account = await Account.findById(accountId)
      .select('name email company phone timezone wabaId businessId subdomain metaSync')
      .lean();
    
    console.log('✅ Account found:', {
      _id: account?._id,
      accountId: account?.accountId,
      wabaId: account?.wabaId,
      businessId: account?.businessId,
      metaSyncStatus: account?.metaSync?.status
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    res.json({
      success: true,
      profile: account,
      whatsappConfig: {
        wabaId: account.wabaId || null,
        businessId: account.businessId || null,
        isConnected: !!(account.wabaId && account.businessId),
        subdomain: account.subdomain || null,
        metaSync: {
          isSynced: account.metaSync?.isSynced || false,
          lastWebhookAt: account.metaSync?.lastWebhookAt || null,
          metaStatus: account.metaSync?.metaStatus || 'unknown',
          hasWebhookData: !!(account.metaSync?.webhookData)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PUT /api/settings/profile - Update user profile
 */
export const updateProfile = async (req, res) => {
  try {
    const accountId = req.account._id;
    const { name, email, company, phone, timezone, wabaId, businessId } = req.body;
    
    const account = await Account.findById(accountId);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Update fields
    if (name) account.name = name;
    if (email) account.email = email;
    if (company !== undefined) account.company = company;
    if (phone !== undefined) account.phone = phone;
    if (timezone) account.timezone = timezone;
    
    // Update WhatsApp config if provided (typically set during OAuth, but allow manual override)
    if (wabaId !== undefined) {
      account.wabaId = wabaId || null;
      console.log('📝 Updated wabaId:', wabaId || 'cleared');
    }
    if (businessId !== undefined) {
      account.businessId = businessId || null;
      console.log('📝 Updated businessId:', businessId || 'cleared');
    }
    
    await account.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        name: account.name,
        email: account.email,
        company: account.company,
        phone: account.phone,
        timezone: account.timezone
      },
      whatsappConfig: {
        wabaId: account.wabaId || null,
        businessId: account.businessId || null,
        isConnected: !!(account.wabaId && account.businessId)
      }
    });
    
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/settings/api-keys - Get all API keys
 */
export const getApiKeys = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    
    const apiKeys = await ApiKey.find({ accountId })
      .select('name keyPrefix lastUsedAt createdAt expiresAt')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      apiKeys
    });
    
  } catch (error) {
    console.error('❌ Get API keys error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/settings/api-keys - Generate new API key
 */
export const generateApiKey = async (req, res) => {
  try {
    const accountId = req.account._id;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'API key name is required'
      });
    }
    
    // Generate API key
    const { apiKey, keyHash, keyPrefix } = ApiKey.generateApiKey();
    
    // Save to database
    const newApiKey = await ApiKey.create({
      accountId,
      name: name.trim(),
      keyHash,
      keyPrefix
    });
    
    res.json({
      success: true,
      message: 'API key generated successfully',
      apiKey, // Return plaintext key (ONLY TIME IT'S VISIBLE)
      keyData: {
        _id: newApiKey._id,
        name: newApiKey.name,
        keyPrefix: newApiKey.keyPrefix,
        createdAt: newApiKey.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ Generate API key error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE /api/settings/api-keys/:id - Delete API key
 */
export const deleteApiKey = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { id } = req.params;
    
    const apiKey = await ApiKey.findOne({ _id: id, accountId });
    
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }
    
    await apiKey.deleteOne();
    
    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Delete API key error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/settings/change-password - Change password
 */
export const changePassword = async (req, res) => {
  try {
    const accountId = req.account._id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }
    
    const account = await Account.findById(req.account._id).select('+password');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Verify current password
    if (account.password) {
      const bcrypt = (await import('bcrypt')).default;
      const isMatch = await bcrypt.compare(currentPassword, account.password);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    }
    
    // Hash and save new password
    const bcrypt = (await import('bcrypt')).default;
    account.password = await bcrypt.hash(newPassword, 10);
    await account.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /api/settings/phone-numbers/sync
 * Manually sync phone numbers from Meta API
 * Fallback if automatic sync during OAuth failed
 */
export const syncPhoneNumbersFromMeta = async (req, res) => {
  try {
    const accountId = req.account?.accountId;
    
    if (!accountId) {
      return res.status(401).json({
        success: false,
        message: 'Account ID not found. Authentication failed.'
      });
    }
    
    console.log('\n🔄 MANUAL PHONE NUMBER SYNC - Account:', accountId);
    
    // Get account details
    const account = await Account.findOne({ accountId });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Get WABA ID and access token
    const wabaId = account.wabaId;
    const accessToken = account.metaSync?.oauthAccessToken;
    
    if (!wabaId) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp Business Account (WABA ID) not found. Please reconnect WhatsApp OAuth first.'
      });
    }
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token not found. Please reconnect WhatsApp OAuth first.'
      });
    }
    
    console.log('WABA ID:', wabaId);
    console.log('Access Token:', accessToken ? '✅ Present' : '❌ Missing');
    
    try {
      // Fetch phone numbers from Meta API
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,phone_number,quality_rating,name_status,display_phone_number'
          }
        }
      );
      
      const phones = response.data?.data || [];
      console.log(`✅ Fetched ${phones.length} phone number(s) from Meta`);
      
      if (phones.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No phone numbers found in your WhatsApp Business Account on Meta.',
          hint: 'Please check your Meta Business Account and ensure you have phone numbers linked.'
        });
      }
      
      // Create or update PhoneNumber entries
      const createdPhones = [];
      const existingPhones = [];
      
      for (const phone of phones) {
        try {
          const phoneNumberId = phone.id;
          
          console.log(`\n  📱 Processing phone: ${phone.display_phone_number || phone.id}`);
          
          // Check if phone already exists
          const existing = await PhoneNumber.findOne({
            accountId,
            phoneNumberId
          });
          
          if (existing) {
            console.log(`     ⚠️ Phone already exists, skipping creation`);
            existingPhones.push(existing);
            continue;
          }
          
          // Create new PhoneNumber entry
          const phoneNumber = await PhoneNumber.create({
            accountId,
            phoneNumberId,
            wabaId,
            accessToken,
            displayPhone: phone.display_phone_number || phoneNumberId,
            displayName: phone.name || 'WhatsApp Business',
            qualityRating: (phone.quality_rating || 'unknown').toLowerCase(), // Meta returns uppercase
            verifiedName: phone.name_status || 'Not verified',
            isActive: createdPhones.length === 0, // First phone is active by default
            verifiedAt: new Date()
          });
          
          console.log(`     ✅ Phone number created: ${phoneNumber._id}`);
          createdPhones.push(phoneNumber);
        } catch (phoneError) {
          console.error(`     ❌ Error creating phone number:`, phoneError.message);
          // Continue with next phone
          continue;
        }
      }
      
      const totalAdded = createdPhones.length + existingPhones.length;
      
      return res.json({
        success: true,
        message: `Phone number sync complete! Found ${totalAdded} phone number(s).`,
        newPhones: createdPhones.length,
        existingPhones: existingPhones.length,
        phoneNumbers: [...createdPhones, ...existingPhones].map(p => ({
          _id: p._id,
          phoneNumberId: p.phoneNumberId,
          wabaId: p.wabaId,
          displayPhone: p.displayPhone,
          displayName: p.displayName,
          isActive: p.isActive,
          qualityRating: p.qualityRating,
          verifiedName: p.verifiedName
        }))
      });
      
    } catch (error) {
      console.error('❌ Error fetching from Meta API:', error.message);
      
      if (error.response?.data?.error) {
        const metaError = error.response.data.error;
        return res.status(400).json({
          success: false,
          message: 'Failed to fetch phone numbers from Meta',
          error: metaError.message,
          code: metaError.code
        });
      }
      
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
  } catch (error) {
    console.error('❌ Sync phone numbers error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
  getPhoneNumbers,
  addPhoneNumber,
  updatePhoneNumber,
  deletePhoneNumber,
  testPhoneNumber,
  getProfile,
  updateProfile,
  getApiKeys,
  generateApiKey,
  deleteApiKey,
  changePassword,
  syncPhoneNumbersFromMeta
};
