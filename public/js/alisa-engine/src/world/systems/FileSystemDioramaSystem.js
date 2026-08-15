/*
 * ALISA Colonial Overworld - Phase 8: Core Node Diorama
 * "The Mighty Max Black Monolith"
 *
 * Replaces the hex-based chunk renderer with a single, perfectly sculpted
 * solid monolith to act as the primary cross-domain Hub.
 */

/**
 * ⚠️ ESTE IMPORT FALTABA, Y ERA EL MÓDULO MÁS GRANDE DEL MOTOR.
 *
 * 52 KB y 111 usos de `THREE.` sin importarlo: dependía de que alguien hubiera
 * dejado un `<script>` clásico con la global puesta. Cargado como módulo —que es
 * como lo carga cualquier página moderna— reventaba con `THREE is not defined`.
 *
 * Lo destapó `labs/catalogo.html` al importar las 180 piezas una a una: de las
 * tres que no cargaban, dos eran falsos positivos (un `vite.config`, que no es
 * pieza, y un módulo que pide `@tensorflow/tfjs`). Ésta era el fallo de verdad.
 *
 * Nadie lo había visto porque la única página que lo usaba lo cargaba con las
 * globales ya puestas: funcionaba EN SU SITIO y en ningún otro. Un módulo que
 * sólo funciona en el sitio donde nació no es un módulo.
 */
import * as THREE from 'three';

export const FileSystemDioramaSystem = {
    canvas: null,
    renderer: null,
    scene: null,
    camera: null,
    composer: null,
    controls: null,
    raycaster: null,
    mouse: new THREE.Vector2(),
    
    // Diorama State
    masterBlock: null,
    entityRefs: {}, // Replaces portals[], maps id -> { group, targetX, targetZ, holoText, isPortal }
    domainEntities: {}, // Mapped by ID
    
    // Frame logic
    lastTime: 0,
    animFrame: null,

    /**
     * ⚠️ POR QUÉ HAY UN `rng` EN UN OBJETO SINGLETON SIN CONSTRUCTOR.
     *
     * Este módulo no es una clase, es un objeto único con `init()` haciendo de
     * constructor — así que ahí es donde se cachea la fuente de azar, siguiendo
     * el mismo patrón que `BSPSystem`/`WorldBuilderSystem` (config.rng cacheado
     * una vez, usado en todas partes). Sin esto, 37 llamadas dispersas hacían
     * que dos dioramas del mismo `target_path` nunca fueran el mismo edificio.
     * Se deja `Math.random` como valor por defecto: nadie que llame a `init()`
     * sin pasar `rng` nota ningún cambio.
     */
    rng: Math.random,

    /**
     * Procedural texture for real-building windows.
     * Generates a canvas and maps it to a seamless pattern of 
     * sleeping and neon-lit office windows without geometry cost.
     */
    _generateWindowTexture: function() {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 512;
        const ctx = c.getContext('2d');
        
        // Transparent base (allows vertexColors to show through on walls untouched)
        ctx.clearRect(0, 0, 512, 512);

        // Draw active lit windows 
        for (let x = 0; x < 512; x += 16) {
            for (let y = 0; y < 512; y += 16) {
                // 8% chance to be lit up
                if (this.rng() > 0.92) {
                    ctx.fillStyle = this.rng() > 0.6 ? '#fff7b0' : '#00ffff'; // Warm tungsten or cyber-cyan
                    ctx.fillRect(x + 2, y + 2, 12, 12);
                }
            }
        }
        
        const map = new THREE.CanvasTexture(c);
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.magFilter = THREE.NearestFilter; // Sharp cyberpunk grid
        map.minFilter = THREE.LinearMipmapLinearFilter;
        return map;
    },

    /**
     * @param {Object} [config]
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get a reproducible diorama.
     */
    init: function(config = {}) {
        this.rng = config.rng || Math.random;
        this.canvas = document.getElementById('viewport');
        
        // 1. WebGL Renderer Structure
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true,
            alpha: false // Force WebGL BG (disable CSS bleeding)
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020204); // Near-black for cyberpunk
        
        // 2. Camera (Orthographic — zoomed out for miniature diorama feel)
        const aspect = window.innerWidth / window.innerHeight;
        const d = 50; // Wider view = smaller diorama
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        
        // Initial Isometric Angle
        this.camera.position.set(40, 40, 40); 
        this.camera.lookAt(0, 0, 0);

        // 3. OrbitControls (The hand holding the toy)
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        // Allows inspecting the VERY bottom of the mighty max box! No restrictions!
        
        // 4. Lighting Engine (Dark Cyberpunk — subtle but buildings still visible)
        const ambientLight = new THREE.AmbientLight(0x445566, 0.5); 
        ambientLight.name = 'AmbientLight';
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0x334455, 0.6); 
        dirLight.position.set(20, 50, -20);
        dirLight.name = 'DirLight';
        this.scene.add(dirLight);

        // Subtle rim from the side
        const fillLight = new THREE.DirectionalLight(0x223344, 0.3);
        fillLight.position.set(-20, 10, 20);
        fillLight.name = 'FillLight';
        this.scene.add(fillLight);
        
        // 5. Post Processing (Bloom)
        if (typeof THREE.EffectComposer !== 'undefined') {
            const renderScene = new THREE.RenderPass(this.scene, this.camera);
            this.composer = new THREE.EffectComposer(this.renderer);
            this.composer.addPass(renderScene);

            // Elegant Cyberpunk Bloom (not overwhelming)
            const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
            bloomPass.threshold = 0.3;
            bloomPass.strength = 1.5;
            bloomPass.radius = 0.5;
            this.composer.addPass(bloomPass);
        }

        // 6. Sculpt the Master Block (The Node Chassis)
        this.buildMasterBlock();
        
        // 7. Raycasting & Interaction
        this.raycaster = new THREE.Raycaster();
        this.setupInteractions();
        
        // 8. Atmospheric Fog (depth fade into black)
        this.scene.fog = new THREE.FogExp2(0x020204, 0.012);
        
        // 9. Weather Particles (floating data bits)
        if (typeof WeatherSystem !== 'undefined') {
            WeatherSystem.currentTheme = 'node';  // Cyan data particles
            WeatherSystem.particleCount = 400;     // Lighter budget for diorama
            WeatherSystem.bounds = { x: 50, y: 20, z: 50 };
            WeatherSystem.init(this.scene);
        }
        
        // 10. CSS Atmospheric Layers (scanlines + vignette boost)
        const scanlines = document.querySelector('.scanlines');
        if (scanlines) scanlines.style.opacity = '0.35';
        const vignette = document.querySelector('.vignette-overlay');
        if (vignette) vignette.style.background = 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.7) 100%)';

        window.addEventListener('resize', this.resize.bind(this));
        
        // Start Loop
        if (typeof WeatherSystem !== 'undefined') WeatherSystem.init(this.scene);
        this.loop(0);
        
        console.log("[Renderer] Phase 18: Core Node Diorama + Atmosphere Initialized.");
    },
    
    // Satisfy main.js domain changes without crashing
    clearWorld: function() {
        console.log("[Renderer] clearWorld placeholder invoked.");
        // The diorama purges dynamically via state.entities, no need to clear hexes.
    },
    
    buildMasterBlock: async function(targetPath = "default") {
        // --- Cleanup Previous ---
        if (this.buildingMeshes) {
            this.buildingMeshes.forEach(b => { this.scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); });
        }
        if (this.groundPlane) { this.scene.remove(this.groundPlane); }
        if (this.neonGroup) { this.scene.remove(this.neonGroup); }
        if (this.nebulaMeshes) { this.nebulaMeshes.forEach(n => this.scene.remove(n)); }
        
        this.buildingMeshes = [];
        this.cityNodes = {};
        this.trafficDots = [];
        this.nebulaMeshes = [];
        this.neonGroup = new THREE.Group();
        this.scene.add(this.neonGroup);
        
        // --- 1. Fetch FileSystem Anatomy ---
        let fsNodes = [];
        try {
            console.log("[Renderer] Fetching FileSystem anatomy for Diorama...");
            const res = await fetch(`/system/filesystem?target_path=${encodeURIComponent(targetPath)}`);
            const data = await res.json();
            if (data.nodes && data.nodes.length > 0) fsNodes = data.nodes;
        } catch(e) {
            console.warn("[Renderer] FileSystem fetch failed. Building placeholder diorama.", e);
        }
        
        // --- 2. Layout Planner ---
        // Grid parameters
        const gridW = 16, gridD = 16;
        const cellSize = 3.0;    // World units per grid cell
        const totalW = gridW * cellSize;
        const totalD = gridD * cellSize;
        const halfW = totalW / 2;
        const halfD = totalD / 2;
        const groundY = -8;      // Ground plane Y position
        
        // Place buildings using a spiral from center
        const placements = [];
        const occupied = new Set();
        const cx = Math.floor(gridW / 2), cz = Math.floor(gridD / 2);
        
        // Spiral walk generator
        const spiralOrder = [];
        spiralOrder.push([cx, cz]); // Center first
        for (let ring = 1; ring < Math.max(gridW, gridD); ring++) {
            for (let x = cx - ring; x <= cx + ring; x++) {
                for (let z = cz - ring; z <= cz + ring; z++) {
                    if (Math.abs(x - cx) !== ring && Math.abs(z - cz) !== ring) continue;
                    if (x >= 0 && x < gridW && z >= 0 && z < gridD) spiralOrder.push([x, z]);
                }
            }
        }
        
        // Assign filesystem nodes to grid cells
        const maxBuildings = Math.min(fsNodes.length || 25, 45);
        let nodeIdx = 0;
        
        for (const [gx, gz] of spiralOrder) {
            if (placements.length >= maxBuildings) break;
            const key = `${gx},${gz}`;
            if (occupied.has(key)) continue;
            
            // Ensure spacing: skip if any neighbor is occupied
            const neighbors = [[1,0],[-1,0],[0,1],[0,-1]];
            let tooClose = false;
            for (const [dx, dz] of neighbors) {
                if (occupied.has(`${gx+dx},${gz+dz}`)) { tooClose = true; break; }
            }
            // Allow center to be placed always; for others, enforce spacing
            if (tooClose && placements.length > 0) continue;
            
            occupied.add(key);
            
            const node = nodeIdx < fsNodes.length ? fsNodes[nodeIdx++] : null;
            const isCore = (gx === cx && gz === cz);
            
            // Height based on node size (logarithmic) or random
            let height;
            if (isCore) {
                height = 12;
            } else if (node) {
                height = 2 + Math.min(10, Math.log10(node.sizeBytes + 1) * 1.2);
            } else {
                height = 1.5 + this.rng() * 5;
            }
            
            // Building type selection
            const types = ['tower', 'cube', 'slab', 'spire', 'wedge'];
            let type;
            if (isCore) type = 'core';
            else if (height > 7) type = 'tower';
            else if (height > 4) type = this.rng() > 0.5 ? 'cube' : 'wedge';
            else type = this.rng() > 0.5 ? 'slab' : 'spire';
            
            // Width/depth variation
            let w = 1.5 + this.rng() * 1.0;
            let d = 1.5 + this.rng() * 1.0;
            if (type === 'slab') { w = 2.0 + this.rng(); d = 1.0 + this.rng() * 0.5; height = Math.min(height, 3); }
            if (type === 'tower') { w = 1.2 + this.rng() * 0.5; d = 1.2 + this.rng() * 0.5; }
            if (type === 'core') { w = 2.5; d = 2.5; }
            
            const worldX = gx * cellSize - halfW + cellSize / 2;
            const worldZ = gz * cellSize - halfD + cellSize / 2;
            
            placements.push({ gx, gz, worldX, worldZ, height, type, w, d, node, isCore });
            
            if (node) this.cityNodes[key] = node;
            else if (isCore) this.cityNodes[key] = { id: targetPath === "default" ? "ALISA_ROOT" : targetPath, sizeBytes: 888888888, type: "core" };
        }
        
        // --- 3. Building Factory ---
        const facadeTypes = ['office', 'residential', 'datacenter', 'industrial', 'neon', 'lab'];
        
        for (const p of placements) {
            const { worldX, worldZ, height, type, w, d, node, isCore } = p;
            
            // Procedural Facade Texture (unique per building!)
            const facadeStyle = isCore ? 'neon' : facadeTypes[Math.floor(this.rng() * facadeTypes.length)];
            const facadeTex = this._generateFacadeTexture(facadeStyle, height, isCore);
            
            // Color tinting
            let hueBase = 0.55 + this.rng() * 0.2;
            if (isCore) hueBase = 0.5; // Cyan core
            
            const nightColor = new THREE.Color().setHSL(hueBase, 0.65, 0.12);
            const dayColor = new THREE.Color().setHSL(hueBase, 0.08, 0.88);
            
            // Build geometry based on type
            const group = new THREE.Group();
            group.position.set(worldX, groundY, worldZ);
            
            if (type === 'core') {
                // Hexagonal prism for the ALISA core
                const geo = new THREE.CylinderGeometry(w * 0.7, w * 0.7, height, 6);
                geo.translate(0, height / 2, 0);
                const mat = new THREE.MeshStandardMaterial({
                    color: 0xffffff, map: facadeTex, emissive: 0x00ffff, emissiveMap: facadeTex,
                    emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.9
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.userData.isInteractable = true;
                mesh.userData.buildingData = p;
                group.add(mesh);
                
                // Crown antenna
                const crownGeo = new THREE.ConeGeometry(0.3, 2, 6);
                crownGeo.translate(0, height + 1, 0);
                const crownMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2.0 });
                group.add(new THREE.Mesh(crownGeo, crownMat));
                
            } else if (type === 'tower') {
                // Base pedestal
                const baseH = height * 0.15;
                const baseGeo = new THREE.BoxGeometry(w * 1.2, baseH, d * 1.2);
                baseGeo.translate(0, baseH / 2, 0);
                
                // Main shaft
                const shaftH = height * 0.6;
                const shaftGeo = new THREE.BoxGeometry(w, shaftH, d);
                shaftGeo.translate(0, baseH + shaftH / 2, 0);
                
                // Crown
                const crownH = height * 0.25;
                const crownGeo = new THREE.BoxGeometry(w * 0.7, crownH, d * 0.7);
                crownGeo.translate(0, baseH + shaftH + crownH / 2, 0);
                
                const mat = new THREE.MeshStandardMaterial({
                    color: dayColor, map: facadeTex, emissive: nightColor, emissiveMap: facadeTex,
                    emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.85
                });
                
                [baseGeo, shaftGeo, crownGeo].forEach(g => {
                    const m = new THREE.Mesh(g, mat);
                    m.userData.isInteractable = true;
                    m.userData.buildingData = p;
                    group.add(m);
                });
                
            } else if (type === 'wedge') {
                // L-shaped building (two perpendicular boxes)
                const h1 = height, h2 = height * 0.6;
                const geo1 = new THREE.BoxGeometry(w, h1, d * 0.5);
                geo1.translate(0, h1/2, -d*0.25);
                const geo2 = new THREE.BoxGeometry(w * 0.5, h2, d);
                geo2.translate(-w*0.25, h2/2, 0);
                
                const mat = new THREE.MeshStandardMaterial({
                    color: dayColor, map: facadeTex, emissive: nightColor, emissiveMap: facadeTex,
                    emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.8
                });
                [geo1, geo2].forEach(g => {
                    const m = new THREE.Mesh(g, mat);
                    m.userData.isInteractable = true;
                    m.userData.buildingData = p;
                    group.add(m);
                });
                
            } else {
                // Simple box (cube, slab, spire)
                const geo = new THREE.BoxGeometry(w, height, d);
                geo.translate(0, height / 2, 0);
                
                const mat = new THREE.MeshStandardMaterial({
                    color: dayColor, map: facadeTex, emissive: nightColor, emissiveMap: facadeTex,
                    emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.85
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.userData.isInteractable = true;
                mesh.userData.buildingData = p;
                group.add(mesh);
                
                // Spire gets antenna
                if (type === 'spire') {
                    const aGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 4);
                    aGeo.translate(0, height + 0.75, 0);
                    const aMat = new THREE.MeshStandardMaterial({ color: 0x333344 });
                    group.add(new THREE.Mesh(aGeo, aMat));
                    // Blink light
                    const blinkGeo = new THREE.SphereGeometry(0.08, 4, 4);
                    blinkGeo.translate(0, height + 1.5, 0);
                    const blinkMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
                    group.add(new THREE.Mesh(blinkGeo, blinkMat));
                }
            }
            
            // Roof greebles (HVAC boxes)
            if (!isCore && this.rng() > 0.3) {
                const nProps = 1 + Math.floor(this.rng() * 3);
                for (let i = 0; i < nProps; i++) {
                    const pw = 0.15 + this.rng() * 0.3;
                    const ph = 0.1 + this.rng() * 0.2;
                    const pd = 0.15 + this.rng() * 0.3;
                    const propGeo = new THREE.BoxGeometry(pw, ph, pd);
                    propGeo.translate(
                        (this.rng() - 0.5) * w * 0.6,
                        height + ph / 2,
                        (this.rng() - 0.5) * d * 0.6
                    );
                    const propMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.5, metalness: 0.7 });
                    group.add(new THREE.Mesh(propGeo, propMat));
                }
            }
            
            // Edge outlines (cel-shading)
            group.children.forEach(child => {
                if (child.geometry && child.userData.isInteractable) {
                    try {
                        const edgeGeo = new THREE.EdgesGeometry(child.geometry, 15);
                        const edgeMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
                        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
                        edges.scale.set(1.002, 1.002, 1.002);
                        edges.userData._isEdge = true;
                        child.add(edges);
                    } catch(e) {}
                }
            });
            
            // Signage label
            const labelText = isCore ? 'ALISA HUB' : (node ? node.id.split(/[/\\]/).pop().substring(0, 12).toUpperCase() : '');
            if (labelText && height > 2.5) {
                const can = document.createElement('canvas');
                can.width = 256; can.height = 64;
                const ctx = can.getContext('2d');
                ctx.fillStyle = isCore ? '#00ffff' : (this.rng() > 0.5 ? '#00ffff' : '#ff0033');
                ctx.font = 'bold 28px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(labelText, 128, 40);
                const labelTex = new THREE.CanvasTexture(can);
                const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
                const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.2, 0.4), labelMat);
                labelMesh.position.set(0, height * 0.75, d / 2 + 0.05);
                labelMesh.userData._isSignage = true;
                group.add(labelMesh);
            }
            
            this.scene.add(group);
            this.buildingMeshes.push({ mesh: group, data: p, gx: p.gx, gz: p.gz });
        }
        
        // --- 4. Ground Plane ---
        this._buildGroundPlane(totalW, totalD, groundY);
        
        // --- 5. Data Highways ---
        this._buildDataHighways(placements, groundY, cellSize, halfW, halfD);
        
        // --- 6. Nebula Clouds ---
        this._buildNebula(groundY);
        
        // --- 7. Store layout data for interactions ---
        this.worldSize = totalW;
        this.groundY = groundY;
        this.dioramaPlacements = placements;
        
        console.log(`[Renderer] Diorama v2: ${placements.length} buildings placed.`);
    },
    
    /**
     * Generate a unique procedural facade texture per building.
     */
    _generateFacadeTexture: function(style, height, isCore) {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 512;
        const ctx = c.getContext('2d');
        
        // Dark base
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, 256, 512);
        
        const windowRows = Math.max(4, Math.floor(height * 3));
        const windowCols = 8;
        const ww = 20, wh = 16; // Window pixel size
        const padX = (256 - windowCols * (ww + 4)) / 2;
        const padY = 20;
        
        // Style-specific palette
        const palettes = {
            office:      { lit: ['#fff7b0', '#ffeedd', '#ffe0a0'], dim: ['#1a1508', '#0d0a04'], accent: '#00ffff', litChance: 0.25 },
            residential: { lit: ['#fff0c0', '#ffd080'], dim: ['#0a0804', '#060402'], accent: '#ff8844', litChance: 0.15 },
            datacenter:  { lit: ['#00ffff', '#00cc88'], dim: ['#001a1a', '#000a0f'], accent: '#00ffff', litChance: 0.4 },
            industrial:  { lit: ['#ff6633', '#ffaa00'], dim: ['#1a0800', '#0d0400'], accent: '#ff0033', litChance: 0.08 },
            neon:        { lit: ['#00ffff', '#ff0055', '#bb00ff', '#00ff88'], dim: ['#001a2a', '#0a0020'], accent: '#00ffff', litChance: 0.35 },
            lab:         { lit: ['#aaffcc', '#ffffff'], dim: ['#050a08', '#020504'], accent: '#00ff88', litChance: 0.2 }
        };
        const pal = palettes[style] || palettes.office;
        
        // Draw window grid
        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                const x = padX + col * (ww + 4);
                const y = padY + row * (wh + 6);
                if (y + wh > 500) continue;
                
                const isLit = this.rng() < pal.litChance;
                if (isLit) {
                    ctx.fillStyle = pal.lit[Math.floor(this.rng() * pal.lit.length)];
                    ctx.shadowColor = ctx.fillStyle;
                    ctx.shadowBlur = 4;
                } else {
                    ctx.fillStyle = pal.dim[Math.floor(this.rng() * pal.dim.length)];
                    ctx.shadowBlur = 0;
                }
                ctx.fillRect(x, y, ww, wh);
            }
        }
        ctx.shadowBlur = 0;
        
        // Horizontal accent bands (1-3)
        const nBands = 1 + Math.floor(this.rng() * 2);
        for (let b = 0; b < nBands; b++) {
            const by = 30 + Math.floor(this.rng() * 440);
            ctx.fillStyle = pal.accent;
            ctx.globalAlpha = 0.3 + this.rng() * 0.4;
            ctx.fillRect(0, by, 256, 2);
        }
        ctx.globalAlpha = 1.0;
        
        // Vertical spine accent (30% chance)
        if (this.rng() < 0.3) {
            const sx = Math.floor(this.rng() * 200) + 20;
            ctx.fillStyle = pal.accent;
            ctx.globalAlpha = 0.25;
            ctx.fillRect(sx, 10, 3, 490);
            ctx.globalAlpha = 1.0;
        }
        
        const map = new THREE.CanvasTexture(c);
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.magFilter = THREE.NearestFilter;
        map.minFilter = THREE.LinearMipmapLinearFilter;
        return map;
    },
    
    /**
     * Dark ground plane with subtle hex grid markings.
     */
    _buildGroundPlane: function(totalW, totalD, groundY) {
        // Ground canvas
        const gc = document.createElement('canvas');
        gc.width = 1024; gc.height = 1024;
        const gctx = gc.getContext('2d');
        
        // Dark base
        gctx.fillStyle = '#050608';
        gctx.fillRect(0, 0, 1024, 1024);
        
        // Hex grid pattern
        gctx.strokeStyle = 'rgba(0, 255, 255, 0.06)';
        gctx.lineWidth = 0.5;
        const hexR = 32;
        for (let row = 0; row < 20; row++) {
            for (let col = 0; col < 20; col++) {
                const cx = col * hexR * 1.75 + (row % 2) * hexR * 0.875;
                const cy = row * hexR * 1.5;
                gctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI / 3) * i - Math.PI / 6;
                    const px = cx + hexR * Math.cos(a);
                    const py = cy + hexR * Math.sin(a);
                    i === 0 ? gctx.moveTo(px, py) : gctx.lineTo(px, py);
                }
                gctx.closePath();
                gctx.stroke();
                
                // Random dot in some cells
                if (this.rng() < 0.08) {
                    gctx.fillStyle = `rgba(0, 255, 255, ${0.1 + this.rng() * 0.3})`;
                    gctx.beginPath();
                    gctx.arc(cx, cy, 2, 0, Math.PI * 2);
                    gctx.fill();
                }
            }
        }
        
        const groundTex = new THREE.CanvasTexture(gc);
        groundTex.wrapS = THREE.RepeatWrapping;
        groundTex.wrapT = THREE.RepeatWrapping;
        groundTex.repeat.set(3, 3);
        
        const groundGeo = new THREE.PlaneGeometry(totalW * 1.8, totalD * 1.8);
        groundGeo.rotateX(-Math.PI / 2);
        const groundMat = new THREE.MeshStandardMaterial({ 
            map: groundTex, color: 0x333344, roughness: 0.9, metalness: 0.1
        });
        this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
        this.groundPlane.position.y = groundY;
        this.groundPlane.receiveShadow = true;
        this.groundPlane.userData.isInteractable = true;
        this.groundPlane.userData.isGround = true;
        this.scene.add(this.groundPlane);
    },
    
    /**
     * Neon data highways connecting buildings.
     */
    _buildDataHighways: function(placements, groundY, cellSize, halfW, halfD) {
        if (placements.length < 2) return;
        
        const matCyan = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 3.0 });
        const matRed = new THREE.MeshStandardMaterial({ color: 0xff0033, emissive: 0xff0033, emissiveIntensity: 3.0 });
        const matDot = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
        const matDotRed = new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
        
        const railY = groundY + 0.15;
        this.trafficDots = [];
        const dotGeo = new THREE.SphereGeometry(0.15, 6, 6);
        
        // Connect each building to its nearest neighbor (minimum spanning tree-ish)
        const connected = new Set();
        const validRoutes = [];
        
        // Connect core to its 4 nearest
        const core = placements.find(p => p.isCore) || placements[0];
        const sorted = [...placements].filter(p => p !== core).sort((a, b) => {
            const da = Math.hypot(a.worldX - core.worldX, a.worldZ - core.worldZ);
            const db = Math.hypot(b.worldX - core.worldX, b.worldZ - core.worldZ);
            return da - db;
        });
        
        // Link core to nearest 4-6
        const coreLinks = Math.min(6, sorted.length);
        for (let i = 0; i < coreLinks; i++) {
            const target = sorted[i];
            const dx = target.worldX - core.worldX;
            const dz = target.worldZ - core.worldZ;
            const len = Math.sqrt(dx * dx + dz * dz);
            if (len < 0.1) continue;
            
            const isCyan = i % 2 === 0;
            const mat = isCyan ? matCyan : matRed;
            
            // Rail geometry
            const geo = new THREE.BoxGeometry(0.2, 0.3, len);
            const rail = new THREE.Mesh(geo, mat);
            rail.position.set(
                (core.worldX + target.worldX) / 2,
                railY,
                (core.worldZ + target.worldZ) / 2
            );
            rail.rotation.y = Math.atan2(dx, dz);
            this.neonGroup.add(rail);
            
            // Traffic dots  
            const routeSpeed = (this.rng() > 0.5 ? 1 : -1) * (0.01 + this.rng() * 0.03);
            validRoutes.push({ 
                startX: core.worldX, startZ: core.worldZ, 
                endX: target.worldX, endZ: target.worldZ, 
                speed: routeSpeed, color: isCyan ? 'cyan' : 'red', y: railY + 0.2
            });
            
            connected.add(i);
        }
        
        // Additional random links between non-core buildings
        for (let i = 0; i < sorted.length - 1 && i < 8; i++) {
            const a = sorted[i], b = sorted[i + 1];
            const dx = b.worldX - a.worldX;
            const dz = b.worldZ - a.worldZ;
            const len = Math.sqrt(dx * dx + dz * dz);
            if (len < 0.5 || len > cellSize * 5) continue;
            
            const isCyan = this.rng() > 0.5;
            const geo = new THREE.BoxGeometry(0.15, 0.2, len);
            const rail = new THREE.Mesh(geo, isCyan ? matCyan : matRed);
            rail.position.set((a.worldX + b.worldX) / 2, railY, (a.worldZ + b.worldZ) / 2);
            rail.rotation.y = Math.atan2(dx, dz);
            this.neonGroup.add(rail);
            
            validRoutes.push({ startX: a.worldX, startZ: a.worldZ, endX: b.worldX, endZ: b.worldZ,
                speed: (this.rng() > 0.5 ? 1 : -1) * 0.02, color: isCyan ? 'cyan' : 'red', y: railY + 0.15 });
        }
        
        // Spawn traffic dots
        for (let i = 0; i < Math.min(40, validRoutes.length * 3); i++) {
            const route = validRoutes[i % validRoutes.length];
            const mesh = new THREE.Mesh(dotGeo, route.color === 'cyan' ? matDot : matDotRed);
            mesh.userData.route = route;
            mesh.userData.progress = this.rng();
            this.trafficDots.push(mesh);
            this.neonGroup.add(mesh);
        }
        
        // Chevrons on highways
        const matChevron = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        for (const route of validRoutes.slice(0, 6)) {
            const dx = route.endX - route.startX, dz = route.endZ - route.startZ;
            const len = Math.sqrt(dx * dx + dz * dz);
            const nChevrons = Math.floor(len / 2);
            for (let c = 0; c < nChevrons; c++) {
                const t = (c + 0.5) / nChevrons;
                const shape = new THREE.Shape();
                shape.moveTo(0, 0); shape.lineTo(0.12, 0.08); shape.lineTo(0, 0.16);
                const chGeo = new THREE.ShapeGeometry(shape);
                chGeo.rotateX(-Math.PI / 2);
                const ch = new THREE.Mesh(chGeo, matChevron);
                ch.position.set(
                    route.startX + dx * t,
                    railY + 0.02,
                    route.startZ + dz * t
                );
                ch.rotation.y = Math.atan2(dx, dz);
                this.neonGroup.add(ch);
            }
        }
    },
    
    /**
     * Atmospheric nebula clouds around the diorama edges.
     */
    _buildNebula: function(groundY) {
        const nebulaColors = [0x00ffff, 0xff0055, 0xbb00ff, 0x00ff88];
        const nebulaMats = nebulaColors.map(c => 
            new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.04, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        this.nebulaMeshes = [];
        
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 30 + this.rng() * 8;
            const nGeo = new THREE.PlaneGeometry(8 + this.rng() * 10, 5 + this.rng() * 6);
            const nMesh = new THREE.Mesh(nGeo, nebulaMats[i % 4]);
            nMesh.position.set(
                Math.cos(angle) * radius,
                groundY + 2 + this.rng() * 6,
                Math.sin(angle) * radius
            );
            nMesh.rotation.y = angle + Math.PI / 2;
            nMesh.rotation.x = (this.rng() - 0.5) * 0.3;
            nMesh.userData.baseAngle = angle;
            nMesh.userData.radius = radius;
            this.scene.add(nMesh);
            this.nebulaMeshes.push(nMesh);
        }
    },

    _createEntityMesh: function(entity) {
        const group = new THREE.Group();
        group.userData = { id: entity.id, type: entity.type, entity: entity };
        let coreMesh;

        const presets = {
            queen:    { color: 0x00ffff, intensity: 2.5 },
            alisa:    { color: 0xffe8d0, intensity: 2.0 },
            being:    { color: 0xb4dcff, intensity: 1.2 },
            building: { color: 0xffc864, intensity: 1.8 },
            portal:   { color: 0x64ffc8, intensity: 1.5 },
            fauna:    { color: 0xc8b48c, intensity: 0.5 },
            yokai:    { color: 0xcc44ff, intensity: 2.0 },
            cpu_hot:  { color: 0xff5028, intensity: 2.5 },
            flora:    { color: 0x55ff77, intensity: 1.2 },
            mineral:  { color: 0x00ffff, intensity: 1.5 },
            scrap:    { color: 0xff5500, intensity: 1.8 },
            cyber:    { color: 0xff0033, intensity: 1.5 }
        };

        let presetKey = entity.type || 'being';
        if (entity.target_domain) presetKey = 'portal';
        if (entity.id && entity.id.startsWith("Q")) presetKey = 'queen';
        if (entity.skin_tag && presets[entity.skin_tag]) presetKey = entity.skin_tag;

        const p = presets[presetKey] || presets.being;
        let hex = p.color;
        let str = '#' + hex.toString(16).padStart(6, '0');

        let geo;
        let isPortal = false;
        let yBase = 0;
        let holoTextMesh = null;

        if (entity.target_domain) {
            isPortal = true;
            geo = new THREE.BoxGeometry(4, 1.5, 4);
            geo.translate(0, 0.75, 0);
            const light = new THREE.PointLight(hex, 5, 30);
            light.position.set(0, 2, 0);
            group.add(light);

            const holoGeo = new THREE.PlaneGeometry(8, 2);
            const can = document.createElement('canvas'); can.width = 512; can.height = 128;
            const ctx = can.getContext('2d');
            ctx.fillStyle = str; ctx.font = "bold 60px 'Orbitron', monospace";
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(entity.target_domain.toUpperCase(), 256, 64);
            const holoMat = new THREE.MeshBasicMaterial({ 
                map: new THREE.CanvasTexture(can), color: hex, transparent: true, opacity: 0.9, 
                blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
            });
            holoTextMesh = new THREE.Mesh(holoGeo, holoMat);
            holoTextMesh.position.set(0, 4.5, 0);
            group.add(holoTextMesh);

        } else {
            if (entity.type === 'being') {
                coreMesh = new THREE.Group();
                yBase = 0;
                const torsoGeo = new THREE.CylinderGeometry(0.5, 0.4, 1.6, 6);
                const torsoMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.5 });
                const torso = new THREE.Mesh(torsoGeo, torsoMat);
                torso.position.y = 0.8;
                torso.userData.isInteractable = true;
                coreMesh.add(torso);
                const headGeo = new THREE.OctahedronGeometry(0.5, 0);
                const headMat = new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: p.intensity, roughness: 0.1, metalness: 0.8 });
                const head = new THREE.Mesh(headGeo, headMat);
                head.position.y = 2.0;
                head.userData.isInteractable = true;
                coreMesh.add(head);
                const ringGeo = new THREE.TorusGeometry(0.7, 0.05, 4, 16);
                const ringMat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.y = 2.4;
                ring.rotation.x = Math.PI / 2;
                coreMesh.add(ring);
            } else {
                if (entity.type === 'building') {
                    geo = new THREE.BoxGeometry(2.5, 5, 2.5);
                    geo.translate(0, 2.5, 0);
                } else {
                    geo = new THREE.TetrahedronGeometry(1.0, 0);
                    yBase = 1.0;
                }
                const mat = new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: p.intensity, roughness: 0.1, metalness: 0.2 });
                coreMesh = new THREE.Mesh(geo, mat);
                coreMesh.position.y = yBase;
                coreMesh.userData.isInteractable = true;
            }
        }
        
        if (!coreMesh && isPortal) {
            const mat = new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: p.intensity, roughness: 0.1, metalness: 0.2 });
            coreMesh = new THREE.Mesh(geo, mat);
            coreMesh.position.y = yBase;
            coreMesh.userData.isInteractable = true;
        }
        group.add(coreMesh);
        return { group, isPortal, holoTextMesh, yBase, active: true };
    },

    updateState: function(state) {
        if (!state || !state.entities) return;
        if (!this.entityRefs) this.entityRefs = {};
        this.domainEntities = {};
        const activeIds = new Set();
        const sizeBox = this.worldSize || 48.0;
        const sizeMap = 60.0; 
        const gY = this.groundY || -8;

        state.entities.forEach(entity => {
            if (!entity.id) return;
            activeIds.add(entity.id);
            this.domainEntities[entity.id] = entity;

            const nx = ((entity.x || 30) / sizeMap) * sizeBox - (sizeBox/2);
            const nz = ((entity.y || 30) / sizeMap) * sizeBox - (sizeBox/2);
            let yTop = gY + 0.05;

            let ref = this.entityRefs[entity.id];
            if (!ref) {
                ref = this._createEntityMesh(entity);
                this.scene.add(ref.group);
                ref.group.position.set(nx, yTop, nz);
                this.entityRefs[entity.id] = ref;
            }
            ref.targetX = nx;
            ref.targetZ = nz;
            ref.targetY = yTop;
            ref.group.userData.entity = entity; 
        });

        Object.keys(this.entityRefs).forEach(id => {
            if (!activeIds.has(id)) {
                this.scene.remove(this.entityRefs[id].group);
                delete this.entityRefs[id];
            }
        });
    },

    setupInteractions: function() {
        this.canvas.addEventListener('click', (ev) => {
            if (window.isDraggingMap) return;
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            const clickables = [];
            // Entity meshes
            Object.values(this.entityRefs).forEach(ref => {
                ref.group.children.forEach(child => {
                    if (child.userData.isInteractable) clickables.push(child);
                });
            });
            // Building meshes (new diorama)
            if (this.buildingMeshes) {
                this.buildingMeshes.forEach(b => {
                    b.mesh.children.forEach(child => {
                        if (child.userData.isInteractable) clickables.push(child);
                    });
                });
            }
            if (this.groundPlane) clickables.push(this.groundPlane);
            
            const intersects = this.raycaster.intersectObjects(clickables, true);
            
            if (intersects.length > 0) {
                const hit = intersects[0];
                
                // Floor click (Navigation)
                if (hit.object.userData.isGround) {
                    const sizeBox = this.worldSize || 48.0;
                    const sizeMap = 60.0;
                    const gridX = Math.round(((hit.point.x + sizeBox/2) / sizeBox) * sizeMap);
                    const gridY = Math.round(((hit.point.z + sizeBox/2) / sizeBox) * sizeMap);
                    
                    if (typeof ActionMenu !== 'undefined') {
                        const avatar = (typeof MainApp !== 'undefined') ? (MainApp.targetEntityId || "Commander") : "Commander";
                        ActionMenu.dispatchNavigate(avatar, gridX, gridY);
                        
                        // Interaction visual feedback
                        if (typeof Renderer.spawnClickBurst === 'function') {
                            Renderer.spawnClickBurst(hit.point.x, hit.point.y + 0.1, hit.point.z, 0xffaa22);
                        }
                    }
                    return;
                }
                
                // Check if it's a building
                const bData = hit.object.userData.buildingData;
                if (bData && bData.node && typeof MainApp !== 'undefined') {
                    const folderName = bData.node.id.split(/[/\\]/).pop();
                    const e = {
                        id: bData.node.id,
                        name: bData.isCore ? "ALISA ROOT NODE" : `/${folderName}`,
                        type: bData.isCore ? "world" : "smart_contract",
                        status: bData.isCore ? "awake" : "idle",
                        state: bData.isCore ? "system_core" : "filesystem_node",
                        icon: bData.isCore ? "\uD83D\uDC51" : "\uD83D\uDCBE",
                        hive_work: {
                            description: `Colonial Node Partition.\nPath: ${bData.node.id}\nSize: ${(bData.node.sizeBytes / 1024 / 1024).toFixed(2)} MB`,
                            schedule: "@static"
                        }
                    };
                    MainApp.showInspector(e);
                    return;
                }
                // Normal Entity Click
                let groupObj = hit.object.parent;
                while (groupObj && !groupObj.userData.entity && groupObj.parent) groupObj = groupObj.parent;
                const e = groupObj ? groupObj.userData.entity : null;
                if (!e) return;
                if (e.target_domain && typeof MainApp !== 'undefined') {
                    MainApp.changeDomain(e.target_domain);
                } else if (typeof MainApp !== 'undefined') {
                    MainApp.showInspector(e);
                }
            }
        });
        if (this.controls) {
            this.controls.addEventListener('start', () => { window.isDraggingMap = false; });
            this.controls.addEventListener('change', () => { window.isDraggingMap = true; });
            this.controls.addEventListener('end', () => { setTimeout(() => { window.isDraggingMap = false; }, 50); });
        }
    },

    resize: function() {
        if (!this.renderer) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.renderer.setSize(w, h);
        if (this.camera.isOrthographicCamera) {
            const aspect = w / h;
            const d = 50;
            this.camera.left = -d * aspect;
            this.camera.right = d * aspect;
            this.camera.top = d;
            this.camera.bottom = -d;
        } else {
            this.camera.aspect = w / h;
        }
        this.camera.updateProjectionMatrix();
        if (this.composer) this.composer.setSize(w, h);
    },

    updateSolarCycle: function() {
        const slider = document.getElementById('time-slider');
        if (!slider) return;
        const tod = parseFloat(slider.value);
        if (isNaN(tod)) return;
        
        const norm = tod / 24.0;
        const solarAlt = Math.cos((norm - 0.5) * Math.PI * 2);
        const sunUp = solarAlt > -0.15;
        const dayI = Math.max(0, solarAlt + 0.15) / 1.15;
        
        const dirL = this.scene.getObjectByName('DirLight');
        if (dirL) {
            const sunAngle = ((tod - 12) / 6) * (Math.PI / 2);
            if (sunUp && dayI > 0) {
                dirL.position.set(Math.sin(sunAngle) * 50, Math.max(0, Math.cos(sunAngle) * 80), -5);
                dirL.intensity = 0.2 + (dayI * 1.0);
                dirL.color.copy(new THREE.Color(0x334466)).lerp(new THREE.Color().setRGB(1.0, 0.98, 0.96), dayI);
            } else {
                dirL.position.set(20, 50, -20);
                dirL.intensity = 0.2;
                dirL.color.setHex(0x334466);
            }
        }
        const ambL = this.scene.getObjectByName('AmbientLight');
        if (ambL) {
            if (sunUp && dayI > 0) {
                ambL.intensity = 0.4 + (dayI * 0.4);
                ambL.color.copy(new THREE.Color(0x334455)).lerp(new THREE.Color().setRGB(0.7, 0.8, 0.8), dayI);
            } else { ambL.intensity = 0.4; ambL.color.setHex(0x334455); }
        }
        const fillL = this.scene.getObjectByName('FillLight');
        if (fillL) fillL.intensity = 0.2 + (dayI * 0.2);
        
        if (this.scene.background) {
            if (sunUp) {
                this.scene.background.setRGB(0.01 + dayI * 0.93, 0.01 + dayI * 0.94, 0.02 + dayI * 0.94);
            } else {
                const nf = Math.max(0, (solarAlt + 0.15) / 0.15);
                this.scene.background.setRGB(0.01 + nf * 0.01, 0.01 + nf * 0.01, 0.02 + nf * 0.02);
            }
        }
        
        // Building materials day/night transition
        if (this.buildingMeshes) {
            this.buildingMeshes.forEach(b => {
                b.mesh.children.forEach(child => {
                    if (child.material && child.material.emissiveIntensity !== undefined && !child.userData._isEdge && !child.userData._isSignage) {
                        child.material.emissiveIntensity = Math.max(0.0, 1.2 - (dayI * 4.0));
                    }
                });
            });
        }
        
        if (this.neonGroup) this.neonGroup.visible = (dayI < 0.4);
        
        if (sunUp && dayI > 0.1) document.body.classList.add('day-mode');
        else document.body.classList.remove('day-mode');
        this.canvas.style.filter = 'none';
        
        if (this.composer && this.composer.passes) {
            const bloomPass = this.composer.passes.find(p => p.type === 'UnrealBloomPass' || p.constructor.name === 'UnrealBloomPass');
            if (bloomPass) bloomPass.strength = 1.5 - (dayI * 1.3);
        }
        if (this.scene.fog) {
            this.scene.fog.density = sunUp ? (0.012 - dayI * 0.008) : 0.012;
            if (this.scene.background) this.scene.fog.color.copy(this.scene.background);
        }
        if (this.trafficDots) {
            for (const dot of this.trafficDots) {
                if (dot.material) {
                    const baseOp = dot.userData.route.color === 'cyan' ? 0.9 : 0.8;
                    dot.material.opacity = baseOp * Math.max(0, 1.0 - dayI * 1.5);
                }
            }
        }
        const scanEl = document.querySelector('.scanlines');
        if (scanEl) scanEl.style.opacity = sunUp ? (0.35 - dayI * 0.35).toFixed(2) : '0.35';
        const vigEl = document.querySelector('.vignette-overlay');
        if (vigEl) vigEl.style.opacity = sunUp ? (1.0 - dayI * 0.8).toFixed(2) : '1.0';
        
        const timeDisp = document.getElementById('time-display');
        if (timeDisp) {
            const hh = Math.floor(tod).toString().padStart(2, '0');
            const mm = Math.floor((tod % 1) * 60).toString().padStart(2, '0');
            let icon = '\uD83C\uDF19';
            if (tod > 5.5 && tod < 7) icon = '\uD83C\uDF05';
            else if (tod >= 7 && tod < 17) icon = '\u2600';
            else if (tod >= 17 && tod < 18.5) icon = '\uD83C\uDF07';
            timeDisp.textContent = `${hh}:${mm} ${icon}`;
        }
    },

    loop: function(time) {
        this.animFrame = requestAnimationFrame((t) => this.loop(t));
        const dt = (time - this.lastTime) * 0.001 || 0;
        this.lastTime = time;
        if (this.controls) this.controls.update();
        this.updateSolarCycle();
        
        if (typeof WeatherSystem !== 'undefined' && WeatherSystem.enabled) {
            const sliderEl = document.getElementById('time-slider');
            const tod = sliderEl ? parseFloat(sliderEl.value) : 1;
            WeatherSystem.update({ time_of_day: tod, entropy: 0.3 });
        }
        
        // Traffic Dots (new route format: startX/startZ/endX/endZ)
        if (this.trafficDots) {
            for (const dot of this.trafficDots) {
                const r = dot.userData.route;
                dot.userData.progress += Math.abs(r.speed) * 0.01;
                if (dot.userData.progress > 1) dot.userData.progress -= 1;
                const t = dot.userData.progress;
                dot.position.set(
                    r.startX + (r.endX - r.startX) * t,
                    r.y || (this.groundY || -8) + 0.3,
                    r.startZ + (r.endZ - r.startZ) * t
                );
            }
        }
        
        // Nebula Breathing
        if (this.nebulaMeshes) {
            const t2 = time * 0.0003;
            const sliderEl = document.getElementById('time-slider');
            const tod = sliderEl ? parseFloat(sliderEl.value) : 1;
            const norm = tod / 24.0;
            const solarAlt = Math.cos((norm - 0.5) * Math.PI * 2);
            const dayI = Math.max(0, solarAlt + 0.15) / 1.15;
            for (const n of this.nebulaMeshes) {
                const a = n.userData.baseAngle + t2;
                n.position.x = Math.cos(a) * n.userData.radius;
                n.position.z = Math.sin(a) * n.userData.radius;
                const nightOp = 0.025 + Math.sin(time * 0.001 + a) * 0.015;
                n.material.opacity = nightOp * (1.0 - dayI * 1.5);
            }
        }
        
        // Entity Lerping
        if (this.entityRefs) {
            const lerpFactor = 0.05;
            Object.values(this.entityRefs).forEach(ref => {
                if (ref.targetX !== undefined) {
                    ref.group.position.x += (ref.targetX - ref.group.position.x) * lerpFactor;
                    ref.group.position.z += (ref.targetZ - ref.group.position.z) * lerpFactor;
                    ref.group.position.y += (ref.targetY - ref.group.position.y) * lerpFactor;
                }
                const t = time * 0.002 + ref.group.position.x;
                const bobOffset = Math.sin(t) * 0.2;
                if (ref.isPortal && ref.holoTextMesh) {
                    ref.holoTextMesh.quaternion.copy(this.camera.quaternion);
                    ref.holoTextMesh.position.y = 4.5 + bobOffset;
                } else if (ref.group.children[0]) {
                    ref.group.children[0].position.y = ref.yBase + bobOffset;
                    ref.group.children[0].rotation.y += 0.01;
                    ref.group.children[0].rotation.z += 0.005;
                }
            });
        }
        
        // Narrative Pulses
        if (this.narrativePulses) {
            for (let i = this.narrativePulses.length - 1; i >= 0; i--) {
                const p = this.narrativePulses[i];
                p.life -= 0.02;
                if (p.life <= 0) {
                    this.scene.remove(p.light);
                    p.light.dispose();
                    this.narrativePulses.splice(i, 1);
                } else {
                    p.light.intensity = 8 * p.life;
                }
            }
        }

        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
};

/**
 * ⚠️ AQUÍ HABÍA `Renderer.init();` — UNA LÍNEA QUE ARRANCABA AL IMPORTAR.
 *
 * Dos cosas mal en cuatro palabras:
 *
 * 1. `Renderer` no existe en este módulo. Era una global de la página donde
 *    nació. Cualquier `import` de este fichero moría con «Renderer is not
 *    defined» ANTES de ejecutar una sola línea útil.
 * 2. Y aunque existiera: **un módulo no debe arrancarse solo al importarse.**
 *    Importar es decir «quiero esto a mano», no «enciéndelo». Con esta línea era
 *    imposible inspeccionarlo, catalogarlo o usar una parte sin lanzar el
 *    diorama entero.
 *
 * Los 52 KB de este fichero —el módulo más grande del motor— eran inalcanzables
 * por eso. Lo destapó `labs/catalogo.html` importando las 179 piezas una a una.
 *
 * Ahora arranca quien lo use:
 *     import { FileSystemDioramaSystem } from '…/FileSystemDioramaSystem.js';
 *     FileSystemDioramaSystem.init();
 */
