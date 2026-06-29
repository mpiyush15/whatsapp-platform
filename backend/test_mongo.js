import mongoose from 'mongoose';
import Campaign from './src/models/Campaign.js';
import Contact from './src/models/Contact.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const c = await Campaign.findOne({ name: { $regex: /pixels internal/i } }).lean();
  console.log('Campaign:', c.name);
  console.log('Stats:', c.stats);
  console.log('SentPhones length:', c.sentPhones?.length);
  const contacts = await Contact.aggregate([
    { $match: { phone: { $in: c.sentPhones || [] } } },
    { $group: { _id: "$leadStatus", count: { $sum: 1 } } }
  ]);
  console.log('Contact stats:', contacts);
  process.exit(0);
});
