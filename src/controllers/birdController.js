// src/controllers/birdController.js 
// ---------------------------------------------------------------------
// Returns available birds (approved or the caller's private uploads) 
// as a client-friendly payload.
// ---------------------------------------------------------------------
import Bird from '../models/bird.js';

export async function listAvailableBirds(req, res) {
  try {
    const birds = await Bird.find({
      $or: [
        { visibility: 'approved' },
        {
          ownerId: req.session.userId,
          visibility: 'private'
        }
      ]
    })
      .select('_id name speciesName physicalDescription breedingRegion size food habitat song funFact imageUrl scaleRange rarity')
      .lean();

    const birdPayload = birds.map((bird) => ({
      id: bird._id.toString(),
      name: bird.name,
      speciesName: bird.speciesName,
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
    }));

    res.json({ birds: birdPayload });
  } catch (error) {
    console.error('listAvailableBirds error:', error);
    res.status(500).json({ message: 'Failed to load birds' });
  }
}