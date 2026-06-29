import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Contact from '../src/models/Contact.js';
import Lead from '../src/models/Lead.js';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const leads = await Lead.find({ sourceMessage: '[Campaign Opened/Replied]' });
    
    let updated = 0;
    for (const lead of leads) {
      const contact = await Contact.findById(lead.contactId);
      if (contact && contact.source && contact.source.startsWith('Campaign - ')) {
        lead.sourceMessage = `[Campaign Opened/Replied] - ${contact.source.replace('Campaign - ', '')}`;
        await lead.save();
        updated++;
      }
    }
    console.log(`Updated ${updated} leads with campaign names.`);
  } catch(e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

run();
