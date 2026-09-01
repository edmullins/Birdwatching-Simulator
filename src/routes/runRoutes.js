import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { createRun, completeRun } from '../controllers/runController.js';

const router = express.Router();

router.post('/', requireAuth, createRun);
router.post('/:runId/complete', requireAuth, completeRun);

export default router;