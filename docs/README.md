# Birdwatching Simulator :bird:

> A single-player browser-based birdwatching game.

[🚀 Live App](https://ethan.barrycumbie.com/) | [🎤 Demo](https://birdwatching-simulator.onrender.com/) | [📚 Project Docs](https://github.com/edmullins/Birdwatching-Simulator/tree/dev/docs) | [🐛 Report a Bug]

## What is it?

Players view scenes built from layered real-life asset photos with bird 
images composited on top. Holding **spacebar** zooms in through
a binocular-shaped mask. Each level gives the player 5 minutes to identify a 
minimum number of birds; birds get smaller, more distant, more obscured, 
and more evasive as levels progress. Every 10 levels, the background location
changes.

## Quick Start

Short user/dev instructions.

## Stack

`HTML/CSS/JS` → `Node/Express` → `MongoDB` → `GCP`

## Project

[INDIA](https://github.com/edmullins/Birdwatching-Simulator/blob/dev/docs/india.md) | [JULIETT] | [KILO] | [Capabilities] | [Individual Reports]

### architecture

``` text
LOCAL
  │
  ▼
GitHub
  │
  ├── dev  ──► Render ─────────► DEV
  │
  └── main ──► GitHub Actions ─► GCP ──► PROD
```

### Project Structure
<img width="8906" height="10117" alt="diagram (1)" src="https://github.com/user-attachments/assets/0207625c-19bc-4019-a355-209ff4fd5994" />

---

[![Architecture diagram of edmullins/birdwatching-simulator](https://gitdiagram.com/edmullins/birdwatching-simulator/diagram.png)](https://gitdiagram.com/edmullins/birdwatching-simulator?utm_source=readme&utm_medium=picture)
