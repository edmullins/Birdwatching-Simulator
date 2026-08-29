import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
// import { getLeaderboard } from '../controllers/leaderboardController.js';
// ^ controller not implemented yet - stub handler below until then.

const router = express.Router();

// Requires login to view, per spec - leaderboard is not public.
router.get('/', requireAuth, (req, res) => {
  res.status(501).json({ message: 'not implemented' });
});

export default router;