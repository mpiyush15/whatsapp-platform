import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Project = (await import('./src/models/Project.js')).default;
  const projects = await Project.find({ vertical: 'healthcare' }).lean();
  console.log(JSON.stringify(projects.map(p => ({ id: p.projectId, accountId: p.accountId })), null, 2));
  process.exit(0);
}).catch(console.error);
