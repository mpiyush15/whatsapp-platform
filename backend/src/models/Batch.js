import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
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
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  timing: {
    type: String
  },
  maxStudents: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'batches'
});

batchSchema.index({ accountId: 1, projectId: 1, courseId: 1, name: 1 }, { unique: true });

const Batch = mongoose.model('Batch', batchSchema);
export default Batch;
