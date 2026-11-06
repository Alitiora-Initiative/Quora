# QUORA — Agent Instructions

These instructions apply to every coding agent working in this repository.

## Product direction

QUORA is an original Windows PC action shooter / battle-royale project. Its visual direction is cinematic, grounded military science-fiction with a distinct black, metallic-silver, electric-purple and restrained cyan identity.

Use Free Fire, Call of Duty, PUBG, Helldivers and Resident Evil only as high-level design references for broad genre conventions. Do not copy their source code, maps, characters, named weapons, UI artwork, sounds, story, logos, or other protected expression. All QUORA content must be original or properly licensed.

The repository currently contains a small 3D FPS prototype made with Three.js and Electron. It is not a 2D game, but it is not yet a production-quality 3D game. Treat the existing implementation as a reference/legacy prototype and preserve it until the new Unity build has been tested. Do not delete or overwrite the existing root-level Electron application.

## Unity migration

The target engine for the next major version is Unity 6 or newer, using the Universal Render Pipeline (URP) and C#. Create the new project in `UnityProject/` so it can coexist with the existing application.

Before writing Unity code:
1. Inspect the repository, current Unity installation, and available Unity Agent plugin skills.
2. Read this file and `docs/UNITY_MIGRATION_PLAN.md`.
3. Use relevant Unity Agent skills from the installed `unity@unity-agent-plugin` plugin for Unity project setup, scenes, input, rendering, UI, asset workflows, and testing. Do not claim a skill was invoked unless it is available and actually invoked.
4. Confirm the installed Unity Editor version and packages. Prefer documented APIs for that exact version.
5. Make a migration branch or checkpoint before large changes. Never remove the existing Electron/Three.js prototype during migration.

## Visual and gameplay target

The intended camera is third-person over-the-shoulder for exploration and movement, with a deliberate first-person/aim-down-sights presentation for precision aiming where appropriate. Keep camera behavior configurable so design can be tested.

The first playable milestone is NOT a fake screenshot or a static menu. It must contain:
- A real Unity URP project that opens in Unity 6.
- A real 3D lobby scene with a navigable camera, lit 3D environment, a 3D character placeholder or licensed/original rigged character, an idle animation or clear animation placeholder, and working UI navigation.
- A playable 3D training range scene.
- A controllable 3D character with collision, camera follow, keyboard movement, mouse look, jump, sprint, and crouch.
- At least one original test weapon with aiming, firing, reload, hit detection, health and impact feedback.
- One simple bot using NavMesh or a documented temporary alternative.
- A Windows build that can be launched separately from the old Electron app after the build succeeds.

## Project organization

Use clear Unity folders under `UnityProject/Assets/`:
- `Scenes/`
- `Scripts/Core/`
- `Scripts/Player/`
- `Scripts/Combat/`
- `Scripts/AI/`
- `Scripts/UI/`
- `Scripts/World/`
- `Scripts/Audio/`
- `Scripts/Utilities/`
- `ScriptableObjects/Weapons/`
- `ScriptableObjects/Characters/`
- `Art/Characters/`
- `Art/Environment/`
- `Art/Weapons/`
- `Art/Materials/`
- `Art/VFX/`
- `Audio/`
- `Prefabs/`
- `Settings/`
- `Tests/`

Keep systems modular and data-driven. Use ScriptableObjects for weapon definitions, character definitions, gameplay tuning, and match settings. Use the Input System package for input. Use Cinemachine where useful and compatible with the installed Unity version. Use UI Toolkit for new menu/settings UI unless a strong technical reason favors another Unity UI system; document the choice.

Do not introduce multiplayer networking in the first milestone. Design interfaces so server-authoritative multiplayer can be added later, but first make the offline vertical slice reliable. Later evaluate Unity Netcode for GameObjects or another supported networking solution using current official documentation.

## Asset requirements

The reference artwork in `assets/reference-pack/` is moodboard material. Use it to understand composition, color, location variety, and feature intent; do not treat generated pictures as actual 3D models or textures.

Use original blockout geometry only for grayboxing. Replace primitive-looking blockout assets with high-quality original or properly licensed models, textures, rigs, animations, audio and VFX as the project progresses. Track asset source, license, attribution and redistribution permissions in `UnityProject/ASSET_CREDITS.md`. Never download cracked, pirated, or ripped assets from commercial games.

Do not make fake claims about high-resolution textures, animated characters, destruction, multiplayer, or gameplay features. Clearly label placeholders and incomplete systems.

## Performance and quality

The primary platform is Windows laptop/desktop. Prioritize a scalable URP configuration:
- Low, Medium, High and Ultra quality presets.
- Adjustable resolution, fullscreen/windowed mode, render scale, shadows, effects, texture quality and frame cap.
- Sensible defaults for integrated graphics and 8 GB RAM where feasible.
- Object pooling for frequently spawned projectiles, impacts and effects.
- LODs, occlusion/frustum culling, texture compression and batching where appropriate.
- Profile before adding expensive post-processing or real-time lights.
- No hard requirement for 100-player matches until actual dedicated-server and network load testing proves it.

Do not promise a fixed frame rate without testing on the target laptop. Provide a Low preset and gracefully handle unsupported graphics features.

## Engineering rules

- Keep the Unity project opening and compiling after each milestone.
- Do not edit generated Unity files or Library cache files by hand.
- Do not commit `Library/`, `Temp/`, `Obj/`, build outputs, local secrets, credentials or machine-specific absolute paths.
- Keep package versions pinned and compatible with the chosen Unity Editor.
- Avoid unreviewed dependency additions.
- Add tests for gameplay math and critical systems.
- Run available validation, compilation, play-mode checks and build checks. If Unity Editor/CLI is unavailable in the environment, explicitly report that limitation and give the exact local verification steps.
- Fix compile errors before expanding features.
- Never say that a feature is finished unless it has been tested and the evidence is stated.
- Keep changes focused. Explain changed files and remaining work in the final report.

## First priority

Follow `docs/UNITY_MIGRATION_PLAN.md` and complete Milestone 1 only: a genuine 3D Unity lobby plus a playable training range. Do not attempt to build the entire full-scale multiplayer game in one giant pass.
