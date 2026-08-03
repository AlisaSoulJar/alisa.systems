/**
 * [ALISA Weather System v1 — Three.js Particles]
 * Environmental particle system using THREE.Points + BufferGeometry.
 * Fills the "sterile world" gap: rain, dust, floating data particles, crystal shimmers.
 *
 * Architecture:
 *   - One single Points mesh per weather type (GPU-instanced)
 *   - Domain-specific: Node = data bits, Psyche = crystal glow, World = rain/dust
 *   - Entropy-reactive: higher entropy → more chaotic particles, darker palette
 *   - Solar-reactive: night → fireflies, dawn → mist, day → dust motes
 */

const WeatherSystem = {
    enabled: true,
    scene: null,
    particles: null,           // THREE.Points instance
    particleCount: 800,        // Total particle budget
    geometry: null,
    material: null,
    positions: null,           // Float32Array for BufferAttribute
    velocities: null,          // Float32Array for per-particle motion
    opacities: null,           // Float32Array for per-particle fade
    colors: null,              // Float32Array for per-particle color (r,g,b)
    
    // Bounds
    bounds: { x: 80, y: 30, z: 80 },  // 3D volume
    
    // Domain theme (set from backend domain name)
    currentTheme: 'overworld',
    
    themes: {
        overworld: {
            baseColor: [0.5, 0.7, 1.0],   // Soft blue dust
            speed: 0.02,
            turbulence: 0.005,
            density: 1.0,
            particleSize: 0.15
        },
        world: {
            baseColor: [0.3, 0.8, 0.3],   // Green pollen
            speed: 0.015,
            turbulence: 0.008,
            density: 1.2,
            particleSize: 0.12
        },
        node: {
            baseColor: [0.0, 1.0, 1.0],   // Cyan data bits
            speed: 0.06,
            turbulence: 0.002,
            density: 1.5,
            particleSize: 0.08
        },
        psyche: {
            baseColor: [0.8, 0.4, 1.0],   // Purple crystal shimmer
            speed: 0.01,
            turbulence: 0.012,
            density: 0.8,
            particleSize: 0.2
        },
        soma: {
            baseColor: [1.0, 0.6, 0.3],   // Warm amber neural sparks
            speed: 0.03,
            turbulence: 0.01,
            density: 1.0,
            particleSize: 0.1
        },
        hardware: {
            baseColor: [1.0, 0.2, 0.1],   // Red heat shimmer
            speed: 0.04,
            turbulence: 0.015,
            density: 0.6,
            particleSize: 0.06
        }
    },

    init: function(scene) {
        if (!scene) return;
        this.scene = scene;

        this.positions = new Float32Array(this.particleCount * 3);
        this.velocities = new Float32Array(this.particleCount * 3);
        this.opacities = new Float32Array(this.particleCount);
        this.colors = new Float32Array(this.particleCount * 3);

        // Seed initial positions randomly
        for (let i = 0; i < this.particleCount; i++) {
            this.resetParticle(i);
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

        // Custom vertex colors + transparency
        this.material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(this.geometry, this.material);
        this.particles.frustumCulled = false; // Always render (particles are everywhere)
        scene.add(this.particles);

        console.log('[WeatherSystem v1] Three.js particle weather initialized.');
    },

    /**
     * Reset a single particle's position, velocity, and color.
     */
    resetParticle: function(i) {
        const theme = this.themes[this.currentTheme] || this.themes.overworld;
        const i3 = i * 3;

        // Random position within bounds
        this.positions[i3]     = (Math.random() - 0.5) * this.bounds.x;
        this.positions[i3 + 1] = Math.random() * this.bounds.y;
        this.positions[i3 + 2] = (Math.random() - 0.5) * this.bounds.z;

        // Velocity: slow drift with domain-specific turbulence
        this.velocities[i3]     = (Math.random() - 0.5) * theme.turbulence;
        this.velocities[i3 + 1] = -theme.speed * (0.5 + Math.random() * 0.5); // Fall
        this.velocities[i3 + 2] = (Math.random() - 0.5) * theme.turbulence;

        // Color: base + subtle random variation
        this.colors[i3]     = theme.baseColor[0] + (Math.random() - 0.5) * 0.2;
        this.colors[i3 + 1] = theme.baseColor[1] + (Math.random() - 0.5) * 0.2;
        this.colors[i3 + 2] = theme.baseColor[2] + (Math.random() - 0.5) * 0.2;

        this.opacities[i] = 0.3 + Math.random() * 0.5;
    },

    /**
     * Update particles — called every frame.
     * Responds to time_of_day, entropy, and domain theme.
     */
    update: function(state) {
        if (!this.enabled || !this.particles) return;

        // Domain theme detection
        if (typeof MainApp !== 'undefined' && MainApp.currentDomain) {
            const newTheme = MainApp.currentDomain;
            if (newTheme !== this.currentTheme && this.themes[newTheme]) {
                this.currentTheme = newTheme;
                // Reset all particles with new theme
                for (let i = 0; i < this.particleCount; i++) {
                    this.resetParticle(i);
                }
            }
        }

        const theme = this.themes[this.currentTheme] || this.themes.overworld;

        // Entropy modulation: higher entropy → more turbulence, warmer colors
        let entropyMod = 1.0;
        if (state && state.entropy !== undefined) {
            entropyMod = 1.0 + state.entropy * 2.0; // Up to 3x turbulence
        }

        // Solar modulation: night → slower, dimmer; dawn → golden tint
        let solarMod = 1.0;
        let nightDim = 1.0;
        let isNight = false;
        if (state && state.time_of_day !== undefined) {
            const tod = state.time_of_day;
            if (tod < 6 || tod > 20) {
                solarMod = 0.4;
                nightDim = 0.3;
                isNight = true;
            } else if (tod < 8 || tod > 18) {
                solarMod = 1.2;
            }
        }

        // Center particles around camera position for infinite-seeming field
        const camX = typeof Renderer !== 'undefined' ? Renderer.camera.position.x - 20 : 0;
        const camZ = typeof Renderer !== 'undefined' ? Renderer.camera.position.z - 20 : 0;

        // Animate each particle
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;

            // Move
            this.positions[i3]     += this.velocities[i3] * entropyMod * solarMod;
            this.positions[i3 + 1] += this.velocities[i3 + 1] * solarMod;
            this.positions[i3 + 2] += this.velocities[i3 + 2] * entropyMod * solarMod;

            // Add gentle sine turbulence (wind)
            this.positions[i3] += Math.sin(Date.now() * 0.001 + i) * theme.turbulence * 0.5;

            // Recycle particles that fall below floor or drift too far
            const relX = this.positions[i3] - camX;
            const relZ = this.positions[i3 + 2] - camZ;

            if (this.positions[i3 + 1] < -1 ||
                Math.abs(relX) > this.bounds.x * 0.5 ||
                Math.abs(relZ) > this.bounds.z * 0.5) {

                // Respawn above, centered on camera
                this.positions[i3]     = camX + (Math.random() - 0.5) * this.bounds.x;
                this.positions[i3 + 1] = this.bounds.y * (0.5 + Math.random() * 0.5);
                this.positions[i3 + 2] = camZ + (Math.random() - 0.5) * this.bounds.z;

                // FIREFLY MODE (Zomboid nights) — 20% of particles become warm fireflies
                if (isNight && Math.random() < 0.2) {
                    this.colors[i3] = 1.0; this.colors[i3+1] = 0.9; this.colors[i3+2] = 0.2; // Warm yellow
                    this.velocities[i3]     = (Math.random() - 0.5) * 0.01; // Gentle horizontal drift
                    this.velocities[i3 + 1] = 0.005 + Math.random() * 0.01; // Rise slowly
                    this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
                    this.positions[i3 + 1] = Math.random() * 3; // Spawn near ground
                } else {
                    // Normal particle refresh
                    this.velocities[i3]     = (Math.random() - 0.5) * theme.turbulence * entropyMod;
                    this.velocities[i3 + 1] = -theme.speed * (0.5 + Math.random() * 0.5);
                    this.velocities[i3 + 2] = (Math.random() - 0.5) * theme.turbulence * entropyMod;
                }
            }
        }

        // Update GPU buffers
        this.geometry.attributes.position.needsUpdate = true;
        if (this.geometry.attributes.color) this.geometry.attributes.color.needsUpdate = true;
        
        // Update material opacity based on time of day
        this.material.opacity = 0.4 * nightDim + 0.2;
        this.material.size = theme.particleSize * (1 + (entropyMod - 1) * 0.3);
    },

    /**
     * Cleanup on domain change or destroy.
     */
    destroy: function() {
        if (this.particles && this.scene) {
            this.scene.remove(this.particles);
        }
        if (this.geometry) this.geometry.dispose();
        if (this.material) this.material.dispose();
    }
};
