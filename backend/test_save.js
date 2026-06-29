import mongoose from 'mongoose';
import Campaign from './src/models/Campaign.js';
import dotenv from 'dotenv';
import { refreshCampaignStatsFromMessages } from './src/services/campaignStatsService.js';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const c = await Campaign.findOne({ name: /salons campaign 1 mumbai/i });
  console.log('Before schema check, stats =', c.stats);
  await refreshCampaignStatsFromMessages(c._id, c.accountId);
  
  const updated = await Campaign.findOne({ name: /salons campaign 1 mumbai/i }).lean();
  console.log('After refresh, raw mongo stats =', updated.stats);
  process.exit(0);
});
