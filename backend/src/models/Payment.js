import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Account & Subscription Reference
  accountId: {
    type: String,
    required: true,
    index: true
  },
  cashfreeAccountId: {
    type: String, // ✅ Store Cashfree customer_id for reference
    index: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  
  // Payment Amount
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Payment Method
  paymentGateway: {
    type: String,
    enum: ['stripe', 'razorpay', 'paypal', 'cashfree', 'manual_transfer'],
    required: true
  },
  
  // Order & Payment Session References
  orderId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  planId: {
    type: String
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'annual'],
    default: 'monthly'
  },
  
  // 🔴 PRICING SNAPSHOT - Captured at order creation time, NEVER changes
  pricingSnapshot: {
    planName: String,
    monthlyPrice: Number,
    yearlyPrice: Number,
    setupFee: Number,
    selectedBillingCycle: String,  // The cycle selected by user: monthly/quarterly/annual
    calculatedAmount: Number,      // Exact amount charged based on selected cycle
    currency: String,
    discountApplied: Number,
    discountReason: String,
    finalAmount: Number,
    capturedAt: { type: Date, default: Date.now }  // When this snapshot was taken
  },
  
  // Gateway References
  gatewayOrderId: String,
  gatewayTransactionId: String,
  gatewayPaymentId: String,
  paymentSessionId: String, // Cashfree payment session ID
  
  // Card/Payment Details (encrypted in production)
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'upi', 'bank_transfer', 'wallet', 'manual']
    },
    last4: String, // Last 4 digits of card
    brand: String, // visa, mastercard, etc.
    expiryMonth: Number,
    expiryYear: Number
  },
  
  // Payment Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  failedAt: Date,
  refundedAt: Date,
  
  // Failure/Error Info
  failureReason: String,
  errorCode: String,
  errorMessage: String,
  
  // Refund Info
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: String,
  refundStatus: {
    type: String,
    enum: ['none', 'partial', 'full'],
    default: 'none'
  },
  
  // Metadata
  ipAddress: String,
  userAgent: String,
  receiptUrl: String,
  receiptEmail: String,
  
  // Retry Information
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  nextRetryDate: Date,
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

export default mongoose.model('Payment', paymentSchema);
