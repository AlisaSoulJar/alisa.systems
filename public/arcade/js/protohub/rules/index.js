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

    // ⚠️ EL PRIMERO QUE PUBLICA `sustrato(p)` NATIVO.
    // Los diecinueve de arriba dicen su estado en cinco codificaciones distintas
    // y `sustrato.js` las traduce. Éste no necesita traducción, así que el 2D,
    // el 3D y el texto salieron el mismo día que las reglas — sin escribir un
    // visualizador. Es la demostración con cronómetro de que el motor hace lo
    // que promete: planificación espacial con estados irreversibles, un género
    // que no estaba cubierto, en doscientas líneas y cero arte.
    sokoban: () => import('./sokoban.js').then(m => m.sokoban),
    // Y el segundo: OBSERVABILIDAD PARCIAL, lo que ninguno de los veintiuno
    // anteriores tenía — aquí no se ve el estado, se descubre. Es el género que
    // separa a un agente con memoria de uno sin ella, y el primero que se apoya
    // en una pieza del motor (`BSPSystem`) para generar el mundo.
    cripta: () => import('./cripta.js').then(m => m.cripta),
    // Y el tercero, que lo eligió una MEDIDA y no una corazonada: `matriz_generos`
    // enseñó que la casilla `espacial + oculto + rival` estaba vacía y que catorce
    // de veintiún juegos ocupaban sólo dos perfiles. Deducir dónde está lo que
    // otro ha escondido, mientras él deduce lo mismo de ti.
    flota: () => import('./flota.js').then(m => m.flota),
    // Y el cuarto, también elegido por la matriz: `autonomo` lo sostenían 3 de 22,
    // ninguno lo juntaba con un adversario, y NINGUNO tenía economía — un recurso
    // que obliga a elegir entre gastar ahora y poder gastar luego. Es la primera
    // vez que el motor pide planificar contra un reloj que corre sin ti.
    defensa: () => import('./defensa.js').then(m => m.defensa),
    // Y el quinto cierra la tabla: los CINCO ejes en un solo juego. El sigilo ES
    // esa interseccion — sin niebla es un pillapilla, sin rival es cripta, sin
    // drones es un duelo limpio. Ademas es el primero ASIMETRICO: dos oficios
    // distintos que puntuan distinto en el mismo entorno.
    sigilo: () => import('./sigilo.js').then(m => m.sigilo),
    // Y el sexto rompe el supuesto que compartían los VEINTICUATRO anteriores:
    // que cuando te toca, el pasado ya está decidido. Aquí los dos eligen a la
    // vez, así que la jugada buena no es la que gana mirando el tablero sino la
    // que el otro no prevea. Es la diferencia entre el ajedrez y el penalti.
    frentes: () => import('./frentes.js').then(m => m.frentes),
    // Y el séptimo llena la última casilla vacía: COOPERATIVO. En los veinticinco
    // anteriores, cuando decide alguien más, decide en tu contra — el supuesto
    // estaba tan metido que hasta el instrumento que mide la tabla lo daba por
    // hecho y no habría sabido reconocer un cooperativo aunque lo tuviera delante.
    relevo: () => import('./relevo.js').then(m => m.relevo),
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
