import express from 'express';
import Group from '../models/Group.js';
import Payment from '../models/Payment.js';
import { protect } from '../middleware/auth.middleware.js';
import { readStore } from '../utils/db.js';

const router = express.Router();

router.get('/summary', protect, async (req, res) => {
  const { groupId } = req.query;
  const store = readStore();
  const userId = req.user.id;

  if (!groupId) {
    return res.json({
      totalGroups: (store.groups || []).filter(g => g.adminId === userId).length || 0,
      totalContributions: '₹0',
      pendingPayments: 0,
      trustScore: '100/100',
    });
  }

  let group = null;
  let groupPayments = [];

  try {
    group = await Group.findById(groupId);
  } catch (e) {
    group = null;
  }
  if (!group) {
    group = (store.groups || []).find(g => g._id === groupId || g._id?.toString() === groupId);
  }

  if (!group) {
    return res.json({ totalGroups: 0, totalContributions: '₹0', pendingPayments: 0, trustScore: '100/100' });
  }

  try {
    groupPayments = await Payment.find({
      $or: [{ group: groupId }, { groupId: groupId }]
    });
  } catch (e) {
    groupPayments = [];
  }

  const storePayments = (store.payments || []).filter(
    p => p.groupId === groupId || p.group === groupId
  );

  const paymentMap = new Map();
  groupPayments.forEach(p => {
    const key = p.transactionId || (p._id ? p._id.toString() : null);
    if (key) paymentMap.set(key, p);
  });
  storePayments.forEach(p => {
    const key = p.transactionId || (p._id ? p._id.toString() : null);
    if (key && !paymentMap.has(key)) paymentMap.set(key, p);
  });
  groupPayments = Array.from(paymentMap.values());

  const totalCollected = groupPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  let totalUserGroups = 1;
  try {
    const dbGroupsCount = await Group.countDocuments({
      $or: [{ admin: userId }, { members: userId }]
    });
    totalUserGroups = Math.max(dbGroupsCount, 1);
  } catch (e) {
    const storeCount = (store.groups || []).filter(
      g => g.adminId === userId || g.members?.includes(userId)
    ).length;
    totalUserGroups = Math.max(storeCount, 1);
  }

  res.json({
    totalGroups: totalUserGroups,
    totalContributions: `₹${totalCollected.toLocaleString()}`,
    pendingPayments: group.pendingMembers?.length || 0,
    trustScore: '98/100',
  });
});

export default router;
