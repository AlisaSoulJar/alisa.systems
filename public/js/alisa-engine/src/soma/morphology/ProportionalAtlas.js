import * as THREE from 'three';

export class ProportionalAtlas {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.texLoader = new THREE.TextureLoader();
        this.textureCache = {};
        this.currentGroup = null;
        
        // Interaction variables
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedMeshes = [];
        this.cameraTargetPos = null;
        this.controlsTargetPos = null;

        // Configuration
        this.scaleW = 1.0;
        this.scaleD = 1.0;
        this.scaleF = 1.0;
    }

    getStripTexture(type, layer) {
        const key = `${type}_${layer}`;
        if (!this.textureCache[key]) {
            const tex = this.texLoader.load(`../textures/strips/${type}_${layer}.png`, undefined, undefined, () => {
                this.texLoader.load(`../textures/strips/${layer}.png`, (fb) => {
                    tex.image = fb.image;
                    tex.needsUpdate = true;
                });
            });
            tex.magFilter = THREE.LinearFilter; 
            tex.minFilter = THREE.LinearFilter;
            this.textureCache[key] = tex;
        }
        return this.textureCache[key];
    }

    async createBuildingLayer(type, w, d, floors, isGround, isTop) {
        const group = new THREE.Group();
        
        const texGround = this.getStripTexture(type, 'ground');
        const texMid = this.getStripTexture(type, 'middle');
        const texTop = this.getStripTexture(type, 'top');
        
        const geo = new THREE.BoxGeometry(w, 4, d);
        const uv = geo.attributes.uv;
        
        for (let i = 0; i < uv.count; i++) {
            let u = uv.getX(i); 
            let v = uv.getY(i); 
            let faceIdx = Math.floor(i / 4);
            
            if (faceIdx === 4) u = (u === 1 ? 0.25 : 0.0);       
            else if (faceIdx === 0) u = (u === 1 ? 0.5 : 0.25);  
            else if (faceIdx === 5) u = (u === 1 ? 0.75 : 0.5);  
            else if (faceIdx === 1) u = (u === 1 ? 1.0 : 0.75);  
            
            uv.setXY(i, u, v);
        }
        
        // Headless guard for canvas
        let matRoof;
        if(typeof document !== 'undefined') {
            const roofCanvas = document.createElement('canvas');
            roofCanvas.width = 256; roofCanvas.height = 256;
            const rctx = roofCanvas.getContext('2d');
            rctx.fillStyle = '#445'; rctx.fillRect(0,0,256,256);
            rctx.fillStyle = '#ff0'; rctx.font = '24px monospace';
            rctx.fillText("AZOTEA", 20, 130);
            matRoof = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(roofCanvas), roughness: 1.0 });
        } else {
            matRoof = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 1.0 });
        }

        const matBottom = new THREE.MeshStandardMaterial({ color: 0x111111 }); 

        for (let f = 0; f < floors; f++) {
            let currentTex = texMid;
            
            if (f === floors - 1 && isTop) currentTex = texTop;
            if (f === 0 && isGround) currentTex = texGround;
            
            const matBody = new THREE.MeshStandardMaterial({ map: currentTex, roughness: 0.8 });
            let topMat = (f === floors - 1 && isTop) ? matRoof : matBody;
            const materials = [matBody, matBody, topMat, matBottom, matBody, matBody];
            
            const mesh = new THREE.Mesh(geo, materials);
            mesh.position.set(0, (f * 4) + 2 - (floors * 4) / 2, 0); 
            mesh.userData = { isFloor: true, type, floorLevel: f, w, d };
            group.add(mesh);
        }
        
        return { mesh: group, h: floors * 4 };
    }

    async stackBlock(w, d, baseFloors, type, isTop, isGround, px, pz, currentY) {
        let cw = w * this.scaleW;
        let cd = d * this.scaleD;
        let cpx = px * this.scaleW;
        let cpz = pz * this.scaleD;
        
        const floors = Math.max(1, Math.round(baseFloors * this.scaleF));
        const layer = await this.createBuildingLayer(type, cw, cd, floors, isGround, isTop);
        
        const py = currentY + (layer.h / 2);
        layer.mesh.position.set(cpx, py, cpz);
        return { mesh: layer.mesh, nextY: currentY + layer.h };
    }

    async rebuild(archId, type, scales = {w:1.0, d:1.0, f:1.0}) {
        if (this.currentGroup) this.scene.remove(this.currentGroup);
        this.currentGroup = new THREE.Group();
        
        this.scaleW = scales.w;
        this.scaleD = scales.d;
        this.scaleF = scales.f;

        let meshes = [];
        
        if (archId === 10) {
            let b = await this.stackBlock(20, 20, 2, type, false, true, 0, 0, 0); 
            meshes.push(b.mesh);
            b = await this.stackBlock(12, 12, 6, type, true, false, 0, 0, b.nextY); 
            meshes.push(b.mesh);
        }
        else if (archId === 11) {
            let b = await this.stackBlock(16, 16, 2, type, false, true, 0, 0, 0); 
            meshes.push(b.mesh);
            b = await this.stackBlock(12, 12, 2, type, false, false, 0, 0, b.nextY); 
            meshes.push(b.mesh);
            b = await this.stackBlock(8, 8, 2, type, true, false, 0, 0, b.nextY); 
            meshes.push(b.mesh);
        }
        else if (archId === 12) {
            let b = await this.stackBlock(16, 16, 3, type, true, true, 0, 0, 0);
            meshes.push(b.mesh);
        }
        else if (archId === 13) {
            let p1 = await this.stackBlock(4, 4, 5, type, false, true, -6, 0, 0); 
            let p2 = await this.stackBlock(4, 4, 5, type, false, true, 6, 0, 0); 
            meshes.push(p1.mesh); meshes.push(p2.mesh);
            let bridge = await this.stackBlock(16, 4, 1, type, true, false, 0, 0, p1.nextY); 
            meshes.push(bridge.mesh);
        }
        else if (archId === 14) {
            let b = await this.stackBlock(12, 12, 2, type, true, true, 0, 0, 0);
            meshes.push(b.mesh);
        }
        else if (archId === 15) {
            let b = await this.stackBlock(8, 8, 6, type, true, true, 0, 0, 0);
            meshes.push(b.mesh);
        }
        else if (archId === 16) {
            let main = await this.stackBlock(4, 8, 3, type, true, true, -2, 0, 0); 
            meshes.push(main.mesh);
            let wing = await this.stackBlock(4, 4, 2, type, true, true, 2, -2, 0); 
            meshes.push(wing.mesh);
        }

        for (let i = 0; i < meshes.length; i++) {
            this.currentGroup.add(meshes[i]);
        }
        this.scene.add(this.currentGroup);
    }

    handleSingleClick(ndcX, ndcY) {
        this.mouse.set(ndcX, ndcY);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const valid = intersects.find(i => i.object.userData && i.object.userData.isFloor);

        let wasAlreadySelected = false;
        this.selectedMeshes.forEach(m => {
            if (valid && m === valid.object) wasAlreadySelected = true;
            if (m.userData.outline) m.remove(m.userData.outline);
            if (m.userData.originalMaterials) m.material = m.userData.originalMaterials;
        });
        this.selectedMeshes = [];

        if (valid && !wasAlreadySelected) {
            const mesh = valid.object;
            this.selectedMeshes.push(mesh);
            
            if (!mesh.userData.outline) {
                const edges = new THREE.EdgesGeometry(mesh.geometry);
                const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00ffcc, linewidth: 2 }));
                line.scale.set(1.02, 1.02, 1.02);
                mesh.userData.outline = line;
            }
            mesh.add(mesh.userData.outline);
            
            mesh.userData.originalMaterials = mesh.material;
            if (!mesh.userData.xrayMaterials) {
                const orig = mesh.material;
                const matBodyX = orig[0].clone();
                matBodyX.transparent = true; matBodyX.opacity = 0.15; matBodyX.depthWrite = false; matBodyX.side = THREE.DoubleSide; 
                
                const topX = orig[2].clone(); topX.side = THREE.DoubleSide;
                const bottomX = orig[3].clone(); bottomX.side = THREE.DoubleSide;
                bottomX.color.setHex(0x1a2b3c); bottomX.emissive.setHex(0x0a1a2a);
                mesh.userData.xrayMaterials = [matBodyX, matBodyX, topX, bottomX, matBodyX, matBodyX];
            }
            mesh.material = mesh.userData.xrayMaterials;
        }
    }

    handleDoubleClick(ndcX, ndcY, onDive) {
        this.mouse.set(ndcX, ndcY);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const valid = intersects.find(i => i.object.userData && i.object.userData.isFloor);
        
        if (valid) {
            const mesh = valid.object;
            const worldPos = new THREE.Vector3();
            mesh.getWorldPosition(worldPos);

            this.cameraTargetPos = worldPos.clone();
            this.controlsTargetPos = worldPos.clone().add(new THREE.Vector3(0.1, 0, 0.1));
            
            if (mesh.userData.outline && mesh.children.includes(mesh.userData.outline)) mesh.remove(mesh.userData.outline);
            if (!mesh.userData.fpMaterials) {
                const orig = mesh.userData.originalMaterials || mesh.material;
                const matBodyFP = orig[0].clone();
                matBodyFP.transparent = true; matBodyFP.opacity = 1.0; matBodyFP.depthWrite = true; matBodyFP.side = THREE.DoubleSide; 
                const topFP = orig[2].clone(); topFP.side = THREE.DoubleSide;
                const bottomFP = orig[3].clone(); bottomFP.side = THREE.DoubleSide;
                mesh.userData.fpMaterials = [matBodyFP, matBodyFP, topFP, bottomFP, matBodyFP, matBodyFP];
            }
            
            mesh.userData.originalMaterials = mesh.userData.originalMaterials || mesh.material;
            mesh.material = mesh.userData.fpMaterials;
            mesh.userData.isFirstPerson = true;
            
            if(onDive) onDive(this.cameraTargetPos, this.controlsTargetPos);
        } else {
            if (this.currentGroup) {
                this.cameraTargetPos = new THREE.Vector3(20, 20, 20);
                this.controlsTargetPos = new THREE.Vector3(0, 0, 0);
                
                this.currentGroup.traverse((child) => {
                    if (child.userData && child.userData.isFirstPerson) {
                        child.material = child.userData.originalMaterials;
                        child.userData.isFirstPerson = false;
                    }
                });
                if(onDive) onDive(this.cameraTargetPos, this.controlsTargetPos);
            }
        }
    }
}
