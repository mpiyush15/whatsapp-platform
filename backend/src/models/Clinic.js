import mongoose from 'mongoose';
import { generatePrefixedId } from '../utils/idGenerator.js';

const ClinicSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  projectId: { type: String, required: true, unique: true, index: true },
  clinicId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => generatePrefixedId('cl')
  },

  // Clinic Basic Info
  name: { type: String, required: true, trim: true },
  address: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  website: { type: String, trim: true, default: '' },
  doctorName: { type: String, trim: true, default: '' },
  doctorDegree: { type: String, trim: true, default: '' },
  clinicType: {
    type: String,
    enum: ['consultation', 'clinic_pharmacy', 'hospital'],
    default: 'consultation',
    index: true,
  },
  enabledModules: [{
    type: String,
    enum: [
      'patients',
      'appointments',
      'frontdesk',
      'doctors',
      'nurses',
      'prescriptions',
      'pharmacy',
      'inventory',
      'billing',
      'compliance',
      'whatsapp',
      'flow-builder',
    ],
  }],
  billingSettings: {
    enabled: { type: Boolean, default: true },
    pharmacyBillingEnabled: { type: Boolean, default: false },
    gstEnabled: { type: Boolean, default: true },
    gstPercentage: { type: String, trim: true, default: '18%' },
    currency: { type: String, trim: true, default: 'INR ₹' },
  },
  whatsappAutomationSettings: {
    sendPrescription: { type: Boolean, default: true },
    medicineReminders: { type: Boolean, default: false },
    followUpReminders: { type: Boolean, default: true },
  },

  // Logo
  logoUrl: { type: String, default: null }, // URL to uploaded logo

  // Prescription Design Toggle
  enablePrescriptionDesign: { type: Boolean, default: true },
  prescriptionBlankPdfUrl: { type: String, default: null }, // URL to uploaded blank PDF template

  // Prescription and document branding
  prescriptionTemplate: {
    type: String,
    trim: true,
    enum: ['classic', 'modern', 'minimal', 'clean'],
    default: 'classic'
  },

  // Prescription styling
  headerColor: { type: String, default: '#ffffff' },
  headerTextColor: { type: String, default: '#0f172a' },
  headerFontWeight: { type: String, enum: ['normal', 'bold'], default: 'bold' },
  footerColor: { type: String, default: '#f3f4f6' },
  footerTextColor: { type: String, default: '#0f172a' },
  footerFontWeight: { type: String, enum: ['normal', 'bold'], default: 'normal' },

  // Additional Details
  registrationNumber: { type: String, trim: true, default: '' },
  gstNumber: { type: String, trim: true, default: '' },
  licenseNumber: { type: String, trim: true, default: '' },

  // Task Categories
  taskCategories: [{ type: String, trim: true }],

  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model('Clinic', ClinicSchema);
