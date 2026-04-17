import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { cashfreeService } from '../src/services/cashfreeService.js';

dotenv.config();

try {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
  
  console.log('🔄 Starting Cashfree sync directly...\n');
  
  const syncResult = await cashfreeService.syncPaymentsFromCashfree();
  
  console.log('✅ Sync completed!\n');
  console.log('📊 Result:');
  console.log(JSON.stringify(syncResult, null, 2));
  
  if (syncResult.success === false) {
    console.log('\n⚠️  Sync had errors - check if Cashfree credentials are set');
    console.log('Environment variables needed:');
    console.log('  - CASHFREE_CLIENT_ID');
    console.log('  - CASHFREE_CLIENT_SECRET');
  } else {
    console.log(`\n✨ Successfully synced ${syncResult.count || 0} transactions!`);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
} finally {
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
  process.exit(0);
}
