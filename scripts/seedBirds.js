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
// entry below with ALL eight text fields.
//
// Photo credit / Credits modal (#43): every entry also carries `creditId`,
// the Macaulay Library asset id (https://macaulaylibrary.org/asset/<id>),
// and `imageAuthor`, the contributing photographer. Those two are all the
// original-photo data entry needs - this script derives everything else
// from them:
//   - `ogImageUrl`: resolved against whatever file actually sits at
//     public/assets/birds/og/<creditId>.* (extension varies - jpg/jpeg/png
//     - so it's read off disk rather than assumed, same spirit as the PNG
//     dimension read below).
//   - `license`: the { source, sourceUrl, licenseType, attributionText }
//     the Bird schema requires, built straight from creditId + imageAuthor
//     so every official bird now actually carries one (closes #43: license
//     used to only get set when an entry supplied one by hand, and none
//     ever did, so it silently went unset on every seed).
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

// Values that mean "we don't actually know who took this photo" rather
// than a real name, so the Credits modal can show something readable
// instead of printing them verbatim. "Anonymous" is a real Macaulay
// Library contributor label, not a placeholder, so it's left alone.
const UNKNOWN_AUTHOR_VALUES = new Set(['', 'na', 'n/a', 'unknown']);
const UNKNOWN_AUTHOR_LABEL = 'Unknown photographer';

function normalizeAuthor(imageAuthor) {
  const trimmed = String(imageAuthor ?? '').trim();
  return UNKNOWN_AUTHOR_VALUES.has(trimmed.toLowerCase()) ? null : trimmed;
}

// Every original photo credited to the Cornell Lab / Macaulay Library
// shares the same `source` + `licenseType`; only the per-bird asset page
// (sourceUrl) and byline (attributionText) change.
function buildLicense(bird) {
  const author = normalizeAuthor(bird.imageAuthor);
  return {
    source: 'Cornell Lab of Ornithology | Macaulay Library',
    sourceUrl: `https://macaulaylibrary.org/asset/${bird.creditId}`,
    licenseType: 'macaulay-library',
    attributionText: `${author ?? UNKNOWN_AUTHOR_LABEL} / Macaulay Library`
  };
}

const birds = [
  {
    name: "Acadian Flycatcher",
    scientificName: "Empidonax virescens",
    rarity: "rare",
    imageName: "acadian-flycatcher.png",
    creditId: "665075681",
    imageAuthor: "James Hully",
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
    creditId: "665352708",
    imageAuthor: "Julia Proulx",
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
    creditId: "665340794",
    imageAuthor: "Charlie Arp",
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
    creditId: "665334574",
    imageAuthor: "☘️ Diggle",
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
    creditId: "662093967",
    imageAuthor: "Mason Maron",
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
    creditId: "665294079",
    imageAuthor: "Ian Sarmiento",
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
    creditId: "665331569",
    imageAuthor: "Danielle A",
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
    creditId: "658902247",
    imageAuthor: "Natalie Carusillo",
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
    creditId: "665248679",
    imageAuthor: "Bryan Thorne",
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
    creditId: "664986573",
    imageAuthor: "Rob Bielawski",
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
    creditId: "665360187",
    imageAuthor: "Delaney McKinney",
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
    creditId: "665331188",
    imageAuthor: "Anthony Capone",
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
    creditId: "665329015",
    imageAuthor: "Jenn Yeaple",
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
    creditId: "665341399",
    imageAuthor: "NA",
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
    creditId: "665351527",
    imageAuthor: "Zachary Spatz",
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
    creditId: "665337390",
    imageAuthor: "Texas Bird Family",
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
    creditId: "665342071",
    imageAuthor: "Amanda Guercio",
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
    creditId: "665353898",
    imageAuthor: "John Cassady",
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
    creditId: "665346389",
    imageAuthor: "Anonymous",
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
    creditId: "665357954",
    imageAuthor: "Estela Quintero-Weldon",
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
    creditId: "665248699",
    imageAuthor: "Debbie Thurber",
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
    creditId: "665293890",
    imageAuthor: "Pam Perna",
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
    creditId: "665353191",
    imageAuthor: "Brit Lue",
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
    creditId: "665360675",
    imageAuthor: "Adrian Lakin",
    physicalDescription: "Stocky gray heron with a black head, a white cheek patch, a creamy-yellow crown, red eyes, and long yellow legs.",
    breedingRegion: "Breeds in the southeastern United States along the Atlantic and Gulf coasts and up the Mississippi Valley, and south through Mexico and Central America.",
    size: "22-28 in",
    food: "Crabs and crayfish, plus other invertebrates",
    habitat: "Coastal and inland wetlands: swamps, bayous, mangroves, and wooded streams.",
    song: "A sharp, barking quawk",
    funFact: "Yellow-crowned Night Herons specialize in crabs and crayfish, and often dismember their prey before swallowing."
  },
  {
    name: "Clarks Nutcracker",
    scientificName: "Nucifraga columbiana",
    rarity: "basic",
    imageName: "clarks-nutcracker.png",
    creditId: "665361535",
    imageAuthor: "Terri Gueck",
    physicalDescription: "Pale gray, crow-sized bird with a long, spike-like black bill. Black wings carry a bold white patch, and the black tail has white edges, both flashing in flight.",
    breedingRegion: "High-elevation conifer forests of the western United States and southwestern Canada, mostly between 3,000 and 12,000 feet.",
    size: "12-13 in",
    food: "Pine seeds year-round, plus other seeds, nuts, berries, insects, and carrion",
    habitat: "Open subalpine pine forests near the treeline, especially stands of whitebark or limber pine.",
    song: "A loud, guttural, far-carrying kraaaa",
    funFact: "A single nutcracker can bury tens of thousands of pine seeds each fall and rely on memory alone to relocate most of them through the winter."
  },
  {
    name: "Blue Eyed Ground Dove",
    scientificName: "Columbina cyanopis",
    rarity: "legendary",
    imageName: "blue-eyed-ground-dove.png",
    creditId: "654382066",
    imageAuthor: "Thelma Gátuzzô",
    physicalDescription: "Small, plump dove with warm rufous-brown plumage on the head, neck, and wings, dark blue spots dotting the wings, and strikingly bright blue eyes.",
    breedingRegion: "Endemic to a handful of isolated patches of cerrado savanna in central Brazil.",
    size: "6 in",
    food: "Seeds and small insects gleaned from bare or grassy ground",
    habitat: "Open, white-sand cerrado savanna near fresh water; reluctant to fly and rarely flushes from cover.",
    song: "A soft, low cooing, seldom heard given how few birds remain",
    funFact: "Believed extinct for over 75 years, it was rediscovered in 2015 and is now one of the rarest birds alive, with a wild population estimated at under 20 individuals."
  },
  {
    name: "Northern Shoveler",
    scientificName: "Spatula clypeata",
    rarity: "basic",
    imageName: "northern-shoveler.png",
    creditId: "665209858",
    imageAuthor: "WENDELIN LONG",
    physicalDescription: "Dabbling duck with an oversized, spoon-shaped bill. Males have a glossy green head, white chest, and rusty sides; females are mottled brown with the same giveaway bill.",
    breedingRegion: "Breeds across Alaska, Canada, and the north-central United States; winters across the southern U.S., Mexico, and beyond.",
    size: "17-20 in",
    food: "Tiny crustaceans, aquatic invertebrates, and seeds filtered from the water",
    habitat: "Shallow wetlands, marshes, and ponds with submerged vegetation.",
    song: "A low, guttural took-took or a soft quacking cluck",
    funFact: "Its bill is lined with comb-like ridges called lamellae, which it uses to strain food from the water much like a baleen whale strains plankton from the sea."
  },
  {
    name: "Piping Plover",
    scientificName: "Charadrius melodus",
    rarity: "epic",
    imageName: "piping-plover.png",
    creditId: "665367340",
    imageAuthor: "Dee R",
    physicalDescription: "Small, round, sand-colored plover with white underparts, a stubby orange-and-black bill, and a single black breast band that's often incomplete.",
    breedingRegion: "Beaches of the U.S. Atlantic coast and the shorelines of the northern Great Plains and Great Lakes.",
    size: "7 in",
    food: "Marine worms, small crustaceans, insects, and other invertebrates picked from wet sand",
    habitat: "Sandy beaches, sandflats, and mudflats above the high-tide line, with sparse vegetation.",
    song: "A clear, melodic peep-lo, the piping whistle it's named for",
    funFact: "Its sandy plumage camouflages it so well on open beach that most people walk right past a nesting pair without ever spotting one."
  },
  {
    name: "Lark Sparrow",
    scientificName: "Chondestes grammacus",
    rarity: "basic",
    imageName: "lark-sparrow.png",
    creditId: "665367313",
    imageAuthor: "Heidi Murphy",
    physicalDescription: "Large sparrow with a bold chestnut-and-white harlequin face pattern, a dark spot in the center of an otherwise plain breast, and a long tail edged in white.",
    breedingRegion: "Breeds from southern Canada south to northern Mexico, mainly across the western U.S. and Great Plains.",
    size: "6-7 in",
    food: "Insects in summer, seeds in winter, picked from the ground or from low plants",
    habitat: "Open grassland with scattered trees and shrubs, orchards, and roadsides.",
    song: "A jumbled, musical mix of clear notes, buzzes, and trills",
    funFact: "Courting males perform an elaborate hopping-and-crouching dance that can last up to five minutes, unlike the display of any other sparrow."
  },
  {
    name: "Southern Lapwing",
    scientificName: "Vanellus chilensis",
    rarity: "rare",
    imageName: "southern-lapwing.png",
    creditId: "665367191",
    imageAuthor: "Scott Fox",
    physicalDescription: "Large, crested shorebird with a black face and breast bordered in white, a grey crown, bronze-glossed shoulders, and bright red eyes.",
    breedingRegion: "Common and widespread across South America outside dense rainforest and the high Andes; increasingly seen in Central America.",
    size: "13-15 in",
    food: "Insects, worms, and other invertebrates, plus some seeds in dry seasons",
    habitat: "Open grassland, wetlands, and river banks near water, including farmland and city parks.",
    song: "A loud, harsh, repeated keek-keek-keek",
    funFact: "It's the national bird of Uruguay, where it's called tero, and defends its nest so noisily and aggressively that it will dive-bomb intruders many times its size."
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

// public/assets/birds/og/<creditId>.<ext> - extension isn't fixed (uploads
// came in as .jpg/.jpeg/.png), so instead of guessing it once, read the
// directory and index every file by its own basename. Cached for the life
// of the script; re-run it (npm run seed:birds) after dropping new og art.
let ogImageIndexPromise = null;

async function getOgImageIndex() {
  if (!ogImageIndexPromise) {
    ogImageIndexPromise = fs
      .readdir(path.join(projectRoot, 'public', 'assets', 'birds', 'og'))
      .then((files) => new Map(files.map((file) => [path.parse(file).name, file])));
  }
  return ogImageIndexPromise;
}

/** Resolves a bird's creditId to its actual og file, or null if none exists. */
async function findOgImageUrl(creditId) {
  const index = await getOgImageIndex();
  const file = index.get(creditId);
  return file ? `/assets/birds/og/${file}` : null;
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

    if (!String(bird.creditId ?? '').trim()) problems.push(`${bird.name}: missing creditId (Macaulay Library asset id)`);
    if (!String(bird.imageAuthor ?? '').trim()) problems.push(`${bird.name}: missing imageAuthor`);

    const missing = FIELD_GUIDE_FIELDS.filter((field) => !String(bird[field] ?? '').trim());
    if (missing.length) problems.push(`${bird.name}: missing ${missing.join(', ')}`);

    if (bird.creditId && !(await findOgImageUrl(bird.creditId))) {
      problems.push(`${bird.name}: no file in public/assets/birds/og/ named ${bird.creditId}.*`);
    }

    const paths = ['name', 'rarity', 'creditId', 'imageAuthor', ...FIELD_GUIDE_FIELDS];
    const doc = new Bird({
      name: bird.name,
      rarity: bird.rarity,
      creditId: bird.creditId,
      imageAuthor: bird.imageAuthor,
      ...buildFieldGuideValues(bird)
    });
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
    const ogImageUrl = await findOgImageUrl(bird.creditId); // preflight already confirmed this exists
    const license = bird.license ?? buildLicense(bird);

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
          creditId: bird.creditId,
          imageAuthor: normalizeAuthor(bird.imageAuthor),
          ogImageUrl,
          rarity: bird.rarity,
          visibility: 'approved',
          isUserCreature: false,
          license
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