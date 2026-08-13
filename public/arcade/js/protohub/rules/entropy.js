/**
 * entropy.js — ENTROPY, portado de `MotorEntropy` del Python
 * ═══════════════════════════════════════════════════════════════════════════
 * Gana quien MENOS desorden acumula. Cada jugador tiene una caja de 8 cartas en
 * rejilla de 2×4, casi todas boca abajo. En tu turno robas —del mazo o del
 * descarte— y decides qué hacer con esa carta. Al final se suma tu caja: **gana
 * la suma más baja**.
 *
 * LA REGLA QUE LO HACE INTERESANTE
 * Si las dos cartas de una COLUMNA coinciden en valor, **se anulan las dos** y
 * esa columna vale 0. Un rey —12 puntos, la peor carta— deja de ser un lastre si
 * consigues emparejarlo con otro rey. La carta más cara del mazo puede ser la
 * mejor jugada. Eso rompe de raíz la heurística de «quédate lo bajo».
 *
 * POR QUÉ ENTRA EN EL BANCO DE PRUEBAS
 * Es el único de la suite donde **ganar es minimizar** *y* además hay memoria:
 * ves parte de tu caja, parte de la del rival, y el descarte cuenta la historia
 * de lo que todos han rechazado. Un agente que sólo sepa maximizar aquí se
 * hunde, igual que en Hearts, pero con información oculta de por medio.
 *
 * SOBRE EL NOMBRE
 * La mecánica de rejilla-y-cambio con puntuación mínima es de la familia del
 * Golf de cartas, de dominio público desde hace décadas. Las mecánicas no se
 * registran; los nombres comerciales sí. Éste es nuestro. Mismo cuidado que en
 * [unit.js], y por la misma razón: esto se publica.
 *
 * ⚠️ LA CARTA EN LA MANO VA EN EL ESTADO — la lección más cara del original
 * La primera versión del Python la guardaba en `self._robada`, un atributo del
 * motor, y el recuento total daba **95 de 96**. No era sólo un descuadre: esa
 * carta no la veía `get_state()`, no sobrevivía a una serialización y **el
 * verificador no podía repetir la partida**. En un juego que viaja por red y
 * cuya puntuación se re-simula, todo lo que afecta al resultado tiene que estar
 * en el estado. Aquí vive en `p.robada` y se cuenta en `cartas_intactas`.
 *
 * ⚠️ Y LO QUE NO SE PORTA: el recicle del Python usa `random.shuffle` sin
 * semilla. Aquí se deriva de `(semilla, nº de recicle)`, como en [unit.js].
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { mulberry32, barajar, revuelto } from './azar.js';
import { RUTA_BIBLIOTECA, rango, cargarBaraja, cartasDe } from './baraja.js';

const COLUMNAS = 4, FILAS = 2, HUECOS = COLUMNAS * FILAS;
/** Tope de turnos: sin él, un agente que cambie siempre el mismo hueco no destapa nada y la partida no acaba jamás. */
const HORIZONTE = 120;

/**
 * ⚠️ LA CARTA ES SU NÚMERO. LA BARAJA ES NUESTRA.
 *
 * Esto repartía con la española de 48 y **no miraba el palo ni una sola vez**:
 * se suman valores y se anulan dos iguales en columna, nada más. O sea que se
 * dibujaban oros y copas para decorar, la sota valía 10 y había que traducir «R»
 * a 12 de cabeza para poder jugar.
 *
 * `alisa_48` son cuatro colores por doce números, que es exactamente lo que el
 * juego necesita y ni una carta más. El palo sigue sin pintar nada en las reglas
 * —está para que la mesa no sea un muro de números idénticos— y por eso cada uno
 * lleva además su SÍMBOLO: dos palos que sólo se distinguieran por el color
 * serían el mismo palo para quien no distinga esos dos colores, y esto se
 * publica.
 *
 * Y la baraja es de la casa, sin nombre comercial de nadie. Mismo cuidado que en
 * [unit.js] y por la misma razón.
 */
const VALORES_RESPALDO = Object.fromEntries(
    [...Array(12)].map((_, i) => [String(i + 1), i + 1]).concat([['JK', 0]]));

/** Respaldo de los palos, por si la biblioteca no carga. Debe coincidir con ella. */
const PALOS_RESPALDO = [
    { id: 'A', color: '#E6A817', symbol: '◆' }, { id: 'V', color: '#1B7F3B', symbol: '●' },
    { id: 'C', color: '#2E6DA4', symbol: '▲' }, { id: 'M', color: '#B0308A', symbol: '■' },
];

/**
 * ⚠️ LOS COMODINES SON DEL JUEGO, NO DE LA BARAJA ESPAÑOLA.
 *
 * Se declaran en `games.entropy.specials` y no en `decks.spanish_48`, que es lo
 * que parecía más ordenado y habría sido un desastre: esa baraja la reparten
 * también la brisca y el tute, y se habrían encontrado dos comodines en la mesa
 * sin que nadie tocara sus reglas.
 *
 * Van sin palo, con el prefijo `W_` que ya usa [unit.js] para lo mismo. Valen 0
 * y no emparejan con nada: no anulan columnas por sí solos.
 *
 * Lo suyo es que SE MUEVEN, y son las únicas cartas que lo hacen. Dos ocasiones:
 *
 *   · llega una carta que empareja con la otra de su columna → el comodín se
 *     aparta a un hueco tapado que tú eliges (`cambiar:N:mueve:M`), y la que
 *     estaba allí se descarta. Formas la pareja SIN perder el comodín;
 *   · lo destapas de tu propia caja → te lo llevas a la columna que quieras
 *     (`mover_comodin:M`), intercambiándolo. Ahí no sale ninguna carta: sólo
 *     cambian de sitio, y la que venía tapada sigue tapada.
 *
 * Por eso un comodín no se desperdicia nunca. Y por eso las dos jugadas se
 * ofrecen con cuidado de no delatar lo que hay debajo — ver las notas en
 * `parejaALaVista` y en la lista de legales.
 */
const ESPECIALES_RESPALDO = [{ id: 'JK', count: 2, suitless: true, symbol: '🃏' }];

export async function crearEntropy({ url = RUTA_BIBLIOTECA, jugadores = 2, barajas = 2 } = {}) {
    const baraja = await cargarBaraja('alisa_48', url);
    let VALORES = VALORES_RESPALDO, ESPECIALES = ESPECIALES_RESPALDO;
    let PALOS = PALOS_RESPALDO, TOTAL_LIB = null;
    try {
        const lib = await fetch(new URL(url, import.meta.url)).then(r => r.json());
        VALORES = lib?.games?.entropy?.card_values ?? VALORES_RESPALDO;
        ESPECIALES = lib?.games?.entropy?.specials ?? ESPECIALES_RESPALDO;
        PALOS = lib?.decks?.alisa_48?.suits ?? PALOS_RESPALDO;
        TOTAL_LIB = lib?.games?.entropy?.total ?? null;
    } catch { /* respaldo; `baraja.biblioteca` ya lo dice */ }

    const valorDe = (c) => VALORES[rango(c)] ?? 0;
    const SIMBOLOS = Object.fromEntries(
        ESPECIALES.filter(e => e.symbol).map(e => [e.id, e.symbol]));
    const PALOS_MAPA = Object.fromEntries(
        PALOS.map(s => [s.id, { color: s.color, simbolo: s.symbol }]));

    /** La baraja de esta mesa: los mazos completos más los comodines. */
    const montar = () => {
        const cartas = [];
        for (let k = 0; k < barajas; k++) cartas.push(...cartasDe(baraja));
        for (const e of ESPECIALES) {
            for (let i = 0; i < (e.count ?? 0); i++) cartas.push(`W_${e.id}`);
        }
        // Se comprueba contra lo que dice el catálogo, igual que en unit: si algún
        // día cambia la biblioteca y esto no, salta al montar la baraja y no en
        // mitad de una partida con un descuadre de una carta —que es exactamente
        // el fallo más caro que tuvo el original.
        if (TOTAL_LIB && cartas.length !== TOTAL_LIB) {
            throw new Error(`baraja de entropy mal montada: ${cartas.length} cartas, `
                          + `la biblioteca dice ${TOTAL_LIB}`);
        }
        return cartas;
    };
    const TOTAL = montar().length;

    const huecoValido = (i) => Number.isInteger(i) && i >= 0 && i < HUECOS;
    const esComodin = (c) => ESPECIALES.some(e => rango(c) === e.id);

    /**
     * ¿Poner `carta` en el hueco `i` formaría pareja con la otra de su columna,
     * y esa otra está A LA VISTA?
     *
     * Lo de «a la vista» no es un detalle de comodidad: si valiera con una carta
     * tapada, la jugada aparecería en la lista de legales exactamente cuando
     * coincide, y de ahí se deduce el valor de una carta que no has mirado.
     */
    function parejaALaVista(caja, i, carta) {
        const otro = i < COLUMNAS ? i + COLUMNAS : i - COLUMNAS;
        const h = caja[otro];
        return !!h?.visible && rango(h.carta) === rango(carta);
    }

    /**
     * Suma la caja anulando las columnas emparejadas. El corazón del juego.
     * Cuenta TODAS las cartas, tapadas incluidas — es la puntuación real, no la
     * que ve el jugador.
     */
    function puntosDe(p, pid) {
        const caja = p.cajas[pid];
        let total = 0;
        for (let col = 0; col < COLUMNAS; col++) {
            const enColumna = caja.filter((_, i) => i % COLUMNAS === col);
            const rangos = new Set(enColumna.map(h => rango(h.carta)));
            if (enColumna.length === FILAS && rangos.size === 1) continue;   // anulada
            for (const h of enColumna) total += valorDe(h.carta);
        }
        return total;
    }

    /** Se acaba el mazo: vuelve el descarte boca abajo, menos la carta de arriba. */
    function reciclar(p) {
        if (p.descarte.length < 2) return false;
        const arriba = p.descarte.pop();
        const resto = p.descarte;
        p.descarte = [arriba];
        p.mazo = barajar(resto, mulberry32((p.semilla ^ revuelto(p.recicles)) >>> 0));
        p.recicles += 1;
        return true;
    }

    /** Se destapa todo y se cuenta. */
    function resolver(p) {
        for (const caja of p.cajas) for (const h of caja) h.visible = true;
        p.puntosFinales = p.cajas.map((_, i) => puntosDe(p, i));
        p.fin = true;
    }

    /** La ronda acaba cuando alguien deja toda su caja boca arriba. */
    function cerrarTurno(p, pid) {
        if (p.cajas[pid].every(h => h.visible)) { resolver(p); return; }
        p.turno = (p.turno + 1) % p.jugadores;
    }

    return {
        nombre: 'entropy',

        nuevaPartida(opts = {}) {
            const semilla = (opts.semilla ?? opts.seed ?? Date.now()) >>> 0;
            const cartas = barajar(montar(), mulberry32(semilla));

            const p = {
                semilla, jugadores, cajas: [], mazo: [], descarte: [],
                robada: null, robadaDe: null, turno: 0, turnos: 0, recicles: 0,
                // Hueco de un comodín recién destapado, a la espera de que su
                // dueño decida adónde se lo lleva. `null` el resto del tiempo.
                comodinDestapado: null,
                historial: [], fin: false, puntosFinales: null,
                biblioteca: baraja.biblioteca,
            };
            for (let i = 0; i < jugadores; i++) {
                const caja = cartas.splice(0, HUECOS).map(c => ({ carta: c, visible: false }));
                // Al repartir se destapan dos de cada caja, una por fila: sin eso
                // se juega completamente a ciegas y no hay decisión que tomar.
                caja[0].visible = true;
                caja[COLUMNAS].visible = true;
                p.cajas.push(caja);
            }
            p.mazo = cartas;
            p.descarte.push(p.mazo.pop());
            return p;
        },

        // `asiento` = desde qué silla se mira. Aquí la fuga era más leve que en
        // los demás —las cartas tapadas ya salen como `null` incluso las propias—
        // pero igual de rota: el segundo jugador veía la caja del primero como si
        // fuera la suya. Ver la nota larga en `bazas.js`.
        estado(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && p.cajas[asiento] ? asiento : 0;
            if (!p.fin && p.turnos >= HORIZONTE) resolver(p);

            const pid = p.turno;
            let legales = [];
            if (!p.fin) {
                /**
                 * ⚠️ DESTAPAR UN COMODÍN ABRE UNA DECISIÓN, Y VA EN DOS TIEMPOS.
                 *
                 * El tuki también se mueve cuando lo DESTAPAS: acabas de
                 * descubrirlo en tu caja y puedes llevártelo a la columna que
                 * quieras. Pero eso no se puede ofrecer de una sola vez.
                 *
                 * Si en la lista de legales apareciera `descartar_y_voltear:3:mueve:5`,
                 * esa jugada estaría ANUNCIANDO que en el hueco 3 hay un comodín —
                 * y entonces nadie destaparía a ciegas: se leería la lista y ya.
                 * El juego dejaría de medir memoria en el mismo momento.
                 *
                 * Así que se destapa primero y se decide después, que es lo que
                 * pasa en una mesa: le das la vuelta, lo ves, y entonces eliges.
                 */
                if (p.comodinDestapado !== null && p.comodinDestapado !== undefined) {
                    legales = p.cajas[pid]
                        .map((_, i) => i)
                        .filter(i => i !== p.comodinDestapado)
                        .map(i => `mover_comodin:${i}`);
                    // Moverlo es opcional: a veces está mejor donde estaba.
                    legales.push('dejar_comodin');
                } else if (p.robada) {
                    legales = p.cajas[pid].map((_, i) => `cambiar:${i}`);
                    const tapadas = p.cajas[pid]
                        .map((h, i) => (h.visible ? -1 : i)).filter(i => i >= 0);

                    // Apartar el comodín: sólo donde HAY comodín, la pareja se ve
                    // y queda algún hueco tapado adonde correrlo.
                    for (let i = 0; i < HUECOS; i++) {
                        if (!esComodin(p.cajas[pid][i].carta)) continue;
                        if (!parejaALaVista(p.cajas[pid], i, p.robada)) continue;
                        for (const m of tapadas) {
                            if (m !== i) legales.push(`cambiar:${i}:mueve:${m}`);
                        }
                    }

                    legales = legales.concat(tapadas.map(i => `descartar_y_voltear:${i}`));

                    /**
                     * ⚠️ DESCARTAR SIN DESTAPAR: SÓLO DEL MAZO Y CON UNA TAPADA.
                     *
                     * Antes esto era `: ['descartar']` cuando NO quedaban tapadas
                     * — y eso no pasa nunca, porque destapar la última cierra la
                     * ronda. Medido: se ofreció 0 veces en 744 turnos. Código
                     * muerto que además tapaba una regla de verdad.
                     *
                     * Con una sola tapada, destaparla CIERRA la ronda. Así que
                     * poder descartar sin destapar no es comodidad: es elegir si
                     * cierras ahora o sigues intentando mejorar. Es la decisión
                     * más cara del final de partida.
                     *
                     * ⚠️ Y SÓLO SI LA ROBASTE DEL MAZO. Devolver al descarte lo
                     * que acabas de coger del descarte deja la mesa exactamente
                     * como estaba: sería pasar turno gratis, y un juego donde se
                     * puede pasar gratis no se acaba nunca.
                     */
                    if (p.robadaDe === 'mazo' && tapadas.length <= 1) legales.push('descartar');
                } else {
                    if (!p.mazo.length) reciclar(p);
                    if (p.mazo.length) legales.push('robar_mazo');
                    if (p.descarte.length) legales.push('robar_descarte');
                }
            }

            // ⚠️ LO QUE SE VE ES LO QUE SE VE.
            // Las cartas tapadas salen como `null`, también las PROPIAS. Es todo
            // el juego: si el estado las revelara, un agente de lenguaje leería
            // su caja entera y el entorno dejaría de medir memoria para medir
            // lectura. El verificador sí lo sabe todo —re-simula desde la
            // semilla—, pero el observador no.
            const verCaja = (caja) => caja.map(h => (h.visible ? h.carta : null));
            // Estimación con lo visible, que no filtra nada. La puntuación de
            // verdad sólo aparece al terminar.
            const visiblesDe = (i) => p.cajas[i].reduce(
                (s, h) => s + (h.visible ? valorDe(h.carta) : 0), 0);

            const míos = p.fin ? p.puntosFinales[yo] : visiblesDe(yo);
            // Menos es mejor y la métrica del banco es «más es mejor»: se niega
            // aquí, igual que en hearts, para que el número que se verifica y el
            // que se compara sean el mismo.
            const puntos = -míos;

            return {
                juego: 'entropy',
                asiento: yo,
                caja: verCaja(p.cajas[yo]),
                cajas_rivales: p.cajas.filter((_, i) => i !== yo).map(verCaja),
                columnas: COLUMNAS,
                /**
                 * ⚠️ AQUÍ EL PALO NO PINTA NADA, Y CONVIENE DECIRLO.
                 *
                 * Se reparte con la española de 48 porque da 12 valores limpios,
                 * pero ninguna regla mira el palo: se suma el valor y se anulan
                 * dos iguales en la misma columna. El oro y la copa son
                 * decoración — y decoración cara, porque la sota, el caballo y el
                 * rey se dibujaban ilegibles y hay que traducir «R» a 12 de
                 * cabeza para jugar.
                 *
                 * Con esto la mesa puede enseñar el NÚMERO, que es lo único que
                 * el jugador necesita. Es una proyección, no un cambio de reglas:
                 * la carta sigue siendo `R_4`, el recibo no cambia y la partida
                 * se re-simula igual. El render es un espectador.
                 *
                 * Se declara aquí y no se deduce: la brisca y el tute también
                 * tienen valores por carta y ahí el palo ES el juego. Mirar si
                 * hay `valores` y decidir por eso les borraría los palos.
                 */
                cara: 'valor',
                valores: VALORES,
                // Un comodín vale 0, pero enseñar un «0» lo confundiría con nada:
                // se dibuja con su símbolo. Lo declara el catálogo, no la mesa.
                simbolos: SIMBOLOS,
                // Los cuatro palos, para que la mesa pueda pintarlos. No deciden
                // nada: están para que ocho cartas iguales no sean un muro de
                // números idénticos.
                palos: PALOS_MAPA,
                /**
                 * ⚠️ LO QUE ROBAS DEL MAZO ES TUYO Y DE NADIE MÁS.
                 *
                 * Esto era `robada: p.robada` a secas, sin mirar quién pregunta:
                 * el rival veía la carta que acababas de robar del mazo antes de
                 * que decidieras qué hacer con ella. Del descarte da igual —esa la
                 * ha visto todo el mundo— pero del mazo es información privada, y
                 * es justo la que decide la jugada.
                 *
                 * En un juego cuya gracia es la memoria, eso no es una fuga
                 * pequeña: un agente que lea el estado del rival deja de tener que
                 * recordar nada. El entorno mediría lectura, no memoria.
                 *
                 * `robada_de` SÍ sigue saliendo para todos: que alguien ha robado,
                 * y de dónde, se ve desde la silla de enfrente. Lo que no se ve es
                 * QUÉ. Ocultar la carta y anunciar el gesto es exactamente lo que
                 * pasa en una mesa de verdad.
                 */
                robada: (yo === pid || p.robadaDe === 'descarte') ? p.robada : null,
                robada_de: p.robadaDe,
                // Qué hueco tiene un comodín recién destapado esperando destino.
                // Es público: el comodín ya está boca arriba, lo ha visto la mesa.
                comodin_destapado: p.comodinDestapado ?? null,
                /**
                 * ⚠️ UNA LÍNEA QUE DIGA QUÉ TOCA. LA PIDIÓ UN BETATESTER SIN SABERLO.
                 *
                 * Escribió: «La carta que robó si no la quiero no me deja
                 * descartarla». Y tenía razón a medias — sí se puede tirar, pero
                 * DESTAPANDO una de las tuyas, que es el precio y es lo que hace
                 * interesante la jugada. Lo que pasa es que el botón se llama
                 * `descartar_y_voltear:1` y eso no lo entiende nadie.
                 *
                 * No se arregla rotulando los botones con otro texto: el botón dice
                 * la jugada EXACTA que manda un agente por la puerta de texto, y esa
                 * igualdad es la que hace comparables las dos filas de la tabla del
                 * banco. Si la persona ve «tirar» y el agente manda
                 * `descartar_y_voltear:1`, dejan de estar jugando a lo mismo.
                 *
                 * Se arregla EXPLICANDO la fase, y aquí, que es donde se conocen las
                 * reglas: una mesa genérica que sirve a treinta y cinco juegos no
                 * puede saber qué significa destapar.
                 *
                 * ⚠️ Y SE DERIVA DE `legales`, NO SE ESCRIBE APARTE. Un texto de
                 * ayuda que se redacta a mano es otra lista que se separa de la
                 * realidad en silencio — el día que cambie una regla, la pista
                 * seguiría contando la de antes. Así no puede: si la jugada no está
                 * ofrecida, la pista no la menciona.
                 */
                pista: (() => {
                    if (p.comodinDestapado !== null && p.comodinDestapado !== undefined) {
                        return 'Has destapado un comodín: elige a qué hueco se lo llevas.';
                    }
                    if (yo !== pid) return null;      // no es tu turno: nada que explicar
                    const hay = (v) => legales.some(m => String(m).split(':')[0] === v);
                    if (p.robada === null || p.robada === undefined) {
                        return 'Roba: del mazo a ciegas, o la de encima del descarte, '
                             + 'que el rival también ha visto.';
                    }
                    const opciones = [];
                    if (hay('cambiar')) opciones.push('cámbiala por una de tu caja');
                    if (hay('descartar_y_voltear')) {
                        opciones.push('o tírala, pero destapando una de las tuyas');
                    }
                    if (hay('descartar')) opciones.push('o tírala sin más');
                    /**
                     * Se nombra como se VE, no como se llama por dentro. Esta mesa
                     * dibuja `cara: 'valor'`, así que `V_4` está en la pantalla como
                     * un 4: decirle «el V_4» a quien mira un 4 es pedirle que
                     * traduzca. Sale de `VALORES`/`SIMBOLOS`, las mismas tablas que
                     * usa el dibujo, para que no puedan discrepar.
                     */
                    const r = String(p.robada).split('_').slice(1).join('_');
                    const nombre = SIMBOLOS[r] ?? VALORES[r] ?? r;
                    return `Has robado el ${nombre}: ${opciones.join(', ')}.`;
                })(),
                descarte: p.descarte[p.descarte.length - 1] ?? null,
                descarte_restante: p.descarte.length,
                mazo_restante: p.mazo.length,
                turnos: p.turnos,
                marcador: p.fin ? p.puntosFinales.map(v => -v) : null,
                puntos,
                score: puntos,
                turn: pid === 0 ? 'player' : `cpu${pid}`,
                semilla: p.semilla,
                biblioteca: p.biblioteca,
                // Las 96 cartas siguen ahí — la de la mano incluida, que es
                // justo la que se perdía en el original.
                cartas_intactas:
                    p.cajas.reduce((s, c) => s + c.length, 0)
                    + p.mazo.length + p.descarte.length + (p.robada ? 1 : 0) === TOTAL,
                legal_moves: legales,
                is_game_over: p.fin,
            };
        },

        mover(p, jugada) {
            const j = String(jugada ?? '');
            if (j === 'nueva' || j === 'reset' || p.fin) return false;
            const pid = p.turno;

            if (j === 'robar_mazo') {
                if (p.robada) return false;
                if (!p.mazo.length && !reciclar(p)) return false;
                p.robada = p.mazo.pop(); p.robadaDe = 'mazo';
                p.turnos += 1; p.historial.push(j);
                return true;
            }
            if (j === 'robar_descarte') {
                if (p.robada || !p.descarte.length) return false;
                p.robada = p.descarte.pop(); p.robadaDe = 'descarte';
                p.turnos += 1; p.historial.push(j);
                return true;
            }
            /**
             * ⚠️ EL COMODÍN SE APARTA EN VEZ DE TIRARSE — Y TÚ ELIGES ADÓNDE.
             *
             * `cambiar:N:mueve:M`. En el juego del que viene esto, el tuki es la
             * ÚNICA carta que se mueve: cuando entra una del mismo valor que la
             * otra de su columna, el comodín no se descarta, se corre a otro hueco
             * boca abajo y la que estaba allí se va al descarte.
             *
             * Es lo que hace que un comodín no se desperdicie nunca: en vez de
             * elegir entre «formo la pareja» y «conservo el 0», te llevas las dos
             * cosas — y encima decides dónde plantarlo, que es donde está la
             * jugada de verdad (sobre el hueco que ya sospechas malo).
             *
             * ⚠️ SÓLO SE OFRECE SI LA PAREJA SE VE.
             * Si la otra carta de la columna estuviera boca abajo, ofrecer esta
             * jugada sería CONTAR SU VALOR: aparecería en la lista de legales
             * justo cuando coincide, y con eso se deduce la carta tapada sin
             * haberla mirado. En un juego cuya gracia es la memoria, la lista de
             * jugadas legales es una puerta por la que también se filtra.
             */
            if (/^cambiar:\d+:mueve:\d+$/.test(j)) {
                if (!p.robada) return false;
                const [, sN, sM] = j.match(/^cambiar:(\d+):mueve:(\d+)$/);
                const i = Number(sN), m = Number(sM);
                if (!huecoValido(i) || !huecoValido(m) || i === m) return false;
                if (!esComodin(p.cajas[pid][i].carta)) return false;
                if (!parejaALaVista(p.cajas[pid], i, p.robada)) return false;
                if (p.cajas[pid][m].visible) return false;   // se corre a una tapada

                const comodin = p.cajas[pid][i].carta;
                p.descarte.push(p.cajas[pid][m].carta);      // la desplazada sí se va
                p.cajas[pid][m] = { carta: comodin, visible: true };
                p.cajas[pid][i] = { carta: p.robada, visible: true };
                p.robada = null; p.robadaDe = null;
                p.turnos += 1; p.historial.push(j);
                cerrarTurno(p, pid);
                return true;
            }
            if (j.startsWith('cambiar:')) {
                if (!p.robada) return false;
                const i = Number(j.slice(8));
                if (!huecoValido(i)) return false;
                const fuera = p.cajas[pid][i].carta;
                p.cajas[pid][i] = { carta: p.robada, visible: true };
                p.descarte.push(fuera);
                p.robada = null; p.robadaDe = null;
                p.turnos += 1; p.historial.push(j);
                cerrarTurno(p, pid);
                return true;
            }
            /**
             * ⚠️ EL SEGUNDO TIEMPO: adónde llevas el comodín que acabas de
             * destapar. Es un INTERCAMBIO, no un descarte — aquí no sale ninguna
             * carta de la caja, sólo cambian de sitio. Y la que venía tapada
             * sigue tapada: la has movido, no la has mirado.
             */
            if (j.startsWith('mover_comodin:')) {
                const n = p.comodinDestapado;
                if (n === null || n === undefined) return false;
                const m = Number(j.slice(14));
                if (!huecoValido(m) || m === n) return false;
                const caja = p.cajas[pid];
                [caja[n], caja[m]] = [caja[m], caja[n]];
                p.comodinDestapado = null;
                p.turnos += 1; p.historial.push(j);
                cerrarTurno(p, pid);
                return true;
            }
            if (j === 'dejar_comodin') {
                if (p.comodinDestapado === null || p.comodinDestapado === undefined) return false;
                p.comodinDestapado = null;
                p.turnos += 1; p.historial.push(j);
                cerrarTurno(p, pid);
                return true;
            }
            if (j.startsWith('descartar_y_voltear:')) {
                if (!p.robada) return false;
                const i = Number(j.slice(20));
                if (!huecoValido(i)) return false;
                if (p.cajas[pid][i].visible) return false;
                p.descarte.push(p.robada);
                p.robada = null; p.robadaDe = null;
                p.cajas[pid][i].visible = true;
                p.turnos += 1; p.historial.push(j);

                // Si lo que había debajo era un comodín, el turno NO se cierra:
                // queda la decisión de adónde llevarlo.
                if (esComodin(p.cajas[pid][i].carta)) { p.comodinDestapado = i; return true; }

                cerrarTurno(p, pid);
                return true;
            }
            if (j === 'descartar') {
                if (!p.robada) return false;
                // Del descarte no: volvería al mismo sitio y sería pasar gratis.
                if (p.robadaDe !== 'mazo') return false;
                // Con dos o más tapadas hay que pagar destapando una.
                if (p.cajas[pid].filter(h => !h.visible).length > 1) return false;
                p.descarte.push(p.robada);
                p.robada = null; p.robadaDe = null;
                p.turnos += 1; p.historial.push(j);
                cerrarTurno(p, pid);
                return true;
            }
            return false;
        },

        /**
         * Rival de casa: **codicioso a un paso**. Si la carta en mano mejora
         * algún hueco visible, la coloca; si no, descarta y destapa. Coge del
         * descarte sólo si es una carta baja de verdad.
         *
         * Deja techo a propósito y se dice en el original: **no busca emparejar
         * columnas**, que es exactamente donde está la profundidad del juego. Un
         * agente que sí lo busque —y que se acuerde de lo que ha pasado por el
         * descarte— tiene sitio de sobra por encima.
         */
        sugerencia(p) {
            const pid = p.turno;
            const caja = p.cajas[pid];

            /**
             * ⚠️ EL RIVAL DE LA CASA TIENE QUE CONOCER LAS REGLAS NUEVAS.
             *
             * Por dos motivos, y el segundo es el que importa. El primero: si
             * devolviera una jugada que ya no es legal, `mover` diría que no, el
             * arnés se quedaría sin jugada y la partida terminaría a medias — con
             * una puntuación que parece buena porque no ha llegado al final.
             *
             * El segundo: esto ES el techo contra el que se mide a todo el mundo.
             * Una casa que ignora una mecánica no es un techo, es un suelo con
             * pretensiones: cualquiera que lea las reglas le gana sin jugar mejor,
             * sólo por usar algo que ella no usa. El hueco mediría lectura del
             * reglamento, no habilidad.
             *
             * ⚠️ Y MOVER EL COMODÍN NO CAMBIA LA SUMA POR SÍ SOLO.
             * Vale 0 esté donde esté: lo único que puede mejorar es que la carta
             * que ocupa su sitio ANULE esa columna. Por eso sólo se mueve cuando
             * hay una coincidencia de rango a la vista, y si no, se queda — que es
             * exactamente igual de bueno y no rompe lo que ya estaba emparejado.
             */
            if (p.comodinDestapado !== null && p.comodinDestapado !== undefined) {
                const n = p.comodinDestapado;
                const pareja = n < COLUMNAS ? n + COLUMNAS : n - COLUMNAS;
                const a = caja[pareja];
                if (a?.visible) {
                    for (let m = 0; m < HUECOS; m++) {
                        if (m === n || !caja[m].visible) continue;
                        if (rango(caja[m].carta) !== rango(a.carta)) continue;
                        // No romper una columna que YA estaba anulada.
                        const suPareja = m < COLUMNAS ? m + COLUMNAS : m - COLUMNAS;
                        const b = caja[suPareja];
                        if (b?.visible && rango(b.carta) === rango(caja[m].carta)) continue;
                        return `mover_comodin:${m}`;
                    }
                }
                return 'dejar_comodin';
            }

            if (!p.robada) {
                const cima = p.descarte[p.descarte.length - 1];
                if (cima && valorDe(cima) <= 4 && p.descarte.length) return 'robar_descarte';
                if (p.mazo.length) return 'robar_mazo';
                return p.descarte.length ? 'robar_descarte' : null;
            }

            /**
             * ⚠️ APARTAR EL COMODÍN ES ESTRICTAMENTE MEJOR QUE TIRARLO.
             *
             * Cuando cabe `cambiar:N:mueve:M`, la alternativa `cambiar:N` forma la
             * misma pareja pero manda el comodín al descarte. Aquí se conserva y
             * lo que se pierde es una carta TAPADA, que de media vale seis y pico.
             * Cambiar un 0 seguro por un 6,5 esperado no lo haría nadie.
             */
            for (let i = 0; i < HUECOS; i++) {
                if (!esComodin(caja[i].carta)) continue;
                if (!parejaALaVista(caja, i, p.robada)) continue;
                const m = caja.findIndex((h, k) => !h.visible && k !== i);
                if (m >= 0) return `cambiar:${i}:mueve:${m}`;
            }

            // ¿Mejora algún hueco que YA veo? El peor visible, si es peor que ésta.
            const v = valorDe(p.robada);
            let peor = -1, peorV = v;
            for (let i = 0; i < caja.length; i++) {
                if (!caja[i].visible) continue;
                const vi = valorDe(caja[i].carta);
                if (vi > peorV) { peorV = vi; peor = i; }
            }
            if (peor >= 0) return `cambiar:${peor}`;

            const tapadas = caja.map((h, i) => (h.visible ? -1 : i)).filter(i => i >= 0);

            /**
             * ⚠️ CON UNA SOLA TAPADA, DESTAPARLA CIERRA LA RONDA. Y eso se decide,
             * no se hace por inercia.
             *
             * Cerrar congela el marcador de TODOS, así que interesa cuando vas
             * por delante y perjudica cuando vas por detrás. La casa compara lo
             * que ve de su caja con lo que ve de las demás: si va ganando cierra,
             * y si va perdiendo descarta sin destapar para seguir intentándolo.
             *
             * Sin esto la casa cerraría siempre, y bastaría con ir ganando por lo
             * visible para que la mesa te regalara la ronda — el hueco mediría
             * quién conoce esta regla, no quién juega mejor.
             */
            if (tapadas.length === 1 && p.robadaDe === 'mazo') {
                const suma = (c) => c.reduce((s, h) => s + (h.visible ? valorDe(h.carta) : 0), 0);
                const mio = suma(caja);
                const mejorRival = Math.min(...p.cajas.map((c, i) => (i === pid ? Infinity : suma(c))));
                if (mio > mejorRival) return 'descartar';        // voy perdiendo: no cierro
            }

            if (tapadas.length) return `descartar_y_voltear:${tapadas[0]}`;
            return 'descartar';
        },

        deshacer() { return false; },
    };
}
