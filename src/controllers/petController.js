// src/controllers/petController.js
// Companion-bird endpoints (all requireAuth). The pet lives on the User
// document as user.pet = { birdId, hunger, happiness, lastDecayAt }.
//
//   GET  /api/pet          -> { pet: { hunger, happiness, max, bird } | null,
//                               departed?: { birdId, name } }
//   PUT  /api/pet          body { birdId } - adopt / switch. Switching keeps
//                          the current (decayed) stats; adopting after having
//                          no pet starts fresh.
//   POST /api/pet/feed     +hunger
//   POST /api/pet/pet      +happiness
//
// Whenever a request finds a meter at 0 (after time decay) the pet is
// cleared and the response carries `departed` once, so the client can say
// goodbye. After that the user is simply back to "no pet - pick one".
import mongoose from 'mongoose';
import User from '../models/user.js';
import Bird from '../models/bird.js';
import { BIRD_FIELDS, toBirdPayload } from './birdController.js';
import { PET_MAX_STAT, PET_ACTIONS } from '../config/pet.js';
import { freshStats, decayedStats, hasDeparted, applyAction, displayStat } from '../services/petCare.js';

const statsPayload = (stats) => ({
  hunger: displayStat(stats.hunger),
  happiness: displayStat(stats.happiness),
  max: PET_MAX_STAT,
});

// Any approved, official (ownerId: null) bird can be a companion.
// To keep the old "Basic/Rare only" idea, add `rarity: { $in: [...] }` here.
const adoptableBird = (id) =>
  Bird.findOne({ _id: id, ownerId: null, visibility: 'approved' }).select(BIRD_FIELDS).lean();

async function loadUser(req, res) {
  const user = await User.findById(req.session.userId).select('pet');
  if (!user) {
    // Session points at a deleted account - same handling as authController.me.
    req.session.destroy(() => {});
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return user;
}

/**
 * Applies decay to the user's pet.
 *   { none: true }       - no pet selected
 *   { departed: {...} }  - a meter hit 0; pet has just been cleared
 *   { stats }            - alive; decayed stats as of `now`
 */
async function settle(user, now) {
  const pet = user.pet;
  if (!pet?.birdId) return { none: true };

  const stats = decayedStats(pet, now);
  if (!hasDeparted(stats)) return { stats };

  const bird = await Bird.findById(pet.birdId).select('name').lean();
  await User.updateOne({ _id: user._id }, { $set: { 'pet.birdId': null } });
  return { departed: { birdId: String(pet.birdId), name: bird?.name ?? 'Your bird' } };
}

export async function getPet(req, res) {
  try {
    const user = await loadUser(req, res);
    if (!user) return;

    const settled = await settle(user, new Date());
    if (settled.departed) return res.json({ pet: null, departed: settled.departed });
    if (settled.none) return res.json({ pet: null });

    const bird = await adoptableBird(user.pet.birdId);
    if (!bird) {
      // The bird was removed from the catalog (e.g. re-seed) - treat as no pet.
      await User.updateOne({ _id: user._id }, { $set: { 'pet.birdId': null } });
      return res.json({ pet: null });
    }
    res.json({ pet: { ...statsPayload(settled.stats), bird: toBirdPayload(bird) } });
  } catch (error) {
    console.error('getPet error:', error);
    res.status(500).json({ message: 'Failed to load pet' });
  }
}

export async function choosePet(req, res) {
  try {
    const { birdId } = req.body ?? {};
    if (typeof birdId !== 'string' || !mongoose.isValidObjectId(birdId)) {
      return res.status(400).json({ message: 'birdId is required' });
    }

    const bird = await adoptableBird(birdId);
    if (!bird) return res.status(404).json({ message: 'That bird is not available' });

    const user = await loadUser(req, res);
    if (!user) return;

    const now = new Date();
    const settled = await settle(user, now);
    // Living pet -> carry its care over to the new bird. Otherwise start fresh.
    const stats = settled.stats ?? freshStats(now);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          pet: { birdId: bird._id, hunger: stats.hunger, happiness: stats.happiness, lastDecayAt: now },
        },
      }
    );
    res.json({ pet: { ...statsPayload(stats), bird: toBirdPayload(bird) } });
  } catch (error) {
    console.error('choosePet error:', error);
    res.status(500).json({ message: 'Failed to choose pet' });
  }
}

export async function petAction(req, res) {
  try {
    const { action } = req.params;
    if (!Object.hasOwn(PET_ACTIONS, action)) {
      return res.status(404).json({ message: 'Unknown pet action' });
    }

    const user = await loadUser(req, res);
    if (!user) return;

    const now = new Date();
    const settled = await settle(user, now);
    if (settled.departed) return res.json({ pet: null, departed: settled.departed });
    if (settled.none) return res.status(409).json({ message: 'No pet selected' });

    const next = applyAction(settled.stats, action);

    // Filtering on birdId means a stale request can't write onto a pet the
    // player switched away from in the meantime.
    await User.updateOne(
      { _id: user._id, 'pet.birdId': user.pet.birdId },
      {
        $set: {
          'pet.hunger': next.hunger,
          'pet.happiness': next.happiness,
          'pet.lastDecayAt': next.lastDecayAt,
        },
      }
    );
    res.json({ pet: statsPayload(next) });
  } catch (error) {
    console.error('petAction error:', error);
    res.status(500).json({ message: 'Failed to update pet' });
  }
}