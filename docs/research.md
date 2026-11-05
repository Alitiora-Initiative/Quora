# Quora research notes

Research checked on 2026-11-05. Quora is an original small-scope FPS prototype inspired by genre conventions; it reuses no Call of Duty or Free Fire code, art, audio, names, or maps.

## Design references

- Activision's beginner guide describes weapon-specific recoil patterns and player learning; Quora translates that broad idea into an original configurable recoil/recovery and hip-fire versus ADS spread model. [Activision: Modern Warfare basics](https://blog.activision.com/call-of-duty/2019-10/The-Basics-of-Call-of-Duty-Modern-Warfare-Ready-Aim-Fire)
- Garena's Gloo Wall developer post explains its role as deployable tactical cover. Quora implements a distinct energy shield with its own geometry and timing. [Garena: Gloo Makers](https://ff.garena.com/en/article/1144)

These are design references, not permission to copy protected expression. Weapon names, map layouts, character designs, UI, audio and lore in Quora should stay original.

## Rendering and performance

- Three.js documents renderer controls for shadow maps, power preference, and output rendering; the project uses a WebGL renderer, shadow maps, ACES tone mapping, fog, emissive materials and procedural geometry. [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer)
- Three.js color management distinguishes sRGB color assets from linear working-space data. Logo PNGs should be tagged as sRGB when loaded as textures. [Three.js color management](https://threejs.org/manual/pages/color-management.html)
- MDN recommends conservative graphics-memory budgeting, quality options, eager disposal, batching and handling WebGL context loss. These are laptop constraints; Quora caps pixel ratio and offers a quality toggle, but broader profiling and context recovery remain production work. [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

## Desktop runtime

- Current stable release research identifies Electron 45.2.3 (released 2026-11-04). Pin the tested version rather than depending on a floating `latest`. [Electron releases](https://releases.electronjs.org/)
- Electron documentation recommends sandboxing renderer processes and using context isolation. Quora's BrowserWindow uses `sandbox: true`, `contextIsolation: true`, and `nodeIntegration: false`. [Electron process sandbox](https://www.electronjs.org/docs/latest/tutorial/sandbox)
- Electron Forge packages app files alongside the runtime and can make distributables. An unsigned local build is suitable for this laptop test, but Windows may display SmartScreen warnings when users download it. [Electron packaging tutorial](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging)

## Scope and current limitations

Quora is a local, original Three.js vertical slice, not a 1–3 GB AAA title. The current source bundle is small because city geometry, weapons, bots and effects are generated at runtime. Expanding the download to hundreds of files or gigabytes by padding it would not improve graphics. A truly production-scale game needs authored/licensed meshes, textures, motion capture, voice and music, a full animation pipeline, multiplayer services, a content build pipeline, QA and sustained iteration. The Java source in this repository is not counted as production-ready multiplayer until its build and protocol have been verified.
