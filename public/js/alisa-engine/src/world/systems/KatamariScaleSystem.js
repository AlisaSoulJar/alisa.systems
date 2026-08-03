import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class KatamariScaleSystem {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.tiers = [];
        this.tierObjects = [];
        this.totalWidth = 0;
        this.baseWhiteMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0.85, depthWrite: false 
        });
    }

    initTiers(katamariTiersData, archetypeMatrices) {
        this.tiers = JSON.parse(JSON.stringify(katamariTiersData)); // Deep copy to avoid mutating global definition
        
        // Compute scales automatically based on matrices
        this.tiers.forEach(t => {
            const arch = archetypeMatrices[t.archetype] || archetypeMatrices["prop_cube"];
            t.gw = arch.gw;
            t.gh = arch.gh;
            t.gd = arch.gd;
            
            const maxAxis = Math.max(t.gw, t.gh, t.gd);
            t.cell = t.size / maxAxis;
            
            t.w = t.gw * t.cell;
            t.h = t.gh * t.cell;
            t.d = t.gd * t.cell;
        });

        // Compute layout side-by-side
        let currentX = 0;
        this.tiers.forEach((t, i) => {
            const margin = i === 0 ? 0 : (this.tiers[i-1].size * 1.5); 
            if (i > 0) currentX += (this.tiers[i-1].w / 2) + margin + (t.w / 2);
            t.posX = currentX;
            this.totalWidth = currentX + (t.w / 2);
        });
    }

    buildAllTiers() {
        this.tierObjects = [];
        this.tiers.forEach((t, i) => {
            const obj = this.createTierGeometry(t);
            this.scene.add(obj);
            this.tierObjects.push(obj);
        });
    }

    createFloorGrid(tier) {
        const maxFloor = Math.max(tier.w, tier.d) * 2;
        const grid = new THREE.GridHelper(maxFloor, 10, tier.color, 0x222222);
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        grid.position.x = tier.posX;
        return grid;
    }

    createTierGeometry(tier) {
        const group = new THREE.Group();
        
        const macroGroup = new THREE.Group();
        macroGroup.userData.isMacroGrid = true;
        macroGroup.name = "MacroGrid";
        group.add(macroGroup);
        
        if (!tier.model || tier.model === "") {
            const c = tier.cell;
            const cellGeo = new THREE.BoxGeometry(c, c, c);
            const edgeGeo = new THREE.EdgesGeometry(cellGeo);
            const edgeMat = new THREE.LineBasicMaterial({ color: tier.color, transparent: true, opacity: 0.8, linewidth: 2 });
            
            const startX = - (tier.w / 2) + (c / 2);
            const startY = c / 2;
            const startZ = - (tier.d / 2) + (c / 2);
            
            for (let x = 0; x < tier.gw; x++) {
                for (let y = 0; y < tier.gh; y++) {
                    for (let z = 0; z < tier.gd; z++) {
                        const px = startX + (x * c);
                        const py = startY + (y * c);
                        const pz = startZ + (z * c);
                        
                        const mesh = new THREE.Mesh(cellGeo, this.baseWhiteMat.clone());
                        mesh.position.set(px, py, pz);
                        macroGroup.add(mesh);
                        
                        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
                        edges.position.set(px, py, pz);
                        macroGroup.add(edges);
                    }
                }
            }
        }
        
        // We use a helper function to create sprites avoiding DOM document usage if headless
        const labelSprite = this.createLabelSprite(tier);
        if(labelSprite) group.add(labelSprite);
        
        group.position.set(tier.posX, 0, 0);
        this.scene.add(this.createFloorGrid(tier));
        return group;
    }

    createLabelSprite(tier) {
        if(typeof document === 'undefined') return null; // Headless guard
        
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#' + tier.color.toString(16).padStart(6, '0');
        ctx.font = 'bold 80px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(tier.name.split(':')[0], 512, 100);
        ctx.font = '50px monospace';
        
        const formatMeters = (m) => m < 0.1 ? (m * 100).toFixed(0) + " cm" : (m < 1000 ? m.toLocaleString() + " m" : (m / 1000).toLocaleString() + " km");
        ctx.fillText(`${formatMeters(tier.w)} x ${formatMeters(tier.h)} x ${formatMeters(tier.d)}`, 512, 200);
        
        const tex = new THREE.CanvasTexture(canvas);
        const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
        
        const labelScale = Math.max(tier.w, tier.d) * 1.5;
        labelSprite.scale.set(labelScale, labelScale * 0.25, 1);
        labelSprite.position.set(0, - (tier.h * 0.1), (tier.d/2) + (tier.d*0.1));
        return labelSprite;
    }

    buildVoxelMannequin(tier, color) {
        const group = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.7, wireframe: true });
        const bw = tier.w * 0.8, bh = tier.h * 0.9, bd = tier.d * 0.8;

        const addBlock = (w, h, d, px, py, pz) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            mesh.position.set(px, py, pz);
            group.add(mesh);
        };
        
        if (tier.archetype.includes("humanoid")) {
            const torsoH = bh * 0.4; addBlock(bw * 0.5, torsoH, bd * 0.4, 0, bh * 0.5, 0); 
            addBlock(bw * 0.3, bh * 0.2, bd * 0.3, 0, bh * 0.8, 0); 
            const armH = bh * 0.4;
            addBlock(bw * 0.15, armH, bd * 0.2, bw * 0.35, bh * 0.55, 0); 
            addBlock(bw * 0.15, armH, bd * 0.2, -bw * 0.35, bh * 0.55, 0); 
            const legH = bh * 0.3;
            addBlock(bw * 0.2, legH, bd * 0.2, bw * 0.15, legH / 2, 0); 
            addBlock(bw * 0.2, legH, bd * 0.2, -bw * 0.15, legH / 2, 0); 
        } else if (tier.archetype.includes("quadruped")) {
            const torsoH = bh * 0.4; const torsoY = bh * 0.6;
            addBlock(bw * 0.4, torsoH, bd * 0.8, 0, torsoY, 0); 
            addBlock(bw * 0.3, bh * 0.3, bd * 0.3, 0, torsoY + bh*0.1, bd * 0.5); 
            const legH = torsoY - (torsoH/2);
            const lx = bw * 0.15, lz = bd * 0.3;
            addBlock(bw * 0.1, legH, bd * 0.1, lx, legH/2, lz); 
            addBlock(bw * 0.1, legH, bd * 0.1, -lx, legH/2, lz); 
            addBlock(bw * 0.1, legH, bd * 0.1, lx, legH/2, -lz); 
            addBlock(bw * 0.1, legH, bd * 0.1, -lx, legH/2, -lz); 
        } else if (tier.archetype.includes("vehicle")) {
            const baseH = bh * 0.3; addBlock(bw * 0.8, baseH, bd * 0.9, 0, baseH/2 + bh*0.1, 0); 
            const cabH = bh * 0.4; addBlock(bw * 0.6, cabH, bd * 0.4, 0, baseH + cabH/2 + bh*0.1, bd * 0.1); 
            const wheelS = bh * 0.2; const wx = bw * 0.45, wz = bd * 0.3;
            addBlock(wheelS, wheelS, wheelS, wx, wheelS/2, wz);
            addBlock(wheelS, wheelS, wheelS, -wx, wheelS/2, wz);
            addBlock(wheelS, wheelS, wheelS, wx, wheelS/2, -wz);
            addBlock(wheelS, wheelS, wheelS, -wx, wheelS/2, -wz);
        } else if (tier.archetype.includes("celestial")) {
            addBlock(bw * 0.8, bh * 0.2, bd * 0.2, 0, bh/2, 0);
            addBlock(bw * 0.2, bh * 0.8, bd * 0.2, 0, bh/2, 0);
            addBlock(bw * 0.2, bh * 0.2, bd * 0.8, 0, bh/2, 0);
        } else {
            addBlock(bw * 0.6, bh * 0.6, bd * 0.6, 0, bh/2, 0);
        }
        return group;
    }

    injectModelIntoTier(tierIdx, modelPath, onCompleteCallback) {
        const t = this.tiers[tierIdx];
        t.model = modelPath;
        
        const parent = this.tierObjects[tierIdx];
        if(!parent) return;

        // Purge
        for (let i = parent.children.length - 1; i >= 0; i--) {
            const c = parent.children[i];
            if (c.userData.isOriginalModel || c.userData.isCompoundGroup || c.userData.isMannequin || c.userData.isMacroGrid || c.name === "MacroGrid") {
                parent.remove(c);
            }
        }

        // Recreate MacroGrid
        const groupGeo = this.createTierGeometry(t);
        parent.add(groupGeo);

        if (!modelPath || modelPath === "") {
            const mannequin = this.buildVoxelMannequin(t, t.color);
            mannequin.userData.isMannequin = true;
            parent.add(mannequin);
            if(onCompleteCallback) onCompleteCallback();
            return;
        }

        const resolvedPath = modelPath.startsWith('../') ? modelPath : '../' + modelPath;
        this.loader.load(resolvedPath, (gltf) => {
            const model = gltf.scene;
            
            // Auto Alignment Therapy
            let bbox = new THREE.Box3().setFromObject(model);
            let size = bbox.getSize(new THREE.Vector3());
            
            if (t.archetype.includes("quadruped") || t.archetype.includes("vehicle") || t.archetype === "crawler") {
                if (size.y > size.z * 1.2) {
                    model.rotation.x = -Math.PI / 2;
                    model.updateMatrixWorld(true);
                    bbox.setFromObject(model);
                    size = bbox.getSize(new THREE.Vector3());
                }
                if (size.x > size.z * 1.2) {
                    model.rotation.y = -Math.PI / 2;
                    model.updateMatrixWorld(true);
                    bbox.setFromObject(model);
                    size = bbox.getSize(new THREE.Vector3());
                }
            }
            
            // Aquarium Pressure Scaling
            const maxW = t.gw * t.cell, maxH = t.gh * t.cell, maxD = t.gd * t.cell;
            const uniformScale = Math.min(maxW / (size.x || 1), maxH / (size.y || 1), maxD / (size.z || 1)) * 0.9;
            
            model.scale.set(uniformScale, uniformScale, uniformScale);
            model.updateMatrixWorld(true);
            
            const finalBboxUncentered = new THREE.Box3().setFromObject(model);
            const centerX = (finalBboxUncentered.max.x + finalBboxUncentered.min.x) / 2;
            const centerZ = (finalBboxUncentered.max.z + finalBboxUncentered.min.z) / 2;
            
            model.position.set(-centerX, -finalBboxUncentered.min.y, -centerZ);
            
            model.userData.isOriginalModel = true;
            model.traverse(c => {
                if (c.isMesh) {
                    c.userData.originalMat = c.material;
                    c.userData.neonMat = new THREE.MeshBasicMaterial({ 
                        color: t.color, transparent: true, opacity: 0.8, wireframe: true 
                    });
                    c.material = c.userData.neonMat;
                }
            });
            
            model.updateMatrixWorld(true);
            const finalBbox = new THREE.Box3().setFromObject(model);
            
            // Rasterization DNA -> Voxel Hitbox
            const gridResX = 8, gridResY = 8, gridResZ = 8;
            const w = (finalBbox.max.x - finalBbox.min.x) || 0.1;
            const h = (finalBbox.max.y - finalBbox.min.y) || 0.1;
            const d = (finalBbox.max.z - finalBbox.min.z) || 0.1;
            
            const voxelW = w / gridResX, voxelH = h / gridResY, voxelD = d / gridResZ;
            const grid = new Set(), activeMacroCells = new Set();
            const cSize = t.cell;
            
            model.traverse(node => {
                if (node.isMesh && node.geometry && node.geometry.attributes.position) {
                    const positions = node.geometry.attributes.position.array;
                    const v = new THREE.Vector3();
                    for (let j = 0; j < positions.length; j += 3) {
                        v.set(positions[j], positions[j+1], positions[j+2]);
                        v.applyMatrix4(node.matrixWorld);
                        
                        const gx = Math.floor((v.x - finalBbox.min.x) / voxelW);
                        const gy = Math.floor((v.y - finalBbox.min.y) / voxelH);
                        const gz = Math.floor((v.z - finalBbox.min.z) / voxelD);
                        grid.add(`${Math.max(0, Math.min(gridResX-1, gx))}_${Math.max(0, Math.min(gridResY-1, gy))}_${Math.max(0, Math.min(gridResZ-1, gz))}`);
                        
                        activeMacroCells.add(`${Math.floor((v.x + cSize/2) / cSize)}_${Math.floor(v.y / cSize)}_${Math.floor((v.z + cSize/2) / cSize)}`);
                    }
                }
            });
            
            const compoundGroup = new THREE.Group();
            compoundGroup.userData.isCompoundGroup = true;
            
            if (grid.size > 0) {
                const solidMat = new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.9 });
                const solidWireMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
                const debugMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.25, depthWrite: false });
                const debugWireMat = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
                
                const voxelGeo = new THREE.BoxGeometry(voxelW * 0.95, voxelH * 0.95, voxelD * 0.95);
                const edgeGeo = new THREE.EdgesGeometry(voxelGeo);
                
                grid.forEach(key => {
                    const parts = key.split('_').map(Number);
                    const px = finalBbox.min.x + (parts[0] * voxelW) + (voxelW / 2);
                    const py = finalBbox.min.y + (parts[1] * voxelH) + (voxelH / 2);
                    const pz = finalBbox.min.z + (parts[2] * voxelD) + (voxelD / 2);
                    
                    const boxMesh = new THREE.Mesh(voxelGeo, debugMat);
                    boxMesh.userData = { solidMat, debugMat };
                    boxMesh.position.set(px, py, pz);
                    
                    const wireMesh = new THREE.LineSegments(edgeGeo, debugWireMat);
                    wireMesh.userData = { solidWire: solidWireMat, debugWire: debugWireMat };
                    wireMesh.position.set(px, py, pz);
                    
                    compoundGroup.add(boxMesh, wireMesh);
                });
            }
            
            const macroGroup = parent.getObjectByName("MacroGrid");
            if (macroGroup && activeMacroCells.size > 0) {
                const cellGeo = new THREE.BoxGeometry(cSize, cSize, cSize);
                const edgeGeo = new THREE.EdgesGeometry(cellGeo);
                const edgeMat = new THREE.LineBasicMaterial({ color: t.color, transparent: true, opacity: 0.8, linewidth: 2 });
                
                activeMacroCells.forEach(key => {
                    const parts = key.split('_').map(Number);
                    const mesh = new THREE.Mesh(cellGeo, this.baseWhiteMat.clone());
                    mesh.position.set(parts[0] * cSize, parts[1] * cSize + (cSize / 2), parts[2] * cSize);
                    macroGroup.add(mesh);
                    
                    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
                    edges.position.set(parts[0] * cSize, parts[1] * cSize + (cSize / 2), parts[2] * cSize);
                    macroGroup.add(edges);
                });
            }
            
            parent.add(model);
            parent.add(compoundGroup);
            
            if(onCompleteCallback) onCompleteCallback();
        }, undefined, (e) => console.warn("Could not load model: " + modelPath));
    }
}
