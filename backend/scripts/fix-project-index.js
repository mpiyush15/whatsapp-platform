
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure dotenv to find the .env file in the backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.ATLAS_URI;
const DB_NAME = 'replysys-new';
const COLLECTION_NAME = 'projects';
const FAULTY_INDEX_KEY = { accountId: 1, isDefault: 1 };

async function fixProjectIndex() {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI or ATLAS_URI not found in .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;
    const collection = db.collection(COLLECTION_NAME);

    console.log(`Checking for faulty unique index on { accountId: 1, isDefault: 1 }...`);

    const indexes = await collection.indexes();
    let indexDropped = false;

    for (const index of indexes) {
      const keys = Object.keys(index.key);
      // Check if the index has the exact keys accountId and isDefault
      const hasCorrectKeys = keys.length === 2 && keys.includes('accountId') && keys.includes('isDefault');

      if (hasCorrectKeys && index.unique) {
        console.log(`Found faulty unique index "${index.name}". Attempting to drop it...`);
        await collection.dropIndex(index.name);
        console.log(`Successfully dropped index "${index.name}".`);
        indexDropped = true;
        break; // Assume only one such index needs dropping
      }
    }

    if (!indexDropped) {
      console.log('No faulty unique index found on { accountId, isDefault }. It may have been fixed already.');
    }

    console.log('\nOperation finished.');
    console.log('Please restart the backend server to apply the new index schema.');

  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

fixProjectIndex();
