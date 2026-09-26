import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, default: 'member' },
    text: { type: String, required: true },
    attachment: { type: String }, // optional Cloudinary file link
    timestamp: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Message', messageSchema);
