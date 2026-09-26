import express from 'express';
import User from '../models/User.js';
import Group from '../models/Group.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Middleware to check superadmin role
const superAdminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'superadmin' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Super Admin privilege required' });
  }
};

// Platform Analytics
router.get('/stats', protect, superAdminOnly, async (_req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalGroups = await Group.countDocuments();
    const payments = await Payment.find();
    const expenses = await Expense.find();

    const totalTransacted = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalSpent = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    res.json({
      totalUsers: totalUsers || 0,
      totalGroups: totalGroups || 0,
      totalTransacted: totalTransacted || 0,
      totalSpent: totalSpent || 0,
      fraudAlertsCount: 0,
      systemHealth: '100% Operational',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// List all users
router.get('/users', protect, superAdminOnly, async (_req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle User Ban Status
router.patch('/users/:id/ban', protect, superAdminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned = !user.isBanned;
    await user.save();

    res.json({ message: `User ${user.name} is now ${user.isBanned ? 'Banned' : 'Active'}`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
