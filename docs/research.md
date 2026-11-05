# Quora — Deep Research Notes

## CoD-Style Mechanics Deep Dive

### Recoil & Damage Falloff
- **Hitscan rifle**: instant hit detection via raycasting, no projectile travel time
- **Recoil kick**: vertical + horizontal camera kick on fire, linear recovery over time
- **Spread**: hipfire has wider dispersion, ADS (Aim Down Sights) tightens spread cone
- **Damage falloff**: damage decreases with distance from muzzle; range bands define falloff thresholds
- **Tracer rounds**: visual line renderer between muzzle and impact point; client-side only for feedback

### Health & Regen Systems
- **Health pool**: 100 max; damage vignette on hit (radial gradient overlay)
- **Regen delay**: 2.0s after last damage taken before regen starts
- **Regen rate**: 1.5 HP per second up to 100
- **Low-health pulse**: below 30 HP, screen pulses red with radial gradient; fades in/out
- **Screen shake**: on taking damage (intensity: 0.15, decay: 3.0s/s)

### Wave Scaling
- **Wave formula**: `enemies = floor(base * 1.15^waveNumber)`; base = 5
- **Enemy health scaling**: `hp = baseHP * 1.1^waveNumber`
- **Enemy speed scaling**: `speed = baseSpeed * 1.05^waveNumber`
- **Killstreak triggers**: 3 kills → UAV, 5 kills → Precision Strike, 7 kills → Mortar

### VFX/CGI Pipeline Notes

#### GLSL Shader Techniques
- **ACES Filmic Tone Mapping**: `tonemapping: THREE.ACESFilmicToneMapping, exposure: 1.3` — boosted vibrancy, cinematic look
- **Fog**: `FogExp2` with density 0.004 and color `0x1a8cff` — atmospheric haze over infinite terrain
- **Procedural shadows**: `VSMShadowMap` (Variance Shadow Mapping) — smooth PCF-quality shadows without filter artifacts
- **Emissive materials**: `color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0` — neon shields, glowing optics
- **Additive blending**: `blending: THREE.AdditiveBlending` — muzzle flashes, explosions, energy fields

#### Infinite Terrain (fBm + Perlin)
- **Fractional Brownian Motion**: sum of octaved sine/cosine waves at different frequencies
- **Height formula**: `sin(x*0.008)*cos(z*0.008)*18 + sin(x*0.04)*sin(z*0.04)*5`
- **Center flattening**: radius-based height falloff within 200 units → fair competitive arena
- **Texture generation**: entirely mathematical — no image files, 0MB footprint
- **Monolith placement**: random positions at |x| > 120 or |z| > 120 from center

#### Particle Systems
- **GPU-accpired particles**: `THREE.MeshBasicMaterial` with small spheres; velocity + gravity physics
- **Life cycle**: 0.35s lifespan; position update per frame; remove when life <= 0
- **Explosion bloom**: 20 particles radiating from impact point with randomized velocity
- **Muzzle flash**: additive sprite at barrel end; animate over 0.1s then fade

## Multiplayer Networking Architecture

### WebSocket Protocol
- **Connection**: `ws://localhost:8080` (or remote server IP:port)
- **Packet format**: JSON objects with `type` field
- **Tick rate**: 30 updates per second (tickRate = 0.033s)
- **Compression**: raw string arrays, no third-party networking libraries

### Packet Types
- `"INIT"`: server assigns client ID upon connection
- `"MOVE"`: `{"type":"MOVE", "x":px, "y":py, "z":pz, "ry":ry}` — sent 30Hz per client
- `"UPDATE_WORLD"`: `{"type":"UPDATE_WORLD", "players:{id1:transform1, id2:transform2}}` — broadcast from server
- `"PEER_DISCONNECT"`: `{"type":"PEER_DISCONNECT", "id":clientId}` — cleanup on disconnect

### Client-Side Reconciliation
- **Interpolation**: `mesh.position.lerp(targetPosition, deltaTime * 15.0)` — smooth movement, no teleport
- **Authority**: server is authoritative; client sends positions, server validates & broadcasts
- **Peer rendering**: each connected player gets a neon cyan capsule mesh (`0x00f5ff`)
- **Self entity**: local player rendered normally; remote peers are capsule avatars

### Java Game Server (QuoraGameServer.java)
- **Port**: 8080
- **Framework**: Java WebSocket Server (`org.java_websocket.server.WebSocketServer`)
- **Threading**: `ConcurrentHashMap` for player transform registry; multi-threaded processing
- **onOpen**: sends INIT packet with client's remote socket address as ID
- **onMessage**: intercepts `"type":"MOVE"` packets, caches in registry, triggers global broadcast
- **triggerGlobalWorldSync**: compiles all player transforms into `"UPDATE_WORLD"` JSON package
- **Broadcast**: sends UPDATE_WORLD to all connected clients every tick

### Keeping Under 1GB App Limit
- **Zero pre-rendered assets**: all terrain, textures, effects are procedural math, no image files
- **GLSL shaders**: visual effects calculated live on GPU, no asset overhead
- **Low-poly geometries**: simple Box, Cylinder, Sphere geometries; no complex 3D models
- **Optimized Java server**: `ConcurrentHashMap`, minimal object allocation, thread-safe operations
- **Electron packaging**: bundled scripts + shaders + Java backend → ~75MB final installer

## Procedural Gun Model Architecture

### Low-Poly Assembly from Geometric Primitives
- **No external .gltf/.fbx files**: all weapons constructed from `THREE.BoxGeometry`, `THREE.CylinderGeometry`
- **Structural parental nodes**: `THREE.Group` as weapon container, attached to player camera node
- **Material profile**: dark metallic (`0x222222, roughness: 0.4, metalness: 0.8`) with high-visibility accent (`0xd90429`)

### Weapon Components (from quora_gun.js)
1. **Receiver**: `BoxGeometry(0.06, 0.08, 0.4)` — main body
2. **Barrel**: `CylinderGeometry(0.015, 0.015, 0.35, 6)` — rotated -90° on X, extends forward
3. **Magazine**: `BoxGeometry(0.04, 0.15, 0.06)` — rotated -15° on X, slanted profile
4. **Holographic sight**: `BoxGeometry(0.03, 0.03, 0.08)` — red accent (`0xd90429`)

### Aim Down Sights (ADS) Mechanics
- **Hipfire offset**: `(0.3, -0.35, -0.6)` — weapon positioned to the side/lower for normal view
- **ADS offset**: `(0, -0.22, -0.45)` — barrels center-screen when aiming
- **Lerp transition**: `currentOffset.lerp(targetOffset, deltaTime * 14.0)` — smooth 0.07s transition
- **ADS trigger**: Right mouse button (`RMB`) sets `isAiming = true`; release returns to hipfire
- **Weapon bobbing**: during movement (WASD) without aiming: `sin(bobTime) * 0.003` on X, `cos(bobTime*2) * 0.003` on Y
- **Bob deactivates**: when entering ADS view

## Lore & World Timeline

### Setting (Year 2082+)
- **Global Defense Council (GDC)**: unified Earth under orbital infrastructure
- **Great Swarm Incursion**: 2082, extinction event from deep space
- **Present Day**: 2086, Cadet Initialization & Orbital Counter-Strike

### Three Combat Theaters
1. **The Outer Rim**: desert outposts, bug hives, planetary airstrikes
2. **The Fortress Worlds**: industrial colonies, defensive turrets, electrical minefields
3. **New Kyoto**: capital overrun by skyscraper-sized invertebrates; urban warzone

### Entity Types
- **Terminid Swarm Troopers**: low-poly, neon-magenta insectoids; fast rushing attacks; scythe arms
- **Colossal Aggressors**: skyscraper-sized ants/spiders; metallic iridescent sheen; massive health pools
- **Deep Space Vanguard**: player characters; heavily armored space marines; customizable visor colors

## CADET INDUCTION PROGRESSION

### Stage 1: Helldiver Training Camp
- **Section A**: Locomotion Track — sprint, slide, vault, emergency dive
- **Section B**: Live-Fire Range — recoil control, ADS, weak-point hitscan
- **Section C**: Gloo Wall Deploy — instant defensive energy barriers
- **Final Graduation**: survive mock bug breach

### Stage 2: Orbital Command Transition
- Promoted to Deep Space Vanguard Fleet
- Access multiplayer lobby, weapon loadouts, character skills
- Drop into operational warzones with up to 16 players

## Compilation Directive

### Project Structure
```
quora_project_root/
├── src-java/
│   └── QuoraGameServer.java
├── src-web/
│   ├── index.html
│   ├── style.css
│   ├── app.js (or game.js)
│   ├── quora_core.js
│   ├── quora_world.js
│   ├── quora_vfx.js
│   ├── quora_player.js
│   ├── quora_weapons.js
│   ├── quora_gun.js
│   └── quora_network.js
└── package.json
```

### Build Steps
1. `npm init -y`
2. `npm install three electron electron-builder --save-dev`
3. `javac src-java/QuoraGameServer.java`
4. `npm run dist` — packages into optimized desktop executable (< 75MB, under 1GB limit)