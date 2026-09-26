// src/routes/birdRoutes.js
// ---------------------------------------------------------------------
// Bird API routes:
// - GET /api/birds/: (requireAuth) List available birds for the caller 
//   (approved + caller's private uploads); returns client-friendly bird
//   payload.
// - GET /api/birds?visibility=approved: (requireAuth) Approved birds only,
//   independent of who is logged in — the Field Guide's catalog.
// ---------------------------------------------------------------------
import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { listAvailableBirds } from '../controllers/birdController.js';

const router = express.Router();

router.get('/', requireAuth, listAvailableBirds);

export default router;