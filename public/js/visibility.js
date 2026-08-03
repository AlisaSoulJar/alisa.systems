/**
 * [ALISA Fog of War + Entropy Overlay v1 — Three.js InstancedMesh Colors]
 * 
 * Combines two visual systems into a single per-tile color pass:
 * 
 * 1. FOG OF WAR (Zomboid pattern):
 *    - Tiles within ANY entity's perception_radius → fully lit (white tint)
 *    - Tiles outside all perception radii → dimmed (dark tint)
 *    - Previously seen tiles → partially dimmed ("explored but not visible")
 *    - Uses InstancedMesh.setColorAt() for GPU-efficient per-instance tinting
 *
 * 2. ENTROPY OVERLAY (Factorio pattern):
 *    - Tiles with wear > 0 → progressive red/purple corruption tint
 *    - Tiles with wear > 0.5 (corrupted skin) → pulsing corruption glow
 *    - Higher domain entropy → more corruption particles near worn tiles
 *
 * Architecture:
 *    - Called AFTER rebuildTiles() to apply colors to existing InstancedMeshes
 *    - Runs every frame via Renderer.loop() for smooth transitions
 *    - Maintains a sparse explored/visible tile cache for persistent memory
 */

const VisibilitySystem = {
    enabled: true,
    
    // Fog of War state
    exploredTiles: {},        // key: "x,y" → true (permanently explored)
    visibleTiles: {},         // key: "x,y" → true (currently in perception)
    fowEnabled: true,
    
    // Entropy state
    entropyEnabled: true,
    corruptionPulse: 0,       // Animated pulse for corrupted tiles
    
    // Tile index maps (rebuilt when tiles change)
    tileIndexMap: {},         // key: "groupKey:index" → {x, y, wear, skin}
    tileCoordMap: {},         // key: "x,y" → {groupKey, index}
    
    // Reusable Three.js Color objects (avoid allocation in hot loop)
    _color: null,
    _whiteColor: null,
    _dimColor: null,
    _exploredColor: null,
    
    // Perception falloff constants
    VISIBLE_FALLOFF: 0.85,    // Brightness at edge of perception radius
    EXPLORED_DIM: 0.15,       // Brightness of explored-but-not-visible tiles
    UNEXPLORED_DIM: 0.0,      // Pitch black for never-seen tiles (Absolute FoW)
    
    init: function() {
        this._color = new THREE.Color();
        this._whiteColor = new THREE.Color(1.0, 1.0, 1.0);
        this._dimColor = new THREE.Color(this.UNEXPLORED_DIM, this.UNEXPLORED_DIM, this.UNEXPLORED_DIM + 0.02);
        this._exploredColor = new THREE.Color(this.EXPLORED_DIM, this.EXPLORED_DIM, this.EXPLORED_DIM + 0.03);
    },
    
    /**
     * Build the tile coordinate → instanced mesh index map.
     * Called once per rebuildTiles() cycle.
     * 
     * @param {Array} tiles - Array of tile objects from state
     */
    buildTileIndex: function(tiles) {
        this.tileIndexMap = {};
        this.tileCoordMap = {};
        
        // Group tiles the same way rebuildTiles does, to match indices
        const groups = {};
        tiles.forEach(t => {
            let key = t.skin || 'floor';
            if (t.type === "WALL") key = 'wall';
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        
        for (let groupKey in groups) {
            const groupTiles = groups[groupKey];
            for (let i = 0; i < groupTiles.length; i++) {
                const t = groupTiles[i];
                const coordKey = `${t.x},${t.y}`;
                this.tileIndexMap[`${groupKey}:${i}`] = {
                    x: t.x, y: t.y,
                    wear: t.wear || 0,
                    skin: t.skin || ''
                };
                this.tileCoordMap[coordKey] = {
                    groupKey: groupKey,
                    index: i,
                    wear: t.wear || 0,
                    skin: t.skin || ''
                };
            }
        }
    },
    
    /**
     * Recalculate which tiles are visible based on entity perception radii.
     * Uses Manhattan distance for performance (matching backend).
     * 
     * @param {Array} entities - Array of entity objects with perception_radius
     * @param {Object} lerpEntities - Smoothed positions from renderer
     */
    updateVisibility: function(entities, lerpEntities) {
        if (!this.fowEnabled) return;
        
        // Clear current visibility (but preserve explored state)
        this.visibleTiles = {};
        
        if (!entities) return;
        
        for (const entity of entities) {
            // All entities provide visibility (not just beings)
            const radius = entity.perception_radius || 8;
            
            // Use lerped position if available, else raw
            let ex = entity.x;
            let ey = entity.y;
            if (lerpEntities && lerpEntities[entity.id]) {
                ex = Math.round(lerpEntities[entity.id].curX);
                ey = Math.round(lerpEntities[entity.id].curY);
            }
            
            // Mark tiles within Manhattan distance as visible
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) + Math.abs(dy) <= radius) {
                        const tx = ex + dx;
                        const ty = ey + dy;
                        const key = `${tx},${ty}`;
                        
                        // Distance factor for smooth falloff
                        const dist = Math.abs(dx) + Math.abs(dy);
                        const brightness = 1.0 - (dist / radius) * (1.0 - this.VISIBLE_FALLOFF);
                        
                        // Keep the brightest visibility if multiple entities overlap
                        if (!this.visibleTiles[key] || this.visibleTiles[key] < brightness) {
                            this.visibleTiles[key] = brightness;
                        }
                        
                        // Mark as permanently explored
                        this.exploredTiles[key] = true;
                    }
                }
            }
        }
    },
    
    /**
     * Apply per-instance colors to InstancedMeshes.
     * Combines FoW tinting + entropy corruption into a single color.
     * 
     * @param {Object} instancedMeshes - { floor, wall, tech, grass } InstancedMesh objects
     * @param {number} domainEntropy - 0-1 entropy value for the current domain
     * @param {number} timeOfDay - 0-24 solar hour
     */
    applyColors: function(instancedMeshes, domainEntropy, timeOfDay) {
        if (!this._color) this.init();
        
        // Corruption pulse animation
        this.corruptionPulse = (Math.sin(Date.now() * 0.003) + 1) * 0.5; // 0-1 oscillation
        
        // Night modifier: at night, FoW is MORE dramatic (matches lighting engine)
        const nightFactor = (typeof LightingEngine !== 'undefined') 
            ? Math.max(0.3, LightingEngine.calculateSolar(timeOfDay || 12).ambientIntensity)
            : 1.0;
        
        for (let groupKey in instancedMeshes) {
            const mesh = instancedMeshes[groupKey];
            if (!mesh || mesh.count === 0) continue;
            
            for (let i = 0; i < mesh.count; i++) {
                const tileInfo = this.tileIndexMap[`${groupKey}:${i}`];
                if (!tileInfo) continue;
                
                const coordKey = `${tileInfo.x},${tileInfo.y}`;
                
                // --- 1. FoW Tint ---
                let brightness = 1.0;
                if (this.fowEnabled) {
                    if (this.visibleTiles[coordKey]) {
                        brightness = this.visibleTiles[coordKey];
                    } else if (this.exploredTiles[coordKey]) {
                        brightness = this.EXPLORED_DIM;
                    } else {
                        brightness = this.UNEXPLORED_DIM;
                    }
                    
                    // Night makes FoW more dramatic
                    brightness *= nightFactor;
                    // Ensure minimum brightness so it's not pitch black
                    brightness = Math.max(this.UNEXPLORED_DIM, brightness);
                }
                
                // --- 2. Entropy/Corruption Tint ---
                let r = brightness;
                let g = brightness;
                let b = brightness;
                
                if (this.entropyEnabled && tileInfo.wear > 0) {
                    const wear = tileInfo.wear;
                    
                    if (wear > 0.5) {
                        // Heavily corrupted: pulsing red-purple
                        const pulse = this.corruptionPulse * 0.3;
                        r = Math.min(1.0, brightness + wear * 0.4 + pulse);
                        g = brightness * (1.0 - wear * 0.6);
                        b = Math.min(1.0, brightness * (1.0 - wear * 0.3) + wear * 0.2 + pulse * 0.5);
                    } else {
                        // Light corruption: subtle warm shift
                        r = Math.min(1.0, brightness + wear * 0.2);
                        g = brightness * (1.0 - wear * 0.15);
                        b = brightness * (1.0 - wear * 0.1);
                    }
                }
                
                // --- 3. Atmospheric Perspective (distance-based sky-color fade) ---
                if (typeof Renderer !== 'undefined' && Renderer.camera) {
                    // World center from camera lookAt target
                    const cx = Renderer.camera.position.x - 20; // approx center
                    const cz = Renderer.camera.position.z - 20;
                    const dx = tileInfo.x - cx;
                    const dz = tileInfo.y - cz;
                    const dist = Math.sqrt(dx*dx + dz*dz);
                    const maxDist = 35; // Full fade at this distance
                    const fadeFactor = Math.min(1.0, Math.max(0, (dist - 15) / (maxDist - 15))); // Starts fading at 15 tiles
                    
                    if (fadeFactor > 0) {
                        // Lerp toward sky color (night=deep blue, day=pale blue)
                        const isDay = document.body.classList.contains('day-mode');
                        const skyR = isDay ? 0.53 : 0.02;
                        const skyG = isDay ? 0.81 : 0.03;
                        const skyB = isDay ? 0.92 : 0.06;
                        const fade = fadeFactor * 0.4; // Max 40% fade toward sky
                        r = r * (1 - fade) + skyR * fade;
                        g = g * (1 - fade) + skyG * fade;
                        b = b * (1 - fade) + skyB * fade;
                    }
                }
                
                this._color.setRGB(
                    Math.max(0, Math.min(1, r)),
                    Math.max(0, Math.min(1, g)),
                    Math.max(0, Math.min(1, b))
                );
                mesh.setColorAt(i, this._color);
            }
            
            // Flag GPU upload
            if (mesh.instanceColor) {
                mesh.instanceColor.needsUpdate = true;
            }
        }
    },
    
    /**
     * Full update cycle — called from Renderer.loop().
     * 
     * @param {Object} state - Current domain state { entities, tiles, time_of_day, entropy }
     * @param {Object} lerpEntities - Renderer's lerped positions
     * @param {Object} instancedMeshes - Renderer's instanced tile meshes
     */
    update: function(state, lerpEntities, instancedMeshes) {
        if (!this.enabled || !state) return;
        
        // Update visibility from entity perception radii
        this.updateVisibility(state.entities, lerpEntities);
        
        // Apply combined FoW + entropy colors
        this.applyColors(
            instancedMeshes,
            state.entropy || 0,
            state.time_of_day || 12
        );
    },
    
    /**
     * Reset explored state (on domain change).
     */
    resetExplored: function() {
        this.exploredTiles = {};
        this.visibleTiles = {};
    },
    
    /**
     * Toggle FoW on/off (for debug or observer mode).
     */
    toggleFoW: function() {
        this.fowEnabled = !this.fowEnabled;
        console.log(`[VisibilitySystem] FoW ${this.fowEnabled ? 'ON' : 'OFF'}`);
    },
    
    /**
     * Toggle entropy overlay on/off.
     */
    toggleEntropy: function() {
        this.entropyEnabled = !this.entropyEnabled;
        console.log(`[VisibilitySystem] Entropy overlay ${this.entropyEnabled ? 'ON' : 'OFF'}`);
    }
};
