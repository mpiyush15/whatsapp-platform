/**
 * One-off: drop UNIQUE index on users.accountId if present, then ensure a normal (non-unique) index.
 * Run: cd backend && node scripts/fix-users-accountid-index.js
 * Uses MONGODB_URI from .env (same as the API).
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fixUsersAccountIdIndex } from '../src/utils/fixUsersAccountIdIndex.js';

dotenv.config();
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

await mongoose.connect(uri);
console.log('Connected. Fixing users.accountId index...');
await fixUsersAccountIdIndex();
await mongoose.connection.close();
console.log('Done.');
process.exit(0);
