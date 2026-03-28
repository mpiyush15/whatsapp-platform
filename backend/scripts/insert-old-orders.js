import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from '../src/models/Payment.js';

dotenv.config();

async function insertOldOrders() {
  try {
    const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/replysys';
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Old orders from your Cashfree dashboard
    const oldOrders = [
      {
        orderId: 'ORDER_STARTER_1769848473_...',
        amount: 712.15,
        status: 'pending',
        paymentGateway: 'cashfree',
        accountId: '2600001',
        description: 'Pixels WhatsApp Business Platform - Starter Subscription'
      },
      {
        orderId: 'ORDER_STARTER_1769848484_...',
        amount: 712.15,
        status: 'pending',
        paymentGateway: 'cashfree',
        accountId: '2600001',
        description: 'Pixels WhatsApp Business Platform - Starter Subscription'
      },
      {
        orderId: 'ORDER_PRO_176...',
        amount: 100.00,
        status: 'pending',
        paymentGateway: 'cashfree',
        accountId: '2600001',
        description: 'Pixels WhatsApp Business Platform - Pro Subscription'
      },
      {
        orderId: 'ORDER_STARTER_1769447135_...',
        amount: 3010.00,
        status: 'pending',
        paymentGateway: 'cashfree',
        accountId: '2600001',
        description: 'Pixels WhatsApp Business Platform - Starter Subscription'
      }
    ];

    console.log('📝 Inserting old orders into Payment collection...\n');

    for (const order of oldOrders) {
      // Generate unique paymentId
      const paymentId = `CF-${order.orderId}`;

      const paymentDoc = {
        paymentId: paymentId,
        orderId: order.orderId,
        amount: order.amount,
        currency: 'INR',
        status: order.status,
        paymentGateway: order.paymentGateway,
        accountId: order.accountId,
        initiatedAt: new Date(),
        createdAt: new Date()
      };

      try {
        const result = await Payment.findOneAndUpdate(
          { orderId: order.orderId },
          paymentDoc,
          { upsert: true, new: true }
        );
        console.log(`✅ Inserted/Updated: ${order.orderId}`);
        console.log(`   Amount: ₹${order.amount}`);
        console.log(`   Payment ID: ${paymentId}\n`);
      } catch (err) {
        console.error(`❌ Error inserting ${order.orderId}:`, err.message);
      }
    }

    // Verify insertion
    console.log('\n📊 Verification - Checking Payment collection...');
    const count = await Payment.countDocuments({ paymentGateway: 'cashfree' });
    console.log(`✅ Total Cashfree payments in DB: ${count}`);

    const payments = await Payment.find({ paymentGateway: 'cashfree' }).select('orderId amount status');
    console.log('\n📋 Inserted Orders:');
    payments.forEach(p => {
      console.log(`   - ${p.orderId}: ₹${p.amount} (${p.status})`);
    });

    console.log('\n✅ DONE! Now go to test-data page and click "🔄 Sync Cashfree"');
    console.log('   This will fetch all live data from Cashfree API 🚀\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

insertOldOrders();
