// Quora — Cinematic Multiplayer FPS
// Integrated from: Steel Haven core + Quora architecture (CGI/GFX, procedural, VFX, multiplayer)
// Game name: Quora

// ============================================================
// CORE ENGINE SETUP (from quora_core.js)
// ============================================================
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

class QuoraEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 2000);
        this.clock = new THREE.Clock();
        this.entities = [];
        this.updatables = [];
        this.systems = {};

        this.initCGIPipeline();
        this.initAtmosphere();
        this.initProceduralTerrain();
        window.addEventListener('resize', () => this.handleResize());
    }

    initCGIPipeline() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.3;
    }

    initAtmosphere() {
        this.scene.background = new THREE.Color(0x1a8cff);
        this.scene.fog = new THREE.FogExp2(0x1a8cff, 0.004);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
        sunLight.position.set(300, 500, 200);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 4096;
        sunLight.shadow.mapSize.height = 4096;
        const d = 500;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        this.scene.add(sunLight);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    }

    initProceduralTerrain() {
        const mapSize = 1200;
        const segments = 128;
        const geometry = new THREE.PlaneGeometry(mapSize, mapSize, segments, segments);
        geometry.rotateX(-Math.PI / 2);

        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);

            let height = Math.sin(x * 0.008) * Math.cos(z * 0.008) * 18;
            height += Math.sin(x * 0.04) * Math.sin(z * 0.04) * 5;

            const centerOffset = Math.sqrt(x*x + z*z);
            if (centerOffset < 200) {
                height *= (centerOffset / 200);
            }

            positions.setY(i, height);
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x38b000,
            roughness: 0.85,
            metalness: 0.02
        });

        const terrainMesh = new THREE.Mesh(geometry, material);
        terrainMesh.receiveShadow = true;
        this.scene.add(terrainMesh);

        // Spawn procedural monoliths
        for (let i = 0; i < 45; i++) {
            let mx = (Math.random() - 0.5) * 800;
            let mz = (Math.random() - 0.5) * 800;
            if (Math.abs(mx) > 120 || Math.abs(mz) > 120) {
                this.spawnProceduralMonolith(mx, mz);
            }
        }

        this.entities.push(terrainMesh);
    }

    spawnProceduralMonolith(x, z) {
        const geometry = new THREE.CylinderGeometry(0, 5, 30, 4);
        const material = new THREE.MeshStandardMaterial({
            color: 0x48cae4,
            roughness: 0.2,
            metalness: 0.7
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 15, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.entities.push(mesh);
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        this.renderer.setAnimationLoop(() => {
            const deltaTime = Math.min(this.clock.getDelta(), 0.1);
            this.updatables.forEach(system => system.update(deltaTime));
            this.renderer.render(this.scene, this.camera);
        });
    }
}

// ============================================================
// VFX PIPELINE (from quora_vfx.js)
// ============================================================
class VisualEffectsPipeline {
    constructor(scene) {
        this.scene = scene;
        this.activeParticles = [];
        this.shaderUniforms = { uTime: { value: 0 } };
    }

    deployCGIShield(position, rotationY) {
        const geometry = new THREE.BoxGeometry(11, 75, 0.3);
        const material = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                varying vec2 vUv;
                varying vec3 vNormal;
                void main() {
                    float scanline = sin(vUv.y * 40.0 + uTime * 6.0) * 0.5 + 0.5;
                    vec3 edgeColor = vec3(0.0, 0.96, 1.0);
                    float intensity = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
                    vec3 finalGlow = edgeColor * (intensity + scanline * 0.3);
                    gl_FragColor = vec4(finalGlow, 0.75);
                }
            `,
            uniforms: this.shaderUniforms,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const shield = new THREE.Mesh(geometry, material);
        shield.position.copy(position);
        shield.rotation.y = rotationY;
        this.scene.add(shield);
        return shield;
    }

    createImpactExplosion(hitPoint) {
        const particleCount = 20;
        const geometry = new THREE.SphereGeometry(0.08, 4, 4);
        const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(hitPoint);

            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 9,
                    Math.random() * 11,
                    (Math.random() - 0.5) * 9
                ),
                life: 0.35
            };

            this.scene.add(particle);
            this.activeParticles.push(particle);
        }
    }

    update(deltaTime) {
        this.shaderUniforms.uTime.value += deltaTime;

        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            p.position.addScaledVector(p.userData.velocity, deltaTime);
            p.userData.velocity.y -= 9.8 * deltaTime;
            p.userData.life -= deltaTime;

            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.activeParticles.splice(i, 1);
            }
        }
    }
}

// ============================================================
// PROCEDURAL GUN & PLAYER CONTROLLER (from quora_gun.js + quora_player.js)
// ============================================================
class ProceduralGun {
    constructor(camera) {
        this.camera = camera;
        this.gunGroup = new THREE.Group();

        this.hipfireOffset = new THREE.Vector3(0.3, -0.35, -0.6);
        this.adsOffset = new THREE.Vector3(0, -0.22, -0.45);
        this.currentOffset = new THREE.Vector3().copy(this.hipfireOffset);

        this.isAiming = false;
        this.bobTime = 0;

        this.assembleWeaponModel();
        this.camera.add(this.gunGroup);
    }

    assembleWeaponModel() {
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.8 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.5 });

        // Main Weapon Receiver
        const bodyGeo = new THREE.BoxGeometry(0.06, 0.08, 0.4);
        const bodyMesh = new THREE.Mesh(bodyGeo, metalMat);
        bodyMesh.castShadow = true;
        this.gunGroup.add(bodyMesh);

        // Weapon Barrel Extended Cylinder
        const barrelGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6);
        barrelGeo.rotateX(Math.PI / 2);
        const barrelMesh = new THREE.Mesh(barrelGeo, metalMat);
        barrelMesh.position.set(0, 0.01, -0.3);
        this.gunGroup.add(barrelMesh);

        // Ammo Magazine Clip
        const magGeo = new THREE.BoxGeometry(0.04, 0.15, 0.06);
        magGeo.rotateX(Math.PI / 12);
        const magMesh = new THREE.Mesh(magGeo, metalMat);
        magMesh.position.set(0, -0.1, -0.08);
        this.gunGroup.add(magMesh);

        // Holographic Optical Sight
        const sightGeo = new THREE.BoxGeometry(0.03, 0.03, 0.08);
        const sightMesh = new THREE.Mesh(sightGeo, accentMat);
        sightMesh.position.set(0, 0.055, -0.05);
        this.gunGroup.add(sightMesh);

        this.gunGroup.position.copy(this.currentOffset);
    }

    update(deltaTime, isMoving) {
        this.isAiming = document.body.requestPointerLock || false;
        // Simplified aiming check - in full implementation would use right-click
        this.currentOffset.lerp(this.isAiming ? this.adsOffset : this.hipfireOffset, deltaTime * 14.0);
        this.gunGroup.position.copy(this.currentOffset);

        if (isMoving && !this.isAiming) {
            this.bobTime += deltaTime * 12.0;
            this.gunGroup.position.x += Math.sin(this.bobTime) * 0.003;
            this.gunGroup.position.y += Math.cos(this.bobTime * 2.0) * 0.003;
        }
    }
}

class PlayerController {
    constructor(engine, vfxPipeline) {
        this.engine = engine;
        this.vfx = vfxPipeline;
        this.camera = engine.camera;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.keys = { w: false, a: false, s: false, d: false, shift: false, c: false, q: false };

        this.playerPhysicsNode = new THREE.Object3D();
        this.playerPhysicsNode.position.set(0, 2, 0);
        this.engine.scene.add(this.playerPhysicsNode);

        this.camShakeIntensity = 0;

        this.initInputs();
        this.gun = new ProceduralGun(this.camera);
    }

    initInputs() {
        window.addEventListener('keydown', (e) => { 
            if (e.key.toLowerCase() in this.keys) this.keys[e.key.toLowerCase()] = true; 
        });
        window.addEventListener('keyup', (e) => { 
            if (e.key.toLowerCase() in this.keys) this.keys[e.key.toLowerCase()] = false; 
        });

        window.addEventListener('click', () => { document.body.requestPointerLock(); });
        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body) {
                this.playerPhysicsNode.rotation.y -= e.movementX * 0.002;
                this.camera.rotation.x -= e.movementY * 0.002;
                this.camera.rotation.x = Math.max(-Math.PI/2.5, Math.min(Math.PI/2.5, this.camera.rotation.x));
            }
        });
    }

    triggerCameraShake(amount) {
        this.camShakeIntensity = amount;
    }

    update(deltaTime) {
        this.velocity.x -= this.velocity.x * 8.0 * deltaTime;
        this.velocity.z -= this.velocity.z * 8.0 * deltaTime;

        this.direction.z = Number(this.keys.w) - Number(this.keys.s);
        this.direction.x = Number(this.keys.a) - Number(this.keys.d);
        this.direction.normalize();

        // Drop shield instantly (Q hotkey)
        if (this.keys.q) {
            this.keys.q = false;
            const shieldPos = new THREE.Vector3(0, 0, -5).applyQuaternion(this.playerPhysicsNode.quaternion).add(this.playerPhysicsNode.position);
            shieldPos.y = 1.0;
            this.vfx.deployCGIShield(shieldPos, this.playerPhysicsNode.rotation.y);
        }

        let speed = this.keys.shift ? 22 : 13;
        if (this.direction.z !== 0) this.velocity.z -= this.direction.z * speed * deltaTime;
        if (this.direction.x !== 0) this.velocity.x -= this.direction.x * speed * deltaTime;

        this.playerPhysicsNode.translateX(-this.velocity.x * deltaTime);
        this.playerPhysicsNode.translateZ(-this.velocity.z * deltaTime);

        this.camera.position.copy(this.playerPhysicsNode.position);
        this.camera.position.y += 1.4;
        this.camera.rotation.y = this.playerPhysicsNode.rotation.y;

        // Apply physical impact screen-shaking
        if (this.camShakeIntensity > 0) {
            this.camera.position.x += (Math.random() - 0.5) * this.camShakeIntensity;
            this.camera.position.y += (Math.random() - 0.5) * this.camShakeIntensity;
            this.camShakeIntensity -= deltaTime * 2.5;
        }

        // Update gun position
        this.gun.update(deltaTime, this.keys.w || this.keys.a || this.keys.s || this.keys.d);
    }
}

// ============================================================
// WEAPON SYSTEM (from quora_weapons.js)
// ============================================================
class WeaponSystem {
    constructor(engine, playerController, vfxPipeline) {
        this.engine = engine;
        this.player = playerController;
        this.vfx = vfxPipeline;
        this.raycaster = new THREE.Raycaster();

        this.fireRate = 0.085;
        this.timeSinceLastShot = 0;
        this.isFiring = false;

        window.addEventListener('mousedown', (e) => { if (e.button === 0) this.isFiring = true; });
        window.addEventListener('mouseup', (e) => { if (e.button === 0) this.isFiring = false; });
    }

    update(deltaTime) {
        this.timeSinceLastShot += deltaTime;
        if (this.isFiring && this.timeSinceLastShot >= this.fireRate) {
            this.shoot();
        }
    }

    shoot() {
        this.timeSinceLastShot = 0;

        // Trigger visual feedback
        this.player.triggerCameraShake(0.14);
        this.engine.camera.rotation.x += 0.012;

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.engine.camera);

        // Dispersion calculation
        const dispersion = new THREE.Vector3((Math.random() - 0.5) * 0.018, (Math.random() - 0.5) * 0.018, 0);
        this.raycaster.ray.direction.add(dispersion).normalize();

        const terrainTargets = this.engine.scene.children;
        const intersections = this.raycaster.intersectObjects(terrainTargets);

        if (intersections.length > 0) {
            this.vfx.createImpactExplosion(intersections[0].point);
            // Apply damage logic here
        }
    }
}

// ============================================================
// NETWORK MANAGER (from quora_network.js)
// ============================================================
class NetworkManager {
    constructor(engine, serverUrl = "ws://localhost:8080") {
        this.engine = engine;
        this.socket = null;
        this.clientId = null;
        this.peerEntities = {};
        this.sendTimer = 0;
        this.tickRate = 0.033;

        this.connectToServer(serverUrl);
    }

    connectToServer(url) {
        this.socket = new WebSocket(url);
        this.socket.onmessage = (event) => this.handleServerMessage(JSON.parse(event.data));

        this.socket.onclose = () => {
            console.warn("[QUORA NETWORK] Server connection closed. Reconnecting...");
            setTimeout(() => this.connectToServer(url), 4000);
        };
    }

    handleServerMessage(packet) {
        switch(packet.type) {
            case "INIT":
                this.clientId = packet.id;
                break;
                
            case "UPDATE_WORLD":
                Object.keys(packet.players).forEach(id => {
                    if (id === this.clientId) return;
                    
                    const data = packet.players[id];
                    if (!this.peerEntities[id]) {
                        this.spawnNetworkPeer(id);
                    }
                    this.replicatePeerTransform(id, data);
                });
                break;

            case "PEER_DISCONNECT":
                this.removeNetworkPeer(packet.id);
                break;
        }
    }

    spawnNetworkPeer(id) {
        const geo = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x00f5ff, roughness: 0.4 });
        const mesh = new THREE.Mesh(geo, mat);

        this.engine.scene.add(mesh);
        this.peerEntities[id] = { mesh: mesh, targetPosition: new THREE.Vector3() };
    }

    replicatePeerTransform(id, data) {
        const peer = this.peerEntities[id];
        if (peer) {
            peer.targetPosition.set(data.x, data.y, data.z);
            peer.mesh.rotation.y = data.ry;
        }
    }

    removeNetworkPeer(id) {
        if (this.peerEntities[id]) {
            this.engine.scene.remove(this.peerEntities[id].mesh);
            delete this.peerEntities[id];
        }
    }

    syncLocalTransform(deltaTime, playerPosition, playerRotationY) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        this.sendTimer += deltaTime;
        if (this.sendTimer >= this.tickRate) {
            this.sendTimer = 0;
            this.socket.send(JSON.stringify({
                type: "MOVE",
                x: playerPosition.x,
                y: playerPosition.y,
                z: playerPosition.z,
                ry: playerRotationY
            }));
        }

        Object.keys(this.peerEntities).forEach(id => {
            const peer = this.peerEntities[id];
            if (peer) {
                peer.mesh.position.lerp(peer.targetPosition, deltaTime * 15.0);
            }
        });
    }
}

// ==========================================================//
// GAME INITIALIZATION & ORCHESTRATION (from app.js)
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    const engine = new QuoraEngine();
    
    // 1. VFX pipeline
    const vfx = new VisualEffectsPipeline(engine.scene);
    engine.updatables.push(vfx);

    // 2. Player controller + gun
    const player = new PlayerController(engine, vfx);
    engine.updatables.push(player);

    // 3. Weapon system
    const arsenal = new WeaponSystem(engine, player, vfx);
    engine.updatables.push(arsenal);

    // 4. Network manager
    const network = new NetworkManager(engine);
    engine.updatables.push(network);

    // 5. Run the engine
    engine.start();
});