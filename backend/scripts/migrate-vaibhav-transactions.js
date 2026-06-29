import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set in .env');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

const migrateTransactions = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Vaibhav Biotech's correct accountId
    const correctAccountId = '26041601';
    
    // Old/wrong account IDs that need to be updated (from Cashfree format)
    const oldAccountIds = [
      'acc_1769848473625_gib783hlr',
      '2600001'  // if there are any with this format
    ];
    
    // Update all transactions with old accountIds to the correct one
    const result = await db.collection('transactions').updateMany(
      { accountId: { $in: oldAccountIds } },
      { $set: { accountId: correctAccountId } },
      { multi: true }
    );
    
    console.log(`✅ Migration complete:`);
    console.log(`   - Matched: ${result.matchedCount} transactions`);
    console.log(`   - Modified: ${result.modifiedCount} transactions`);
    console.log(`   - Updated to accountId: ${correctAccountId}`);
    
    // Verify the update
    const count = await db.collection('transactions').countDocuments({ 
      accountId: correctAccountId 
    });
    
    console.log(`✅ Total transactions for Vaibhav (${correctAccountId}): ${count}`);
    
    // Show summary
    const summary = await db.collection('transactions').aggregate([
      { $match: { accountId: correctAccountId } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Completed'] }, '$amount', 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Pending'] }, '$amount', 0]
            }
          },
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    if (summary.length > 0) {
      console.log('\n📊 Transaction Summary for Vaibhav:');
      console.log(`   - Total Transactions: ${summary[0].count}`);
      console.log(`   - Total Amount: ₹${summary[0].total.toFixed(2)}`);
      console.log(`   - Completed: ₹${summary[0].completed.toFixed(2)}`);
      console.log(`   - Pending: ₹${summary[0].pending.toFixed(2)}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

connectDB().then(() => migrateTransactions());
