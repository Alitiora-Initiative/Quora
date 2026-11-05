"use strict";

// ================= DOM REFS =================
const canvas = document.getElementById("game-canvas");
const crosshairEl = document.getElementById("crosshair");
const crosshairRing = document.getElementById("crosshair-ring");
const hitmarkerEl = document.getElementById("hitmarker");
const lowHealthEl = document.getElementById("low-health");
const damageOverlayEl = document.getElementById("damage-overlay");
const waveCounterEl = document.getElementById("wave-counter");
const objectiveEl = document.getElementById("objective");
const scoreEl = document.getElementById("score");
const killstreakEl = document.getElementById("killstreak");
const healthFillEl = document.getElementById("health-fill");
const healthTextEl = document.getElementById("health-text");
const ammoTextEl = document.getElementById("ammo-text");
const reloadFillEl = document.getElementById("reload-fill");
const radarCanvas = document.getElementById("radar");
const menuOverlay = document.getElementById("menu-overlay");
const pauseOverlay = document.getElementById("pause-overlay");
const deathOverlay = document.getElementById("death-overlay");
const deployBtn = document.getElementById("deploy-btn");
const resumeBtn = document.getElementById("resume-btn");
const restartBtn = document.getElementById("restart-btn");
const redeployBtn = document.getElementById("redeploy-btn");
const deathStatsEl = document.getElementById("death-stats");

// ================= CONFIG =================
const CONFIG = {
  WORLD: 160,
  GRAVITY: 24,
  WALK_SPEED: 6.4,
  SPRINT_SPEED: 9.6,
  JUMP_SPEED: 8.4,
  CROUCH_HEIGHT: 1.25,
  STAND_HEIGHT: 1.8,
  MOUSE_SENS: 0.0022,
  ADS_FOV: 55,
  HIP_FOV: 72,
  FIRE_RATE: 10,
  DAMAGE: 34,
  DAMAGE_FALLOFF_START: 70,
  HEALTH_MAX: 100,
  HEALTH_REGEN_DELAY: 6,
  HEALTH_REGEN_RATE: 9,
  MAG_SIZE: 30,
  RESERVE: 90,
  RELOAD_TIME: 2.2,
  KILLSTREAKS: ["UAV", "PRECISION STRIKE", "MORTAR FIRE"]
};

// ================= STATE =================
let state = "menu";
let score = 0;
let kills = 0;
let killstreakProgress = 0;
let killstreakTier = 0;
let wave = 1;
let waveActive = false;
let waveTimer = 0;
let enemies = [];
let effects = [];
let tracers = [];
let uavActive = false;
let uavTimer = 0;
let shake = 0;
let hitTime = 0;
let damageFlash = false;
let gameTime = 0;
let adsActive = false;
let reloading = false;
let reloadT = 0;
let fireTimer = 0;
let pitchKick = 0;
let yawKick = 0;
let bobPhase = 0;
let lastDamageTime = 0;

// ================= THREE / SCENE =================
const THREE = window.THREE;
const raycaster = new THREE.Raycaster();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b16);
scene.fog = new THREE.Fog(0x070b16, 28, 150);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 400);
camera.position.set(0, 1.8, 8);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

scene.add(new THREE.HemisphereLight(0x8fa8ff, 0x191005, 0.55));
scene.add(new THREE.AmbientLight(0x223350, 0.5));
const sun = new THREE.DirectionalLight(0xfff2dd, 0.9);
sun.position.set(60, 90, 40);
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

function makeGroundTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#262019";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.03)";
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  return tex;
}
const groundTex = makeGroundTexture();
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ map: groundTex }));
ground.rotation.x = -Math.PI / 2;
world.add(ground);

function makeBuildingTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#4a4a52";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.05)";
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}
const buildingTex = makeBuildingTexture();
const walls = [];

function addBuilding(x, z, w, h, d) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ map: buildingTex }));
  m.position.y = h / 2;
  g.add(m);
  walls.push(m);
  world.add(g);
  g.position.set(x, 0, z);
  return g;
}

addBuilding(-45, -35, 26, 14, 26);
addBuilding(45, -40, 30, 18, 30);
addBuilding(-50, 30, 24, 12, 24);
addBuilding(50, 35, 28, 16, 28);
addBuilding(-70, -10, 20, 10, 20);
addBuilding(70, -15, 22, 12, 22);
addBuilding(10, -60, 40, 8, 40);

function makeExplosionTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,220,150,1)");
  g.addColorStop(1, "rgba(255,120,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
const explosionTex = makeExplosionTexture();

// ================= EFFECTS =================
function addEffect(pos, color, scale, life) {
  const light = new THREE.PointLight(color, 30, 26, 2);
  light.position.copy(pos);
  scene.add(light);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: explosionTex, color: color, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  sprite.position.copy(pos);
  sprite.scale.set(scale, scale, 1);
  scene.add(sprite);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.85, 40), new THREE.MeshBasicMaterial({
    color: color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  ring.position.copy(pos);
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  effects.push({ light: light, sprite: sprite, ring: ring, t: 0, life: life });
}

function addTracer(a, b) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z], 3));
  const m = new THREE.LineBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const l = new THREE.Line(g, m);
  l.frustumCulled = false;
  scene.add(l);
  tracers.push({ line: l, t: 0, life: 0.08 });
}

// ================= PLAYER =================
const player = {
  pos: new THREE.Vector3(0, 1.8, 8),
  vel: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  health: 100,
  maxHealth: 100,
  reloading: false,
  reloadT: 0,
  crouching: false,
  sprint: false,
  ammo: CONFIG.MAG_SIZE,
  reserve: CONFIG.RESERVE,
  bobPhase: 0,
  grounded: true
};

const playerHitGroup = new THREE.Group();
const playerHitMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, CONFIG.STAND_HEIGHT, 0.55), new THREE.MeshBasicMaterial({ visible: false }));
playerHitGroup.add(playerHitMesh);
scene.add(playerHitGroup);

const weaponG = new THREE.Group();
weaponG.position.set(0, -0.27, -0.42);
camera.add(weaponG);

const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.22), new THREE.MeshLambertMaterial({ color: 0x2a2f3a, flatShading: true }));
receiver.position.y = 0.17;
const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 10), new THREE.MeshLambertMaterial({ color: 0x11141a, flatShading: true }));
barrel.rotation.x = Math.PI / 2;
barrel.position.set(0, 0.17, -0.22);
const magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.13), new THREE.MeshLambertMaterial({ color: 0x1c2026, flatShading: true }));
magMesh.position.set(0, 0.1, 0.08);
weaponG.add(receiver, barrel, magMesh);

// ================= ENEMIES =================
function spawnEnemy(waveN) {
  const kind = Math.random() < 0.85 ? "rifle" : "shotgun";
  const e = {
    group: new THREE.Group(),
    mesh: null,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    hp: (kind === "shotgun" ? 110 : 70) * (1 + (waveN - 1) * 0.12),
    maxHp: (kind === "shotgun" ? 110 : 70) * (1 + (waveN - 1) * 0.12),
    speed: (kind === "shotgun" ? 2.4 : 3.4) * (1 + (waveN - 1) * 0.12),
    dmg: (kind === "shotgun" ? 16 : 9) * (1 + (waveN - 1) * 0.12),
    fireRate: kind === "shotgun" ? 1.4 : 2.3,
    spread: kind === "shotgun" ? 0.05 : 0.03,
    aggroRange: kind === "shotgun" ? 30 : 45,
    state: "roam",
    wp: new THREE.Vector3(),
    lastKnown: new THREE.Vector3(),
    fireT: 0,
    alive: true,
    kind: kind
  };
  const g = e.group;
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, kind === "shotgun" ? 1.0 : 0.85, 0.5), new THREE.MeshLambertMaterial({ color: kind === "shotgun" ? 0x4a2f33 : 0x3a4450, flatShading: true }));
  m.position.y = (kind === "shotgun" ? 1.0 : 0.85) / 2;
  g.add(m);
  e.mesh = m;
  const margin = 12;
  const x = (Math.random() * 2 - 1) * (CONFIG.WORLD / 2 - margin - 8);
  const z = (Math.random() * 2 - 1) * (CONFIG.WORLD / 2 - margin - 8);
  e.pos.set(x, kind === "shotgun" ? 1.0 : 0.85, z);
  e.group.position.copy(e.pos);
  const ang = Math.random() * Math.PI * 2;
  e.group.rotation.set(0, ang, 0);
  e.yaw = ang;
  e.pitch = 0;
  e.state = "roam";
  e.lastKnown.copy(e.pos);
  e.wp = e.pos.clone();
  enemies.push(e);
}

function startWave(n) {
  wave = n;
  waveActive = true;
  waveTimer = 0;
  waveCounterEl.textContent = "WAVE " + wave;
  objectiveEl.textContent = "ELIMINATE ALL HOSTILES";
  const count = Math.min(5 + n * 2, 18);
  for (let i = 0; i < count; i++) spawnEnemy(n);
}

function resetMission() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    scene.remove(e.group);
    enemies.splice(i, 1);
  }
  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    scene.remove(fx.light, fx.sprite, fx.ring);
    effects.splice(i, 1);
  }
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i];
    scene.remove(t.line);
    tracers.splice(i, 1);
  }
  score = 0;
  kills = 0;
  killstreakProgress = 0;
  killstreakTier = 0;
  uavActive = false;
  uavTimer = 0;
  wave = 1;
  waveActive = true;
  player.pos.set(0, 1.8, 8);
  player.vel.set(0, 0, 0);
  player.health = 100;
  player.ammo = CONFIG.MAG_SIZE;
  player.reserve = CONFIG.RESERVE;
  player.reloading = false;
  player.reloadT = 0;
  player.crouching = false;
  player.sprint = false;
  player.grounded = true;
  player.pitch = 0;
  player.yaw = 0;
  camera.position.copy(player.pos);
  camera.rotation.set(0, 0, 0);
  camera.fov = CONFIG.HIP_FOV;
  camera.updateProjectionMatrix();
  fireTimer = 0;
  pitchKick = 0;
  yawKick = 0;
  state = "playing";
  startWave(1);
  updateHUD();
}

// ================= INPUT =================
const keys = {};
let mouseDX = 0;
let mouseDY = 0;

window.addEventListener("keydown", function (e) {
  if (e.code === "Space") e.preventDefault();
  keys[e.code] = true;
  if (e.code === "KeyR") startReload();
  if (e.code === "KeyC") {
    if (state === "playing") {
      player.crouching = !player.crouching;
      player.grounded = true;
    }
  }
  if (e.code === "ShiftLeft") player.sprint = true;
  if (e.code === "KeyH" && state === "playing") adsActive = !adsActive;
});

window.addEventListener("keyup", function (e) {
  keys[e.code] = false;
  if (e.code === "ShiftLeft") player.sprint = false;
});

canvas.addEventListener("mousedown", function (e) {
  if (state !== "playing") return;
  if (e.button === 2) { adsActive = true; return; }
  if (e.button === 0) fire();
});

window.addEventListener("mouseup", function (e) {
  if (e.button === 2) adsActive = false;
});

canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

document.addEventListener("mousemove", function (e) {
  if (document.pointerLockElement !== canvas) return;
  mouseDX += e.movementX;
  mouseDY += e.movementY;
});

document.addEventListener("pointerlockchange", function () {
  const locked = document.pointerLockElement === canvas;
  if (state === "playing" && !locked) {
    state = "paused";
    pauseOverlay.classList.add("visible");
  }
  if (locked && (state === "menu" || state === "paused")) {
    if (state === "paused") pauseOverlay.classList.remove("visible");
    state = "playing";
    crosshairEl.classList.remove("hidden");
  }
});

function fire() {
  if (state !== "playing") return;
  if (player.reloading) return;
  if (player.ammo <= 0) { startReload(); return; }
  player.ammo--;

  const spread = adsActive ? 0.005 : 0.03;
  pitchKick += 0.045 + Math.random() * 0.02;
  yawKick += (Math.random() - 0.5) * 0.05;

  const muzzlePos = new THREE.Vector3();
  weaponG.getWorldPosition(muzzlePos);
  addEffect(muzzlePos, 0xffd27a, 0.35, 0.06);

  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y += (Math.random() - 0.5) * spread;
  dir.x += (Math.random() - 0.5) * spread;
  dir.z += (Math.random() - 0.5) * spread;
  dir.normalize();

  let didHit = false;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive) continue;
    raycaster.set(origin, dir);
    const hits = raycaster.intersectObject(e.mesh, false);
    if (hits.length > 0) {
      didHit = true;
      addTracer(origin, hits[0].point);
      addEffect(hits[0].point, 0xff8844, 0.22, 0.09);
      const dist = e.pos.distanceTo(camera.position);
      const dmg = CONFIG.DAMAGE * Math.max(0.25, 1 - dist / CONFIG.DAMAGE_FALLOFF_START);
      e.hp -= dmg;
      hitTime = gameTime;
      hitmarkerEl.classList.remove("hidden");
      if (e.hp <= 0) killEnemy(e, dmg);
      break;
    }
  }
  if (!didHit) {
    raycaster.set(origin, dir);
    const hits = raycaster.intersectObjects(walls, true);
    if (hits.length > 0) {
      addTracer(origin, hits[0].point);
      addEffect(hits[0].point, 0xff8844, 0.22, 0.09);
    }
  }
}

function killEnemy(e, dmg) {
  e.alive = false;
  score += 100;
  kills++;
  killstreakProgress++;
  addEffect(e.pos, 0xff5522, 1.1, 0.4);
  const next = [25, 50, 75][killstreakTier];
  if (killstreakProgress >= next) {
    killstreakProgress = 0;
    killstreakTier = Math.min(killstreakTier + 1, CONFIG.KILLSTREAKS.length - 1);
    triggerKillstreak(CONFIG.KILLSTREAKS[killstreakTier]);
  }
  scene.remove(e.group);
  const idx = enemies.indexOf(e);
  if (idx >= 0) enemies.splice(idx, 1);
  if (waveActive && enemies.length === 0) {
    waveActive = false;
    waveTimer = 6;
  }
}

function triggerKillstreak(name) {
  if (name === "UAV") {
    uavActive = true;
    uavTimer = 20;
    killstreakEl.textContent = "KILLSTREAK: UAV ONLINE";
  } else if (name === "PRECISION STRIKE") {
    killstreakEl.textContent = "KILLSTREAK: PRECISION STRIKE";
    let best = null;
    let bestD = -1;
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (!en.alive) continue;
      const d = en.pos.distanceTo(player.pos);
      if (d > bestD) { bestD = d; best = en; }
    }
    if (best) addEffect(best.pos, 0xff3355, 2.0, 0.5);
  } else if (name === "MORTAR FIRE") {
    killstreakEl.textContent = "KILLSTREAK: MORTAR FIRE";
    const en = enemies[Math.floor(Math.random() * enemies.length)];
    if (en) addEffect(en.pos, 0xff8844, 1.6, 0.45);
  }
}

function startReload() {
  if (state !== "playing") return;
  if (player.reloading) return;
  if (player.ammo >= CONFIG.MAG_SIZE || player.reserve <= 0) return;
  player.reloading = true;
  reloadT = CONFIG.RELOAD_TIME;
  reloadFillEl.style.width = "0%";
}

// ================= COMBAT =================
function enemyFire(e) {
  const origin = new THREE.Vector3();
  e.group.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  e.group.getWorldDirection(dir);
  dir.y += (Math.random() - 0.5) * e.spread;
  dir.x += (Math.random() - 0.5) * e.spread;
  dir.z += (Math.random() - 0.5) * e.spread;
  dir.normalize();
  raycaster.set(origin, dir);
  const hits = raycaster.intersectObjects(walls, true);
  if (hits.length > 0) return;
  const dist = origin.distanceTo(player.pos);
  const falloff = Math.max(0.25, 1 - dist / CONFIG.DAMAGE_FALLOFF_START);
  if (dist < e.aggroRange && dist < 60) {
    playerHit(e.dmg * falloff);
  }
}

function playerHit(dmg) {
  if (state !== "playing") return;
  player.health -= dmg;
  damageFlash = true;
  shake = 0.35;
  lastDamageTime = gameTime;
  if (player.health <= 0) {
    player.health = 0;
    state = "dead";
    deathOverlay.classList.add("visible");
    deathStatsEl.textContent = "WAVE " + wave + " — HOSTILES ELIMINATED: " + kills;
    return;
  }
  updateHUD();
}

// ================= AI =================
function faceTarget(e, target) {
  const dx = target.x - e.pos.x;
  const dz = target.z - e.pos.z;
  e.yaw = Math.atan2(-dx, -dz);
  const dy = target.y - e.pos.y;
  e.pitch = Math.max(-1.2, Math.min(1.2, Math.asin(Math.max(-1, Math.min(1, dy)))));
  e.group.rotation.set(e.pitch, e.yaw, 0);
}

function moveToward(e, target, amount) {
  const dx = target.x - e.pos.x;
  const dz = target.z - e.pos.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d < 0.001) { e.vel.set(0, e.vel.y, 0); return; }
  const mv = Math.min(amount, d);
  e.vel.x = (dx / d) * mv;
  e.vel.z = (dz / d) * mv;
  e.pos.x += e.vel.x * 0.016;
  e.pos.z += e.vel.z * 0.016;
  e.vel.x *= 0.8;
  e.vel.z *= 0.8;
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.alive) { enemies.splice(i, 1); continue; }
    const dx = player.pos.x - e.pos.x;
    const dz = player.pos.z - e.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    e.fireT -= dt;

    if (e.state === "roam") {
      const wpDist = e.wp.distanceTo(e.pos);
      if (wpDist < 1.2) { e.state = "investigate"; continue; }
      moveToward(e, e.wp, e.speed * dt);
      faceTarget(e, e.wp);
    } else if (e.state === "investigate") {
      if (e.lastKnown.distanceTo(e.pos) < 1.5) { e.state = "roam"; continue; }
      moveToward(e, e.lastKnown, e.speed * dt);
      faceTarget(e, e.lastKnown);
    } else if (e.state === "engage") {
      if (dist > 40) { e.state = "roam"; continue; }
      if (dist < 2.2) { e.vel.set(0, e.vel.y, 0); continue; }
      moveToward(e, player.pos, e.speed * dt);
      faceTarget(e, player.pos);
      if (e.fireT <= 0) {
        e.fireT = e.fireRate;
        enemyFire(e);
      }
    }

    if (e.state === "roam" && dist < e.aggroRange) e.state = "engage";
  }
}

// ================= HUD =================
function updateHUD() {
  healthFillEl.style.width = Math.max(0, Math.min(100, player.health)) + "%";
  healthTextEl.textContent = Math.ceil(player.health);
  ammoTextEl.textContent = player.ammo + " / " + player.reserve;
  reloadFillEl.style.width = player.reloading ? ((1 - player.reloadT / CONFIG.RELOAD_TIME) * 100) + "%" : "0%";
  scoreEl.textContent = "SCORE " + score;
  waveCounterEl.textContent = "WAVE " + wave;
  objectiveEl.textContent = waveActive ? "ELIMINATE ALL HOSTILES" : "HOLD POSITION";

  if (player.health < 30) lowHealthEl.classList.add("low");
  else lowHealthEl.classList.remove("low");

  crosshairEl.classList.toggle("hidden", state !== "playing");

  if (state === "playing") {
    const spreadAmt = (adsActive ? 0.005 : 0.03) + pitchKick * 2;
    const size = (adsActive ? 18 : 30) * (1 + spreadAmt * 25);
    crosshairRing.style.width = size + "px";
    crosshairRing.style.height = size + "px";
  }
}

function updateRadar() {
  const c = radarCanvas.getContext("2d");
  const size = radarCanvas.width;
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  c.clearRect(0, 0, size, size);
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.strokeStyle = "rgba(255,255,255,0.5)";
  c.lineWidth = 2;
  c.stroke();
  if (uavActive) {
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) continue;
      const dx = e.pos.x - player.pos.x;
      const dz = e.pos.z - player.pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > 45) continue;
      const ang = Math.atan2(dx, dz);
      const rr = (d / 45) * r;
      c.beginPath();
      c.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 3, 0, Math.PI * 2);
      c.fillStyle = "#ff4444";
      c.fill();
    }
  }
  const px = cx + Math.sin(player.yaw) * r;
  const pz = cy - Math.cos(player.yaw) * r;
  c.beginPath();
  c.arc(px, pz, 4, 0, Math.PI * 2);
  c.fillStyle = "#7dff8a";
  c.fill();
}

// ================= FLOW =================
deployBtn.addEventListener("click", function () {
  if (state === "menu") { state = "playing"; crosshairEl.classList.remove("hidden"); menuOverlay.classList.remove("visible"); }
  if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
});
resumeBtn.addEventListener("click", function () {
  pauseOverlay.classList.remove("visible");
  state = "playing";
  if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
});
restartBtn.addEventListener("click", function () { resetMission(); if (document.pointerLockElement !== canvas) canvas.requestPointerLock(); });
redeployBtn.addEventListener("click", function () { resetMission(); if (document.pointerLockElement !== canvas) canvas.requestPointerLock(); });

// ================= UPDATE / CAMERA / FX / LOOP =================
function update(dt) {
  gameTime += dt;

  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const ix = (keys["KeyD"] || keys["ArrowRight"] ? 1 : 0) - (keys["KeyA"] || keys["ArrowLeft"] ? 1 : 0);
  const iz = (keys["KeyS"] || keys["ArrowDown"] ? 1 : 0) - (keys["KeyW"] || keys["ArrowUp"] ? 1 : 0);
  const wvx = forward.x * ix + right.x * iz;
  const wvz = forward.z * ix + right.z * iz;
  const wlen = Math.sqrt(wvx * wvx + wvz * wvz);
  const wish = new THREE.Vector3(wvx / (wlen || 1), 0, wvz / (wlen || 1));
  const speed = player.crouching ? CONFIG.WALK_SPEED * 0.5 : (player.sprint ? CONFIG.SPRINT_SPEED : CONFIG.WALK_SPEED);
  wish.multiplyScalar(speed);
  const k = 0.6;
  player.vel.x += (wish.x - player.vel.x) * Math.min(1, k * dt);
  player.vel.z += (wish.z - player.vel.z) * Math.min(1, k * dt);
  player.vel.y -= CONFIG.GRAVITY * dt;
  player.pos.x += player.vel.x * dt;
  player.pos.z += player.vel.z * dt;
  player.pos.y += player.vel.y * dt;
  if (player.pos.y <= 0) { player.pos.y = 0; player.vel.y = 0; player.grounded = true; }
  else player.grounded = false;
  if (keys["Space"] && player.grounded) { player.vel.y = CONFIG.JUMP_SPEED; player.grounded = false; }

  pitchKick *= Math.pow(0.0018, dt);
  yawKick *= Math.pow(0.0018, dt);
  camera.rotation.x = player.pitch - pitchKick * 0.3;
  camera.rotation.y = player.yaw - yawKick * 0.3;
  camera.rotation.z = yawKick * 0.3;
  camera.fov = adsActive ? CONFIG.ADS_FOV : CONFIG.HIP_FOV;
  camera.updateProjectionMatrix();

  let swayX = 0, swayY = 0;
  const moving = player.grounded && (player.vel.x * player.vel.x + player.vel.z * player.vel.z) > 0.01;
  if (adsActive) { swayX = (Math.random() - 0.5) * 0.004; swayY = (Math.random() - 0.5) * 0.006; }
  else if (moving) { swayX = Math.sin(gameTime * 9.5) * 0.012; swayY = Math.cos(gameTime * 7.0) * 0.008; }
  weaponG.rotation.x = swayX + pitchKick * 0.5;
  weaponG.rotation.y = swayY - yawKick * 0.5;
  weaponG.rotation.z = yawKick * 0.5;
  if (player.grounded && moving) {
    player.bobPhase += dt * (player.sprint ? 11 : 8);
    weaponG.position.y = -0.27 + Math.abs(Math.sin(player.bobPhase)) * 0.015;
    weaponG.position.x = Math.sin(player.bobPhase) * 0.008;
  } else {
    weaponG.position.y = -0.27;
    weaponG.position.x = 0;
  }

  if (player.reloading) {
    player.reloadT -= dt;
    reloadFillEl.style.width = ((1 - player.reloadT / CONFIG.RELOAD_TIME) * 100) + "%";
    if (player.reloadT <= 0) {
      player.reloading = false;
      reloadFillEl.style.width = "0%";
      player.ammo = CONFIG.MAG_SIZE;
      player.reserve = Math.max(0, player.reserve - CONFIG.MAG_SIZE);
    }
  }

  fireTimer -= dt;
  if (fireTimer <= 0) {
    fireTimer = 1 / CONFIG.FIRE_RATE;
    fire();
  }

  if (uavActive) {
    uavTimer -= dt;
    if (uavTimer <= 0) { uavActive = false; killstreakEl.textContent = "KILLSTREAK: NONE"; killstreakEl.classList.add("hidden"); }
  }

  if (waveActive && enemies.length === 0) {
    waveActive = false;
    waveTimer -= dt;
    if (waveTimer <= 0) startWave(wave + 1);
  }

  if (player.health < player.maxHealth && gameTime - lastDamageTime > CONFIG.HEALTH_REGEN_DELAY) {
    player.health = Math.min(player.maxHealth, player.health + CONFIG.HEALTH_REGEN_RATE * dt);
  }

  damageFlash = false;
  shake = Math.max(0, shake - dt * 2.2);

  updateHUD();
  updateRadar();
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    fx.t += dt;
    const k = fx.t / fx.life;
    if (k >= 1) { scene.remove(fx.light, fx.sprite, fx.ring); effects.splice(i, 1); continue; }
    fx.light.intensity = Math.max(0, 30 * (1 - k) * 1.6);
    fx.sprite.scale.setScalar(0.3 + (1 - k) * (fx.scale - 0.3));
    fx.sprite.opacity = 1 - k;
    fx.ring.scale.setScalar(0.3 + (1 - k) * (fx.scale - 0.3));
  }
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i];
    t.t += dt;
    const k = t.t / t.life;
    if (k >= 1) { scene.remove(t.line); tracers.splice(i, 1); continue; }
    t.line.material.opacity = 1 - k;
  }
}

function applyCamera() {
  camera.position.copy(player.pos);
  camera.position.y = player.pos.y;
  camera.position.x += (Math.random() - 0.5) * shake * 0.35;
  camera.position.z += (Math.random() - 0.5) * shake * 0.35;
  camera.rotation.set(player.pitch - pitchKick * 0.3, player.yaw - yawKick * 0.3, yawKick * 0.3);
  camera.fov = adsActive ? CONFIG.ADS_FOV : CONFIG.HIP_FOV;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state === "playing") update(dt);
  updateEffects(dt);
  applyCamera();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

menuOverlay.classList.add("visible");
state = "menu";
updateHUD();
