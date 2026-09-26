import express from 'express';
import crypto from 'crypto';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.middleware.js';
import { readStore, writeStore } from '../utils/db.js';

const router = express.Router();

// Retrieve all groups or only group-admin specific groups
router.get('/', protect, async (req, res) => {
  const store = readStore();
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let groups = [];
    if (userRole === 'superadmin') {
      groups = await Group.find().populate('admin', 'name email').populate('members', 'name email role trustScore');
    } else if (userRole === 'admin') {
      groups = await Group.find({ admin: userId }).populate('admin', 'name email').populate('members', 'name email role trustScore');
    } else {
      // Members see groups they have joined
      groups = await Group.find({
        $or: [
          { admin: userId },
          { members: userId }
        ]
      }).populate('admin', 'name email').populate('members', 'name email role trustScore');
    }
    res.json(groups);
  } catch (error) {
    let filteredGroups = [];
    if (userRole === 'superadmin') {
      filteredGroups = store.groups;
    } else if (userRole === 'admin') {
      filteredGroups = store.groups.filter(g => g.adminId === userId);
    } else {
      filteredGroups = store.groups.filter(g => g.adminId === userId || g.members?.includes(userId));
    }

    const populated = filteredGroups.map(g => {
      const adminObj = store.users.find(u => u._id === g.adminId) || { _id: g.adminId, name: 'Admin', email: 'admin@trustcircle.ai', role: 'admin' };
      const membersObjs = (g.members || []).map(mid => {
        const u = store.users.find(usr => usr._id === mid);
        return u ? { _id: u._id, name: u.name, email: u.email, role: u.role, trustScore: u.trustScore || 100 } : null;
      }).filter(Boolean);

      return {
        ...g,
        admin: adminObj,
        members: membersObjs
      };
    });
    res.json(populated);
  }
});

// Create Group
router.post('/', protect, async (req, res) => {
  const userId = req.user.id;
  const userName = req.user.name || 'Group Admin';
  const userEmail = req.user.email || 'admin@trustcircle.ai';

  const defaultInviteToken = crypto.randomBytes(6).toString('hex').toUpperCase();

  try {
    const group = await Group.create({
      ...req.body,
      admin: userId,
      members: [userId], // Creator is also the first member
      inviteToken: defaultInviteToken,
      inviteEnabled: true,
    });
    // Add group reference to user profile
    await User.findByIdAndUpdate(userId, { $addToSet: { groupsJoined: group._id } });
    res.status(201).json(group);
  } catch (error) {
    const store = readStore();
    const newGroup = {
      _id: `grp_${Date.now()}`,
      ...req.body,
      adminId: userId,
      admin: { name: userName, email: userEmail },
      members: [userId],
      pendingMembers: [],
      status: 'active',
      inviteToken: defaultInviteToken,
      inviteEnabled: true,
      inviteUsageCount: 0,
      inviteMaxUsage: 100,
      createdAt: new Date(),
    };

    // Update fallback user
    const localUser = store.users.find(u => u._id === userId);
    if (localUser) {
      if (!localUser.groupsJoined) localUser.groupsJoined = [];
      if (!localUser.groupsJoined.includes(newGroup._id)) {
        localUser.groupsJoined.push(newGroup._id);
      }
    }

    store.groups.push(newGroup);
    writeStore(store);

    res.status(201).json(newGroup);
  }
});

// Configure / Update Group Direct UPI QR details (Admin Only)
router.patch('/:id/upi', protect, async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.id;
  const { upiId, upiName, upiQrImage } = req.body;
  const store = readStore();

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    
    // Check admin rights
    const isAdmin = req.user.role === 'superadmin' || group.admin?.toString() === userId;
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only group admin can configure UPI payment details' });
    }

    if (upiId !== undefined) group.upiId = upiId.trim();
    if (upiName !== undefined) group.upiName = upiName.trim();
    if (upiQrImage !== undefined) group.upiQrImage = upiQrImage;

    await group.save();

    // Also sync to store
    const localGroup = store.groups?.find(g => g._id === groupId || g._id?.toString() === groupId);
    if (localGroup) {
      if (upiId !== undefined) localGroup.upiId = upiId.trim();
      if (upiName !== undefined) localGroup.upiName = upiName.trim();
      if (upiQrImage !== undefined) localGroup.upiQrImage = upiQrImage;
      writeStore(store);
    }

    res.json({ success: true, message: 'Group UPI payment details updated', group });
  } catch (error) {
    const localGroup = store.groups?.find(g => g._id === groupId || g._id?.toString() === groupId);
    if (!localGroup) return res.status(404).json({ message: 'Group not found' });

    const isAdmin = req.user.role === 'superadmin' || localGroup.adminId === userId;
    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied: Admin permission required' });
    }

    if (upiId !== undefined) localGroup.upiId = upiId.trim();
    if (upiName !== undefined) localGroup.upiName = upiName.trim();
    if (upiQrImage !== undefined) localGroup.upiQrImage = upiQrImage;
    writeStore(store);

    res.json({ success: true, message: 'Group UPI payment details updated locally', group: localGroup });
  }
});

// Generate/Regenerate Invite Link
router.post('/:id/invite/generate', protect, async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.id;
  const { maxUsage, expiry } = req.body;
  const newToken = crypto.randomBytes(6).toString('hex').toUpperCase();

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.admin.toString() !== userId) return res.status(403).json({ message: 'Access denied: Admin permission required' });

    group.inviteToken = newToken;
    group.inviteEnabled = true;
    group.inviteUsageCount = 0;
    if (maxUsage) group.inviteMaxUsage = Number(maxUsage);
    if (expiry) group.inviteExpiry = new Date(expiry);
    
    await group.save();
    res.json(group);
  } catch (error) {
    const store = readStore();
    const group = store.groups.find(g => g._id === groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.adminId !== userId) return res.status(403).json({ message: 'Access denied' });

    group.inviteToken = newToken;
    group.inviteEnabled = true;
    group.inviteUsageCount = 0;
    if (maxUsage) group.inviteMaxUsage = Number(maxUsage);
    if (expiry) group.inviteExpiry = new Date(expiry);

    writeStore(store);
    res.json(group);
  }
});

// Disable Invite Link
router.post('/:id/invite/disable', protect, async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.id;

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.admin.toString() !== userId) return res.status(403).json({ message: 'Access denied' });

    group.inviteEnabled = false;
    await group.save();
    res.json({ message: 'Invite link disabled successfully', group });
  } catch (error) {
    const store = readStore();
    const group = store.groups.find(g => g._id === groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.adminId !== userId) return res.status(403).json({ message: 'Access denied' });

    group.inviteEnabled = false;
    writeStore(store);
    res.json({ message: 'Invite link disabled successfully', group });
  }
});

// Get Invite Info (Public)
router.get('/invite/:token', async (req, res) => {
  const { token } = req.params;
  const store = readStore();

  try {
    const group = await Group.findOne({ inviteToken: token, inviteEnabled: true }).populate('admin', 'name email');
    if (!group) return res.status(404).json({ message: 'Invalid or expired invite link' });
    
    // Check expiry
    if (group.inviteExpiry && new Date() > group.inviteExpiry) {
      return res.status(410).json({ message: 'Invite link has expired' });
    }
    
    // Check max usage
    if (group.inviteMaxUsage && group.inviteUsageCount >= group.inviteMaxUsage) {
      return res.status(410).json({ message: 'Invite link usage limit reached' });
    }

    res.json({
      _id: group._id,
      name: group.name,
      category: group.category,
      description: group.description,
      admin: group.admin,
      members: group.members,
      membersCount: group.members.length,
    });
  } catch (error) {
    const group = store.groups.find(g => g.inviteToken === token && g.inviteEnabled);
    if (!group) return res.status(404).json({ message: 'Invalid or expired invite link' });

    if (group.inviteExpiry && new Date() > new Date(group.inviteExpiry)) {
      return res.status(410).json({ message: 'Invite link has expired' });
    }
    if (group.inviteMaxUsage && group.inviteUsageCount >= group.inviteMaxUsage) {
      return res.status(410).json({ message: 'Invite link usage limit reached' });
    }

    res.json({
      _id: group._id,
      name: group.name,
      category: group.category,
      description: group.description,
      admin: group.admin || { name: 'Admin' },
      members: group.members || [],
      membersCount: group.members?.length || 1,
    });
  }
});

// Join Group using Invite Token
router.post('/invite/:token/join', protect, async (req, res) => {
  const { token } = req.params;
  const userId = req.user.id;
  const store = readStore();

  try {
    const group = await Group.findOne({ inviteToken: token, inviteEnabled: true });
    if (!group) return res.status(404).json({ message: 'Invalid or disabled invite' });

    if (group.inviteExpiry && new Date() > group.inviteExpiry) {
      return res.status(410).json({ message: 'Invite has expired' });
    }

    if (group.inviteMaxUsage && group.inviteUsageCount >= group.inviteMaxUsage) {
      return res.status(410).json({ message: 'Invite usage limit reached' });
    }

    // Check if user is already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'You are already a member of this community group.' });
    }

    group.members.push(userId);
    group.inviteUsageCount += 1;
    await group.save();

    await User.findByIdAndUpdate(userId, { $addToSet: { groupsJoined: group._id } });

    res.json({ success: true, message: 'Joined group successfully', groupId: group._id });
  } catch (error) {
    const group = store.groups.find(g => g.inviteToken === token && g.inviteEnabled);
    if (!group) return res.status(404).json({ message: 'Invalid or disabled invite' });

    if (group.inviteExpiry && new Date() > new Date(group.inviteExpiry)) {
      return res.status(410).json({ message: 'Invite has expired' });
    }

    if (group.inviteMaxUsage && group.inviteUsageCount >= group.inviteMaxUsage) {
      return res.status(410).json({ message: 'Invite usage limit reached' });
    }

    if (!group.members) group.members = [];
    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'You are already a member of this community group.' });
    }

    group.members.push(userId);
    group.inviteUsageCount = (group.inviteUsageCount || 0) + 1;

    const userObj = store.users.find(u => u._id === userId);
    if (userObj) {
      if (!userObj.groupsJoined) userObj.groupsJoined = [];
      userObj.groupsJoined.push(group._id);
    }

    writeStore(store);
    res.json({ success: true, message: 'Joined group successfully', groupId: group._id });
  }
});

export default router;
