import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  accountId: { type: String, required: true, unique: true, index: true },
  projectId: { type: String, default: null, index: true },
  planName: { type: String, required: true },
  billingCycle: { type: String, enum: ['monthly', 'yearly'] },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  
  status: { type: String, enum: ['active', 'inactive', 'cancelled'], default: 'active', index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  renewalDate: { type: Date, required: true },
  
  features: {
    phoneNumbers: Number,
    messagesPerDay: Number,
    contacts: Number
  },
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);
