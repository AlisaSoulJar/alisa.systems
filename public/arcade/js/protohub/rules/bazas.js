/**
 * bazas.js — la familia de los juegos de BAZA, portada del Python
 * ═══════════════════════════════════════════════════════════════════════════
 * Cuatro juegos de una sola base: **brisca, tute, hearts y spades**.
 *
 * No se ha inventado nada. `arcade/engines/sovereign_card_rules.py` ya tenía
 * `MotorBazas` con sus cuatro hijos, documentado y con las simplificaciones
 * dichas en voz alta. Aquí se porta ese motor tal cual, y su propio comentario
 * explica por qué sale tan barato:
 *
 *     «Todos comparten el mismo esqueleto —cada jugador pone una carta, alguien
 *      se lleva la baza, se repite— y se diferencian en cuatro perillas.»
 *
 *     FUERZA           orden de fuerza de los rangos (quién gana la baza)
 *     PUNTOS           qué vale cada carta al contar
 *     SEGUIR_PALO      ¿obliga a servir del palo de salida?
 *     ROBAR_TRAS_BAZA  ¿se roba del mazo después de cada baza?
 *
 * Cuatro juegos jugables por el precio de uno. Era esto o escribir backgammon
 * desde cero: seis juegos con reglas que ya son la autoridad, contra tres
 * inventados sin nadie que los avale.
 *
 * ⚠️ HEARTS ES EL BUENO PARA EL BANCO DE PRUEBAS
 * Se juega a NO ganar: cada corazón penaliza 1 y la dama de picas 13. Un agente
 * que sólo sepa maximizar se hunde. Como nuestra métrica es «más es mejor», su
 * puntuación se devuelve **negada** — se dice aquí para que nadie piense que
 * hay un error de signo.
 *
 * DETERMINISMO: mulberry32 con semilla, sólo enteros de 32 bits. La semilla
 * viaja en el estado, así que cualquier partida se puede re-simular.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { mulberry32, barajar } from './azar.js';
import { RUTA_BIBLIOTECA, palo, rango, cargarBaraja, cartasDe } from './baraja.js';

/**
 * Fabrica un módulo de reglas del ProtoHub para un juego de bazas.
 *
 * @param {Object} cfg  FUERZA, PUNTOS, SEGUIR_PALO, ROBAR_TRAS_BAZA,
 *                      PUNTOS_POR_BAZA, MENOR_GANA, baraja, jugadores, mano,
 *                      triunfoFijo
 */
export function crearBazas(cfg) {
    const {
        nombre, baraja: nombreBaraja, jugadores = 4, mano = 3,
        FUERZA = [], PUNTOS = {}, SEGUIR_PALO = false, ROBAR_TRAS_BAZA = false,
        PUNTOS_POR_BAZA = null, MENOR_GANA = false, triunfoFijo = null,
        puntosCarta = null,
    } = cfg;

    let baraja = null;

    const fuerza = (id) => {
        const i = FUERZA.indexOf(rango(id));
        return i < 0 ? -1 : i;      // rango desconocido = el más débil
    };
    const valor = (id) => (puntosCarta ? puntosCarta(id) : (PUNTOS[rango(id)] ?? 0));

    /** Cartas que ese jugador puede poner ahora: servir al palo si hay que. */
    function jugables(p, pid) {
        const m = p.manos[pid];
        if (!SEGUIR_PALO || p.baza.length === 0) return m;
        const salida = palo(p.baza[0].carta);
        const delPalo = m.filter(c => palo(c) === salida);
        return delPalo.length ? delPalo : m;
    }

    /** Quién se lleva la baza: el triunfo más alto, si no el palo de salida. */
    function ganadorDeBaza(p) {
        const salida = palo(p.baza[0].carta);
        let mejor = p.baza[0];
        for (const j of p.baza) {
            const esTriunfo = palo(j.carta) === p.triunfo;
            const mejorEsTriunfo = palo(mejor.carta) === p.triunfo;
            if (esTriunfo && !mejorEsTriunfo) { mejor = j; continue; }
            if (esTriunfo === mejorEsTriunfo
                && palo(j.carta) === palo(mejor.carta)
                && fuerza(j.carta) > fuerza(mejor.carta)) mejor = j;
            else if (!esTriunfo && !mejorEsTriunfo
                     && palo(mejor.carta) !== salida && palo(j.carta) === salida) mejor = j;
        }
        return mejor.pid;
    }

    return {
        nombre,

        nuevaPartida(opts = {}) {
            const semilla = (opts.semilla ?? opts.seed ?? Date.now()) >>> 0;
            const rnd = mulberry32(semilla);
            const cartas = barajar(cartasDe(baraja), rnd);

            const p = {
                semilla, jugadores, manos: [], mazo: [], baza: [],
                puntos: Array(jugadores).fill(0), bazas: Array(jugadores).fill(0),
                turno: 0, salida: 0, triunfo: triunfoFijo, historial: [],
                biblioteca: baraja.biblioteca,
            };
            for (let i = 0; i < jugadores; i++) p.manos.push(cartas.splice(0, mano));
            p.mazo = cartas;

            // El triunfo se destapa del mazo, salvo en spades (siempre picas)
            // y en hearts (no hay triunfo, y eso es la regla, no un olvido).
            //
            // ⚠️ Y hay un caso que se me escapó en la primera versión: cuando el
            // reparto agota la baraja —el tute son 4×10 de una española de 40—
            // no queda ninguna carta que destapar y salía `triunfo: null`,
            // dejando el juego sin palo de mando. Se toma entonces la ÚLTIMA
            // carta repartida, que es la del que da: así lo marca la mesa.
            if (!cfg.sinTriunfo && !p.triunfo) {
                if (p.mazo.length) {
                    p.triunfo = palo(p.mazo[p.mazo.length - 1]);
                } else {
                    const ultimaMano = p.manos[p.manos.length - 1];
                    p.triunfo = palo(ultimaMano[ultimaMano.length - 1]);
                }
            }
            return p;
        },

        /**
         * @param {number} asiento  DESDE QUÉ SILLA SE MIRA. Por defecto, la 0.
         *
         * ⚠️ ESTO NACIÓ DE UNA FUGA, Y DE LAS FEAS.
         * Antes sólo existía la vista del asiento 0: `mano` eran siempre las
         * cartas del primero. En una partida contra la casa daba igual, porque
         * sólo había un humano mirando. En una MESA COMPARTIDA, el segundo
         * jugador abría su pestaña y veía la mano del primero, carta por carta.
         *
         * No lo detectó ninguna prueba: la partida avanzaba, los turnos se
         * repartían bien y el recibo verificaba. Se vio abriendo dos pestañas y
         * comparando lo que enseñaba cada una — B_6, E_S, O_S en las dos.
         *
         * El parámetro es opcional a propósito: el verificador, el gym y el
         * calibrador siguen llamando `estado(p)` y siguen midiendo el asiento
         * que abre, que es lo que siempre midieron. Lo que cambia es que ahora
         * se PUEDE preguntar por otra silla, y la mesa lo hace por cada quien.
         *
         * `legal_moves` no depende del asiento sino del TURNO, y eso ya estaba
         * bien: son las jugadas de quien mueve, mire quien mire.
         */
        estado(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && p.manos[asiento] ? asiento : 0;
            const terminada = p.manos.every(m => m.length === 0);
            const legales = terminada ? ['nueva']
                          : jugables(p, p.turno).map(c => `jugar:${c}`);
            // ⚠️ En hearts menos es mejor, y la métrica del banco es «más es
            // mejor». Se niega aquí, no en el entorno, para que el número que
            // se verifica y el que se compara sean el mismo.
            const míos = p.puntos[yo];
            return {
                juego: nombre,
                asiento: yo,
                mano: p.manos[yo],
                // Los DEMÁS, no «los que no son el primero»: quien mira desde la
                // silla 2 cuenta las cartas de la 0, la 1 y la 3.
                manos_rivales: p.manos.filter((_, i) => i !== yo).map(m => m.length),
                baza: p.baza.map(j => ({ jugador: j.pid, carta: j.carta })),
                triunfo: p.triunfo,
                turn: p.turno === 0 ? 'player' : `cpu${p.turno}`,
                marcador: p.puntos,
                bazas: p.bazas,
                mazo_restante: p.mazo.length,
                puntos: MENOR_GANA ? -míos : míos,
                semilla: p.semilla,
                biblioteca: p.biblioteca,
                legal_moves: legales,
                legal_actions: legales,
                is_game_over: terminada,
            };
        },

        mover(p, jugada) {
            const j = String(jugada ?? '');
            if (j === 'nueva' || j === 'reset') return false;   // lo maneja el hub

            const carta = j.startsWith('jugar:') ? j.slice(6) : j;
            const permitidas = jugables(p, p.turno);
            if (!permitidas.includes(carta)) return false;

            p.manos[p.turno] = p.manos[p.turno].filter(c => c !== carta);
            p.baza.push({ pid: p.turno, carta });
            p.historial.push(j);
            p.turno = (p.turno + 1) % p.jugadores;

            if (p.baza.length === p.jugadores) {
                const g = ganadorDeBaza(p);
                p.bazas[g] += 1;
                p.puntos[g] += PUNTOS_POR_BAZA !== null
                    ? PUNTOS_POR_BAZA
                    : p.baza.reduce((s, x) => s + valor(x.carta), 0);
                p.baza = [];
                p.salida = g;
                p.turno = g;
                if (ROBAR_TRAS_BAZA) {
                    // Roba primero quien ganó, y en orden desde ahí.
                    for (let k = 0; k < p.jugadores && p.mazo.length; k++) {
                        const pid = (g + k) % p.jugadores;
                        p.manos[pid].push(p.mazo.pop());
                    }
                }
            }
            return true;
        },

        /**
         * El rival de la casa: juega la carta más floja que le sirva, y si
         * puede ganar la baza barata, la gana. A propósito sencillo — la gracia
         * del banco de pruebas es que quede sitio por encima.
         */
        /**
         * ⚠️ EL COMENTARIO DE ARRIBA DESCRIBÍA UNA POLÍTICA QUE EL CÓDIGO NO HACÍA.
         * Decía «juega la carta más floja que le sirva, y si puede ganar la baza
         * barata, la gana». Lo que hacía era soltar SIEMPRE la más fuerte (o la
         * más floja en hearts), sin mirar la baza ni una sola vez. Es la clase de
         * mentira que no rompe nada: el juego funciona, el rival mueve, nadie se
         * queja. Sólo que el rival de casa era casi idéntico a jugar la primera
         * carta de la mano, y el calibrador lo destapó — brisca, hearts y spades
         * salían «sin señal», los tres del mismo módulo.
         *
         * Ahora sí mira la baza: si va ganando alguien, intenta ganarla con lo
         * más barato que le valga; si no puede, tira lo que menos duele. Sigue
         * dejando techo: no cuenta cartas, no recuerda lo jugado y no calcula si
         * la baza le interesa o no.
         */
        sugerencia(p) {
            const opciones = jugables(p, p.turno);
            if (!opciones.length) return null;
            const flojaAFuerte = [...opciones].sort((a, b) => fuerza(a) - fuerza(b));

            // Salgo yo: sin información, lo de siempre.
            if (!p.baza.length) {
                return `jugar:${MENOR_GANA ? flojaAFuerte[0] : flojaAFuerte[flojaAFuerte.length - 1]}`;
            }

            // ¿Cuánto vale la baza que hay en la mesa?
            const bote = p.baza.reduce((s, x) => s + valor(x.carta), 0);
            const mandaAhora = ganadorDeBaza({ ...p, baza: p.baza });

            /** ¿Con esta carta me llevo la baza? */
            const ganaCon = (c) => ganadorDeBaza({
                ...p, baza: [...p.baza, { pid: p.turno, carta: c }],
            }) === p.turno;

            if (MENOR_GANA) {
                // Hearts: ganar la baza es cargar con sus puntos. Escurrirse.
                const pierde = flojaAFuerte.filter(c => !ganaCon(c));
                if (pierde.length) {
                    // Jugar la carta MÁS ALTA que no gane la baza, para quitárnosla de encima.
                    // Si somos "fallo" (no seguimos el palo, lo que garantiza perder), tirar lo más caro.
                    const salidaPalo = palo(p.baza[0].carta);
                    const seguimosPalo = pierde.some(c => palo(c) === salidaPalo);
                    if (!seguimosPalo) {
                        const porPuntos = [...pierde].sort((a, b) => valor(a) - valor(b));
                        return `jugar:${porPuntos[porPuntos.length - 1]}`;
                    }
                    return `jugar:${pierde[pierde.length - 1]}`;
                } else {
                    // Nos la comemos seguro: soltar la carta más alta para no tragar con ella luego.
                    return `jugar:${flojaAFuerte[flojaAFuerte.length - 1]}`;
                }
            }

            const ganadoras = flojaAFuerte.filter(ganaCon);
            // Merece la pena si la baza tiene puntos o si es de un punto fijo.
            const vale = PUNTOS_POR_BAZA !== null || bote > 0 || mandaAhora !== p.turno;
            if (ganadoras.length && vale) return `jugar:${ganadoras[0]}`;   // la más barata que gana
            // No puedo o no compensa: suelto lo que menos vale.
            const porValor = [...flojaAFuerte].sort((a, b) => valor(a) - valor(b));
            return `jugar:${porValor[0]}`;
        },

        deshacer() { return false; },

        async _cargar(url = RUTA_BIBLIOTECA) {
            baraja = await cargarBaraja(nombreBaraja, url);
            return this;
        },
    };
}

// ── Los cuatro juegos, con la configuración del Python ──────────────
const ESPANOLA = { FUERZA: ['2', '4', '5', '6', '7', 'S', 'C', 'R', '3', '1'],
                   PUNTOS: { '1': 11, '3': 10, 'R': 4, 'C': 3, 'S': 2 } };
const FRANCESA = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

/**
 * ⚠️ LOS CUATRO RECIBEN `{ url }`, Y HUBO QUE ARREGLARLO.
 *
 * Antes eran `() => crearBazas({…})._cargar()`: una flecha SIN parámetros. Como
 * `index.js` los llama con `f(opts)`, JavaScript tiraba `opts` sin decir nada y
 * `_cargar()` usaba siempre su ruta relativa. En el navegador funciona; en un
 * servidor —donde esa ruta no resuelve— caía al respaldo interno.
 *
 * O sea que `/api/gym` y `/api/verificar` llevaban desde el primer día jugando
 * estos cuatro con una baraja distinta de la del navegador. No estalló porque el
 * respaldo de `spanish_40` resulta ser igual que el de la biblioteca: coincidían
 * por suerte, no porque nadie lo hubiera comprobado. El día que la biblioteca
 * cambie una carta, una partida legítima empezaría a salir «inválida» y el rastro
 * llevaría a cualquier sitio menos aquí.
 *
 * Lo cubre `prueba_biblioteca.mjs`, que le da una URL imposible a cada juego de
 * cartas y exige que se entere.
 */
export const crearBrisca = (o) => crearBazas({
    nombre: 'brisca', baraja: 'spanish_40', jugadores: 4, mano: 3,
    ...ESPANOLA, SEGUIR_PALO: false, ROBAR_TRAS_BAZA: true })._cargar(o?.url);

export const crearTute = (o) => crearBazas({
    nombre: 'tute', baraja: 'spanish_40', jugadores: 4, mano: 10,
    ...ESPANOLA, SEGUIR_PALO: true, ROBAR_TRAS_BAZA: false })._cargar(o?.url);

export const crearHearts = (o) => crearBazas({
    nombre: 'hearts', baraja: 'french_52', jugadores: 4, mano: 13,
    FUERZA: FRANCESA, SEGUIR_PALO: true, ROBAR_TRAS_BAZA: false, MENOR_GANA: true,
    sinTriunfo: true,          // en hearts no hay triunfo, y es la regla
    // Aquí no puntúa el RANGO sino el PALO, y una carta concreta.
    puntosCarta: (id) => (palo(id) === 'H' ? 1
                        : (palo(id) === 'S' && rango(id) === 'Q') ? 13 : 0),
})._cargar(o?.url);

export const crearSpades = (o) => crearBazas({
    nombre: 'spades', baraja: 'french_52', jugadores: 4, mano: 13,
    FUERZA: FRANCESA, SEGUIR_PALO: true, ROBAR_TRAS_BAZA: false,
    PUNTOS_POR_BAZA: 1, triunfoFijo: 'S' })._cargar(o?.url);
