import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import PricingPlan from '../src/models/PricingPlan.js';

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const plans = await PricingPlan.find({});
    let migratedCount = 0;

    for (const plan of plans) {
      if (!plan.limits || plan.limits instanceof Map) {
        continue; // Already a map or undefined
      }

      // Read current raw limits object directly from DB using lean()
      const rawPlan = await PricingPlan.findById(plan._id).lean();
      if (!rawPlan || !rawPlan.limits || typeof rawPlan.limits !== 'object') {
        continue;
      }

      // Check if it's already a Map in DB (some MongoDB drivers store Map as object)
      const limitsObj = rawPlan.limits;
      const limitsMap = new Map();
      
      for (const [key, value] of Object.entries(limitsObj)) {
        if (value !== undefined) {
          limitsMap.set(key, value);
        }
      }

      // Force update using mongoose Document
      plan.set('limits', limitsMap);
      await plan.save();
      console.log(`Migrated limits for plan: ${plan.name} (${plan.planId})`);
      migratedCount++;
    }

    console.log(`Migration complete. Migrated ${migratedCount} plans.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
