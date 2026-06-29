import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const ACCOUNT_ID = '26042058';
const PROJECT_ID = 'proj_1776957139168'; // Pixels Internal Project
const WABA_ID = '2110236366467294';

const keywordRuleSchema = new mongoose.Schema({
  accountId: String,
  projectId: String,
  phoneNumberId: String,
  name: String,
  description: String,
  keywords: [String],
  matchType: String,
  replyType: String,
  replyContent: mongoose.Schema.Types.Mixed,
  isActive: Boolean,
}, { strict: false });

const phoneNumberSchema = new mongoose.Schema({
  accountId: String,
  projectId: String,
  wabaId: String,
  phoneNumberId: String,
}, { strict: false });

const KeywordRule = mongoose.models.KeywordRule || mongoose.model('KeywordRule', keywordRuleSchema);
const PhoneNumber = mongoose.models.PhoneNumber || mongoose.model('PhoneNumber', phoneNumberSchema);

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to MongoDB. Managing chatbots for Project: ${PROJECT_ID}`);

    // 0. Move Phone Number to Internal Project
    const phoneUpdate = await PhoneNumber.updateMany(
      { wabaId: WABA_ID },
      { $set: { projectId: PROJECT_ID } }
    );
    console.log(`Moved ${phoneUpdate.modifiedCount} Phone Numbers to Project ${PROJECT_ID}.`);

    // 1. Disable all existing chatbots in this project
    const updateRes = await KeywordRule.updateMany(
      { projectId: PROJECT_ID },
      { $set: { isActive: false } }
    );
    console.log(`Disabled ${updateRes.modifiedCount} existing active chatbots.`);

    // 2. Create "Main Menu & Pricing" Workflow
    const mainMenuBot = new KeywordRule({
      accountId: ACCOUNT_ID,
      projectId: PROJECT_ID,
      name: 'Replysys Main Menu & Pricing',
      description: 'Provides pricing options and AI info.',
      keywords: ['hi', 'hello', 'hey', 'menu', 'pricing', 'plans', 'ai', 'get ai'],
      matchType: 'contains',
      replyType: 'workflow',
      isActive: true,
      replyContent: {
        workflow: [
          {
            id: 'menu_1',
            type: 'buttons',
            text: 'Hi! Welcome to Replysys. How can we help you supercharge your WhatsApp today?',
            waitForResponse: true,
            buttons: [
              { id: 'btn_pricing', title: 'Pricing Plans', nextStepId: 'menu_pricing' },
              { id: 'btn_ai', title: 'Get AI Like This', nextStepId: 'menu_ai' },
              { id: 'btn_demo', title: 'Book a Demo', nextStepId: 'menu_demo' }
            ]
          },
          {
            id: 'menu_pricing',
            type: 'text',
            text: "🔹 *Starter*: ₹2499/mo\n🔹 *Pro*: ₹4999/mo\n🔹 *Enterprise*: Custom\n\nReply 'demo' to book a call and discuss the best fit!",
            isTerminal: true
          },
          {
            id: 'menu_ai',
            type: 'text',
            text: "To get an AI assistant like this, you need a verified Meta Business Manager and an active WhatsApp number. Reply 'demo' to book your setup call!",
            isTerminal: true
          },
          {
            id: 'menu_demo',
            type: 'text',
            text: "Sure! Just type 'demo' and I'll help you schedule a call.",
            isTerminal: true
          }
        ]
      }
    });
    await mainMenuBot.save();
    console.log(`Created Chatbot: ${mainMenuBot.name}`);

    // 3. Create "Demo Booking" Workflow
    const demoBot = new KeywordRule({
      accountId: ACCOUNT_ID,
      projectId: PROJECT_ID,
      name: 'Replysys Demo Booking',
      description: 'Captures lead details for a demo.',
      keywords: ['demo', 'book demo', 'setup', 'appointment', 'book'],
      matchType: 'contains',
      replyType: 'workflow',
      isActive: true,
      replyContent: {
        workflow: [
          {
            id: 'demo_1',
            type: 'question',
            text: "Hi! Let's schedule your demo. What's your full name?",
            saveAs: 'name',
            waitForResponse: true
          },
          {
            id: 'demo_2',
            type: 'question',
            text: "Thanks! What's your best email address?",
            saveAs: 'email',
            waitForResponse: true
          },
          {
            id: 'demo_3',
            type: 'question',
            text: "Which date works best for you? (e.g., Tomorrow, Next Tuesday)",
            saveAs: 'demo_date',
            waitForResponse: true
          },
          {
            id: 'demo_4',
            type: 'question',
            text: "And what time would you prefer?",
            saveAs: 'demo_time',
            waitForResponse: true
          },
          {
            id: 'demo_5',
            type: 'text',
            text: "Done! ✅ We've received your request for {demo_date} at {demo_time}. Our team will confirm shortly."
          }
        ]
      }
    });
    await demoBot.save();
    console.log(`Created Chatbot: ${demoBot.name}`);

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding chatbots:', error);
    process.exit(1);
  }
}

seed();
