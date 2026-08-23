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
    // ⚠️ Damas recibe OPCIONES: es el primer juego con normas variables
    // (`damaVuela`, `peonComeAtras`). Sin opciones da exactamente lo de siempre.
    damas:    (o) => import('./damas.js').then(m => m.crearDamas(o ?? {})),
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
    /**
     * ⚠️ EL ENTORNO PUENTE: EL ÚNICO CUYO NÚMERO SE ENTIENDE DESDE FUERA.
     *
     * Nadie de fuera sabe qué significa un 0,38 en canadiense. La familia del 2048
     * lleva años siendo entorno de referencia en aprendizaje por refuerzo, así que
     * su puntuación ya tiene con qué compararse en la cabeza de cualquiera que lea
     * la tabla. Para un banco que se publica, un entorno PUENTE vale más que uno
     * nuevo: ancla a todos los demás.
     *
     * Y trae algo que ninguno de los treinta y nueve tenía: AZAR **DESPUÉS** de
     * decidir. El parchís y la generala tiran el dado ANTES y eliges qué hacer con
     * lo que salió; aquí decides y entonces el mundo mete una ficha donde quiera.
     */
    marea: () => import('./marea.js').then(m => m.marea),
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
    // Y el octavo llena el hueco que destapó el censo de géneros: COMUNICACIÓN.
    // En los veintisiete anteriores una silla sólo puede decirle algo a otra
    // jugando. Aquí las seis acciones de la guía no tocan el mundo — sólo cambian
    // lo que sabe el piloto, y no hay otra forma de ganar.
    cabina: () => import('./cabina.js').then(m => m.cabina),
    // ⚠️ EL PRIMERO QUE CORRE SOBRE UNA PIEZA DEL MOTOR. Toda su física es
    // `BoidsSystem`, que llevaba ahí sin usar porque no se podía repetir. Con dos
    // arreglos de cuatro líneas —semilla inyectable y no importar el renderizador—
    // salió un juego con una estructura que no teníamos: influir en un sistema
    // emergente que no obedece. Si esto escala, quedan 23 sistemas por sembrar.
    rebano: () => import('./rebano.js').then(m => m.rebano),
    // ⚠️ UN MUNDO QUE SE PUEDE MATAR, y la estructura que ni el censo supo
    // nombrar: los veintinueve anteriores castigan en el acto, aquí el castigo
    // llega cuarenta turnos después. La jugada que más puntúa ahora es la que te
    // mata luego. Física de presas: `FoodChainSystem`, otra pieza del motor.
    pradera: () => import('./pradera.js').then(m => m.pradera),
    // ⚠️ DEDUCCIÓN SOCIAL, y no inventa ni un mecanismo: junta el reloj propio de
    // pradera, el `esperar` de relevo, el compromiso simultáneo de frentes y la
    // vista por asiento de flota. Es la primera vez que hay algo que MENTIR — un
    // agente podía jugar mal, nunca engañar. Lo único que una FSM no puede
    // intentar, y por eso lo que más dice de un modelo de lenguaje.
    // ⚠️ Y recibe OPCIONES por lo mismo que damas: tiene normas variables
    // —`rondasDeDebate` y `hablaLibre`— y con ellas cambia QUÉ ES LEGAL. Son las
    // que separan la división de protocolo de la de lenguaje natural, que en
    // AIWolf son dos competiciones distintas y aquí son la misma partida.
    nave: (o) => import('./nave.js').then(m => m.crearNave(o ?? {})),
    /**
     * ⚠️ EL PRIMER JUEGO EN EL QUE HABLAR NO ES UNA FACETA: ES TODO.
     *
     * Nave le dio voz a su junta y el banco no se movió —0.41 → 0.38, dentro del
     * ruido— porque allí la palabra compite con moverse y hacer tareas: con dos
     * rondas y cuatro bocas, una voz aporta 2 de 8 intervenciones. Aquí no hay
     * nada debajo: un aldeano señala de noche sin efecto, habla de día y vota.
     * Quien habla mal no es flojo en una faceta, es flojo y ya.
     *
     * Recibe opciones por lo mismo que nave y damas: sus normas cambian qué es
     * legal, así que viajan en el recibo.
     */
    shinigami: (o) => import('./shinigami.js').then(m => m.crearShinigami(o ?? {})),
    // ⚠️ EL PRIMER JUEGO DE CARTAS QUE PUBLICA SUSTRATO NATIVO, y el que estrena
    // una forma de esconder información que no teníamos: los treinta anteriores
    // revelan al ACTUAR —preguntar en el go fish, apostar en el póker— y aquí se
    // revela al ELEGIR ENTRE DOS FUENTES. Robar del descarte te da la carta que
    // necesitas y le dice al rival qué juntas; robar del mazo no dice nada y casi
    // nunca sirve. No hay jugada que no pague uno de los dos precios.
    remigio: (o) => import('./remigio.js').then(m => m.crearRemigio(o)),
    // El chinchón sale del MISMO módulo: es la misma maquinaria con la baraja
    // española, siete cartas, cierre a cinco y su jugada con premio. Ver la nota
    // larga en `remigio.js` sobre qué salió gratis y qué no.
    chinchon: (o) => import('./remigio.js').then(m => m.crearChinchon(o)),
    // ⚠️ EL PRIMERO QUE USA LOS CUATRO MATERIALES A LA VEZ —tablero, dados, cartas y
    // fichas— y el primero que mide VALORAR BAJO COMPETENCIA: cuanto vale esto para mi
    // sabiendo lo que vale para el otro. Ninguna de las ocho columnas de la matriz de
    // generos cubria eso. Su subasta se midio SOLA antes de escribir el juego.
    alisapolis: (o) => import('./alisapolis.js').then(m => m.crearAlisapolis(o)),
    // ⚠️ EL PRIMERO CON DADO, y el que vino a contestar una pregunta de
    // arquitectura: ¿hace falta un motor de dados como el de cartas y el de
    // tableros? No. Un dado no es una cuarta estructura — la tirada RESTRINGE
    // `legal_moves`, que el contrato ya expresa, y visualmente es un objeto con una
    // cara, o sea una zona con un item. Es además el primer juego que usa las TRES
    // estructuras del sustrato a la vez: rejilla, piezas y zonas.
    parchis: (o) => import('./parchis.js').then(m => m.crearParchis(o)),
    // ⚠️ EL RINCÓN OPUESTO DEL PARCHÍS EN EL CONTRATO: cinco dados y NINGÚN
    // tablero, o sea sólo zonas. Si los dos extremos entran sin tocar nada, el
    // contrato aguanta lo que hay en medio. Y es el primero cuya decisión no es
    // dónde mover sino QUÉ APARTAR y CUÁNDO PARAR de tirar.
    generala: (o) => import('./generala.js').then(m => m.crearGenerala(o)),
    // La oca: tablero y dado, pero con las CASILLAS haciendo el trabajo — cada
    // tipo hace algo distinto y hay que verlo sin leer el código. Va con dos
    // fichas por jugador a propósito: con una sola no se decide nada y sería un
    // segundo `guerra`, que ya tenemos y basta con uno.
    oca: (o) => import('./oca.js').then(m => m.crearOca(o)),
    // ⚠️ TABLERO **Y** BARAJA, que era la combinación que faltaba por probar. Mismo
    // tablero que el parchís a propósito: así los dos se diferencian en UNA sola
    // cosa —dado contra mano de cartas— y comparar un agente en ambos mide justo
    // eso. Con dado no eliges tu tirada; con cartas eliges cuál gastas y cuál
    // guardas, y eso es información oculta que el dado no tiene.
    canadiense: (o) => import('./canadiense.js').then(m => m.crearCanadiense(o)),
    // El primero donde DÓNDE puede ir una pieza depende de QUÉ es: los otros treinta
    // y cinco colocan en sitios libres —una casilla vacía, un hueco, un asiento— y
    // aquí la legalidad es un emparejamiento. Idea de Oscar, para tener un caso que
    // enseñe a posicionar cosas que encajan y cosas que no.
    domino: (o) => import('./domino.js').then(m => m.crearDomino(o)),
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
    // Los identificadores van sin tildes porque viajan en la URL; el título no
    // tiene por qué pagar eso. Estos tres llevaban meses saliendo pelados en la
    // ficha y en la portada, y no lo vio nadie porque «Domino» también es una
    // palabra: el defecto no da error, sólo escribe mal el nombre del juego.
    domino: 'Dominó', parchis: 'Parchís', rebano: 'Rebaño', chinchon: 'Chinchón', alisapolis: 'Alisápolis',
};
export const TITULOS = Object.fromEntries(JUEGOS.map(
    j => [j, TITULOS_PROPIOS[j] ?? j.charAt(0).toUpperCase() + j.slice(1)]));

/**
 * Cuántas sillas admite cada juego. **Se declara, no se deduce.**
 *
 * ⚠️ POR QUÉ EXISTE ESTE OBJETO, Y CUÁNTO COSTÓ NO TENERLO
 *
 * El árbitro de las mesas compartidas averiguaba el número de asientos
 * JUGANDO: empezaba suponiendo uno y lo subía cada vez que veía cambiar el
 * turno. Es ingenioso y está roto en el único momento que importa — **antes de
 * la primera jugada no puede saber nada**, así que en una mesa recién abierta
 * acepta a todo el que llegue.
 *
 * Pasó de verdad, montando una partida de ajedrez entre dos agentes: se sentaron
 * cuatro. Los dos primeros se llevaron las piezas y a la invitada de verdad le
 * tocó mirar con la lista de acciones vacía, sin que nada fallara ni avisara.
 *
 * No es que faltara una comprobación: es que la comprobación **no podía existir**
 * mientras el dato se descubriera por accidente. Con el número declarado, el
 * árbitro puede decir «no cabes» desde el primer segundo, y `prueba_sillas.mjs`
 * compara lo declarado contra lo que se ve jugando — si algún día no cuadran,
 * salta antes de que alguien se quede de pie.
 *
 * `1` significa que sentar a un segundo no cambia nada: o es un solitario, o el
 * rival no es una silla sino el reglamento (el crupier del blackjack, la casa
 * del póker, las cartas de guerra).
 */
export const SILLAS = {
    ajedrez: 2, go: 2, reversi: 2, damas: 2, xiangqi: 2, mancala: 2,
    snake: 1, fagocito: 1, peaton: 1,
    blackjack: 1, poker: 1, guerra: 1,
    brisca: 4, tute: 4, hearts: 4, spades: 4, unit: 4,
    gofish: 3, entropy: 2,
    sokoban: 1, cripta: 1, rebano: 1, pradera: 1,
    // Un solitario, y el rival es el azar que rellena la rejilla detrás de ti.
    marea: 1,
    flota: 2, defensa: 2, sigilo: 2, frentes: 2, relevo: 2, cabina: 2,
    nave: 4,
    /**
     * Ocho, y el número lo eligió una medida con DOS varas —jugable y medible—
     * sobre ochenta semillas. Está la tabla entera en la cabecera de `shinigami.js`.
     *
     * El resumen: con seis, la casa juega cinco sillas y al agente le tocan cinco
     * decisiones por partida, que con ±45 por voto y ±200 por ganar no separan
     * nada —la tabla lo cantó con un azar de 2,15, un número sin sentido—. Ocho
     * dan 7,3 decisiones, equilibran el juego (42–38 contra 35–45) y alargan la
     * partida a 3,6 días. Y el hueco casa−suelo sigue siendo 6,7 veces su error.
     */
    shinigami: 8,
    // Dos: con más manos el descarte pasa por tanta gente antes de volver a ti
    // que la señal de «éste está juntando corazones» se diluye, y esa señal es
    // justo lo que el juego mide.
    remigio: 2,
    chinchon: 2,
    alisapolis: 2,
    // Cuatro colores, como el de verdad.
    parchis: 4,
    generala: 2, oca: 2,
    canadiense: 4,
    domino: 2,
};

/** Carga las reglas de un juego. `opts.url` para los que leen la biblioteca. */
/**
 * ⚠️ DOS JUEGOS TIENEN DOS NOMBRES, Y ESO ROMPÍA LOS AVISOS.
 *
 * `chess.html` monta `{ juego: 'ajedrez', idJuego: 'chess' }` y `checkers.html`
 * `{ juego: 'damas', idJuego: 'checkers' }`: el visualizador busca la partida con
 * el nombre inglés y las reglas viven con el español. Viene de antiguo y no se
 * cambia por gusto, porque el nombre inglés está en direcciones que ya circulan.
 *
 * Lo que no se veía es que el RECIBO se lleva el nombre del visualizador. Así que
 * un aviso de damas llegaba diciendo `juego: 'checkers'`, esto devolvía `null`, y
 * `npm run avisos` lo despachaba con «no se repite — juego desconocido». Salió el
 * 13-08-2026 con una queja de Oscar sobre cómo mueve la dama: treinta jugadas
 * grabadas y ninguna forma de volver a verlas.
 *
 * Se resuelve aquí, en el único sitio por el que pasan todos —avisos, verificador,
 * tabla— en vez de en cada uno.
 */
const OTROS_NOMBRES = { checkers: 'damas', chess: 'ajedrez' };

export async function cargarReglas(juego, opts) {
    const f = REGLAS[juego] ?? REGLAS[OTROS_NOMBRES[juego]];
    return f ? f(opts) : null;
}
