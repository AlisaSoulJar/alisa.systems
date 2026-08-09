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

const VALORES_RESPALDO = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
                           '7': 7, '8': 8, '9': 9, 'S': 10, 'C': 11, 'R': 12,
                           'JK': 0 };

/**
 * ⚠️ LOS COMODINES SON DEL JUEGO, NO DE LA BARAJA ESPAÑOLA.
 *
 * Se declaran en `games.entropy.specials` y no en `decks.spanish_48`, que es lo
 * que parecía más ordenado y habría sido un desastre: esa baraja la reparten
 * también la brisca y el tute, y se habrían encontrado dos comodines en la mesa
 * sin que nadie tocara sus reglas.
 *
 * Van sin palo, con el prefijo `W_` que ya usa [unit.js] para lo mismo. Y valen
 * 0: lo mejor que te puede tocar y nada más — no emparejan con nada ni anulan
 * columnas, así que la regla del juego no cambia, sólo aparece una carta muy
 * buena que hay que saber colocar.
 */
const ESPECIALES_RESPALDO = [{ id: 'JK', count: 2, suitless: true, symbol: '🃏' }];

export async function crearEntropy({ url = RUTA_BIBLIOTECA, jugadores = 2, barajas = 2 } = {}) {
    const baraja = await cargarBaraja('spanish_48', url);
    let VALORES = VALORES_RESPALDO, ESPECIALES = ESPECIALES_RESPALDO, TOTAL_LIB = null;
    try {
        const lib = await fetch(new URL(url, import.meta.url)).then(r => r.json());
        VALORES = lib?.games?.entropy?.card_values ?? VALORES_RESPALDO;
        ESPECIALES = lib?.games?.entropy?.specials ?? ESPECIALES_RESPALDO;
        TOTAL_LIB = lib?.games?.entropy?.total ?? null;
    } catch { /* respaldo; `baraja.biblioteca` ya lo dice */ }

    const valorDe = (c) => VALORES[rango(c)] ?? 0;
    const SIMBOLOS = Object.fromEntries(
        ESPECIALES.filter(e => e.symbol).map(e => [e.id, e.symbol]));

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
                if (p.robada) {
                    legales = p.cajas[pid].map((_, i) => `cambiar:${i}`);
                    const tapadas = p.cajas[pid]
                        .map((h, i) => (h.visible ? -1 : i)).filter(i => i >= 0);
                    legales = legales.concat(tapadas.length
                        ? tapadas.map(i => `descartar_y_voltear:${i}`)
                        : ['descartar']);
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
                robada: p.robada,
                robada_de: p.robadaDe,
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
                legal_actions: legales,
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
            if (j.startsWith('cambiar:')) {
                if (!p.robada) return false;
                const i = Number(j.slice(8));
                if (!Number.isInteger(i) || i < 0 || i >= HUECOS) return false;
                const fuera = p.cajas[pid][i].carta;
                p.cajas[pid][i] = { carta: p.robada, visible: true };
                p.descarte.push(fuera);
                p.robada = null; p.robadaDe = null;
                p.turnos += 1; p.historial.push(j);
                cerrarTurno(p, pid);
                return true;
            }
            if (j.startsWith('descartar_y_voltear:')) {
                if (!p.robada) return false;
                const i = Number(j.slice(20));
                if (!Number.isInteger(i) || i < 0 || i >= HUECOS) return false;
                if (p.cajas[pid][i].visible) return false;
                p.descarte.push(p.robada);
                p.robada = null; p.robadaDe = null;
                p.cajas[pid][i].visible = true;
                p.turnos += 1; p.historial.push(j);
                cerrarTurno(p, pid);
                return true;
            }
            if (j === 'descartar') {
                if (!p.robada) return false;
                if (p.cajas[pid].some(h => !h.visible)) return false;   // hay que voltear
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

            if (!p.robada) {
                const cima = p.descarte[p.descarte.length - 1];
                if (cima && valorDe(cima) <= 4 && p.descarte.length) return 'robar_descarte';
                if (p.mazo.length) return 'robar_mazo';
                return p.descarte.length ? 'robar_descarte' : null;
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
            if (tapadas.length) return `descartar_y_voltear:${tapadas[0]}`;
            return 'descartar';
        },

        deshacer() { return false; },
    };
}
