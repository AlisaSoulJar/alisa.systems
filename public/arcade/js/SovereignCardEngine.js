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

        /**
         * ⚠️ INVITADO EN VEZ DE DUEÑO: `config.anfitrion`.
         *
         * Este motor creaba SIEMPRE su propia escena, su cámara con
         * `window.innerWidth`, su renderer dentro de `#canvas-container` y su
         * propio bucle. Es dueño de la página, y por eso la Sala del Huevo sólo
         * podía enseñar un juego «abduciéndote» a un iframe a pantalla completa:
         * era la única forma de darle una página entera para él solo.
         *
         * Con `anfitrion: { grupo, escena, camara }` no monta nada de eso: dibuja
         * dentro del grupo que le den y deja que el bucle lo lleve otro. Entonces
         * las cartas son objetos de la escena de la sala — con su sombra, y
         * clicables con el raycaster que la sala ya tiene.
         *
         * La escala deja de importar, que es la otra mitad del problema: las
         * cartas de aquí miden 1,2×1,8 y las de la Sala del Huevo 0,088×0,123,
         * catorce veces menos. Un grupo se escala entero, y la sala ya lo hace
         * con los tableros: `conjunto.scale.setScalar(1.28 / max(ancho, largo))`.
         *
         * Todo el dibujo (`drawZone`) sólo usa `this.scene` y coordenadas, así
         * que no distingue quién es el dueño. Por eso el cambio cabe aquí y no
         * hay que tocar una línea de lo que pinta.
         */
        this.anfitrion = config.anfitrion ?? null;
        this.invitado = !!this.anfitrion;
        
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
        /**
         * De invitado no se monta nada: ni escena, ni cámara, ni renderer, ni
         * bucle. Se dibuja en el grupo que da el anfitrión y él sigue mandando
         * en su sala.
         *
         * `this.scene` apunta al GRUPO, no a la escena: es lo que `drawZone` usa
         * para colgar las cartas, y colgarlas de la escena directamente las
         * dejaría fuera del grupo — sin heredar su posición ni su escala, o sea
         * sueltas por la sala a tamaño gigante.
         */
        if (this.invitado) {
            const { grupo, escena, camara } = this.anfitrion;
            this.scene = grupo;
            this.escenaReal = escena ?? grupo;
            this.camera = camara ?? null;
            this.renderer = null;

            this.cardGeo = new THREE.BoxGeometry(1.2, 1.8, 0.05);
            this.cardMatFront = new THREE.MeshLambertMaterial({ color: 0xE8ECEF });
            this.cardMatBack = new THREE.MeshLambertMaterial({ color: 0x882222 });

            this.onInit3D(this.scene, this.camera, null);
            return;   // ni `animate()`: el anfitrión ya tiene su bucle
        }

        const container = document.getElementById('canvas-container');
        if (!container) return;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x05050A, 0.015);

        /**
         * ⚠️ UN ASPECTO `NaN` DEJA LA PANTALLA EN NEGRO, SIN DECIR NADA.
         *
         * Esto era `window.innerWidth / window.innerHeight` a pelo. Si la página
         * se monta antes de que el navegador haya compuesto la ventana —pasa en
         * una pestaña de fondo, y pasa en algunos móviles al restaurar—, las dos
         * medidas valen 0: `0/0` es `NaN`, la matriz de proyección se corrompe
         * entera y **no se dibuja un solo píxel**.
         *
         * Y no salta ningún error: Three multiplica con `NaN` tan tranquilo. Se
         * cazó lanzando un rayo desde la cámara y viendo que su dirección era
         * `[null, null, null]` mientras la escena estaba perfectamente montada.
         *
         * Es el mismo cero de `esPantallaEstrecha()`: no es una medida pequeña,
         * es «todavía no lo sé». Se responde 16:9 y `onWindowResize` lo corrige
         * en cuanto haya una medida de verdad.
         */
        const aspecto = (window.innerWidth > 0 && window.innerHeight > 0)
            ? window.innerWidth / window.innerHeight
            : 16 / 9;
        this.camera = new THREE.PerspectiveCamera(45, aspecto, 0.1, 100);
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
        // Mismo cuidado que al crearla: un `resize` a 0×0 —minimizar la ventana,
        // cambiar de pestaña en algunos navegadores— metería `NaN` en la matriz y
        // dejaría la pantalla en negro AL VOLVER, que es cuando nadie lo asocia
        // con haberla minimizado.
        if (!(window.innerWidth > 0 && window.innerHeight > 0)) return;
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
                /**
                 * ⚠️ QUÉ carta se ha clicado, no sólo qué CARA tiene.
                 *
                 * Esto mandaba `cardId`, que es la cara —«un 12»— y con eso no se
                 * puede jugar: en la caja de entropy hay ocho huecos y dos pueden
                 * tener el mismo número. Sin saber CUÁL se ha tocado, un clic no
                 * se puede traducir a `cambiar:5`.
                 *
                 * `zona` es la clave con la que se dibujó (`caja_0_0`, `mazo_mesa_1`)
                 * y `indice` la posición dentro de ella, que en una rejilla ES la
                 * casilla. Con eso un visualizador convierte clics en jugadas sin
                 * mantener su propio mapa de mallas, que se desincronizaría.
                 */
                window.dispatchEvent(new CustomEvent('cardInspect', { detail: {
                    cardId: this.draggedCard.userData.visualId,
                    faceDown: isFaceDown,
                    zona: this.draggedCard.userData.zona ?? null,
                    indice: this.draggedCard.userData.indice ?? null,
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
        // ⚠️ SIN HUB SALVO QUE SE PIDA. Mismo cambio y mismo motivo que en
        // `SovereignBoardEngine.js`: el defecto sondeaba `127.0.0.1:8741` —el hub
        // de la colonia, que es otro proyecto— y dejaba un 404 en consola en cada
        // carga, apuntando a una dirección privada nuestra. Desde una página
        // https el navegador ni siquiera permite llamar a http://, así que en el
        // sitio publicado era ruido sin ninguna posibilidad de servir.
        //
        // Se arregló primero en el motor de tablero y aquí quedó pendiente: dos
        // copias del mismo andamio, y una se quedó atrás. La de siempre.
        const hubBase = window.ALISA_HUB_URL ?? null;

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

        /**
         * ⚠️ CON `?sala=` LA PARTIDA NO OCURRE AQUÍ: OCURRE EN EL ÁRBITRO.
         *
         * Es lo que convierte esta mesa de casino en una mesa para VARIAS
         * personas. Dos que abran la misma dirección —o una persona y el agente
         * de otra— se sientan a la misma partida, con turnos de verdad y el mismo
         * recibo `{juego, semilla, jugadas}` que verifica `/api/verificar`.
         *
         * El cliente del árbitro NO se escribe aquí: es el mismo `sala.js` que usa
         * la mesa de texto. Escribirlo otra vez habría sido volver a escribir el
         * rechazo de la mesa llena y el `?quien=` que hace que veas tu mano — dos
         * cosas que ya costaron caro una vez.
         *
         * Se entra MIRANDO. Quien abre un enlace compartido casi nunca es quien va
         * a jugar, y ya pasó: un espectador se llevó las negras de una partida y
         * la invitada se quedó de pie.
         */
        const sala = new URLSearchParams(location.search).get('sala');
        if (sala && proto && proto.soporta(this.gameId)) {
            try {
                const { crearSala, limpiar, nombreParaSala } =
                    await import('/arcade/js/protohub/sala.js');
                const params = new URLSearchParams(location.search);
                const salaLimpia = limpiar(sala, 40);
                const mesa = crearSala({
                    sala: salaLimpia,
                    // Sin `?yo=` se coge un nombre de invitado y SE RECUERDA: así
                    // un solo enlace sirve para todos y una recarga te devuelve a
                    // tu silla en vez de dejarte mirando desde fuera.
                    yo: nombreParaSala(salaLimpia, params.get('yo')),
                    juego: this.gameId,
                    semilla: Number(params.get('semilla')) || 1,
                });
                this.yoEnLaSala = mesa.yo;
                await mesa.entrar();
                this.sala = mesa;                   // el visualizador lo mira para saber si es espectador
                this.backend = {
                    tipo: 'sala',
                    state: async () => { await mesa.refrescar(); return mesa.estado(); },
                    move: async (a) => {
                        // ⚠️ `params.action` PRIMERO, y no es un detalle.
                        // `sendMove` envuelve la jugada en
                        // `{ action:'move', params:{ action: <jugada> } }`, así que
                        // leer `a.action` da la palabra «move» — y el árbitro
                        // recibiría esa cadena como jugada, la rechazaría, y el
                        // motivo apuntaría al juego en vez de a este desempaquetado.
                        const j = typeof a === 'string' ? a
                            : (a?.params?.action ?? a?.params?.uci ?? a?.params?.move
                               ?? a?.move ?? a?.uci ?? a);
                        await mesa.jugar(j);
                        return { ok: true };
                    },
                };
                console.log(`[Arcade] sala '${sala}' — '${this.gameId}' con árbitro compartido.`);
                return;
            } catch (e) {
                console.warn(`[Arcade] no se pudo entrar en la sala '${sala}':`, e);
            }
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

    /**
     * ═══ QUIÉN JUEGA POR ESTA MANO ═══════════════════════════════════════
     *
     * Extrapolado de `SovereignBoardEngine`, que recibió el mismo cambio el
     * 2026-08-06. Antes esto mandaba `ai_move` y punto: había UN rival posible,
     * la heurística del propio juego, sin nombre y sin forma de cambiarlo.
     *
     * Ahora lo resuelve `protohub/asientos.js`, el mismo módulo que usan la mesa
     * funcional y los seis tableros. Lo que se gana no es cosmético:
     *   · las políticas son las de la tabla de clasificación (`primera`, `azar`,
     *     `casa`), no un «ai_move» que nadie puede reproducir;
     *   · un modelo puede sentarse, y lo llama ESTE navegador — sin colonia;
     *   · y `?asientos=` significa lo mismo aquí que en todo lo demás.
     */
    async _asientos() {
        this._modAsientos ??= await import('./protohub/asientos.js');
        return this._modAsientos;
    }

    async processAutoAgent(data) {
        if (!this.autoMode || this.isGameOver) return;

        const stateObj = data.state || data;
        const acciones = (stateObj.legal_moves ?? stateObj.legal_actions ?? [])
            .filter(m => m !== 'nueva' && m !== 'reset');
        if (!acciones.length) return;

        const mod = await this._asientos();
        // En una mesa de cartas contra la casa sólo hay una silla que decida, así
        // que se lee `?asientos=` como una sola posición. Cuando estas páginas
        // pasen a ser configuración (ver `docs/croupier_por_composicion.md`) esto
        // leerá tantas como tenga el juego.
        const spec = new URLSearchParams(location.search).get('asientos')?.split(',')[0]
                   || 'fsm:casa';
        if (mod.esPersona(spec)) return;                 // le toca a una persona

        try {
            const proto = window.ALISA_PROTOHUB;
            const reglas = proto?.reglas?.get(this.gameId);
            const llm = {
                url: document.getElementById('llmUrlInput')?.value.trim(),
                modelo: document.getElementById('llmModelInput')?.value.trim(),
            };
            this._ctrl ??= {};
            const clave = `${spec}:${llm.url}:${llm.modelo}`;
            this._ctrl[clave] ??= mod.crearControlador(spec, { juego: this.gameId, reglas, llm });

            const jugada = await this._ctrl[clave].elegir({
                juego: stateObj.juego ?? this.gameId,
                st: stateObj, acciones, reglas,
                p: proto?.partidas?.get(this.gameId),
            });
            // Si no elige, se para y se dice. No se juega por nadie: en el banco
            // eso se cuenta como jugada «forzada» y se publica el porcentaje.
            if (!jugada) {
                console.warn(`[Arcade] «${this._ctrl[clave].etiqueta}» no eligió ninguna de las ${acciones.length} legales.`);
                this.toggleAutoMode();
                return;
            }
            const r = await this.backend.move({ action: 'move', params: { uci: jugada }, move: jugada });
            if (r && r.ok === false) { this.toggleAutoMode(); return; }
            this.pollHub();
        } catch(e) {
             console.error('[Arcade] el asiento no pudo jugar:', e.message);
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
    /**
     * ⚠️ UNA FIGURA SIN LÁMINA TIENE QUE PODER LEERSE IGUAL.
     *
     * `_drawCourtCard` dibuja la silueta entera con `globalAlpha` entre 0,08 y
     * 0,2: es un fantasma pensado para ir DEBAJO de una lámina, no para sustituirla.
     * Y sólo hay láminas de la baraja inglesa (`H_J`, `S_Q`…), así que la sota, el
     * caballo y el rey españoles salían en blanco.
     *
     * En la mesa eso no se veía como un fallo de dibujo, se veía como una carta en
     * blanco — y una carta que no se puede leer es una carta que no se puede jugar.
     * Toca a entropy, la brisca y el tute por igual.
     *
     * Encima de la silueta va lo que de verdad identifica la carta: la letra, y el
     * palo debajo por si el color no basta.
     */
    _drawFiguraLegible(ctx, rank, suitId, color, W, H) {
        const NOMBRE = { S: 'SOTA', C: 'CABALLO', R: 'REY', J: 'JACK', Q: 'QUEEN', K: 'KING' };
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.font = 'bold 132px Georgia';
        ctx.fillText(rank, W / 2, H / 2 - 24);
        this._drawSuit(ctx, suitId, W / 2, H / 2 + 68, 30);
        if (NOMBRE[rank]) {
            ctx.font = 'bold 20px Georgia';
            ctx.globalAlpha = 0.65;
            ctx.fillText(NOMBRE[rank], W / 2, H / 2 + 118);
        }
        ctx.restore();
    }

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

    /**
     * Una carta cuya cara es su valor. El número grande y centrado, y repetido
     * pequeño en las dos esquinas como en cualquier baraja: así se lee también
     * cuando la de delante la tapa a medias.
     *
     * El color va por tramos —bajo es bueno en los juegos de minimizar— para que
     * la caja se lea de un vistazo sin sumar: verde lo que quieres, rojo lo que
     * no. Un comodín o cualquier cosa que no sea un número se dibuja tal cual, sin
     * inventarse un valor que no tiene.
     */
    _drawCartaNumero(ctx, W, H, spec) {
        /**
         * `spec` es `texto|colorDelPalo|símboloDelPalo`, y las dos últimas
         * sobran. Ejemplos: `12|E6A817|◆`, `7`, `🃏`.
         *
         * ⚠️ DOS COLORES EN UNA CARTA SERÍAN DOS COLORES QUE NO SIGNIFICAN LO
         * MISMO, así que cada uno tiene su sitio y no se mezclan:
         *
         *   · el NÚMERO va en color por TRAMO (verde bajo → rojo alto). Aquí gana
         *     quien menos suma, así que ese color es información: dice si la carta
         *     es buena antes de leerla. Y hace que dos doces se parezcan, que es
         *     justo lo que hay que detectar para anular una columna.
         *
         *   · el PALO va en su pinta pequeña, arriba y abajo. No decide nada en
         *     las reglas: está para que ocho cartas del mismo número no sean un
         *     muro idéntico. Si el palo tiñera el número, dos doces se verían
         *     distintos — que es lo contrario de lo que hace falta.
         *
         * El símbolo acompaña siempre al color del palo: dos palos que sólo se
         * distinguieran por el color serían el mismo para quien no distinga esos
         * dos colores.
         */
        const [texto, colorPalo, simboloPalo, mandaPalo] = String(spec).split('|');
        const n = Number(texto);
        const esNumero = Number.isFinite(n);
        /**
         * ⚠️ Y HAY JUEGOS DONDE EL COLOR NO ES UN TRAMO: ES LA CARTA.
         *
         * Todo lo de arriba vale para entropy, donde gana quien menos suma. En UNIT
         * el color decide qué puedes jugar, así que teñir por tramos pintaría un dos
         * rojo de verde y haría que dos cartas del mismo color se vieran distintas.
         * Lo dice el juego con `cara: 'color'`, que llega hasta aquí como esta
         * bandera — no se adivina de que haya `palos`, que los tienen los dos.
         */
        const tiñePalo = mandaPalo === 'palo' && colorPalo;
        const color = tiñePalo ? (colorPalo.startsWith('#') ? colorPalo : `#${colorPalo}`)
            : !esNumero ? '#6A1B9A'
            : n <= 3 ? '#1B7F3B'
            : n <= 6 ? '#2E6DA4'
            : n <= 9 ? '#B26A00'
            : '#C62828';

        ctx.fillStyle = '#FAFAFA';
        ctx.beginPath(); ctx.roundRect(0, 0, W, H, 12); ctx.fill();
        ctx.strokeStyle = '#D0D0D0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(2, 2, W - 4, H - 4, 10); ctx.stroke();

        // Una banda del color arriba y abajo: identifica el tramo aunque la carta
        // esté girada o medio tapada por la de al lado.
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.14;
        ctx.fillRect(8, 8, W - 16, 26);
        ctx.fillRect(8, H - 34, W - 16, 26);
        ctx.globalAlpha = 1;

        /**
         * ⚠️ LO QUE NO ES UN NÚMERO VA SOBRE FONDO, Y NO POR ADORNO.
         *
         * Un emoji es multicolor y CLARO. Sobre blanco, y visto desde la cámara de
         * la mesa, competía fatal con una cifra negra: la carta del comodín se
         * leía como una carta en blanco aunque el lienzo estuviera perfecto. Es el
         * tercer «se ve blanco» de esta mesa por tres causas distintas —sin lámina,
         * sin glifo, y ahora sin contraste— y las tres se veían igual.
         *
         * Con el fondo teñido se reconoce que es una carta especial antes incluso
         * de distinguir qué emoji es, que es justo lo que hace falta de un vistazo.
         */
        if (!esNumero) {
            // Sólido, no teñido: a 0,20 quedaba un lavanda que sobre el fieltro
            // verde y a la distancia de la cámara no se distinguía del blanco.
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.roundRect(16, 44, W - 32, H - 88, 14); ctx.fill();
        }

        /**
         * ⚠️ GEORGIA NO TIENE EMOJIS, Y UN COMODÍN SALÍA EN BLANCO.
         *
         * El canvas no avisa cuando le falta un glifo: dibuja nada y sigue. La
         * carta se veía perfecta, blanca y vacía — que es lo mismo que le pasaba a
         * la sota española por no tener lámina, sólo que por otra causa. Un tipo de
         * carta nuevo que no se ve no da error en ninguna parte.
         *
         * La pila cubre Windows, Android/Linux y Apple; el `sans-serif` del final
         * es para que algo salga siempre.
         */
        const TIPO = esNumero
            ? 'Georgia'
            : '"Segoe UI Emoji","Noto Color Emoji","Apple Color Emoji",sans-serif';

        /**
         * ⚠️ Y EL GLIFO NO PUEDE IR DEL MISMO COLOR QUE SU PROPIO FONDO.
         *
         * Esto pintaba el panel con `color` y encima el símbolo TAMBIÉN con
         * `color`. Con el comodín 🃏 no se notó nunca porque un emoji es un mapa de
         * bits multicolor e ignora el relleno — así que la trampa quedó armada y
         * esperando. UNIT trajo `⊘` y `⇄`, que son glifos monocromos: verde sobre
         * verde, la cuarta forma distinta de «se ve en blanco» de esta mesa.
         *
         * El medidor de tinta tampoco lo pillaba: contaba el panel y daba 68 %, o
         * sea «carta bien pintada». Un número alto no prueba que se lea.
         *
         * En las esquinas sigue mandando `color`: ahí no hay panel, es papel blanco.
         */
        ctx.fillStyle = esNumero ? color : '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // ⚠️ Y MÁS GRANDE QUE UN NÚMERO, no igual: a la misma altura de fuente el
        // glifo de un emoji ocupa la mitad que una cifra, así que a 120px la carta
        // parecía vacía desde la cámara aunque el canvas estuviera bien. Se
        // comprobó pintando el lienzo en pantalla, que es la única forma de
        // distinguir «no se dibuja» de «se dibuja y no se ve».
        ctx.font = `bold ${esNumero ? 150 : 215}px ${TIPO}`;
        ctx.fillText(texto, W / 2, H / 2);

        ctx.fillStyle = color;
        ctx.font = `bold ${esNumero ? 34 : 40}px ${TIPO}`;
        ctx.fillText(texto, 34, 32);
        ctx.save();
        ctx.translate(W - 34, H - 32);
        ctx.rotate(Math.PI);
        ctx.fillText(texto, 0, 0);
        ctx.restore();

        // La pinta del palo, en la esquina contraria a la cifra. Pequeña y en su
        // propio color: identifica la carta sin competir con el número.
        if (colorPalo && simboloPalo) {
            ctx.fillStyle = colorPalo.startsWith('#') ? colorPalo : `#${colorPalo}`;
            ctx.font = '38px "Segoe UI Symbol","Noto Sans Symbols2",sans-serif';
            ctx.fillText(simboloPalo, W - 34, 34);
            ctx.fillText(simboloPalo, 34, H - 34);
        }
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

        /**
         * --- CARTA DE NÚMERO ---
         *
         * ⚠️ HAY JUEGOS DONDE EL PALO NO PINTA NADA, Y ENSEÑARLO ESTORBA.
         *
         * Entropy se reparte con la española de 48 porque da doce valores
         * limpios, pero ninguna regla mira el palo: se suma el valor y se anulan
         * dos iguales en la misma columna. Enseñar oros y copas obligaba a
         * traducir «R» a 12 de cabeza para jugar — y encima la sota, el caballo y
         * el rey salían casi en blanco por no haber lámina española.
         *
         * `num_12` dibuja un 12 y punto. No es un tipo de carta nuevo: es otra
         * cara para la misma carta, igual que el dorso. El juego lo pide
         * declarándolo (`cara: 'valor'`), así que la brisca y el tute —donde el
         * palo ES el juego— no se ven afectados.
         */
        if (cardId.startsWith('num_')) {
            this._drawCartaNumero(ctx, W, H, cardId.slice(4));
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

        /**
         * --- ÍNDICES DE ESQUINA ---
         *
         * ⚠️ ESTABAN CALIBRADOS PARA UNA CARTA QUE SE TIENE EN LA MANO, Y ÉSTAS
         * ESTÁN SOBRE UNA MESA.
         *
         * Un 32px sobre una textura de 256 se ve perfecto si la miras a tamaño
         * completo. En la mesa la carta ocupa unos 50 píxeles de ancho, así que ese
         * índice acaba midiendo seis: una manchita. Se midió contando tinta sobre la
         * propia textura, y salió que las cartas de número llevaban 1,0–1,8 % frente
         * al 7,1 % de `num_12`, que sí se lee, y al 14–31 % de las figuras.
         *
         * Y no era cosa de la baraja española: `S_2` daba 1,73 %. O sea que TODAS
         * las cartas bajas del arcade llevaban desde siempre casi en blanco, y no se
         * notó porque el único juego que se miraba —entropy— usa la cara `num_`, y
         * poker y blackjack tienen visualizador propio. Una carta ilegible sigue
         * siendo una carta válida: no da error, sólo hace el juego injugable.
         *
         * Los tamaños de aquí abajo no son gusto, son el mínimo que pasa el suelo de
         * `_tintaDeCara()`. Si alguien los baja, la prueba lo dice.
         */
        ctx.fillStyle = color;
        // Arriba a la izquierda
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 58px Georgia';
        ctx.fillText(rank, 44, 48);
        this._drawSuit(ctx, suitId, 44, 100, 20);
        // Abajo a la derecha, girada 180°
        ctx.save();
        ctx.translate(W - 44, H - 48);
        ctx.rotate(Math.PI);
        ctx.fillStyle = color;
        ctx.font = 'bold 58px Georgia';
        ctx.fillText(rank, 0, 0);
        this._drawSuit(ctx, suitId, 0, 52, 20);
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
                this._drawFiguraLegible(ctx, rank, suitId, color, W, H);
            }
            return canvas;
        }

        /**
         * --- CARTAS DE NÚMERO ---
         *
         * ⚠️ AQUÍ HABÍA UNA REJILLA DE PINTAS, Y ES LA DE UNA CARTA QUE SE SOSTIENE
         * EN LA MANO.
         *
         * Estas cartas están TUMBADAS sobre una mesa y se ven en escorzo desde unos
         * treinta y siete grados. En esa postura la mitad de arriba se comprime y
         * las esquinas son el peor sitio posible para lo único que hay que leer.
         * Agrandar los índices ayudó y no bastó: se veían dos pintas y un número
         * que había que adivinar.
         *
         * Y la solución ya estaba escrita. `_drawCartaNumero` —la cara que se hizo
         * para entropy— pone el valor enorme en el centro, mide 7,1 % de tinta y se
         * lee de un vistazo. Aquí se hace lo mismo conservando el palo, que en la
         * brisca y el tute ES el juego: número grande en medio y la pinta debajo,
         * dibujada con el mismo `_drawSuit` de siempre.
         *
         * Se pierde la rejilla tradicional. Es una pérdida real y se acepta a
         * sabiendas: una carta bonita que no se puede leer no es una carta bonita.
         */
        const pipPositions = this._getPipPositions(rank);
        if (pipPositions) {
            // Los oros son #E6A817, que sobre papel blanco casi no se ve. Para las
            // formas rellenas va bien; para un glifo hace falta contraste.
            const tinta = color === '#E6A817' ? '#A9750B' : color;

            ctx.fillStyle = tinta;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = 'bold 168px Georgia';
            ctx.fillText(rank, W / 2, H * 0.44);

            this._drawSuit(ctx, suitId, W / 2, H * 0.76, 44);
        }

        return canvas;
    }

    /**
     * ⚠️ CUÁNTA TINTA LLEVA UNA CARA. EL ÚNICO MODO DE VER «CASI EN BLANCO».
     *
     * Este proyecto lleva media docena de cartas invisibles: los comodines sin
     * glifo, las figuras españolas sin lámina, y ahora todas las de número. Ninguna
     * dio nunca un error, porque una textura en blanco es una textura válida — y
     * mirar una captura no basta: el ojo perdona un 1,8 % que en la mesa no se lee.
     *
     * Así que se cuenta. Devuelve el porcentaje de píxeles que no son el papel ni
     * su borde. `laboratorio_caras.html` lo recorre entero contra `SUELO_TINTA`.
     */
    _tintaDeCara(cardId) {
        const c = this.getCardCanvas(cardId);
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 160) n++;
        }
        return (100 * n) / (c.width * c.height);
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
    /**
     * ¿Está ya esta carta donde la queremos poner? Con margen, porque una animación
     * anterior deja decimales largos y nunca cae en el número exacto.
     *
     * Medio milímetro de mesa y medio grado: por debajo de eso nadie ve nada, y
     * animarlo es gastar por gastar.
     */
    _yaEstaEn(mesh, x, y, z, rx, ry, rz) {
        const P = 0.0005, R = 0.008;
        return Math.abs(mesh.position.x - x) < P
            && Math.abs(mesh.position.y - y) < P
            && Math.abs(mesh.position.z - z) < P
            && Math.abs(mesh.rotation.x - rx) < R
            && Math.abs(mesh.rotation.y - ry) < R
            && Math.abs(mesh.rotation.z - rz) < R;
    }

    drawZone(cardList, zoneName, startX, startZ, options = {}) {
        const yaEstaEn = this._yaEstaEn.bind(this);
        if (!cardList) return;
        
        const layout = options.layout || (options === true ? 'line' : 'line');
        const faceDown = typeof options === 'object' ? (options.faceDown || false) : false;
        const spacing = options.spacing || 1.35;

        cardList.forEach((card, idx) => {
            const baseId = typeof card === 'string' ? card : (card.id || card.rank+card.suit || `c_${idx}`);
            const visualId = baseId; // Always forge the true card. Physical rotation will hide it.

            // ⚠️ UNA CARTA PUEDE IR TAPADA POR SÍ MISMA, no sólo la zona entera.
            //
            // `faceDown` es de la llamada, así que una mano con dos cartas vistas y
            // seis tapadas —lo normal en entropy, y en cualquier juego con robo—
            // obligaba a DOS llamadas. Y dos llamadas es lo que rompía el dibujo:
            // cada una calculaba su abanico como si fuera la mano completa, con su
            // propio centro, y las dos mitades se montaban una encima de otra.
            //
            // Con `{ id, oculta: true }` la zona se dibuja de una vez y el reparto
            // —centro, ángulos, solape— se calcula sobre el total, que es la única
            // forma de que salga bien. Sin `oculta` manda `faceDown` como siempre,
            // así que el póker y los demás visualizadores no se enteran.
            const oculta = (card && typeof card === 'object' && card.oculta !== undefined)
                ? !!card.oculta : faceDown;
            /**
             * ⚠️ EN UNA REJILLA, LA CARTA SE IDENTIFICA POR SU HUECO — NO POR SU CARA.
             *
             * Esto era siempre `${zona}_${cara}_${idx}`. En un abanico está bien:
             * las cartas se mueven y conviene seguir a cada una. En una rejilla es
             * al revés — el hueco 3 es el hueco 3 pase lo que pase, y lo que
             * cambia es qué carta lo ocupa.
             *
             * Con la cara dentro del identificador, cambiar la carta del hueco 3
             * hacía que la malla vieja se destruyera y naciera otra: en vez de ver
             * un cambio, veías una carta salir volando desde el origen. Ése era el
             * «movimiento confuso» — no era la animación, era que la carta no era
             * la misma para el motor.
             *
             * Por hueco, la malla PERSISTE y sólo cambia su material, así que la
             * transición es la que ya existe para dar la vuelta a una carta.
             */
            const trackId = layout === 'grid'
                ? `${zoneName}_${idx}`
                : `${zoneName}_${baseId}_${idx}`;
            
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
            // ⚠️ De dónde salió esta carta, anotado AQUÍ, que es el único sitio
            // donde se sabe. El identificador de pista (`zona_cara_idx`) no se
            // puede volver a partir: la cara puede llevar guiones bajos dentro
            // —`num_7|E6A817|◆`— y cualquier expresión regular se equivoca de
            // corte. Un dato que se puede guardar no se deduce.
            mesh.userData.zona = zoneName;
            mesh.userData.indice = idx;

            /**
             * ⚠️ EL TEMBLOR SE SORTEA UNA VEZ POR CARTA, NO EN CADA DIBUJO.
             *
             * Los montones llevan un desvío mínimo al azar para que no parezcan
             * apilados con escuadra. Estaba con `Math.random()` aquí dentro — y esto
             * corre en CADA sondeo de estado, o sea una vez por segundo. Así que el
             * destino de cada carta cambiaba un poco cada segundo y las cartas no se
             * asentaban NUNCA: perseguían un sitio nuevo constantemente.
             *
             * Medido con nadie jugando, sólo mirando la mesa quieta:
             *
             *     entropy   196 animaciones nuevas por segundo
             *     remigio   104
             *     brisca     80
             *
             * Eso es la batería de un móvil ardiendo para que nada cambie. Y no daba
             * error, claro: hacía justo lo que decía el código.
             *
             * Sorteado una vez y guardado en la carta, el temblor sigue siendo
             * aleatorio —que es su gracia— y además ya no se mueve.
             */
            if (!mesh.userData.temblor) {
                mesh.userData.temblor = {
                    a: Math.random() - 0.5, b: Math.random() - 0.5,
                    c: Math.random() - 0.5, d: Math.random(),
                };
            }
            const tmb = mesh.userData.temblor;

            let targetX = startX;
            let targetY = (this.tableY !== undefined ? this.tableY : 0.1);
            let targetZ = startZ;
            let targetRotX = oculta ? Math.PI/2 : -Math.PI / 2;
            let targetRotY = 0;
            let targetRotZ = 0;

            const n = cardList.length;

            if (options.rotationZBase !== undefined) targetRotZ = options.rotationZBase;

            if (layout === 'line') {
                targetX = startX + idx * spacing;
                const jForce = typeof options.jitter === "number" ? options.jitter : 1;
                if(options.jitter !== false) targetRotZ += tmb.a * 0.03 * jForce; targetX += tmb.b * 0.005 * jForce;
            } 
            else if (layout === 'pile') {
                targetY = (this.tableY !== undefined ? this.tableY : 0.1) + (idx * 0.002); // Tighter stack mapping physically
                const jForce = typeof options.jitter === "number" ? options.jitter : 1;
                if(options.jitter !== false) targetRotZ += tmb.a * 0.08 * jForce; targetX += tmb.b * 0.01 * jForce; targetZ += tmb.c * 0.01 * jForce; 
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
                if(options.jitter !== false) targetRotZ += tmb.a * 0.01 * jForce; targetX += tmb.b * 0.005 * jForce;
            }
            else if (layout === 'grid') {
                const cols = options.columns || 3;
                const sz = options.spacingZ || spacing;
                const r = Math.floor(idx / cols);
                const c = idx % cols;
                targetX = startX + c * spacing;
                targetZ = startZ + r * sz;
                targetY = (this.tableY !== undefined ? this.tableY : 0.1) + tmb.d * 0.001; // Z-fighting prevention
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

            /**
             * ⚠️ CON LA PESTAÑA OCULTA NO SE ANIMA: SE COLOCA Y YA.
             *
             * Chrome congela `requestAnimationFrame` en pestañas que no se ven, y
             * el bucle de este motor es quien llama a `TWEEN.update`. O sea que
             * mientras miras otra pestaña nadie avanza las animaciones — pero el
             * sondeo sigue cada segundo creando dos por carta. Medido en una mesa
             * de 96 cartas: 13.632 animaciones pendientes en un minuto, y las
             * cartas congeladas a un tercio de camino de su sitio.
             *
             * Al volver, todas se resuelven de golpe. El jugador que se va a otra
             * pestaña y regresa es el caso NORMAL en una partida por turnos contra
             * un agente, así que esto no es un caso raro: es el caso.
             *
             * Sin animación el estado final es idéntico — que es justo lo que hace
             * que la mesa se pueda comprobar con una captura.
             */
            if (typeof TWEEN !== 'undefined' && !document.hidden) {
                const animDelay = options.sequenceDelay ? (idx * options.sequenceDelay) : 0;
                
                // Spin Throw logic
                if (mesh.userData.spawnedThisFrame) {
                    mesh.userData.spawnedThisFrame = false;

                    /**
                     * ⚠️ EN UNA REJILLA NO SE REPARTE DANDO TUMBOS.
                     *
                     * La carta nacía con una rotación aleatoria en los tres ejes y
                     * viajaba girando hasta su sitio. Repartiendo una mano de
                     * póker eso es precisamente la gracia; sobre una rejilla es
                     * ruido, porque ahí la POSICIÓN es la información y una carta
                     * dando volteretas no dice a qué hueco va hasta que para.
                     *
                     * Aquí baja recta desde arriba, ya orientada. Se sigue viendo
                     * que es nueva —cae— sin tener que adivinar dónde aterriza.
                     */
                    if (layout === 'grid') {
                        mesh.position.set(targetX, targetY + 2.5, targetZ);
                        mesh.rotation.set(targetRotX, targetRotY, targetRotZ);
                        new TWEEN.Tween(mesh.position)
                            .to({ x: targetX, y: targetY, z: targetZ }, 320)
                            .delay(animDelay).easing(TWEEN.Easing.Quadratic.Out).start();
                    } else {
                        // Start spinning wildly from origin
                        mesh.rotation.set(
                            (Math.random()-0.5)*Math.PI,
                            (Math.random()-0.5)*Math.PI,
                            (Math.random()-0.5)*Math.PI
                        );
                        new TWEEN.Tween(mesh.position).to({ x: targetX, y: targetY, z: targetZ }, 600).delay(animDelay).easing(TWEEN.Easing.Quadratic.Out).start();
                        new TWEEN.Tween(mesh.rotation).to({ x: targetRotX, y: targetRotY, z: targetRotZ }, 600).delay(animDelay).easing(TWEEN.Easing.Quadratic.Out).start();
                    }
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
                else if (yaEstaEn(mesh, targetX, targetY, targetZ, targetRotX, targetRotY, targetRotZ)) {
                    /**
                     * ⚠️ UNA CARTA QUE YA ESTÁ EN SU SITIO NO SE ANIMA HACIA SU SITIO.
                     *
                     * Esto creaba dos animaciones por carta en CADA sondeo de estado
                     * —una vez por segundo— aunque no se hubiera movido nada. Con el
                     * temblor ya estable (ver arriba), la inmensa mayoría de las
                     * cartas de una mesa quieta están exactamente donde tienen que
                     * estar, y animarlas es trabajo puro para que no pase nada.
                     *
                     * La comparación es contra una tolerancia y no contra la
                     * igualdad: una animación anterior deja valores con decimales
                     * largos y nunca aterriza en el número redondo.
                     */
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
                    <button class="collapse-btn" id="hudPlegar"
                            aria-label="plegar el panel" aria-expanded="true">▾</button>
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

        /**
         * ⚠️ EL PANEL SE PLIEGA. ESTABA A MEDIO HACER Y NADIE LO SABÍA.
         *
         * `mesa3d.css` tiene desde siempre la regla `.collapsed #hud-content` con
         * su transición, y esta cabecera ya llevaba `id="dockBtnToggle"` — un
         * nombre que sólo tiene sentido si algo lo pulsa. No había botón ni había
         * quien lo escuchara: la mitad visual hecha y la mitad viva sin escribir.
         *
         * En un móvil deja de ser un adorno: el panel tapa media mesa, y jugar
         * consiste en mirar la mesa. Por eso ahí empieza plegado.
         *
         * La preferencia se recuerda. Un panel que se despliega solo en cada
         * jugada —el sondeo repinta cada segundo— sería peor que no plegarlo.
         */
        const panel = document.getElementById('main-hud');
        const boton = document.getElementById('hudPlegar');
        const CLAVE = 'alisa:hud-plegado';

        const aplicar = (plegado) => {
            panel.classList.toggle('collapsed', plegado);
            boton.textContent = plegado ? '▸' : '▾';
            boton.setAttribute('aria-expanded', String(!plegado));
            boton.setAttribute('aria-label', plegado ? 'desplegar el panel' : 'plegar el panel');
        };

        const guardado = localStorage.getItem(CLAVE);
        aplicar(guardado === null ? this.esPantallaEstrecha() : guardado === '1');

        document.getElementById('dockBtnToggle').addEventListener('click', () => {
            const plegado = !panel.classList.contains('collapsed');
            aplicar(plegado);
            localStorage.setItem(CLAVE, plegado ? '1' : '0');
        });
    }

    /**
     * Un móvil en vertical, o una ventana muy estrecha. Se pregunta en varios
     * sitios —la mesa, el encuadre, el panel— y hace falta que todos digan lo
     * mismo, así que vive aquí y no en tres constantes que se separarían.
     */
    esPantallaEstrecha() {
        /**
         * ⚠️ CERO NO ES ESTRECHO: ES «NO LO SÉ».
         *
         * Esto era `innerWidth < 820` a secas, y `innerWidth` vale 0 en una
         * pestaña que todavía no se ha compuesto. Cero es menor que 820, así que
         * un monitor de 27 pulgadas se llevaba la vista de teléfono — la mesa sin
         * bordes y la cámara cenital— y sólo se veía al abrir la página en según
         * qué momento. Un fallo que depende de cuándo mires es de los que se
         * cierran como «no lo reproduzco».
         *
         * Sin una medida fiable se responde lo de siempre, que es lo que había
         * antes de que existiera esta función: la mesa de escritorio.
         */
        const ancho = window.innerWidth || document.documentElement?.clientWidth || 0;
        return ancho > 0 && ancho < 820;
    }

    updateHUD(data) {
        const stateObj = data.state || data;
        const movesEl = document.getElementById('ui-moves');
        if (movesEl) {
             /**
              * ⚠️ `legal_moves` PRIMERO. Esta línea leía sólo `legal_actions`.
              *
              * Los dos campos son el mismo dato con dos nombres —veintiún juegos
              * publican ambos con idéntico valor— y el canónico es `legal_moves`:
              * lo publican los treinta, y `legal_actions` sólo veintiuno.
              *
              * Que esto leyera el alias y no el canónico convertía un duplicado
              * inofensivo en una dependencia real: al quitar el campo sobrante, el
              * panel de jugadas de TODA mesa de cartas habría empezado a decir
              * «None» sin dar un error.
              *
              * Y lo peor: `desajustes.mjs` —la herramienta que existe justo para
              * cazar esto— afirmaba que `legal_actions` no lo leía nadie, porque su
              * lista de consumidores era a mano y no incluía este fichero. La
              * encontró Fable 5 revisándolo de fuera.
              */
             const mStr = (stateObj.legal_moves ?? stateObj.legal_actions ?? []).join(", ");
             movesEl.innerText = mStr.length > 0 ? (mStr.length > 50 ? mStr.substring(0, 46) + "..." : mStr) : "None";
        }
    }

    /**
     * ⚠️ AQUÍ HABÍA UN `flip(zona, indice)` VACÍO, Y CONTABA UNA HISTORIA.
     *
     * Su cuerpo entero eran tres comentarios y un `if` sin nada dentro. Empezaba
     * así:
     *
     *     const trackId = zoneName + '_' + cardIndex;
     *
     * …que es EXACTAMENTE el identificador que las mallas de una rejilla usan
     * desde hoy. Quien lo escribió dio por hecho que una carta se identifica por
     * su hueco, se encontró con que el identificador llevaba dentro la cara —así
     * que cambiar una carta destruía la malla en vez de darle la vuelta—, y lo
     * dejó a medias con un «es más fácil manejarlo en el visualizador».
     *
     * Nadie lo llamaba. Y ya no hace falta: con el identificador por hueco, la
     * malla persiste y `drawZone` dispara solo su transición de volteo cuando la
     * carta cambia de cara. La animación que este método iba a hacer a mano la
     * hace ahora el camino normal.
     *
     * Se quita en vez de dejarlo: un método público vacío promete algo que no
     * cumple, y el siguiente que lo lea perderá el mismo rato.
     */
}
