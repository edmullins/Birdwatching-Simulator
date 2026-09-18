import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import Bird from '../src/models/bird.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const birds = [
  {
    name: 'Mourning Dove',
    speciesName: 'Mourning Dove',
    rarity: 'basic',
    assetDirectory: 'mourning-dove',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Northern Cardinal',
    speciesName: 'Northern Cardinal',
    rarity: 'basic',
    assetDirectory: 'northern-cardinal',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Grackle',
    speciesName: 'Common Grackle',
    rarity: 'basic',
    assetDirectory: 'grackle',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Great Blue Heron',
    speciesName: 'Great Blue Heron',
    rarity: 'rare',
    assetDirectory: 'great-blue-heron',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Red Bellied Woodpecker',
    speciesName: 'Red Bellied Woodpecker',
    rarity: 'legendary',
    assetDirectory: 'red-bellied-woodpecker',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Tufted Titmouse',
    speciesName: 'Tufted Titmouse',
    rarity: 'epic',
    assetDirectory: 'tufted-titmouse',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  }
];

function readPngDimensions(buffer) {
  const pngSignature = '89504e470d0a1a0a';

  if (buffer.subarray(0, 8).toString('hex') !== pngSignature) {
    throw new Error('Asset is not a PNG file');
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

async function getImageMeta(filePaths) {
  const dimensions = [];

  for (const filePath of filePaths) {
    const buffer = await fs.readFile(filePath);
    dimensions.push(readPngDimensions(buffer));
  }

  const [{ width, height }] = dimensions;

  // for (const dimension of dimensions) {
  //   if (dimension.width !== width || dimension.height !== height) {
  //     throw new Error('All animation frames must have matching dimensions');
  //   }
  // }

  return {
    width,
    height,
    aspectRatio: width / height
  };
}

async function seedBirds() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const bird of birds) {
    const assetDirectory = path.join(
      projectRoot,
      'public',
      'assets',
      'birds',
      bird.assetDirectory
    );

    const assetPaths = bird.frames.map((frame) =>
      path.join(assetDirectory, frame)
    );

    const imageMeta = await getImageMeta(assetPaths);

    const frames = bird.frames.map(
      (frame) => `/assets/birds/${bird.assetDirectory}/${frame}`
    );

    await Bird.findOneAndUpdate(
      {
        ownerId: null,
        name: bird.name,
        speciesName: bird.speciesName
      },
      {
        $set: {
          ownerId: null,
          name: bird.name,
          speciesName: bird.speciesName,
          frames,
          imageMeta,
          rarity: bird.rarity,
          visibility: 'approved',
          isUserCreature: false
        },
        $setOnInsert: {
          care: {
            hunger: 100,
            happiness: 100,
            lastFedAt: new Date(),
            lastPlayedAt: new Date()
          }
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    console.log(`Seeded official bird: ${bird.name}`);
  }
}

try {
  await seedBirds();
  console.log('Bird seed complete');
} catch (error) {
  console.error('Bird seed failed:', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}