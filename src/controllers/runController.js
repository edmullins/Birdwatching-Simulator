import Run from '../models/run.js';
import User from '../models/user.js';
import Level from '../models/level.js';

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

    const levelConfig = await Level.findOne({ levelNumber }) || null;

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
    const { birdsFound = [], levelTimestamps = [] } = req.body;

    const run = await Run.findOne({ _id: runId, userId: req.session.userId });
    if (!run) return res.status(404).json({ message: 'Run not found' });

    if (run.status !== 'in_progress') {
      return res.status(400).json({ message: 'Run is not in progress' });
    }

    run.birdsFound = Array.isArray(birdsFound) ? birdsFound : run.birdsFound;
    run.levelTimestamps = Array.isArray(levelTimestamps) && levelTimestamps.length ? levelTimestamps : run.levelTimestamps;
    run.endedAt = new Date();
    run.status = 'completed';

    await run.save();

    // Update user's maxLevelReached if needed
    const user = await User.findById(req.session.userId);
    if (user) {
      const prev = user.stats?.maxLevelReached ?? 0;
      if (run.levelReached > prev) {
        user.stats = user.stats || {};
        user.stats.maxLevelReached = run.levelReached;
        await user.save();
      }
    }

    res.json({ run });
  } catch (error) {
    console.error('completeRun error:', error);
    res.status(500).json({ message: 'Failed to complete run' });
  }
}