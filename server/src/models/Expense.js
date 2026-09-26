import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Recorded by
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    status: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'approved' },
    description: { type: String },
    
    // Approval Configuration
    approvalMethod: { type: String, enum: ['none', 'admin', 'voting', 'voting_admin'], default: 'none' },
    
    // Receipt Details
    receipt: { type: String }, // Cloudinary URL
    noReceiptReason: { type: String }, // Rationale if no receipt is provided
    proofType: { type: String, default: 'Receipt' }, // Receipt, Invoice, Screenshot, Declaration, No Proof
    blockHash: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Expense', expenseSchema);
