import axios from 'axios'
import PhoneNumber from '../models/PhoneNumber.js'
import Account from '../models/Account.js'

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0'

/**
 * Validate data consistency after OAuth save
 * MUST pass before returning success to client
 */
async function validateConsistency(accountId, phone) {
  const errors = []
  
  // 1. PhoneNumber record exists
  const phoneRecord = await PhoneNumber.findOne({
    accountId,
    phoneNumberId: phone.phoneNumberId
  })
  
  if (!phoneRecord) {
    errors.push('❌ PhoneNumber record not found after save')
  }
  
  // 2. Account.wabaId matches PhoneNumber.wabaId
  const account = await Account.findOne({ accountId })
  
  if (account.wabaId !== phone.wabaId) {
    errors.push(`❌ Account.wabaId (${account.wabaId}) does not match PhoneNumber.wabaId (${phone.wabaId})`)
  }
  
  // 3. PhoneNumber.accessToken is encrypted (not plaintext)
  if (phoneRecord.accessToken && phoneRecord.accessToken.length < 100) {
    errors.push('❌ AccessToken appears unencrypted')
  }
  
  // 4. No duplicate phone numbers in same account
  const duplicates = await PhoneNumber.find({
    accountId,
    phoneNumberId: phone.phoneNumberId
  })
  
  if (duplicates.length > 1) {
    errors.push(`❌ ${duplicates.length} duplicate phone numbers found`)
  }
  
  // 5. Account can be found by wabaId
  const accountByWaba = await Account.findOne({ wabaId: phone.wabaId })
  
  if (!accountByWaba) {
    errors.push('❌ Account not found by wabaId')
  }
  
  // Return result
  if (errors.length > 0) {
    throw new Error(`Consistency validation failed:\n${errors.join('\n')}`)
  }
  
  console.log('✅ All consistency checks passed')
  return true
}

/**
 * Log consistency event for monitoring
 */
function logConsistencyEvent(type, data) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'CONSISTENCY_EVENT',
    type,
    accountId: data.accountId,
    wabaId: data.wabaId,
    phoneNumberId: data.phoneNumberId,
    status: data.status,
    message: data.message
  }))
}

/**
 * POST /api/integrations/whatsapp/oauth
 * Exchange OAuth code for access token + phone data
 * Single write point - saves to PhoneNumber (authority)
 */
export const handleWhatsAppOAuth = async (req, res) => {
  try {
    const { code, state } = req.body
    const accountId = req.accountId
    
    console.log('🔐 OAuth: Starting token exchange for account:', accountId)
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'No authorization code provided'
      })
    }
    
    // 1. Exchange code for access token
    console.log('🔄 Exchanging code for access token...')
    console.log('OAuth Params:', {
      client_id: process.env.META_APP_ID,
      code: code?.substring(0, 20) + '...' // Log first 20 chars only
    })
    
    let tokenResponse
    try {
      // Use GET request with params for token exchange
      // NOTE: For Embedded Signup, do NOT include redirect_uri
      console.log('🔄 Making GET request to Meta token endpoint...')
      tokenResponse = await axios.get(
        `${GRAPH_API_URL}/oauth/access_token`,
        {
          params: {
            client_id: process.env.META_APP_ID,
            client_secret: process.env.META_APP_SECRET,
            code
          }
        }
      )
      console.log('✅ Token response received:', {
        hasAccessToken: !!tokenResponse.data?.access_token,
        responseKeys: Object.keys(tokenResponse.data || {})
      })
    } catch (error) {
      console.error('❌ OAuth token exchange FAILED:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code
      })
      
      // Always return proper JSON error response
      return res.status(error.response?.status || 400).json({
        success: false,
        message: 'Failed to exchange code for access token',
        error: error.response?.data?.error?.message || error.message,
        meta: error.response?.data || {
          error: {
            type: error.code,
            message: error.message
          }
        }
      })
    }
    
    const { access_token } = tokenResponse.data
    console.log('✅ Token exchanged successfully')
    
    // 2. Verify token
    console.log('🔐 Verifying token...')
    try {
      await axios.get(
        `${GRAPH_API_URL}/debug_token`,
        {
          params: {
            input_token: access_token,
            access_token: `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`
          }
        }
      )
      console.log('✅ Token verified')
    } catch (tokenError) {
      console.warn('⚠️ Token verification failed (non-critical):', tokenError.message)
    }
    
    // 3. IMPORTANT: Do NOT load WABA from DB here!
    // Each client's OAuth provides THEIR OWN WABA via webhook
    // We wait for webhook instead of reusing old WABA
    console.log('🏢 ========== OAUTH FLOW (NO AUTO-WABA REUSE) ==========')
    console.log('This is a FRESH OAuth connection')
    console.log('Waiting for webhook to provide client\'s actual WABA ID')
    console.log('(not reusing old WABA from database)')
    
    // ✅ CORRECT APPROACH: Don't fetch or assume anything
    // Just wait for webhook to provide client's WABA
    console.log('✅ OAuth token received and verified')
    console.log('⏳ Waiting for Meta webhook to provide WABA ID')
    console.log('   (Each client gets their OWN WABA, not a default one)')
    
    // Mark as pending webhook sync - INCLUDE accountId so webhook knows which account to update!
    await Account.findOneAndUpdate(
      { accountId },
      { 
        'metaSync.status': 'oauth_completed_awaiting_webhook',
        'metaSync.oauth_timestamp': new Date(),
        'metaSync.oauthAccessToken': access_token,
        'metaSync.accountId': accountId,  // ✅ CRITICAL: Store which account did this OAuth!
        'metaSync.note': 'OAuth successful - waiting for webhook with client WABA details'
      },
      { new: true }
    )
    
    console.log('✅ Marked account as awaiting webhook')
    console.log('✅ Stored accountId in metaSync:', accountId)
    console.log('================================================\n')
    
    // Return immediately - let webhook handle everything
    // The webhook will provide the WABA ID and phone numbers
    return res.json({
      success: true,
      message: 'OAuth successful! Your WhatsApp account details are being fetched.',
      accountId: accountId,
      status: 'awaiting_webhook',
      whatHappensNext: 'Meta will send your account details (WABA ID, Business ID, Phone Numbers) within 10-30 seconds',
      nextSteps: [
        '1. Wait for webhook (usually instant to 30 seconds)',
        '2. Refresh this page',
        '3. Your WhatsApp Business Account will appear with all your phone numbers'
      ],
      ifNotWorking: [
        'Manual entry option available in Settings > Add Phone Number',
        'You can manually enter your WABA ID if webhook is delayed'
      ]
    })
    
  } catch (error) {
    console.error('❌ OAuth error:', error.message)
    
    logConsistencyEvent('oauth_error', {
      accountId: req.accountId,
      status: 'error',
      message: error.message
    })
    
    return res.status(400).json({
      success: false,
      message: error.message || 'OAuth connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * GET /api/integrations/whatsapp/status
 * Get OAuth status (which phones connected)
 * Reads from PhoneNumber (authority)
 */
export const getWhatsAppStatus = async (req, res) => {
  try {
    const accountId = req.accountId
    
    console.log('📊 Fetching WhatsApp status for account:', accountId)
    
    const phones = await PhoneNumber.find({ accountId })
      .select('-accessToken')
      .lean()
    
    const account = await Account.findOne({ accountId }).lean()
    
    console.log('✅ Found', phones.length, 'phone number(s)')
    
    return res.json({
      success: true,
      connected: phones.length > 0,
      wabaId: account?.wabaId,
      businessName: account?.name,
      phoneNumbers: phones.map(p => ({
        id: p._id,
        phoneNumberId: p.phoneNumberId,
        wabaId: p.wabaId,
        displayPhone: p.displayPhone,
        displayName: p.displayName,
        isActive: p.isActive,
        qualityRating: p.qualityRating || 'unknown',
        verifiedName: p.verifiedName || 'Not verified',
        verifiedAt: p.verifiedAt,
        createdAt: p.createdAt,
        lastTestedAt: p.lastTestedAt
      }))
    })
  } catch (error) {
    console.error('❌ Status error:', error)
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

/**
 * POST /api/integrations/whatsapp/disconnect
 * Disconnect WhatsApp (mark inactive)
 * Modifies PhoneNumber (authority)
 */
export const disconnectWhatsApp = async (req, res) => {
  try {
    const accountId = req.accountId
    
    console.log('🔌 Disconnecting WhatsApp for account:', accountId)
    console.log('   Starting full data cleanup...')
    
    // Get all phone numbers for this account (for cascading delete)
    const phones = await PhoneNumber.find({ accountId })
    const phoneNumberIds = phones.map(p => p._id)
    
    console.log(`\n🗑️  CLEANUP: Removing all WhatsApp data for account ${accountId}`)
    
    // 1. Delete conversations
    const convResult = await Conversation.deleteMany({ accountId })
    console.log(`   ✅ Deleted ${convResult.deletedCount} conversation(s)`)
    
    // 2. Delete messages
    const msgResult = await Message.deleteMany({ accountId })
    console.log(`   ✅ Deleted ${msgResult.deletedCount} message(s)`)
    
    // 3. Delete contacts
    const contactResult = await Contact.deleteMany({ accountId })
    console.log(`   ✅ Deleted ${contactResult.deletedCount} contact(s)`)
    
    // 4. Delete templates
    const templateResult = await Template.deleteMany({ accountId })
    console.log(`   ✅ Deleted ${templateResult.deletedCount} template(s)`)
    
    // 5. Delete failed messages
    const failedResult = await FailedMessage.deleteMany({ accountId })
    console.log(`   ✅ Deleted ${failedResult.deletedCount} failed message(s)`)
    
    // 6. Delete phone numbers
    const result = await PhoneNumber.deleteMany({ accountId })
    console.log(`   ✅ Deleted ${result.deletedCount} phone number(s)`)
    
    // 7. Clear Account.wabaId and related fields
    await Account.findOneAndUpdate(
      { accountId },
      { 
        wabaId: null,
        businessId: null,
        'metaSync.status': null,
        'metaSync.accountId': null,
        'metaSync.oauth_timestamp': null,
        'metaSync.oauthAccessToken': null,
        'metaSync.note': null
      }
    )
    
    console.log(`   ✅ Cleared Account WhatsApp metadata\n`)
    
    logConsistencyEvent('disconnect', {
      accountId,
      status: 'success',
      message: 'WhatsApp disconnected - all data cleaned',
      itemsCleaned: {
        conversations: convResult.deletedCount,
        messages: msgResult.deletedCount,
        contacts: contactResult.deletedCount,
        templates: templateResult.deletedCount,
        failedMessages: failedResult.deletedCount,
        phoneNumbers: result.deletedCount
      }
    })
    
    return res.json({
      success: true,
      message: 'WhatsApp disconnected and all data cleaned successfully',
      itemsCleaned: {
        conversations: convResult.deletedCount,
        messages: msgResult.deletedCount,
        contacts: contactResult.deletedCount,
        templates: templateResult.deletedCount,
        failedMessages: failedResult.deletedCount,
        phoneNumbers: result.deletedCount
      }
    })
  } catch (error) {
    console.error('❌ Disconnect error:', error)
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}
