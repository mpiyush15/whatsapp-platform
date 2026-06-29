import connectDB from '../src/config/database.js';
import mongoose from 'mongoose';
import billingReconciliationService from '../src/services/billingReconciliationService.js';

function parseArgs(argv = []) {
  const flags = new Map();
  argv.forEach((arg) => {
    const [key, value] = arg.split('=');
    flags.set(key, value ?? true);
  });
  return flags;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const olderThanMinutes = Number(flags.get('--olderThanMinutes') || 30);
  const sampleLimit = Number(flags.get('--sampleLimit') || 10);
  const fixAccountId = flags.get('--fixAccountId');

  await connectDB();

  const overview = await billingReconciliationService.getOverview({ olderThanMinutes, sampleLimit });

  console.log('\n=== BILLING RECONCILIATION OVERVIEW ===');
  console.log(JSON.stringify(overview.summary, null, 2));

  console.log('\n=== SAMPLE STUCK PAYMENTS ===');
  console.log(JSON.stringify(overview.samples.stuckPayments, null, 2));

  console.log('\n=== SAMPLE MISSING INVOICES ===');
  console.log(JSON.stringify(overview.samples.missingInvoices, null, 2));

  console.log('\n=== SAMPLE MISSING SUBSCRIPTIONS ===');
  console.log(JSON.stringify(overview.samples.missingSubscriptions, null, 2));

  console.log('\n=== SAMPLE CREDIT MISMATCHES ===');
  console.log(JSON.stringify(overview.samples.creditMismatches, null, 2));

  if (fixAccountId && typeof fixAccountId === 'string') {
    const fixResult = await billingReconciliationService.recomputeAccountCreditBalance(fixAccountId);
    console.log('\n=== CREDIT BALANCE RECOMPUTED ===');
    console.log(JSON.stringify(fixResult, null, 2));
  }
}

main()
  .catch((error) => {
    console.error('❌ Billing reconciliation script failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
