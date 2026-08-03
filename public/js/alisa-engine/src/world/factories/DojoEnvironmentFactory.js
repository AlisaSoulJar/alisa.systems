import * as THREE from 'three';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';

export class DojoEnvironmentFactory extends BaseEnvironmentFactory {
    constructor(scene) {
        super(scene, null);
        this.cadObjects = [];
        this.floorTiles = [];
        this.katamariFood = [];
        this.lanternLight = null;
        this.tileGroup = new THREE.Group();
        this.scene.add(this.tileGroup);
        
        this.setupArena();
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Orden: arena → suelo de baile → comida → ciudad (los katamari-props
     * necesitan el suelo puesto para posarse encima).
     */
    buildAll(c = {}) {
        this.setupArena();
        this.buildDanceFloor();
        if (c.food !== false) this.spawnKatamariFood();
        if (c.city !== false) this.spawnKatamariCity();
        return { arena: this.arena ?? null, floor: this.danceFloor ?? null };
    }

    setupArena() {
        this.applyLightingPreset({
            hemi: { skyColor: 0xffffff, groundColor: 0xcadcfa, intensity: 0.8 }
        });

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 8, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        this.createFloor({
            size: 50, gridSize: 50, gridDivisions: 50,
            gridColor1: 0x000000, gridColor2: 0x000000
        });
        // Override floor material with ShadowMaterial
        if (this._floor) {
            this._floor.material = new THREE.ShadowMaterial({ opacity: 0.15 });
        }
        if (this._grid) {
            this._grid.material.opacity = 0.08;
            this._grid.material.transparent = true;
        }


        this.buildDanceFloor();
    }

    buildDanceFloor() {
        const tileGeo = new THREE.PlaneGeometry(1.9, 1.9); // Grid with gaps
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
                const t = new THREE.Mesh(tileGeo, mat);
                t.position.set((i - 2) * 2, 0.01, (j - 2) * 2);
                t.rotation.x = -Math.PI / 2;
                t.receiveShadow = true;
                t.userData = { id: `tile_${i}_${j}`, x: i, z: j, targetX: (i-2)*2, targetZ: (j-2)*2, originalMaterial: mat };
                this.tileGroup.add(t);
                this.floorTiles.push(t);
                this.cadObjects.push(t);
            }
        }
    }

    spawnKatamariFood() {
        for(let i=0; i<15; i++) {
            const s = 0.1 + Math.random()*0.8;
            let geo;
            if (Math.random() > 0.5) geo = new THREE.BoxGeometry(s, s, s);
            else geo = new THREE.SphereGeometry(s*0.6);
            
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(Math.random(), 1.0, 0.5),
                roughness: 0.3
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((Math.random()-0.5)*30, s/2, (Math.random()-0.5)*30);
            mesh.castShadow = true; mesh.receiveShadow = true;
            mesh.userData = { size: s, originalMaterial: mat };
            
            this.scene.add(mesh);
            this.katamariFood.push(mesh);
            this.cadObjects.push(mesh);
        }
    }
    
    spawnKatamariCity() {
        // Generates massive buildings far away that require scale 10.0+ to absorb
        for(let i=0; i<30; i++) {
            const isSkyscraper = Math.random() > 0.6;
            const sX = isSkyscraper ? 4 + Math.random()*4 : 6 + Math.random()*6;
            const sY = isSkyscraper ? 15 + Math.random()*25 : 6 + Math.random()*8;
            const sZ = isSkyscraper ? 4 + Math.random()*4 : 6 + Math.random()*6;
            
            const sizeMagnitude = Math.max(sX, sY, sZ);
            const geo = new THREE.BoxGeometry(sX, sY, sZ);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.55 + Math.random()*0.1, 0.4, 0.2 + Math.random()*0.3),
                roughness: 0.8, metalness: 0.2
            });
            const mesh = new THREE.Mesh(geo, mat);
            
            let angle = Math.random() * Math.PI * 2;
            let radius = 40 + Math.random() * 150;
            let px = Math.cos(angle) * radius;
            let pz = Math.sin(angle) * radius;
            
            mesh.position.set(px, sY/2, pz);
            mesh.castShadow = true; mesh.receiveShadow = true;
            
            if (isSkyscraper) {
                const winGeo = new THREE.BoxGeometry(sX+0.1, sY*0.9, sZ+0.1);
                const winMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.2 });
                const winMesh = new THREE.Mesh(winGeo, winMat);
                mesh.add(winMesh);
            }
            
            mesh.userData = { size: sizeMagnitude, originalMaterial: mat };
            this.scene.add(mesh);
            this.katamariFood.push(mesh);
            this.cadObjects.push(mesh);
        }
    }

    createLantern() {
        this.lanternLight = new THREE.PointLight(0xff9900, 1.5, 8);
        this.lanternLight.castShadow = true;
        this.lanternLight.visible = false;
        return this.lanternLight;
    }

    applySimonUI(simonState) {
        if (!simonState) return;
        if(simonState.currentTarget && simonState.mode === 'action') {
            for(let t of this.floorTiles) t.material.color.setHex(0xffffff); // Default
        } else if (simonState.currentTarget && simonState.mode === 'position') {
            const tgtX = simonState.currentTarget.x;
            const tgtZ = simonState.currentTarget.z;
            for(let t of this.floorTiles) {
                if (t.userData.x === tgtX && t.userData.z === tgtZ) {
                    t.material.color.setHex(0xffeb3b);
                } else {
                    t.material.color.setHex(0xaaaaaa);
                }
            }
        } else {
            for(let t of this.floorTiles) t.material.color.setHex(0xffffff);
        }
    }

    syncKatamariConsumption(seekerGroup, currentAvatarScale, katamariState, time) {
        // Simple logic mirror based on collision absorption math
        if(katamariState && katamariState.hasCollision) {
            seekerGroup.rotation.y += 0.5; // Bump
            const bumpMat = new THREE.MeshBasicMaterial({color: 0xff0000, wireframe:true});
            for(let c of this.cadObjects) {
                if(c.material !== bumpMat) c.userData.originalMaterial = c.material;
                c.material = bumpMat;
            }
        } else {
            for(let c of this.cadObjects) {
                if(c.userData.originalMaterial) c.material = c.userData.originalMaterial;
            }
        }
    }
}
