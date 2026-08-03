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

        estado(p) {
            const terminada = p.manos.every(m => m.length === 0);
            const legales = terminada ? ['nueva']
                          : jugables(p, p.turno).map(c => `jugar:${c}`);
            // ⚠️ En hearts menos es mejor, y la métrica del banco es «más es
            // mejor». Se niega aquí, no en el entorno, para que el número que
            // se verifica y el que se compara sean el mismo.
            const míos = p.puntos[0];
            return {
                juego: nombre,
                mano: p.manos[0],
                manos_rivales: p.manos.slice(1).map(m => m.length),
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
                return `jugar:${(pierde.length ? pierde : flojaAFuerte)[0]}`;
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

export const crearBrisca = () => crearBazas({
    nombre: 'brisca', baraja: 'spanish_40', jugadores: 4, mano: 3,
    ...ESPANOLA, SEGUIR_PALO: false, ROBAR_TRAS_BAZA: true })._cargar();

export const crearTute = () => crearBazas({
    nombre: 'tute', baraja: 'spanish_40', jugadores: 4, mano: 10,
    ...ESPANOLA, SEGUIR_PALO: true, ROBAR_TRAS_BAZA: false })._cargar();

export const crearHearts = () => crearBazas({
    nombre: 'hearts', baraja: 'french_52', jugadores: 4, mano: 13,
    FUERZA: FRANCESA, SEGUIR_PALO: true, ROBAR_TRAS_BAZA: false, MENOR_GANA: true,
    sinTriunfo: true,          // en hearts no hay triunfo, y es la regla
    // Aquí no puntúa el RANGO sino el PALO, y una carta concreta.
    puntosCarta: (id) => (palo(id) === 'H' ? 1
                        : (palo(id) === 'S' && rango(id) === 'Q') ? 13 : 0),
})._cargar();

export const crearSpades = () => crearBazas({
    nombre: 'spades', baraja: 'french_52', jugadores: 4, mano: 13,
    FUERZA: FRANCESA, SEGUIR_PALO: true, ROBAR_TRAS_BAZA: false,
    PUNTOS_POR_BAZA: 1, triunfoFijo: 'S' })._cargar();
