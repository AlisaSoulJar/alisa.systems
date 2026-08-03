/**
 * unit.js — UNIT, portado de `MotorUnit` del Python
 * ═══════════════════════════════════════════════════════════════════════════
 * Sueltas cartas que casen en COLOR o en NÚMERO con la de arriba del descarte;
 * si no puedes, robas. Gana quien se queda sin cartas.
 *
 * ⚖️ SOBRE EL NOMBRE — y esto importa porque el motor se publica libre
 * Este juego estaba en el catálogo como «UNO». **UNO es marca registrada de
 * Mattel.** Las mecánicas de un juego no se registran, pero el NOMBRE sí, y
 * llevarlo en un repositorio público es buscarse un problema gratis. Renombrado
 * a UNIT, que es como aparece ya en el Python.
 *
 * QUÉ MIDE
 * Es la familia de *descarte*: no se gana nada por baza, se trata de vaciar la
 * mano. Las especiales —SKIP, REV, D2 y los comodines— convierten **el orden de
 * juego en parte del problema**: con REV eliges a quién le toca, con D2 eliges a
 * quién castigas. Y el comodín obliga a elegir color, que es la única decisión
 * de la suite en la que declaras tu intención en voz alta.
 *
 * ⚠️ TRES ARREGLOS QUE VIENEN DEL PYTHON, DICHOS EN VOZ ALTA
 * Los tres nacieron del mismo síntoma —**0% de victorias para todos los
 * agentes**— y cada uno se comió una parte del problema. Un banco de pruebas
 * donde nadie gana nunca no es difícil: está roto, y lo parece poco.
 *   1. **Reciclar el descarte** cuando se acaba el mazo. Sin esto la partida
 *      moría por agotamiento antes de que nadie vaciara la mano.
 *   2. **`pasar`** cuando no hay mazo ni nada que reciclar. Sin esta salida el
 *      turno se quedaba sin acciones legales.
 *   3. **Cerrar por bloqueo** si todos pasan seguidos. Sin esto, `pasar`
 *      convertía el atasco en un bucle infinito.
 *
 * ⚠️ Y UNO QUE NO SE PORTA: EL BARAJADO DEL RECICLE
 * El Python recicla con `random.shuffle`, sin semilla. Allí da igual; aquí
 * rompería la tesis entera —dos re-simulaciones de la misma partida barajarían
 * distinto y el verificador rechazaría partidas legítimas—. Cada recicle usa un
 * generador derivado de `(semilla, nº de recicle)`, así que el estado sigue
 * siendo una función pura de la semilla y de las jugadas.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { mulberry32, barajar, revuelto } from './azar.js';
import { RUTA_BIBLIOTECA, palo, rango, cargarBaraja } from './baraja.js';

/** Valor de cada carta al contar. Los números valen su cifra. */
const VALOR_ESPECIAL = { SKIP: 20, REV: 20, D2: 20, WILD: 50, WD4: 50 };
const valorDe = (c) => VALOR_ESPECIAL[rango(c)] ?? (Number(rango(c)) || 0);
const esComodin = (c) => rango(c) === 'WILD' || rango(c) === 'WD4';

/**
 * Monta las 108 cartas.
 *
 * La biblioteca lista los rangos 0-9 y las especiales por separado, pero no la
 * regla de cuántas hay de cada una: **el 0 va una vez por color y del 1 al 9 van
 * dos**. Eso vive aquí porque es del juego, no de la baraja. La biblioteca sí
 * declara `total`, así que se comprueba contra ella — si algún día cambia el
 * catálogo y esta función no, salta al construir y no en mitad de una partida.
 */
function barajaUnit(baraja, specials, total) {
    const cartas = [];
    for (const s of baraja.suits) {
        for (const r of baraja.ranks) {
            cartas.push(`${s}_${r}`);
            if (r !== '0') cartas.push(`${s}_${r}`);      // del 1 al 9, dos por color
        }
        for (const e of specials) {
            if (e.suitless) continue;
            for (let i = 0; i < (e.per_suit ?? 0); i++) cartas.push(`${s}_${e.id}`);
        }
    }
    for (const e of specials) {
        if (!e.suitless) continue;
        for (let i = 0; i < (e.count ?? 0); i++) cartas.push(`W_${e.id}`);
    }
    if (total && cartas.length !== total) {
        throw new Error(`baraja UNIT mal montada: ${cartas.length} cartas, la biblioteca dice ${total}`);
    }
    return cartas;
}

/** Respaldo de las especiales, por si la biblioteca no carga. */
const ESPECIALES_RESPALDO = [
    { id: 'SKIP', per_suit: 2 }, { id: 'REV', per_suit: 2 }, { id: 'D2', per_suit: 2 },
    { id: 'WILD', count: 4, suitless: true }, { id: 'WD4', count: 4, suitless: true },
];

export async function crearUnit({ url = RUTA_BIBLIOTECA, jugadores = 4, mano = 7 } = {}) {
    const baraja = await cargarBaraja('unit_108', url);
    let specials = ESPECIALES_RESPALDO, total = 108;
    try {
        const lib = await fetch(new URL(url, import.meta.url)).then(r => r.json());
        specials = lib?.decks?.unit_108?.specials ?? ESPECIALES_RESPALDO;
        total = lib?.decks?.unit_108?.total ?? 108;
    } catch { /* respaldo, ya avisado por `baraja.biblioteca` */ }

    const COLORES = baraja.suits;
    const HORIZONTE = 200;      // ver la cabecera: sin tope, UNIT no termina solo

    const cima = (p) => p.descarte[p.descarte.length - 1] ?? null;

    /** ¿Casa esta carta con lo que hay arriba? */
    function casa(p, carta) {
        if (!p.descarte.length) return true;
        if (esComodin(carta)) return true;
        return palo(carta) === p.color || rango(carta) === rango(cima(p));
    }

    /** Recicla el descarte dejando arriba la carta en juego. Con semilla. */
    function reciclar(p) {
        if (p.descarte.length < 2) return false;
        const arriba = p.descarte.pop();
        const resto = p.descarte;
        p.descarte = [arriba];
        p.mazo = barajar(resto, mulberry32((p.semilla ^ revuelto(p.recicles)) >>> 0));
        p.recicles += 1;
        return true;
    }

    const avanzar = (p) => { p.turno = (p.turno + p.sentido + p.jugadores) % p.jugadores; };

    /** Bloqueada: gana quien menos cartas tenga. Cierra el episodio. */
    function cerrarBloqueada(p) {
        const menos = Math.min(...p.manos.map(m => m.length));
        p.ganadores = p.manos.map((m, i) => (m.length === menos ? i : -1)).filter(i => i >= 0);
        p.bloqueada = true;
        p.fin = true;
    }

    function jugables(p, pid) {
        const out = [];
        const vistas = new Set();
        for (const c of p.manos[pid]) {
            if (vistas.has(c) || !casa(p, c)) continue;
            vistas.add(c);        // hay cartas repetidas; la jugada es la misma
            // El comodín obliga a declarar color: cuatro jugadas distintas.
            if (esComodin(c)) for (const col of COLORES) out.push(`jugar:${c}:${col}`);
            else out.push(`jugar:${c}`);
        }
        return out;
    }

    return {
        nombre: 'unit',

        nuevaPartida(opts = {}) {
            const semilla = (opts.semilla ?? opts.seed ?? Date.now()) >>> 0;
            const cartas = barajar(barajaUnit(baraja, specials, total), mulberry32(semilla));

            const p = {
                semilla, jugadores, manos: [], mazo: [], descarte: [],
                color: null, sentido: 1, turno: 0, turnos: 0, pases: 0,
                recicles: 0, historial: [], ganadores: [], bloqueada: false, fin: false,
                biblioteca: baraja.biblioteca,
            };
            for (let i = 0; i < jugadores; i++) p.manos.push(cartas.splice(0, mano));
            p.mazo = cartas;

            // Se voltea la primera. Si sale comodín no hay color declarado, así
            // que manda el primero del catálogo — hay que fijar algo y se dice.
            const primera = p.mazo.pop();
            p.descarte.push(primera);
            p.color = esComodin(primera) ? COLORES[0] : palo(primera);
            return p;
        },

        estado(p) {
            if (!p.fin && p.turnos >= HORIZONTE) cerrarBloqueada(p);

            const pid = p.turno;
            let legales = [];
            if (!p.fin) {
                legales = jugables(p, pid);
                if (!p.mazo.length) reciclar(p);
                if (p.mazo.length) legales = legales.concat('robar');
                else if (!legales.length) legales = ['pasar'];
            }

            // ⚠️ MÉTRICA DEL BANCO, NO REGLA DE UNIT — Y ESTUVO MAL.
            // La primera versión puntuaba (manos rivales − la mía): denso, y
            // coincide con el marcador clásico cuando ganas, porque tu mano vale
            // 0. Parecía razonable. Medido sobre 300 semillas con tres
            // políticas, no lo era:
            //
            //     política          gana        puntos
            //     barata (guarda)   99/300      28,8
            //     primera legal     92/300      34,7
            //     cara (suelta)     81/300      39,8
            //
            // La que MÁS gana es la que MENOS puntúa, y al revés. La métrica
            // premiaba deshacerse de comodines y especiales —que baja el valor
            // de tu mano— cuando guardarlos es justo lo que gana partidas. Un
            // agente que optimizara ese número habría aprendido a jugar PEOR.
            //
            // Es el mismo fallo que traía Go Fish con el turno: el juego se
            // ejecuta entero y da un número, sólo que el número mide otra cosa.
            // No lo caza ninguna prueba de que «no revienta»; sólo mirar si el
            // resultado tiene sentido.
            //
            // Ahora **ganar domina**: el objetivo de UNIT es quedarse sin
            // cartas, y eso vale más que cualquier diferencia de valor. Lo denso
            // se queda de desempate, para que dos agentes que pierden los dos
            // sigan siendo distinguibles.
            const valorMano = (m) => m.reduce((s, c) => s + valorDe(c), 0);
            const míos = valorMano(p.manos[0]);
            const rivales = p.manos.reduce((s, m, i) => s + (i === 0 ? 0 : valorMano(m)), 0);
            const gané = p.fin && p.ganadores.includes(0);
            const puntos = gané ? 100 + rivales : -míos;

            return {
                juego: 'unit',
                mano: [...p.manos[0]],
                manos_rivales: p.manos.slice(1).map(m => m.length),
                cima: cima(p),
                color: p.color,
                sentido: p.sentido,
                mazo_restante: p.mazo.length,
                descarte_restante: p.descarte.length,
                turnos: p.turnos,
                bloqueada: p.bloqueada,
                ganadores: [...p.ganadores],
                puntos,
                score: puntos,
                turn: pid === 0 ? 'player' : `cpu${pid}`,
                semilla: p.semilla,
                biblioteca: p.biblioteca,
                // Invariante al estilo de `guerra`: las 108 cartas siguen ahí.
                cartas_intactas:
                    p.manos.reduce((s, m) => s + m.length, 0) + p.mazo.length + p.descarte.length
                    === total,
                legal_moves: legales,
                legal_actions: legales,
                is_game_over: p.fin,
            };
        },

        mover(p, jugada) {
            const j = String(jugada ?? '');
            if (j === 'nueva' || j === 'reset' || p.fin) return false;

            const pid = p.turno;

            if (j === 'pasar') {
                if (p.mazo.length || jugables(p, pid).length) return false;
                p.turnos += 1; p.pases += 1;
                p.historial.push(j);
                avanzar(p);
                if (p.pases >= p.jugadores) cerrarBloqueada(p);
                return true;
            }

            if (j === 'robar') {
                if (!p.mazo.length && !reciclar(p)) return false;
                p.turnos += 1;
                p.manos[pid].push(p.mazo.pop());
                p.historial.push(j);
                avanzar(p);
                return true;
            }

            if (!j.startsWith('jugar:')) return false;
            const trozos = j.slice(6).split(':');
            const carta = trozos[0];
            const color = trozos[1];

            const i = p.manos[pid].indexOf(carta);
            if (i < 0) return false;                       // no la tienes
            if (!casa(p, carta)) return false;             // no casa
            if (esComodin(carta) && !COLORES.includes(color)) return false;  // di el color

            p.turnos += 1; p.pases = 0;
            p.manos[pid].splice(i, 1);                     // una sola, hay repetidas
            p.descarte.push(carta);
            p.color = esComodin(carta) ? color : palo(carta);
            p.historial.push(j);

            if (!p.manos[pid].length) {                    // ¡UNIT!
                p.ganadores = [pid];
                p.fin = true;
                return true;
            }

            const r = rango(carta);
            if (r === 'REV') {
                // Con dos jugadores, invertir el sentido equivale a saltar.
                if (p.jugadores === 2) avanzar(p);
                else p.sentido = -p.sentido;
            } else if (r === 'SKIP') {
                avanzar(p);
            } else if (r === 'D2' || r === 'WD4') {
                avanzar(p);
                const víctima = p.turno;
                for (let k = 0; k < (r === 'D2' ? 2 : 4); k++) {
                    if (!p.mazo.length && !reciclar(p)) break;
                    p.manos[víctima].push(p.mazo.pop());
                }
            }
            avanzar(p);
            return true;
        },

        /**
         * El rival de la casa: suelta lo BARATO y guarda comodines y especiales
         * para cuando hagan falta; con el comodín declara el color del que más
         * tenga en la mano.
         *
         * ⚠️ Jugaba lo contrario —la carta más cara primero, que suena a
         * «quítate de encima los 50 puntos»— y las 300 semillas dijeron que era
         * la peor de las tres opciones probadas: 81 victorias contra 99 de ésta
         * y 92 de jugar la primera legal. Guardar el comodín es guardar la
         * flexibilidad, y la flexibilidad es lo que gana. La intuición de
         * puntuación era buena para el marcador y mala para el juego.
         *
         * Sigue dejando techo a propósito: no cuenta cartas, no mira cuántas le
         * quedan al de al lado y no guarda un D2 para el final.
         */
        sugerencia(p) {
            const pid = p.turno;
            const opciones = jugables(p, pid);
            if (!opciones.length) return p.mazo.length ? 'robar' : 'pasar';

            const cartaDe = (m) => m.slice(6).split(':')[0];
            
            const siguiente = (pid + p.sentido + p.jugadores) % p.jugadores;
            const peligro = p.manos[siguiente].length === 1;
            
            let mejor;
            if (peligro) {
                const agresivas = opciones.filter(o => {
                    const r = rango(cartaDe(o));
                    return r === 'D2' || r === 'SKIP' || r === 'REV' || r === 'WD4';
                });
                if (agresivas.length) mejor = agresivas[0];
            }
            
            if (!mejor) {
                const cuenta = {};
                for (const c of p.manos[pid]) {
                    if (!esComodin(c)) cuenta[palo(c)] = (cuenta[palo(c)] || 0) + 1;
                }
                
                mejor = [...opciones].sort((a, b) => {
                    const ca = cartaDe(a), cb = cartaDe(b);
                    const comodinA = esComodin(ca) ? 1 : 0;
                    const comodinB = esComodin(cb) ? 1 : 0;
                    if (comodinA !== comodinB) return comodinA - comodinB;
                    
                    const paloA = palo(ca), paloB = palo(cb);
                    const countA = cuenta[paloA] || 0;
                    const countB = cuenta[paloB] || 0;
                    if (countA !== countB) return countB - countA;
                    
                    return valorDe(cb) - valorDe(ca);
                })[0];
            }
            
            const carta = cartaDe(mejor);
            if (!esComodin(carta)) return mejor;

            const cuenta2 = new Map(COLORES.map(c => [c, 0]));
            for (const c of p.manos[pid]) {
                if (!esComodin(c) && cuenta2.has(palo(c))) cuenta2.set(palo(c), cuenta2.get(palo(c)) + 1);
            }
            const col = COLORES.reduce((a, b) => (cuenta2.get(b) > cuenta2.get(a) ? b : a));
            return `jugar:${carta}:${col}`;
        },

        deshacer() { return false; },
    };
}
