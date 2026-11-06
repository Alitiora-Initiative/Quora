# QUORA — Unity 6 Migration and Production Plan

## Why this migration exists

The current repository contains an original Three.js/Electron desktop FPS prototype. It renders 3D geometry and includes a basic FPS camera, procedural environments, weapons, bots, effects, and a desktop wrapper. It is useful as a proof of concept and as a record of existing gameplay ideas, but it relies heavily on generated primitive geometry and does not yet deliver the authored characters, animation, environment art, cinematic lighting, animation systems, level-building workflow, or verified online multiplayer expected of a polished PC shooter.

The next major game version should be built in Unity 6+ with URP and C#. The old version must remain available as a legacy prototype until the Unity build is demonstrated to work.

## Installation and local prerequisites

The Unity Agent plugin is an agent skill pack, not Unity Editor, not a Unity Asset Store package, and not a game engine. Unity documents Unity 6.0 or later as the plugin's prerequisite.

In a Windows PowerShell or Windows Terminal session where the Codex CLI is installed and available on PATH, run these commands exactly:

```powershell
codex plugin marketplace add Unity-Technologies/unity-agent-plugin
codex plugin add unity@unity-agent-plugin
```

Then start a new Codex session and verify:

```powershell
codex plugin list
```

The output should show `unity@unity-agent-plugin` as installed and enabled. Inside a new Codex session, type `/unity:` and confirm the Unity skills appear. If the commands are not recognized, first install/update the Codex CLI and reopen the terminal. Do not attempt to run these commands inside Unity's Package Manager.

Install Unity Hub and a Unity 6 Editor with the Windows Build Support module. Install Git for Windows and a supported .NET SDK if requested by the Unity Editor/tooling. Open this repository as a folder in Codex, and open `UnityProject/` as the Unity project once it exists.

Official references:
- Unity Agent plugin: https://github.com/Unity-Technologies/unity-agent-plugin
- Unity plugin for Codex: https://docs.unity.com/en-us/ai/unity-plugin/codex
- Unity plugin overview and requirements: https://docs.unity.com/en-us/ai/unity-plugin/about-unity-plugin
- Codex CLI plugin commands: https://learn.chatgpt.com/docs/cli/reference

## Engine and package direction

- Unity 6 LTS/current supported Unity 6 release at project creation.
- Universal Render Pipeline (URP), not HDRP, for broader laptop compatibility.
- C#.
- Input System package.
- Cinemachine for camera rigs if compatible with installed Unity version.
- AI Navigation for NavMesh-based prototype bots.
- TextMeshPro or UI Toolkit text according to the chosen UI layer.
- UI Toolkit for menu/settings/lobby UI in a new project unless the agent documents a reason to use uGUI.
- ScriptableObjects for weapon data, character data, match rules and quality settings.
- Unity Test Framework for automated checks.
- Add multiplayer packages only after the offline vertical slice is stable. Evaluate Netcode for GameObjects, dedicated-server deployment and hosting costs before implementing live matches.

Pin and document package versions. Do not use floating or experimental packages without recording the reason.

## Required first milestone: actual 3D lobby and training range

Create a real Unity project in `UnityProject/` with the following scenes:

1. `Boot.unity` — initializes application settings and opens the lobby.
2. `MainLobby.unity` — interactive QUORA lobby with a real 3D scene and character display.
3. `TrainingRange.unity` — small but fully playable 3D combat space.
4. `Island_Blockout.unity` — a later graybox of the first battle-royale island; do not prioritize this over the first two scenes.

### Main lobby requirements

The lobby must be genuinely 3D, not a flat image or a 2D web page presented inside a desktop window.

Create an original futuristic command-center hangar with a distant view of the QUORA island:
- Layered architecture, readable depth, foreground/intermediate/background layers.
- Physically based materials for metal, concrete, glass and painted panels.
- Purple emissive strips as accents, not as a substitute for all lighting.
- Key, fill and rim lighting with baked lighting where appropriate.
- Atmospheric depth and restrained particles.
- A floor with reflections appropriate to laptop hardware.
- An original QUORA insignia integrated into architecture and UI.
- A rigged player character or clearly documented temporary rig with an idle animation.
- Character preview rotation with mouse drag or a controlled display camera.
- A clear visual hierarchy and polished spacing.

The lobby navigation should include:
- PLAY
- CHARACTER
- ARMORY
- INVENTORY
- MISSIONS
- EVENTS
- PROFILE
- SETTINGS

The first milestone can use clearly marked local mock data for profile, currency and progress. Do not connect real payments, monetization, accounts or online services in this milestone. Navigation buttons must work; unavailable features should show a deliberate "Coming later" screen rather than doing nothing.

The PLAY section should show the first supported mode: TRAINING RANGE. Battle Royale, Squad, Operations and Nightfall can be represented as disabled future modes until implemented.

### Training range requirements

- A real 3D playable area with cover, targets, firing lanes and a simple traversal route.
- Third-person movement, camera orbit/follow and mouse look.
- Walk, sprint, jump and crouch.
- Optional first-person ADS camera presentation or zoom for weapon precision.
- One original rifle weapon configured with a ScriptableObject.
- Fire, reload, ammo count, recoil feedback, muzzle flash and impact feedback.
- Health/damage for targets and basic health UI.
- A bot target or simple navigation-based opponent.
- Pause, resume, restart and return-to-lobby functions.
- Controls/settings screen and sensitivity persistence.

### Acceptance tests

Milestone 1 is not complete until:
1. The Unity project opens in the installed Unity 6 Editor without package-resolution errors.
2. Boot opens MainLobby.
3. MainLobby renders an actual 3D environment from a controllable camera.
4. A 3D player model appears, can be rotated, and visibly animates or has a documented placeholder animation.
5. Each enabled lobby button opens the intended screen or scene.
6. PLAY -> TRAINING RANGE loads the playable scene.
7. The player can move, look, jump, crouch, aim, fire and reload.
8. A target reacts to damage and displays feedback.
9. Pause/resume/restart/return-to-lobby work.
10. A Windows development build launches independently of the existing Electron shortcut.
11. The agent provides screenshots captured from the actual Unity build and a clear list of any placeholders.
12. No feature is described as complete unless verified.

## World production plan

After Milestone 1, create one coherent world, QUORA ISLAND. Its six districts are:
- Crown City — dense modern urban district with rooftops, alleys and multi-level interiors.
- Neon Port — docks, container stacks, cranes, warehouses and maritime routes.
- Blackout Base — military airfield, barracks, hangars, defensive positions and underground areas.
- Ghost Valley — forest, hills, streams, villages and concealed routes.
- Skyfall Airport — runway, terminal, hangars, maintenance buildings and deployment routes.
- Royal Dam — dam infrastructure, bridges, tunnels, water channels and control buildings.

Do not create six disconnected demo scenes and call them one island. All districts must occupy a consistent coordinate system and be joined by roads, trails, terrain, waterways or bridges. Establish a world map, scale, points of interest, sightlines, traversal times, combat ranges, landmarks and zone boundaries before high-detail art.

### Map coverage

Capture the same world from:
- North, 0 degrees
- Northeast, 45 degrees
- East, 90 degrees
- Southeast, 135 degrees
- South, 180 degrees
- Southwest, 225 degrees
- West, 270 degrees
- Northwest, 315 degrees
- Top-down orthographic view

Also capture ground-level screenshots of each named district, major exterior landmarks, building interiors, approach routes and combat sightlines. Use stable camera markers so the images can be compared across revisions.

## Character and animation pipeline

Create original QUORA characters with:
- Consistent proportions and a defined skeleton.
- Rigged locomotion, idle, sprint, jump, crouch, slide, aim, reload, fire, hit, fall and revive animations as required by the selected mode.
- Animation blending and upper-body layers for weapon handling.
- Footstep/audio events aligned to animation.
- Character preview and customization data separate from gameplay state.
- Equipment attachment sockets and animation retargeting rules.

Begin with a legally licensed placeholder character if no custom asset exists. Record asset license and source. Do not substitute cubes or unanimated mannequins for the intended final result without marking them as blockout placeholders.

## Combat and weapon systems

Build the combat loop using modular systems:
- Weapon definitions stored as data.
- Fire modes, fire rate, magazine, reserve ammo, reload duration and reload interruption rules.
- Projectile or hitscan selection by weapon class.
- Camera recoil and weapon recoil with controllable tuning.
- Aim-down-sights transitions, hip-fire spread and movement accuracy penalties.
- Original weapon models and attachment points.
- Damage, armor, hit zones, damage falloff and impact effects.
- Grenades and deployable utility only after the base rifle is reliable.
- Server-side validation must be introduced before public multiplayer.

Avoid directly copying specific real-world or game-branded weapon skins, stat tables or proprietary animations. Fictionalize names and visual identity where necessary.

## AI and enemy behavior

Start with predictable training targets and a simple bot. Later add:
- NavMesh-based navigation.
- Vision and hearing awareness with configurable ranges.
- Patrol, investigate, chase, take cover, flank, attack and retreat states.
- Difficulty tuning and bot perception limits.
- Spawn director and encounter pacing.
- Clear distinction between PvP balance and PvE enemy tuning.

Do not build sophisticated AI until movement, collision and navigation are tested across the world.

## Match and mode roadmap

Keep mode-specific rules isolated so QUORA can grow without a single giant manager class.

Potential modes:
1. Training Range — offline practice.
2. Battle Royale — solo/duo/squad elimination, deployment, looting and shrinking safe zone.
3. Tactical Operations — objective-based squad missions.
4. Nightfall — horror/survival missions with scarce resources and stronger enemy encounters.
5. Horde/Defense — cooperative survival against waves.
6. Competitive Arena — smaller PvP objective and elimination formats.

Implement only one mode at a time. Do not present disabled menu items as functional modes.

## Multiplayer roadmap

Do not introduce online play before the offline vertical slice is stable.

The multiplayer phase must include:
- Server-authoritative movement and combat validation.
- Authentication and session identity.
- Lobby/party lifecycle.
- Matchmaking rules and region selection.
- Dedicated server architecture and deployment target.
- Reconnect, timeout and disconnect handling.
- Latency compensation strategy.
- Anti-cheat threat model and server-side sanity checks.
- Load tests with simulated clients.
- Privacy, security and moderation plan.

Estimate recurring server, bandwidth, hosting and operations costs before promising free public service. Do not trust client-reported damage, inventory, currency, match results or anti-cheat verdicts.

## Art, sound and licensing

The reference pack in `assets/reference-pack/` is moodboard/reference material. It is not a 3D asset library and must not be used as if it were a finished game world.

Create an asset register containing:
- Asset name and type.
- Creator/source.
- License and allowed usage.
- Modifications.
- Attribution requirements.
- Source file location.

Use high-quality original or properly licensed environment meshes, character rigs, animations, PBR textures, sky and weather assets, sound effects, music and UI icons. Prioritize visual consistency over raw asset count. Do not download ripped content from Free Fire, Call of Duty, PUBG, Helldivers or Resident Evil.

## Laptop performance target

Build quality presets:
- Low: integrated-GPU fallback, conservative shadows, reduced render scale and fewer effects.
- Medium: balanced texture/shadow/effects settings.
- High: enhanced shadows, effects and render scale.
- Ultra: optional high-end quality, not the default.

Expose resolution, fullscreen/windowed, VSync/frame cap, texture quality, render scale, shadows, anti-aliasing, ambient effects, motion blur and audio volume. Avoid demanding settings by default. Profile on the actual target laptop before making performance claims.

## Build, QA and delivery

- Use Windows x64 as the first player target.
- Preserve Electron app while migration is in progress.
- Give the Unity build a separate output folder and desktop shortcut.
- Keep scenes in Build Settings/build profile in the correct order.
- Test a clean build on a machine that does not have the Unity Editor open.
- Capture screenshots/video of actual gameplay, not AI-generated concept art.
- Maintain a CHANGELOG and record exact Unity Editor and package versions.
- Keep source control clean; ignore Library, Temp, Obj, Logs, builds and local secrets.
- Run Edit Mode tests, Play Mode tests, static checks and Windows build checks where possible.

## Required reporting after every milestone

Report:
- What changed.
- Which scenes open and work.
- Which gameplay systems were actually tested.
- Which packages and versions were added.
- Build output path.
- Screenshots from the actual running build.
- Known bugs and placeholders.
- Exact next milestone.

Never claim to have installed Unity, run the Editor, compiled C#, launched a build, generated a rig, implemented online play or optimized performance unless that action was actually performed and verified.
