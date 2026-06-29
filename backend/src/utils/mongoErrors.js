/**
 * Detect duplicate-key errors across MongoDB driver / Mongoose versions.
 * (Not all paths expose numeric `code` on the top-level error.)
 */
export function isMongoDuplicateKey(err) {
  if (!err) return false;
  if (err.code === 11000) return true;
  if (err.name === 'MongoServerError' && err.code === 11000) return true;
  if (err.name === 'DuplicateKeyError') return true;
  const msg = String(err.message || '');
  if (/E11000 duplicate key/i.test(msg)) return true;
  if (err.writeErrors && Array.isArray(err.writeErrors)) {
    return err.writeErrors.some((w) => w.code === 11000);
  }
  return false;
}
