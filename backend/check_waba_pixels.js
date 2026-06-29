import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const ACCOUNT_EMAIL = 'pixelsadvertise@gmail.com';

const accountSchema = new mongoose.Schema({
  email: String,
  accountId: String,
  wabaId: String,
  phoneNumberId: String,
  accessToken: String
}, { strict: false });

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);

async function checkWaba() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const account = await Account.findOne({ email: ACCOUNT_EMAIL });
    
    if (!account) {
      console.log(`Account with email ${ACCOUNT_EMAIL} not found!`);
    } else {
      console.log(`Account Found: ${account.accountId}`);
      console.log(`WABA Connected: ${account.wabaId ? 'YES (' + account.wabaId + ')' : 'NO'}`);
      console.log(`Phone Number ID Connected: ${account.phoneNumberId ? 'YES (' + account.phoneNumberId + ')' : 'NO'}`);
      console.log(`Access Token present: ${account.accessToken ? 'YES' : 'NO'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking WABA:', error);
    process.exit(1);
  }
}

checkWaba();
