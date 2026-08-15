/**
 * SovereignBoardEngine.js
 * Universal Controller for ALISA Arcade Grid Games.
 * Abstracts Network Telemetry, UI State (Dual Player Driver, Blitz), and Three.js Loop.
 */
class SovereignBoardEngine {
    constructor(config) {
        this.gameId = config.gameId;
        this.hubUrl = `/arcade/${this.gameId}/state`;
        this.moveUrl = `/arcade/${this.gameId}/move`;

        // Hooks
        this.onInit3D = config.onInit3D || function(scene, camera, renderer) {};
        this.onStateSync = config.onStateSync || function(data) {};
        this.onFrame = config.onFrame || function(time) {};
        this.onResize = config.onResize || function() {};
        
        // Agent UI State
        this.autoMode = false;
        // ⚠️ LOS ASIENTOS SE INICIALIZAN AQUÍ, NO EN EL HUD, Y HAY MOTIVO.
        // No todas las páginas montan el panel de agente: `checkers.html`, por
        // ejemplo, no lo monta. Cuando los valores vivían en el desplegable, esas
        // páginas se quedaban con el `'engine'` de fábrica —una palabra que ya no
        // significa nada— y hasta lo escribían en la dirección. El vocabulario es
        // el de `protohub/asientos.js`, tenga panel la página o no.
        const _a = String(new URLSearchParams(location.search).get('asientos') ?? '')
            .split(',').map(s => s.trim());
        this.whitePlayer = _a[0] || 'persona';
        this.blackPlayer = _a[1] || 'fsm:casa';
        this.currentLegalMoves = [];
        this.isGameOver = false;
        this.gamesPlayed = 0;

        /**
         * ⚠️ EL MOTOR, ACCESIBLE. COMO YA LO ESTABAN LOS OTROS DOS.
         *
         * La mesa de cartas publica `window.ALISA_MESA` y la de tableros
         * `window.ALISA_PINTOR`. Los once juegos con visualizador propio no
         * publicaban nada, y eso no es un detalle de comodidad: sin esto no hay
         * forma de comprobar desde fuera qué está dibujado ni dónde, así que las
         * pruebas acaban tocando la pantalla a ciegas con una rejilla y creyéndose
         * el resultado. Hoy me ha dado tres medidas falsas seguidas por eso.
         */
        if (typeof window !== 'undefined') window.ALISA_MOTOR = this;

        /**
         * ⚠️ DESLIZAR PARA MOVERSE, PARA TODO EL QUE CUELGUE DE ESTE MOTOR.
         *
         * Snake, fagocito y peatón se juegan con cuatro palabras —`arriba`,
         * `abajo`, `izquierda`, `derecha`— y NO TENÍAN NINGÚN MANEJADOR DE ENTRADA:
         * sólo el panel, también en escritorio. Sus visualizadores son tres ficheros
         * distintos, así que el gesto va aquí y no en cada uno: tres copias de la
         * misma cuenta es como se consigue que dos se arreglen y una no.
         *
         * No molesta a nadie más. El gesto sólo manda si la dirección está en
         * `currentLegalMoves`, y ajedrez, damas, go o xiangqi no tienen esas
         * palabras en su lista: ahí el deslizamiento sigue siendo girar la cámara,
         * exactamente como antes.
         *
         * Se engancha tarde a propósito: el lienzo no existe hasta que el motor
         * arranca. Y sin `ALISA_GESTOS` no pasa nada — la página se queda como
         * estaba en vez de reventar por un fichero que no llegó.
         */
        if (typeof window !== 'undefined' && window.ALISA_GESTOS) {
            const enganchar = () => {
                if (!this.renderer?.domElement || !this.camera) return false;
                window.ALISA_GESTOS.deslizarParaMoverse({
                    lienzo: this.renderer.domElement,
                    camara: this.camera,
                    legales: () => this.currentLegalMoves ?? [],
                    enviar: (m) => this.sendMove(m),
                });
                return true;
            };
            // Se intenta un puñado de veces mientras el motor termina de montarse.
            let intentos = 0;
            const reloj = setInterval(() => {
                if (enganchar() || ++intentos > 40) clearInterval(reloj);
            }, 100);
        }
        
        // Blitz Clock State
        this.blitzMode = false;
        this.blitzInterval = null;
        this.clockWhite = 300;
        this.clockBlack = 300;
        this.currentTurn = 'white';

        // Three.js Core
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Bind methods for listeners
        this.pollHub = this.pollHub.bind(this);
        this.animate = this.animate.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
    }

    start() {
        this.init3D();
        this.bindUI();
        // Primero se decide el backend (hub o local) y SOLO después se sondea.
        // Si no, el primer poll salía sin backend y pintaba "DISCONNECTED".
        this._iniciarBackend().then(() => {
            this.pollHub();
            setInterval(this.pollHub, 1000);
            // Si alguna silla no es de una persona, el automático se enciende
            // solo. Va AQUÍ y no en el panel porque hay páginas que no montan
            // panel —`checkers.html`— y allí la mesa se quedaba quieta esperando
            // un botón que no existe: parecía rota estando bien.
            this._arrancarSiHayAgentes();
            this._montarRepetidor();
        });
        
        // Sovereign Gym Auto-Boot
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('autorun') === '1') {
            const p1 = urlParams.get('p1');
            const p2 = urlParams.get('p2');
            if (p1 && document.getElementById('whitePlayerSelect')) document.getElementById('whitePlayerSelect').value = p1;
            if (p2 && document.getElementById('blackPlayerSelect')) document.getElementById('blackPlayerSelect').value = p2;
            
            // Sync internal state with DOM
            const e = document.createEvent('HTMLEvents');
            e.initEvent('change', false, true);
            if (p1 && document.getElementById('whitePlayerSelect')) document.getElementById('whitePlayerSelect').dispatchEvent(e);
            if (p2 && document.getElementById('blackPlayerSelect')) document.getElementById('blackPlayerSelect').dispatchEvent(e);

            console.log(`[ML GYM] Autorun Triggered. P1: ${p1}, P2: ${p2}`);
            setTimeout(() => {
                if (!this.autoMode) this.toggleAutoMode();
            }, 500); // slight delay to ensure first state arrives
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // THREE.JS CORE
    // ═══════════════════════════════════════════════════════════════════
    init3D() {
        const container = document.getElementById('canvas-container');
        if (!container) return;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x05050A, 0.025);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.appendChild(this.renderer.domElement);

        /**
         * ⚠️ EL MOTOR, ALCANZABLE DESDE FUERA. NO ES PARA JUGAR: ES PARA MIRAR.
         *
         * `legibilidad.mjs` pregunta si lo que el sustrato declara se VE: si cae en
         * pantalla, si la casilla es lo bastante grande, si el material se distingue
         * del terreno. Para eso le hace falta la cámara y la escena.
         *
         * La mesa genérica las publica (`ALISA_CAMARA`, `ALISA_PINTOR`) y por eso se
         * la puede medir. Los QUINCE visualizadores propios —snake, ajedrez, mancala,
         * el go…— no publicaban nada, así que quedaban fuera: cuarenta de las setenta
         * medidas sin cubrir, o sea media arcade sin red debajo.
         *
         * Y los quince salen de estos DOS motores. Una línea aquí y otra en el de
         * cartas los cubre a todos — frente a tocar quince ficheros y que el
         * dieciséis nazca sin ella, que es el fallo que este proyecto lleva
         * arreglado seis veces.
         */
        window.ALISA_MOTOR = this;

        window.addEventListener('resize', this.onWindowResize);

        // Run specific game init
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
        
        this.onFrame(time);

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // BACKEND: hub de la colonia si está, ProtoHub local si no
    // ═══════════════════════════════════════════════════════════════════
    /**
     * Elige con quién hablar. UNA sola vez.
     *
     * Antes esto no existía: `pollHub()` hacía fetch al hub cada segundo para
     * siempre. Para cualquiera que no fuéramos nosotros, eso significaba abrir
     * el ajedrez y ver un tablero 3D precioso y VACÍO, con "DISCONNECTED" en
     * rojo y decenas de errores por segundo en la consola apuntando a una IP
     * privada nuestra.
     *
     * Ahora se sondea el hub una vez; si no está, se juega en local con las
     * mismas reglas y el mismo contrato. Conectarse a ALISA pasa a ser una
     * mejora (partidas compartidas, ledger, $NEURO), no un requisito.
     */
    async _iniciarBackend() {
        // Los módulos ES se cargan diferidos, así que puede que el ProtoHub aún
        // no esté cuando arranca este script clásico. Se espera un poco.
        for (let i = 0; i < 40 && !window.ALISA_PROTOHUB; i++) {
            await new Promise(r => setTimeout(r, 25));
        }
        const proto = window.ALISA_PROTOHUB;
        // ⚠️ SIN HUB SALVO QUE SE PIDA. El defecto estaba al revés: sondeaba
        // `127.0.0.1:8741` —el hub de la colonia, que es otro proyecto— y dejaba
        // un 404 en la consola en cada carga, apuntando a una dirección privada
        // nuestra. Desde https ese sondeo ni siquiera está permitido, así que en
        // el sitio publicado era ruido sin ninguna posibilidad de servir.
        // Ver el mismo cambio y el mismo motivo en `protohub/ProtoHub.js`.
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
                    console.log(`[Arcade] hub encontrado — '${this.gameId}' conectado a la colonia.`);
                    return;
                }
            } catch { /* sin hub: seguimos abajo */ }
        }

        /**
         * ⚠️ CON `?sala=` LA PARTIDA OCURRE EN EL ÁRBITRO, Y AQUÍ NO ESTABA.
         *
         * Esto faltaba, y la forma en que se descubrió merece quedar escrita: Oscar
         * abrió un ajedrez con `?sala=` en dos navegadores y salieron DOS PARTIDAS
         * DISTINTAS. Ningún error, ninguna pista — cada pestaña jugaba su propia
         * partida local tan contenta, porque este motor no leía el parámetro.
         *
         * Sólo lo leía `SovereignCardEngine`. O sea que las salas compartidas
         * funcionaban en los juegos de cartas y en la mesa de texto, y en NINGÚN
         * tablero: ajedrez, go, reversi, damas, xiangqi, mancala y los doce de la
         * mesa genérica. Y mientras tanto `entrar.html` ofrecía «con más gente» en
         * los veinticuatro que admiten compañía y fabricaba el enlace igual. Es lo
         * peor que puede hacer una interfaz: prometer algo y no cumplirlo callando.
         *
         * El cliente NO se escribe aquí. Es el mismo `sala.js` de las otras dos
         * mesas: escribirlo por tercera vez sería escribir por tercera vez el
         * rechazo de la mesa llena y el `?quien=` que hace que veas TU partida — dos
         * cosas que ya costaron caras una vez.
         */
        const sala = new URLSearchParams(location.search).get('sala');
        if (sala && proto && proto.soporta(this.gameId)) {
            try {
                const { crearSala, limpiar, nombreParaSala } =
                    await import('/arcade/js/protohub/sala.js');
                const params = new URLSearchParams(location.search);
                const salaLimpia = limpiar(sala, 40);
                const mesa = window.ALISA_SALA = crearSala({
                    sala: salaLimpia,
                    // Sin `?yo=` se coge nombre de invitado y SE RECUERDA: un solo
                    // enlace sirve para todos y una recarga te devuelve a tu silla.
                    yo: nombreParaSala(salaLimpia, params.get('yo')),
                    juego: this.gameId,
                    semilla: Number(params.get('semilla')) || 1,
                });
                this.yoEnLaSala = mesa.yo;
                await mesa.entrar();
                this.sala = mesa;
                this.backend = {
                    tipo: 'sala',
                    state: async () => { await mesa.refrescar(); return mesa.estado(); },
                    move: async (a) => {
                        // ⚠️ `params.action` PRIMERO. `sendMove` envuelve la jugada
                        // en `{action:'move', params:{action:<jugada>}}`, así que
                        // leer `a.action` da la palabra «move» y el árbitro la
                        // rechazaría culpando al juego en vez de a este desempaque.
                        // Y en los tableros la jugada viaja además como `uci` o
                        // `move` según el visualizador.
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
            console.log(`[Arcade] sin hub — '${this.gameId}' se juega en local. Todo tuyo.`);
        } else {
            this.backend = {
                tipo: 'ninguno',
                state: async () => ({ error: `sin hub y sin reglas locales para '${this.gameId}'`,
                                      is_game_over: true, legal_moves: [] }),
                move: async () => ({ ok: false }),
            };
            console.warn(`[Arcade] '${this.gameId}' todavía no tiene reglas locales.`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // TELEMETRY & NETWORK
    // ═══════════════════════════════════════════════════════════════════
    /**
     * Refresca lo que se VE, sin mover a nadie.
     *
     * Separarlo de `pollHub()` es lo que arregla el bug de "no se ve la partida,
     * solo el resultado": antes, tras cada jugada del automático se llamaba a
     * `pollHub()`, que volvía a llamar al agente, que movía otra vez… La partida
     * entera se resolvía en un parpadeo por RECURSIÓN, no por reloj. Ahora el
     * agente mueve UNA vez por tick y entre jugada y jugada se ve el tablero.
     */
    async _refrescarVista() {
        if (!this.backend) return null;
        const data = await this.backend.state();
        if (data && data.error) throw new Error(data.error);
        this.updateHUD(data);
        this.onStateSync(data);
        return data;
    }

    async pollHub() {
        if (!this.backend) return;              // aún eligiendo
        try {
            const data = await this._refrescarVista();
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
        // Viendo repetirse una partida no se juega: lo que hay en la mesa es de otro
        // momento y meterle una jugada encima rompe justo lo que se está enseñando.
        if (this.repitiendo) return false;
        if (!this.currentLegalMoves.includes(moveStr)) {
            console.warn(`Illegal move rejected by UI pre-flight: ${moveStr}`);
            return false;
        }

        let payload = { action: 'move', params: { uci: moveStr } };  // Note: legacy endpoints expect 'uci' for move string

        try {
            const data = await this.backend.move(payload);
            if (data && data.ok !== false) {
                // Solo la VISTA: si se llamara a pollHub, el agente automático
                // respondería en el mismo instante y no se vería tu jugada.
                await this._refrescarVista();
                return true;
            }
            console.warn(`Jugada rechazada: ${data && data.error}`);
        } catch (err) {
            console.error("Move request failed", err);
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // HUD & EVENT BINDINGS
    // ═══════════════════════════════════════════════════════════════════
    
    mountAgentHUD(containerId, title = "Sovereign Arena", customUpperHtml = "") {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
        <div class="overlay" style="z-index: 10;">
            <div class="hud-panel" id="main-hud">
                <div class="hud-header" id="dockBtnToggle">
                    <h1>♛ ${title}</h1>
                    <button class="collapse-btn" id="dockBtn">▼</button>
                </div>
                ${(window.ALISA_OBJETIVO_HTML?.() ?? '')}
                <div id="hud-content">
                    ${customUpperHtml}

                    <div class="status-row" style="margin-top: 10px;">
                        <span>CONEXIÓN</span>
                        <span id="ui-conn" class="val" style="color: #4CAF50">SYNCED</span>
                    </div>
                    <div class="status-row">
                        <span>TURNO</span>
                        <span id="ui-turn" class="val turn-white">WHITE</span>
                    </div>
                    <div class="status-row">
                        <span>ESTADO</span>
                        <span id="ui-check" class="val" style="color:#666">CLEAR</span>
                    </div>
                    <div class="legal-moves" id="ui-moves">Esperando estado…</div>
                    
                    <!-- Blitz Mode -->
                    <div class="status-row" style="margin-top:8px; align-items:center;">
                        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:11px;">
                            <input type="checkbox" id="blitzToggle" style="accent-color:#FF4081;" />
                            ⚡ RELÁMPAGO (5 min)
                        </label>
                    </div>
                    <div id="blitz-clocks" style="display:none; margin:6px 0;">
                        <div class="status-row">
                            <span style="color:#a180ff;" id="label-clock-white">♔ WHITE</span>
                            <span id="clock-white" class="val" style="font-size:16px; color:#a180ff;">5:00</span>
                        </div>
                        <div class="status-row">
                            <span style="color:#FF4081;" id="label-clock-black">♚ BLACK</span>
                            <span id="clock-black" class="val" style="font-size:16px; color:#FF4081;">5:00</span>
                        </div>
                    </div>

                    <div class="agent-control">
                        <!-- Dual Player Selector -->
                        <div style="display:flex; gap:6px; margin-bottom:6px;">
                            <div style="flex:1;">
                                <div style="font-size:9px; color:#a180ff; text-align:center; margin-bottom:2px;" id="label-p1">♔ WHITE</div>
                                <select id="whitePlayerSelect" style="
                                    width:100%; background:rgba(0,0,0,0.5); color:#a180ff; border:1px solid rgba(161,128,255,0.3);
                                    padding:5px; border-radius:4px; font-family:'JetBrains Mono',monospace; font-size:10px; cursor:pointer;
                                "><!-- vacío a propósito: lo llena _llenarAsientos() desde
                                       protohub/asientos.js, para que no haya una copia
                                       de la lista escrita aquí a mano --></select>
                            </div>
                            <div style="flex:0 0 20px; display:flex; align-items:center; justify-content:center; color:#666; font-size:12px; padding-top:12px;">vs</div>
                            <div style="flex:1;">
                                <div style="font-size:9px; color:#FF4081; text-align:center; margin-bottom:2px;" id="label-p2">♚ BLACK</div>
                                <select id="blackPlayerSelect" style="
                                    width:100%; background:rgba(0,0,0,0.5); color:#FF4081; border:1px solid rgba(255,64,129,0.3);
                                    padding:5px; border-radius:4px; font-family:'JetBrains Mono',monospace; font-size:10px; cursor:pointer;
                                "><!-- ídem --></select>
                            </div>
                        </div>

                        <!-- ⚠️ DOS CASILLAS, NO UNA: dirección Y modelo.
                             Antes sólo se pedía el nombre del modelo porque la
                             jugada la pedía el HUB DE LA COLONIA, que sabía dónde
                             vivía Ollama. En el sitio público no hay colonia, así
                             que el navegador llama él mismo y necesita saber a
                             dónde. Sin esto, «LLM» era una opción que no hacía
                             absolutamente nada fuera de casa. -->
                        <div id="llmModelRow" class="input-row" style="display:none; margin-bottom:6px; gap:4px;">
                            <input type="text" id="llmUrlInput" placeholder="http://127.0.0.1:11434/v1/chat/completions" style="flex:2;" />
                            <input type="text" id="llmModelInput" placeholder="llama3.2:3b" style="flex:1;" />
                        </div>

                        <div class="input-row">
                            <input type="text" id="humanInput" placeholder="escribe una jugada…" />
                            <button id="btnSendHuman">ENVIAR</button>
                        </div>
                        <button id="autoToggleBtn" class="auto-btn">[ ▶ EMPEZAR ]</button>
                        <div class="input-row" style="margin-top:4px;">
                            <button id="btnUndo" title="deshacer la última jugada" style="flex:1;">↩ DESHACER</button>
                            <button id="btnRestart" title="empezar de cero" style="flex:1; color:#FF4081;">⟳ REINICIAR</button>
                        </div>
                    </div>
                    <!--
                      LA TIRA DE JUGADAS VA FUERA DEL PLEGADO: hermana de
                      hud-content y no hija suya. Plegar el panel le pone
                      max-height 0 con overflow hidden, y en pantalla estrecha
                      arranca plegado: con los botones dentro se vería el tablero
                      entero y no habría forma de jugar. Lo encontró un betatester
                      en un móvil de 276 px, y el mismo fallo estaba en las dos
                      mesas genéricas. Ésta es la tercera vez.
                      (Sin acentos graves aquí dentro: esto vive en una plantilla
                      de texto y uno solo la parte en dos. Acaba de pasar.)
                    -->
                    <div id="mesa-jugadas" class="mesa-jugadas"></div>
                </div>
            </div>
        </div>
        `;
        
        container.innerHTML = html;

        /**
         * ⚠️ Y SE RECOLOCA A MANO, PORQUE LA PLANTILLA NO BASTA.
         *
         * La tira de jugadas se escribe arriba como HERMANA de `#hud-content`, con
         * su comentario y todo. Medido en el ajedrez el 14-08-2026, el navegador la
         * enseñaba DENTRO — y plegado (que en móvil es como arranca) `#hud-content`
         * va a `max-height: 0; overflow: hidden`, así que los botones quedan
         * recortados: siguen teniendo rectángulo, `getBoundingClientRect` los da
         * donde tocan, y `elementsFromPoint` en su propio centro devuelve el lienzo.
         * O sea que en un móvil NO SE PODÍA PULSAR NINGUNA JUGADA DEL AJEDREZ, y es
         * el único cuyo tablero tampoco responde al tacto: sin forma de jugar.
         *
         * La causa es que `customUpperHtml` lo escribe cada visualizador y basta un
         * `<div>` sin cerrar para que el analizador se trague lo que viene detrás.
         * Auditar esas cadenas a ojo arregla la de hoy y no la de mañana.
         *
         * Perseguí esto con dos parches de `z-index` que no cambiaron la medida ni
         * un punto —el problema nunca fue el apilado, era el recorte— antes de
         * mirar dónde estaba el botón de verdad.
         */
        const panelJugadas = document.getElementById('main-hud');
        const tira = document.getElementById('mesa-jugadas');
        if (panelJugadas && tira && tira.parentElement !== panelJugadas) {
            panelJugadas.appendChild(tira);
        }

        const hud = document.getElementById('main-hud');
        const btn = document.getElementById('dockBtn');

        /**
         * ⚠️ EN UN MÓVIL EMPIEZA PLEGADO, COMO EN LA MESA DE CARTAS.
         *
         * Esto lo tenía sólo `SovereignCardEngine`, y el resultado medido el
         * 13-08-2026 en una pantalla de 390x844, contando qué elemento hay bajo
         * cada punto con `elementFromPoint`:
         *
         *     ajedrez   panel 62% de la pantalla · lienzo alcanzable 37%
         *     damas     50%                        49%
         *     go        50%                        49%
         *     entropy   25%                        74%   <- el que sí se plegaba
         *
         * Por eso ninguno de los juegos de tablero respondía al dedo: no es que
         * les faltara el manejador —el de ajedrez está perfectamente escrito, traza
         * un rayo a la casilla— es que el panel estaba ENCIMA del tablero y el dedo
         * aterrizaba en él. Los únicos toques que llegaban a algo eran los que
         * caían en los botones, y de hecho lo que salía era `undo` y `reset`.
         *
         * Un fallo que en escritorio no existe, porque ahí sobra sitio para los dos.
         */
        const CLAVE = 'alisa:hud-plegado';
        const aplicar = (plegado) => {
            hud.classList.toggle('collapsed', plegado);
            if (btn) btn.innerText = plegado ? '▶' : '▼';
        };
        const guardado = localStorage.getItem(CLAVE);
        aplicar(guardado === null ? this.esPantallaEstrecha() : guardado === '1');

        // Las normas variables del juego, si las tiene. Van en la cabecera porque
        // son una propiedad de la MESA y no una jugada: entre los botones de jugar
        // serían una acción que un agente no tiene, y eso rompe la comparación.
        if (window.ALISA_GESTOS?.ponerNormas && window.ALISA_NORMAS_POSIBLES) {
            window.ALISA_GESTOS.ponerNormas(
                document.querySelector('.hud-header'),
                window.ALISA_NORMAS_POSIBLES,
                window.ALISA_NORMAS ?? {});
        }

        document.getElementById('dockBtnToggle').addEventListener('click', () => {
            const plegado = !hud.classList.contains('collapsed');
            aplicar(plegado);
            // Se recuerda: un panel que se despliega solo en cada repintado sería
            // peor que no plegarlo.
            localStorage.setItem(CLAVE, plegado ? '1' : '0');
        });
    }

    /**
     * Un móvil en vertical, o una ventana muy estrecha.
     *
     * ⚠️ CERO NO ES ESTRECHO: ES «NO LO SÉ». `innerWidth` vale 0 en una pestaña
     * que aún no se ha compuesto, y cero es menor que 820, así que un monitor de
     * 27 pulgadas se llevaría la vista de teléfono según cuándo mirases. Sin
     * medida fiable se responde que no, que es lo que había antes.
     */
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  LAS JUGADAS, COMO BOTONES. LOS ONCE JUEGOS PROPIOS NO LOS TENÍAN.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Haciendo de betatester: abrí las capturas del laboratorio una por una, que es
     * lo que no hace nadie. Las mesas genéricas ofrecen sus jugadas como botones
     * pulsables; los once con visualizador propio las enseñaban como UNA LÍNEA DE
     * TEXTO GRIS, cortada a los cincuenta caracteres:
     *
     *     go       «a19, b19, c19, d19, e19, f19, g19, h19, i19, j...»   de 361
     *     mancala  «0, 1, 2, 3, 4, 5»
     *
     * Y para jugar, una caja de texto que pone «Move (e.g. e2e4)» — en un juego
     * cuyas jugadas son `a19`, y en otro cuyas jugadas son un dígito. Se podía
     * jugar: escribiendo a mano y adivinando el formato.
     *
     * Con esto los once heredan la misma tira que las mesas genéricas, con la misma
     * clase `.mesa-jugada` — porque son la MISMA cosa: la lista literal de
     * `legal_moves`, la que ve un agente por la puerta de texto.
     *
     * ⚠️ SE CORTA A CINCUENTA, Y SE DICE CUÁNTAS FALTAN.
     *
     * Go empieza con 361 jugadas legales. Trescientos sesenta y un botones no son
     * una ayuda, son un muro — y ahí además no hacen falta: go se juega tocando la
     * intersección. La caja de texto sigue para el resto, y ahora al menos se ve el
     * formato en los botones de al lado.
     */
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL REPETIDOR — ver una partida volverse a jugar
     * ═══════════════════════════════════════════════════════════════════════
     *
     *     /arcade/snake.html?semilla=99&repetir=arriba,arriba,derecha,…
     *
     * ⚠️ ESTE MOTOR SE ME QUEDÓ FUERA, Y CASI NO ME ENTERO.
     *
     * Lo monté en la mesa genérica y en el motor de cartas y di el trabajo por
     * terminado, sin haber contado nunca cuántos caminos había. Contándolos:
     *
     *     mesa genérica   20 juegos
     *     motor de cartas 11
     *     ESTE MOTOR       4   ← chess, mancala, peatón, snake
     *
     * Cuatro juegos con el enlace generándose y abriendo una partida cualquiera.
     * Y el ajedrez está entre ellos, que es de los que más se abren.
     *
     * Lo curioso es cómo salió: fui a mirar el aviso de fagocito dando por hecho que
     * fagocito era de este motor —tiene visualizador propio— y resultó que no, que
     * va por la mesa genérica y funcionaba ya. La sospecha era falsa y aun así
     * destapó el hueco de verdad, porque obligó a contar en vez de suponer.
     *
     * Es la misma pieza sin una línea propia: el repetidor sólo habla con el hub, y
     * aquí el hub es el mismo. Sólo en local — en una sala manda el árbitro y la
     * partida no es tuya para rebobinarla.
     */
    async _montarRepetidor() {
        if (this.backend?.tipo !== 'local') return;
        const hub = window.ALISA_PROTOHUB;
        if (!hub?.soporta?.(this.gameId)) return;

        const { reciboDeLaURL, crearRepetidor } = await import('./protohub/repetidor.js');
        const recibo = reciboDeLaURL();
        if (!recibo?.jugadas?.length) return;
        if (recibo.semilla === null) {
            // Sin semilla el mundo sería otro y las jugadas caerían sobre un tablero
            // distinto: se dice, no se finge.
            console.warn('[Arcade] hay `repetir=` sin `semilla=`: no se puede repetir.');
            return;
        }

        this.repitiendo = true;
        this._semillaRepetida = recibo.semilla;
        // El automático jugaría por su cuenta entre las jugadas del recibo y lo que
        // se vería no sería la partida que se está enseñando.
        this.autoMode = false;
        const { ponerMandoRepetir } = await import('./protohub/mando_repetir.js');
        this.repetidor = window.ALISA_REPETIDOR = crearRepetidor({
            hub, juego: this.gameId,
            jugadas: recibo.jugadas,
            semilla: recibo.semilla,
            alCambiar: () => this.pollHub(),
        });

        const panel = document.querySelector('.hud-panel');
        if (panel) {
            const hueco = document.createElement('div');
            const antes = panel.querySelector(':scope > #mesa-jugadas');
            if (antes) panel.insertBefore(hueco, antes); else panel.appendChild(hueco);
            ponerMandoRepetir(hueco, this.repetidor,
                { juego: this.gameId, semilla: recibo.semilla });
        }
        this.repetidor.alInicio();
    }

    pintarJugadasPulsables() {
        /**
         * ⚠️ SI NO HAY DÓNDE PONERLAS, SE PONE EL SITIO.
         *
         * Snake, fagocito y blackjack montan su propio panel —«Score», «Pellets
         * Left»— y no pasan por `mountAgentHUD`, así que no tenían `#mesa-jugadas`
         * y se quedaban con CERO jugadas pulsables. Medido en la pasada de los 35.
         *
         * Antes esto devolvía y ya está, que es lo cómodo y deja tres juegos fuera.
         * Se crea la caja al final del panel: cualquier visualizador que tenga un
         * `.hud-panel` hereda sus jugadas, tenga el HUD que tenga.
         */
        let caja = document.getElementById('mesa-jugadas');
        if (!caja) {
            const panel = document.querySelector('.hud-panel');
            if (!panel) return;
            caja = document.createElement('div');
            caja.id = 'mesa-jugadas';
            caja.className = 'mesa-jugadas';
            panel.appendChild(caja);
        }
        /**
         * ⚠️ REPITIENDO GANA SOBRE EL FINAL, Y ESTE ORDEN ME COSTÓ VERLO.
         *
         * Lo tenía debajo, y repitiendo el aviso de fagocito hasta el final salió la
         * pantalla de fin de partida entera: «jugar otra», «copiar el enlace»,
         * «aportar al corpus» — los tres muertos, porque `sendMove` rechaza jugar
         * mientras se mira. Una repetición que había funcionado perfectamente,
         * acabando en tres botones que no hacen nada.
         *
         * Aquí no ha terminado TU partida: ha terminado la que estabas mirando. Son
         * dos cosas distintas, y sólo una de ellas tiene botones que sirvan.
         */
        if (this.repitiendo) {
            if (caja.dataset.firma !== '@repitiendo') {
                caja.dataset.firma = '@repitiendo';
                caja.classList.remove('mesa-final');
                import('./protohub/mando_repetir.js').then(({ avisoMirando }) => {
                    caja.innerHTML = avisoMirando({ semilla: this._semillaRepetida });
                }).catch(() => {});
            }
            return;
        }

        /**
         * ⚠️ AL TERMINAR, LA PANTALLA DE FIN.
         *
         * Antes aquí no quedaba nada al acabar la partida: ni resultado, ni forma de
         * empezar otra sin recargar. Y es el momento exacto en que alguien decide si
         * sigue jugando. Va en `protohub/final.js`, compartido con el motor de
         * cartas y con la mesa genérica — tres caminos, una sola pantalla.
         */
        const est = this._ultimoEstado;
        if (est?.is_game_over && this.backend?.tipo === 'local') {
            import('./protohub/final.js').then(({ finalSiTerminada }) => finalSiTerminada(caja, {
                estado: est, juego: this.gameId, enviar: (m) => this.sendMove(m),
            })).catch(() => {});
            return;
        }

        const movs = this.currentLegalMoves ?? [];
        const TOPE = 50;

        // Se compara con lo que ya hay para no rehacer el DOM en cada sondeo: el
        // estado se consulta cada segundo, y recrear los botones bajo el dedo hace
        // que un toque se pierda entre el `pointerdown` y el `pointerup`.
        const firma = movs.slice(0, TOPE).join('');
        if (caja.dataset.firma === firma) return;
        caja.dataset.firma = firma;
        caja.textContent = '';
        // Hay partida viva otra vez: fuera el aspecto de pantalla de fin. La marca
        // ya la ha sustituido la firma de las jugadas, pero la clase no se va sola.
        caja.classList.remove('mesa-final');

        for (const m of movs.slice(0, TOPE)) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'mesa-jugada';
            b.textContent = String(m);
            b.addEventListener('click', () => this.sendMove(String(m)));
            caja.appendChild(b);
        }
        if (movs.length > TOPE) {
            const mas = document.createElement('span');
            mas.className = 'mesa-jugadas-mas';
            mas.textContent = `y ${movs.length - TOPE} más — escríbela o toca el tablero`;
            caja.appendChild(mas);
        }
    }

    esPantallaEstrecha() {
        const w = window.innerWidth || document.documentElement?.clientWidth || 0;
        return w > 0 && w < 820;
    }

    bindUI() {
        this.bindClick('whitePlayerSelect', () => this.onPlayerChange());
        this.bindClick('blackPlayerSelect', () => this.onPlayerChange());
        this.bindClick('blitzToggle', () => this.toggleBlitz());
        this.bindClick('autoToggleBtn', () => this.toggleAutoMode());
        this.bindClick('btnSendHuman', () => this.submitHumanInput());
        this.bindClick('btnUndo', () => this.undoMove());
        this.bindClick('btnRestart', () => this.restartGame());
        
        const humanInput = document.getElementById('humanInput');
        if (humanInput) {
            humanInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.submitHumanInput();
            });
        }
        
        // Los desplegables llegan vacíos del HUD: los llena el catálogo. Es
        // asíncrono porque `asientos.js` es un módulo y esto un script clásico,
        // así que `onPlayerChange()` se llama desde dentro cuando ya hay opciones.
        this._llenarAsientos();
    }

    bindClick(id, callback) {
        const el = document.getElementById(id);
        if (el) {
            // Remove inline event handlers cleanly
            el.removeAttribute('onclick');
            el.removeAttribute('onchange');
            
            // Add listener
            el.addEventListener(el.tagName === 'SELECT' || el.tagName === 'INPUT' && el.type === 'checkbox' ? 'change' : 'click', callback);
        }
    }

    updateHUD(data) {
        const uConn = document.getElementById('ui-conn');
        if(uConn) {
            uConn.innerText = 'SYNCED';
            uConn.style.color = '#4CAF50';
        }

        /**
         * ⚠️ AQUÍ HABÍA UN `data.state || data` — y elegía mal.
         *
         * Algunos juegos (mancala) traen un `state` anidado con lo que el
         * visualizador necesita para pintar (`{board, turno}`) Y ADEMÁS los
         * campos de partida arriba del todo. Al quedarse con el anidado, este
         * método no encontraba `legal_moves` y dejaba la lista VACÍA. Y como
         * `sendMove()` comprueba contra esa lista antes de mandar nada, mancala
         * no la podía jugar nadie: ni una persona con el ratón ni un agente.
         *
         * Se busca cada campo donde esté, no se elige un objeto y se reza.
         */
        const campo = (nombre) => {
            if (data[nombre] !== undefined) return data[nombre];
            if (data.state && data.state[nombre] !== undefined) return data.state[nombre];
            return undefined;
        };

        this.currentLegalMoves = campo('legal_moves') || [];

        // Detect Game Over Transition
        const gOver = campo('is_game_over') !== undefined ? campo('is_game_over') : (campo('game_over') || false);
        if (!this.isGameOver && gOver) {
            this.gamesPlayed++;
        }
        this.isGameOver = gOver;
        this.currentTurn = campo('turn') || 'white';

        /**
         * El estado entero, aplanado, para quien lo necesite después.
         *
         * ⚠️ `is_game_over` SE VUELVE A PONER AQUÍ, Y NO SOBRA: hay juegos que lo
         * publican dentro de `state` y otros al nivel de arriba —por eso existe
         * `campo()` justo encima—, así que quien reciba esto no debería tener que
         * saber cuál de las dos formas le tocó. Ese «que cada consumidor lo busque»
         * es literalmente el fallo que caza `desajustes.mjs`.
         */
        this._ultimoEstado = { ...(data.state ?? {}), ...data, is_game_over: gOver };

        const turnEl = document.getElementById('ui-turn');
        if (turnEl) {
            turnEl.innerText = this.currentTurn.toUpperCase();
            turnEl.className = "val " + (this.currentTurn === 'white' ? "turn-white" : "turn-black");
        }

        const checkEl = document.getElementById('ui-check');
        if (checkEl) {
            checkEl.innerText = this.isGameOver ? "GAME OVER" : (data.is_check ? "CHECK!" : "CLEAR");
            checkEl.style.color = data.is_check ? "#e74c3c" : "#666";
            if (this.isGameOver) checkEl.style.color = "#FF4081";
        }

        this.pintarJugadasPulsables();

        const movesEl = document.getElementById('ui-moves');
        if (movesEl) {
             const mStr = this.currentLegalMoves.join(", ");
             movesEl.innerText = mStr.length > 0 ? (mStr.length > 50 ? mStr.substring(0, 46) + "..." : mStr) : "None";
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // AGENT CONTROLS
    // ═══════════════════════════════════════════════════════════════════
    /**
     * Llena los dos desplegables desde el catálogo de `asientos.js`.
     *
     * Se hace en JS y no en el HTML del HUD para que no haya DOS listas: la del
     * módulo y una copia escrita aquí. Ese era exactamente el problema anterior
     * —`alisa` y `queen` seguían en el desplegable mucho después de dejar de
     * significar nada— y las listas paralelas no se arreglan actualizándolas.
     */
    async _llenarAsientos() {
        const { CONTROLADORES } = await this._asientos();
        const params = new URLSearchParams(location.search);
        const pedidos = String(params.get('asientos') ?? '').split(',').map(s => s.trim());
        // Por defecto: tú de blancas contra la heurística del juego. Es lo que
        // hacía antes, sólo que ahora la heurística tiene nombre y se puede
        // cambiar por otra que sí aparece en la tabla de clasificación.
        const porDefecto = ['persona', 'fsm:casa'];
        let hayPanel = false;

        ['whitePlayerSelect', 'blackPlayerSelect'].forEach((id, i) => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = Object.entries(CONTROLADORES)
                .map(([clave, c]) => `<option value="${clave}" title="${c.ayuda}">${c.etiqueta}</option>`)
                .join('');
            sel.value = (pedidos[i] && CONTROLADORES[pedidos[i]]) ? pedidos[i] : porDefecto[i];
            hayPanel = true;
        });
        // Sin panel no hay nada que leer: los valores ya vienen del constructor y
        // leerlos de unos desplegables que no existen los borraría.
        if (hayPanel) this.onPlayerChange();
        this._arrancarSiHayAgentes();
    }

    /** Enciende el automático si alguna silla no la lleva una persona. */
    async _arrancarSiHayAgentes() {
        const { esPersona } = await this._asientos();
        if ((!esPersona(this.whitePlayer) || !esPersona(this.blackPlayer)) && !this.autoMode) {
            this.toggleAutoMode();
        }
    }

    onPlayerChange() {
        const w = document.getElementById('whitePlayerSelect');
        const b = document.getElementById('blackPlayerSelect');
        if (w) this.whitePlayer = w.value;
        if (b) this.blackPlayer = b.value;

        // Las casillas del modelo sólo cuando hacen falta.
        const llmRow = document.getElementById('llmModelRow');
        if (llmRow) {
            const hayModelo = [this.whitePlayer, this.blackPlayer]
                .some(v => String(v ?? '').startsWith('llm'));
            llmRow.style.display = hayModelo ? 'flex' : 'none';
        }
        // La dirección describe la mesa que se está viendo, así que se puede
        // compartir: «juega tú de blancas contra mi modelo» es un enlace.
        const u = new URL(location.href);
        u.searchParams.set('asientos', `${this.whitePlayer},${this.blackPlayer}`);
        history.replaceState(null, '', u);
    }

    /**
     * ⚠️ EL BOTÓN DECÍA «PARAR» Y NADIE SABÍA PARAR QUÉ.
     *
     * Aviso de betatester desde mancala: «va solo no? o se juega asi? ni idea
     * tengo de como se juega en realidad XD». Y sí va solo, y está bien que vaya:
     * el asiento negro lo lleva un FSM, y sin reloj el FSM no mueve nunca. El
     * automático se para solo en cuanto le toca a una persona (`processAutoAgent`
     * comprueba `esPersona` antes de nada), así que no juega por nadie.
     *
     * Pero eso lo sé yo. Quien abre la página ve fichas moviéndose y un botón que
     * pone PARAR, y la conclusión razonable es «esto se juega solo, yo aquí no
     * pinto nada». El mecanismo era correcto y el rótulo mentía por omisión.
     *
     * Ahora dice a QUIÉN mueve. Cuesta cuatro palabras.
     */
    toggleAutoMode() {
        this.autoMode = !this.autoMode;
        const btn = document.getElementById('autoToggleBtn');
        if (btn) {
            if (this.autoMode) {
                btn.innerText = "[ ⏹ PARAR A LA CASA ]";
                btn.title = "La casa mueve sola sus fichas. Tus turnos los juegas tú: "
                          + "cuando te toque, se espera.";
                btn.classList.add("active");
                this.pollHub(); // Instantly trigger
            } else {
                btn.innerText = "[ ▶ QUE JUEGUE LA CASA ]";
                btn.title = "Parado: la casa no moverá aunque le toque.";
                btn.classList.remove("active");
            }
        }
    }

    submitHumanInput() {
        const input = document.getElementById('humanInput');
        if (input && input.value.trim() !== '') {
            this.sendMove(input.value.trim().toLowerCase());
            input.value = '';
        }
    }

    /**
     * ═══ QUIÉN JUEGA POR ESTE ASIENTO ═══════════════════════════════════
     *
     * ⚠️ ANTES ESTO ERA UNA LISTA APARTE, Y MEDIO FALSA.
     * El desplegable ofrecía `engine / human / alisa / queen / llm`. De esos,
     * `alisa` y `queen` acababan los dos en el mismo `ai_move` —eran decoración—
     * y `llm` mandaba `llm_move` AL HUB DE LA COLONIA. O sea que en el sitio
     * público, donde no hay colonia, elegir «LLM» no hacía nada: ni jugaba, ni
     * avisaba. Cinco opciones para dos comportamientos.
     *
     * Ahora el asiento lo resuelve `protohub/asientos.js`, el MISMO módulo que
     * usa `mesa.html`. Consecuencias que no son de limpieza:
     *   · las políticas son las de la tabla de clasificación (`primera`, `azar`,
     *     `casa`), no un «engine» sin nombre que nadie puede reproducir;
     *   · el modelo lo llama ESTE navegador, así que funciona sin colonia;
     *   · y `?asientos=` significa lo mismo aquí que en la mesa, así que un
     *     enlace montado vale para las dos.
     */
    async _asientos() {
        if (!this._modAsientos) {
            this._modAsientos = await import('./protohub/asientos.js');
        }
        return this._modAsientos;
    }

    _specDelTurno() {
        return this.currentTurn === 'white' ? this.whitePlayer : this.blackPlayer;
    }

    async processAutoAgent(data) {
        // Repitiendo, la casa no juega: metería jugadas suyas entre las del recibo.
        // Aquí importa más que en el motor de cartas — este arranca el automático
        // solo en cuanto una silla no es de una persona.
        if (this.repitiendo) return;
        if (!this.autoMode || this.isGameOver) return;

        // If the engine explicitly evaluated legal moves and returned an empty set, halt.
        // Otherwise, engines like Go/Xiangqi that might not return an array can continue checking
        const stateObj = data.state || data;
        if (stateObj.legal_moves !== undefined && stateObj.legal_moves.length === 0) return;

        const spec = this._specDelTurno();
        const mod = await this._asientos();
        if (mod.esPersona(spec)) return;                 // le toca a una persona

        const acciones = (this.currentLegalMoves || [])
            .filter(m => m !== 'nueva' && m !== 'reset');
        if (!acciones.length) return;

        try {
            const proto = window.ALISA_PROTOHUB;
            const reglas = proto?.reglas?.get(this.gameId);
            const llm = {
                url: document.getElementById('llmUrlInput')?.value.trim(),
                modelo: document.getElementById('llmModelInput')?.value.trim(),
            };
            // Se rehace por jugada a propósito: así un cambio de desplegable o de
            // modelo surte efecto en el acto. `azar` pierde su hilo de semilla al
            // rehacerse, así que se guarda por asiento.
            this._ctrl = this._ctrl || {};
            const clave = `${this.currentTurn}:${spec}:${llm.url}:${llm.modelo}`;
            if (!this._ctrl[clave]) {
                this._ctrl[clave] = mod.crearControlador(spec, { juego: this.gameId, reglas, llm });
            }
            const jugada = await this._ctrl[clave].elegir({
                // ⚠️ El nombre que publican las REGLAS, no el del registro.
                // Dos páginas registran con otro nombre —`ajedrez` se registra
                // como `chess`, `damas` como `checkers`— y ese nombre entra en el
                // texto que lee un modelo. Si aquí dijera «Chess» y el banco de
                // pruebas «Ajedrez», los dos números dejarían de ser comparables
                // por una diferencia que no tiene nada que ver con jugar.
                juego: stateObj.juego ?? this.gameId,
                st: stateObj, acciones, reglas,
                p: proto?.partidas?.get(this.gameId),
            });

            // ⚠️ SI NO ELIGE, SE PARA Y SE DICE. No se juega por él: en el banco
            // de pruebas eso se cuenta como jugada «forzada» y se publica el
            // porcentaje. Una mesa que rellenara el hueco en silencio le estaría
            // regalando partidas a un modelo que no supo jugarlas.
            if (!jugada) {
                console.warn(`[Arcade] «${this._ctrl[clave].etiqueta}» no eligió ninguna de las ${acciones.length} legales.`);
                this.toggleAutoMode();
                return;
            }
            await this.sendMove(jugada);
        } catch(e) {
             console.error('[Arcade] el asiento no pudo jugar:', e.message);
             this.toggleAutoMode(); // Safety Stop
        }
    }

    async undoMove() {
        try {
            await this.backend.move({ action: 'undo' });
            this.pollHub();
        } catch(e) { console.error(e); }
    }

    async restartGame() {
        try {
            await this.backend.move({ action: 'reset' });
            this.clockWhite = 300;
            this.clockBlack = 300;
            this.updateClockUI();
            this.pollHub();
        } catch(e) { console.error(e); }
    }

    // ═══════════════════════════════════════════════════════════════════
    // BLITZ CLOCK
    // ═══════════════════════════════════════════════════════════════════
    toggleBlitz() {
        const chk = document.getElementById('blitzToggle');
        this.blitzMode = chk ? chk.checked : false;
        const panel = document.getElementById('blitz-clocks');
        if (panel) panel.style.display = this.blitzMode ? 'block' : 'none';

        if (this.blitzMode) {
            this.clockWhite = 300; this.clockBlack = 300;
            if (this.blitzInterval) clearInterval(this.blitzInterval);
            this.blitzInterval = setInterval(() => this.tickClock(), 1000);
            this.updateClockUI();
        } else {
            if (this.blitzInterval) clearInterval(this.blitzInterval);
        }
    }

    tickClock() {
        if (this.isGameOver) return;
        if (this.currentTurn === 'white') {
            this.clockWhite = Math.max(0, this.clockWhite - 1);
        } else {
            this.clockBlack = Math.max(0, this.clockBlack - 1);
        }
        this.updateClockUI();
        if (this.clockWhite <= 0 || this.clockBlack <= 0) {
            console.warn("Time OUT");
        }
    }

    updateClockUI() {
        const mw = Math.floor(this.clockWhite / 60);
        const sw = (this.clockWhite % 60).toString().padStart(2, '0');
        const elW = document.getElementById('clock-white');
        if (elW) elW.innerText = `${mw}:${sw}`;

        const mb = Math.floor(this.clockBlack / 60);
        const sb = (this.clockBlack % 60).toString().padStart(2, '0');
        const elB = document.getElementById('clock-black');
        if (elB) elB.innerText = `${mb}:${sb}`;
    }
}
