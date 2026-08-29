import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
// import { createRun, completeRun } from '../controllers/runController.js';
// ^ controller not implemented yet (Milestone 3) - stub handlers below
//   until then, so this file has something real to export and mount now.

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  res.status(501).json({ message: 'not implemented' });
});

router.post('/:runId/complete', requireAuth, (req, res) => {
  res.status(501).json({ message: 'not implemented' });
});

export default router;