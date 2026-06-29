import mongoose from 'mongoose';

const LoanSchema = new mongoose.Schema({
  lender: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  roi: { type: Number, required: true, min: 0 }, // Annual rate of interest (%) we pay
  tenure: { type: Number, required: true, min: 1 }, // in months
  startDate: { type: Date, default: Date.now },
  repaymentStatus: { type: String, enum: ['active', 'paid', 'defaulted'], default: 'active' },
  monthlyEMI: { type: Number, min: 0 },
  description: { type: String, trim: true, default: '' },
}, { timestamps: true });

export default mongoose.model('Loan', LoanSchema);
