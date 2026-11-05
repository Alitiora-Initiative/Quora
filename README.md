# STEEL HAVEN

A Call-of-Duty-style, browser-based wave FPS built for the laptop — no install, no build step, runs on any modern browser via WebGL. Hosted on GitHub (static site → GitHub Pages).

## Play

Open `index.html` locally, or serve the repo root and open in browser.

- Repo: `github.com/alitiora-initiative/steel-haven`
- Play URL after enabling Pages: `https://alitiora-initiative.github.io/steel-haven/`

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
| H | Toggle ADS |

## Features

- Hitscan rifle: recoil kick + recovery, spread (hip/ADS), damage falloff, tracer rounds, muzzle flash, impact FX, explosions.
- Movement: sprint, crouch, jump, gravity, acceleration/friction.
- Health: regen delay + regen rate, damage vignette, low-health pulse, screen shake.
- Waves: scaling enemy counts/health/speed, rifle + shotgun enemy types, roam/engage/investigate AI.
- Killstreaks: UAV radar sweep, Precision strike, Mortar fire.
- HUD: dynamic crosshair spread, hitmarker, health bar + number, ammo/reserve + reload bar, radar, score, wave counter, objective text.

## Tech

- Three.js r128 (WebGL), vanilla JavaScript, Canvas textures, no build step.
- Effects: additive sprites, ring decals, line tracers, point lights.

## Repo layout

- `index.html` — shell + HUD
- `style.css` — HUD styling
- `game.js` — game logic
- `docs/research.md` — deep research notes (CoD mechanics, VFX/CGI)
