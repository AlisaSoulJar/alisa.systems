import { GymEnv } from '../GymEnv.js';
import { CorpBuildingCore } from '../../world/systems/CorpBuildingCore.js';
import { CorporateSeekerSystem } from '../../world/systems/CorporateSeekerSystem.js';

/**
 * CorpBuildingEnv — LA PUERTA DEL BANCO PARA ¡BUSCA! 3
 * ═══════════════════════════════════════════════════════════════
 * Un edificio de N plantas donde se esconde un mapache y tú lo buscas puerta por
 * puerta con pistas de temperatura.
 *
 * POR QUÉ IMPORTA: no mide reflejos, mide **deducción bajo incertidumbre con
 * presupuesto limitado** — el terreno donde un LLM puede ganar de verdad.
 *   «Comprobé la 3ª planta y salió helado, así que no está entre la 1 y la 6.
 *    La 7ª salió fresco, así que apunto a la 5-9. Me quedan 6 intentos…»
 *
 * TRES PUERTAS SOBRE EL MISMO PROBLEMA:
 *   🤖 numérica  obs = historial de comprobaciones codificado
 *   🧠 lenguaje  verbos `comprobar_puerta` / `comprobar_escondite` / `ir_a_planta`
 *   ⚙️ FSM       `CorporateSeekerSystem` (agente bayesiano YA ESCRITO) = el baseline
 *
 * ⚠️ EL JUEGO YA NO VIVE AQUÍ, Y ÉSA ES LA NOVEDAD.
 *
 * Este fichero tenía dentro el edificio entero —su ECS, sus escondites, su
 * mapache, sus bandas—, y las dos páginas humanas del mismo juego lo modelaban
 * otra vez cada una. Tres copias del mismo mundo, 4.400 líneas de página.
 *
 * Ahora las reglas están en la ROM `CorpBuildingCore` y aquí queda lo que es de
 * un ENTORNO: cómo se codifica la observación, cuánto vale cada cosa, qué se
 * cuenta por la puerta de texto y cómo se puntúa.
 */
export class CorpBuildingEnv extends GymEnv {
    static id = 'alisa/CorpBuilding-v0';
    static Core = CorpBuildingCore;

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
                 'comprobaciones. Cada intento devuelve una pista de temperatura según lo cerca que estés.',
        horizon: 40, tags: ['deducción', 'búsqueda', 'incertidumbre', 'llm-nativo', 'verbos'],
    };

    constructor(opts = {}) {
        super(opts);
        this.opts = opts;
        this.nucleo = new CorpBuildingCore(opts);
        this.t = 0; this.steps = 0; this.done = false;
    }

    /** Atajos de lectura: el banco y el baseline los usaban por nombre. */
    get floors() { return this.nucleo.plantas; }
    get budget() { return this.nucleo.presupuesto; }
    get spots() { return this.nucleo.spots; }
    get ecs() { return this.nucleo.ecs; }
    get currentFloor() { return this.nucleo.plantaActual; }
    get checks() { return this.nucleo.registro; }
    get found() { return this.nucleo.encontrado; }
    get raccoon() { return this.nucleo.mapache; }
    get lastResult() { return this.nucleo.ultima; }

    reset(seed = 0) {
        this.seed = seed;
        this.nucleo = new CorpBuildingCore({ ...this.opts, seed });
        this.t = 0; this.steps = 0; this.done = false;
        return this.getObservation();
    }

    /**
     * Acción semántica: `{verb, floor, index}`.
     *
     * Las REGLAS las lleva el núcleo; aquí sólo se decide cuánto vale cada
     * desenlace. Moverse es barato pero no gratis; encontrarlo pronto vale más;
     * quedarse sin intentos cuesta.
     */
    step(action, dt = 1) {
        if (this.done) return { obs: this.getObservation(), reward: 0, done: true, info: { fin: true } };
        const { verb, floor = this.nucleo.plantaActual, index = 0 } = action || {};
        let reward = 0, info = {};
        this.steps++; this.t += dt;

        if (verb === 'ir_a_planta') {
            reward = -0.05;
            info = { movido_a: this.nucleo.irAPlanta(floor) + 1 };
        } else if (verb === 'comprobar_puerta' || verb === 'comprobar_escondite') {
            const tipo = verb === 'comprobar_puerta' ? 'puerta' : 'escondite';
            const r = this.nucleo.comprobar(tipo, index);
            if (r.estado === 'nada') { reward = -1; info = { error: 'ahí no hay nada' }; }
            else if (r.estado === 'repetido') { reward = -1; info = { resultado: 'YA_COMPROBADO' }; }
            else if (r.estado === 'encontrado') {
                reward = 100 - r.comprobaciones * 3;
                info = { resultado: r.resultado, comprobaciones: r.comprobaciones };
            } else {
                reward = r.resultado === 'caliente' ? 1 : r.resultado === 'fresco' ? 0.3 : -0.2;
                info = { resultado: r.resultado, comprobaciones: r.comprobaciones };
            }
        } else { reward = -1; info = { error: `verbo desconocido: ${verb}` }; }

        this.done = this.nucleo.terminado();
        if (this.nucleo.agotado && !info.fin) { info.fin = 'sin intentos'; reward -= 20; }
        return { obs: this.getObservation(), reward, done: this.done, info };
    }

    sustrato() { return this.nucleo.sustrato(); }

    getObservation() {
        const n = this.nucleo;
        const o = [n.plantaActual / n.plantas,
                   (n.presupuesto - n.registro.length) / n.presupuesto,
                   n.ultima === '¡ENCONTRADO!' ? 1 : n.ultima === 'caliente' ? 0.66
                     : n.ultima === 'fresco' ? 0.33 : n.ultima === 'helado' ? -0.33 : 0];
        for (let f = 0; f < 8; f++) {
            const en = n.spots.filter((s) => s.floor === f);
            const hechos = en.filter((s) => n.ecs.getComponent(s.id, 'HidingSpotComponent').isSearched).length;
            o.push(en.length ? hechos / en.length : 1);
            const pistas = n.registro.filter((c) => c.floor === f);
            o.push(pistas.length ? (pistas[pistas.length - 1].result === 'caliente' ? 1
                                  : pistas[pistas.length - 1].result === 'fresco' ? 0.4 : -0.6) : 0);
        }
        n.registro.slice(-7).forEach((c) => o.push(c.floor / n.plantas));
        while (o.length < 26) o.push(0);
        return o.slice(0, 26).map((v) => +(+v).toFixed(3));
    }

    // ─── PUERTA DE LENGUAJE ──────────────────────────────────────
    /**
     * ⚠️ LAS PALABRAS SON LAS QUE EL JUEGO DEVUELVE DE VERDAD.
     *
     * Aquí ponía: «Cada comprobación te dice CALIENTE (misma planta), TIBIO (a 1-2
     * plantas) o FRÍO (más lejos)». Y las bandas de este juego son **caliente ·
     * fresco · helado** desde que se pasó a la escala común del banco.
     *
     * O sea que la puerta por la que juega un modelo sin ojos le enseñaba un
     * vocabulario que el juego NO USA: esperaba «TIBIO» y recibía «fresco», y
     * «FRÍO» no llegaba nunca. Eso no es dificultad del juego: es ruido que el
     * banco le mete encima al que lee, y sale de que el texto se escribió antes
     * del cambio de escala y nadie lo volvió a leer.
     */
    describe() {
        const n = this.nucleo;
        if (n.encontrado) return `¡Encontraste al mapache en la ${n.mapache.floor + 1}ª planta tras ${n.registro.length} comprobaciones!`;
        if (this.done) return `Se acabaron los intentos. El mapache estaba en la ${n.mapache.floor + 1}ª planta.`;
        const hist = n.registro.length
            ? n.registro.map((c) => `  · planta ${c.floor + 1}, ${c.kind} ${c.kind === 'puerta' ? String.fromCharCode(65 + c.index) : ''} → ${c.result}`).join('\n')
            : '  (aún no has comprobado nada)';
        const libres = n.libresAqui();
        return `Edificio de ${n.plantas} plantas. Un mapache se esconde en una puerta o armario.\n`
             + `Estás en la planta ${n.plantaActual + 1}. Te quedan ${n.presupuesto - n.registro.length} comprobaciones.\n`
             + `Cada comprobación te dice caliente (misma planta o la de al lado), fresco (a 2-3 plantas) o helado (más lejos).\n`
             + `Aquí quedan sin comprobar: ${libres.map((s) => s.kind === 'puerta' ? `puerta ${String.fromCharCode(65 + s.index)}` : 'armario').join(', ') || 'nada'}\n`
             + `Historial:\n${hist}`;
    }

    affordances() {
        const n = this.nucleo;
        const a = [];
        for (const s of n.libresAqui()) {
            const verb = s.kind === 'puerta' ? 'comprobar_puerta' : 'comprobar_escondite';
            a.push({ verb, args: { index: s.index },
                     label: s.kind === 'puerta' ? `Abrir la puerta ${String.fromCharCode(65 + s.index)}` : 'Mirar en el armario',
                     action: { verb, floor: n.plantaActual, index: s.index } });
        }
        for (let f = 0; f < n.plantas; f++) {
            if (f === n.plantaActual) continue;
            a.push({ verb: 'ir_a_planta', args: { floor: f }, label: `Subir/bajar a la planta ${f + 1}`,
                     action: { verb: 'ir_a_planta', floor: f } });
        }
        return a;
    }

    actFromVerb(verb, args = {}) {
        return { verb, floor: args.floor ?? this.nucleo.plantaActual, index: args.index ?? 0 };
    }

    getScore() {
        const n = this.nucleo;
        return { score: n.encontrado ? Math.max(0, 100 - n.registro.length * 3) : 0,
                 metrics: { encontrado: n.encontrado, comprobaciones: n.registro.length,
                            planta_mapache: n.mapache.floor + 1, pasos: this.steps } };
    }

    /** Baseline FSM: el agente bayesiano que YA existía en el motor. */
    static bayesianBaseline(env) {
        const seeker = new CorporateSeekerSystem();
        const fd = Array.from({ length: env.floors }, (_, f) => ({
            doorsCount: env.spots.filter((s) => s.floor === f && s.kind === 'puerta').length,
            spotsCount: env.spots.filter((s) => s.floor === f && s.kind === 'escondite').length }));
        seeker.reset(env.floors, fd);
        return () => {
            const target = seeker.pickBestFloor(env.floors, fd);
            if (target !== -1 && target !== env.currentFloor) return { verb: 'ir_a_planta', floor: target };
            const libre = env.nucleo.libresAqui()[0];
            if (!libre) { seeker.exploredFloors.add(env.currentFloor); seeker.normalizeBeliefs();
                          return { verb: 'ir_a_planta', floor: (env.currentFloor + 1) % env.floors }; }
            const act = { verb: libre.kind === 'puerta' ? 'comprobar_puerta' : 'comprobar_escondite',
                          floor: env.currentFloor, index: libre.index };
            act.__after = (r) => seeker.updateBeliefs(env.currentFloor,
                r === 'caliente' ? 'HOT' : r === 'fresco' ? 'WARM' : 'COLD', env.floors);
            return act;
        };
    }
}
