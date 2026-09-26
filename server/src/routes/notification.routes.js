import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.middleware.js';
import { readStore, writeStore } from '../utils/db.js';

const router = express.Router();

// GET all real notifications (optionally filtered by active groupId)
router.get('/', protect, async (req, res) => {
  const { groupId } = req.query;
  const store = readStore();
  let dbNotifs = [];

  try {
    const query = groupId ? { groupId } : {};
    dbNotifs = await Notification.find(query).sort({ createdAt: -1 });
  } catch (err) {
    dbNotifs = [];
  }

  // Also gather from local store
  const storeNotifs = (store.notifications || []).filter((n) => {
    if (!groupId) return true;
    return n.groupId === groupId || n.groupId?.toString() === groupId?.toString();
  });

  // Combine and deduplicate
  const merged = [...dbNotifs];
  const seenIds = new Set(dbNotifs.map((n) => n._id?.toString()).filter(Boolean));
  const seenHashes = new Set(dbNotifs.map((n) => n.blockHash).filter(Boolean));

  for (const sn of storeNotifs) {
    const snId = sn._id?.toString();
    if (snId && seenIds.has(snId)) continue;
    if (sn.blockHash && seenHashes.has(sn.blockHash)) continue;

    merged.push(sn);
    if (snId) seenIds.add(snId);
    if (sn.blockHash) seenHashes.add(sn.blockHash);
  }

  // Sort latest first
  merged.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.timestamp || 0).getTime();
    const dateB = new Date(b.createdAt || b.timestamp || 0).getTime();
    return dateB - dateA;
  });

  res.json(merged);
});

// Mark single notification as read
router.patch('/:id/read', protect, async (req, res) => {
  const notifId = req.params.id;
  const store = readStore();

  try {
    await Notification.findByIdAndUpdate(notifId, { read: true });
  } catch (err) {
    // Ignore db err
  }

  if (store.notifications) {
    const local = store.notifications.find((n) => n._id === notifId || n._id?.toString() === notifId);
    if (local) {
      local.read = true;
      writeStore(store);
    }
  }

  res.json({ success: true });
});

// Mark all as read
router.patch('/read-all', protect, async (req, res) => {
  const { groupId } = req.body;
  const store = readStore();

  try {
    const query = groupId ? { groupId } : {};
    await Notification.updateMany(query, { read: true });
  } catch (err) {
    // Ignore db err
  }

  if (store.notifications) {
    store.notifications.forEach((n) => {
      if (!groupId || n.groupId === groupId || n.groupId?.toString() === groupId?.toString()) {
        n.read = true;
      }
    });
    writeStore(store);
  }

  res.json({ success: true, message: 'All notifications marked as read' });
});

// Create notification
router.post('/', protect, async (req, res) => {
  const { groupId, title, message, type, amount, action, entity } = req.body;
  const store = readStore();

  const notifData = {
    groupId,
    title,
    message,
    type: type || 'alert',
    amount,
    action,
    entity,
    timestamp: new Date().toLocaleString(),
    createdAt: new Date(),
    read: false,
  };

  let saved = null;
  try {
    saved = await Notification.create(notifData);
  } catch (err) {
    // fallback to store
  }

  const storeNotif = {
    _id: saved?._id ? saved._id.toString() : `notif_${Date.now()}`,
    ...notifData,
  };

  store.notifications = store.notifications || [];
  store.notifications.unshift(storeNotif);
  writeStore(store);

  res.status(201).json(saved || storeNotif);
});

export default router;
