/**
 * parchis.js — el primer juego con DADO, y el primero que usa las tres
 * estructuras del sustrato a la vez
 * ═══════════════════════════════════════════════════════════════════════════
 * Tiras un dado y decides qué ficha mueve esa tirada. Con un 5 sacas ficha de
 * casa. Si caes donde hay una del contrario, la comes y vuelve a su casa. Gana
 * quien mete sus cuatro en la meta.
 *
 * ⚠️ POR QUÉ ESTE JUEGO, Y QUÉ VINO A PROBAR
 *
 * La pregunta era de arquitectura, no de juegos: **¿el sistema admite un motor
 * nuevo, o los dados caben en lo que hay?** Se consultó, se verificó leyendo, y la
 * respuesta fue que caben — y este fichero es la prueba. No hay motor de dados. No
 * hay estructura nueva. El contrato son tres cosas —`rejilla`, `piezas`, `zonas`—
 * y el parchís es el primero que las usa las TRES:
 *
 *     rejilla  el recorrido, con las casillas de seguro marcadas
 *     piezas   las fichas de cada color, y las que esperan en casa
 *     zonas    el dado, que es un objeto sobre la mesa con una cara visible
 *
 * Un dado no necesitaba ser una cuarta estructura porque mecánicamente ya estaba
 * expresado: la tirada RESTRINGE `legal_moves`. Sacas un 5 y puedes «mover:A:5» o
 * «sacar:B». Eso el contrato ya lo dice.
 *
 * ⚠️ EL AZAR SÓLO SE GASTA EN JUGADAS ACEPTADAS. NO ES UN DETALLE.
 *
 * Aquí una partida se verifica VOLVIÉNDOLA A JUGAR con `{juego, semilla, jugadas}`,
 * y la re-simulación repite sólo las jugadas que se aceptaron. Si `mover()` tirara
 * el dado antes de rechazar una jugada ilegal, la partida viva habría consumido
 * un número que la re-simulación no consume: a partir de ahí los dos hilos de azar
 * van desfasados y **el verificador rechazaría partidas legítimas**. Un jugador
 * honesto acusado de trampa, sin un solo error por ninguna parte.
 *
 * Por eso `mover()` valida TODO antes de tocar nada — la misma disciplina que ya
 * tiene `remigio.js` — y el dado se tira en la última línea del camino aceptado.
 *
 * ⚠️ Y NI `estado()` NI `sugerencia()` PUEDEN TOCARLO.
 *
 * `estado()` lo llama la mesa CADA SEGUNDO para repintar. Si consumiera azar, la
 * partida cambiaría por mirarla, y dos personas mirando la misma mesa verían
 * partidas distintas. `sugerencia()` mezcla con un hash sin estado a partir de la
 * semilla y el turno, que es el patrón que ya usa `frentes.js`.
 *
 * ⚠️ SIMPLIFICACIONES, DECLARADAS
 * Recorrido de 68 casillas y pasillo de 7, como el de verdad. NO están las
 * barreras de dos fichas ni el premio de 20 al comer ni el de 10 al meter: cada
 * una multiplica las jugadas legales y lo que este juego viene a probar es el
 * dado, no el reglamento. Se dice aquí para que nadie compare marcadores con otra
 * implementación creyendo que son lo mismo.
 */

import { mulberry32, revuelto } from './azar.js';

/** El recorrido común. 68 es el del tablero de verdad. */
const VUELTA = 68;
/** El pasillo de llegada de cada color, ya fuera del recorrido común. */
const PASILLO = 7;
/** Dónde entra cada color al recorrido, repartidos a la misma distancia. */
const SALIDA = [0, 17, 34, 51];
/**
 * Casillas de SEGURO: en ellas no te comen. Son las de salida y las de en medio
 * entre dos salidas. Se calculan del número de colores y no se escriben a mano,
 * que en un tablero de otro tamaño seguirían saliendo bien.
 */
const SEGUROS = new Set(SALIDA.flatMap(s => [s, (s + 8) % VUELTA]));

const CASA = -1, META = 100;

export function crearParchis({ jugadores = 4, fichas = 4 } = {}) {
    /** En qué casilla del recorrido común está una ficha, o null si no está. */
    const enComun = (f) => (f.pos >= 0 && f.pos < VUELTA * 2 ? f.pos : null);

    /** Cuántas casillas le faltan a una ficha de este color para su pasillo. */
    const recorrido = (color, pos) => {
        // `pos` es un contador propio de cada ficha: 0..67 recorrido, 68..74
        // pasillo, 100 meta. Así el avance es sumar, y no hay aritmética modular
        // repartida por el fichero — que es donde se cuelan los fallos de un día.
        return pos;
    };

    /** La casilla del tablero común donde se ve una ficha, o null. */
    const casillaDe = (color, pos) =>
        (pos >= 0 && pos < VUELTA) ? (SALIDA[color] + pos) % VUELTA : null;

    /** Todas las fichas del rival que están en una casilla común. */
    function comibles(p, color, casilla) {
        if (casilla === null || SEGUROS.has(casilla)) return [];
        const out = [];
        p.fichas.forEach((f, i) => {
            if (f.color === color) return;
            if (casillaDe(f.color, f.pos) === casilla) out.push(i);
        });
        return out;
    }

    /** Las jugadas legales de quien tiene el turno, dada la tirada que tenga. */
    function legales(p) {
        if (p.fin) return [];
        if (p.dado === null) return ['tirar'];

        const color = p.turno;
        const mías = p.fichas.map((f, i) => ({ f, i })).filter(x => x.f.color === color);
        const out = [];

        for (const { f, i } of mías) {
            if (f.pos === META) continue;
            if (f.pos === CASA) {
                // Sólo se sale con un 5, y sólo si la salida no está ocupada por
                // una tuya: dos fichas propias en la misma casilla no se apilan.
                if (p.dado !== 5) continue;
                const ocupada = mías.some(x => x.f.pos === 0);
                if (!ocupada) out.push(`sacar:${i}`);
                continue;
            }
            const destino = f.pos + p.dado;
            // Al pasillo se entra justo, sin pasarse: es lo que hace que el final
            // de una partida sea una decisión y no un trámite.
            if (destino > VUELTA + PASILLO) continue;
            if (mías.some(x => x.f !== f && x.f.pos === destino && destino < VUELTA)) continue;
            out.push(`mover:${i}`);
        }
        // Sin nada que mover se pasa, y hay que DECIRLO: un juego que se queda sin
        // jugadas legales y sin terminar «se muere de pie», y eso lo caza
        // `prueba_reglas.mjs` — pero mejor no llegar.
        return out.length ? out : ['pasar'];
    }

    return {

        /** A que se juega, para quien no ve la mesa. Lo publica ProtoHub.state. */

        OBJETIVO: 'Objetivo: llevar tus cuatro fichas a casa antes que nadie; un 5 saca ficha y un 6 repite.',
        // CUÁNTAS SILLAS TIENE LA MESA. Sale de `jugadores` (por defecto 4,
        // los cuatro colores). Se cruza contra `marcador` en `estado()`.
        ASIENTOS: jugadores,
        nombre: 'parchis',

        nuevaPartida(opts = {}) {
            const semilla = (opts.semilla ?? opts.seed ?? Date.now()) >>> 0;
            const p = {
                semilla, jugadores, fichas: [],
                turno: 0, dado: null, jugadas: [], fin: false, comidas: 0,
                // El azar vive DENTRO de la partida y se siembra de la semilla, que
                // es lo que hace que `{juego, semilla, jugadas}` se pueda re-jugar.
                // Mismo patrón que la comida de `snake.js`.
                _rnd: mulberry32(semilla),
            };
            for (let c = 0; c < jugadores; c++) {
                for (let k = 0; k < fichas; k++) p.fichas.push({ color: c, pos: CASA });
            }
            return p;
        },

        estado(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && asiento < jugadores ? asiento : 0;
            const mías = p.fichas.filter(f => f.color === yo);
            const metidas = (c) => p.fichas.filter(f => f.color === c && f.pos === META).length;
            const avance = (c) => p.fichas
                .filter(f => f.color === c)
                .reduce((s, f) => s + (f.pos === CASA ? 0 : f.pos === META ? VUELTA + PASILLO : f.pos), 0);

            /**
             * ⚠️ EL MARCADOR PUNTÚA LO LEJOS QUE HAS LLEGADO, no sólo si ganaste.
             * Si sólo contara ganar, dos agentes que pierden empatarían a cero y la
             * tabla no ordenaría nada — el aviso está escrito en `sokoban.js` y vale
             * igual aquí, porque en un parchís se pierde casi siempre.
             */
            const puntos = p.fin && metidas(yo) === fichas
                ? 500 + avance(yo)
                : avance(yo) + metidas(yo) * 50;
            // ⚠️ MISMA FÓRMULA QUE `puntos`, UNA POR ASIENTO. Sólo hay un ganador
            // por partida —`mover()` para en cuanto alguien mete las cuatro— así
            // que como mucho un `c` cae en la rama de los 500; el resto cae en la
            // de avance+metidas aunque `p.fin` sea true. Es el patrón de
            // `bazas.js`: la métrica del banco por asiento, no sólo la de quien mira.
            const marcador = Array.from({ length: jugadores }, (_, c) =>
                p.fin && metidas(c) === fichas ? 500 + avance(c) : avance(c) + metidas(c) * 50);

            return {
                juego: 'parchis',
                asiento: yo,
                // El dado se publica como valor Y como zona: el número para quien
                // juega sin ver, la zona para la mesa. Es el mismo dato.
                dado: p.dado,
                fase: p.dado === null ? 'tirar' : 'mover',
                mis_fichas: mías.map(f => f.pos),
                metidas: Array.from({ length: jugadores }, (_, c) => metidas(c)),
                avance: Array.from({ length: jugadores }, (_, c) => avance(c)),
                comidas: p.comidas,
                seguros: [...SEGUROS],
                marcador,
                puntos,
                score: puntos,
                turn: p.turno === yo ? 'player' : `cpu${p.turno}`,
                semilla: p.semilla,
                legal_moves: legales(p),
                is_game_over: p.fin,
                desenlace: p.fin ? `ganó ${p.ganador}` : null,
            };
        },

        mover(p, jugada) {
            const j = String(jugada ?? '');
            if (j === 'nueva' || j === 'reset' || p.fin) return false;
            // ⚠️ Se comprueba contra la lista legal ANTES de tocar nada. Ver la
            // nota de la cabecera: gastar azar en una jugada que luego se rechaza
            // desincroniza la re-simulación y convierte a un jugador honesto en un
            // tramposo a ojos del verificador.
            if (!legales(p).includes(j)) return false;

            if (j === 'tirar') {
                p.dado = 1 + Math.floor(p._rnd() * 6);
                p.jugadas.push(j);
                return true;
            }
            if (j === 'pasar') {
                p.dado = null;
                p.turno = (p.turno + 1) % jugadores;
                p.jugadas.push(j);
                return true;
            }

            const i = Number(j.split(':')[1]);
            const f = p.fichas[i];
            const sacar = j.startsWith('sacar:');
            f.pos = sacar ? 0 : f.pos + p.dado;
            if (f.pos === VUELTA + PASILLO) f.pos = META;

            // Comer: sólo en el recorrido común y fuera de los seguros.
            const casilla = casillaDe(f.color, f.pos);
            for (const k of comibles(p, f.color, casilla)) {
                p.fichas[k].pos = CASA;
                p.comidas++;
            }

            if (p.fichas.filter(x => x.color === f.color && x.pos === META).length === fichas) {
                p.fin = true;
                p.ganador = f.color;
            }

            /**
             * Con un 6 se repite turno. Es la regla que convierte el parchís en un
             * juego de gestión de riesgo y no en una carrera: vale la pena arriesgar
             * una ficha si la tirada te deja tirar otra vez.
             */
            const repite = p.dado === 6;
            p.dado = null;
            if (!repite) p.turno = (p.turno + 1) % jugadores;
            p.jugadas.push(j);
            return true;
        },

        /**
         * El rival de la casa. Come si puede, y si no adelanta la ficha más
         * avanzada. Deja techo a propósito: no protege sus fichas expuestas ni
         * calcula qué deja a tiro del siguiente, que es donde está el juego.
         *
         * ⚠️ NO CONSUME `p._rnd`. Ver la cabecera: el azar de la partida es sagrado
         * y esto se llama fuera de la secuencia de jugadas. Para desempatar usa un
         * hash sin estado de la semilla y el turno, como `frentes.js`.
         */
        sugerencia(p) {
            const opciones = legales(p);
            if (!opciones.length) return null;
            if (opciones.length === 1) return opciones[0];

            const valor = (m) => {
                if (m === 'tirar' || m === 'pasar') return 0;
                const i = Number(m.split(':')[1]);
                const f = p.fichas[i];
                const destino = m.startsWith('sacar:') ? 0 : f.pos + p.dado;
                const casilla = casillaDe(f.color, destino);
                const come = comibles(p, f.color, casilla).length;
                // Comer manda; después, ir por delante; y sacar de casa vale algo
                // porque una ficha en casa no juega.
                return come * 1000 + (destino === META ? 400 : 0)
                     + (m.startsWith('sacar:') ? 120 : destino);
            };
            const mezcla = revuelto(p.semilla ^ p.jugadas.length);
            return [...opciones]
                .sort((a, b) => valor(b) - valor(a) || ((mezcla % 2) ? 1 : -1))[0];
        },

        /**
         * ⚠️ SUSTRATO NATIVO CON LAS TRES ESTRUCTURAS. Es lo que este juego vino
         * a demostrar: que un dado cabe sin ampliar el contrato.
         */
        sustrato(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && asiento < jugadores ? asiento : 0;

            /**
             * ⚠️ EL RECORRIDO ES UN ANILLO, Y EL VOCABULARIO DE LA REJILLA NO ME LO
             * INVENTO YO.
             *
             * La primera versión extendía las 68 casillas en fila sobre una
             * cuadrícula de 9×9 y marcaba cada una con un `1`. Las dos cosas mal:
             * un parchís no es un bloque, es una pista cerrada; y `1` en esta
             * rejilla significa **muro** —está escrito en `pintar2d.js` y repetido
             * en `pintar3d.js`: «0 vacío · 1 muro · 2 destino»—, así que el tablero
             * salía como un macizo de cubos oscuros. Se vio en la captura, no en el
             * código: los números decían 68 casillas y las 68 estaban.
             *
             * 18×18 tiene exactamente 68 celdas de perímetro (4·18−4), así que el
             * anillo cae redondo sin inventarse un tamaño. Dentro va `1`, que es lo
             * que de verdad es: por ahí no se pasa.
             */
            const LADO = 18;
            const anillo = (i) => {
                if (i < LADO) return { x: i, y: 0 };                       // arriba →
                if (i < LADO * 2 - 1) return { x: LADO - 1, y: i - LADO + 1 };   // derecha ↓
                if (i < LADO * 3 - 2) return { x: LADO * 3 - 3 - i, y: LADO - 1 }; // abajo ←
                return { x: 0, y: LADO * 4 - 4 - i };                      // izquierda ↑
            };

            const celdas = new Array(LADO * LADO).fill(1);   // 1 = muro: no se pisa
            for (let c = 0; c < VUELTA; c++) {
                const { x, y } = anillo(c);
                celdas[y * LADO + x] = SEGUROS.has(c) ? 2 : 0;   // 2 = seguro · 0 = pista
            }

            const piezas = [];
            p.fichas.forEach((f) => {
                const casilla = casillaDe(f.color, f.pos);
                if (casilla === null) return;          // en casa o en meta: no se pinta
                const { x, y } = anillo(casilla);
                piezas.push({ x, y, t: 'ficha', de: f.color });
            });

            // Y el dado: un objeto sobre la mesa con una cara visible. Ésa es toda
            // la «estructura nueva» que hacía falta.
            const zonas = [];
            if (p.dado !== null) {
                zonas.push({ id: 'dado', de: null, items: [`d6_${p.dado}`], ocultas: 0 });
            }

            /**
             * ⚠️ Y LAS FICHAS QUE ESPERAN EN CASA, QUE SI NO NO SE VEN.
             *
             * Al empezar están las dieciséis en casa, así que `piezas` salía VACÍO
             * y el tablero arrancaba sin nada encima: la partida parecía no haber
             * repartido. Se vio en la prueba —«piezas 0»— y no mirando la pantalla,
             * donde habría parecido uno de los tableros vacíos de esta mañana.
             *
             * Una ficha en casa no está en ninguna casilla, así que no es una
             * PIEZA del tablero: es un montón al lado, que es exactamente lo que
             * son las zonas. Y cuántas te quedan por sacar es información pública
             * que decide el juego.
             */
            for (let c = 0; c < jugadores; c++) {
                const encasa = p.fichas.filter(f => f.color === c && f.pos === CASA).length;
                if (encasa) {
                    zonas.push({ id: 'casa', de: c,
                                 items: Array.from({ length: encasa }, () => `ficha_${c + 1}`),
                                 ocultas: 0 });
                }
            }

            return {
                rejilla: { ancho: LADO, alto: LADO, celdas },
                piezas,
                zonas,
                simbolos: { ficha: 'x' },
                leyenda: { ficha: 'ficha', 0: 'pista', 1: 'fuera', 2: 'seguro' },
            };
        },

        deshacer() { return false; },
    };
}
