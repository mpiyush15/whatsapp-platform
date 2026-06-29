/**
 * One-time setup: superadmin account + platform WABA org flags.
 *
 * Usage (from backend/):
 *   node scripts/ensure-platform-accounts.js
 *
 * Env overrides:
 *   PLATFORM_SUPERADMIN_EMAIL=mpiyush2727@gmail.com
 *   PLATFORM_WABA_ACCOUNT_ID=26042058
 *   PLATFORM_WABA_ACCOUNT_EMAIL=pixelsadvertise@gmail.com
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Account from '../src/models/Account.js';
import User from '../src/models/User.js';
import {
  getSuperadminAccountEmails,
  getPlatformClientAccountEmail,
} from '../src/config/platformWhatsApp.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
const PLATFORM_WABA_ACCOUNT_ID = (process.env.PLATFORM_WABA_ACCOUNT_ID || '26042058').trim();

async function main() {
  if (!MONGO_URI) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const superadminEmails = getSuperadminAccountEmails();
  const platformEmail = getPlatformClientAccountEmail();

  for (const email of superadminEmails) {
    const account = await Account.findOne({ email });
    if (account) {
      account.type = 'internal';
      account.role = 'superadmin';
      account.status = account.status || 'active';
      await account.save();
      console.log(`✅ Account superadmin: ${email} (${account.accountId})`);
    } else {
      console.warn(`⚠️ No Account for superadmin email: ${email}`);
    }

    const user = await User.findOne({ email });
    if (user) {
      user.role = 'superadmin';
      user.status = 'active';
      if (account) user.accountId = account.accountId;
      await user.save();
      console.log(`✅ User superadmin: ${email}`);
    }
  }

  const platformAccount =
    (await Account.findOne({ accountId: PLATFORM_WABA_ACCOUNT_ID })) ||
    (await Account.findOne({ email: platformEmail }));

  if (platformAccount) {
    platformAccount.isInternal = true;
    await platformAccount.save();
    console.log(
      `✅ Platform WABA account isInternal=true: ${platformAccount.accountId} (${platformAccount.email})`
    );
  } else {
    console.warn(
      `⚠️ Platform account not found (id=${PLATFORM_WABA_ACCOUNT_ID} or email=${platformEmail})`
    );
  }

  await mongoose.connection.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
