import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import groupRoutes from './routes/group.routes.js';
import financeRoutes from './routes/finance.routes.js';
import proposalRoutes from './routes/proposal.routes.js';
import aiRoutes from './routes/ai.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import chatRoutes from './routes/chat.routes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Map to track active online members per community group: groupId -> Map(socketId -> userData)
const onlineUsersByGroup = new Map();

// Helper to broadcast online members roster
const broadcastOnlineRoster = (groupId) => {
  if (!groupId) return;
  const groupSockets = onlineUsersByGroup.get(groupId);
  const userList = groupSockets ? Array.from(groupSockets.values()) : [];
  // Deduplicate by userId
  const uniqueUsers = [];
  const seenIds = new Set();
  userList.forEach((u) => {
    if (u.userId && !seenIds.has(u.userId.toString())) {
      seenIds.add(u.userId.toString());
      uniqueUsers.push(u);
    }
  });
  io.to(groupId).emit('online_users_update', uniqueUsers);
};

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  let socketGroupId = null;
  let socketUserId = null;

  socket.on('join_group', (payload) => {
    // Support either object { groupId, userId, name, role } or raw string groupId
    const groupId = typeof payload === 'object' ? payload?.groupId : payload;
    const userId = typeof payload === 'object' ? payload?.userId : null;
    const name = typeof payload === 'object' ? payload?.name : null;
    const role = typeof payload === 'object' ? payload?.role : 'member';

    if (!groupId) return;

    socketGroupId = groupId;
    socketUserId = userId;

    socket.join(groupId);

    if (userId) {
      if (!onlineUsersByGroup.has(groupId)) {
        onlineUsersByGroup.set(groupId, new Map());
      }
      onlineUsersByGroup.get(groupId).set(socket.id, {
        socketId: socket.id,
        userId: userId.toString(),
        name: name || 'Community Member',
        role: role || 'member',
        status: 'online',
        joinedAt: new Date().toISOString(),
      });
      broadcastOnlineRoster(groupId);
    }
  });

  socket.on('leave_group', (groupId) => {
    const targetGroup = groupId || socketGroupId;
    if (targetGroup && onlineUsersByGroup.has(targetGroup)) {
      onlineUsersByGroup.get(targetGroup).delete(socket.id);
      broadcastOnlineRoster(targetGroup);
    }
    if (targetGroup) socket.leave(targetGroup);
  });

  socket.on('send_message', (data) => {
    // Broadcast exclusively to the group room
    io.to(data.groupId).emit('receive_message', data);
    io.to(data.groupId).emit('new_notification', {
      _id: `live_chat_${Date.now()}`,
      groupId: data.groupId,
      title: `Chat message from ${data.sender || 'Member'}`,
      message: data.text ? (data.text.length > 120 ? data.text.substring(0, 120) + '...' : data.text) : 'Sent an attachment',
      type: 'chat',
      action: 'chat_message',
      entity: data.sender || 'Member',
      timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      read: false,
    });
  });

  socket.on('cast_vote', (data) => {
    io.to(data.groupId).emit('vote_updated', data);
  });

  socket.on('proposal_created', (data) => {
    io.to(data.groupId).emit('new_proposal', data);
  });

  socket.on('disconnect', () => {
    if (socketGroupId && onlineUsersByGroup.has(socketGroupId)) {
      onlineUsersByGroup.get(socketGroupId).delete(socket.id);
      broadcastOnlineRoster(socketGroupId);
    }
  });
});

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'TrustCircle AI API is operational with Socket.IO & AI Ledger' });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

// Serve client frontend in production
if (process.env.NODE_ENV === 'production' || process.env.SERVE_CLIENT === 'true') {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send('TrustCircle AI backend server is active');
  });
}

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trustcircle-ai')
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection notice:', err.message);
    server.listen(PORT, () => console.log(`Server running on port ${PORT} (Standalone mode)`));
  });

export { app, io };
