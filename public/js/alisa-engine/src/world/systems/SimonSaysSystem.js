/**
 * SIMON SAYS ENGINE — Reactive Pattern Matcher
 * ──────────────────────────────────────────────
 * Pure ES6 Headless Mathematical Engine.
 * Encodes the timed action/position matching game from the Movement Lab.
 *
 * Flow:
 *   1. Engine generates a random target (action from pool OR tile coordinate)
 *   2. Timer counts down from configurable limit
 *   3. Player submits an action → engine evaluates match → HIT or MISS
 *   4. Timer expires → auto-MISS
 *   5. After result, delay → next target
 *
 * Designed for:
 *   - AI training (RL observation/action space)
 *   - Human minigame
 *   - Headless batch evaluation
 *
 * No THREE.js or DOM dependencies. Returns pure state mutations.
 */

export class SimonSaysSystem {
    constructor(config = {}) {
        this.actionTimeLimit = config.actionTimeLimit || 2.0;   // seconds for action targets
        this.tileTimeLimit = config.tileTimeLimit || 3.0;       // seconds for tile nav targets
        this.tileChance = config.tileChance || 0.5;             // probability of tile vs action
        this.cooldownAfterHit = config.cooldownAfterHit || 0.8; // seconds before next target
        this.cooldownAfterMiss = config.cooldownAfterMiss || 1.2;
        this.gridSize = config.gridSize || 5;                   // NxN tile grid
        // Lo que cuesta un paso en la matriz. Ver submitAction: sin esto, un
        // agente cruza la rejilla sin gastar reloj y la persona no.
        this.stepTime = config.stepTime ?? 0.35;

        // Available action targets (can be customized per game)
        this.actionPool = config.actionPool || [
            'jump', 'double_jump', 'crouch', 'dash',
            'attack', 'block', 'acrobat_front', 'acrobat_back',
            'acrobat_left', 'acrobat_right'
        ];
    }

    /**
     * Creates a fresh game state.
     * @returns {Object} SimonSays state
     */
    createState() {
        return {
            active: false,
            currentTarget: null,       // string: action name or 'tile_X_Z'
            targetType: null,           // 'action' | 'tile' | null
            timer: 0,
            timeLimit: 0,
            hits: 0,
            misses: 0,
            cooldown: 0,               // post-result delay before next target
            lastResult: null,           // 'hit' | 'miss' | null
            /**
             * ═══════════════════════════════════════════════════════════════
             *  ⚠️ DÓNDE ESTÁ EL JUGADOR EN LA MATRIZ. ANTES NO EXISTÍA.
             * ═══════════════════════════════════════════════════════════════
             *
             * Los objetivos de casilla se resolvían con `submitTileArrival(x, z)`:
             * el motor no sabía dónde estabas, sólo comprobaba que dijeras haber
             * llegado. Para una persona la dificultad era CORRER hasta allí; para
             * un agente era un botón que se pulsa una vez y acierta siempre.
             *
             * Dos puertas, dos juegos: el mismo fallo de siempre, y encima en la
             * mitad del juego que más se parece a lo que este proyecto defiende.
             *
             * Porque la tesis del banco es justo ésta: **a los modelos se les da
             * el mundo YA en forma de matriz plana, y aprenden a MOVERSE en ella**
             * —en vez de la vía de la industria, que es que un modelo de visión
             * convierta un mundo 3D en matriz para poder operarlo—. Traducir el
             * mundo a matriz es trabajo de nuestro motor. Que la casilla se
             * resolviera con un botón se saltaba exactamente la parte que
             * queremos medir.
             *
             * Ahora hay posición, y llegar cuesta pasos.
             */
            x: 0, z: 0,
            pasos: 0,                  // pasos dados desde que se fijó el objetivo
            events: []                 // ['target_set', 'hit', 'miss', 'timeout', 'cooldown_end']
        };
    }

    /**
     * Starts the game.
     * @param {Object} state
     * @param {Function} rng - Optional seeded random (default Math.random)
     * @returns {Object} Updated state
     */
    start(state, rng = Math.random) {
        state.active = true;
        state.hits = 0;
        state.misses = 0;
        state.lastResult = null;
        state.cooldown = 0;
        state.events = [];
        // En el centro de la matriz: ninguna casilla queda regalada de salida.
        state.x = Math.floor(this.gridSize / 2);
        state.z = Math.floor(this.gridSize / 2);
        state.pasos = 0;
        return this._setNextTarget(state, rng);
    }

    /** Los cuatro pasos de la matriz. `submitAction` los acepta tal cual. */
    static PASOS = { norte: [0, -1], sur: [0, 1], oeste: [-1, 0], este: [1, 0] };

    /**
     * Stops the game.
     */
    stop(state) {
        state.active = false;
        state.currentTarget = null;
        state.targetType = null;
        state.timer = 0;
        state.cooldown = 0;
        state.events = [];
        return state;
    }

    /**
     * Core tick — advances the timer, checks for timeout.
     * @param {Object} state
     * @param {number} dt - Delta time
     * @param {Function} rng - Optional seeded random
     * @returns {Object} Updated state
     */
    tick(state, dt, rng = Math.random) {
        state.events = [];

        if (!state.active) return state;

        // Post-result cooldown
        if (state.cooldown > 0) {
            state.cooldown -= dt;
            if (state.cooldown <= 0) {
                state.cooldown = 0;
                state.events.push('cooldown_end');
                this._setNextTarget(state, rng);
            }
            return state;
        }

        // Active target timer
        if (state.currentTarget) {
            state.timer -= dt;

            if (state.timer <= 0) {
                // TIMEOUT = auto-miss
                state.misses++;
                state.lastResult = 'miss';
                state.currentTarget = null;
                state.targetType = null;
                state.cooldown = this.cooldownAfterMiss;
                state.events.push('timeout');
            }
        }

        return state;
    }

    /**
     * Submits a player action for evaluation.
     * @param {Object} state
     * @param {string} action - The action performed (e.g., 'jump', 'tile_2_3')
     * @returns {Object} { matched: boolean, state }
     */
    submitAction(state, action) {
        state.events = [];

        if (!state.active || !state.currentTarget || state.cooldown > 0) {
            return { matched: false, state };
        }

        /**
         * ⚠️ UN PASO NO ES UNA RESPUESTA, ASÍ QUE NO PUEDE SER UN FALLO.
         *
         * Moverse es cómo se juega el objetivo de casilla, no un intento de
         * acertarlo. Si contara como fallo, ir andando hasta la casilla que te
         * han pedido restaría cinco puntos por cada paso del camino — y la única
         * forma de puntuar sería no moverse, que es el juego contrario.
         *
         * El paso se da SIEMPRE, también con un objetivo de acción: el mundo es
         * el mismo, estés respondiendo a lo que estés respondiendo.
         */
        const paso = SimonSaysSystem.PASOS[action];
        if (paso) {
            const nx = state.x + paso[0];
            const nz = state.z + paso[1];
            // La matriz tiene bordes: fuera no se va, y el paso se gasta igual.
            if (nx >= 0 && nx < this.gridSize && nz >= 0 && nz < this.gridSize) {
                state.x = nx; state.z = nz;
            }
            state.pasos++;
            state.events.push('paso');

            /**
             * ═══════════════════════════════════════════════════════════════
             *  ⚠️ UN PASO GASTA RELOJ, Y SIN ESTO NO SE MIDE NADA
             * ═══════════════════════════════════════════════════════════════
             *
             * Quitar el botón de teletransporte no basta. El reloj lo descuenta
             * `tick(dt)`, así que una persona andando gasta segundos de verdad
             * mientras un agente puede dar sus cuatro pasos en cuatro llamadas
             * seguidas —0,067 s de reloj— y llegar siempre. Seguirían siendo dos
             * juegos: uno con prisa y otro sin ella.
             *
             * Con `stepTime`, moverse cuesta lo mismo por las cinco puertas y el
             * objetivo de casilla se convierte en lo que tiene que ser: un
             * PRESUPUESTO. `pasosMinimos × stepTime` contra el tiempo que queda,
             * y equivocarse de dirección se paga.
             *
             * Y si el reloj se acaba a mitad de camino, es un fallo aquí mismo:
             * esperar al `tick` siguiente dejaría dar pasos con el tiempo ya
             * agotado.
             */
            state.timer -= this.stepTime;
            if (state.timer <= 0 && state.currentTarget) {
                state.misses++;
                state.lastResult = 'miss';
                state.currentTarget = null;
                state.targetType = null;
                state.cooldown = this.cooldownAfterMiss;
                state.events.push('timeout');
                return { matched: false, state };
            }
            // ¿Ha llegado? Llegar ES acertar; no hace falta anunciarlo aparte.
            if (state.targetType === 'tile' && state.currentTarget === `tile_${state.x}_${state.z}`) {
                state.hits++;
                state.lastResult = 'hit';
                state.currentTarget = null;
                state.targetType = null;
                state.cooldown = this.cooldownAfterHit;
                state.events.push('hit');
                return { matched: true, state };
            }
            return { matched: false, state };
        }

        /**
         * ═══════════════════════════════════════════════════════════════════
         *  ⚠️ A UNA CASILLA SE LLEGA ANDANDO. DECIR SU NOMBRE NO VALE.
         * ═══════════════════════════════════════════════════════════════════
         *
         * Quité `move_to_target` del menú y di el trabajo por hecho. No lo estaba:
         * `submitAction(state, 'tile_2_3')` seguía cayendo en la comparación de
         * abajo y contando como acierto **sin dar un solo paso**. Medido con el
         * sondeo viejo, que estaba escrito para el mundo del botón: 45 aciertos,
         * 0 fallos, 450 puntos, quieto en el sitio.
         *
         * O sea que había cerrado la puerta y dejado la ventana. Quitar una
         * opción de un menú no quita la capacidad — hay que quitarla donde se
         * ejecuta, que es aquí.
         *
         * Llegar se detecta arriba, en el paso que te deja encima. Aquí sólo se
         * dice que no.
         */
        if (state.targetType === 'tile' && /^tile_\d+_\d+$/.test(action)) {
            state.events.push('hay_que_ir_andando');
            return { matched: false, state };
        }

        if (action === state.currentTarget) {
            // HIT!
            state.hits++;
            state.lastResult = 'hit';
            state.currentTarget = null;
            state.targetType = null;
            state.cooldown = this.cooldownAfterHit;
            state.events.push('hit');
            return { matched: true, state };
        } else {
            // MISS — only penalize non-neutral actions
            if (action !== 'idle' && action !== 'move' && action !== 'wait') {
                state.misses++;
                state.lastResult = 'miss';
                state.currentTarget = null;
                state.targetType = null;
                state.cooldown = this.cooldownAfterMiss;
                state.events.push('miss');
            }
            return { matched: false, state };
        }
    }

    /**
     * Submits a tile arrival (player standing on tile).
     * @param {Object} state
     * @param {number} tileX - Grid X coordinate
     * @param {number} tileZ - Grid Z coordinate
     * @param {number} tolerance - Distance tolerance for match
     * @returns {Object} { matched: boolean, state }
     */
    /**
     * ⚠️ ERA EL BOTÓN DE TELETRANSPORTE, Y SE QUEDA COMO LÁPIDA.
     *
     * Decía «estoy en la casilla X,Z» y el motor se lo creía, porque no sabía
     * dónde estabas. Ahora lo sabe: se llega andando y llegar se detecta solo.
     *
     * No se borra la función en silencio — quien la llamara se quedaría con un
     * `undefined is not a function` sin saber por qué. Se deja diciendo qué
     * hacer en su lugar.
     */
    submitTileArrival(state) {
        throw new Error(
            'submitTileArrival ya no existe: a una casilla se llega andando. '
          + "Usa submitAction(state, 'norte'|'sur'|'este'|'oeste') — el motor "
          + 'detecta la llegada. Ver el comentario de `submitAction`.');
    }

    /**
     * Get the RL observation space.
     */
    /**
     * ⚠️ Y LA OBSERVACIÓN ENTREGA LA MATRIZ, NO UNA DESCRIPCIÓN DE ELLA.
     *
     * Es la tesis del proyecto puesta en una función: al modelo se le da el mundo
     * ya en forma de rejilla plana —dónde está él, dónde hay que llegar— en vez
     * de obligarle a reconstruirla desde una imagen. Traducir el mundo a matriz
     * es trabajo del motor; operar sobre ella, del que juega.
     *
     * `gridSize`, `x`, `z` y la casilla objetivo son suficientes para reconstruir
     * la rejilla entera, así que no se manda un array de NxN que sólo tendría un
     * 1 dentro: se manda lo que la describe sin ruido.
     */
    getObservation(state) {
        const m = state.targetType === 'tile' && state.currentTarget
            ? /^tile_(\d+)_(\d+)$/.exec(state.currentTarget) : null;
        return {
            mode: state.active ? 'simon_says' : 'inactive',
            target: state.currentTarget || 'none',
            targetType: state.targetType || 'none',
            gridSize: this.gridSize,
            x: state.x, z: state.z,
            targetX: m ? Number(m[1]) : null,
            targetZ: m ? Number(m[2]) : null,
            /** Distancia en pasos: cuántos movimientos hacen falta como mínimo. */
            pasosMinimos: m ? Math.abs(Number(m[1]) - state.x) + Math.abs(Number(m[2]) - state.z) : null,
            pasosDados: state.pasos,
            timeRemaining: Math.max(0, state.timer),
            timeLimit: state.timeLimit,
            timerRatio: state.timeLimit > 0 ? Math.max(0, state.timer / state.timeLimit) : 0,
            hits: state.hits,
            misses: state.misses,
            score: state.hits * 10 - state.misses * 5,
            lastResult: state.lastResult
        };
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ EL MENÚ OFRECÍA VERBS QUE `submitAction` NO ACEPTA. TODOS.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Decía `act_jump` cuando el objetivo es `jump`, y `move_to_target` cuando el
     * objetivo es `tile_2_3`. `submitAction` compara con `===`, así que **ninguno
     * de los verbos ofrecidos podía acertar jamás**.
     *
     * Medido el 24-08 antes de tocar nada, 400 pasos con semilla fija:
     *
     *     jugando lo que ofrece el menú     0 aciertos · 31 fallos · marcador -155
     *     jugando el objetivo literal      45 aciertos ·  0 fallos · marcador +450
     *
     * O sea que un agente que se fía del menú no sólo no puntúa: **es castigado
     * por obedecer**, porque un verbo que no coincide cuenta como fallo. Y desde
     * fuera parecería que el agente es malo, no que el menú miente.
     *
     * Es el mismo fallo que esta misma mañana tenía la puerta de lenguaje de
     * ¡Busca! —ofrecer los mandos de una nave para pilotar un dron— pero llevado
     * al extremo. Dos veces en un día: **un menú se escribe leyendo lo que acepta
     * quien lo va a recibir, no lo que suena bien.**
     *
     * Este motor no está en el banco todavía, así que no ha falseado ninguna nota
     * publicada. Se arregla antes de montarle el entorno, no después.
     */
    getAvailableActions(state) {
        if (!state.active || !state.currentTarget) return ['wait'];

        /**
         * Con un objetivo de casilla, lo único que vale es ESA casilla. Ofrecer
         * las veinticinco sería un menú honrado pero inútil: la gracia del juego
         * es que ya te han dicho a cuál ir.
         */
        /**
         * ⚠️ CON UN OBJETIVO DE CASILLA SE OFRECEN LOS PASOS, NO LA CASILLA.
         *
         * Antes esto ofrecía `move_to_target` —un botón que resolvía el problema—
         * y luego, tras el primer arreglo, la casilla entera, que es lo mismo con
         * otro nombre: decir `tile_2_3` y aparecer allí. Llegar tiene que costar
         * pasos, porque moverse en la matriz es lo que este banco mide.
         */
        if (state.targetType === 'tile') {
            return ['wait', ...Object.keys(SimonSaysSystem.PASOS)];
        }
        // Los pasos siguen estando: el mundo no se congela por haber una acción
        // que responder, y a veces conviene colocarse mientras se piensa.
        return ['wait', ...this.actionPool, ...Object.keys(SimonSaysSystem.PASOS)];
    }

    // ─── INTERNAL ──────────────────────────────────────

    _setNextTarget(state, rng) {
        if (!state.active) return state;

        if (rng() < this.tileChance) {
            // TILE target
            const tx = Math.floor(rng() * this.gridSize);
            const tz = Math.floor(rng() * this.gridSize);
            state.currentTarget = `tile_${tx}_${tz}`;
            state.targetType = 'tile';
            state.timeLimit = this.tileTimeLimit;
            state.timer = this.tileTimeLimit;
        } else {
            // ACTION target
            const idx = Math.floor(rng() * this.actionPool.length);
            state.currentTarget = this.actionPool[idx];
            state.targetType = 'action';
            state.timeLimit = this.actionTimeLimit;
            state.timer = this.actionTimeLimit;
        }

        state.lastResult = null;
        state.events.push('target_set');
        return state;
    }
}
