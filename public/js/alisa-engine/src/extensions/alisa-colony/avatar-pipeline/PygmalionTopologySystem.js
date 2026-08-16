import * as THREE from 'three';
import { ModelUtils } from '../../../world/utils/ModelUtils.js';
import { SparkSystem } from '../../../soma/plugins/SparkSystem.js';
import { RoboticArmFactory } from '../../../world/systems/RoboticArmSystem.js';

export class PygmalionBrain {
    constructor(ctx) {
        this.ctx = ctx;
        this.state = 'IDLE';
        this.busy = false;
        this.timer = 0;
        this.logBrain('STATE: BOOTING', '#555555');
    }

    logBrain(msg, color='#ffaa00') {
        const domStatus = document.getElementById('ui-fsm');
        if(domStatus && domStatus.textContent !== msg) {
            domStatus.textContent = msg;
            domStatus.style.color = color;
        }
    }
    
    tick(dt, elapsed) {
        if (this.busy) return;
        switch(this.state) {
            case 'IDLE':
                this.logBrain('STATE: IDLE', '#ffaa00');
                if (this.timer < elapsed) {
                    if (this.ctx.rng() < 0.20) {
                        this.state = 'CALIBRATING';
                        this.logBrain('STATE: CALIBRATING', '#00ffaa');
                        this.doCalibration();
                    } else {
                        this.timer = elapsed + 3 + this.ctx.rng() * 5;
                    }
                }
                break;
        }
    }

    async doCalibration() {
        if (!this.ctx.armsReady || !this.ctx.armLeft) return;
        this.busy = true;
        
        const rom = window.globalMovements?.igor_surgical?.rom || {};
        const hover = rom.hover || { targetLeftX: -0.5, targetLeftY: 0.6, targetLeftZ: -21.5, targetRightX: 0.5, targetRightY: 0.6, targetRightZ: -18.5 };
        
        const leftHover = new THREE.Vector3(hover.targetLeftX, hover.targetLeftY, hover.targetLeftZ);
        const rightHover = new THREE.Vector3(hover.targetRightX, hover.targetRightY, hover.targetRightZ);
        
        const calTarget = new THREE.Vector3(0, 3.5, 0);
        await Promise.all([
            this.ctx.armLeft.movePTP(this.ctx.armLeft.solveIK(calTarget, 0.85), 20, 25),
            this.ctx.armRight.movePTP(this.ctx.armRight.solveIK(calTarget, 0.85), 20, 25)
        ]);
        
        this.ctx.sparks.emit(calTarget, 15);
        await this.ctx.wait(200);
        
        await Promise.all([
            this.ctx.armLeft.movePTP(this.ctx.armLeft.solveIK(leftHover, 1.0), 15, 20),
            this.ctx.armRight.movePTP(this.ctx.armRight.solveIK(rightHover, 1.0), 15, 20)
        ]);
        
        this.busy = false;
        this.state = 'IDLE';
        this.timer = this.ctx.engine.clock.getElapsedTime() + 5;
    }

    startSurgery(filename, tier, maxDim, prop, manifest) {
        this.state = 'SURGERY';
        this.logBrain('STATE: SURGERY', '#ff3333');
        this.doSurgeryAsync(filename, tier, maxDim, prop, manifest);
    }

    async doSurgeryAsync(filename, tier, maxDim, prop, manifest) {
        this.busy = true;
        const propBox = new THREE.Box3().setFromObject(prop);
        const propCenter = propBox.getCenter(new THREE.Vector3());
        
        this.ctx.setUI("RIGGING", filename, tier, 0);

        for(let i=0; i<3; i++) {
            this.ctx.sparks.emit(propCenter, 5);
            await this.ctx.wait(100);
        }

        if (!manifest.igor_bones || manifest.igor_bones.length === 0) {
             const s = propBox.getSize(new THREE.Vector3());
             const cx = 0, cy = s.y * 0.45, cz = 0;
             const arch = manifest.archetype || "default";
             
             if (arch === "arachnid") {
                 // 8 legs radiating
                 manifest.igor_bones = [];
                 for(let i=0; i<8; i++) {
                     const angle = (i / 8) * Math.PI * 2;
                     const lx = Math.cos(angle) * s.x * 0.4;
                     const lz = Math.sin(angle) * s.z * 0.4;
                     manifest.igor_bones.push([[cx, cy, cz], [cx + lx, cy, cz + lz]]);
                 }
             } else if (arch === "canine") {
                 // 4 legs + spine
                 manifest.igor_bones = [
                     [[cx, cy, cz - s.z*0.3], [cx, cy, cz + s.z*0.3]], // spine
                     [[cx - s.x*0.3, cy, cz + s.z*0.3], [cx, cy, cz + s.z*0.3]], // front left
                     [[cx + s.x*0.3, cy, cz + s.z*0.3], [cx, cy, cz + s.z*0.3]], // front right
                     [[cx - s.x*0.3, cy, cz - s.z*0.3], [cx, cy, cz - s.z*0.3]], // rear left
                     [[cx + s.x*0.3, cy, cz - s.z*0.3], [cx, cy, cz - s.z*0.3]], // rear right
                 ];
             } else if (arch === "primate") {
                 // 2 arms + 2 legs + spine
                 manifest.igor_bones = [
                     [[cx, cy - s.y*0.2, cz], [cx, cy + s.y*0.2, cz]], // upright spine
                     [[cx - s.x*0.4, cy + s.y*0.2, cz], [cx, cy + s.y*0.2, cz]], // arm left
                     [[cx + s.x*0.4, cy + s.y*0.2, cz], [cx, cy + s.y*0.2, cz]], // arm right
                     [[cx - s.x*0.2, cy - s.y*0.3, cz], [cx, cy - s.y*0.2, cz]], // leg left
                     [[cx + s.x*0.2, cy - s.y*0.3, cz], [cx, cy - s.y*0.2, cz]], // leg right
                 ];
             } else {
                 manifest.igor_bones = [
                     [[cx, cy, cz - s.z*0.4], [cx, cy, cz]],
                     [[cx, cy, cz], [cx, cy, cz + s.z*0.4]]
                 ];
             }
        }

        const bones = manifest.igor_bones;
        
        const leftBones = [];
        const rightBones = [];
        for (let k = 0; k < bones.length; k++) {
            const localP1 = new THREE.Vector3(bones[k][0][0], bones[k][0][1], bones[k][0][2]);
            const worldP1 = localP1.clone().applyMatrix4(prop.matrixWorld);
            if (worldP1.x <= 0) leftBones.push(worldP1);
            else rightBones.push(worldP1);
        }

        const raycaster = new THREE.Raycaster();
        const getSurfacePoint = (wpos, propObj) => {
            // Raycast from slightly outside towards the center to find the skin surface
            const center = new THREE.Vector3(0, propObj.position.y, 0);
            const dir = center.clone().sub(wpos).normalize();
            // Start the ray slightly outside the point
            const startRay = wpos.clone().sub(dir.clone().multiplyScalar(2.0));
            raycaster.set(startRay, dir);
            const intersects = raycaster.intersectObject(propObj, true);
            if (intersects.length > 0) return intersects[0].point;
            return wpos; // Fallback to raw bone coordinate
        };

        let completed = 0;
        const processArm = async (queue, arm, isLeft) => {
            const rom = window.globalMovements?.igor_surgical?.rom || {};
            const hover = rom.hover || { targetLeftX: -0.5, targetLeftY: 0.6, targetLeftZ: -21.5, targetRightX: 0.5, targetRightY: 0.6, targetRightZ: -18.5 };
            const hoverTarget = isLeft 
                ? new THREE.Vector3(hover.targetLeftX, hover.targetLeftY, hover.targetLeftZ)
                : new THREE.Vector3(hover.targetRightX, hover.targetRightY, hover.targetRightZ);
                
            for (const wpos of queue) {
                const targetPos = getSurfacePoint(wpos, prop);
                
                // 1. FAST APPROACH (PTP) - Approach the bone slightly undershooting
                await arm.movePTP(arm.solveIK(targetPos, 0.80), 12, 16);
                
                // 2. PRECISION WELD (LIN) - Cartesian linear motion to exact surface
                await arm.moveLIN(targetPos, 0.98, 25, 28);
                
                this.ctx.sparks.emit(targetPos, 8);
                this.ctx.flashImpact();
                await this.ctx.wait(100);
                
                // 3. FAST RETRACT (PTP) - Return to hover ready posture
                await arm.movePTP(arm.solveIK(hoverTarget, 1.0), 12, 14);
                await this.ctx.wait(80);
                
                completed++;
                this.ctx.setProgress((completed / bones.length) * 100);
                this.ctx.setUI(undefined, undefined, undefined, completed);
            }
        };

        await Promise.all([
            processArm(leftBones, this.ctx.armLeft, true),
            processArm(rightBones, this.ctx.armRight, false)
        ]);

        this.ctx.setProgress(100);
        this.ctx.setUI("WELDED", filename, tier, bones.length);

        this.ctx.setUI("BINDING", filename, "DERMIS", 0);
        await this.ctx.wait(1000);

        const finalSkinMat = new THREE.MeshPhysicalMaterial({
            color: 0x111618, metalness: 0.8, roughness: 0.2,
            clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5,
            side: THREE.DoubleSide
        });

        prop.traverse(child => {
            if (child.isMesh) {
                child.material = finalSkinMat;
                child.material.needsUpdate = true;
            }
        });
        
        await this.ctx.wait(1500);

        this.ctx.currentAsset = null;
        this.busy = false;
        this.state = 'IDLE';
        this.timer = this.ctx.engine.clock.getElapsedTime() + 2;
    }
}

export class PygmalionTopologySystem {
    /**
     * @param {Object} engine
     * @param {Object} envFactory
     * @param {Function} [setUI]
     * @param {Function} [log]
     * @param {Function} [flashImpact]
     * @param {Function} [setProgress]
     * @param {Object} [config]
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get a reproducible idle/belt
     *        cadence — also handed down to the internal `SparkSystem` so the weld
     *        bursts share the same stream. There was no existing options object on
     *        this constructor (six positional callbacks), so `config` is a new
     *        trailing parameter; every existing caller passes only six args and
     *        keeps working unchanged.
     */
    constructor(engine, envFactory, setUI, log, flashImpact, setProgress, config = {}) {
        this.engine = engine;
        this.scene = engine.scene;
        this.env = envFactory;
        this.setUI = setUI || (() => {});
        this.log = log || (() => {});
        this.flashImpact = flashImpact || (() => {});
        this.setProgress = setProgress || (() => {});
        this.rng = config.rng || Math.random;

        this.sparks = new SparkSystem(this.scene, { rng: this.rng });
        this.armLeft = null;
        this.armRight = null;
        this.pygmalionArm = null;
        this.pygJoints = {};
        this.pygLookTarget = new THREE.Vector3(0, 0, 0);
        this.armsReady = false;
        
        this.currentAsset = null;
        this.testRigMode = 'auto';
        this.pygmalionEyeLight = null;
        
        this.processedQueue = [];
        this.totalHatched = 0;
        
        this.brain = new PygmalionBrain(this);
    }

    async boot() {
        await this.bootFactoryWorkers();
        this.beltLoop();
    }

    wait(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    async bootFactoryWorkers() {
        this.log("[Factory] Booting Sovereign Robotic Workers...");
        
        try {
            const [skelRes, kinRes, pygPassportRes, igorPassportRes] = await Promise.all([
                fetch('../data/skeletons.json'),
                fetch('../data/kinematics.json'),
                fetch('../data/beings_passports/pygmalion_passport.json'),
                fetch('../data/beings_passports/igor_passport.json')
            ]);
            window.platonicSkeletonsDB = await skelRes.json();
            window.globalMovements = await kinRes.json();
            window.passportsDB = {
                pygmalion: await pygPassportRes.json(),
                igor: await igorPassportRes.json()
            };
        } catch (e) {
            console.error("[Factory] ERROR fetching kinematics/passports:", e);
            window.platonicSkeletonsDB = {};
            window.globalMovements = { mechanical: { rom: {} } };
        }
        
        // 1. Pygmalion
        const pygGLTF = await ModelUtils.loadGLB('../props/fase1_measured/pygmalion_scanner.glb');
        if (pygGLTF) {
            this.pygmalionArm = pygGLTF.scene;
            this.pygmalionArm.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry && child.geometry.attributes.color) {
                        child.geometry.deleteAttribute('color');
                    }
                    if (child.geometry && !child.geometry.attributes.normal) {
                        child.geometry.computeVertexNormals();
                    }
                    child.material = new THREE.MeshPhysicalMaterial({
                        color: 0xaabbcc, metalness: 0.3, roughness: 0.15,
                        clearcoat: 1.0, clearcoatRoughness: 0.05, emissive: 0x000000,
                        side: THREE.DoubleSide,
                    });
                }
            });
            
            this.pygmalionArm.position.set(0, 18, 0);
            this.pygmalionArm.scale.set(0.8, 0.8, 0.8);
            this.scene.add(this.pygmalionArm);
            
            this.pygJoints.shoulder = this.pygmalionArm.getObjectByName('shoulder');
            this.pygJoints.upperArm = this.pygmalionArm.getObjectByName('upperArm');
            this.pygJoints.elbow = this.pygmalionArm.getObjectByName('elbow');
            this.pygJoints.wrist = this.pygmalionArm.getObjectByName('wrist');
            
            const eyeGroup = this.pygmalionArm.getObjectByName('eye');
            if (eyeGroup) {
                if (eyeGroup.isMesh) {
                    eyeGroup.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    eyeGroup.scale.set(1.1, 1.1, 1.1);
                } else if (eyeGroup.children.length > 0) {
                    eyeGroup.traverse(c => {
                        if (c.isMesh) c.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    });
                }

                this.pygmalionEyeLight = new THREE.SpotLight(0x00ffaa, 120, 50, Math.PI / 6, 0.4, 1.5);
                this.pygmalionEyeLight.position.set(0, 0, 0);
                eyeGroup.add(this.pygmalionEyeLight);
                this.scene.add(this.pygmalionEyeLight.target);
                this.pygmalionEyeLight.target.position.set(0, 0, 0);
            }
        }

        // 2. Igor
        const arms = await RoboticArmFactory.createPairFromGLB(
            this.scene,
            'igor_arm.glb',
            { variant: 'pristine', rightVariant: 'rusted' },
            3.8
        );
        this.armLeft = arms.left;
        this.armLeft.root.scale.set(0.35, 0.35, 0.35);
        this.armLeft.root.position.set(-5.0, -0.6, -20); 

        this.armRight = arms.right;
        this.armRight.root.scale.set(0.35, 0.35, 0.35);
        this.armRight.root.position.set(5.0, -0.6, -20);

        const igorMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, metalness: 0.6, roughness: 0.4,
            clearcoat: 0.8, clearcoatRoughness: 0.2, side: THREE.DoubleSide
        });
        [this.armLeft.root, this.armRight.root].forEach(root => root.traverse(child => {
            if (child.isMesh) {
                if (child.geometry && !child.geometry.attributes.normal) {
                    child.geometry.computeVertexNormals();
                }
                const mat = igorMat.clone();
                mat.vertexColors = (child.geometry && child.geometry.attributes.color !== undefined);
                child.material = mat;
            }
        }));
        
        this.armsReady = true;
    }

    createCocoon(pos) {
        const geo = new THREE.IcosahedronGeometry(1.2, 2);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xeeeeff, roughness: 0.85, transparent: true, opacity: 1.0,
            emissive: 0x112233, emissiveIntensity: 0.2
        });
        const cocoon = new THREE.Mesh(geo, mat);
        cocoon.position.copy(pos);
        cocoon.castShadow = true;
        this.scene.add(cocoon);
        return cocoon;
    }

    async animateMovement(obj, targetZ, durationSec = 1.5) {
        const startZ = obj.position.z;
        const steps = Math.round(60 * durationSec);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            obj.position.z = startZ + (targetZ - startZ) * ease;
            await this.wait(1000 / 60);
        }
        obj.position.z = targetZ;
    }

    async hatchAndProcess(filename, tier, manifest) {
        this.setUI("RECEIVING", filename, "ENVELOPED", 0);
        this.log(`[ABDUCTION] Incoming cocoon: ${filename}`);

        const dropStart = new THREE.Vector3(0, 12, 35);
        const cocoon = this.createCocoon(dropStart);
        this.currentAsset = cocoon;

        for (let i = 0; i <= 45; i++) {
            const t = i / 45; const ease = t * t;
            cocoon.position.y = 12 - (11.2) * ease;
            cocoon.rotation.x += 0.02; cocoon.rotation.z += 0.01;
            await this.wait(16);
        }
        cocoon.position.y = 0.8;

        this.setUI("CONVEYING", filename, "TO SCANNER", 0);
        await this.animateMovement(cocoon, 0, 3.0);

        this.log(`[SCAN COMPLETE] ${tier}`, true);
        this.setUI("HATCHING", filename, tier, 0);

        for (let i = 20; i >= 0; i--) {
            cocoon.material.opacity = i / 20;
            cocoon.scale.setScalar(1 + (20 - i) * 0.025);
            cocoon.material.emissiveIntensity = (20 - i) * 0.05;
            await this.wait(25);
        }
        this.scene.remove(cocoon);

        const gltf = await ModelUtils.loadGLB(`../props/ready/${filename}`);
        const prop = new THREE.Group();
        this.currentAsset = prop;
        let maxDim = 1;
        if (gltf) {
            const mscene = gltf.scene;
            mscene.traverse(child => { if (child.isMesh && child.scale.x > 10) child.scale.set(1, 1, 1); });
            prop.add(mscene);
            
            mscene.updateWorldMatrix(true, true);
            const box = new THREE.Box3().setFromObject(mscene);
            const size = box.getSize(new THREE.Vector3());
            maxDim = Math.max(size.x, size.y, size.z) || 1;
            
            const targetSize = { "Tier 1.0": 3.2, "Tier 1.5": 4.4, "Tier 2.0": 5.6, "Tier 2.5": 7.2, "Tier 3.0": 8.8 }[tier] || 4.8;
            if (maxDim > 0.0001) {
                const f = targetSize / maxDim;
                mscene.scale.set(f, f, f);
            }
            
            mscene.updateWorldMatrix(true, true);
            const box2 = new THREE.Box3().setFromObject(mscene);
            const center = box2.getCenter(new THREE.Vector3());
            mscene.position.set(-center.x, -box2.min.y, -center.z);
        } else {
            prop.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff4444, wireframe: true })));
        }
        prop.position.set(0, 0.5, 0);
        
        const ghostMat = new THREE.MeshPhysicalMaterial({
            color: 0x4488ff, metalness: 0.2, roughness: 0.6,
            transparent: true, opacity: 0.6, wireframe: true,
            emissive: 0x002244, emissiveIntensity: 0.5
        });
        prop.traverse(child => {
            if (child.isMesh && child.material) {
                child.material = ghostMat;
            }
        });

        this.scene.add(prop);
        this.log("[HATCHED] Subject exposed on scanning table.");
        await this.wait(600);

        this.setUI("SCANNING", filename, "MATHEMATICAL TOMOGRAPHY...", 0);
        this.log(`[PYGMALION] Scan initiated on ${filename}...`);
        this.brain.state = 'SCANNING';
        this.brain.busy = true;

        const isMock = ["Tarantula.glb", "Gorilla.glb", "Bear.glb", "Hyena.glb"].includes(filename);
        let pythonPromise = Promise.resolve();
        if (!isMock) {
            pythonPromise = fetch(`http://127.0.0.1:8741/pygmalion/process/${encodeURIComponent(filename)}`, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    this.log(`[HUB] Topology mapped.`, true);
                    if (data.igor_bones && data.igor_bones.length > 0) {
                        manifest.igor_bones = data.igor_bones;
                    }
                })
                .catch(e => console.error("Hub missing", e));
        } else {
            pythonPromise = new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        let scanI = 0;
        let pythonDone = false;
        pythonPromise.then(() => pythonDone = true);

        while (!pythonDone || scanI < 60) {
            if (this.pygmalionEyeLight) {
                this.pygmalionEyeLight.intensity = 150 + Math.sin(scanI * 0.8) * 100;
                this.pygmalionEyeLight.color.setHex(0xff00ff);
            }
            prop.position.y = 0.5 + Math.sin(scanI * 0.3) * 0.1;
            await this.wait(40);
            scanI++;
        }
        
        if (this.pygmalionEyeLight) {
            this.pygmalionEyeLight.intensity = 40;
            this.pygmalionEyeLight.color.setHex(0x00ffff);
        }
        prop.position.y = 0.5;
        this.brain.state = 'PROCESSING';

        this.setUI("CONVEYING", filename, "TO SURGERY BAY", 0);
        await this.animateMovement(prop, -20, 2.5);

        this.brain.startSurgery(filename, tier, maxDim, prop, manifest);
        
        while(this.brain.state === 'SURGERY') {
            await this.wait(500);
        }

        this.setUI("DISPATCHING", filename, tier, undefined);
        this.log(`[DISPATCH] Sending ${filename} to final assembly...`);
        
        const exitZ = -this.env.BELT_LENGTH / 2 - 2;
        const startZ = prop.position.z;
        const dispatchSteps = 60;
        for (let i = 0; i <= dispatchSteps; i++) {
            const t = i / dispatchSteps;
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            prop.position.z = startZ + (exitZ - startZ) * ease;
            if (t > 0.6) {
                const shrink = 1 - ((t - 0.6) / 0.4);
                prop.scale.setScalar(Math.max(0.01, shrink));
            }
            await this.wait(16);
        }
        
        this.scene.remove(prop);
        this.log(`✓ ${filename} dispatched to assembly line.`, true);
    }

    async beltLoop() {
        while(true) {
            if (this.processedQueue.length <= this.totalHatched) {
                try {
                    const res = await fetch("http://127.0.0.1:8741/arachne/processed?limit=5");
                    if (res.ok) {
                        const data = await res.json();
                        const all = data.processed || [];
                        if (all.length > 0) {
                            all.forEach(item => {
                                if(!this.processedQueue.find(p => p.filename === item.filename)) {
                                    this.processedQueue.push(item);
                                }
                            });
                        } else {
                            throw new Error("Empty");
                        }
                    }
                } catch(e) {
                     if(this.rng() < 0.8) {
                         const mockFiles = ["Tarantula.glb", "Gorilla.glb", "Bear.glb", "Hyena.glb"];
                         const chosen = mockFiles[Math.floor(this.rng() * mockFiles.length)];
                         const mockManifest = { 
                             target_tier: "Tier 2.0", 
                             deduced_size_meters: 1.5,
                             archetype: "canine",
                             igor_bones: []
                         };
                         this.processedQueue.push({ filename: chosen, manifest: mockManifest });
                     }
                }
            }

            if (this.processedQueue.length > this.totalHatched && this.brain.state === 'IDLE') {
                const item = this.processedQueue[this.totalHatched++];
                document.getElementById('ui-count') && (document.getElementById('ui-count').innerText = this.totalHatched);
                await this.hatchAndProcess(item.filename, item.manifest.target_tier || "Tier 1.0", item.manifest);
            } else if (this.brain.state === 'IDLE') {
                this.setUI("AWAITING_COCOON", "—", "—", 0);
            }
            
            await this.wait(2000 + this.rng() * 4000);
        }
    }

    updatePygmalion(dt, elapsed) {
        if (!this.pygmalionArm) return;
        
        let targetShoulderY = 0;
        let targetUpperArmX = 0;
        let targetElbowX = 0;
        
        const romData = window.globalMovements?.pygmalion_scanner?.rom || {};
        const dbIdle = romData.idle || { upperArmX: -2.8, elbowX: 2.8, lookY: 11 };
        const dbScan = romData.scan || { upperArmSub: -0.8, upperArmMul: 0.5, elbowAdd: 1.6, elbowMul: 0.4 };

        const smoothFactor = (halfLife) => 1.0 - Math.pow(0.5, dt / halfLife);
        const isScanning = this.testRigMode === 'scan' || (this.currentAsset && this.testRigMode === 'auto');

        if (isScanning) {
            this.pygLookTarget.lerp(this.currentAsset.position, smoothFactor(0.6));
            const headWorldPos = new THREE.Vector3();
            if (this.pygJoints.wrist) this.pygJoints.wrist.getWorldPosition(headWorldPos);
            
            const dir = this.pygLookTarget.clone().sub(headWorldPos).normalize();
            const dist = headWorldPos.distanceTo(this.pygLookTarget);
            
            targetShoulderY = Math.atan2(dir.x, dir.z);
            let ext = Math.min(dist / 15.0, 1.0);
            
            targetUpperArmX = dbScan.upperArmSub - (ext * dbScan.upperArmMul);
            targetElbowX = dbScan.elbowAdd + (ext * dbScan.elbowMul);
        } else {
            this.pygLookTarget.set(0, dbIdle.lookY, 0); 
            targetShoulderY = 0;
            targetUpperArmX = dbIdle.upperArmX; 
            targetElbowX = dbIdle.elbowX;     
        }
        
        const jointSmooth = smoothFactor(0.35);

        if (this.pygJoints.shoulder) {
            const sYDiff = Math.atan2(
                Math.sin(targetShoulderY - this.pygJoints.shoulder.rotation.y), 
                Math.cos(targetShoulderY - this.pygJoints.shoulder.rotation.y)
            );
            this.pygJoints.shoulder.rotation.y += sYDiff * jointSmooth;
        }
        
        if (this.pygJoints.upperArm) this.pygJoints.upperArm.rotation.x += (targetUpperArmX - this.pygJoints.upperArm.rotation.x) * jointSmooth;
        if (this.pygJoints.elbow) this.pygJoints.elbow.rotation.x += (targetElbowX - this.pygJoints.elbow.rotation.x) * jointSmooth;
        
        if (this.pygJoints.wrist) {
            const wristWorldPos = new THREE.Vector3();
            this.pygJoints.wrist.getWorldPosition(wristWorldPos);
            
            const lookMatrix = new THREE.Matrix4();
            lookMatrix.lookAt(wristWorldPos, this.pygLookTarget, new THREE.Vector3(0, 1, 0));
            const desiredWorldQuat = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);
            const axisCompensation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
            desiredWorldQuat.multiply(axisCompensation);
            
            const parentWorldQuat = new THREE.Quaternion();
            this.pygJoints.wrist.parent.getWorldQuaternion(parentWorldQuat);
            const targetLocalQuat = parentWorldQuat.clone().invert().multiply(desiredWorldQuat);
            
            const wristSmooth = smoothFactor(0.25);
            this.pygJoints.wrist.quaternion.slerp(targetLocalQuat, wristSmooth);
        }
        
        if (this.pygmalionEyeLight) {
            this.pygmalionEyeLight.target.position.copy(this.pygLookTarget);
            const targetIntensity = isScanning ? 120 : 20;
            this.pygmalionEyeLight.intensity += (targetIntensity - this.pygmalionEyeLight.intensity) * smoothFactor(0.5);
        }
        
        if (this.engine.clock) {
            this.pygmalionArm.position.y = 18 + Math.sin(this.engine.clock.getElapsedTime() * 1.2) * 0.15;
        }
    }

    tick(dt, elapsed) {
        this.env.rollers.forEach(r => r.rotation.x += dt * 2.0);
        if (this.sparks) this.sparks.update(dt);

        if (this.env.dust) {
            const dArr = this.env.dust.geometry.attributes.position.array;
            for (let i = 0; i < this.env.dustCount; i++) {
                dArr[i * 3 + 1] += Math.sin(elapsed + i) * 0.002;
                dArr[i * 3] += Math.cos(elapsed * 0.5 + i) * 0.001;
                if (dArr[i * 3 + 1] > 12) dArr[i * 3 + 1] = 0;
            }
            this.env.dust.geometry.attributes.position.needsUpdate = true;
        }

        if (this.brain && (!this.brain.busy || this.testRigMode !== 'auto') && this.armsReady && this.armLeft && this.armRight && this.armLeft.solveIK) {
            this.armLeft.root.updateWorldMatrix(true, false);
            this.armRight.root.updateWorldMatrix(true, false);

            const lerpSpd = dt * 6.0;

            if (this.testRigMode === 'idle' || this.testRigMode === 'auto') {
                const rom = window.globalMovements?.igor_surgical?.rom || {};
                const idle = rom.idle || { targetLeftX: -8.0, targetLeftY: -0.4, targetLeftZ: -20.0, targetRightX: 8.0, targetRightY: -0.4, targetRightZ: -20.0 };
                const hover = rom.hover || { targetLeftX: -0.5, targetLeftY: 0.6, targetLeftZ: -21.5, targetRightX: 0.5, targetRightY: 0.6, targetRightZ: -18.5 };
                
                const isHover = (this.testRigMode === 'auto' && this.currentAsset !== null);
                const activeState = isHover ? hover : idle;
                
                const leftTarget = new THREE.Vector3(activeState.targetLeftX, activeState.targetLeftY, activeState.targetLeftZ);
                const rightTarget = new THREE.Vector3(activeState.targetRightX, activeState.targetRightY, activeState.targetRightZ);
                
                const solLeft = this.armLeft.solveIK(leftTarget, 1.0);
                const solRight = this.armRight.solveIK(rightTarget, 1.0);

                this.armLeft.shoulder.rotation.x += (solLeft.shoulderX - this.armLeft.shoulder.rotation.x) * lerpSpd;
                this.armLeft.elbow.rotation.x    += (solLeft.elbowX - this.armLeft.elbow.rotation.x) * lerpSpd;
                this.armLeft.wrist.rotation.x    += (solLeft.wristX - this.armLeft.wrist.rotation.x) * lerpSpd;
                const bYLeftDiff = Math.atan2(Math.sin(solLeft.baseY - this.armLeft.base.rotation.y), Math.cos(solLeft.baseY - this.armLeft.base.rotation.y));
                this.armLeft.base.rotation.y     += bYLeftDiff * lerpSpd;

                this.armRight.shoulder.rotation.x += (solRight.shoulderX - this.armRight.shoulder.rotation.x) * lerpSpd;
                this.armRight.elbow.rotation.x    += (solRight.elbowX - this.armRight.elbow.rotation.x) * lerpSpd;
                this.armRight.wrist.rotation.x    += (solRight.wristX - this.armRight.wrist.rotation.x) * lerpSpd;
                const bYRightDiff = Math.atan2(Math.sin(solRight.baseY - this.armRight.base.rotation.y), Math.cos(solRight.baseY - this.armRight.base.rotation.y));
                this.armRight.base.rotation.y     += bYRightDiff * lerpSpd;
                
                this.armLeft.breathe(elapsed);
                this.armRight.breathe(elapsed);
            }
        }

        const beaconPulse = (Math.sin(elapsed * 4) + 1) * 0.5;
        const isBusy = this.brain && this.brain.busy;
        if(this.env.beaconLeft) this.env.beaconLeft.intensity = isBusy ? beaconPulse * 3 : 0;
        if(this.env.beaconRight) this.env.beaconRight.intensity = isBusy ? beaconPulse * 3 : 0;
        if (this.armsReady && this.armLeft && this.armLeft.warningLight) this.armLeft.warningLight.material.opacity = isBusy ? 0.3 + beaconPulse * 0.7 : 0.1;
        if (this.armsReady && this.armRight && this.armRight.warningLight) this.armRight.warningLight.material.opacity = isBusy ? 0.3 + beaconPulse * 0.7 : 0.1;

        if (this.brain) this.brain.tick(dt, elapsed);
        this.updatePygmalion(dt, elapsed);
    }
}
