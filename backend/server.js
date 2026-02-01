require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const http = require('http');
const WebSocket = require('ws');

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Group = require('./models/Group');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const settlementRoutes = require('./routes/settlements');
const settlementPayRoutes = require('./routes/settlementPay');
const walletRoutes = require('./routes/wallets');
const friendRoutes = require('./routes/friends');
const activityRoutes = require('./routes/activity');
const notificationRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting - More permissive in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});
app.use(limiter);

// CORS configuration - Permissive for development
let corsOptions;

if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  // Very permissive CORS for development
  corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow localhost and 127.0.0.1 on any port
      const allowedOrigins = [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^http:\/\/10\.10\.\d+\.\d+:\d+$/,
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/
      ];
      
      const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true); // Still allow in dev mode
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
  };
  console.log('🔓 Development mode: CORS allows all origins');
} else {
  // Restrictive CORS for production
  corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
      
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
}

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Static files - cache for 1 day to reduce repeat requests
app.use('/uploads', express.static('uploads', { maxAge: 86400000 }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settle', settlementRoutes);
app.use('/api/settlements', settlementPayRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

const server = http.createServer(app);

// WebSocket server for notifications
const notificationWss = new WebSocket.Server({ 
  server,
  path: '/api/notifications/ws'
});

// WebSocket server for group chat
const chatWss = new WebSocket.Server({ 
  server,
  path: '/api/chat/ws'
});

// Store active WebSocket connections for notifications (by userId)
const notificationConnections = new Map();

// Store active WebSocket connections for chat (by groupId -> Set of userIds -> ws)
const chatConnections = new Map();

// Notifications WebSocket
notificationWss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.pathname.split('/').pop();
  
  console.log(`Notification WebSocket connected for user: ${userId}`);
  
  // Store connection
  notificationConnections.set(userId, ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connected successfully'
  }));
  
  ws.on('close', () => {
    console.log(`Notification WebSocket disconnected for user: ${userId}`);
    notificationConnections.delete(userId);
  });
  
  ws.on('error', (error) => {
    console.error(`Notification WebSocket error for user ${userId}:`, error);
    notificationConnections.delete(userId);
  });
});

// Chat WebSocket
chatWss.on('connection', async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const groupId = url.searchParams.get('groupId');
  const userIdParam = url.searchParams.get('userId');
  
  if (!groupId) {
    ws.close(1008, 'Missing groupId');
    return;
  }

  // Verify token and get user
  let userId;
  try {
    if (token) {
      const jwt = require('jsonwebtoken');
      const User = require('./models/User');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        ws.close(1008, 'Invalid token');
        return;
      }
      userId = user._id.toString();
    } else if (userIdParam) {
      // Fallback: use userId from query param (for development)
      userId = userIdParam;
    } else {
      ws.close(1008, 'Missing authentication');
      return;
    }
  } catch (error) {
    console.error('WebSocket auth error:', error);
    ws.close(1008, 'Invalid authentication');
    return;
  }

  // Verify user is a member of the group
  try {
    const Group = require('./models/Group');
    const group = await Group.findById(groupId);
    if (!group) {
      ws.close(1008, 'Group not found');
      return;
    }

    const isMember = await group.isMember(userId);
    if (!isMember) {
      ws.close(1008, 'Not a member of this group');
      return;
    }
  } catch (error) {
    console.error('Error verifying group membership:', error);
    ws.close(1011, 'Server error');
    return;
  }

  console.log(`Chat WebSocket connected: user ${userId} to group ${groupId}`);
  
  // Initialize group connections if needed
  if (!chatConnections.has(groupId)) {
    chatConnections.set(groupId, new Map());
  }
  
  const groupConnections = chatConnections.get(groupId);
  groupConnections.set(userId, ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Chat WebSocket connected successfully',
    groupId
  }));
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle ping/pong for keepalive
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`Chat WebSocket disconnected: user ${userId} from group ${groupId}`);
    const groupConnections = chatConnections.get(groupId);
    if (groupConnections) {
      groupConnections.delete(userId);
      if (groupConnections.size === 0) {
        chatConnections.delete(groupId);
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error(`Chat WebSocket error for user ${userId} in group ${groupId}:`, error);
    const groupConnections = chatConnections.get(groupId);
    if (groupConnections) {
      groupConnections.delete(userId);
      if (groupConnections.size === 0) {
        chatConnections.delete(groupId);
      }
    }
  });
});

// Function to send notification to specific user
global.sendNotificationToUser = (userId, notification) => {
  const ws = notificationConnections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(notification));
  }
};

// Function to broadcast message to all members of a group
global.broadcastToGroup = (groupId, message) => {
  const groupConnections = chatConnections.get(groupId.toString());
  if (!groupConnections) {
    return;
  }

  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  groupConnections.forEach((ws, userId) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageStr);
        sentCount++;
      } catch (error) {
        console.error(`Error sending message to user ${userId} in group ${groupId}:`, error);
      }
    }
  });
  
  console.log(`Broadcasted message to ${sentCount} users in group ${groupId}`);
};

server.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`Notification WebSocket: ws://localhost:${PORT}/api/notifications/ws`);
  logger.info(`Chat WebSocket: ws://localhost:${PORT}/api/chat/ws`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;