import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const projects = await db.collection('projects').find({ name: { $regex: /pixels/i } }).toArray();
  console.log('Pixels Projects:', projects);
  
  process.exit(0);
}
check();
