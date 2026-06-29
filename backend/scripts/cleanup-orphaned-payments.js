import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupOrphanedPayments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get all invoices
    const invoices = await db.collection('invoices').find({}).toArray();
    const validOrderIds = invoices.map(inv => inv.orderId);

    console.log(`\n🔍 Valid Order IDs from Invoices:`);
    validOrderIds.forEach(id => console.log(`  - ${id}`));

    // Get all payments
    const payments = await db.collection('payments').find({}).toArray();
    console.log(`\n💳 All Payments (${payments.length}):`);
    payments.forEach(p => {
      const isValid = validOrderIds.includes(p.orderId);
      console.log(`  ${isValid ? '✅' : '❌'} ₹${p.amount} (Status: ${p.status}, OrderID: ${p.orderId})`);
    });

    // Find orphaned payments (no matching invoice)
    const orphanedPayments = payments.filter(p => !validOrderIds.includes(p.orderId));
    console.log(`\n⚠️  Found ${orphanedPayments.length} orphaned payments (no matching invoice)`);

    if (orphanedPayments.length > 0) {
      console.log('\n🗑️ Deleting orphaned payments...');
      for (const payment of orphanedPayments) {
        console.log(`  - Deleting ₹${payment.amount} (OrderID: ${payment.orderId})`);
        await db.collection('payments').deleteOne({ _id: payment._id });
      }
    }

    // Final summary
    const remainingPayments = await db.collection('payments').find({}).toArray();
    console.log(`\n✅ Final Payment Summary:`);
    console.log(`  - Total Valid Payments: ${remainingPayments.length}`);
    
    let totalCompleted = 0;
    remainingPayments.forEach(p => {
      if (p.status === 'completed') totalCompleted += p.amount;
    });

    console.log(`  - Completed Payments: ₹${totalCompleted}`);
    console.log(`  - All payments now matched to invoices ✅`);

    // Verify totals match
    const totalBilled = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    console.log(`\n📊 Verification:`);
    console.log(`  - Total Billed (from invoices): ₹${totalBilled}`);
    console.log(`  - Completed Payments: ₹${totalCompleted}`);
    console.log(`  - Match: ${totalBilled === totalCompleted ? '✅ YES' : '❌ NO'}`);

    await mongoose.connection.close();
    console.log('\n✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupOrphanedPayments();
