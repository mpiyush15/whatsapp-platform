import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { normalizePhone } from './src/utils/normalizePhone.js';

dotenv.config();

const ACCOUNT_ID = '26042058';

import Contact from './src/models/Contact.js';

async function dedupe() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB. Starting account-wide deduplication...');

  const contacts = await Contact.find({ accountId: ACCOUNT_ID }).lean();
  console.log(`Found ${contacts.length} total contacts in account.`);

  const grouped = new Map();
  for (const c of contacts) {
    const normalized = normalizePhone(c.whatsappNumber || c.phone);
    if (!normalized) continue;
    if (!grouped.has(normalized)) {
      grouped.set(normalized, []);
    }
    grouped.get(normalized).push(c);
  }

  let deletedCount = 0;
  let updatedCount = 0;

  for (const [phone, group] of grouped.entries()) {
    if (group.length > 1) {
      // Sort to prioritize contacts with a projectId, then by updatedAt
      group.sort((a, b) => {
        if (a.projectId && !b.projectId) return -1;
        if (!a.projectId && b.projectId) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      
      const toKeep = group[0];
      const toDelete = group.slice(1);
      
      for (const del of toDelete) {
        await Contact.findByIdAndDelete(del._id);
        deletedCount++;
      }

      const mergedTags = new Set(toKeep.tags || []);
      for (const del of toDelete) {
        if (del.tags) del.tags.forEach(t => mergedTags.add(t));
      }

      await Contact.findByIdAndUpdate(toKeep._id, {
        $set: { 
          tags: Array.from(mergedTags),
          whatsappNumber: phone,
          phone: phone,
          projectId: toKeep.projectId || group.find(g => g.projectId)?.projectId || null
        }
      });
      updatedCount++;

    } else {
      const c = group[0];
      if (c.whatsappNumber !== phone || c.phone !== phone) {
        try {
          await Contact.findByIdAndUpdate(c._id, {
            $set: { whatsappNumber: phone, phone: phone }
          });
          updatedCount++;
        } catch (e) {
           console.error("Failed to update single contact:", c._id, e.message);
        }
      }
    }
  }

  console.log(`Deduplication complete! Deleted: ${deletedCount}, Normalized/Updated: ${updatedCount}`);
  process.exit(0);
}

dedupe();
