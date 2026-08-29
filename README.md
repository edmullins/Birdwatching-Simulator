# Birdwatching Simulator — Design Document

Status: Concept / Pre-development
Stack: Node.js, npm, MongoDB, RESTful API

---

## 1. Overview

A single-player browser-based birdwatching game. Players view scenes built from
layered real-life asset photos with bird images/animations composited on top.
Holding **spacebar** zooms in through a binocular-shaped mask. Clicking a bird
scores points and awards coins based on rarity. Each level gives the player
5 minutes to find a minimum number of birds; birds get smaller, more distant,
more obscured, and more evasive as levels progress. Every 10 levels, the
background location changes.

Players can also upload their own bird photos/frames and background images.
Uploads are private by default; players may submit them for admin review to
become available to all players. Player-created birds (capped at "rare"
rarity) can be raised as a tamagotchi-style pet in pre/post-game screens.

Leaderboard ranks players by **max level reached**.

---

## 2. Core Gameplay Loop

1. Player starts a run at level 1, background set for levels 1–10.
2. Timer: 5 minutes per level.
3. Birds fade into the scene over a 2–3 frame animation, at positions/sizes/
   z-depths determined by the level's difficulty parameters.
4. Player scans the scene normally, or holds **space** to zoom in (binocular
   mask overlay, higher effective zoom).
5. Clicking a bird within its hitbox scores points and awards coins based on
   the bird's rarity.
6. Some birds "flee" — a short flight animation, then reappear elsewhere in
   the scene — adding a tracking difficulty layer.
7. Level is cleared when the player finds ≥ the level's minimum bird count
   before the timer expires. Failing to hit the minimum ends the run.
8. Every 10 levels, the background (and its occlusion layers) changes.
9. On run end, `levelReached` is submitted for leaderboard consideration
   (server-validated — see §7).

### Difficulty scaling per level
- Minimum birds required (increases)
- Bird distance / scale (birds get smaller/farther)
- Bird density (how many spawn concurrently)
- Occlusion (birds spawn behind/between background layers)
- Flee/relocate behavior (introduced at higher levels)

---

## 3. Rendering Model

- Each scene = **background layer** (static image) + one or more
  **occlusion layers** (mid-ground assets, each with a fixed z-index) + one
  or more **bird layers** (small absolutely-positioned sprites, each with
  its own z-index slot between occlusion layers).
- Render order example: `background → occlusionLayer[0] → birds(z:1) →
  occlusionLayer[1] → birds(z:2) → ...`
- Zoom (spacebar): do **not** reload higher-res assets on zoom. CSS-scale
  the existing composited layer inside a clipped circular/binocular mask.
  Optionally pre-load slightly higher-res crops of birds currently in-scene
  for sharpness at max zoom.
- Bird animation: 1–3 frame sprite cycle via CSS/JS interval — chosen over
  video specifically because it's simple to validate/support for
  user-uploaded content.
- Bird state machine: `spawning (fade-in) → visible → [fleeing → hidden →
  reappear] → visible → clicked/despawned`.
- Hitboxes: slightly larger than the visual sprite bounds, especially
  important at small sizes / high zoom in late-game levels.

---

## 4. Rarity & Economy

Rarity tiers: **Basic, Rare, Epic, Legendary**

- Higher rarity = more points + more coins on capture, and lower spawn
  probability.
- **User-uploaded birds are capped at Rare** — they cannot be Epic or
  Legendary. This preserves the value of curated/official high-rarity birds.
- Coins (name TBD) are spent on binocular upgrades (increased zoom
  multiplier). Binoculars are unlocked via coin cost and/or level
  thresholds.

---

## 5. User-Generated Content

### Uploads
- Players can upload bird photos + 1–3 animation frames, and background
  images (+ optional occlusion layer images).
- On upload, player sets a **scale range** (min/max) within global bounds
  defined by the game — this controls how large/small the bird can render
  in-game.
- **Automatic image size validation** on upload: server reads actual image
  dimensions (not client-reported) and validates/resizes against defined
  canvas bounds before accepting, so assets always fit without manual
  developer adjustment.

### Visibility states
- `private` — default. Only visible to the uploading player, in their own
  games.
- `submitted` — player has requested review for public inclusion.
- `approved` — admin-approved; now spawnable for all players.
- `rejected` — admin-rejected; remains visible only to the owner, flagged
  as rejected.

### Admin review
- No separate admin login system — admin page/routes are gated behind the
  normal auth session plus an `isAdmin` flag on the user document.
- Admin page lists the review queue (`submitted` assets), lets the admin
  approve/reject bird and background submissions.

---

## 6. Tamagotchi / Pet Care System

- Any bird a player has **created** (`isUserCreature: true`) — which by
  rarity rules means Basic or Rare only — can be cared for as a pet.
- Available in pre-game and post-game screens (not during the timed run).
- Mechanics: feed (raises hunger stat), play (a simple flappy-bird-style
  minigame that raises happiness).
- Stats decay over time based on elapsed time since last interaction,
  computed on read rather than via a background job.

---

## 7. Leaderboard & Anti-Cheat

- Leaderboard metric: **max level reached** per player.
- Run submissions are validated server-side before being accepted:
  - Per-level duration must fall within a plausible tolerance of the
    5-minute cap.
  - Levels must have been reached sequentially (no skipping).
  - Birds found must not exceed birds actually spawned/available for that
    level.
- Runs failing validation are flagged (`status: "flagged"`) rather than
  silently rejected, so they can be reviewed rather than lost.

---

## 8. Data Model (MongoDB)

```js
users: {
  _id, username, email, passwordHash,
  isAdmin: Boolean,
  coins: Number,
  unlockedBinoculars: [binocularId],
  stats: { maxLevelReached: Number }
}

birds: {
  _id, ownerId,
  name, speciesName,
  frames: [url],              // 1-3 frames
  scaleRange: { min, max },   // set by uploader, within global bounds
  imageMeta: { width, height, aspectRatio },
  rarity: "basic" | "rare" | "epic" | "legendary",
  visibility: "private" | "submitted" | "approved" | "rejected",
  isUserCreature: Boolean,    // true if eligible for pet care
  care: { hunger, happiness, lastFedAt, lastPlayedAt }
}

backgrounds: {
  _id, ownerId,
  imageUrl, imageMeta,
  unlockLevel: Number,
  visibility: "private" | "submitted" | "approved" | "rejected",
  occlusionLayers: [
    { imageUrl, zIndex, imageMeta }
  ]
}

levels: {
  _id, levelNumber,
  minBirdsRequired: Number,
  birdDistanceRange: { min, max },
  birdDensity: Number,
  fleeEnabled: Boolean,
  backgroundId
}

binoculars: {
  _id, name, zoomMultiplier, cost, unlockedByLevel
}

runs: {
  _id, userId,
  levelReached: Number,
  startedAt, endedAt,
  levelTimestamps: [{ level, enteredAt, exitedAt }],
  birdsFound: [birdId],
  status: "valid" | "flagged"
}

admin_review_queue: {
  _id, assetType: "bird" | "background",
  assetId, submittedBy,
  status: "pending" | "approved" | "rejected",
  reviewedBy, reviewedAt
}
```

---

## 9. Open Questions / TBD

- [ ] Name for the in-game currency (coins).
- [ ] Exact global bounds for uploaded image dimensions and bird scale range.
- [ ] Occlusion layer count limits per background.
- [ ] Whether flee/relocate behavior should factor into scoring or
      anti-cheat logging.
- [ ] Image moderation approach for uploads (automated pre-filter +
      manual admin review, vs. manual-only at launch).
- [ ] REST endpoint spec (planned as a follow-up doc).
- [ ] Express/Mongoose schema implementation (planned as a follow-up).

---

## 10. Tech Stack

- **Runtime:** Node.js
- **Package management:** npm
- **Database:** MongoDB
- **API architecture:** RESTful
