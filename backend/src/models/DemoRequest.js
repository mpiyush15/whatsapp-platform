import mongoose from 'mongoose'

const demoRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    phone: {
      type: String,
    },
    company: {
      type: String,
    },
    message: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'completed', 'cancelled'],
      default: 'pending',
    },
    scheduledDate: {
      type: Date,
    },
    scheduledTime: {
      type: String,
    },
    notes: {
      type: String,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    confirmedAt: {
      type: Date,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
)

export default mongoose.model('DemoRequest', demoRequestSchema)
