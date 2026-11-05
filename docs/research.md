# Steel Haven — Research & Design Notes

## 1. Call of Duty gameplay mechanics (deep dive)

Sources:
- Activision: "The Basics of Call of Duty: Modern Warfare" — recoil patterns, sustained fire.
- COD.com: Modern Warfare III Weapons Training — handling, recoil, attachments.
- "Call of Duty In Depth: Damage vs. Rate of Fire" (game engine mechanics).
- KOKUGAMES "Aiming for fun — core mechanics of shooting games".

Findings applied to Steel Haven:
- Recoil: weapon kick per shot + recovery after firing stops. Steel Haven: pitch/yaw kick with exponential recovery, spread increases with kick.
- Damage vs fire rate: TTK tuning. Steel Haven: hitscan damage 34 with falloff starting at 70 units; enemy HP scaled per wave.
- Health system: regenerating health with delay before regen (CoD style). Steel Haven: 6s regen delay, 9 HP/s.
- Movement: sprint/crouch/jump; CoD movement feel (accel, friction). Steel Haven: accel-based movement.

## 2. VFX / CGI pipeline

Sources:
- Epic Games: Unreal Engine 5 Muzzle Flash VFX (Niagara); Gun FX in UE5.
- Realtime VFX / Houdini: how muzzle flash is made in real time; flash on screen 1-2 frames.
- Houdini VFX for Games; Houdini explosion → flipbook → UE4.
- Game-ready explosions: packed spritesheets + shader.

Findings applied:
- Muzzle flash: additive sprite + point light, short life.
- Tracer: additive line, short life.
- Explosion: additive sprite + ring decal + point light.
- Long-term: Niagara/EmberGen/Houdini sims → flipbooks/spritesheets for production quality.

## 3. CGI

- Game VFX uses real-world/imaginary CGI footage, motion capture, Houdini fluid sims, compositing; real-time engines use lightweight equivalents (sprites, niagara, light data).

## 4. Roadmap

- Slide mechanic, prone, weapon sway tuning, audio, minimap, more enemy types.
