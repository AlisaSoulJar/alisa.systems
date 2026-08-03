/**
 * Dataset.js — de 355 bytes a un conjunto de entrenamiento completo
 * ═══════════════════════════════════════════════════════════════════════════
 * Una partida enviada son la semilla y las jugadas. Parece poco. Pero como las
 * reglas son **deterministas**, con eso se reconstruye TODO:
 *
 *     {semilla, jugadas}  →  [(estado, acción, recompensa, siguiente), …]
 *
 * Es decir: **355 bytes se expanden en la trayectoria entera** — cada estado
 * que el agente vio y qué decidió al verlo. Eso es exactamente la forma que
 * pide el aprendizaje por refuerzo y el aprendizaje por imitación.
 *
 * POR QUÉ ESTO IMPORTA MÁS DE LO QUE PARECE
 * -----------------------------------------
 * Lo normal en estos casos es guardar capturas o volcados de estado, y acabas
 * con gigas. Aquí se guarda la semilla, y el estado se **recalcula** cuando hace
 * falta. Diez mil partidas ocupan 3,4 MB en disco y contienen millones de pares
 * estado-acción. El determinismo no era solo para pillar tramposos.
 *
 * LO QUE SALE PARA CADA DECISIÓN
 * ------------------------------
 *   obs        el estado en números (para políticas y redes)
 *   texto      el mismo estado en castellano (para agentes de lenguaje)
 *   legales    qué podía hacer — hace falta para enmascarar acciones
 *   accion     qué hizo
 *   recompensa lo que cambió el marcador con esa jugada
 *   terminado  si ahí se acabó
 *
 * Que salgan **las dos representaciones** es lo que permite entrenar una red y
 * un agente de lenguaje **con la misma partida**. Es el contrato de las tres
 * puertas, ahora en los datos.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Expande una partida enviada en su trayectoria completa.
 *
 * @param {Object} reglas   módulo de reglas
 * @param {Object} partida  { semilla, jugadas, juego }
 * @param {Object} [opts]
 * @param {boolean} [opts.texto=true]   incluir la descripción en castellano
 * @param {Function} [opts.describe]    cómo narrar el estado, si el juego no trae
 * @returns {{juego:string, semilla:*, pasos:Array, meta:Object}}
 */
export function expandir(reglas, partida, opts = {}) {
    const conTexto = opts.texto !== false;
    const p = reglas.nuevaPartida({ seed: partida.semilla, ...(partida.config ?? {}) });
    const pasos = [];

    let anterior = puntuacionDe(reglas.estado(p));

    for (const jugada of (partida.jugadas ?? [])) {
        const st = reglas.estado(p);
        if (st.is_game_over) break;

        const paso = {
            obs: vectorizar(st),
            legales: st.legal_moves ?? [],
            accion: jugada,
        };
        if (conTexto) {
            paso.texto = opts.describe ? opts.describe(st, p) : narrar(st, partida.juego);
        }

        if (!reglas.mover(p, jugada)) break;      // envío corrupto: se corta

        const despues = reglas.estado(p);
        const ahora = puntuacionDe(despues);
        paso.recompensa = ahora - anterior;
        paso.terminado = !!despues.is_game_over;
        anterior = ahora;

        pasos.push(paso);
    }

    const fin = reglas.estado(p);
    return {
        juego: partida.juego,
        semilla: partida.semilla,
        pasos,
        meta: {
            longitud: pasos.length,
            puntosFinales: puntuacionDe(fin),
            resultado: fin.result ?? null,
            terminada: !!fin.is_game_over,
            // Se conserva quién DIJO ser. No se le cree; se guarda como etiqueta
            // declarada, para poder comprobar después si cuadra con los datos.
            agenteDeclarado: partida.agente ?? 'desconocido',
        },
    };
}

/**
 * Estadísticas de una partida que ayudan a saber si la etiqueta es creíble.
 *
 * No sirve para acusar a nadie: sirve para **agrupar**. Una política programada
 * repite estructura; una persona duda, cambia de idea y a veces hace lo obvio
 * mal. Se puede ver sin preguntar.
 */
export function huellaDeJuego(traza) {
    const pasos = traza.pasos;
    if (!pasos.length) return null;

    // ¿Cuánto se repite la posición de la acción dentro de la lista de legales?
    // Un bot que siempre coge "la primera legal" tiene un 0 clavado.
    const posiciones = pasos
        .map(s => s.legales.indexOf(s.accion))
        .filter(i => i >= 0);
    const media = posiciones.reduce((a, b) => a + b, 0) / (posiciones.length || 1);
    const varianza = posiciones.reduce((a, b) => a + (b - media) ** 2, 0) / (posiciones.length || 1);

    // ¿Cuántas veces eligió algo que empeoraba el marcador?
    const malas = pasos.filter(s => s.recompensa < 0).length;

    return {
        longitud: pasos.length,
        posicionMedia: +media.toFixed(3),
        varianzaPosicion: +varianza.toFixed(3),
        ratioJugadasMalas: +(malas / pasos.length).toFixed(3),
        opcionesMedias: +(pasos.reduce((a, s) => a + s.legales.length, 0) / pasos.length).toFixed(1),
        // Señal cruda, sin veredicto: una varianza de 0 con muchas opciones
        // significa "siempre elige la misma casilla de la lista".
        sospechaDeAutomata: varianza === 0 && pasos.length > 10,
    };
}

/** Vuelca un lote en JSONL, que es lo que comen las tuberías de entrenamiento. */
export function aJSONL(trazas) {
    const lineas = [];
    for (const t of trazas) {
        for (const s of t.pasos) {
            lineas.push(JSON.stringify({
                juego: t.juego, semilla: t.semilla,
                obs: s.obs, texto: s.texto, legales: s.legales,
                accion: s.accion, recompensa: s.recompensa, terminado: s.terminado,
                agente: t.meta.agenteDeclarado,
            }));
        }
    }
    return lineas.join('\n');
}

// ─── auxiliares ─────────────────────────────────────────────────

function puntuacionDe(st) {
    if (typeof st.score === 'number') return st.score;
    if (st.score && typeof st.score === 'object') return st.score.white ?? st.score.black ?? 0;
    return 0;
}

/**
 * Aplana un tablero, sea de la forma que sea.
 *
 * Hace falta porque los juegos NO coinciden: el de ajedrez y el de go son
 * matrices `[fila][columna]`, pero el de **mancala es plano** — catorce huecos
 * en fila. La primera versión daba por hecho 2D y reventaba con un
 * `fila is not iterable`. Un vectorizador común tiene que tragar las dos.
 */
function aplanarTablero(tablero, v) {
    for (const celda of tablero) {
        if (Array.isArray(celda)) {
            for (const x of celda) v.push(valorDe(x));
        } else {
            v.push(valorDe(celda));
        }
    }
}

/** Las casillas pueden ser números, letras de pieza o vacío. */
function valorDe(x) {
    if (x === null || x === undefined || x === '') return 0;
    if (typeof x === 'number') return x;
    if (typeof x === 'boolean') return x ? 1 : 0;
    return String(x).charCodeAt(0);
}

/** Aplana el estado a números. Cada juego expone lo suyo; se coge lo que haya. */
function vectorizar(st) {
    const v = [];
    if (st.fen) {
        // El FEN ya es una descripción completa: se codifica carácter a carácter.
        for (const ch of st.fen.split(' ')[0]) v.push(ch.charCodeAt(0));
    } else if (st.board) {
        aplanarTablero(st.board, v);
    } else if (st.state?.board) {
        aplanarTablero(st.state.board, v);
    } else if (st.state?.grid) {
        aplanarTablero(st.state.grid, v);
    } else if (st.snake) {
        for (const s of st.snake) v.push(s.x, s.y);
        if (st.food) v.push(st.food.x, st.food.y);
    } else if (st.fagocito) {
        v.push(st.fagocito.x, st.fagocito.y);
        for (const g of st.ghosts ?? []) v.push(g.x, g.y);
        v.push((st.pellets ?? []).length);
    }
    v.push((st.legal_moves ?? []).length);
    return v;
}

/** Narración mínima para juegos que no traen `describe()` propio. */
function narrar(st, juego) {
    const partes = [`${juego}.`];
    if (st.turn) partes.push(`Turno de ${st.turn === 'white' ? 'blancas' : 'negras'}.`);
    if (st.fen) partes.push(`Posición: ${st.fen.split(' ')[0]}.`);
    if (st.score !== undefined) {
        partes.push(`Marcador: ${typeof st.score === 'object' ? JSON.stringify(st.score) : st.score}.`);
    }
    partes.push(`Puedes: ${(st.legal_moves ?? []).slice(0, 12).join(', ')}` +
                ((st.legal_moves ?? []).length > 12 ? '…' : '') + '.');
    return partes.join(' ');
}
