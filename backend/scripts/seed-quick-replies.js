/**
 * Seed default Live Chat quick replies for all categories.
 *
 * Usage:
 *   node scripts/seed-quick-replies.js
 *   node scripts/seed-quick-replies.js <accountId>
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import QuickReply from '../src/models/QuickReply.js';
import Account from '../src/models/Account.js';

dotenv.config();

const DEFAULT_SAMPLES = [
  // General
  {
    name: 'Greeting',
    category: 'General',
    content:
      'Hi! Thanks for reaching out to us. How can we help you today?',
  },
  {
    name: 'Thank you',
    category: 'General',
    content:
      'Thank you for your message. We really appreciate your patience.',
  },
  {
    name: 'Closing',
    category: 'General',
    content:
      'Glad we could help! If you need anything else, feel free to message us anytime. Have a great day!',
  },
  // Support
  {
    name: 'Need details',
    category: 'Support',
    content:
      'Thanks for reporting this. Could you please share a few more details or a screenshot so we can assist you faster?',
  },
  {
    name: 'Looking into it',
    category: 'Support',
    content:
      'We are looking into your issue right now and will update you shortly.',
  },
  {
    name: 'Escalated',
    category: 'Support',
    content:
      'I have escalated this to our specialist team. You will hear back from us within 24 hours.',
  },
  // Sales
  {
    name: 'Product intro',
    category: 'Sales',
    content:
      'Thanks for your interest! I would be happy to share more about our plans and how we can help your business.',
  },
  {
    name: 'Pricing',
    category: 'Sales',
    content:
      'Our pricing depends on your message volume and features. Would you like a quick call or a detailed quote by email?',
  },
  {
    name: 'Follow up',
    category: 'Sales',
    content:
      'Just checking in — did you get a chance to review the information we shared? Let me know if you have any questions.',
  },
  // Order
  {
    name: 'Order received',
    category: 'Order',
    content:
      'Your order has been received and is being processed. We will send you a confirmation with tracking details soon.',
  },
  {
    name: 'Shipping update',
    category: 'Order',
    content:
      'Your order is on the way! You should receive it within the estimated delivery window. Reply here if you need the tracking link.',
  },
  {
    name: 'Order status',
    category: 'Order',
    content:
      'Please share your order ID or registered phone number and we will check the status for you right away.',
  },
  // Custom
  {
    name: 'Please hold',
    category: 'Custom',
    content:
      'Please give us a moment while we check that for you. We will reply here shortly.',
  },
  {
    name: 'Business hours',
    category: 'Custom',
    content:
      'Our team is available Monday–Saturday, 10 AM–7 PM. We will respond to your message as soon as we are back online.',
  },
];

async function seedForAccount(accountId) {
  let created = 0;
  let skipped = 0;

  for (const sample of DEFAULT_SAMPLES) {
    const exists = await QuickReply.findOne({
      accountId,
      name: sample.name,
      isActive: true,
    }).lean();

    if (exists) {
      skipped++;
      continue;
    }

    await QuickReply.create({
      accountId,
      name: sample.name,
      content: sample.content,
      category: sample.category,
      messageType: 'text',
      isActive: true,
    });
    created++;
  }

  return { created, skipped };
}

async function resolveAccountIds(cliAccountId) {
  if (cliAccountId) return [cliAccountId];

  const accounts = await Account.find({}).select('accountId').lean();
  const ids = [...new Set(accounts.map((a) => a.accountId).filter(Boolean))];
  if (ids.length > 0) return ids;

  // Fallback: distinct accountIds from existing quick replies or conversations
  const fromReplies = await QuickReply.distinct('accountId');
  if (fromReplies.length > 0) return fromReplies;

  throw new Error(
    'No accountId found. Pass one: node scripts/seed-quick-replies.js <accountId>'
  );
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';
const cliAccountId = process.argv[2];

try {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB\n');

  const accountIds = await resolveAccountIds(cliAccountId);
  console.log(`Seeding quick replies for ${accountIds.length} account(s)...\n`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const accountId of accountIds) {
    const { created, skipped } = await seedForAccount(accountId);
    totalCreated += created;
    totalSkipped += skipped;
    console.log(`  ${accountId}: +${created} created, ${skipped} already existed`);
  }

  console.log(`\nDone. ${totalCreated} created, ${totalSkipped} skipped.`);
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exit(1);
} finally {
  await mongoose.connection.close();
}
