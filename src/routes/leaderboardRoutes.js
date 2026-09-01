import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getLeaderboard } from '../controllers/leaderboardController.js';

const router = express.Router();

// Requires login to view - leaderboard is not public.
router.get('/', requireAuth, getLeaderboard);

export default router;