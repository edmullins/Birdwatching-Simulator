// src/config/pet.js
// Tunables for the companion bird (main-menu pet). Shared by the User
// schema (defaults), the care service (decay + action math) and the pet
// controller so there is exactly one place to rebalance the feature.
//
// NOTE on naming: `hunger` is a *fullness* meter - 100 = well fed, 0 =
// starving - so Feed raises it. Kept as "hunger" to match the UI label.
//
// Decay is computed on read from `pet.lastDecayAt` (no cron/background
// job, per design doc section 6). Override per-environment for quick
// testing, e.g. PET_HUNGER_DECAY_PER_MIN=20 in .env makes a pet starve in
// a few minutes.

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export const PET_MAX_STAT = 100;
export const PET_INITIAL_STAT = 60;  // a brand-new companion starts here
export const PET_ACTION_GAIN = 25;   // Pet => +happiness, Feed => +hunger

// Points lost per minute. 0.1/min = 6/hour: a full meter lasts ~16h, a
// fresh (60) one ~10h. Happiness drains a little slower than hunger.
export const PET_DECAY_PER_MINUTE = {
  hunger: envNumber('PET_HUNGER_DECAY_PER_MIN', 0.1),
  happiness: envNumber('PET_HAPPINESS_DECAY_PER_MIN', 0.07),
};

// URL action -> the stat it raises. Also the allow-list for POST /api/pet/:action.
export const PET_ACTIONS = {
  feed: 'hunger',
  pet: 'happiness',
};