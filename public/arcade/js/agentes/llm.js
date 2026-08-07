/**
 * llm.js — un agente de lenguaje jugando por la puerta de lenguaje
 * ═══════════════════════════════════════════════════════════════════════════
 * Esto es lo que convierte «gym y banco de pruebas para humanos, FSM y agentes
 * LLM» de una frase de portada en algo comprobable.
 *
 * EL REGALO: NO SE PUEDE ALUCINAR UNA JUGADA
 * El entorno publica `affordances()`, que en los juegos del ProtoHub **es** la
 * lista de jugadas legales en este instante. Al modelo no se le pide que invente
 * una jugada: se le enseña la lista y se le pide un número. Un agente no puede
 * proponer un enroque imposible porque el enroque imposible no está en la lista.
 *
 * Casi todo el trabajo que se publica sobre agentes en juegos se pelea con lo
 * contrario —parsear texto libre, adivinar intenciones, castigar jugadas
 * inválidas—. Aquí ese problema no existe por construcción, y lo que queda medido
 * es lo único interesante: **si elige bien**.
 *
 * LO QUE SE CUENTA, Y POR QUÉ CADA COSA
 *   · puntos      — la métrica del entorno, la misma que un humano
 *   · forzadas    — veces que no dio una opción válida ni tras reintentar, y hubo
 *                   que elegir por él. Es una medida de obediencia al formato,
 *                   y va SEPARADA de los puntos: un modelo que juega regular no
 *                   es lo mismo que uno que no sabe contestar
 *   · tokens y ms — el eje de coste. Una tabla de puntuación sin coste premia
 *                   al que quema mil veces más por la misma jugada
 *
 * ⚠️ SOBRE LAS «FORZADAS»: podría no contarlas y dejar que el modelo pierda el
 * turno. No lo hago porque entonces un modelo que contesta mal se hunde por una
 * razón que la puntuación no explica, y la tabla mentiría por omisión. Se le
 * rescata, se anota, y se publica el número. Un modelo con 40% de forzadas no ha
 * jugado: ha sido jugado. Que se vea.
 *
 * EL RECIBO
 * Al terminar, el episodio produce el mismo `{juego, semilla, jugadas, puntos}`
 * que la partida de una persona, y **el arnés lo verifica antes de devolverlo**.
 * Una fila que no verifica no se publica. Es la diferencia con subir una
 * trayectoria y que la juzgue otro modelo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Construye el prompt: lo que pasa, y qué se puede hacer. Numerado. */
export function construirPrompt(env, opciones, estricto = false) {
    const lineas = opciones.map((o, i) => `${i + 1}) ${o.label ?? o.verb}`);
    const cabecera = env.describe();
    return (estricto
        ? 'Responde SOLO con un número del 1 al ' + opciones.length + '. Sin explicar nada.\n\n'
        : '')
        + `${cabecera}\n\nOpciones:\n${lineas.join('\n')}\n\n`
        + `Elige una. Responde solo con su número (1-${opciones.length}).`;
}

/**
 * Saca una opción de la respuesta del modelo.
 *
 * Se acepta el número, y también el verbo escrito tal cual — algunos modelos
 * pequeños ignoran «responde con el número» y contestan «e2e4», que es una
 * respuesta perfectamente buena y sería absurdo tirarla.
 *
 * ⚠️ El número se busca con `\b\d+\b` y NO con el primer dígito suelto: un
 * modelo que contesta «la 3» y otro que contesta «e2e4» no pueden acabar los dos
 * en la opción 2 porque en «e2e4» hay un 2.  Por eso el verbo se comprueba
 * ANTES que el número.
 */
export function interpretar(texto, opciones) {
    const t = String(texto ?? '').trim();
    if (!t) return -1;

    // 1. ¿Ha escrito el verbo? Se mira primero, y el más largo gana para que
    //    'jugar:S_10' no se confunda con 'jugar:S_1'.
    const porLargo = opciones.map((o, i) => [String(o.verb), i])
                             .sort((a, b) => b[0].length - a[0].length);
    for (const [verbo, i] of porLargo) {
        if (verbo.length >= 2 && t.includes(verbo)) return i;
    }

    // 2. ¿Un número dentro del rango?
    for (const m of t.matchAll(/\b(\d+)\b/g)) {
        const n = Number(m[1]);
        if (n >= 1 && n <= opciones.length) return n - 1;
    }
    return -1;
}

/**
 * Juega un episodio completo.
 *
 * @param {typeof import('../public/js/alisa-engine/src/gym/GymEnv.js').GymEnv} Clase
 * @param {Function} proveedor  async (prompt) => {texto, entrada, salida, ms}
 * @param {Object} opts  semilla, tope (llamadas al modelo), alVer (traza)
 */
export async function jugarEpisodio(Clase, proveedor, { semilla = 1, tope = 60, alVer, politica } = {}) {
    const env = new Clase();
    env.reset(semilla);

    let llamadas = 0, forzadas = 0, reintentos = 0;
    let tokEntrada = 0, tokSalida = 0, ms = 0, medidos = true;
    let error = null;

    // ⚠️ EL TOPE CUENTA DECISIONES, NO LLAMADAS AL MODELO.
    // Era `while (llamadas < tope)`, y `llamadas` sólo sube cuando se pregunta a
    // un modelo. Una política de código no pregunta a nadie, así que su contador
    // se quedaba en cero y **el tope no limitaba nada**: el episodio sólo
    // terminaba si el juego terminaba por su cuenta. Con un juego que no
    // termine solo —y en esta suite hay tres que necesitan tope— eso es un
    // cuelgue, no un número raro.
    //
    // Y de paso explicaba una rareza que había dejado pasar: las líneas base
    // salían con `forzadas 0/0`. Cero llamadas de cero. Un contador a cero en un
    // participante que juega cientos de partidas era la pista, y la leí como
    // «claro, no llama a ningún modelo» en vez de mirar para qué se usaba.
    let pasos = 0;
    while (pasos < tope) {
        pasos++;
        if (env.done) break;
        const opciones = env.affordances();
        if (!opciones.length) break;

        // Con una sola opción no hay decisión: no se gasta una llamada en ella.
        // Un banco de pruebas que cobre tokens por jugadas obligadas mide la
        // longitud de la partida, no la habilidad.
        let elegida;
        if (politica) {
            // Una política de código, no un modelo. Va por un parámetro APARTE y
            // no disfrazada de proveedor a propósito: el contrato dice que un
            // proveedor sólo ve texto y no puede tocar el entorno, y esa promesa
            // no se rompe para ahorrarse un argumento. Una política SÍ ve el
            // entorno —es de casa, no compite— y por eso entra por otra puerta.
            elegida = politica(env, opciones, Clase);
            if (!(elegida >= 0 && elegida < opciones.length)) elegida = 0;
        } else if (opciones.length === 1) {
            elegida = 0;
        } else {
            let respuesta;
            try {
                respuesta = await proveedor(construirPrompt(env, opciones));
            } catch (e) { error = e.message; break; }
            llamadas++;
            tokEntrada += respuesta.entrada ?? 0;
            tokSalida  += respuesta.salida ?? 0;
            ms += respuesta.ms ?? 0;
            if (respuesta.medidos === false) medidos = false;

            elegida = interpretar(respuesta.texto, opciones);

            if (elegida < 0) {
                // Un reintento con la instrucción en la primera línea. Los modelos
                // pequeños obedecen mucho mejor cuando el formato va delante.
                reintentos++;
                try {
                    const otra = await proveedor(construirPrompt(env, opciones, true));
                    llamadas++;
                    tokEntrada += otra.entrada ?? 0;
                    tokSalida  += otra.salida ?? 0;
                    ms += otra.ms ?? 0;
                    elegida = interpretar(otra.texto, opciones);
                } catch (e) { error = e.message; break; }
            }
            if (elegida < 0) { elegida = 0; forzadas++; }   // rescatado, y anotado
        }

        const o = opciones[elegida];
        if (alVer) alVer({ paso: llamadas, describe: env.describe(), elegida: o.verb });
        const r = env.step(o.action ?? o.verb);
        if (r.done) break;
    }

    const marcador = env.getScore?.() ?? { score: 0, metrics: {} };
    return {
        puntos: marcador.score ?? 0,
        metricas: marcador.metrics ?? {},
        pasos, llamadas, forzadas, reintentos, error,
        tokens: { entrada: tokEntrada, salida: tokSalida, medidos },
        ms,
        // El recibo, sólo lo tienen los entornos del ProtoHub. Los nativos
        // puntúan igual pero todavía no emiten partida verificable, y se dice.
        recibo: typeof env.partida === 'function' ? env.partida() : null,
    };
}
