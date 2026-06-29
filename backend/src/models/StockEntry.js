import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const StockEntrySchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, default: null, index: true },
  stockEntryId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('stk')
  },
  productId: { type: String, required: true, index: true },
  movementType: {
    type: String,
    enum: ['in', 'out', 'adjustment', 'dispense', 'return'],
    required: true,
    index: true,
  },
  quantity: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  batchNumber: { type: String, trim: true, default: null, index: true },
  expiryDate: { type: Date, default: null, index: true },
  supplierName: { type: String, trim: true, default: null },
  referenceType: {
    type: String,
    enum: ['purchase', 'prescription', 'manual', 'return', 'correction', 'other'],
    default: 'manual',
    index: true,
  },
  referenceId: { type: String, trim: true, default: null, index: true },
  notes: { type: String, trim: true, default: '' },
  entryAt: { type: Date, default: Date.now, index: true },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

StockEntrySchema.index({ accountId: 1, projectId: 1, productId: 1, entryAt: -1 });
StockEntrySchema.index({ accountId: 1, projectId: 1, movementType: 1, entryAt: -1 });

export default mongoose.model('StockEntry', StockEntrySchema);
