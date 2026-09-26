import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['member', 'admin', 'superadmin'], default: 'member' },
    trustScore: { type: Number, default: 100 },
    groupsJoined: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
