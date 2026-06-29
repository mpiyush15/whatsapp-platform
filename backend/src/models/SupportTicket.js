import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  ticketId: { type: String, required: true, unique: true, index: true },
  conversationId: { type: String, default: null, index: true },
  contactPhone: { type: String, default: null },
  contactName: { type: String, default: null },
  subject: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  assigneeName: { type: String, default: null },
  slaDueAt: { type: Date, default: null, index: true },
  escalated: { type: Boolean, default: false },
  source: {
    type: String,
    enum: ['inbox', 'manual', 'api', 'client'],
    default: 'inbox'
  },
  internalNotes: [{
    note: { type: String, required: true },
    createdBy: { type: String, default: 'system' },
    createdAt: { type: Date, default: Date.now }
  }],
  metadata: {
    type: Map,
    of: String,
    default: new Map()
  }
}, {
  timestamps: true
});

supportTicketSchema.index({ accountId: 1, createdAt: -1 });
supportTicketSchema.index({ accountId: 1, status: 1, priority: 1 });

export default mongoose.model('SupportTicket', supportTicketSchema);
