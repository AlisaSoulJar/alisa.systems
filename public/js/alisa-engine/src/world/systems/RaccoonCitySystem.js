import * as THREE from 'three';

/**
 * RaccoonCitySystem
 * Headless ECS engine for Raccoon City Sector drone physics and power drain.
 */
export class RaccoonCitySystem {
    constructor(params = {}) {
        this.maxSpeed = params.maxSpeed || 60;
        this.fuel = 100;
        this.playing = false;
        
        this.droneRoot = null;
        this.droneInner = null;
        this.droneVelocity = new THREE.Vector3();
        this.propellers = [];
        this.volBeam = null;

        this.keys = {};
        this.onPowerDrain = null; // Callback
    }
    
    init(droneRoot, droneInner, propellers, volBeam) {
        this.droneRoot = droneRoot;
        this.droneInner = droneInner;
        this.propellers = propellers;
        this.volBeam = volBeam;
        this.droneVelocity.set(0, 0, 0);
        this.fuel = 100;
        this.playing = true;
    }

    setKeys(keysObj) {
        this.keys = keysObj;
    }

    update(dt) {
        if (!this.playing || !this.droneRoot) return;
        
        // Input → velocity
        const thrust = new THREE.Vector3();
        if (this.keys['w'] || this.keys['arrowup']) thrust.z = -1;
        if (this.keys['s'] || this.keys['arrowdown']) thrust.z = 1;
        if (this.keys['a'] || this.keys['arrowleft']) thrust.x = -1;
        if (this.keys['d'] || this.keys['arrowright']) thrust.x = 1;
        if (this.keys['q']) thrust.y = 1;
        if (this.keys['e']) thrust.y = -1;
        
        if (thrust.lengthSq() > 0) {
            this.droneVelocity.add(thrust.normalize().multiplyScalar(35 * dt));
        }
        
        // Damping
        this.droneVelocity.multiplyScalar(0.97);
        if (this.droneVelocity.length() > this.maxSpeed * dt) {
            this.droneVelocity.setLength(this.maxSpeed * dt);
        }
        
        this.droneRoot.position.add(this.droneVelocity);
        this.droneRoot.position.y = Math.max(5, this.droneRoot.position.y); // Floor collision
        
        // Tilt animation
        this.droneInner.rotation.z = THREE.MathUtils.lerp(this.droneInner.rotation.z, -this.droneVelocity.x * 2, 5 * dt);
        this.droneInner.rotation.x = THREE.MathUtils.lerp(this.droneInner.rotation.x, this.droneVelocity.z * 2, 5 * dt);
        
        // Battery drain
        this.fuel -= dt * 1.5;
        if (this.fuel <= 0) {
            this.fuel = 0;
            this.playing = false;
            if (this.onPowerDrain) this.onPowerDrain();
        }
        
        // Beam scale
        const beamDist = this.droneRoot.position.y;
        const beamRadius = beamDist * Math.tan(Math.PI / 8);
        this.volBeam.scale.set(beamRadius, beamDist, beamRadius);

        // Propeller spin (visual)
        this.propellers.forEach((p, i) => { 
            p.rotation.y += (20) * dt; 
        });
    }
}
