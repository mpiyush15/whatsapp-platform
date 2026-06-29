import mongoose from 'mongoose';

const planCatalogSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['limit', 'feature', 'text'],
    required: true
  },
  productLine: {
    type: String,
    enum: ['whatsapp', 'healthcare', 'pathology'],
    required: true
  },
  category: {
    type: String,
    trim: true
  },
  unit: {
    type: String,
    trim: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('PlanCatalog', planCatalogSchema);
