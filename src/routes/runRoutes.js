// src/routes/runRoutes.js
// ---------------------------------------------------------------------
// Run API routes (all requireAuth, all scoped to the calling user):
// - POST   /api/runs/        Create a new run; validates level unlock and
//                            bird availability, returns run + levelConfig (201).
// - GET    /api/runs/:runId  Get one of the caller's runs (404 if not theirs).
// - PATCH  /api/runs/:runId  Complete an in-progress run: accepts outcome,
//                            birdsFound, score, timestamps; runs anti-cheat
//                            validation, updates run/user stats, may mark
//                            the run flagged; returns run + validation.
// - DELETE /api/runs/:runId  Delete an abandoned in-progress run (204);
//                            completed/flagged runs are kept (409).
// ---------------------------------------------------------------------
import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { createRun, getRun, completeRun, deleteRun } from '../controllers/runController.js';

const router = express.Router();

router.post('/', requireAuth, createRun);
router.get('/:runId', requireAuth, getRun);
router.patch('/:runId', requireAuth, completeRun);
router.delete('/:runId', requireAuth, deleteRun);

export default router;