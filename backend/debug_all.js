import mongoose from 'mongoose';
import Campaign from './src/models/Campaign.js';
import Contact from './src/models/Contact.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const campaigns = await Campaign.find({ 'sentPhones.0': { $exists: true } }).lean();
  console.log(`Checking ${campaigns.length} campaigns with sentPhones...`);
  
  for (const c of campaigns) {
    if (!c.sentPhones || c.sentPhones.length === 0) continue;
    
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
    }).select('name phone leadStatus').lean();
    
    if (contacts.length > 0) {
      console.log(`\nCampaign: ${c.name} (${c.sentPhones.length} sent)`);
      console.log(`  Found ${contacts.length} matching contacts.`);
      const statusCounts = {};
      for (const contact of contacts) {
        statusCounts[contact.leadStatus] = (statusCounts[contact.leadStatus] || 0) + 1;
      }
      console.log('  Status counts:', statusCounts);
      
      const importantContacts = contacts.filter(c => c.leadStatus !== 'new' && c.leadStatus !== 'contacted');
      if (importantContacts.length > 0) {
         console.log('  Important contacts:');
         importantContacts.forEach(ic => console.log(`    - ${ic.name} (${ic.phone}): ${ic.leadStatus}`));
      }
    }
  }
  
  console.log('\n--- Checking all important contacts across DB ---');
  const allImportants = await Contact.find({ leadStatus: { $in: ['qualified', 'won', 'lost'] } }).select('name phone leadStatus').lean();
  console.log(`Found ${allImportants.length} important contacts total in DB.`);
  for (const c of allImportants) {
     console.log(`  - ${c.name} (${c.phone}): ${c.leadStatus}`);
  }
  
  process.exit(0);
});
