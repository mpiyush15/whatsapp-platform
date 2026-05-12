import mongoose from 'mongoose';

const accountCreditLedgerSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  entryType: {
    type: String,
    enum: ['subscription_credit', 'manual_credit', 'usage_debit', 'refund_debit', 'correction'],
    required: true,
    index: true,
  },
  source: {
    type: String,
    enum: ['subscription_billing', 'admin_manual', 'usage', 'refund', 'system'],
    default: 'system',
    index: true,
  },
  amount: { type: Number, required: true },
  signedAmount: { type: Number, default: null },
  balanceBefore: { type: Number, default: null },
  balanceAfter: { type: Number, default: null },
  referenceType: {
    type: String,
    enum: ['payment', 'order', 'invoice', 'manual', 'usage', 'refund', 'system'],
    default: 'system',
  },
  referenceId: { type: String, default: null, index: true },
  idempotencyKey: { type: String, default: null, index: true },
  note: { type: String, default: '' },
  metadata: { type: Object, default: {} },
  status: {
    type: String,
    enum: ['processing', 'posted', 'failed'],
    default: 'processing',
    index: true,
  },
  error: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

accountCreditLedgerSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true, name: 'credit_ledger_idempotency_key_unique_sparse' }
);

accountCreditLedgerSchema.index({ accountId: 1, createdAt: -1 });

export default mongoose.model('AccountCreditLedger', accountCreditLedgerSchema);
