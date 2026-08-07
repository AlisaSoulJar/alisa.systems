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
                
                <div id="hud-content">
                    ${customUpperHtml}
                    
                    <div class="status-row" style="margin-top: 10px;">
                        <span>CONNECTION</span>
                        <span id="ui-conn" class="val" style="color: #4CAF50">SYNCED</span>
                    </div>
                    <div class="status-row">
                        <span>ENGINE TURN</span>
                        <span id="ui-turn" class="val turn-white">WHITE</span>
                    </div>
                    <div class="status-row">
                        <span>CHECK STATUS</span>
                        <span id="ui-check" class="val" style="color:#666">CLEAR</span>
                    </div>
                    <div class="legal-moves" id="ui-moves">Awaiting telemetry...</div>
                    
                    <!-- Blitz Mode -->
                    <div class="status-row" style="margin-top:8px; align-items:center;">
                        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:11px;">
                            <input type="checkbox" id="blitzToggle" style="accent-color:#FF4081;" />
                            ⚡ BLITZ (5min)
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
                            <input type="text" id="humanInput" placeholder="Move (e.g. e2e4)..." />
                            <button id="btnSendHuman">SEND</button>
                        </div>
                        <button id="autoToggleBtn" class="auto-btn">[ ▶ START MATCH ]</button>
                        <div class="input-row" style="margin-top:4px;">
                            <button id="btnUndo" title="Undo last move" style="flex:1;">↩ UNDO</button>
                            <button id="btnRestart" title="Reset board" style="flex:1; color:#FF4081;">⟳ RESTART</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        container.innerHTML = html;
        
        // Bind the dock toggle
        document.getElementById('dockBtnToggle').addEventListener('click', () => {
            const hud = document.getElementById('main-hud');
            const btn = document.getElementById('dockBtn');
            hud.classList.toggle('collapsed');
            btn.innerText = hud.classList.contains('collapsed') ? '▶' : '▼';
        });
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

    toggleAutoMode() {
        this.autoMode = !this.autoMode;
        const btn = document.getElementById('autoToggleBtn');
        if (btn) {
            if (this.autoMode) {
                btn.innerText = "[ ⏹ STOP MATCH ]";
                btn.classList.add("active");
                this.pollHub(); // Instantly trigger
            } else {
                btn.innerText = "[ ▶ START MATCH ]";
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
