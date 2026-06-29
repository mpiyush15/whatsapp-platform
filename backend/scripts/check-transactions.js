import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
};

const checkTransactions = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Get all unique accountIds in transactions
    const accountIds = await db.collection('transactions').distinct('accountId');
    console.log('📋 Unique accountIds in transactions collection:');
    accountIds.forEach((id, i) => console.log(`   ${i + 1}. ${id}`));
    
    // Check for Cashfree format IDs
    const cashfreeIds = await db.collection('transactions').distinct('accountId', {
      accountId: /acc_/
    });
    
    if (cashfreeIds.length > 0) {
      console.log('\n💰 Cashfree format IDs found:');
      cashfreeIds.forEach((id, i) => console.log(`   ${i + 1}. ${id}`));
      
      // Count transactions for each
      for (const id of cashfreeIds) {
        const count = await db.collection('transactions').countDocuments({ accountId: id });
        console.log(`      → ${count} transactions`);
      }
    }
    
    // Show Vaibhav's accountId and any transactions
    console.log('\n🔍 Looking for Vaibhav Biotech (26041601):');
    const vaibhavCount = await db.collection('transactions').countDocuments({ accountId: '26041601' });
    console.log(`   Transactions with accountId=26041601: ${vaibhavCount}`);
    
    // Show total transactions
    const total = await db.collection('transactions').countDocuments({});
    console.log(`\n📊 Total transactions in collection: ${total}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Check failed:', err);
    process.exit(1);
  }
};

connectDB().then(() => checkTransactions());
