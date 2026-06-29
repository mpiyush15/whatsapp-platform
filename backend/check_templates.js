import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const Template = (await import('./src/models/Template.js')).default;
    
    // Check templates for the specific project
    const projectTemplates = await Template.find({ projectId: 'proj_1776957139168' });
    console.log(`\n--- Templates in Pixels Internal Project (proj_1776957139168) ---`);
    console.log(`Found ${projectTemplates.length} templates:`);
    projectTemplates.forEach(t => {
      console.log(` - ${t.name} (Status: ${t.status}, Category: ${t.category})`);
    });

    // Check where the specifically named 'replysys_' templates are located
    const replysysTemplates = await Template.find({ name: { $regex: '^replysys_' } });
    console.log(`\n--- System 'replysys_' Templates ---`);
    console.log(`Found ${replysysTemplates.length} templates starting with 'replysys_':`);
    replysysTemplates.forEach(t => {
      console.log(` - ${t.name} (Project: ${t.projectId}, Status: ${t.status})`);
    });

    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });
