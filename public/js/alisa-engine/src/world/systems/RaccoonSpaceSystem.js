import * as THREE from 'three';

/**
 * RaccoonSpaceSystem
 * Headless ECS engine for the ¡Busca! saga's orbit kinematics, fuel drain, and collisions.
 */
export class RaccoonSpaceSystem {
    constructor(params = {}) {
        this.maxSpeed = params.maxSpeed || 100;
        this.accel = params.accel || 60;
        this.drag = params.drag || 0.98;
        this.turnSpeed = params.turnSpeed || 2.0;
        
        this.ship = null;
        this.shipGlow = null;
        this.shipVelocity = new THREE.Vector3();
        this.asteroids = [];
        this.tankSize = params.tankSize || 400;
        
        this.fuel = 100;
        this.score = 0;
        this.keys = {};
        
        this.onCollision = null; // Callback setup by UI
        this.onFuelDrain = null; // Callback setup by UI
    }
    
    init(shipObj, shipGlow, asteroidsList) {
        this.ship = shipObj;
        this.shipGlow = shipGlow;
        this.asteroids = asteroidsList;
        this.shipVelocity.set(0,0,0);
        this.fuel = 100;
    }

    setKeys(keysObj) {
        this.keys = keysObj;
    }
    
    update(dt) {
        if (!this.ship) return;
        
        // Flight Controls
        if (this.keys['a']) this.ship.rotateY(this.turnSpeed * dt);
        if (this.keys['d']) this.ship.rotateY(-this.turnSpeed * dt);
        if (this.keys['q']) this.ship.rotateX(this.turnSpeed * dt);
        if (this.keys['e']) this.ship.rotateX(-this.turnSpeed * dt);
        
        if (this.keys['w']) {
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.ship.quaternion);
            this.shipVelocity.add(forward.multiplyScalar(this.accel * dt));
            if (this.shipGlow) this.shipGlow.material.opacity = 1.0;
            this.fuel -= dt * 2; // Thrust uses fuel
        } else {
            if (this.shipGlow) this.shipGlow.material.opacity = 0.2;
        }
        if (this.keys['s']) {
            const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.ship.quaternion);
            this.shipVelocity.add(backward.multiplyScalar(this.accel * dt));
            this.fuel -= dt * 2; 
        }

        // Apply drag & velocity
        this.shipVelocity.multiplyScalar(this.drag);
        if (this.shipVelocity.length() > this.maxSpeed) {
            this.shipVelocity.setLength(this.maxSpeed);
        }
        this.ship.position.add(this.shipVelocity.clone().multiplyScalar(dt));
        
        // Bounce off walls
        const bound = (this.tankSize / 2) - 5;
        if (this.ship.position.x > bound) { this.ship.position.x = bound; this.shipVelocity.x *= -0.5; }
        if (this.ship.position.x < -bound) { this.ship.position.x = -bound; this.shipVelocity.x *= -0.5; }
        if (this.ship.position.y > bound) { this.ship.position.y = bound; this.shipVelocity.y *= -0.5; }
        if (this.ship.position.y < -bound) { this.ship.position.y = -bound; this.shipVelocity.y *= -0.5; }
        if (this.ship.position.z > bound) { this.ship.position.z = bound; this.shipVelocity.z *= -0.5; }
        if (this.ship.position.z < -bound) { this.ship.position.z = -bound; this.shipVelocity.z *= -0.5; }

        // Asteroid movement & collision
        this.asteroids.forEach(a => {
            a.mesh.position.add(a.vel.clone().multiplyScalar(dt));
            a.mesh.rotation.x += a.rotVel.x * dt;
            a.mesh.rotation.y += a.rotVel.y * dt;
            
            // Wrap asteroids around edges
            if(a.mesh.position.x > bound+20) a.mesh.position.x = -bound;
            if(a.mesh.position.x < -bound-20) a.mesh.position.x = bound;
            if(a.mesh.position.y > bound+20) a.mesh.position.y = -bound;
            if(a.mesh.position.y < -bound-20) a.mesh.position.y = bound;
            if(a.mesh.position.z > bound+20) a.mesh.position.z = -bound;
            if(a.mesh.position.z < -bound-20) a.mesh.position.z = bound;
            
            // Player collision
            if(a.mesh.position.distanceTo(this.ship.position) < 5) {
                // Bounce and damage
                const push = this.ship.position.clone().sub(a.mesh.position).normalize();
                this.shipVelocity.add(push.multiplyScalar(50)); 
                a.vel.sub(push.multiplyScalar(10));
                this.fuel -= 5;
                if (this.onCollision) this.onCollision();
            }
        });

        // Passive fuel drain
        this.fuel -= dt * 0.5;
        if (this.fuel <= 0) {
            if (this.onFuelDrain) this.onFuelDrain();
        }
    }
}
