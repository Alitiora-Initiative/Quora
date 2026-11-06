# First Codex task — QUORA Unity 6 vertical slice

Open this repository in Codex after installing the official Unity Agent plugin. Read `AGENTS.md` and `docs/UNITY_MIGRATION_PLAN.md` fully before making changes.

## Prompt to Codex

You are the Unity technical lead for QUORA. Use the installed official Unity Agent plugin skills that apply. Inspect the plugin's available skill list and invoke the appropriate skills for Unity project creation, URP rendering, scenes, input, camera, UI Toolkit, asset workflow and testing. Follow the skill reference files when relevant.

The existing Electron/Three.js project is a legacy playable prototype. Preserve it. Do not convert the existing web canvas into a pretend 3D lobby, do not replace the game with a static poster, and do not delete any current working files.

Create a genuine Unity 6+ URP Windows game project in `UnityProject/`. The first delivery must be a real interactive 3D lobby and a playable 3D training range.

### Step 1 — inspect and plan
- Check Unity Hub/Editor availability and exact version.
- Check whether Unity CLI / Editor batch mode is available.
- Check local laptop capabilities only from available system information; do not invent specs.
- Confirm the repository's reference images under `assets/reference-pack/`.
- Propose the minimum package set and package versions for the installed Unity version.
- If Unity is not installed, do not pretend it is; create only the project scaffold and provide installation/verification instructions.

### Step 2 — create project
- Create a Unity 6+ URP project at `UnityProject/`.
- Add a clear folder structure and version-control ignore rules.
- Configure Windows target and scalable quality presets.
- Configure the Input System.
- Use UI Toolkit for the lobby/menu UI unless a documented technical reason favors another choice.

### Step 3 — build the real 3D lobby
Create Boot and MainLobby scenes. The lobby must have spatial depth, geometry, physically based materials, real-time/baked lighting, atmosphere, and a camera that frames a real 3D character. Use a properly licensed rigged placeholder or an original simple rig and animation; do not use a flat image pretending to be a character.

Include interactive navigation: Play, Character, Armory, Inventory, Missions, Events, Profile and Settings. Clearly label unimplemented future areas and make enabled buttons work. Use local mock data only.

### Step 4 — build TrainingRange
Create a playable 3D practice environment with a controllable character, camera, collision, sprint, jump, crouch, aiming, one rifle, shooting, reloading, target damage and feedback, one simple AI target, HUD, pause and return-to-lobby flow.

### Step 5 — validate
- Open and compile the project in the real Unity Editor if available.
- Run Edit Mode and Play Mode tests where practical.
- Build a Windows development build in a separate output directory.
- Launch that executable and test the lobby -> training -> lobby flow.
- Capture screenshots from the real build and add them under `UnityProject/Documentation/Screenshots/`.
- If the environment cannot run Unity, state exactly what could not be tested and do not claim the build works.

## Acceptance criteria

This task is complete only when the real Unity project opens in Unity 6+, the lobby is rendered in 3D and navigable, the player visibly exists in 3D, TrainingRange is playable, combat basics work, and a separate Windows build launches. Do not start the full island or online multiplayer until this milestone is demonstrated.

When finished, provide a concise evidence-based report listing files changed, Unity version, package versions, test results, build path, screenshots and remaining work.
