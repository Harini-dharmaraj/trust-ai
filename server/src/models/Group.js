import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true }, // e.g. Apartment, SHG, College Tour, NGO, Event, Emergency
    description: { type: String },
    goalAmount: { type: Number, required: true },
    contributionAmount: { type: Number, required: true },
    deadline: { type: String },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pendingMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['active', 'closed'], default: 'active' },

    // Configurable thresholds for approvals
    noApprovalLimit: { type: Number, default: 2000 },
    adminApprovalLimit: { type: Number, default: 10000 },

    // Invitation link attributes
    inviteToken: { type: String, unique: true, sparse: true },
    inviteExpiry: { type: Date },
    inviteMaxUsage: { type: Number, default: 100 },
    inviteUsageCount: { type: Number, default: 0 },
    inviteEnabled: { type: Boolean, default: true },

    // Direct UPI Payment Configuration for Group Admin
    upiId: { type: String, default: '' }, // e.g. "society@oksbi" or "admin@paytm"
    upiName: { type: String, default: '' }, // e.g. "Ramani's Mayuri Maintenance"
    upiQrImage: { type: String, default: '' }, // Optional custom QR code image
  },
  { timestamps: true }
);

export default mongoose.model('Group', groupSchema);
