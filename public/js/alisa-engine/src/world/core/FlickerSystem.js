/**
 * FlickerSystem — Centralized Material Animation Engine
 * =====================================================
 * Manages emissive intensity flicker for neon signs, streetlights,
 * glow spheres, and hologram scrolling. All factories register their
 * animated materials here instead of maintaining local arrays.
 *
 * Replaces: Carver's `_flickerMats[]` loop, ProceduralBuilding's
 *           `twinkleOffset` glow spheres, and hologram UV scroll.
 *
 * Usage:
 *   const flicker = new FlickerSystem();
 *   flicker.register(neonMat, { type: 'sin', speed: 0.3, seed: 42 });
 *   flicker.register(holoTex, { type: 'scroll', speed: 0.2 });
 *   // In render loop:
 *   flicker.tick(elapsedTime);
 */
export class FlickerSystem {
    constructor() {
        /** @type {Array<{material: THREE.Material, config: FlickerConfig}>} */
        this._entries = [];
        /** @type {Array<{mesh: THREE.Mesh, tex: THREE.Texture, speed: number}>} */
        this._holograms = [];
    }

    /**
     * Register a material for automated flicker animation.
     * @param {THREE.Material} material
     * @param {Object} config
     * @param {string} config.type - 'sin' | 'random' | 'pulse' | 'vapor'
     * @param {number} [config.speed=0.3] - Animation speed multiplier
     * @param {number} [config.seed=0] - Phase offset for desync
     * @param {number} [config.baseIntensity] - Base emissive intensity (auto-detected if omitted)
     */
    register(material, config = {}) {
        const entry = {
            material,
            type: config.type || 'sin',
            speed: config.speed || 0.3,
            seed: config.seed || Math.random() * 100,
            baseIntensity: config.baseIntensity ?? (material.emissiveIntensity || 1.0),
            baseOpacity: config.baseOpacity ?? (material.opacity || 1.0),
            isVapor: config.type === 'vapor'
        };
        this._entries.push(entry);
        return this;
    }

    /**
     * Register a hologram for UV scrolling animation.
     * @param {THREE.Mesh} mesh
     * @param {THREE.Texture} tex
     * @param {number} speed - Scroll speed (UV units per second)
     */
    registerHologram(mesh, tex, speed = 0.2) {
        this._holograms.push({ mesh, tex, speed });
        return this;
    }

    /**
     * Remove all entries for a given material (cleanup).
     * @param {THREE.Material} material
     */
    unregister(material) {
        this._entries = this._entries.filter(e => e.material !== material);
    }

    /**
     * Called each frame by AlisaRenderCore or the factory's update loop.
     * @param {number} time - Total elapsed time (seconds)
     */
    tick(time) {
        // Material flicker
        for (const entry of this._entries) {
            const t = time * entry.speed + entry.seed;

            if (entry.isVapor) {
                // Vapor: slow sinusoidal opacity shift
                if (entry.material.opacity !== undefined) {
                    entry.material.opacity = 0.3 + Math.sin(t) * 0.15;
                }
                continue;
            }

            if (entry.type === 'opacity') {
                // Generic opacity flicker based on baseIntensity (used as base opacity)
                if (entry.material.opacity !== undefined) {
                    entry.material.opacity = entry.baseOpacity * (0.8 + Math.sin(t) * 0.2);
                }
                continue;
            }

            let intensity;
            switch (entry.type) {
                case 'sin':
                    // Smooth sinusoidal flicker
                    intensity = entry.baseIntensity * (0.7 + Math.sin(t) * 0.3);
                    break;
                case 'random':
                    // Harsh random flicker (broken neon)
                    intensity = entry.baseIntensity * (0.2 + Math.random() * 0.8);
                    break;
                case 'pulse':
                    // Sharp square-wave pulse
                    intensity = Math.sin(t) > 0 ? entry.baseIntensity : entry.baseIntensity * 0.1;
                    break;
                default:
                    intensity = entry.baseIntensity;
            }

            entry.material.emissiveIntensity = intensity;
        }

        // Hologram UV scroll
        for (const holo of this._holograms) {
            holo.tex.offset.x += holo.speed * 0.016; // ~60fps normalized
            if (holo.tex.offset.x > 1.0) holo.tex.offset.x -= 1.0;
        }
    }

    /** Number of registered materials */
    get count() {
        return this._entries.length + this._holograms.length;
    }

    /** Dispose all references */
    dispose() {
        this._entries = [];
        this._holograms = [];
    }
}
