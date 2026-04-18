import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config({ path: './backend/.env' })

const accountSchema = new mongoose.Schema({ accountId: String, name: String, email: String, company: String, plan: String, type: String }, { collection: 'accounts' })
const Account = mongoose.model('Account', accountSchema)

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    
    // Count all customer accounts
    const allAccounts = await Account.find({ type: 'client' }).lean()
    console.log(`\n📊 Total Client Accounts: ${allAccounts.length}`)
    
    // Find Vibhav Biotech
    const vibhav = await Account.findOne({ $or: [{ name: /vibhav/i }, { company: /vibhav/i }] }).lean()
    console.log('\n🔍 Vibhav Biotech Search:')
    console.log(vibhav ? `Found: ${vibhav.name} (${vibhav.accountId}) - Current Plan: ${vibhav.plan || 'free'}` : 'Not found')
    
    // Show first 5 accounts
    console.log('\n📋 First 5 Accounts:')
    allAccounts.slice(0, 5).forEach(acc => {
      console.log(`   ${acc.accountId} | ${acc.name} (${acc.company}) | Plan: ${acc.plan || 'free'}`)
    })
    
    process.exit(0)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

check()
