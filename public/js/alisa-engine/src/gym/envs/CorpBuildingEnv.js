import { GymEnv } from '../GymEnv.js';
import { crearBandas, calorDe } from '../../world/core/Bandas.js';
import { ECSWorld, TransformComponent } from '../../world/OverworldECS.js';
import { HidingSpotComponent } from '../../world/systems/HidingSpotSystem.js';
import { CorporateSeekerSystem } from '../../world/systems/CorporateSeekerSystem.js';

/**
 * CorpBuildingEnv — EL ENTORNO NATIVO PARA LLM
 * ═══════════════════════════════════════════════════════════════
 * Reconstrucción ECS del monolito `croupier_corporate_building.html` (abr-2026,
 * 133 KB, "13 Corp Building"): un edificio de N plantas donde se esconde un
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
export class CorpBuildingEnv extends GymEnv {
    static id = 'alisa/CorpBuilding-v0';
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
        title: '13 Corp Building',
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

    /**
     * Cómo de cerca está una planta del mapache, en la escala común del banco.
     *
     * ⚠️ ANTES DECÍA `CALIENTE`/`TIBIO`/`FRÍO` Y ERA UN IDIOMA PROPIO.
     *
     * `RaccoonSpaceCore` usa cinco peldaños —caliente · templado · fresco · frío
     * · helado— calibrados a quintiles medidos, y aquí había tres puestos a
     * mano y en mayúsculas. O sea que **«caliente» quería decir cosas distintas
     * en dos juegos del mismo banco**, y «TIBIO» no existía en el otro.
     *
     * Un agente que aprende a leer una escala se equivoca con la otra, y eso no
     * es dificultad del juego: es ruido de vocabulario que el banco le mete
     * encima.
     *
     * Los CORTES siguen siendo de aquí —cuentan plantas enteras, no distancias
     * normalizadas— y sólo se comparten las palabras. Igualar los cortes sería
     * inventarse una calibración que nadie ha medido.
     *
     * Tres peldaños de la escala de cinco, no tres palabras nuevas: este juego
     * da una pista más gruesa, y decirlo con menos peldaños de la MISMA escala
     * es exactamente lo que hay que decir.
     */
    _hint(floor) {
        return CorpBuildingEnv._banda(Math.abs(floor - this.raccoon.floor));
    }

    static _banda = crearBandas([[1, 'caliente'], [3, 'fresco'], [Infinity, 'helado']]);

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
                        reward = result === 'caliente' ? 1 : result === 'fresco' ? 0.3 : -0.2;
                    }
                    info = { resultado: result, comprobaciones: this.checks.length };
                }
            }
        } else { reward = -1; info = { error: `verbo desconocido: ${verb}` }; }

        if (!this.done && this.checks.length >= this.budget) { this.done = true; info.fin = 'sin intentos'; reward -= 20; }
        return { obs: this.getObservation(), reward, done: this.done, info };
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL SUSTRATO — Y AQUÍ SÍ HAY REJILLA DE VERDAD
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Mismo contrato que publican los 24 juegos del arcade, para que un
     * dibujante pueda pintar esto sin saber a qué se juega.
     *
     * Este edificio es una cuadrícula honrada: **plantas × escondites**. Cada
     * escondite tiene su planta y su índice dentro de ella, así que la rejilla no
     * hay que inventarla — ya está en los datos. Es lo contrario del acuario o
     * del espacio, que son volúmenes continuos y no publican ninguna.
     *
     * ⚠️ VA EN EL ENTORNO Y NO EN UN MOTOR, PORQUE EL ESTADO ESTÁ AQUÍ.
     * Éste es el otro juego de la casa que ya era ECS, y su mundo vive en
     * `this.ecs`, no en un `System` aparte. El sustrato se publica donde está el
     * estado; ponerlo en otro sitio obligaría a copiarlo, y una copia es un sitio
     * donde separarse.
     *
     * ⚠️ Y SÓLO SE DIBUJA LO QUE EL JUGADOR SABE.
     * Un escondite sin registrar sale como `sin_mirar`. Publicar dónde está el
     * mapache pondría la solución en el sustrato, y cualquiera que lo lea —un
     * dibujante o un agente— la vería. Misma regla que vigila `sustrato:secreto`.
     */
    sustrato() {
        const porPlanta = new Map();
        for (const s of this.spots) {
            if (!porPlanta.has(s.floor)) porPlanta.set(s.floor, 0);
            porPlanta.set(s.floor, Math.max(porPlanta.get(s.floor), s.index + 1));
        }
        const ancho = Math.max(1, ...porPlanta.values());
        const alto = this.floors;

        const celdas = new Array(ancho * alto).fill(0);
        const piezas = [];
        for (const s of this.spots) {
            const c = this.ecs.getComponent(s.id, 'HidingSpotComponent');
            const visto = !!c?.isSearched;
            const esElBueno = visto && this.raccoon && s.id === this.raccoon.id;
            celdas[s.floor * ancho + s.index] = 1;          // aquí hay escondite
            piezas.push({
                x: s.index, y: s.floor, de: 0,
                t: esElBueno ? 'mapache' : visto ? 'mirado' : 'sin_mirar',
                clase: s.kind,
            });
        }
        // Dónde está el jugador, que es una planta entera y no una celda.
        piezas.push({ x: 0, y: this.currentFloor, t: 'tu_planta', de: 1 });

        return {
            rejilla: { ancho, alto, celdas },
            piezas,
            zonas: [],
            leyenda: {
                sin_mirar: 'escondite sin registrar', mirado: 'ya registrado',
                mapache: '¡el mapache!', tu_planta: 'la planta donde estás',
            },
            simbolos: { sin_mirar: '?', mirado: '.', mapache: '*', tu_planta: '@' },
        };
    }

    getObservation() {
        const o = [this.currentFloor / this.floors,
                   (this.budget - this.checks.length) / this.budget,
                   this.lastResult === '¡ENCONTRADO!' ? 1 : this.lastResult === 'caliente' ? 0.66
                     : this.lastResult === 'fresco' ? 0.33 : this.lastResult === 'helado' ? -0.33 : 0];
        for (let f = 0; f < 8; f++) {
            const en = this.spots.filter(s => s.floor === f);
            const done = en.filter(s => this.ecs.getComponent(s.id, 'HidingSpotComponent').isSearched).length;
            o.push(en.length ? done / en.length : 1);
            const hints = this.checks.filter(c => c.floor === f);
            o.push(hints.length ? (hints[hints.length - 1].result === 'caliente' ? 1
                                 : hints[hints.length - 1].result === 'fresco' ? 0.4 : -0.6) : 0);
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
                r === 'caliente' ? 'HOT' : r === 'fresco' ? 'WARM' : 'COLD', env.floors);
            return act;
        };
    }
}
