import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  type: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  description: { type: String, trim: true },
  isRecurring: { type: Boolean, default: false },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], default: null },
  domain: { type: String, trim: true, default: null },
});

export default mongoose.model('Expense', ExpenseSchema);
