/**
 * One-off migration: set billingSettings.pharmacyBillingEnabled = true for integrated
 * clinic types (clinic_pharmacy, hospital) so the frontend can rely on the flag and
 * the legacy "null means integrated" branch can be removed later.
 *
 * Usage:
 *   cd backend && node scripts/migrate-pharmacy-billing-flag.js --dry-run
 *   cd backend && node scripts/migrate-pharmacy-billing-flag.js
 *
 * Requires MONGODB_URI in .env
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Clinic from '../src/models/Clinic.js';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');

  const filter = {
    clinicType: { $in: ['clinic_pharmacy', 'hospital'] },
    $or: [
      { 'billingSettings.pharmacyBillingEnabled': { $ne: true } },
      { billingSettings: { $exists: false } },
      { 'billingSettings.pharmacyBillingEnabled': null },
    ],
  };

  const toUpdate = await Clinic.countDocuments(filter);
  console.log(`Clinics matching (integrated type, pharmacy billing not true): ${toUpdate}`);

  if (DRY_RUN) {
    const sample = await Clinic.find(filter).select('projectId clinicType billingSettings').limit(15).lean();
    console.log('\nSample (up to 15):');
    sample.forEach((c) => {
      console.log(
        `  projectId=${c.projectId} type=${c.clinicType} pharmacyBillingEnabled=${c.billingSettings?.pharmacyBillingEnabled}`
      );
    });
    console.log('\nDry run — no writes. Run without --dry-run to apply.');
    await mongoose.connection.close();
    return;
  }

  const result = await Clinic.updateMany(filter, {
    $set: { 'billingSettings.pharmacyBillingEnabled': true },
  });

  console.log(`\nUpdated: matched=${result.matchedCount} modified=${result.modifiedCount}`);
  await mongoose.connection.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
