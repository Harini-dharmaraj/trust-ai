import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import { readStore, writeStore } from '../utils/db.js';

const router = express.Router();

router.get('/messages', protect, async (req, res) => {
  const { groupId } = req.query;
  const store = readStore();

  try {
    const dbMessages = await Message.find({ group: groupId }).sort({ createdAt: 1 });
    // Normalize response for frontend
    const formatted = dbMessages.map(m => ({
      id: m._id,
      sender: m.senderName,
      text: m.text,
      attachment: m.attachment,
      groupId: m.group,
      timestamp: m.timestamp,
      role: m.senderRole,
      avatar: m.senderRole === 'admin' || m.senderRole === 'superadmin' ? '👩‍💼' : '👤',
    }));
    res.json(formatted);
  } catch (error) {
    if (!store.messages) store.messages = [];
    const filtered = store.messages.filter(m => m.groupId === groupId);
    res.json(filtered);
  }
});

router.post('/messages', protect, async (req, res) => {
  const { text, attachment, groupId } = req.body;
  const store = readStore();
  
  const timestampString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    const msg = await Message.create({
      group: groupId,
      sender: req.user.id,
      senderName: req.user.name || 'Community Member',
      senderRole: req.user.role || 'member',
      text,
      attachment,
      timestamp: timestampString,
    });

    // Create persistent Notification for this chat message
    try {
      await Notification.create({
        groupId,
        title: `Chat message from ${req.user.name || 'Member'}`,
        message: text ? (text.length > 120 ? text.substring(0, 120) + '...' : text) : 'Sent an attachment',
        type: 'chat',
        action: 'chat_message',
        entity: req.user.name || 'Member',
        timestamp: new Date().toLocaleString(),
        createdAt: new Date(),
        read: false,
      });
    } catch (notifErr) {
      console.error('Failed to create chat notification in DB:', notifErr.message);
    }

    res.status(201).json({
      id: msg._id,
      sender: msg.senderName,
      text: msg.text,
      attachment: msg.attachment,
      groupId: msg.group,
      timestamp: msg.timestamp,
      role: msg.senderRole,
      avatar: msg.senderRole === 'admin' || msg.senderRole === 'superadmin' ? '👩‍💼' : '👤',
    });
  } catch (error) {
    const newMessage = {
      id: `msg_${Date.now()}`,
      sender: req.user?.name || 'Community Member',
      text,
      attachment: attachment || null,
      groupId,
      timestamp: timestampString,
      role: req.user?.role || 'Member',
      avatar: req.user?.role === 'admin' || req.user?.role === 'superadmin' ? '👩‍💼' : '👤',
    };

    if (!store.messages) store.messages = [];
    store.messages.push(newMessage);

    // Record notification in fallback store
    if (!store.notifications) store.notifications = [];
    store.notifications.unshift({
      _id: `notif_${Date.now()}`,
      groupId,
      title: `Chat message from ${req.user?.name || 'Member'}`,
      message: text ? (text.length > 120 ? text.substring(0, 120) + '...' : text) : 'Sent an attachment',
      type: 'chat',
      action: 'chat_message',
      entity: req.user?.name || 'Member',
      timestamp: new Date().toLocaleString(),
      createdAt: new Date(),
      read: false,
    });

    writeStore(store);

    res.status(201).json(newMessage);
  }
});

export default router;
