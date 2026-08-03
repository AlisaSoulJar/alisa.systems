import * as THREE from 'three';
import { BaseEnvironmentFactory } from '../core/BaseEnvironmentFactory.js';

export class ColonialControlRoomFactory extends BaseEnvironmentFactory {
    constructor(scene) {
        super(scene, null);
        this.roomGroup = new THREE.Group();
        this.scene.add(this.roomGroup);
        
        this.dimensions = { w: 32, d: 24, h: 8 };
    }
    
    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Sala de una sola pieza. Los pilares de neón los coloca buildRoom.
     * Para anclar avatares usa después getSocketTransform(nombre).
     */
    buildAll(c = {}) {
        this.buildRoom(c.darkMode ?? true);
        return { room: this.roomGroup ?? this.group ?? null, sockets: this.sockets ?? null };
    }

    buildRoom(isDarkMode = true) {
        // Clear previous if any
        while(this.roomGroup.children.length > 0){ 
            this.roomGroup.remove(this.roomGroup.children[0]); 
        }

        const { w, d, h } = this.dimensions;
        
        const wM = new THREE.MeshStandardMaterial({
            color: isDarkMode ? 0xaab0bb : 0xeef2f5, // Light laboratory tones
            roughness: 0.7,
            metalness: 0.1
        });
        
        const fM = new THREE.MeshStandardMaterial({
            color: isDarkMode ? 0x889099 : 0xd3d8df, // Very light grid floor
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Floor
        const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), fM); 
        f.rotation.x = -Math.PI/2; 
        f.receiveShadow = true; 
        this.roomGroup.add(f);
        
        // Grid over floor
        const grid = new THREE.GridHelper(w, w/2, 0x00ffcc, 0x334455);
        grid.position.y = 0.01;
        grid.material.opacity = 0.15;
        grid.material.transparent = true;
        this.roomGroup.add(grid);
        
        // Universal Hangar Lighting
        const dLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dLight.position.set(20, h + 10, -10);
        dLight.castShadow = true;
        dLight.shadow.camera.left = -w/2;
        dLight.shadow.camera.right = w/2;
        dLight.shadow.camera.top = d/2;
        dLight.shadow.camera.bottom = -d/2;
        this.roomGroup.add(dLight);
        
        const aLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.roomGroup.add(aLight);
        
        // Ceiling
        const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({color:0x050508, roughness:0.9})); 
        c.rotation.x = Math.PI/2; 
        c.position.y = h; 
        this.roomGroup.add(c);
        
        // Back Wall (North)
        const bW = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wM); 
        bW.position.set(0, h/2, -d/2); 
        bW.receiveShadow = true;
        this.roomGroup.add(bW);
        
        // Front Wall (South)
        const sW = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wM); 
        sW.rotation.y = Math.PI;
        sW.position.set(0, h/2, d/2); 
        sW.receiveShadow = true;
        this.roomGroup.add(sW);
        
        // Left Wall (West)
        const lW = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wM); 
        lW.rotation.y = Math.PI/2; 
        lW.position.set(-w/2, h/2, 0); 
        lW.receiveShadow = true;
        this.roomGroup.add(lW);
        
        // Right Wall (East)
        const rW = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wM); 
        rW.rotation.y = -Math.PI/2; 
        rW.position.set(w/2, h/2, 0); 
        rW.receiveShadow = true;
        this.roomGroup.add(rW);
        
        // Neon pillars
        this.addNeonPillar(-w/2 + 0.5, -d/2 + 0.5, h);
        this.addNeonPillar(w/2 - 0.5, -d/2 + 0.5, h);
        this.addNeonPillar(-w/2 + 0.5, d/2 - 0.5, h);
        this.addNeonPillar(w/2 - 0.5, d/2 - 0.5, h);
    }
    
    addNeonPillar(x, z, h) {
        const pillarGeo = new THREE.BoxGeometry(1.5, h, 1.5);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(x, h/2, z);
        pillar.receiveShadow = true;
        pillar.castShadow = true;
        
        const coreGeo = new THREE.BoxGeometry(0.3, h, 0.3);
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 2.0 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        pillar.add(core);
        
        const plight = new THREE.PointLight(0x00ffcc, 1.0, 15);
        plight.position.set(0, 0, 1.5);
        pillar.add(plight);
        
        this.roomGroup.add(pillar);
    }

    getSocketTransform(name) {
        const { w, d, h } = this.dimensions;
        switch(name) {
            case 'north-wall': return { position: new THREE.Vector3(0, h/2, -d/2 + 0.2), rotation: new THREE.Euler(0, 0, 0) };
            case 'west-wall':  return { position: new THREE.Vector3(-w/2 + 0.2, h/2 - 1, 0), rotation: new THREE.Euler(0, Math.PI/2, 0) };
            case 'east-wall':  return { position: new THREE.Vector3(w/2 - 0.2, h/2 - 1, 0), rotation: new THREE.Euler(0, -Math.PI/2, 0) };
            case 'center':     return { position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) };
            default: return { position: new THREE.Vector3(0,0,0), rotation: new THREE.Euler(0,0,0) };
        }
    }
}
