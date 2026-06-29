import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  fees: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'courses'
});

courseSchema.index({ accountId: 1, projectId: 1, name: 1 }, { unique: true });

const Course = mongoose.model('Course', courseSchema);
export default Course;
