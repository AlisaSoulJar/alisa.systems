/**
 * CabinetEscapeEnv — el archivador, como entorno de gym
 * ═══════════════════════════════════════════════════════════════════════════
 * `alisa/CabinetEscape-v0`
 *
 * NO simula nada por su cuenta: envuelve `ScummInteractionEngine`, que ya
 * estaba escrito en el motor y ya era un entorno completo (episodios
 * semillados, reward shaping, partición BSP). Solo le pone las tres puertas.
 *
 * Es la prueba de fuego del contrato: si `GymEnv` solo encajara con entornos
 * escritos a medida para él, no valdría como producto. Aquí encaja sobre
 * código anterior y ajeno, sin tocarlo.
 *
 * EL JUEGO
 * --------
 * Un archivador partido por BSP en N cajones. En uno está el conejo (la salida),
 * en otros hay serpientes. Abres cajones de uno en uno. Serpiente = muerte.
 * En modo `minesweeper` cada cajón vacío te dice cuántas serpientes y cuántos
 * conejos toca — de ahí que sea un problema de inferencia, no de reflejos.
 *
 * Por qué es un buen banco de pruebas: separa razonar de reaccionar. Un LLM
 * puede jugarlo perfecto sin ver un solo píxel ni tener buenos reflejos, cosa
 * que no pasa con Asteroids.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { GymEnv } from '../GymEnv.js';
import { ScummInteractionEngine } from '../../world/systems/ScummInteractionEngine.js';

export class CabinetEscapeEnv extends GymEnv {
    static id = 'alisa/CabinetEscape-v0';

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
        this.sys = new ScummInteractionEngine();
        this.cuts = opts.cuts ?? 3;          // 3 cortes BSP ⇒ 8 hojas
        this.numSnakes = opts.numSnakes ?? 2;
        this.mode = opts.mode ?? 'minesweeper';
        this.maxDrawers = 8;
        this._pistas = new Map();            // índice → {snakes, rabbit} ya revelado
    }

    // ─── 🤖 PUERTA NUMÉRICA ──────────────────────────────────────

    reset(seed = 0) {
        this.seed = seed;
        this.t = 0; this.steps = 0; this.done = false; this._lastScore = 0;
        this._pistas.clear();
        // initEpisode(seed, cuts, stage, numSnakes, bats, mode) — ya es determinista:
        // usa SeededRNG internamente, no Math.random.
        this.st = this.sys.initEpisode(seed, this.cuts, 1, this.numSnakes, 0, this.mode);
        this.maxDrawers = this.st.partition.leaves.length;
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

        const r = this.sys.selectDrawer(idx);
        this.steps++; this.t += dt;
        this._pistas.set(idx, r.adjacent ?? { snakes: 0, rabbit: 0 });
        this.done = this.st.done;
        this._lastScore += r.reward;

        return {
            obs: this.getObservation(),
            reward: r.reward,
            done: this.done,
            info: { cajon: idx, conejo: r.found, serpiente: r.snake, pistas: r.adjacent }
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
        if (this.st.dead) return `Abriste el cajón equivocado. Una serpiente. Fin de la partida tras ${this.steps} intentos.`;
        if (this.st.found) return `¡El conejo! Escapaste en ${this.steps} intentos.`;

        const abiertos = [];
        for (let i = 0; i < this.maxDrawers; i++) {
            if (!this.st.tried[i]) continue;
            const p = this._pistas.get(i);
            abiertos.push(p
                ? `el ${i} (${p.snakes} serpiente(s) y ${p.rabbit} conejo(s) al lado)`
                : `el ${i}`);
        }

        const cerrados = [];
        for (let i = 0; i < this.maxDrawers; i++) if (!this.st.tried[i]) cerrados.push(i);

        return `Archivador de ${this.maxDrawers} cajones con ${this.numSnakes} serpiente(s) escondida(s). ` +
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
        const bsp = this.sys.bsp;
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
