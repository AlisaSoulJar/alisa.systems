/**
 * CabinetEscapeEnv — el archivador, como entorno de gym
 * ═══════════════════════════════════════════════════════════════════════════
 * `alisa/CabinetEscape-v0`
 *
 * NO simula nada por su cuenta: envuelve `CabinetEscapeSystem`, que es **el mismo
 * motor que juega la persona** en `games/croupier_cabinet_escape.html`. Sólo le
 * pone las tres puertas de agente.
 *
 * Es la prueba de fuego del contrato: si `GymEnv` solo encajara con entornos
 * escritos a medida para él, no valdría como producto. Aquí encaja sobre
 * código anterior y ajeno, sin tocarlo.
 *
 * EL JUEGO
 * --------
 * Un archivador partido por BSP en N cajones. En uno está el conejo (la salida),
 * en otros hay serpientes. Abres cajones de uno en uno. Una serpiente **cuesta
 * dos puntos y sigues jugando**: el susto no te echa, te obliga a seguir
 * deduciendo con menos margen. Encontrar al conejo puntúa según lo EFICIENTE que
 * hayas sido —cuántos cajones te sobraron— así que dar con él tarde vale poco.
 *
 * En modo `minesweeper` cada cajón vacío te dice cuántas serpientes toca y a qué
 * distancia BSP está el conejo — de ahí que sea un problema de inferencia, no de
 * reflejos.
 *
 * Por qué es un buen banco de pruebas: separa razonar de reaccionar. Un LLM
 * puede jugarlo perfecto sin ver un solo píxel ni tener buenos reflejos, cosa
 * que no pasa con Asteroids.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { GymEnv } from '../GymEnv.js';
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ ESTE ENTORNO MEDÍA UN JUEGO QUE NO JUEGA NADIE. 24-08.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Usaba `ScummInteractionEngine` (3 KB) y la página de la persona usa
 * `CabinetEscapeSystem` (11 KB). Los dos envuelven el MISMO `CabinetBSPEngine`,
 * así que el mueble era el mismo — y las reglas, no:
 *
 *                      banco (Scumm)          persona (CabinetEscapeSystem)
 *     serpiente        -100 y MUERES          -2 y sigues jugando
 *     encontrarlo      +100 fijo              0-10 según lo EFICIENTE que fuiste
 *     cada paso        -1                     nada
 *     pistas           vecindad               vecindad + distancia BSP + Monty
 *                                             Hall + destape en cadena
 *     pilas            no existen             recargan la linterna
 *
 * No es un ajuste de puntuación: son dos juegos. Con la semilla 99 el banco
 * mataba al agente **en el primer cajón** mientras una persona con esa misma
 * semilla perdía dos puntos y seguía.
 *
 * ⚠️ Y AQUÍ SE UNIFICA AL REVÉS QUE EN ¡BUSCA! 6.
 *
 * Allí mandaba el núcleo del banco porque era el bueno: headless, sembrado y
 * completo. Aquí el bueno es el de la persona — también headless, también
 * sembrado, y con el juego entero dentro. `ScummInteractionEngine` es la copia
 * reducida, y medir la copia mientras se juega el original es exactamente lo que
 * este banco existe para no hacer.
 *
 * ⚠️ LAS NOTAS DE `alisa/CabinetEscape-v0` CAMBIAN, Y TIENEN QUE CAMBIAR.
 * Antes: 1234 → 97,0 · 7 → 99,0 · 99 → -100,0. Esas cifras medían el juego
 * equivocado, así que conservarlas habría sido conservar el error.
 */
import { CabinetBSPEngine } from '../../world/CabinetBSPEngine.js';
import { CabinetEscapeSystem } from '../../world/systems/CabinetEscapeSystem.js';
/**
 * `ScummInteractionEngine` ya no se importa aquí. Se queda en el motor porque
 * tiene su propio runner sin cabeza, pero deja de ser lo que mide el banco: era
 * la copia reducida del juego de verdad, y `npm run motores` lo dirá en cuanto
 * pase — «medio: runner suelto» en vez de «EN EL BANCO». Que lo diga es la
 * gracia: la deuda que se ve, se paga; la que no, se hereda.
 */

export class CabinetEscapeEnv extends GymEnv {
    static id = 'alisa/CabinetEscape-v0';
    /** El nucleo, expuesto: es por donde se llega a la `familia` del cartucho. */
    static Core = CabinetBSPEngine;

    static meta = {
        title: 'Escape del archivador',
        summary: 'Deducción bajo riesgo: encuentra el conejo abriendo cajones sin ' +
                 'toparte con una serpiente. Las pistas son de tipo buscaminas.',
        horizon: 64,
        tags: ['deduccion', 'riesgo', 'informacion-parcial', 'discreto']
    };

    /**
     * Observación: por cada cajón 3 números — [abierto, serpientes_adyacentes,
     * conejos_adyacentes] — más [pasos, cajones_restantes] al final.
     * Longitud fija para que valga como vector de RL.
     */
    static observationSpace = {
        shape: [8 * 3 + 2],
        names: ['por cajón: abierto, pistaSerpientes, pistaConejo (x8)', 'pasos', 'restantes']
    };

    /** Acción: qué cajón abrir. */
    static actionSpace = { type: 'discrete', n: 8 };

    constructor(opts = {}) {
        super(opts);
        this.bsp = new CabinetBSPEngine();
        this.sys = new CabinetEscapeSystem({ bspEngine: this.bsp });
        this.cuts = opts.cuts ?? 3;          // 3 cortes BSP ⇒ 8 hojas
        this.numSnakes = opts.numSnakes ?? 2;
        this.mode = opts.mode ?? 'minesweeper';
        /**
         * La etapa decide si hay serpientes: `CabinetEscapeSystem` sólo las pone
         * de la 2 en adelante. Se usa la 2 para que el entorno tenga el peligro
         * que la persona encuentra, en vez de un mueble sin nada dentro.
         */
        this.etapa = opts.etapa ?? 2;
        this.maxDrawers = 8;
        this._pistas = new Map();            // índice → {snakes, rabbit} ya revelado
    }

    // ─── 🤖 PUERTA NUMÉRICA ──────────────────────────────────────

    reset(seed = 0) {
        this.seed = seed;
        this.t = 0; this.steps = 0; this.done = false; this._lastScore = 0;
        this._pistas.clear();
        /**
         * El mueble se parte primero y el juego lo recibe: es el mismo orden que
         * sigue la página de la persona, y es lo que hace que el mundo sea el
         * mismo por las dos puertas. `fractalPartition` va sembrado con
         * `SeededRNG` y `initEpisode` con `mulberry32(seed + 77777)`.
         */
        const partition = this.bsp.fractalPartition(this.cuts, seed);
        this.sys.initEpisode(partition, seed, this.etapa, this.mode, 'on');
        this.st = this.sys;
        this.maxDrawers = partition.leaves.length;
        return this.getObservation();
    }

    step(action, dt = 1) {
        if (this.done) {
            return { obs: this.getObservation(), reward: 0, done: true, info: { ya: 'terminado' } };
        }
        const idx = Math.max(0, Math.min(this.maxDrawers - 1, Math.trunc(Number(action) || 0)));

        // Abrir un cajón ya abierto no debe ser gratis: si no, un agente puede
        // quedarse en bucle sin riesgo y el horizonte no significa nada.
        if (this.st.tried[idx]) {
            this.steps++; this.t += dt;
            this._lastScore -= 1;
            return { obs: this.getObservation(), reward: -1, done: false,
                     info: { repetido: true, cajon: idx } };
        }

        const r = this.sys.step(idx);
        this.steps++; this.t += dt;
        this._pistas.set(idx, { snakes: this.sys.minesweeperCounts?.[idx] ?? 0, rabbit: 0 });
        this._lastScore += r.reward;

        /**
         * ⚠️ AQUÍ UNA SERPIENTE YA NO MATA, ASÍ QUE EL FINAL LO PONE OTRA COSA.
         *
         * En el motor del banco viejo abrir una serpiente terminaba la partida, y
         * eso hacía de tope natural. En el de la persona cuesta 2 puntos y sigues,
         * que es un juego mejor —te obliga a seguir deduciendo con el susto
         * encima— pero deja el episodio sin final si no encuentras al mapache.
         *
         * El final honesto es quedarse sin cajones: cuando están todos abiertos ya
         * no hay nada que decidir. «Una partida sin final es veneno para el banco»
         * está escrito en `blackjack.js` desde hace tiempo.
         */
        const quedan = this.sys.tried.some((t, i) => !t);
        this.done = !!this.sys.done || !quedan;

        return {
            obs: this.getObservation(),
            reward: r.reward,
            done: this.done,
            info: { cajon: idx, conejo: !!r.foundRaccoon, serpiente: !!r.triggeredSnakeLunge,
                    distancia: r.bspDist, pistas: this._pistas.get(idx) }
        };
    }

    getObservation() {
        const obs = [];
        for (let i = 0; i < 8; i++) {
            if (i >= this.maxDrawers) { obs.push(0, 0, 0); continue; }
            const abierto = this.st?.tried[i] ? 1 : 0;
            const p = this._pistas.get(i);
            obs.push(abierto, p ? p.snakes : -1, p ? p.rabbit : -1);
        }
        obs.push(this.steps, this._restantes());
        return obs;
    }

    getScore() {
        return {
            score: this._lastScore,
            metrics: {
                pasos: this.steps,
                escapado: !!this.st?.found,
                mordido: !!this.st?.dead,
                cajonesAbiertos: this.st ? this.st.tried.filter(Boolean).length : 0
            }
        };
    }

    // ─── 🧠 PUERTA DE LENGUAJE ───────────────────────────────────

    describe() {
        if (!this.st) return 'El archivador aún no está montado. Llama a reset(semilla).';
        /**
         * ⚠️ AQUÍ UNA SERPIENTE YA NO ACABA LA PARTIDA. Este mensaje se queda para
         * el día que alguien vuelva a poner un modo mortal, pero con el motor de la
         * persona `dead` no se enciende: cuesta dos puntos y sigues.
         */
        if (this.st.dead) return `Abriste el cajón equivocado. Una serpiente. Fin de lapartida tras ${this.steps} intentos.`;
        if (this.st.found) return `¡El conejo! Escapaste en ${this.steps} intentos.`;

        const abiertos = [];
        for (let i = 0; i < this.maxDrawers; i++) {
            if (!this.st.tried[i]) continue;
            /**
             * ⚠️ `-1` NO ES UNA CUENTA: ES «AQUÍ NO HAY CUENTA».
             *
             * `minesweeperCounts` arranca a -1 y sólo se rellena en los cajones
             * vacíos. En uno con serpiente el motor sale antes, así que se queda
             * en -1 — y esta puerta decía literalmente «el 0 (-1 serpiente(s) al
             * lado)». Un modelo leyendo eso está leyendo un número imposible y no
             * tiene forma de saber que significa otra cosa.
             */
            const p = this._pistas.get(i);
            const mordio = this.sys.snakeIds?.includes(i);
            abiertos.push(mordio ? `el ${i} (¡había una serpiente!)`
                : (p && p.snakes >= 0) ? `el ${i} (${p.snakes} serpiente(s) al lado)`
                : `el ${i} (vacío, sin pista)`);
        }

        const cerrados = [];
        for (let i = 0; i < this.maxDrawers; i++) if (!this.st.tried[i]) cerrados.push(i);

        return `Archivador de ${this.maxDrawers} cajones con ${this.sys.snakeIds?.length ?? 0} serpiente(s) escondida(s). ` +
               (abiertos.length
                   ? `Ya has abierto ${abiertos.join(', ')}. `
                   : 'No has abierto ninguno todavía. ') +
               `Siguen cerrados: ${cerrados.join(', ')}. ` +
               `Cada cajón vacío te dice cuántas serpientes y conejos hay en los cajones contiguos.`;
    }

    affordances() {
        const lista = [];
        if (this.done) return lista;
        for (let i = 0; i < this.maxDrawers; i++) {
            if (this.st.tried[i]) continue;
            lista.push({
                verb: 'abrir_cajon',
                args: { cajon: i },
                action: i,
                label: `Abrir el cajón ${i}`
            });
        }
        return lista;
    }

    actFromVerb(verb, args = {}) {
        if (verb !== 'abrir_cajon') return null;
        const n = Number(args.cajon);
        return Number.isFinite(n) ? n : null;
    }

    // ─── línea base: el agente contra el que hay que ganar ───────

    /**
     * Vecinos REALES de un cajón.
     *
     * ⚠️ Aquí me equivoqué en la primera versión: usé `idx-1, idx+1`, o sea
     * índices contiguos. Pero el juego define "al lado" por distancia en el
     * ÁRBOL BSP (`bspDistance(pA,pB) <= 2`), que no tiene por qué coincidir con
     * el orden del array. Con vecinos equivocados la línea base apenas ganaba al
     * azar (42,5% frente a 25%) y eso hacía que el entorno pareciera más difícil
     * de lo que es. La adyacencia buena ya estaba escrita: `getBspNeighbors`.
     */
    _vecinos(idx) {
        const bsp = this.bsp;   // el motor de la persona lo llama spEngine; el env tiene el suyo
        if (typeof bsp.getBspNeighbors === 'function') return bsp.getBspNeighbors(idx) ?? [];
        return [];
    }

    /**
     * Política de referencia. NO es la óptima a propósito: la gracia del
     * benchmark es que quede sitio por encima.
     *
     * Regla: si un cajón abierto anunció 0 serpientes alrededor, sus vecinos son
     * seguros. Si anunció conejo, sus vecinos son prometedores. Si no hay
     * información, evita los vecinos de cajones que anunciaron serpiente.
     */
    static baseline(obs, env) {
        const aff = env.affordances();
        if (!aff.length) return 0;
        const cerrado = i => i >= 0 && i < env.maxDrawers && !env.st.tried[i];

        const seguros = [], prometedores = [], sospechosos = new Set();
        for (const [idx, p] of env._pistas) {
            const vec = env._vecinos(idx).filter(cerrado);
            if (p.snakes === 0) seguros.push(...vec);
            else vec.forEach(v => sospechosos.add(v));
            if (p.rabbit > 0) prometedores.push(...vec);
        }

        // 1. Vecino de un cajón que anunció conejo Y no es sospechoso.
        const apuesta = prometedores.find(v => !sospechosos.has(v));
        if (apuesta !== undefined) return apuesta;
        // 2. Seguro confirmado (vecino de un "0 serpientes").
        if (seguros.length) return seguros[0];
        // 3. Cualquiera que no esté marcado como sospechoso.
        const limpio = aff.find(a => !sospechosos.has(a.action));
        if (limpio) return limpio.action;
        // 4. No queda nada limpio: hay que arriesgar.
        return aff[0].action;
    }

    _restantes() {
        if (!this.st) return 0;
        return this.st.tried.filter(x => !x).length;
    }
}
