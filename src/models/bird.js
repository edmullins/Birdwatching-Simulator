// src/models/bird.js 
// ---------------------------------------------------------------------
// Mongoose schema for birds: frames, scale/image metadata, 
// rarity/visibility rules, owner/creature constraints, and point helper
// ---------------------------------------------------------------------
const RARITY_TIERS = ['basic', 'rare', 'epic', 'legendary'];
const MAX_USER_UPLOAD_RARITY = 'rare';

const POINTS_BY_RARITY = {
  basic: 10,
  rare: 25,
  epic: 60,
  legendary: 150,
};

function pointsForRarity(rarity) {
  return POINTS_BY_RARITY[rarity] ?? 0;
}

// src/models/bird.js
//
// Issue #18 (starting point) — first real schema for design doc §5/§8's
// `birds` collection. Was an empty stub file before this;
//
// Known follow-ups this does NOT attempt to solve:
//   - No birds catalog endpoint (GET /api/birds?visibility=approved) —
//     public/js/game/birdSpawner.js still runs off DEV_FIXTURE_BIRD_POOL.
//   - No admin review controller/routes for the submitted -> approved /
//     rejected flow described in §5, though `visibility` here is shaped
//     to support it directly.
//   - Run.birdsFound (src/models/run.js) still expects real Bird
//     ObjectIds but nothing populates them yet — level.js sends `[]`.
//   - "Global bounds" for scaleRange / image dimensions are listed as
//     TBD in the design doc's Open Questions — enforce those at the
//     upload controller once it exists; this schema only checks
//     internal consistency (min <= max), not the as-yet-undefined
//     global ceiling.

import mongoose from 'mongoose';

const scaleRangeSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

scaleRangeSchema.path('max').validate(function validateMaxAtLeastMin(max) {
  return max >= this.min;
}, 'scaleRange.max must be greater than or equal to scaleRange.min');

const imageMetaSchema = new mongoose.Schema(
  {
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },
    aspectRatio: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// §6: pet care stats. Decay is computed on read elsewhere (not here, and
// not via a background job per the design doc) — this subdocument just
// holds the last-known values and timestamps that decay is computed from.
const careSchema = new mongoose.Schema(
  {
    hunger: { type: Number, default: 100, min: 0, max: 100 },
    happiness: { type: Number, default: 100, min: 0, max: 100 },
    lastFedAt: { type: Date, default: Date.now },
    lastPlayedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const licenseSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, maxlength: 60},          // e.g. "USFWS National Digital Library"
    sourceUrl: { type: String, required: true, maxlength: 60},
    licenseType: { type: String, required: true, maxlength: 60},     // "public-domain" | "cc0" | "cc-by" | "original"
    attributionText: { type: String, required: false, maxlength: 150} // This work is an adaptation of '[Title of Work]' by [Author Name], used under CC BY 4.0. Changes include [briefly describe changes].
  },
  { _id: false }
);

const birdSchema = new mongoose.Schema(
  {
    // Owner of the upload. Left optional (rather than required) so
    // official/curated birds seeded by the game itself can exist without
    // being tied to a player account — only user-submitted birds need a
    // real ownerId. Revisit if curated content ends up going through an
    // admin user account instead.
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // Player-facing nickname for this specific upload.
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },

    // The real-world species this bird represents (e.g. "Mourning
    // Dove"). Kept separate from `name` per design doc §5/§8 — a player
    // could in principle upload the same species under different names.
    scientificName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    physicalDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    breedingRegion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    size: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    food: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    habitat: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    song: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    funFact: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    // Bird image metadata for the single sitting image used in-game.
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },

    // Set by the uploader within global bounds enforced elsewhere (see
    // Open Questions — exact bounds still TBD).
    scaleRange: {
      type: scaleRangeSchema,
      required: true,
    },

    // Server-measured (not client-reported) actual image dimensions —
    // design doc §5 is explicit that this must come from reading the
    // real file, not trusting the upload request.
    imageMeta: {
      type: imageMetaSchema,
      required: true,
    },

    rarity: {
      type: String,
      enum: RARITY_TIERS,
      default: 'basic',
      required: true,
    },

    visibility: {
      type: String,
      enum: ['private', 'submitted', 'approved', 'rejected'],
      default: 'private',
      required: true,
      index: true,
    },

    license: {
      type: licenseSchema,
      required: true,
    },

    // True if this bird is eligible for tamagotchi-style pet care (§6).
    // Enforced below: only basic/rare birds can be creatures, matching
    // "user-uploaded birds are capped at Rare" (§4) + "isUserCreature
    // ... by rarity rules means Basic or Rare only" (§6).
    isUserCreature: {
      type: Boolean,
      default: false,
    },

    care: {
      type: careSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

birdSchema.path('isUserCreature').validate(function validateCreatureRarity(isUserCreature) {
  if (!isUserCreature) return true;
  return this.rarity === 'basic' || this.rarity === 'rare';
}, 'isUserCreature birds must be basic or rare rarity');

// Belt-and-suspenders for the same rule as ownerId-uploaded birds are
// created: an owned bird can't be above the user-upload rarity cap.
// Curated/official birds (ownerId === null) are exempt.
birdSchema.path('rarity').validate(function validateOwnerUploadCap(rarity) {
  if (!this.ownerId) return true;
  const capIndex = RARITY_TIERS.indexOf(MAX_USER_UPLOAD_RARITY);
  return RARITY_TIERS.indexOf(rarity) <= capIndex;
}, `user-uploaded birds cannot exceed ${MAX_USER_UPLOAD_RARITY} rarity`);

// Convenience accessors so scoring code has one place to pull point/coin
// values from (src/config/rarity.js) instead of re-deriving them.
birdSchema.methods.getPoints = function getPoints() {
  return pointsForRarity(this.rarity);
};

const Bird = mongoose.model('Bird', birdSchema);

export default Bird;