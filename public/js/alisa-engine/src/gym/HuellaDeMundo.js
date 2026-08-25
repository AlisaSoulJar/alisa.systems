/**
 * HuellaDeMundo — ¿SIGUE SIENDO EL MISMO JUEGO QUE CUANDO SE PUBLICÓ LA NOTA?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dos facetas del proyecto tiran en direcciones opuestas:
 *
 *   GIMNASIO        quiere juegos QUIETOS, para que una nota de hace un mes se
 *                   pueda comparar con una de hoy.
 *   ENTRADA HUMANA  quiere juegos que MEJOREN, porque un juego que no se toca
 *                   se queda flojo.
 *
 * La unificación no es elegir una: es que **el cambio sea visible**. Se puede
 * cambiar un juego cuando haga falta, pero entonces deja de ser el mismo juego y
 * tiene que decirlo — `-v0` pasa a `-v1`, como hace Gym desde siempre. Con eso,
 * las dos facetas conviven: las notas viejas siguen siendo válidas *contra su
 * versión*, y nadie las compara sin querer con las nuevas.
 *
 * ⚠️ Y ESTO NO ES TEÓRICO: PASÓ AYER Y HOY.
 *
 * `RaccoonCity-v0` cambió de 12 objetivos a 10 y de 30 de combustible a 38 y de
 * vuelta a 30. `RaccoonPlanet-v0` estrenó mando de órbita, coste de escaneo y
 * pasó de 26 de combustible a 11. `CabinetEscape-v0` cambió de generador y con
 * él todos sus muebles. **Los tres siguen llamándose `-v0`.**
 *
 * Cualquier nota publicada antes es hoy incomparable con una de después, y no
 * hay forma de saberlo mirando. Es la misma mentira en verde de siempre, pero en
 * el eje del tiempo en vez del de las puertas.
 *
 * ⚠️ LA HUELLA ES DE COMPORTAMIENTO, NO DE ESTADO INICIAL.
 *
 * `huellaDeReglas` del arcade toma una foto del estado en el primer turno, y su
 * propio fichero cuenta que eso ya mintió una vez: hearts y spades salían con la
 * MISMA huella porque comparten baraja, reparto y semilla.
 *
 * En un mundo sería peor todavía: dos calibraciones distintas de ¡Busca! 5
 * empiezan igual y se juegan distinto — que es exactamente lo que hace que las
 * notas no se puedan comparar. Así que aquí se JUEGA: misma política, mismas
 * semillas, y se resume el resultado. Si el juego se comporta distinto, la
 * huella cambia; si sólo se le tocó un comentario, no.
 */

/** Las semillas con las que se toma la huella. Cambiarlas invalida las anteriores. */
export const SEMILLAS_HUELLA = [1, 7, 42, 1234];

/** Cuántos pasos se juegan por semilla. Suficiente para que se note una calibración. */
export const PASOS_HUELLA = 300;

/** Suma de control corta y estable (FNV-1a). No hace falta criptografía. */
export function resumir(valor) {
    const s = typeof valor === 'string' ? valor : JSON.stringify(valor);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

/**
 * ⚠️ LA POLÍTICA TIENE QUE SER FIJA Y NO PUEDE CANCELARSE SOLA.
 *
 * Recorrer las acciones con un paso que divida al número de verbos hace que se
 * anulen entre sí: medido esta semana, `(i*7) % 8` da el ciclo `0,7,6,5,4,3,2,1`
 * y ahí `oeste` deshace a `este` y `norte` a `sur`. El satélite del planeta
 * volvía exactamente al punto de partida y di por roto un entorno sano.
 *
 * Se salta la acción 0 —que en todos los mundos es «no hacer nada»— y se avanza
 * de uno en uno, que no se cancela con nada.
 */
function accionFija(env, i) {
    const esp = env.constructor.actionSpace;
    if (esp?.type === 'discrete' && Number.isFinite(esp.n)) {
        return 1 + (i % Math.max(1, esp.n - 1));
    }
    return null;   // por verbos: se resuelve en `huellaDeMundo`
}

/**
 * Juega el mismo episodio siempre y resume cómo fue.
 *
 * @param {Function} Clase un `GymEnv`
 * @returns {{huella:string, detalle:Object[]}}
 */
/**
 * ⚠️ EL DESENLACE NO BASTA PARA DISTINGUIR DOS JUEGOS. MEDIDO.
 *
 * La primera versión resumía sólo cómo acababa la partida —pasos, recompensa,
 * nota— y `RaccoonSpace-v0` y `RaccoonCity-v0` salieron con la MISMA huella
 * (`92650e99`). Son juegos distintos: otro tamaño de mundo, otro vehículo, otro
 * combustible. Pero la política fija se queda sin combustible en los dos y el
 * -100 de la muerte domina el resultado.
 *
 * Es literalmente el fallo que `huella.js` del arcade tiene escrito en su
 * cabecera —hearts y spades con la misma huella por compartir baraja y reparto—
 * y volví a caer en él por el mismo motivo: resumir el resultado en vez del
 * mundo.
 *
 * Se añade el SUSTRATO, que es el estado en el idioma común: cuántas piezas hay,
 * de qué tipo y dónde. Dos juegos distintos no pueden tener el mismo sustrato,
 * porque entonces serían el mismo juego.
 */
function retrato(sys) {
    if (!sys || typeof sys.sustrato !== 'function') return null;
    const s = sys.sustrato();
    const porTipo = {};
    for (const p of (s.piezas ?? [])) porTipo[p.t] = (porTipo[p.t] ?? 0) + 1;
    return {
        rejilla: s.rejilla ? `${s.rejilla.ancho}x${s.rejilla.alto}` : null,
        // La suma de las celdas distingue dos terrenos del mismo tamaño.
        terreno: s.rejilla ? s.rejilla.celdas.reduce((a, b) => a + b, 0) : null,
        tipos: porTipo,
        limite: s.limite ?? null,
        // Redondeado: dos CPUs pueden diferir en el último decimal sin que el
        // juego haya cambiado. Ver la nota de `recompensa`.
        centro: (s.piezas ?? []).slice(0, 4)
            .map(p => [p.x, p.y, p.alto].map(v => (v === undefined ? null : Math.round(v * 100) / 100))),
    };
}

export function huellaDeMundo(Clase) {
    const detalle = [];
    for (const semilla of SEMILLAS_HUELLA) {
        const env = new Clase();
        env.reset(semilla);
        const sys = [env.sys, env.core, env.nucleo, env.motor, env]
            .find(o => o && typeof o.sustrato === 'function');
        const alEmpezar = retrato(sys);
        let recompensa = 0, pasos = 0;
        for (let i = 0; i < PASOS_HUELLA && !env.done; i++) {
            try {
                const a = accionFija(env, i);
                if (a !== null) { recompensa += env.step(a)?.reward ?? 0; }
                else {
                    const menu = env.affordances?.() ?? [];
                    if (!menu.length) break;
                    const v = menu[i % menu.length];
                    recompensa += env.stepVerb(v.verb, v.args ?? {})?.reward ?? 0;
                }
                pasos++;
            } catch { break; }
        }
        detalle.push({
            semilla,
            /** El mundo al empezar y al acabar: es lo que distingue dos juegos. */
            alEmpezar,
            alAcabar: retrato(sys),
            /**
             * ⚠️ Y LA OBSERVACIÓN, PORQUE EL SUSTRATO NO LLEVA ESCALARES.
             *
             * El sustrato describe lo que HAY —terreno y piezas— pero no cuánto
             * combustible te queda ni cuántas vidas. Medido: cambié el
             * combustible de ¡Busca! 4 de 30 a 31 y **la huella no se movió**,
             * porque ese número no está en ninguna pieza.
             *
             * Y una calibración es exactamente el tipo de cambio que hace
             * incomparables dos notas sin que se note nada más. La observación
             * numérica sí los lleva, así que entra en la huella.
             */
            obs: (env.getObservation?.() ?? []).slice(0, 40).map(v => Math.round(v * 1000) / 1000),
            /**
             * ⚠️ Y EL TEXTO, PORQUE LA HUELLA VIGILABA TRES PUERTAS DE CUATRO.
             * ═══════════════════════════════════════════════════════════════
             *
             * Esto entra el 25-08 y lo destapé cambiando el juego yo misma.
             *
             * A ¡Busca! le añadí el radar completo en `describe()`: pasó de
             * decirle al agente «lo más cerca está a 63 unidades, abajo» a darle
             * los diez objetivos con distancia y desvío, que es lo que la persona
             * ve en su pantalla desde siempre. De 163 caracteres a 458. Un cambio
             * que puede doblarle la nota a un modelo de lenguaje.
             *
             * Corrí la huella esperando que saltara. **Dijo «sin cambios» en los
             * nueve.**
             *
             * El motivo: hasta hoy se hasheaba el sustrato (lo que HAY), la
             * observación (los escalares) y el comportamiento (pasos, recompensa,
             * fin). Las tres puertas que NO usa un agente de lenguaje. La cuarta
             * —el texto— era justo la que mi beta tester estaba usando cuando
             * encontró que jugaba a ciegas.
             *
             * O sea: la huella podía certificar «sigue siendo el mismo juego»
             * mientras el juego cambiaba entero para quien lo juega leyendo. Es el
             * mismo fallo que llevo todo el día persiguiendo en otros —una capa
             * que mira a otro sitio— cometido por mi propio instrumento.
             *
             * Se guarda RECORTADO a 400 caracteres: lo que importa es detectar el
             * cambio, no archivar la prosa, y un texto largo haría el fichero de
             * huellas ilegible para quien lo revise a ojo.
             */
            texto: String(env.describe?.() ?? '').slice(0, 400),
            pasos,
            /**
             * Se redondea a cuatro decimales a propósito: `Math.sin` y `Math.cos`
             * no están fijados bit a bit entre CPUs, así que el último decimal
             * puede bailar sin que el juego haya cambiado. Cuatro decimales
             * distinguen una calibración y perdonan una CPU distinta.
             */
            recompensa: +recompensa.toFixed(4),
            nota: env.getScore?.().score ?? null,
            terminada: !!env.done,
        });
    }
    return { huella: resumir(detalle), detalle };
}
