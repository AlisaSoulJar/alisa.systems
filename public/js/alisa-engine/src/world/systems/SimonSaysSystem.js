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
        return this._setNextTarget(state, rng);
    }

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
    submitTileArrival(state, tileX, tileZ) {
        const tileId = `tile_${tileX}_${tileZ}`;
        return this.submitAction(state, tileId);
    }

    /**
     * Get the RL observation space.
     */
    getObservation(state) {
        return {
            mode: state.active ? 'simon_says' : 'inactive',
            target: state.currentTarget || 'none',
            targetType: state.targetType || 'none',
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
     *  ⚠️ EL MENÚ OFRECÍA VERBOS QUE `submitAction` NO ACEPTA. TODOS.
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
        if (state.targetType === 'tile') {
            return ['wait', state.currentTarget];
        }
        return ['wait', ...this.actionPool];
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
