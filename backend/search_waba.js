import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const WABA_ID = '2110236366467294';

async function searchAllCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    for (let col of collections) {
      const docs = await db.collection(col.name).find({ $or: [
        { wabaId: WABA_ID },
        { "metadata.wabaId": WABA_ID },
        { "settings.wabaId": WABA_ID }
      ]}).toArray();
      
      if (docs.length > 0) {
        console.log(`Found in collection: ${col.name}`);
        console.log(JSON.stringify(docs, null, 2));
      }
    }
    
    console.log('Search complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

searchAllCollections();
