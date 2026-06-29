import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    // Check KeywordRule
    const KeywordRule = (await import('./src/models/KeywordRule.js')).default;
    const rules = await KeywordRule.find({ projectId: 'proj_1776957139168' });
    
    console.log('\n--- Keyword Rules (Inbound Chatbots) ---');
    console.log(`Found ${rules.length} rules for proj_1776957139168:`);
    rules.forEach((r, i) => {
        console.log(`\nRule ${i + 1}: ${r.name}`);
        console.log(`Keywords: [${r.keywords.join(', ')}] -> MatchType: ${r.matchType}`);
        console.log(`Response Type: ${r.replyType}`);
        if (r.replyType === 'text') {
            console.log(`Text: ${r.replyContent?.text?.substring(0, 100) || 'None'}`);
        } else if (r.replyType === 'workflow') {
            console.log(`Workflow steps: ${r.replyContent?.workflow?.length || 0}`);
            r.replyContent?.workflow?.forEach(w => console.log(` - ${w.type}: ${w.text || '...'}`));
        } else if (r.replyType === 'template') {
            console.log(`Template: ${r.replyContent?.templateName}`);
        }
    });

    // Check ChatbotLead
    const ChatbotLead = (await import('./src/models/ChatbotLead.js')).default;
    const leads = await ChatbotLead.countDocuments({ projectId: 'proj_1776957139168' });
    console.log(`\n--- Chatbot Leads Collected ---`);
    console.log(`Count: ${leads}`);

    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });
