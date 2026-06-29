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
import Conversation from '../src/models/Conversation.js';
import { normalizePhone } from '../src/utils/normalizePhone.js';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const campaigns = await Campaign.find({}).lean();
    console.log(`Found ${campaigns.length} campaigns to process.`);

    let totalEngagedPhones = 0;
    let newLeadsCreated = 0;
    let contactsUpdated = 0;

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
      if (engagedPhones.length === 0) continue;
      
      console.log(`Campaign [${campaign.name}] - Engaged Phones: ${engagedPhones.length}`);
      totalEngagedPhones += engagedPhones.length;

      for (const rawPhone of engagedPhones) {
        const phone = normalizePhone(rawPhone);
        if (!phone) continue;

        const contact = await Contact.findOne({
          accountId: campaign.accountId,
          $or: [{ whatsappNumber: phone }, { phone: phone }]
        });

        if (!contact) continue;

        const currentStatus = contact.leadStatus;
        if (!currentStatus || currentStatus === 'new') {
          contact.leadStatus = 'contacted';
          contact.source = `Campaign - ${campaign.name}`;
          await contact.save();
          contactsUpdated++;
        }

        const existingLead = await Lead.findOne({
          accountId: campaign.accountId,
          contactId: contact._id
        });

        if (!existingLead) {
          // Find conversation to get required IDs
          const conv = await Conversation.findOne({ contactId: contact._id }).lean();

          const leadData = {
            accountId: campaign.accountId,
            projectId: campaign.projectId || contact.projectId || null,
            conversationId: conv ? String(conv._id) : `hist_${contact._id}`,
            phoneNumberId: conv ? conv.phoneNumberId : 'historical_migration',
            contactId: contact._id,
            name: contact.name || phone,
            email: contact.email || '',
            phone: phone,
            company: contact.customAttributes?.company || '',
            intent: 'other',
            keywords: [],
            messageCount: 1,
            firstMessage: contact.firstContactAt || new Date(),
            lastMessage: new Date(),
            sourceMessage: `[Campaign Opened/Replied]`,
            status: 'contacted',
            score: 50,
            scoreBreakdown: { engagement: 10, intent: 20, recency: 20, completion: 0 }
          };

          const newLead = new Lead(leadData);
          await newLead.save();
          
          newLeadsCreated++;
        } else {
           if (existingLead.status === 'new') {
              existingLead.status = 'contacted';
              existingLead.sourceMessage = `[Campaign Opened/Replied] - ${campaign.name}`;
              await existingLead.save();
           }
        }
      }
    }

    console.log('\n--- Migration Complete ---');
    console.log(`Total Campaign Engagements Found: ${totalEngagedPhones}`);
    console.log(`Contacts Updated to 'contacted': ${contactsUpdated}`);
    console.log(`New Leads Created: ${newLeadsCreated}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    process.exit(0);
  }
}

run();
