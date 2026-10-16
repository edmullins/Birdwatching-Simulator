// src/routes/petRoutes.js
// Companion-bird API routes (all requireAuth, all scoped to the caller):
// - GET  /api/pet          Current pet (or null) with decay applied.
// - PUT  /api/pet          Adopt/switch to { birdId }.
// - POST /api/pet/:action  'feed' (+hunger) or 'pet' (+happiness).
import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getPet, choosePet, petAction } from '../controllers/petController.js';

const router = express.Router();

router.get('/', requireAuth, getPet);
router.put('/', requireAuth, choosePet);
router.post('/:action', requireAuth, petAction);

export default router;