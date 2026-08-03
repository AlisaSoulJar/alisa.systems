import * as THREE from 'three';
import { AlisaRenderCore } from '@alisa-engine/src/soma/AlisaRenderCore.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BoidsSystem } from '@alisa-engine/src/world/systems/BoidsSystem.js';

let isCinematic = true;

// ═══════════════════════════════════════════════════════════════
// 1. CORE — Clinical White + Alpha Transparency
// ═══════════════════════════════════════════════════════════════
const gfx = new AlisaRenderCore({ antialias: true, autoRender: true, alpha: true, clearColor: 0xffffff });

gfx.renderer.setClearColor(0xffffff, 0); // Transparent so CSS3D bleeds through
gfx.scene.fog = new THREE.FogExp2(0xffffff, 0.005); // Original fog density — "unknown dimension"

// CSS3D Holographic Layer (sits BEHIND the WebGL canvas)
const cssScene = new THREE.Scene();
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('css-container').appendChild(cssRenderer.domElement);
window.addEventListener('resize', () => cssRenderer.setSize(window.innerWidth, window.innerHeight));

// Camera — Human POV at horizon
gfx.camera.position.set(0, 2, 90);
gfx.camera.lookAt(0, 20, 0);

// Kill OrbitControls from AlisaRenderCore, use PointerLock instead
if (gfx.controls) { gfx.controls.dispose(); gfx.controls = null; }

const fpsControls = new PointerLockControls(gfx.camera, document.body);
let audioCtx = null;

document.body.addEventListener('click', () => {
    isCinematic = false;
    fpsControls.lock();
    // Ambient Cyberpunk Drone (only once)
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        osc1.type = 'sine'; osc1.frequency.value = 55.0;
        osc2.type = 'triangle'; osc2.frequency.value = 55.6; // Detuned beat
        filter.type = 'lowpass'; filter.frequency.value = 150;
        gain.gain.value = 0.5;
        osc1.connect(filter); osc2.connect(filter);
        filter.connect(gain); gain.connect(audioCtx.destination);
        osc1.start(); osc2.start();
    }
});

const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
document.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = true; });
document.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

// ═══════════════════════════════════════════════════════════════
// 2. LIGHTING — Clinical White Set
// ═══════════════════════════════════════════════════════════════
gfx.scene.children = gfx.scene.children.filter(c => !(c instanceof THREE.Light));

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
gfx.scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 50, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 150;
dirLight.shadow.camera.left = -40;
dirLight.shadow.camera.right = 40;
dirLight.shadow.camera.top = 40;
dirLight.shadow.camera.bottom = -40;
gfx.scene.add(dirLight);

// ═══════════════════════════════════════════════════════════════
// 3. INFINITE TERRAIN — White floor, whisper grid
// ═══════════════════════════════════════════════════════════════
const floorGeo = new THREE.PlaneGeometry(500, 500);
const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.1 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
gfx.scene.add(floor);

const grid = new THREE.GridHelper(200, 200, 0xeeeeee, 0xf5f5f5);
grid.position.y = 0.01;
gfx.scene.add(grid);

// ═══════════════════════════════════════════════════════════════
// 4. THE ANOMALY — Tenshi no Tamago (Full version with halos)
// ═══════════════════════════════════════════════════════════════
let tamagoRef = new THREE.Group();

const coreGeo = new THREE.IcosahedronGeometry(12, 1);
const coreMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00aaff, emissiveIntensity: 6.0 });
const anomalyCore = new THREE.Mesh(coreGeo, coreMat);

const shellGeo = new THREE.IcosahedronGeometry(16, 2);
const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0.9, roughness: 0.1,
    transmission: 0.9, thickness: 2.5,
    wireframe: true, transparent: true, opacity: 0.6
});
const anomalyShell = new THREE.Mesh(shellGeo, shellMat);

// Halos — The rotating rings of the Angelic Anomaly
const ringGeo1 = new THREE.TorusGeometry(26, 0.4, 16, 100);
const ringGeo2 = new THREE.TorusGeometry(32, 0.2, 16, 100);
const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0 });
const halo1 = new THREE.Mesh(ringGeo1, ringMat);
const halo2 = new THREE.Mesh(ringGeo2, ringMat);
halo1.rotation.x = Math.PI / 2;
halo2.rotation.y = Math.PI / 2;

tamagoRef.add(anomalyCore);
tamagoRef.add(anomalyShell);
tamagoRef.add(halo1);
tamagoRef.add(halo2);
tamagoRef.position.set(0, 30, 0); // Floating at 30m
gfx.scene.add(tamagoRef);

const eggLight = new THREE.PointLight(0x00ffff, 500, 100);
eggLight.position.set(0, 30, 0);
gfx.scene.add(eggLight);

tamagoRef.userData = { core: anomalyCore, shell: anomalyShell, halo1, halo2 };

// ═══════════════════════════════════════════════════════════════
// 5. HOLOGRAPHIC SCREENS — Pure CSS3D floating panels (NO GLB)
//    Like arcade screens but without the arcade machine body
// ═══════════════════════════════════════════════════════════════

// Helper: creates a floating holographic screen at a world position facing center
function createHoloScreen(src, worldPos, facingCenter, screenScale = 0.0018, screenW = 1024, screenH = 768) {
    // The CSS3D iframe
    const iframe = document.createElement('iframe');
    iframe.style.width = screenW + 'px';
    iframe.style.height = screenH + 'px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '4px';
    iframe.src = src;

    const cssObj = new CSS3DObject(iframe);
    cssObj.position.copy(worldPos);
    cssObj.position.y += 3.5; // Float above ground at eye level

    // Face center
    if (facingCenter) {
        const center = new THREE.Vector3(0, cssObj.position.y, 0);
        cssObj.lookAt(center);
    }

    cssObj.scale.set(screenScale, screenScale, screenScale);
    cssScene.add(cssObj);

    // WebGL hole-puncher plane so CSS3D shows through the WebGL canvas
    const holeW = screenW * screenScale;
    const holeH = screenH * screenScale;
    const holeGeo = new THREE.PlaneGeometry(holeW, holeH);
    const holeMat = new THREE.MeshBasicMaterial({
        color: 0x000000, side: THREE.DoubleSide,
        blending: THREE.NoBlending, colorWrite: false, opacity: 0
    });
    const holeMesh = new THREE.Mesh(holeGeo, holeMat);
    holeMesh.position.copy(cssObj.position);
    // Match the cssObj's rotation
    holeMesh.quaternion.copy(cssObj.quaternion);
    // Push slightly forward so hole is between camera and CSS
    holeMesh.translateZ(0.01);
    gfx.scene.add(holeMesh);

    return { cssObj, holeMesh, iframe };
}

const HUB_URL = '/';
const arcades = [];

// Central Terminal — the main ALISA screen floating under the anomaly
const centralScreen = createHoloScreen(
    './terminal.html',
    new THREE.Vector3(0, 4, 30), // In front of the egg, facing the spawn point
    false, // manual rotation
    0.025, // larger scale for the main terminal
    1440, 800
);
// Face towards spawn (+Z direction)
centralScreen.cssObj.rotation.set(0, Math.PI, 0); // Look towards +Z where camera spawns
centralScreen.holeMesh.quaternion.copy(centralScreen.cssObj.quaternion);
centralScreen.holeMesh.position.copy(centralScreen.cssObj.position);
centralScreen.holeMesh.translateZ(0.01);

// Mark it interactive for raycasting
centralScreen.holeMesh.userData.simName = 'ALISA TERMINAL';
arcades.push(centralScreen.holeMesh);

// Peripheral Stations — ring of holographic screens
const stationSources = [
    { src: HUB_URL + 'labs/croupier_terminal.html', name: 'TERMINAL' },
    { src: HUB_URL + 'labs/croupier_frogger_m30.html', name: 'FROGGER_M30' },
    { src: HUB_URL + 'labs/croupier_phantom_predator.html', name: 'PHANTOM_PREDATOR' },
    { src: HUB_URL + 'labs/croupier_physics_locomotion.html', name: 'PHYSICS_LOCOMOTION' },
    { src: HUB_URL + 'labs/croupier_math_orbital_shmup.html', name: 'ORBITAL_SHMUP' },
    { src: HUB_URL + 'labs/croupier_katamari_swarm.html', name: 'KATAMARI_SWARM' },
    { src: HUB_URL + 'labs/croupier_cucco_swarm.html', name: 'CUCCO_SWARM' },
    { src: HUB_URL + 'labs/croupier_chopper_aquarium.html', name: 'CHOPPER_AQUARIUM' },
    { src: HUB_URL + 'rooms/room_empty_table_games_node.html', name: 'TABLE_GAMES' },
    { src: HUB_URL + 'labs/croupier_rig_avatar_archetypes.html', name: 'AVATAR_ARCHETYPES' },
    { src: HUB_URL + 'labs/croupier_fx_voxel_glitch.html', name: 'VOXEL_GLITCH' },
    { src: HUB_URL + 'labs/croupier_ui_item_catalog.html', name: 'ITEM_CATALOG' },
    { src: HUB_URL + 'labs/croupier_animator_dojo.html', name: 'ANIMATOR_DOJO' },
];

const numStations = stationSources.length;
const radius = 65;

for (let i = 0; i < numStations; i++) {
    const angle = (i / numStations) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const standbyUrl = HUB_URL + 'rooms/standby_terminal.html?target=' + encodeURIComponent(stationSources[i].src);

    const screen = createHoloScreen(
        standbyUrl,
        new THREE.Vector3(x, 0, z),
        true, // face center
        0.0014, // arcade-ish scale
        1024, 1024
    );

    screen.holeMesh.userData.simName = stationSources[i].name;
    arcades.push(screen.holeMesh);
}

// ═══════════════════════════════════════════════════════════════
// 6. BOIDS — 120 agents, full swarm
// ═══════════════════════════════════════════════════════════════
const NUM_BOIDS = 120;
const boidsBounds = { minX: -25, maxX: 25, minY: 10, maxY: 35, minZ: -25, maxZ: 25 };
const boidGeo = new THREE.ConeGeometry(0.15, 0.6, 4);
boidGeo.rotateX(Math.PI / 2);
const boidMat = new THREE.MeshStandardMaterial({
    color: 0x818cf8, emissive: 0x818cf8, emissiveIntensity: 0.8,
    transparent: true, opacity: 0.8
});

const proxies = [];
for (let i = 0; i < NUM_BOIDS; i++) {
    const mesh = new THREE.Mesh(boidGeo, boidMat);
    gfx.scene.add(mesh);
    proxies.push(mesh);
}
const boids = new BoidsSystem({
    separationRadius: 1.5, alignmentRadius: 4.0, cohesionRadius: 4.0,
    maxSpeed: 6.0, maxForce: 0.1, bounds: boidsBounds
});
boids.initAgents(NUM_BOIDS, boidsBounds, proxies);

// ═══════════════════════════════════════════════════════════════
// 7. ATMOSPHERIC DUST — 3000 particles
// ═══════════════════════════════════════════════════════════════
const DUST_COUNT = 3000;
const dustGeo = new THREE.BufferGeometry();
const dustPositions = new Float32Array(DUST_COUNT * 3);
const dustVelocities = [];

for (let i = 0; i < DUST_COUNT; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 80;
    dustPositions[i * 3 + 1] = Math.random() * 40;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    dustVelocities.push({
        x: (Math.random() - 0.5) * 0.2,
        y: (Math.random() - 0.5) * 0.2 + 0.1,
        z: (Math.random() - 0.5) * 0.2
    });
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
const dustMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.15,
    transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending, depthWrite: false
});
const dustSystem = new THREE.Points(dustGeo, dustMat);
gfx.scene.add(dustSystem);

// ═══════════════════════════════════════════════════════════════
// 8. POST-PROCESSING — UnrealBloomPass (the blinding glow)
// ═══════════════════════════════════════════════════════════════
const composer = new EffectComposer(gfx.renderer);
composer.addPass(new RenderPass(gfx.scene, gfx.camera));

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.6, 0.4, 0.85
);
bloomPass.threshold = 0.4;
bloomPass.strength = 1.6;
bloomPass.radius = 1.0;
composer.addPass(bloomPass);

// ═══════════════════════════════════════════════════════════════
// 9. RAYCASTER & INTERACTION
// ═══════════════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const centerCoords = new THREE.Vector2(0, 0);
const targetLabel = document.getElementById('target-label');

// ═══════════════════════════════════════════════════════════════
// 10. LIFECYCLE LOOP — The Living Heartbeat
// ═══════════════════════════════════════════════════════════════
gfx.startLoop((dt) => {
    const time = performance.now() / 1000;

    // --- Dust Animation ---
    const positions = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST_COUNT; i++) {
        positions[i * 3] += dustVelocities[i].x * dt;
        positions[i * 3 + 1] += dustVelocities[i].y * dt;
        positions[i * 3 + 2] += dustVelocities[i].z * dt;
        if (positions[i * 3 + 1] > 40) positions[i * 3 + 1] = 0;
    }
    dustGeo.attributes.position.needsUpdate = true;

    // --- Anomaly Animation ---
    if (tamagoRef && tamagoRef.userData.core) {
        const breath = Math.sin(time * 3.0);
        tamagoRef.userData.core.rotation.y += 0.5 * dt;
        tamagoRef.userData.core.rotation.x += 0.3 * dt;
        tamagoRef.userData.shell.rotation.y -= 0.2 * dt;
        tamagoRef.userData.shell.rotation.z += 0.1 * dt;
        tamagoRef.userData.halo1.rotation.z += 1.0 * dt;
        tamagoRef.userData.halo2.rotation.x += 0.8 * dt;

        // Pulsing Core
        const mult = 1 + breath * 0.05;
        tamagoRef.userData.core.scale.set(mult, mult, mult);
        eggLight.intensity = 500 + breath * 200;
    }

    // --- Movement & Interaction ---
    if (fpsControls.isLocked) {
        const speed = 25 * dt;
        if (keys.KeyW) fpsControls.moveForward(speed);
        if (keys.KeyS) fpsControls.moveForward(-speed);
        if (keys.KeyA) fpsControls.moveRight(-speed);
        if (keys.KeyD) fpsControls.moveRight(speed);
        gfx.camera.position.y = 2; // Lock human height

        // Boids react to camera as predator, attracted to anomaly
        const predator = { position: { x: gfx.camera.position.x, y: gfx.camera.position.y, z: gfx.camera.position.z }, power: 8.0 };
        const seekTarget = { position: { x: 0, y: 15, z: 0 }, power: 0.5 };
        boids.update(dt, predator, seekTarget);

        // Raycaster
        raycaster.setFromCamera(centerCoords, gfx.camera);
        const intersects = raycaster.intersectObjects(arcades, true);
        let hitTarget = null;

        if (intersects.length > 0 && intersects[0].distance < 12) {
            let obj = intersects[0].object;
            while (obj && obj.parent) {
                if (obj.userData.simName) { hitTarget = obj; break; }
                obj = obj.parent;
            }
        }

        if (hitTarget) {
            targetLabel.innerHTML = `[ NODE: ${hitTarget.userData.simName} ]\nPress ESC to free pointer\nClick screen to compile`;
        } else {
            targetLabel.innerHTML = '';
        }
    } else {
        targetLabel.innerHTML = '';

        if (isCinematic) {
            // Cinematic Orbital Pan
            const r = 60;
            gfx.camera.position.x = Math.sin(time * 0.1) * r;
            gfx.camera.position.z = Math.cos(time * 0.1) * r;
            gfx.camera.position.y = 15 + Math.sin(time * 0.25) * 5;
            gfx.camera.lookAt(0, 25, 0); // Look at the anomaly
        }

        // Boids still update during cinematic
        const predator = { position: { x: gfx.camera.position.x, y: gfx.camera.position.y, z: gfx.camera.position.z }, power: 8.0 };
        const seekTarget = { position: { x: 0, y: 30, z: 0 }, power: 0.5 };
        boids.update(dt, predator, seekTarget);
    }
}, () => {
    // Custom Render: Bloom + CSS3D
    composer.render();
    cssRenderer.render(cssScene, gfx.camera);
});
