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
    scientificName: 'Empidonax virescens',
    rarity: 'rare',
    imageName: 'acadian-flycatcher.png',
    physicalDescription: "Big peaked head and relatively long bill. Greenish-olive above and pale whitish below. Thin white eyering and very long wingtips.",
    breedingRegion: "Eastern North America's deciduous and mixed forests, stretching from the eastern Great Plains and Gulf Coast up to southern New England.",
    size: "5.5 in",
    food: "Insects, berries, seeds",
    habitat: "mature, shaded deciduous forests and wooded ravines.",
    song: "pwit-SIP!, pweek!",
    funFact: "The Acadian flycatcher can hover and fly backward.",
  },
  {
    name: 'American Crow',
    speciesName: 'American Crow',
    rarity: 'basic',
    imageName: 'american-crow.png'
  },
  {
    name: 'American Redstart',
    speciesName: 'American Redstart',
    rarity: 'rare',
    imageName: 'american-redstart.png'
  },
  {
    name: 'Barred Owl',
    speciesName: 'Barred Owl',
    rarity: 'legendary',
    imageName: 'barred-owl.png'
  },
  {
    name: 'Bells Vireo',
    speciesName: 'Bells Vireo',
    rarity: 'epic',
    imageName: 'bells-vireo.png'
  },
  {
    name: 'Carolina Wren',
    speciesName: 'Carolina Wren',
    rarity: 'basic',
    imageName: 'carolina-wren.png'
  },
  {
    name: 'Coopers Hawk',
    speciesName: 'Coopers Hawk',
    rarity: 'rare',
    imageName: 'coopers-hawk.png'
  },
  {
    name: 'Eastern Bluebird',
    speciesName: 'Eastern Bluebird',
    rarity: 'basic',
    imageName: 'eastern-bluebird.png'
  },
  {
    name: 'Grackle',
    speciesName: 'Grackle',
    rarity: 'basic',
    imageName: 'grackle.png'
  },
  {
    name: 'Great Blue Heron',
    speciesName: 'Great Blue Heron',
    rarity: 'rare',
    imageName: 'great-blue-heron.png'
  },
  {
    name: 'House Finch',
    speciesName: 'House Finch',
    rarity: 'basic',
    imageName: 'house-finch.png'
  },
  {
    name: 'House Sparrow',
    speciesName: 'House Sparrow',
    rarity: 'basic',
    imageName: 'house-sparrow.png'
  },
  {
    name: 'Killdeer',
    speciesName: 'Killdeer',
    rarity: 'rare',
    imageName: 'killdeer.png'
  },
  {
    name: 'Magnolia Warbler',
    speciesName: 'Magnolia Warbler',
    rarity: 'rare',
    imageName: 'magnolia-warbler.png'
  },
  {
    name: 'Mourning Dove',
    speciesName: 'Mourning Dove',
    rarity: 'basic',
    imageName: 'mourning-dove.png'
  },
  {
    name: 'Northern Cardinal',
    speciesName: 'Northern Cardinal',
    rarity: 'basic',
    imageName: 'northern-cardinal.png'
  },
  {
    name: 'Northern Mockingbird',
    speciesName: 'Northern Mockingbird',
    rarity: 'basic',
    imageName: 'northern-mockingbird.png'
  },
  {
    name: 'Northern Parula',
    speciesName: 'Northern Parula',
    rarity: 'basic',
    imageName: 'northern-parula.png'
  },
  {
    name: 'Northern Waterthrush',
    speciesName: 'Northern Waterthrush',
    rarity: 'epic',
    imageName: 'northern-waterthrush.png'
  },
  {
    name: 'Pectoral Sandpiper',
    speciesName: 'Pectoral Sandpiper',
    rarity: 'rare',
    imageName: 'pectoral-sandpiper.png'
  },
  {
    name: 'Red-bellied Woodpecker',
    speciesName: 'Red-bellied Woodpecker',
    rarity: 'basic',
    imageName: 'red-bellied-woodpecker.png'
  },
  {
    name: 'Tufted Titmouse',
    speciesName: 'Tufted Titmouse',
    rarity: 'basic',
    imageName: 'tufted-titmouse.png'
  },
  {
    name: 'White Ibis',
    speciesName: 'White Ibis',
    rarity: 'epic',
    imageName: 'white-ibis.png'
  },
  {
    name: 'Yellow Crowned Night Heron',
    speciesName: 'Yellow Crowned Night Heron',
    rarity: 'legendary',
    imageName: 'yellow-crowned-night-heron.png'
  },
  {
    name: 'Clarks Nutcracker',
    rarity: 'basic'

  },
  {
    name: 'Blue Eyed Ground Dove',
    rarity: 'legendary',
  },
  {
    name: 'Northern Shoveler',
    rarity: 'basic'

  },
  {
    name: 'Piping Plover',
    rarity: 'epic'
  },
  {
    name: 'Lark Sparrow',
    rarity: 'basic'

  },
  {
    name: 'Southern Lapwing',
    rarity: 'rare'
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

async function getImageMeta(filePath) {
  const buffer = await fs.readFile(filePath);
  const { width, height } = readPngDimensions(buffer);

  return {
    width,
    height,
    aspectRatio: width / height
  };
}

async function seedBirds() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const bird of birds) {
    const imagePath = path.join(
      projectRoot,
      'public',
      'assets',
      'birds',
      bird.imageName
    );

    const imageMeta = await getImageMeta(imagePath);
    const imageUrl = `/assets/birds/${bird.imageName}`;

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
          physicalDescription: bird.physicalDescription,
          breedingRegion: bird.breedingRegion,
          size: bird.size,
          food: bird.food,
          habitat: bird.habitat,
          song: bird.song,
          funFact: bird.funFact,
          imageUrl,
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