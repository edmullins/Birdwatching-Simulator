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

  return {
    levelNumber,

    minBirdsRequired: Math.min(
      10,
      2 + Math.floor(progress / 3)
    ),

    // Bird distance range decreases as levels progress, making birds appear smaller
    // Number is used as size of Image
    birdDistanceRange: {
      min: Math.round(Math.max(0.25, 0.9 - progress * 0.02) * 100) / 100,
      max: Math.round(Math.max(0.75, 1.8 - progress * 0.03) * 100) / 100
    },

    birdDensity: Math.min(
      8,
      1 + Math.floor(progress / 4)
    ),

    fleeEnabled: levelNumber >= 5,

    backgroundAsset: BACKGROUNDS[backgroundIndex]
  };
}