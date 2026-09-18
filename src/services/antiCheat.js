// src/services/antiCheat.js 
// ---------------------------------------------------------------------
// Server-side run validator: checks durations, sequential level rules, 
// bird ID validity/availability, and produces valid + violations.
// ---------------------------------------------------------------------
import mongoose from 'mongoose';
import Bird from '../models/bird.js';
import { getLevelConfig } from './difficultyEngine.js';

const ROUND_DURATION_MS = 5 * 60 * 1000;
const DURATION_TOLERANCE_MS = 10 * 1000;

export async function validateRun({
  run,
  userId,
  outcome,
  birdsFound,
  endedAt = new Date(),
  previousMaxLevel = 0
}) {
  const violations = [];
  const submittedBirds = Array.isArray(birdsFound) ? birdsFound : [];

  if (!Array.isArray(birdsFound)) {
    violations.push('birdsFound must be an array');
  }

  const config = getLevelConfig(run.levelReached);
  const requiredBirds = config.minBirdsRequired;
  const elapsedMs = endedAt.getTime() - run.startedAt.getTime();
  const foundCount = submittedBirds.length;

  if (elapsedMs < 0) {
    violations.push('Run ended before it started');
  }

  if (run.levelReached > previousMaxLevel + 1) {
    violations.push('Levels must be completed sequentially');
  }

  const validObjectIds = submittedBirds.filter((id) =>
    mongoose.isValidObjectId(id)
  );

  if (validObjectIds.length !== submittedBirds.length) {
    violations.push('birdsFound contains invalid bird IDs');
  }

  const availableBirds = await Bird.find({
    _id: { $in: validObjectIds },
    $or: [
      { visibility: 'approved' },
      {
        ownerId: userId,
        visibility: 'private'
      }
    ]
  })
    .select('_id')
    .lean();

  const availableIds = new Set(
    availableBirds.map((bird) => bird._id.toString())
  );

  const unavailableBird = validObjectIds.some(
    (id) => !availableIds.has(id.toString())
  );

  if (unavailableBird) {
    violations.push('A submitted bird is not available for this run');
  }

  const clearedEarly =
    outcome === 'cleared' &&
    foundCount >= requiredBirds &&
    elapsedMs <= ROUND_DURATION_MS + DURATION_TOLERANCE_MS;

  const completedAfterTimeout =
    outcome === 'timeout' &&
    elapsedMs >= ROUND_DURATION_MS - DURATION_TOLERANCE_MS;

  if (!clearedEarly && !completedAfterTimeout) {
    violations.push('Run duration does not match its outcome');
  }

  if (outcome === 'cleared' && foundCount < requiredBirds) {
    violations.push('Run was cleared before finding the required birds');
  }

  if (!['cleared', 'timeout'].includes(outcome)) {
    violations.push('Invalid run outcome');
  }

  return {
    valid: violations.length === 0,
    violations,
    elapsedMs,
    foundCount
  };
}