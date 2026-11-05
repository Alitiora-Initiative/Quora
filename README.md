# Quora

Quora is an original, laptop-focused 3D first-person shooter prototype built with Three.js and Electron. The world, weapons, bots, and combat effects are generated in code. The current build is a playable vertical slice, not a finished AAA-scale game or a production multiplayer service.

## Play

- **Windows desktop:** run `npm install`, then `npm start`.
- **Browser:** serve this folder over HTTP and open `index.html` in a WebGL-capable browser. A local server avoids browser restrictions on local storage and audio.
- **Self-test:** `npm run selftest` starts a hidden Electron window, boots the renderer, exercises movement and hitscan, and records `test-output/result.json` plus a frame capture.
- **Package the Windows app:** `npm run package:windows`. This creates a portable runtime folder at `dist/Quora/`; launch `dist/Quora/electron.exe`.

## Controls

| Input | Action |
|---|---|
| W A S D | Move |
| Mouse | Look |
| Left mouse | Fire |
| Right mouse | Aim down sights |
| Shift | Sprint |
| C | Crouch |
| Ctrl | Slide |
| Space | Jump |
| R | Reload |
| 1–5 | Select weapon |
| V | Melee |
| G | Throw grenade |
| Q | Deploy energy shield |
| Esc | Pause |
| F4 | Toggle graphics quality |

## Implemented prototype systems

The engine feature registry reports 103 unique code hooks. A 100-item audit checklist is in [docs/100-systems.md](docs/100-systems.md). Highlights include a procedural 3D city, first-person camera and collision, original procedural weapons, five weapon types, ADS and recoil, reload/ammo, grenade and shield abilities, bot combat, waves, health/armor, pickups, shrinking zone, streak rewards, particle and impact effects, synthesized audio, HUD, local profile settings, and an optional WebSocket client. Local multiplayer server support is not verified and should be treated as unavailable in this build.

## Graphics and device expectations

This prototype uses live 3D geometry, shadows, fog, emissive materials, tone mapping, tracers and particles. The image-based HUD/menu is normal FPS interface UI. Graphics quality can be toggled with F4. Performance depends on the laptop GPU and driver; the self-test checks a rendered WebGL frame but does not replace testing on different hardware.

The source and bundled logo assets are far smaller than 1 GB. A gigabyte-scale download would require licensed or original production assets (high-detail models, PBR textures, motion capture, voice, music and cinematic sequences); padding the project with unrelated files would not improve the game. The supplied Quora logos are used for the in-game menu and packaged app icon.

## Project layout

- `index.html`, `style.css` — game canvas, menu and HUD
- `src/quora.js` — playable Three.js engine and game systems
- `three.min.js` — pinned local Three.js runtime
- `assets/` — supplied Quora marks and Windows icon
- `electron-main.js`, `forge.config.js` — hardened desktop shell and packaging
- `docs/100-systems.md` — implementation audit
- `docs/research.md` — design references, rendering guidance and production limits

## Security and online play

The Electron renderer enables context isolation and sandboxing and disables Node integration. The client may try `ws://127.0.0.1:8080`; it displays SOLO until a server connects. The existing Java source has not been built or protocol-validated, so this is not advertised as a working online game.

## License

Quora's original code is provided under the repository's license. Three.js and the supplied logos retain their respective upstream/creator terms; check those before redistributing the bundled assets.
