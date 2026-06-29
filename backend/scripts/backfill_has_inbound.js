import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MessageSchema = new mongoose.Schema({
  conversationId: String,
  direction: String,
  source: String
}, { strict: false });

const ConversationSchema = new mongoose.Schema({
  conversationId: String,
  hasInboundMessage: Boolean
}, { strict: false });

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Message = mongoose.model('Message', MessageSchema);
  const Conversation = mongoose.model('Conversation', ConversationSchema);
  
  console.log('Finding active conversations...');
  
  const activeConversationIds = await Message.distinct('conversationId', {
    $or: [
      { direction: 'inbound' },
      { source: { $in: ['agent_sent', 'web'] } }
    ]
  });
  
  console.log(`Found ${activeConversationIds.length} conversations that have inbound/agent activity.`);
  
  const result = await Conversation.updateMany(
    { conversationId: { $in: activeConversationIds } },
    { $set: { hasInboundMessage: true } }
  );
  
  console.log(`Successfully updated ${result.modifiedCount} conversations!`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
