#!/usr/bin/env node
/**
 * Check Enromatics Conversations in MongoDB
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://pixelsagency:Pm02072023@pixelsagency.664wxw1.mongodb.net/pixelswhatsapp';

async function checkEnromatics() {
  try {
    console.log('\n🔌 Connecting to MongoDB Atlas...\n');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    const db = mongoose.connection.db;
    console.log('✅ Connected!\n');

    // Find Enromatics account
    console.log('📧 Finding Enromatics account...\n');
    const account = await db.collection('accounts').findOne({
      $or: [
        { email: { $regex: /enromatics/i } },
        { companyName: { $regex: /enromatics/i } }
      ]
    });

    if (!account) {
      console.log('❌ Enromatics account NOT FOUND\n');
      process.exit(1);
    }

    console.log('✅ Account found:');
    console.log(`   Email: ${account.email}`);
    console.log(`   Account ID: ${account.accountId || account._id}`);
    console.log(`   WABA ID: ${account.wabaId || '❌ NOT SET'}`);
    console.log(`   Phone Numbers: ${account.defaultWorkspaceId || 'N/A'}\n`);

    const accountId = account.accountId || account._id.toString();

    // Check conversations
    console.log('📭 Checking conversations for Enromatics...\n');
    
    const convCount = await db.collection('conversations').countDocuments({
      accountId: accountId
    });

    console.log(`Total conversations: ${convCount}\n`);

    if (convCount === 0) {
      console.log('⚠️  NO CONVERSATIONS FOUND FOR ENROMATICS\n');
      console.log('Possible reasons:');
      console.log('  1. No messages sent yet');
      console.log('  2. Webhook from Meta not received');
      console.log('  3. Phone number not configured');
      console.log('  4. WABA ID mismatch\n');

      // Check if phone numbers are configured
      const phones = await db.collection('phonenumbers').countDocuments({
        accountId: accountId
      });

      console.log(`Phone numbers configured: ${phones}`);

      if (phones === 0) {
        console.log('❌ NO PHONES CONFIGURED!\n');
        console.log('Actions needed:');
        console.log('  1. Go to Settings → WhatsApp Setup');
        console.log('  2. Click "Connect WhatsApp Account"');
        console.log('  3. Complete OAuth flow with Meta\n');
      }

      // Check messages
      const msgCount = await db.collection('messages').countDocuments({
        accountId: accountId
      });

      console.log(`Messages in database: ${msgCount}`);
      if (msgCount > 0) {
        console.log('⚠️  Messages exist but no conversations linked!\n');
      }

    } else {
      console.log('✅ CONVERSATIONS EXIST!\n');
      
      // Show sample
      const samples = await db.collection('conversations')
        .find({ accountId: accountId })
        .sort({ lastMessageAt: -1 })
        .limit(3)
        .toArray();

      console.log('Latest conversations:');
      samples.forEach((c, i) => {
        console.log(`  ${i+1}. ${c.userPhone} - Status: ${c.status}, Unread: ${c.unreadCount}`);
      });

      console.log('\n✅ Issue is NOT with database!');
      console.log('   Possible issue: JWT token decryption');
      console.log('   Action: Enromatics should LOGOUT and LOGIN again\n');
    }

    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

checkEnromatics();
