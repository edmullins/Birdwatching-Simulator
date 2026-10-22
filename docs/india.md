# Project India

## WHO — user + project

### Project
**Name:** Birdwatching Simulator

**One-line pitch:** A browser-based birdwatching game where you scan a scene, zoom through binoculars, and learn to spot and recognize real birds as the levels get harder.

### Team
| Member | Role / areas |
|---|---|
| Me (solo) | Everything: game design, front-end (canvas/DOM rendering), back-end (Node/Express/MongoDB API), art/asset curation, content research, testing |

Solo-project implication: scope is the main risk. Every feature below is judged by "does it help the player learn, and can one person finish it?"

### User story
As a **curious beginner who has never learned to identify birds**, I want **to practice noticing and recognizing birds in realistic scenes through a game**, so that **I get better at spotting and naming real birds without needing to go outside or memorize a field guide**.

### Specific user / audience **(assumption)**
- **Primary:** casual beginners using a school or home computer with a keyboard and mouse.
- **Secondary:** Teachers who want a short (5–15 minute) activity to support a life-science or ecology unit.
- **Not building for:** experienced birders or serious ID training (that need is already served well by existing tools, see below).

---

## WHY — problem + value

### Problem / opportunity
Most people can't tell common local birds apart, and the tools that exist for learning are either reference-style (guides, ID apps) or social/logging tools. They assume you are already outdoors and motivated. There's a gap for an **in-browser, low-stakes practice game** that builds the *visual search and recognition skill* (finding a small, partly hidden bird, then knowing what it is) that real birding depends on.

### Value proposition
For **beginners and casual learners**, our application **turns bird spotting and recognition into a fast, replayable game with escalating difficulty** because **practicing in short timed levels with immediate feedback (and a species fact on every catch) builds recognition faster and more enjoyably than reading a guide, and requires no equipment, location, or account-heavy setup.**

---

## WHAT ALREADY EXISTS — landscape

### 1. Merlin Bird ID (Cornell Lab of Ornithology)
- **What it is:** A free ID app for iOS and Android with Sound ID, Photo ID, and a describe-the-bird wizard. Each confirmed ID can be added to a life list. ([Cornell Lab](https://www.birds.cornell.edu/landtrust/merlin-bird-id), [Merlin site](https://merlin.allaboutbirds.org))
- **Good:** Sound ID and Photo ID both work offline; content is backed by eBird data and community photos/songs; free with no premium tier reported by review sites ([Stork review](https://www.stork.ai/en/merlin-bird-id-by-cornell-lab-of-ornithology)).
- **Bad / missing:** It is an *answer tool*, not a *practice tool*. It tells you what the bird is; it doesn't train you to find or recognize birds yourself. No game loop.
- **Functionality that matters:** life list, species photo galleries (male/female/immature variants), camera and microphone input, offline regional packs.
- **Borrow / avoid:** Borrow the life-list and "which variant looks like what" ideas. Avoid trying to compete on identification accuracy.

### 2. Birda
- **What it is:** A social birding app combining logging, automatic life lists, challenges, badges, and a feed. ([Birda features](https://birda.org/features/), [Wikipedia](https://en.wikipedia.org/wiki/Birda_(app)))
- **Good:** Strong motivation systems (challenges, badges, life lists organized by place) per its [App Store listing](https://apps.apple.com/app/id1564130920) and [support docs](https://support.birda.org/en/articles/5585811-getting-started-with-birda).
- **Bad / missing:** Requires real-world birding to participate. A third-party app audit reports paywall complaints and requests for audio ID ([marlvel.ai](https://marlvel.ai/api/llm/apps/reference/com-chirpbirding-birda)); treat that as secondary evidence, not verified fact.
- **Functionality that matters:** progress tracking, badges, and challenges keep people returning.
- **Borrow / avoid:** Borrow badges and life-list progress. Avoid a social feed and paywalls (too much scope and moderation burden for a solo educational project).

### 3. Wingspan (digital adaptation)
- **What it is:** A relaxing bird-themed strategy card game on Steam and GOG, with 170 birds in the official description, animated birds, and real recordings. ([MobyGames](https://www.mobygames.com/game/wingspan), [Meeple Mountain review](https://www.meeplemountain.com/reviews/wingspan-digital))
- **Good:** Reviewers highlight calm tone, attractive art, narrated bird facts, and a tutorial. It shows that bird facts can be woven into a game people enjoy ([The Sixth Axis](https://www.thesixthaxis.com/2020/10/30/wingspan-review/)).
- **Bad / missing:** It is a card strategy game. It does not train real-world visual search or recognition, and it is a paid desktop product.
- **Functionality that matters:** species facts attached to gameplay moments, sound, polished art.
- **Borrow / avoid:** Borrow the "fact appears when you interact with a bird" pattern. Avoid heavy strategy systems.

### 4. eBird (adjacent / data source)
- **What it is:** The sighting database that powers Merlin, described by Cornell as the world's largest of its kind ([Cornell Lab](https://www.birds.cornell.edu/landtrust/merlin-bird-id)).
- **Relevance:** Possible source of regional species lists and frequency data so spawn rates can reflect which birds are actually common somewhere. **Guess:** API/licensing terms need checking before any use.

### 5. Current / manual approach
- Paper field guides, printed ID sheets, classroom bird walks, and flashcards. Effective but requires going outside or sitting through static material; no immediate feedback loop and no difficulty progression.

### Why build another one?
Existing products identify birds (Merlin), motivate real outings (Birda), or gamify bird *collection* in a strategy format (Wingspan). None observed here is a **fast paced, browser-based visual-search game with progressive difficulty and learning feedback**.

### Functionality / technology clues
| Area | Finding |
|---|---|
| Mobile | Merlin and Birda are native apps; Birdwatching Simulator is a desktop-browser game first (spacebar zoom). Mobile touch version is a stretch goal. |
| Auth / MFA / OAuth | Not needed for MVP; simple sessions are enough. For students, consider no-account guest play. |
| Notifications | Skip. |
| Camera / location | Skip. Merlin and Birda use them; Birdwatching Simulator does not need them. |
| AI | Skip for MVP. Merlin uses computer vision and ML for ID (documented); Birdwatching Simulator can use curated labeled assets. |
| Sharing | Skip. |
| Offline | Optional later (service worker). |
| Payments | Optional later (monetization) |
| Privacy | Educational audience likely includes minors: minimize data collected |

---

## DONE — your KILO success test

> At KILO, we should be able to demonstrate that...

**A first-time beginner can open the game in a browser with no instructions from me, play at least 3 levels, and afterward correctly name at least 3 birds they didn't know before.**

Concretely, I can demonstrate:
1. A live, deployed site where a new player reaches a playable level within 30 seconds of landing.
2. The core loop works: scene with layered background and occlusion, birds fade in, holding space zooms through a binocular mask, and indentifying a bird scores.
3. Difficulty visibly increases across at least 3 levels (smaller, farther, more hidden birds).
4. **The learning moment:** every caught bird shows its name and a short fact at the end, and a field guide screen records allows the player to learn about the birds that can be found.
5. A before/after check with **3–5 real test users** (classmates, friends, family) showing they can name more birds after playing than before.
6. Scores are saved server-side and a basic leaderboard works.

---

## PLAN — project system

### Starting point
- A complete MVP game: gameplay loop, rendering model, rarity/economy, data model, anti-cheat, UGC, and pet system.
- Chosen stack: Node.js, npm, MongoDB, RESTful API.

### Direction
By KILO, Birdwatching Simulator is a **small, polished, educational vertical slice**: the core spotting loop plus a learning layer, running on a real server, with a handful of curated levels and a small set of real birds with accurate facts.

### Capabilities (three initial directions; may change)
1. **Core spotting loop (front-end).** Layered scene rendering, spacebar binocular zoom (CSS scale + mask, as designed), bird sprite, timer, textbox, field-guide, level difficulty scaling.
2. **Learning layer.** Species data (name, fact, details, etc), a post-catch info card, a field guide screen
3. **Persistence & progress (back-end).** Express + MongoDB API for users, runs, life list, and leaderboard, with the server-side run validation

### Biggest unknowns
- **Difficulty tuning:** How do I tune spawn size, density, and occlusion so levels feel fair rather than frustrating? Needs playtesting.
- **Learning effectiveness:** How do I measure whether players actually learned anything (simple pre/post test design)?
- **Open design questions:** occlusion layer limits, other level designs.

### Project links
- Backlog: [Backlog](https://github.com/edmullins/Birdwatching-Simulator/issues)
- Milestones: [Milestones](https://github.com/edmullins/Birdwatching-Simulator/milestones)
- DEV: [Render](https://birdwatching-simulator.onrender.com/)
- Production: [ethan.barrycumbie.com](https://ethan.barrycumbie.com)

---