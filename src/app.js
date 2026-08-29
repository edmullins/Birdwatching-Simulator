import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { buildSessionMiddleware } from './config/session.js';
import authRoutes from './routes/authRoutes.js';
import levelRoutes from './routes/levelRoutes.js';
import runRoutes from './routes/runRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public'); // src/ -> project root -> public/

const app = express();

app.use(express.json());
app.use(buildSessionMiddleware());
app.use(express.static(publicDir));

app.use('/api/auth', authRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// SPA fallback — anything not matched by the above serves index.html,
// so client-side router.js can handle the view state
app.get('/*splat', (req, res) => {
  res.sendFile(join(publicDir, 'index.html'));
});

export default app;