import { GymEnv } from '../GymEnv.js';
import { AsteroidsSystem } from '../../world/systems/AsteroidsSystem.js';

/**
 * AsteroidsEnv — PRIMER ENTORNO DEL BENCHMARK
 * ═══════════════════════════════════════════════════════════════
 * Envuelve el AsteroidsSystem (matemática pura, ya corría headless) en el
 * contrato de las tres puertas. Esquiva asteroides; disparas solo.
 *
 * 🤖 numérica : obs de 14 números, acción continua [tx, ty] ∈ [-1,1]
 * 🧠 lenguaje : 6 verbos de esquiva (capa SCUMM) → el LLM razona en afordancias
 * 🕹️ humana   : el lab lo pinta y lo juegas con el ratón
 *
 * ⚠ DETERMINISMO: el sistema usa Math.random() internamente. Aquí lo
 * sustituimos por un PRNG sembrado (mulberry32) mientras corre el episodio,
 * así la misma semilla da la misma partida. Es un puente honesto hasta que
 * los systems usen DeterministicMath de serie.
 */
const NEAR = 4;   // cuántos asteroides cercanos entran en la observación

/**
 * ⚠️ El tamaño se DEDUCE de los nombres. No se escribe a mano.
 *
 * Aquí ponía `shape: [14]` mientras `names` calculaba 16 (4 de la nave + 4
 * asteroides × 3). Un agente que se fiara del espacio declarado reservaría 14
 * huecos y recibiría 16 números: se los comería desplazados y "aprendería"
 * sobre una observación torcida, sin un solo error en consola.
 *
 * Un número a mano al lado de una lista calculada se desincroniza siempre; solo
 * es cuestión de cuándo. Lo cazó recorrer el catálogo entero de golpe — probando
 * los entornos de uno en uno nunca salió.
 */
const NOMBRES_OBS = [
    'ship_x', 'ship_y', 'energy', 'invuln',
    ...Array.from({ length: NEAR }, (_, i) => [`a${i}_dx`, `a${i}_dy`, `a${i}_dz`]).flat(),
];

export class AsteroidsEnv extends GymEnv {
    static id = 'alisa/Pedrisco-v0';
    static observationSpace = {
        shape: [NOMBRES_OBS.length],
        names: NOMBRES_OBS,
        low: -1, high: 1,
    };
    /** [tx, ty, fire] — posición objetivo + disparar (>0.5). El agente decide CUÁNDO tirar. */
    static actionSpace = { type: 'continuous', shape: [3], names: ['tx', 'ty', 'fire'], low: -1, high: 1 };
    static meta = {
        title: 'Asteroides Soberanos',
        summary: 'Alinéate para disparar, destruye asteroides y esquiva los que no puedas romper. ' +
                 'Tensión real: apuntar te expone, esquivar no puntúa.',
        horizon: 1800, tags: ['esquiva', 'puntería', 'riesgo-recompensa', '3d', 'continuo'],
    };

    constructor(opts = {}) { super(opts); this.sys = new AsteroidsSystem(); this._rng = null; }

    // PRNG sembrado — determinismo por semilla
    _mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    _withSeed(fn) {                    // ejecuta con Math.random sembrado
        const real = Math.random; Math.random = this._rng;
        try { return fn(); } finally { Math.random = real; }
    }

    reset(seed = 0) {
        this.seed = seed; this._rng = this._mulberry32(seed >>> 0);
        this.sys = new AsteroidsSystem();
        this.sys.externalControl = true;   // ← el AGENTE conduce, no el piloto automático
        this._withSeed(() => this.sys.start({ stage: 1, shipClass: 'VIPER', asteroidDensity: 12, scrollSpeed: 22 }));
        this.t = 0; this.steps = 0; this.done = false; this._lastScore = 0; this._prevScore = 0;
        return this.getObservation();
    }

    step(action, dt = 1 / 60) {
        const s = this.sys;
        if (s.ship && !s.ship.dead) {          // acción = [posición objetivo normalizada, disparar]
            const a = Array.isArray(action) ? action
                    : [action?.tx ?? 0, action?.ty ?? 0, action?.fire ?? 0];
            const [tx = 0, ty = 0, fire = 0] = a;
            s.ship.tx = Math.max(-1, Math.min(1, tx)) * (s.ARENA_W / 2);
            s.ship.ty = Math.max(-1, Math.min(1, ty)) * (s.ARENA_H / 2);
            s.ship.wantFire = fire > 0.5;      // ← el agente decide cuándo disparar
        }
        this._withSeed(() => s.tick(dt));
        this.t += dt; this.steps++;

        const sc = s.stats.score || 0;
        let reward = (sc - this._prevScore) + dt * 0.1;      // puntos + supervivencia
        this._prevScore = sc; this._lastScore = sc;
        if (s.stats.deaths > 0) { reward -= 10; this.done = true; }
        if (this.steps >= AsteroidsEnv.meta.horizon) this.done = true;

        return { obs: this.getObservation(), reward, done: this.done,
                 info: { t: +this.t.toFixed(2), score: sc, deaths: s.stats.deaths } };
    }

    /** Los NEAR asteroides más cercanos, en coordenadas relativas a la nave. */
    _nearest() {
        const s = this.sys, sh = s.ship;
        if (!sh) return [];
        return (s.asteroids || [])
            .filter(a => a.z > s.globalZ)
            .map(a => ({ a, d: Math.hypot(a.x - sh.x, a.y - sh.y, (a.z - sh.z) * 0.5) }))
            .sort((p, q) => p.d - q.d).slice(0, NEAR).map(p => p.a);
    }

    getObservation() {
        const s = this.sys, sh = s.ship;
        const o = sh ? [sh.x / (s.ARENA_W / 2), sh.y / (s.ARENA_H / 2), s.energy / 100, sh.invuln > 0 ? 1 : 0]
                     : [0, 0, 0, 0];
        const near = this._nearest();
        for (let i = 0; i < NEAR; i++) {
            const a = near[i];
            if (a && sh) o.push((a.x - sh.x) / (s.ARENA_W / 2), (a.y - sh.y) / (s.ARENA_H / 2),
                                Math.min(1, (a.z - sh.z) / s.VISIBLE_Z));
            else o.push(0, 0, 1);
        }
        return o.map(v => +(+v).toFixed(4));
    }

    // ─── PUERTA DE LENGUAJE (agentes LLM) ────────────────────────
    describe() {
        const s = this.sys, sh = s.ship;
        if (!sh) return 'La nave no existe.';
        if (sh.dead) return 'Tu nave ha sido destruida. Partida terminada.';
        const near = this._nearest();
        const lado = x => x < -0.15 ? 'a tu izquierda' : x > 0.15 ? 'a tu derecha' : 'justo delante';
        const alto = y => y < -0.15 ? 'por abajo' : y > 0.15 ? 'por arriba' : 'a tu altura';
        const amenazas = near.slice(0, 3).map((a, i) => {
            const dx = (a.x - sh.x) / (s.ARENA_W / 2), dy = (a.y - sh.y) / (s.ARENA_H / 2);
            const dz = Math.round(a.z - sh.z);
            return `  ${i + 1}. asteroide ${lado(dx)} y ${alto(dy)}, a ${dz} de distancia`;
        }).join('\n') || '  (ninguna cerca)';
        return `Pilotas una nave en un campo de asteroides. TÚ decides cuándo disparar; ` +
               `solo aciertas si estás alineado con el objetivo (misma x, ±8).\n` +
               `Estás en x=${sh.x.toFixed(1)}, y=${sh.y.toFixed(1)} (arena ${s.ARENA_W}×${s.ARENA_H}).\n` +
               `Puntuación ${s.stats.score} · tiempo ${this.t.toFixed(1)}s${sh.invuln > 0 ? ' · INVULNERABLE' : ''}\n` +
               `Amenazas más próximas:\n${amenazas}`;
    }

    affordances() {
        const s = this.sys, sh = s.ship || { x: 0, y: 0 };
        const nx = sh.x / (s.ARENA_W / 2), ny = sh.y / (s.ARENA_H / 2), P = 0.45;
        // objetivo: la amenaza más próxima (para el verbo de apuntar)
        const near = this._nearest()[0];
        const ax = near ? Math.max(-1, Math.min(1, near.x / (s.ARENA_W / 2))) : nx;
        const ay = near ? Math.max(-1, Math.min(1, near.y / (s.ARENA_H / 2))) : ny;
        return [
            { verb: 'esquivar_izquierda', label: 'Apartarse a la izquierda', action: [Math.max(-1, nx - P), ny, 0] },
            { verb: 'esquivar_derecha',   label: 'Apartarse a la derecha',   action: [Math.min(1, nx + P), ny, 0] },
            { verb: 'subir',              label: 'Ascender',                 action: [nx, Math.min(1, ny + P), 0] },
            { verb: 'bajar',              label: 'Descender',                action: [nx, Math.max(-1, ny - P), 0] },
            { verb: 'centrar',            label: 'Volver al centro',         action: [0, 0, 0] },
            { verb: 'mantener',           label: 'Mantener rumbo',           action: [nx, ny, 0] },
            { verb: 'disparar',           label: 'Disparar sin moverse',     action: [nx, ny, 1] },
            { verb: 'apuntar_y_disparar', label: 'Alinearse con la amenaza y disparar', action: [ax, ay, 1] },
        ];
    }

    getScore() {
        const st = this.sys.stats;
        return { score: st.score,
                 metrics: { tiempo: +this.t.toFixed(2), muertes: st.deaths, roces: st.graze,
                            mejor_racha: st.bestStreak, pasos: this.steps } };
    }
}
