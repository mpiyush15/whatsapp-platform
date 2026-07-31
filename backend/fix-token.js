import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PhoneNumber from './src/models/PhoneNumber.js';

dotenv.config();

async function updateDbToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const newToken = process.env.META_SYSTEM_TOKEN;
    
    // Update all phone numbers that have the old token to use the new one
    const result = await PhoneNumber.updateMany(
      {}, 
      { $set: { accessToken: newToken } }
    );
    
    console.log(`Successfully updated ${result.modifiedCount} WhatsApp connections with the new token!`);
    
    // Also clear it if they want to rely on the fallback
    // await PhoneNumber.updateMany({}, { $set: { accessToken: null } });
    
    process.exit(0);
  } catch (err) {
    console.error('Error updating DB:', err);
    process.exit(1);
  }
}

updateDbToken();
