// src/routes/runRoutes.js
// ---------------------------------------------------------------------
// Run API routes:
// - POST /api/runs/: (requireAuth) Create a new run for the 
//   authenticated user; validates level unlock and bird availability, 
//   returns run + levelConfig (201).
//
// - POST /api/runs/:runId/complete: (requireAuth) Complete an 
//   in-progress run: accepts outcome, birdsFound, score, timestamps; 
//   runs anti-cheat validation, updates run/user stats, may mark run 
//   flagged on violations; returns run + validation result.
// ---------------------------------------------------------------------
import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { createRun, completeRun } from '../controllers/runController.js';

const router = express.Router();

router.post('/', requireAuth, createRun);
router.post('/:runId/complete', requireAuth, completeRun);

export default router;