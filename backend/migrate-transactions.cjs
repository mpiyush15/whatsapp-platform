const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'pixelswhatsapp';

async function migrateTransactions() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Get Vaibhav's old payment account ID
    const vaibhav = await db.collection('accounts').findOne({ accountId: '26041601' });
    if (!vaibhav) {
      console.log('❌ Vaibhav Biotech not found');
      return;
    }
    
    const oldPaymentAccountId = 'acc_1769848473625_gib783hlr';
    console.log(`📋 Vaibhav Biotech:`);
    console.log(`   accountId: ${vaibhav.accountId}`);
    console.log(`   Old payment ID: ${oldPaymentAccountId}`);
    
    // Find all transactions with old payment account ID
    const oldTransactions = await db.collection('transactions')
      .find({ accountId: oldPaymentAccountId })
      .toArray();
    
    console.log(`\n📊 Found ${oldTransactions.length} transactions with old payment ID`);
    
    if (oldTransactions.length > 0) {
      // Update all transactions to use the new accountId
      const result = await db.collection('transactions').updateMany(
        { accountId: oldPaymentAccountId },
        { $set: { accountId: '26041601' } }
      );
      
      console.log(`✅ Updated ${result.modifiedCount} transactions`);
      
      // Show sample of updated transactions
      const sample = await db.collection('transactions')
        .find({ accountId: '26041601' })
        .limit(3)
        .toArray();
      
      console.log(`\n📌 Sample updated transactions:`);
      sample.forEach(t => {
        console.log(`   - ${t._id}: ₹${t.amount} INR (${t.status})`);
      });
    }
    
    // Calculate stats for Vaibhav
    const stats = await db.collection('transactions')
      .aggregate([
        { $match: { accountId: '26041601' } },
        { $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } }
        }}
      ])
      .toArray();
    
    if (stats.length > 0) {
      console.log(`\n💰 Vaibhav Biotech Transaction Stats:`);
      console.log(`   Total transactions: ${stats[0].total}`);
      console.log(`   Completed: ${stats[0].completed}`);
      console.log(`   Revenue: ₹${stats[0].revenue.toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

migrateTransactions();
