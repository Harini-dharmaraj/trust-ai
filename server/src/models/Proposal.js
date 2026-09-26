import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  choice: { type: String, enum: ['yes', 'no'], required: true }
}, { _id: false });

const proposalSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'expired'], default: 'pending' },
    approvalMethod: { type: String, enum: ['admin', 'voting', 'voting_admin'], default: 'voting' },
    yesVotes: { type: Number, default: 0 },
    noVotes: { type: Number, default: 0 },
    votes: [voteSchema],
    deadline: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Proposal', proposalSchema);
