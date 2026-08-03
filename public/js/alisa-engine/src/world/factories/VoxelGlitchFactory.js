import * as THREE from 'three';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';

export class VoxelGlitchFactory extends BaseEnvironmentFactory {
    
    constructor(scene = null, camera = null) {
        super(scene, null);
        this.camera = camera;

        this.entities = [];
        this._pendingAdds = [];
        
        // Proxy for legacy constructors trying to do this.scene.add() before init
        if (!scene) {
            this.scene = { 
                add: (obj) => { this._pendingAdds.push(obj); },
                remove: (obj) => { }
            };
        }
        
        this._legacyConstructor();
    }

    _legacyConstructor() {

        this.subjectGroup = null;
        this.uiCallback = this.uiCallback || (() => {});
        this.mainGroup = new THREE.Group();
        this.scene.add(this.mainGroup);
        
        this.voxelGroup = new THREE.Group();
        this.mainGroup.add(this.voxelGroup);

        this.instGeo = new THREE.BoxGeometry(1, 1, 1);
        this.vMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

        this.ghostMat = new THREE.MeshLambertMaterial({ 
            color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, emissive: 0x002222
        });
        
        this.ghostBox = null;
        this.ghostEdges = null;
        this.targetModel = null;
        this.currentTierSize = { w: 1, h: 1, d: 1 };
        this.currentArchetype = null;

        // Animation State Machine
        this.state = 'IDLE'; // IDLE, SOBER_TICK, GLITCH_BOX, GLITCH_SCULPT, GLITCH_CRT
        this.timer = 0;
        this.step = 0;
        this.clouds = [];
        this.currentVoxels = [];
        
        // Settings for Glitch Sculpting
        this.sculptScale = 0;
        this.bloomPass = null; // Can be injected externally
        this.glitchToggleTimer = 0;
        this.glitchCounter = 0;
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Esta factory no monta una escena: esculpe un modelo en vóxeles. Sin
     * modelo objetivo solo puede dejar la caja fantasma inicial.
     * Uso real: setTargetModel(glb) → buildAll() → startSculptStep()/tick().
     */
    buildAll(c = {}) {
        if (c.targetModel) this.setTargetModel(c.targetModel);
        if (c.tier) this.setTier(c.tier);
        // rebuildGhostBox() PRIMERO: resetToGhost() da por hecho que la caja
        // fantasma ya existe y peta con null si no la has creado antes.
        this.rebuildGhostBox();
        this.resetToGhost();
        return { ghost: this.ghostBox ?? null, voxels: this.voxels ?? null };
    }

    setTier(tierObj) {
        this.currentTierSize = { w: tierObj.w, h: tierObj.h, d: tierObj.d };
        this.currentArchetype = tierObj.archetype;
        this.rebuildGhostBox();
    }

    setTargetModel(model) {
        if(this.targetModel) this.mainGroup.remove(this.targetModel);
        this.targetModel = model;
        
        const bbox = new THREE.Box3().setFromObject(this.targetModel);
        const size = bbox.getSize(new THREE.Vector3());
        
        const scale = Math.min(this.currentTierSize.w/size.x, this.currentTierSize.h/size.y, this.currentTierSize.d/size.z) * 0.9;
        this.targetModel.scale.set(scale, scale, scale);
        
        const scaledBbox = new THREE.Box3().setFromObject(this.targetModel);
        this.targetModel.position.y = -scaledBbox.min.y;
        this.targetModel.visible = false;
        
        // Backup original materials
        this.targetModel.traverse(c => {
            if(c.isMesh && !c.userData.origMat) c.userData.origMat = c.material;
        });

        this.mainGroup.add(this.targetModel);
        this.resetToGhost();
    }

    rebuildGhostBox() {
        if (this.ghostBox) {
            this.mainGroup.remove(this.ghostBox);
            this.ghostBox.geometry.dispose();
        }
        const ghostGeo = new THREE.BoxGeometry(this.currentTierSize.w, this.currentTierSize.h, this.currentTierSize.d);
        this.ghostBox = new THREE.Mesh(ghostGeo, this.ghostMat);
        this.ghostBox.position.y = this.currentTierSize.h / 2;
        this.ghostEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(ghostGeo), 
            new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, linewidth: 2 })
        );
        this.ghostBox.add(this.ghostEdges);
        this.mainGroup.add(this.ghostBox);
    }

    resetToGhost() {
        this.state = 'IDLE';
        this.timer = 0;
        
        this.ghostBox.visible = true;
        this.ghostBox.material.opacity = 0.6;
        this.ghostBox.material.color.setHex(0xffffff);
        this.ghostBox.material.emissive.setHex(0x002222);
        this.ghostEdges.visible = true;
        
        this.clearVoxels();
        
        if (this.targetModel) {
            this.targetModel.visible = false;
            this.targetModel.position.set(0, -new THREE.Box3().setFromObject(this.targetModel).min.y, 0); 
            this.targetModel.traverse(c => {
                if(c.isMesh && c.userData.origMat) c.material = c.userData.origMat;
            });
        }
        
        if (this.bloomPass) {
            this.bloomPass.strength = 1.2; // reset
        }
        
        this.uiCallback("LOD 0 (GHOST BOX)", 0.3);
    }

    // --- Math Rules for BSP Sculpting ---
    isBoxOverlappingShape(cx, cy, cz, sx, sy, sz) {
        if (!this.currentArchetype) return true;
        
        const T = this.currentTierSize;
        const nx = cx / (T.w/2);
        const ny = (cy - T.h/2) / (T.h/2);
        const nz = cz / (T.d/2);
        const distSq = nx*nx + ny*ny + nz*nz;

        if (this.currentArchetype.includes("prop_cube") || this.currentArchetype.includes("vehicle") || this.currentArchetype.includes("wall")) {
            return (Math.abs(nx) < 0.95 && Math.abs(ny) < 0.95 && Math.abs(nz) < 0.95) || Math.random() > 0.5;
        } else if (this.currentArchetype === "humanoid" || this.currentArchetype === "brute") {
            const distFromCenterY = Math.abs(cy - (T.h/2));
            const radiusAtY = (T.w/2) * (0.85 - (distFromCenterY/T.h)); 
            const distXZ = Math.sqrt(cx*cx + cz*cz);
            const boxRadius = Math.max(sx, sz) * 0.8; 
            return distXZ <= radiusAtY + boxRadius + (Math.random()*0.1);
        } else {
            return distSq < 1.0 + (Math.random()*0.2);
        }
    }

    subdivideVoxels(voxels) {
        const newVoxels = [];
        voxels.forEach(v => {
            const hx = v.sx / 2; const hy = v.sy / 2; const hz = v.sz / 2;
            for(let dx=-1; dx<=1; dx+=2) {
                for(let dy=-1; dy<=1; dy+=2) {
                    for(let dz=-1; dz<=1; dz+=2) {
                        const cx = v.cx + dx * (hx/2);
                        const cy = v.cy + dy * (hy/2);
                        const cz = v.cz + dz * (hz/2);
                        if (this.isBoxOverlappingShape(cx, cy, cz, hx, hy, hz)) {
                             newVoxels.push({ cx, cy, cz, sx:hx, sy:hy, sz:hz });
                        }
                    }
                }
            }
        });
        return newVoxels;
    }

    generateStaticMeshCloud(voxels) {
        const cloud = new THREE.InstancedMesh(this.instGeo, this.vMat, voxels.length);
        const dummy = new THREE.Object3D();
        const tempColor = new THREE.Color();
        voxels.forEach((v, idx) => {
            dummy.position.set(v.cx, v.cy, v.cz);
            dummy.scale.set(v.sx * 0.95, v.sy * 0.95, v.sz * 0.95);
            dummy.updateMatrix();
            cloud.setMatrixAt(idx, dummy.matrix);
            
            const heightRatio = v.cy / this.currentTierSize.h;
            if (heightRatio > 0.75) tempColor.setHex(0xffccaa);
            else if (heightRatio > 0.4) tempColor.setHex(0x0088ff);
            else tempColor.setHex(0x002288);
            cloud.setColorAt(idx, tempColor);
        });
        cloud.instanceMatrix.needsUpdate = true;
        if (cloud.instanceColor) cloud.instanceColor.needsUpdate = true;
        return cloud;
    }

    clearVoxels() {
        while(this.voxelGroup.children.length > 0){ this.voxelGroup.remove(this.voxelGroup.children[0]); }
    }

    // --- Sequence Triggers ---
    triggerSober() {
        if (!this.targetModel) return;
        this.resetToGhost();
        this.uiCallback("LOD UPDATE (SOBER)", 0.8);
        this.ghostBox.visible = false;
        
        let v0 = [{ cx: 0, cy: this.currentTierSize.h/2, cz: 0, sx: this.currentTierSize.w, sy: this.currentTierSize.h, sz: this.currentTierSize.d }];
        this.clouds = [
            this.generateStaticMeshCloud(this.subdivideVoxels(v0)),
            this.generateStaticMeshCloud(this.subdivideVoxels(this.subdivideVoxels(v0))),
            this.generateStaticMeshCloud(this.subdivideVoxels(this.subdivideVoxels(this.subdivideVoxels(v0)))),
            this.generateStaticMeshCloud(this.subdivideVoxels(this.subdivideVoxels(this.subdivideVoxels(this.subdivideVoxels(v0)))))
        ];
        
        this.step = 0;
        this.timer = 0;
        this.voxelGroup.add(this.clouds[this.step]);
        this.state = 'SOBER_TICK';
    }

    triggerGlitch() {
        if (!this.targetModel) return;
        this.resetToGhost();
        this.uiCallback("UNLOCKING... (CINEMATIC FX)", 0.3);
        
        this.ghostBox.material.color.setHex(0xffffff);
        this.ghostBox.material.emissive.setHex(0xffffff);
        
        this.state = 'GLITCH_BOX';
        this.timer = 0;
    }

    // --- Game Logic Tick ---
    tick(dt) {
        if (this.state === 'IDLE') return;

        this.timer += dt;

        if (this.state === 'SOBER_TICK') {
            if (this.timer > 0.25) { // 250ms per step
                this.timer = 0;
                this.voxelGroup.remove(this.clouds[this.step]);
                this.step++;
                
                if (this.step < this.clouds.length) {
                    this.voxelGroup.add(this.clouds[this.step]);
                } else {
                    this.targetModel.visible = true;
                    this.uiCallback("LOD 1 (ONLINE)", 0.3);
                    this.state = 'IDLE';
                }
            }
        } 
        else if (this.state === 'GLITCH_BOX') {
            // Flash box opacity 0.6 -> 1.0 -> 0.6 over 0.15 * 2 = 0.3s
            if (this.timer < 0.15) {
                this.ghostBox.material.opacity = THREE.MathUtils.lerp(0.6, 1.0, this.timer / 0.15);
            } else if (this.timer < 0.3) {
                this.ghostBox.material.opacity = THREE.MathUtils.lerp(1.0, 0.6, (this.timer - 0.15) / 0.15);
            } else {
                this.ghostBox.visible = false;
                this.currentVoxels = [{ cx: 0, cy: this.currentTierSize.h/2, cz: 0, sx: this.currentTierSize.w, sy: this.currentTierSize.h, sz: this.currentTierSize.d }];
                this.step = 0;
                this.timer = 0;
                this.state = 'GLITCH_SCULPT';
                this.startSculptStep();
            }
        }
        else if (this.state === 'GLITCH_SCULPT') {
            // Wait 200ms lerping scale of current cloud
            this.sculptScale = THREE.MathUtils.lerp(this.sculptScale, 0.95, dt * 15);
            
            if (this.clouds[0]) {
                const cloud = this.clouds[0];
                const dummy = new THREE.Object3D();
                this.currentVoxels.forEach((v, idx) => {
                    dummy.position.set(v.cx, v.cy, v.cz);
                    let jitter = (Math.random()-0.5) * (v.sx * 0.1);
                    dummy.position.x += jitter;
                    dummy.scale.set(v.sx * this.sculptScale, v.sy * this.sculptScale, v.sz * this.sculptScale);
                    dummy.updateMatrix();
                    cloud.setMatrixAt(idx, dummy.matrix);
                });
                cloud.instanceMatrix.needsUpdate = true;
            }

            if (this.timer > 0.3) { // 300ms per sculpt step
                this.timer = 0;
                this.step++;
                if (this.step < 4) {
                    this.startSculptStep();
                } else {
                    // Move to CRT Glitch
                    this.uiCallback("TRANSCODING... (CRT GLITCH)", 0.8);
                    this.voxelGroup.visible = false;
                    this.targetModel.visible = true;
                    this.state = 'GLITCH_CRT';
                    this.timer = 0;
                    this.glitchToggleTimer = 0;
                    this.glitchCounter = 0;
                    
                    this.glitchMatRaw = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
                    this.glitchMatSolid = new THREE.MeshBasicMaterial({ color: 0x00ffff });
                }
            }
        }
        else if (this.state === 'GLITCH_CRT') {
            this.glitchToggleTimer += dt;
            if (this.glitchToggleTimer > 0.06) { // every 60ms
                this.glitchToggleTimer = 0;
                const toggle = this.glitchCounter % 2 === 0;
                
                this.targetModel.traverse(c => {
                    if(c.isMesh) c.material = toggle ? this.glitchMatRaw : this.glitchMatSolid;
                });
                
                this.targetModel.position.x = (Math.random()-0.5)*0.2;
                this.targetModel.position.z = (Math.random()-0.5)*0.2;
                
                this.glitchCounter++;
                if (this.glitchCounter > 10) {
                    this.targetModel.position.set(0, -new THREE.Box3().setFromObject(this.targetModel).min.y, 0);
                    this.targetModel.traverse(c => {
                        if(c.isMesh && c.userData.origMat) c.material = c.userData.origMat;
                    });
                    this.uiCallback("LOD 1 (ONLINE)", 0.3);
                    this.state = 'GLITCH_BLOOM_OUT';
                }
            }
        }
        else if (this.state === 'GLITCH_BLOOM_OUT') {
            if (this.bloomPass) {
                // Lerp bloom str 4.0 -> 1.2
                this.bloomPass.strength = THREE.MathUtils.lerp(this.bloomPass.strength, 1.2, dt * 5);
                if (Math.abs(this.bloomPass.strength - 1.2) < 0.1) {
                    this.bloomPass.strength = 1.2;
                    this.state = 'IDLE';
                }
            } else {
                this.state = 'IDLE';
            }
        }
    }

    startSculptStep() {
        this.uiCallback(`SCULPTING... (BSP LEVEL ${this.step+1})`, 0.8);
        this.clearVoxels();
        this.currentVoxels = this.subdivideVoxels(this.currentVoxels);
        this.sculptScale = 0;
        
        const cloud = this.generateStaticMeshCloud(this.currentVoxels);
        for(let i=0; i<this.currentVoxels.length; i++) {
            const dummy = new THREE.Object3D();
            dummy.position.set(this.currentVoxels[i].cx, this.currentVoxels[i].cy, this.currentVoxels[i].cz);
            dummy.scale.set(0,0,0);
            dummy.updateMatrix();
            cloud.setMatrixAt(i, dummy.matrix);
        }
        this.clouds = [cloud];
        this.voxelGroup.add(cloud);
        this.voxelGroup.visible = true; // ensure visible
    }

    setCore(core) {
        this.core = core;
        if (!this.camera && core.camera) this.camera = core.camera;
    }

    init(scene) {

        // Apply any groups added during the proxy constructor phase
        if (this._pendingAdds) {
            this._pendingAdds.forEach(obj => this.scene.add(obj));
            this._pendingAdds = [];
        }

    }

}
