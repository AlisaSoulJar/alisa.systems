/**
 * guerra.js — el CONTROL DE LABORATORIO del banco de pruebas
 * ═══════════════════════════════════════════════════════════════════════════
 * La Guerra (War) no tiene ni una sola decisión: se voltea y gana la más alta.
 * Portado de `MotorGuerra` (Python), cuyo docstring explica por qué existe algo
 * así en un benchmark:
 *
 *     «Cualquier agente —LLM, red neuronal, humano o un dado— debe puntuar
 *      igual aquí. Si el marcador los separa, el que está mal es el banco de
 *      pruebas, no el agente. Un benchmark sin control no sabe distinguir
 *      habilidad de ruido.»
 *
 * Es la misma idea que el control positivo de un experimento, y es rarísimo
 * verla en un banco de pruebas de agentes: **una casilla donde empatar es el
 * resultado correcto**. Si un día la tabla dice que un modelo es mejor jugando
 * a la Guerra, el fallo está en nuestra métrica.
 *
 * ⚠️ EL BOTE, Y POR QUÉ SE MENCIONA
 * El Python arrastró un fallo aquí: en un empate las cartas «se quedaban en el
 * limbo» y el recuento total bajaba de 52. Lo destapó una invariante —«no se
 * pierden cartas»— no un jugador quejándose. Ese invariante se conserva en este
 * porte y se comprueba en `estado()`: `cartas_en_juego` tiene que sumar siempre
 * el total de la baraja.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const RUTA_BIBLIOTECA = '../../../data/card_library.json';
const ORDEN = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

import { mulberry32 } from './azar.js';
import { rango, cargarBaraja } from './baraja.js';

export async function crearGuerra({ url = RUTA_BIBLIOTECA, jugadores = 2 } = {}) {
    const baraja = await cargarBaraja('french_52', url);
    const TOTAL = baraja.suits.length * baraja.ranks.length;

    return {

        /** A que se juega, para quien no ve la mesa. Lo publica ProtoHub.state. */

        OBJETIVO: 'Objetivo: quedarte con todas las cartas; en cada choque gana la mas alta.',
        nombre: 'guerra',

        nuevaPartida(opts = {}) {
            const semilla = (opts.semilla ?? opts.seed ?? Date.now()) >>> 0;
            const rnd = mulberry32(semilla);
            const mazo = baraja.suits.flatMap(s => baraja.ranks.map(r => `${s}_${r}`));
            for (let i = mazo.length - 1; i > 0; i--) {
                const j = Math.floor(rnd() * (i + 1));
                [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
            }
            return { semilla, jugadores, mazo, bote: [],
                     ganadas: Array(jugadores).fill(0), volteos: 0,
                     ultima: null, biblioteca: baraja.biblioteca };
        },

        estado(p) {
            const terminada = p.mazo.length < p.jugadores;
            // La invariante que destapó el fallo del bote en el original.
            const enJuego = p.mazo.length + p.bote.length
                          + p.ganadas.reduce((a, b) => a + b, 0);
            return {
                juego: 'guerra',
                mazo_restante: p.mazo.length,
                bote: p.bote.length,
                ganadas: p.ganadas,
                ultima_ronda: p.ultima,
                volteos: p.volteos,
                cartas_en_juego: enJuego,
                cartas_intactas: enJuego === TOTAL,   // ⚠️ debe ser SIEMPRE true
                puntos: p.ganadas[0],
                semilla: p.semilla,
                biblioteca: p.biblioteca,
                turn: 'player',
                legal_moves: terminada ? ['nueva'] : ['voltear'],
                is_game_over: terminada,
            };
        },

        mover(p, jugada) {
            if (String(jugada) !== 'voltear') return false;
            if (p.mazo.length < p.jugadores) return false;

            const salidas = [];
            for (let i = 0; i < p.jugadores; i++) salidas.push(p.mazo.pop());
            p.volteos++;
            p.ultima = salidas.slice();
            p.bote.push(...salidas);

            const alto = Math.max(...salidas.map(c => ORDEN.indexOf(rango(c))));
            const ganadores = salidas
                .map((c, i) => (ORDEN.indexOf(rango(c)) === alto ? i : -1))
                .filter(i => i >= 0);

            // Empate: las cartas NO desaparecen — se acumulan para la siguiente.
            if (ganadores.length === 1) {
                p.ganadas[ganadores[0]] += p.bote.length;
                p.bote = [];
            }

            // Al acabar con bote pendiente se reparte por igual: si no, se
            // evaporan cartas y la invariante se rompe.
            if (p.mazo.length < p.jugadores && p.bote.length) {
                const parte = Math.floor(p.bote.length / p.jugadores);
                for (let i = 0; i < p.jugadores; i++) p.ganadas[i] += parte;
                p.bote = p.bote.slice(parte * p.jugadores);
            }
            return true;
        },

        /** No hay estrategia: es el control. La única acción es voltear. */
        sugerencia(p) {
            return p.mazo.length >= p.jugadores ? 'voltear' : null;
        },

        deshacer() { return false; },
    };
}
