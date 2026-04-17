import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from '../src/models/Payment.js';

dotenv.config();

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI);
console.log('✅ Connected to MongoDB');

// Cashfree orders from screenshot
const cashfreeOrders = [
  { orderId: 'ORDER-1', cfOrderId: '5276841267', amount: 7122.15 },
  { orderId: 'payl-1', cfOrderId: '5264461010', amount: 14999.00 },
  { orderId: 'ORDER-2', cfOrderId: '5255616936', amount: 7122.15 },
  { orderId: 'ORDER-3', cfOrderId: '5253228165', amount: 100 },
  { orderId: 'ORDER-4', cfOrderId: '5253212309', amount: 100 },
  { orderId: 'ORDER-5', cfOrderId: '5253193862', amount: 3001.00 },
  { orderId: 'ORDER-6', cfOrderId: '5253187653', amount: 3001.00 },
  { orderId: 'ORDER-7', cfOrderId: '5253179585', amount: 3001.00 },
  { orderId: 'sub-1', cfOrderId: '5251133146', amount: 11099.00 },
  { orderId: 'ORDER-8', cfOrderId: '5246646307', amount: 3010.00 }
];

try {
  console.log('\n🔄 Seeding Cashfree orders...\n');
  
  let created = 0;
  let skipped = 0;
  
  for (const order of cashfreeOrders) {
    // Check if already exists
    const existing = await Payment.findOne({ orderId: order.orderId });
    
    if (existing) {
      console.log(`⏭️  Skipped (exists): ${order.orderId} | CF: ${order.cfOrderId} | ₹${order.amount}`);
      skipped++;
      continue;
    }
    
    // Create stub Payment record
    const payment = await Payment.create({
      paymentId: `STUB-${order.cfOrderId}`,
      accountId: '2600001', // superadmin account
      orderId: order.orderId,
      amount: order.amount,
      currency: 'INR',
      paymentGateway: 'cashfree',
      status: 'pending', // Will be updated on sync
      initiatedAt: new Date(),
      
      // Mark as stub so we know it's placeholder
      isStub: true,
      notes: 'Placeholder for Cashfree sync'
    });
    
    console.log(`✅ Created: ${order.orderId} | CF: ${order.cfOrderId} | ₹${order.amount}`);
    created++;
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${created + skipped}`);
  console.log(`\n✨ Now run: POST /api/admin/sync-cashfree to fetch real data\n`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB\n');
}
