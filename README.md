# Quora

A cinematic multiplayer FPS built for the laptop — no install, no build step, runs on any modern browser via WebGL. Hosted on GitHub (static site → GitHub Pages).

## Play

Open `index.html` locally, or serve the repo root and open in browser.

- Repo: `github.com/alitiora-initiative/quora`
- Play URL after enabling Pages: `https://alitiora-initiative.github.io/quora/`

## Controls

| Input | Action |
|---|---|
| W A S D / Arrows | Move |
| Mouse | Look |
| Left Mouse | Fire |
| Right Mouse | Aim / ADS |
| R | Reload |
| C | Crouch |
| Shift | Sprint |
| Space | Jump |
| Q | Deploy Gloo Shield |
| F | Use Killstreak |

## Features

- **Hitscan rifle**: recoil kick + recovery, spread (hip/ADS), damage falloff, tracer rounds, muzzle flash, impact FX, explosions
- **Procedural gun model**: low-poly assault rifle built from geometric shapes, smooth Aim Down Sights (ADS) transitions with lerp, weapon bobbing during locomotion
- **Procedural CGI terrain**: infinite landscape generated via Fractional Brownian Motion (fBm) and Perlin noise in vertex shaders, zero asset footprint
- **Custom GLSL VFX shaders**: neon emissive shields, animated energy scanlines, screen-space glow, procedural explosions
- **Player movement**: sprint, crouch, jump, gravity, acceleration/friction, camera shake on fire
- **Health**: regen delay + regen rate, damage vignette, low-health pulse, screen shake
- **Wave-based combat**: scaling enemy counts/health/speed, AI enemies with roam/engage/investigate behavior
- **Gloo Shield deployment**: Q key deploys instant defensive energy barrier (from Free Fire style)
- **Killstreaks**: UAV radar sweep, Precision strike, Mortar fire
- **HUD**: dynamic crosshair spread, hitmarker, health bar + number, ammo/reserve + reload bar, radar, score, wave counter, objective text
- **WebSocket multiplayer**: real-time position and action synchronization up to 16 players, smooth interpolation rendering
- **Procedural particle effects**: muzzle flashes, impact sparks, explosion blooms all driven on GPU

## Tech

- Three.js r160 (WebGL), vanilla JavaScript, Canvas textures, no build step
- Effects: additive sprites, ring decals, line tracers, point lights
- Multi-language: JavaScript (game engine), GLSL (shaders), Java (game server backend)
- Architecture: client-side Three.js + WebSocket networking + procedural generation

## Repository Layout

- `index.html` — shell + HUD
- `style.css` — HUD styling
- `game.js` — game logic (engine, VFX, player, gun, weapon, network)
- `docs/research.md` — deep research notes (CoD mechanics, VFX/CGI, networking)
- `src-java/QuoraGameServer.java` — Core Network Socket Routing Engine (Java)
- `package.json` — Configures the desktop app builder