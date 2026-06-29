import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const templates = await db.collection('templates').find({}, { projection: { name: 1 } }).toArray();
  console.log("Found templates:");
  templates.forEach(t => console.log(t.name));
  process.exit(0);
});
