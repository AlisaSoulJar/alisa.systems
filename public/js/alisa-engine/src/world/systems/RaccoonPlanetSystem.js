import * as THREE from 'three';

/**
 * RaccoonPlanetSystem
 * Headless ECS engine for Raccoon Planet orbit, power drain, and satellite mechanics.
 */
export class RaccoonPlanetSystem {
    constructor(params = {}) {
        this.satellite = null;
        this.planetGroup = null;
        this.radius = params.radius || 15;
        this.fuel = 100;
        this.playing = false;
        
        this.onPowerDrain = null; // Callback setup by UI
    }
    
    init(satelliteObj, planetGroupObj) {
        this.satellite = satelliteObj;
        this.planetGroup = planetGroupObj;
        this.fuel = 100;
        this.playing = true;
    }

    update(dt, elapsedTime) {
        if (!this.playing || !this.planetGroup) return;
        
        // Planet slow rotation
        this.planetGroup.rotation.y += dt * 0.02;
        
        // Passive fuel drain (satellite power)
        this.fuel -= dt * 0.8;
        if (this.fuel <= 0) {
            this.fuel = 0;
            this.playing = false;
            if (this.onPowerDrain) this.onPowerDrain();
        }

        // Satellite orbit mechanics
        if (this.satellite) {
            const t = elapsedTime * 0.3; // Using absolute elapsedTime for smooth orbits
            this.satellite.position.set(
                Math.cos(t) * (this.radius + 8),
                Math.sin(t * 0.7) * 3 + 5,
                Math.sin(t) * (this.radius + 8)
            );
            this.satellite.lookAt(0, 0, 0);
        }
    }
}
