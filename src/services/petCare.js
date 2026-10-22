// src/services/petCare.js
// Pure pet-care math (no DB, no Express) so it is trivial to unit test.
// A "stats" object is { hunger, happiness, lastDecayAt }.
//
// Stats are stored as floats so slow decay is exact; they are only
// rounded for display (displayStat). Reading never writes: decayedStats()
// is a pure function of (stored values, lastDecayAt, now), and the
// controller only persists when an action happens or the bird leaves.
import {
  PET_MAX_STAT,
  PET_INITIAL_STAT,
  PET_ACTION_GAIN,
  PET_DECAY_PER_MINUTE,
  PET_ACTIONS,
} from '../config/pet.js';

// Anything at or below this counts as "hit 0" (float-safe).
const EPSILON = 1e-6;

const clamp = (value) => Math.min(PET_MAX_STAT, Math.max(0, value));

// Starting stats for a newly chosen companion.
export function freshStats(now = new Date()) {
  return { hunger: PET_INITIAL_STAT, happiness: PET_INITIAL_STAT, lastDecayAt: now };
}

// Stored stats with elapsed-time decay applied, stamped at `now`.
export function decayedStats(stored, now = new Date()) {
  const last = stored.lastDecayAt ? new Date(stored.lastDecayAt) : now;
  const minutes = Math.max(0, (now.getTime() - last.getTime()) / 60000);
  return {
    hunger: clamp(stored.hunger - minutes * PET_DECAY_PER_MINUTE.hunger),
    happiness: clamp(stored.happiness - minutes * PET_DECAY_PER_MINUTE.happiness),
    lastDecayAt: now,
  };
}

// True once either meter has run out - the bird leaves for good.
export function hasDeparted(stats) {
  return stats.hunger <= EPSILON || stats.happiness <= EPSILON;
}

// Applies Feed / Pet. `action` must be a key of PET_ACTIONS.
export function applyAction(stats, action) {
  const stat = PET_ACTIONS[action];
  if (!stat) throw new Error(`Unknown pet action: ${action}`);
  return { ...stats, [stat]: clamp(stats[stat] + PET_ACTION_GAIN) };
}

/**
 * Whole number for the UI. Rounds UP so a living bird never displays 0/100;
 * 0 is reserved for "gone".
 */
export function displayStat(value) {
  return Math.min(PET_MAX_STAT, Math.max(0, Math.ceil(value - EPSILON)));
}