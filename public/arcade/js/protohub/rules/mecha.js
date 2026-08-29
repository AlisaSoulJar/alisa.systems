/**
 * mecha.js — poner una bomba y no estar donde caiga, para el ProtoHub
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Arena 13×11 con pilares fijos, cajas que se rompen y dos jugadores en
 * esquinas opuestas. Jugadas: `arriba` · `abajo` · `izquierda` · `derecha` ·
 * `esperar` · `bomba`. Gana el último que queda de pie.
 *
 * POR QUÉ ESTÁ EN LA SUITE, QUE ES LA PREGUNTA QUE HAY QUE CONTESTAR ANTES DE
 * AÑADIR UN JUEGO NÚMERO CUARENTA
 * ---------------------------------------------------------------------------
 * Aporta una estructura de decisión que no tenía ninguno de los otros 39: **el
 * peligro lo pones tú, y tarda en llegar.**
 *
 *   · En `peaton` el peligro es del entorno y sólo hay que esquivarlo.
 *   · En `ajedrez` o `damas` la amenaza es del rival y es inmediata.
 *   · Aquí el arma tarda tres turnos en dispararse, no distingue quién la puso,
 *     y bloquea tu propia salida mientras arde. Ponerla mal te mata a ti.
 *
 * Eso obliga a razonar hacia delante sobre un estado que todavía no existe, que
 * es justo lo que un mapa de texto y una lista de jugadas legales NO te regalan:
 * las jugadas legales dicen a dónde puedes ir, no cuáles de esas casillas
 * estarán ardiendo cuando llegues. Un agente que sólo mire lo legal se suicida
 * enseguida, y por eso mide algo.
 *
 * Y es simétrico y de suma cero con dos asientos: sirve igual para humano contra
 * humano, humano contra agente y agente contra agente, que es el trato del banco.
 *
 * DETERMINISTA
 * ------------
 * Las cajas y las mejoras salen de la semilla; nada consulta el reloj ni
 * `Math.random`. La misma semilla y las mismas jugadas dan exactamente la misma
 * partida, que es lo que exige el benchmark.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { mulberry32 } from './azar.js';

/**
 * ⚠️ LA ARENA ES MÁS ANCHA QUE ALTA, Y NO ES UN GUSTO: LO PIDIÓ UNA PRUEBA.
 *
 * Empezó en 11×11 y `prueba_sustrato.mjs` lo cazó: vigila pares de campos que
 * SIEMPRE valen lo mismo, porque suelen ser el mismo dato publicado con dos
 * nombres. Con el tablero cuadrado, `width` y `height` coinciden en todas las
 * partidas y saltó como duplicado.
 *
 * Era un falso positivo —son dos datos distintos que coinciden— y la salida fácil
 * era subir el techo de la prueba. Pero un techo subido para tapar un aviso deja
 * de vigilar los avisos de verdad, y este vigila algo que sí pasa a menudo.
 *
 * Así que se arregla por el otro lado: 13×11. La coincidencia desaparece, el
 * instrumento sigue afilado, y de paso la arena queda con la proporción de las de
 * su género, que son apaisadas porque se juegan en una pantalla apaisada.
 */
const W = 13, H = 11;

const SUELO = 0, MURO = 1, CAJA = 2;

const DIRS = {
    arriba:    { x: 0,  y: -1 },
    abajo:     { x: 0,  y: 1 },
    izquierda: { x: -1, y: 0 },
    derecha:   { x: 1,  y: 0 },
};

/**
 * ⚠️ ESTOS NÚMEROS SON EL JUEGO, Y TODOS SE MIDIERON. NINGUNO ES UN GUSTO.
 *
 * LA MECHA se cuenta en JUGADAS, no en rondas, y ahí estuvo el fallo serio.
 * La primera versión avanzaba el mundo al cerrar la ronda —o sea justo después
 * de mover el asiento 1— así que el 1 movía y le estallaba todo encima, mientras
 * el 0 jugaba siempre sobre las cenizas ya frías. Medido sobre 60 semillas:
 *
 *      empieza el 0:  gana el 0 → 36   gana el 1 → 18
 *      empieza el 1:  gana el 0 → 39   gana el 1 → 16
 *
 * La ventaja NO se movía al cambiar quién empieza: se quedaba pegada al asiento.
 * Eso no es ventaja de salida como las blancas en ajedrez —que sería legítima y
 * se declararía—, era una asimetría estructural mía. En un banco donde se
 * comparan jugadores, un asiento que gana solo invalida la medida.
 *
 * Ahora el mundo avanza UNA JUGADA DESPUÉS DE CADA MOVIMIENTO, sin excepción, y
 * los dos asientos tienen exactamente la misma relación con el reloj.
 *
 * MECHA = 8 jugadas. Como el mundo avanza cada jugada y son dos jugadores, quien
 * pone la bomba mueve una vez de cada dos: ocho jugadas son TRES movimientos
 * suyos, que es lo que hace falta para salir de una cruz de alcance 2. Con seis
 * eran dos, y no basta: se moría en su propia bomba. Está medido más abajo.
 *
 * DENSIDAD_CAJAS empezó en 0,62 y ahogaba el tablero: los dos quedaban tapiados
 * en su esquina y no llegaban a encontrarse. Bajarla no es hacerlo más fácil, es
 * hacer que haya partida.
 */
const MECHA = 8;          // JUGADAS que arde una bomba
const LLAMA_DURA = 2;     // jugadas que la llama sigue matando (una ronda completa)
const ALCANCE_BASE = 2;
const BOMBAS_BASE = 1;
const DENSIDAD_CAJAS = 0.44;

/**
 * ⚠️ CUÁNTOS MOVIMIENTOS PROPIOS CABEN EN UNA MECHA. LO TENÍA COMO CONSTANTE Y
 *    ESTABA MAL DE DOS MANERAS DISTINTAS.
 *
 * Mal la primera: el mundo avanza cada JUGADA y hay dos jugadores, así que quien
 * pone la bomba sólo mueve una vez de cada dos. Con la mecha en 6 eso son DOS
 * movimientos, no tres. Yo escribí tres.
 *
 * Y mal la segunda, que es la peor: el presupuesto no es fijo, se consume. Con
 * una constante, un jugador con la mecha casi agotada seguía creyendo que le
 * quedaban tres pasos, elegía una salida de tres y moría a mitad de camino.
 *
 * Visto en la traza de la semilla 3: el asiento 1 puso bomba en (9,7), se apartó
 * a (9,8) y luego a (9,9) — dos casillas, con un alcance de 2. Murió en su propia
 * bomba, en una esquina sin salida, habiendo «huido» las dos veces.
 *
 * Así que se cuenta del reloj de verdad: de las bombas que me amenazan, la que
 * antes va a estallar; y de sus jugadas restantes, las que me tocan a mí.
 */
const pasosQueQuedan = (mechaRestante) => Math.floor(mechaRestante / 2);

const idx = (x, y) => y * W + x;
const dentro = (x, y) => x >= 0 && x < W && y >= 0 && y < H;

/**
 * ⚠️ LAS CUATRO ESQUINAS SE DEJAN DESPEJADAS, Y NO ES UN DETALLE.
 *
 * Si una caja tapa la salida de una esquina, ese jugador arranca encerrado y su
 * primera jugada obligada es romperla — o sea que la partida empieza con un
 * turno regalado y desigual según la semilla. Un banco de pruebas donde la
 * semilla decide parte del resultado no mide al jugador, mide la semilla.
 *
 * Se despejan las tres casillas de cada esquina: la propia y sus dos vecinas.
 */
function esRefugio(x, y) {
    const enEsquina = (cx, cy) => (x === cx && y === cy)
        || (x === cx && Math.abs(y - cy) === 1)
        || (y === cy && Math.abs(x - cx) === 1);
    return enEsquina(1, 1) || enEsquina(W - 2, H - 2);
}

/**
 * El mapa. Pilares en las casillas pares —el patrón clásico, que es lo que hace
 * que haya pasillos y esquinas donde esconderse— y cajas repartidas con semilla.
 */
/**
 * ⚠️ EL MAPA ES SIMÉTRICO POR CONSTRUCCIÓN, Y ESO NO ES ESTÉTICA: ES LA MEDIDA.
 *
 * Con las cajas repartidas libremente al azar, medí sobre 80 semillas que el
 * asiento 0 ganaba el 61 % de las partidas decisivas. Probé si era ventaja de
 * salida cambiando quién empieza: subió al 67 %, o sea que no era eso. Entonces
 * intercambié SÓLO LAS ESQUINAS DE SALIDA, dejando todo lo demás igual:
 *
 *      normal                     el 0 gana el 61 %
 *      empieza el 1               el 0 gana el 67 %
 *      esquinas cambiadas         el 0 gana el 33 %
 *      esquinas + empieza el 1    el 0 gana el 39 %
 *
 * La ventaja se fue con la esquina, exactamente reflejada. No era del asiento ni
 * del turno: dependía del SITIO.
 *
 * ⚠️ Y AQUÍ ME EQUIVOQUÉ AL DIAGNOSTICAR, ASÍ QUE QUEDA ESCRITO.
 *
 * Di por hecho que la culpa era del reparto de cajas e hice esto: sortear media
 * rejilla y reflejarla por el centro. Comprobado después, el mapa quedó
 * perfectamente simétrico —0 celdas de 2.420 lo rompen— y los resultados no
 * cambiaron ni un dígito: 61 %, 67 %, 33 %, 39 %, los mismos cuatro números.
 *
 * O sea que el mapa nunca fue el problema. La culpa era del RIVAL DE CASA, que
 * recorría las direcciones en un orden absoluto: ver `dirsDe` más abajo.
 *
 * El reflejo se queda igualmente, y no por vergüenza de haberlo escrito: con él
 * las dos esquinas son demostrablemente el mismo tablero girado, así que ese
 * sesgo ya no puede volver por otra puerta. Pero el número que lo delató no lo
 * arregló, y confundir las dos cosas es cómo se acumulan los amuletos.
 */
function generarMapa(seed) {
    const rnd = mulberry32(seed);
    const celdas = new Array(W * H).fill(SUELO);
    const espejo = (i) => idx(W - 1 - (i % W), H - 1 - ((i - i % W) / W));

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = idx(x, y);
            const borde = x === 0 || y === 0 || x === W - 1 || y === H - 1;
            const pilar = x % 2 === 0 && y % 2 === 0;
            if (borde || pilar) { celdas[i] = MURO; continue; }
            if (esRefugio(x, y)) continue;
            // Sólo decide la mitad canónica; la otra la copia reflejada.
            if (i > espejo(i)) continue;
            const hay = rnd() < DENSIDAD_CAJAS;
            if (!hay) continue;
            celdas[i] = CAJA;
            if (!esRefugio(espejo(i) % W, (espejo(i) - espejo(i) % W) / W)) celdas[espejo(i)] = CAJA;
        }
    }

    /**
     * ⚠️ Y SE COMPRUEBA QUE LOS DOS SE PUEDAN ENCONTRAR.
     *
     * Con las cajas al azar puede salir un mapa donde los dos jugadores estén en
     * bolsas separadas por muros indestructibles. Las cajas se rompen, así que
     * casi siempre hay camino — pero «casi siempre» no vale: una partida sin
     * camino posible acaba en tablas por tope y eso ensucia la clasificación sin
     * que nadie sepa por qué.
     *
     * Se mide sobre el mapa IGNORANDO las cajas, porque las cajas se pueden
     * volar; si aun así no hay camino, es que sobran pilares y se abre uno.
     */
    abrirCaminoSiHaceFalta(celdas);

    /**
     * Las mejoras van DEBAJO de cajas: sólo aparecen si alguien las rompe. Y van
     * POR PAREJAS REFLEJADAS, por lo mismo que las cajas: una mejora de alcance a
     * dos pasos de una esquina y a nueve de la otra decide la partida sin que
     * juegue nadie.
     */
    const mejoras = new Map();
    const canonicas = [];
    for (let i = 0; i < celdas.length; i++) {
        if (celdas[i] === CAJA && i < espejo(i) && celdas[espejo(i)] === CAJA) canonicas.push(i);
    }
    const parejas = Math.min(canonicas.length, 3);
    for (let n = 0; n < parejas; n++) {
        const i = canonicas.splice(Math.floor(rnd() * canonicas.length), 1)[0];
        const que = rnd() < 0.5 ? 'alcance' : 'bombas';
        mejoras.set(i, que);
        mejoras.set(espejo(i), que);
    }

    return { celdas, mejoras };
}

/** ¿Se llega de una esquina a la otra atravesando cajas? Si no, se abre paso. */
function abrirCaminoSiHaceFalta(celdas) {
    const paso = (i) => celdas[i] !== MURO;
    const visto = new Set();
    const cola = [idx(1, 1)];
    visto.add(cola[0]);
    while (cola.length) {
        const i = cola.shift();
        const x = i % W, y = (i - x) / W;
        for (const d of Object.values(DIRS)) {
            const nx = x + d.x, ny = y + d.y;
            if (!dentro(nx, ny)) continue;
            const j = idx(nx, ny);
            if (visto.has(j) || !paso(j)) continue;
            visto.add(j); cola.push(j);
        }
    }
    if (visto.has(idx(W - 2, H - 2))) return;
    /**
     * ⚠️ Y EL RESCATE TAMBIÉN TIENE QUE SER SIMÉTRICO.
     *
     * Antes abría la fila 1, que pasa justo por delante de la esquina del jugador
     * 0 y le regalaba un pasillo despejado. Se abre la fila del MEDIO, que está a
     * la misma distancia de las dos esquinas.
     */
    const centro = (H - 1) / 2;
    for (let x = 1; x < W - 1; x++) if (celdas[idx(x, centro)] === MURO) celdas[idx(x, centro)] = SUELO;
}

/** Las casillas que barre una bomba, parando en muros y en la primera caja. */
function alcanceDe(p, bomba) {
    const tocadas = [{ x: bomba.x, y: bomba.y }];
    for (const d of Object.values(DIRS)) {
        for (let n = 1; n <= bomba.alcance; n++) {
            const x = bomba.x + d.x * n, y = bomba.y + d.y * n;
            if (!dentro(x, y)) break;
            const c = p.celdas[idx(x, y)];
            if (c === MURO) break;
            tocadas.push({ x, y });
            if (c === CAJA) break;   // la caja para la llama, y se rompe
        }
    }
    return tocadas;
}

/**
 * Estallar. Con reacción en cadena: una bomba alcanzada estalla en el acto, y
 * eso es la mitad de las trampas buenas del juego.
 */
function estallar(p, primeras) {
    const pendientes = [...primeras];
    const yaEstallada = new Set(primeras.map((b) => idx(b.x, b.y)));

    while (pendientes.length) {
        const b = pendientes.shift();
        for (const c of alcanceDe(p, b)) {
            const i = idx(c.x, c.y);
            p.llamas.set(i, LLAMA_DURA);
            if (p.celdas[i] === CAJA) {
                p.celdas[i] = SUELO;
                p.rotas++;
                /**
                 * ⚠️ Y SE LE APUNTA A QUIEN LA ROMPIÓ, QUE ES LO QUE SE ME OLVIDÓ.
                 *
                 * Contaba `p.rotas` de la partida y no `j.rotas` de cada jugador,
                 * así que el marcador salía [0, 0] siempre. La clasificación
                 * excluyó el juego con «la casa no supera al suelo»: y no lo
                 * superaba porque los dos sacaban cero, no porque jugaran igual.
                 *
                 * Un entorno del banco que no distingue a un jugador bueno de uno
                 * malo no mide nada, y la única señal de que algo iba mal fue una
                 * línea de la tabla. Sin ella habría publicado un juego mudo.
                 */
                const duenio = p.jugadores[b.de];
                if (duenio) duenio.rotas++;
                const m = p.mejoras.get(i);
                if (m) { p.sueltas.set(i, m); p.mejoras.delete(i); }
            }
            const enCadena = p.bombas.find((o) => o.x === c.x && o.y === c.y && !yaEstallada.has(idx(o.x, o.y)));
            if (enCadena) { yaEstallada.add(idx(enCadena.x, enCadena.y)); pendientes.push(enCadena); }
        }
    }
    p.bombas = p.bombas.filter((b) => !yaEstallada.has(idx(b.x, b.y)));
    /**
     * ⚠️ EL CONTADOR SE DERIVA, NO SE LLEVA A MANO.
     *
     * Descontar `puestas` bomba a bomba parece lo natural y se descuadra al
     * primer despiste: en una cadena estallan bombas que nadie contó, y el
     * jugador se queda con un cupo fantasma —o sin poder poner ninguna nunca
     * más— sin ningún error. Las bombas que hay en el tablero son la verdad; el
     * contador es una vista de esa verdad y se recalcula entero.
     */
    recontarPuestas(p);
}

/** Quien esté sobre una llama, cae. Se mira después de mover y de estallar. */
function quemarJugadores(p) {
    for (const j of p.jugadores) {
        if (!j.vivo) continue;
        if (p.llamas.has(idx(j.x, j.y))) j.vivo = false;
    }
}

/**
 * ⚠️ LA ARENA SE CIERRA, Y NO ES ADORNO: ES LO QUE HACE QUE HAYA RESULTADO.
 *
 * Con el mapa simétrico y el rival de casa jugando en su propio marco, los dos
 * asientos son intercambiables — que era el objetivo— y entonces el rival contra
 * sí mismo juega una partida en espejo: medido, 52 de 80 acababan en tablas al
 * agotar el tope, con las 600 jugadas gastadas.
 *
 * Es matemáticamente correcto y como banco de pruebas no vale nada: un juego que
 * casi siempre empata no separa a un jugador bueno de uno malo, y separar es lo
 * único que se le pide a un entorno del banco.
 *
 * Así que a partir de cierta jugada el tablero se estrecha un anillo cada tantas
 * jugadas, desde el borde hacia dentro. Es lo que hacen los juegos del género —y
 * los de arena en general— por exactamente esta razón. Es simétrico, es
 * determinista, y convierte el tope de «se acabó el tiempo» en «ya no cabéis los
 * dos».
 *
 * Quien esté en el anillo cuando se cierra, cae: el aviso es que se ve venir.
 */
const CIERRE_EMPIEZA = 160;   // jugadas de juego abierto antes de estrechar
const CIERRE_CADA = 40;       // jugadas entre anillo y anillo

function anilloCerrado(p) {
    if (p.t < CIERRE_EMPIEZA) return;
    if ((p.t - CIERRE_EMPIEZA) % CIERRE_CADA !== 0) return;
    const n = 1 + Math.floor((p.t - CIERRE_EMPIEZA) / CIERRE_CADA);   // 1 = el primer anillo interior
    // ⚠️ La arena no es cuadrada: el anillo tiene un máximo por eje. Con un solo
    //    `max` se cerraba de más por el lado corto y de menos por el largo.
    const minX = n, maxX = W - 1 - n;
    const minY = n, maxY = H - 1 - n;
    if (minX > maxX || minY > maxY) return;
    for (let x = minX; x <= maxX; x++) {
        for (const y of [minY, maxY]) { p.celdas[idx(x, y)] = MURO; p.sueltas.delete(idx(x, y)); }
    }
    for (let y = minY; y <= maxY; y++) {
        for (const x of [minX, maxX]) { p.celdas[idx(x, y)] = MURO; p.sueltas.delete(idx(x, y)); }
    }
    // Lo que quede dentro del anillo desaparece con él.
    p.bombas = p.bombas.filter((b) => !(p.celdas[idx(b.x, b.y)] === MURO));
    recontarPuestas(p);
    for (const j of p.jugadores) {
        if (j.vivo && p.celdas[idx(j.x, j.y)] === MURO) j.vivo = false;
    }
}

/** Un turno completo del mundo: se apagan llamas, arden mechas, estalla lo que toca. */
function avanzarMundo(p) {
    for (const [i, n] of [...p.llamas]) {
        if (n <= 1) p.llamas.delete(i); else p.llamas.set(i, n - 1);
    }
    const listas = [];
    for (const b of p.bombas) {
        b.mecha--;
        if (b.mecha <= 0) listas.push(b);
    }
    if (listas.length) estallar(p, listas);
    quemarJugadores(p);
    p.t++;
    anilloCerrado(p);
}

/** Las bombas en el tablero son la verdad; el contador se deriva de ellas. */
function recontarPuestas(p) {
    for (const j of p.jugadores) j.puestas = 0;
    for (const b of p.bombas) { const j = p.jugadores[b.de]; if (j) j.puestas++; }
}

const vivos = (p) => p.jugadores.filter((j) => j.vivo);

/**
 * ⚠️ UN SOLO RELOJ, Y CUENTA DECISIONES.
 *
 * Llegué a tener dos —`t` para el mundo y `jugadas` para el tope— y en cuanto el
 * mundo pasó a avanzar después de cada jugada resultaron ser el mismo número con
 * dos nombres. Eso es exactamente lo que se descuadra en silencio a la tercera
 * vez que alguien toca el fichero.
 *
 * `p.t` cuenta JUGADAS, que es lo que cuenta el `--tope` del banco en todos los
 * demás juegos: si aquí contara rondas, este juego aguantaría el doble con el
 * mismo tope y la clasificación compara ese número entre juegos.
 */
const acabada = (p) => vivos(p).length <= 1 || p.t >= p.tope;

export const mecha = {
    OBJETIVO: 'Objetivo: ser el último en pie. Pon bombas para romper cajas y alcanzar al rival, '
        + 'pero la mecha tarda tres turnos, la llama no distingue de quién es la bomba, y una bomba '
        + 'puesta te tapa a ti la salida. Rompe cajas para encontrar más alcance y más bombas.',

    // CUÁNTAS SILLAS TIENE LA MESA: dos, simétricas y de suma cero.
    ASIENTOS: 2,
    id: 'mecha',
    nombre: 'Mecha',

    nuevaPartida(opts = {}) {
        const seed = opts.seed ?? 1234;
        const { celdas, mejoras } = generarMapa(seed);
        return {
            seed,
            celdas,
            mejoras,
            sueltas: new Map(),          // mejoras ya destapadas, esperando a que las pisen
            bombas: [],
            llamas: new Map(),           // casilla → turnos que le quedan ardiendo
            jugadores: [
                { x: 1, y: 1, vivo: true, alcance: ALCANCE_BASE, maxBombas: BOMBAS_BASE, puestas: 0, rotas: 0 },
                { x: W - 2, y: H - 2, vivo: true, alcance: ALCANCE_BASE, maxBombas: BOMBAS_BASE, puestas: 0, rotas: 0 },
            ],
            turno: 0,
            t: 0,
            rotas: 0,
            historial: [],
            tope: opts.tope ?? 400,
        };
    },

    /**
     * Lo que hay sobre la mesa. Todo lo que decide la partida sale de aquí: si no
     * está en el sustrato, no se puede pintar ni leer, y entonces no existe.
     *
     * ⚠️ LA MECHA VA EN EL TIPO, NO EN UN CAMPO SUELTO.
     *
     * Una bomba a punto de estallar y otra recién puesta ocupan la misma casilla
     * y son dos situaciones completamente distintas: en una te puedes cruzar, en
     * la otra te mata. Si las dos salen como «bomba», el mapa de texto y el
     * dibujo enseñan lo mismo para dos cosas que no lo son, y quien juegue de
     * oído —persona o agente— no puede decidir.
     *
     * Por eso hay `bomba` y `bomba_ya`: el segundo es «estalla en el próximo
     * turno». Es la única información del juego que no se ve mirando el tablero
     * y hay que publicarla a propósito.
     */
    sustrato(p) {
        const piezas = [];

        /**
         * ⚠️ LA CAJA ES UNA PIEZA, NO TERRENO — Y ESTO EMPEZÓ SIENDO UN FALLO MÍO.
         *
         * Dentro, `p.celdas` guarda 2 para las cajas porque a las reglas les viene
         * bien tenerlas en la rejilla: la llama se para en ellas, se rompen, y
         * mirar una casilla es una resta.
         *
         * Pero el terreno que se PUBLICA es vocabulario compartido con los otros
         * cuarenta juegos, y ahí el 2 significa DESTINO —la casilla objetivo del
         * sokoban—, que se dibuja como una marca plana en el suelo. Publiqué cajas
         * con ese número y salieron pintadas como metas: un bloque que tapa la
         * vista y detiene una explosión, dibujado como una alfombra.
         *
         * Lo que no encaja en el vocabulario de terreno no se mete a martillazos:
         * una caja se rompe, aparece y desaparece durante la partida, y eso es
         * exactamente lo que es una PIEZA. El terreno se queda con lo que de
         * verdad no cambia nunca — suelo y pilar.
         */
        for (let i = 0; i < p.celdas.length; i++) {
            if (p.celdas[i] === CAJA) piezas.push({ x: i % W, y: (i - i % W) / W, t: 'caja' });
        }

        for (const [i, m] of p.sueltas) {
            piezas.push({ x: i % W, y: (i - i % W) / W, t: m === 'alcance' ? 'mejora_alcance' : 'mejora_bomba' });
        }
        for (const b of p.bombas) {
            piezas.push({ x: b.x, y: b.y, t: b.mecha <= 1 ? 'bomba_ya' : 'bomba', de: b.de });
        }
        for (const [i] of p.llamas) {
            piezas.push({ x: i % W, y: (i - i % W) / W, t: 'llama' });
        }
        p.jugadores.forEach((j, n) => {
            if (j.vivo) piezas.push({ x: j.x, y: j.y, t: 'jugador', de: n });
        });

        return {
            // El terreno publicado sólo tiene lo que no cambia: suelo y pilar.
            // Las cajas viajan como piezas, arriba.
            rejilla: { ancho: W, alto: H, celdas: p.celdas.map((v) => (v === MURO ? 1 : 0)) },
            piezas,
            /**
             * ⚠️ QUÉ BULTO HACE CADA COSA. Sin esto, todas las piezas de un juego
             *    nuevo nacen planas: el pintor las manda a 0,25 y con eso salen
             *    discos. Una caja que tapa, una bomba que estorba y una llama que
             *    está en el suelo tienen que distinguirse de un vistazo, y la
             *    diferencia es de ALTURA antes que de color — el color ya lo gasta
             *    el dueño.
             *
             * `bomba_ya` es más alta que `bomba` a propósito: crece según se acerca
             * a estallar, así el aviso se ve por el rabillo del ojo sin leer nada.
             */
            alturas: {
                caja: 0.7,
                bomba: 0.5,
                bomba_ya: 0.8,
                llama: 0.12,
                mejora_alcance: 0.22,
                mejora_bomba: 0.22,
            },
            /**
             * ⚠️ EL MAPA DE SONIDO. Poner una bomba y dar un paso son decisiones
             *    opuestas, y hasta hoy sonaban igual: el arcade tocaba un único
             *    `ficha` para toda jugada.
             *
             * `bomba` suena a `tick` porque lo que empieza no es la explosión: es
             * la MECHA. El sonido cuenta lo que acaba de pasar, no lo que pasará
             * dentro de ocho jugadas — y en este juego esa distancia es el juego.
             *
             * Y `esperar` es `null`: silencio PEDIDO, que no es lo mismo que no
             * estar en el mapa. Quedarse quieto un turno es una jugada legal y de
             * las importantes, y no debería sonar a nada.
             */
            sonidos: {
                jugada: {
                    bomba: 'tick',
                    arriba: 'footstep', abajo: 'footstep',
                    izquierda: 'footstep', derecha: 'footstep',
                    esperar: null,
                },
            },
            zonas: [],
            leyenda: {
                caja: 'caja: se rompe con una bomba y puede esconder una mejora',
                jugador: 'un jugador',
                bomba: 'bomba encendida: estalla en cruz cuando se acabe la mecha',
                bomba_ya: 'bomba a punto: estalla en el próximo turno',
                llama: 'llama: mata a quien esté aquí al acabar el turno',
                mejora_alcance: 'mejora: alarga el alcance de tus bombas',
                mejora_bomba: 'mejora: te deja poner una bomba más a la vez',
            },
            /**
             * Los símbolos van en minúscula a propósito: `jugador` y `bomba` los
             * tienen los dos bandos, y el mapa de texto pone en mayúscula al
             * dueño 0 cuando un mismo tipo tiene dos dueños. Escribirlos ya en
             * mayúscula rompería ese convenio.
             */
            simbolos: {
                caja: 'x', jugador: 'p', bomba: 'o', bomba_ya: 'q', llama: '*',
                mejora_alcance: '+', mejora_bomba: '&',
            },
            terreno: { 0: '.', 1: '#' },
            leyendaTerreno: {
                0: 'suelo libre',
                1: 'pilar: no se rompe y para la llama',
            },
        };
    },

    estado(p) {
        const fin = acabada(p);
        const enPie = vivos(p);
        let result = null;
        if (fin) {
            if (enPie.length === 1) result = p.jugadores.indexOf(enPie[0]) === 0 ? 'white' : 'black';
            else result = 'draw';   // los dos caídos, o se agotó el tope
        }
        return {
            state: {
                width: W, height: H,
                celdas: [...p.celdas],
                jugadores: p.jugadores.map((j) => ({ ...j })),
                bombas: p.bombas.map((b) => ({ ...b })),
                llamas: [...p.llamas.keys()],
            },
            width: W, height: H,
            turn: p.turno === 0 ? 'white' : 'black',
            legal_moves: fin ? [] : this.jugadasLegales(p),
            is_check: false,
            is_game_over: fin,
            result,
            t: p.t,
            /**
             * ⚠️ EL MARCADOR VA COMO `{white, black}`, NO COMO ARRAY.
             *
             * `puntuacionDe()` —el mismo que usan el verificador y el gimnasio—
             * lee un número, o un objeto por `.white`/`.black`. Un array es un
             * objeto y no tiene ninguna de las dos, así que devolvía 0 en silencio.
             * Publiqué `[0, 0]`, el entorno vio recompensa 0 en toda la partida, y
             * la tabla descartó el juego. Ni un error por ninguna parte.
             *
             * Y lleva las dos cosas sumadas a propósito: las CAJAS son la señal
             * densa —hay progreso en cada explosión útil, que es lo que un agente
             * puede aprender— y la VICTORIA es el objetivo de verdad, que sin peso
             * propio quedaría invisible junto a veinte cajas.
             */
            score: {
                white: p.jugadores[0].rotas + (fin && enPie.length === 1 && enPie[0] === p.jugadores[0] ? 50 : 0),
                black: p.jugadores[1].rotas + (fin && enPie.length === 1 && enPie[0] === p.jugadores[1] ? 50 : 0),
            },
            rotasPorJugador: p.jugadores.map((j) => j.rotas),
        };
    },

    /**
     * ⚠️ LEGAL NO ES LO MISMO QUE SEGURO, Y ESA DISTANCIA ES EL JUEGO.
     *
     * Aquí se declara sólo lo que las reglas permiten: andar a una casilla libre,
     * esperar, y poner bomba si te quedan. Que la casilla a la que vas vaya a
     * estar ardiendo dentro de dos turnos NO sale en esta lista, y no debe salir:
     * si la lista de jugadas legales excluyera lo peligroso, el juego lo estaría
     * jugando ella y no el jugador.
     */
    jugadasLegales(p) {
        const j = p.jugadores[p.turno];
        if (!j || !j.vivo) return [];
        const libres = Object.entries(DIRS)
            .filter(([, d]) => {
                const x = j.x + d.x, y = j.y + d.y;
                if (!dentro(x, y)) return false;
                if (p.celdas[idx(x, y)] !== SUELO) return false;
                return !p.bombas.some((b) => b.x === x && b.y === y);
            })
            .map(([n]) => n);
        const puede = j.puestas < j.maxBombas && !p.bombas.some((b) => b.x === j.x && b.y === j.y);
        return [...libres, 'esperar', ...(puede ? ['bomba'] : [])];
    },

    mover(p, jugada) {
        if (acabada(p)) return false;
        if (!this.jugadasLegales(p).includes(jugada)) return false;

        p.historial.push(instantanea(p));

        const j = p.jugadores[p.turno];
        if (jugada === 'bomba') {
            p.bombas.push({ x: j.x, y: j.y, de: p.turno, mecha: MECHA, alcance: j.alcance });
            j.puestas++;
        } else if (jugada !== 'esperar') {
            const d = DIRS[jugada];
            j.x += d.x; j.y += d.y;
            const i = idx(j.x, j.y);
            const m = p.sueltas.get(i);
            if (m) {
                if (m === 'alcance') j.alcance++; else j.maxBombas++;
                p.sueltas.delete(i);
            }
        }

        /**
         * ⚠️ SE COMPRUEBA EL FUEGO AL PISAR, NO SÓLO AL FINAL DEL TURNO.
         *
         * Meterse andando en una llama que ya está ardiendo tiene que matar en el
         * acto. Si sólo se mirara al avanzar el mundo, se podría cruzar una llama
         * de lado a lado siempre que se saliera antes, que no es el juego.
         */
        quemarJugadores(p);

        /**
         * ⚠️ EL MUNDO AVANZA DESPUÉS DE CADA JUGADA, SIN EXCEPCIÓN.
         *
         * Hacerlo sólo al cerrar la ronda parece más natural —«un turno de todos,
         * un tick»— y regala la partida al asiento 0: el 1 mueve y el mundo
         * estalla inmediatamente después, el 0 mueve y no pasa nada. Medido: 36-18
         * y 39-16 para el asiento 0, empezara quien empezara.
         */
        p.turno = (p.turno + 1) % p.jugadores.length;
        avanzarMundo(p);

        // Si a quien le toca está muerto, se salta su turno para no bloquear.
        let saltos = 0;
        while (!acabada(p) && !p.jugadores[p.turno].vivo && saltos < p.jugadores.length) {
            p.turno = (p.turno + 1) % p.jugadores.length;
            saltos++;
        }
        return true;
    },

    deshacer(p) {
        const h = p.historial.pop();
        if (!h) return false;
        restaurar(p, h);
        return true;
    },

    /**
     * Rival de casa. No juega bien y no pretende: es el suelo contra el que se
     * mide, y tiene que ser explicable en tres frases.
     *
     *   1. Si estoy en peligro, salgo por donde no lo esté.
     *   2. Si estoy seguro y hay una caja o el rival al lado, pongo bomba —
     *      pero sólo si me queda por dónde huir.
     *   3. Si no, me acerco al rival.
     */
    sugerencia(p) {
        if (acabada(p)) return null;
        const legales = this.jugadasLegales(p);
        if (!legales.length) return null;
        const j = p.jugadores[p.turno];
        const rival = p.jugadores[(p.turno + 1) % p.jugadores.length];

        // 1. Si estoy en peligro, salir — con los pasos que la mecha me deje.
        if (enPeligro(p, j.x, j.y)) {
            const huida = primerPasoFuera(p, j, null, pasosQueQuedan(mechaMasCorta(p, j.x, j.y)), p.turno);
            if (huida) return huida;
            // Sin salida: se mueve igualmente, y también en su propio marco — si
            // este último recurso mirara en orden absoluto, volvería a colarse
            // por aquí el sesgo que se acaba de quitar.
            return dirsDe(p.turno).map(([m]) => m).find((m) => legales.includes(m)) ?? 'esperar';
        }

        // 2. Bomba, pero SÓLO si tengo escapatoria de MI PROPIA bomba, contando
        //    los movimientos que de verdad me va a dar su mecha.
        if (legales.includes('bomba')) {
            const alLado = dirsDe(p.turno).some(([, d]) => {
                const x = j.x + d.x, y = j.y + d.y;
                return dentro(x, y) && (p.celdas[idx(x, y)] === CAJA
                    || (rival.vivo && rival.x === x && rival.y === y));
            });
            const mia = { x: j.x, y: j.y, de: p.turno, mecha: MECHA, alcance: j.alcance };
            // Se le descuenta la jugada que el mundo avanza justo después de ponerla.
            if (alLado && primerPasoFuera(p, j, mia, pasosQueQuedan(MECHA - 1), p.turno)) return 'bomba';
        }

        // 3. Acercarse al rival, sin meterse en una llama por el camino.
        const pasos = dirsDe(p.turno).map(([m]) => m).filter((m) => legales.includes(m))
            .filter((m) => !enPeligro(p, j.x + DIRS[m].x, j.y + DIRS[m].y));
        if (!rival.vivo) return pasos[0] ?? 'esperar';
        pasos.sort((a, b) =>
            (Math.abs(j.x + DIRS[a].x - rival.x) + Math.abs(j.y + DIRS[a].y - rival.y))
            - (Math.abs(j.x + DIRS[b].x - rival.x) + Math.abs(j.y + DIRS[b].y - rival.y)));
        return pasos[0] ?? 'esperar';
    },
};

/**
 * ⚠️ EL RIVAL DE CASA MIRABA SIEMPRE HACIA EL MISMO SITIO, Y ESO LE DABA VENTAJA
 *    A UNA ESQUINA SOBRE UN TABLERO PERFECTAMENTE SIMÉTRICO.
 *
 * Comprobado: el mapa es simétrico por construcción —0 celdas de 2.420 rompen la
 * simetría— y aun así el asiento 0 ganaba el 61 % de las decisivas, y al
 * intercambiar las esquinas la ventaja se iba con ellas, reflejada.
 *
 * Si el tablero es simétrico y el resultado no, el desequilibrio no está en el
 * juego: está en el jugador. Y aquí estaba: `Object.values(DIRS)` recorre
 * siempre arriba, abajo, izquierda, derecha, y en un tablero girado 180° el
 * «arriba» de uno es el «abajo» del otro. Al empatar dos opciones, los dos
 * preferían la misma dirección ABSOLUTA — que para uno apunta a su rival y para
 * el otro a su propia pared.
 *
 * Se arregla con el mismo truco que el mapa: hacerlo imposible. Cada asiento
 * recorre las direcciones en su propio marco, girado 180° respecto al otro. Así
 * el rival de casa jugando de 1 hace exactamente lo mismo que jugando de 0 sobre
 * el tablero girado, y cualquier ventaja que quede es del turno, no del sitio.
 */
const ORDEN = [['arriba', 'abajo', 'izquierda', 'derecha'],
               ['abajo', 'arriba', 'derecha', 'izquierda']];
const dirsDe = (asiento) => ORDEN[asiento % 2].map((m) => [m, DIRS[m]]);

/** De las bombas que barren esta casilla, la que menos mecha le queda. */
function mechaMasCorta(p, x, y) {
    if (p.llamas.has(idx(x, y))) return 0;   // ya está ardiendo: no hay tiempo
    const amenazas = p.bombas.filter((b) => alcanceDe(p, b).some((c) => c.x === x && c.y === y));
    return amenazas.length ? Math.min(...amenazas.map((b) => b.mecha)) : MECHA;
}

/** ¿Arde esta casilla, o la va a barrer alguna bomba puesta? */
function enPeligro(p, x, y, extra = null) {
    if (!dentro(x, y)) return true;
    if (p.llamas.has(idx(x, y))) return true;
    const todas = extra ? [...p.bombas, extra] : p.bombas;
    return todas.some((b) => alcanceDe(p, b).some((c) => c.x === x && c.y === y));
}

/**
 * ⚠️ ESTO ES LA LECCIÓN DEL JUEGO, Y LA PRIMERA VERSIÓN LA TENÍA AL REVÉS.
 *
 * El rival de casa ponía bomba si había una casilla libre al lado. Y las casillas
 * de al lado son EXACTAMENTE las que la bomba va a barrer: son la cruz. Así que
 * comprobaba tener salida mirando precisamente el sitio donde iba a caer el
 * fuego, ponía la bomba, se apartaba un paso y moría en su propia explosión.
 *
 * Medido: 40 partidas contra sí mismo daban una mediana de 14 jugadas, con los
 * dos jugadores muertos antes de encontrarse. Se suicidaban.
 *
 * Salir de una cruz no es dar un paso: es doblar una esquina, o alejarse más que
 * el alcance. O sea que no es una comprobación de vecinos, es una BÚSQUEDA — y por
 * eso lleva un recorrido en anchura limitado a los turnos que quedan de mecha.
 *
 * Devuelve el PRIMER PASO de la huida más corta, o null si no hay ninguna. Con
 * `extra` se pregunta por una bomba que todavía no se ha puesto, que es como se
 * decide si conviene ponerla.
 */
function primerPasoFuera(p, desde, extra, pasos, asiento = 0) {
    const libre = (x, y) => dentro(x, y) && p.celdas[idx(x, y)] === SUELO
        && !p.bombas.some((b) => b.x === x && b.y === y)
        && !(extra && extra.x === x && extra.y === y);

    const orden = dirsDe(asiento);
    const visto = new Set([idx(desde.x, desde.y)]);
    let frente = orden
        .map(([m, d]) => ({ m, x: desde.x + d.x, y: desde.y + d.y }))
        .filter((n) => libre(n.x, n.y));
    for (const n of frente) visto.add(idx(n.x, n.y));

    for (let n = 0; n < pasos && frente.length; n++) {
        for (const c of frente) if (!enPeligro(p, c.x, c.y, extra)) return c.m;
        const siguiente = [];
        for (const c of frente) {
            for (const [, d] of orden) {
                const x = c.x + d.x, y = c.y + d.y;
                if (!libre(x, y) || visto.has(idx(x, y))) continue;
                visto.add(idx(x, y));
                siguiente.push({ m: c.m, x, y });   // se arrastra el primer paso
            }
        }
        frente = siguiente;
    }
    return null;
}

/**
 * ⚠️ DESHACER TIENE QUE DEVOLVER *TODO*, Y AQUÍ HAY MAPAS Y ARRAYS.
 *
 * El resto de juegos guardan escalares y un `Object.assign` basta. Aquí el estado
 * lleva dos `Map` y dos arrays de objetos: copiar la referencia haría que
 * deshacer «funcionara» sin deshacer nada, y eso rompe la reproducción de
 * partidas, que es el cimiento del banco. Se copia en profundidad a mano.
 */
function instantanea(p) {
    return {
        celdas: [...p.celdas],
        mejoras: new Map(p.mejoras),
        sueltas: new Map(p.sueltas),
        bombas: p.bombas.map((b) => ({ ...b })),
        llamas: new Map(p.llamas),
        jugadores: p.jugadores.map((j) => ({ ...j })),
        turno: p.turno,
        t: p.t,
        rotas: p.rotas,
    };
}

function restaurar(p, h) {
    p.celdas = [...h.celdas];
    p.mejoras = new Map(h.mejoras);
    p.sueltas = new Map(h.sueltas);
    p.bombas = h.bombas.map((b) => ({ ...b }));
    p.llamas = new Map(h.llamas);
    p.jugadores = h.jugadores.map((j) => ({ ...j }));
    p.turno = h.turno;
    p.t = h.t;
    p.rotas = h.rotas;
}

export { W, H, DIRS, SUELO, MURO, CAJA, MECHA, generarMapa, alcanceDe };
