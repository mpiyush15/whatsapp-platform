import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Template = (await import('./src/models/Template.js')).default;
  const templates = await Template.find({ name: { $regex: 'healthcare' } }).lean();
  console.log(JSON.stringify(templates, null, 2));
  process.exit(0);
}).catch(console.error);
