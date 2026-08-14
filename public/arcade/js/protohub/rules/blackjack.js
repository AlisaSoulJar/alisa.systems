/**
 * blackjack.js — 21 para el ProtoHub, LEYENDO LA BIBLIOTECA QUE YA EXISTÍA
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LECCIÓN, ANOTADA DONDE DUELE (1 ago 2026)
 *
 * La primera versión de este fichero se escribió a mano: valores de carta
 * clavados, una sola baraja, la regla de la casa inventada. Y resulta que ya
 * teníamos:
 *
 *   · `arcade/data/card_library.json` — 6 barajas y **25 juegos** declarados:
 *     zonas, fases, verbos, valores de carta, `multi_deck`, `stand_on_17`…
 *   · `arcade/engines/sovereign_card_rules.py` — 77 KB: `SovereignCardGame`
 *     (controlador universal que lee esa biblioteca), `DeckFactory`,
 *     `CardVerbs`, `PokerHandEvaluator`, `BlackjackRules` y motores de
 *     Blackjack, Brisca, Tute, Hearts, Spades, GoFish, Guerra…
 *
 * O sea que las normas y el reparto estaban descritos, y yo hice una versión
 * peor. Esta versión NO inventa nada: saca de la ficha del juego la baraja, el
 * número de barajas, los valores, el objetivo y la regla del crupier, y copia
 * las decisiones de `MotorBlackjack` (Python), que es la autoridad.
 *
 * Buscar antes de construir. Por contenido, no por memoria.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * FORMATO DE CARTA: `S_A`, `H_10`… — lo que sabe leer `parseCardId()`.
 * DETERMINISMO: mulberry32 con semilla; la semilla viaja en el estado, así que
 * cualquier partida es reproducible después de jugarla.
 */

// Relativa a ESTE módulo (`arcade/js/protohub/rules/`), o sea tres niveles
// arriba hasta `arcade/`. Con `../` sola apuntaba a `protohub/data/`, la
// lectura fallaba y el respaldo lo tapaba en silencio — y como el respaldo
// tiene los mismos números, todo "funcionaba". Por eso el estado publica
// `biblioteca: true|false`: un fallo que no se nota es el peor de todos.
const RUTA_BIBLIOTECA = '../../../data/card_library.json';

// Cartas que tienen que quedar para poder repartir otra mano con holgura (dos
// para ti, dos para la casa, y sitio para que ambos pidan). Por debajo, el
// zapato se da por agotado y la SESIÓN termina — ver la nota en `estado()`.
const CARTAS_MINIMAS = 15;

/** Si la biblioteca no está a mano, esto es lo mínimo para no dejar de jugar. */
const RESPALDO = {
    deck: { ranks: ['2','3','4','5','6','7','8','9','10','J','Q','K','A'],
            suits: [{ id:'S' }, { id:'H' }, { id:'D' }, { id:'C' }] },
    valores: { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
               'J':10,'Q':10,'K':10,'A':[1,11] },
    barajas: 6, objetivo: 21, casaSePlantaEn: 17,
};

import { mulberry32 } from './azar.js';

/**
 * Traduce la ficha del juego a los pocos números que necesita el motor.
 * Todo sale de la biblioteca; si algo falta, del respaldo — nunca inventado
 * aquí, para que no vuelva a haber dos verdades sobre las mismas reglas.
 */
function leerFicha(lib) {
    if (!lib) return RESPALDO;
    const juego = lib.games?.blackjack;
    const deck = lib.decks?.[juego?.deck] ?? RESPALDO.deck;
    // `stand_on_17` vive en la fase del crupier. Se lee el número del propio
    // nombre de la regla: si mañana la ficha dice `stand_on_16`, esto la sigue.
    const faseCrupier = (juego?.phases ?? []).find(f => f.verb === 'auto_draw');
    const plantar = parseInt(String(faseCrupier?.rule ?? '').match(/\d+/)?.[0] ?? '', 10);
    return {
        deck,
        valores: juego?.card_values ?? RESPALDO.valores,
        barajas: juego?.multi_deck ?? RESPALDO.barajas,
        objetivo: juego?.target ?? RESPALDO.objetivo,
        casaSePlantaEn: Number.isFinite(plantar) ? plantar : RESPALDO.casaSePlantaEn,
    };
}

function construirMazo(ficha, semilla) {
    const rnd = mulberry32(semilla);
    const mazo = [];
    // `multi_deck: 6` — un casino de verdad reparte con seis barajas, y eso
    // cambia el juego: contar cartas deja de ser trivial. Mi versión a mano
    // usaba una sola porque no miré la ficha.
    for (let b = 0; b < ficha.barajas; b++)
        for (const p of ficha.deck.suits)
            for (const r of ficha.deck.ranks)
                mazo.push(`${p.id}_${r}`);
    for (let i = mazo.length - 1; i > 0; i--) {          // Fisher-Yates
        const j = Math.floor(rnd() * (i + 1));
        [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
    }
    return mazo;
}

/**
 * El as vale 11 mientras quepa. Los valores salen de `card_values`, donde el as
 * viene declarado como `[1, 11]` — la ficha ya contaba esta ambigüedad.
 */
function puntuar(mano, ficha) {
    let total = 0, ases = 0;
    for (const carta of mano) {
        const v = ficha.valores[carta.split('_')[1]];
        if (Array.isArray(v)) { ases++; total += Math.min(...v); }
        else total += v;
    }
    if (ases > 0) {
        const salto = Math.max(...ficha.valores['A']) - Math.min(...ficha.valores['A']);
        if (total + salto <= ficha.objetivo) total += salto;   // un as, y solo uno
    }
    return total;
}

/**
 * Construye el módulo de reglas ya atado a la biblioteca.
 * Es asíncrono porque la ficha se lee de disco: registrar el juego espera un
 * `await`, que es un precio ridículo por no tener dos copias de las normas.
 */
export async function crearBlackjack({ url = RUTA_BIBLIOTECA } = {}) {
    let lib = null;
    try {
        const res = await fetch(new URL(url, import.meta.url));
        if (res.ok) lib = await res.json();
    } catch { /* sin biblioteca: se juega con el respaldo */ }
    const ficha = leerFicha(lib);
    const F = ficha;

    const esBlackjack = (m) => m.length === 2 && puntuar(m, F) === F.objetivo;

    const reglas = {
        ficha: F,

        // ⚠️ Aquí el objetivo NO es una frase fija, porque el número no lo pone
        // este fichero: sale de la ficha del catálogo (`F.objetivo`), y una
        // variante que juegue a otro número dejaría la frase mintiendo. Es el
        // mismo criterio que las normas de las damas — lo dice el dato.
        OBJETIVO: `Objetivo: acercarte a ${F.objetivo} más que la casa SIN PASARTE. `
                + `Si te pasas de ${F.objetivo} pierdes en el acto, aunque la casa se pase después. `
                + `La casa no decide: sigue su norma fija, así que el único que elige eres tú.`,
        // ⚠️ «MIS NORMAS ESTABAN EN EL CATÁLOGO», no «llegó algún JSON».
        // Antes era `!!lib`, y con un `{}` por respuesta decía `true` mientras
        // jugaba enterito con el respaldo. Una marca que existe para avisar de
        // que se está jugando con otra baraja no puede dar un falso tranquilo.
        biblioteca: !!lib?.games?.blackjack,

        nuevaPartida(opts = {}) {
            const semilla = opts.semilla ?? (Math.random() * 2 ** 32) >>> 0;
            const p = { semilla, mazo: construirMazo(F, semilla), jugador: [], casa: [],
                        estado: 'Playing', dobló: false,
                        manos: 0, ganadas: 0, perdidas: 0, empates: 0 };
            this._repartir(p);
            return p;
        },

        _repartir(p) {
            p.jugador = [p.mazo.pop(), p.mazo.pop()];
            p.casa    = [p.mazo.pop(), p.mazo.pop()];
            p.estado = 'Playing'; p.dobló = false; p.manos++;
            if (esBlackjack(p.jugador) || esBlackjack(p.casa)) this._resolver(p);
        },

        _resolver(p) {
            const jug = puntuar(p.jugador, F);
            if (jug > F.objetivo) { p.estado = 'Te pasas — pierdes'; p.perdidas++; return; }
            // La regla de la casa sale de la ficha (`stand_on_17`), no de mi cabeza.
            while (puntuar(p.casa, F) < F.casaSePlantaEn) p.casa.push(p.mazo.pop());
            const casa = puntuar(p.casa, F);
            if (casa > F.objetivo)   { p.estado = 'La casa se pasa — ganas'; p.ganadas++; }
            else if (jug > casa)     { p.estado = 'Ganas';   p.ganadas++; }
            else if (jug < casa)     { p.estado = 'Pierdes'; p.perdidas++; }
            else                     { p.estado = 'Empate';  p.empates++; }
        },

        /**
         * ⚠️ QUÉ ES UNA PARTIDA AQUÍ: **el zapato entero**, no una mano.
         *
         * Decisión tomada tras verla fallar. Al grabar cinco manos seguidas, el
         * verificador rechazaba la sexta jugada con «llega con la partida ya
         * terminada» — y tenía razón: para él `is_game_over` significaba el
         * final, y yo lo estaba usando para «esta mano se ha resuelto».
         *
         * Había dos salidas. Partir en manos independientes habría encajado a
         * la primera… y habría matado el juego: estas manos COMPARTEN el zapato
         * de seis barajas a propósito, que es lo que hace que contar cartas sea
         * una habilidad real y no un adorno. Dejar que la herramienta decidiera
         * las reglas del juego era el camino cómodo y el equivocado.
         *
         * Así que el arreglo va aquí: la sesión es el episodio y termina cuando
         * el zapato se agota — que además es lo que pasa en una mesa de verdad,
         * y es un final acotado, con marcador, y reproducible desde UNA semilla.
         * El verificador no se toca: su invariante era correcta.
         */
        estado(p) {
            const jugando = p.estado === 'Playing';
            const zapatoAgotado = p.mazo.length < CARTAS_MINIMAS;
            // `double` SOLO con la mano inicial, igual que en `MotorBlackjack`.
            // Y `split` no se anuncia porque no está implementado: mejor tres
            // acciones de verdad que cuatro con una mentira. (Su comentario.)
            const acciones = jugando
                ? ['hit', 'stand', ...(p.jugador.length === 2 ? ['double'] : [])]
                : (zapatoAgotado ? ['nueva'] : ['deal']);
            return {
                player_hand: p.jugador,
                dealer_hand: p.casa,
                player_score: puntuar(p.jugador, F),
                dealer_score: jugando ? puntuar(p.casa.slice(1), F) : puntuar(p.casa, F),
                status: p.estado,
                // ⚠️ PUNTUACIÓN, y no es cosmética: es lo que hace verificable
                // la partida. Sin un número que comparar, el verificador no
                // puede cazar a quien cambia la semilla —lo comprobé: la
                // partida trucada salía «válida»— porque solo sabe contrastar
                // puntos. Manos netas: ganar suma, perder resta, empatar ni una
                // cosa ni otra. Y de paso el juego ya se puede rankear.
                puntos: p.ganadas - p.perdidas,
                semilla: p.semilla,
                mazo_restante: p.mazo.length,
                manos: p.manos, ganadas: p.ganadas, perdidas: p.perdidas, empates: p.empates,
                legal_moves: acciones,
                // La SESIÓN termina cuando se acaba el zapato; que una mano se
                // resuelva no termina nada. Esta distinción es la que hacía
                // fallar la verificación.
                is_game_over: !jugando && zapatoAgotado,
                mano_resuelta: !jugando,
                turn: jugando ? 'player' : 'dealer',
            };
        },

        mover(p, jugada) {
            const j = String(jugada || '').toLowerCase();

            if (j === 'deal' || j === 'new') {
                if (p.estado === 'Playing') return false;
                // ⚠️ Aquí se rebarajaba a media sesión. Parecía realista y era
                // veneno para el benchmark: una partida sin final no se puede
                // puntuar ni cerrar. Ahora el zapato se gasta y la sesión
                // acaba — repartir sin cartas suficientes es ilegal, y punto.
                if (p.mazo.length < CARTAS_MINIMAS) return false;
                this._repartir(p);
                return true;
            }
            if (p.estado !== 'Playing') return false;

            if (j === 'hit' || j === 'double') {
                if (j === 'double' && p.jugador.length !== 2) return false;
                p.jugador.push(p.mazo.pop());
                if (j === 'double') p.dobló = true;
                // Doblar obliga a plantarse; pasarse o llegar al objetivo también
                // acaban tu turno — si no, la mano se queda colgada sin acciones.
                if (j === 'double' || puntuar(p.jugador, F) >= F.objetivo) this._resolver(p);
                return true;
            }
            if (j === 'stand') { this._resolver(p); return true; }
            return false;
        },

        /**
         * Rival de casa a propósito flojo: pide con menos de lo que se planta la
         * casa. Gana a veces y deja techo, que es lo que pide la ley de
         * calibración — un benchmark sin techo no mide nada.
         */
        sugerencia(p) {
            if (p.estado !== 'Playing') return 'deal';
            return puntuar(p.jugador, F) < F.casaSePlantaEn ? 'hit' : 'stand';
        },
    };
    return reglas;
}
