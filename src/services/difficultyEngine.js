// src/services/difficultyEngine.js 
// ---------------------------------------------------------------------
// Returns per-level config (background, minBirdsRequired, 
// birdDistanceRange, birdDensity, fleeEnabled) based on levelNumber.
// ---------------------------------------------------------------------
const BACKGROUNDS = [
  '/assets/backgrounds/bg1.jpg',
  '/assets/backgrounds/bg2.jpg',
  '/assets/backgrounds/bg3.jpg',
  '/assets/backgrounds/bg4.jpg',
  '/assets/backgrounds/bg5.jpg'
];

export function getLevelConfig(levelNumber) {
  if (!Number.isInteger(levelNumber) || levelNumber < 1) {
    throw new Error('levelNumber must be a positive integer');
  }

  const progress = levelNumber - 1;
  const backgroundIndex = Math.floor(progress / 10) % BACKGROUNDS.length;
  const backgroundImage = BACKGROUNDS[backgroundIndex];

  const scene = {
  imageUrl: backgroundImage,
  occlusionLayers: [
    {
      imageUrl: '/assets/occlusion/tree.png',
      zIndex: 1
    },
    {
      imageUrl: '/assets/occlusion/bush1.png',
      zIndex: 2,
      x: 18,
      y: 68,
      width: 28,
      height: 22
    }
  ]
};

  return {
    levelNumber,
    minBirdsRequired: progress + 1,
    birdDistanceRange: {
      min: Math.round(Math.max(0.25, 0.9 - progress * 0.02) * 100) / 100,
      max: Math.round(Math.max(0.75, 1.8 - progress * 0.03) * 100) / 100
    },
    birdDensity: Math.min(8, 1 + Math.floor(progress / 4)),
    fleeEnabled: levelNumber >= 5,
    scene
  };
}