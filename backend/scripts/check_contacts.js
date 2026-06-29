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
  await mongoose.connect(process.env.MONGODB_URI);
  const leads = await Lead.find({ sourceMessage: '[Campaign Opened/Replied]' }).limit(5).lean();
  for(const l of leads) {
    const contact = await Contact.findById(l.contactId).lean();
    console.log("Contact source:", contact?.source);
  }
  mongoose.disconnect();
}
run();
