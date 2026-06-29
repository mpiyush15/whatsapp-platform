import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
    index: true
  },
  projectId: {
    type: String,
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['image', 'video', 'document', 'audio', 'other'],
    default: 'other'
  },
  mediaUrl: {
    type: String,
    required: true
  },
  s3Key: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['template', 'campaign', 'direct_upload', 'other'],
    default: 'direct_upload'
  },
  sizeBytes: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

mediaSchema.index({ accountId: 1, projectId: 1, isDeleted: 1 });
mediaSchema.index({ createdAt: -1 });

export default mongoose.model('Media', mediaSchema);
