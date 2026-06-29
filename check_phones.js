const mongoose = require('mongoose')
const dotenv = require('dotenv')

dotenv.config({ path: './backend/.env' })

const accountSchema = new mongoose.Schema({ accountId: String, name: String, email: String }, { collection: 'accounts' })
const phoneSchema = new mongoose.Schema({ accountId: String, projectId: String, displayPhone: String, displayName: String, qualityRating: String, verificationStatus: String }, { collection: 'phonenumbers' })

const Account = mongoose.model('Account', accountSchema)
const PhoneNumber = mongoose.model('PhoneNumber', phoneSchema)

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')
    
    // Find account with pixelsadvertise@gmail.com
    const account = await Account.findOne({ email: /pixelsadvertise/i }).lean()
    console.log('\n📧 Account Search:')
    if (account) {
      console.log(`✅ Found: ${account.name} (${account.accountId}) - Email: ${account.email}`)
      
      // Get all phone numbers for this account
      const phones = await PhoneNumber.find({ accountId: account.accountId }).lean()
      console.log(`\n📱 Phone Numbers for account ${account.accountId}:`)
      console.log(`   Total: ${phones.length}`)
      phones.forEach(phone => {
        console.log(`   - ${phone.displayPhone} (${phone.displayName}) | projectId: ${phone.projectId || 'null'} | Quality: ${phone.qualityRating}`)
      })
      
      // Also check account-level (projectId: null)
      const accountLevelPhones = await PhoneNumber.find({ accountId: account.accountId, projectId: null }).lean()
      console.log(`\n   Account-level (projectId: null): ${accountLevelPhones.length}`)
      
    } else {
      console.log('❌ Account not found with pixelsadvertise email')
    }
    
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

check()
