import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
// import { getLevel } from '../controllers/levelController.js';
// ^ controller not implemented yet - stub handler below until then.

const router = express.Router();

// User-specific: the eventual controller checks levelNumber against the
// caller's own maxLevelReached (403 if it's not exactly +1), so this
// can't be anonymous even though it's a GET.
router.get('/:levelNumber', requireAuth, (req, res) => {
  res.status(501).json({ message: 'not implemented' });
});

export default router;