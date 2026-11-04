import express from 'express';
import Proposal from '../models/Proposal.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.middleware.js';
import { readStore, writeStore } from '../utils/db.js';

const router = express.Router();

// Helper to determine winner and quorum status
function calculateProposalProgress(proposal) {
  const totalVotes = proposal.votes?.length || 0;
  const quorum = proposal.quorum || 3;

  if (proposal.category === 'expense') {
    if (totalVotes >= quorum) {
      proposal.status = proposal.yesVotes > proposal.noVotes ? 'approved' : 'rejected';
      proposal.winner = proposal.status === 'approved' ? 'Approved by Majority' : 'Rejected';
    }
  } else {
    // Multi-option / candidate voting
    if (proposal.options && proposal.options.length > 0) {
      let topOption = proposal.options[0];
      for (const opt of proposal.options) {
        if ((opt.votesCount || 0) > (topOption.votesCount || 0)) {
          topOption = opt;
        }
      }
      proposal.winner = topOption?.text || '';
      if (totalVotes >= quorum) {
        proposal.status = 'completed';
      }
    }
  }
  return proposal;
}

// 1. Get all proposals for a group
router.get('/', protect, async (req, res) => {
  const { groupId } = req.query;
  const store = readStore();

  try {
    const proposals = await Proposal.find({ groupId }).sort({ createdAt: -1 });
    res.json(proposals);
  } catch (error) {
    // Filter local proposals by active group
    const filtered = (store.proposals || []).filter((p) => p.groupId === groupId);
    res.json(filtered);
  }
});

// 2. Create dynamic multi-purpose proposal / poll (open to ANY member)
router.post('/', protect, async (req, res) => {
  const {
    title,
    description = '',
    category = 'expense',
    amount = 0,
    options = [],
    quorum = 3,
    approvalMethod = 'voting',
    groupId,
  } = req.body;

  if (!title || !groupId) {
    return res.status(400).json({ message: 'Title and groupId are required.' });
  }

  const io = req.app.get('io');
  const store = readStore();

  // Normalize options based on category
  let normalizedOptions = [];
  if (category === 'expense') {
    normalizedOptions = [
      { text: 'Approve (Yes)', votesCount: 0 },
      { text: 'Reject (No)', votesCount: 0 },
    ];
  } else if (Array.isArray(options) && options.length > 0) {
    normalizedOptions = options.map((opt) => ({
      text: typeof opt === 'string' ? opt.trim() : (opt?.text || '').trim(),
      votesCount: 0,
    })).filter((opt) => Boolean(opt.text));
  } else {
    // Default fallback options
    normalizedOptions = [
      { text: 'Option A', votesCount: 0 },
      { text: 'Option B', votesCount: 0 },
    ];
  }

  const categoryLabels = {
    expense: 'Budget Expense Approval',
    fund_payout: 'Rotating Pool / Chit Payout',
    role_delegation: 'Role & Responsibility Delegation',
    general_poll: 'Community Decision Poll',
  };

  const notifData = {
    groupId,
    title: `New Proposal: ${title}`,
    message: `${req.user.name || 'A member'} created a new ${categoryLabels[category] || 'vote'} for the community.`,
    type: 'proposal',
    amount: amount > 0 ? `₹${Number(amount).toLocaleString()}` : '',
    action: 'Proposal Created',
    entity: title,
    timestamp: new Date().toLocaleString(),
    createdAt: new Date(),
    read: false,
  };

  try {
    const proposal = await Proposal.create({
      groupId,
      createdBy: req.user.id,
      createdByName: req.user.name || 'Community Member',
      createdByRole: req.user.role || 'member',
      title,
      description,
      category,
      amount: Number(amount || 0),
      options: normalizedOptions,
      quorum: Number(quorum || 3),
      approvalMethod,
      yesVotes: 0,
      noVotes: 0,
      votes: [],
      status: 'pending',
    });

    try {
      await Notification.create(notifData);
    } catch (e) {}

    store.notifications = store.notifications || [];
    store.notifications.unshift({ _id: `notif_${Date.now()}`, ...notifData });
    writeStore(store);

    if (io) {
      io.to(groupId).emit('new_proposal', proposal);
      io.to(groupId).emit('new_notification', notifData);
    }

    res.status(201).json(proposal);
  } catch (error) {
    // Fallback store creation
    const newProposal = {
      _id: `prop_${Date.now()}`,
      groupId,
      createdBy: req.user.id,
      createdByName: req.user.name || 'Community Member',
      createdByRole: req.user.role || 'member',
      title,
      description,
      category,
      amount: Number(amount || 0),
      options: normalizedOptions,
      quorum: Number(quorum || 3),
      approvalMethod,
      yesVotes: 0,
      noVotes: 0,
      votes: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    store.proposals = store.proposals || [];
    store.proposals.unshift(newProposal);
    store.notifications = store.notifications || [];
    store.notifications.unshift({ _id: `notif_${Date.now()}`, ...notifData });
    writeStore(store);

    if (io) {
      io.to(groupId).emit('new_proposal', newProposal);
      io.to(groupId).emit('new_notification', notifData);
    }

    res.status(201).json(newProposal);
  }
});

// 3. Cast a vote on any proposal / candidate / option
router.post('/:id/vote', protect, async (req, res) => {
  const { choice, optionIndex } = req.body;
  const userId = req.user.id;
  const userName = req.user.name || 'Member';
  const io = req.app.get('io');
  const store = readStore();

  try {
    let proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      throw new Error('Not found in MongoDB');
    }

    // Initialize arrays if missing
    proposal.votes = proposal.votes || [];
    proposal.options = proposal.options || [];

    // Check if user already voted
    const existingIndex = proposal.votes.findIndex(
      (v) => v.user?.toString() === userId.toString()
    );

    const targetChoice = choice || (optionIndex !== undefined && proposal.options[optionIndex]?.text) || 'yes';
    const targetOptIndex = optionIndex !== undefined ? Number(optionIndex) : proposal.options.findIndex((o) => o.text.toLowerCase() === targetChoice.toLowerCase());

    if (existingIndex >= 0) {
      // User is changing their vote
      const oldVote = proposal.votes[existingIndex];
      // Decrement old option
      if (oldVote.optionIndex !== undefined && proposal.options[oldVote.optionIndex]) {
        proposal.options[oldVote.optionIndex].votesCount = Math.max(0, (proposal.options[oldVote.optionIndex].votesCount || 1) - 1);
      }
      if (oldVote.choice?.toLowerCase() === 'yes' || oldVote.choice?.toLowerCase() === 'approve (yes)') {
        proposal.yesVotes = Math.max(0, (proposal.yesVotes || 1) - 1);
      } else if (oldVote.choice?.toLowerCase() === 'no' || oldVote.choice?.toLowerCase() === 'reject (no)') {
        proposal.noVotes = Math.max(0, (proposal.noVotes || 1) - 1);
      }

      // Update vote entry
      proposal.votes[existingIndex] = {
        user: userId,
        userName,
        choice: targetChoice,
        optionIndex: targetOptIndex >= 0 ? targetOptIndex : 0,
        votedAt: new Date(),
      };
    } else {
      // New vote
      proposal.votes.push({
        user: userId,
        userName,
        choice: targetChoice,
        optionIndex: targetOptIndex >= 0 ? targetOptIndex : 0,
        votedAt: new Date(),
      });
    }

    // Increment new selection
    if (targetOptIndex >= 0 && proposal.options[targetOptIndex]) {
      proposal.options[targetOptIndex].votesCount = (proposal.options[targetOptIndex].votesCount || 0) + 1;
    }
    if (targetChoice.toLowerCase() === 'yes' || targetChoice.toLowerCase() === 'approve (yes)') {
      proposal.yesVotes = (proposal.yesVotes || 0) + 1;
    } else if (targetChoice.toLowerCase() === 'no' || targetChoice.toLowerCase() === 'reject (no)') {
      proposal.noVotes = (proposal.noVotes || 0) + 1;
    }

    // Evaluate winner and status
    proposal = calculateProposalProgress(proposal);
    await proposal.save();

    const notifData = {
      groupId: proposal.groupId,
      title: 'Vote Cast on Proposal',
      message: `${userName} voted for "${targetChoice}" on "${proposal.title}".`,
      type: 'vote',
      action: 'Vote Cast',
      entity: proposal.title,
      timestamp: new Date().toLocaleString(),
      createdAt: new Date(),
      read: false,
    };

    try {
      await Notification.create(notifData);
    } catch (e) {}

    store.notifications = store.notifications || [];
    store.notifications.unshift({ _id: `notif_${Date.now()}`, ...notifData });
    writeStore(store);

    if (io) {
      io.to(proposal.groupId.toString()).emit('vote_updated', proposal);
    }

    return res.json(proposal);
  } catch (error) {
    // Fallback in local store
    const propIndex = (store.proposals || []).findIndex((p) => p._id === req.params.id);
    if (propIndex >= 0) {
      let prop = store.proposals[propIndex];
      prop.votes = prop.votes || [];
      prop.options = prop.options || [];

      const targetChoice = choice || (optionIndex !== undefined && prop.options[optionIndex]?.text) || 'yes';
      const targetOptIndex = optionIndex !== undefined ? Number(optionIndex) : prop.options.findIndex((o) => o.text.toLowerCase() === targetChoice.toLowerCase());

      const existingIndex = prop.votes.findIndex((v) => (v.user || '').toString() === userId.toString());

      if (existingIndex >= 0) {
        const oldVote = prop.votes[existingIndex];
        if (oldVote.optionIndex !== undefined && prop.options[oldVote.optionIndex]) {
          prop.options[oldVote.optionIndex].votesCount = Math.max(0, (prop.options[oldVote.optionIndex].votesCount || 1) - 1);
        }
        if (oldVote.choice?.toLowerCase() === 'yes' || oldVote.choice?.toLowerCase() === 'approve (yes)') {
          prop.yesVotes = Math.max(0, (prop.yesVotes || 1) - 1);
        } else if (oldVote.choice?.toLowerCase() === 'no' || oldVote.choice?.toLowerCase() === 'reject (no)') {
          prop.noVotes = Math.max(0, (prop.noVotes || 1) - 1);
        }

        prop.votes[existingIndex] = {
          user: userId,
          userName,
          choice: targetChoice,
          optionIndex: targetOptIndex >= 0 ? targetOptIndex : 0,
          votedAt: new Date().toISOString(),
        };
      } else {
        prop.votes.push({
          user: userId,
          userName,
          choice: targetChoice,
          optionIndex: targetOptIndex >= 0 ? targetOptIndex : 0,
          votedAt: new Date().toISOString(),
        });
      }

      if (targetOptIndex >= 0 && prop.options[targetOptIndex]) {
        prop.options[targetOptIndex].votesCount = (prop.options[targetOptIndex].votesCount || 0) + 1;
      }
      if (targetChoice.toLowerCase() === 'yes' || targetChoice.toLowerCase() === 'approve (yes)') {
        prop.yesVotes = (prop.yesVotes || 0) + 1;
      } else if (targetChoice.toLowerCase() === 'no' || targetChoice.toLowerCase() === 'reject (no)') {
        prop.noVotes = (prop.noVotes || 0) + 1;
      }

      prop = calculateProposalProgress(prop);
      store.proposals[propIndex] = prop;
      writeStore(store);

      if (io) {
        io.to(prop.groupId.toString()).emit('vote_updated', prop);
      }

      return res.json(prop);
    }
  }

  res.status(404).json({ message: 'Proposal not found' });
});

export default router;
