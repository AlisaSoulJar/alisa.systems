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

/**
 * La barra de verbos: una fila abajo, centrada, con botones de tamaño de dedo.
 *
 * Vive fuera del panel a propósito —es lo único que la persona necesita PULSAR— y se
 * borra sola cuando no hay verbos, que es el caso de doce juegos donde todo se juega
 * tocando la mesa. Un contenedor vacío colgando bajo la pantalla es la clase de resto
 * que luego nadie sabe de dónde sale.
 */
export function barraDeVerbos(legales, enviar, alSeñalar) {
    /**
     * ⚠️ QUÉ CUENTA COMO VERBO, Y POR QUÉ SE DECIDE AQUÍ DENTRO.
     *
     * Un verbo es una jugada sin `:`, que no es una coordenada (`d2d4`) ni un número
     * (`12`). Cruzarlo contra las piezas del sustrato sería más exacto, pero obliga a
     * traer el sustrato hasta aquí para decidir dónde va un botón — mucha máquina
     * para una lista de seis. Con esta forma salen los 142 medidos y ninguno de más.
     *
     * Se recibe la lista ENTERA y se filtra aquí porque los tres caminos de panel
     * llaman a esta función: filtrar fuera serían tres copias de esta regla.
     */
    const sitio = (s) => /^[a-z]\d[a-z]?\d?$/i.test(s) || /^\d+$/.test(s);
    /**
     * ⚠️ Y TAMPOCO ES VERBO SI ACABA EN UN SITIO, AUNQUE LLEVE PALABRA DELANTE.
     *
     * Con la regla a secas, defensa metía SESENTA Y NUEVE botones en la barra:
     * `torre_a1`, `torre_b1`… las 63 casillas del tablero con la palabra «torre»
     * delante. No son verbos, son la misma jugada apuntando a sitios distintos, y ésas
     * se hacen tocando la casilla. Mirando la cola se queda en siete —`enviar_a` a
     * `enviar_g`, que son carriles y no casillas— y esos siete sí hay que pulsarlos.
     *
     * Es justo el caso que el comentario de arriba daba por improbable. Salió el
     * primer día que la barra se midió en los 35 en vez de en cuatro.
     */
    const verbos = (legales ?? []).map(String).filter(m => !m.includes(':')
        && !sitio(m) && !sitio(m.split(/[_\s]/).pop()));
    let barra = document.getElementById('alisa-verbos');
    if (!verbos.length) { barra?.remove(); return; }
    if (!barra) {
        barra = document.createElement('div');
        barra.id = 'alisa-verbos';
        document.body.appendChild(barra);
    }
    /**
     * Se repinta sólo si cambió la lista. Repintar en cada latido recrea los nodos
     * bajo el dedo, y eso ya costó una tarde entera con el panel de peatón: el dedo
     * baja sobre un botón y lo suelta sobre otro que acaba de nacer.
     */
    const firma = verbos.join('|');
    if (barra.dataset.firma === firma) return;
    barra.dataset.firma = firma;
    barra.innerHTML = '';
    for (const v of verbos) {
        const b = document.createElement('button');
        b.className = 'alisa-verbo';
        b.textContent = v.replace(/_/g, ' ');
        // La etiqueta se lee («enviar a»), la jugada no («enviar_a»). El botón lleva
        // las dos porque quien lo comprueba desde fuera necesita la SEGUNDA: mi primera
        // sonda comparó etiquetas y dio seis juegos en rojo estando bien.
        b.title = v;
        b.addEventListener('click', () => enviar?.(v));
        if (alSeñalar) {
            b.addEventListener('pointerenter', () => alSeñalar(v));
            b.addEventListener('pointerleave', () => alSeñalar(null));
        }
        barra.appendChild(b);
    }
}

export function pintarJugadas(caja, { acciones = [], meToca = true, turnoDe = null,
                                      terminada = false, espectador = false,
                                      rejilla = null, enviar, alSeñalar = null,
                                      estado = null, recibo = null, enSala = false } = {}) {
    if (!caja) return;

    /**
     * ⚠️ LA BARRA DE VERBOS SE QUEDABA PUESTA EN LOS CUATRO ATAJOS.
     *
     * `barraDeVerbos` sólo se llama en la ÚLTIMA línea del camino feliz. Los cuatro
     * caminos que salen antes —espectador, partida terminada, no te toca, sin jugadas—
     * dejaban en pantalla los botones del repintado anterior. No es un resto visual:
     * son botones que se pulsan, no hacen nada y no dicen por qué.
     *
     * Se vio abriendo una sala compartida de entropy con dos pestañas: el invitado leía
     * «le toca a oscar…» en el panel —correcto— y a la vez tenía «robar mazo» y «robar
     * descarte» sobre el tapete. Pulsé y no pasó nada, sin error en consola: el clic ni
     * siquiera llegaba al árbitro, porque la sala ya devolvía `acciones: []`. Un
     * betatester delante de eso concluye que la sala está rota, y tiene razón en
     * concluirlo aunque el árbitro estuviera repartiendo los turnos perfectamente.
     *
     * Es la misma forma de fallo que el turno de esta mañana con otra ropa: una
     * superficie sabía la verdad —el panel— y la otra seguía enseñando lo de antes.
     *
     * El borrado va dentro de `aviso` porque `aviso` significa exactamente «aquí no hay
     * nada que pulsar»; dejarlo en cada `return` serían cuatro sitios donde olvidarse.
     */
    const sinVerbos = () => barraDeVerbos([], enviar, alSeñalar);
    const aviso = (t) => { sinVerbos(); caja.innerHTML = `<span class="dato">${t}</span>`; };
    /**
     * La marca de «ya pinté el final» se suelta en cuanto hay partida viva otra vez,
     * venga el reinicio de donde venga. Fiarlo sólo al botón de «jugar otra» dejaría
     * la segunda partida sin pantalla de fin, y eso es un fallo que sólo aparece a la
     * segunda — de los que se descubren tarde y de casualidad.
     *
     * Se limpian sólo las marcas de estado —`@final`, `@mirando`— y no cualquier
     * cosa que haya en `firma`: los dos motores usan ese mismo atributo para su lista
     * de botones, y borrarlo a ciegas desactivaría su protección desde aquí.
     */
    if (!terminada && (caja.dataset.firma === '@final' || caja.dataset.firma === '@mirando')) {
        caja.dataset.firma = '';
        caja.classList.remove('mesa-final');
    }

    /**
     * ⚠️ MIRAR GANA SOBRE TERMINAR, Y ESE ORDEN ES DELIBERADO.
     *
     * Si la partida que estás VIENDO repetirse llega a su final, aquí no ha terminado
     * la tuya: ha terminado la de otro. La pantalla de fin ofrecería «jugar otra» y
     * «aportar al corpus», que están rechazados mientras se mira — tres botones
     * muertos al final de una repetición que funcionó perfectamente.
     *
     * Lo que hace falta ahí es la salida a jugarla tú, y eso lo pone `avisoMirando`.
     */
    if (espectador) {
        if (caja.dataset.firma === '@mirando') return;
        caja.dataset.firma = '@mirando';
        caja.classList.remove('mesa-final');
        // Quien mira no pulsa. Va aparte de `aviso` porque este camino pinta el
        // recuadro él mismo y no pasa por ahí salvo si falla el módulo.
        sinVerbos();
        if (typeof espectador === 'string') {
            import('./mando_repetir.js')
                // La semilla sale del recibo de la partida que se está mirando: es
                // la que llevará el enlace de «jugarla tú», y decirla es la mitad de
                // la oferta — no es otra partida parecida, es ESA.
                .then(({ avisoMirando }) => { caja.innerHTML = avisoMirando({ semilla: recibo?.semilla }); })
                // Si el módulo no carga, al menos la frase: quedarse en blanco sería
                // peor que perder el enlace.
                .catch(() => aviso(espectador));
        } else {
            aviso('la mesa estaba llena — miras');
        }
        return;
    }

    /**
     * ⚠️ AQUÍ PONÍA `return aviso('partida terminada')` Y AHÍ SE ACABABA LA PÁGINA.
     *
     * Sin botón para jugar otra, en las treinta y cinco mesas: había que recargar. Y
     * lo peor es que DIECISIETE juegos ofrecen `nueva` entre sus jugadas legales
     * justo al terminar —con un comentario en el ProtoHub diciendo que es «para que
     * el HUD tenga un botón sin saber nada del ProtoHub»— y esta línea la descartaba
     * antes de mirarla. El dato puesto, su consumidor tirándolo, y nadie equivocado.
     *
     * El final de la partida es el momento en que alguien decide si juega otra o
     * cierra la pestaña. Lo que va ahí está en `final.js`.
     */
    if (terminada) {
        /**
         * ⚠️ NO SE REPINTA EN CADA SONDEO, Y ESO NO ES UNA OPTIMIZACIÓN.
         *
         * El estado se consulta cada segundo. Sin esta marca, la pantalla de fin se
         * reconstruiría entera una vez por segundo y un botón desaparecería debajo
         * del dedo entre el `pointerdown` y el `pointerup` — el toque se pierde y
         * parece que el botón no responde. Los dos motores ya llevaban esta marca en
         * sus jugadas por haberlo sufrido; aquí faltaba porque este camino nunca
         * había pintado nada al terminar.
         */
        if (caja.dataset.firma === '@final') return;
        caja.dataset.firma = '@final';
        // Al terminar no queda ninguna jugada legal, así que los verbos que hubiera
        // son todos muertos. La pantalla de fin trae sus propios botones.
        sinVerbos();
        // Se carga a demanda: sólo hace falta al acabar, y así las mesas que nunca
        // llegan al final no pagan por ello.
        import('./final.js').then(({ pintarFinal }) => pintarFinal(caja, {
            // `enSala` se PASA, no se deduce de `meToca`: al terminar la partida no
            // le toca a nadie, así que deducirlo daría «es una sala» en las mesas
            // locales y escondería el botón de jugar otra justo donde más se usa.
            estado: estado ?? {}, recibo, enSala,
            // `nueva` la entiende el ProtoHub siempre, la publique el juego o no.
            // Se suelta la marca al pulsar, o la partida nueva heredaría la pantalla
            // de fin de la anterior y no volverían a salir las jugadas.
            otraPartida: enviar ? () => { caja.dataset.firma = ''; enviar('nueva'); } : null,
        })).catch(() => aviso('partida terminada'));
        return;
    }
    if (!meToca)    return aviso(`le toca a ${turnoDe ?? 'otro asiento'}…`);

    const legales = acciones.filter(m => m !== 'nueva' && m !== 'reset');
    if (!legales.length) return aviso('—');

    /**
     * ⚠️ AQUÍ PUSE UNA FIRMA PARA NO REPINTAR, Y EMPEORÓ. QUEDA ESCRITO.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * El razonamiento era bueno y está medido: el panel se reconstruye entero cada
     * segundo aunque la lista sea idéntica —comprobado en peatón: mismo texto,
     * **nodo distinto** un segundo después— y los dos motores llevan justamente esa
     * marca desde hace tiempo, con su comentario de que «recrear los botones bajo el
     * dedo hace que un toque se pierda entre el pointerdown y el pointerup».
     *
     * Pues bien: con la firma puesta, `tacto` EMPEORA. Medido tres veces seguidas.
     *
     *     sin firma    peatón 2/5 · pradera 4/4 · nave 3/3 · damas 5/5
     *     con firma    peatón 2/5 · pradera 1/4 · nave 3/3 · damas 5/5
     *
     * O sea que no arregla lo que quería arreglar y estropea un juego que iba bien.
     * No sé todavía por qué —la hipótesis es que los manejadores de los botones
     * viejos se quedan atados a una lista de jugadas que ya cambió, y en pradera
     * cambia en cada latido— y sin saberlo no se deja puesto.
     *
     * Se anota aquí y no en un cuaderno aparte para que el siguiente que tenga esta
     * misma buena idea sepa que ya se probó, qué números dio y qué falta por
     * entender antes de volver a intentarlo.
     */
    caja.innerHTML = '';

    /**
     * ═══════════════════════════════════════════════════════════════════════════
     *  LOS VERBOS, ABAJO Y GRANDES. EL PANEL DEJA DE SER EL ÚNICO CAMINO.
     * ═══════════════════════════════════════════════════════════════════════════
     *
     * Idea de Oscar, y ordena lo que estaba mezclado: **el panel debería ser para
     * MIRAR, no para pulsar**. Cada puerta ya tiene su forma de actuar —la FSM por
     * HTTP, el LLM devolviendo texto, la persona tocando— y meter las jugadas de
     * todos en una lista de botones es enseñarle a cada uno la puerta del otro.
     *
     * Medido antes de mover nada: de las 693 jugadas legales de los 35 juegos, sólo
     * **142 son verbos** que no están representados en la mesa. Las otras 551 son
     * una carta, una casilla o una ficha — y desde hoy se pueden pulsar ahí. El go
     * es el caso extremo: 362 jugadas, de las cuales 361 son puntos del goban.
     *
     * Así que los verbos —`tirar`, `robar`, `hit`, `arriba`— salen a una barra
     * propia, abajo y con tamaño de dedo, como las acciones de Marabunta. Son de
     * uno a seis por juego: hoy salen minúsculos perdidos entre veinte botones.
     *
     * ⚠️ SE AÑADE, NO SE QUITA. El panel sigue teniendo TODAS las jugadas.
     *
     * `tacto.mjs` garantiza que las 35 mesas dejan pulsar todas sus jugadas legales,
     * y esa garantía mide el panel. Quitar botones aquí y reformular la garantía a la
     * vez son dos cambios grandes a ciegas; primero existe el camino nuevo, se
     * comprueba que funciona, y sólo entonces se adelgaza el viejo. Añadir antes de
     * quitar es lo que permite medir la diferencia.
     *
     * ⚠️ EL CRITERIO VIVE DENTRO DE `barraDeVerbos`, Y SE LE PASA LA LISTA ENTERA.
     *
     * Hay TRES sitios que pintan el panel —éste, `SovereignBoardEngine` y
     * `SovereignCardEngine`— y los tres montan ahora la barra. Filtrar en cada uno
     * son tres copias de la misma regla, que es como acaban divergiendo: el día que
     * un juego llame `pasar2` a un verbo habría que acordarse de tocar tres sitios,
     * y el que se olvide no dará error, dará un botón de menos.
     */
    barraDeVerbos(legales, enviar, alSeñalar);

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

    /**
     * ⚠️ LA TIRA ENSEÑA VARIEDAD, NO LAS OCHO PRIMERAS DE LA MISMA FAMILIA.
     * ═══════════════════════════════════════════════════════════════════════════
     *
     * Aviso de un betatester en entropy: «la carta que robó, si no la quiero, no me
     * deja descartarla». Y la pista de ese momento le decía exactamente lo que él
     * quería —«cámbiala por una de tu caja, o tírala, pero destapando una de las
     * tuyas»—, así que la acción existía y él la estaba buscando.
     *
     * Reproducido en su móvil de 276 px: catorce jugadas legales, y en la tira
     * deslizante caben DOS. Las catorce llegan en el orden de `legal_moves`, que
     * agrupa por verbo: ocho `cambiar:0…7` y detrás seis `descartar_y_voltear:N`. O
     * sea que la primera pantalla eran ocho variantes de LO MISMO y el otro verbo
     * empezaba en la novena. Deslizando se llega, pero nadie desliza buscando algo
     * que no sabe que está.
     *
     * Se intercalan por familia: primero una de cada verbo, luego la segunda de cada
     * uno, y así. Con eso la primera pantalla siempre enseña QUÉ SE PUEDE HACER, y
     * las variantes vienen detrás.
     *
     * ⚠️ NO SE QUITA NI SE AGRUPA NINGUNA. Están las catorce, que es la regla de oro
     * de estos botones: la persona ve la misma lista literal que recibe un agente. Lo
     * único que cambia es en qué orden se enseñan, y el orden no es parte del juego.
     */
    const familias = new Map();
    for (const m of legales) {
        const f = String(m).split(':')[0];
        if (!familias.has(f)) familias.set(f, []);
        familias.get(f).push(m);
    }
    const intercaladas = [];
    for (let i = 0; intercaladas.length < legales.length; i++) {
        for (const lote of familias.values()) if (lote[i] !== undefined) intercaladas.push(lote[i]);
    }

    for (const m of intercaladas) {
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
        /**
         * ⚠️ SEÑALAR UN BOTÓN ENSEÑA DÓNDE CAE ESA JUGADA EN EL TABLERO.
         *
         * El panel dice `c3d4` y hasta ahora había que saberse las coordenadas para
         * situarlo. Es la norma primera de la guía de Board Game Arena —enseñar la
         * consecuencia ANTES de comprometerse— y aquí sale gratis: `sus.acciones` ya
         * sabe qué casillas toca cada jugada.
         *
         * Con `pointerenter` y no con `mouseover` para que valga igual con el dedo:
         * en móvil se dispara al apoyar, antes del `click`, así que se ve un instante
         * a dónde va antes de que se ejecute.
         *
         * Y `focus` además del puntero: quien navega con el tabulador tiene el mismo
         * derecho a ver dónde cae la jugada que quien pasa el ratón por encima.
         */
        if (alSeñalar) {
            b.addEventListener('pointerenter', () => alSeñalar(m));
            b.addEventListener('focus', () => alSeñalar(m));
            b.addEventListener('pointerleave', () => alSeñalar(null));
            b.addEventListener('blur', () => alSeñalar(null));
        }

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
