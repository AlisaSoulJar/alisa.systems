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

export function describirEstado(juego, st) {
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
         + contarLaMesa(st, juego)
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

    // Peatón: las filas de peligros con su sentido de marcha. `<` y `>` dicen
    // hacia dónde viene cada coche, que es lo único que decide si cruzas.
    if (st.frog && Array.isArray(st.hazards)) {
        const coches = st.hazards.flatMap((fila, y) =>
            (fila ?? []).map(h => ({ x: h.x, y, dir: h.dir })));
        const dibujo = dibujarRejilla({
            ancho: st.width, alto: st.height, vacio: '.',
            capas: [
                { puntos: coches, simbolo: (p) => (p.dir > 0 ? '>' : '<') },
                { puntos: [st.frog], simbolo: 'F' },
            ],
        });
        return (dibujo ? `Calle (F tú, > y < coches según su sentido, . libre):\n${dibujo}\n` : '')
             + `Estás en (${st.frog.x},${st.frog.y}) de ${st.width}x${st.height}. `
             + `Tu fila más avanzada: ${st.avanceMaximo ?? 0}`;
    }
    return null;
}

function contarLaMesa(st, juego) {
    const t = [];
    const lista = (v) => Array.isArray(v) ? v.join(' ') : String(v);

    const espacial = contarEspacial(juego, st);
    if (espacial) t.push(espacial);

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
        const r = String(c).split('_').slice(1).join('_');
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

    if (sus.rejilla) {
        const { ancho, alto, celdas, niebla, sinVista } = sus.rejilla;
        const SUELO = { 0: '.', 1: '#', 2: 'o' };   // vacío · muro · destino
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
        for (const p of (sus.piezas ?? [])) {
            if (p.y < 0 || p.y >= alto || p.x < 0 || p.x >= ancho) continue;
            mapa[p.y][p.x] = simbolos[p.t] ?? String(p.t ?? '?')[0].toUpperCase();
        }
        const clave = Object.entries(sus.leyenda ?? {})
            .map(([k, v]) => `${simbolos[k] ?? String(k)[0].toUpperCase()}=${v}`).join(', ');
        t.push(`Mapa (# muro, o destino, . libre${niebla ? ', ? sin explorar' : ''}`
             + `${sinVista ? ', , fuera de tu vista' : ''}`
             + `${clave ? `, ${clave}` : ''}):\n`
             + mapa.map(f => f.join('')).join('\n'));
    }

    for (const z of (sus.zonas ?? [])) {
        const quien = z.de === null || z.de === undefined ? z.id : `${z.id} de ${z.de}`;
        const visto = z.items.length ? z.items.join(' ') : '';
        const tapado = z.ocultas ? `${visto ? ' + ' : ''}${z.ocultas} tapadas` : '';
        t.push(`${quien}: ${visto}${tapado}`);
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
