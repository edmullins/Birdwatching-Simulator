import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { listAvailableBirds } from '../controllers/birdController.js';

const router = express.Router();

router.get('/', requireAuth, listAvailableBirds);

export default router;