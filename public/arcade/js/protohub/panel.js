/**
 * panel.js — LO QUE EL AGENTE LEE, ESCRITO TAMBIÉN PARA LA PERSONA
 * ═══════════════════════════════════════════════════════════════════════════
 *     import { filasDeEstado } from './protohub/panel.js';
 *     hud.innerHTML = cabecera + filasDeEstado(st).map(f => fila(f.nombre, f.valor)).join('');
 *
 * ⚠️ POR QUÉ EXISTE: EN 28 DE 38 JUEGOS EL AGENTE SABÍA MÁS QUE LA PERSONA.
 *
 * `descripcion.js` vuelca el estado genéricamente, así que un agente lee
 * `oro: 3. vida: 10. vida_rival: 10. bichos_en_camino: 2` sin que nadie haya escrito
 * una línea para él. El panel, en cambio, sólo enseñaba lo que alguien se acordó de
 * pintar — y casi nadie se acordó. Medido con `npm run asimetria`: veintiocho juegos
 * con campos que el agente lee y la pantalla no dice.
 *
 * Y no es cosmético. Este banco compara a una persona con un agente en el MISMO
 * juego; esa comparación sólo significa algo si los dos ven lo mismo. Un jugador de
 * defensa que no ve su propia vida no está jugando peor: está jugando a otra cosa.
 *
 * ⚠️ Y SE ARREGLA UNA VEZ, NO VEINTIOCHO.
 *
 * Lo obvio era añadirle su fila a cada juego. Serían veintiocho parches, y el
 * juego 39 nacería otra vez mudo — que es literalmente lo que pasó con el alisápolis
 * el día que lo escribí. Así que se hace por la misma regla que usa el describidor:
 * los campos ESCALARES del estado se enseñan, y punto.
 *
 * ⚠️ LO QUE NO SE ENSEÑA, Y POR QUÉ CADA COSA.
 *
 *   · fontanería — de dónde vino el estado, la semilla, la conexión. No es del juego.
 *   · lo que YA tiene su fila — turno, marcador, pista, triunfo, ligadas.
 *   · los objetos y las listas largas — una mano de diez cartas es un dibujo, no un
 *     renglón, y meterla como texto sería taparle la mesa a quien está jugando.
 *
 * ⚠️ Y ESTO NO PUEDE SER LA LISTA QUE USA `prueba_asimetria`.
 *
 * Si la comprobación ignorase exactamente lo que este fichero oculta, no podría
 * fallar nunca — sería su propio espejo. Así que la prueba mantiene SU lista, con sus
 * motivos, y esta de aquí es otra. Que las dos digan cosas parecidas está bien; que
 * fueran la misma sería una comprobación de adorno, y de ésas ya llevamos dos hoy.
 */

/** Fontanería: existe para que el juego funcione, no para que se juegue. */
const FONTANERIA = new Set([
    'juego', 'asiento', 'semilla', 'fuente', 'conexion', 'biblioteca', 'leyenda',
    'legal_moves', 'legal_actions', 'formato', 'version', 'normas',
    /**
     * `cara`, `valores`, `simbolos` y `palos` le dicen al PINTOR cómo dibujar la carta
     * —el número en vez del palo, la tabla de puntos—. Son instrucciones de dibujo, no
     * información del juego: en el panel de entropy salía «cara: valor», que no
     * significa nada para quien está jugando. Lo vi abriendo la captura.
     */
    'cara', 'valores', 'simbolos', 'palos',
]);

/** Lo que las mesas ya pintan en su propia fila; repetirlo sería ruido. */
const YA_ESTA = new Set([
    'turn', 'turno', 'marcador', 'puntos', 'score', 'pista', 'is_game_over',
    'desenlace', 'historial', 'triunfo', 'grupos', 'muerto', 'sueltas',
]);

/** `bichos_en_camino` → «bichos en camino». Provisional y suficiente. */
const legible = (k) => k.replace(/_/g, ' ');

/**
 * Un valor cabe en una fila si es un número, una palabra o una lista corta de cosas
 * simples. Todo lo demás —objetos, manos enteras— es dibujo, no renglón.
 */
function comoTexto(v) {
    if (typeof v === 'boolean') return v ? 'sí' : 'no';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return v.length <= 40 ? v : null;
    if (Array.isArray(v)) {
        if (!v.length || v.length > 6) return null;
        /**
         * ⚠️ UNA LISTA DE LISTAS TAMBIÉN SE PUEDE DECIR, Y HACÍA FALTA.
         *
         * `cajas_rivales` de entropy es una caja por rival, o sea un array de arrays,
         * y la primera versión lo tiraba por «tiene objetos dentro». Resultado: en un
         * juego de INFORMACIÓN OCULTA, el agente leía las cajas de los demás y la
         * persona no — que es lo más gordo que se puede esconder ahí.
         */
        if (v.every(x => Array.isArray(x) && x.length <= 10
                       && x.every(y => y === null || typeof y !== 'object'))) {
            return v.map(x => x.map(y => (y === null ? '?' : String(y))).join(' ')).join('  /  ');
        }
        if (v.some(x => x !== null && typeof x === 'object')) return null;
        return v.map(x => (x === null ? '—' : String(x))).join(' · ');
    }
    return null;
}

/**
 * @param {object} st        el estado tal cual lo publica el juego
 * @param {object} [opts]
 * @param {Set|Array} [opts.fuera]  campos que ESTA mesa ya pinta aparte
 * @param {number} [opts.tope]      cuántas filas como mucho (12 por defecto)
 * @returns {{nombre:string, valor:string}[]}
 */
export function filasDeEstado(st, opts = {}) {
    if (!st || typeof st !== 'object') return [];
    // Por defecto se salta lo que YA está dibujado en la mesa: repetirlo en texto es
    // contar dos veces lo mismo y taparle el juego a quien está jugando.
    const fuera = new Set([...DIBUJADO, ...(opts.fuera ?? [])]);
    // Dieciséis y no doce: el canadiense publica trece campos que caben en una fila, y
    // `tope_turnos` —cuánta partida queda— se quedaba fuera por uno. Cuando de verdad
    // se corta, se dice; cortar en silencio sería la misma mentira que un top-N sin
    // avisar.
    const tope = opts.tope ?? 16;
    const out = [];
    for (const [k, v] of Object.entries(st)) {
        // Con `todos` sólo se salta la fontanería: quien llama decide, mirando la
        // pantalla, si algo sobra de verdad. Ver la nota de `vigilarPanel`.
        if (FONTANERIA.has(k) || fuera.has(k)) continue;
        if (!opts.todos && YA_ESTA.has(k)) continue;
        if (v === null || v === undefined) continue;
        const txt = comoTexto(v);
        if (txt === null || txt === '') continue;
        out.push({ nombre: legible(k), valor: txt });
        // ⚠️ Con tope, y se dice cuando se corta: un panel de cuarenta filas tapa la
        // mesa, y cortar en silencio sería la misma clase de mentira que un `top-N`
        // sin avisar. Doce entran de sobra en el juego que más publica.
        if (out.length >= tope) {
            out.push({ nombre: '…', valor: 'hay más en el estado; se cortó aquí' });
            break;
        }
    }
    return out;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ Y LOS SIETE CON VISUALIZADOR PROPIO, QUE NO PUEDEN IMPORTAR ESTO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Las dos mesas genéricas llaman a `filasDeEstado` y con eso quedaron veintiuno de
 * los veintiocho. Los siete que faltaban —ajedrez, mancala, snake, peatón, blackjack,
 * póker y entropy— tienen visualizador propio, y ésos son scripts CLÁSICOS: declaran
 * globales y se leen por `window`, así que no pueden importar un módulo.
 *
 * Lo que escondían no era menor: el MARCADOR en cinco de ellos —el agente sabe cuánto
 * lleva y la persona no—, los pasos de snake, y las cajas de los rivales en entropy,
 * que en un juego de información oculta es lo más gordo que se puede esconder.
 *
 * ⚠️ SE HACE DESDE FUERA Y NO CON SIETE PARCHES.
 *
 * Cada visualizador reescribe su HUD cuando le apetece, así que no vale con inyectar
 * un bloque una vez: lo borraría en el siguiente repintado. Y siete parches serían
 * siete sitios donde el juego 39 vuelve a nacer mudo — que es exactamente lo que pasó
 * con el alisápolis.
 *
 * Así que se vigila desde aquí: cada segundo se relee el estado y se refresca UN nodo
 * propio, `#mesa-extra`, que se vuelve a colgar del panel si alguien lo tiró. Un
 * segundo basta —es un panel, no una animación— y sondear en vez de observar evita el
 * bucle de morderse la cola: si observáramos el panel, nuestra propia escritura nos
 * despertaría otra vez.
 */
/**
 * Lo que estos visualizadores DIBUJAN. Enumerarlo además en el panel sería contar dos
 * veces lo mismo y taparle la mesa a quien está jugando — la mano del póker se mira,
 * no se lee.
 */
export const DIBUJADO = new Set([
    'player_hand', 'opponent_hand', 'dealer_hand', 'community_cards',
    'mano', 'mi_mano', 'descarte', 'mazo', 'baza', 'cartas', 'comunes',
    'board', 'tablero', 'rejilla', 'piezas', 'width', 'height',
    // ⚠️ Y lo que el CANADIENSE repetía: su panel salía con la mano, el descarte y
    // una matriz de -1 que es, literalmente, el tablero escrito en números. Lo vi
    // abriendo la captura — quince filas de las que cinco eran el dibujo otra vez.
    'posiciones', 'mis_fichas', 'fichas', 'manos_rivales', 'descarte', 'descartes',
    'cadena', 'puntas', 'guardados', 'hojas', 'mi_hoja', 'caja',
]);

export function vigilarPanel(hub, juego, opts = {}) {
    if (typeof document === 'undefined') return () => {};
    /**
     * ⚠️ CADA 400 ms Y NO CADA SEGUNDO, Y NO ES UN CAPRICHO.
     *
     * Con un segundo, el panel iba por detrás de tu propia jugada: haces algo, la mesa
     * cambia, y el marcador tarda en enterarse. Lo cazó `prueba_asimetria`, que leía el
     * panel antes de que refrescara y denunciaba al póker por esconder `puntos` cuando
     * ya los enseñaba. Era una carrera de la prueba — y también un panel lento de
     * verdad, así que se arreglan las dos cosas por el mismo sitio.
     */
    const cada = opts.cada ?? 400;

    const pintar = () => {
        const panel = document.querySelector('.hud-panel');
        if (!panel) return;
        let st = null;
        try { st = hub?.state?.(juego); } catch { return; }
        if (!st) return;

        /**
         * ⚠️ AQUÍ NO VALE LA LISTA DE «ESO YA ESTÁ», Y ME COSTÓ UNA PASADA VERLO.
         *
         * `filasDeEstado` se salta `puntos`, `turno` y el marcador porque las dos mesas
         * genéricas ya les dan su fila. Los visualizadores propios NO — y por eso, tras
         * el primer arreglo, ajedrez, mancala, blackjack y póker seguían escondiendo el
         * MARCADOR: el agente sabía cuánto llevaba y la persona no.
         *
         * Así que aquí se piden todos y se decide mirando: si el valor YA está escrito
         * en el panel, no se repite. Preguntarle a la pantalla en vez de fiarse de una
         * lista es lo que impide las dos cosas a la vez —duplicar y esconder— sin tener
         * que mantener una tabla de qué pinta cada visualizador.
         */
        const previo = panel.querySelector('#mesa-extra');
        const yaEscrito = (panel.innerText ?? '').replace(previo?.innerText ?? '', '');
        // Y sin repetir un valor dentro de la misma pasada: el póker publica `turn` y
        // `turno` con la misma palabra, y salían las dos filas seguidas diciendo lo
        // mismo. El filtro de arriba no las ve porque las dos se añaden a la vez.
        const dichos = new Set();
        const filas = filasDeEstado(st, { ...opts, todos: true, fuera: DIBUJADO })
            .filter(f => {
                if (yaEscrito.includes(f.valor) || dichos.has(f.valor)) return false;
                dichos.add(f.valor);
                return true;
            });
        if (!filas.length) return;

        let caja = panel.querySelector('#mesa-extra');
        if (!caja) {
            caja = document.createElement('div');
            caja.id = 'mesa-extra';
            panel.appendChild(caja);
        }
        const html = filas.map(f =>
            `<div class="status-row"><span>${f.nombre}</span>`
          + `<span class="val">${f.valor}</span></div>`).join('');
        // Sólo se escribe si cambió: reescribir el mismo HTML cada segundo tira la
        // selección de texto de quien esté leyendo, y eso se nota.
        if (caja.innerHTML !== html) caja.innerHTML = html;
    };

    pintar();
    const t = setInterval(pintar, cada);
    return () => clearInterval(t);
}
