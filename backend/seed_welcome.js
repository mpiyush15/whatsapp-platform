import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const Template = (await import('./src/models/Template.js')).default;
    
    // Check if replysys_welcome exists
    const existing = await Template.find({ projectId: 'proj_1776957139168', name: 'replysys_welcome' });
    console.log(`Found ${existing.length} existing 'replysys_welcome' templates.`);
    
    if (existing.length > 0) {
      existing.forEach(e => console.log(` - ID: ${e._id}, Status: ${e.status}, Category: ${e.category}`));
      
      // If the user wants us to seed it anyway, let's delete the old ones (even approved) to replace it with a fresh clean draft,
      // Or we can just seed another one.
      await Template.deleteMany({ projectId: 'proj_1776957139168', name: 'replysys_welcome' });
      console.log('Deleted existing welcome templates to seed a fresh one.');
    }

    const welcomeTemplate = {
        accountId: 'acct_system_123',
        projectId: 'proj_1776957139168',
        name: 'replysys_welcome',
        language: 'en',
        category: 'utility',
        status: 'draft',
        content: 'Hi {{1}},\n\nWelcome to Replysys! We are thrilled to have you on board with the {{2}} plan.\n\nYour account is now fully active. If you need any help, just reply to this message.',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Welcome to Replysys!'
          },
          {
            type: 'BODY',
            text: 'Hi {{1}},\n\nWelcome to Replysys! We are thrilled to have you on board with the {{2}} plan.\n\nYour account is now fully active. If you need any help, just reply to this message.',
            example: { body_text: [['John', 'Starter']] }
          },
          {
            type: 'FOOTER',
            text: 'Replysys Team'
          }
        ]
    };

    // Use accountId from another template if available
    const anyTemplate = await Template.findOne({ projectId: 'proj_1776957139168' });
    if (anyTemplate) {
        welcomeTemplate.accountId = anyTemplate.accountId;
    }

    await Template.create(welcomeTemplate);
    console.log(`Seeded 'replysys_welcome' successfully.`);
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });
