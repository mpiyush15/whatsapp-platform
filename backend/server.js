import app from './src/app.js';
import mongoose from 'mongoose';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { fixUsersAccountIdIndex } from './src/utils/fixUsersAccountIdIndex.js';
import initializeSocket, { broadcastToProject, broadcastToAccount, sendNotificationToUser } from './src/socket/socketHandler.js';
import { setupSocketIOHandlers } from './src/services/liveChat-socketHandler.js';
import { initializeSocketIO } from './src/services/liveChat-socketService.js';
import { startWorkflowTimeoutScheduler } from './src/schedulers/workflowTimeoutScheduler.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5050;
const MONGO_URI = process.env.MONGODB_URI;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io (PHASE 4: Project-scoped real-time updates)
const io = initializeSocket(httpServer);

// Initialize Socket.IO in liveChat service (for emitToConversation, emitToAccount, etc)
initializeSocketIO(io);

// Setup Socket.IO handlers for live chat
setupSocketIOHandlers(io);

// Make io and broadcast helpers available to routes/controllers
app.locals.io = io;
app.locals.broadcastToProject = broadcastToProject;
app.locals.broadcastToAccount = broadcastToAccount;
app.locals.sendNotificationToUser = sendNotificationToUser;

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected successfully');
    await fixUsersAccountIdIndex();
    startWorkflowTimeoutScheduler();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║  🚀 SERVER STARTED SUCCESSFULLY       ║
╠═══════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(33)} ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)} ║
║  Timestamp: ${new Date().toISOString().padEnd(18)} ║
╚═══════════════════════════════════════╝
  `);
});

// Handle server errors
httpServer.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
