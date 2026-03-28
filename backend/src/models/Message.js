import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  // Multi-tenant isolation - Use String accountId for consistency
  accountId: {
    type: String,
    required: true,
    index: true
  },
  
  // CRITICAL: For multi-number analytics
  phoneNumberId: {
    type: String,
    required: true,
    index: true
  },

  // CRITICAL: Reference to Conversation (for real-time sync)
  // Use String type to match Conversation.conversationId (multi-tenant ID)
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  
  // Message identity
  waMessageId: {
    type: String,
    index: true
  },
  
  // Recipient
  recipientPhone: {
    type: String,
    required: true
  },
  recipientName: String,
  
  // Message content
  messageType: {
    type: String,
    enum: ['text', 'template', 'media', 'interactive', 'image', 'video', 'audio', 'document', 'location', 'sticker', 'button', 'reaction', 'voice'],
    default: 'text'
  },
  content: {
    text: String,
    templateName: String,
    templateParams: [String],
    
    // Media fields (S3 storage)
    mediaUrl: String,           // S3 public URL
    mediaType: String,          // image/video/audio/document
    mediaId: String,            // Original WhatsApp media ID
    s3Key: String,              // S3 object key
    filename: String,           // Original filename
    mimeType: String,           // MIME type (image/jpeg, etc.)
    fileSize: Number,           // File size in bytes
    sha256: String,             // File hash from WhatsApp
    
    // Interactive message fields
    caption: String,            // Media caption
    buttonText: String,
    listTitle: String
  },
  
  // Status tracking (matches Meta lifecycle)
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
    default: 'queued'
  },
  statusUpdates: [{
    status: String,
    timestamp: Date,
    errorCode: String,
    errorMessage: String
  }],
  
  // Direction
  direction: {
    type: String,
    enum: ['outbound', 'inbound'],
    default: 'outbound'
  },
  
  // Campaign tracking
  campaign: {
    type: String,
    default: 'manual'
  },
  
  // Timestamps
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  failedAt: Date,
  
  // Error info
  errorCode: String,
  errorMessage: String,
  
  // Agent read tracking - which agents have seen this message
  readBy: [{
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent'
    },
    readAt: Date
  }],
  
  // Threading support - reply to another message
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  
  // Is this an internal note (visible only to team)?
  isInternalNote: {
    type: Boolean,
    default: false
  },
  
  // Reactions (emoji reactions from agents)
  reactions: [{
    emoji: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent'
    },
    addedAt: Date
  }],
  
  // If this message was forwarded from another conversation
  forwardedFrom: {
    conversationId: mongoose.Schema.Types.ObjectId,
    messageId: mongoose.Schema.Types.ObjectId,
    timestamp: Date
  },
  
  // Source of the message (tracking origin)
  source: {
    type: String,
    enum: ['whatsapp_api', 'webhook', 'agent_sent', 'template', 'bulk'],
    default: 'whatsapp_api'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
messageSchema.index({ accountId: 1, conversationId: 1 });
messageSchema.index({ accountId: 1, phoneNumberId: 1 });
messageSchema.index({ accountId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ accountId: 1, status: 1 });
messageSchema.index({ accountId: 1, direction: 1 });

export default mongoose.model('Message', messageSchema);
