/**
 * ALISA OVERWORLD — LITE MODE
 * ═══════════════════════════════════════════════════════════════
 * For mobile / low-GPU devices.
 * Simple white room. No movement. Gentle auto-orbit.
 * One holographic screen: the ALISA web.
 * Click → screen takes over (flat web mode).
 * ═══════════════════════════════════════════════════════════════
 */
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// ─── Scene ───
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xffffff, 0.008);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 2, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap for perf
renderer.setClearColor(0xffffff, 0);
document.body.appendChild(renderer.domElement);

// CSS3D layer
const cssScene = new THREE.Scene();
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('css-container').appendChild(cssRenderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Minimal Lighting ───
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dir = new THREE.DirectionalLight(0xffffff, 0.5);
dir.position.set(5, 20, 10);
scene.add(dir);

// ─── White Floor ───
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Whisper grid
const grid = new THREE.GridHelper(100, 100, 0xeeeeee, 0xf8f8f8);
grid.position.y = 0.01;
scene.add(grid);

// ─── Small Anomaly (Subtle glow, no bloom) ───
const coreGeo = new THREE.IcosahedronGeometry(3, 1);
const coreMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00aaff, emissiveIntensity: 2.0 });
const core = new THREE.Mesh(coreGeo, coreMat);

const shellGeo = new THREE.IcosahedronGeometry(4.5, 2);
const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0.5, roughness: 0.3,
    wireframe: true, transparent: true, opacity: 0.4
});
const shell = new THREE.Mesh(shellGeo, shellMat);

const anomaly = new THREE.Group();
anomaly.add(core);
anomaly.add(shell);
anomaly.position.set(0, 12, 0);
scene.add(anomaly);

const eggLight = new THREE.PointLight(0x00ffff, 60, 40);
eggLight.position.set(0, 12, 0);
scene.add(eggLight);

// ─── Holographic Screen (Pure CSS3D — the web) ───
const screenW = 1440;
const screenH = 900;
const worldScale = 0.008; // size in world units

const div = document.createElement('div');
div.style.width = screenW + 'px';
div.style.height = screenH + 'px';
div.style.backgroundColor = '#000';
div.style.borderRadius = '8px';
div.style.overflow = 'hidden';
div.style.boxShadow = '0 0 60px rgba(0,255,255,0.15)';

const iframe = document.createElement('iframe');
iframe.style.width = '100%';
iframe.style.height = '100%';
iframe.style.border = 'none';
iframe.src = './terminal.html';
div.appendChild(iframe);

const cssObj = new CSS3DObject(div);
cssObj.position.set(0, 5.5, 0);
cssObj.scale.set(worldScale, worldScale, worldScale);
cssScene.add(cssObj);

// Hole puncher
const holeW = screenW * worldScale;
const holeH = screenH * worldScale;
const holeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(holeW, holeH),
    new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide })
);
holeMesh.position.copy(cssObj.position);
holeMesh.position.z += 0.01;
scene.add(holeMesh);

// ─── Minimal Dust (200 particles, no velocity sim) ───
const DUST = 200;
const dustGeo = new THREE.BufferGeometry();
const dPos = new Float32Array(DUST * 3);
for (let i = 0; i < DUST; i++) {
    dPos[i * 3]     = (Math.random() - 0.5) * 40;
    dPos[i * 3 + 1] = Math.random() * 20;
    dPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xcccccc, size: 0.1, transparent: true, opacity: 0.25, depthWrite: false
})));

// ─── "Enter" — Click to go fullscreen web ───
const overlay = document.getElementById('overlay-instruction');
overlay.innerHTML = 'TAP TO ENTER ALISA';

let entered = false;
document.body.addEventListener('click', () => {
    if (entered) return;
    entered = true;
    overlay.style.display = 'none';
    document.getElementById('hud').style.display = 'none';

    // Animate camera towards the screen
    const targetPos = new THREE.Vector3(0, 5.5, 6);
    const startPos = camera.position.clone();
    const startTime = performance.now();
    const duration = 1500;

    function zoomIn() {
        const t = Math.min((performance.now() - startTime) / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
        camera.position.lerpVectors(startPos, targetPos, ease);
        camera.lookAt(0, 5.5, 0);

        if (t < 1) {
            requestAnimationFrame(zoomIn);
        } else {
            // Fade to flat web
            const fadeDiv = document.createElement('div');
            fadeDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:999;opacity:0;transition:opacity 0.5s;';
            document.body.appendChild(fadeDiv);
            requestAnimationFrame(() => fadeDiv.style.opacity = '1');
            setTimeout(() => {
                // Replace everything with the flat web
                document.body.innerHTML = '<iframe src="./terminal.html" style="position:fixed;top:0;left:0;width:100%;height:100%;border:none;"></iframe>';
            }, 600);
        }
    }
    zoomIn();
}, { once: true });

// ─── Render Loop (Minimal — gentle orbit + anomaly rotation) ───
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const t = performance.now() / 1000;
    const dt = Math.min(clock.getDelta(), 0.1);

    // Gentle auto-orbit (no user input needed)
    if (!entered) {
        const r = 18;
        camera.position.x = Math.sin(t * 0.08) * r;
        camera.position.z = Math.cos(t * 0.08) * r;
        camera.position.y = 3 + Math.sin(t * 0.15) * 1;
        camera.lookAt(0, 5, 0);
    }

    // Anomaly breathe
    core.rotation.y += 0.3 * dt;
    shell.rotation.z += 0.1 * dt;
    const breath = Math.sin(t * 2);
    const s = 1 + breath * 0.03;
    core.scale.set(s, s, s);
    eggLight.intensity = 60 + breath * 20;

    // Dust float
    const pos = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST; i++) {
        pos[i * 3 + 1] += 0.01;
        if (pos[i * 3 + 1] > 20) pos[i * 3 + 1] = 0;
    }
    dustGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    cssRenderer.render(cssScene, camera);
}
animate();
