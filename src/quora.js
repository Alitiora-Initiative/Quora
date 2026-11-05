(function () {
  'use strict';
  const T = window.THREE;
  const features = [];
  const feature = (name) => { if (features.indexOf(name) < 0) features.push(name); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const UP = new T.Vector3(0, 1, 0);
  const SELFTEST = new URLSearchParams(location.search).get('selftest') === '1';

  const $ = (id) => document.getElementById(id);
  const canvas = $('game-canvas');
  const renderer = new T.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.autoClear = false;
  renderer.setClearColor(0x07060c, 1);
  feature('aces-tonemap');
  feature('shadow-map');

  const scene = new T.Scene();
  scene.background = new T.Color(0x07060c);
  scene.fog = new T.FogExp2(0x120a1c, 0.016);
  feature('exp-fog');

  const camera = new T.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 380);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  feature('fps-camera');

  const mini = new T.OrthographicCamera(-36, 36, 36, -36, 1, 180);
  mini.up.set(0, 0, -1);
  feature('pip-minimap');

  scene.add(new T.HemisphereLight(0x8a78a8, 0x1a1020, 0.72));
  const sun = new T.DirectionalLight(0xfff1dc, 1.25);
  sun.position.set(36, 70, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.near = 2; sc.far = 180; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70;
  scene.add(sun);

  const state = {
    started: false, paused: false, alive: true,
    yaw: 0, pitch: -0.06,
    pos: new T.Vector3(0, 0, 12),
    velY: 0, grounded: true, crouch: false, sliding: 0, slide: new T.Vector3(),
    sprint: false, stamina: 100, hp: 100, armor: 25,
    ads: 0, shake: 0, recoilP: 0, recoilY: 0, landDip: 0,
    sens: 0.0022, invert: 1, volume: 0.7, qualityHigh: true,
    time: 0, lastHurt: -20, kills: 0, streak: 0, score: 0, wave: 1,
    weapon: 0, nextFire: 0, reload: 0, switchAt: 0, meleeCd: 0, grenadeCd: 0, shieldCd: 0,
    step: 0, zoneR: 999, zoneOn: false, uav: 0, between: 0, best: 0,
    flash: 0, hitPulse: 0, headPulse: false, hitAngle: 0, net: 'SOLO'
  };

  try {
    const saved = JSON.parse(localStorage.getItem('quora-profile') || '{}');
    if (saved.sens) state.sens = saved.sens;
    if (typeof saved.volume === 'number') state.volume = saved.volume;
    if (saved.invert) state.invert = -1;
    if (saved.best) state.best = saved.best;
    if (saved.qualityHigh === false) state.qualityHigh = false;
  } catch (e) { /* keep defaults */ }
  feature('profile-save');

  const keys = {};
  const mouse = { dx: 0, dy: 0, l: false, r: false };
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Escape' && state.started) togglePause();
    if (e.code === 'F4') toggleQuality();
    if (e.code === 'Digit1') queueWeapon(0);
    if (e.code === 'Digit2') queueWeapon(1);
    if (e.code === 'Digit3') queueWeapon(2);
    if (e.code === 'Digit4') queueWeapon(3);
    if (e.code === 'Digit5') queueWeapon(4);
    if (e.code === 'KeyR') beginReload();
    if (e.code === 'KeyQ') deployShield();
    if (e.code === 'KeyG') throwGrenade();
    if (e.code === 'KeyV') melee();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement) {
      mouse.dx += e.movementX;
      mouse.dy += e.movementY;
    }
  });
  window.addEventListener('mousedown', (e) => {
    if (!state.started || state.paused) return;
    if (e.button === 0) mouse.l = true;
    if (e.button === 2) mouse.r = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.l = false;
    if (e.button === 2) mouse.r = false;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  feature('pointer-look');

  const solids = [];
  const blockers = [];
  const targets = [];
  function blocked(x, y, z, height) {
    const r = 0.38;
    const head = y + height;
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (head <= s.min.y || y >= s.max.y) continue;
      if (x + r <= s.min.x || x - r >= s.max.x) continue;
      if (z + r <= s.min.z || z - r >= s.max.z) continue;
      return true;
    }
    return false;
  }
  function addBox(w, h, d, x, y, z, mat, solid) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (solid) {
      solids.push({
        min: new T.Vector3(x - w / 2, y - h / 2, z - d / 2),
        max: new T.Vector3(x + w / 2, y + h / 2, z + d / 2),
        mesh: mesh
      });
      blockers.push(mesh);
    }
    return mesh;
  }
  feature('aabb-collision');

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20261105);
  feature('seeded-rng');

  const matGround = new T.MeshStandardMaterial({ color: 0x2a2436, roughness: 0.92, metalness: 0.04 });
  const matWall = new T.MeshStandardMaterial({ color: 0x3c3650, roughness: 0.78, metalness: 0.08 });
  const matTrim = new T.MeshStandardMaterial({ color: 0x241c30, roughness: 0.6, metalness: 0.2 });
  const matWin = new T.MeshStandardMaterial({ color: 0x9ad7ff, emissive: 0x3d6ea8, emissiveIntensity: 0.8, roughness: 0.2 });
  const matCrate = new T.MeshStandardMaterial({ color: 0x6a5340, roughness: 0.85 });
  const matBeam = new T.MeshStandardMaterial({ color: 0xc46bff, emissive: 0x6a2ea0, emissiveIntensity: 0.4 });

  const ground = new T.Mesh(new T.PlaneGeometry(420, 420), matGround);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const waterMat = new T.MeshStandardMaterial({ color: 0x101c32, roughness: 0.28, metalness: 0.35, emissive: 0x07101c });
  const water = new T.Mesh(new T.PlaneGeometry(560, 560), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.y = -0.45; scene.add(water);
  const island = new T.Mesh(new T.CylinderGeometry(176, 188, 8, 64, 1), new T.MeshStandardMaterial({ color: 0x343044, roughness: 0.95 }));
  island.position.y = -4; island.receiveShadow = true; scene.add(island);
  const districtMat = new T.MeshStandardMaterial({ color: 0x282736, roughness: 0.95 });
  const forestMat = new T.MeshStandardMaterial({ color: 0x243a32, roughness: 1 });
  const roadMat = new T.MeshStandardMaterial({ color: 0x171923, roughness: 0.92 });
  function road(x1,z1,x2,z2,width){ const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),m=new T.Mesh(new T.PlaneGeometry(width,len),roadMat);m.rotation.x=-Math.PI/2;m.rotation.z=-Math.atan2(dx,dz);m.position.set((x1+x2)/2,0.025,(z1+z2)/2);scene.add(m); }
  const pois=[
    {name:'CROWN CITY',x:0,z:0,color:0xc46bff},
    {name:'BLACKOUT BASE',x:-82,z:-62,color:0xa69bff},
    {name:'NEON PORT',x:104,z:54,color:0x55d9ff},
    {name:'GHOST VALLEY',x:-112,z:78,color:0x8bdb9b},
    {name:'SKYFALL AIRPORT',x:80,z:-104,color:0xffd477},
    {name:'ROYAL DAM',x:-30,z:112,color:0x72caff}
  ];
  // Islands' ring road and distinct, landmark-led combat districts.
  for(let i=0;i<pois.length;i++){const a=pois[i],b=pois[(i+1)%pois.length];road(a.x,a.z,b.x,b.z,7);}
  pois.forEach((p,i)=>{
    const pad=new T.Mesh(new T.CylinderGeometry(i===0?43:30,i===0?46:32,0.5,32),districtMat);pad.position.set(p.x,0.12,p.z);scene.add(pad);
    const pole=new T.Mesh(new T.CylinderGeometry(.18,.3,13,8),new T.MeshStandardMaterial({color:p.color,emissive:p.color,emissiveIntensity:.45}));pole.position.set(p.x,6.7,p.z);scene.add(pole);
    const sign=new T.Mesh(new T.BoxGeometry(13,1.1,.3),new T.MeshStandardMaterial({color:p.color,emissive:p.color,emissiveIntensity:.5}));sign.position.set(p.x,10,p.z);scene.add(sign);
    if(i===3){for(let n=0;n<34;n++){const x=p.x+(rand()-.5)*52,z=p.z+(rand()-.5)*46,h=4+rand()*9;const trunk=new T.Mesh(new T.CylinderGeometry(.25,.5,h*.35,6),matCrate);trunk.position.set(x,h*.175,z);scene.add(trunk);const crown=new T.Mesh(new T.ConeGeometry(2+rand()*2,h*.7,7),forestMat);crown.position.set(x,h*.68,z);crown.castShadow=true;scene.add(crown);}}
    if(i===4){addBox(82,.25,7,p.x,0.3,p.z,matTrim,false);for(let n=0;n<5;n++)addBox(12,8,18,p.x-28+n*14,4,p.z-24,matWall,true);}
    if(i===5){addBox(38,1,8,p.x,7,p.z,matBeam,false);addBox(32,9,12,p.x,4,p.z+18,matWall,true);}
    const marker=new T.Mesh(new T.RingGeometry(13,13.7,48),new T.MeshBasicMaterial({color:p.color,side:T.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.set(p.x,.38,p.z);scene.add(marker);
  });
  // Sculpted ridgelines make Ghost Valley and the island interior readable at a distance.
  for(let n=0;n<22;n++){const x=-145+rand()*90,z=35+rand()*95,r=5+rand()*12,h=8+rand()*22;const hill=new T.Mesh(new T.ConeGeometry(r,h,7),forestMat);hill.position.set(x,h/2-1,z);hill.rotation.y=rand()*Math.PI;hill.receiveShadow=true;scene.add(hill);}
  feature('quora-island-six-districts'); feature('coastal-water'); feature('island-road-network'); feature('ghost-valley-forest');
  feature('procedural-city');

  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      if (gx === 0 && gz === 0) continue;
      const cx = gx * 18;
      const cz = gz * 18;
      const bw = 7 + rand() * 3;
      const bd = 7 + rand() * 3;
      const bh = 6 + rand() * 16;
      addBox(bw, bh, bd, cx, bh / 2, cz, matWall, true);
      const floors = Math.max(2, Math.floor(bh / 3));
      for (let f = 1; f < floors; f++) {
        addBox(0.4, 0.7, bd * 0.82, cx + bw / 2 + 0.02, f * 3, cz, matWin, false);
        addBox(bw * 0.82, 0.7, 0.4, cx, f * 3, cz + bd / 2 + 0.02, matWin, false);
      }
      addBox(bw * 0.7, 0.4, bd * 0.7, cx, bh + 0.2, cz, matTrim, false);
    }
  }
  // Crown City's skyline blockout, with walkable streets preserved between towers.
  for(let gx=-1;gx<=1;gx++)for(let gz=-1;gz<=1;gz++){
    if(gx===0&&gz===0)continue;
    const x=gx*17,z=gz*17,h=12+rand()*18,w=6+rand()*2;
    addBox(w,h,w,x,h/2,z,matWall,true);
    for(let f=1;f<Math.floor(h/3);f++)addBox(w*.82,.55,.18,x,h-f*3,z+w/2+.11,matWin,false);
    addBox(w*.72,.35,w*.72,x,h+.18,z,matTrim,false);
  }
  feature('crown-city-skyline');
  feature('emissive-windows');

  addBox(1.4, 0.7, 1.4, -4, 0.35, 2, matCrate, true);
  addBox(1.4, 0.7, 1.4, 5, 0.35, -3, matCrate, true);
  addBox(1.2, 1.1, 1.2, -6, 0.55, -6, matCrate, true);
  addBox(8, 0.35, 0.6, 0, 1.38, 0, matBeam, true);
  feature('crouch-beam');

  function lamp(x, z) {
    addBox(0.15, 4.2, 0.15, x, 2.1, z, matTrim, false);
    const bulb = new T.PointLight(0xf0c14a, 0.55, 14, 2);
    bulb.position.set(x, 4.1, z);
    scene.add(bulb);
    addBox(0.35, 0.2, 0.35, x, 4.15, z, new T.MeshStandardMaterial({ color: 0xf0c14a, emissive: 0xf0c14a, emissiveIntensity: 0.7 }), false);
  }
  lamp(8, 8); lamp(-8, 8); lamp(8, -8); lamp(-8, -8);
  feature('street-lights');

  const logoTex = new T.TextureLoader().load('assets/logo.png');
  const logo = new T.Mesh(
    new T.PlaneGeometry(3.2, 3.2),
    new T.MeshBasicMaterial({ map: logoTex, transparent: true, side: T.DoubleSide })
  );
  logo.position.set(0, 2.4, -4);
  scene.add(logo);
  const emblemTex = new T.TextureLoader().load('assets/emblem.png');
  const emblem = new T.Mesh(
    new T.PlaneGeometry(2.2, 2.2),
    new T.MeshBasicMaterial({ map: emblemTex, transparent: true, side: T.DoubleSide })
  );
  emblem.position.set(-6, 1.6, -4);
  scene.add(emblem);
  feature('logo-card');

  const zoneRing = new T.Mesh(
    new T.TorusGeometry(70, 0.18, 8, 80),
    new T.MeshBasicMaterial({ color: 0xff3355 })
  );
  zoneRing.rotation.x = Math.PI / 2;
  zoneRing.position.y = 0.4;
  zoneRing.visible = false;
  scene.add(zoneRing);
  feature('zone-ring');

  const WEAPONS = [
    { id: 'kestrel', name: 'KESTREL', damage: 22, minMult: 0.55, falloff: [16, 48], rpm: 640, mag: 30, reserve: 120, reload: 1.9, hip: 0.014, ads: 0.0022, pellets: 1, head: 1.7, color: 0x1a1a1a, recoil: [[0.012, 0.002], [0.014, -0.001], [0.016, 0.004], [0.012, 0.006], [0.01, -0.004], [0.013, 0.002]] },
    { id: 'wisp', name: 'WISP', damage: 16, minMult: 0.4, falloff: [10, 26], rpm: 920, mag: 36, reserve: 144, reload: 1.55, hip: 0.022, ads: 0.007, pellets: 1, head: 1.45, color: 0x243044, recoil: [[0.008, 0.004], [0.009, -0.005], [0.01, 0.006], [0.008, 0.003]] },
    { id: 'lance', name: 'LANCE', damage: 95, minMult: 0.8, falloff: [40, 110], rpm: 48, mag: 5, reserve: 20, reload: 2.55, hip: 0.05, ads: 0.0004, pellets: 1, head: 1.85, color: 0x3a2a1a, recoil: [[0.055, 0.008]] },
    { id: 'breacher', name: 'BREACHER', damage: 12, minMult: 0.35, falloff: [6, 16], rpm: 72, mag: 6, reserve: 24, reload: 2.35, hip: 0.07, ads: 0.038, pellets: 8, head: 1.25, color: 0x4a3028, recoil: [[0.042, 0.01]] },
    { id: 'spur', name: 'SPUR', damage: 28, minMult: 0.5, falloff: [12, 32], rpm: 420, mag: 12, reserve: 48, reload: 1.35, hip: 0.016, ads: 0.004, pellets: 1, head: 1.6, color: 0x2a2418, recoil: [[0.02, 0.004], [0.018, -0.003]] }
  ];
  WEAPONS.forEach((w) => { w.ammo = w.mag; w.left = w.reserve; w.shot = 0; feature('weapon-' + w.id); });
  feature('shotgun-pellets');

  const gun = new T.Group();
  const gunMat = new T.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.45, metalness: 0.55 });
  const body = new T.Mesh(new T.BoxGeometry(0.12, 0.14, 0.62), gunMat);
  const barrel = new T.Mesh(new T.BoxGeometry(0.05, 0.05, 0.38), gunMat);
  barrel.position.set(0, 0.05, -0.46);
  const mag = new T.Mesh(new T.BoxGeometry(0.07, 0.16, 0.1), gunMat);
  mag.position.set(0, -0.12, 0.05);
  const stock = new T.Mesh(new T.BoxGeometry(0.08, 0.1, 0.22), gunMat);
  stock.position.set(0, 0.02, 0.38);
  gun.add(body, barrel, mag, stock);
  gun.position.set(0.26, -0.22, -0.48);
  camera.add(gun);
  const muzzleLight = new T.PointLight(0xffcc88, 0, 7, 2);
  muzzleLight.position.set(0, 0.05, -0.7);
  gun.add(muzzleLight);
  feature('procedural-gun');
  feature('muzzle-light');
  feature('weapon-bob');

  const bots = [];
  const botMat = new T.MeshStandardMaterial({ color: 0x8a3040, roughness: 0.7 });
  const eliteMat = new T.MeshStandardMaterial({ color: 0xc9a227, emissive: 0x6a4a10, emissiveIntensity: 0.35, roughness: 0.45 });
  const headMat = new T.MeshStandardMaterial({ color: 0xd7c4a3, roughness: 0.6 });

  function spawnBot(x, z, kind) {
    const group = new T.Group();
    const torsoMat = kind === 'elite' ? eliteMat : botMat;
    const torso = new T.Mesh(new T.BoxGeometry(0.55, 0.85, 0.32), torsoMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    const head = new T.Mesh(new T.BoxGeometry(0.3, 0.3, 0.3), headMat);
    head.position.y = 1.85;
    head.castShadow = true;
    const legL = new T.Mesh(new T.BoxGeometry(0.16, 0.7, 0.16), torsoMat);
    const legR = legL.clone();
    legL.position.set(-0.14, 0.35, 0);
    legR.position.set(0.14, 0.35, 0);
    const arm = new T.Mesh(new T.BoxGeometry(0.38, 0.08, 0.08), torsoMat);
    arm.position.set(0.15, 1.25, -0.28);
    group.add(torso, head, legL, legR, arm);
    if (kind === 'crawler') group.scale.y = 0.72;
    group.position.set(x, 0, z);
    scene.add(group);
    torso.userData.part = 'body';
    head.userData.part = 'head';
    const bot = {
      group: group, torso: torso, head: head, legL: legL, legR: legR,
      x: x, z: z, yaw: 0, hp: kind === 'elite' ? 180 : kind === 'crawler' ? 70 : 100,
      kind: kind, alive: true, cool: 0.4 + rand(), meleeCd: 0, flank: rand() * Math.PI * 2
    };
    torso.userData.bot = bot;
    head.userData.bot = bot;
    targets.push(torso, head);
    bots.push(bot);
    if (kind === 'elite') feature('elite-bot');
    if (kind === 'crawler') feature('crawler-bot');
    return bot;
  }
  feature('spawn-ring');

  const pickups = [];
  function pickup(kind, x, z) {
    const color = kind === 'ammo' ? 0xf0c14a : 0x7eb6ff;
    const mesh = new T.Mesh(new T.BoxGeometry(0.45, 0.45, 0.45), new T.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 }));
    mesh.position.set(x, 0.5, z);
    scene.add(mesh);
    pickups.push({ kind: kind, mesh: mesh, x: x, z: z, wait: 0 });
  }
  pickup('ammo', 3, 6);
  pickup('ammo', -3, 7);
  pickup('armor', 2, -2);
  feature('ammo-pickup');
  feature('armor-pickup');

  const shields = [];
  const shieldMat = new T.MeshStandardMaterial({
    color: 0xc46bff, emissive: 0x7a3cff, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.38, roughness: 0.15, side: T.DoubleSide, depthWrite: false
  });

  const fx = [];
  function addFx(mesh, vel, life, grav) {
    scene.add(mesh);
    fx.push({ mesh: mesh, vel: vel, life: life, max: life, grav: grav });
  }
  feature('tracers');
  feature('impact-sparks');
  feature('decals');
  feature('debris');
  feature('shell-eject');

  const raycaster = new T.Raycaster();
  const camRight = new T.Vector3();
  const camUp = new T.Vector3();
  const aim = new T.Vector3();

  function applyCamera() {
    const eye = (state.crouch ? 1.05 : 1.62) - state.landDip;
    camera.rotation.y = state.yaw - state.recoilY;
    camera.rotation.x = state.pitch - state.recoilP + (state.shake > 0 ? Math.sin(state.time * 48) * 0.01 * state.shake : 0);
    camera.position.set(state.pos.x, state.pos.y + eye, state.pos.z);
    const fov = 72 - state.ads * 20 + (state.sprint ? 3 : 0);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld(true);
  }
  feature('camera-shake');
  feature('ads-fov');
  feature('sprint-fov');
  feature('landing-dip');

  function horizontalBasis() {
    applyCamera();
    const fwd = new T.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-8) fwd.set(0, 0, -1);
    fwd.normalize();
    const right = new T.Vector3().crossVectors(fwd, UP);
    if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
    right.normalize();
    return { fwd: fwd, right: right };
  }
  feature('camera-relative-move');

  function heightNow() { return state.crouch ? 1.05 : 1.7; }

  function tryMove(axis, delta) {
    const next = state.pos[axis] + delta;
    const x = axis === 'x' ? next : state.pos.x;
    const z = axis === 'z' ? next : state.pos.z;
    const h = heightNow();
    if (!blocked(x, state.pos.y, z, h)) {
      state.pos[axis] = next;
      return;
    }
    if (state.grounded && !blocked(x, state.pos.y + 0.46, z, h)) {
      state.pos[axis] = next;
      state.pos.y += 0.46;
    }
  }
  feature('step-up');

  function updatePlayer(dt) {
    if (!state.started) {
      state.time += dt;
      state.yaw = Math.sin(state.time * 0.18) * 0.4;
      state.pitch = -0.08;
      state.pos.set(0, 0, 13);
      applyCamera();
      logo.position.y = 2.4 + Math.sin(state.time * 1.5) * 0.08;
      return;
    }
    state.yaw -= mouse.dx * state.sens;
    state.pitch -= mouse.dy * state.sens * state.invert;
    state.pitch = clamp(state.pitch, -1.25, 1.25);
    mouse.dx = 0;
    mouse.dy = 0;
    feature('invert-pitch');

    const wantCrouch = !!(keys.KeyC);
    state.crouch = wantCrouch && state.sliding <= 0;
    feature('crouch');
    const wantSprint = !!(keys.ShiftLeft || keys.ShiftRight) && !state.crouch && state.ads < 0.3 && state.stamina > 8;
    state.sprint = wantSprint;
    if (state.sprint) state.stamina = Math.max(0, state.stamina - 20 * dt);
    else state.stamina = Math.min(100, state.stamina + 14 * dt);
    feature('sprint');
    feature('stamina');

    let speed = state.crouch ? 3.1 : 6.1;
    if (state.sprint) speed = 9.0;
    if (state.ads > 0.5) speed *= 0.62;
    feature('ads-move-slow');

    const basis = horizontalBasis();
    let ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    let iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const moving = ix !== 0 || iz !== 0;
    if (moving) {
      const len = Math.hypot(ix, iz) || 1;
      ix /= len; iz /= len;
    }
    if (keys.ControlLeft && state.grounded && state.sliding <= 0 && (state.sprint || moving)) {
      state.sliding = 0.48;
      state.slide.copy(basis.fwd).multiplyScalar(11);
      feature('slide');
    }
    if (state.sliding > 0) {
      state.sliding -= dt;
      tryMove('x', state.slide.x * dt);
      tryMove('z', state.slide.z * dt);
      state.slide.multiplyScalar(0.92);
      state.crouch = true;
    } else if (moving) {
      tryMove('x', (basis.fwd.x * iz + basis.right.x * ix) * speed * dt);
      tryMove('z', (basis.fwd.z * iz + basis.right.z * ix) * speed * dt);
    }

    if ((keys.Space) && state.grounded && state.sliding <= 0) {
      state.velY = 7.4;
      state.grounded = false;
      feature('jump');
    }
    state.velY -= 22 * dt;
    state.pos.y += state.velY * dt;
    feature('gravity');
    if (state.pos.y <= 0) {
      if (!state.grounded && state.velY < -8) state.landDip = 0.1;
      state.pos.y = 0;
      state.velY = 0;
      state.grounded = true;
      feature('ground-snap');
    } else state.grounded = false;

    state.ads = lerp(state.ads, mouse.r && state.started ? 1 : 0, 1 - Math.pow(0.001, dt));
    state.recoilP = lerp(state.recoilP, 0, 1 - Math.pow(0.02, dt));
    state.recoilY = lerp(state.recoilY, 0, 1 - Math.pow(0.04, dt));
    feature('recoil-recovery');
    state.shake = Math.max(0, state.shake - dt * 1.8);
    state.landDip = Math.max(0, state.landDip - dt * 0.5);
    if (state.hp > 0 && state.hp < 100 && state.time - state.lastHurt > 4.2) {
      state.hp = Math.min(100, state.hp + 18 * dt);
      feature('regen-delay');
    }
    feature('health-pool');

    const bob = moving && state.grounded ? 1 : 0;
    const baseX = lerp(0.26, 0.02, state.ads);
    const baseY = lerp(-0.22, -0.16, state.ads) - (state.crouch ? 0.04 : 0);
    const baseZ = lerp(-0.48, -0.36, state.ads);
    gun.position.set(
      baseX + Math.cos(state.time * 6) * 0.01 * bob * (1 - state.ads),
      baseY + Math.sin(state.time * 12) * 0.012 * bob * (1 - state.ads),
      baseZ
    );
    applyCamera();

    if (moving && state.grounded) {
      state.step -= dt;
      if (state.step <= 0) {
        state.step = state.sprint ? 0.32 : 0.46;
        sfx('step');
        feature('sfx-steps');
      }
    }
  }

  function currentWeapon() { return WEAPONS[state.weapon]; }

  function queueWeapon(index) {
    if (!state.started || state.reload > 0) return;
    state.weapon = index;
    state.switchAt = state.time + 0.22;
    const w = currentWeapon();
    gunMat.color.setHex(w.color);
    feature('weapon-switch');
    feature('viewmodel-swap');
    sfx('ui');
  }

  function beginReload() {
    const w = currentWeapon();
    if (!state.started || state.reload > 0 || w.ammo === w.mag || w.left <= 0) return;
    state.reload = w.reload;
    feature('reload');
    sfx('reload');
  }

  function falloffDamage(w, dist) {
    feature('damage-falloff');
    if (dist <= w.falloff[0]) return w.damage;
    if (dist >= w.falloff[1]) return w.damage * w.minMult;
    const t = (dist - w.falloff[0]) / (w.falloff[1] - w.falloff[0]);
    return w.damage * (1 - t * (1 - w.minMult));
  }

  function hurtPlayer(amount, fromX, fromZ) {
    if (!state.alive) return;
    let rest = amount;
    if (state.armor > 0) {
      const absorbed = Math.min(state.armor, amount * 0.7);
      state.armor -= absorbed;
      rest = amount - absorbed;
      feature('armor-plates');
    }
    state.hp -= rest;
    state.lastHurt = state.time;
    state.shake = Math.min(1.2, state.shake + 0.45);
    state.flash = 0.18;
    const basis = horizontalBasis();
    const dx = fromX - state.pos.x;
    const dz = fromZ - state.pos.z;
    state.hitAngle = Math.atan2(dx * basis.right.x + dz * basis.right.z, dx * basis.fwd.x + dz * basis.fwd.z);
    feature('hit-direction');
    if (state.hp <= 0) {
      state.hp = 0;
      state.alive = false;
      state.streak = 0;
      $('death').classList.remove('hidden');
      $('death-stats').textContent = 'Wave ' + state.wave + ' · score ' + state.score + ' · kills ' + state.kills;
      document.exitPointerLock();
      feature('death-state');
      sfx('down');
    }
  }

  function muzzleWorld() {
    const p = new T.Vector3(0, 0.05, -0.7);
    gun.localToWorld(p);
    return p;
  }

  function spark(point, color) {
    for (let i = 0; i < 5; i++) {
      const m = new T.Mesh(new T.BoxGeometry(0.06, 0.06, 0.06), new T.MeshBasicMaterial({ color: color }));
      m.position.copy(point);
      addFx(m, new T.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4), 0.35, true);
    }
  }

  function decal(point, normal) {
    const m = new T.Mesh(new T.PlaneGeometry(0.22, 0.22), new T.MeshBasicMaterial({ color: 0x14080c, transparent: true, opacity: 0.85, side: T.DoubleSide }));
    m.position.copy(point);
    const n = normal.clone();
    if (n.lengthSq() < 1e-6) n.set(0, 1, 0);
    n.normalize();
    m.position.addScaledVector(n, 0.03);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), n);
    addFx(m, new T.Vector3(), 6, false);
  }

  function tracer(from, to, color) {
    const dir = new T.Vector3().subVectors(to, from);
    const len = Math.max(0.2, dir.length());
    const m = new T.Mesh(new T.BoxGeometry(0.03, 0.03, len), new T.MeshBasicMaterial({ color: color }));
    m.position.copy(from).addScaledVector(dir, 0.5);
    m.lookAt(to);
    addFx(m, new T.Vector3(), 0.05, false);
  }

  function explode(point, radius, damage) {
    const light = new T.PointLight(0xff8844, 6, radius * 2, 2);
    light.position.copy(point);
    scene.add(light);
    setTimeout(() => scene.remove(light), 120);
    spark(point, 0xff8844);
    for (let i = 0; i < 8; i++) {
      const m = new T.Mesh(new T.BoxGeometry(0.12, 0.12, 0.12), new T.MeshStandardMaterial({ color: 0x5a4030 }));
      m.position.copy(point);
      addFx(m, new T.Vector3((Math.random() - 0.5) * 7, 2 + Math.random() * 4, (Math.random() - 0.5) * 7), 0.8, true);
    }
    bots.forEach((b) => {
      if (!b.alive) return;
      const d = Math.hypot(b.x - point.x, b.z - point.z);
      if (d < radius) damageBot(b, damage * (1 - d / radius), false);
    });
    const pd = Math.hypot(state.pos.x - point.x, state.pos.z - point.z);
    if (pd < radius && state.alive && state.started) hurtPlayer(damage * 0.45 * (1 - pd / radius), point.x, point.z);
    sfx('boom');
    feature('explosion-damage');
  }

  function damageBot(bot, amount, head) {
    if (!bot.alive) return;
    if (head) feature('headshot');
    const mult = head ? (bot.kind === 'elite' ? 1.4 : currentWeapon().head) : 1;
    bot.hp -= amount * mult;
    state.hitPulse = 0.08;
    state.headPulse = !!head;
    feature('hitmarker');
    if (bot.hp <= 0) {
      bot.alive = false;
      bot.hp = 0;
      state.kills += 1;
      state.streak += 1;
      state.score += 100 * state.wave;
      feature('score');
      feature('kill-confirm');
      feature('streak-meter');
      feature('bot-topple');
      pushFeed(bot.kind.toUpperCase() + ' down');
      sfx('kill');
      if (state.streak === 3) uav();
      if (state.streak === 6) airstrike();
      if (state.streak === 9) mortar();
      if (state.wave > state.best) {
        state.best = state.wave;
        saveProfile();
        feature('best-wave');
      }
    }
  }

  function shoot() {
    const w = currentWeapon();
    feature('hitscan');
    if (state.time < state.switchAt || state.reload > 0 || !state.alive) return;
    if (w.ammo <= 0) {
      sfx('dry');
      feature('dry-fire');
      beginReload();
      return;
    }
    if (state.time < state.nextFire) return;
    state.nextFire = state.time + 60 / w.rpm;
    w.ammo -= 1;
    feature('ammo-reserve');
    const kick = w.recoil[w.shot % w.recoil.length];
    w.shot += 1;
    state.recoilP += kick[0];
    state.recoilY += kick[1];
    feature('recoil-pattern');
    muzzleLight.intensity = 5;
    sfx(w.id === 'breacher' ? 'shotgun' : w.id === 'lance' ? 'sniper' : 'rifle');
    feature('sfx-gun');
    const shell = new T.Mesh(new T.BoxGeometry(0.04, 0.04, 0.08), new T.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.8, roughness: 0.3 }));
    const shellPos = muzzleWorld();
    shell.position.copy(shellPos);
    const right = camRight.clone();
    addFx(shell, right.multiplyScalar(2.2).setY(1.6), 1.1, true);

    applyCamera();
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    camUp.setFromMatrixColumn(camera.matrixWorld, 1);
    const spread = lerp(w.hip, w.ads, state.ads);
    feature(state.ads > 0.6 ? 'ads-spread' : 'hipfire-spread');
    const from = camera.position.clone();
    for (let p = 0; p < w.pellets; p++) {
      camera.getWorldDirection(aim);
      aim.addScaledVector(camRight, (Math.random() - 0.5) * 2 * spread);
      aim.addScaledVector(camUp, (Math.random() - 0.5) * 2 * spread);
      aim.normalize();
      raycaster.set(from, aim);
      raycaster.far = 200;
      const hits = raycaster.intersectObjects(targets.concat(blockers).concat(shields.map((s) => s.mesh)), false);
      const hit = hits[0];
      const to = hit ? hit.point : from.clone().addScaledVector(aim, 80);
      tracer(muzzleWorld(), to, 0xf0c14a);
      if (!hit) continue;
      if (hit.object.userData && hit.object.userData.bot) {
        const head = hit.object.userData.part === 'head';
        const dist = hit.distance;
        damageBot(hit.object.userData.bot, falloffDamage(w, dist), head);
        spark(hit.point, 0xff4455);
      } else {
        spark(hit.point, 0xffe0a0);
        if (hit.face) decal(hit.point, hit.face.normal.clone().transformDirection(hit.object.matrixWorld));
      }
    }
  }

  function melee() {
    if (!state.started || state.meleeCd > 0 || !state.alive) return;
    state.meleeCd = 0.55;
    feature('melee');
    const basis = horizontalBasis();
    raycaster.set(camera.position, basis.fwd);
    raycaster.far = 2.3;
    const hits = raycaster.intersectObjects(targets, false);
    sfx('melee');
    if (hits[0] && hits[0].object.userData.bot) damageBot(hits[0].object.userData.bot, 55, false);
  }

  const grenades = [];
  function throwGrenade() {
    if (!state.started || state.grenadeCd > 0 || !state.alive) return;
    state.grenadeCd = 1.15;
    feature('grenade-arc');
    feature('grenade-fuse');
    const basis = horizontalBasis();
    const mesh = new T.Mesh(new T.SphereGeometry(0.12, 10, 8), new T.MeshStandardMaterial({ color: 0x355c38, roughness: 0.5 }));
    mesh.position.copy(camera.position);
    scene.add(mesh);
    const vel = basis.fwd.clone().multiplyScalar(16);
    vel.y = 7;
    grenades.push({ mesh: mesh, vel: vel, fuse: 1.55 });
    sfx('ui');
  }

  function deployShield() {
    if (!state.started || state.shieldCd > 0 || !state.alive) return;
    state.shieldCd = 10;
    feature('shield-deploy');
    feature('shield-blocks');
    const basis = horizontalBasis();
    const mesh = new T.Mesh(new T.BoxGeometry(2.6, 1.8, 0.18), shieldMat);
    const px = state.pos.x + basis.fwd.x * 1.8;
    const pz = state.pos.z + basis.fwd.z * 1.8;
    mesh.position.set(px, 0.9, pz);
    mesh.lookAt(px + basis.fwd.x, 0.9, pz + basis.fwd.z);
    scene.add(mesh);
    const solid = {
      min: new T.Vector3(px - 1.3, 0, pz - 1.3),
      max: new T.Vector3(px + 1.3, 1.8, pz + 1.3),
      mesh: mesh
    };
    solids.push(solid);
    shields.push({ mesh: mesh, solid: solid, life: 8 });
    sfx('shield');
  }

  function updateCombat(dt) {
    state.meleeCd = Math.max(0, state.meleeCd - dt);
    state.grenadeCd = Math.max(0, state.grenadeCd - dt);
    state.shieldCd = Math.max(0, state.shieldCd - dt);
    muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 28);
    const w = currentWeapon();
    if (state.reload > 0) {
      state.reload -= dt;
      if (state.reload <= 0) {
        const need = w.mag - w.ammo;
        const take = Math.min(need, w.left);
        w.ammo += take;
        w.left -= take;
        feature('reload-bar');
      }
    } else if (mouse.l) shoot();

    for (let i = grenades.length - 1; i >= 0; i--) {
      const g = grenades[i];
      g.fuse -= dt;
      g.vel.y -= 12 * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      if (g.mesh.position.y < 0.12) {
        g.mesh.position.y = 0.12;
        g.vel.y *= -0.35;
        g.vel.x *= 0.7;
        g.vel.z *= 0.7;
      }
      if (g.fuse <= 0) {
        explode(g.mesh.position.clone(), 6.5, 90);
        scene.remove(g.mesh);
        grenades.splice(i, 1);
      }
    }
    for (let i = shields.length - 1; i >= 0; i--) {
      shields[i].life -= dt;
      if (shields[i].life <= 0) {
        scene.remove(shields[i].mesh);
        const idx = solids.indexOf(shields[i].solid);
        if (idx >= 0) solids.splice(idx, 1);
        shields.splice(i, 1);
      }
    }
  }

  function botEye(bot) {
    return new T.Vector3(bot.x, bot.kind === 'crawler' ? 1.0 : 1.55, bot.z);
  }

  function seesPlayer(bot) {
    const from = botEye(bot);
    const to = camera.position.clone();
    const dir = to.clone().sub(from);
    const dist = dir.length();
    dir.multiplyScalar(1 / dist);
    raycaster.set(from, dir);
    raycaster.far = dist;
    const hits = raycaster.intersectObjects(blockers.concat(shields.map((s) => s.mesh)), false);
    feature('bot-los');
    return hits.length === 0 || hits[0].distance > dist - 0.6;
  }

  function moveBot(bot, dx, dz, dt, speed) {
    const nx = bot.x + dx * speed * dt;
    const nz = bot.z + dz * speed * dt;
    if (!blocked(nx, 0, bot.z, 1.6)) bot.x = nx;
    if (!blocked(bot.x, 0, nz, 1.6)) bot.z = nz;
    for (let i = 0; i < bots.length; i++) {
      const o = bots[i];
      if (o === bot || !o.alive) continue;
      const sx = bot.x - o.x;
      const sz = bot.z - o.z;
      const d2 = sx * sx + sz * sz;
      if (d2 > 0.0001 && d2 < 0.81) {
        const d = Math.sqrt(d2);
        bot.x += (sx / d) * 0.02;
        bot.z += (sz / d) * 0.02;
        feature('bot-separation');
      }
    }
  }

  function updateBots(dt) {
    let living = 0;
    bots.forEach((bot) => {
      if (!bot.alive) {
        bot.group.rotation.x = lerp(bot.group.rotation.x, 1.25, 0.05);
        bot.group.position.y = lerp(bot.group.position.y, 0.2, 0.05);
        return;
      }
      living += 1;
      const dx = state.pos.x - bot.x;
      const dz = state.pos.z - bot.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      const sideX = -dz / dist;
      const sideZ = dx / dist;
      const flank = Math.sin(state.time * 0.8 + bot.flank);
      feature('bot-flank');
      let mx = dx / dist + sideX * flank * 0.65;
      let mz = dz / dist + sideZ * flank * 0.65;
      const ml = Math.hypot(mx, mz) || 1;
      mx /= ml; mz /= ml;
      const see = seesPlayer(bot);
      const speed = (bot.kind === 'crawler' ? 4.6 : bot.kind === 'elite' ? 3.6 : 3.1) * (1 + state.wave * 0.03);
      if (!see || dist > 22) {
        moveBot(bot, mx, mz, dt, speed);
        feature('bot-chase');
      } else if (dist > 8) moveBot(bot, mx, mz, dt, speed * 0.55);
      bot.yaw = Math.atan2(-mx, -mz);
      bot.group.position.set(bot.x, 0, bot.z);
      bot.group.rotation.y = bot.yaw;
      const swing = Math.sin(state.time * 8 + bot.flank) * (dist > 8 ? 0.5 : 0.1);
      bot.legL.rotation.x = swing;
      bot.legR.rotation.x = -swing;
      bot.cool -= dt;
      bot.meleeCd -= dt;
      if (state.alive && see && dist < 2.1 && bot.meleeCd <= 0) {
        bot.meleeCd = 0.85;
        hurtPlayer(bot.kind === 'elite' ? 18 : 12, bot.x, bot.z);
        feature('bot-melee');
      } else if (state.alive && see && bot.cool <= 0 && ((bot.kind !== 'crawler' && dist < 34) || (bot.kind === 'crawler' && dist > 2.4 && dist < 34))) {
        bot.cool = bot.kind === 'elite' ? 0.55 : 0.95;
        feature('bot-fire');
        const origin = botEye(bot);
        const dir = camera.position.clone().sub(origin).normalize();
        dir.x += (Math.random() - 0.5) * 0.04;
        dir.z += (Math.random() - 0.5) * 0.04;
        dir.normalize();
        raycaster.set(origin, dir);
        raycaster.far = 60;
        const hits = raycaster.intersectObjects(blockers.concat(shields.map((s) => s.mesh)), false);
        const reach = hits.length ? hits[0].distance : 40;
        const end = origin.clone().addScaledVector(dir, Math.min(40, reach));
        tracer(origin, end, 0xff3355);
        const aimDot = dir.dot(camera.position.clone().sub(origin).normalize());
        if (aimDot > 0.992 && (!hits.length || hits[0].distance > origin.distanceTo(camera.position) - 0.8)) {
          hurtPlayer(bot.kind === 'elite' ? 12 : 8, bot.x, bot.z);
        }
      }
      if (state.uav > 0) bot.torso.material.emissive && bot.torso.material.emissive.setHex(0x44ffaa);
    });
    if (state.started && state.alive && living === 0 && state.between <= 0 && state.waveStarted) {
      state.between = 4.5;
      pushFeed('Wave clear');
      feature('intermission');
    }
    if (state.between > 0) {
      state.between -= dt;
      if (state.between <= 0) {
        state.wave += 1;
        startWave();
      }
    }
  }

  function startWave() {
    state.waveStarted = true;
    const n = Math.min(14, 3 + state.wave * 2);
    feature('wave-scale');
    for (let i = 0; i < n; i++) {
      let placed = false;
      for (let k = 0; k < 10 && !placed; k++) {
        const ang = (i / n) * Math.PI * 2 + k * 0.7;
        const rad = 14 + k * 2.2;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad;
        if (!blocked(x, 0, z, 1.7)) {
          const kind = i === 0 && state.wave % 3 === 0 ? 'elite' : (i % 4 === 0 ? 'crawler' : 'soldier');
          const bot = spawnBot(x, z, kind);
          bot.hp = (kind === 'elite' ? 160 : 80) + state.wave * 10;
          placed = true;
        }
      }
    }
    if (state.wave >= 3) {
      state.zoneOn = true;
      state.zoneR = 78;
      zoneRing.visible = true;
    }
    $('objective').textContent = 'Clear wave ' + state.wave;
    feature('objective-line');
  }

  function updateZone(dt) {
    if (!state.zoneOn) return;
    state.zoneR = Math.max(18, state.zoneR - dt * 0.85);
    zoneRing.scale.setScalar(state.zoneR / 70);
    feature('shrink-zone');
    const d = Math.hypot(state.pos.x, state.pos.z);
    if (d > state.zoneR && state.alive) {
      hurtPlayer(8 * dt, 0, 0);
      feature('zone-damage');
    }
  }

  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.life -= dt;
      if (f.grav) f.vel.y -= 14 * dt;
      f.mesh.position.addScaledVector(f.vel, dt);
      if (f.mesh.position.y < 0.05 && f.grav) f.mesh.position.y = 0.05;
      if (f.life <= 0) {
        scene.remove(f.mesh);
        fx.splice(i, 1);
      }
    }
  }

  function updatePickups(dt) {
    pickups.forEach((p) => {
      if (p.wait > 0) {
        p.wait -= dt;
        p.mesh.visible = false;
        if (p.wait <= 0) p.mesh.visible = true;
        return;
      }
      p.mesh.rotation.y += dt;
      p.mesh.position.y = 0.5 + Math.sin(state.time * 3) * 0.06;
      if (Math.hypot(state.pos.x - p.x, state.pos.z - p.z) < 1.2) {
        if (p.kind === 'ammo') {
          WEAPONS.forEach((w) => { w.left = Math.min(w.reserve, w.left + Math.ceil(w.mag * 0.5)); });
          pushFeed('Ammo');
        } else {
          state.armor = Math.min(100, state.armor + 35);
          pushFeed('Armor');
        }
        p.wait = 18;
        sfx('ui');
      }
    });
  }

  function uav() {
    state.uav = 8;
    pushFeed('UAV online');
    sfx('ui');
    feature('streak-uav');
  }
  function airstrike() {
    feature('streak-airstrike');
    let best = null;
    let bestD = 1e9;
    bots.forEach((b) => {
      if (!b.alive) return;
      const d = Math.hypot(b.x - state.pos.x, b.z - state.pos.z);
      if (d < bestD) { bestD = d; best = b; }
    });
    if (!best) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => explode(new T.Vector3(best.x + (Math.random() - 0.5) * 6, 0.5, best.z + (Math.random() - 0.5) * 6), 5, 70), i * 180);
    }
    pushFeed('Airstrike');
  }
  function mortar() {
    feature('streak-mortar');
    for (let i = 0; i < 5; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 6 + Math.random() * 10;
      setTimeout(() => explode(new T.Vector3(state.pos.x + Math.cos(ang) * rad, 0.4, state.pos.z + Math.sin(ang) * rad), 4.5, 60), 200 + i * 220);
    }
    pushFeed('Mortar');
  }

  const feed = [];
  function pushFeed(text) {
    feed.unshift({ text: text, t: 4 });
    feature('killfeed');
  }

  const A = { ctx: null, master: null, noise: null, amb: false };
  function audio() {
    if (A.ctx) return A.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    A.ctx = new Ctx();
    A.master = A.ctx.createGain();
    A.master.gain.value = state.volume;
    A.master.connect(A.ctx.destination);
    const len = Math.floor(A.ctx.sampleRate * 0.5);
    const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) {
      v = v * 0.97 + (Math.random() * 2 - 1) * 0.03;
      data[i] = v * 4;
    }
    A.noise = buf;
    return A.ctx;
  }
  function blip(opts) {
    const ctx = audio();
    if (!ctx || state.volume <= 0) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(A.master);
    g.gain.setValueAtTime(Math.max(0.001, opts.vol || 0.2), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (opts.dur || 0.18));
    if (opts.noise) {
      const src = ctx.createBufferSource();
      src.buffer = A.noise;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.cut || 1400;
      src.connect(f); f.connect(g);
      src.start(t); src.stop(t + (opts.dur || 0.18));
    }
    if (opts.freq) {
      const o = ctx.createOscillator();
      o.type = opts.wave || 'square';
      o.frequency.setValueAtTime(opts.freq, t);
      if (opts.freq2) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freq2), t + (opts.dur || 0.18));
      o.connect(g); o.start(t); o.stop(t + (opts.dur || 0.18));
    }
  }
  function sfx(name) {
    if (name === 'rifle') blip({ noise: true, freq: 140, freq2: 50, dur: 0.12, vol: 0.35, cut: 1800 });
    else if (name === 'shotgun') blip({ noise: true, freq: 90, freq2: 40, dur: 0.22, vol: 0.45, cut: 900 });
    else if (name === 'sniper') blip({ noise: true, freq: 220, freq2: 60, dur: 0.28, vol: 0.4, cut: 2200 });
    else if (name === 'dry') blip({ freq: 1800, freq2: 400, dur: 0.05, vol: 0.15, wave: 'square' });
    else if (name === 'reload') blip({ freq: 420, freq2: 180, dur: 0.12, vol: 0.12, wave: 'triangle' });
    else if (name === 'step') blip({ noise: true, dur: 0.05, vol: 0.08, cut: 400 });
    else if (name === 'ui') { blip({ freq: 660, freq2: 880, dur: 0.08, vol: 0.1, wave: 'sine' }); feature('sfx-ui'); }
    else if (name === 'boom') blip({ noise: true, freq: 70, freq2: 30, dur: 0.4, vol: 0.5, cut: 500 });
    else if (name === 'kill') blip({ freq: 880, freq2: 1320, dur: 0.1, vol: 0.12, wave: 'square' });
    else if (name === 'melee') blip({ noise: true, dur: 0.08, vol: 0.2, cut: 700 });
    else if (name === 'shield') blip({ freq: 240, freq2: 720, dur: 0.25, vol: 0.15, wave: 'sawtooth' });
    else if (name === 'down') blip({ freq: 180, freq2: 40, dur: 0.5, vol: 0.25, wave: 'sawtooth' });
    else if (name === 'sting') {
      [523, 659, 784, 1046].forEach((freq, i) => {
        setTimeout(() => blip({ freq: freq, dur: 0.22, vol: 0.12, wave: 'triangle' }), i * 140);
      });
      feature('intro-sting');
    }
  }
  function startAmbient() {
    const ctx = audio();
    if (!ctx || A.amb) return;
    const g = ctx.createGain();
    g.gain.value = 0.025 * state.volume;
    g.connect(A.master);
    [55, 82.4].forEach((freq) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      o.connect(g);
      o.start();
    });
    A.amb = true;
    feature('ambient-drone');
  }

  function saveProfile() {
    localStorage.setItem('quora-profile', JSON.stringify({
      sens: state.sens, volume: state.volume, invert: state.invert < 0, best: state.best, qualityHigh: state.qualityHigh
    }));
  }

  function toggleQuality() {
    state.qualityHigh = !state.qualityHigh;
    renderer.shadowMap.enabled = state.qualityHigh;
    renderer.setPixelRatio(state.qualityHigh ? Math.min(window.devicePixelRatio || 1, 1.5) : 1);
    $('quality').textContent = 'QUALITY: ' + (state.qualityHigh ? 'HIGH' : 'LOW');
    saveProfile();
    feature('quality-toggle');
  }

  function togglePause() {
    state.paused = !state.paused;
    $('pause').classList.toggle('hidden', !state.paused);
    if (state.paused) document.exitPointerLock();
    else if (state.alive) canvas.requestPointerLock();
    feature('pause');
  }

  let ws = null;
  function connectNet() {
    try {
      ws = new WebSocket('ws://127.0.0.1:8080');
      ws.onopen = () => { state.net = 'LINK'; feature('websocket-client'); };
      ws.onclose = () => { state.net = 'SOLO'; };
      ws.onerror = () => { state.net = 'SOLO'; };
      feature('net-hud');
    } catch (e) { state.net = 'SOLO'; }
  }
  setInterval(() => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'MOVE', x: state.pos.x, y: state.pos.y, z: state.pos.z, ry: state.yaw }));
    }
  }, 100);

  function compassLabel() {
    const deg = ((-state.yaw * 180 / Math.PI) % 360 + 360) % 360;
    const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return names[Math.round(deg / 45) % 8];
  }
  feature('compass');

  function updateHud() {
    const w = currentWeapon();
    $('hp').textContent = String(Math.ceil(state.hp));
    $('armor').textContent = String(Math.ceil(state.armor));
    $('health-fill').style.width = clamp(state.hp, 0, 100) + '%';
    $('armor-fill').style.width = clamp(state.armor, 0, 100) + '%';
    $('ammo').textContent = w.ammo + ' / ' + w.left;
    $('weapon-name').textContent = w.name;
    $('wave').textContent = 'WAVE ' + state.wave;
    $('score').textContent = String(state.score);
    $('streak').textContent = 'STREAK ' + state.streak + (state.uav > 0 ? ' · UAV' : '');
    $('compass').textContent = compassLabel();
    $('net').textContent = state.net;
    $('zone').textContent = state.zoneOn ? ('ZONE ' + Math.round(state.zoneR) + 'm') : 'ZONE OPEN';
    $('low-health').style.opacity = state.hp < 35 && state.alive ? String(0.35 + 0.25 * Math.sin(state.time * 8)) : '0';
    feature('low-health-vignette');
    state.flash = Math.max(0, state.flash - 0.016);
    $('damage-flash').style.opacity = String(state.flash);
    feature('damage-flash');
    const spreadPx = 8 + lerp(currentWeapon().hip, currentWeapon().ads, state.ads) * 400;
    $('crosshair').style.transform = 'translate(-50%, -50%) scale(' + (spreadPx / 10) + ')';
    feature('dynamic-crosshair');
    $('hitmarker').classList.toggle('show', state.hitPulse > 0);
    $('hitmarker').classList.toggle('head', state.headPulse);
    state.hitPulse = Math.max(0, state.hitPulse - 0.016);
    $('hit-dir').style.opacity = state.flash > 0 ? '0.9' : '0';
    $('hit-dir').style.transform = 'rotate(' + (state.hitAngle * 180 / Math.PI) + 'rad)';
    $('reload-fill').style.width = state.reload > 0 ? ((1 - state.reload / currentWeapon().reload) * 100) + '%' : '0%';
    state.uav = Math.max(0, state.uav - 0.016);
    feed.forEach((f) => { f.t -= 0.016; });
    while (feed.length && feed[feed.length - 1].t <= 0) feed.pop();
    $('killfeed').innerHTML = feed.slice(0, 4).map((f) => '<div>' + f.text + '</div>').join('');
    if (state.best) $('best').textContent = 'Best wave ' + state.best;
  }

  function renderFrame() {
    const db = new T.Vector2();
    renderer.getDrawingBufferSize(db);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, db.x, db.y);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    const w = Math.floor(db.x * 0.22);
    const h = Math.floor(db.y * 0.22);
    mini.position.set(state.pos.x, 60, state.pos.z);
    mini.lookAt(state.pos.x, 0, state.pos.z);
    renderer.clearDepth();
    renderer.setScissorTest(true);
    renderer.setViewport(db.x - w - 12, db.y - h - 12, w, h);
    renderer.setScissor(db.x - w - 12, db.y - h - 12, w, h);
    renderer.render(scene, mini);
    renderer.setScissorTest(false);
  }

  function bootInput() {
    $('sens').value = String(state.sens);
    $('volume').value = String(state.volume);
    $('invert').checked = state.invert < 0;
    $('quality').textContent = 'QUALITY: ' + (state.qualityHigh ? 'HIGH' : 'LOW');
    if (!state.qualityHigh) {
      renderer.shadowMap.enabled = false;
      renderer.setPixelRatio(1);
    }
    $('sens').oninput = () => { state.sens = Number($('sens').value); saveProfile(); feature('sensitivity'); };
    $('volume').oninput = () => {
      state.volume = Number($('volume').value);
      if (A.master) A.master.gain.value = state.volume;
      saveProfile();
      feature('volume');
    };
    $('invert').onchange = () => { state.invert = $('invert').checked ? -1 : 1; saveProfile(); };
    $('deploy').onclick = () => startMatch(false);
    $('resume').onclick = () => { if (state.paused) togglePause(); };
    $('restart').onclick = () => startMatch(true);
    $('redeploy').onclick = () => {
      $('death').classList.add('hidden');
      state.alive = true;
      state.hp = 100;
      state.armor = 25;
      state.pos.set(0, 0, 12);
      state.velY = 0;
      feature('redeploy');
      canvas.requestPointerLock();
    };
    $('quality').onclick = () => toggleQuality();
    feature('sensitivity');
    feature('volume');
  }

  function startMatch(reset) {
    audio();
    startAmbient();
    sfx('sting');
    if (reset || !state.waveStarted) {
      bots.splice(0, bots.length).forEach((b) => scene.remove(b.group));
      targets.length = 0;
      state.wave = 1;
      state.kills = 0;
      state.score = 0;
      state.streak = 0;
      state.hp = 100;
      state.armor = 25;
      state.pos.set(0, 0, 12);
      state.zoneOn = false;
      state.zoneR = 999;
      zoneRing.visible = false;
      WEAPONS.forEach((w) => { w.ammo = w.mag; w.left = w.reserve; });
      startWave();
    }
    state.started = true;
    state.alive = true;
    state.paused = false;
    $('menu').classList.add('hidden');
    $('pause').classList.add('hidden');
    $('death').classList.add('hidden');
    canvas.requestPointerLock();
  }

  bootInput();
  connectNet();
  if (state.best) $('best').textContent = 'Best wave ' + state.best;

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.time += dt;
    if (state.started && !state.paused) {
      updatePlayer(dt);
      if (state.alive) {
        updateCombat(dt);
        updateBots(dt);
        updateZone(dt);
        updatePickups(dt);
      } else updatePlayer(0);
      updateFx(dt);
    } else if (!state.started) updatePlayer(dt);
    updateHud();
    renderFrame();
    requestAnimationFrame(frame);
  }

  function readCenter() {
    const gl = renderer.getContext();
    const pix = new Uint8Array(4);
    const db = new T.Vector2();
    renderer.getDrawingBufferSize(db);
    gl.readPixels(Math.floor(db.x / 2), Math.floor(db.y / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pix);
    return [pix[0], pix[1], pix[2], pix[3]];
  }

  if (SELFTEST) {
    state.started = true;
    state.alive = true;
    $('menu').classList.add('hidden');
    keys.KeyW = true;
    const z0 = state.pos.z;
    for (let i = 0; i < 40; i++) updatePlayer(0.016);
    const z1 = state.pos.z;
    keys.KeyW = false;
    const x0 = state.pos.x;
    keys.KeyD = true;
    for (let i = 0; i < 40; i++) updatePlayer(0.016);
    const x1 = state.pos.x;
    keys.KeyD = false;
    state.pos.set(0, 0, 0);
    state.yaw = 0;
    state.pitch = 0;
    state.ads = 1;
    state.recoilP = 0;
    state.recoilY = 0;
    applyCamera();
    const bot = spawnBot(0, -2.3, 'soldier');
    scene.updateMatrixWorld(true);
    const hp0 = bot.hp;
    state.nextFire = 0;
    state.switchAt = 0;
    mouse.l = true;
    updateCombat(0.016);
    mouse.l = false;
    applyCamera();
    renderFrame();
    const pix = readCenter();
    const tris = renderer.info.render.triangles;
    const movedForward = z1 < z0 - 0.35;
    const movedRight = x1 > x0 + 0.35;
    const shot = bot.hp < hp0;
    const colored = pix[0] + pix[1] + pix[2] > 0;
    const dense = tris > 500;
    window.QUORA_TEST = {
      ok: movedForward && movedRight && shot && colored && dense,
      movedForward: movedForward,
      movedRight: movedRight,
      shot: shot,
      hp0: hp0,
      hp1: bot.hp,
      z0: z0, z1: z1, x0: x0, x1: x1,
      pixel: pix,
      triangles: tris,
      features: features.length,
      featureNames: features
    };
    console.log('QUORA_TEST', JSON.stringify(window.QUORA_TEST));
  }

  applyCamera();
  renderFrame();
  requestAnimationFrame(frame);
  window.QUORA = { features: features, state: state };
})();
