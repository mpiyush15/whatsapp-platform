import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const leads = await db.collection('leads').countDocuments();
  const chatbotLeads = await db.collection('chatbot_leads').countDocuments();
  const contacts = await db.collection('contacts').countDocuments({ projectId: 'proj_1776957139168' });
  const platformLeadContacts = await db.collection('contacts').countDocuments({ projectId: 'proj_1776957139168', tags: 'platform_lead' });
  
  console.log('Total Leads (Superadmin):', leads);
  console.log('Total Chatbot Leads:', chatbotLeads);
  console.log('Contacts in proj_1776957139168:', contacts);
  console.log('Contacts with platform_lead tag:', platformLeadContacts);
  
  // Find a sample contact that was synced
  const sample = await db.collection('contacts').findOne({ projectId: 'proj_1776957139168', tags: 'platform_lead' });
  console.log('Sample Contact:', sample);
  
  process.exit(0);
}
check();
