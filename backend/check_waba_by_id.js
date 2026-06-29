import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const WABA_ID = '2110236366467294';

const accountSchema = new mongoose.Schema({
  email: String,
  accountId: String,
  wabaId: String,
  phoneNumberId: String,
  accessToken: String
}, { strict: false });

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);

async function checkWabaId() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const account = await Account.findOne({ wabaId: WABA_ID });
    
    if (!account) {
      console.log(`No account found connected to WABA ID ${WABA_ID}!`);
    } else {
      console.log(`=== Found WABA Connection ===`);
      console.log(`Account ID: ${account.accountId}`);
      console.log(`Email: ${account.email}`);
      console.log(`WABA ID: ${account.wabaId}`);
      console.log(`Phone Number ID: ${account.phoneNumberId}`);
      console.log(`Access Token present: ${account.accessToken ? 'YES' : 'NO'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking WABA ID:', error);
    process.exit(1);
  }
}

checkWabaId();
