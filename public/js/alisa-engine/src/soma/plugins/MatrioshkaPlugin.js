import * as THREE from 'three';
import { AssetManager } from '../AssetManager.js';

export class MatrioshkaPlugin {
    constructor(scene) {
        this.scene = scene;
        
        this.isMatrioshkaMode = false;
        this.player = null;
        this.currentTierSize = 1;
        this.speed = 0.05;
        this.suits = [];
        this.keys = { w:false, a:false, s:false, d:false };
        
        this.mechMaster = null;
        
        // Tier Definitions (Size)
        this.tiers = [0.25, 0.5, 1.0, 2.0, 4.0, 8.0, 20.0];
        this.colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x00ffff, 0x0000ff, 0xff00ff];
        
        this.onAbsorption = null; // Callback for UI or Camera
    }

    async boot() {
        return new Promise((resolve) => {
            AssetManager.loadModelAsync('../props/models/mech_robot.glb').then((scene) => {
                this.mechMaster = scene;
                this.playMatrioshka();
                resolve();
            }).catch((e) => {
                console.error("ERROR LOADING MECH_ROBOT.GLB", e);
                // Fallback mechanics work without it
                this.playMatrioshka();
                resolve();
            });
        });
    }

    createMechPlayer(size, color, x, z) {
        let mesh;
        if(this.mechMaster) {
            mesh = this.mechMaster.clone();
            mesh.scale.set(size, size, size);
            mesh.traverse(c => {
                if(c.isMesh) c.material = new THREE.MeshLambertMaterial({color: color});
            });
            mesh.position.set(x, 0, z);
        } else {
            const geo = new THREE.BoxGeometry(size, size*2, size);
            const mat = new THREE.MeshLambertMaterial({color: color});
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, size, z);
        }
        
        this.scene.add(mesh);
        return { mesh: mesh, size: size, tier: size };
    }

    playMatrioshka() {
        this.isMatrioshkaMode = true;
        
        if(this.player) this.scene.remove(this.player.mesh);
        this.suits.forEach(s => this.scene.remove(s.mesh));
        this.suits.length = 0;
        
        this.player = this.createMechPlayer(this.tiers[0], this.colors[0], 0, 0);
        this.currentTierSize = this.tiers[0];
        this.speed = this.currentTierSize * 0.1;
        
        let accumZ = -5; 
        for(let i=1; i<this.tiers.length; i++) {
            accumZ -= (this.tiers[i-1] * 15);
            if(i === 1) accumZ -= 5;
            const suit = this.createMechPlayer(this.tiers[i], this.colors[i], 0, accumZ);
            this.suits.push(suit);
        }
        
        if(this.onAbsorption) this.onAbsorption(this.currentTierSize, this.player);
    }

    handleKeyDown(keyStr) {
        const k = keyStr.toLowerCase();
        if(k === 'w') this.keys.w = true;
        if(k === 's') this.keys.s = true;
        if(k === 'a') this.keys.a = true;
        if(k === 'd') this.keys.d = true;
    }

    handleKeyUp(keyStr) {
        const k = keyStr.toLowerCase();
        if(k === 'w') this.keys.w = false;
        if(k === 's') this.keys.s = false;
        if(k === 'a') this.keys.a = false;
        if(k === 'd') this.keys.d = false;
    }

    tick(dt) {
        if(!this.isMatrioshkaMode || !this.player) return;
        
        // Minimalistic WASD movement using delta time
        const tSpeed = this.speed * dt * 60; 
        if(this.keys.w) this.player.mesh.position.z -= tSpeed;
        if(this.keys.s) this.player.mesh.position.z += tSpeed;
        if(this.keys.a) this.player.mesh.position.x -= tSpeed;
        if(this.keys.d) this.player.mesh.position.x += tSpeed;
        
        // Check collisions against suits
        for(let i=this.suits.length-1; i>=0; i--) {
            const suit = this.suits[i];
            const dist = this.player.mesh.position.distanceTo(suit.mesh.position);
            
            if(dist < (this.player.size + suit.size) * 0.8) {
                // ABSORPTION EVENT
                this.scene.remove(this.player.mesh); 
                this.player = suit; 
                this.suits.splice(i, 1); 
                
                this.currentTierSize = this.player.size;
                this.speed = this.currentTierSize * 0.1; 
                
                // Visual Hack -> Emulate Glitch
                const originalColor = this.player.mesh.material.color.getHex();
                this.player.mesh.material.color.setHex(0xffffff);
                setTimeout(() => this.player.mesh.material.color.setHex(originalColor), 100);
                setTimeout(() => this.player.mesh.material.color.setHex(0xffffff), 200);
                setTimeout(() => this.player.mesh.material.color.setHex(originalColor), 300);
                
                if(this.onAbsorption) this.onAbsorption(this.currentTierSize, this.player);
            }
        }
    }
}
