import { GymEnv } from '../GymEnv.js';
import { RaccoonSpaceCore, VERBOS_ESPACIO } from '../../world/systems/RaccoonSpaceCore.js';

/**
 * RaccoonSpaceEnv — etapa 7 de la matrioska
 * ═══════════════════════════════════════════════════════════════════════════
 * Busca al mapache por los planetas antes de quedarte sin combustible.
 *
 * 🤖 numérica : 22 números, acción discreta 0..7
 * 🧠 lenguaje : `describe()` cuenta lo que ve el piloto; `affordances()` solo
 *               ofrece `escanear` cuando hay un planeta al alcance
 * 🕹️ humana   : `games/raccoon_space.html` — W empuje, A/D timón, Q/E morro
 *
 * QUÉ MIDE QUE OTROS NO
 * Es un problema de BÚSQUEDA con presupuesto: el combustible se gasta aunque no
 * hagas nada, y escanear al vacío también cuesta. No basta con sobrevivir ni
 * con ir rápido — hay que decidir a qué planeta ir primero con información
 * incompleta. Los demás entornos premian reflejos; este premia el plan.
 *
 * A diferencia de Marabunta, aquí NO hacía falta `DeterministicScope`: el núcleo no
 * llama a `Math.random()` ni una vez. Toda su aleatoriedad sale de `mulberry32`
 * sembrado en `reset(semilla)`. Cuando el system está bien hecho, el enchufe del
 * gym es más pequeño — y esa es justo la señal de que está bien hecho.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export class RaccoonSpaceEnv extends GymEnv {
    static id = 'alisa/RaccoonSpace-v0';

    static observationSpace = {
        shape: [22],
        names: [
            'x', 'y', 'z', 'vx', 'vy', 'vz', 'guinada', 'cabeceo', 'combustible',
            'ast0_dx', 'ast0_dy', 'ast0_dz', 'ast1_dx', 'ast1_dy', 'ast1_dz',
            'pla0_dx', 'pla0_dy', 'pla0_dz', 'pla1_dx', 'pla1_dy', 'pla1_dz',
            'escaner_listo',
        ],
        low: -1, high: 1,
    };

    static actionSpace = { type: 'discrete', n: VERBOS_ESPACIO.length, names: VERBOS_ESPACIO };

    static meta = {
        title: '¡Busca! 6 — Espacio',
        summary: 'Encuentra el planeta donde se esconde el mapache antes de quedarte sin ' +
                 'combustible. Moverse cuesta, escanear en balde también, y el soporte ' +
                 'vital gasta aunque estés quieto.',
        horizon: 5400,
        tags: ['busqueda', 'presupuesto', 'exploracion', '3d', 'discreto'],
    };

    constructor(opts = {}) {
        super(opts);
        this.opts = opts;
        this.sys = new RaccoonSpaceCore(opts);
    }

    reset(seed = 0) {
        this.seed = seed >>> 0;
        this.sys = new RaccoonSpaceCore({ ...this.opts, seed: this.seed });
        this.steps = 0;
        this.done = false;
        return this.getObservation();
    }

    step(action, dt = 1 / 60) {
        const r = this.sys.step(action, dt);
        this.steps++;
        this.done = r.done;
        return r;
    }

    getObservation() { return this.sys.observacion(); }

    describe() {
        const s = this.sys;
        const i = s.info();
        const pct = Math.round(100 * s.combustible / (s.combustibleInicial || 1));
        const partes = [
            `Combustible al ${pct}% (${Math.round(s.combustible)} de ${s.combustibleInicial}).`,
            `Has escaneado ${i.escaneados} de ${i.total} planetas.`,
        ];

        const p = s.planetaCerca();
        partes.push(p
            ? (p.escaneado
                ? 'Tienes un planeta al alcance, pero ya lo escaneaste.'
                : 'Tienes un planeta SIN ESCANEAR al alcance del escáner.')
            : 'No hay ningún planeta al alcance.');

        // Al piloto se le dice hacia dónde queda el más próximo, no dónde está
        // el mapache: la gracia del entorno es que esa parte no se sabe.
        const sinEscanear = s.planetas.filter(x => !x.escaneado);
        if (sinEscanear.length && !p) {
            const n = s.nave;
            const cerca = sinEscanear
                .map(o => ({ o, d: Math.hypot(o.x - n.x, o.y - n.y, o.z - n.z) }))
                .sort((a, b) => a.d - b.d)[0];
            const dir = [];
            if (Math.abs(cerca.o.x - n.x) > 20) dir.push(cerca.o.x > n.x ? 'a estribor' : 'a babor');
            if (Math.abs(cerca.o.y - n.y) > 20) dir.push(cerca.o.y > n.y ? 'arriba' : 'abajo');
            partes.push(`El planeta sin escanear más cercano está a ${Math.round(cerca.d)} unidades${dir.length ? ', ' + dir.join(' y ') : ''}.`);
        }

        const astCerca = s.asteroides
            .map(a => Math.hypot(a.x - s.nave.x, a.y - s.nave.y, a.z - s.nave.z))
            .filter(d => d < 40).length;
        if (astCerca) partes.push(`Tienes ${astCerca} asteroide(s) cerca.`);

        if (s.encontrado) partes.push('¡Has encontrado al mapache!');
        if (s.muerto) partes.push('Te has quedado sin combustible.');
        return partes.join(' ');
    }

    affordances() {
        const s = this.sys;
        if (s.terminado()) return [];

        const lista = [
            { verb: 'empujar',      args: {}, desc: 'Acelerar hacia donde apunta el morro (gasta combustible)' },
            { verb: 'frenar',       args: {}, desc: 'Empujar hacia atrás (gasta igual)' },
            { verb: 'girar_izq',    args: {}, desc: 'Timón a babor' },
            { verb: 'girar_der',    args: {}, desc: 'Timón a estribor' },
            { verb: 'morro_arriba', args: {}, desc: 'Levantar el morro' },
            { verb: 'morro_abajo',  args: {}, desc: 'Bajar el morro' },
            { verb: 'nada',         args: {}, desc: 'Dejarse llevar por la inercia (solo gasta el soporte vital)' },
        ];

        // `escanear` solo se ofrece si sirve de algo. Ofrecerlo siempre
        // enseñaría al agente a malgastar, y penalizarlo después sería tramposo.
        const p = s.planetaCerca();
        if (p && !p.escaneado) {
            lista.unshift({ verb: 'escanear', args: {}, desc: 'Escanear el planeta que tienes al alcance' });
        }
        return lista;
    }
}

export default RaccoonSpaceEnv;
