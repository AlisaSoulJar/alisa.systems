/**
 * PuenteDeGimnasio — UN SER PIENSA JUGANDO A LO QUE MIDE EL BANCO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Junta las dos mitades del proyecto, que hasta hoy no se tocaban:
 *
 *   EL MODELO DE SER   `SovereignBeing` — cerebro triúnico (reptiliano, límbico,
 *                      neocórtex, hipocampo) con niveles cognitivos T0..T5.
 *   EL BANCO           entornos con tres puertas, semilla, recibos y una nota
 *                      comparable.
 *
 * El Neocórtex pide un `puente` con dos métodos: `generateActionMenu(ser, ent)`
 * y `dispatchToAgent(ser, contexto)`. Y resulta que **la puerta de lenguaje del
 * gimnasio ya es exactamente eso**:
 *
 *     generateActionMenu  →  describe() + affordances()
 *     dispatchToAgent     →  elegir un verbo del menú
 *
 * En la colonia privada ese puente hace `fetch` a la reina en `localhost:8741`.
 * Aquí no hace falta ninguna reina: cualquier agente que sepa jugar en el banco
 * —una política, un modelo local, un guion— puede pensar por un Ser.
 *
 * ⚠️ Y ESTO NO ES UN ADORNO ARQUITECTÓNICO: HACE MEDIBLE EL MODELO DE SER.
 *
 * Hasta ahora `SovereignBeing` no se podía puntuar: no tenía un mundo con
 * marcador. Con esto, un Ser juega una etapa del banco y saca una nota
 * comparable con la de una persona y la de una política. Que es, literalmente,
 * lo que el banco existe para hacer.
 */

export class PuenteDeGimnasio {
    /**
     * @param {Object}   cfg
     * @param {Object}   cfg.entorno un `GymEnv` ya reseteado
     * @param {Function} cfg.decidir `(contexto, ser) => verbo | {verb, args}`.
     *        Es EL AGENTE. Puede ser una política, un modelo, o una función que
     *        pregunte por consola.
     *
     * ⚠️ NO HAY DECISOR POR DEFECTO, Y ES A PROPÓSITO.
     *
     * Poner uno —«coge el primer verbo»— haría que un Ser sin agente pareciera
     * estar pensando. Ya arreglé hoy ese mismo engaño en el Neocórtex: sin
     * puente devuelve `sin_puente` en vez de fingir que continúa. Un puente sin
     * quien decida es lo mismo con otra ropa.
     */
    constructor({ entorno, decidir } = {}) {
        if (!entorno) throw new Error('PuenteDeGimnasio: hace falta un `entorno`');
        if (typeof decidir !== 'function') {
            throw new Error('PuenteDeGimnasio: hace falta `decidir(contexto, ser)`. '
                          + 'Sin agente no hay pensamiento — no se pone uno de mentira.');
        }
        this.entorno = entorno;
        this.decidir = decidir;
        this.historial = [];
    }

    /**
     * El menú de lo que se puede hacer AHORA, en el idioma del banco.
     *
     * ⚠️ SE OFRECE LO QUE EL ENTORNO ACEPTA, NI UNO MÁS.
     *
     * `affordances()` ya está vigilado por `prueba_puertas_busca.mjs`: hoy
     * mismo cacé dos veces un menú que ofrecía verbos que el propio `step` luego
     * rechazaba —en ¡Busca! por la mañana y en SimonSays por la tarde, donde un
     * agente que obedecía el menú sacaba -155 y uno que lo ignoraba +450—. Este
     * puente no añade verbos suyos: pasa el menú tal cual.
     */
    generateActionMenu(ser, _entorno) {
        const e = this.entorno;
        const menu = e.affordances();
        return {
            id: e.constructor.id,
            /** Lo que ve el Ser, en prosa. La misma que lee un modelo de lenguaje. */
            descripcion: e.describe(),
            /** Los verbos legales de ESTE instante. */
            verbos: menu.map(a => ({ verb: a.verb, args: a.args ?? {}, desc: a.desc ?? a.label ?? '' })),
            /**
             * El estado del Ser viaja con el menú: quien decida puede tener en
             * cuenta que le queda poca vida o que su arquetipo es cobarde. Es lo
             * que el puente de la colonia llama «restringido por su biología».
             */
            ser: ser ? { psique: ser.neocortex?.psyche, nivel: ser.neocortex?.tier } : null,
        };
    }

    /**
     * Le pide al agente que elija, y comprueba que lo elegido EXISTE.
     *
     * ⚠️ UN VERBO INVENTADO SE RECHAZA AQUÍ, NO SE MANDA AL ENTORNO.
     *
     * `stepVerb` de un verbo desconocido devuelve `{error}` y sigue como si nada,
     * así que un agente que alucine verbos gastaría turnos sin enterarse. Aquí se
     * dice: es la frontera, y una frontera que no comprueba no es una frontera.
     */
    async dispatchToAgent(ser, contexto) {
        const elegido = await this.decidir(contexto, ser);
        const verbo = typeof elegido === 'string' ? elegido : elegido?.verb;
        const args = typeof elegido === 'string' ? {} : (elegido?.args ?? {});

        const legal = contexto.verbos.find(v => v.verb === verbo);
        if (!legal) {
            return { verb: null, error:
                `"${verbo}" no está entre los verbos legales (${contexto.verbos.map(v => v.verb).join(', ')})` };
        }
        this.historial.push({ verb: verbo, args });
        return { verb: verbo, args: Object.keys(args).length ? args : legal.args };
    }

    /**
     * Aplica al entorno lo que el Ser decidió. Va aparte de `dispatchToAgent`
     * porque decidir y actuar son dos cosas: un Ser puede pensar una jugada y
     * que el mundo no le deje hacerla.
     */
    aplicar(decision, dt = 1 / 60) {
        const e = this.entorno;
        const fin = () => ({ terminated: e.terminated, truncated: e.truncated });
        if (!decision?.verb) return { obs: e.getObservation(), reward: 0,
                                      done: e.done, ...fin(), info: { error: decision?.error } };
        return { ...e.stepVerb(decision.verb, decision.args, dt), ...fin() };
    }
}

/**
 * Un episodio entero: el Ser piensa, el puente traduce, el entorno responde.
 *
 * Se da hecho porque es el bucle que hace comparable a un Ser con una persona y
 * con una política: mismo entorno, misma semilla, misma nota. Escribirlo en cada
 * sitio sería la manera de que tres bucles midieran tres cosas distintas.
 *
 * @returns {{pasos, nota, recompensa, rechazados, historial}}
 */
export async function jugarComoSer(ser, entorno, decidir, { pasos = 600, dt = 1 / 60 } = {}) {
    const puente = new PuenteDeGimnasio({ entorno, decidir });
    if (ser?.neocortex) ser.neocortex.puente = puente;

    let recompensa = 0, rechazados = 0, dados = 0;
    for (let i = 0; i < pasos && !entorno.done; i++) {
        const contexto = puente.generateActionMenu(ser, entorno);
        if (!contexto.verbos.length) break;      // no hay nada que hacer: la partida acabó
        const decision = await puente.dispatchToAgent(ser, contexto);
        if (decision.error) rechazados++;
        const r = puente.aplicar(decision, dt);
        recompensa += r.reward ?? 0;
        dados++;
    }
    return {
        pasos: dados, recompensa, rechazados,
        nota: entorno.getScore?.().score ?? null,
        // Igual que en `runEpisode`: quien trunca aquí es el `pasos` de este bucle,
        // no el juego. Si sale sin que las reglas hayan terminado, fue el tope.
        terminated: entorno.terminated,
        truncated: entorno.truncated || !entorno.done,
        historial: puente.historial,
    };
}
