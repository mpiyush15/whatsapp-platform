import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  // Multi-tenant isolation - Use String accountId (matches system standard)
  accountId: {
    type: String,
    required: true,
    index: true
  },
  
  // Contact info
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  whatsappNumber: {
    type: String,
    required: true
  },
  email: String,
  
  // Type
  type: {
    type: String,
    enum: ['customer', 'lead', 'other'],
    default: 'customer'
  },
  
  // Opt-in status (CRITICAL for compliance)
  isOptedIn: {
    type: Boolean,
    default: true
  },
  optInDate: Date,
  optOutDate: Date,
  
  // Engagement tracking
  lastMessageAt: Date,
  messageCount: {
    type: Number,
    default: 0
  },
  
  // Tags and metadata (flexible for any use case)
  tags: [String],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
contactSchema.index({ accountId: 1, whatsappNumber: 1 }, { unique: true });
contactSchema.index({ accountId: 1, type: 1 });
contactSchema.index({ accountId: 1, isOptedIn: 1 });
contactSchema.index({ accountId: 1, tags: 1 });

export default mongoose.model('Contact', contactSchema);
