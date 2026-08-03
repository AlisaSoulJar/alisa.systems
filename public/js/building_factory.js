/**
 * ALISA Building Factory
 * Produces cyberpunk buildings from archetype templates + texture banks.
 * 
 * Usage:
 *   BuildingFactory.loadArchetype('skyscraper', 0, () => {
 *       const mesh = BuildingFactory.create('skyscraper', 0);
 *       scene.add(mesh);
 *   });
 */
const BuildingFactory = {

    // ==========================================
    // ARCHETYPE DEFINITIONS
    // ==========================================
    archetypes: {
        skyscraper: {
            name: 'Skyscraper',
            baseW: 2.5,  baseH: 10,  baseD: 2.5,
            scaleRange: [0.8, 1.3],  // random scale variation
            edgeColor: 0x4488ff,
            emissiveIntensity: 0.35,
        },
        commercial: {
            name: 'Commercial Block',
            baseW: 4.5,  baseH: 5,  baseD: 3.5,
            scaleRange: [0.9, 1.1],
            edgeColor: 0x00ffff,
            emissiveIntensity: 0.45,
        },
        shop: {
            name: 'Shop',
            baseW: 3.5,  baseH: 2,  baseD: 2.5,
            scaleRange: [0.8, 1.2],
            edgeColor: 0xff00ff,
            emissiveIntensity: 0.55,
        },
        industrial: {
            name: 'Industrial',
            baseW: 5,  baseH: 4,  baseD: 4,
            scaleRange: [0.9, 1.15],
            edgeColor: 0xff4400,
            emissiveIntensity: 0.3,
        },
        residential: {
            name: 'Residential',
            baseW: 3,  baseH: 7,  baseD: 3,
            scaleRange: [0.85, 1.2],
            edgeColor: 0xffaa44,
            emissiveIntensity: 0.4,
        },
        datacenter: {
            name: 'Datacenter',
            baseW: 3.5,  baseH: 3,  baseD: 3.5,
            scaleRange: [0.9, 1.1],
            edgeColor: 0x00ff88,
            emissiveIntensity: 0.5,
        },
        hub: {
            name: 'Hub/Government',
            baseW: 5.5,  baseH: 4.5,  baseD: 5.5,
            scaleRange: [0.95, 1.05],
            edgeColor: 0x00ffff,
            emissiveIntensity: 0.35,
        },
        nightlife: {
            name: 'Nightlife',
            baseW: 4,  baseH: 2.5,  baseD: 3,
            scaleRange: [0.85, 1.15],
            edgeColor: 0xff00ff,
            emissiveIntensity: 0.6,
        },
    },

    // Texture cache: { "sky_v0_front": THREE.Texture, ... }
    _texCache: {},
    _loading: {},

    // ==========================================
    // TEXTURE LOADING
    // ==========================================

    /**
     * Load all 5 face textures for an archetype variant.
     * @param {string} prefix - e.g. 'sky', 'shop'
     * @param {number} variant - e.g. 0, 1, 2
     * @param {function} onComplete - called when all 5 loaded
     */
    loadArchetype: function(prefix, variant, onComplete) {
        const loader = new THREE.TextureLoader();
        const faces = ['front', 'back', 'left', 'right', 'top'];
        let loaded = 0;

        faces.forEach(face => {
            const key = `${prefix}_v${variant}_${face}`;
            if (this._texCache[key]) { loaded++; if (loaded === 5) onComplete(); return; }

            const url = `../textures/${key}.png`;
            this._loading[key] = true;

            loader.load(url, (tex) => {
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.NearestFilter;
                this._texCache[key] = tex;
                this._loading[key] = false;
                loaded++;
                if (loaded === 5) onComplete();
            }, undefined, (err) => {
                console.warn(`[BuildingFactory] Missing texture: ${url}`);
                this._loading[key] = false;
                loaded++;
                if (loaded === 5) onComplete();
            });
        });
    },

    // ==========================================
    // BUILDING CREATION
    // ==========================================

    /**
     * Create a building mesh from an archetype.
     * @param {string} type - archetype key (e.g. 'skyscraper')
     * @param {string} texPrefix - texture prefix (e.g. 'sky')
     * @param {number} variant - texture variant (e.g. 0)
     * @param {object} opts - { scale, x, z }
     * @returns {THREE.Group}
     */
    create: function(type, texPrefix, variant, opts = {}) {
        const arch = this.archetypes[type];
        if (!arch) { console.error(`Unknown archetype: ${type}`); return new THREE.Group(); }

        const group = new THREE.Group();
        group.name = `${arch.name}_${texPrefix}_v${variant}`;

        // Random scale within range
        const scaleMin = arch.scaleRange[0];
        const scaleMax = arch.scaleRange[1];
        const s = opts.scale || (scaleMin + Math.random() * (scaleMax - scaleMin));
        
        const w = arch.baseW * s;
        const h = arch.baseH * s;
        const d = arch.baseD * s;

        // Materials per face
        const prefix = `${texPrefix}_v${variant}`;
        const materials = [
            this._makeMat(`${prefix}_right`, arch.emissiveIntensity),   // +X
            this._makeMat(`${prefix}_left`, arch.emissiveIntensity),    // -X
            this._makeMat(`${prefix}_top`, arch.emissiveIntensity),     // +Y
            new THREE.MeshStandardMaterial({ color: 0x060608 }),        // -Y (bottom)
            this._makeMat(`${prefix}_front`, arch.emissiveIntensity),   // +Z
            this._makeMat(`${prefix}_back`, arch.emissiveIntensity),    // -Z
        ];

        // Main body
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, materials);
        mesh.position.y = h / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.archetype = type;
        mesh.userData.isInteractable = true;
        group.add(mesh);

        // Edge wireframe
        const edges = new THREE.EdgesGeometry(geo, 1);
        const edgeMat = new THREE.LineBasicMaterial({
            color: arch.edgeColor, transparent: true, opacity: 0.2
        });
        const wire = new THREE.LineSegments(edges, edgeMat);
        wire.position.y = h / 2;
        group.add(wire);

        // Position
        if (opts.x !== undefined) group.position.x = opts.x;
        if (opts.z !== undefined) group.position.z = opts.z;
        if (opts.elevation !== undefined) group.position.y = opts.elevation;

        group.userData.buildingData = { type, w, h, d, arch, elevation: opts.elevation || 0 };
        return group;
    },

    _makeMat: function(texKey, emissiveI) {
        const tex = this._texCache[texKey];
        if (!tex) return new THREE.MeshStandardMaterial({ color: 0x0c0c14 });
        return new THREE.MeshStandardMaterial({
            map: tex,
            emissiveMap: tex,
            emissive: 0xffffff,
            emissiveIntensity: emissiveI || 0.4,
            roughness: 0.35,
            metalness: 0.6
        });
    },
};
