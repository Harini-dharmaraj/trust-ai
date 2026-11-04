import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, default: 'Member' },
    choice: { type: String, required: true }, // option text or 'yes' / 'no'
    optionIndex: { type: Number, default: 0 },
    votedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    votesCount: { type: Number, default: 0 }
  },
  { _id: false }
);

const proposalSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String, default: 'Community Member' },
    createdByRole: { type: String, default: 'member' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['expense', 'fund_payout', 'role_delegation', 'general_poll'],
      default: 'expense'
    },
    amount: { type: Number, default: 0 },
    options: [optionSchema],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'expired'],
      default: 'pending'
    },
    approvalMethod: {
      type: String,
      enum: ['voting', 'admin', 'voting_admin'],
      default: 'voting'
    },
    yesVotes: { type: Number, default: 0 },
    noVotes: { type: Number, default: 0 },
    votes: [voteSchema],
    quorum: { type: Number, default: 3 },
    winner: { type: String, default: '' },
    deadline: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Proposal', proposalSchema);
