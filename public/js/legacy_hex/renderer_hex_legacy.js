/**
 * [ALISA Isometric Híbrido: WebGL + HTML5 DOM (SCUMM 2.5D)]
 * Renderiza el mundo en Three.js con OrthographicCamera y delega
 * los sprites al DOM para estética Pixel-Art nítida CSS.
 */

const Renderer = {
    canvas: null,
    scene: null,
    camera: null,
    renderer: null,
    htmlLayer: null,
    
    // Almacenes
    mapData: null,
    lerpEntities: {},
    domSprites: {},
    buildingMeshes: {},
    // Mallas y Geometrias
    instancedMeshes: { floor: null, wall: null, tech: null, grass: null, corrupted: null },
    dummy: null,
    
    // Dimensiones lógicas por bloque
    TILE_SIZE: 1,      // Unidad base en Three.js
    TILE_HEIGHT: 0.2,  // Altura del suelo
    WALL_HEIGHT: 1.0,  // Altura del muro
    
    // Materiales globales (instanciados una vez para rendimiento)
    materials: {},
    geometries: {},
    
    // Interacciones / Input
    raycaster: null,
    mouse: null,
    isDragging: false,
    dragStartPos: { x: 0, y: 0 },
    
    init: function() {
        // Inicializar UI events (Time Slider)
        this._initTimeSlider();
        
        // ---- 1. SETUP THREE.JS ----
        this.canvas = document.getElementById("viewport");
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // --- POST-PROCESSING PIPELINE (Bloom + future effects) ---
        if (typeof THREE.EffectComposer !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined') {
            this.composer = new THREE.EffectComposer(this.renderer);
            // RenderPass will be added after scene + camera are created (below)
            this._bloomParams = { threshold: 0.85, strength: 0.15, radius: 0.35 };
        }
        
        this.scene = new THREE.Scene();
        // Transparent clear color so CSS background handles the sky
        this.renderer.setClearColor(0x000000, 0); 
        this.scene.background = null; 
        // Se ha purgado la niebla (FogExp2) a petición del usuario para que el suelo no se vea empañado.
        
        // ---- 2. CAMARA ORTOGRÁFICA ISOMÉTRICA ----
        const aspect = window.innerWidth / window.innerHeight;
        const d = 15; // Zoom / Frustum size (aumentado para ver mas panorama)
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        
        // Posición y rotación mágica isométrica exacta
        this.camera.position.set(40, 40, 40);
        this.camera.lookAt(new THREE.Vector3(20, 0, 20)); // Centro del genesis aproximado
        
        // ---- 3. LUCES (Procedural / Efectos) ----
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85); // Suelo mas brillante
        this.scene.add(this.ambientLight);
        
        this.sunLight = new THREE.DirectionalLight(0xffddaa, 0.8);
        this.sunLight.position.set(20, 40, -10);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.camera.left = -15;
        this.sunLight.shadow.camera.right = 15;
        this.sunLight.shadow.camera.top = 15;
        this.sunLight.shadow.camera.bottom = -15;
        this.scene.add(this.sunLight);
        
        // Efecto Cyberpunk: Spotlight Azulado
        const spotLight = new THREE.SpotLight(0x00ffff, 0.5);
        spotLight.position.set(-10, 20, 10);
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.5;
        this.scene.add(spotLight);
        
        // ---- Finalize Post-Processing Pipeline ----
        if (this.composer) {
            const renderPass = new THREE.RenderPass(this.scene, this.camera);
            this.composer.addPass(renderPass);
            
            const bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                this._bloomParams.strength,   // strength
                this._bloomParams.radius,     // radius
                this._bloomParams.threshold   // threshold
            );
            this.bloomPass = bloomPass;
            this.composer.addPass(bloomPass);
            console.log('[Renderer] ✨ Bloom post-processing ACTIVE (threshold:', this._bloomParams.threshold, ')');
        }
        
        // ---- 4. CAPA HTML DOM (Sprites estilo SCUMM) ----
        this.htmlLayer = document.createElement('div');
        this.htmlLayer.id = 'html-sprites-layer';
        this.htmlLayer.style.position = 'absolute';
        this.htmlLayer.style.top = '0';
        this.htmlLayer.style.left = '0';
        this.htmlLayer.style.width = '100vw';
        this.htmlLayer.style.height = '100vh';
        this.htmlLayer.style.pointerEvents = 'none';
        this.htmlLayer.style.overflow = 'hidden';
        document.body.appendChild(this.htmlLayer);
        
        // ---- 5. ABYSS FLOOR (Dark Souls edge-of-world) ----
        const abyssGeo = new THREE.PlaneGeometry(300, 300);
        const abyssMat = new THREE.MeshBasicMaterial({ color: 0x080810 });
        this.abyssFloor = new THREE.Mesh(abyssGeo, abyssMat);
        this.abyssFloor.name = 'abyssFloor';
        this.abyssFloor.rotation.x = -Math.PI / 2;
        this.abyssFloor.position.set(20, -5, 20);
        this.scene.add(this.abyssFloor);
        
        // ---- 6. SUN/MOON VISUAL DISK (Ocarina of Time) ----
        const diskGeo = new THREE.CircleGeometry(2.5, 16);
        const sunDiskMat = new THREE.MeshBasicMaterial({ color: 0xffdd66, side: THREE.DoubleSide, fog: false });
        this.sunDisk = new THREE.Mesh(diskGeo, sunDiskMat);
        this.scene.add(this.sunDisk);
        
        const moonDiskMat = new THREE.MeshBasicMaterial({ color: 0xccddff, side: THREE.DoubleSide, fog: false });
        this.moonDisk = new THREE.Mesh(new THREE.CircleGeometry(1.5, 12), moonDiskMat);
        this.moonDisk.visible = false;
        this.scene.add(this.moonDisk);
        
        // ---- Materiales y Texturas (Procedural ISO Pixel-Art) ----
        // Vertex-colored BoxGeometry: top face bright, side faces 30% darker (Populous trick)
        this.geometries.box = this._createVertexColoredBox(this.TILE_SIZE, 1, this.TILE_SIZE);
        
        this.dataTraffic = []; // Array of moving neon cars/data packets
        
        this.makeTileTex = (colBase, colEdge, styleType) => {
            const s = 32;
            const can = document.createElement('canvas');
            can.width = s; can.height = s;
            const ctx = can.getContext('2d');
            
            // Background
            ctx.fillStyle = colBase;
            ctx.fillRect(0,0,s,s);
            
            // Helper: Dither Pattern (Minecraft/Terraria Noise)
            const dither = (color, probability=0.5, size=2) => {
                ctx.fillStyle = color;
                for(let x=0; x<s; x+=size) {
                    for(let y=0; y<s; y+=size) {
                        if (Math.random() < probability) ctx.fillRect(x, y, size, size);
                    }
                }
            };
            
            // Categorized Rendering
            if (styleType.includes('grass') || styleType === 'dirt') {
                dither(colEdge, 0.4, 2);
                if (styleType.includes('grass')) dither('#264f20', 0.15, 4); // Extra orgánico
                if (styleType === 'grass_flowers') {
                    for(let i=0; i<4; i++) {
                        ctx.fillStyle = Math.random()>0.5 ? '#ffaa44' : '#ffffff';
                        ctx.fillRect(Math.random()*s, Math.random()*s, 2, 2);
                    }
                }
            } else if (styleType === 'rock_boulder' || styleType.includes('marble')) {
                dither(colEdge, 0.5, 4);
                // Grieta o fisura
                ctx.fillStyle = colEdge;
                ctx.fillRect(0, 15, s, 2); 
            } else if (styleType.includes('tree_pine')) {
                // Vertical bark
                ctx.fillStyle = colEdge;
                for(let i=0; i<8; i++) ctx.fillRect(Math.random()*s, 0, 2, s);
                dither('#1a3a14', 0.7, 2); // Needles overlapping bark
            } else if (styleType.includes('water') || styleType.includes('liquid') || styleType.includes('void')) {
                // Horizontal flowing waves (will scroll)
                ctx.fillStyle = colEdge;
                for(let y=0; y<s; y+=6) {
                    ctx.fillRect(Math.random()*5, y + Math.random()*2, 10 + Math.random()*15, 2);
                }
            } else if (styleType.includes('tech') || styleType.includes('asphalt')) {
                // Piso industrial
                ctx.fillStyle = colEdge;
                ctx.fillRect(4, 4, s-8, s-8);
                ctx.fillStyle = colBase;
                ctx.fillRect(8, 8, s-16, s-16);
                
                // Tech blinking light
                if (styleType === 'tech_2') {
                    ctx.fillStyle = '#ff3333';
                    ctx.fillRect(s-6, 4, 3, 3);
                }
            } else if (styleType === 'flora_bush') {
                dither(colEdge, 0.5, 4);
                // Berries
                for(let i=0; i<5; i++) {
                    ctx.fillStyle = '#aa3333';
                    ctx.fillRect(Math.random()*s, Math.random()*s, 3, 3);
                }
            } else if (styleType.includes('corrupted')) {
                dither(colEdge, 0.6, 2);
                dither('#aa0055', 0.25, 4); // Blood / Corruption splat
            } else {
                // Wall default
                dither(colEdge, 0.2, 2);
                ctx.fillStyle = colEdge;
                ctx.fillRect(0, 15, s, 2); // Horizontal seam
                ctx.fillRect(15, 0, 2, s); // Vertical seam
            }
            
            // Universal Floor Bevel (Top-Left Brillante, Bottom-Right Oscuro)
            // No aplicamos Bevel a fluidos ondulantes, ni a estructuras orgánicas redondeadas (árboles/fauna/rocas)
            const isFloor = !styleType.includes('water') && !styleType.includes('void') && 
                            !styleType.includes('tree') && !styleType.includes('flora') && 
                            !styleType.includes('rock');
                            
            if (isFloor) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Hightlight Sol
                ctx.fillRect(0, 0, s, 2); // Top edge
                ctx.fillRect(0, 0, 2, s); // Left edge
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Shadow
                ctx.fillRect(0, s-2, s, 2); // Bottom edge
                ctx.fillRect(s-2, 0, 2, s); // Right edge
            }
            
            const tex = new THREE.CanvasTexture(can);
            tex.magFilter = THREE.NearestFilter; // Pxiel Art puro
            tex.minFilter = THREE.NearestFilter;
            return tex;
        };

        this._createHologramSprite = (text, colorHex) => {
            const can = document.createElement('canvas');
            can.width = 256; can.height = 128;
            const ctx = can.getContext('2d');
            
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.fillRect(0,0,256,128);
            
            ctx.strokeStyle = colorHex;
            ctx.lineWidth = 4;
            ctx.strokeRect(10, 10, 236, 108);
            
            // Grid lines inside hologram
            ctx.lineWidth = 1;
            ctx.strokeStyle = colorHex;
            for(let i=0; i<10; i++) {
                ctx.beginPath();
                ctx.moveTo(10, 10 + i*10.8);
                ctx.lineTo(246, 10 + i*10.8);
                ctx.stroke();
            }
            
            ctx.fillStyle = colorHex;
            ctx.font = "bold 26px 'Orbitron', monospace";
            ctx.textAlign = "center";
            ctx.shadowColor = colorHex;
            ctx.shadowBlur = 10;
            ctx.fillText(text, 128, 70);
            
            const tex = new THREE.CanvasTexture(can);
            const mat = new THREE.SpriteMaterial({ 
                map: tex, 
                transparent: true, 
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(4, 2, 1);
            return sprite;
        };

        this.generateMaterialForSkin = (skin, isTile = false) => {
            let colBase = '#050508'; let rough = 0.2; let metal = 0.9;
            let isWater = false;
            let isRoad = false;
            
            // Abyssal Cyberpunk Palette (All dark metals and glassy obsidian)
            // Akasha (Cyan Datacenters)
            if (skin === 'akasha_ground') { colBase = '#08080a'; rough = 0.2; metal = 0.95; }
            else if (skin === 'akasha_elevated') { colBase = '#0c0c0f'; rough = 0.3; metal = 0.9; }
            else if (skin === 'akasha_peak') { colBase = '#111114'; rough = 0.4; metal = 0.8; }
            else if (skin === 'akasha_fluid') { colBase = '#00ffff'; rough = 0.1; metal = 0.1; isWater = true; }
            else if (skin === 'crystal_node') { colBase = '#00ffff'; rough = 0.1; metal = 0.9; }
            
            // Wilds (Scrap / Wasteland concrete)
            else if (skin === 'wilds_ground') { colBase = '#0a0a0c'; rough = 0.6; metal = 0.4; }
            else if (skin === 'wilds_elevated') { colBase = '#0d0d10'; rough = 0.5; metal = 0.5; }
            else if (skin === 'wilds_peak') { colBase = '#121215'; rough = 0.4; metal = 0.6; }
            else if (skin === 'wilds_fluid') { colBase = '#ff0055'; rough = 0.2; metal = 0.1; isWater = true; }
            else if (skin === 'tree_pine') { colBase = '#00ff66'; rough = 0.1; metal = 1.0; } // Holographic flora
            else if (skin === 'flora_bush') { colBase = '#33ccaa'; rough = 0.2; metal = 0.9; }
            
            // Factory (Industrial Steel)
            else if (skin === 'factory_ground') { colBase = '#0b0808'; rough = 0.4; metal = 0.8; }
            else if (skin === 'factory_elevated') { colBase = '#0f0b0b'; rough = 0.3; metal = 0.85; }
            else if (skin === 'factory_peak') { colBase = '#140f0f'; rough = 0.2; metal = 0.9; }
            else if (skin === 'factory_fluid') { colBase = '#ff3300'; rough = 0.2; metal = 0.2; isWater = true; }
            else if (skin === 'tech_scrap' || skin === 'server_debris') { colBase = '#111116'; rough = 0.2; metal = 0.9; isRoad = true; }
            
            // Core Hub (Polished Obsidian)
            else if (skin === 'hub_ground') { colBase = '#050508'; rough = 0.1; metal = 1.0; }
            else if (skin === 'hub_elevated') { colBase = '#08080b'; rough = 0.1; metal = 1.0; }
            else if (skin === 'hub_peak') { colBase = '#0a0a0e'; rough = 0.2; metal = 0.95; }
            else if (skin === 'hub_fluid') { colBase = '#cc00ff'; rough = 0.1; metal = 0.1; isWater = true; }
            else if (skin === 'highway_asphalt' || skin === 'tech_2') { colBase = '#010102'; rough = 0.1; metal = 0.95; isRoad = true; }
            else if (skin === 'cyber_terminal') { colBase = '#050505'; rough = 0.1; metal = 0.95; }
            
            // Fallbacks & Entities
            else if (skin.includes('corrupted')) { colBase = '#2a0a1e'; rough = 0.3; metal = 0.2; }
            else if (skin === 'wall') { colBase = '#08080a'; rough = 0.2; metal = 0.9; }
            else if (skin.includes('water') || skin.includes('void')) { colBase = '#0055ff'; rough = 0.1; metal = 0.1; isWater = true; }
            
            const baseCol = new THREE.Color(colBase);
            
            // Fluids glow strongly, roads slight emissive contrast, entities keep internal logic
            let emissiveMul = isWater ? 0.45 : 0.05;
            if (skin.includes('crystal')) emissiveMul = 0.5;
            if (isRoad) emissiveMul = 0.08;

            // Generate a shared radial gradient texture for soft tile center glow
            if (isTile && !this._radialEmissiveTex) {
                const can = document.createElement('canvas'); can.width = 128; can.height = 128;
                const ctx = can.getContext('2d');
                const radG = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
                // Center warm magma glow, fading to pure black at edges (Simultaneous Contrast prep)
                radG.addColorStop(0, 'rgba(255, 180, 50, 0.8)');   // Hot Gold
                radG.addColorStop(0.3, 'rgba(200, 40, 0, 0.15)');  // Deep Red/Orange
                radG.addColorStop(1, 'rgba(0, 0, 0, 1.0)');        // Void
                ctx.fillStyle = radG;
                ctx.fillRect(0, 0, 128, 128);
                this._radialEmissiveTex = new THREE.CanvasTexture(can);
            }

            // Base emissive intensity calculated previously
            const emissiveCol = baseCol.clone().multiplyScalar(emissiveMul);
            
            // Cyber Asphalt Paradigm:
            // Ground is mostly dark specular metal. Only glowing fluids/roads retain emission.
            const tileIsGlowing = isTile && (isWater || isRoad || skin.includes('crystal'));
            
            const mat = new THREE.MeshStandardMaterial({ 
                color: isTile ? 0xffffff : baseCol, // Allow vertex/instance colors to tint perfectly
                emissive: isTile ? (tileIsGlowing ? emissiveCol : 0x000000) : emissiveCol, 
                emissiveMap: null, // Removed the massive radial glow to allow stark bar-chart aesthetic
                emissiveIntensity: isTile ? (tileIsGlowing ? 1.0 : 0.0) : 1.0, 
                roughness: isTile && !tileIsGlowing ? 0.15 : rough, // Highly reflective dark cyber asphalt
                metalness: isTile && !tileIsGlowing ? 0.95 : metal, // High metalness for sharp light bounces
                flatShading: true,
                vertexColors: isTile  // Only geometries with BufferAttribute 'color'
            });
            
            // Save baseColor for InstancedMesh instance color (e.g., grass noise)
            mat.userData = { baseColor: new THREE.Color(colBase) };
            
            // Track animated water/void materials for color oscillation in loop()
            if (isWater) {
                mat.userData.isWater = true;
                if (!this.animatedMaterials) this.animatedMaterials = [];
                this.animatedMaterials.push(mat);
            }
            
            return mat;
        };
        
        // Animaciones UV y Materiales cacheados
        this.animatedMaterials = [];
        this.materials = {};
        
        // Ocultar lineas finas, dummy de instancing
        this.dummy = new THREE.Object3D();
        
        // Herramientas Raycaster
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // --- RETRO FX 5: Snapping Cursor (Dedo de Dios) ---
        const cursorGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.05, 0.1, 1.05));
        const cursorMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
        this.cursorMarker = new THREE.LineSegments(cursorGeo, cursorMat);
        this.cursorMarker.visible = false;
        this.scene.add(this.cursorMarker);

        // Control de Eventos
        window.addEventListener('resize', () => this.resize());
        this.setupInteractions();
        
        if (typeof SpriteFactory !== 'undefined') SpriteFactory.init(); // de sprites.js
        
        // --- LIGHTING ENGINE (Three.js native — replaces static lights) ---
        if (typeof LightingEngine !== 'undefined') {
            LightingEngine.init(this.scene);
        }
        
        // --- WEATHER / PARTICLE SYSTEM ---
        if (typeof WeatherSystem !== 'undefined') {
            WeatherSystem.init(this.scene);
        }
        
        
        // ---- BLOOM POST-PROCESSING (Unreal Bloom) ----
        const renderScene = new THREE.RenderPass(this.scene, this.camera);
        
        // Resolution, Strength, Radius, Threshold
        this.bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, 0.4, 0.85 
        );
        this.bloomPass.threshold = 1.5;  // STRICT: Only highly emissive objects glow (Cars, Holograms)
        this.bloomPass.strength = 2.0;   // High bleeding effect for true neon
        this.bloomPass.radius = 0.5;
        
        // --- SKETCH / MONOCHROME PASS (Architectural Blueprint by Day) ---
        const sketchShader = {
            uniforms: {
                "tDiffuse": { value: null },
                "u_DayFactor": { value: 0.0 } // 0.0 = Night (Color), 1.0 = Day (B&W Sketch)
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float u_DayFactor;
                varying vec2 vUv;
                void main() {
                    vec4 texColor = texture2D(tDiffuse, vUv);
                    
                    // Luma conversion
                    float luma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
                    
                    // MANGA PENCIL DRAWING
                    // Geometrical highlights (luma > 0.6) become black pencil lines
                    // Dark faces (luma < 0.4) become white paper
                    // This creates a perfect inverted sketch effect
                    float shadowMask = smoothstep(0.35, 0.55, luma);
                    
                    vec3 pencil = vec3(0.04, 0.04, 0.06); // Dark graphite
                    vec3 paper = vec3(0.98, 0.98, 0.98);  // Crisp white paper
                    vec3 sketchColor = mix(paper, pencil, shadowMask); // Faces=paper, Edges=pencil
                    
                    // The final fragment transparently passes alpha, revealing the pure CSS Sky behind
                    vec3 finalView = mix(texColor.rgb, sketchColor, u_DayFactor);
                    gl_FragColor = vec4(finalView, texColor.a);
                }
            `
        };
        
        this.sketchPass = new THREE.ShaderPass(sketchShader);
        
        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(this.bloomPass);     // Compute neon flares
        this.composer.addPass(this.sketchPass);    // Desaturate to Sketch if daytime
        
        // Aplicar Retro Pixel Scaling inicial
        this.resize();
        
        // Iniciar Loop
        this.loop();
    },
    
    resize: function() {
        const aspect = window.innerWidth / window.innerHeight;
        const d = 15; // Mantener el zoom
        this.camera.left = -d * aspect;
        this.camera.right = d * aspect;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();
        
        // --- ISO PIXEL ART RETRO MODE ---
        // Renderiza el WebGL a menor resolución (SNES/Retro) y estíralo con CSS sin antialiasing
        const pixelScale = window.innerWidth > 1000 ? 3 : 2; 
        const renderW = Math.floor(window.innerWidth / pixelScale);
        const renderH = Math.floor(window.innerHeight / pixelScale);
        
        this.renderer.setSize(renderW, renderH, false);
        if (this.composer) {
            this.composer.setSize(renderW, renderH);
        }
        
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.canvas.style.imageRendering = "pixelated";
    },
    
    setupInteractions: function() {
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 || e.button === 2) {
                this.isDragging = true;
                this.dragStartPos = { x: e.clientX, y: e.clientY };
                this.dragTotalDist = 0; // Track distance to distinguish click from drag
                window.isDraggingMap = false;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dxRaw = e.clientX - this.dragStartPos.x;
                const dyRaw = e.clientY - this.dragStartPos.y;
                this.dragTotalDist += Math.abs(dxRaw) + Math.abs(dyRaw);
                
                // If dragged more than 5 pixels, consider it a deliberate drag, not a hesitant click
                if (this.dragTotalDist > 5) {
                    window.isDraggingMap = true;
                }
                
                const deltaX = dxRaw * 0.05;
                const deltaY = dyRaw * 0.05;
                
                // Panning ortográfico mueve el objetivo de la cámara (y la cámara misma)
                // Movemos en los ejes X, Z del grid para navegar libremente
                this.camera.position.x -= deltaX + deltaY;
                this.camera.position.z -= deltaY - deltaX;
                
                this.dragStartPos = { x: e.clientX, y: e.clientY };
            }
            
            // Track mouse pos for hover / clicks
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        window.addEventListener('mouseup', (e) => {
            this.isDragging = false;
            this.canvas.style.cursor = 'auto'; // Usamos auto porque los Sprites son DOM elements (el hover de CSS tomará control)
            
            // Map clicking logic (only if we didn't drag to pan)
            if (!window.isDraggingMap) {
                if (e.target === this.canvas && this.cursorMarker && this.cursorMarker.visible) {
                    // Intersected ground at exact cursor marker Hex math
                    const hexCoords = this._pxToHex(this.cursorMarker.position.x, this.cursorMarker.position.z);
                    console.log(`[Renderer] Map Hex Clicked: (${hexCoords.logicalX}, ${hexCoords.logicalZ})`);
                    // TODO: Dispatch to ActionMenu or FleetCommander
                }
            }
            
            // Note: we don't reset window.isDraggingMap immediately so click events on sprites can read it, 
            // it will be reset on the next mousedown.
            setTimeout(() => { window.isDraggingMap = false; }, 50);
        });
        
        this.canvas.addEventListener('wheel', (e) => {
            // Zoom (manipulando properties de cámara ortográfica)
            const zoomSpeed = 1.1;
            if (e.deltaY > 0) this.camera.zoom /= zoomSpeed;
            else this.camera.zoom *= zoomSpeed;
            
            this.camera.zoom = Math.max(0.1, Math.min(this.camera.zoom, 15.0)); // Zoom colosal y microscópico
            this.camera.updateProjectionMatrix();
        });
    },

    _initTimeSlider: function() {
        const slider = document.getElementById('time-slider');
        const display = document.getElementById('time-display');
        
        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const hours = Math.floor(val);
                const mins = Math.floor((val - hours) * 60);
                if (display) {
                    display.innerText = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                }
                window.manualTimeOverride = val;
                
                if (val < 6 || val > 19) {
                    display.style.color = '#88aaff'; // Night
                    document.body.style.boxShadow = 'inset 0 0 150px rgba(0,20,50,0.8)';
                } else if (val >= 6 && val < 9) {
                    display.style.color = '#ffaa88'; // Dawn
                    document.body.style.boxShadow = 'inset 0 0 150px rgba(50,20,0,0.5)';
                } else if (val >= 17 && val <= 19) {
                    display.style.color = '#ff6644'; // Sunset
                    document.body.style.boxShadow = 'inset 0 0 150px rgba(50,0,10,0.6)';
                } else {
                    display.style.color = '#00ffff'; // Day normal
                    document.body.style.boxShadow = 'none';
                }
            });
        }
    },

    // ====================================================================
    //  PROCEDURAL TERRAIN ENGINE (Minecraft fBm + Biomes + Erosion)
    // ====================================================================
    
    // Colony seed — deterministic world. Same seed = same geography forever.
    _seed: 42,
    _erosionMap: null,
    
    // --- SEEDED HASH (57 bytes, no library) ---
    _hash: function(x, y, seed) {
        let h = (seed || this._seed) + x * 374761393 + y * 668265263;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    },
    
    // --- SMOOTH NOISE (bilinear interpolation + smoothstep) ---
    _smoothNoise: function(x, y, seed) {
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = x - ix, fy = y - iy;
        const a = this._hash(ix, iy, seed), b = this._hash(ix+1, iy, seed);
        const c = this._hash(ix, iy+1, seed), d = this._hash(ix+1, iy+1, seed);
        const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        return a + (b-a)*sx + (c-a)*sy + (a-b-c+d)*sx*sy;
    },
    
    // --- FRACTAL BROWNIAN MOTION (Minecraft 4-octave fBm) ---
    _fbm: function(x, y, seed, baseFreq, octaves) {
        let value = 0, amplitude = 1, frequency = baseFreq || 0.08, total = 0;
        const s = seed || this._seed;
        for (let i = 0; i < (octaves || 4); i++) {
            value += this._smoothNoise(x * frequency, y * frequency, s + i * 1000) * amplitude;
            total += amplitude;
            amplitude *= 0.5;   // Persistence: each octave = half weight
            frequency *= 2.0;   // Lacunarity: each octave = double frequency
        }
        return value / total;  // Normalized 0→1
    },
    
    // --- PROCEDURAL URBAN MASK (Ridge Noise Organic Canyons) ---
    _getUrbanMask: function(x, y) {
        // Ridge noise forces organic, smooth, interconnected valleys (0 to 1)
        // High values are massive plateaus, valleys are 0 (streets)
        let fbm = this._fbm(x, y, this._seed, 0.04, 3);
        // Ridge formula: 1 - |fbm - 0.5| * 2
        let ridge = 1.0 - Math.abs(fbm - 0.5) * 2.0;
        
        // Threshold valleys: Anything below 0.3 is a deep trench (street)
        if (ridge < 0.35) return 0.0;
        return 1.0; // High-density Plateau
    },
    
    // --- ELEVATION (Hex-Slope Amphitheater / Zoned Districts) ---
    getElevation: function(x, y) {
        // 1. Base organic noise plateau
        const districtEl = this._fbm(x * 0.2, y * 0.2, this._seed, 0.015, 3);
        
        const levels = 8.0; 
        let terraced = Math.floor(districtEl * levels) / levels;
        
        // 2. Carve Ridge Valleys (Streets)
        const urbanMask = this._getUrbanMask(x, y);
        if (urbanMask < 0.5) {
            terraced = 0.0; // Flat bottom for streets
            
            // Coolant canals overriding streets sometimes
            const erosionKey = Math.round(x) + ',' + Math.round(y);
            const erosion = (this._erosionMap && this._erosionMap[erosionKey]) || 0;
            if (erosion > 3) terraced = -0.15; // Deep coolant canal
        }

        // 3. Amphitheater Slope Modifier (The Grimorio Trick)
        // The camera looks towards Negative Z and X. 
        // We add a synthetic incline sloping upwards to the back so the city creates a stadium seating effect.
        // Assuming map dims around 0-60
        const slopeX = -x * 0.15;
        const slopeZ = -y * 0.15; // The further towards 0,0 (Background), the higher the slope bonus
        const macroSlope = slopeX + slopeZ + 15.0; // Offset to keep it positive
        
        let finalElev = terraced * 5.0 + macroSlope;
        
        return Math.floor(finalElev * 2.0) * 0.5; // Lock to 0.5 unit vertical snapping
    },
    
    // --- MOISTURE MAP (second noise = biome parameter, RimWorld trick) ---
    _getMoisture: function(x, y) {
        return this._fbm(x, y, this._seed + 9999, 0.05, 3);
    },
    
    // --- BIOME SYSTEM (Tech and Concrete overriding Nature) ---
    getBiome: function(x, y) {
        const domainNoise = this._fbm(x, y, this._seed + 99, 0.02, 3);
        const erosionKey = Math.round(x) + ',' + Math.round(y);
        const erosion = (this._erosionMap && this._erosionMap[erosionKey]) || 0;
        
        let buildingBlockTex = 'hub_peak';
        let roadTex = 'highway_asphalt';
        let fluidTex = 'hub_fluid'; // Coolant red/cyan
        
        if (domainNoise >= 0.25 && domainNoise < 0.5) {
            buildingBlockTex = 'factory_ground';
            roadTex = 'tech_scrap';
        } else if (domainNoise < 0.25) {
            buildingBlockTex = 'wall';
            fluidTex = 'akasha_fluid'; // Cyan logic streams
        }
        
        // Deep coolant canals override everything
        if (erosion > 3) return fluidTex;
        
        // Urban Masks (Streets / Plazas)
        const urbanMask = this._getUrbanMask(x, y);
        if (urbanMask < 0.5) {
            return roadTex;
        }
        
        return buildingBlockTex;
    },
    
    // --- HYDRAULIC EROSION (simplified particle-based, Kenshi/RimWorld) ---
    _computeErosion: function(mapW, mapH) {
        this._erosionMap = {};
        const iterations = 300;
        for (let i = 0; i < iterations; i++) {
            let x = Math.random() * mapW, y = Math.random() * mapH;
            for (let step = 0; step < 40; step++) {
                const el = this._fbm(x, y, this._seed, 0.06, 4);
                const neighbors = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
                let best = null, bestEl = el;
                for (const n of neighbors) {
                    const nel = this._fbm(x+n.dx, y+n.dy, this._seed, 0.06, 4);
                    if (nel < bestEl) { bestEl = nel; best = n; }
                }
                if (!best) break;
                const key = Math.round(x) + ',' + Math.round(y);
                this._erosionMap[key] = (this._erosionMap[key] || 0) + 1;
                x += best.dx; y += best.dy;
                if (x < 0 || x >= mapW || y < 0 || y >= mapH) break;
            }
        }
    },
    
    // --- SUPERFORMULA (No Man's Sky — Johan Gielis) ---
    _superShape: function(theta, m, n1, n2, n3) {
        const t1 = Math.pow(Math.abs(Math.cos(m * theta / 4)), n2);
        const t2 = Math.pow(Math.abs(Math.sin(m * theta / 4)), n3);
        return Math.pow(t1 + t2, -1 / n1);
    },
    
    // Generate LatheGeometry from Superformula cross-section
    _superShapeGeometry: function(entityX, entityY, baseRadius, height, segments) {
        const segs = segments || 12;
        const m = 3 + (this._hash(entityX, entityY, 1) * 6) | 0;
        const n1 = 0.3 + this._hash(entityX, entityY, 2) * 2.5;
        const n2 = 0.5 + this._hash(entityX, entityY, 3) * 1.5;
        const n3 = 0.5 + this._hash(entityX, entityY, 4) * 1.5;
        
        // Build cross-section profile as Vector2 points
        const points = [];
        const profileSteps = 8;
        for (let i = 0; i <= profileSteps; i++) {
            const t = (i / profileSteps);
            const angle = t * Math.PI; // Half circle for profile
            const r = this._superShape(angle * 2, m, n1, n2, n3);
            const px = Math.sin(angle) * baseRadius * r * 0.5;
            const py = t * height;
            points.push(new THREE.Vector2(Math.max(0.05, Math.abs(px)), py));
        }
        // Close the top
        points.push(new THREE.Vector2(0.02, height));
        
        const geo = new THREE.LatheGeometry(points, segs);
        return geo;
    },
    
    // --- VERTEX-COLORED HEXAGON (Cyber-Honeycomb Shading) ---
    _createVertexColoredBox: function(w, h, d) {
        // Transform the box into a Flat-Topped Hexagon Prism
        const R = 0.577350269; // Exactly covers width 1.0 face-to-face
        const geo = new THREE.CylinderGeometry(R, R, h, 6);
        geo.rotateY(Math.PI / 6); // Flat-topped logic
        
        const posAttr = geo.getAttribute('position');
        const normalAttr = geo.getAttribute('normal');
        const count = posAttr.count;
        const colors = new Float32Array(count * 3);
        
        for (let i = 0; i < count; i++) {
            const ny = normalAttr.getY(i);
            if (ny > 0.5) {
                // Top Face: Pure white (receives full texture/radial glow color)
                colors[i*3] = 1.0; colors[i*3+1] = 1.0; colors[i*3+2] = 1.0;
            } else if (ny < -0.5) {
                // Bottom Face
                colors[i*3] = 0.2; colors[i*3+1] = 0.2; colors[i*3+2] = 0.2;
            } else {
                // Side Walls (Bezold Effect Injection)
                // Instead of neutral grey, use a Deep Cool Cyan/Indigo (0.3, 0.4, 0.55).
                // This forces everything warm on the map to "burn" and unifies the grid visually.
                colors[i*3] = 0.3; colors[i*3+1] = 0.4; colors[i*3+2] = 0.55;
            }
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return geo;
    },
    
    // --- HEX-TO-PIXEL OFFSET LOGIC (Even-Q grid) ---
    _hexToPx: function(x, y) {
        // Flat-topped hex, offset along X for odd Y rows
        const R = 0.577350269;
        const hexX = x * 1.0 + (Math.abs(y) % 2 === 1 ? 0.5 : 0);
        const hexZ = y * (R * 1.5);
        return { x: hexX, z: hexZ };
    },
    
    // Inverse: Pixel -> Logical Hex Coordinates (O(1) Raycasting)
    _pxToHex: function(px, pz) {
        const R = 0.577350269;
        let y = Math.round(pz / (R * 1.5));
        let xOffset = (Math.abs(y) % 2 === 1) ? 0.5 : 0;
        let x = Math.round(px - xOffset);
        return { logicalX: x, logicalZ: y };
    },
    
    // --- MERGE TWO BUFFER GEOMETRIES (for building + roof in one draw call) ---
    _mergeBufferGeometries: function(geoA, geoB) {
        const posA = geoA.getAttribute('position');
        const posB = geoB.getAttribute('position');
        const idxA = geoA.index ? Array.from(geoA.index.array) : [...Array(posA.count).keys()];
        const idxB = geoB.index ? Array.from(geoB.index.array) : [...Array(posB.count).keys()];
        
        const totalVerts = posA.count + posB.count;
        const positions = new Float32Array(totalVerts * 3);
        const normals = new Float32Array(totalVerts * 3);
        
        // Copy A
        for (let i = 0; i < posA.count * 3; i++) {
            positions[i] = posA.array[i];
        }
        const normA = geoA.getAttribute('normal');
        if (normA) for (let i = 0; i < normA.count * 3; i++) normals[i] = normA.array[i];
        
        // Copy B (offset indices)
        const offset = posA.count;
        for (let i = 0; i < posB.count * 3; i++) {
            positions[offset * 3 + i] = posB.array[i];
        }
        const normB = geoB.getAttribute('normal');
        if (normB) for (let i = 0; i < normB.count * 3; i++) normals[offset * 3 + i] = normB.array[i];
        
        // Merge indices
        const indices = idxA.concat(idxB.map(idx => idx + offset));
        
        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        merged.setIndex(indices);
        
        geoA.dispose();
        geoB.dispose();
        return merged;
    },

    // --- PROCEDURAL NEBULA BORDERS ---
    _createNebulaTexture: function() {
        if (!this._nebulaTextureCache) {
            const size = 128;
            const canvas = document.createElement('canvas');
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            // Draw radial soft gradient (cosmic cloud)
            const grd = ctx.createRadialGradient(size/2, size/2, size*0.05, size/2, size/2, size/2);
            grd.addColorStop(0, "rgba(255, 255, 255, 0.8)");
            grd.addColorStop(0.2, "rgba(100, 150, 255, 0.4)");
            grd.addColorStop(0.5, "rgba(50, 20, 150, 0.1)");
            grd.addColorStop(1, "rgba(0, 0, 0, 0)");
            
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, size, size);
            
            this._nebulaTextureCache = new THREE.CanvasTexture(canvas);
        }
        return this._nebulaTextureCache;
    },

    initNebulaBorders: function(w, h) {
        if (this.nebulaGroup) {
            this.scene.remove(this.nebulaGroup);
            this.nebulaGroup.clear();
        }
        
        this.nebulaGroup = new THREE.Group();
        const tex = this._createNebulaTexture();
        
        const matBase = new THREE.SpriteMaterial({
            map: tex,
            color: 0xffffff,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });
        
        const density = 0.8; // Lower density to protect GPU fill-rate (Scale is huge to compensate)
        const addBelt = (startX, endX, startZ, endZ) => {
            const dx = endX - startX;
            const dz = endZ - startZ;
            const length = Math.sqrt(dx*dx + dz*dz) || 1;
            const numSprites = Math.floor(length * density);
            
            for (let i = 0; i < numSprites; i++) {
                const t = i / numSprites;
                const sx = startX + dx * t + (Math.random() * 15 - 7.5);
                const sz = startZ + dz * t + (Math.random() * 15 - 7.5);
                
                const mat = matBase.clone();
                // Randomly color tint the nebulae (Deep blues, magenta, cyan)
                const hue = 0.5 + Math.random() * 0.4; 
                mat.color.setHSL(hue, 0.8, 0.4);
                
                const sprite = new THREE.Sprite(mat);
                const scale = 25 + Math.random() * 25; // Massive volumetric clouds
                sprite.scale.set(scale, scale, 1);
                
                // Deep below or floating high? The abyss exists beneath Y=0
                const yPos = -8 + (Math.random() * 12 - 6);
                sprite.position.set(sx, yPos, sz);
                
                // Save phase for floating animation
                sprite.userData = {
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.1 + Math.random() * 0.4,
                    baseY: yPos,
                    baseScale: scale,
                    baseColor: mat.color.clone() // Save for toggling
                };
                
                this.nebulaGroup.add(sprite);
            }
        };
        
        const pad = 12; // Distance outside the playable area boundary
        addBelt(-pad, w+pad, -pad, -pad); // Top Edge
        addBelt(-pad, w+pad, h+pad, h+pad); // Bottom Edge
        addBelt(-pad, -pad, -pad, h+pad); // Left Edge
        addBelt(w+pad, w+pad, -pad, h+pad); // Right Edge
        
        this.scene.add(this.nebulaGroup);
    },

    _generateProceduralTiles: function(w, h) {
        const generated = [];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                generated.push({ x: x, y: y, skin: null });
            }
        }
        return generated;
    },

    updateState: function(state) {
        this.mapData = state;
        
        // Semantic Seed Sync (backend precedence)
        if (state && state.seed && state.seed !== this._seed) {
            this._seed = state.seed;
            this._erosionMap = null; // Force recompute
        }
        
        let tilesToBuild = (state && state.tiles) ? state.tiles : null;
        if (!tilesToBuild) {
            const dims = (state && state.dimensions) ? state.dimensions : { w: 60, h: 60 };
            tilesToBuild = this._generateProceduralTiles(dims.w, dims.h);
        }
        
        if (tilesToBuild) {
            // Compute hydraulic erosion on first load (300 rain droplets)
            if (!this._erosionMap) {
                const dims = (state && state.dimensions) ? state.dimensions : { w: 60, h: 60 };
                this._computeErosion(dims.w, dims.h);
                this.initNebulaBorders(dims.w, dims.h);
            }
            this._currentTiles = tilesToBuild;
            this.rebuildTiles(tilesToBuild);
            if (typeof VisibilitySystem !== 'undefined') {
                VisibilitySystem.buildTileIndex(tilesToBuild);
            }
        }
        
        // Inicializamos Sprites DOM (Beings)
        if (state && state.entities) {
            
            // Actualizar mapa A* de pathfinding local cuando haya refresco de mapa
             if (typeof ColonyPathfinder !== 'undefined' && state.tiles) {
                 ColonyPathfinder.updateGridFromTiles(state.tiles, state.dimensions || {w: 100, h:100}, state.entities);
             }
             
            for (let e of state.entities) {
                if (!this.lerpEntities[e.id]) {
                    let fakeShadow = null;
                    if (e.type === "being") {
                        const shadowGeo = new THREE.CircleGeometry(0.35, 12);
                        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
                        fakeShadow = new THREE.Mesh(shadowGeo, shadowMat);
                        fakeShadow.rotation.x = -Math.PI / 2;
                        fakeShadow.position.y = 0.05; // Ligeramente encima del suelo
                        this.scene.add(fakeShadow);
                    }
                    
                    this.lerpEntities[e.id] = { 
                        curX: e.x, 
                        curY: e.y,
                        targetX: e.x,
                        targetY: e.y,
                        path: [],
                        pathIndex: 0,
                        fakeShadow: fakeShadow
                    };
                }
                
                // --- A* PATHFINDING CHECK ---
                let le = this.lerpEntities[e.id];
                // Si el backend dice que el objetivo final (x, y) cambió, pedimos ruta.
                if (le.targetX !== e.x || le.targetY !== e.y) {
                    le.targetX = e.x;
                    le.targetY = e.y;
                    if (typeof ColonyPathfinder !== 'undefined') {
                        ColonyPathfinder.requestPath({x: le.curX, y: le.curY}, {x: e.x, y: e.y}, (newPath) => {
                            if (newPath && newPath.length > 0) {
                                le.path = newPath;
                                le.pathIndex = 1; // 0 is our current pos
                            }
                        });
                    }
                }
                
                this.createOrUpdateDOMEntity(e);
                
                // --- MACRO-DOMAIN PROP OVERRIDE ---
                if (e.type === "flora" || e.type === "mineral" || e.type === "scrap" || e.type === "feature" || !e.type) {
                    const domainNoise = this._fbm(e.x, e.y, this._seed + 99, 0.02, 3);
                    const hashProp = this._hash(e.x, e.y, 42); 
                    if (domainNoise >= 0.25 && domainNoise < 0.5) {
                        e.skin_tag = hashProp > 0.5 ? 'tree_pine' : 'flora_bush';
                        e.type = 'flora';
                    } else if (domainNoise >= 0.5 && domainNoise < 0.75) {
                        e.skin_tag = hashProp > 0.5 ? 'tech_scrap' : 'server_debris';
                        e.type = 'scrap';
                    } else if (domainNoise >= 0.75) {
                        e.skin_tag = 'cyber_terminal';
                        e.type = 'feature';
                    } else {
                        e.skin_tag = 'crystal_node';
                        e.type = 'mineral';
                    }
                }
                
                // --- 2.5D HYBRID: Build 3D volume for structures & terrain objects ---
                const isVolumetric = (e.type === "building" || e.type === "feature" || e.target_domain || 
                                     e.type === "flora" || e.type === "mineral" || e.type === "scrap");
                if (isVolumetric) {
                    if (!this.buildingMeshes[e.id]) {
                        
                        // Default dimensions
                        let width = e.width || 1;
                        let depth = e.height || 1;
                        let objHeight = (e.height_z || 40) / 20.0;
                        
                        let geo;
                        let heightZ = 0; // THREE.js Y axis is UP
                        let isWindSway = false;
                        
                        // Specific terrain relief modifiers based on identity
                        if (e.skin_tag === "tree_pine") {
                            width = 0.8; depth = 0.8; objHeight = 2.5 + this._hash(e.x, e.y, 10) * 2.0;
                            // Superformula tree — unique organic shape per position
                            geo = this._superShapeGeometry(e.x, e.y, 0.5, objHeight, 8);
                            heightZ = objHeight;
                            isWindSway = true;
                        } else if (e.skin_tag === "flora_bush") {
                            width = 0.9; depth = 0.9; objHeight = 0.6 + this._hash(e.x, e.y, 11) * 0.8;
                            geo = this._superShapeGeometry(e.x, e.y, 0.4, objHeight, 6);
                            heightZ = objHeight;
                            isWindSway = true;
                        } else if (e.skin_tag === "rock_boulder" || e.skin_tag === "crystal_node") {
                            width = 1.0; depth = 1.0;
                            objHeight = 0.8 + this._hash(e.x, e.y, 12) * 1.5;
                            // Superformula rock — unique crystalline shape per position (4 symmetry for sharp crystal)
                            geo = this._superShapeGeometry(e.x, e.y, 0.4, objHeight, e.skin_tag === "crystal_node" ? 4 : 6);
                            heightZ = objHeight;
                        } else if (e.skin_tag === "tech_scrap" || e.skin_tag === "server_debris" || e.skin_tag === "cyber_terminal") {
                            width = 0.9; depth = 0.9; 
                            const isTower = e.skin_tag === "cyber_terminal";
                            
                            // Skyscraper towering height
                            objHeight = isTower ? (3.0 + this._hash(e.x, e.y, 25) * 4.0) : (0.5 + this._hash(e.x, e.y, 13) * 1.5);
                            
                            geo = new THREE.BoxGeometry(width, objHeight, depth);
                            geo.translate(0, objHeight / 2.0, 0); // Base translation
                            
                            // Multi-level skyscraper blocks
                            if (isTower) {
                                const topH = 1.0 + this._hash(e.x, e.y, 44) * 2.0;
                                const topGeo = new THREE.BoxGeometry(width * 0.6, topH, depth * 0.6);
                                topGeo.translate(0, objHeight + topH / 2.0, 0);
                                geo = THREE.BufferGeometryUtils.mergeBufferGeometries([geo, topGeo]);
                                heightZ = objHeight + topH;
                                e._isCyberTower = true;
                                e._towerHeight = heightZ;
                            } else {
                                heightZ = objHeight;
                            }
                        } else if (e.target_domain || e.type === 'building') {
                            // 3D Bar Chart Cluster Metropolis
                            const solidGeos = [];
                            const neonGeos = [];
                            
                            // Create a dense 2x2 or 3x3 cluster of histogram columns
                            const gridSize = this._hash(e.x, e.y, 44) > 0.5 ? 2 : 3;
                            const colW = (width * 0.95) / gridSize;
                            const colD = (depth * 0.95) / gridSize;
                            
                            let maxHeight = 0;

                            for (let gx = 0; gx < gridSize; gx++) {
                                for (let gz = 0; gz < gridSize; gz++) {
                                    // Height of this specific column in the bar chart
                                    const rawH = this._hash(e.x + gx * 13, e.y + gz * 17, 100);
                                    let colH = 0.5 + rawH * 5.0; // Varies from 0.5 to 5.5 blocks tall!
                                    
                                    // If this is the center or a prime column, make it a massive skyscraper
                                    if (gx === Math.floor(gridSize/2) && gz === Math.floor(gridSize/2)) {
                                        colH += 3.0 + this._hash(e.x, e.y, 101) * 4.0; 
                                    }
                                    
                                    if (colH > maxHeight) maxHeight = colH;
                                    
                                    // The column itself (slight gap between columns)
                                    let colGeo = new THREE.BoxGeometry(colW * 0.85, colH, colD * 0.85);
                                    
                                    // Offset from center
                                    const ox = - (width*0.95)/2.0 + (colW * 0.5) + (gx * colW);
                                    const oz = - (depth*0.95)/2.0 + (colD * 0.5) + (gz * colD);
                                    
                                    colGeo.translate(ox, colH / 2.0, oz);
                                    solidGeos.push(colGeo);
                                    
                                    // Neon Crown / Glowing Top Edge
                                    // Only tops of high columns glow deeply
                                    if (colH > 1.0 && this._hash(e.x, e.y, 102 + gx + gz*10) > 0.3) {
                                        let neonThickness = 0.15;
                                        let neonTop = new THREE.BoxGeometry(colW * 0.9, neonThickness, colD * 0.9);
                                        // Put it right at the very top edge
                                        neonTop.translate(ox, colH - (neonThickness/2.0), oz);
                                        neonGeos.push(neonTop);
                                    }
                                }
                            }
                            
                            geo = THREE.BufferGeometryUtils.mergeBufferGeometries(solidGeos);
                            
                            if (neonGeos.length > 0) {
                                e._neonGeosMerged = THREE.BufferGeometryUtils.mergeBufferGeometries(neonGeos);
                            }
                            
                            heightZ = maxHeight;
                            objHeight = maxHeight;
                            
                            if (maxHeight > 3.0) {
                                e._isCyberTower = true;
                                e._towerHeight = heightZ;
                            }
                        } // <-- TAIICHI FIX: Missing closing bracket for building logic

                        
                        let matKey = e.skin_tag || 'wall';
                        let solidMatKey = matKey + '_solid';
                        if (!this.materials[solidMatKey]) {
                            this.materials[solidMatKey] = this.generateMaterialForSkin(matKey, false); // isTile=false
                        }
                        
                        const mesh = new THREE.Mesh(geo, this.materials[solidMatKey]);
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        
                        // Now geometries Origin is at their base.
                        const yOffsetFloor = this.getElevation(e.x, e.y); 
                        const hexPos = this._hexToPx(e.x, e.y);
                        mesh.position.set(hexPos.x, yOffsetFloor, hexPos.z);
                        
                        if (isWindSway) {
                            // Guardamos la configuración de mecido (eje Z de la malla)
                            mesh.userData.baseRotZ = mesh.rotation.z;
                            mesh.userData.baseRotX = mesh.rotation.x;
                            mesh.userData.swayPhase = e.x + e.y; // Desfase según position
                        }
                        
                        this.scene.add(mesh);
                        const isCorruptedEntity = (e.skin_tag || '').includes('corrupted') || (e.skin_tag || '').includes('void');
                        if (isCorruptedEntity) mesh.userData.baseY = mesh.position.y;
                        
                        // --- ARCHITECTURAL NEON EDGES (TRON Wires) ---
                        if (e.type === 'building' || e.target_domain || e._isCyberTower) {
                            let glowColor = 0xff0033; // Default red
                            if (e.target_domain) glowColor = 0x64ffc8; // Cyan portals
                            else if (this._hash(e.x, e.y, 77) > 0.6) glowColor = 0x00ffff; // Cyan/blue towers
                            else if (e.skin_tag && e.skin_tag.includes('yokai')) glowColor = 0xcc44ff; // Magenta

                            // Emissive Layered Windows (The Hamburger logic)
                            if (e._neonGeosMerged) {
                                const neonMat = new THREE.MeshBasicMaterial({
                                    color: glowColor,
                                    toneMapped: false // Pure bloom, ignores lighting
                                });
                                const neonStripesMesh = new THREE.Mesh(e._neonGeosMerged, neonMat);
                                mesh.add(neonStripesMesh);
                            }

                            const edgesPatternGeo = new THREE.EdgesGeometry(geo, 20); // 20 degree threshold
                            const edgeMat = new THREE.LineBasicMaterial({ 
                                color: glowColor, 
                                transparent: true,
                                opacity: 0.3 // Dimmed down so the horizontal stripes pop more
                            });
                            
                            edgeMat.toneMapped = false;
                            const neonWireframe = new THREE.LineSegments(edgesPatternGeo, edgeMat);
                            neonWireframe.scale.set(1.01, 1.01, 1.01);
                            mesh.add(neonWireframe);
                        }
                        
                        // Attach Massive Holographic Billboards directly to the siding of big towers
                        if (e._isCyberTower && this._hash(e.x, e.y, 90) > 0.6) {
                            const texts = ["SYS.ACTIVE", "HUB 01", "NEO-KYOTO", "OVERRIDE", "ALISA"];
                            const phrase = texts[Math.floor(this._hash(e.x, e.y, 91) * texts.length)];
                            const holoColor = this._hash(e.x, e.y, 92) > 0.5 ? '#00ffff' : '#ff0033';
                            
                            // Canvas setup for crisp text & wire grid
                            const can = document.createElement('canvas');
                            can.width = 512; can.height = 128; // Ultrawide sign
                            const ctx = can.getContext('2d');
                            
                            ctx.clearRect(0, 0, 512, 128);
                            ctx.strokeStyle = holoColor;
                            ctx.lineWidth = 4;
                            ctx.globalAlpha = 0.3;
                            // Draw Grid
                            for(let i=0; i<512; i+=32) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,128); ctx.stroke(); }
                            for(let j=0; j<=128; j+=32) { ctx.beginPath(); ctx.moveTo(0,j); ctx.lineTo(512,j); ctx.stroke(); }
                            
                            // Draw Text
                            ctx.globalAlpha = 1.0;
                            ctx.font = 'bold 80px monospace';
                            ctx.fillStyle = holoColor;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.shadowColor = holoColor;
                            ctx.shadowBlur = 10;
                            ctx.fillText(phrase, 256, 64);
                            
                            const tex = new THREE.CanvasTexture(can);
                            tex.anisotropy = 4;
                            
                            const mat = new THREE.MeshBasicMaterial({ 
                                map: tex, 
                                transparent: true, 
                                opacity: 0.9,
                                blending: THREE.AdditiveBlending,
                                side: THREE.DoubleSide,
                                depthWrite: false, // Ensures hologram renders properly against bloom
                                toneMapped: false
                            });
                            
                            const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.75), mat);
                            
                            plane.position.y = e._towerHeight * 0.6; // Anchor mid-high
                            plane.position.x = (this._hash(e.x, e.y, 93) > 0.5 ? width * 0.51 : -width * 0.51); // Just outside wall
                            
                            const dir = Math.floor(this._hash(e.x, e.y, 94) * 4);
                            plane.rotation.y = dir * (Math.PI / 2);
                            
                            plane.translateZ(0.1); 
                            
                            mesh.add(plane);
                        }
                        
                        this.buildingMeshes[e.id] = { mesh, height: heightZ, isWindSway, isHeatHaze: isCorruptedEntity };
                    }
                }
            }
            
            // Limpieza de entidades muertas
            const aliveIds = new Set(state.entities.map(e => e.id));
            for (let id in this.domSprites) {
                if (!aliveIds.has(id)) {
                    this.htmlLayer.removeChild(this.domSprites[id]);
                    delete this.domSprites[id];
                    
                    if (this.lerpEntities[id] && this.lerpEntities[id].fakeShadow) {
                        this.scene.remove(this.lerpEntities[id].fakeShadow);
                        this.lerpEntities[id].fakeShadow.geometry.dispose();
                        this.lerpEntities[id].fakeShadow.material.dispose();
                    }
                    delete this.lerpEntities[id];
                    
                    if (this.buildingMeshes[id]) {
                        this.scene.remove(this.buildingMeshes[id].mesh);
                        this.buildingMeshes[id].mesh.geometry.dispose();
                        delete this.buildingMeshes[id];
                    }
                }
            }
        }
    },
    
    /**
     * Fully clear all tile meshes and DOM sprites (domain change cleanup).
     * Prevents orphan InstancedMeshes from leaking into the new domain.
     */
    clearWorld: function() {
        // Remove all instanced meshes from scene
        for (let key in this.instancedMeshes) {
            if (this.instancedMeshes[key]) {
                this.scene.remove(this.instancedMeshes[key]);
                this.instancedMeshes[key].geometry?.dispose();
                this.instancedMeshes[key].material?.dispose();
            }
        }
        this.instancedMeshes = {};
        
        // Remove all DOM sprites and Entity Shadows
        for (let id in this.domSprites) {
            if (this.domSprites[id].parentNode) {
                this.domSprites[id].parentNode.removeChild(this.domSprites[id]);
            }
            if (this.lerpEntities[id] && this.lerpEntities[id].fakeShadow) {
                this.scene.remove(this.lerpEntities[id].fakeShadow);
                this.lerpEntities[id].fakeShadow.geometry.dispose();
                this.lerpEntities[id].fakeShadow.material.dispose();
            }
        }
        this.domSprites = {};
        this.lerpEntities = {};
        
        // Remove building volumetric meshes
        for (let id in this.buildingMeshes) {
            this.scene.remove(this.buildingMeshes[id].mesh);
            this.buildingMeshes[id].mesh.geometry.dispose();
        }
        this.buildingMeshes = {};
        
        // Reset material cache (new domain may have different skins)
        for (let key in this.materials) {
            if (this.materials[key] && this.materials[key].dispose) {
                this.materials[key].dispose();
            }
        }
        this.materials = {};
        this.animatedMaterials = [];
    },
    
    rebuildTiles: function(tiles) {
        // Dynamic group batching by exact skin key
        // BIOME OVERRIDE: generic backend skins → procedural biome from elevation×moisture
        const GENERIC_SKINS = new Set(['floor', 'highway_asphalt_1', 'highway_asphalt_2', 'highway_asphalt']);
        const groups = {};
        tiles.forEach(t => {
            let key = t.skin;
            // Override generic/filler skins with procedural biome
            if (!key || GENERIC_SKINS.has(key)) {
                key = this.getBiome(t.x, t.y);
            }
            if (t.type === "WALL") key = 'wall';
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        
        const yOffset = -0.5; // Offset geometry center
        
        for (let key in groups) {
            const groupTiles = groups[key];
            const neededCount = groupTiles.length;
            
            // Re-create InstancedMesh if uninitialized or too small
            if (!this.instancedMeshes[key] || this.instancedMeshes[key].count < neededCount) {
                if (this.instancedMeshes[key]) {
                    this.scene.remove(this.instancedMeshes[key]);
                    this.instancedMeshes[key].dispose();
                }
                if (neededCount > 0) {
                    const allocCount = neededCount + 500; // room for expansion
                    
                    if (!this.materials[key]) {
                        this.materials[key] = this.generateMaterialForSkin(key, true); // isTile=true
                    }
                    
                    const iMesh = new THREE.InstancedMesh(this.geometries.box, this.materials[key], allocCount);
                    iMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                    iMesh.receiveShadow = true;
                    if (key === 'wall') iMesh.castShadow = true;
                    this.scene.add(iMesh);
                    this.instancedMeshes[key] = iMesh;
                }
            }
            
            if (neededCount === 0 || !this.instancedMeshes[key]) continue;
            
            // Set count to act as draw range
            this.instancedMeshes[key].count = neededCount;
            
            // Update matrices + per-instance color variation (organic terrain tinting)
            const baseColor = this.materials[key] ? this.materials[key].color : new THREE.Color(0xff00ff);
            const instanceColor = new THREE.Color();
            for (let i = 0; i < neededCount; i++) {
                const t = groupTiles[i];
                const el = this.getElevation(t.x, t.y);
                const hexPos = this._hexToPx(t.x, t.y); // Transform logical X,Y to Hex offset Visual X,Z
                
                if (t.type === "WALL") {
                    this.dummy.scale.set(1, this.WALL_HEIGHT, 1);
                    this.dummy.position.set(hexPos.x, el + (this.WALL_HEIGHT / 2), hexPos.z);
                } else {
                    const isWater = this.materials[key].userData && this.materials[key].userData.isWater;
                    const blockTopY = isWater ? (el - 0.1) : el; // Deep coolant slightly recessed
                    
                    // --- TOPOGRAPHIC EXTRUSION (Pillars of the Abyss) ---
                    const bedrockY = -4.0; // The deep foundation of the city
                    let colHeight = blockTopY - bedrockY;
                    if (colHeight <= 0.1) colHeight = 0.1;
                    
                    const center_y = blockTopY - (colHeight / 2.0);
                    
                    this.dummy.scale.set(1, colHeight, 1);
                    this.dummy.position.set(hexPos.x, center_y, hexPos.z);
                    
                    // Laser Overpasses Check
                    // Use a relative height check based on slope so bridges don't spawn underground
                    // A street is any area where the noise dropped the base terraced value down
                    if (this._getUrbanMask(t.x, t.y) < 0.5 && this._hash(t.x, t.y, 65) > 0.985) {
                        if (!this._overpasses) this._overpasses = [];
                        // Spawn relative to path elevation
                        this._overpasses.push({ x: hexPos.x, z: hexPos.z, elev: blockTopY + 3.5 }); 
                    }
                }
                
                this.dummy.updateMatrix();
                this.instancedMeshes[key].setMatrixAt(i, this.dummy.matrix);
                
                // Keep minimal noise variance
                const tintShift = (this._hash(t.x, t.y, 777) - 0.5) * 0.12;
                instanceColor.copy(baseColor);
                instanceColor.r = Math.max(0, Math.min(1, instanceColor.r + tintShift));
                instanceColor.g = Math.max(0, Math.min(1, instanceColor.g + tintShift * 0.8));
                instanceColor.b = Math.max(0, Math.min(1, instanceColor.b + tintShift * 0.6));
                this.instancedMeshes[key].setColorAt(i, instanceColor);
            }
            this.instancedMeshes[key].instanceMatrix.needsUpdate = true;
            if (this.instancedMeshes[key].instanceColor) this.instancedMeshes[key].instanceColor.needsUpdate = true;
        }
        
        if (this.tileMeshes) {
            for (let k in this.tileMeshes) this.scene.remove(this.tileMeshes[k]);
            this.tileMeshes = null;
        }
        
        // --- LASER OVERPASSES (Skybridges) ---
        // Replaces the old, performance-heavy "cliff meshes" with floating neon connections
        if (this._megaSkybridge) {
            this.scene.remove(this._megaSkybridge);
            this._megaSkybridge.geometry.dispose();
            this._megaSkybridge.material.dispose();
            this._megaSkybridge = null;
        }
        
        if (this._overpasses && this._overpasses.length > 0) {
            const passGeos = [];
            for (let j = 0; j < this._overpasses.length; j++) {
                const op = this._overpasses[j];
                const hGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
                
                // Randomly span across X or Z to visually bridge buildings
                if (this._hash(op.x, op.z, 22) > 0.5) hGeo.scale(6.0, 1, 1);
                else hGeo.scale(1, 1, 6.0);
                
                hGeo.translate(op.x, op.elev, op.z);
                passGeos.push(hGeo);
            }
            if (passGeos.length > 0) {
                const megaGeo = THREE.BufferGeometryUtils.mergeBufferGeometries(passGeos);
                const mat = new THREE.MeshBasicMaterial({ 
                    color: 0xff0033, 
                    toneMapped: false 
                });
                this._megaSkybridge = new THREE.Mesh(megaGeo, mat);
                this.scene.add(this._megaSkybridge);
            }
            this._overpasses = []; // reset for next build
        }
        
        // Spawn lively traffic across the neo-kyoto highways
        this._buildDataTraffic();
    },
    
    _buildDataTraffic: function() {
        if (this.dataTraffic.length > 0) return; // Only build once
        
        const w = this.mapData ? this.mapData.dimensions.w : 60;
        const h = this.mapData ? this.mapData.dimensions.h : 60;
        const numCars = 50; // Busy metropolis 
        
        const geo = new THREE.BoxGeometry(0.5, 0.2, 0.5);
        
        for (let i = 0; i < numCars; i++) {
            const baseColor = Math.random() > 0.5 ? 0x00ffff : 0xff0033;
            const mat = new THREE.MeshStandardMaterial({
                color: baseColor,
                emissive: baseColor,
                emissiveIntensity: 3.5, // Extreme bloom threshold trigger
                roughness: 0.1,
                metalness: 0.8
            });
            const mesh = new THREE.Mesh(geo, mat);
            
            const sx = Math.floor(Math.random() * w);
            const sy = Math.floor(Math.random() * h);
            
            const isXBase = Math.random() > 0.5;
            const dir = Math.random() > 0.5 ? 1 : -1;
            
            const carData = {
                mesh: mesh,
                logicalX: sx,
                logicalZ: sy,
                speed: 3.5 + Math.random() * 4.5, // Increased speed for hex
                dx: isXBase ? dir : 0,
                dz: isXBase ? 0 : dir,
                w: w, h: h
            };
            
            const hexPos = this._hexToPx(sx, sy);
            mesh.position.set(hexPos.x, 0.5, hexPos.z);
            
            this.scene.add(mesh);
            this.dataTraffic.push(carData);
        }
        console.log(`[Renderer] Generated ${this.dataTraffic.length} Neo-Kyoto data packets.`);
    },
    
    updateTraffic: function(dt) {
        if (!this.dataTraffic || this.dataTraffic.length === 0) return;
        
        for (let i = 0; i < this.dataTraffic.length; i++) {
            const car = this.dataTraffic[i];
            
            // Update logical grid position
            car.logicalX += car.dx * car.speed * dt;
            car.logicalZ += car.dz * car.speed * dt;
            
            // Loop edges on logical grid
            if (car.logicalX < -2) car.logicalX = car.w + 2;
            if (car.logicalX > car.w + 2) car.logicalX = -2;
            if (car.logicalZ < -2) car.logicalZ = car.h + 2;
            if (car.logicalZ > car.h + 2) car.logicalZ = -2;
            
            const mapX = Math.round(car.logicalX);
            const mapY = Math.round(car.logicalZ);
            let targetY = 0.5;
            
            if (mapX >= 0 && mapY >= 0 && mapX < car.w && mapY < car.h) {
                targetY = this.getElevation(mapX, mapY) + 0.3; 
            }
            
            // Translate logical to physical screen pos
            const hexPos = this._hexToPx(car.logicalX, car.logicalZ);
            car.mesh.position.x = hexPos.x;
            car.mesh.position.z = hexPos.z;
            car.mesh.position.y += (targetY - car.mesh.position.y) * 10 * dt;
            
            // Re-route dynamically like a living city
            if (Math.random() < 0.005) {
                const isXBase = Math.random() > 0.5;
                const dir = Math.random() > 0.5 ? 1 : -1;
                car.dx = isXBase ? dir : 0;
                car.dz = isXBase ? 0 : dir;
            }
        }
    },
    
    getMaterialForTile: function(t) {
        let key = t.skin || 'floor';
        if (t.type === "WALL") key = 'wall';
        return this.materials[key] || this.materials['floor'];
    },
    
    // --- SCUMM DOM SPRITES (2.5D Híbrido) ---
    createOrUpdateDOMEntity: function(e) {
        let div = this.domSprites[e.id];
        if (!div) {
            div = document.createElement('div');
            div.className = 'entity-container';
            div.id = 'scumm-' + e.id;
            div.style.position = 'absolute';
            div.style.pointerEvents = 'auto'; // Permitir click en el div!
            div.style.transform = 'translate(-50%, -100%)'; // Origen visual en los "pies" del personaje
            div.style.cursor = 'pointer';
            
            // Asignar click (Maniac Mansion Context Menu)
            div.addEventListener('click', (ev) => {
                ev.stopPropagation(); // Prevent document click from immediately closing the menu!
                
                // BUG 5 FIX: Prevent false clicks from map dragging
                if (window.isDraggingMap) return;
                
                // BUG 1 FIX: Use fresh data stored on the node, not stale closure variable 'e'
                const liveEntity = ev.currentTarget.entityData;
                if (!liveEntity) return;

                if (typeof ActionMenu !== 'undefined') {
                    ActionMenu.open(liveEntity, ev.clientX, ev.clientY);
                } else if (typeof MainApp !== 'undefined') {
                    // Fallback to legacy inspector
                    MainApp.showInspector(liveEntity);
                    if (liveEntity.target_domain) MainApp.changeDomain(liveEntity.target_domain);
                }
            });

            // Asignar dblclick (Fast actions: Enter portal, Inspect being)
            div.addEventListener('dblclick', (ev) => {
                ev.stopPropagation();
                if (window.isDraggingMap) return;
                
                const liveEntity = ev.currentTarget.entityData;
                if (!liveEntity) return;

                if (typeof ActionMenu !== 'undefined') ActionMenu.close();

                if (liveEntity.target_domain && typeof MainApp !== 'undefined') {
                    MainApp.changeDomain(liveEntity.target_domain);
                } else if (typeof EntityCard !== 'undefined') {
                    EntityCard.open(liveEntity);
                } else if (typeof MainApp !== 'undefined') {
                    MainApp.showInspector(liveEntity);
                }
            });
            
            this.htmlLayer.appendChild(div);
            this.domSprites[e.id] = div;
            
            // Render básico desde sprites.js (Generador SVG/HTML)
            if (typeof renderDOMEntity !== 'undefined') {
                renderDOMEntity(div, e);
            } else {
                div.innerHTML = `<div style="color:var(--neon-red); font-weight:bold; text-shadow:1px 1px 0 #000;">${e.type === 'being' ? '🧍' : '💻'} ${e.id.substring(0,6)}</div>`;
            }
        }
        
        // BUG 1 FIX: Update raw entity data injected into DOM node so click handler always has fresh stats (energy, hp)
        div.entityData = e;
        
        // Si cambió el "action" o el "facing", rearmamos el contenido HTML
        const newDirection = e.facing || 'south';
        if (div.dataset.action !== e.action || div.dataset.facing !== newDirection) {
            div.dataset.action = e.action;
            div.dataset.facing = newDirection;
            if (typeof renderDOMEntity !== 'undefined') renderDOMEntity(div, e);
        }
        
        return div;
    },
    
    // Proyección de posición 3D (x, y, z) a pantalla DOM (pixels)
    project3Dto2D: function(x, y, z) {
        // Obtenemos vector y lo proyectamos usando la cámara y matrices WebGL
        const vector = new THREE.Vector3(x, y, z);
        vector.project(this.camera);
        
        // Convertir NDC (-1 a 1) a Píxeles de ventana
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        
        return {
            x: (vector.x * widthHalf) + widthHalf,
            y: -(vector.y * heightHalf) + heightHalf,
            visible: vector.z >= -1 && vector.z <= 1 // Si está detrás de la cámara
        };
    },


    _initTimeSlider: function() {
        if (this._timeSliderInit) return;
        this._timeSliderInit = true;
        const slider = document.getElementById('time-slider');
        const display = document.getElementById('time-display');
        if (!slider) return;
        
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            window.manualTimeOverride = val;
            
            const hours = Math.floor(val);
            const mins = Math.floor((val - hours) * 60);
            display.innerText = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} (OVR)`;
            
            // Ensure LightEngine also instantly receives the update before next state tick
            if (typeof LightingEngine !== 'undefined') {
                LightingEngine.timeOfDay = val;
                LightingEngine.update(this.mapData, this.lerpEntities);
            }
        });
    },

    // ---- CLICK INTERACTION PARTICLES (Game Juice) ----
    _activeParticleBursts: [],
    
    spawnClickBurst: function(worldX, worldY, worldZ, color) {
        const count = 12;
        const positions = new Float32Array(count * 3);
        const velocities = [];
        
        for (let i = 0; i < count; i++) {
            positions[i*3] = worldX;
            positions[i*3+1] = worldY + 0.5;
            positions[i*3+2] = worldZ;
            // Random outward velocity in XZ plane + slight upward
            const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.5);
            const speed = 2 + Math.random() * 3;
            velocities.push({
                x: Math.cos(angle) * speed,
                y: 1.5 + Math.random() * 2,
                z: Math.sin(angle) * speed
            });
        }
        
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const mat = new THREE.PointsMaterial({
            color: color || 0x00ffff,
            size: 0.3,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });
        
        const points = new THREE.Points(geo, mat);
        this.scene.add(points);
        
        this._activeParticleBursts.push({
            mesh: points,
            velocities: velocities,
            age: 0,
            maxAge: 0.6
        });
    },
    
    _updateParticleBursts: function(dt) {
        for (let i = this._activeParticleBursts.length - 1; i >= 0; i--) {
            const burst = this._activeParticleBursts[i];
            burst.age += dt;
            
            if (burst.age >= burst.maxAge) {
                this.scene.remove(burst.mesh);
                burst.mesh.geometry.dispose();
                burst.mesh.material.dispose();
                this._activeParticleBursts.splice(i, 1);
                continue;
            }
            
            const posArr = burst.mesh.geometry.attributes.position.array;
            const lifeFactor = 1 - (burst.age / burst.maxAge);
            
            for (let j = 0; j < burst.velocities.length; j++) {
                const v = burst.velocities[j];
                posArr[j*3] += v.x * dt;
                posArr[j*3+1] += v.y * dt;
                posArr[j*3+2] += v.z * dt;
                v.y -= 6 * dt; // gravity
            }
            
            burst.mesh.geometry.attributes.position.needsUpdate = true;
            burst.mesh.material.opacity = lifeFactor;
            burst.mesh.material.size = 0.3 * lifeFactor;
        }
    },

    loop: function() {
        requestAnimationFrame(() => this.loop());
        
        const time = Date.now() * 0.001; // Tiempo en segundos
        if (this.lastTime === undefined) this.lastTime = time;
        let dt = time - this.lastTime;
        this.lastTime = time;
        if (isNaN(dt) || dt > 0.1) dt = 0.016; // safeguard
        
        // --- RETRO FX 1: HSL Color Cycling (Mark Ferrari / Demoscene) ---
        if (this.animatedMaterials && this.animatedMaterials.length > 0) {
            for (let mat of this.animatedMaterials) {
                if (mat.userData && mat.userData.isWater && mat.userData.baseColor) {
                    // HSL palette rotation — the Monkey Island trick
                    const phase = (time * 0.5) % 1.0;
                    const bc = mat.userData.baseColor;
                    const baseHSL = {h:0, s:0, l:0};
                    bc.getHSL(baseHSL);
                    const hue = baseHSL.h + Math.sin(phase * Math.PI * 2) * 0.02;
                    const light = baseHSL.l + Math.sin(phase * Math.PI * 4) * 0.08;
                    const sat = baseHSL.s + Math.sin(phase * Math.PI * 3) * 0.05;
                    mat.color.setHSL(hue, Math.max(0, sat), Math.max(0.1, light));
                }
            }
        }
        
        // --- RETRO FX 2: Wind Swaying + Heat Haze (Corrupted/Void zones) ---
        if (this.buildingMeshes) {
            for (let key in this.buildingMeshes) {
                const b = this.buildingMeshes[key];
                if (b.isWindSway && b.mesh) {
                    b.mesh.rotation.x = b.mesh.userData.baseRotX + Math.sin(time * 1.5 + b.mesh.userData.swayPhase) * 0.05;
                    b.mesh.rotation.z = b.mesh.userData.baseRotZ + Math.cos(time * 1.2 + b.mesh.userData.swayPhase) * 0.05;
                }
                // Heat haze for corrupted/void entities — vertex jitter (demoscene scroll distortion)
                if (b.isHeatHaze && b.mesh) {
                    b.mesh.position.y = b.mesh.userData.baseY + Math.sin(time * 5 + b.mesh.position.x * 3) * 0.03;
                }
            }
        }
        
        // --- RETRO FX 3: Nebula Breathing Animation ---
        if (this.nebulaGroup) {
            for (let i = 0; i < this.nebulaGroup.children.length; i++) {
                const sprite = this.nebulaGroup.children[i];
                if (sprite.userData && sprite.userData.phase !== undefined) {
                    const u = sprite.userData;
                    const val = Math.sin(time * u.speed + u.phase);
                    // Breathe in scale
                    const s = u.baseScale * (1.0 + val * 0.1);
                    sprite.scale.set(s, s, 1);
                    // Float in Y
                    sprite.position.y = u.baseY + val * 2.0;
                    // Pulse opacity slightly
                    sprite.material.opacity = 0.6 + val * 0.2;
                }
            }
        }
        
        // --- RETRO FX 4: Sun Cycle + Celestial Disks ---
        let tod = (typeof LightingEngine !== 'undefined') ? LightingEngine.timeOfDay : 12;
        if (window.manualTimeOverride !== undefined) {
            tod = window.manualTimeOverride;
        }
        
        // --- Day/Night Sky & Fog Color Lerping ---
        if (typeof LightingEngine !== 'undefined' && LightingEngine.calculateSolar) {
            const solarData = LightingEngine.calculateSolar(tod);
            if (!this.currentSkyColor) this.currentSkyColor = new THREE.Color(0x05080f);
            this.currentSkyColor.lerp(new THREE.Color(solarData.skyColorHex), 0.02);
            this.renderer.setClearColor(this.currentSkyColor);
            if (this.scene.fog) {
                this.scene.fog.color.copy(this.currentSkyColor);
            }
            
            // Sync Sketch Shader Pass Factor smoothly
            if (this.sketchPass) {
                // solarFactor is 0 at night, 1 at noon based on our new property from LightingEngine
                let targetDayFactor = solarData.solarFactor > 0.1 ? 1.0 : 0.0;
                
                // Allow gradual transition at dawn/dusk
                this.sketchPass.uniforms["u_DayFactor"].value += (targetDayFactor - this.sketchPass.uniforms["u_DayFactor"].value) * 0.05;
                
                // MANGA MODE FIX: UnrealBloomPass destroys WebGL alpha transparency and blurs pencil lines.
                // Disabling it during DayMode ensures the CSS Sky shows through and sketch lines are rigid.
                if (this.bloomPass) {
                    this.bloomPass.enabled = (targetDayFactor === 0.0);
                }
            }
            
            // Rebuild tiles slowly if day/night threshold crossed
            if (window.dayNightChanged && !this._isRebuildingTiles) {
                window.dayNightChanged = false;
                
                // Toggle Nebula (Clouds vs Space)
                const isDay = document.body.classList.contains('day-mode');
                if (this.nebulaGroup) {
                    this.nebulaGroup.children.forEach(sprite => {
                        if (isDay) {
                            sprite.material.blending = THREE.NormalBlending;
                            sprite.material.color.setHex(0xffffff);
                        } else {
                            sprite.material.blending = THREE.AdditiveBlending;
                            if (sprite.userData.baseColor) sprite.material.color.copy(sprite.userData.baseColor);
                        }
                    });
                }
                
                if (this._currentTiles) {
                    this.rebuildTiles(this._currentTiles); // This updates procedural textures based on new CSS state
                }
                console.log("[Renderer] Daylight shift detected. Re-baking isometric tiles...");
            }
        }

        // --- Sun/Moon Visual Disk (Ocarina of Time) ---
        if (typeof LightingEngine !== 'undefined' && LightingEngine.calculateSolar) {
            const solarData = LightingEngine.calculateSolar(tod);
            const norm = (tod / 24.0);
            const angle = (norm - 0.5) * Math.PI * 2; // -PI at midnight, 0 at noon
            const sunHeight = Math.cos(angle);
            
            // Sync celestial lights positions to visual disks
            const sunPosX = 20 + Math.sin(angle) * 30;
            const sunPosZ = 20 + Math.cos(angle) * 10;
            const sunPosY = 30 + Math.max(0, sunHeight) * 60;
            
            if (this.sunDisk) {
                this.sunDisk.position.set(sunPosX, sunPosY, sunPosZ);
                this.sunDisk.lookAt(this.camera.position);
                this.sunDisk.visible = sunHeight > -0.1;
                // Warm color shift near horizon
                const horizonFactor = Math.max(0, 1 - sunHeight * 2);
                this.sunDisk.material.color.setRGB(
                    1.0, 0.85 - horizonFactor * 0.4, 0.4 + (1 - horizonFactor) * 0.3
                );
            }
            if (this.moonDisk) {
                this.moonDisk.position.set(
                    20 - Math.sin(angle) * 30,
                    30 + Math.max(0, -sunHeight) * 60,
                    20 - Math.cos(angle) * 10
                );
                this.moonDisk.lookAt(this.camera.position);
                this.moonDisk.visible = sunHeight < -0.05;
            }
        }
        
        // --- RETRO FX 5: Magnetic Cursor (Tile Snapping) ---
        if (this.cursorMarker) {
            // DISABLED: Raycasting against 3600+ floor InstancedMeshes every frame kills CPU.
            // Using mathematical Plane intersection instead for O(1) performance.
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5); // y = -0.5
            const hit = new THREE.Vector3();
            
            if (this.raycaster.ray.intersectPlane(groundPlane, hit)) {
                const hexCoords = this._pxToHex(hit.x, hit.z);
                const snapX = hexCoords.logicalX;
                const snapZ = hexCoords.logicalZ;
                const el = this.getElevation(snapX, snapZ);
                const cursHex = this._hexToPx(snapX, snapZ);
                this.cursorMarker.position.set(cursHex.x, el + 0.12, cursHex.z);
                this.cursorMarker.visible = window.isDraggingMap === false;
            } else {
                this.cursorMarker.visible = false;
            }
        }
        
        // 1. Lerping y Movimientos con A*
        if (this.mapData && this.mapData.entities) {
            for (let e of this.mapData.entities) {
                let le = this.lerpEntities[e.id];
                if (le) {
                    // Update Lerp usando el path de EasyStar
                    if (le.path && le.path.length > le.pathIndex) {
                        const nextNode = le.path[le.pathIndex];
                        const dx = nextNode.x - le.curX;
                        const dy = nextNode.y - le.curY;
                        
                        le.curX += dx * 0.1; // Smooth lerp
                        le.curY += dy * 0.1;
                        
                        // Si ya casi llegamos al nodo, pasamos al siguiente
                        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
                            le.pathIndex++;
                        }
                    } else {
                         // Fallback direct lerp si no hay camino o ya se terminó
                         le.curX += (e.x - le.curX) * 0.1;
                         le.curY += (e.y - le.curY) * 0.1;
                    }
                    
                    const groundY = this.getElevation(Math.round(le.curX), Math.round(le.curY));
                    
                    // --- RETRO FX 3: Blob Shadows Update ---
                    if (le.fakeShadow) {
                        const sHex = this._hexToPx(le.curX, le.curY);
                        le.fakeShadow.position.set(sHex.x, groundY + 0.02, sHex.z);
                    }
                    
                    // Actualizar Sprite DOM
                    const div = this.domSprites[e.id];
                    if (div) {
                        // e.y del backend es la coordenada Z profunda en Three.js. (X, Y up, Z depth)
                        // The floor's top face is exactly at groundY now.
                        let posY = groundY;
                        const isVol = (e.type === "building" || e.target_domain || e.type === "feature" || 
                                      e.type === "flora" || e.type === "mineral" || e.type === "scrap");
                                      
                        if (isVol) {
                            if (this.buildingMeshes[e.id]) {
                                posY = groundY + this.buildingMeshes[e.id].height + 0.2; // Float above roof
                            } else {
                                posY = groundY + this.WALL_HEIGHT + 0.5;
                            }
                        }
                        
                        const hexPos = this._hexToPx(le.curX, le.curY);
                        const calc = this.project3Dto2D(hexPos.x, posY, hexPos.z);
                        if (calc.visible) {
                            div.style.display = 'block';
                            div.style.left = `${calc.x}px`;
                            div.style.top = `${calc.y}px`;
                            
                            // Z-Index Sorting dinámico (SCUMM Depth).
                            // A mayor Z/X (fondo), menor z-index.
                            const zIndexBase = 1000;
                            div.style.zIndex = Math.floor(zIndexBase + (le.curX + le.curY) * 10);
                            
                            // --- OCCLUSION RAYCASTER ---
                            if (e.type === "being") {
                                // Cast ray from camera to the Being's base (Y=TILE_HEIGHT)
                                const being3DPos = new THREE.Vector3(le.curX, this.TILE_HEIGHT, le.curY);
                                const dir = new THREE.Vector3().subVectors(being3DPos, this.camera.position).normalize();
                                this.raycaster.set(this.camera.position, dir);
                                
                                // Intersect against buildings ONLY
                                const obstacles = Object.values(this.buildingMeshes).map(b => b.mesh);
                                // DISABLED: Raycasting against 10k instances per frame kills the CPU
                                // if (this.instancedMeshes['wall']) obstacles.push(this.instancedMeshes['wall']);
                                // if (this.instancedMeshes['tech']) obstacles.push(this.instancedMeshes['tech']);
                                
                                const intersects = this.raycaster.intersectObjects(obstacles, false);
                                
                                // Ensure intersection is "before" the character 
                                let isHidden = false;
                                if (intersects.length > 0) {
                                    // Distance to character
                                    const distChar = this.camera.position.distanceTo(being3DPos);
                                    if (intersects[0].distance < distChar - 0.5) { // 0.5 epsilon
                                        isHidden = true;
                                    }
                                }
                                
                                if (isHidden) {
                                    div.classList.add('occluded');
                                } else {
                                    div.classList.remove('occluded');
                                }
                            }
                        } else {
                            div.style.display = 'none';
                        }
                    }
                }
            }
        }
        
        // 2. Camera Tracking Smooth
        if (typeof MainApp !== 'undefined' && MainApp.targetEntityId) {
            const le = this.lerpEntities[MainApp.targetEntityId];
            if (le) {
                // Queremos que la cámara mire al lerp (X, Z).
                // Offset diagonal fijo para mantener isometría pura
                const targetCamX = le.curX + 20;
                const targetCamZ = le.curY + 20;
                const targetCamY = 20;
                
                this.camera.position.x += (targetCamX - this.camera.position.x) * 0.05;
                this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.05;
                this.camera.position.y += (targetCamY - this.camera.position.y) * 0.05;
            }
        }

        // 3. Lighting Engine Update (solar cycle, entity PointLights, fog density)
        if (typeof LightingEngine !== 'undefined' && this.mapData) {
            LightingEngine.update(this.mapData, this.lerpEntities);
        }
        
        // 4. Weather / Particle System Update
        if (typeof WeatherSystem !== 'undefined') {
            WeatherSystem.update(this.mapData);
        }
        
        // 5. Visibility System (FoW + Entropy tile tinting)
        if (typeof VisibilitySystem !== 'undefined' && this.mapData) {
            VisibilitySystem.update(this.mapData, this.lerpEntities, this.instancedMeshes);
        }
        
        // Rotaciones / Animaciones
        if (this.updateTraffic) this.updateTraffic(dt);
        
        // 6. Click Interaction Particle Bursts
        this._updateParticleBursts(dt);
        
        // Render!
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
};

window.onload = () => {
    Renderer.init();
    if (typeof ActionMenu !== 'undefined') ActionMenu.init();
    if (typeof MainApp !== 'undefined') MainApp.start();
    
    // Keyboard shortcuts for visual system toggles
    window.addEventListener('keydown', (e) => {
        if (e.key === 'f' || e.key === 'F') {
            if (typeof VisibilitySystem !== 'undefined') VisibilitySystem.toggleFoW();
        }
        if (e.key === 'e' || e.key === 'E') {
            if (typeof VisibilitySystem !== 'undefined') VisibilitySystem.toggleEntropy();
        }
        if (e.key === 'l' || e.key === 'L') {
            if (typeof LightingEngine !== 'undefined') {
                LightingEngine.enabled = !LightingEngine.enabled;
                console.log(`[LightingEngine] ${LightingEngine.enabled ? 'ON' : 'OFF'}`);
            }
        }
        if (e.key === 'p' || e.key === 'P') {
            if (typeof WeatherSystem !== 'undefined') {
                WeatherSystem.enabled = !WeatherSystem.enabled;
                console.log(`[WeatherSystem] ${WeatherSystem.enabled ? 'ON' : 'OFF'}`);
            }
        }
        if (e.key === 'b' || e.key === 'B') {
            // Toggle Bloom on/off
            if (Renderer.bloomPass) {
                Renderer.bloomPass.enabled = !Renderer.bloomPass.enabled;
                console.log(`[Bloom] ${Renderer.bloomPass.enabled ? 'ON' : 'OFF'}`);
            }
        }
    });
    
    // Window resize handler (EffectComposer needs manual resize)
    window.addEventListener('resize', () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        Renderer.renderer.setSize(w, h);
        if (Renderer.composer) Renderer.composer.setSize(w, h);
        
        const aspect = w / h;
        const d = 15;
        Renderer.camera.left = -d * aspect;
        Renderer.camera.right = d * aspect;
        Renderer.camera.top = d;
        Renderer.camera.bottom = -d;
        Renderer.camera.updateProjectionMatrix();
    });
};
