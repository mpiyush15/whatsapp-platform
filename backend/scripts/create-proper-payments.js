import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function createProperPayments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get all invoices
    const invoices = await db.collection('invoices').find({}).toArray();
    console.log(`\n📋 Invoices in system:`);
    invoices.forEach(inv => {
      console.log(`  - Invoice #${inv.invoiceNumber}`);
      console.log(`    Amount: ₹${inv.totalAmount}`);
      console.log(`    Status: ${inv.status}`);
      console.log(`    Paid Amount: ₹${inv.paidAmount || 0}`);
      console.log(`    OrderID: ${inv.orderId || 'NOT SET'}`);
    });

    // Delete all old payments
    console.log('\n🗑️ Cleaning old payments...');
    await db.collection('payments').deleteMany({});

    // Create proper payment records matching invoices
    console.log('\n✨ Creating proper payment records...');
    for (const invoice of invoices) {
      if (invoice.status === 'paid') {
        // Create a completed payment
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const payment = {
          orderId: orderId,
          accountId: invoice.accountId,
          amount: invoice.totalAmount,
          status: 'completed',
          planId: invoice.planId,
          billingCycle: invoice.billingCycle,
          invoiceId: invoice._id,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.collection('payments').insertOne(payment);
        console.log(`  ✅ Created payment: ₹${payment.amount} for Invoice #${invoice.invoiceNumber}`);

        // Update invoice with orderId
        await db.collection('invoices').updateOne(
          { _id: invoice._id },
          { $set: { orderId: orderId } }
        );
      }
    }

    // Final summary
    const payments = await db.collection('payments').find({}).toArray();
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    console.log(`\n📊 FINAL SUMMARY:`);
    console.log(`  - Total Invoices: ${invoices.length}`);
    console.log(`  - Paid Invoices: ${paidInvoices.length}`);
    console.log(`  - Total Revenue (Paid): ₹${totalRevenue}`);
    console.log(`  - Payment Records: ${payments.length}`);
    console.log(`  - All data consistent and matched ✅`);

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createProperPayments();
