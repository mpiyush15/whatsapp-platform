import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixPaymentAmounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get all invoices
    const invoices = await db.collection('invoices').find({}).toArray();
    console.log(`\n📋 Found ${invoices.length} invoices`);
    console.log('Invoices:');
    invoices.forEach(inv => {
      console.log(`  - Invoice #${inv.invoiceNumber}: ₹${inv.totalAmount} (Status: ${inv.status})`);
    });

    // Get all payments
    const payments = await db.collection('payments').find({}).toArray();
    console.log(`\n💳 Found ${payments.length} payments`);
    console.log('Payments:');
    payments.forEach(p => {
      console.log(`  - Payment: ₹${p.amount} (Status: ${p.status}, OrderID: ${p.orderId})`);
    });

    // Match payments to invoices and fix amounts
    console.log('\n🔧 Fixing payment amounts...');
    
    for (const payment of payments) {
      // Find matching invoice by orderId
      const matchingInvoice = invoices.find(inv => inv.orderId === payment.orderId);
      
      if (matchingInvoice) {
        // Update payment amount to match invoice
        if (payment.amount !== matchingInvoice.totalAmount) {
          console.log(`  ⚠️ Fixing: Payment ${payment._id} - ₹${payment.amount} → ₹${matchingInvoice.totalAmount}`);
          await db.collection('payments').updateOne(
            { _id: payment._id },
            { 
              $set: { 
                amount: matchingInvoice.totalAmount,
                updatedAt: new Date()
              }
            }
          );
        }
      }
    }

    // Get updated payments
    const updatedPayments = await db.collection('payments').find({}).toArray();
    console.log(`\n✅ Updated payments:`);
    updatedPayments.forEach(p => {
      console.log(`  - ₹${p.amount} (Status: ${p.status})`);
    });

    // Summary
    console.log('\n📊 SUMMARY:');
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const paidAmount = paidInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalBilled = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    console.log(`  - Total Invoices: ${invoices.length}`);
    console.log(`  - Total Billed: ₹${totalBilled}`);
    console.log(`  - Paid Invoices: ${paidInvoices.length}`);
    console.log(`  - Total Paid: ₹${paidAmount}`);
    console.log(`  - Payments Records: ${updatedPayments.length}`);
    console.log(`  - All amounts now consistent ✅`);

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixPaymentAmounts();
