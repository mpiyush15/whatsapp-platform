import mongoose from 'mongoose';
import logger from './logger.js';

/**
 * Legacy / mistaken DB state: `users` collection sometimes has a UNIQUE index on `accountId`.
 * That blocks creating a 2nd staff login for the same org (same accountId).
 * The app model only uses a non-unique index — many users share one `accountId`.
 */
export async function fixUsersAccountIdIndex() {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const db = mongoose.connection.db;
    const coll = db.collection('users');
    const indexes = await coll.indexes();
    for (const idx of indexes) {
      const key = idx.key || {};
      const keyNames = Object.keys(key);
      const isOnlyAccountId = keyNames.length === 1 && keyNames[0] === 'accountId';
      if (isOnlyAccountId && idx.unique) {
        await coll.dropIndex(idx.name);
        logger.info(
          `[users] Dropped incorrect UNIQUE index "${idx.name}" on accountId — many users must share one organization accountId.`
        );
      }
    }
    try {
      await coll.createIndex({ accountId: 1 }, { unique: false, background: true });
    } catch (createErr) {
      const msg = String(createErr?.message || '');
      const ok =
        createErr?.code === 85 ||
        createErr?.code === 86 ||
        createErr?.codeName === 'IndexOptionsConflict' ||
        /already exists/i.test(msg);
      if (!ok) throw createErr;
    }
  } catch (err) {
    logger.warn('[users] fixUsersAccountIdIndex:', err?.message || err);
  }
}
