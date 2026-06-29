import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Internal project credentials
const ACCOUNT_ID = '26042058';
const PROJECT_ID = 'proj_1776957139168';

// Target Model
import Contact from './src/models/Contact.js';
import Lead from './src/models/Lead.js';

async function syncPlatformLeads() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Starting sync...');

    // Fetch all Platform Leads
    const leads = await Lead.find({}).lean();
    console.log(`Found ${leads.length} platform leads to sync.`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const lead of leads) {
      if (!lead.phone) {
        // Phone is required for Contacts (whatsappNumber)
        continue;
      }

      // Format mobile number safely
      const phone = String(lead.phone).trim();
      
      // Map tags
      const tags = Array.isArray(lead.tags) ? [...lead.tags] : [];
      if (!tags.includes('platform_lead')) {
        tags.push('platform_lead');
      }

      // Prepare custom attributes
      const customAttributes = {};
      if (lead.location) customAttributes.area = lead.location;
      if (lead.company) customAttributes.company = lead.company;
      if (lead.vertical) customAttributes.vertical = lead.vertical;

      try {
        await Contact.findOneAndUpdate(
          {
            accountId: ACCOUNT_ID,
            whatsappNumber: phone
          },
          {
            $set: {
              accountId: ACCOUNT_ID,
              projectId: PROJECT_ID,
              name: lead.name || 'Unknown Lead',
              phone: phone,
              whatsappNumber: phone,
              email: lead.email || '',
              source: 'Import',
              type: 'lead',
              tags: tags,
              customAttributes: customAttributes
            },
            $setOnInsert: {
              leadStatus: 'new',
              isOptedIn: true,
              firstContactAt: lead.createdAt || new Date(),
              createdAt: lead.createdAt || new Date()
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        syncedCount++;
      } catch (err) {
        console.error(`Error syncing lead (Phone: ${phone}):`, err.message);
        errorCount++;
      }
    }

    console.log(`Sync completed! Successfully synced: ${syncedCount}, Errors: ${errorCount}`);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during sync:', error);
    process.exit(1);
  }
}

syncPlatformLeads();
