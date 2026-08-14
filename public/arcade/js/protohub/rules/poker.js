/**
 * poker.js — Texas Hold'em heads-up, límite fijo, para el ProtoHub
 * ═══════════════════════════════════════════════════════════════════════════
 * QUÉ HABÍA ANTES DE ESCRIBIR ESTO (recon, no suposición)
 * -------------------------------------------------------
 * · `card_library.json` declara `texas_holdem` entero: baraja, zonas, las cinco
 *   fases (deal · flop · turn · river · showdown), las cuatro rondas de apuestas
 *   y las diez categorías de mano. De ahí sale todo lo que se puede leer.
 * · `sovereign_card_rules.py` trae un `PokerHandEvaluator`… que **confiesa por
 *   escrito que es un esbozo**: *"For now, return basic evaluation / Full
 *   implementation would check all 5-card combos from 7 cards"*. No detecta
 *   escaleras aunque las liste, el color solo lo ve con exactamente 5 cartas, y
 *   no desempata. O sea: la pieza existía y NO servía. Decirlo importa tanto
 *   como el código.
 * · `poker_visualizer.js` pide `player_hand`, `opponent_hand`, `community_cards`,
 *   `player_stack`, `opponent_stack`, `pot` y `phase`. Ese es el contrato de
 *   salida, y no se toca: el visualizador ya estaba escrito.
 *
 * POR QUÉ LÍMITE FIJO Y NO "no limit"
 * -----------------------------------
 * Porque las jugadas de una partida verificable son CADENAS, y un `raise 137`
 * mete un número continuo en el alfabeto de acciones. Con límite fijo las
 * acciones son cuatro —`fold` `check` `call` `raise`— y eso da:
 *   · una partida que se re-simula exactamente,
 *   · un espacio de acciones discreto, que es justo lo que pide un gym,
 *   · y sigue siendo póker de verdad: el límite fijo es una variante clásica,
 *     no una simplificación de juguete.
 *
 * DETERMINISMO: mulberry32 con semilla; la semilla viaja en el estado. Misma
 * semilla ⇒ mismas cartas, siempre, en cualquier máquina.
 *
 * ═══ CALIBRACIÓN (medida, 6 bloques × 60 sesiones de 30 manos) ═════════════
 * Un entorno no está listo por ser determinista: está listo cuando la política
 * tonta pierde, la razonable raspa, y una MEJOR gana — o sea, cuando queda
 * techo que medir.
 *
 *   política                        fichas medias   desviación
 *   tonta (siempre sube)                 −39,7          6,6
 *   ingenua (siempre paga)                −8,8          1,3
 *   la de la casa, en espejo              −5,4          2,3
 *   atenta (mira el precio del bote)      +4,7          2,0   ← hay techo
 *
 * Y antes de dar eso por bueno hubo que descartar lo obvio: que la mesa
 * estuviera sesgada. CONTROL DE ESPEJO — los dos lados con el criterio
 * idéntico — sale +0,93 con desviación 1,79 en seis bloques: **centra en cero,
 * la mesa es justa**. Sin esa comprobación, un −3,8 suelto me habría hecho
 * "arreglar" un sesgo que no existía.
 */

const RUTA_BIBLIOTECA = '../../../data/card_library.json';

// Fichas y estructura. Se declaran aquí porque la biblioteca no las trae, y se
// dicen en un sitio en vez de repartirse por el código.
const FICHAS_INICIALES = 200;
const CIEGA_PEQUENA = 1;
const CIEGA_GRANDE = 2;
const APUESTA = { 'pre-flop': 2, 'post-flop': 2, 'post-turn': 4, 'post-river': 4 };
const SUBIDAS_MAX = 3;              // tope por ronda, como en el límite fijo real
const MANOS_POR_SESION = 30;        // el episodio: acotado y puntuable

const CATEGORIAS = ['carta alta', 'pareja', 'doble pareja', 'trío', 'escalera',
                    'color', 'full', 'póker', 'escalera de color', 'escalera real'];

import { mulberry32 } from './azar.js';

const VALOR = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
                'J':11,'Q':12,'K':13,'A':14 };

const palo   = (c) => c.split('_')[0];
const figura = (c) => c.split('_')[1];
const valor  = (c) => VALOR[figura(c)];

/**
 * ═══ EL EVALUADOR ═══════════════════════════════════════════════════════════
 * Devuelve un VECTOR comparable: `[categoría, desempate1, desempate2, …]`.
 *
 * Un vector y no un número empaquetado en bits a propósito: se compara
 * lexicográficamente, se lee en la consola cuando algo falla, y no hay que
 * confiar en que los desplazamientos de bits estén bien. En un benchmark, poder
 * VER por qué una mano gana a otra vale más que ahorrar unos ciclos.
 *
 * Evalúa las 7 cartas de golpe, sin probar las 21 combinaciones de 5: con
 * cuentas de figuras y de palos sale igual de exacto y más rápido.
 */
export function evaluar(cartas) {
    const valores = cartas.map(valor).sort((a, b) => b - a);
    const porFigura = new Map();      // valor -> cuántas
    const porPalo = new Map();        // palo -> [valores]
    for (const c of cartas) {
        porFigura.set(valor(c), (porFigura.get(valor(c)) || 0) + 1);
        if (!porPalo.has(palo(c))) porPalo.set(palo(c), []);
        porPalo.get(palo(c)).push(valor(c));
    }

    // ¿Color? Cinco o más del mismo palo.
    let colorPalo = null;
    for (const [p, vs] of porPalo) if (vs.length >= 5) colorPalo = p;

    /** La escalera más alta dentro de una lista de valores. 0 si no hay. */
    const escaleraEn = (vs) => {
        const unicos = [...new Set(vs)].sort((a, b) => b - a);
        // ⚠️ LA RUEDA: A-2-3-4-5 es escalera y el as vale UNO. Es el caso que
        // se olvida siempre, y el que hace perder un bote real.
        if (unicos.includes(14)) unicos.push(1);
        let seguidas = 1;
        for (let i = 1; i < unicos.length; i++) {
            if (unicos[i] === unicos[i-1] - 1) {
                if (++seguidas >= 5) return unicos[i] + 4;   // la carta ALTA
            } else if (unicos[i] !== unicos[i-1]) {
                seguidas = 1;
            }
        }
        return 0;
    };

    if (colorPalo) {
        const alta = escaleraEn(porPalo.get(colorPalo));
        if (alta === 14) return [9, 14];                     // escalera real
        if (alta) return [8, alta];                          // escalera de color
    }

    // Grupos por repetición: primero cuántas, luego valor. Así el orden natural
    // ya resuelve «trío de reyes gana a trío de dieces».
    const grupos = [...porFigura.entries()]
        .map(([v, n]) => ({ v, n }))
        .sort((a, b) => b.n - a.n || b.v - a.v);

    const sueltas = (excluir, cuantas) =>
        valores.filter(v => !excluir.includes(v)).slice(0, cuantas);

    if (grupos[0].n === 4) {
        return [7, grupos[0].v, ...sueltas([grupos[0].v], 1)];
    }
    if (grupos[0].n === 3 && grupos[1]?.n >= 2) {
        return [6, grupos[0].v, grupos[1].v];                // full
    }
    if (colorPalo) {
        return [5, ...porPalo.get(colorPalo).sort((a,b) => b-a).slice(0, 5)];
    }
    const esc = escaleraEn(valores);
    if (esc) return [4, esc];
    if (grupos[0].n === 3) {
        return [3, grupos[0].v, ...sueltas([grupos[0].v], 2)];
    }
    if (grupos[0].n === 2 && grupos[1]?.n === 2) {
        const [alta, baja] = [grupos[0].v, grupos[1].v].sort((a,b) => b-a);
        return [2, alta, baja, ...sueltas([alta, baja], 1)];
    }
    if (grupos[0].n === 2) {
        return [1, grupos[0].v, ...sueltas([grupos[0].v], 3)];
    }
    return [0, ...valores.slice(0, 5)];
}

/** Compara dos vectores: >0 gana a, <0 gana b, 0 empate exacto. */
export function comparar(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const d = (a[i] ?? 0) - (b[i] ?? 0);
        if (d) return d;
    }
    return 0;
}

export const nombreDeMano = (vec) => CATEGORIAS[vec[0]] ?? '?';

// ═══ LAS REGLAS ════════════════════════════════════════════════════════════

function construirMazo(deck, rnd) {
    const mazo = [];
    for (const p of deck.suits) for (const f of deck.ranks) mazo.push(`${p.id}_${f}`);
    for (let i = mazo.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
    }
    return mazo;
}

const RESPALDO_DECK = {
    ranks: ['2','3','4','5','6','7','8','9','10','J','Q','K','A'],
    suits: [{ id:'S' }, { id:'H' }, { id:'D' }, { id:'C' }],
};

export async function crearPoker({ url = RUTA_BIBLIOTECA } = {}) {
    let lib = null;
    try {
        const res = await fetch(new URL(url, import.meta.url));
        if (res.ok) lib = await res.json();
    } catch { /* sin biblioteca: se juega con el respaldo */ }
    const ficha = lib?.games?.texas_holdem ?? null;
    const deck = lib?.decks?.[ficha?.deck] ?? RESPALDO_DECK;
    const rondas = ficha?.betting_rounds ?? ['pre-flop','post-flop','post-turn','post-river'];

    const reglas = {
        // «Mi ficha estaba en el catálogo», no «llegó algún JSON»: con `!!lib`,
        // un catálogo vacío daba `true` y se jugaba con el respaldo tan contento.
        // `ficha` ya se resuelve dos líneas arriba, así que se aprovecha.
        biblioteca: !!ficha,
        ficha: { rondas, fichas: FICHAS_INICIALES, manos: MANOS_POR_SESION },

        OBJETIVO: `Objetivo: acabar las ${MANOS_POR_SESION} manos con más fichas de las ${FICHAS_INICIALES} `
                + `con las que empiezas. Texas hold'em: dos cartas tuyas y cinco comunes, y la mejor mano de cinco gana. `
                + `Se puede ganar sin la mejor mano si el rival se retira, así que retirarse a tiempo también suma.`,

        nuevaPartida(opts = {}) {
            const semilla = opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32) >>> 0;
            const p = {
                semilla, rnd: mulberry32(semilla),
                fichasJugador: FICHAS_INICIALES, fichasCasa: FICHAS_INICIALES,
                mano: 0, botón: 0,          // quién reparte alterna cada mano
                historial: [], estado: 'jugando',
                ganadas: 0, perdidas: 0, repartidas: 0,
            };
            this._nuevaMano(p);
            return p;
        },

        _nuevaMano(p) {
            p.mano++;
            p.mazo = construirMazo(deck, p.rnd);
            p.jugador = [p.mazo.pop(), p.mazo.pop()];
            p.casa    = [p.mazo.pop(), p.mazo.pop()];
            p.comunes = [];
            p.ronda = 0;                       // índice en `rondas`
            p.bote = 0;
            p.subidas = 0;
            p.apostadoJugador = 0;
            p.apostadoCasa = 0;
            p.resultado = null;
            p.botón = 1 - p.botón;

            // Ciegas. En heads-up, el botón pone la pequeña y actúa primero
            // antes del flop — es la regla real, y cambia la estrategia.
            const jugadorEsBotón = p.botón === 0;
            this._poner(p, true,  jugadorEsBotón ? CIEGA_PEQUENA : CIEGA_GRANDE);
            this._poner(p, false, jugadorEsBotón ? CIEGA_GRANDE : CIEGA_PEQUENA);
            p.turno = jugadorEsBotón ? 'jugador' : 'casa';
            p.repartidas++;
            // Si le toca a la casa, que actúe hasta que me toque a mí.
            this._casaJuegaSiTocaG(p);
        },

        _poner(p, esJugador, cuanto) {
            if (esJugador) {
                const c = Math.min(cuanto, p.fichasJugador);
                p.fichasJugador -= c; p.apostadoJugador += c; p.bote += c;
            } else {
                const c = Math.min(cuanto, p.fichasCasa);
                p.fichasCasa -= c; p.apostadoCasa += c; p.bote += c;
            }
        },

        /** Las acciones legales AHORA para quien tenga el turno. */
        _legales(p) {
            if (p.estado !== 'jugando' || p.resultado) return ['siguiente'];
            const yo = p.turno === 'jugador';
            const debo = (yo ? p.apostadoCasa - p.apostadoJugador
                             : p.apostadoJugador - p.apostadoCasa);
            const acciones = [];
            if (debo > 0) { acciones.push('fold', 'call'); }
            else { acciones.push('check'); }
            if (p.subidas < SUBIDAS_MAX &&
                (yo ? p.fichasJugador : p.fichasCasa) > 0) acciones.push('raise');
            return acciones;
        },

        _avanzarCalle(p) {
            // Se reparte lo que toque según la ficha del juego: 3, 1 y 1.
            p.ronda++;
            p.subidas = 0;
            p.apostadoJugador = 0; p.apostadoCasa = 0;
            if (p.ronda === 1) p.comunes.push(p.mazo.pop(), p.mazo.pop(), p.mazo.pop());
            else if (p.ronda === 2 || p.ronda === 3) p.comunes.push(p.mazo.pop());
            if (p.ronda >= rondas.length) { this._showdown(p); return; }
            // Tras el flop actúa primero quien NO tiene el botón.
            p.turno = p.botón === 0 ? 'casa' : 'jugador';
            this._casaJuegaSiTocaG(p);
        },

        _showdown(p) {
            const mj = evaluar([...p.jugador, ...p.comunes]);
            const mc = evaluar([...p.casa, ...p.comunes]);
            const d = comparar(mj, mc);
            p.manoJugador = mj; p.manoCasa = mc;
            if (d > 0)      { p.fichasJugador += p.bote; p.resultado = `ganas con ${nombreDeMano(mj)}`; p.ganadas++; }
            else if (d < 0) { p.fichasCasa += p.bote;    p.resultado = `pierdes: ${nombreDeMano(mc)} de la casa`; p.perdidas++; }
            else            { p.fichasJugador += Math.ceil(p.bote/2); p.fichasCasa += Math.floor(p.bote/2);
                              p.resultado = `empate con ${nombreDeMano(mj)}`; }
            p.bote = 0;
            this._finDeManoQuizaSesion(p);
        },

        _finDeManoQuizaSesion(p) {
            if (p.fichasJugador <= 0) { p.estado = 'sin fichas'; }
            else if (p.fichasCasa <= 0) { p.estado = 'has desplumado a la casa'; }
            else if (p.mano >= MANOS_POR_SESION) { p.estado = 'sesión completa'; }
        },

        /** La casa juega mientras sea su turno. Ver `sugerencia` para el criterio. */
        _casaJuegaSiTocaG(p) {
            let guardia = 0;
            while (p.turno === 'casa' && !p.resultado && p.estado === 'jugando' && guardia++ < 24) {
                const a = this._decisionCasa(p);
                this._aplicar(p, a, false);
            }
        },

        /**
         * El rival de casa. Flojo A PROPÓSITO, como manda la ley de calibración:
         * mira solo su fuerza bruta y no el bote ni la posición, así que se le
         * puede ganar leyendo la mesa — que es exactamente la habilidad que
         * queremos medir. Un rival perfecto no dejaría techo.
         */
        _decisionCasa(p) {
            const legales = this._legales(p);
            const vec = evaluar([...p.casa, ...p.comunes]);
            const fuerza = vec[0];
            if (fuerza >= 3 && legales.includes('raise')) return 'raise';
            if (fuerza >= 1) return legales.includes('call') ? 'call' : 'check';
            if (legales.includes('check')) return 'check';
            // Con nada y con algo que pagar: se retira, salvo que sea barato.
            const debo = p.apostadoJugador - p.apostadoCasa;
            return debo <= CIEGA_GRANDE && legales.includes('call') ? 'call' : 'fold';
        },

        _aplicar(p, accion, esJugador) {
            const yo = esJugador;
            const debo = (yo ? p.apostadoCasa - p.apostadoJugador
                             : p.apostadoJugador - p.apostadoCasa);
            const subida = APUESTA[rondas[p.ronda]] ?? CIEGA_GRANDE;

            if (accion === 'fold') {
                if (yo) { p.fichasCasa += p.bote; p.resultado = 'te retiras'; p.perdidas++; }
                else    { p.fichasJugador += p.bote; p.resultado = 'la casa se retira — ganas'; p.ganadas++; }
                p.bote = 0;
                this._finDeManoQuizaSesion(p);
                return true;
            }
            if (accion === 'call') { this._poner(p, yo, debo); }
            else if (accion === 'raise') { this._poner(p, yo, debo + subida); p.subidas++; }
            else if (accion !== 'check') { return false; }

            p.turno = yo ? 'casa' : 'jugador';

            // La calle termina cuando ambos han igualado y ya han hablado los dos.
            const igualados = p.apostadoJugador === p.apostadoCasa;
            const hablaronLosDos = accion !== 'raise';
            if (igualados && hablaronLosDos) this._avanzarCalle(p);
            return true;
        },

        estado(p) {
            const jugando = p.estado === 'jugando' && !p.resultado;
            const acciones = p.estado !== 'jugando' ? []
                           : (p.resultado ? ['siguiente'] : this._legales(p));
            return {
                // Los nombres los fija `poker_visualizer.js`, que ya existía.
                player_hand: p.jugador,
                opponent_hand: p.resultado ? p.casa : ['??', '??'],
                community_cards: p.comunes,
                player_stack: p.fichasJugador,
                opponent_stack: p.fichasCasa,
                pot: p.bote,
                phase: p.resultado ? 'showdown' : (rondas[p.ronda] ?? 'showdown'),

                // Y lo que necesita el banco de pruebas.
                status: p.resultado ?? (p.estado === 'jugando' ? 'jugando' : p.estado),
                semilla: p.semilla,
                mano: p.mano, manos: MANOS_POR_SESION,
                turno: p.turno,
                /**
                 * ⚠️ `turn` ADEMÁS DE `turno`, PORQUE POKER ERA EL ÚNICO QUE NO
                 * LO DECÍA.
                 *
                 * Los otros veinte publican `turn`, y todo lo que reparte
                 * asientos lo lee ahí: el árbitro de las mesas compartidas para
                 * saber a quién le toca, el panel de sillas, el arnés de
                 * medida. Poker lo llamaba sólo `turno`, así que para todos
                 * ellos valía `undefined` — sin un error, sin una traza.
                 *
                 * Es exactamente el fallo por el que existe `desajustes.mjs`:
                 * go publicaba el tablero en `board` mientras la puerta de
                 * lenguaje lo buscaba en `tablero`, y estuvimos meses jugando al
                 * go sin ver una piedra. Se conserva `turno` porque su
                 * visualizador ya lo lee, y se añade el nombre de la casa.
                 */
                turn: p.turno,
                mi_mano: p.comunes.length ? nombreDeMano(evaluar([...p.jugador, ...p.comunes])) : null,
                puntos: p.fichasJugador - FICHAS_INICIALES,   // fichas netas
                ganadas: p.ganadas, perdidas: p.perdidas,
                legal_moves: acciones,
                is_game_over: p.estado !== 'jugando',
                mano_resuelta: !!p.resultado,
            };
        },

        mover(p, jugada) {
            const j = String(jugada || '').toLowerCase();
            if (p.estado !== 'jugando') return false;

            if (j === 'siguiente' || j === 'deal') {
                if (!p.resultado) return false;
                this._nuevaMano(p);
                return true;
            }
            if (p.resultado) return false;
            if (p.turno !== 'jugador') return false;
            if (!this._legales(p).includes(j)) return false;

            const ok = this._aplicar(p, j, true);
            if (ok) this._casaJuegaSiTocaG(p);
            return ok;
        },

        /**
         * Rival de referencia para el banco: paga con pareja o mejor, sube con
         * trío o mejor, se retira con nada. Deliberadamente por debajo de lo que
         * puede un humano atento — el techo es la gracia del benchmark.
         */
        sugerencia(p) {
            const s = this.estado(p);
            if (s.is_game_over) return null;
            if (p.resultado) return 'siguiente';
            const legales = this._legales(p);
            const vec = evaluar([...p.jugador, ...p.comunes]);
            if (vec[0] >= 3 && legales.includes('raise')) return 'raise';
            if (vec[0] >= 1) return legales.includes('call') ? 'call' : 'check';
            return legales.includes('check') ? 'check'
                 : (legales.includes('fold') ? 'fold' : legales[0]);
        },
    };
    return reglas;
}
