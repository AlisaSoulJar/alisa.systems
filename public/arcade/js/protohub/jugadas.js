/**
 * jugadas.js — los botones de jugar, en un solo sitio
 * ═══════════════════════════════════════════════════════════════════════════
 *     pintarJugadas(caja, { acciones, meToca, terminada, enviar });
 *
 * ⚠️ ESTOS BOTONES SON LA INTERFAZ COMPLETA, NO UN ATAJO.
 *
 * Aquí está TODA jugada legal, con su nombre — la misma lista que recibe un
 * agente por la puerta de texto. Los clics sobre las cartas o el tablero son un
 * añadido encima para que un humano no tenga que traducir `cambiar:5` a un
 * hueco; no añaden ni una jugada.
 *
 * Ésa es la propiedad que sostiene el banco de pruebas entero: si la persona
 * tuviera acciones que el agente no tiene, dejarían de estar jugando al mismo
 * juego y las dos filas de la tabla no compararían nada.
 *
 * ⚠️ Y POR QUÉ ESTÁ AQUÍ Y NO DENTRO DE LA MESA DE CARTAS.
 *
 * Vivía en `mesa_cartas.mjs`. En cuanto `sala.html` pasó a servir también
 * tableros hubo que elegir entre copiarlo o sacarlo, y copiar esto es copiar la
 * regla de oro —«nada que no esté en `legal_moves`»— con la posibilidad de que
 * una de las dos copias se la salte. Este proyecto ya ha pagado seis veces por
 * la misma decisión tomada al revés.
 */

/**
 * @param {HTMLElement} caja  dónde se pintan
 * @param {object} cfg
 *   acciones   las jugadas legales, tal cual las publica el juego
 *   meToca     si no, se dice de quién es el turno en vez de ofrecer botones
 *   turnoDe    nombre de quien tiene el turno, para poder decirlo
 *   terminada  la partida acabó
 *   espectador entraste a mirar: la mesa estaba llena
 *   rejilla    la del sustrato, si el juego tiene tablero: sirve para colocar los
 *              botones CON LA FORMA del tablero en vez de en fila corrida
 *   enviar     (jugada) => void
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ EL PANEL CON LA FORMA DEL TABLERO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aviso de betatester, en flota:
 *
 *     «que el panel no tenga la misma forma que el tablero es un follon :D
 *      deberiamso crear dos matrices abcd 123 que se correspondan en tablero
 *      y panel no?»
 *
 * Y al abrir la captura era peor de lo que contaba. Las sesenta y cuatro casillas
 * salían en fila corrida, que el panel parte donde le cabe — o sea a SIETE por
 * línea para un tablero de OCHO. `h1` empezaba la segunda fila. No es que el
 * panel no tuviera la forma del tablero: es que tenía otra, parecida, y una
 * cuadrícula casi-cuadrada mintiendo es peor que una lista.
 *
 * Ahora cada botón se coloca por SU COORDENADA y no por su sitio en la lista, así
 * que la correspondencia no es una convención que haya que mantener: es que el
 * botón `c5` está en la columna c y la fila 5 porque se lee de su nombre. Igual
 * que las acciones del sustrato, que se derivan de dónde coloca `deFen` en vez de
 * fiarse de que las dos listas vayan en el mismo orden.
 *
 * ⚠️ Y LA FILA 1 ABAJO, COMO EN EL TABLERO.
 *
 * `y = alto - N` es exactamente la cuenta que hace `accionesDe` en el sustrato.
 * Si aquí pusiera la fila 1 arriba, el panel sería un espejo del tablero y estaría
 * peor que ahora: un mapa al revés se lee con confianza y lleva al sitio contrario.
 *
 * Devuelve `null` si esto no son casillas —«arriba», «jugar:O_5», «cambiar:3»— y
 * entonces se pintan en fila, que para ocho verbos es lo correcto.
 */
function comoTablero(legales, rejilla) {
    const ancho = rejilla?.ancho, alto = rejilla?.alto;
    if (!(ancho > 1 && alto > 1)) return null;
    // Un tablero enorme con pocas jugadas —un go a media partida— no gana nada
    // dibujando 361 huecos vacíos para tres botones.
    if (legales.length < ancho) return null;

    /**
     * ⚠️ UNA JUGADA QUE NO ES CASILLA NO PUEDE TUMBAR EL MAPA ENTERO.
     *
     * La primera versión devolvía `null` en cuanto encontraba algo que no fuera
     * `letra+número`. Con el go eso significa que 361 casillas perdían su mapa por
     * culpa de UNA jugada: `pasar`. Y pasar es una jugada legítima y frecuente —en
     * un go se pasa al final de cada partida—, no un caso raro.
     *
     * Las que no son casillas van debajo, en su propia fila. Siguen estando, que
     * es la regla de oro de estos botones: aquí está TODA jugada legal, sin
     * excepciones, o la persona y el agente dejan de jugar al mismo juego.
     */
    const sitios = [], sueltas = [];
    for (const m of legales) {
        const t = /^([a-z])(\d+)$/i.exec(String(m));
        if (!t) { sueltas.push(m); continue; }
        const x = t[1].toLowerCase().charCodeAt(0) - 97;
        const n = Number(t[2]);
        if (x < 0 || x >= ancho || n < 1 || n > alto) { sueltas.push(m); continue; }
        sitios.push({ m, col: x + 1, fila: alto - n + 1 });
    }
    // Si lo que hay son casi todo verbos, esto no es un tablero: es una lista.
    if (sitios.length < ancho || sueltas.length > sitios.length) return null;

    // Las sueltas ocupan la fila de después del tablero, de izquierda a derecha.
    sueltas.forEach((m, i) => sitios.push({ m, col: (i % ancho) + 1,
                                            fila: alto + 1 + Math.floor(i / ancho) }));
    return { ancho, alto, sitios };
}

export function pintarJugadas(caja, { acciones = [], meToca = true, turnoDe = null,
                                      terminada = false, espectador = false,
                                      rejilla = null, enviar } = {}) {
    if (!caja) return;

    const aviso = (t) => { caja.innerHTML = `<span class="dato">${t}</span>`; };

    if (terminada)  return aviso('partida terminada');
    if (espectador) return aviso('la mesa estaba llena — miras');
    if (!meToca)    return aviso(`le toca a ${turnoDe ?? 'otro asiento'}…`);

    const legales = acciones.filter(m => m !== 'nueva' && m !== 'reset');
    if (!legales.length) return aviso('—');

    caja.innerHTML = '';

    // Si son casillas, el panel se pone con la forma del tablero. Si no —verbos,
    // cartas, huecos numerados— sigue en fila, que es lo que toca para ocho cosas.
    const mapa = comoTablero(legales, rejilla);
    caja.classList.toggle('mesa-jugadas-mapa', !!mapa);
    /**
     * ⚠️ CASILLA EN PÍXELES, NO EN `1fr`.
     *
     * Con `1fr` el mapa salía correcto y aplastado: sesenta y cuatro casillas de
     * catorce píxeles. La causa es que el panel se encoge a su contenido, así que
     * un ancho del 100% del padre es el ancho del contenido — se pide a sí mismo
     * lo que quepa y sale lo mínimo. `width: 100%` en el CSS no lo arregla porque
     * el razonamiento es circular, no un olvido.
     *
     * El tamaño se calcula del ancho del tablero para que un flota de 8 salga
     * cómodo y un go de 19 quepa igual. Los topes están para las dos puntas: un
     * tablero de 3 no hace botones gigantes y uno de 19 no se sale del panel.
     */
    /**
     * ⚠️ EL ANCHO TOTAL ES EL LÍMITE, NO EL DE LA CASILLA.
     *
     * Con el tope por casilla, un go de 19 daba 19x15 más los huecos y se salía
     * del panel: trescientas sesenta y una etiquetas amontonadas y desbordando por
     * la derecha. El límite de verdad es lo que mide el panel, así que se reparte
     * ESE ancho entre las columnas, descontando los huecos.
     */
    let px = 0;
    if (mapa) {
        const HUECO = 2, TOTAL = 270;
        px = Math.max(11, Math.floor((TOTAL - (mapa.ancho - 1) * HUECO) / mapa.ancho));
        caja.style.gap = `${HUECO}px`;
        caja.style.gridTemplateColumns = `repeat(${mapa.ancho}, ${px}px)`;
    } else {
        caja.style.gap = '';
        caja.style.gridTemplateColumns = '';
    }
    /**
     * Y por debajo de dieciocho píxeles la etiqueta no cabe y sólo hace ruido: en
     * un mapa lo que dice dónde está una casilla es SU SITIO, no lo que pone
     * encima. El nombre sigue en el `title` y en la etiqueta accesible, así que no
     * se pierde nada — y el tablero se sigue pudiendo tocar directamente.
     */
    caja.classList.toggle('mesa-jugadas-mudas', !!mapa && px < 18);
    const sitioDe = mapa ? new Map(mapa.sitios.map(s => [s.m, s])) : null;

    for (const m of legales) {
        const b = document.createElement('button');
        b.className = 'mesa-jugada';
        const s = sitioDe?.get(m);
        if (s) { b.style.gridColumn = s.col; b.style.gridRow = s.fila; }
        // `jugar:` y `pedir:` son ruido para quien mira: el verbo ya lo dice el
        // contexto. El título conserva la jugada entera, que es lo que viaja al
        // recibo y lo que hay que poder leer si algo no cuadra.
        b.textContent = String(m).replace(/^jugar:|^pedir:/, '');
        b.title = m;
        // Cuando la casilla es tan pequeña que se le quita el texto, el nombre
        // tiene que seguir estando para quien navega sin ver el mapa.
        b.setAttribute('aria-label', String(m));
        b.onclick = async () => {
            /**
             * Se apagan TODOS, no sólo el pulsado. En una sala compartida el
             * viaje de ida y vuelta dura lo suyo, y sin esto se mandan tres
             * jugadas antes de que conteste la primera: el árbitro rechazaría
             * las de más, pero quien juega vería tres errores por un clic de más.
             */
            [...caja.children].forEach(x => { x.disabled = true; });
            await enviar?.(m);
        };
        caja.appendChild(b);
    }
}
