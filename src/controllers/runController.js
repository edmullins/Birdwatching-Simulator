import Run from '../models/run.js';
import User from '../models/user.js';
import mongoose from 'mongoose';
import { getLevelConfig } from '../services/difficultyEngine.js';

// Create a new run for the authenticated user
export async function createRun(req, res) {
  try {
    const { levelNumber } = req.body;
    if (!Number.isInteger(levelNumber) || levelNumber < 1) {
      return res.status(400).json({ message: 'Invalid level number' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const maxReached = user.stats?.maxLevelReached ?? 0;
    if (levelNumber > maxReached + 1) {
      return res.status(403).json({ message: 'Level not unlocked yet' });
    }

    const levelConfig = getLevelConfig(levelNumber);
    const run = await Run.create({
      userId: user._id,
      levelReached: levelNumber,
      startedAt: new Date(),
      levelTimestamps: [{ level: levelNumber, enteredAt: new Date() }],
      status: 'in_progress'
    });

    res.status(201).json({ run, levelConfig });
  } catch (error) {
    console.error('createRun error:', error);
    res.status(500).json({ message: 'Failed to create run' });
  }
}

// Complete an in-progress run: attach birdsFound and timestamps, mark ended
export async function completeRun(req, res) {
  try {
    const { runId } = req.params;
    const {
      outcome = 'timeout',
      birdsFound = [],
      levelTimestamps = [],
      score = 0
    } = req.body ?? {};

    const validBirdIds = Array.isArray(birdsFound)
      ? birdsFound.filter((id) => mongoose.isValidObjectId(id))
      : [];

    const submittedScore = Number.isFinite(score) && score > 0 ? score : 0;

    const run = await Run.findOne({
      _id: runId,
      userId: req.session.userId
    });

    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }

    if (run.status !== 'in_progress') {
      return res.status(400).json({ message: 'Run is not in progress' });
    }

    run.birdsFound = Array.isArray(birdsFound)
      ? validBirdIds
      : run.birdsFound;

    run.levelTimestamps =
      Array.isArray(levelTimestamps) && levelTimestamps.length
        ? levelTimestamps
        : run.levelTimestamps;

    run.endedAt = new Date();
    run.status = 'completed';

    await run.save();

    // bestScore is tracked regardless of outcome (a strong run that
    // times out before hitting minBirdsRequired still earned real
    // points) — only maxLevelReached is gated on 'cleared'.
    const user = await User.findById(req.session.userId);

    if (user) {
      user.stats = user.stats || {};
      let changed = false;

      if (outcome === 'cleared') {
        const previousMax = user.stats.maxLevelReached ?? 0;
        if (run.levelReached > previousMax) {
          user.stats.maxLevelReached = run.levelReached;
          changed = true;
        }
      }

      const previousBest = user.stats.bestScore ?? 0;
      if (submittedScore > previousBest) {
        user.stats.bestScore = submittedScore;
        changed = true;
      }

      const foundCount = Array.isArray(birdsFound) ? birdsFound.length : 0;
      if (foundCount > 0) {
        user.stats.totalBirdsFound =
          (user.stats.totalBirdsFound ?? 0) + foundCount;
        changed = true;
      }

      if (changed) await user.save();
    }

    res.json({ run });
  } catch (error) {
    console.error('completeRun error:', error);
    res.status(500).json({ message: 'Failed to complete run' });
  }
}