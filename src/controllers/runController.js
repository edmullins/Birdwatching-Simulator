// src/controllers/runController.js 
// ---------------------------------------------------------------------
// Creates runs (validates unlocks/available birds), reads one run, completes
// runs (validates via anti-cheat, updates run/user stats, flags suspicious
// runs), and deletes abandoned in-progress runs.
// ---------------------------------------------------------------------
import Run from '../models/run.js';
import User from '../models/user.js';
import mongoose from 'mongoose';
import { getLevelConfig } from '../services/difficultyEngine.js';
import { validateRun } from '../services/antiCheat.js';
import Bird from '../models/bird.js';

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
    const availableBirds = await Bird.find({
      $or: [
        { visibility: 'approved' },
        {
          ownerId: user._id,
          visibility: 'private'
        }
      ]
    }).select('_id');

    if (availableBirds.length === 0) {
      return res.status(503).json({
        message: 'No birds are available for this level'
      });
    }

    const now = new Date();

    const run = await Run.create({
      userId: user._id,
      levelReached: levelNumber,
      startedAt: now,
      levelTimestamps: [
        {
          enteredAt: now
        }
      ],
      status: 'in_progress'
    });

    res.status(201).json({ run, levelConfig });
  } catch (error) {
    console.error('createRun error:', error);
    res.status(500).json({ message: 'Failed to create run' });
  }
}

// Complete an in-progress run: attach birdsFound and timestamps, mark ended
// Get one run (owner only)
export async function getRun(req, res) {
  try {
    const { runId } = req.params;
    if (!mongoose.isValidObjectId(runId)) {
      return res.status(400).json({ message: 'Invalid run id' });
    }

    const run = await Run.findOne({ _id: runId, userId: req.session.userId });
    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }

    res.json({ run });
  } catch (error) {
    console.error('getRun error:', error);
    res.status(500).json({ message: 'Failed to load run' });
  }
}

// Complete an in-progress run (PATCH /api/runs/:runId): attach birdsFound
// and timestamps, mark ended
export async function completeRun(req, res) {
  try {
    const { runId } = req.params;
    if (!mongoose.isValidObjectId(runId)) {
      return res.status(400).json({ message: 'Invalid run id' });
    }
    const {
      outcome = 'timeout',
      birdsFound = [],
      levelTimestamps = [],
      score = 0
    } = req.body ?? {};

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

    run.birdsFound = Array.isArray(birdsFound) ? birdsFound : [];

    run.levelTimestamps =
      Array.isArray(levelTimestamps) && levelTimestamps.length
        ? levelTimestamps
        : run.levelTimestamps;

    const endedAt = new Date();

    const user = await User.findById(req.session.userId);

    const validation = await validateRun({
      run,
      userId: req.session.userId,
      outcome,
      birdsFound,
      endedAt,
      previousMaxLevel: user?.stats?.maxLevelReached ?? 0
    });

    const validBirdIds = Array.isArray(birdsFound)
      ? birdsFound.filter((id) => mongoose.isValidObjectId(id))
      : [];

    run.birdsFound = validBirdIds.map((id) => id.toString());
    run.endedAt = endedAt;
    run.status = validation.valid ? 'completed' : 'flagged';

    await run.save();

    if (user && validation.valid) {
      user.stats = user.stats || {};

      if (
        outcome === 'cleared' &&
        run.levelReached > (user.stats.maxLevelReached ?? 0)
      ) {
        user.stats.maxLevelReached = run.levelReached;
        user.stats.totalRuns = (user.stats.totalRuns ?? 0) + 1;
      }
      else if (outcome === 'cleared' || outcome === 'timeout') {
        user.stats.totalRuns = (user.stats.totalRuns ?? 0) + 1;
      }

      if (submittedScore > (user.stats.bestScore ?? 0)) {
        user.stats.bestScore = submittedScore;
      }

      user.stats.totalBirdsFound =
        (user.stats.totalBirdsFound ?? 0) + validation.foundCount;

      await user.save();
    }

    return res.json({
      run,
      validation: {
        valid: validation.valid,
        violations: validation.violations
      }
    });
  } catch (error) {
    console.error('completeRun error:', error);
    res.status(500).json({ message: 'Failed to complete run' });
  }
}
// Delete an abandoned run (DELETE /api/runs/:runId). Only 'in_progress'
// runs can be deleted: completed/flagged runs are the anti-cheat audit
// trail (design doc §7: flagged runs are kept for review, not lost).
// The client calls this when the player leaves a level early.
export async function deleteRun(req, res) {
  try {
    const { runId } = req.params;
    if (!mongoose.isValidObjectId(runId)) {
      return res.status(400).json({ message: 'Invalid run id' });
    }

    // Single atomic query: owner + in_progress must both match.
    const deleted = await Run.findOneAndDelete({
      _id: runId,
      userId: req.session.userId,
      status: 'in_progress'
    });
    if (deleted) return res.status(204).end();

    // Nothing deleted: tell "not yours / doesn't exist" from "already finished".
    const exists = await Run.exists({ _id: runId, userId: req.session.userId });
    if (exists) {
      return res.status(409).json({ message: 'Only in-progress runs can be deleted' });
    }
    return res.status(404).json({ message: 'Run not found' });
  } catch (error) {
    console.error('deleteRun error:', error);
    res.status(500).json({ message: 'Failed to delete run' });
  }
}