import mongoose from 'mongoose';
import { getLevelConfig } from './difficultyEngine.js';

const ROUND_DURATION_MS = 5 * 60 * 1000;
const DURATION_TOLERANCE_MS = 10 * 1000;

export function validateRun({
  run,
  outcome,
  birdsFound,
  spawnedBirds = [],
  endedAt = new Date(),
  previousMaxLevel = 0
}) {
  const violations = [];
  const submittedBirds = Array.isArray(birdsFound) ? birdsFound : [];
  const uniqueBirds = new Set(submittedBirds);

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

  if (submittedBirds.some((id) => !mongoose.isValidObjectId(id))) {
    violations.push('birdsFound contains invalid bird IDs');
  }

  if (uniqueBirds.size !== submittedBirds.length) {
    violations.push('birdsFound contains duplicate bird IDs');
  }

  const spawnedIds = new Set(
    spawnedBirds
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => id.toString())
  );

  if (spawnedIds.size > 0) {
    const unspawnedBird = submittedBirds.some(
      (id) => !spawnedIds.has(id.toString())
    );

    if (unspawnedBird) {
      violations.push('A submitted bird was not spawned for this run');
    }
  }

  if (foundCount > spawnedIds.size && spawnedIds.size > 0) {
    violations.push('More birds were found than were spawned');
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