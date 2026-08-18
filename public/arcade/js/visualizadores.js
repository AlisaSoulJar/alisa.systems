/**
 * visualizadores.js — qué dibuja cada juego, en UN sitio
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ POR QUÉ EXISTE ESTE FICHERO
 *
 * El visualizador de cada juego se declaraba en SU PÁGINA:
 *
 *     montarMesa({ juego: 'ajedrez', visualizador: 'chess_visualizer.js' })
 *
 * Y eso convierte «con qué se dibuja el ajedrez» en una propiedad de la página, no
 * del juego. Funciona mientras el juego se vea en un solo sitio. En cuanto apareció
 * un segundo —`arcade/sala.html`, la sala de bolsillo a la que te lleva sentarte en
 * una mesa de la Sala del Huevo— la sala no tenía forma de saberlo, así que dibujaba
 * los diecisiete con la mesa genérica. El ajedrez salía con discos y hexágonos, con
 * `chess_visualizer.js` en el mismo repositorio y sin usar.
 *
 * Copiar la lista en la sala habría sido la novena lista paralela de este proyecto.
 * `prueba_visualizadores.mjs` comprueba que esto y las páginas dicen lo mismo, así
 * que no pueden separarse en silencio.
 *
 * ⚠️ AQUÍ SÓLO VAN LOS VISUALIZADORES A MEDIDA.
 *
 * `mesa_cartas.mjs` y `mesa_tablero.mjs` no: ésos se eligen por lo que el juego
 * PUBLICA —zonas y ninguna rejilla es de cartas—, que es un dato que ya existe y no
 * hay que declarar. Ponerlos aquí sería declarar lo deducible, y ese es justo el
 * fallo que este fichero viene a arreglar.
 *
 * Que un juego tenga fichero propio en `js/` NO basta para entrar: `go_visualizer.js`,
 * `reversi_visualizer.js`, `checkers_visualizer.js` y `xiangqi_visualizer.js` existen
 * y sus páginas no los usan — se pasaron a la mesa genérica a propósito. Manda lo que
 * la página monta, no lo que hay en la carpeta.
 */
export const VISUALIZADOR = {
    ajedrez:   'chess_visualizer.js',
    mancala:   'mancala_visualizer.js',
    blackjack: 'blackjack_visualizer.js',
    poker:     'poker_visualizer.js',
    snake:     'snake_visualizer.js',
    peaton:    'peaton_visualizer.js',
};

/**
 * Con qué nombre le pregunta al hub el visualizador, cuando no es el del juego.
 *
 * `chess_visualizer.js` se construye con `gameId: 'chess'` y las reglas se llaman
 * `ajedrez`. En su página propia lo arregla `montarMesa({ idJuego: 'chess' })`, que
 * registra las reglas también con ese nombre; fuera de ella no había nada que lo
 * dijera. Es el mismo dato que `idJuego`, puesto donde lo pueda leer cualquiera.
 */
export const ALIAS_DE_VISUALIZADOR = {
    ajedrez: 'chess',
};

/**
 * ⚠️ SABER SER INVITADO NO ES UN INTERRUPTOR: SE COMPRUEBA UNO A UNO.
 *
 * Estos visualizadores se escribieron cuando cada juego tenía una página para él
 * solo, y por eso cada uno es dueño de todo: pone su cámara, monta sus controles,
 * añade sus luces a la escena, pinta su propio panel y pregunta al hub por SU
 * identificador. Dentro de la mesa de otro, cada una de esas cinco cosas es una
 * forma distinta de romperse, y no se rompen igual.
 *
 * Medido al enchufarlos de golpe: el ajedrez dibujó su tablero de verdad, el póker
 * puso un tapete de tamaño de sala y ninguna carta, y el mancala murió en
 * `renderer.domElement`. O sea que «los visualizadores propios saben ser invitados»
 * no es una frase que se pueda decir de todos a la vez.
 *
 * Así que la lista de arriba dice CON QUÉ SE DIBUJA —eso vale siempre, y lo usa
 * `montarMesa` en la página propia de cada juego— y ésta de abajo dice CUÁL ESTÁ
 * PROBADO dentro de la mesa de otro. La sala de bolsillo sólo usa los de abajo; a
 * los demás les pone la mesa genérica, que es lo que hacía antes y funcionaba.
 *
 * Un juego entra aquí cuando `npm run invitados` lo da por bueno, no cuando alguien
 * cree que ya está.
 */
export const SABE_SER_INVITADO = new Set([
    'ajedrez',
    'mancala',
    'blackjack',
]);
