/**
 * BaseEnvironmentFactory.js
 * ═══════════════════════════════════════════════════════════════
 * OpenCore abstract base class for ALL environment factories.
 * Provides parametric floor, dust field, and lighting rig creation
 * so subclasses only implement their unique geometry.
 * ═══════════════════════════════════════════════════════════════
 */
import * as THREE from 'three';
import { VolumetricsPlugin } from '../../soma/plugins/VolumetricsPlugin.js';
import { FlickerSystem } from './FlickerSystem.js';

export class BaseEnvironmentFactory {
    /**
     * @param {THREE.Scene} scene
     * @param {Object} engine - AlisaRenderCore instance (or compatible)
     */
    constructor(scene, engine) {
        this.scene = scene;
        this.engine = engine;
        this.flickerSystem = new FlickerSystem();
    }

    // ─── PARAMETRIC FLOOR ────────────────────────────────────

    /**
     * Creates a floor plane + grid helper from a config object.
     * @param {Object} config
     * @param {number} [config.size=60] - Floor plane dimension
     * @param {number} [config.color=0x0a0a0f] - Floor color
     * @param {number} [config.roughness=0.95]
     * @param {number} [config.metalness=0.05]
     * @param {number} [config.gridSize=40]
     * @param {number} [config.gridDivisions=40]
     * @param {number} [config.gridColor1=0x112233]
     * @param {number} [config.gridColor2=0x0a1520]
     * @returns {{ floor: THREE.Mesh, grid: THREE.GridHelper }}
     */
    createFloor(config = {}) {
        const {
            size = 60,
            color = 0x0a0a0f,
            roughness = 0.95,
            metalness = 0.05,
            gridSize = 40,
            gridDivisions = 40,
            gridColor1 = 0x112233,
            gridColor2 = 0x0a1520
        } = config;

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size),
            new THREE.MeshStandardMaterial({ color, roughness, metalness })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.01;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const grid = new THREE.GridHelper(gridSize, gridDivisions, gridColor1, gridColor2);
        grid.position.y = 0.01;
        this.scene.add(grid);

        this._floor = floor;
        this._grid = grid;
        return { floor, grid };
    }

    // ─── PARAMETRIC DUST FIELD ───────────────────────────────

    /**
     * Creates a scattered particle dust field and registers it with VolumetricsPlugin.
     * @param {Object} config
     * @param {number} [config.count=300] - Number of particles
     * @param {number[]} [config.spread=[50,30,50]] - [x, y, z] scatter volume
     * @param {number} [config.color=0x88ccff] - Particle color
     * @param {number} [config.size=0.05] - Particle size
     * @param {number} [config.opacity=0.3] - Particle opacity
     * @param {boolean} [config.registerPlugin=true] - Whether to auto-register with engine
     * @returns {THREE.Points}
     */
    createDustField(config = {}) {
        const {
            count = 300,
            spread = [50, 30, 50],
            color = 0x88ccff,
            size = 0.05,
            opacity = 0.3,
            registerPlugin = true
        } = config;

        const dust = VolumetricsPlugin.createFlashlightDust(count);
        const dustPos = dust.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
            dustPos[i * 3]     = (Math.random() - 0.5) * spread[0];
            dustPos[i * 3 + 1] = Math.random() * spread[1];
            dustPos[i * 3 + 2] = (Math.random() - 0.5) * spread[2];
        }
        dust.geometry.attributes.position.needsUpdate = true;
        dust.material.color.setHex(color);
        dust.material.size = size;
        dust.material.opacity = opacity;
        dust.position.set(0, 0, 0);

        this.scene.add(dust);

        if (registerPlugin && this.engine?.registerPlugin) {
            const volumetrics = new VolumetricsPlugin();
            volumetrics.registerDust(dust);
            this.engine.registerPlugin(volumetrics);
        }

        this._dust = dust;
        return dust;
    }

    // ─── DECLARATIVE LIGHTING RIG ────────────────────────────

    /**
     * Applies a lighting preset declaratively.
     * @param {Object} preset
     * @param {Object} [preset.ambient] - { color, intensity }
     * @param {Object} [preset.hemi] - { skyColor, groundColor, intensity }
     * @param {Object} [preset.fog] - { color, density } (FogExp2)
     * @param {Array}  [preset.fills] - [{ color, intensity, range, position: [x,y,z] }]
     * @param {Array}  [preset.spots] - [{ color, intensity, range, angle, penumbra, decay, position, target }]
     * @returns {Object} refs to created lights
     */
    applyLightingPreset(preset = {}) {
        const refs = { ambient: null, hemi: null, fills: [], spots: [] };

        if (preset.ambient) {
            refs.ambient = new THREE.AmbientLight(preset.ambient.color, preset.ambient.intensity);
            this.scene.add(refs.ambient);
        }

        if (preset.hemi) {
            refs.hemi = new THREE.HemisphereLight(
                preset.hemi.skyColor, preset.hemi.groundColor, preset.hemi.intensity
            );
            this.scene.add(refs.hemi);
        }

        if (preset.fog) {
            this.scene.fog = new THREE.FogExp2(preset.fog.color, preset.fog.density);
        }

        if (preset.fills) {
            preset.fills.forEach(f => {
                const light = new THREE.PointLight(f.color, f.intensity, f.range || 50);
                light.position.set(...f.position);
                if (f.castShadow) light.castShadow = true;
                this.scene.add(light);
                refs.fills.push(light);
            });
        }

        if (preset.spots) {
            preset.spots.forEach(s => {
                const spot = new THREE.SpotLight(
                    s.color, s.intensity, s.range || 25,
                    s.angle || Math.PI / 5, s.penumbra || 0.5, s.decay || 1
                );
                spot.position.set(...s.position);
                if (s.target) {
                    spot.target.position.set(...s.target);
                    this.scene.add(spot.target);
                }
                if (s.castShadow) spot.castShadow = true;
                this.scene.add(spot);
                refs.spots.push(spot);
            });
        }

        this._lightRefs = refs;
        return refs;
    }

    /**
     * Override in subclass to call setup methods in order.
     */
    buildAll() {
        throw new Error('BaseEnvironmentFactory.buildAll() must be overridden by subclass');
    }

    /**
     * Standard update loop to tick animations. Can be overridden but super.update(dt) MUST be called.
     * @param {number} dt 
     */
    update(dt) {
        if (this.flickerSystem) {
            // Using THREE.Clock style total elapsed time, or just accumulate dt if tick expects time
            // Wait, FlickerSystem.tick expects 'time' (total elapsed time).
            // Let's accumulate it here for safety.
            this._elapsedTime = (this._elapsedTime || 0) + dt;
            this.flickerSystem.tick(this._elapsedTime);
        }
    }
}
