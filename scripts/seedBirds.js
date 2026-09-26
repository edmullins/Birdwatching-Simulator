// scripts/seedBirds.js
// ---------------------------------------------------------------------
// Seeds the official (ownerId: null) bird catalog, including every Field
// Guide field (#37): scientificName, physicalDescription, breedingRegion,
// size, food, habitat, song, funFact.
//
// Idempotent - safe to run any number of times (npm run seed:birds):
//   1. Every bird is validated BEFORE anything is written, so one bad
//      entry can't leave the collection half-updated.
//   2. Each bird is upserted by { ownerId: null, name }, so re-running
//      updates in place (keeping _ids stable for Run.birdsFound) instead
//      of creating duplicates.
//   3. Official birds that are no longer in this file are deleted, so
//      there are no stale leftovers.
//
// To add a bird: drop `<slug>.png` in public/assets/birds/, then add an
// entry below with ALL eight text fields. Entries without an `imageName`
// go in `pendingBirds` until the art exists.
// ---------------------------------------------------------------------
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import Bird from '../src/models/bird.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// The eight text fields the Field Guide renders. `name` doubles as the
// word the player has to type to collect the bird, so keep it plain
// (no apostrophes, e.g. "Coopers Hawk").
const FIELD_GUIDE_FIELDS = [
  'name',
  'scientificName',
  'physicalDescription',
  'breedingRegion',
  'size',
  'food',
  'habitat',
  'song',
  'funFact'
];

// TODO(#43): add a `license: { source, sourceUrl, licenseType, attributionText }`
// object to each entry once the image sources are documented. It is passed
// through to the DB when present.
const birds = [
  {
    name: "Acadian Flycatcher",
    scientificName: "Empidonax virescens",
    rarity: "rare",
    imageName: "acadian-flycatcher.png",
    physicalDescription: "Big peaked head and relatively long bill. Greenish-olive above and pale whitish below. Thin white eyering and very long wingtips.",
    breedingRegion: "Eastern North America's deciduous and mixed forests, stretching from the eastern Great Plains and Gulf Coast up to southern New England.",
    size: "5.5 in",
    food: "Insects, berries, seeds",
    habitat: "Mature, shaded deciduous forests and wooded ravines.",
    song: "pwit-SIP!, pweek!",
    funFact: "The Acadian flycatcher can hover and fly backward."
  },
  {
    name: "American Crow",
    scientificName: "Corvus brachyrhynchos",
    rarity: "basic",
    imageName: "american-crow.png",
    physicalDescription: "Large, all-black bird with a thick black bill, black legs, and a slightly rounded tail. The feathers show a faint purplish gloss in bright sun.",
    breedingRegion: "Breeds across most of the United States and southern Canada; northern birds migrate south for the winter.",
    size: "16-21 in",
    food: "Omnivore: insects, seeds, grain, fruit, carrion, small animals",
    habitat: "Fields, woodlands, farmland, parks, suburbs, and cities.",
    song: "Loud, harsh caw-caw-caw; also rattles and soft coos",
    funFact: "Crows can recognize individual human faces and remember them for years, and they are thought to pass warnings about specific people on to other crows."
  },
  {
    name: "American Redstart",
    scientificName: "Setophaga ruticilla",
    rarity: "rare",
    imageName: "american-redstart.png",
    physicalDescription: "Small, restless warbler. Males are black with bright orange patches on the wings, sides, and tail; females and young birds are gray with yellow patches in the same places.",
    breedingRegion: "Breeds across southern Canada and the northern and eastern United States; winters in the Caribbean, Mexico, Central America, and northern South America.",
    size: "4.3-5.5 in",
    food: "Insects and spiders, plus a few berries",
    habitat: "Young deciduous and mixed woods with thick undergrowth, often near streams.",
    song: "High, thin, sweet notes in short phrases, often ending on an accented note",
    funFact: "Redstarts fan their tails and flash their bright patches to startle insects into flying, then snatch them out of the air."
  },
  {
    name: "Barred Owl",
    scientificName: "Strix varia",
    rarity: "legendary",
    imageName: "barred-owl.png",
    physicalDescription: "Large, round-headed owl with dark brown eyes and no ear tufts. Gray-brown with horizontal barring across the chest and vertical streaks down the belly.",
    breedingRegion: "Eastern North America from southern Canada to the Gulf Coast, and across Canada and into the Pacific Northwest.",
    size: "16-25 in",
    food: "Small mammals, birds, frogs, reptiles, crayfish, and large insects",
    habitat: "Mature forests, especially wet woods and swamps near water.",
    song: "Booming \"Who cooks for you? Who cooks for you-all?\"",
    funFact: "Barred Owls are unusually noisy for owls: pairs trade loud, cackling duets, and they may call in broad daylight."
  },
  {
    name: "Bells Vireo",
    scientificName: "Vireo bellii",
    rarity: "epic",
    imageName: "bells-vireo.png",
    physicalDescription: "Small, drab vireo with a gray-olive back, pale underparts, one or two faint wingbars, and a faint pale line above the eye. Easier to hear than to see.",
    breedingRegion: "Breeds in the central and southwestern United States and northern Mexico; winters in western Mexico and Central America.",
    size: "4.5-5 in",
    food: "Insects and spiders, plus a few berries",
    habitat: "Dense, low, shrubby thickets, often near streams and brushy woodland edges.",
    song: "Fast, scratchy chatter of paired notes that sounds like a question followed by an answer",
    funFact: "Bells Vireos are frequent targets of cowbirds, which lay eggs in their nests; along with habitat loss, this has pushed the Least Bells Vireo of California onto the endangered species list."
  },
  {
    name: "Carolina Wren",
    scientificName: "Thryothorus ludovicianus",
    rarity: "basic",
    imageName: "carolina-wren.png",
    physicalDescription: "Small, plump, rusty-brown wren with a bold white eyebrow stripe, buffy-orange underparts, and a short tail that is often cocked upward.",
    breedingRegion: "Lives year-round across the southeastern and eastern United States and into northeastern Mexico.",
    size: "4.7-5.5 in",
    food: "Insects and spiders, plus some seeds and fruit",
    habitat: "Woodland undergrowth, brushy tangles, and suburban yards and gardens.",
    song: "Loud, rolling teakettle-teakettle-teakettle",
    funFact: "A tiny bird with a big voice, the Carolina Wren is the state bird of South Carolina and will nest in odd spots like flowerpots, mailboxes, and boots."
  },
  {
    name: "Coopers Hawk",
    scientificName: "Accipiter cooperii",
    rarity: "rare",
    imageName: "coopers-hawk.png",
    physicalDescription: "Medium-sized hawk with short, rounded wings and a long tail banded in dark stripes with a white tip. Adults have a blue-gray back and rusty barring on the chest; young birds are brown with streaked chests.",
    breedingRegion: "Breeds across most of the United States and southern Canada; northern birds migrate south to Mexico and Central America.",
    size: "14-20 in",
    food: "Mostly medium-sized birds, plus small mammals",
    habitat: "Woodlands and forest edges, and increasingly suburban parks and backyards.",
    song: "Fast, harsh kek-kek-kek-kek alarm call",
    funFact: "Coopers Hawks chase birds through dense trees at high speed, and they often hunt around backyard feeders."
  },
  {
    name: "Eastern Bluebird",
    scientificName: "Sialia sialis",
    rarity: "basic",
    imageName: "eastern-bluebird.png",
    physicalDescription: "Small thrush. Males are bright blue above with a rusty-orange throat and chest and a white belly; females are grayer with blue tinges on the wings and tail.",
    breedingRegion: "Eastern and central North America from southern Canada to the Gulf Coast, and south into Mexico and Central America.",
    size: "6-8 in",
    food: "Insects and berries",
    habitat: "Open country with scattered trees, such as farmland, orchards, and woodland edges.",
    song: "Soft, low, musical warbling",
    funFact: "Eastern Bluebirds nest in tree cavities and old woodpecker holes, and volunteer nest-box programs helped bring their numbers back after 20th-century declines."
  },
  {
    name: "Grackle",
    scientificName: "Quiscalus quiscula",
    rarity: "basic",
    imageName: "grackle.png",
    physicalDescription: "Lanky blackbird with a long, keel-shaped tail, a long dark bill, and pale yellow eyes. Looks black from a distance, but the head shimmers purple-blue and the body bronze in good light.",
    breedingRegion: "Eastern and central North America, from the Rocky Mountains to the Atlantic and from southern Canada to the Gulf Coast.",
    size: "11-13 in",
    food: "Grain, seeds, insects, fruit, and occasional small animals",
    habitat: "Open and semi-open areas such as fields, marshes, farms, parks, and lawns.",
    song: "A harsh, creaky readle-eak, like a rusty gate",
    funFact: "Grackles sometimes rub ants on their feathers, a behavior called anting, which may help control feather parasites."
  },
  {
    name: "Great Blue Heron",
    scientificName: "Ardea herodias",
    rarity: "rare",
    imageName: "great-blue-heron.png",
    physicalDescription: "Very tall, long-legged wading bird with blue-gray plumage, a black stripe over the eye, a long S-curved neck, and a dagger-like yellowish bill.",
    breedingRegion: "Breeds across most of North America, from Alaska and Canada to Mexico; northern birds move south for the winter.",
    size: "38-54 in",
    food: "Fish, plus frogs, crayfish, insects, and small rodents",
    habitat: "Shallow water: marshes, lake edges, rivers, ponds, and coastal shores.",
    song: "Deep, harsh fraaank, usually when startled",
    funFact: "Great Blue Herons can stand motionless for long stretches, then strike at fish with lightning speed and swallow them whole."
  },
  {
    name: "House Finch",
    scientificName: "Haemorhous mexicanus",
    rarity: "basic",
    imageName: "house-finch.png",
    physicalDescription: "Small, slim finch with a streaky brown back and belly. Males have red on the head and chest (sometimes orange or yellow); females are plain brown with blurry streaks.",
    breedingRegion: "Native to the western United States and Mexico; introduced to the East in the 1940s and now found across most of the U.S. and southern Canada.",
    size: "5-5.5 in",
    food: "Seeds, buds, and fruit; frequent at feeders",
    habitat: "Cities, towns, suburbs, farms, and open desert scrub.",
    song: "Bright, jumbled warble that often ends in a nasal, rising note",
    funFact: "A male's red color comes from pigments in the foods he eats, and females tend to prefer the reddest males."
  },
  {
    name: "House Sparrow",
    scientificName: "Passer domesticus",
    rarity: "basic",
    imageName: "house-sparrow.png",
    physicalDescription: "Small, stocky sparrow. Males have a gray crown, black bib, and chestnut nape; females are plain buffy brown with a pale stripe above the eye.",
    breedingRegion: "Native to Eurasia and North Africa; introduced to North America in the 1850s and now found across most of the continent.",
    size: "5.5-6.7 in",
    food: "Seeds, grains, insects, and scraps of human food",
    habitat: "Cities, towns, and farms; almost always near people.",
    song: "Repeated, cheerful cheep-cheep-cheep chirps",
    funFact: "Despite the name, House Sparrows are not true sparrows; they belong to the Old World sparrow family."
  },
  {
    name: "Killdeer",
    scientificName: "Charadrius vociferus",
    rarity: "rare",
    imageName: "killdeer.png",
    physicalDescription: "Medium-sized plover with a brown back, white belly, and two black bands across the chest. Has a large dark eye with an orange-red eyering and a bright rusty-orange rump that shows in flight.",
    breedingRegion: "Breeds across most of North America; northern birds winter in the southern United States and Central America.",
    size: "8-11 in",
    food: "Insects, worms, and other small invertebrates",
    habitat: "Open ground such as fields, lawns, gravel lots, and shorelines, often far from water.",
    song: "Loud, piercing kill-deeee, repeated",
    funFact: "When a predator gets close to its ground nest, a Killdeer pretends to have a broken wing to lure it away."
  },
  {
    name: "Magnolia Warbler",
    scientificName: "Setophaga magnolia",
    rarity: "rare",
    imageName: "magnolia-warbler.png",
    physicalDescription: "Small warbler with a bright yellow underside marked by bold black streaks, a black mask, a gray crown, white wing patches, and a white-banded tail.",
    breedingRegion: "Breeds in the boreal forests of Canada and the northern United States; winters in Central America and the Caribbean.",
    size: "4.3-5.1 in",
    food: "Insects and spiders, plus a few berries",
    habitat: "Young conifer forests of spruce and fir; a wider range of shrubby woods during migration.",
    song: "Short, sweet, whistled weeta-weeta-weetee",
    funFact: "The species was first described from a bird spotted in a magnolia tree in Mississippi during migration, even though it doesn't breed anywhere near magnolias."
  },
  {
    name: "Mourning Dove",
    scientificName: "Zenaida macroura",
    rarity: "basic",
    imageName: "mourning-dove.png",
    physicalDescription: "Slender, soft brown-gray dove with a small head, black spots on the wings, and a long, pointed tail with white edges.",
    breedingRegion: "Lives year-round across most of the United States and Mexico, and breeds into southern Canada.",
    size: "9-13 in",
    food: "Mostly seeds and waste grain",
    habitat: "Open woodlands, farmland, suburban yards, and desert edges.",
    song: "Soft, mournful coo-OO-oo, oo, oo",
    funFact: "A Mourning Dove's wings whistle when it takes off, and the bird can fly at around 55 miles per hour."
  },
  {
    name: "Northern Cardinal",
    scientificName: "Cardinalis cardinalis",
    rarity: "basic",
    imageName: "northern-cardinal.png",
    physicalDescription: "Crested songbird with a thick, cone-shaped orange-red bill. Males are brilliant red with a black face mask; females are warm tan with red tinges on the wings, crest, and tail.",
    breedingRegion: "Lives year-round across the eastern and central United States, southern Ontario, and Mexico, with pockets in the Southwest.",
    size: "8-9 in",
    food: "Seeds, grain, fruit, and insects",
    habitat: "Woodland edges, thickets, gardens, and suburban yards.",
    song: "Clear, whistled cheer-cheer-cheer and birdie-birdie-birdie",
    funFact: "The Northern Cardinal is the state bird of seven U.S. states, and unlike in most songbirds, the female sings too."
  },
  {
    name: "Northern Mockingbird",
    scientificName: "Mimus polyglottos",
    rarity: "basic",
    imageName: "northern-mockingbird.png",
    physicalDescription: "Slender gray songbird with a long tail, white patches on the wings, and white outer tail feathers that flash in flight.",
    breedingRegion: "Lives year-round across most of the United States, Mexico, and the Caribbean; the northern edge of its range shifts with the seasons.",
    size: "8-10 in",
    food: "Insects, berries, and fruit",
    habitat: "Open areas with scattered shrubs, including towns, parks, and farms.",
    song: "A long string of repeated phrases that imitate other birds and sounds, often at night",
    funFact: "A single mockingbird can learn dozens of songs and sounds, borrowing from other birds, insects, and even mechanical noises."
  },
  {
    name: "Northern Parula",
    scientificName: "Setophaga americana",
    rarity: "basic",
    imageName: "northern-parula.png",
    physicalDescription: "Tiny blue-gray warbler with a yellow throat and breast, a greenish patch on the back, two white wingbars, and broken white crescents around the eye.",
    breedingRegion: "Breeds across eastern North America; winters in Florida, Mexico, Central America, and the Caribbean.",
    size: "4-4.5 in",
    food: "Insects and spiders",
    habitat: "Mature forests with hanging moss or lichen, often near water.",
    song: "A rising, buzzy trill that ends with a sharp zip",
    funFact: "Parulas weave their nests inside hanging clumps of Spanish moss in the South and old man's beard lichen in the North."
  },
  {
    name: "Northern Waterthrush",
    scientificName: "Parkesia noveboracensis",
    rarity: "epic",
    imageName: "northern-waterthrush.png",
    physicalDescription: "Brown, ground-dwelling warbler with a streaked pale-yellow to white underside and a pale stripe over the eye. Constantly bobs its rear end as it walks.",
    breedingRegion: "Breeds across Alaska, Canada, and the northern United States; winters in Mexico, Central America, the Caribbean, and northern South America.",
    size: "5-6 in",
    food: "Aquatic insects, small crustaceans, and mollusks; sometimes tiny fish",
    habitat: "Wooded swamps, bogs, and the edges of streams and ponds.",
    song: "A loud, ringing burst of notes that speeds up and drops in pitch at the end",
    funFact: "Despite the name, the Northern Waterthrush is a warbler, not a thrush."
  },
  {
    name: "Pectoral Sandpiper",
    scientificName: "Calidris melanotos",
    rarity: "rare",
    imageName: "pectoral-sandpiper.png",
    physicalDescription: "Medium-sized sandpiper with a streaked brown breast that ends sharply against a white belly, yellowish legs, and a slightly downcurved bill.",
    breedingRegion: "Breeds on the Arctic tundra of northern Alaska, Canada, and Siberia; winters mostly in southern South America.",
    size: "7.5-9.5 in",
    food: "Insects, larvae, and other small invertebrates, plus some seeds",
    habitat: "Wet grassy fields, mudflats, and marsh edges during migration; wet tundra for breeding.",
    song: "Low, rough krrick calls; males give deep hooting sounds in display",
    funFact: "During courtship, males puff up an air sac on the chest and make deep hooting sounds that carry across the tundra."
  },
  {
    name: "Red-bellied Woodpecker",
    scientificName: "Melanerpes carolinus",
    rarity: "basic",
    imageName: "red-bellied-woodpecker.png",
    physicalDescription: "Medium woodpecker with a black-and-white barred back, a pale face and belly, and a red cap. Males are red from bill to nape; females only on the nape. The reddish belly patch is faint and easy to miss.",
    breedingRegion: "Lives year-round across the southeastern and eastern United States, ranging north to the Great Lakes and west into the Great Plains.",
    size: "9-10 in",
    food: "Insects, nuts, seeds, and fruit, and occasionally small animals",
    habitat: "Mature woodlands, swamps, forest edges, parks, and suburban trees.",
    song: "A rolling, churring churrr call",
    funFact: "A Red-bellied Woodpecker can stick its tongue out about two inches past the tip of its bill to pull insects out of cracks."
  },
  {
    name: "Tufted Titmouse",
    scientificName: "Baeolophus bicolor",
    rarity: "basic",
    imageName: "tufted-titmouse.png",
    physicalDescription: "Small gray songbird with a pointed crest, large black eyes, white underparts, and rusty-orange sides. A black patch sits just above the bill.",
    breedingRegion: "Lives year-round across the eastern United States, from the Great Lakes to the Gulf Coast.",
    size: "5.5-6.3 in",
    food: "Insects, seeds, nuts, and berries",
    habitat: "Deciduous and mixed woods, parks, and backyards.",
    song: "Clear, whistled peter-peter-peter",
    funFact: "Tufted Titmice line their nests with hair, sometimes plucked from live animals, including dogs and even people."
  },
  {
    name: "White Ibis",
    scientificName: "Eudocimus albus",
    rarity: "epic",
    imageName: "white-ibis.png",
    physicalDescription: "Medium wading bird with white plumage, black wingtips that show in flight, a long downcurved reddish-orange bill, and red-orange legs.",
    breedingRegion: "Coastal southeastern United States along the Atlantic and Gulf coasts, and south through Mexico, Central America, and the Caribbean.",
    size: "22-27 in",
    food: "Crayfish, crabs, insects, and small fish",
    habitat: "Marshes, swamps, mudflats, and wet fields, and increasingly parks and lawns.",
    song: "Low, nasal, grunting hunk calls",
    funFact: "Young White Ibises are mostly brown and slowly turn white over a couple of years."
  },
  {
    name: "Yellow Crowned Night Heron",
    scientificName: "Nyctanassa violacea",
    rarity: "legendary",
    imageName: "yellow-crowned-night-heron.png",
    physicalDescription: "Stocky gray heron with a black head, a white cheek patch, a creamy-yellow crown, red eyes, and long yellow legs.",
    breedingRegion: "Breeds in the southeastern United States along the Atlantic and Gulf coasts and up the Mississippi Valley, and south through Mexico and Central America.",
    size: "22-28 in",
    food: "Crabs and crayfish, plus other invertebrates",
    habitat: "Coastal and inland wetlands: swamps, bayous, mangroves, and wooded streams.",
    song: "A sharp, barking quawk",
    funFact: "Yellow-crowned Night Herons specialize in crabs and crayfish, and often dismember their prey before swallowing."
  }
];

// Planned birds with no art or Field Guide text yet. Not seeded. Move an
// entry into `birds` above once it has an image and all eight text fields.
const pendingBirds = [
  { name: 'Clarks Nutcracker', rarity: 'basic' },
  { name: 'Blue Eyed Ground Dove', rarity: 'legendary' },
  { name: 'Northern Shoveler', rarity: 'basic' },
  { name: 'Piping Plover', rarity: 'epic' },
  { name: 'Lark Sparrow', rarity: 'basic' },
  { name: 'Southern Lapwing', rarity: 'rare' }
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

function buildFieldGuideValues(bird) {
  return Object.fromEntries(FIELD_GUIDE_FIELDS.map((field) => [field, bird[field]]));
}

// Validates every bird's name/rarity/field-guide values against the Bird
// schema (length caps, required) without touching the DB, and collects all
// problems so they can be fixed in one pass.
async function preflight() {
  const problems = [];
  const seenNames = new Set();

  for (const bird of birds) {
    if (seenNames.has(bird.name)) problems.push(`${bird.name}: duplicate name in seed list`);
    seenNames.add(bird.name);

    if (!bird.imageName) problems.push(`${bird.name}: missing imageName (move it to pendingBirds)`);

    const missing = FIELD_GUIDE_FIELDS.filter((field) => !String(bird[field] ?? '').trim());
    if (missing.length) problems.push(`${bird.name}: missing ${missing.join(', ')}`);

    const paths = ['name', 'rarity', ...FIELD_GUIDE_FIELDS];
    const doc = new Bird({ name: bird.name, rarity: bird.rarity, ...buildFieldGuideValues(bird) });
    try {
      await doc.validate(paths);
    } catch (error) {
      for (const [field, fieldError] of Object.entries(error.errors ?? {})) {
        problems.push(`${bird.name}.${field}: ${fieldError.message}`);
      }
    }
  }

  if (problems.length) {
    throw new Error(`Seed data failed validation:\n  - ${problems.join('\n  - ')}`);
  }
}

async function seedBirds() {
  await preflight();

  await mongoose.connect(process.env.MONGODB_URI);

  // One-time cleanup: older docs were seeded with `speciesName`, which the
  // schema has since renamed to `scientificName`. Mongoose strict mode would
  // strip an $unset for a path it no longer knows, so go through the raw
  // collection.
  await Bird.collection.updateMany(
    { ownerId: null, speciesName: { $exists: true } },
    { $unset: { speciesName: '' } }
  );

  for (const bird of birds) {
    const imagePath = path.join(projectRoot, 'public', 'assets', 'birds', bird.imageName);

    const imageMeta = await getImageMeta(imagePath);
    const imageUrl = `/assets/birds/${bird.imageName}`;

    await Bird.findOneAndUpdate(
      {
        ownerId: null,
        name: bird.name
      },
      {
        $set: {
          ownerId: null,
          name: bird.name,
          ...buildFieldGuideValues(bird),
          imageUrl,
          imageMeta,
          rarity: bird.rarity,
          visibility: 'approved',
          isUserCreature: false,
          ...(bird.license ? { license: bird.license } : {})
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

  // Remove official birds that are no longer in the list above.
  const { deletedCount } = await Bird.deleteMany({
    ownerId: null,
    name: { $nin: birds.map((bird) => bird.name) }
  });
  if (deletedCount) console.log(`Removed ${deletedCount} stale official bird(s)`);

  const total = await Bird.countDocuments({ ownerId: null });
  console.log(`Official birds in DB: ${total} (expected ${birds.length})`);

  if (pendingBirds.length) {
    console.log(`Skipped ${pendingBirds.length} pending bird(s) with no art yet: ${pendingBirds.map((b) => b.name).join(', ')}`);
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
