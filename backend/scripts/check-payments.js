import mongoose from 'mongoose';
import Payment from '../src/models/Payment.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkPayments() {
  try {
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/replysys';
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Query all payments
    const allPayments = await Payment.find().lean();
    console.log(`📊 Total payments in DB: ${allPayments.length}\n`);

    // Query Cashfree payments specifically
    const cashfreePayments = await Payment.find({ paymentGateway: 'cashfree' }).lean();
    console.log(`🔥 Cashfree payments: ${cashfreePayments.length}\n`);

    if (cashfreePayments.length > 0) {
      console.log('📋 Cashfree Payments Details:');
      console.log('='.repeat(80));
      cashfreePayments.forEach((payment, idx) => {
        console.log(`\n[Payment ${idx + 1}]`);
        console.log(`  📌 Payment ID: ${payment.paymentId}`);
        console.log(`  🆔 Order ID: ${payment.orderId}`);
        console.log(`  💰 Amount: ₹${payment.amount} ${payment.currency}`);
        console.log(`  👤 Account ID: ${payment.accountId}`);
        console.log(`  ✅ Status: ${payment.status}`);
        console.log(`  🏦 Payment Method: ${payment.paymentMethod?.type || 'N/A'}`);
        console.log(`  🎫 Gateway Order ID: ${payment.gatewayOrderId || 'N/A'}`);
        console.log(`  🔑 Gateway Transaction ID: ${payment.gatewayTransactionId || 'N/A'}`);
        console.log(`  📅 Created At: ${payment.createdAt}`);
        console.log(`  📅 Completed At: ${payment.completedAt || 'N/A'}`);
      });
    } else {
      console.log('⚠️ No Cashfree payments found in database');
    }

    // Show all payment gateways
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Breakdown by Gateway:');
    const gateways = await Payment.aggregate([
      {
        $group: {
          _id: '$paymentGateway',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    gateways.forEach(g => {
      console.log(`  ${g._id}: ${g.count} payments | Total: ₹${g.totalAmount}`);
    });

    console.log('\n✅ Check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPayments();
