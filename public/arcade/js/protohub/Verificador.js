/**
 * Verificador.js — re-simular la partida de otro para saber si es verdad
 * ═══════════════════════════════════════════════════════════════════════════
 * Una puntuación enviada por un desconocido no vale nada. Lo que sí vale es la
 * PARTIDA: la semilla y la lista de jugadas. Con eso, el servidor vuelve a jugar
 * exactamente la misma partida y comprueba el resultado.
 *
 *     partida enviada  =  { juego, semilla, jugadas: [...], puntos }
 *     verificación     =  volver a jugarla y ver si sale lo mismo
 *
 * POR QUÉ ESTO FUNCIONA AQUÍ Y NO EN CUALQUIER SITIO
 * ---------------------------------------------------
 * Dos condiciones, y las dos se cumplen:
 *
 * 1. **Las reglas son deterministas.** Misma semilla ⇒ mismo mundo. Se midió:
 *    los 8 módulos de reglas no usan `Math.random` sin semilla ni dependen del
 *    reloj. El laberinto de Fagocito se genera con mulberry32 —solo enteros de
 *    32 bits— así que sale idéntico en cualquier máquina.
 *
 * 2. **Las reglas son JavaScript puro.** Cero `document`, cero `window`, cero
 *    `THREE`, cero imports. Comprobado fichero a fichero. Eso significa que
 *    **el mismo fichero que juega en el navegador verifica en el servidor** —
 *    un Worker de Cloudflare, Node, lo que sea. Sin reimplementar las reglas en
 *    otro lenguaje y sin que cliente y servidor se desincronicen jamás.
 *
 * Ese segundo punto es el que hace barato el benchmark: verificar una partida
 * cuesta milisegundos y no hay dos versiones de las reglas que mantener.
 *
 * LO QUE ESTO **NO** IMPIDE
 * -------------------------
 * Nadie puede inventarse una puntuación ni colar una jugada ilegal. Pero **sí**
 * puede dejar que un programa juegue por él y decir que lo hizo a mano. Eso no
 * se resuelve con criptografía; se resuelve con categorías separadas
 * (humano / FSM / LLM) y aceptando que la de "humano" es declarada.
 * Mejor decirlo claro que fingir una garantía que no existe.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Vuelve a jugar una partida y dice si cuadra.
 *
 * @param {Object} reglas   módulo de reglas (ajedrez, go, snake…)
 * @param {Object} partida
 * @param {number|string} partida.semilla
 * @param {string[]} partida.jugadas   en orden
 * @param {number} [partida.puntos]    lo que dice el jugador que sacó
 * @param {Object} [opts]
 * @param {number} [opts.maxJugadas=10000]  tope de seguridad
 * @returns {{valida:boolean, motivo:string|null, puntos:number,
 *            jugadas:number, estadoFinal:Object}}
 */
export function verificar(reglas, partida, opts = {}) {
    const tope = opts.maxJugadas ?? 10000;
    const jugadas = partida.jugadas ?? [];

    if (!Array.isArray(jugadas)) {
        return no('la lista de jugadas no es una lista');
    }
    if (jugadas.length > tope) {
        return no(`demasiadas jugadas (${jugadas.length} > ${tope})`);
    }

    let p;
    try {
        // ⚠️ La semilla se pasa con LOS DOS NOMBRES, y no es por gusto: en el
        // repositorio conviven las dos convenciones — `fagocito`, `peaton` y
        // `snake` leen `opts.seed`; `blackjack` lee `opts.semilla`. Pasando solo
        // `seed`, las reglas en castellano arrancaban con una semilla AL AZAR y
        // la verificación comparaba contra otra partida distinta.
        //
        // Lo peor no era fallar: era que salía `valida: true`. Si las dos
        // puntuaciones eran 0 —o `null`, que es lo normal en una mano recién
        // empezada— la comprobación pasaba y firmaba como buena una partida que
        // ni siquiera era la misma. Un verificador que da falsos verdes es peor
        // que no tener verificador, porque encima da confianza.
        p = reglas.nuevaPartida({ seed: partida.semilla, semilla: partida.semilla,
                                  ...(partida.config ?? {}) });
    } catch (e) {
        return no(`no se pudo montar la partida: ${e.message}`);
    }

    for (let i = 0; i < jugadas.length; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) {
            return no(`la jugada ${i + 1} llega con la partida ya terminada`);
        }
        // La comprobación de fondo: ¿estaba permitida ESA jugada en ESE momento?
        // No se compara el resultado —los flotantes divergen entre máquinas—,
        // se audita cada acción. Es lo mismo que hace la colonia con sus sellos.
        const legales = st.legal_moves ?? [];
        if (legales.length && !legales.includes(jugadas[i])) {
            return no(`jugada ${i + 1} ilegal: '${jugadas[i]}'`, p, reglas, i);
        }
        if (!reglas.mover(p, jugadas[i])) {
            return no(`el motor rechazó la jugada ${i + 1}: '${jugadas[i]}'`, p, reglas, i);
        }
    }

    const fin = reglas.estado(p);
    const puntos = puntuacionDe(fin);

    if (partida.puntos !== undefined && Number(partida.puntos) !== puntos) {
        return no(`la puntuación no cuadra: dice ${partida.puntos}, sale ${puntos}`, p, reglas, jugadas.length);
    }

    return {
        valida: true,
        motivo: null,
        puntos,
        jugadas: jugadas.length,
        estadoFinal: resumen(fin),
    };

    function no(motivo, estado = null, r = null, hasta = 0) {
        return {
            valida: false, motivo,
            puntos: estado && r ? puntuacionDe(r.estado(estado)) : 0,
            jugadas: hasta,
            estadoFinal: estado && r ? resumen(r.estado(estado)) : null,
        };
    }
}

/**
 * Cada juego llama a los puntos de una forma; aquí se normaliza.
 *
 * ⚠️ SE EXPORTA, Y ESO IMPORTA. `ProtoHubEnv` reimplementó esta normalización
 * por su cuenta y le salió mal: con `score: {black, white}` hacía
 * `Number(objeto) || 0` y devolvía **0**. Resultado: go, reversi y mancala
 * generaban recibos que decían «0 puntos» mientras el servidor, al re-simular,
 * sacaba 219,5. **Partidas legítimas rechazadas** — el peor fallo posible en un
 * banco de pruebas que presume de verificar.
 *
 * Quien quiera saber cuántos puntos vale un estado, que llame aquí. Una segunda
 * implementación de la misma idea es una divergencia esperando su turno.
 */
export function puntuacionDe(st) {
    if (typeof st.score === 'number') return st.score;
    // ⚠️ ESTE `puntos` SUBIÓ AQUÍ, Y ARREGLA EL PEOR FALLO DE LA TABLA.
    // El escalar manda sobre el objeto porque el objeto es ambiguo: hay que
    // saber CUÁL de los dos marcadores es el nuestro, y aquí no se sabe.
    if (typeof st.puntos === 'number') return st.puntos;
    if (st.score && typeof st.score === 'object') {
        // ⚠️ CAMINO HEREDADO, Y ESTUVO MAL DURANTE TODO EL DÍA.
        // Decía «el marcador del primer jugador» y preguntaba por `white`
        // primero. En el go y en el reversi **abren las negras**, así que para
        // esos dos juegos devolvía el marcador DEL RIVAL. Una partida de go
        // reportaba 269,5 cuando el agente había hecho 69 y le habían comido 231
        // piedras: el número que salía en la tabla era el de quien le ganaba.
        //
        // Lo peor es que no rompía nada visible. Verificaba —los dos lados
        // calculaban igual de mal—, era determinista y separaba políticas. Un
        // banco de pruebas puede estar sano por todos los indicadores que te
        // hayas molestado en mirar y estar midiendo al contrario.
        //
        // Lo cazó un CONTROL: el arnés de agentes con `--modelo eco` (elige
        // siempre la primera opción) tiene que sacar lo mismo que la política
        // tonta del calibrador. En go dieron 271,5 y 63,5. Ninguno de los dos
        // era «el bueno»; lo que informaba era que no coincidieran.
        //
        // Ahora go, reversi y mancala publican también `puntos` escalar desde el
        // asiento que abre, así que aquí ya no se llega. Se deja por si entra un
        // juego de fuera con esta forma, y con el aviso puesto.
        const claves = Object.keys(st.score);
        return st.score[claves[0]] ?? 0;      // el primero que declara el juego
    }
    return 0;
}

function resumen(st) {
    return {
        terminada: !!st.is_game_over,
        resultado: st.result ?? null,
        jugadasLegales: (st.legal_moves ?? []).length,
    };
}

/**
 * Verifica una tanda. Devuelve lo que hace falta para una tabla de resultados.
 *
 * @param {Object} reglasPorJuego  { chess: ajedrez, go: go, … }
 * @param {Array} partidas
 * @returns {{validas:number, invalidas:number, resultados:Array}}
 */
export function verificarTanda(reglasPorJuego, partidas) {
    const resultados = partidas.map((partida, i) => {
        const reglas = reglasPorJuego[partida.juego];
        if (!reglas) {
            return { i, juego: partida.juego, valida: false, motivo: `juego desconocido: '${partida.juego}'` };
        }
        const r = verificar(reglas, partida);
        return { i, juego: partida.juego, ...r };
    });
    return {
        validas: resultados.filter(r => r.valida).length,
        invalidas: resultados.filter(r => !r.valida).length,
        resultados,
    };
}
