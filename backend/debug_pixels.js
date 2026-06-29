import mongoose from 'mongoose';
import Campaign from './src/models/Campaign.js';
import Contact from './src/models/Contact.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const c = await Campaign.findOne({ name: { $regex: /pixels internal/i } }).lean();
  console.log('Campaign:', c.name);
  console.log('SentPhones count:', c.sentPhones?.length);
  
  const phoneVariations = [];
  c.sentPhones.forEach(p => {
    const pStr = String(p);
    phoneVariations.push(pStr);
    if (!pStr.startsWith('+')) phoneVariations.push(`+${pStr}`);
  });

  const contacts = await Contact.find({ 
    accountId: c.accountId, 
    $or: [
      { phone: { $in: phoneVariations } },
      { whatsappNumber: { $in: phoneVariations } }
    ]
  }).select('name phone whatsappNumber leadStatus leadValue').lean();
  
  console.log(`Found ${contacts.length} matching contacts in the DB.`);
  
  const statusCounts = {};
  for (const contact of contacts) {
    statusCounts[contact.leadStatus] = (statusCounts[contact.leadStatus] || 0) + 1;
    if (contact.leadStatus !== 'new' && contact.leadStatus !== 'contacted') {
      console.log(`- Contact: ${contact.name}, Phone: ${contact.phone}, Status: ${contact.leadStatus}`);
    }
  }
  console.log('Summary of leadStatuses for these contacts:', statusCounts);
  
  process.exit(0);
});
