import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.Mixed },
    group: { type: mongoose.Schema.Types.Mixed, required: true },
    groupId: { type: mongoose.Schema.Types.Mixed },
    memberName: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['paid', 'pending', 'failed'], default: 'pending' },
    date: { type: String, required: true },
    method: { type: String, default: 'manual' }, // 'Razorpay Test Gateway' or 'UPI Manual'
    transactionId: { type: String, unique: true },
    paymentId: { type: String }, // Razorpay payment ID
    orderId: { type: String }, // Razorpay order ID
    blockHash: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
