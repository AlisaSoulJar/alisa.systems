/**
 * [ALISA Lighting Engine v2 — Three.js Native]
 * Dynamic lighting using Three.js PointLights + AmbientLight.
 * Inspired by Project Zomboid: entities emit light, darkness is the default.
 * 
 * Architecture:
 *   - AmbientLight intensity tracks solar cycle (time_of_day)
 *   - Each entity with light emission gets a PointLight child
 *   - FogExp2 density increases at night → distant tiles disappear
 *   - No Canvas overlay needed — pure Three.js scene graph
 */

const LightingEngine = {
    enabled: false, // DISABLED for Phase 8 Diorama Reset
    timeOfDay: 12,
    ambientLight: null,           // THREE.AmbientLight — controls global brightness
    directionalLight: null,       // THREE.DirectionalLight — sun direction
    accentLight: null,
    pointLights: {},              // entityId → THREE.PointLight
    maxPointLights: 80,           // GPU budget — cull distant/dim ones
    fogDensityBase: 0.012,        // Current FogExp2 density from renderer

    // Light presets per entity type
    presets: {
        queen:    { color: 0x00ffff, intensity: 2.5, distance: 25, decay: 1.5 },
        alisa:    { color: 0xffe8d0, intensity: 2.0, distance: 20, decay: 1.5 },
        being:    { color: 0xb4dcff, intensity: 1.2, distance: 12, decay: 2.0 },
        building: { color: 0xffc864, intensity: 1.8, distance: 18, decay: 1.5 },
        portal:   { color: 0x64ffc8, intensity: 1.5, distance: 15, decay: 1.8 },
        fauna:    { color: 0xc8b48c, intensity: 0.5, distance: 6,  decay: 2.5 },
        yokai:    { color: 0xcc44ff, intensity: 2.0, distance: 14, decay: 1.5 },
        cpu_hot:  { color: 0xff5028, intensity: 2.5, distance: 16, decay: 1.5 },
        flora:    { color: 0x55ff77, intensity: 1.2, distance: 10, decay: 2.0 }, // Bioluminescence Wilds
        mineral:  { color: 0x00ffff, intensity: 1.5, distance: 12, decay: 2.0 }, // Crystalline Akasha
        scrap:    { color: 0xff5500, intensity: 1.8, distance: 14, decay: 1.5 }, // Molten Factory
        cyber:    { color: 0xff0033, intensity: 1.5, distance: 15, decay: 1.8 }  // Crimson Core Hub
    },

    /**
     * Initialize — called after Renderer.init() sets up the scene.
     * Replaces the static ambient + directional lights with dynamic ones.
     */
    init: function(scene) {
        if (!this.enabled || !scene) return;
        this.scene = scene;

        // Remove existing static lights (Renderer creates them at init)
        const toRemove = [];
        scene.traverse(child => {
            if (child.isAmbientLight || child.isDirectionalLight || child.isSpotLight) {
                toRemove.push(child);
            }
        });
        toRemove.forEach(l => scene.remove(l));

        // --- New Ambient Light (solar-driven) ---
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        scene.add(this.ambientLight);

        // --- New Directional Light (sun/moon) ---
        this.directionalLight = new THREE.DirectionalLight(0xffddaa, 0.8);
        this.directionalLight.position.set(20, 40, -10);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 1024;
        this.directionalLight.shadow.mapSize.height = 1024;
        this.directionalLight.shadow.camera.left = -20;
        this.directionalLight.shadow.camera.right = 20;
        this.directionalLight.shadow.camera.top = 20;
        this.directionalLight.shadow.camera.bottom = -20;
        scene.add(this.directionalLight);

        // Subtle accent stays (cyberpunk feel at night)
        this.accentLight = new THREE.SpotLight(0x00ffff, 0.0);
        this.accentLight.position.set(-10, 20, 10);
        this.accentLight.angle = Math.PI / 4;
        this.accentLight.penumbra = 0.5;
        scene.add(this.accentLight);

        console.log('[LightingEngine v2] Three.js native lighting initialized.');
    },

    /**
     * Solar cycle calculation.
     * Returns { ambientIntensity, sunIntensity, sunColor, fogDensity, accentIntensity }
     *
     * Schedule:
     *   06:00 → sunrise  (amber, growing)
     *   12:00 → noon     (bright white, max)
     *   18:00 → sunset   (warm orange, fading)
     *   00:00 → midnight (deep blue, minimal)
     *   03:00 → darkest  (near-zero)
     */
    calculateSolar: function(tod) {
        const norm = tod / 24.0;
        // Cosine: 1 at noon, -1 at midnight
        const solar = Math.cos((norm - 0.5) * Math.PI * 2);

        // Ambient: 0.05 (midnight) → 0.90 (noon)
        // Night is heavily darkened to let Entity lights pop.
        const ambientIntensity = 0.02 + Math.max(0, solar) * 0.85;

        // Sun: 0.0 (night) → 1.2 (noon)
        const sunIntensity = Math.max(0.1, solar * 1.2); // Always keep a faint 0.1 moon beam

        // Fog density: thicker at night (mystery), thinner at day
        const fogDensity = 0.008 + (1 - Math.max(0, solar)) * 0.025;

        // Sun color shifts: warm at edges, white at peak
        let sunColor;
        let skyColorHex = 0x05080f;
        const isDaylight = solar > 0; // If sun is above horizon
        
        if (tod >= 5 && tod < 8) {
            sunColor = new THREE.Color(0xffaa55); // Dawn amber
            skyColorHex = 0x664477; // Morning purple
        } else if (tod >= 16 && tod < 20) {
            sunColor = new THREE.Color(0xff8833); // Dusk orange
            skyColorHex = 0x552244; // Evening crimson/purple
        } else if (tod >= 8 && tod < 16) {
            sunColor = new THREE.Color(0xffeecc); // Day warm white
            skyColorHex = 0x87ceeb; // Sky Blue
        } else {
            sunColor = new THREE.Color(0x3a2b8c); // Deep Night Electric Violet (Moonlight)
            skyColorHex = 0x07041a; // Pure Indigo Abyss (Simultaneous contrast anchor)
        }

        // Cyberpunk accent: stronger at night
        const accentIntensity = Math.max(0, (1 - solar) * 0.3);

        return { ambientIntensity, sunIntensity, sunColor, fogDensity, accentIntensity, isDaylight, skyColorHex, solarFactor: Math.max(0, solar) };
    },

    /**
     * Resolve which light preset to use for an entity.
     */
    resolvePreset: function(entity) {
        if (entity.id === 'Queen') return this.presets.queen;
        if (entity.id === 'Alisa') return this.presets.alisa;
        if (entity.skin_tag && entity.skin_tag.includes('yokai')) return this.presets.yokai;
        if (entity.skin_tag && entity.skin_tag.includes('cyber')) return this.presets.cyber;
        if (entity.skin_tag && entity.skin_tag.includes('rock')) return this.presets.mineral;
        if (entity.skin_tag && entity.skin_tag.includes('tree')) return this.presets.flora;
        if (entity.cpu_glow > 0.5) return this.presets.cpu_hot;
        if (entity.target_domain) return this.presets.portal;
        if (entity.type === 'being') return this.presets.being;
        if (entity.type === 'fauna') return this.presets.fauna;
        if (entity.type === 'flora') return this.presets.flora;
        if (entity.type === 'scrap') return this.presets.scrap;
        if (entity.type === 'feature' || entity.type === 'mineral') return this.presets.mineral;
        return null;
    },

    /**
     * Main update — called every frame from Renderer.loop()
     *
     * @param {Object} state - Current domain state { entities, time_of_day, ... }
     * @param {Object} lerpEntities - Renderer's lerped entity positions
     */
    update: function(state, lerpEntities) {
        if (!this.enabled || !this.scene || !state) return;

        // 1. Solar cycle check (override slider > server state)
        if (window.manualTimeOverride !== undefined) {
            this.timeOfDay = window.manualTimeOverride;
        } else if (state.time_of_day !== undefined) {
            this.timeOfDay = state.time_of_day;
            
            // Sync UI slider if user hasn't touched it
            const slider = document.getElementById('time-slider');
            const display = document.getElementById('time-display');
            if (slider && display) {
                slider.value = this.timeOfDay;
                const hours = Math.floor(this.timeOfDay);
                const mins = Math.floor((this.timeOfDay - hours) * 60);
                display.innerText = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} (SYNC)`;
            }
        }
        const solar = this.calculateSolar(this.timeOfDay);

        // Apply to global lights
        this.ambientLight.intensity = solar.ambientIntensity;
        this.directionalLight.intensity = solar.sunIntensity;
        this.directionalLight.color.copy(solar.sunColor);
        this.accentLight.intensity = solar.accentIntensity;

        // Transparent Canvas Architecture: Pass sky color to the CSS Background
        document.body.style.backgroundColor = '#' + solar.skyColorHex.toString(16).padStart(6, '0');
        if (this.scene.background) this.scene.background = null;

        // Hide the abyssFloor during the day so it doesn't block the transparent sky
        const abyss = this.scene.getObjectByName('abyssFloor');
        if (abyss) {
            abyss.visible = !solar.isDaylight;
        }

        // Sync CSS day-mode
        if (document.body.classList.contains('day-mode') !== solar.isDaylight) {
            document.body.classList.toggle('day-mode', solar.isDaylight);
            // Set a flag so Renderer knows to rebuild procedural textures (to avoid doing it every frame)
            window.dayNightChanged = true;
        }

        // (Fog integration removed to avoid washing out the terrain)

        // 2. Entity point lights
        if (!state.entities) return;

        const activeIds = new Set();

        // Sort entities by distance to camera to prioritize nearby lights
        // Sort entities by distance camera (priority beings > others, ignoring buildings)
        const entities = state.entities.filter(e => e.type !== 'building').slice();
        entities.sort((a, b) => {
            const pa = a.type === 'being' ? 0 : 1;
            const pb = b.type === 'being' ? 0 : 1;
            return pa - pb;
        });

        let lightCount = 0;

        for (const entity of entities) {
            if (lightCount >= this.maxPointLights) break;

            const preset = this.resolvePreset(entity);
            if (!preset) continue;

            activeIds.add(entity.id);

            // Get lerped position
            let ex = entity.x;
            let ey = entity.y;
            if (lerpEntities && lerpEntities[entity.id]) {
                ex = lerpEntities[entity.id].curX;
                ey = lerpEntities[entity.id].curY;
            }

            // At night, scale up light intensity dramatically (entities glow brighter in darkness)
            const nightBoost = solar.ambientIntensity < 0.3 ? 2.5 : 1.0;

            // CPU glow modulates intensity
            const cpuMod = 1.0 + (entity.cpu_glow || 0) * 0.8;

            let light = this.pointLights[entity.id];
            if (!light) {
                // Create new PointLight
                light = new THREE.PointLight(
                    preset.color,
                    preset.intensity * nightBoost * cpuMod,
                    preset.distance,
                    preset.decay
                );
                this.scene.add(light);
                this.pointLights[entity.id] = light;
            }

            // Update light properties
            light.color.setHex(preset.color);
            light.intensity = preset.intensity * nightBoost * cpuMod;
            light.distance = preset.distance;

            // Position: above the entity in 3D space
            const heightOffset = entity.type === 'building' ? 2.0 : 1.2;
            light.position.set(ex, heightOffset, ey);

            lightCount++;
        }

        // 3. Cleanup dead lights
        for (const id in this.pointLights) {
            if (!activeIds.has(id)) {
                this.scene.remove(this.pointLights[id]);
                delete this.pointLights[id];
            }
        }
    },

    /**
     * Cleanup all lights (on domain change or destroy).
     */
    destroy: function() {
        for (const id in this.pointLights) {
            this.scene.remove(this.pointLights[id]);
        }
        this.pointLights = {};
    }
};
