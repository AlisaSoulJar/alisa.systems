/**
 * gofish.js — Go Fish, portado de `MotorGoFish` del Python
 * ═══════════════════════════════════════════════════════════════════════════
 * Pides a un rival todas sus cartas de un rango. Si las tiene, te las da y
 * **repites turno**; si no, «vas a pescar» del mazo y el turno pasa. Cuatro del
 * mismo rango forman un *libro*, que sale de la mano y vale un punto.
 *
 * Regla que sí está y que mucha implementación se salta: **sólo puedes pedir un
 * rango que ya tengas en la mano**. Sin ella el juego deja de ser deducción y
 * pasa a ser un barrido de las trece posibilidades.
 *
 * POR QUÉ ESTE JUEGO ENTRA EN EL BANCO DE PRUEBAS
 * Es el primero de la suite que no mide cálculo sino **memoria e información
 * oculta**. No hay tablero que mirar ni posición que evaluar: lo único que
 * distingue a un buen jugador de uno malo es acordarse de quién preguntó qué.
 * Y es simétrico: cada pregunta que haces revela a los demás una carta tuya.
 *
 * Por eso el estado publica `preguntas`, el historial público de peticiones con
 * su resultado. Eso ES el tablero de este juego. Un agente que lo ignore juega a
 * ciegas; uno que lo lea puede deducir. Que la diferencia se pueda medir es
 * justamente lo que hace que el entorno mida algo.
 *
 * ⚠️ EL FALLO DEL TURNO, QUE VIENE DOCUMENTADO DEL ORIGINAL
 * El Python lo cuenta en su propio comentario y se porta ya arreglado: se
 * avanzaba de jugador en el fallo Y otra vez al final, en las dos ramas. Con dos
 * jugadores eso significaba que **acertar te quitaba el turno** —lo contrario de
 * la regla— y que fallar te lo devolvía por el doble avance. Acertar castigaba y
 * fallar premiaba, y por eso una política tonta ganaba el 98% de las partidas.
 *
 * Merece quedar escrito porque es el modo de fallo más caro de un banco de
 * pruebas: el juego no se rompe, se ejecuta entero y da un número. Sólo que el
 * número premiaba lo contrario de lo que decía medir. Un fallo así no lo caza
 * una prueba de que «no revienta»; lo caza mirar si el resultado tiene sentido.
 *
 * ⚠️ TABLAS POR ATASCO — regla añadida aquí, no está en el original
 * Con el mazo agotado, un jugador que siempre pida el mismo rango fallido deja
 * la partida girando para siempre: nadie roba, nadie entrega, el turno da
 * vueltas. El Python sólo termina cuando no quedan cartas, así que se colgaba.
 * Se añade un tope de turnos sin progreso —como la regla de las 50 jugadas del
 * ajedrez, que existe por esto mismo— y la partida termina en tablas. Se dice
 * aquí y se publica en el estado (`atascada`) porque es una regla NUESTRA y
 * quien compare resultados con otra implementación tiene que saberlo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { mulberry32, barajar, revuelto } from './azar.js';
import { RUTA_BIBLIOTECA, rango, cargarBaraja, cartasDe } from './baraja.js';

/**
 * @param {Object} opts
 * @param {number} opts.jugadores  3 por defecto: con dos, elegir a quién pedir
 *                                 no es una decisión y el juego pierde la mitad
 * @param {number} opts.mano       7, el reparto estándar para 2-3 jugadores
 */
export async function crearGoFish({ url = RUTA_BIBLIOTECA, jugadores = 3, mano = 7 } = {}) {
    const baraja = await cargarBaraja('french_52', url);
    const RANGOS = baraja.ranks;
    // Un ciclo entero sin que se mueva una carta: nadie puede ya progresar.
    const TOPE_ATASCO = jugadores * RANGOS.length;

    const manoDe = (p, pid) => p.manos[pid];
    const rangosDe = (p, pid) => [...new Set(manoDe(p, pid).map(rango))]
        .sort((a, b) => RANGOS.indexOf(a) - RANGOS.indexOf(b));

    /** Cuatro del mismo rango salen de la mano y valen un punto. */
    function cerrarLibros(p, pid) {
        const cuenta = new Map();
        for (const c of manoDe(p, pid)) {
            if (!cuenta.has(rango(c))) cuenta.set(rango(c), []);
            cuenta.get(rango(c)).push(c);
        }
        for (const [r, cartas] of cuenta) {
            if (cartas.length < 4) continue;
            const cuatro = cartas.slice(0, 4);
            p.manos[pid] = p.manos[pid].filter(c => !cuatro.includes(c));
            p.libros[pid].push(r);
            p.puntos[pid] += 1;
        }
    }

    /** Salta a quien no tenga cartas. Si nadie tiene, se queda donde está. */
    function siguienteConCartas(p) {
        for (let k = 0; k < p.jugadores; k++) {
            p.turno = (p.turno + 1) % p.jugadores;
            if (manoDe(p, p.turno).length) return;
        }
    }

    /** Sin cartas en ninguna mano y sin mazo: se acabó de verdad. */
    const sinCartas = (p) => p.manos.every(m => m.length === 0) && p.mazo.length === 0;
    /** Los trece libros hechos: el final canónico de Go Fish. */
    const todosLosLibros = (p) =>
        p.libros.reduce((s, l) => s + l.length, 0) === RANGOS.length;

    /** Rivales a los que se puede pedir: los que tienen cartas. */
    function rivalesDe(p, pid) {
        const out = [];
        for (let o = 0; o < p.jugadores; o++) if (o !== pid && manoDe(p, o).length) out.push(o);
        return out;
    }

    return {

        /** A que se juega, para quien no ve la mesa. Lo publica ProtoHub.state. */

        OBJETIVO: 'Objetivo: reunir mas cuartetos que el rival, pidiendole valores que tu ya tienes.',
        nombre: 'gofish',

        nuevaPartida(opts = {}) {
            const semilla = (opts.semilla ?? opts.seed ?? Date.now()) >>> 0;
            const cartas = barajar(cartasDe(baraja), mulberry32(semilla));

            const p = {
                semilla, jugadores, manos: [], mazo: [],
                libros: Array.from({ length: jugadores }, () => []),
                puntos: Array(jugadores).fill(0),
                turno: 0, preguntas: [], historial: [], sinProgreso: 0,
                biblioteca: baraja.biblioteca,
            };
            for (let i = 0; i < jugadores; i++) p.manos.push(cartas.splice(0, mano));
            p.mazo = cartas;
            // Un reparto puede traer ya cuatro iguales servidas.
            for (let i = 0; i < jugadores; i++) cerrarLibros(p, i);
            if (!manoDe(p, 0).length) siguienteConCartas(p);
            return p;
        },

        // `asiento` = desde qué silla se mira. Sin él, todo el mundo veía la
        // mano del asiento 0 — en una mesa compartida, la del rival. Ver la nota
        // larga en `bazas.js`. Opcional para no tocar al verificador ni al gym.
        estado(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && p.manos[asiento] ? asiento : 0;
            const pid = p.turno;
            const atascada = p.sinProgreso >= TOPE_ATASCO;
            const terminada = todosLosLibros(p) || sinCartas(p) || atascada;

            // Sólo rangos que YA tienes, y sólo rivales que tengan cartas.
            const rivales = rivalesDe(p, pid);
            const legales = terminada ? []
                : rivales.length
                    ? rangosDe(p, pid).flatMap(r => rivales.map(o => `pedir:${r}:${o}`))
                    // Sin nadie a quien pedir pero con mazo: se roba. Ver abajo.
                    : (p.mazo.length ? ['pescar'] : []);

            return {
                juego: 'gofish',
                asiento: yo,
                mano: [...manoDe(p, yo)],
                manos_rivales: p.manos.filter((_, i) => i !== yo).map(m => m.length),
                libros: p.libros.map(l => [...l]),
                // El tablero de este juego: quién ha pedido qué y si acertó.
                // Es información PÚBLICA, la misma que ve un humano en la mesa.
                preguntas: p.preguntas.slice(-24),
                mazo_restante: p.mazo.length,
                marcador: [...p.puntos],
                puntos: p.puntos[0],
                score: p.puntos[0],
                turn: pid === 0 ? 'player' : `cpu${pid}`,
                semilla: p.semilla,
                biblioteca: p.biblioteca,
                atascada,
                legal_moves: legales,
                is_game_over: terminada,
            };
        },

        mover(p, jugada) {
            const j = String(jugada ?? '');
            if (j === 'nueva' || j === 'reset') return false;
            if (todosLosLibros(p) || sinCartas(p) || p.sinProgreso >= TOPE_ATASCO) return false;

            // ⚠️ ESTA JUGADA LA DESTAPÓ UNA PARTIDA MUERTA, NO LA LECTURA DE LAS REGLAS
            // Se llegaba a `manos [0,3,0] · mazo 1`: el único jugador con cartas
            // no tenía a quién pedir, y como quedaba una carta en el mazo la
            // partida tampoco estaba terminada. Ni seguía ni acababa — se moría
            // de pie, sin lanzar nada, y el estado seguía diciendo
            // `is_game_over: false`. En una mesa real eso no ocurre: si no
            // puedes pedir a nadie, robas.
            //
            // Y lo que más enseña es CÓMO apareció. La política tonta —primera
            // jugada legal— terminaba las 200 semillas sin rozarlo. Sólo cayó en
            // el agujero el rival de casa, que juega mejor. O sea: **la línea
            // base floja no visita los estados raros**. Probar sólo con ella da
            // un verde que no significa nada.
            if (j === 'pescar') {
                if (rivalesDe(p, p.turno).length || !p.mazo.length) return false;
                p.manos[p.turno].push(p.mazo.pop());
                p.preguntas.push({ de: p.turno, a: null, rango: null, acierta: false });
                p.historial.push(j);
                cerrarLibros(p, p.turno);
                p.sinProgreso = 0;
                if (!manoDe(p, p.turno).length) siguienteConCartas(p);
                return true;
            }

            const partes = j.split(':');
            if (partes[0] !== 'pedir' || partes.length !== 3) return false;
            const r = partes[1];
            const objetivo = Number(partes[2]);
            const pid = p.turno;

            if (!Number.isInteger(objetivo) || objetivo < 0 || objetivo >= p.jugadores) return false;
            if (objetivo === pid) return false;                        // ni pedirte a ti
            if (!manoDe(p, pid).some(c => rango(c) === r)) return false; // sólo lo que tienes
            if (!manoDe(p, objetivo).length) return false;

            const pedidas = manoDe(p, objetivo).filter(c => rango(c) === r);
            const acierta = pedidas.length > 0;
            p.preguntas.push({ de: pid, a: objetivo, rango: r, acierta });
            p.historial.push(j);

            if (acierta) {
                p.manos[objetivo] = manoDe(p, objetivo).filter(c => rango(c) !== r);
                p.manos[pid] = manoDe(p, pid).concat(pedidas);
                p.sinProgreso = 0;
            } else {
                if (p.mazo.length) {
                    p.manos[pid].push(p.mazo.pop());   // vas a pescar
                    p.sinProgreso = 0;
                } else {
                    p.sinProgreso += 1;                // nada se movió
                }
            }

            cerrarLibros(p, pid);

            // Acertar te da OTRO turno; fallar lo pierde. Una sola vez — y aquí
            // estaba el fallo del original.
            if (!acierta || !manoDe(p, pid).length) siguienteConCartas(p);
            return true;
        },

        /**
         * El rival de la casa. Juega con la información pública, que es de lo
         * que va este juego: si vio a alguien pedir un rango que él tiene, sabe
         * que ese alguien lo tiene, y se lo pide.
         *
         * A propósito deja techo: no recuerda quién entregó qué ni descarta
         * rangos ya preguntados sin éxito. Un banco de pruebas cuyo rival de
         * casa juega perfecto no separa a nadie.
         */
        sugerencia(p) {
            const pid = p.turno;
            const rivales = rivalesDe(p, pid);
            if (!rivales.length) return p.mazo.length ? 'pescar' : null;
            const míos = rangosDe(p, pid);
            if (!míos.length) return null;

            // 1. Alguien pidió un rango que yo tengo ⇒ lo tiene. Pídeselo.
            for (let i = p.preguntas.length - 1; i >= 0; i--) {
                const q = p.preguntas[i];
                if (q.de !== pid && rivales.includes(q.de) && míos.includes(q.rango)) {
                    return `pedir:${q.rango}:${q.de}`;
                }
            }
            // 2. Si no, el rango del que más cartas tengo: cerrar libro antes.
            const cuantas = (r) => manoDe(p, pid).filter(c => rango(c) === r).length;
            const mejor = [...míos].sort((a, b) => cuantas(b) - cuantas(a)
                                                || RANGOS.indexOf(a) - RANGOS.indexOf(b))[0];
            // Desempate del rival SIN `Math.random`: del número de pregunta.
            return `pedir:${mejor}:${rivales[revuelto(p.preguntas.length) % rivales.length]}`;
        },

        deshacer() { return false; },
    };
}
