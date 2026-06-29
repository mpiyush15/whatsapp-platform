/**
 * REPLYSYS DATABASE SETUP SCRIPT
 * Run this to initialize proper tenant isolation schema
 * 
 * Usage:
 * node backend/scripts/setup-db-schema.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/replysys';

async function setupDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected!\n');

    const db = mongoose.connection.db;

    // ============================================
    // 1. CREATE ACCOUNTS COLLECTION
    // ============================================
    console.log('📝 Setting up accounts collection...');

    // Hash passwords
    const adminPass = await bcrypt.hash('admin123', 10);
    const replysysPass = await bcrypt.hash('replysys123', 10);
    const client1Pass = await bcrypt.hash('client123', 10);
    const client2Pass = await bcrypt.hash('client456', 10);
    const client3Pass = await bcrypt.hash('client789', 10);

    await db.collection('accounts').deleteMany({}); // Clear old data
    await db.collection('accounts').insertMany([
      {
        accountId: 'admin',
        type: 'internal',
        email: 'admin@replysys.com',
        name: 'ReplySQL Admin',
        password: adminPass,
        status: 'active',
        role: 'superadmin',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        accountId: '2600000',
        type: 'client',
        email: 'company@replysys.com',
        name: 'ReplySQL Company Account',
        companyName: 'ReplySQL',
        password: replysysPass,
        status: 'active',
        role: 'admin',
        plan: 'Enterprise',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        accountId: '2600001',
        type: 'client',
        email: 'admin@client1.com',
        name: 'Client 1 Admin',
        companyName: 'Client 1 Company',
        password: client1Pass,
        status: 'active',
        role: 'admin',
        plan: 'Pro',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        accountId: '2600002',
        type: 'client',
        email: 'admin@client2.com',
        name: 'Client 2 Admin',
        companyName: 'Client 2 Company',
        password: client2Pass,
        status: 'active',
        role: 'admin',
        plan: 'Starter',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        accountId: '2600003',
        type: 'client',
        email: 'admin@client3.com',
        name: 'Client 3 Admin',
        companyName: 'Client 3 Company',
        password: client3Pass,
        status: 'active',
        role: 'admin',
        plan: 'Free',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    console.log('✅ Accounts created: 1 superadmin + 4 clients\n');

    // ============================================
    // 2. ADD accountId TO EXISTING DATA
    // ============================================
    console.log('📝 Assigning accountId to existing contacts...');
    await db.collection('contacts').updateMany(
      { accountId: { $exists: false } },
      { $set: { accountId: '2600000' } }
    );
    console.log('✅ Contacts updated\n');

    console.log('📝 Assigning accountId to existing conversations...');
    await db.collection('conversations').updateMany(
      { accountId: { $exists: false } },
      { $set: { accountId: '2600000' } }
    );
    console.log('✅ Conversations updated\n');

    console.log('📝 Assigning accountId to existing broadcasts...');
    await db.collection('broadcasts').updateMany(
      { accountId: { $exists: false } },
      { $set: { accountId: '2600000' } }
    );
    console.log('✅ Broadcasts updated\n');

    // ============================================
    // 3. CREATE CUSTOMERS COLLECTION
    // ============================================
    console.log('📝 Creating customers collection...');
    await db.collection('customers').deleteMany({});
    await db.collection('customers').insertMany([
      {
        accountId: '2600000',
        companyName: 'ReplySQL',
        email: 'company@replysys.com',
        plan: 'Enterprise',
        status: 'active',
        monthlySpend: 0, // Self-use, no charge
        createdAt: new Date(),
        lastLogin: new Date()
      },
      {
        accountId: '2600001',
        companyName: 'Client 1 Company',
        email: 'admin@client1.com',
        plan: 'Pro',
        status: 'active',
        monthlySpend: 149.99,
        createdAt: new Date(),
        lastLogin: new Date()
      },
      {
        accountId: '2600002',
        companyName: 'Client 2 Company',
        email: 'admin@client2.com',
        plan: 'Starter',
        status: 'active',
        monthlySpend: 49.99,
        createdAt: new Date(),
        lastLogin: new Date()
      },
      {
        accountId: '2600003',
        companyName: 'Client 3 Company',
        email: 'admin@client3.com',
        plan: 'Free',
        status: 'active',
        monthlySpend: 0,
        createdAt: new Date(),
        lastLogin: new Date()
      }
    ]);
    console.log('✅ Customers created\n');

    // ============================================
    // 4. CREATE PLANS COLLECTION
    // ============================================
    console.log('📝 Creating plans collection...');
    await db.collection('plans').deleteMany({});
    await db.collection('plans').insertMany([
      {
        name: 'Free',
        price: 0,
        billing: 'monthly',
        features: {
          phoneNumbers: 1,
          contacts: 100,
          messagesPerMonth: 1000,
          agents: 1,
          broadcasts: 10,
          templates: 5,
          apiAccess: false,
          customDomain: false,
          emailSupport: false,
          phoneSupport: false
        }
      },
      {
        name: 'Starter',
        price: 49,
        billing: 'monthly',
        features: {
          phoneNumbers: 3,
          contacts: 1000,
          messagesPerMonth: 10000,
          agents: 3,
          broadcasts: 100,
          templates: 20,
          apiAccess: false,
          customDomain: false,
          emailSupport: true,
          phoneSupport: false
        }
      },
      {
        name: 'Pro',
        price: 149,
        billing: 'monthly',
        features: {
          phoneNumbers: 10,
          contacts: 10000,
          messagesPerMonth: 100000,
          agents: 10,
          broadcasts: 1000,
          templates: 100,
          apiAccess: true,
          customDomain: true,
          emailSupport: true,
          phoneSupport: true
        }
      },
      {
        name: 'Enterprise',
        price: 0, // Custom pricing
        billing: 'custom',
        features: {
          phoneNumbers: 'unlimited',
          contacts: 'unlimited',
          messagesPerMonth: 'unlimited',
          agents: 'unlimited',
          broadcasts: 'unlimited',
          templates: 'unlimited',
          apiAccess: true,
          customDomain: true,
          emailSupport: true,
          phoneSupport: true,
          dedicatedSupport: true
        }
      }
    ]);
    console.log('✅ Plans created\n');

    // ============================================
    // 5. CREATE SUBSCRIPTIONS COLLECTION
    // ============================================
    console.log('📝 Creating subscriptions collection...');
    await db.collection('subscriptions').deleteMany({});
    await db.collection('subscriptions').insertMany([
      {
        accountId: '2600000',
        planName: 'Enterprise',
        startDate: new Date(),
        renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'active',
        autoRenew: true,
        createdAt: new Date()
      },
      {
        accountId: '2600001',
        planName: 'Pro',
        startDate: new Date(),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        autoRenew: true,
        createdAt: new Date()
      },
      {
        accountId: '2600002',
        planName: 'Starter',
        startDate: new Date(),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        autoRenew: true,
        createdAt: new Date()
      },
      {
        accountId: '2600003',
        planName: 'Free',
        startDate: new Date(),
        renewalDate: null,
        status: 'active',
        autoRenew: false,
        createdAt: new Date()
      }
    ]);
    console.log('✅ Subscriptions created\n');

    // ============================================
    // 6. CREATE INDEXES FOR PERFORMANCE
    // ============================================
    console.log('📝 Creating database indexes...');
    await db.collection('contacts').createIndex({ accountId: 1 });
    await db.collection('conversations').createIndex({ accountId: 1 });
    await db.collection('broadcasts').createIndex({ accountId: 1 });
    await db.collection('messages').createIndex({ accountId: 1, conversationId: 1 });
    await db.collection('accounts').createIndex({ email: 1 });
    await db.collection('customers').createIndex({ accountId: 1 });
    await db.collection('subscriptions').createIndex({ accountId: 1, status: 1 });
    console.log('✅ Indexes created\n');

    console.log('✨ DATABASE SETUP COMPLETE!\n');
    console.log('📋 Summary:');
    console.log('  ✅ 5 accounts (1 superadmin + 4 clients)');
    console.log('  ✅ 4 customers');
    console.log('  ✅ 4 plans');
    console.log('  ✅ 4 subscriptions');
    console.log('  ✅ All data tagged with accountId');
    console.log('  ✅ Indexes created for performance\n');
    console.log('🔐 Tenant Isolation: READY\n');

    // Test login credentials
    console.log('🔑 Test Credentials:');
    console.log('  Superadmin: admin@replysys.com / admin123');
    console.log('  ReplySQL:   company@replysys.com / replysys123');
    console.log('  Client 1:   admin@client1.com / client123');
    console.log('  Client 2:   admin@client2.com / client456');
    console.log('  Client 3:   admin@client3.com / client789\n');

    await mongoose.connection.close();
    console.log('✅ Connection closed\n');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
