import { GymEnv } from '../GymEnv.js';
import { ECSWorld, TransformComponent } from '../../world/OverworldECS.js';
import { HidingSpotComponent } from '../../world/systems/HidingSpotSystem.js';
import { CorporateSeekerSystem } from '../../world/systems/CorporateSeekerSystem.js';

/**
 * RueDelPercebeEnv — EL ENTORNO NATIVO PARA LLM
 * ═══════════════════════════════════════════════════════════════
 * Reconstrucción ECS del monolito `croupier_corporate_building.html` (abr-2026,
 * 133 KB, "13 Rue del Percebe"): un edificio de N plantas donde se esconde un
 * mapache y tú lo buscas puerta por puerta con pistas FRÍO/TIBIO/CALIENTE.
 *
 * POR QUÉ IMPORTA: no mide reflejos, mide **deducción bajo incertidumbre con
 * presupuesto limitado** — el terreno donde un LLM puede ganar de verdad.
 *   "Comprobé la 3ª planta y salió FRÍO, así que no está en la 2, 3 ni 4.
 *    La 7ª salió TIBIO, así que apunto a la 5-9. Me quedan 6 intentos…"
 *
 * TRES PUERTAS SOBRE EL MISMO PROBLEMA:
 *   🤖 numérica  obs = historial de comprobaciones codificado
 *   🧠 lenguaje  verbos `comprobar_puerta` / `comprobar_escondite` / `ir_a_planta`
 *   ⚙️ FSM       `CorporateSeekerSystem` (agente bayesiano YA ESCRITO) = el baseline
 *
 * ECS: cada puerta/escondite es una ENTIDAD con `HidingSpotComponent`
 * (el componente original del motor) + `TransformComponent`. Nada de monolito.
 */
export class RueDelPercebeEnv extends GymEnv {
    static id = 'alisa/RueDelPercebe-v0';
    static observationSpace = {
        shape: [26],
        names: ['planta_actual', 'intentos_restantes', 'ultimo_resultado',
                ...Array.from({ length: 8 }, (_, i) => [`p${i}_comprobada`, `p${i}_pistas`]).flat(),
                ...Array.from({ length: 7 }, (_, i) => `hist${i}`)],
        low: -1, high: 1,
    };
    static actionSpace = {
        type: 'verb',
        verbs: ['comprobar_puerta', 'comprobar_escondite', 'ir_a_planta'],
        note: 'Espacio de acciones SEMÁNTICO — pensado para agentes de lenguaje.',
    };
    static meta = {
        title: '13 Rue del Percebe',
        summary: 'Un mapache se esconde en el edificio. Encuéntralo con el menor número de ' +
                 'comprobaciones. Cada intento devuelve FRÍO/TIBIO/CALIENTE según lo cerca que estés.',
        horizon: 40, tags: ['deducción', 'búsqueda', 'incertidumbre', 'llm-nativo', 'verbos'],
    };

    constructor(opts = {}) {
        super(opts);
        this.floors = opts.floors || 8;
        this.doorsPerFloor = opts.doorsPerFloor || 3;
        this.budget = opts.budget || 14;      // intentos antes de perder
        this.ecs = null;
    }

    _rng(seed) {
        let a = seed >>> 0;
        return () => { a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    }

    reset(seed = 0) {
        this.seed = seed;
        const rnd = this._rng(seed);
        // ── EL EDIFICIO COMO ENTIDADES ECS ──
        this.ecs = new ECSWorld();
        this.spots = [];                       // {id, floor, index, kind}
        for (let f = 0; f < this.floors; f++) {
            for (let d = 0; d < this.doorsPerFloor; d++) {
                const id = this.ecs.createEntity();
                this.ecs.addComponent(id, 'TransformComponent', TransformComponent(d * 4 - 4, f * 3, 0));
                this.ecs.addComponent(id, 'HidingSpotComponent', HidingSpotComponent({
                    label: `puerta ${String.fromCharCode(65 + d)} · planta ${f + 1}`,
                }));
                this.spots.push({ id, floor: f, index: d, kind: 'puerta' });
            }
            if (rnd() < 0.5) {                 // algunas plantas tienen un escondite extra
                const id = this.ecs.createEntity();
                this.ecs.addComponent(id, 'TransformComponent', TransformComponent(6, f * 3, 0));
                this.ecs.addComponent(id, 'HidingSpotComponent', HidingSpotComponent({
                    label: `armario · planta ${f + 1}`,
                }));
                this.spots.push({ id, floor: f, index: this.doorsPerFloor, kind: 'escondite' });
            }
        }
        // ── EL MAPACHE ──
        const pick = this.spots[Math.floor(rnd() * this.spots.length)];
        this.ecs.getComponent(pick.id, 'HidingSpotComponent').hasRaccoon = true;
        this.raccoon = pick;

        this.currentFloor = 0;
        this.checks = [];                      // historial: {floor, index, kind, result}
        this.lastResult = null;
        this.t = 0; this.steps = 0; this.done = false; this.found = false;
        return this.getObservation();
    }

    /** FRÍO/TIBIO/CALIENTE según la distancia en plantas al mapache. */
    _hint(floor) {
        const d = Math.abs(floor - this.raccoon.floor);
        return d === 0 ? 'CALIENTE' : d <= 2 ? 'TIBIO' : 'FRÍO';
    }

    /** Acción semántica: {verb, floor, index} */
    step(action, dt = 1) {
        if (this.done) return { obs: this.getObservation(), reward: 0, done: true, info: { fin: true } };
        const { verb, floor = this.currentFloor, index = 0 } = action || {};
        let reward = 0, info = {};
        this.steps++; this.t += dt;

        if (verb === 'ir_a_planta') {
            this.currentFloor = Math.max(0, Math.min(this.floors - 1, floor));
            reward = -0.05;                    // moverse es barato pero no gratis
            info = { movido_a: this.currentFloor + 1 };
        } else if (verb === 'comprobar_puerta' || verb === 'comprobar_escondite') {
            const kind = verb === 'comprobar_puerta' ? 'puerta' : 'escondite';
            const spot = this.spots.find(s => s.floor === this.currentFloor && s.index === index && s.kind === kind);
            if (!spot) { reward = -1; info = { error: 'ahí no hay nada' }; }
            else {
                const c = this.ecs.getComponent(spot.id, 'HidingSpotComponent');
                if (c.isSearched) { reward = -1; info = { resultado: 'YA_COMPROBADO' }; }
                else {
                    c.isSearched = true;
                    const result = c.hasRaccoon ? '¡ENCONTRADO!' : this._hint(this.currentFloor);
                    this.lastResult = result;
                    this.checks.push({ floor: this.currentFloor, index, kind, result });
                    if (c.hasRaccoon) {
                        this.found = true; this.done = true;
                        reward = 100 - this.checks.length * 3;   // premia encontrarlo PRONTO
                    } else {
                        reward = result === 'CALIENTE' ? 1 : result === 'TIBIO' ? 0.3 : -0.2;
                    }
                    info = { resultado: result, comprobaciones: this.checks.length };
                }
            }
        } else { reward = -1; info = { error: `verbo desconocido: ${verb}` }; }

        if (!this.done && this.checks.length >= this.budget) { this.done = true; info.fin = 'sin intentos'; reward -= 20; }
        return { obs: this.getObservation(), reward, done: this.done, info };
    }

    getObservation() {
        const o = [this.currentFloor / this.floors,
                   (this.budget - this.checks.length) / this.budget,
                   this.lastResult === '¡ENCONTRADO!' ? 1 : this.lastResult === 'CALIENTE' ? 0.66
                     : this.lastResult === 'TIBIO' ? 0.33 : this.lastResult === 'FRÍO' ? -0.33 : 0];
        for (let f = 0; f < 8; f++) {
            const en = this.spots.filter(s => s.floor === f);
            const done = en.filter(s => this.ecs.getComponent(s.id, 'HidingSpotComponent').isSearched).length;
            o.push(en.length ? done / en.length : 1);
            const hints = this.checks.filter(c => c.floor === f);
            o.push(hints.length ? (hints[hints.length - 1].result === 'CALIENTE' ? 1
                                 : hints[hints.length - 1].result === 'TIBIO' ? 0.4 : -0.6) : 0);
        }
        this.checks.slice(-7).forEach(c => o.push(c.floor / this.floors));
        while (o.length < 26) o.push(0);
        return o.slice(0, 26).map(v => +(+v).toFixed(3));
    }

    // ─── PUERTA DE LENGUAJE ──────────────────────────────────────
    describe() {
        // Para mirar no hace falta haber empezado: `describe()` es la puerta por
        // la que se asoma quien acaba de descargarse el banco, y sin partida esto
        // reventaba leyendo `this.checks.length`. Se siembra con 0, igual que el
        // `reset` por defecto, así que se ve la partida inicial de siempre.
        if (!this.checks) this.reset(0);
        if (this.found) return `¡Encontraste al mapache en ${this.raccoon.floor + 1}ª planta tras ${this.checks.length} comprobaciones!`;
        if (this.done) return `Se acabaron los intentos. El mapache estaba en la ${this.raccoon.floor + 1}ª planta.`;
        const hist = this.checks.length
            ? this.checks.map(c => `  · planta ${c.floor + 1}, ${c.kind} ${c.kind === 'puerta' ? String.fromCharCode(65 + c.index) : ''} → ${c.result}`).join('\n')
            : '  (aún no has comprobado nada)';
        const aquí = this.spots.filter(s => s.floor === this.currentFloor);
        const libres = aquí.filter(s => !this.ecs.getComponent(s.id, 'HidingSpotComponent').isSearched);
        return `Edificio de ${this.floors} plantas. Un mapache se esconde en una puerta o armario.\n` +
               `Estás en la planta ${this.currentFloor + 1}. Te quedan ${this.budget - this.checks.length} comprobaciones.\n` +
               `Cada comprobación te dice CALIENTE (misma planta), TIBIO (a 1-2 plantas) o FRÍO (más lejos).\n` +
               `Aquí quedan sin comprobar: ${libres.map(s => s.kind === 'puerta' ? `puerta ${String.fromCharCode(65 + s.index)}` : 'armario').join(', ') || 'nada'}\n` +
               `Historial:\n${hist}`;
    }

    affordances() {
        const a = [];
        for (const s of this.spots.filter(s => s.floor === this.currentFloor)) {
            if (this.ecs.getComponent(s.id, 'HidingSpotComponent').isSearched) continue;
            a.push({ verb: s.kind === 'puerta' ? 'comprobar_puerta' : 'comprobar_escondite',
                     args: { index: s.index },
                     label: s.kind === 'puerta' ? `Abrir la puerta ${String.fromCharCode(65 + s.index)}` : 'Mirar en el armario',
                     action: { verb: s.kind === 'puerta' ? 'comprobar_puerta' : 'comprobar_escondite',
                               floor: this.currentFloor, index: s.index } });
        }
        for (let f = 0; f < this.floors; f++) {
            if (f === this.currentFloor) continue;
            a.push({ verb: 'ir_a_planta', args: { floor: f }, label: `Subir/bajar a la planta ${f + 1}`,
                     action: { verb: 'ir_a_planta', floor: f } });
        }
        return a;
    }

    actFromVerb(verb, args = {}) {
        return { verb, floor: args.floor ?? this.currentFloor, index: args.index ?? 0 };
    }

    getScore() {
        return { score: this.found ? Math.max(0, 100 - this.checks.length * 3) : 0,
                 metrics: { encontrado: this.found, comprobaciones: this.checks.length,
                            planta_mapache: this.raccoon.floor + 1, pasos: this.steps } };
    }

    /** Baseline FSM: el agente bayesiano que YA existía en el motor. */
    static bayesianBaseline(env) {
        const seeker = new CorporateSeekerSystem();
        const fd = Array.from({ length: env.floors }, (_, f) => ({
            doorsCount: env.spots.filter(s => s.floor === f && s.kind === 'puerta').length,
            spotsCount: env.spots.filter(s => s.floor === f && s.kind === 'escondite').length }));
        seeker.reset(env.floors, fd);
        return () => {
            const target = seeker.pickBestFloor(env.floors, fd);
            if (target !== -1 && target !== env.currentFloor) return { verb: 'ir_a_planta', floor: target };
            const libre = env.spots.find(s => s.floor === env.currentFloor &&
                !env.ecs.getComponent(s.id, 'HidingSpotComponent').isSearched);
            if (!libre) { seeker.exploredFloors.add(env.currentFloor); seeker.normalizeBeliefs();
                          return { verb: 'ir_a_planta', floor: (env.currentFloor + 1) % env.floors }; }
            const act = { verb: libre.kind === 'puerta' ? 'comprobar_puerta' : 'comprobar_escondite',
                          floor: env.currentFloor, index: libre.index };
            act.__after = r => seeker.updateBeliefs(env.currentFloor,
                r === 'CALIENTE' ? 'HOT' : r === 'TIBIO' ? 'WARM' : 'COLD', env.floors);
            return act;
        };
    }
}
