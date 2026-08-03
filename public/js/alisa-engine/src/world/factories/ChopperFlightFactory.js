import * as THREE from 'three';

export class ChopperFlightFactory {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.buildings = [];
        this.projectiles = [];
        this.chopperGroup = null;
        this.rotorMesh = null;
        this.vel = new THREE.Vector3();
        this.rotVel = new THREE.Vector3();
        this.targetsRemaining = 3;
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Levanta el entorno completo en el orden correcto: ciudad → helipuerto → helicóptero.
     *     const fab = new ChopperFlightFactory(scene, camera);
     *     fab.buildAll({ citySize: 600, buildings: 120 });
     */
    buildAll(c = {}) {
        this.buildCity(c.citySize ?? 1000, c.buildings ?? 150);
        this.buildHelipad();
        this.buildChopper();
        return { city: this.city ?? null, helipad: this.helipad ?? null, chopper: this.chopper ?? null };
    }

    /** Tick estándar: delega en la física del aparato. */
    update(dt, keys = {}) { this.updatePhysics(dt, keys); }

    buildCity(citySize = 1000, numBuildings = 150) {
        const bMat = new THREE.MeshStandardMaterial({color: 0x334455, roughness: 0.8, metalness: 0.2});
        for (let i = 0; i < numBuildings; i++) {
            const width = Math.random() * 20 + 10;
            const depth = Math.random() * 20 + 10;
            const height = Math.random() * 60 + 20; 
            const bGeo = new THREE.BoxGeometry(width, height, depth);
            const bMesh = new THREE.Mesh(bGeo, bMat);
            bMesh.position.set(
                (Math.random() - 0.5) * citySize,
                height / 2,
                (Math.random() - 0.5) * citySize
            );
            bMesh.castShadow = true;
            bMesh.receiveShadow = true;
            this.scene.add(bMesh);
            this.buildings.push(bMesh);
        }
    }

    buildHelipad() {
        const hMat = new THREE.MeshStandardMaterial({color: 0x222222, roughness: 0.9});
        const helipad = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 1, 32), hMat);
        helipad.position.set(0, 0.5, 0);
        helipad.receiveShadow = true;
        this.scene.add(helipad);
        
        const hLine = new THREE.Mesh(new THREE.RingGeometry(10, 11, 32), new THREE.MeshBasicMaterial({color: 0xffff00}));
        hLine.rotation.x = -Math.PI / 2;
        hLine.position.y = 1.01;
        this.scene.add(hLine);
    }

    buildChopper() {
        this.chopperGroup = new THREE.Group();
        this.chopperGroup.position.y = 1;
        this.scene.add(this.chopperGroup);

        const bodyGeo = new THREE.BoxGeometry(2, 3, 6);
        const chopperMat = new THREE.MeshStandardMaterial({color: 0x1133aa, roughness: 0.3, metalness: 0.7});
        const bodyMesh = new THREE.Mesh(bodyGeo, chopperMat);
        bodyMesh.castShadow = true;
        this.chopperGroup.add(bodyMesh);

        const rotorGeo = new THREE.BoxGeometry(0.2, 8, 0.2);
        this.rotorMesh = new THREE.Mesh(rotorGeo, new THREE.MeshStandardMaterial({color: 0x111111}));
        this.rotorMesh.position.y = 1.6;
        this.rotorMesh.rotation.z = Math.PI/2;
        this.chopperGroup.add(this.rotorMesh);
        
        const tailGeo = new THREE.BoxGeometry(0.5, 1, 4);
        const tailMesh = new THREE.Mesh(tailGeo, chopperMat);
        tailMesh.position.set(0, 0.5, -4);
        this.chopperGroup.add(tailMesh);
    }

    fireProjectile() {
        if (!this.chopperGroup) return;
        
        const pGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const pMat = new THREE.MeshBasicMaterial({color: 0xffaa00});
        const p = new THREE.Mesh(pGeo, pMat);
        
        // Spawn at front of chopper
        p.position.copy(this.chopperGroup.position);
        const offset = new THREE.Vector3(0, 0, 4).applyQuaternion(this.chopperGroup.quaternion);
        p.position.add(offset);
        
        // Firing vector
        const pVel = new THREE.Vector3(0, 0, 150).applyQuaternion(this.chopperGroup.quaternion);
        
        this.scene.add(p);
        this.projectiles.push({ mesh: p, vel: pVel, age: 0 });
    }

    updatePhysics(dt, keys) {
        if(!this.chopperGroup) return { alt: 0, spd: 0, tgt: 0 };
        
        const liftForce = (keys[' '] ? 20 : 0) - (keys['shift'] ? 20 : 0);
        
        // Pitch/Roll
        if (keys.w) this.rotVel.x += 2 * dt;
        if (keys.s) this.rotVel.x -= 2 * dt;
        if (keys.a) this.rotVel.z += 2 * dt;
        if (keys.d) this.rotVel.z -= 2 * dt;
        
        // Yaw
        if (keys.q) this.rotVel.y += 2 * dt;
        if (keys.e) this.rotVel.y -= 2 * dt;
        
        // Damping
        this.rotVel.multiplyScalar(0.95);
        
        this.chopperGroup.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, this.chopperGroup.rotation.x + this.rotVel.x * dt));
        this.chopperGroup.rotation.y += this.rotVel.y * dt;
        this.chopperGroup.rotation.z = Math.max(-Math.PI/4, Math.min(Math.PI/4, this.chopperGroup.rotation.z + this.rotVel.z * dt));

        if (!keys.w && !keys.s) this.chopperGroup.rotation.x *= 0.98;
        if (!keys.a && !keys.d) this.chopperGroup.rotation.z *= 0.98;

        const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(this.chopperGroup.quaternion);
        this.vel.y -= 9.8 * dt; // Gravity
        this.vel.addScaledVector(upVector, ((keys[' '] ? 30 : 9.8)) * dt);

        if (this.chopperGroup.position.y <= 1) {
            this.chopperGroup.position.y = 1;
            this.vel.y = Math.max(0, this.vel.y);
            this.vel.x *= 0.9;
            this.vel.z *= 0.9;
        }

        this.chopperGroup.position.addScaledVector(this.vel, dt);
        this.rotorMesh.rotation.y -= (10 + Math.abs(liftForce)) * dt;
        
        // Camera follow
        const camTarget = this.chopperGroup.position.clone();
        const camOffset = new THREE.Vector3(0, 15, -30).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), this.chopperGroup.rotation.y));
        this.camera.position.lerp(camTarget.add(camOffset), 0.1);
        this.camera.lookAt(this.chopperGroup.position);

        // Projectiles update
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.mesh.position.addScaledVector(p.vel, dt);
            p.age += dt;
            
            let hit = false;
            for (const b of this.buildings) {
                const box = new THREE.Box3().setFromObject(b);
                if (box.containsPoint(p.mesh.position)) {
                    hit = true;
                    b.material.color.setHex(0xff0000);
                    setTimeout(() => b.material.color.setHex(0x334455), 200);
                    break;
                }
            }

            if (p.age > 4 || hit) {
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
            }
        }
        
        return {
            alt: this.chopperGroup.position.y,
            spd: this.vel.length(),
            tgt: this.targetsRemaining
        };
    }
}
