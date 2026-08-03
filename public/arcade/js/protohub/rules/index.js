/**
 * rules/index.js — LA ÚNICA LISTA DE JUEGOS
 * ═══════════════════════════════════════════════════════════════════════════
 * Quién puede jugar a qué se declara **aquí y en ningún otro sitio**.
 *
 * ⚠️ POR QUÉ EXISTE ESTE FICHERO (2 de agosto de 2026)
 * Hoy he arreglado seis veces el mismo fallo, siempre igual: una lista escrita
 * a mano que se separa en silencio de la realidad.
 *
 *   · `inventario_piezas.py` no veía los imports con `?v=4`
 *   · el censo contaba las fichas que acompañan a cada modelo → 99 % falso
 *   · `check_gym_envs.mjs` leía una lista fija: decía «5» con 6 entornos
 *   · `preflight` buscaba una palabra en la salida de otro programa
 *   · `.gitignore` con comentarios al final de línea: no ignoraba nada
 *   · y **el verificador de producción conocía 11 juegos con 16 en el catálogo**
 *
 * Ese último es el que muerde a un usuario: juegas una brisca, mandas tu
 * partida y el servidor contesta «no sé jugar a brisca». La partida es válida;
 * el que está mal es el registro.
 *
 * Así que: una declaración, tres consumidores —el navegador, el servidor de
 * Node y la Function de Cloudflare— y ninguno con lista propia.
 *
 * Los valores son FUNCIONES que cargan, no los módulos ya cargados: así el
 * catálogo se puede leer entero sin traerse dieciséis ficheros de reglas, y los
 * empaquetadores siguen viendo los `import()` para incluirlos.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** juego → () => Promise<módulo de reglas> */
export const REGLAS = {
    // Tablero, exportados directamente
    ajedrez:  () => import('./ajedrez.js').then(m => m.ajedrez),
    go:       () => import('./go.js').then(m => m.go),
    reversi:  () => import('./reversi.js').then(m => m.reversi),
    damas:    () => import('./damas.js').then(m => m.damas),
    xiangqi:  () => import('./xiangqi.js').then(m => m.xiangqi),
    mancala:  () => import('./mancala.js').then(m => m.mancala),
    snake:    () => import('./snake.js').then(m => m.snake),
    fagocito: () => import('./fagocito.js').then(m => m.fagocito),
    peaton:   () => import('./peaton.js').then(m => m.peaton),

    // Cartas: se construyen leyendo `card_library.json`
    blackjack: (o) => import('./blackjack.js').then(m => m.crearBlackjack(o)),
    poker:     (o) => import('./poker.js').then(m => m.crearPoker(o)),

    // La familia de BAZAS: cuatro juegos de una sola base portada del Python
    brisca: (o) => import('./bazas.js').then(m => m.crearBrisca(o)),
    tute:   (o) => import('./bazas.js').then(m => m.crearTute(o)),
    hearts: (o) => import('./bazas.js').then(m => m.crearHearts(o)),
    spades: (o) => import('./bazas.js').then(m => m.crearSpades(o)),

    // El CONTROL del banco de pruebas: sin decisiones, todos deben empatar
    guerra: (o) => import('./guerra.js').then(m => m.crearGuerra(o)),

    // Información oculta y memoria, cada uno por su lado:
    //   gofish  — deducción pura; el estado publica quién pidió qué
    //   unit    — descarte; el orden de juego es parte del problema
    //   entropy — ganar es MINIMIZAR, y la caja está medio tapada
    gofish:  (o) => import('./gofish.js').then(m => m.crearGoFish(o)),
    unit:    (o) => import('./unit.js').then(m => m.crearUnit(o)),
    entropy: (o) => import('./entropy.js').then(m => m.crearEntropy(o)),
};

export const JUEGOS = Object.keys(REGLAS);

/**
 * Nombres bonitos, para catálogos e interfaces.
 *
 * ⚠️ SE DERIVAN, NO SE ESCRIBEN. Aquí sólo van los que no salen bien solos —
 * tildes, mayúsculas raras, aclaraciones—. El resto se saca de la clave.
 *
 * Y esto es una reincidencia, que es lo que la hace digna de contarse: este
 * fichero se creó hoy mismo para acabar con las listas escritas a mano, y su
 * propio `TITULOS` era una lista escrita a mano. Al añadir gofish, unit y
 * entropy se quedó corta en el acto. Una lista paralela no se arregla
 * rellenándola: se arregla haciendo que no pueda existir.
 */
const TITULOS_PROPIOS = {
    peaton: 'Peatón', poker: 'Póker', gofish: 'Go Fish',
    guerra: 'Guerra (control)', xiangqi: 'Xiangqi',
};
export const TITULOS = Object.fromEntries(JUEGOS.map(
    j => [j, TITULOS_PROPIOS[j] ?? j.charAt(0).toUpperCase() + j.slice(1)]));

/** Carga las reglas de un juego. `opts.url` para los que leen la biblioteca. */
export async function cargarReglas(juego, opts) {
    const f = REGLAS[juego];
    return f ? f(opts) : null;
}
