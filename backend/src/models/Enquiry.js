import mongoose from 'mongoose';

const paymentLogSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  method: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'upi'],
    required: true
  },
  notes: {
    type: String
  }
}, { _id: true });

const studentDetailsSchema = new mongoose.Schema({
  parentName: {
    type: String,
    trim: true,
    default: ''
  },
  parentPhone: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  tenthMarks: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const enquirySchema = new mongoose.Schema({
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
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    lowercase: true,
    index: true
  },
  phone: {
    type: String,
    index: true
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'admitted', 'dropped'],
    default: 'new',
    index: true
  },
  source: {
    type: String,
    trim: true,
    default: 'Manual',
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    index: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    index: true
  },
  fees: {
    type: Number,
  },
  tags: {
    type: [String],
    default: [],
    index: true
  },
  paymentLogs: [paymentLogSchema],
  studentDetails: {
    type: studentDetailsSchema,
    default: () => ({})
  },
  notes: {
    type: String,
    default: ''
  },
  chatbotResponses: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
}, {
  timestamps: true,
  collection: 'enquiries'
});

enquirySchema.index({ accountId: 1, projectId: 1, status: 1 });
enquirySchema.index({ accountId: 1, projectId: 1, createdAt: -1 });
enquirySchema.index({ accountId: 1, projectId: 1, 'metadata.workflowSessionId': 1 });

const Enquiry = mongoose.model('Enquiry', enquirySchema);
export default Enquiry;
