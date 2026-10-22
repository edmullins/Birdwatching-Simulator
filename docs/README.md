# Birdwatching Simulator :bird:

> A single-player browser-based birdwatching game.

[🚀 Live App](https://ethan.barrycumbie.com/) | [🎤 Demo](https://birdwatching-simulator.onrender.com/) | [📚 Project Docs] | [🐛 Report a Bug]

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

[INDIA] | [JULIETT] | [KILO] | [Capabilities] | [Individual Reports]

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
[![Architecture diagram](https://gitdiagram.com/diagram-badge.svg)](https://gitdiagram.com/edmullins/birdwatching-simulator?utm_source=readme&utm_medium=badge)
<img width="4025" height="7948" alt="diagram" src="https://github.com/user-attachments/assets/b16c7a25-2f50-4a3a-908c-dc583570514d" />
