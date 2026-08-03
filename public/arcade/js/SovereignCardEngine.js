/**
 * SovereignCardEngine.js
 * Universal Controller for ALISA Arcade Card Games.
 * Abstracts Network Telemetry, UI State, Card Slots (Hand, Table, Deck, Discard)
 * and generic 3D Tweening for RLCard + Custom endpoints.
 */
class SovereignCardEngine {
    constructor(config) {
        this.gameId = config.gameId;
        this.hubUrl = `/arcade/${this.gameId}/state`;
        this.moveUrl = `/arcade/${this.gameId}/move`;

        // Hooks
        this.onInit3D = config.onInit3D || function(scene, camera, renderer) {};
        this.onStateSync = config.onStateSync || function(data) {};
        this.onResize = config.onResize || function() {};
        
        // Agent UI State
        this.autoMode = false;
        this.whitePlayer = 'engine';
        this.blackPlayer = 'engine';
        this.currentLegalMoves = [];
        this.isGameOver = false;

        // Three.js Core
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Card Engine Internal State
        this.cardMeshes = {}; // map representation string to Mesh (e.g. "H_2": Mesh)
        this.zones = {
            hand: [],
            table: [],
            discard: []
        };
        
        // Geometry / Materials caching
        this.cachedMaterials = {};
        this.cardGeo = null;
        this.cardMatFront = null;
        this.cardMatBack = null;

        // Kinematics (Raycaster)
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -4);
        this.intersectOffset = new THREE.Vector3();
        this.draggedCard = null;
        this.hoveredCard = null;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        this.pollHub = this.pollHub.bind(this);
        this.animate = this.animate.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
    }

    bindUI() {
        // Reserved for subclass or instance UI binding hooks
    }

    start() {
        this.init3D();
        this.bindUI();
        // Se elige backend ANTES de sondear; si no, el primer poll salía sin
        // backend y pintaba "DISCONNECTED" aunque hubiera reglas locales.
        this._iniciarBackend().then(() => {
            this.pollHub();
            setInterval(this.pollHub, 1000);
        });
        
        // Sovereign Gym Auto-Boot
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('autorun') === '1') {
            const p1 = urlParams.get('p1');
            const p2 = urlParams.get('p2');
            if (p1 && document.getElementById('whitePlayerSelect')) document.getElementById('whitePlayerSelect').value = p1;
            if (p2 && document.getElementById('blackPlayerSelect')) document.getElementById('blackPlayerSelect').value = p2;
            
            setTimeout(() => {
                if (!this.autoMode) this.toggleAutoMode();
            }, 500); 
        }
    }

    init3D() {
        const container = document.getElementById('canvas-container');
        if (!container) return;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x05050A, 0.015);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.appendChild(this.renderer.domElement);
        window.addEventListener('resize', this.onWindowResize);

        // Raycaster Events
        this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);


        // Core Lighting & Table Setup Default
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 15, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

        // Shared Card Geo
        this.cardGeo = new THREE.BoxGeometry(1.2, 1.8, 0.05);
        this.cardMatFront = new THREE.MeshLambertMaterial({color: 0xE8ECEF});
        this.cardMatBack = new THREE.MeshLambertMaterial({color: 0x882222});

        this.onInit3D(this.scene, this.camera, this.renderer);
        this.animate();
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.onResize();
    }

    animate(time) {
        requestAnimationFrame(this.animate);
        if (typeof TWEEN !== 'undefined') TWEEN.update(time);
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // --- RAYCASTER KINEMATICS ---
    onPointerDown(event) {
        if (!this.camera || !this.scene) return;
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const meshes = Object.values(this.cardMeshes);
        const intersects = this.raycaster.intersectObjects(meshes);
        
        if (intersects.length > 0) {
            this.draggedCard = intersects[0].object;
            this.isDragging = false; // Not dragging yet, just clicked
            this.pointerDownPos = { x: event.clientX, y: event.clientY };
            
            // Stop any tweens affecting this card
            if (typeof TWEEN !== 'undefined') {
                TWEEN.getAll().forEach(t => {
                    if (t._object === this.draggedCard.position || t._object === this.draggedCard.rotation) t.stop();
                });
            }
            
            // restY is set once by drawZone — always use it
            if (this.draggedCard.userData.restY === undefined) {
                this.draggedCard.userData.restY = this.draggedCard.position.y;
            }

            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersectOffset)) {
                this.intersectOffset.sub(this.draggedCard.position);
            }
        }
    }

    onPointerMove(event) {
        if (!this.camera) return;
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        if (this.draggedCard) {
            // Check if we've moved enough to start a real drag (threshold: 8px)
            if (!this.isDragging && this.pointerDownPos) {
                const dx = event.clientX - this.pointerDownPos.x;
                const dy = event.clientY - this.pointerDownPos.y;
                if (Math.sqrt(dx*dx + dy*dy) > 8) {
                    this.isDragging = true;
                    // Lift card for dragging
                    new TWEEN.Tween(this.draggedCard.position).to({ y: 4 }, 100).start();
                    new TWEEN.Tween(this.draggedCard.rotation).to({ x: -Math.PI / 2.2 }, 150).start();
                }
            }
            
            if (this.isDragging) {
                const intersectPoint = new THREE.Vector3();
                if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint)) {
                    this.draggedCard.position.x = intersectPoint.x - this.intersectOffset.x;
                    this.draggedCard.position.z = intersectPoint.z - this.intersectOffset.z;
                }
                document.body.style.cursor = 'grabbing';
            }
        } else {
            // HOVER LOGIC: Neon glow outline
            const meshes = Object.values(this.cardMeshes);
            const intersects = this.raycaster.intersectObjects(meshes);
            
            if (intersects.length > 0) {
                const target = intersects[0].object;
                if (this.hoveredCard !== target) {
                    // Remove glow from old card
                    if (this.hoveredCard) {
                        this._removeNeonGlow(this.hoveredCard);
                        const oldRestY = this.hoveredCard.userData.restY || 0.1;
                        new TWEEN.Tween(this.hoveredCard.position).to({ y: oldRestY }, 100).start();
                    }
                    this.hoveredCard = target;
                    // Add neon glow + pop
                    const restY = this.hoveredCard.userData.restY || 0.1;
                    this._addNeonGlow(this.hoveredCard);
                    new TWEEN.Tween(this.hoveredCard.position).to({ y: restY + 0.015 }, 100).start();
                }
                document.body.style.cursor = 'pointer';
            } else {
                if (this.hoveredCard) {
                    this._removeNeonGlow(this.hoveredCard);
                    const restY = this.hoveredCard.userData.restY || 0.1;
                    new TWEEN.Tween(this.hoveredCard.position).to({ y: restY }, 100).start();
                    this.hoveredCard = null;
                }
                document.body.style.cursor = 'default';
            }
        }
    }

    onPointerUp(event) {
        if (this.draggedCard) {
            if (this.isDragging) {
                // Was dragging → drop the card
                const dropY = this.draggedCard.userData.restY || 0.1;
                new TWEEN.Tween(this.draggedCard.position)
                    .to({ y: dropY }, 500)
                    .easing(TWEEN.Easing.Bounce.Out)
                    .start();
                new TWEEN.Tween(this.draggedCard.rotation)
                    .to({ x: this.draggedCard.rotation.x > 0 ? Math.PI/2 : -Math.PI/2 }, 200)
                    .start();
                window.dispatchEvent(new CustomEvent('cardDropped'));
            } else {
                // Was a click (no drag) → Inspect fullscreen
                const isFaceDown = this.draggedCard.rotation.x > 0;
                window.dispatchEvent(new CustomEvent('cardInspect', { detail: { 
                    cardId: this.draggedCard.userData.visualId,
                    faceDown: isFaceDown 
                }}));
                // Return card to its position gently
                new TWEEN.Tween(this.draggedCard.position).to({ y: this.draggedCard.userData.restY || 0.1 }, 200).start();
            }

            this.draggedCard = null;
            this.isDragging = false;
            document.body.style.cursor = 'default';
        }
    }

    // --- NEON GLOW HELPERS ---
    _addNeonGlow(mesh) {
        if (mesh.userData.glowMesh) return;
        const glowMesh = new THREE.Mesh(
            mesh.geometry,
            new THREE.MeshBasicMaterial({ color: 0x2196F3, transparent: true, opacity: 0.35, side: THREE.BackSide })
        );
        glowMesh.scale.set(1.08, 1.08, 2.0);
        mesh.add(glowMesh);
        mesh.userData.glowMesh = glowMesh;
    }

    _removeNeonGlow(mesh) {
        if (mesh.userData.glowMesh) {
            mesh.remove(mesh.userData.glowMesh);
            mesh.userData.glowMesh.geometry = null; // Help GC
            mesh.userData.glowMesh = null;
        }
    }

    // --- BACKEND: hub si está, ProtoHub local si no ---
    /**
     * Igual que en SovereignBoardEngine: se sondea el hub UNA vez y se decide.
     *
     * Este motor se quedó atrás en la primera pasada — arreglé el de tablero y
     * el de cartas siguió con el sondeo eterno. Lo cazó el guardián de frontera
     * al separar "paquete público" de "contenido de colonia".
     */
    async _iniciarBackend() {
        for (let i = 0; i < 40 && !window.ALISA_PROTOHUB; i++) {
            await new Promise(r => setTimeout(r, 25));
        }
        const proto = window.ALISA_PROTOHUB;
        const hubBase = window.ALISA_HUB_URL === undefined
            ? 'http://127.0.0.1:8741'
            : window.ALISA_HUB_URL;

        if (hubBase) {
            try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 1200);
                const res = await fetch(`${hubBase}${this.hubUrl}`, { signal: ctrl.signal });
                clearTimeout(t);
                if (res.ok) {
                    this.backend = {
                        tipo: 'remoto',
                        state: () => fetch(`${hubBase}${this.hubUrl}`).then(r => r.json()),
                        move: (a) => fetch(`${hubBase}${this.moveUrl}`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(a)
                        }).then(r => r.json()),
                    };
                    console.log(`[Arcade] hub encontrado — '${this.gameId}' conectado.`);
                    return;
                }
            } catch { /* sin hub */ }
        }

        if (proto && proto.soporta(this.gameId)) {
            this.backend = {
                tipo: 'local',
                state: async () => proto.state(this.gameId),
                move: async (a) => proto.move(this.gameId, a),
            };
            console.log(`[Arcade] sin hub — '${this.gameId}' se juega en local.`);
        } else {
            this.backend = {
                tipo: 'ninguno',
                state: async () => ({ error: `'${this.gameId}' aún no tiene reglas locales`,
                                      is_game_over: true, legal_actions: [] }),
                move: async () => ({ ok: false }),
            };
            console.warn(`[Arcade] '${this.gameId}' todavía no tiene reglas locales.`);
        }
    }

    // --- TELEMETRY ---
    async pollHub() {
        if (!this.backend) return;
        try {
            const data = await this.backend.state();
            if (data && data.error) throw new Error(data.error);
            this.updateHUD(data);
            this.onStateSync(data);
            this.processAutoAgent(data);
            const conn = document.getElementById('ui-conn');
            if (conn) {
                conn.innerText = this.backend.tipo === 'local' ? 'LOCAL' : 'CONNECTED';
                conn.style.color = this.backend.tipo === 'local' ? '#7CFC98' : '#00E5FF';
            }
        } catch (err) {
            const conn = document.getElementById('ui-conn');
            if (conn) { 
                conn.innerText = "DISCONNECTED"; 
                conn.style.color = "#FF4081"; 
            }
        }
    }

    async sendMove(moveStr) {
        let payload = { action: 'move', params: { action: moveStr } };
        try {
            const res = await this.backend.move(payload);
            if (res && res.ok !== false) {
                this.pollHub();
                return true;
            }
        } catch (err) { }
        return false;
    }

    // --- AGENT CONTROL ---
    toggleAutoMode() {
        this.autoMode = !this.autoMode;
        const btn = document.getElementById('autoToggleBtn');
        if (btn) {
            if (this.autoMode) {
                btn.innerText = "[ ⏹ STOP MATCH ]";
                btn.classList.add("active");
                this.pollHub();
            } else {
                btn.innerText = "[ ▶ START MATCH ]";
                btn.classList.remove("active");
            }
        }
    }

    async processAutoAgent(data) {
        if (!this.autoMode || this.isGameOver) return;
        
        const stateObj = data.state || data;
        if (stateObj.legal_actions !== undefined && stateObj.legal_actions.length === 0) return;
        
        let payload = { action: "ai_move", params: {} };
        try {
            const r = await this.backend.move(payload);
            if (r && r.ok === false) { this.toggleAutoMode(); return; }
            this.pollHub();
        } catch(e) {
             this.toggleAutoMode(); // Safety Stop
        }
    }

    // --- PROCEDURAL TEXTURES --- (High-Fidelity Sovereign Renderer)
    
    parseCardId(cardId) {
        let rank = '', suitId = '', suit = '', color = '#222222';
        
        // Handle formats: "S_2", "H_K", "O_1", "P_R", etc.
        const m = cardId.match(/^([SHDCOEPB])(?:_)?(.+)$/);
        if (m) {
            suitId = m[1];
            rank = m[2];
            // French suits
            if (suitId === 'S') suit = '♠';
            if (suitId === 'H') { suit = '♥'; color = '#C62828'; }
            if (suitId === 'D') { suit = '♦'; color = '#C62828'; }
            if (suitId === 'C') suit = '♣';
            // Spanish suits
            if (suitId === 'O') { suit = 'Oros'; color = '#E6A817'; }
            if (suitId === 'P') { suit = 'Copas'; color = '#C62828'; }
            if (suitId === 'E') { suit = 'Espadas'; color = '#1565C0'; }
            if (suitId === 'B') { suit = 'Bastos'; color = '#5D4037'; }
        } else {
            rank = cardId;
        }
        return { rank, suit, suitId, color };
    }

    // ═══ SUIT PATH DRAWING (Bezier curves — crisp at any zoom) ═══
    _drawSpade(ctx, x, y, s) {
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.bezierCurveTo(x - s*0.1, y - s*0.8, x - s*1.2, y - s*0.3, x - s*0.6, y + s*0.1);
        ctx.bezierCurveTo(x - s*0.3, y + s*0.3, x - s*0.1, y + s*0.15, x, y + s*0.2);
        ctx.bezierCurveTo(x + s*0.1, y + s*0.15, x + s*0.3, y + s*0.3, x + s*0.6, y + s*0.1);
        ctx.bezierCurveTo(x + s*1.2, y - s*0.3, x + s*0.1, y - s*0.8, x, y - s);
        ctx.fill();
        // Stem
        ctx.fillRect(x - s*0.08, y + s*0.1, s*0.16, s*0.35);
        ctx.beginPath();
        ctx.moveTo(x - s*0.3, y + s*0.45);
        ctx.quadraticCurveTo(x, y + s*0.25, x + s*0.3, y + s*0.45);
        ctx.fill();
    }
    _drawHeart(ctx, x, y, s) {
        ctx.beginPath();
        ctx.moveTo(x, y + s*0.8);
        ctx.bezierCurveTo(x - s*0.1, y + s*0.5, x - s*1.1, y - s*0.1, x - s*0.55, y - s*0.6);
        ctx.bezierCurveTo(x - s*0.2, y - s*0.9, x, y - s*0.6, x, y - s*0.3);
        ctx.bezierCurveTo(x, y - s*0.6, x + s*0.2, y - s*0.9, x + s*0.55, y - s*0.6);
        ctx.bezierCurveTo(x + s*1.1, y - s*0.1, x + s*0.1, y + s*0.5, x, y + s*0.8);
        ctx.fill();
    }
    _drawDiamond(ctx, x, y, s) {
        ctx.beginPath();
        ctx.moveTo(x, y - s*0.85);
        ctx.quadraticCurveTo(x - s*0.15, y - s*0.3, x - s*0.55, y);
        ctx.quadraticCurveTo(x - s*0.15, y + s*0.3, x, y + s*0.85);
        ctx.quadraticCurveTo(x + s*0.15, y + s*0.3, x + s*0.55, y);
        ctx.quadraticCurveTo(x + s*0.15, y - s*0.3, x, y - s*0.85);
        ctx.fill();
    }
    _drawClub(ctx, x, y, s) {
        const r = s * 0.35;
        // Three lobes
        ctx.beginPath(); ctx.arc(x, y - s*0.35, r, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x - s*0.35, y + s*0.05, r, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + s*0.35, y + s*0.05, r, 0, Math.PI*2); ctx.fill();
        // Stem
        ctx.fillRect(x - s*0.08, y + s*0.15, s*0.16, s*0.35);
        ctx.beginPath();
        ctx.moveTo(x - s*0.25, y + s*0.5);
        ctx.quadraticCurveTo(x, y + s*0.3, x + s*0.25, y + s*0.5);
        ctx.fill();
    }
    
    // ═══ SPANISH SUIT PATH DRAWINGS ═══
    _drawOro(ctx, x, y, s) {
        // Oros = Gold coin with inner ring and cross
        ctx.beginPath(); ctx.arc(x, y, s*0.7, 0, Math.PI*2);
        ctx.fill();
        ctx.save(); ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(x, y, s*0.5, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        // Inner filled circle
        ctx.beginPath(); ctx.arc(x, y, s*0.35, 0, Math.PI*2); ctx.fill();
        // Cross lines on coin
        ctx.save(); ctx.strokeStyle = '#FFF8E1'; ctx.lineWidth = s*0.08;
        ctx.beginPath(); ctx.moveTo(x - s*0.2, y); ctx.lineTo(x + s*0.2, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y - s*0.2); ctx.lineTo(x, y + s*0.2); ctx.stroke();
        ctx.restore();
    }
    _drawCopa(ctx, x, y, s) {
        // Copas = Chalice / goblet
        // Bowl
        ctx.beginPath();
        ctx.moveTo(x - s*0.5, y - s*0.5);
        ctx.quadraticCurveTo(x - s*0.55, y + s*0.1, x - s*0.1, y + s*0.15);
        ctx.lineTo(x + s*0.1, y + s*0.15);
        ctx.quadraticCurveTo(x + s*0.55, y + s*0.1, x + s*0.5, y - s*0.5);
        ctx.closePath();
        ctx.fill();
        // Stem
        ctx.fillRect(x - s*0.06, y + s*0.15, s*0.12, s*0.35);
        // Base
        ctx.beginPath();
        ctx.ellipse(x, y + s*0.55, s*0.3, s*0.1, 0, 0, Math.PI*2);
        ctx.fill();
    }
    _drawEspada(ctx, x, y, s) {
        // Espadas = Sword pointing up
        // Blade
        ctx.beginPath();
        ctx.moveTo(x, y - s*0.9);
        ctx.lineTo(x - s*0.08, y + s*0.1);
        ctx.lineTo(x + s*0.08, y + s*0.1);
        ctx.closePath();
        ctx.fill();
        // Guard (crossbar)
        ctx.fillRect(x - s*0.35, y + s*0.08, s*0.7, s*0.1);
        // Round guard ends
        ctx.beginPath(); ctx.arc(x - s*0.35, y + s*0.13, s*0.06, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + s*0.35, y + s*0.13, s*0.06, 0, Math.PI*2); ctx.fill();
        // Handle
        ctx.fillRect(x - s*0.05, y + s*0.18, s*0.1, s*0.3);
        // Pommel
        ctx.beginPath(); ctx.arc(x, y + s*0.52, s*0.08, 0, Math.PI*2); ctx.fill();
    }
    _drawBasto(ctx, x, y, s) {
        // Bastos = Wooden club/stick
        // Main shaft (tapered)
        ctx.beginPath();
        ctx.moveTo(x - s*0.08, y + s*0.7);
        ctx.lineTo(x - s*0.12, y - s*0.3);
        ctx.quadraticCurveTo(x - s*0.2, y - s*0.6, x, y - s*0.75);
        ctx.quadraticCurveTo(x + s*0.2, y - s*0.6, x + s*0.12, y - s*0.3);
        ctx.lineTo(x + s*0.08, y + s*0.7);
        ctx.closePath();
        ctx.fill();
        // Knots on shaft
        ctx.save();
        const knotColor = ctx.fillStyle;
        ctx.fillStyle = '#FFF'; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.ellipse(x, y - s*0.1, s*0.14, s*0.06, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x, y + s*0.25, s*0.11, s*0.05, -0.15, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    _drawSuit(ctx, suitId, x, y, size) {
        if (suitId === 'S') this._drawSpade(ctx, x, y, size);
        else if (suitId === 'H') this._drawHeart(ctx, x, y, size);
        else if (suitId === 'D') this._drawDiamond(ctx, x, y, size);
        else if (suitId === 'C') this._drawClub(ctx, x, y, size);
        // Spanish suits
        else if (suitId === 'O') this._drawOro(ctx, x, y, size);
        else if (suitId === 'P') this._drawCopa(ctx, x, y, size);
        else if (suitId === 'E') this._drawEspada(ctx, x, y, size);
        else if (suitId === 'B') this._drawBasto(ctx, x, y, size);
        else {
            // Ultimate fallback — text
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = `${size*1.5}px Arial`;
            ctx.fillText(suitId, x, y);
        }
    }

    // ═══ PIP GRID — Standard 13-position layout ═══
    _getPipPositions(rank) {
        // Normalized positions (0-1) relative to pip area
        // Format: [col, row, rotated?]
        // Col: 0=left, 0.5=center, 1=right
        // Row: 0=top, 0.5=center, 1=bottom
        const L = 0.22, R = 0.78, C = 0.5;
        const maps = {
            'A':  [[C,0.5,false]], // Ace = 1 big centered pip
            '2':  [[C,0.18,false],[C,0.82,true]],
            '3':  [[C,0.18,false],[C,0.5,false],[C,0.82,true]],
            '4':  [[L,0.18,false],[R,0.18,false],[L,0.82,true],[R,0.82,true]],
            '5':  [[L,0.18,false],[R,0.18,false],[C,0.5,false],[L,0.82,true],[R,0.82,true]],
            '6':  [[L,0.18,false],[R,0.18,false],[L,0.5,false],[R,0.5,false],[L,0.82,true],[R,0.82,true]],
            '7':  [[L,0.18,false],[R,0.18,false],[L,0.5,false],[R,0.5,false],[L,0.82,true],[R,0.82,true],[C,0.35,false]],
            '8':  [[L,0.18,false],[R,0.18,false],[L,0.5,false],[R,0.5,false],[L,0.82,true],[R,0.82,true],[C,0.35,false],[C,0.65,true]],
            '9':  [[L,0.18,false],[R,0.18,false],[L,0.38,false],[R,0.38,false],[C,0.5,false],[L,0.62,true],[R,0.62,true],[L,0.82,true],[R,0.82,true]],
            '10': [[L,0.18,false],[R,0.18,false],[L,0.38,false],[R,0.38,false],[L,0.62,true],[R,0.62,true],[L,0.82,true],[R,0.82,true],[C,0.28,false],[C,0.72,true]],
        };
        return maps[rank] || null;
    }

    // ═══ COURT CARD PORTRAIT (Geometric/Abstract) ═══
    _drawCourtCard(ctx, rank, suitId, color, W, H) {
        const cx = W/2, cy = H/2;
        
        // Top half portrait
        ctx.save();
        ctx.beginPath();
        ctx.rect(30, 100, W-60, H/2 - 100);
        ctx.clip();
        
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.08;
        ctx.fillRect(30, 100, W-60, H/2-100);
        ctx.globalAlpha = 1.0;
        
        // Figure body (robe)
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.moveTo(cx - 40, cy - 10);
        ctx.quadraticCurveTo(cx - 50, cy - 60, cx - 30, cy - 80);
        ctx.lineTo(cx + 30, cy - 80);
        ctx.quadraticCurveTo(cx + 50, cy - 60, cx + 40, cy - 10);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Head circle
        ctx.beginPath();
        ctx.arc(cx, cy - 100, 22, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.15;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Crown/hat based on rank
        if (rank === 'K' || rank === 'R') {
            // King crown — 3 points
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(cx - 22, cy - 120);
            ctx.lineTo(cx - 20, cy - 140);
            ctx.lineTo(cx - 10, cy - 128);
            ctx.lineTo(cx, cy - 145);
            ctx.lineTo(cx + 10, cy - 128);
            ctx.lineTo(cx + 20, cy - 140);
            ctx.lineTo(cx + 22, cy - 120);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1.0;
        } else if (rank === 'Q') {
            // Queen crown — rounded with gem
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.25;
            ctx.beginPath();
            ctx.moveTo(cx - 20, cy - 120);
            ctx.quadraticCurveTo(cx - 15, cy - 145, cx, cy - 140);
            ctx.quadraticCurveTo(cx + 15, cy - 145, cx + 20, cy - 120);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1.0;
            // Gem
            ctx.beginPath(); ctx.arc(cx, cy - 135, 4, 0, Math.PI*2);
            ctx.fillStyle = color; ctx.fill();
        } else if (rank === 'J' || rank === 'S') {
            // Jack hat — simple beret
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 122, 25, 10, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        
        // Suit symbol on the chest
        ctx.fillStyle = color;
        this._drawSuit(ctx, suitId, cx, cy - 55, 15);
        
        ctx.restore();
        
        // Draw mirrored bottom half
        ctx.save();
        ctx.translate(W, H);
        ctx.rotate(Math.PI);
        ctx.beginPath();
        ctx.rect(30, 100, W-60, H/2 - 100);
        ctx.clip();
        
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.08;
        ctx.fillRect(30, 100, W-60, H/2-100);
        ctx.globalAlpha = 1.0;
        
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.moveTo(cx - 40, cy - 10);
        ctx.quadraticCurveTo(cx - 50, cy - 60, cx - 30, cy - 80);
        ctx.lineTo(cx + 30, cy - 80);
        ctx.quadraticCurveTo(cx + 50, cy - 60, cx + 40, cy - 10);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        ctx.beginPath();
        ctx.arc(cx, cy - 100, 22, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.15; ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        
        // Same crown
        if (rank === 'K' || rank === 'R') {
            ctx.fillStyle = color; ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(cx - 22, cy - 120); ctx.lineTo(cx - 20, cy - 140);
            ctx.lineTo(cx - 10, cy - 128); ctx.lineTo(cx, cy - 145);
            ctx.lineTo(cx + 10, cy - 128); ctx.lineTo(cx + 20, cy - 140);
            ctx.lineTo(cx + 22, cy - 120); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1.0;
        } else if (rank === 'Q') {
            ctx.fillStyle = color; ctx.globalAlpha = 0.25;
            ctx.beginPath();
            ctx.moveTo(cx - 20, cy - 120);
            ctx.quadraticCurveTo(cx - 15, cy - 145, cx, cy - 140);
            ctx.quadraticCurveTo(cx + 15, cy - 145, cx + 20, cy - 120);
            ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1.0;
            ctx.beginPath(); ctx.arc(cx, cy - 135, 4, 0, Math.PI*2);
            ctx.fillStyle = color; ctx.fill();
        } else if (rank === 'J' || rank === 'S') {
            ctx.fillStyle = color; ctx.globalAlpha = 0.2;
            ctx.beginPath(); ctx.ellipse(cx, cy - 122, 25, 10, 0, 0, Math.PI*2);
            ctx.fill(); ctx.globalAlpha = 1.0;
        }
        
        ctx.fillStyle = color;
        this._drawSuit(ctx, suitId, cx, cy - 55, 15);
        ctx.restore();
        
        // Center divider line
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(35, cy); ctx.lineTo(W-35, cy); ctx.stroke();
        ctx.globalAlpha = 1.0;
        
        // Big rank letters
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.08;
        ctx.font = 'bold 100px Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(rank, cx, cy);
        ctx.globalAlpha = 1.0;
    }

    // ═══ CARD BACK PATTERNS ═══
    _drawCardBack(ctx, W, H, deckType) {
        const patterns = {
            'classic_red':   { bg: '#8B1A1A', fg: '#A52A2A', accent: '#CD5C5C' },
            'spanish_gold':  { bg: '#5C4A1E', fg: '#8B6914', accent: '#DAA520' },
            'uno_black':     { bg: '#111111', fg: '#333333', accent: '#E53935' },
            'tarot_purple':  { bg: '#2E003E', fg: '#4A0072', accent: '#9C27B0' },
            'casino_blue':   { bg: '#0D1B2A', fg: '#1B2838', accent: '#1976D2' },
        };
        const p = patterns[deckType] || patterns['classic_red'];
        
        // Background
        ctx.fillStyle = p.bg;
        ctx.beginPath(); ctx.roundRect(0, 0, W, H, 12); ctx.fill();
        
        // Border
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.roundRect(8, 8, W-16, H-16, 8); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(14, 14, W-28, H-28, 6); ctx.stroke();
        
        // Diamond crosshatch pattern
        ctx.strokeStyle = p.fg;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        const step = 16;
        for (let i = -H; i < W + H; i += step) {
            ctx.beginPath(); ctx.moveTo(i, 20); ctx.lineTo(i + H, H - 20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(i + H, 20); ctx.lineTo(i, H - 20); ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
        
        // Center ornament
        ctx.fillStyle = p.accent;
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.ellipse(W/2, H/2, 35, 50, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.ellipse(W/2, H/2, 20, 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Small diamond in center
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.moveTo(W/2, H/2 - 12);
        ctx.lineTo(W/2 + 8, H/2);
        ctx.lineTo(W/2, H/2 + 12);
        ctx.lineTo(W/2 - 8, H/2);
        ctx.closePath();
        ctx.fill();
    }

    // ═══ MAIN CARD RENDERER ═══
    getCardCanvas(cardId) {
        const W = 256, H = 384;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        // --- CARD BACK ---
        if (cardId.startsWith("back")) {
            const deckType = cardId.replace('back_', '') || 'classic_red';
            this._drawCardBack(ctx, W, H, deckType === 'back' ? 'classic_red' : deckType);
            return canvas;
        }

        const { rank, suit, suitId, color } = this.parseCardId(cardId);

        // White card base with rounded corners
        ctx.fillStyle = '#FAFAFA';
        ctx.beginPath(); ctx.roundRect(0, 0, W, H, 12); ctx.fill();
        // Subtle border
        ctx.strokeStyle = '#D0D0D0';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(2, 2, W-4, H-4, 10); ctx.stroke();

        if (!suitId) {
            // Unrecognized card — just render text
            ctx.fillStyle = '#333'; ctx.font = 'bold 36px Georgia';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(cardId, W/2, H/2);
            return canvas;
        }

        // --- CORNER INDICES ---
        ctx.fillStyle = color;
        // Top-left
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 32px Georgia';
        ctx.fillText(rank, 30, 36);
        this._drawSuit(ctx, suitId, 30, 62, 11);
        // Bottom-right (rotated 180°)
        ctx.save();
        ctx.translate(W - 30, H - 36);
        ctx.rotate(Math.PI);
        ctx.fillStyle = color;
        ctx.font = 'bold 32px Georgia';
        ctx.fillText(rank, 0, 0);
        this._drawSuit(ctx, suitId, 0, 26, 11);
        ctx.restore();

        // --- COURT CARDS ---
        const isCourt = ['J','Q','K','S','C','R'].includes(rank);
        if (isCourt) {
            // Hybrid: try image first, procedural fallback
            const courtImg = this._getCourtImage(suitId, rank);
            if (courtImg) {
                // Draw image as portrait in center area
                const imgArea = { x: 30, y: 85, w: W - 60, h: H - 170 };
                ctx.save();
                ctx.beginPath(); ctx.roundRect(imgArea.x, imgArea.y, imgArea.w, imgArea.h, 8); ctx.clip();
                ctx.drawImage(courtImg, imgArea.x, imgArea.y, imgArea.w, imgArea.h);
                ctx.restore();
                // Translucent border around portrait
                ctx.strokeStyle = color;
                ctx.globalAlpha = 0.3;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.roundRect(imgArea.x, imgArea.y, imgArea.w, imgArea.h, 8); ctx.stroke();
                ctx.globalAlpha = 1.0;
            } else {
                this._drawCourtCard(ctx, rank, suitId, color, W, H);
            }
            return canvas;
        }

        // --- PIP CARDS (A through 10) ---
        const pipPositions = this._getPipPositions(rank);
        if (pipPositions) {
            const pipArea = { x: 40, y: 90, w: W - 80, h: H - 180 };
            const isAce = rank === 'A';
            const pipSize = isAce ? 40 : 18;

            ctx.fillStyle = color;
            for (const [col, row, rotated] of pipPositions) {
                const px = pipArea.x + col * pipArea.w;
                const py = pipArea.y + row * pipArea.h;
                
                if (rotated) {
                    ctx.save();
                    ctx.translate(px, py);
                    ctx.rotate(Math.PI);
                    this._drawSuit(ctx, suitId, 0, 0, pipSize);
                    ctx.restore();
                } else {
                    this._drawSuit(ctx, suitId, px, py, pipSize);
                }
            }
        }
        
        return canvas;
    }

    getProceduralMaterial(cardId) {
        if (!this.cachedMaterials) this.cachedMaterials = {};
        if (this.cachedMaterials[cardId]) return this.cachedMaterials[cardId];
        
        // Generate the procedural canvas (works for fronts AND backs now)
        const canvas = this.getCardCanvas(cardId);
        const texture = new THREE.CanvasTexture(canvas);
        if (this.renderer) texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        const faceMat = new THREE.MeshLambertMaterial({ map: texture });

        // For backs: both sides show the back pattern
        if (cardId.startsWith("back")) {
            const matArray = [
                this.cardMatFront, this.cardMatFront,
                this.cardMatFront, this.cardMatFront,
                faceMat, faceMat  // Both visible faces = back pattern
            ];
            this.cachedMaterials[cardId] = matArray;
            return matArray;
        }

        // For front cards: procedural back on reverse side
        const backCanvas = this.getCardCanvas('back_' + (this.activeDeckBack || 'classic_red'));
        const backTex = new THREE.CanvasTexture(backCanvas);
        if (this.renderer) backTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        const backMat = new THREE.MeshLambertMaterial({ map: backTex });

        const matArray = [
            this.cardMatFront, this.cardMatFront,
            this.cardMatFront, this.cardMatFront,
            faceMat, backMat
        ];
        
        this.cachedMaterials[cardId] = matArray;
        return matArray;
    }

    // ═══ HYBRID IMAGE LOADING (for courts/special cards) ═══
    // Call this to preload image assets for a specific deck
    // If images exist, they override the procedural court cards
    preloadCourtImages(basePath) {
        if (!this._courtImages) this._courtImages = {};
        const ranks = ['J', 'Q', 'K'];
        const suits = ['S', 'H', 'D', 'C'];
        
        for (const rank of ranks) {
            for (const suit of suits) {
                const key = `${suit}_${rank}`;
                const img = new Image();
                img.onload = () => {
                    this._courtImages[key] = img;
                    // Invalidate cached material so it re-renders with image
                    delete this.cachedMaterials[key];
                    console.log(`[ALISA] Court image loaded: ${key}`);
                };
                img.onerror = () => {}; // Silent fail — procedural fallback
                img.src = `${basePath}/${key}.webp`;
            }
        }
    }

    // Check if we have a preloaded court image for this card
    _getCourtImage(suitId, rank) {
        if (!this._courtImages) return null;
        const key = `${suitId}_${rank}`;
        return this._courtImages[key] || null;
    }

    // ═══════════════════════════════════════════════════
    //  TAPESTRY BOARDS (ARCADE MATS) ARCHITECTURE
    // ═══════════════════════════════════════════════════
    setMat(matConfig, anchorX = 0, anchorZ = 0) {
        this.matConfig = matConfig;
        this.matAnchorX = anchorX;
        this.matAnchorZ = anchorZ;
    }

    dealTo(zoneName, cards, customOptions = {}) {
        if (!this.matConfig || !this.matConfig.zones || !this.matConfig.zones[zoneName]) {
            console.warn(`Zone ${zoneName} not defined in active Mat.`);
            return;
        }

        const zCfg = this.matConfig.zones[zoneName];
        
        let tx = this.matAnchorX + (zCfg.relX || 0);
        let tz = this.matAnchorZ + (zCfg.relZ || 0);
        
        // Merge mat options with custom options
        let opts = { layout: zCfg.layout, ...customOptions };
        
        if (zCfg.rotation !== undefined && opts.tapped === undefined) {
             opts.tapped = (zCfg.rotation === 90);
        }

        this.drawZone(cards, zoneName, tx, tz, opts);
    }

    // --- 3D CARD RENDERING UTILS ---
    drawZone(cardList, zoneName, startX, startZ, options = {}) {
        if (!cardList) return;
        
        const layout = options.layout || (options === true ? 'line' : 'line');
        const faceDown = typeof options === 'object' ? (options.faceDown || false) : false;
        const spacing = options.spacing || 1.35;
        
        cardList.forEach((card, idx) => {
            const baseId = typeof card === 'string' ? card : (card.id || card.rank+card.suit || `c_${idx}`);
            const visualId = baseId; // Always forge the true card. Physical rotation will hide it.
            const trackId = `${zoneName}_${baseId}_${idx}`;
            
            let mesh = this.cardMeshes[trackId];
            
            if (!mesh) {
                const materials = this.getProceduralMaterial(visualId);
                mesh = new THREE.Mesh(this.cardGeo, materials);
                this.scene.add(mesh);
                this.cardMeshes[trackId] = mesh;
                mesh.position.set(0, 5, 0); 
                mesh.rotation.y = Math.PI; 
            } else if (mesh.userData.visualId !== visualId) {
                mesh.material = this.getProceduralMaterial(visualId);
                mesh.rotation.y += Math.PI; 
            }
            mesh.userData.visualId = visualId;
            mesh.userData.active = true;
            
            let targetX = startX;
            let targetY = (this.tableY !== undefined ? this.tableY : 0.1);
            let targetZ = startZ;
            let targetRotX = faceDown ? Math.PI/2 : -Math.PI / 2;
            let targetRotY = 0;
            let targetRotZ = 0;

            const n = cardList.length;

            if (options.rotationZBase !== undefined) targetRotZ = options.rotationZBase;

            if (layout === 'line') {
                targetX = startX + idx * spacing;
                const jForce = typeof options.jitter === "number" ? options.jitter : 1;
                if(options.jitter !== false) targetRotZ += (Math.random() - 0.5) * 0.03 * jForce; targetX += (Math.random() - 0.5) * 0.005 * jForce;
            } 
            else if (layout === 'pile') {
                targetY = (this.tableY !== undefined ? this.tableY : 0.1) + (idx * 0.002); // Tighter stack mapping physically
                const jForce = typeof options.jitter === "number" ? options.jitter : 1;
                if(options.jitter !== false) targetRotZ += (Math.random() - 0.5) * 0.08 * jForce; targetX += (Math.random() - 0.5) * 0.01 * jForce; targetZ += (Math.random() - 0.5) * 0.01 * jForce; 
            }
            else if (layout === 'fan') {
                const centerIdx = (n - 1) / 2;
                const offset = idx - centerIdx;
                const angle = offset * -0.15; 
                const radius = 6 * (spacing || 1); 
                targetX = startX + Math.sin(-angle) * radius;
                targetZ = startZ + radius - Math.cos(-angle) * radius;
                targetY = (this.tableY !== undefined ? this.tableY : 0.1) + (idx * 0.005); 
                targetRotZ += angle; 
            }
            else if (layout === 'cascade') {
                const tz = options.cascadeZ !== undefined ? options.cascadeZ : 0.03;
                const tx = options.cascadeX || 0;
                targetY = (this.tableY !== undefined ? this.tableY : 0.1) + (idx * 0.002);
                targetX = startX + idx * tx;
                targetZ = startZ + idx * tz;
                const jForce = typeof options.jitter === "number" ? options.jitter : 1;
                if(options.jitter !== false) targetRotZ += (Math.random() - 0.5) * 0.01 * jForce; targetX += (Math.random() - 0.5) * 0.005 * jForce;
            }
            else if (layout === 'grid') {
                const cols = options.columns || 3;
                const sz = options.spacingZ || spacing;
                const r = Math.floor(idx / cols);
                const c = idx % cols;
                targetX = startX + c * spacing;
                targetZ = startZ + r * sz;
                targetY = (this.tableY !== undefined ? this.tableY : 0.1) + Math.random()*0.001; // Z-fighting prevention
            }
            else if (layout === 'circle') {
                const r = options.radius || 0.4;
                const angle = (idx / n) * Math.PI * 2;
                targetX = startX + Math.cos(angle) * r;
                targetZ = startZ + Math.sin(angle) * r;
                targetRotZ += -angle - Math.PI/2; // Face outwards
            }
            else if (layout === 'pyramid') {
                let row = 0;
                let cardsInPrevRows = 0;
                while (cardsInPrevRows + (row + 1) <= idx) {
                    cardsInPrevRows += (row + 1);
                    row++;
                }
                const posInRow = idx - cardsInPrevRows; 
                const rowWidth = row * spacing; 
                targetX = startX - (rowWidth / 2) + (posInRow * spacing);
                targetZ = startZ + row * (options.spacingZ || (spacing * 0.8));
                targetY = (this.tableY !== undefined ? this.tableY : 0.1) + (idx * 0.002);
            }

            // Universal Micro-Modifiers
            if (options.tapped) {
                targetRotZ += Math.PI / 2; // +90 degrees rotate
            }
            if (options.hover) {
                targetY += 0.03; // Pop up
            }

            mesh.userData.restY = targetY; // Permanent rest height for hover math

            if (typeof TWEEN !== 'undefined') {
                const animDelay = options.sequenceDelay ? (idx * options.sequenceDelay) : 0;
                
                // Spin Throw logic
                if (mesh.userData.spawnedThisFrame) {
                    // Start spinning wildly from origin
                    mesh.rotation.set(
                        (Math.random()-0.5)*Math.PI, 
                        (Math.random()-0.5)*Math.PI, 
                        (Math.random()-0.5)*Math.PI
                    );
                    mesh.userData.spawnedThisFrame = false;
                    
                    new TWEEN.Tween(mesh.position).to({ x: targetX, y: targetY, z: targetZ }, 600).delay(animDelay).easing(TWEEN.Easing.Quadratic.Out).start();
                    new TWEEN.Tween(mesh.rotation).to({ x: targetRotX, y: targetRotY, z: targetRotZ }, 600).delay(animDelay).easing(TWEEN.Easing.Quadratic.Out).start();
                } 
                else if (Math.abs(mesh.rotation.x - targetRotX) > 1.0) {
                    // FLIP REVEAL LOGIC!
                    // If target rotation X drastically shifted (e.g. going from FaceDown Math.PI to FaceUp 0), do a hop+flip
                    
                    // Hop Up
                    new TWEEN.Tween(mesh.position)
                        .to({ y: targetY + 0.15 }, 200)
                        .delay(animDelay)
                        .easing(TWEEN.Easing.Quadratic.Out)
                        .onComplete(() => {
                            // Drop Down
                            new TWEEN.Tween(mesh.position).to({ x: targetX, y: targetY, z: targetZ }, 300).easing(TWEEN.Easing.Quadratic.In).start();
                        }).start();
                        
                    // Flip Spin
                    new TWEEN.Tween(mesh.rotation).to({ x: targetRotX, y: targetRotY, z: targetRotZ }, 500).delay(animDelay).easing(TWEEN.Easing.Cubic.InOut).start();
                }
                else {
                    // Normal glide adjustment
                    new TWEEN.Tween(mesh.position).to({ x: targetX, y: targetY, z: targetZ }, 500).delay(animDelay).easing(TWEEN.Easing.Cubic.Out).start();
                    new TWEEN.Tween(mesh.rotation).to({ x: targetRotX, y: targetRotY, z: targetRotZ }, 500).delay(animDelay).easing(TWEEN.Easing.Quadratic.Out).start();
                }
                
            } else {
                mesh.position.set(targetX, targetY, targetZ);
                mesh.rotation.set(targetRotX, targetRotY, targetRotZ);
            }
        });
    }
    gcCards() {
        // Collect garbage: any card mesh not marked active this frame gets deleted
        Object.keys(this.cardMeshes).forEach(id => {
            if (!this.cardMeshes[id].userData.active) {
                this.scene.remove(this.cardMeshes[id]);
                delete this.cardMeshes[id];
            } else {
                this.cardMeshes[id].userData.active = false; // Reset for next frame
            }
        });
    }

    // --- HUD ---
    mountAgentHUD(containerId, title = "Card Arena", customUpperHtml = "") {
        const container = document.getElementById(containerId);
        if (!container) return;
        const html = `
        <div class="overlay" style="z-index: 10;">
            <div class="hud-panel" id="main-hud">
                <div class="hud-header" id="dockBtnToggle">
                    <h1>🃏 ${title}</h1>
                </div>
                <div id="hud-content">
                    ${customUpperHtml}
                    <div class="status-row" style="margin-top: 10px;">
                        <span>CONNECTION</span>
                        <span id="ui-conn" class="val" style="color: #4CAF50">SYNCED</span>
                    </div>
                    <div class="legal-moves" id="ui-moves">Awaiting telemetry...</div>
                    <div class="agent-control">
                        <button id="autoToggleBtn" class="auto-btn">[ ▶ START MATCH ]</button>
                    </div>
                </div>
            </div>
        </div>`;
        container.innerHTML = html;
        document.getElementById('autoToggleBtn').addEventListener('click', () => this.toggleAutoMode());
    }

    updateHUD(data) {
        const stateObj = data.state || data;
        const movesEl = document.getElementById('ui-moves');
        if (movesEl) {
             const mStr = (stateObj.legal_actions || []).join(", ");
             movesEl.innerText = mStr.length > 0 ? (mStr.length > 50 ? mStr.substring(0, 46) + "..." : mStr) : "None";
        }
    }

    flip(zoneName, cardIndex) {
        // Find the mesh
        const trackId = zoneName + '_' + cardIndex;
        if (this.cardMeshes[trackId]) {
            // Target face down/up
            // We just trigger a re-draw with the flipped property maybe?
            // Actually it's easier to handle this at the visualizer layer since Engine is stateless
        }
    }
}
