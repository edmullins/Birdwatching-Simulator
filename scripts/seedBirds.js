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
    name: 'Acadian Flycatcher',
    speciesName: 'Acadian Flycatcher',
    rarity: 'rare',
    assetDirectory: 'acadian-flycatcher',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'American Crow',
    speciesName: 'American Crow',
    rarity: 'basic',
    assetDirectory: 'american-crow',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'American Redstart',
    speciesName: 'American Redstart',
    rarity: 'rare',
    assetDirectory: 'american-redstart',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Barred Owl',
    speciesName: 'Barred Owl',
    rarity: 'legendary',
    assetDirectory: 'barred-owl',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Bells Vireo',
    speciesName: 'Bells Vireo',
    rarity: 'epic',
    assetDirectory: 'bells-vireo',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Carolina Wren',
    speciesName: 'Carolina Wren',
    rarity: 'basic',
    assetDirectory: 'carolina-wren',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Coopers Hawk',
    speciesName: 'Coopers Hawk',
    rarity: 'rare',
    assetDirectory: 'coopers-hawk',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Eastern Bluebird',
    speciesName: 'Eastern Bluebird',
    rarity: 'basic',
    assetDirectory: 'eastern-bluebird',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'House Finch',
    speciesName: 'House Finch',
    rarity: 'basic',
    assetDirectory: 'house-finch',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'House Sparrow',
    speciesName: 'House Sparrow',
    rarity: 'basic',
    assetDirectory: 'house-sparrow',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Killdeer',
    speciesName: 'Killdeer',
    rarity: 'rare',
    assetDirectory: 'killdeer',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Magnolia Warbler',
    speciesName: 'Magnolia Warbler',
    rarity: 'rare',
    assetDirectory: 'magnolia-warbler',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Northern Mockingbird',
    speciesName: 'Northern Mockingbird',
    rarity: 'basic',
    assetDirectory: 'northern-mockingbird',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Northern Parula',
    speciesName: 'Northern Parula',
    rarity: 'basic',
    assetDirectory: 'northern-parula',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Northern Waterthrush',
    speciesName: 'Northern Waterthrush',
    rarity: 'epic',
    assetDirectory: 'northern-waterthrush',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Pectoral Sandpiper',
    speciesName: 'Pectoral Sandpiper',
    rarity: 'rare',
    assetDirectory: 'pectoral-sandpiper',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'White Ibis',
    speciesName: 'White Ibis',
    rarity: 'epic',
    assetDirectory: 'white-ibis',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
  {
    name: 'Yellow Crowned Night Heron',
    speciesName: 'Yellow Crowned Night Heron',
    rarity: 'legendary',
    assetDirectory: 'yellow-crowned-night-heron',
    frames: ['sitting.png', 'flight_up.png', 'flight_down.png']
  },
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