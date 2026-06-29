import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Lead from '../src/models/Lead.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const leads = await Lead.find({ intent: 'other' }).limit(5).lean();
  console.log(leads.map(l => ({ id: l._id, sourceMessage: l.sourceMessage })));
  mongoose.disconnect();
}
run();
