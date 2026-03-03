/**
 * WhatsApp Connection Health Check Script
 * Verifies the entire WhatsApp workflow is functioning correctly
 * 
 * Run: node verify-whatsapp-health.js
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
const SAMPLE_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function checkAPIHealth() {
  log(colors.cyan, '\n🔍 CHECK 1: Basic API Health');
  try {
    const response = await axios.get(`${API_URL.replace('/api', '')}/health`);
    if (response.data.status === 'healthy') {
      log(colors.green, '✅ API is healthy');
      checks.passed.push('API Health');
    } else {
      log(colors.red, '❌ API returned unhealthy status');
      checks.failed.push('API Health');
    }
  } catch (error) {
    log(colors.red, '❌ Cannot reach API:', error.message);
    checks.failed.push('API Health');
    return false;
  }
  return true;
}

async function checkWhatsAppConnection() {
  log(colors.cyan, '\n🔍 CHECK 2: WhatsApp OAuth Connection');
  try {
    const response = await axios.get(`${API_URL}/integrations/whatsapp/status`, {
      headers: {
        'Authorization': `Bearer ${SAMPLE_TOKEN}`
      }
    });
    
    if (response.data.success) {
      if (response.data.connected) {
        log(colors.green, `✅ WhatsApp Connected`);
        log(colors.green, `   - WABA ID: ${response.data.wabaId}`);
        log(colors.green, `   - Business Name: ${response.data.businessName}`);
        log(colors.green, `   - Phone Numbers: ${response.data.phoneNumbers.length}`);
        
        checks.passed.push('WhatsApp Connection');
        
        // Check each phone
        response.data.phoneNumbers.forEach((phone, idx) => {
          log(colors.blue, `\n   📱 Phone ${idx + 1}:`);
          log(colors.blue, `      Display: ${phone.displayPhone}`);
          log(colors.blue, `      Name: ${phone.displayName}`);
          log(colors.blue, `      Quality Rating: ${phone.qualityRating}`);
          log(colors.blue, `      Active: ${phone.isActive ? '✅' : '❌'}`);
          log(colors.blue, `      Verified: ${phone.verifiedName}`);
        });
        
        return true;
      } else {
        log(colors.yellow, '⚠️  WhatsApp Not Connected - Need to authenticate');
        checks.warnings.push('WhatsApp Not Connected');
        return false;
      }
    }
  } catch (error) {
    log(colors.red, '❌ Error checking WhatsApp status:', error.response?.data?.message || error.message);
    checks.failed.push('WhatsApp Connection');
    return false;
  }
}

async function checkPhoneNumbers() {
  log(colors.cyan, '\n🔍 CHECK 3: Phone Numbers Setup');
  try {
    const response = await axios.get(`${API_URL}/integrations/phones`, {
      headers: {
        'Authorization': `Bearer ${SAMPLE_TOKEN}`
      }
    });
    
    if (response.data.success && response.data.phoneNumbers?.length > 0) {
      log(colors.green, `✅ ${response.data.phoneNumbers.length} phone number(s) found`);
      
      response.data.phoneNumbers.forEach((phone, idx) => {
        log(colors.blue, `\n   📱 Phone ${idx + 1}:`);
        log(colors.blue, `      ID: ${phone.phoneNumberId}`);
        log(colors.blue, `      Display: ${phone.displayPhone}`);
        log(colors.blue, `      Active: ${phone.isActive ? '✅' : '❌'}`);
        log(colors.blue, `      Quality: ${phone.qualityRating}`);
      });
      
      checks.passed.push('Phone Numbers');
      return true;
    } else {
      log(colors.yellow, '⚠️  No phone numbers configured');
      checks.warnings.push('Phone Numbers');
      return false;
    }
  } catch (error) {
    log(colors.red, '❌ Error fetching phone numbers:', error.message);
    checks.failed.push('Phone Numbers');
    return false;
  }
}

async function checkWebhook() {
  log(colors.cyan, '\n🔍 CHECK 4: Webhook Configuration');
  try {
    const response = await axios.get(`${API_URL}/settings/webhook-status`, {
      headers: {
        'Authorization': `Bearer ${SAMPLE_TOKEN}`
      }
    });
    
    if (response.data.success) {
      log(colors.green, `✅ Webhook Status: ${response.data.webhookStatus?.status || 'configured'}`);
      if (response.data.webhookUrl) {
        log(colors.green, `   - URL: ${response.data.webhookUrl}`);
      }
      checks.passed.push('Webhook');
      return true;
    }
  } catch (error) {
    log(colors.yellow, '⚠️  Webhook endpoint not available or not configured');
    checks.warnings.push('Webhook');
    return false;
  }
}

async function checkConversations() {
  log(colors.cyan, '\n🔍 CHECK 5: Conversations Data');
  try {
    const response = await axios.get(`${API_URL}/conversations`, {
      headers: {
        'Authorization': `Bearer ${SAMPLE_TOKEN}`
      }
    });
    
    if (response.data.success) {
      const count = response.data.conversations?.length || 0;
      log(colors.green, `✅ ${count} conversation(s) found`);
      
      if (count > 0) {
        log(colors.blue, `\n   Sample conversations:`);
        response.data.conversations.slice(0, 3).forEach((conv, idx) => {
          log(colors.blue, `   ${idx + 1}. ${conv.userPhone} - ${conv.lastMessagePreview?.substring(0, 50)}`);
        });
      }
      
      checks.passed.push('Conversations');
      return true;
    }
  } catch (error) {
    log(colors.yellow, '⚠️  Could not fetch conversations:', error.message);
    checks.warnings.push('Conversations');
    return false;
  }
}

async function checkDatabase() {
  log(colors.cyan, '\n🔍 CHECK 6: Database Connectivity');
  try {
    // Try to fetch any data that requires DB
    const response = await axios.get(`${API_URL}/conversations`, {
      headers: {
        'Authorization': `Bearer ${SAMPLE_TOKEN}`
      }
    });
    
    if (response.status === 200) {
      log(colors.green, '✅ Database connected and responding');
      checks.passed.push('Database');
      return true;
    }
  } catch (error) {
    log(colors.red, '❌ Database connectivity issue:', error.message);
    checks.failed.push('Database');
    return false;
  }
}

async function runAllChecks() {
  log(colors.cyan, '\n' + '='.repeat(60));
  log(colors.cyan, 'WhatsApp Connection Workflow Health Check');
  log(colors.cyan, '='.repeat(60));
  
  log(colors.blue, '\n📋 Prerequisites:');
  log(colors.blue, `   - API URL: ${API_URL}`);
  log(colors.blue, `   - Token: ${SAMPLE_TOKEN === 'YOUR_JWT_TOKEN_HERE' ? '❌ NOT SET' : '✅ Provided'}`);
  
  if (SAMPLE_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    log(colors.red, '\n❌ ERROR: Please set SAMPLE_TOKEN in this script!');
    log(colors.yellow, '   Update line 17 with your actual JWT token');
    return;
  }
  
  // Run checks
  await checkAPIHealth();
  const whatsappOk = await checkWhatsAppConnection();
  
  if (whatsappOk) {
    await checkPhoneNumbers();
    await checkWebhook();
  }
  
  await checkConversations();
  await checkDatabase();
  
  // Summary
  log(colors.cyan, '\n' + '='.repeat(60));
  log(colors.cyan, 'Summary');
  log(colors.cyan, '='.repeat(60));
  
  if (checks.passed.length > 0) {
    log(colors.green, `\n✅ Passed (${checks.passed.length}):`);
    checks.passed.forEach(check => log(colors.green, `   - ${check}`));
  }
  
  if (checks.warnings.length > 0) {
    log(colors.yellow, `\n⚠️  Warnings (${checks.warnings.length}):`);
    checks.warnings.forEach(check => log(colors.yellow, `   - ${check}`));
  }
  
  if (checks.failed.length > 0) {
    log(colors.red, `\n❌ Failed (${checks.failed.length}):`);
    checks.failed.forEach(check => log(colors.red, `   - ${check}`));
  }
  
  // Overall status
  log(colors.cyan, '\n' + '='.repeat(60));
  if (checks.failed.length === 0 && checks.warnings.length === 0) {
    log(colors.green, '🎉 ALL SYSTEMS GO! WhatsApp workflow is healthy');
  } else if (checks.failed.length === 0) {
    log(colors.yellow, '⚠️  Workflow is functional but some components need attention');
  } else {
    log(colors.red, '❌ Workflow has issues that need to be fixed');
  }
  log(colors.cyan, '='.repeat(60) + '\n');
}

runAllChecks().catch(error => {
  log(colors.red, '❌ Unexpected error:', error.message);
  process.exit(1);
});
