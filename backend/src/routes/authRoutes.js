import express from 'express';
import authController from '../controllers/authController.js';
import googleAuthController from '../controllers/googleAuthController.js';
import { requireJWT } from '../middlewares/jwtAuth.js';
import logger from '../utils/logger.js';

import { handleControllerError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, createAppError, validateInput, validateRequest } from '../utils/errorHandler.js';
const router = express.Router();

/**
 * Auth Routes
 * Uses JWT (stateless) for authentication
 */

// Public routes - Email/Password
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/logout', authController.logout);

// Public routes - Google OAuth
router.post('/google/login', googleAuthController.loginWithGoogle);

// Protected route - requires JWT
router.get('/me', requireJWT, authController.getCurrentUser);
router.post('/google/link', requireJWT, googleAuthController.linkGoogleAccount);

export default router;
