/**
 * ALISA Asset Manager
 * Handles asynchronous fetching and caching of Images and external NFT/Skin assets.
 *
 * Las rutas relativas pasan por AssetResolver: se resuelven contra la raíz del
 * MOTOR, no contra la página. Sin eso, el mismo código cargaba desde /index.html
 * y daba 404 desde /labs/algo.html.
 */
import { AssetResolver } from './AssetResolver.js';

export const AssetManager = {
    cache: {},      // Image cache
    gltfCache: {},  // GLTF/GLB cache
    loading: {},
    _gltfLoader: null,

    /**
     * Triggers an async download of an image asset if not already cached.
     * @param {string} id Unique logical ID (e.g., 'corsair_ram_01')
     * @param {string} url URL to the visual payload (e.g., 'assets/ram.png')
     */
    loadAsset: function(id, url) {
        if (this.cache[id] || this.loading[id]) return;
        
        this.loading[id] = true;
        const img = new Image();
        img.onload = () => {
            this.cache[id] = img;
            this.loading[id] = false;
            console.log(`[AssetManager] 📦 Successfully loaded asset: ${id}`);
        };
        img.onerror = () => {
            console.warn(`[AssetManager] 🛑 Failed to load asset: ${id} from ${url}`);
            this.loading[id] = false; // Prevents infinite loading loop
        };
        img.src = AssetResolver.resolve(url);
    },

    /**
     * Set a delegated load function (e.g. from GLTFPlugin inside AlisaRenderCore).
     * This decouples the AssetManager from native THREE.js GLTFLoader internals.
     */
    setGLTFDelegate: function(delegateFunc) {
        this._gltfDelegate = delegateFunc;
        console.log('[AssetManager] 🔌 GLTF Delegate Plugin Registered.');
    },

    /**
     * Raw promise-based model load using the injected delegate.
     *
     * ⚠️ DEVUELVE `gltf.scene` (un THREE.Group), NO el gltf entero. El delegate
     * (GLTFPlugin.load) ya hace ese desempaquetado. Escribir
     * `.then(gltf => gltf.scene)` da undefined — era el fallo de Biolab y de
     * ArcadeTableRoom. Las animaciones quedan en `.userData.animations`.
     *
     * @param {string} rawUrl ruta del modelo; las relativas pasan por AssetResolver
     * @returns {Promise<THREE.Group>}
     */
    loadModelAsync: async function(rawUrl) {
        const url = AssetResolver.resolve(rawUrl);
        if (!this._gltfDelegate) {
            console.log('[AssetManager] ⚠️ No GLTF Delegate found. Attempting self-healing auto-injection...');
            try {
                const module = await import('./plugins/GLTFPlugin.js');
                const tempPlugin = new module.GLTFPlugin();
                tempPlugin.onInit(null);
                
                // Wait for the delegate to be established asynchronously via onInit
                await new Promise(resolve => setTimeout(resolve, 50)); 
            } catch (e) {
                console.warn('[AssetManager] 🛑 Dynamic self-healing of GLTFPlugin failed.', e);
            }

            if (!this._gltfDelegate) {
                throw new Error(`[AssetManager] No GLTF Delegate registered. Cannot load ${url}`);
            }
        }
        return this._gltfDelegate(url);
    },

    /**
     * Triggers an async download of a GLTF/GLB 3D model via the injected Delegate.
     * @param {string} id Unique logical ID
     * @param {string} url URL to the .glb / .gltf file
     */
    loadGLTF: function(id, url) {
        if (this.gltfCache[id] || this.loading[id]) return;
        
        if (!this._gltfDelegate) {
            console.warn('[AssetManager] 🛑 No GLTF Delegate registered. Cannot load: ' + id + '. Please register GLTFPlugin first.');
            return;
        }

        this.loading[id] = true;
        this.loadModelAsync(url)
            .then((scene) => {
                this.gltfCache[id] = scene; // Cache the top-level Group
                this.loading[id] = false;
                console.log(`[AssetManager] 📦 Successfully loaded GLTF via Plugin: ${id}`);
            })
            .catch((error) => {
                console.warn(`[AssetManager] 🛑 Failed to load GLTF via Plugin: ${id}`, error);
                this.loading[id] = false;
            });
    },

    /**
     * Checks if the asset (Image or GLTF) is fully loaded and ready in memory.
     */
    isLoaded: function(id) {
        return !!(this.cache[id] || this.gltfCache[id]);
    },

    /**
     * Returns the raw asset from the cache (Image or THREE.Group).
     */
    get: function(id) {
        return this.cache[id] || this.gltfCache[id];
    },

    // ─── BLUEPRINT SYSTEM (Prop DNA) ─────────────────────────────
    // Blueprints = Genotype.  Room + seed = Phenotype.
    blueprints: {},
    roleMap: {},
    _blueprintsLoaded: false,

    loadBlueprints: async function(basePath = 'props/') {
        if (this._blueprintsLoaded) return;
        try {
            const resp = await fetch(basePath + 'blueprints.json');
            const data = await resp.json();
            this.roleMap = data._role_material_map || {};
            this.rarityTiers = data._rarity_tiers || {};
            this.rarityBias = data._rarity_category_bias || {};
            delete data._doc; delete data._role_material_map;
            delete data._rarity_tiers; delete data._rarity_category_bias;
            this.blueprints = data;
            this._blueprintsLoaded = true;
            console.log(`[AssetManager] 🧬 ${Object.keys(this.blueprints).length} blueprints, ${Object.keys(this.rarityTiers).length} rarity tiers loaded`);
        } catch(e) {
            console.warn('[AssetManager] ⚠️ blueprints.json not found');
            this._blueprintsLoaded = true;
        }
    },

    // ─── ROOM TYPE SYSTEM ────────────────────────────────────────
    roomTypes: {},
    _roomTypesLoaded: false,

    loadRoomTypes: async function(basePath = 'props/') {
        if (this._roomTypesLoaded) return;
        try {
            const resp = await fetch(basePath + 'room_types.json');
            const data = await resp.json();
            delete data._doc;
            this.roomTypes = data;
            this._roomTypesLoaded = true;
            console.log(`[AssetManager] 🏠 ${Object.keys(this.roomTypes).length} room types loaded`);
        } catch(e) {
            console.warn('[AssetManager] ⚠️ room_types.json not found');
            this._roomTypesLoaded = true;
        }
    },

    // ─── BUILDING TYPE SYSTEM ────────────────────────────────────
    buildingTypes: {},
    buildingCondWeights: {},
    buildingRarityWeights: {},
    _buildingTypesLoaded: false,

    loadBuildingTypes: async function(basePath = 'props/') {
        if (this._buildingTypesLoaded) return;
        try {
            const resp = await fetch(basePath + 'building_types.json');
            const data = await resp.json();
            this.buildingCondWeights = data._building_condition_weights || {};
            this.buildingRarityWeights = data._building_rarity_weights || {};
            delete data._doc; delete data._building_condition_weights; delete data._building_rarity_weights;
            this.buildingTypes = data;
            this._buildingTypesLoaded = true;
            console.log(`[AssetManager] 🏗️ ${Object.keys(this.buildingTypes).length} building types loaded`);
        } catch(e) {
            console.warn('[AssetManager] ⚠️ building_types.json not found');
            this._buildingTypesLoaded = true;
        }
    },

    /**
     * Spawn a complete building — the ultimate one-liner.
     * District + seed → building type + floors + rooms + props.
     *
     * Usage:
     *   const building = AssetManager.spawnBuilding('slum', 42);
     */
    spawnBuilding: function(district, seed) {
        const rng = this._mulberry32(seed);

        // 1. Roll building rarity for this district
        const rarityW = this.buildingRarityWeights[district] || this.buildingRarityWeights['default'] || {common:65,rare:25,epic:10};
        const buildingRarity = this._rollWeighted(rarityW, rng);

        // 2. Find eligible building types (same district + at-or-below rarity)
        const rarityRank = { common:0, rare:1, epic:2 };
        const maxRank = rarityRank[buildingRarity] || 0;
        const eligible = Object.entries(this.buildingTypes).filter(([,bt]) =>
            bt.category === district && rarityRank[bt.rarity || 'common'] <= maxRank
        );
        if (!eligible.length) return null;
        const [btName, bt] = eligible[Math.floor(rng() * eligible.length)];

        // 3. Roll building condition
        const condW = this.buildingCondWeights[district] || this.buildingCondWeights['default'] || {pristine:20,used:30,worn:25,damaged:15,ruined:10};
        const buildingCondition = this._rollWeighted(condW, rng);

        // 4. Generate floors
        const [fMin, fMax] = bt.floors || [1, 3];
        const floorCount = Math.floor(fMin + rng() * (fMax - fMin + 1));

        const floors = [];
        for (let f = 0; f < floorCount; f++) {
            const floorSeed = seed + (f + 1) * 104729;
            const floorRng = this._mulberry32(floorSeed);
            const [rMin, rMax] = bt.roomsPerFloor || [2, 4];
            const roomCount = Math.floor(rMin + floorRng() * (rMax - rMin + 1));
            const rooms = [];
            let budget = roomCount;
            for (const entry of (bt.roomPool || [])) {
                if (budget <= 0) break;
                if (floorRng() * 100 > entry.weight) continue;
                rooms.push(this.createRoom(entry.type, district, floorSeed + rooms.length * 7919));
                budget--;
            }
            while (budget-- > 0) rooms.push(this.createRoom('corridor', district, floorSeed + rooms.length * 7919));
            floors.push({ floorIndex: f, rooms });
        }

        const tierData = this.rarityTiers[buildingRarity] || {};
        return {
            name: btName, category: district,
            rarity: buildingRarity, condition: buildingCondition,
            tier: tierData, floorCount, floors, seed
        };
    },

    /**
     * Create a Room context — the factory that spawns all props.
     * Two dimensions:  roomType = WHAT (kitchen/lab/storage)
     *                  category = HOW  (slum/corp/military)
     *
     * Usage:
     *   // Full auto — room populates itself from pool:
     *   const room = AssetManager.createRoom('kitchen', 'slum', 42);
     *
     *   // Manual — you pick what goes in:
     *   const room = AssetManager.createRoom(null, 'slum', 42);
     *   room.spawn('chair');
     */
    createRoom: function(roomType, category, seed) {
        const mgr = this;
        let idx = 0;
        const room = {
            type: roomType, category, seed, props: [],

            spawn: function(blueprintName) {
                const prop = mgr.spawn(blueprintName, category, seed + (idx++) * 7919);
                if (prop) { prop.propIndex = idx - 1; room.props.push(prop); }
                return prop;
            },

            spawnList: function(names) {
                return names.map(n => room.spawn(n));
            },

            // Auto-populate from room type pool
            populate: function() {
                const rt = mgr.roomTypes[roomType];
                if (!rt) return room.props;

                const rng = mgr._mulberry32(seed + 3571);

                // 1. Required props always spawn (1 each)
                if (rt.required) rt.required.forEach(bp => room.spawn(bp));

                // 2. Roll prop count for this room
                const [minP, maxP] = rt.propCount || [3, 8];
                const budget = Math.floor(minP + rng() * (maxP - minP + 1));
                let remaining = budget - (rt.required ? rt.required.length : 0);

                // 3. Roll through pool
                const pool = rt.pool || [];
                for (const entry of pool) {
                    if (remaining <= 0) break;
                    const roll = rng() * 100;
                    if (roll > entry.weight) continue;

                    const [qMin, qMax] = entry.qty || [0, 1];
                    const qty = Math.min(remaining, Math.floor(qMin + rng() * (qMax - qMin + 1)));
                    for (let i = 0; i < qty; i++) room.spawn(entry.bp);
                    remaining -= qty;
                }

                return room.props;
            },

            getSurfaceWear: function() {
                const rng = mgr._mulberry32(seed + 999);
                const cond = mgr._rollCondition(category, rng);
                const w = mgr.wearEffects[cond] || {};
                return { condition: cond, wall: w.wallOverlay||null, floor: w.floorOverlay||null,
                         ceil: w.ceilOverlay||null, darken: w.darken||0, saturationMult: w.saturationMult||1 };
            },

            summary: function() {
                const t = {common:0,rare:0,epic:0}, c = {};
                room.props.forEach(p => { t[p.rarity]=(t[p.rarity]||0)+1; c[p.condition]=(c[p.condition]||0)+1; });
                return { type: roomType, category, seed, total: room.props.length, tiers: t, conditions: c };
            }
        };

        // Auto-populate if roomType is given
        if (roomType && mgr.roomTypes[roomType]) room.populate();

        return room;
    },

    /**
     * JIT Spawn — the whole point.
     * Blueprint + room category + seed → fully resolved prop.
     * 
     * Returns { variant, parts[], condition, scale, paletteName }
     * Each part has: shape, size, pos, rot, role, material { color, overlay, roughness, wearOverlay }
     *
     * Usage:
     *   const prop = AssetManager.spawn('chair', 'slum', 42);
     *   // → { variant:'basic', condition:'damaged', scale:0.93,
     *   //     parts: [{ shape:'box', size:[...], material:{ color:'#3d2a21', overlay:'ov_rust' } }, ...] }
     */
    spawn: function(blueprintName, roomCategory, seed) {
        const bp = this.blueprints[blueprintName];
        if (!bp) return null;

        const rng = this._mulberry32(seed);

        // 1. Roll rarity tier based on room category bias
        const rarityBias = this.rarityBias[roomCategory] || this.rarityBias['default'] ||
                           { common:70, rare:25, epic:5 };
        const rolledRarity = this._rollWeighted(rarityBias, rng);

        // 2. Pick variant — filter by rarity (only pick variants at or below rolled rarity)
        const rarityRank = { common:0, rare:1, epic:2 };
        const maxRank = rarityRank[rolledRarity] || 0;
        const eligible = bp.variants.filter(v => {
            const vRarity = (bp.rarity && bp.rarity[v]) || 'common';
            return rarityRank[vRarity] <= maxRank;
        });
        const pool = eligible.length > 0 ? eligible : [bp.variants[0]];
        const variantName = pool[Math.floor(rng() * pool.length)];
        const shapeParts = bp.shapes[variantName];
        if (!shapeParts) return null;

        const variantRarity = (bp.rarity && bp.rarity[variantName]) || 'common';
        const tierData = this.rarityTiers[variantRarity] || this.rarityTiers['common'] ||
                         { maxTris:200, textureMode:'procedural', segmentCap:8, label:'🟢' };

        // 3. Pick scale within range
        const [sMin, sMax] = bp.scale || [1, 1];
        const scale = sMin + rng() * (sMax - sMin);

        // 4. Resolve palette — intersect blueprint palettes with room category palettes
        const roomPalettes = this.categoryMap[roomCategory] || this.categoryMap['common'] || ['industrial'];
        const bpPalettes = bp.palettes || roomPalettes;
        const compatible = bpPalettes.filter(p => roomPalettes.includes(p));
        const palPool = compatible.length > 0 ? compatible : bpPalettes;
        const paletteName = palPool[Math.floor(rng() * palPool.length)];
        const pal = this.palettes[paletteName] || this.palettes['industrial'];

        // 5. Roll shared color pair (primary + accent) for cohesion
        const primaryColor = pal.colors[Math.floor(rng() * pal.colors.length)];
        const accentColor  = pal.accents ? pal.accents[Math.floor(rng() * pal.accents.length)] : primaryColor;

        // 6. Pick overlay — epic tier can use hero PNG textures
        let overlay = 'none';
        let heroTexture = null;
        if (tierData.textureMode === 'hero_png' && pal.textures && pal.textures.length > 0) {
            heroTexture = pal.textures[Math.floor(rng() * pal.textures.length)];
        } else if (rng() > 0.3 && pal.overlays.length) {
            overlay = pal.overlays[Math.floor(rng() * pal.overlays.length)];
        }

        // 7. Roll shared condition
        const condition = this._rollCondition(roomCategory, rng);
        const wear = this.wearEffects[condition] || { darken:0, roughnessBoost:0, wearOverlay:null, saturationMult:1.0 };

        // 8. Build parts with resolved materials
        const parts = shapeParts.map(part => {
            const role = this.roleMap[part.role] || 'primary';
            let color;
            if (role === 'emissive') color = '#ffffcc';
            else if (role === 'accent') color = accentColor;
            else color = primaryColor;

            // Apply wear
            if (wear.darken > 0) color = this._darkenHex(color, wear.darken);
            const [rMin, rMax] = pal.roughness || [0.8, 0.95];
            const roughness = Math.min(1.0, (rMin + rng() * (rMax - rMin)) + wear.roughnessBoost);

            return {
                shape: part.shape,
                size: part.size,
                pos: part.pos,
                rot: part.rot || null,
                radius: part.radius || 0,
                role: part.role,
                container: part.container || false,
                emissive: part.emissive || false,
                material: { color, overlay, heroTexture, roughness, wearOverlay: wear.wearOverlay, condition }
            };
        });

        return {
            variant: variantName, parts, condition, scale,
            paletteName, blueprint: blueprintName,
            rarity: variantRarity, tier: tierData
        };
    },

    // ─── AI TEXTURE GENERATION (Layer 4) ─────────────────────────
    promptTemplates: {},
    _promptsLoaded: false,
    _textureCache: {},
    _textureGeneratorUrl: null,  // set to local SD or API endpoint

    loadPromptTemplates: async function(basePath = 'props/') {
        if (this._promptsLoaded) return;
        try {
            const resp = await fetch(basePath + 'prompt_templates.json');
            this.promptTemplates = await resp.json();
            this._promptsLoaded = true;
            console.log('[AssetManager] 🎨 Prompt templates loaded');
        } catch(e) {
            console.warn('[AssetManager] ⚠️ prompt_templates.json not found');
            this._promptsLoaded = true;
        }
    },

    /**
     * Compose AI prompts from a spawned prop's metadata.
     * All placeholders resolve from the prop's own data — no manual input.
     *
     * Usage:
     *   const prop = AssetManager.spawn('chair', 'slum', 42);
     *   const prompts = AssetManager.composePrompts(prop);
     *   // → [{ face:'front', prompt:'pixel art 32x32, front view of a simple wooden chair...', px:32 }]
     */
    composePrompts: function(prop) {
        const T = this.promptTemplates;
        if (!T._face_templates) return [];

        const rarity = prop.rarity || 'common';
        const res = T._resolution_by_rarity[rarity] || { px: 32, faces: ['front'] };
        const bp = prop.blueprint || 'unknown';
        const variant = prop.variant || 'basic';

        // Resolve all placeholders
        const propDescs = T._prop_descriptions[bp] || {};
        const propDesc = propDescs[variant] || `${variant} ${bp}`;
        const artStyle = (T._placeholders.art_style || {})[rarity] || 'pixel art 32x32';
        const detailLevel = (T._placeholders.detail_level || {})[rarity] || 'simple flat shading';
        const background = (T._placeholders.background || {}).default || 'transparent background';
        const catStyle = (T._category_styles || {})[prop.category] || 'neutral industrial';
        const condDesc = (T._condition_descriptions || {})[prop.condition] || 'standard condition';

        // Material description from palette
        const palKey = prop.paletteName || 'organic';
        const matTemplate = (T._material_descriptions || {})[palKey] || '{color} surface';
        const primaryColor = prop.parts[0]?.material?.color || '#888888';
        const matDesc = matTemplate.replace('{color}', this._hexToColorName(primaryColor));

        // Dimensions from blueprint shapes
        const mainPart = prop.parts[0] || {};
        const [w, h, d] = (mainPart.size || [0.5, 0.5, 0.5]).map(v => Math.round(v * 100));

        const prompts = [];
        for (const face of res.faces) {
            const template = T._face_templates[face] || T._base_prompt || '';
            const prompt = template
                .replace('{art_style}', artStyle)
                .replace('{face}', face)
                .replace('{prop_desc}', propDesc)
                .replace('{w}', w).replace('{h}', h).replace('{d}', d)
                .replace('{dimensions}', `${w}x${h}cm`)
                .replace('{material_desc}', matDesc)
                .replace('{condition_desc}', condDesc)
                .replace('{category_style}', catStyle)
                .replace('{detail_level}', detailLevel)
                .replace('{background}', background);

            prompts.push({ face, prompt, px: res.px });
        }
        return prompts;
    },

    /**
     * Generate textures for a prop via AI.
     * Checks cache first (keyed by seed → deterministic).
     * Falls back to procedural if no generator configured.
     *
     * Usage:
     *   AssetManager.setTextureGenerator('http://localhost:7860/sdapi/v1/txt2img');
     *   const textures = await AssetManager.generateTextures(prop, seed);
     */
    setTextureGenerator: function(url) { this._textureGeneratorUrl = url; },

    generateTextures: async function(prop, seed) {
        const cacheKey = `${prop.blueprint}_${prop.variant}_${seed}`;
        if (this._textureCache[cacheKey]) return this._textureCache[cacheKey];

        const prompts = this.composePrompts(prop);
        if (!prompts.length || !this._textureGeneratorUrl) {
            return null; // fallback to procedural
        }

        const textures = {};
        for (const { face, prompt, px } of prompts) {
            try {
                const resp = await fetch(this._textureGeneratorUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt, seed, width: px, height: px,
                        steps: prop.rarity === 'epic' ? 30 : 15,
                        cfg_scale: 7, sampler_name: 'Euler'
                    })
                });
                const data = await resp.json();
                if (data.images?.[0]) textures[face] = data.images[0]; // base64
            } catch(e) {
                console.warn(`[AssetManager] 🎨 Texture gen failed for ${face}: ${e.message}`);
            }
        }
        this._textureCache[cacheKey] = textures;
        return textures;
    },

    // Helper: hex to rough color name (for natural language prompts)
    _hexToColorName: function(hex) {
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        const max = Math.max(r,g,b), min = Math.min(r,g,b), lum = (max+min)/510;
        if (lum < 0.15) return 'very dark near-black';
        if (lum > 0.85) return 'pale near-white';
        if (max - min < 30) return lum > 0.5 ? 'light gray' : 'dark gray';
        if (r > g && r > b) return g > 150 ? 'warm amber' : (b > 100 ? 'dusty mauve' : 'deep red-brown');
        if (g > r && g > b) return r > 150 ? 'olive green' : 'forest green';
        if (b > r && b > g) return r > 100 ? 'steel blue' : 'deep navy';
        return 'muted earth tone';
    },

    // Weighted roll helper (reused by rarity and condition)
    _rollWeighted: function(weights, rng) {
        const entries = Object.entries(weights);
        const total = entries.reduce((s, [,w]) => s + w, 0);
        let roll = rng() * total;
        for (const [key, w] of entries) {
            roll -= w;
            if (roll <= 0) return key;
        }
        return entries[entries.length - 1][0];
    },

    // ─── MATERIAL PALETTE SYSTEM (Being/Guild pattern) ───────────
    // Palettes = Guilds.  Props/Rooms = Beings.
    // Room category → palette candidates → seed picks one → material resolved.
    palettes: {},
    categoryMap: {},
    _palettesLoaded: false,

    loadPalettes: async function(basePath = 'props/') {
        if (this._palettesLoaded) return;
        try {
            const resp = await fetch(basePath + 'palettes.json');
            const data = await resp.json();
            this.categoryMap = data._category_map || {};
            this.conditionWeights = data._condition_weights || {};
            this.wearEffects = data._wear_effects || {};
            delete data._doc; delete data._category_map;
            delete data._condition_weights; delete data._wear_effects;
            this.palettes = data;
            this._palettesLoaded = true;
            console.log(`[AssetManager] 🎨 ${Object.keys(this.palettes).length} palettes, ${Object.keys(this.conditionWeights).length} condition profiles loaded`);
        } catch(e) {
            console.warn('[AssetManager] ⚠️ palettes.json not found, inline fallback');
            this.palettes = {
                industrial: { colors:['#4a4a4a','#5c5c5c','#3d3d3d'], accents:['#8B0000'], overlays:['ov_metal','ov_diamond','ov_rust'], textures:[], roughness:[0.75,0.95] },
                organic:    { colors:['#8B4513','#A0522D','#6B3A2A'], accents:['#228B22'], overlays:['ov_wood','ov_leather'], textures:[], roughness:[0.8,1.0] },
                abandoned:  { colors:['#5c5040','#4a4238','#6b5d4f'], accents:['#8B0000'], overlays:['ov_rust','ov_concrete'], textures:[], roughness:[0.85,1.0] }
            };
            this.categoryMap = { slum:['abandoned'], military:['industrial'], common:['organic','industrial'] };
            this.conditionWeights = { default:{ pristine:20, used:30, worn:25, damaged:15, ruined:10 } };
            this.wearEffects = {
                pristine:{ darken:0, roughnessBoost:0, wearOverlay:null, saturationMult:1.0 },
                damaged:{ darken:0.2, roughnessBoost:0.15, wearOverlay:'ov_scratches', saturationMult:0.7 }
            };
            this._palettesLoaded = true;
        }
    },

    /**
     * Resolve a full material descriptor from category + seed.
     * Returns { color, accent, overlay, texture, roughness, paletteName,
     *           condition, wearOverlay, darken, saturationMult }
     * 
     * Usage:  const mat = AssetManager.resolve('slum', 42);
     *         // → { color:'#4a4238', overlay:'ov_rust', condition:'damaged',
     *         //     wearOverlay:'ov_scratches', darken:0.2, roughness:0.95 }
     */
    resolve: function(category, seed, partType) {
        // Special types bypass palette entirely
        const BYPASS = { glass:'none', sprite:'none', red_neo:'none', cyan_neo:'none', l3_screen:'none' };
        if (partType && BYPASS[partType] !== undefined) {
            return { color: null, accent: null, overlay: 'none', texture: null,
                     roughness: 0.5, paletteName: 'bypass',
                     condition: 'pristine', wearOverlay: null, darken: 0, saturationMult: 1.0 };
        }

        const rng = this._mulberry32(seed);
        const names = this.categoryMap[category] || this.categoryMap['common'] || ['industrial'];

        // Pick palette from candidates (like Guild assignment)
        const pal = this.palettes[names[Math.floor(rng() * names.length)]] ||
                     this.palettes['industrial'] ||
                     { colors:['#666'], accents:['#999'], overlays:[], textures:[], roughness:[0.8,0.95] };

        const color   = pal.colors[Math.floor(rng() * pal.colors.length)];
        const accent  = pal.accents ? pal.accents[Math.floor(rng() * pal.accents.length)] : color;
        const overlay = (rng() > 0.3 && pal.overlays.length) ? pal.overlays[Math.floor(rng() * pal.overlays.length)] : 'none';
        const texture = (pal.textures && pal.textures.length) ? pal.textures[Math.floor(rng() * pal.textures.length)] : null;
        const [rMin, rMax] = pal.roughness || [0.8, 0.95];
        let roughness = rMin + rng() * (rMax - rMin);

        // ─── CONDITION (wear layer) ──────────────────────────
        const condition = this._rollCondition(category, rng);
        const wear = this.wearEffects[condition] ||
                     { darken:0, roughnessBoost:0, wearOverlay:null, saturationMult:1.0 };
        roughness = Math.min(1.0, roughness + wear.roughnessBoost);

        // Apply darken to color
        const finalColor = wear.darken > 0 ? this._darkenHex(color, wear.darken) : color;

        return {
            color: finalColor, accent, overlay, texture, roughness,
            paletteName: names[0],
            condition, wearOverlay: wear.wearOverlay,
            darken: wear.darken, saturationMult: wear.saturationMult
        };
    },

    /**
     * Resolve N materials at once for a multi-part prop.
     * Each part gets a unique sub-seed (prime-offset) for variety within cohesion.
     * Condition is shared across all parts (same prop = same wear level).
     */
    resolveN: function(category, baseSeed, count, partTypes) {
        const results = [];
        // Roll condition once for the whole prop (shared wear)
        const condRng = this._mulberry32(baseSeed);
        const sharedCondition = this._rollCondition(category, condRng);
        for (let i = 0; i < count; i++) {
            const r = this.resolve(category, baseSeed + i * 7919, partTypes ? partTypes[i] : null);
            r.condition = sharedCondition;  // override per-part with shared
            const wear = this.wearEffects[sharedCondition] || { darken:0, roughnessBoost:0, wearOverlay:null, saturationMult:1.0 };
            r.wearOverlay = wear.wearOverlay;
            r.darken = wear.darken;
            r.saturationMult = wear.saturationMult;
            if (wear.darken > 0) r.color = this._darkenHex(r.color, wear.darken);
            r.roughness = Math.min(1.0, r.roughness + wear.roughnessBoost);
            results.push(r);
        }
        return results;
    },

    // Weighted condition roll from _condition_weights
    conditionWeights: {},
    wearEffects: {},

    _rollCondition: function(category, rng) {
        const weights = this.conditionWeights[category] || this.conditionWeights['default'] ||
                        { pristine:20, used:30, worn:25, damaged:15, ruined:10 };
        const entries = Object.entries(weights);
        const total = entries.reduce((s, [,w]) => s + w, 0);
        let roll = rng() * total;
        for (const [cond, w] of entries) {
            roll -= w;
            if (roll <= 0) return cond;
        }
        return 'used';
    },

    // Darken a hex color by a fraction (0-1)
    _darkenHex: function(hex, amount) {
        if (!hex || hex.length < 7) return hex;
        const r = Math.max(0, Math.round(parseInt(hex.slice(1,3), 16) * (1 - amount)));
        const g = Math.max(0, Math.round(parseInt(hex.slice(3,5), 16) * (1 - amount)));
        const b = Math.max(0, Math.round(parseInt(hex.slice(5,7), 16) * (1 - amount)));
        return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
    },

    _mulberry32: function(a) {
        return function() {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
};
