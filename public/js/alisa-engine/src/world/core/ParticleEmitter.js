import * as THREE from 'three';

/**
 * ParticleEmitter — Unified Particle System
 * ==========================================
 * Pooled buffer-geometry particle system with automatic lifecycle
 * management. Replaces inline particle code in Cucco (death/damage FX),
 * Aquarium (plankton dust), and Raccoon (star fields).
 *
 * Supports two modes:
 *   1. Burst (emit once, fade, die) — kill FX, damage sparks
 *   2. Ambient (continuous loop, wrapping) — dust, plankton, stars
 *
 * Usage:
 *   const emitter = new ParticleEmitter(600, { mode: 'burst' });
 *   scene.add(emitter.mesh);
 *   emitter.emit(x, y, z, 0xff4444, 15, 6); // burst at position
 *   // In render loop:
 *   emitter.tick(dt);
 */
export class ParticleEmitter {
    /**
     * @param {number} maxCount - Maximum simultaneous particles
     * @param {Object} config
     * @param {string} [config.mode='burst'] - 'burst' | 'ambient'
     * @param {number} [config.size=0.25] - Point size
     * @param {boolean} [config.additive=true] - Use additive blending
     * @param {THREE.Vector3} [config.bounds] - Wrapping bounds for ambient mode
     */
    constructor(maxCount = 600, config = {}) {
        this.maxCount = maxCount;
        this.mode = config.mode || 'burst';

        // Buffers
        this._positions = new Float32Array(maxCount * 3);
        this._colors = new Float32Array(maxCount * 3);
        this._velocities = new Float32Array(maxCount * 3);
        this._lifetimes = new Float32Array(maxCount);
        this._activeCount = 0;

        // Ambient bounds (for wrapping)
        this._bounds = config.bounds || null;

        // Three.js geometry
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(this._colors, 3));

        const mat = new THREE.PointsMaterial({
            size: config.size || 0.25,
            vertexColors: true,
            transparent: true,
            opacity: config.opacity || 0.8,
            blending: config.additive !== false ? THREE.AdditiveBlending : THREE.NormalBlending,
            depthWrite: false
        });

        this.mesh = new THREE.Points(geo, mat);
    }

    /**
     * Emit a burst of particles at a world position.
     * Only meaningful in 'burst' mode.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number|THREE.Color} color - Hex color or Color instance
     * @param {number} count - Number of particles to emit
     * @param {number} force - Velocity magnitude
     */
    emit(x, y, z, color, count = 12, force = 5) {
        const c = color instanceof THREE.Color ? color : new THREE.Color(color);

        for (let i = 0; i < count && this._activeCount < this.maxCount; i++) {
            const idx = this._activeCount;
            const i3 = idx * 3;

            this._positions[i3] = x;
            this._positions[i3 + 1] = y;
            this._positions[i3 + 2] = z;

            this._colors[i3] = c.r;
            this._colors[i3 + 1] = c.g;
            this._colors[i3 + 2] = c.b;

            this._velocities[i3] = (Math.random() - 0.5) * force;
            this._velocities[i3 + 1] = Math.random() * force * 0.7;
            this._velocities[i3 + 2] = (Math.random() - 0.5) * force;

            this._lifetimes[idx] = 0.6 + Math.random() * 0.4;

            this._activeCount++;
        }
    }

    /**
     * Initialize ambient particles within bounds.
     * Only meaningful in 'ambient' mode.
     * @param {number} count
     * @param {number|THREE.Color} color
     * @param {Object} speedConfig - { x, y, z } max speeds
     */
    fillAmbient(count, color, speedConfig = { x: 0.5, y: 0.5, z: 0.5 }) {
        const c = color instanceof THREE.Color ? color : new THREE.Color(color);
        const b = this._bounds;
        if (!b) throw new Error('ParticleEmitter: bounds required for ambient mode');

        const actual = Math.min(count, this.maxCount);
        this._activeCount = actual;

        for (let i = 0; i < actual; i++) {
            const i3 = i * 3;
            this._positions[i3] = (Math.random() - 0.5) * b.x;
            this._positions[i3 + 1] = Math.random() * b.y;
            this._positions[i3 + 2] = (Math.random() - 0.5) * b.z;

            this._colors[i3] = c.r;
            this._colors[i3 + 1] = c.g;
            this._colors[i3 + 2] = c.b;

            this._velocities[i3] = (Math.random() - 0.5) * speedConfig.x;
            this._velocities[i3 + 1] = Math.random() * speedConfig.y + 0.1;
            this._velocities[i3 + 2] = (Math.random() - 0.5) * speedConfig.z;

            this._lifetimes[i] = Infinity; // Ambient never dies
        }
    }

    /**
     * Update particle physics. Call each frame.
     * @param {number} dt - Delta time in seconds
     */
    tick(dt) {
        if (this.mode === 'burst') {
            this._tickBurst(dt);
        } else {
            this._tickAmbient(dt);
        }

        // Update GPU buffers
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.geometry.attributes.color.needsUpdate = true;
        this.mesh.geometry.setDrawRange(0, this._activeCount);
    }

    _tickBurst(dt) {
        for (let i = this._activeCount - 1; i >= 0; i--) {
            this._lifetimes[i] -= dt;
            if (this._lifetimes[i] <= 0) {
                // Swap-remove with last active
                this._activeCount--;
                if (i < this._activeCount) {
                    const i3 = i * 3;
                    const l3 = this._activeCount * 3;
                    for (let c = 0; c < 3; c++) {
                        this._positions[i3 + c] = this._positions[l3 + c];
                        this._colors[i3 + c] = this._colors[l3 + c];
                        this._velocities[i3 + c] = this._velocities[l3 + c];
                    }
                    this._lifetimes[i] = this._lifetimes[this._activeCount];
                }
                continue;
            }

            const i3 = i * 3;
            this._positions[i3] += this._velocities[i3] * dt;
            this._positions[i3 + 1] += this._velocities[i3 + 1] * dt;
            this._positions[i3 + 2] += this._velocities[i3 + 2] * dt;
            this._velocities[i3 + 1] -= 9.8 * dt; // Gravity
        }
    }

    _tickAmbient(dt) {
        const b = this._bounds;
        if (!b) return;

        for (let i = 0; i < this._activeCount; i++) {
            const i3 = i * 3;
            let x = this._positions[i3] + this._velocities[i3] * dt;
            let y = this._positions[i3 + 1] + this._velocities[i3 + 1] * dt;
            let z = this._positions[i3 + 2] + this._velocities[i3 + 2] * dt;

            // Wrap within bounds
            if (y > b.y) y = 0;
            if (x > b.x / 2) x -= b.x;
            else if (x < -b.x / 2) x += b.x;
            if (z > b.z / 2) z -= b.z;
            else if (z < -b.z / 2) z += b.z;

            this._positions[i3] = x;
            this._positions[i3 + 1] = y;
            this._positions[i3 + 2] = z;
        }
    }

    /** Current active particle count */
    get activeCount() {
        return this._activeCount;
    }

    /** Dispose GPU resources */
    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
