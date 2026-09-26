import express from 'express';
import Proposal from '../models/Proposal.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.middleware.js';
import { readStore, writeStore } from '../utils/db.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const { groupId } = req.query;
  const store = readStore();

  try {
    const proposals = await Proposal.find({ groupId }).sort({ createdAt: -1 });
    res.json(proposals);
  } catch (error) {
    // Filter local proposals by active group
    const filtered = store.proposals.filter(p => p.groupId === groupId);
    res.json(filtered);
  }
});

router.post('/', protect, async (req, res) => {
  const { title, description, amount, groupId } = req.body;
  const store = readStore();

  const notifData = {
    groupId,
    title: 'New Proposal Submitted',
    message: `Proposal "${title}" has been submitted for community voting (Amount: ₹${Number(amount || 0).toLocaleString()}).`,
    type: 'proposal',
    amount: `₹${amount}`,
    action: 'Proposal Created',
    entity: title,
    timestamp: new Date().toLocaleString(),
    createdAt: new Date(),
    read: false,
  };

  try {
    const proposal = await Proposal.create({ title, description, amount, groupId });
    try { await Notification.create(notifData); } catch (e) {}

    store.notifications = store.notifications || [];
    store.notifications.unshift({ _id: `notif_${Date.now()}`, ...notifData });
    writeStore(store);

    res.status(201).json(proposal);
  } catch (error) {
    const newProposal = {
      _id: `prop_${Date.now()}`,
      title,
      description,
      amount,
      groupId,
      status: 'pending',
      yesVotes: 1,
      noVotes: 0,
      createdAt: new Date(),
    };
    store.proposals.push(newProposal);
    store.notifications = store.notifications || [];
    store.notifications.unshift({ _id: `notif_${Date.now()}`, ...notifData });
    writeStore(store);
    res.status(201).json(newProposal);
  }
});

router.post('/:id/vote', protect, async (req, res) => {
  const { choice } = req.body;
  const store = readStore();

  try {
    const proposal = await Proposal.findById(req.params.id);
    if (proposal) {
      if (choice === 'yes') proposal.yesVotes += 1;
      if (choice === 'no') proposal.noVotes += 1;
      await proposal.save();

      const notifData = {
        groupId: proposal.groupId,
        title: 'Ballot Recorded on Proposal',
        message: `A community member voted "${choice.toUpperCase()}" on proposal "${proposal.title}".`,
        type: 'vote',
        action: 'Vote Cast',
        entity: proposal.title,
        timestamp: new Date().toLocaleString(),
        createdAt: new Date(),
        read: false,
      };
      try { await Notification.create(notifData); } catch (e) {}
      store.notifications = store.notifications || [];
      store.notifications.unshift({ _id: `notif_${Date.now()}`, ...notifData });
      writeStore(store);

      return res.json(proposal);
    }
  } catch (error) {
    const prop = store.proposals.find((p) => p._id === req.params.id);
    if (prop) {
      if (choice === 'yes') prop.yesVotes += 1;
      if (choice === 'no') prop.noVotes += 1;

      const notifData = {
        groupId: prop.groupId,
        title: 'Ballot Recorded on Proposal',
        message: `A community member voted "${choice.toUpperCase()}" on proposal "${prop.title}".`,
        type: 'vote',
        action: 'Vote Cast',
        entity: prop.title,
        timestamp: new Date().toLocaleString(),
        createdAt: new Date(),
        read: false,
      };
      store.notifications = store.notifications || [];
      store.notifications.unshift({ _id: `notif_${Date.now()}`, ...notifData });
      writeStore(store);

      return res.json(prop);
    }
  }
  res.status(404).json({ message: 'Proposal not found' });
});

export default router;
