import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const accountSchema = new mongoose.Schema({
  accountId: String,
  name: String,
  email: String,
  company: String,
  phone: String,
  timezone: String,
  type: String,
  role: String
}, { collection: 'accounts' });

const Account = mongoose.model('Account', accountSchema);

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const account = await Account.findOne({ accountId: '2600002' });
  console.log('Current account:', JSON.stringify(account, null, 2));
  
  // Update phone if empty
  if (!account.phone) {
    await Account.updateOne(
      { accountId: '2600002' },
      { phone: '+91 98765 43210' }
    );
    console.log('✅ Updated phone number');
  }
  
  const updated = await Account.findOne({ accountId: '2600002' });
  console.log('Updated account:', JSON.stringify(updated, null, 2));
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
