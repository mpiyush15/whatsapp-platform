import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Template from './src/models/Template.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const deleteResult = await Template.deleteMany({
      name: { $regex: '^replysys_' },
      status: { $ne: 'approved' }
    });
    
    console.log(`Successfully deleted ${deleteResult.deletedCount} problematic old templates (kept approved ones safe!).`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
