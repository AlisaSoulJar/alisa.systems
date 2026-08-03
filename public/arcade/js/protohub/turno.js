/**
 * turno.js — «¿me toca a mí?», respondido en un solo sitio
 * ═══════════════════════════════════════════════════════════════════════════
 * Parece la pregunta más tonta del contrato y es la que más silenciosamente se
 * falla, porque **la suite tiene dos convenciones para `turn` y ninguna estaba
 * escrita**:
 *
 *     ajedrez, go, reversi, damas, xiangqi, mancala   'white' / 'black'
 *     snake, fagocito, peatón                         'white'  (un solo asiento)
 *     blackjack                                       'player' / 'dealer'
 *     brisca, tute, hearts, spades, gofish, unit,
 *     entropy, guerra                                 'player' / 'cpu1' / 'cpu2'…
 *     póker                                           undefined
 *
 * Son herencias legítimas: los de tablero vienen del vocabulario del ajedrez y
 * los de cartas del motor Python. El problema no es que existan, es que quien
 * consume el estado tiene que adivinar cuál le toca.
 *
 * ⚠️ CÓMO APARECIÓ
 * El calibrador comprobaba `turn === 'player'` para saber si movía el agente. En
 * los nueve juegos de tablero eso **nunca** es cierto, así que le daba las dos
 * manos al rival de la casa: las dos políticas jugaban idéntico y la tabla decía
 * «no distingue» de nueve entornos que sí distinguen. Un fallo de una línea que
 * habría publicado una conclusión falsa sobre la mitad del catálogo — y la
 * conclusión habría sido *pesimista*, que es la clase que nadie va a revisar.
 *
 * Lo que un agente de fuera habría sufrido es peor: creerse que no le toca
 * nunca, o mover cuando no debe, sin un solo error en consola.
 *
 * LA REGLA
 * El asiento medido es SIEMPRE el primero: quien abre. Blancas en los tableros,
 * `player` en las cartas, el único asiento en los de un jugador. Todo lo demás
 * es la casa.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * ⚠️ SEGUNDA VERSIÓN. LA PRIMERA ADIVINABA EL NOMBRE, Y SE EQUIVOCABA.
 *
 * Empecé con una lista de asientos «míos» —`player`, `white`, `red`…— y comparar
 * contra ella. Parecía suficiente hasta que el control del arnés de agentes
 * (`--modelo eco`, que elige siempre la primera opción y por tanto DEBE sacar lo
 * mismo que la política tonta del calibrador) sacó números distintos en dos
 * juegos:
 *
 *     go        eco 271,5   ·  calibrador 63,5
 *     reversi   eco  25,0   ·  calibrador 37,0
 *
 * En el go y en el reversi **abren las negras**. La lista decía que `black` es
 * la casa, así que el calibrador medía al rival y no al agente. Los dos
 * programas jugaban partidas distintas creyendo que jugaban la misma.
 *
 * La lección no es que faltara `black` en el conjunto: es que **no hay que
 * adivinar el nombre del asiento**. El juego ya lo dice — el que abre es el que
 * medimos —, y preguntar es gratis. Cualquier lista de nombres se queda corta en
 * cuanto entre un juego nuevo con otra convención, y se queda corta en silencio.
 *
 * (Y merece anotarse cómo salió: no lo encontró una prueba de las que ya había,
 * lo encontró un CONTROL — dos caminos independientes que tienen que dar el
 * mismo número. Ninguno de los dos era «el correcto» por sí solo; lo que
 * informaba era que no coincidieran.)
 */

/**
 * Crea el juez de turno de una partida: el asiento que abre es el que medimos.
 *
 * @param {object} estadoInicial  `reglas.estado(p)` recién empezada la partida
 * @returns {(estado: object) => boolean}  ¿le toca al asiento medido?
 */
export function crearJuezDeTurno(estadoInicial) {
    const mío = estadoInicial?.turn ?? null;
    // Sin turno declarado —el póker— hay un solo asiento y siempre es el nuestro.
    if (mío === null || mío === undefined) return () => true;
    return (estado) => (estado?.turn ?? null) === mío;
}

/**
 * Versión de un solo uso, para quien no guarda el estado inicial.
 * Necesita las reglas para poder preguntar quién abre.
 */
export function meToca(estado, reglas, partida) {
    if (estado?.turn === undefined || estado?.turn === null) return true;
    const inicial = reglas?.estado?.(reglas.nuevaPartida?.({ semilla: 1 }) ?? partida);
    return (inicial?.turn ?? null) === estado.turn;
}
