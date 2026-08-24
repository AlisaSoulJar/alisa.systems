import * as THREE from 'three';
import { ModelUtils } from '../../../world/utils/ModelUtils.js';

export class GeppettoBrain {
    constructor(uiConfig) {
        this.ui = uiConfig;
        this.state = 'CALIBRATING';
        this.logBrain('STATE: WAITING FOR SPECIMEN', '#ffaa00');
    }
    
    logBrain(msg, color = '#ffaa00') {
        if (this.ui.fsmElement && this.ui.fsmElement.textContent !== msg) {
            this.ui.fsmElement.textContent = msg;
            this.ui.fsmElement.style.color = color;
        }
    }
}

export class GeppettoChoreographySystem {
    /**
     * @param {Object} engine
     * @param {Object} envFactory
     * @param {Object} kinematicsSys
     * @param {Object} [uiConfig]
     * @param {() => number} [uiConfig.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get a reproducible joint
     *        rig and explosion-pose scatter. Reuses `uiConfig` instead of a new
     *        parameter so every existing caller keeps working unchanged.
     */
    constructor(engine, envFactory, kinematicsSys, uiConfig = {}) {
        this.engine = engine;
        this.env = envFactory;
        this.kinematics = kinematicsSys;
        this.ui = uiConfig;
        this.rng = uiConfig.rng || (() => Math.random());

        this.dropQueue = [];
        this.brain = new GeppettoBrain(uiConfig);
        
        this.dropComplete = false;
        this.cycleCount = 0;
    }

    log(msg, highlight = false) {
        if (!this.ui.logElement) return;
        const p = document.createElement('p');
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
        p.innerHTML = `<span style="color:#555">[${time}]</span> ${highlight ? `<span class="log-highlight">${msg}</span>` : msg}`;
        this.ui.logElement.appendChild(p);
        this.ui.logElement.scrollTop = this.ui.logElement.scrollHeight;
    }

    setUI(state, asset, tier, nodes) {
        if (state !== undefined && this.ui.stateElement) this.ui.stateElement.innerText = state;
        if (asset !== undefined && this.ui.assetElement) this.ui.assetElement.innerText = asset.length > 22 ? asset.substring(0, 20) + '…' : asset;
        if (tier !== undefined && this.ui.tierElement) this.ui.tierElement.innerText = tier;
        if (nodes !== undefined && this.ui.nodesElement) this.ui.nodesElement.innerText = nodes;
    }

    setProgress(pct) {
        if (this.ui.progressElement) {
            this.ui.progressElement.style.width = Math.min(100, pct) + '%';
        }
    }

    flashImpact() {
        if (this.ui.impactElement) {
            this.ui.impactElement.style.opacity = '1';
            setTimeout(() => this.ui.impactElement.style.opacity = '0', 150);
        }
    }

    async fetchPipeline() {
        try {
            const res = await fetch("http://127.0.0.1:8741/geppetto/queue");
            if (res.ok) {
                const data = await res.json();
                if (data.pending) this.dropQueue = data.pending;
            }
        } catch (e) {
            console.warn("[Geppetto] Hub offline or queue unreachable.");
        }
    }

    clearProp() {
        while (this.env.propHolder.children.length > 0) {
            const c = this.env.propHolder.children[0];
            this.env.propHolder.remove(c);
            c.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                        else child.material.dispose();
                    }
                }
            });
        }
    }

    async spawnProp() {
        this.clearProp();
        if (this.dropQueue.length === 0) await this.fetchPipeline();
        
        const entry = this.dropQueue.length > 0 ? this.dropQueue.shift() : { 
            filename: 'Spider.glb', url: '../props/models/Spider.glb', 
            manifest: { target_tier: 'Debug', archetype: 'spider', morphology: { domain: 'organic' } } 
        };
        
        const url = entry.url;
        const name = entry.filename.replace('.glb', '');
        const tier = entry.manifest ? entry.manifest.target_tier : 'Unknown';
        
        this.log(`Loading ${name} from Hub pipeline...`);

        try {
            const gltf = await ModelUtils.loadGLB(url);
            const mesh = gltf.scene;

            mesh.traverse(child => { if (child.isMesh && child.scale.x > 10) child.scale.set(1, 1, 1); });
            
            mesh.updateWorldMatrix(true, true);
            const initBox = new THREE.Box3().setFromObject(mesh);
            const initSize = initBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(initSize.x, initSize.y, initSize.z) || 1;
            
            const targetVisualSize = 5.0; 
            mesh.scale.setScalar(targetVisualSize / maxDim);

            mesh.updateWorldMatrix(true, true);
            const finalBox = new THREE.Box3().setFromObject(mesh);
            const center = finalBox.getCenter(new THREE.Vector3());
            mesh.position.set(-center.x, -center.y, -center.z);

            mesh.traverse(c => { 
                if (c.isMesh) {
                    c.castShadow = true; 
                    if (c.material) {
                        c.material.emissive = new THREE.Color(0x00ffcc);
                        c.material.emissiveIntensity = 1.0;
                        c.material.metalness = 0.8;
                        c.material.roughness = 0.2;
                    }
                } 
            });

            this.env.propHolder.add(mesh);
            
            const propGlow = new THREE.PointLight(0xffffff, 4.0, 15);
            propGlow.position.set(0, 0, 0);
            this.env.propHolder.add(propGlow);
            this.log(`${name} loaded. Tier: ${tier}`, true);
            
            if (entry.manifest && entry.manifest.kinematics) {
                this.env.propHolder.userData.kinematics = entry.manifest.kinematics;
            } else {
                this.env.propHolder.userData.kinematics = { base_gait: 'static', step_amplitude: 0.1, cycle_frequency_hz: 1 };
            }

            const joints = [];
            let largestMesh = null;
            let maxVol = 0;
            mesh.traverse(c => {
                if (c.isMesh) {
                    if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
                    const b = c.geometry.boundingBox;
                    const vol = (b.max.x - b.min.x) * (b.max.y - b.min.y) * (b.max.z - b.min.z);
                    if (vol > maxVol) { maxVol = vol; largestMesh = c; }
                }
            });
            
            mesh.traverse(c => {
                if (c.isBone || (c.isMesh && c !== largestMesh && c !== mesh)) {
                    joints.push({ joint: c, baseRot: c.rotation.clone(), speed: this.rng() * 5 + 2, offset: this.rng() * Math.PI * 2 });
                }
            });
            this.env.propHolder.userData.joints = joints;
            
            const allPieces = [];
            mesh.traverse(c => {
                if (c.isMesh) {
                    allPieces.push({
                        mesh: c,
                        basePos: c.position.clone(),
                        baseRot: c.rotation.clone(),
                        expPos: c.position.clone().add(new THREE.Vector3((this.rng() - 0.5) * 12, (this.rng() - 0.5) * 12, (this.rng() - 0.5) * 12)),
                        expRot: new THREE.Euler(this.rng() * Math.PI * 2, this.rng() * Math.PI * 2, this.rng() * Math.PI * 2)
                    });
                }
            });
            this.env.propHolder.userData.allPieces = allPieces;
            
            return { name, tier: tier, remaining: this.dropQueue.length };
        } catch(e) {
            this.log(`Failed to load pipeline asset ${name}, using fallback.`);
            const fallback = new THREE.Mesh(
                new THREE.IcosahedronGeometry(2.5, 1),
                new THREE.MeshStandardMaterial({
                    color: 0xff0088, metalness: 0.6, roughness: 0.2,
                    emissive: 0x550033, emissiveIntensity: 1.0, wireframe: true
                })
            );
            this.env.propHolder.add(fallback);
            
            const propGlow = new THREE.PointLight(0xff0088, 4.0, 15);
            propGlow.position.set(0, 0, 0);
            this.env.propHolder.add(propGlow);

            return { name: name + "_error", tier: "fallback", remaining: this.dropQueue.length };
        }
    }

    async animateWaterLevel(fromY, toY, frames = 60) {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        for (let i = 0; i <= frames; i++) {
            const t = i / frames;
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            this.env.waterSurface.position.y = fromY + (toY - fromY) * ease;
            this.env.waterGlow.intensity = Math.max(0, (this.env.waterSurface.position.y - this.env.TANK_BOTTOM) / (this.env.WATER_FULL - this.env.TANK_BOTTOM)) * 2;
            await wait(25);
        }
        this.env.waterSurface.position.y = toY;
    }

    async runCycle() {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        this.cycleCount++;
        this.dropComplete = false;
        this.brain.state = 'CALIBRATING';
        this.brain.logBrain('STATE: PREPARING TANK', '#ffaa00');

        const entry = await this.spawnProp();
        this.env.propHolder.position.y = this.env.DROP_START;
        this.env.propHolder.rotation.set(0, 0, 0);
        this.log(`Specimen #${this.cycleCount}: ${entry.name}. Initiating drop...`);
        this.setUI('DROPPING', entry.name, entry.tier, entry.remaining.toString());
        this.setProgress(0);
        await wait(800);

        this.log('Dropping into kinematic tank...', true);
        const fallFrames = 50;
        for (let i = 0; i <= fallFrames; i++) {
            const t = i / fallFrames;
            this.env.propHolder.position.y = this.env.DROP_START - (this.env.DROP_START - this.env.PLUNGE_Y) * (t * t);
            await wait(20);
        }
        this.flashImpact();
        this.setProgress(20);

        const floatFrames = 70;
        for (let i = 0; i <= floatFrames; i++) {
            const t = i / floatFrames;
            const ease = 1 - Math.pow(1 - t, 4);
            this.env.propHolder.position.y = this.env.PLUNGE_Y + (this.env.FLOAT_Y - this.env.PLUNGE_Y) * ease;
            this.env.propHolder.rotation.x = Math.sin(t * Math.PI * 5) * 0.15 * (1 - t);
            this.env.propHolder.rotation.z = Math.cos(t * Math.PI * 5) * 0.15 * (1 - t);
            await wait(22);
        }
        this.env.propHolder.rotation.set(0, 0, 0);
        this.env.propHolder.position.y = this.env.FLOAT_Y;
        this.dropComplete = true;
        this.setProgress(40);

        this.log('Extracting topology...', true);
        this.brain.state = 'DISASSEMBLING';
        this.brain.logBrain('STATE: TOPOLOGY EXTRACTION', '#ff00ff');
        this.setUI('SIMULATING'); 
        
        if (this.env.propHolder.userData.allPieces && this.env.propHolder.userData.allPieces.length > 0) {
            const explFrames = 45;
            for (let i = 0; i <= explFrames; i++) {
                const t = i / explFrames;
                const ease = 1 - Math.pow(1 - t, 3);
                this.env.propHolder.userData.allPieces.forEach(p => {
                    p.mesh.position.lerpVectors(p.basePos, p.expPos, ease);
                    p.mesh.rotation.x = p.baseRot.x + (p.expRot.x - p.baseRot.x) * ease;
                    p.mesh.rotation.y = p.baseRot.y + (p.expRot.y - p.baseRot.y) * ease;
                    p.mesh.rotation.z = p.baseRot.z + (p.expRot.z - p.baseRot.z) * ease;
                });
                await wait(20);
            }
            
            await wait(600);
            
            this.log('Synthesizing skeleton...', true);
            this.brain.state = 'ASSEMBLING';
            this.brain.logBrain('STATE: SKELETAL BINDING', '#ff00ff');
            const implFrames = 40;
            for (let i = 0; i <= implFrames; i++) {
                const t = i / implFrames;
                const ease = t * t * t;
                this.env.propHolder.userData.allPieces.forEach(p => {
                    p.mesh.position.lerpVectors(p.expPos, p.basePos, ease);
                    p.mesh.rotation.x = p.expRot.x + (p.baseRot.x - p.expRot.x) * ease;
                    p.mesh.rotation.y = p.expRot.y + (p.baseRot.y - p.expRot.y) * ease;
                    p.mesh.rotation.z = p.expRot.z + (p.baseRot.z - p.expRot.z) * ease;
                });
                await wait(20);
            }
            
            this.env.propHolder.userData.allPieces.forEach(p => {
                p.mesh.position.copy(p.basePos);
                p.mesh.rotation.copy(p.baseRot);
            });
        }

        this.log('Specimen stabilized. Injecting kinematics...', true);
        this.brain.state = 'SIMULATING';
        this.brain.logBrain('STATE: SIMULATION ACTIVE', '#00ffcc');
        this.setUI('SIMULATING');
        this.setProgress(60);
        await wait(12000); 
        this.setProgress(100);

        this.dropComplete = false;
        
        if (entry.tier !== 'Debug' && entry.tier !== 'fallback') {
            try {
                this.log(`[BACKEND] Embodying choreographer via Hub for ${entry.name}...`);
                const res = await fetch(`http://127.0.0.1:8741/geppetto/process/${encodeURIComponent(entry.name + '.glb')}`, { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    const gait = data.kinematics.base_gait || 'static';
                    this.log(`[HUB] Choreography mapped: ${gait}. Delivered to /ready/.`, true);
                }
            } catch(e) {
                console.error("Hub missing", e);
            }
        }

        this.brain.state = 'DRAINING';
        this.brain.logBrain('STATE: DRAINING TANK', '#ff8800');
        this.log('Kinematics complete. Draining tank...', true);
        this.setUI('DRAINING');

        const drainFrames = 80;
        for (let i = 0; i <= drainFrames; i++) {
            const t = i / drainFrames;
            const ease = t * t; 
            const waterY = this.env.WATER_FULL - (this.env.WATER_FULL - this.env.TANK_BOTTOM) * ease;
            this.env.waterSurface.position.y = waterY;
            this.env.waterGlow.intensity = Math.max(0, (waterY - this.env.TANK_BOTTOM) / (this.env.WATER_FULL - this.env.TANK_BOTTOM)) * 2;
            this.env.propHolder.position.y = this.env.FLOAT_Y - (this.env.FLOAT_Y - (this.env.TANK_BOTTOM - 2)) * ease;
            this.env.propHolder.rotation.y += 0.02; 
            await wait(25);
        }

        this.clearProp();
        this.log('Specimen evacuated.', false);

        this.brain.state = 'REFILLING';
        this.brain.logBrain('STATE: REFILLING TANK', '#0088ff');
        this.setUI('REFILLING');
        this.log('Refilling kinematic tank...', true);
        await this.animateWaterLevel(this.env.TANK_BOTTOM, this.env.WATER_FULL, 60);
        this.log('Tank ready for next specimen.');

        await wait(500);
        this.runCycle();
    }

    onUpdate(dt, elapsed) {
        this.env.leds.forEach((led, i) => {
            led.material.emissiveIntensity = Math.pow(Math.sin(elapsed * 10 + i), 8) * 2;
        });

        const simActive = this.brain.state === 'SIMULATING';
        this.env.impulses.forEach((imp, i) => {
            if (simActive) {
                imp.mesh.visible = true;
                imp.offset += 0.01 * this.kinematics.defaults.freq;
                if (imp.offset > 1) imp.offset = 0;
                const pt = this.env.curves[i].getPointAt(imp.offset);
                imp.mesh.position.copy(pt);
                imp.mesh.scale.setScalar(1 + Math.sin(imp.offset * Math.PI) * 0.5);
            } else {
                imp.mesh.visible = false;
            }
        });

        if (this.dropComplete) {
            this.env.propHolder.rotation.y += dt * 0.3; 
            if (!simActive) {
                this.env.propHolder.position.y = this.env.FLOAT_Y; 
            }
        }

        if (simActive && this.dropComplete) {
            this.kinematics.applyKinematics(this.env.propHolder, elapsed, this.env.FLOAT_Y);
        }
    }
}
