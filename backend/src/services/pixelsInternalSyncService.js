import mongoose from 'mongoose';
import Contact from '../models/Contact.js';
import logger from '../utils/logger.js';
import { normalizePhone } from '../utils/normalizePhone.js';

const PIXELS_INTERNAL_ACCOUNT_ID = '26042058';
const PIXELS_INTERNAL_PROJECT_ID = 'proj_1776957139168';

/**
 * Service to sync contacts from the Superadmin/Global list
 * down into the specific Pixels Internal project.
 */
export const syncSuperadminContactsToPixelsInternal = async (superAdminAccountId) => {
  try {
    logger.info(`Starting Superadmin -> Pixels Internal sync from account: ${superAdminAccountId}`);
    
    // 1. Fetch all contacts from the superadmin account
    const superadminContacts = await Contact.find({ accountId: superAdminAccountId }).lean();
    
    let syncedCount = 0;
    
    // 2. Upsert each into the Pixels Internal account
    for (const source of superadminContacts) {
      const phone = normalizePhone(source.phone || source.whatsappNumber);
      if (!phone) continue;
      
      await Contact.findOneAndUpdate(
        { 
          accountId: PIXELS_INTERNAL_ACCOUNT_ID, 
          $or: [{ whatsappNumber: phone }, { phone: phone }] 
        },
        {
          $set: {
            accountId: PIXELS_INTERNAL_ACCOUNT_ID,
            projectId: PIXELS_INTERNAL_PROJECT_ID,
            name: source.name || 'Unknown',
            phone: phone,
            whatsappNumber: phone,
            email: source.email || '',
            tags: Array.from(new Set([...(source.tags || []), 'superadmin_sync'])),
            source: 'Superadmin Sync',
            updatedAt: new Date()
          },
          $setOnInsert: {
            leadStatus: 'new',
            isOptedIn: true,
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      
      syncedCount++;
    }
    
    logger.info(`✅ Successfully synced ${syncedCount} contacts to Pixels Internal!`);
    return { success: true, count: syncedCount };
  } catch (error) {
    logger.error(`❌ Failed to sync superadmin contacts: ${error.message}`);
    throw error;
  }
};
