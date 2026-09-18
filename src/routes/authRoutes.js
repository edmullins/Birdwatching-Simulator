// src/routes/authRoutes.js 
// ---------------------------------------------------------------------
// Auth API routes:
// - POST /api/auth/register: Create account; validates input, hashes 
//   password, starts session, returns safe user (201).
//
// - POST /api/auth/login: Authenticate; verifies password, regenerates 
//   session, returns safe user (200).
//
// - POST /api/auth/logout: Destroy session, clear cookie (204).
//
// - GET /api/auth/me: Return current user (requireAuth protected); 401 
//   if unauthenticated.
// ---------------------------------------------------------------------
import express from 'express';
import { register, login, logout, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;