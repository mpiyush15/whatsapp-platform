import mongoose from 'mongoose';
import Campaign from './src/models/Campaign.js';
import { refreshCampaignStatsFromMessages } from './src/services/campaignStatsService.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const campaigns = await Campaign.find({}).select('_id accountId name');
  console.log(`Found ${campaigns.length} campaigns. Recalculating...`);
  
  for (const c of campaigns) {
    try {
      console.log(`Refreshing stats for campaign: ${c.name} (${c._id})`);
      await refreshCampaignStatsFromMessages(c._id, c.accountId);
    } catch (e) {
      console.error(`Failed for ${c._id}: ${e.message}`);
    }
  }
  
  console.log('All campaigns refreshed successfully!');
  process.exit(0);
}

run().catch(console.error);
