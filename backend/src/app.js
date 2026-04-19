import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

// Import middleware
import { authenticate } from './middlewares/auth.js';
import { requireJWT } from './middlewares/jwtAuth.js';
import requireSubscription from './middlewares/requireSubscription.js';
import { subdomainDetectionMiddleware } from './middlewares/subdomainDetection.js';
import { validateWebhookSignature } from './middlewares/webhookSignatureValidator.js';

// Import Sentry for error tracking
import { initSentry, sentryErrorHandler } from './config/sentry.js';

// Import routes
import webhookRoutes from './routes/webhookRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import authRoutes from './routes/authRoutes.js';
import integrationsRoutes from './routes/integrationsRoutes.js';
import broadcastRoutes from './routes/broadcastRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import pricingRoutes from './routes/pricingRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import paymentWebhookRoutes from './routes/paymentWebhookRoutes.js';
import organizationsRoutes from './routes/organizationsRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import paymentReminderRoutes from './routes/paymentReminderRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { startPaymentStatusPoller } from './jobs/paymentStatusPoller.js';
import jobRoutes from './routes/jobRoutes.js';
import demoRoutes from './routes/demoRoutes.js';
import oauthRoutes from './routes/oauthRoutes.js';
import crmRoutes from './routes/crmRoutes.js';
import discountRoutes from './routes/discountRoutes.js';
import externalApiRoutes from './routes/externalApiRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import apiKeyRoutes from './routes/apiKeyRoutes.js';
import businessPermissionsRoutes from './routes/businessPermissionsRoutes.js';
import enumsRoutes from './routes/enumsRoutes.js';

// Import live chat routes
import liveChatConversationRoutes from './routes/liveChat-conversationRoutes.js';
import liveChatMessageRoutes from './routes/liveChat-messageRoutes.js';
import liveChatTagRoutes from './routes/liveChat-tagRoutes.js';
import mediaRoutes from '../routes/media.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Initialize Sentry error tracking
initSentry(app);

// Middleware - CORS Configuration
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    if (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1') ||
        normalizedOrigin.includes('vercel.app') ||
        normalizedOrigin.includes('whatsapp-platform') ||
        allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-phone-number-id'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// ✅ CRITICAL: Custom body parser that captures raw body AND parses JSON
app.use((req, res, next) => {
  let data = Buffer.alloc(0);
  
  req.on('data', chunk => {
    data = Buffer.concat([data, chunk]);
  });
  
  req.on('end', () => {
    req.rawBody = data.toString('utf-8');
    
    // Now parse the JSON
    try {
      if (req.get('content-type')?.includes('application/json')) {
        req.body = JSON.parse(req.rawBody);
      } else if (req.get('content-type')?.includes('application/x-www-form-urlencoded')) {
        const qs = require('querystring');
        req.body = qs.parse(req.rawBody);
      } else {
        req.body = req.rawBody;
      }
    } catch (e) {
      req.body = {};
    }
    
    next();
  });
});

// Keep express.json() for fallback, but it won't process since body is already parsed
// app.use(express.json({ limit: '100mb' }));
// app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Subdomain detection middleware (RUNS FIRST - extracts workspace context from URL)
app.use(subdomainDetectionMiddleware);

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Basic health check route
app.get('/', (req, res) => {
  res.json({
    message: '🚀 WhatsApp Platform API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint - check JWT validation
app.post('/api/debug/verify-token', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided',
        authHeader: authHeader ? 'present' : 'missing'
      });
    }
    
    // Import jwt here to verify
    import('jsonwebtoken').then(jwt => {
      const JWT_SECRET = process.env.JWT_SECRET || 'whatsapp-platform-jwt-secret-2026';
      try {
        const decoded = jwt.default.verify(token, JWT_SECRET);
        res.json({
          success: true,
          message: 'Token is valid',
          decoded,
          tokenLength: token.length,
          expiresAt: new Date(decoded.exp * 1000)
        });
      } catch (error) {
        res.status(401).json({
          success: false,
          message: 'Token verification failed',
          error: error.message,
          jwtSecret: JWT_SECRET ? '✅ Set' : '❌ Using default',
          tokenLength: token.length
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message
    });
  }
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.json({
      status: 'success',
      message: '✅ Database connected successfully!',
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      collections: await mongoose.connection.db.listCollections().toArray()
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: '❌ Database not connected',
      readyState: mongoose.connection.readyState
    });
  }
});

// Mount webhook routes (NO AUTH - verified by token + HMAC signature validation)
app.use('/api/webhooks', validateWebhookSignature, webhookRoutes);

// ============================================
// AUTH STRATEGY FOR ALL ROUTES (STEP 5 COMPLETE):
// ============================================
// 1. /api/webhooks/* 
//    - X-Hub-Signature-256 validation (HMAC from Meta)
//    - No user auth needed
//    - For incoming webhooks from WhatsApp
//
// 2. /api/auth/* & /api/demo/*
//    - NO AUTH (public endpoints)
//    - Login, logout, demo booking
//
// 3. /api/external/* (Integration API - API Key only)
//    - Requires: wpi_live_<key> in Authorization header OR X-API-Key header
//    - For third-party integrations and external clients
//    - Uses requireApiKey middleware
//    - NEVER use JWT for external APIs
//
// 4. /api/* (Dashboard routes - JWT only)
//    - Requires: Bearer token in Authorization header
//    - For dashboard users, admin, superadmin
//    - Authenticated users only
//    - Uses requireJWT middleware
//
// RULE: Each route type uses ONE auth method. No mixing!
// ============================================

// Mount auth routes (NO AUTH - public login/logout)
app.use('/api/auth', authRoutes);

// ============================================
// NEW: TENANT-ISOLATED AUTH ROUTES (PHASE 1)
// ============================================
// Import new tenant auth
import { tenantAuth, superadminOnly, clientOnly } from './middleware/tenantAuth.js';
import { superadminLogin, clientLogin, refreshToken } from './routes/auth/auth.js';

// Superadmin login endpoint
app.post('/api/auth/superadmin/login', superadminLogin);

// Client login endpoint
app.post('/api/auth/client/login', clientLogin);

// Refresh token endpoint
app.post('/api/auth/refresh-token', refreshToken);

// ============================================
// PHASE 2: WHATSAPP MESSAGE ROUTES (Legacy)
// ============================================
import clientMessagesRoutes from './routes/clientMessagesRoutes.js';
import phase2WebhookRoutes from './routes/phase2WebhookRoutes.js';

// Client message routes (require JWT + tenant isolation)
app.use('/api/client/messages', tenantAuth, clientOnly, clientMessagesRoutes);
app.use('/api/client/conversations', tenantAuth, clientOnly, clientMessagesRoutes);

// WhatsApp webhook (NO AUTH - verified by signature)
app.use('/api/webhooks', phase2WebhookRoutes);

// ============================================
// PHASE 3: REFACTORED ROUTE ARCHITECTURE
// ============================================
// Import refactored routes
import superadminRoutes from './routes/superadmin/index.js';
import clientRoutes from './routes/client/index.js';
import companyRoutes from './routes/company/index.js';

// Mount refactored routes with proper auth
// SUPERADMIN routes: /api/superadmin/* (superadmin only)
app.use('/api/superadmin', tenantAuth, superadminOnly, superadminRoutes);

// CLIENT routes: /api/client/* (regular clients only)
app.use('/api/client', tenantAuth, clientOnly, clientRoutes);

// COMPANY routes: /api/company/* (ReplySQL account only)
app.use('/api/company', tenantAuth, companyRoutes);

// Mount demo routes (PUBLIC - anyone can book a demo)
app.use('/api/demo', demoRoutes);

// Mount enums routes (PUBLIC - anyone can fetch enum definitions)
app.use('/api/enums', enumsRoutes);

// Mount external API routes (API KEY AUTH only - for third-party integrations)
app.use('/api/external', externalApiRoutes);

// Mount settings routes (JWT AUTH only - users need to configure phones even without subscription)
app.use('/api/settings', requireJWT, settingsRoutes);

// ✅ SYSTEM CONSISTENCY: Mount phone-numbers as standalone endpoint (alias for /settings/phone-numbers)
// This ensures both /api/phone-numbers and /api/settings/phone-numbers work for frontend compatibility
app.use('/api/phone-numbers', requireJWT, settingsRoutes);

// Mount dashboard routes (JWT AUTH + SUBSCRIPTION REQUIRED - for logged-in dashboard users)
app.use('/api/templates', requireJWT, requireSubscription, templateRoutes);
app.use('/api/chatbots', requireJWT, requireSubscription, chatbotRoutes);
app.use('/api/messages', requireJWT, requireSubscription, messageRoutes);
app.use('/api/conversations', requireJWT, requireSubscription, conversationRoutes);
app.use('/api/contacts', requireJWT, requireSubscription, contactRoutes);
app.use('/api/broadcasts', requireJWT, requireSubscription, broadcastRoutes);
app.use('/api/campaigns', requireJWT, requireSubscription, campaignRoutes);
app.use('/api/notifications', requireJWT, notificationRoutes); // Notifications accessible without subscription

// Mount pricing routes (PUBLIC for public plans, JWT AUTH for admin)
app.use('/api/pricing', pricingRoutes);

// Mount subscription routes (JWT AUTH for user subscriptions)
app.use('/api/subscriptions', requireJWT, subscriptionRoutes);

// Mount payment routes (JWT AUTH - for payment history and admin stats)
app.use('/api/payment', requireJWT, paymentRoutes);

// Mount payment webhook routes (PUBLIC for Cashfree webhooks, JWT AUTH for status checks)
app.use('/api/payments', paymentWebhookRoutes);

// Mount dashboard routes (JWT AUTH for dashboard statistics)
app.use('/api/dashboard', requireJWT, dashboardRoutes);

// Mount CRM routes (JWT AUTH + SUBSCRIPTION REQUIRED - for managing contacts, conversations, analytics)
app.use('/api/crm', requireJWT, requireSubscription, crmRoutes);

// Mount live chat routes (JWT AUTH + SUBSCRIPTION REQUIRED - for real-time team messaging)
app.use('/api/live-chat/conversations', requireJWT, requireSubscription, liveChatConversationRoutes);
app.use('/api/live-chat/messages', requireJWT, requireSubscription, liveChatMessageRoutes);
app.use('/api/live-chat/tags', requireJWT, requireSubscription, liveChatTagRoutes);

// Mount media routes (JWT AUTH - for media proxy and downloads)
app.use('/api/media', requireJWT, mediaRoutes);

// Mount agent routes (JWT AUTH - for agent management, assignment, invitations)
app.use('/api/agents', agentRoutes);

// Mount self-service account routes (JWT AUTH - for dashboard users)
app.use('/api/account', requireJWT, accountRoutes);
app.use('/api/accounts', requireJWT, accountRoutes); // Alias for Account Dashboard

// Mount organizations admin routes (JWT AUTH - for admin)
app.use('/api/admin/organizations', requireJWT, organizationsRoutes);

// Mount admin routes (JWT AUTH - for superadmin)
app.use('/api/admin', requireJWT, adminRoutes);

// Mount discount configuration routes (JWT AUTH - for superadmin)
app.use('/api/admin/discounts', requireJWT, discountRoutes);

// Mount demo admin routes (JWT AUTH - for superadmin)
app.use('/api/admin/demo-requests', requireJWT, demoRoutes);

// Mount payment reminder routes (JWT AUTH - for admin)
app.use('/api/admin/payment-reminders', requireJWT, paymentReminderRoutes);

// Mount job routes (JWT AUTH - for admin)
app.use('/api/jobs', requireJWT, jobRoutes);

// Mount integration routes (JWT AUTH for OAuth integrations, INTEGRATION TOKEN AUTH for third-party apps)
app.use('/api/integrations', requireJWT, oauthRoutes);

// Mount business permissions routes (JWT AUTH - for managing business advanced permissions)
app.use('/api/business/permissions', requireJWT, businessPermissionsRoutes);

// Mount API key management routes (JWT AUTH)
app.use('/api/integrations/api-keys', apiKeyRoutes);

// Mount external API routes - THIRD-PARTY INTEGRATIONS (API KEY AUTH ONLY)
// Routes at /api/external/* are for external applications using API keys
app.use('/api/external/conversations', integrationsRoutes);
app.use('/api/external/messages', integrationsRoutes);
app.use('/api/external/templates', integrationsRoutes);
app.use('/api/external/contacts', integrationsRoutes);
app.use('/api/external/broadcasts', integrationsRoutes);

// Legacy integration routes (kept for backwards compatibility, same as /api/external/*)
app.use('/api/integrations', integrationsRoutes);

// Leads management (with JWT and subscription)
app.use('/api/leads', requireJWT, requireSubscription, leadRoutes);

// Mount API routes (API KEY AUTH - for external integrations only)
app.use('/api/stats', authenticate, statsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Sentry error handler (should be before other error handlers)
app.use(sentryErrorHandler);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: err.code || 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Setup Socket.io for controllers
export const setupSocketIO = (io) => {
  const { setSocketIO: setWebhookSocketIO } = webhookRoutes;
  const { setSocketIO: setMessageSocketIO } = messageRoutes;
  
  // Pass io instance to webhook controller
  import('./controllers/webhookController.js').then(module => {
    module.setSocketIO(io);
  });
  
  // Pass io instance to message controller
  import('./controllers/messageController.js').then(module => {
    module.setSocketIO(io);
  });

  // Start payment status poller (auto-checks pending payments every 10 seconds)
  startPaymentStatusPoller();
};

export default app;
