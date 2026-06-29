import mongoose from 'mongoose';
import Contact from './src/models/Contact.js';
import Campaign from './src/models/Campaign.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const contacts = await Contact.find({ leadStatus: { $regex: /qualified/i } }).lean();
  console.log(`Found ${contacts.length} qualified contacts.`);
  
  for (const c of contacts) {
    console.log(`Contact: ${c.name}, phone: ${c.phone}, wapp: ${c.whatsappNumber}, status: ${c.leadStatus}`);
    // Check if this phone is in any campaign
    const camps = await Campaign.find({ sentPhones: { $in: [c.phone, c.whatsappNumber] } }).select('name sentPhones').lean();
    console.log(`  Found in ${camps.length} campaigns: ${camps.map(cam => cam.name).join(', ')}`);
  }
  
  process.exit(0);
});
