// src/controllers/birdController.js 
// ---------------------------------------------------------------------
// Bird catalog endpoint. Two modes, same payload shape:
//   GET /api/birds                       -> approved birds + the caller's own
//                                           private uploads (used for spawning)
//   GET /api/birds?visibility=approved   -> strictly approved birds, no
//                                           per-user branch (used by the
//                                           Field Guide, #37/#38)
// Both are sorted by name so the Field Guide has a stable page order.
// ---------------------------------------------------------------------
import Bird from '../models/bird.js';

// `.select()` is an explicit whitelist  a field that isn't listed here is
// silently dropped from the response, so add new Bird fields in BOTH this
// string and toBirdPayload() below.
const BIRD_FIELDS = [
  '_id',
  'name',
  'scientificName',
  'physicalDescription',
  'breedingRegion',
  'size',
  'food',
  'habitat',
  'song',
  'funFact',
  'imageUrl',
  'scaleRange',
  'rarity'
].join(' ');

function toBirdPayload(bird) {
  return {
    id: bird._id.toString(),
    name: bird.name,
    scientificName: bird.scientificName,
    physicalDescription: bird.physicalDescription,
    breedingRegion: bird.breedingRegion,
    size: bird.size,
    food: bird.food,
    habitat: bird.habitat,
    song: bird.song,
    funFact: bird.funFact,
    imageUrl: bird.imageUrl,
    scaleRange: bird.scaleRange,
    rarity: bird.rarity
  };
}

export async function listAvailableBirds(req, res) {
  try {
    const { visibility } = req.query;

    // Only 'approved' is a supported filter. Anything else (e.g.
    // ?visibility=private) is rejected instead of silently falling back to
    // the default branch, so a typo can't quietly return the wrong set.
    if (visibility !== undefined && visibility !== 'approved') {
      return res.status(400).json({ message: "Unsupported visibility filter; only 'approved' is allowed" });
    }

    const filter =
      visibility === 'approved'
        ? { visibility: 'approved' }
        : {
            $or: [
              { visibility: 'approved' },
              { ownerId: req.session.userId, visibility: 'private' }
            ]
          };

    const birds = await Bird.find(filter)
      .select(BIRD_FIELDS)
      .sort({ name: 1, _id: 1 })
      .lean();

    res.json({ birds: birds.map(toBirdPayload) });
  } catch (error) {
    console.error('listAvailableBirds error:', error);
    res.status(500).json({ message: 'Failed to load birds' });
  }
}