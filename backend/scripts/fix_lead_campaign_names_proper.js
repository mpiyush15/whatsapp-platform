import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Campaign from '../src/models/Campaign.js';
import Message from '../src/models/Message.js';
import Contact from '../src/models/Contact.js';
import Lead from '../src/models/Lead.js';
import { normalizePhone } from '../src/utils/normalizePhone.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const campaigns = await Campaign.find({}).lean();
  let updated = 0;
  
  for (const campaign of campaigns) {
    if (!campaign.sentPhones || campaign.sentPhones.length === 0) continue;

    const phoneVariations = campaign.sentPhones.flatMap(p => {
      const pStr = String(p);
      return [pStr, pStr.startsWith('+') ? pStr.slice(1) : `+${pStr}`];
    });

    const openedPhones = await Message.distinct('recipientPhone', {
      campaign: campaign._id,
      direction: 'outbound',
      status: { $in: ['read', 'replied'] }
    });

    const repliedPhones = await Message.distinct('recipientPhone', {
      direction: 'inbound',
      recipientPhone: { $in: phoneVariations },
      sentAt: { $gte: campaign.startedAt || campaign.createdAt }
    });

    const engagedPhones = [...new Set([...openedPhones, ...repliedPhones])];
    
    for (const rawPhone of engagedPhones) {
      const phone = normalizePhone(rawPhone);
      if (!phone) continue;
      
      const contact = await Contact.findOne({ accountId: campaign.accountId, $or: [{ whatsappNumber: phone }, { phone: phone }] }).lean();
      if (!contact) continue;
      
      const lead = await Lead.findOne({ accountId: campaign.accountId, contactId: contact._id }).lean();
      if (lead) {
         await Lead.updateOne({ _id: lead._id }, { $set: { sourceMessage: `[Campaign Opened/Replied] - ${campaign.name}` } });
         updated++;
      }
    }
  }
  
  console.log(`Updated ${updated} leads sourceMessage with campaign names.`);
  mongoose.disconnect();
}
run();
