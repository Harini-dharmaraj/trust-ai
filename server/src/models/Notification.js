import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.Mixed, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['payment', 'proposal', 'vote', 'alert', 'ledger', 'expense', 'chat'], default: 'alert' },
    blockHeight: { type: Number },
    action: { type: String },
    entity: { type: String },
    amount: { type: String },
    blockHash: { type: String },
    previousHash: { type: String },
    timestamp: { type: String },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
