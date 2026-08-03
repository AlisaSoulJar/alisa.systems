import * as THREE from 'three';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';
import { AssetManager } from '../../soma/AssetManager.js';

export class AsteroidsFactory extends BaseEnvironmentFactory {
    constructor(scene, camera) {
        super(scene, null);
        this.camera = camera;
        
        this.modelShip = null;
        this.modelDrone = null;
        this.rockModels = [];
        
        this.decorStars = [];
        this.particles = [];
        
        this.gridGroup = new THREE.Group();
        this.scene.add(this.gridGroup);
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * ASÍNCRONA: carga GLBs antes de montar la rejilla. Hay que esperarla:
     *     await fab.buildAll({ arenaW: 40, arenaH: 25 });
     * Después es un espejo puro: los createXxxVisual() los pide el sistema.
     */
    async buildAll(c = {}) {
        await this.loadAssets();
        this.buildArenaGrid(c.arenaW ?? 40, c.arenaH ?? 25);
        return { grid: this.grid ?? null };
    }

    async loadAssets() {
        try {
            try {
                const shipGltf = await AssetManager.loadModelAsync('../props/models/Spaceship (1).glb');
                this.modelShip = shipGltf.scene;
                this.modelShip.scale.set(0.6, 0.6, 0.6);
                this.modelShip.traverse(m => { 
                    if(m.isMesh) { 
                        m.castShadow = true; 
                        m.material = m.material.clone(); 
                        m.material.emissive = new THREE.Color(0x00aaff); 
                        m.material.emissiveIntensity = 0.4; 
                    }
                });
            } catch(e) {
                this.modelShip = new THREE.Group();
                const fallbackMesh = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 8), new THREE.MeshStandardMaterial({color: 0x00aaff}));
                fallbackMesh.rotation.x = Math.PI / 2;
                this.modelShip.add(fallbackMesh);
            }
            
            try {
                const droneGltf = await AssetManager.loadModelAsync('../props/models/Robot Enemy Flying.glb');
                this.modelDrone = droneGltf.scene;
                this.modelDrone.scale.set(0.4, 0.4, 0.4);
                this.modelDrone.traverse(m => { if(m.isMesh) m.castShadow = true; });
            } catch(e) {
                this.modelDrone = new THREE.Group();
                const droneCore = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshStandardMaterial({color: 0xff1111}));
                this.modelDrone.add(droneCore);
            }
            
            for(let i=1; i<=7; i++) {
                try {
                    const rockGltf = await AssetManager.loadModelAsync(`../props/models/Rock_${i}.glb`);
                    let r = rockGltf.scene;
                    r.traverse(m => { 
                        if(m.isMesh) { 
                            m.castShadow = true; 
                            m.material = Math.random() > 0.5 ? m.material.clone() : new THREE.MeshStandardMaterial({color:0x555555, roughness:0.9}); 
                        }
                    });
                    this.rockModels.push(r);
                } catch (e) {
                    // Fallback
                }
            }
        } catch(e) {
            console.error("AsteroidsFactory Asset Load Error:", e);
        }
    }

    buildArenaGrid(arenaW, arenaH) {
        for(let i=0; i<10; i++) {
            let gh = new THREE.GridHelper(arenaW, 10, 0x112244, 0x111122);
            gh.position.set(0, -arenaH/2, i * 20);
            this.gridGroup.add(gh);
        }
    }

    createShipVisual() {
        if (!this.modelShip) return null;
        let ship = this.modelShip.clone();
        
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({color:0x00ffff, transparent:true, opacity:0.8}));
        glow.position.z = 1.5; 
        ship.add(glow);

        const shield = new THREE.Mesh(new THREE.SphereGeometry(3.0, 16, 16), new THREE.MeshBasicMaterial({color:0x88ccff, wireframe:true, transparent:true, opacity:0}));
        ship.add(shield);
        
        ship.userData = { glow, shieldMesh: shield };
        this.scene.add(ship);
        return ship;
    }

    createAsteroidVisual(type, sz) {
        if(this.rockModels.length === 0) return null;
        
        let model = this.rockModels[Math.floor(Math.random() * this.rockModels.length)];
        let mesh = model.clone();
        
        let scale = sz === 3 ? 4.5 : sz === 2 ? 2.5 : 1.2;
        mesh.scale.copy(model.scale).multiplyScalar(scale);
        
        if(mesh.children && mesh.children.length > 0 && mesh.children[0].material) {
            let mmat = mesh.children[0].material.clone();
            const cols = { BASIC: 0x887766, FAST: 0x3366ff, GOLD: 0xffdd22 };
            mmat.color.set(cols[type] || 0x887766);
            if(type === 'FAST') { mmat.emissive.set(0x1133aa); mmat.emissiveIntensity=0.5; }
            if(type === 'GOLD') { mmat.emissive.set(0xaa7700); mmat.emissiveIntensity=0.6; }
            mesh.children[0].material = mmat;
        }
        
        this.scene.add(mesh);
        return mesh;
    }

    createMonoWallVisual(arenaH) {
        const geo = new THREE.BoxGeometry(8, arenaH * 1.5, 8);
        const mat = new THREE.MeshStandardMaterial({color: 0x221111, roughness: 0.5});
        let mesh = new THREE.Mesh(geo, mat);
        
        const glow = new THREE.Mesh(new THREE.BoxGeometry(8.5, arenaH * 1.5, 8.5), new THREE.MeshBasicMaterial({color:0xff0000, wireframe:true, transparent:true, opacity:0.8}));
        mesh.add(glow);
        mesh.userData = { glow: glow };
        
        this.scene.add(mesh);
        return mesh;
    }

    createDroneVisual(typeDef) {
        if(!this.modelDrone) return null;
        let m = this.modelDrone.clone();
        
        if(m.children && m.children.length > 0 && m.children[0].material) {
            let mat = m.children[0].material.clone(); 
            mat.emissive.setHex(typeDef.c || 0xff1111); 
            m.children[0].material = mat;
        }
        
        this.scene.add(m);
        return m;
    }

    createProjectileVisual(type, col) {
        let m = new THREE.Mesh(new THREE.CylinderGeometry(type==='rocket'?0.6:0.2, type==='rocket'?0.6:0.2, type==='rocket'?1.5:3), new THREE.MeshBasicMaterial({color:col}));
        m.rotation.x = Math.PI/2; 
        this.scene.add(m);
        return m;
    }

    createItemVisual(type) {
        let mesh;
        if (type === 'CAPSULE') {
            mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,1.5), new THREE.MeshStandardMaterial({color:0xff2222, emissive:0xff0000, emissiveIntensity:0.5}));
        } else {
            mesh = new THREE.Mesh(new THREE.ConeGeometry(1,1.5,8), new THREE.MeshStandardMaterial({color:0xffff33, emissive:0xaa8800, emissiveIntensity:0.8}));
        }
        this.scene.add(mesh);
        return mesh;
    }

    spawnParticles(pos, color, count, speed=1) {
        const geo = new THREE.BufferGeometry();
        const posArr = new Float32Array(count * 3);
        const vels = [];
        for(let i=0; i<count; i++) {
            posArr[i*3] = pos.x; posArr[i*3+1] = pos.y; posArr[i*3+2] = pos.z;
            vels.push(new THREE.Vector3((Math.random()-0.5)*20*speed, (Math.random()-0.5)*20*speed, (Math.random()-0.5)*20*speed));
        }
        geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        const p = new THREE.Points(geo, new THREE.PointsMaterial({color, size: 0.5+Math.random(), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false}));
        p.userData = { vels, life: 1.0 };
        this.scene.add(p); 
        this.particles.push(p);
    }
    
    syncParticles(dt) {
        for(let i=this.particles.length-1; i>=0; i--) {
            let p = this.particles[i]; 
            p.userData.life -= dt;
            const arr = p.geometry.attributes.position.array; 
            const vs = p.userData.vels;
            for(let j=0; j<vs.length; j++) { 
                arr[j*3] += vs[j].x*dt; 
                arr[j*3+1] += vs[j].y*dt; 
                arr[j*3+2] += vs[j].z*dt; 
            }
            p.geometry.attributes.position.needsUpdate = true; 
            p.material.opacity = p.userData.life;
            if(p.userData.life <= 0) {
                this.scene.remove(p); 
                this.particles.splice(i,1);
            }
        }
    }
    
    syncGrid(globalZ) {
        this.gridGroup.position.z = -(globalZ % 20);
    }
}
