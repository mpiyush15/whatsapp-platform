import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const PharmacyProductSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  productId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('med')
  },
  sku: { type: String, trim: true, default: null, index: true },
  name: { type: String, required: true, trim: true, index: true },
  genericName: { type: String, trim: true, default: null, index: true },
  brand: { type: String, trim: true, default: null },
  category: { type: String, trim: true, default: null },
  dosageForm: { type: String, trim: true, default: null },
  strength: { type: String, trim: true, default: null },
  packSize: { type: String, trim: true, default: null },
  unitPrice: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  taxPercent: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0, index: true },
  reorderLevel: { type: Number, default: 0, index: true },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active',
    index: true,
  },
  notes: { type: String, trim: true, default: '' },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

PharmacyProductSchema.index({ accountId: 1, projectId: 1, name: 1 });
PharmacyProductSchema.index({ accountId: 1, projectId: 1, status: 1, currentStock: 1 });

export default mongoose.model('PharmacyProduct', PharmacyProductSchema);
