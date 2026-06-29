import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function recoverMessages() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-platform');
  
  const Message = mongoose.model('Message', new mongoose.Schema({}, { strict: false }));
  const Conversation = mongoose.model('Conversation', new mongoose.Schema({}, { strict: false }));

  console.log('Finding orphaned inbound messages with hyphens...');
  const orphanedMessages = await Message.find({ 
    direction: 'inbound',
    conversationId: { $regex: /-/ } // Find all messages with hyphens in the conversation ID
  });

  console.log(`Found ${orphanedMessages.length} orphaned messages to recover.`);

  let recoveredCount = 0;

  for (const msg of orphanedMessages) {
    const oldId = msg.conversationId;
    const newId = oldId.replace(/-/g, '_'); // Convert hyphens to underscores
    
    // Update the message's conversation ID
    await Message.updateOne({ _id: msg._id }, { $set: { conversationId: newId } });
    
    // Find or create the conversation with the correct ID
    const conv = await Conversation.findOne({ conversationId: newId });
    if (conv) {
      // Update the conversation's lastMessageAt if this message is newer
      if (!conv.lastMessageAt || msg.createdAt > conv.lastMessageAt) {
        await Conversation.updateOne(
          { _id: conv._id }, 
          { $set: { lastMessageAt: msg.createdAt, unreadCount: (conv.unreadCount || 0) + 1 } }
        );
      }
    } else {
      // The conversation might be completely missing if it was only created with the wrong ID
      console.log(`Warning: Target conversation ${newId} not found for message ${msg._id}.`);
      // We could optionally fix the broken conversation itself by finding the hyphenated one and updating its ID
      const brokenConv = await Conversation.findOne({ conversationId: oldId });
      if (brokenConv) {
        await Conversation.updateOne({ _id: brokenConv._id }, { $set: { conversationId: newId } });
        console.log(`Fixed broken conversation ${oldId} -> ${newId}`);
      }
    }
    
    recoveredCount++;
  }

  console.log(`\nSuccessfully recovered and fixed ${recoveredCount} messages!`);
  console.log('They will now instantly appear in your Live Chat.');
  process.exit(0);
}

recoverMessages().catch(console.error);
