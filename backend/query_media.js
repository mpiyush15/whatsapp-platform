import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.useDb('whatsapp_platform');
    const Media = db.collection('media');
    
    const media = await Media.find({}).limit(5).toArray();
    console.log(JSON.stringify(media, null, 2));
    
    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
connectDB();
