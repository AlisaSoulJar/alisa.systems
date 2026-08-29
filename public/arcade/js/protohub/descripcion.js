/**
 * descripcion.js — LA PUERTA DE LENGUAJE, EN UN SOLO SITIO
 * ═══════════════════════════════════════════════════════════════════════════
 * Lo que un agente de lenguaje LEE de una partida. Hasta ahora vivía dentro de
 * `ProtoHubEnv.describe()`, que sólo existe en el banco de pruebas.
 *
 * ⚠️ POR QUÉ SE SACA DE AHÍ
 * En cuanto un LLM pueda ocupar un asiento en una PÁGINA —jugando contra una
 * persona, contra una política o contra otro modelo— tiene que leer exactamente
 * el mismo texto que lee en el banco. Si la página se escribiera su propia
 * descripción, un modelo podría sacar 40 en la tabla y 12 en la mesa, o al revés,
 * y no habría forma de saber si la diferencia es del modelo o del texto.
 *
 * Una copia «parecida» es peor que no tenerla: se separan sin avisar.
 *
 * ⚠️ Y POR QUÉ EL TEXTO NO SE HA MEJORADO AL MOVERLO
 * Da la mano usar `TITULOS` —diría «Póker» y «Go Fish» en vez de «Poker» y
 * «Gofish»—. No se toca: hay números publicados medidos con ESTE texto, y
 * cambiar el prompt cambia lo que se mide. Se cambiará el día que se vuelva a
 * medir todo, no de tapadillo.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { puntuacionDe } from './Verificador.js';

/** Nombre legible sin depender de que el módulo lo declare. */
export const nombreLegible = (juego) => juego.charAt(0).toUpperCase() + juego.slice(1);

/**
 * Describe una partida a partir de su ESTADO, no de su partida interna.
 *
 * Es deliberado: así vale igual en el navegador con las reglas delante, en un
 * worker que ha re-simulado, y en una mesa compartida donde el cliente sólo
 * tiene el JSON que le mandaron.
 *
 * @param {string} juego
 * @param {object} st   lo que devuelve `reglas.estado(p)`
 */
/**
 * ⚠️ SI SE CORTA LA LISTA DE JUGADAS, SE DICE. ANTES NO SE DECÍA.
 *
 * Esto era `.slice(0, 12)` a secas. Lo encontré JUGANDO por esta puerta, que es lo
 * único que lo destapa: en una mano de entropy las reglas me ofrecían seis
 * `descartar_y_voltear` y la descripción me enseñó cuatro. Dos jugadas legales que
 * yo, como agente, no podía ni saber que existían.
 *
 * Eso no es un recorte cosmético: rompe lo único que sostiene la tabla del banco.
 * La persona ve sus jugadas en botones —todas— y el agente veía doce. No estaban
 * jugando al mismo juego, y el que salía perdiendo era siempre el mismo.
 *
 * En go son 361 y no caben en un prompt, así que el corte se queda — pero deja de
 * ser mudo. Se dice cuántas hay en total, para que quien lee sepa que hay más y
 * pueda pedirlas. Un límite dicho es una regla; un límite callado es una trampa.
 */
const TOPE_JUGADAS = 24;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ EL TERCER ARGUMENTO: EL SUSTRATO. Y POR QUÉ LLEGA TAN TARDE.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Motoko lo dijo el 25-08-2026, jugando en el gimnasio, y nadie le contestó:
 *
 *     «En Sokoban no puedo jugar razonando porque el estado que me devuelve la
 *     API es puramente numérico. ¡NO ME MUESTRA EL MAPA! … Si el contrato de la
 *     API no me da el contexto espacial del puzzle, un LLM jugará igual que una
 *     política al azar.»
 *
 * Tenía razón, y no era un caso: medido el 29-08, de los 26 juegos de rejilla
 * **9 publicaban su tablero en texto y 17 no**. Los nueve son los que tienen una
 * rama escrita a mano en `contarEspacial` o publican `fen`/`board`. Los otros
 * diecisiete caían al volcado de escalares —«t: 0. rotasPorJugador: [0,0]»— que
 * basta para no hacer una jugada ilegal y no basta para elegir.
 *
 * ⚠️ Y LA PIEZA PARA ARREGLARLO LLEVABA MESES ESCRITA, SIN UN SOLO LLAMADOR.
 *
 * `describirSustrato(sus)`, más abajo en este mismo fichero: dibuja la rejilla,
 * lista las piezas y cuenta los montones. Su propia cabecera dice para qué nació
 * —«esto es lo que hace que un género nuevo no cueste nada»— y estaba exportada
 * y muerta. Es el patrón que Oscar nombró esta semana: el proyecto tiene mejor
 * maquinaria de la que ejecuta, y lo caro es que no se parece a código muerto.
 *
 * ⚠️ POR QUÉ UN ARGUMENTO NUEVO Y NO CALCULARLO AQUÍ.
 *
 * El sustrato bueno sale de `reglas.sustrato(p)`, y para eso hacen falta las
 * reglas y la partida, que esta función no tiene ni debe tener: describe un
 * ESTADO, y eso es lo que la hace valer igual en el navegador, en un worker que
 * ha re-simulado y en una mesa compartida que sólo recibió un JSON. Se lo pasa
 * quien lo tenga; quien no, se queda exactamente como estaba.
 *
 * ⚠️ Y ESTO CAMBIA EL PROMPT DE ESOS DIECISIETE, O SEA SUS NÚMEROS.
 *
 * La cabecera de este fichero avisa de que el texto no se mejora de tapadillo
 * porque hay medidas publicadas hechas con él. Se cumple: los nueve que ya
 * contaban su tablero no cambian ni una palabra —siguen entrando por su rama de
 * `contarEspacial`, que manda—. Cambian los diecisiete que jugaban a ciegas, y
 * sus números había que rehacerlos de todas formas: medían la puerta, no al
 * jugador.
 *
 * @param {string} juego
 * @param {object} st    lo que devuelve `reglas.estado(p)`
 * @param {object} [sus] el sustrato, si quien llama lo tiene
 */
export function describirEstado(juego, st, sus) {
    const todas = st.legal_moves ?? [];
    const puedes = todas.length > TOPE_JUGADAS
        ? `${todas.slice(0, TOPE_JUGADAS).join(', ')} … y ${todas.length - TOPE_JUGADAS} más (${todas.length} en total)`
        : todas.join(', ');
    /**
     * ⚠️ EL OBJETIVO VA LO PRIMERO, ANTES QUE LOS PUNTOS.
     *
     * Porque los puntos no significan nada sin él. «Puntos: -11» puede ser bueno o
     * malo, y no había forma de saberlo: yo lo deduje jugando dos manos y mirando
     * hacia dónde se movía el número.
     *
     * Se dice una vez por vuelta y ocupa una línea. Es el mejor cambio por carácter
     * de toda esta descripción — sin él, todo lo demás es un cuadro de mandos sin
     * etiquetas.
     */
    const meta = st.objetivo ? ` ${st.objetivo}` : '';
    return `${nombreLegible(juego)}.${meta}${normasEnPalabras(st)} Puntos: ${puntuacionDe(st)}.`
         + ` Turno: ${st.turn ?? 'único'}.`
         + contarLaMesa(st, juego, sus)
         + (st.is_game_over ? ' La partida ha terminado.'
                            : ` Puedes: ${puedes || '(nada)'}.`);
}

/**
 * ⚠️ CON QUÉ NORMAS SE JUEGA, DICHO EN VOZ ALTA.
 *
 * Damas es el primer juego con normas variables: la dama puede volar o no, el peón
 * puede comer hacia atrás o no. Una persona lo ve en el tablero a la primera jugada;
 * un agente que juega por esta puerta NO VE NADA, y sin esta línea supondría las
 * normas de siempre y jugaría mal por un motivo que no es suyo.
 *
 * Y eso rompería lo único que sostiene la tabla del banco: que la persona y la
 * máquina estén jugando al mismo juego con la misma información. La lista de
 * `legal_moves` no basta para deducirlo — al empezar la partida son idénticas en
 * las cuatro variantes; la diferencia aparece cuando ya has coronado.
 *
 * Se dicen sólo las que están ACTIVAS. Enumerar las apagadas alargaría el prompt de
 * los treinta y cuatro juegos que no tienen ninguna para no decir nada.
 */
function normasEnPalabras(st) {
    const n = st.normas;
    if (!n) return '';
    const activas = Object.entries(n).filter(([, v]) => v === true).map(([k]) => k);
    return activas.length ? ` Normas especiales: ${activas.join(', ')}.` : '';
}

/**
 * ⚠️ LO QUE HAY SOBRE LA MESA, CONTADO CON PALABRAS.
 *
 * Esto no existía, y era el agujero más grande del proyecto sin que se notara.
 * La descripción decía nombre, puntos, turno y la lista de jugadas legales — y
 * ya. Medido el 2026-08-06 sobre los diecinueve juegos: **ninguno** aportaba
 * descripción propia, así que TODOS caían en esa plantilla.
 *
 * Para un agente de lenguaje sin visión eso significa jugar al ajedrez leyendo
 * «Puedes: a2a3, a2a4, b2b3…» **sin ver el tablero jamás**. O una brisca sin
 * saber cuál es el triunfo ni qué carta hay en la baza. Bastaba para no hacer
 * una jugada ilegal —eso lo garantiza `legal_moves`— y no bastaba para jugar
 * bien. Se estaba midiendo a los modelos a ciegas y llamándolo puerta de
 * lenguaje.
 *
 * ⚠️ NO SE INVENTA NADA. Sólo se pone en palabras lo que el juego YA publica:
 * exactamente los mismos campos que `mesa.html` dibuja en pantalla. Si un juego
 * no publica su tablero, aquí no aparece — y eso es un hueco del juego, no de
 * esta función, y así se ve.
 *
 * ⚠️ ESTO CAMBIA EL PROMPT, O SEA QUE CAMBIA LO QUE SE MIDE.
 * Los números publicados hasta hoy se sacaron con la descripción pobre. No son
 * comparables con los de después, y no se debe mezclarlos en una misma tabla:
 * un modelo que suba no habrá mejorado, es que por fin ve la mesa. Al volver a
 * medir, la tabla entera se rehace de cero.
 */
/**
 * Dibuja una rejilla a partir de listas de puntos `{x, y}`.
 *
 * Las capas se pintan en orden: la última manda. Así el jugador tapa a la
 * comida, y la comida al suelo, sin condicionales.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LO QUE ES CONFIGURACIÓN DE DIBUJO NO SE LE CUENTA A QUIEN NO VE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El barrido de abajo saca al texto cualquier campo del estado que no esté en la
 * lista de maquinaria. Eso es lo correcto —un juego nuevo publica algo y sale solo,
 * sin que nadie tenga que acordarse— pero arrastra lo que no debe. Entropy le manda
 * hoy a un agente SIN OJOS:
 *
 *     palos: {"A":{"color":"#E6A817","simbolo":"◆"}, "V":{...}, "C":{...}}
 *     valores: {"1":1,"2":2,"3":3,…,"12":12}
 *     simbolos: {"JK":"🃏"}
 *
 * Colores hexadecimales, formas de glifo, y un mapa que dice que el 1 vale 1. Nada
 * de eso ayuda a decidir una jugada, y todo se paga en tokens en CADA vuelta.
 *
 * ⚠️ SE FILTRA POR LA FORMA DEL DATO, NO POR UNA LISTA DE NOMBRES.
 *
 * Lo fácil sería `if (k === 'palos' || k === 'simbolos' || …)`. Y sería otra lista
 * paralela: el día que un juego llame `pinturas` a lo mismo, vuelve a colarse, y el
 * que la mantenga no se enterará. La configuración de dibujo se reconoce por cómo
 * es —lleva colores o glifos dentro— y eso no cambia de nombre.
 *
 * Ojo con lo que NO se filtra, que es la mitad del criterio: la leyenda del mapa
 * («# muro, o destino») sí se cuenta, porque sin ella el mapa es ilegible; el color
 * de una carta de UNIT también, porque ahí el color ES la regla. Se quita lo que
 * describe el PÍXEL, no lo que describe el juego.
 */
function esDeDibujo(v) {
    if (typeof v !== 'object' || v === null) return false;
    const s = JSON.stringify(v);

    // Un color hexadecimal sólo existe para pintar.
    if (/"#[0-9a-fA-F]{3,8}"/.test(s)) return true;

    // Una tabla de glifos: claves cortas apuntando a un símbolo suelto.
    const vals = Object.values(v);
    if (vals.length && vals.every(x => typeof x === 'string' && [...x].length <= 2)) return true;

    /**
     * Un mapa identidad —`{"1":1,"2":2,…}`— no informa de nada: quien lee ya sabe
     * que el 1 vale 1. Sale de una tabla de puntuación donde casi todas las cartas
     * valen su número, y ocupa ciento veinte caracteres para decirlo.
     */
    const pares = Object.entries(v);
    if (pares.length > 3 && pares.every(([k, x]) => String(k) === String(x))) return true;

    return false;
}

function dibujarRejilla({ ancho, alto, capas, vacio = ' ' }) {
    if (!(ancho > 0 && alto > 0) || ancho > 60 || alto > 60) return null;
    const g = Array.from({ length: alto }, () => Array(ancho).fill(vacio));
    for (const { puntos, simbolo } of capas) {
        for (const p of (puntos ?? [])) {
            if (!p || !Number.isInteger(p.x) || !Number.isInteger(p.y)) continue;
            if (p.x < 0 || p.x >= ancho || p.y < 0 || p.y >= alto) continue;
            g[p.y][p.x] = typeof simbolo === 'function' ? simbolo(p) : simbolo;
        }
    }
    return g.map(f => f.join('')).join('\n');
}

const tope = (pts, eje) => Math.max(0, ...(pts ?? []).map(p => p?.[eje] ?? 0)) + 1;

/**
 * Une una rejilla de celdas en un mapa de texto, con TODAS LAS COLUMNAS DEL MISMO
 * ANCHO.
 *
 * ⚠️ POR QUÉ ESTO NO ES COSMÉTICA.
 *
 * Casi todas las celdas son un carácter, así que juntarlas a pelo bastaba. Deja
 * de bastar en cuanto una celda lleva etiqueta: `marea` escribe «4» donde hay una
 * ficha y «.» donde no, y una fila salía `4 ...` — cuatro casillas dibujadas con
 * cinco columnas. Un mapa monoespaciado desalineado no es un mapa feo: es un mapa
 * FALSO, porque quien lo lee cuenta columnas para saber dónde está cada cosa.
 *
 * Si todas miden uno, esto devuelve exactamente lo de siempre y los cuarenta
 * juegos que ya lo usaban no cambian ni un byte.
 */
function enColumnas(mapa) {
    const ancho = Math.max(1, ...mapa.flat().map((c) => String(c).length));
    if (ancho === 1) return mapa.map((f) => f.join('')).join('\n');
    return mapa.map((f) => f.map((c) => String(c).padEnd(ancho, ' ')).join('')).join('\n');
}

/**
 * ⚠️ LOS ESPACIALES, CONTADOS COMO SE CUENTAN ELLOS.
 *
 * `mancala`, `snake`, `fagocito` y `peaton` publican listas de coordenadas. El
 * barrido genérico las sacaba en JSON crudo —`[{"x":13,"y":13},…]`— y eso para un
 * agente sin visión es tan opaco como no decir nada: tendría que reconstruir un
 * mapa mentalmente a partir de quinientos pares de números.
 *
 * Aquí cada uno se cuenta en su idioma, igual que el ajedrez va en FEN y el go en
 * la rejilla del Go Text Protocol. **No es código por juego por capricho: es que
 * un laberinto y una mano de cartas no se dicen igual.** Lo que sí se comparte es
 * el dibujante de rejillas.
 */
function contarEspacial(juego, st) {
    // Mancala: catorce números que son dos filas de hoyos y dos graneros. Sin
    // esto, un agente elegía hoyo sin saber cuántas semillas había en ninguno.
    if (Array.isArray(st.board) && st.board.length === 14 && juego === 'mancala') {
        const b = st.board;
        return `Tus hoyos 0-5: ${b.slice(0, 6).join(' ')} (tu granero: ${b[6]}). `
             + `Hoyos del rival: ${b.slice(7, 13).join(' ')} (su granero: ${b[13]})`;
    }

    // Snake: la posición relativa de la comida vale más que sus coordenadas.
    // «4 a la derecha y 2 arriba» es accionable; «(14,8)» exige saber dónde estás.
    if (Array.isArray(st.snake) && st.food) {
        const [cabeza, ...cuerpo] = st.snake;
        const dx = st.food.x - cabeza.x, dy = st.food.y - cabeza.y;
        const rumbo = [
            dx ? `${Math.abs(dx)} a la ${dx > 0 ? 'derecha' : 'izquierda'}` : null,
            dy ? `${Math.abs(dy)} ${dy > 0 ? 'abajo' : 'arriba'}` : null,
        ].filter(Boolean).join(' y ') || 'en tu casilla';
        return `Serpiente de ${st.snake.length}, cabeza en (${cabeza.x},${cabeza.y}) `
             + `mirando ${st.direction}. Cuerpo: ${cuerpo.map(c => `(${c.x},${c.y})`).join(' ')}. `
             + `Comida en (${st.food.x},${st.food.y}): ${rumbo}`;
    }

    // Fagocito: un laberinto se cuenta dibujándolo. `#` muro, `.` bolita,
    // `G` fantasma, `@` tú.
    if (Array.isArray(st.maze) && st.fagocito) {
        const dibujo = dibujarRejilla({
            ancho: Math.max(tope(st.maze, 'x'), tope(st.pellets, 'x')),
            alto: Math.max(tope(st.maze, 'y'), tope(st.pellets, 'y')),
            capas: [
                { puntos: st.maze, simbolo: '#' },
                { puntos: st.pellets, simbolo: '.' },
                { puntos: st.ghosts, simbolo: 'G' },
                { puntos: [st.fagocito], simbolo: '@' },
            ],
        });
        const fantasmas = (st.ghosts ?? [])
            .map(g => `${g.type ?? 'fantasma'} en (${g.x},${g.y})`).join(', ');
        return (dibujo ? `Laberinto (# muro, . bolita, G fantasma, @ tú):\n${dibujo}\n` : '')
             + `Estás en (${st.fagocito.x},${st.fagocito.y}). Fantasmas: ${fantasmas || 'ninguno'}. `
             + `Quedan ${st.restantes ?? '?'} bolitas`;
    }

    /**
     * ⚠️ AQUÍ HABÍA UNA RAMA PARA `peaton` Y SE HA QUITADO. NO POR LIMPIEZA.
     *
     * Dibujaba la calle a mano —coches con `<` y `>`, la rana con `F`— y era de las
     * cuatro escritas una por una que hacían que un juego nuevo naciera ciego.
     *
     * El 29-08-2026, al crecer el juego con agua, troncos, orillas y un cazador,
     * ninguna de esas cosas cabía en aquel dibujo: la rama sabía pintar coches y
     * nada más. `peaton` pasó a dibujarse desde su SUSTRATO, como los otros
     * veinticinco, y con eso salen los ríos con su corriente, las plataformas y la
     * casilla que el hurón marca antes de saltar — sin escribir una línea de
     * dibujo para ninguno.
     *
     * ⚠️ Y SE BORRA EN VEZ DE DEJARLA «POR SI ACASO», que es lo que costaría caro.
     *
     * Su condición era `st.frog`, y ese campo ya no existe: el `if` no se cumple
     * nunca. Un bloque que no se puede ejecutar y que sigue documentado como si
     * funcionara es exactamente la avería que este proyecto ha pasado el día
     * midiendo — «mejor maquinaria de la que ejecuta»—, sólo que en pequeño. Lo
     * único que haría es mentirle al siguiente que venga a leer cómo se cuenta un
     * peatón.
     *
     * Las otras tres se quedan porque siguen diciendo algo que el mapa genérico no
     * dice: al mancala sus catorce hoyos en una frase, al snake la comida en
     * posición RELATIVA —«4 a la derecha y 2 arriba», que es accionable— y al
     * fagocito su laberinto. Ésas no sobran; ésta sí.
     */
    return null;
}

function contarLaMesa(st, juego, sus) {
    const t = [];
    const lista = (v) => Array.isArray(v) ? v.join(' ') : String(v);

    const espacial = contarEspacial(juego, st);
    if (espacial) t.push(espacial);

    /**
     * ⚠️ EL SUSTRATO, SI QUIEN LLAMA LO TRAE — Y SÓLO SI NADIE MÁS LO HA CONTADO.
     *
     * Las ramas de `contarEspacial` mandan, y no es cortesía: son el idioma
     * propio de cada uno. Al mancala se le cuentan sus catorce hoyos en una
     * frase, al snake se le dice la comida en posición RELATIVA —«4 a la derecha
     * y 2 arriba», que es accionable, frente a «(14,8)», que exige saber dónde
     * estás—. Un mapa genérico encima de eso sería peor y más largo.
     *
     * Lo que arregla esto es lo otro: los diecisiete que no tenían rama y caían
     * al volcado de escalares. Ahora se dibujan solos desde lo que ya publican.
     *
     * ⚠️ Y ES ADITIVO POR CONSTRUCCIÓN: quien no pase `sus` —una mesa compartida
     *    que sólo recibió un JSON, un worker que re-simuló— no cambia ni una
     *    palabra. Esta puerta tiene que decir lo mismo desde los cuatro sitios
     *    desde los que se entra, o la comparación del banco deja de valer.
     */
    if (!espacial && sus) {
        const delSustrato = describirSustrato(sus);
        if (delSustrato) t.push(delSustrato.trim());
    }

    // Tablero completo, si el juego lo publica. El FEN es denso pero es el
    // lenguaje que un modelo tiene más visto para un tablero.
    if (st.fen) t.push(`Tablero (FEN): ${st.fen}`);

    /**
     * ⚠️ `board` Y `tablero`. LA PRIMERA VERSIÓN SÓLO MIRABA LA ESPAÑOLA.
     * Go publica su rejilla desde siempre —en `board`, en inglés— y como aquí
     * se buscaba `tablero`, la medición dijo que go «no publica su tablero» y
     * casi le abro un hueco en el backlog. No le faltaba nada: le faltaba una
     * palabra a quien preguntaba. Una casa con dos idiomas se paga así.
     *
     * Se dibuja en rejilla y no en lista por el mismo motivo por el que el
     * ajedrez va en FEN: es la forma en que ese juego se ha escrito siempre.
     * El `showboard` del Go Text Protocol lleva décadas imprimiendo esto para
     * clientes sin gráficos, que es exactamente nuestro caso — y resuelve lo que
     * los planos de características de AlphaGo no resuelven, porque aquéllos son
     * comida para una red convolucional, o sea visión con otro nombre.
     */
    // Si ya se ha contado en su idioma, el volcado genérico sobra: mancala decía
    // «tus hoyos 4 4 4 4 4 4» y justo después repetía «Tablero: 4 / 4 / 4 / …».
    // Decir lo mismo dos veces en un prompt no es redundancia inofensiva: gasta
    // contexto y sugiere que son dos datos distintos.
    const rejilla = espacial ? null : (st.tablero ?? st.board ?? st.state?.board);
    if (Array.isArray(rejilla) && Array.isArray(rejilla[0])) {
        const SIMBOLO = ['.', 'X', 'O'];   // vacío · negras · blancas
        const filas = rejilla.map(f => f.map(c =>
            typeof c === 'number' ? (SIMBOLO[c] ?? '?') : (c ?? '.')).join(''));
        t.push(`Tablero (${rejilla.length} filas, . vacío X negras O blancas):\n${filas.join('\n')}`);
    } else if (Array.isArray(rejilla)) {
        t.push(`Tablero: ${rejilla.map(lista).join(' / ')}`);
    }
    // ⚠️ MATE, AHOGADO Y JAQUE: SE PUBLICABAN Y NO SE DECÍAN.
    // `is_checkmate` (ajedrez, xiangqi), `is_stalemate` (ajedrez) y `ahogado`
    // (xiangqi) llevaban ahí desde siempre y ningún consumidor los nombraba. Un
    // agente sin visión no se enteraba de que le habían dado mate: sólo veía que
    // se quedaba sin jugadas legales, que es una forma pésima de perder una
    // partida sin saber por qué. Lo encontró `desajustes.mjs`.
    if (st.is_checkmate) t.push('JAQUE MATE');
    else if (st.is_stalemate || st.ahogado) t.push('Ahogado (tablas)');
    else if (st.is_check) t.push('Estás en jaque');

    if (st.capturas) t.push(`Capturas: negras ${st.capturas.black}, blancas ${st.capturas.white}`);
    if (st.komi !== undefined) t.push(`Komi: ${st.komi}`);

    // Lo tuyo.
    if (Array.isArray(st.mano) && st.mano.length) t.push(`Tu mano: ${lista(st.mano)}`);
    if (Array.isArray(st.player_hand) && st.player_hand.length) t.push(`Tu mano: ${lista(st.player_hand)}`);
    if (Array.isArray(st.jugador) && st.jugador.length) t.push(`Tus cartas: ${lista(st.jugador)}`);
    /**
     * ⚠️ SI LA MESA ENSEÑA UN 12, AQUÍ NO PUEDE PONER `B_R`.
     *
     * Un juego puede declarar `cara: 'valor'`: que su palo no pinta nada y lo que
     * identifica a la carta es su valor. Entropy lo hace —se suman valores y se
     * anulan dos iguales en la misma columna— y la mesa de casino ya dibuja el
     * número.
     *
     * Si esta puerta siguiera diciendo `B_R`, la persona jugaría leyendo un 12 y
     * el agente tendría que saberse de memoria que el rey de bastos vale doce. Y
     * entonces las dos filas de la tabla dejarían de ser comparables: no estarían
     * jugando al mismo juego, estarían jugando a juegos con distinta dificultad de
     * lectura. La puerta de texto y la mesa tienen que contar lo MISMO.
     */
    const cara = (c) => {
        if (c === null || c === undefined) return '?';
        if (st.cara !== 'valor' || !st.valores) return c;
        // El `#2` del sufijo de copia se quita antes de buscar el rango: en una mesa
        // de dos barajas, `S_A#2` vale lo mismo que `S_A` y la tabla de valores está
        // escrita una sola vez. Ver `sinCopia` en `rules/baraja.js`.
        const r = String(c).split('#')[0].split('_').slice(1).join('_');
        return String(st.simbolos?.[r] ?? st.valores[r] ?? r);
    };

    /**
     * ⚠️ LAS CASILLAS VAN NUMERADAS, PORQUE LAS JUGADAS LO ESTÁN.
     *
     * Decía `Tu caja: 9 ? ? ? 2 ? ? ?` y ofrecía `cambiar:0 … cambiar:7`. Para
     * cambiar el 9 —que es la peor carta que tengo— hay que deducir que ocupa el
     * hueco 0, contando de izquierda a derecha y suponiendo que se empieza en cero.
     * Nada de eso está dicho.
     *
     * Lo encontré jugando por esta puerta. Una persona ve la caja y pulsa la carta;
     * un agente cuenta huecos y reza. Y es exactamente el mismo error que ya cometí
     * en flota, donde dos numeraciones eran legales a la vez — sólo que allí se veía
     * y aquí no.
     *
     * Numerarlas cuesta seis caracteres por hueco y quita toda la adivinanza:
     *
     *     Tu caja: 0:9 1:? 2:? 3:? 4:2 5:? 6:? 7:?
     */
    if (Array.isArray(st.caja)) {
        t.push(`Tu caja: ${st.caja.map((c, i) => `${i}:${cara(c)}`).join(' ')}`);
    }

    // Lo de todos.
    if (st.triunfo) t.push(`Triunfo: ${st.triunfo}`);
    if (Array.isArray(st.baza) && st.baza.length) {
        t.push(`En la baza: ${st.baza.map(j => `${j.jugador} juega ${j.carta}`).join(', ')}`);
    }
    if (st.cima) t.push(`Cima del descarte: ${st.cima}${st.color ? ` (color ${st.color})` : ''}`);
    if (typeof st.descarte === 'string') t.push(`Descarte: ${cara(st.descarte)}`);
    if (Array.isArray(st.community_cards) && st.community_cards.length) {
        t.push(`Cartas comunes: ${lista(st.community_cards)}`);
    }
    if (Array.isArray(st.casa) && st.casa.length) t.push(`La casa muestra: ${lista(st.casa)}`);
    if (Array.isArray(st.cajas_rivales)) {
        t.push(`Cajas rivales: ${st.cajas_rivales.map(c => c.map(cara).join(' ')).join(' | ')}`);
    }

    // Lo que se puede contar de los demás sin ver sus cartas.
    if (Array.isArray(st.manos_rivales) && st.manos_rivales.length) {
        t.push(`Rivales con ${lista(st.manos_rivales)} cartas`);
    }
    if (Array.isArray(st.libros) && st.libros.some(l => l?.length)) {
        t.push(`Libros: ${st.libros.map((l, i) => `${i}:${l.length}`).join(' ')}`);
    }
    // Historial público: en gofish es literalmente el juego —quién pidió qué y
    // si acertó— y sin ello un agente no puede deducir nada.
    if (Array.isArray(st.preguntas) && st.preguntas.length) {
        const p = st.preguntas.slice(-4)
            .map(q => `${q.de}→${q.a} pide ${q.rango}: ${q.acierta ? 'sí' : 'no'}`);
        t.push(`Últimas peticiones: ${p.join('; ')}`);
    }
    if (Array.isArray(st.marcador)) t.push(`Marcador: ${lista(st.marcador)}`);
    if (st.pot !== undefined) t.push(`Bote: ${st.pot}`);
    if (st.mazo_restante !== undefined) t.push(`Quedan ${st.mazo_restante} cartas en el mazo`);

    // ═══ Y LO QUE NO SE HAYA NOMBRADO ARRIBA, TAMBIÉN ══════════════════════
    //
    // ⚠️ ESTE BARRIDO EXISTE POR UNA EQUIVOCACIÓN MÍA, Y ES LA MEJOR PARTE.
    // Al medir salió que cinco juegos «no publicaban nada que contar»: go,
    // mancala, snake, fagocito y peaton. Era falso. Los cinco publicaban de
    // todo —`board`, `snake`, `food`, `maze`, `ghosts`, `frog`, `hazards`— sólo
    // que con nombres que este descriptor no conocía. El hueco estaba en quien
    // preguntaba, no en quien respondía.
    //
    // Ir añadiendo nombres a mano habría durado hasta el juego siguiente. Así
    // que lo que sobra se cuenta igual, en crudo: peor redactado, pero VISIBLE.
    // Un dato mal escrito se mejora; uno que no llega no existe.
    const MAQUINARIA = new Set([
        'juego', 'turn', 'legal_moves', 'legal_actions', 'is_check', 'is_game_over',
        'result', 'score', 'puntos', 'semilla', 'state', 'biblioteca', 'asiento',
        'fen', 'board', 'tablero', 'capturas', 'komi', 'mano', 'player_hand',
        'jugador', 'caja', 'triunfo', 'baza', 'cima', 'color', 'descarte',
        'community_cards', 'casa', 'cajas_rivales', 'manos_rivales', 'libros',
        'preguntas', 'pot', 'mazo_restante', 'marcador', 'mano_resuelta',
        // Los espaciales: ya se cuentan dibujados, arriba. Repetirlos en JSON
        // crudo llenaría el prompt de ruido justo después de haberlo explicado
        // bien — y en fagocito son quinientos pares de coordenadas.
        'maze', 'pellets', 'ghosts', 'fagocito', 'frog', 'hazards', 'width', 'height',
        'snake', 'food', 'direction', 'restantes', 'avanceMaximo', 'longitud',
        'is_checkmate', 'is_stalemate', 'ahogado',
        // ⚠️ `objetivo` ya va de titular, LO PRIMERO de todo. Sin esto salía dos
        // veces —una bien redactada y otra en crudo cuarenta palabras después—
        // y en pradera o sigilo eso son sesenta palabras repetidas en el prompt
        // de cada turno. Lo vi al leer la puerta de texto, no midiendo: las dos
        // copias son válidas cada una por su lado.
        'objetivo',
        // `patron` es configuración de DIBUJO —si el tablero es de casillas o de
        // cruces— y a un agente sin ojos no le dice nada de la partida. Sale por
        // la misma puerta que el objetivo porque viaja igual, pero aquí no pinta.
        'patron', 'colores',
    ]);
    const extra = [];
    for (const [k, v] of Object.entries(st)) {
        if (MAQUINARIA.has(k) || v === null || v === undefined) continue;
        if (esDeDibujo(v)) continue;
        if (typeof v === 'object') {
            const s = JSON.stringify(v);
            // Se recorta: un laberinto entero no cabe en un prompt y tampoco
            // ayuda. Lo que se corta se dice, para que no parezca completo.
            extra.push(`${k}: ${s.length > 220 ? s.slice(0, 220) + '…(recortado)' : s}`);
        } else {
            extra.push(`${k}: ${v}`);
        }
    }
    if (extra.length) t.push(extra.join('. '));

    return t.length ? ' ' + t.join('. ') + '.' : '';
}

/**
 * Cuenta un SUSTRATO en palabras. La puerta de lenguaje del motor, dibujada.
 *
 * ⚠️ ESTO ES LO QUE HACE QUE UN GÉNERO NUEVO NO CUESTE NADA.
 * Los diecinueve juegos anteriores necesitaron un caso especial cada uno en
 * `contarLaMesa` —bazas, gofish, entropy, los espaciales— porque cada uno
 * publicaba su estado de una forma. Un juego que publica `sustrato(p)` no
 * necesita ninguno: se dibuja su rejilla, se listan sus piezas y se cuentan sus
 * montones, y ya está contado.
 *
 * Es la misma rejilla ASCII del `showboard` del Go Text Protocol, que lleva
 * décadas siendo cómo se cuenta un tablero a algo que no ve.
 */
export function describirSustrato(sus) {
    if (!sus) return '';
    const t = [];

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ UN MUNDO SIN CASILLAS TAMBIÉN TIENE QUE PODER CONTARSE
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Esta función sabía dibujar rejillas, zonas y asientos, que es lo que hay
     * en un juego de tablero. Medido el 25-08 sobre los nueve mundos del banco:
     * **seis no publican rejilla —un cubo, una esfera, un acuario, una arena— y
     * salían con CERO líneas de texto.**
     *
     * Y eso no es una limitación: es la misma avería que este fichero cuenta
     * arriba con mancala. Un mundo que no se puede contar en texto no lo puede
     * jugar un modelo de lenguaje, y su mala nota hablaría de la puerta y no de
     * él.
     *
     * Un mundo continuo se cuenta en coordenadas: dónde está cada cosa. No es un
     * mapa bonito, pero es completo — y completo es el requisito.
     */
    if (!sus.rejilla && (sus.piezas?.length ?? 0) > 0) {
        const simbolos = sus.simbolos ?? {};
        const leyenda = sus.leyenda ?? {};
        const porTipo = new Map();
        for (const p of sus.piezas) {
            if (!porTipo.has(p.t)) porTipo.set(p.t, []);
            porTipo.get(p.t).push(p);
        }
        const num = (v) => (v === undefined ? null : Math.round(v * 10) / 10);
        const donde = (p) => p.alto === undefined
            ? `(${num(p.x)}, ${num(p.y)})`
            : `(${num(p.x)}, ${num(p.y)}, alto ${num(p.alto)})`;

        if (sus.limite) {
            t.push(sus.limite.forma === 'circulo'
                ? `El mundo es un círculo de radio ${sus.limite.radio}`
                : sus.limite.forma === 'caja'
                ? `El mundo es una caja de ${sus.limite.ancho}×${sus.limite.largo}, `
                  + `${sus.limite.alto} de alto`
                : `El mundo mide ${sus.limite.ancho}×${sus.limite.alto}`);
        }
        for (const [tipo, lista] of porTipo) {
            const nombre = leyenda[tipo] ?? tipo;
            const glifo = simbolos[tipo] ? ` (${simbolos[tipo]})` : '';
            /**
             * Cuando hay muchos iguales se agrupan: veinticinco peces uno por uno
             * son tres párrafos que nadie lee, ni persona ni modelo. Hasta ocho se
             * enumeran; a partir de ahí se dice cuántos y dónde está el más cerca
             * del centro, que es lo accionable.
             */
            /**
             * Sin punto final: quien une las partes ya pone `. ` entre ellas, y
             * añadirlo aquí daba frases terminadas en `..` — que es la clase de
             * detalle que hace que un texto parezca generado por una máquina que
             * no se relee.
             */
            if (lista.length <= 8) {
                t.push(`${nombre}${glifo}: ${lista.map(donde).join(', ')}`);
            } else {
                const cerca = lista.slice().sort((a, b) =>
                    Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))[0];
                t.push(`${lista.length} × ${nombre}${glifo}, el más céntrico en ${donde(cerca)}`);
            }
        }
    }

    if (sus.rejilla) {
        const { ancho, alto, celdas, niebla, sinVista } = sus.rejilla;
        /**
         * ⚠️ EL TERRENO PUEDE TENER MÁS DE TRES COSAS, Y HASTA HOY NO PODÍA DECIRLO.
         *
         * `{0:'.', 1:'#', 2:'o'}` —vacío, muro, destino— era todo el vocabulario
         * que un mapa podía usar, escrito a fuego aquí. Bastaba mientras sólo
         * había juegos de arcade.
         *
         * Los MUNDOS llegaron con más: ¡Defiende! usa `1=camino, 2=núcleo,
         * 3=entrada, 4=torreta`. Medido el 25-08 al pasarle su sustrato a esta
         * función: el sendero salía como muros, el núcleo como «destino» y la
         * entrada como un `3` suelto en medio del mapa. La leyenda decía «# muro»
         * y debajo listaba mis nombres — dos vocabularios en la misma línea.
         *
         * Y eso no es feo: es FALSO. Un modelo leyendo ese mapa cree que hay
         * muros donde hay un camino por el que le vienen los bichos.
         *
         * `terreno` es opcional, como lo fue `niebla` cuando llegó el primer
         * juego con observabilidad parcial. Los veinticuatro de antes no lo traen
         * y siguen exactamente igual.
         */
        const SUELO = sus.terreno ?? { 0: '.', 1: '#', 2: 'o' };   // vacío · muro · destino
        const mapa = Array.from({ length: alto }, (_, y) =>
            Array.from({ length: ancho }, (_, x) => {
                /**
                 * ⚠️ «NO LO SÉ» NO ES LO MISMO QUE «ESTÁ VACÍO».
                 *
                 * El contrato del terreno sabía decir vacío, muro, destino y
                 * cuenta — y nada más. Cuando llegó el primer género con
                 * observabilidad parcial, una casilla sin explorar no tenía cómo
                 * contarse, y salía como suelo libre: el mapa afirmaba que el
                 * pasillo de al lado estaba despejado sin haberlo mirado nunca.
                 *
                 * Eso no es una omisión, es una MENTIRA — la misma clase de fallo
                 * que la fuga de cartas ocultas, sólo que en el espacio. Un campo
                 * opcional lo arregla: `niebla[i] = 1` es «aquí no he estado».
                 * Los veinte juegos anteriores no lo traen y no cambian.
                 */
                if (niebla?.[y * ancho + x]) return '?';
                const v = celdas?.[y * ancho + x] ?? 0;
                /**
                 * ⚠️ `sinVista` es OTRA ignorancia, y se lee distinto.
                 * `?` es «no sé qué hay aquí». La coma es «sé qué hay y no veo
                 * quién anda»: conoces el pasillo, no sabes si está vacío. Sin
                 * distinguirlas, un modelo leería como desconocido un sitio que
                 * conoce de sobra, y como despejado uno que no está mirando.
                 */
                if (sinVista?.[y * ancho + x] && v === 0) return ',';
                /**
                 * ⚠️ SI LA CELDA TIENE NOMBRE, MANDA EL NOMBRE.
                 *
                 * `marea` publica `rejilla.nombres` con el valor de cada ficha
                 * —«2», «4», «1024»— y `etiquetas: true` para pedir que se
                 * escriban. Sin mirarlo, sus niveles caían en la tabla de terreno
                 * de siempre: **el nivel 1 salía dibujado como `#` muro y el 2
                 * como `o` destino**. Un 2048 contado como un laberinto.
                 *
                 * No es un caso raro con nombre propio: es el dato que el sustrato
                 * ya declaraba y que este dibujante no leía. `flota` y
                 * `alisapolis` lo declaran también.
                 *
                 * Se recorta a dos caracteres porque la rejilla es monoespaciada
                 * y una columna de ancho variable deja de ser un mapa; el nombre
                 * entero sigue estando en la leyenda, que va justo encima.
                 */
                const etiqueta = sus.rejilla.nombres?.[y * ancho + x];
                if (etiqueta !== null && etiqueta !== undefined && etiqueta !== '') {
                    return String(etiqueta).slice(0, 4);
                }
                // Una celda con número grande es una CUENTA (mancala), no terreno.
                return SUELO[v] ?? (v > 2 ? String(v % 10) : '.');
            }));
        /**
         * ⚠️ EL JUEGO PUEDE DECIR SUS SÍMBOLOS, Y CONVIENE QUE LO HAGA.
         * Por defecto se usa la inicial del tipo, y eso choca en cuanto hay dos
         * que empiezan igual: en sokoban, `caja` y `caja_ok` salían las dos como
         * `C` y el mapa era ilegible — para una persona y para un modelo.
         *
         * Y hay algo mejor que evitar el choque: **usar la notación que el juego
         * ya tiene en el mundo**. Sokoban se escribe con `#$.@*` desde los años
         * ochenta, y un modelo la ha visto mil veces. Igual que el ajedrez va en
         * FEN y el go en la rejilla del GTP: se habla el idioma del juego, no uno
         * inventado por nosotros.
         */
        const simbolos = sus.simbolos ?? {};

        /**
         * ═══════════════════════════════════════════════════════════════════
         *  ⚠️ EL MAPA NO DECÍA DE QUIÉN ERA CADA PIEZA. SEIS JUEGOS.
         * ═══════════════════════════════════════════════════════════════════
         *
         * El glifo salía del TIPO de pieza y el dueño no se miraba. En el ajedrez
         * eso deja las dos bandas idénticas:
         *
         *     RNBQKBNR      ← negras
         *     PPPPPPPP
         *     ........
         *     PPPPPPPP
         *     RNBQKBNR      ← blancas
         *
         * y la leyenda —«P=peón, N=caballo…»— no menciona el color en ningún
         * sitio. Un agente de lenguaje que lea el mapa NO PUEDE SABER cuáles son
         * suyas. Lo encontró escribiendo el cliente de Python: lo primero que hace
         * alguien de fuera es leer lo que le mandas.
         *
         * Medido sobre los cuarenta, no supuesto — ajedrez, reversi, damas,
         * xiangqi, defensa y alisapolis. Y los dos peores no son los evidentes:
         * **reversi y damas**, donde de quién es cada ficha ES el juego entero, y
         * el mapa era un tablero de círculos iguales.
         *
         * ⚠️ LA CONVENCIÓN NO ME LA INVENTO: ES LA DEL FEN.
         *
         * Mayúscula el dueño 0, minúscula el otro. Comprobado que encaja: en el
         * ajedrez `de:0` son las blancas, que es exactamente lo que el FEN escribe
         * en mayúsculas desde siempre. Se habla el idioma del juego, que es lo que
         * este mismo fichero argumenta dos comentarios más arriba con sokoban.
         *
         * Y sólo se aplica cuando HACE FALTA: si todas las piezas son del mismo
         * dueño no hay ambigüedad que romper, y veintiuno de los juegos no cambian
         * ni un carácter. Lo mejor sigue siendo que el juego lo declare —
         * `simbolos['ficha:0']`— y eso manda sobre todo lo demás.
         *
         * ⚠️ ESTO CAMBIA EL PROMPT DE SEIS JUEGOS, Y HAY QUE DECIRLO.
         *
         * La cabecera de este fichero avisa: «hay números publicados medidos con
         * ESTE texto». Cierto, y por eso se dice en voz alta: las notas de agente
         * de lenguaje de esos seis se midieron por una puerta que no sabía expresar
         * de quién era cada pieza. O sea que no las invalida hacia abajo — las
         * midió con un jugador ciego a la mitad del tablero.
         */
        /**
         * ⚠️ SÓLO CUENTAN LOS DUEÑOS DE VERDAD. Con `null` dentro del conjunto,
         * sokoban y cripta —de un solo jugador, con piezas sin dueño y una del
         * jugador— salían con dos «dueños» y la leyenda les prometía una distinción
         * de mayúsculas que su mapa no hace. Una leyenda que anuncia una regla que
         * no se aplica es peor que no tenerla.
         */
        /**
         * ⚠️ LA CONDICIÓN ES POR TIPO, NO POR TABLERO. Y MI PRIMERA VERSIÓN NO.
         *
         * Empecé mirando si en el tablero había dos dueños distintos, y con eso
         * cambiaba TODOS los glifos. Sokoban y cripta lo rompieron enseñando algo
         * que yo no sabía: **`de` no siempre es un dueño**. Allí es una categoría —
         * `caja` lleva `de:1`, `tesoro` lleva `de:2`, el jugador `de:0`— así que
         * había dos «dueños» sin que nadie compitiera por nada, y les convertía el
         * bicho `B` en `b` mientras la leyenda seguía diciendo `B`. Un mapa y su
         * leyenda discrepando, causado por el arreglo de un mapa que discrepaba.
         *
         * La ambigüedad de verdad es más estrecha: **el MISMO TIPO de pieza
         * apareciendo con dos dueños**. Eso es el peón blanco y el peón negro, y no
         * lo es una caja y un tesoro. Con esa condición, sokoban y cripta no
         * cambian ni un carácter y el ajedrez sí.
         */
        const duenosPorTipo = new Map();
        for (const p of (sus.piezas ?? [])) {
            const d = p.de ?? p.bando;
            if (d === null || d === undefined) continue;
            if (!duenosPorTipo.has(p.t)) duenosPorTipo.set(p.t, new Set());
            duenosPorTipo.get(p.t).add(d);
        }
        const ambiguo = (t) => (duenosPorTipo.get(t)?.size ?? 0) > 1;
        const variosDuenos = [...duenosPorTipo.keys()].some(ambiguo);

        /**
         * El terreno que de verdad se ve, TOMADO ANTES DE PINTAR LAS PIEZAS.
         *
         * ⚠️ Y AQUÍ ME EQUIVOQUÉ A LA PRIMERA. Lo calculé del mapa ya terminado, así
         * que los glifos de las PIEZAS contaban como terreno: la `o` del rival en
         * reversi hacía que la leyenda siguiera diciendo «o destino». El filtro
         * estaba bien; miraba el mapa en el momento equivocado.
         */
        const terrenoVisible = new Set(mapa.flat());

        const glifoDe = (t, de) => {
            const declarado = de === null || de === undefined ? null : simbolos[`${t}:${de}`];
            if (declarado) return declarado;
            const base = simbolos[t] ?? String(t ?? '?')[0].toUpperCase();
            if (!ambiguo(t) || de === null || de === undefined) return base;
            // Sin distinción de caja —un `#`, un dígito, un emoji— no se puede
            // separar por mayúsculas y se deja como está: mejor un mapa ambiguo
            // que uno que finge distinguir.
            if (base.toUpperCase() === base.toLowerCase()) return base;
            return de === 0 ? base.toUpperCase() : base.toLowerCase();
        };

        for (const p of (sus.piezas ?? [])) {
            if (p.y < 0 || p.y >= alto || p.x < 0 || p.x >= ancho) continue;
            mapa[p.y][p.x] = glifoDe(p.t, p.de ?? p.bando ?? null);
        }

        /**
         * La leyenda pide el glifo del dueño 0 sólo para los tipos ambiguos; para
         * el resto pide el de siempre, que es el que su mapa dibuja.
         *
         * ⚠️ Y `glifoDe` ES PARA TIPOS DE PIEZA, NO PARA VALORES DE CELDA.
         *
         * La leyenda de `marea` va por valor de casilla —`{10:'1024', 11:'2048'}`—
         * y `glifoDe` sin símbolo declarado devuelve la PRIMERA LETRA del tipo. Con
         * claves de dos dígitos eso daba «1=1024, 1=2048, 1=4096»: tres entradas
         * distintas con la misma clave, en una leyenda cuyo trabajo es justamente
         * distinguirlas. Cuando la clave no es un tipo de pieza se escribe entera.
         */
        const tiposDePieza = new Set([...(sus.piezas ?? []).map((p) => String(p.t)),
                                      ...Object.keys(simbolos)]);
        const clave = Object.entries(sus.leyenda ?? {})
            .map(([k, v]) => (tiposDePieza.has(String(k))
                ? `${glifoDe(k, ambiguo(k) ? 0 : null)}=${v}`
                : `${k}=${v}`)).join(', ');
        // Y la leyenda tiene que EXPLICAR la convención, porque un mapa que
        // distingue por la caja de la letra sin decirlo no distingue nada.
        const claveDuenos = variosDuenos
            ? ' · MAYÚSCULA = jugador 0, minúscula = el rival' : '';
        /**
         * ⚠️ Y LA LEYENDA TIENE QUE DESCRIBIR EL MAPA QUE HAY, NO EL DE SIEMPRE.
         *
         * Decía «# muro, o destino, . libre» pasara lo que pasara. Con un mundo
         * que declara su propio terreno, eso son dos vocabularios pegados y el
         * primero es mentira. Cuando el juego declara `terreno`, la leyenda sale
         * de sus nombres; si no, se queda la de toda la vida.
         */
        /**
         * ⚠️ Y LA LEYENDA POR DEFECTO NOMBRABA SÍMBOLOS QUE NO ESTÁN EN EL MAPA.
         *
         * Decía «# muro, o destino, . libre» en todo juego que no declarara su
         * terreno. En un reversi no hay muros ni destinos — y desde que las piezas
         * distinguen dueño por la caja de la letra, esa `o` de «destino» CHOCA con
         * la ficha del jugador 1. La leyenda contradecía al mapa que acompañaba.
         *
         * El comentario de dos líneas más abajo ya defendía esto —«la leyenda tiene
         * que describir el mapa que hay, no el de siempre»— y sólo lo aplicaba al
         * caso del terreno declarado. Aquí se termina: se nombran únicamente los
         * símbolos que de verdad aparecen en la rejilla.
         */
        const usados = terrenoVisible;
        const claveTerreno = sus.terreno
            ? Object.entries(sus.terreno)
                .map(([v, s]) => `${s}=${sus.leyendaTerreno?.[v] ?? `celda ${v}`}`).join(', ')
            : Object.entries({ '#': 'muro', 'o': 'destino', '.': 'libre' })
                .filter(([s]) => usados.has(s))
                .map(([s, n]) => `${s} ${n}`).join(', ');
        t.push(`Mapa (${claveTerreno}${niebla ? ', ? sin explorar' : ''}`
             + `${sinVista ? ', , fuera de tu vista' : ''}`
             + `${clave ? `, ${clave}` : ''}${claveDuenos}):\n`
             + enColumnas(mapa));
    }

    /**
     * ⚠️ LOS `asientos` NO SALÍAN, Y ESO DEJABA A MANCALA SIN JUGAR A CIEGAS.
     *
     * Esta función sabía contar rejilla y zonas, que eran las dos estructuras que
     * había cuando se escribió. Al llegar la cuarta nadie la enchufó aquí, y el
     * síntoma es feo: mancala publica sus catorce hoyos como `asientos` y el mapa
     * de texto salía `........` y `########` — sin una sola semilla. **Un modelo
     * sentado en mancala no podía ver el tablero**, y no daba error: daba un
     * jugador que elige al azar y una tabla que dice que juega mal.
     *
     * Es exactamente la avería que este fichero existe para impedir. Una puerta
     * que no enseña una estructura del contrato no está incompleta: miente, porque
     * lo que entrega parece el tablero entero.
     */
    const asientos = sus.asientos ?? [];
    if (asientos.length) {
        const porDueno = new Map();
        for (const a of asientos) {
            const k = a.de === null || a.de === undefined ? 'mesa' : `de ${a.de}`;
            if (!porDueno.has(k)) porDueno.set(k, []);
            const que = Array.isArray(a.tiene) ? (a.tiene.length ? a.tiene.join('+') : 'vacío')
                      : Number.isFinite(a.cuantas) ? String(a.cuantas)
                      : a.visto ? 'mirado' : '?';
            porDueno.get(k).push(`${a.nombre ?? a.id}:${que}`);
        }
        for (const [k, lista] of porDueno) t.push(`sitios ${k}: ${lista.join(' ')}`);
    }

    for (const z of (sus.zonas ?? [])) {
        const quien = z.de === null || z.de === undefined ? z.id : `${z.id} de ${z.de}`;
        const visto = z.items.length ? z.items.join(' ') : '';
        const tapado = z.ocultas ? `${visto ? ' + ' : ''}${z.ocultas} tapadas` : '';
        t.push(`${quien}: ${visto}${tapado}`);
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ LOS HECHOS DE LA MESA: LA CUARTA ESTRUCTURA, Y FALTABA
     * ═══════════════════════════════════════════════════════════════════════
     *
     * El sustrato sabía decir tres cosas: casillas (`rejilla`), cosas sobre las
     * casillas (`piezas`) y montones fuera del tablero (`zonas`). Y hay una
     * cuarta que no es ninguna de las tres:
     *
     *     el TRIUNFO de la brisca      un palo, y decide quién gana cada baza
     *     el BOTE del póker            un número, y apostar es el juego entero
     *     las FICHAS de cada jugador   un número por silla
     *     el COLOR en juego de UNIT    tras un comodín NO se deduce de la cima
     *     el SENTIDO de la ronda       con una carta de cambio en la mano, media decisión
     *
     * Ninguno es un montón de cartas ni un hueco de tablero. Lo intenté con
     * `asientos` —que es la estructura de los catorce hoyos de mancala— y
     * `prueba_asientos.mjs` lo suspendió con razón: un asiento lleva `x` e `y`
     * porque ESTÁ EN UNA CASILLA, y un bote no está en ninguna. Inventarle
     * coordenadas habría sido meter un dato falso para callar una prueba.
     *
     * Así que se declaran como lo que son. La forma es la mínima que sirve:
     *
     *     hechos: [{ id, de, valor, nombre? }]
     *
     * `de` es la silla dueña, o `null` si el hecho es de la mesa. `nombre` sólo
     * cuando el `id` no se lee solo.
     *
     * Hasta hoy vivían únicamente en `estado(p)`, así que el sustrato —que la
     * casa llama «el registro plano de lo que está pasando»— describía la MESA y
     * no la PARTIDA. Con esto ya no hace falta leer dos objetos para jugar.
     */
    const hechos = (sus.hechos ?? []).filter(h => h && h.id !== undefined);
    if (hechos.length) {
        const dellos = new Map();
        for (const h of hechos) {
            const k = h.de === null || h.de === undefined ? 'mesa' : `de ${h.de}`;
            if (!dellos.has(k)) dellos.set(k, []);
            dellos.get(k).push(`${h.nombre ?? h.id}: ${h.valor}`);
        }
        for (const [k, lista] of dellos) t.push(`${k} — ${lista.join(' · ')}`);
    }

    /**
     * ⚠️ Y LO QUE SE HA DICHO, QUE EN CUATRO JUEGOS ES EL TABLERO ENTERO.
     *
     * En gofish la partida se gana recordando quién pidió qué; en spades se apuesta
     * antes de jugar una sola carta; en cabina hablar es la única jugada de la
     * guía. Sin esta línea, un modelo sentado en cualquiera de los tres lee un
     * estado en el que no ha pasado nada.
     *
     * Van al final y en su propia frase porque no son el tablero: son lo que se ha
     * dicho SOBRE el tablero, y mezclarlos con las cartas confundiría a quien lee.
     */
    const dichos = (sus.dichos ?? []).filter(d => d && d.texto);
    if (dichos.length) {
        // Los que siguen en pie primero: es lo que hay que tener en cuenta AHORA.
        const enPie = dichos.filter(d => d.vigente).map(d => d.texto);
        const pasados = dichos.filter(d => !d.vigente).map(d => d.texto);
        if (enPie.length) t.push(`se ha dicho: ${enPie.join('; ')}`);
        if (pasados.length) t.push(`antes se dijo: ${pasados.slice(-8).join('; ')}`);
    }

    return t.join('. ');
}

/**
 * Las opciones, en la forma que esperan las políticas y el prompt del LLM.
 *
 * `legal_moves` YA es la lista de lo que se puede hacer —ese es el regalo del
 * ProtoHub— así que aquí no hay traducción, sólo el envoltorio `{verb, label}`
 * que usan `politicas.mjs` y `construirPrompt`.
 */
export const opcionesDe = (st) => (st.legal_moves ?? [])
    .filter(m => m !== 'nueva' && m !== 'reset')
    .map(j => ({ verb: String(j), label: String(j), args: {}, action: j }));
