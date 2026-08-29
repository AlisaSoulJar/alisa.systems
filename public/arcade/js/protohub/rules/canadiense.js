/**
 * canadiense.js — el parchís que se juega con CARTAS, no con dado
 * ═══════════════════════════════════════════════════════════════════════════
 * Mismo tablero que `parchis.js` —recorrido común, casa, pasillo, comer— pero el
 * movimiento no lo decide un dado: lo decide una carta de TU MANO. Y ahí está
 * todo lo que este juego viene a probar.
 *
 * ⚠️ POR QUÉ ESTE JUEGO ENTRA EN EL BANCO DE PRUEBAS
 *
 * Hasta hoy las dos familias de motor iban por separado: los de TABLERO publican
 * `rejilla` y `piezas` (parchís, sokoban, flota) y los de CARTAS publican `zonas`
 * (remigio, brisca, unit). `montarMesa.js` incluso elige el motor y el
 * visualizador con esa frontera: «zonas y ninguna rejilla ⇒ es de cartas». Nadie
 * había escrito un juego que usara **las dos a la vez**, así que nadie sabía si
 * la frontera era una propiedad del motor o una casualidad de los treinta y dos
 * juegos que había. Éste es el caso de prueba.
 *
 * Y la diferencia con el parchís no es cosmética. Un dado es azar PÚBLICO: sale
 * un 5, todos lo ven, y la única decisión es qué ficha lo gasta. Una mano es azar
 * PRIVADO y ACUMULADO: tienes cuatro cartas, el rival no sabe cuáles, y la
 * decisión no es sólo «qué ficha» sino «qué carta gasto ahora y cuál me guardo».
 * Guardarse el as para sacar ficha, o la jota para cuando el rival esté a tiro,
 * es una jugada que en el parchís no existe porque no hay nada que guardar.
 *
 * ⚠️⚠️ ESTAS REGLAS SON LAS NUESTRAS. NO SON «LAS» REGLAS.
 *
 * Este juego existe de verdad y con muchos nombres —Tock, Toc, Dog, Pachisi con
 * cartas—, y las variantes regionales NO coinciden entre sí: en unas el rey
 * también saca de casa, en otras el siete se puede repartir entre tres fichas, en
 * otras el as vale once. Aquí no se finge autoridad sobre ninguna. Lo que sigue
 * es UNA versión coherente, elegida para que cada carta tenga una decisión
 * detrás, y se declara entera para que nadie compare un marcador de aquí con el
 * de otra implementación creyendo que son el mismo juego:
 *
 *     AS         saca una ficha de casa, O avanza 1
 *     2 3 5 6    avanzan su número
 *     4          RETROCEDE 4 — y por eso es la mejor carta del mazo (ver abajo)
 *     7          avanza 7 con una ficha, O se reparte entre DOS fichas tuyas
 *     8 9 10     avanzan su número
 *     J (11)     INTERCAMBIA una ficha tuya con una del rival, las dos en el
 *                recorrido común y ninguna en un seguro
 *     Q (12)     avanza 12
 *     K (13)     saca una ficha de casa, O avanza 13
 *
 * ⚠️ QUE EL REY TAMBIÉN SAQUE DE CASA NO ES ADORNO: LO PIDIÓ UNA MEDIDA.
 * La primera versión sólo dejaba salir con el as, y se midió lo que eso hace:
 * con las cuatro fichas en casa —o sea el arranque de TODAS las partidas, y cada
 * vez que te comen— el **89 % de los turnos no tenía ninguna jugada posible** y
 * había que tirar una carta y pasar. En el total, 12.355 descartes forzados
 * contra 12.193 jugadas de verdad: el verbo más frecuente del juego era «no
 * puedo». Un juego en el que la mitad de los turnos no se decide nada no mide a
 * nadie, y encima el fallo no da error: la partida corre, termina y verifica.
 * Con el rey abriendo también, las cartas de salida pasan de 4 a 8 de 52.
 *
 *     · Se juega UNA carta por turno y se roba UNA al final. Mano de cinco.
 *     · Si ninguna de tus cartas tiene jugada legal, tiras una y pasas. Sólo
 *       entonces: no puedes deshacerte de una carta mala cuando te venía bien.
 *     · Al pasillo se entra justo, sin pasarse, como en el parchís.
 *     · No se repite turno por nada. El dado premiaba el 6; aquí el premio es
 *       tener buena mano, y premiar además sería premiar dos veces.
 *     · Cuando se acaba el mazo se rebaraja el descarte. Una partida sin fin no
 *       puede pasar porque hay tope de turnos declarado (`TOPE_TURNOS`).
 *
 * ⚠️ POR QUÉ EL 4 RETROCEDE, QUE PARECE UN CASTIGO Y ES UN REGALO
 * Tu ficha recién sacada está en tu casilla de salida, o sea en el paso 0 de 75.
 * Retroceder 4 desde ahí te deja en el paso 64: a cuatro casillas del pasillo. El
 * contador y la geometría dicen lo mismo —`(pos - 4 + 68) % 68`— porque el
 * recorrido es un anillo y dar cuatro pasos hacia atrás desde tu salida es
 * quedarte cuatro casillas ANTES de tu entrada. No es un truco de aritmética: es
 * la razón por la que en este juego un 4 vale más que un rey.
 *
 * ⚠️ EL SIETE SE PARTE, Y ESO OBLIGA A MIRAR DOS FICHAS
 * `dividir:7♦:0:3:2` mueve 3 con la ficha 0 y 4 con la ficha 2. Es la única carta
 * que puede meter una en meta Y comer con otra en el mismo turno, y la única que
 * pide pensar en pareja. Las dos mitades se validan por separado contra el
 * tablero de AHORA y se aplican en orden; lo único que se prohíbe es que las dos
 * acaben en la misma casilla del recorrido común.
 *
 * ⚠️ SALIR PRIMERO VALE MÁS AQUÍ QUE EN EL PARCHÍS. MEDIDO, Y HAY QUE SABERLO.
 * Con los cuatro asientos jugando la MISMA política de la casa, 600 partidas:
 *
 *     parchís (dado)      155 · 150 · 146 · 149      ≈ 25 % cada uno
 *     canadiense (cartas) 186 · 138 · 138 · 137      31 % el primero
 *
 * O sea seis puntos de ventaja por sentarse en el asiento 0. No es un fallo: en
 * una carrera, mover antes es mover antes, y el dado lo disimula porque repite
 * turno con el 6 y mete ruido de sobra. Aquí no hay repetición y el orden pesa.
 * Se dice porque un banco de pruebas que compare dos agentes SIN rotar los
 * asientos estaría midiendo dónde se sentaron, y eso no daría ningún error: daría
 * una tabla ordenada, creíble y falsa.
 *
 * ⚠️ LOS VALORES SE DERIVAN DE LA BIBLIOTECA, NO SE ESCRIBEN A MANO
 * `valorDe` es `ranks.indexOf(rango) + 2`, que sobre el orden de la biblioteca
 * francesa da 2→2 … K→13, A→14. Las tres reglas especiales se declaran por VALOR
 * (4 retrocede, 7 se parte, 11 intercambia) y las dos cartas que abren casa son
 * «el último rango» y «el penúltimo» —el as y el rey—, que es como la biblioteca
 * ordena las barajas: está escrito en `remigio.js`. Si un día la baraja cambia de
 * rangos, esto la sigue en vez de mentir en silencio.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { mulberry32, barajar, revuelto } from './azar.js';
import { RUTA_BIBLIOTECA, rango, cargarBaraja, cartasDe } from './baraja.js';

/** El recorrido común. 68 es el del tablero de verdad, igual que en el parchís. */
const VUELTA = 68;
/** El pasillo de llegada de cada color, ya fuera del recorrido común. */
const PASILLO = 7;
/** Dónde entra cada color al recorrido, repartidos a la misma distancia. */
const SALIDA = [0, 17, 34, 51];
/**
 * Casillas de SEGURO: en ellas no te comen, y tampoco te pueden intercambiar con
 * la jota. Se calculan de las salidas y no se escriben a mano.
 */
const SEGUROS = new Set(SALIDA.flatMap(s => [s, (s + 8) % VUELTA]));

const CASA = -1, META = 100;
/** El paso final: caer justo aquí es meta. Se deriva, no se escribe. */
const FINAL = VUELTA + PASILLO;

/**
 * ⚠️ TOPE DE TURNOS, DECLARADO Y NO ESCONDIDO.
 *
 * Con el mazo rebarajándose una partida podría no acabar nunca: cuatro jugadores
 * comiéndose entre ellos pueden quedarse dando vueltas. El parchís de dado no
 * tiene este problema porque nadie guarda nada. Aquí se pone un techo y se dice
 * cuál es — una partida que llega al tope termina SIN ganador y puntúa por lo
 * avanzado, que es lo que la métrica mide de todas formas.
 *
 * El número sale de medir, no de la intuición. Sobre 1.200 partidas (400 semillas
 * × tres políticas: la casa en las cuatro sillas, la casa contra la línea base
 * tonta, y la línea base en las cuatro):
 *
 *     mediana 227–265 jugadas · p95 297–434 · máximo observado 546 · al tope 0
 *
 * O sea que el techo no muerde nunca en el juego normal: es la red por debajo,
 * no una regla que se note. Si algún día se toca la mano, el reparto o el número
 * de fichas, hay que volver a medir esto — un tope que empieza a morder cambia
 * el juego en silencio y todas las partidas seguirían verificando igual.
 */
const TOPE_TURNOS = 600;

/**
 * @param {Object} opts
 * @param {string} opts.url        ruta a `card_library.json`. ⚠️ SE PASA. Aceptar
 *                                 el parámetro y no usarlo ya costó un fallo mudo
 *                                 en esta casa: el servidor repartía con una
 *                                 baraja y el navegador con otra, y todo verde.
 * @param {number} opts.jugadores  4, los cuatro colores del tablero
 * @param {number} opts.fichas     4 por color
 * @param {number} opts.mano       5 cartas. ⚠️ ELEGIDO MIDIENDO, no a ojo: con 4
 *                                 la casa saca 400,5 contra 200,5 de la línea
 *                                 base tonta (×2,00) y con 5 saca 420,4 contra
 *                                 169,4 (×2,48). Con 6 no mejora (×2,46) y sólo
 *                                 engorda la lista de jugadas legales. Cuantas
 *                                 más cartas tienes, más pesa elegir bien — que
 *                                 es exactamente lo que este juego mide.
 *
 * ⚠️ EL TABLERO Y LAS FICHAS SON LOS MISMOS QUE LOS DE `parchis.js`, A PROPÓSITO.
 * 68 casillas, pasillo de 7, cuatro colores, cuatro fichas, los mismos seguros.
 * Así los dos juegos se diferencian en UNA sola cosa —el dado contra la mano— y
 * comparar un agente en los dos mide justo eso y nada más. Cambiar además el
 * tablero habría hecho imposible saber a qué se debía la diferencia.
 */
export async function crearCanadiense({ url = RUTA_BIBLIOTECA, jugadores = 4,
                                        fichas = 4, mano = 5 } = {}) {
    const baraja = await cargarBaraja('french_52', url);

    /**
     * ⚠️ FALLAR ALTO, NO BAJO — la misma disciplina que `cargarBaraja`.
     * Con una baraja de menos de trece rangos los valores especiales (4, 7, 11)
     * no existirían y el juego seguiría corriendo: sin retroceso, sin división y
     * sin intercambio, o sea otro juego con el mismo nombre. Eso es exactamente
     * el fallo que da verde y miente.
     */
    if (baraja.ranks.length < 13) {
        throw new Error(`canadiense necesita 13 rangos y '${baraja.ranks.length}' no bastan`);
    }

    /** El valor de una carta. Derivado del orden de la biblioteca. */
    const valorDe = (c) => baraja.ranks.indexOf(rango(c)) + 2;
    /** El as es el último rango de la biblioteca (así las ordena el catálogo). */
    const VALOR_AS = baraja.ranks.length + 1;
    /** Y el rey el penúltimo. Las dos abren casa — ver la medida de la cabecera. */
    const VALOR_REY = baraja.ranks.length;
    const ABREN_CASA = new Set([VALOR_AS, VALOR_REY]);
    /** La carta que intercambia. En la francesa es la jota. */
    const VALOR_JOTA = 11;
    const VALOR_ATRAS = 4;
    const VALOR_PARTIBLE = 7;
    /** Lo que avanza una carta que no tiene regla propia. El as vale 1. */
    const avanceDe = (c) => (valorDe(c) === VALOR_AS ? 1 : valorDe(c));

    /** La casilla del tablero común donde se ve una ficha, o null. */
    const casillaDe = (color, pos) =>
        (pos >= 0 && pos < VUELTA) ? (SALIDA[color] + pos) % VUELTA : null;

    /** ¿Está esta ficha en el recorrido común (ni en casa, ni en pasillo, ni en meta)? */
    const enComun = (f) => f.pos >= 0 && f.pos < VUELTA;

    const índicesDe = (p, color) =>
        p.fichas.map((f, i) => (f.color === color ? i : -1)).filter(i => i >= 0);

    /** Todas las fichas del rival que están en una casilla común y comibles. */
    function comibles(p, color, casilla) {
        if (casilla === null || SEGUROS.has(casilla)) return [];
        const out = [];
        p.fichas.forEach((f, i) => {
            if (f.color === color) return;
            if (casillaDe(f.color, f.pos) === casilla) out.push(i);
        });
        return out;
    }

    /**
     * ¿Puede el color `color` ocupar el paso `destino`?
     *
     * Dos fichas propias no se apilan en el recorrido común. En el pasillo sí se
     * permite, igual que en `parchis.js`: bloquearlo también allí deja partidas
     * atascadas al final, que es cuando menos se puede permitir.
     *
     * `excepto` es para el siete partido: la ficha compañera se va a mover en el
     * mismo turno, así que no cuenta como obstáculo.
     */
    const libre = (p, color, destino, excepto = -1) =>
        destino >= VUELTA ||
        !p.fichas.some((f, k) => k !== excepto && f.color === color && f.pos === destino);

    /** A dónde llega una ficha avanzando `v`, o null si no puede. */
    function destinoAdelante(p, i, v, excepto = -1) {
        const f = p.fichas[i];
        if (f.pos === CASA || f.pos === META) return null;
        const d = f.pos + v;
        // Al pasillo se entra justo. Es lo que hace que el final sea una decisión.
        if (d > FINAL) return null;
        if (!libre(p, f.color, d, excepto)) return null;
        return d;
    }

    /** A dónde llega retrocediendo `v`. Sólo desde el recorrido común. */
    function destinoAtras(p, i, v) {
        const f = p.fichas[i];
        if (!enComun(f)) return null;
        const d = (f.pos - v + VUELTA) % VUELTA;
        if (!libre(p, f.color, d)) return null;
        return d;
    }

    /** Los dos pasos nuevos de un intercambio, o null si no es legal. */
    function intercambio(p, i, k) {
        const fi = p.fichas[i], fk = p.fichas[k];
        if (fi.color === fk.color) return null;          // la jota ataca, no ordena
        if (!enComun(fi) || !enComun(fk)) return null;
        const ci = casillaDe(fi.color, fi.pos), ck = casillaDe(fk.color, fk.pos);
        // De un seguro no se saca a nadie, y a un seguro no se llega por la puerta
        // de atrás: si valiera, la casilla de salida dejaría de proteger.
        if (SEGUROS.has(ci) || SEGUROS.has(ck)) return null;
        const nuevoI = (ck - SALIDA[fi.color] + VUELTA) % VUELTA;
        const nuevoK = (ci - SALIDA[fk.color] + VUELTA) % VUELTA;
        // El intercambio tampoco puede apilar dos fichas del mismo color.
        if (!libre(p, fi.color, nuevoI, i) || !libre(p, fk.color, nuevoK, k)) return null;
        return { nuevoI, nuevoK };
    }

    /** Las jugadas que permite UNA carta concreta de la mano de `color`. */
    function jugadasDeCarta(p, color, carta) {
        const v = valorDe(carta);
        const míos = índicesDe(p, color);
        const out = [];

        if (ABREN_CASA.has(v)) {
            // Sacar de casa: a la salida, y sólo si no la ocupa una tuya.
            for (const i of míos) {
                if (p.fichas[i].pos !== CASA) continue;
                if (!libre(p, color, 0)) break;      // la salida es una sola
                out.push(`sacar:${carta}:${i}`);
            }
            // …y además avanzan, que es lo que las hace difíciles de guardar: el
            // as vale 1 y el rey 13, así que el precio de reservarla no es el mismo.
            for (const i of míos) {
                if (destinoAdelante(p, i, avanceDe(carta)) !== null) out.push(`jugar:${carta}:${i}`);
            }
            return out;
        }

        if (v === VALOR_JOTA) {
            const rivales = p.fichas.map((f, k) => k).filter(k => p.fichas[k].color !== color);
            for (const i of míos) {
                for (const k of rivales) {
                    if (intercambio(p, i, k)) out.push(`cambiar:${carta}:${i}:${k}`);
                }
            }
            return out;
        }

        if (v === VALOR_ATRAS) {
            for (const i of míos) {
                if (destinoAtras(p, i, VALOR_ATRAS) !== null) out.push(`jugar:${carta}:${i}`);
            }
            return out;
        }

        if (v === VALOR_PARTIBLE) {
            for (const i of míos) {
                if (destinoAdelante(p, i, VALOR_PARTIBLE) !== null) out.push(`jugar:${carta}:${i}`);
            }
            /**
             * ⚠️ EL ORDEN DEL SIETE PARTIDO IMPORTA, Y POR ESO LA JUGADA LO DICE.
             *
             * Se mueve primero `i` y después `k`, así que las dos mitades NO se
             * comprueban igual: cuando aterriza `i`, la compañera sigue en su
             * casilla y sí estorba (`excepto: -1`); cuando aterriza `k`, `i` ya se
             * ha ido y no cuenta (`excepto: i`). Comprobarlas simétricamente sería
             * la clase de fallo que no da error — dos fichas del mismo color en la
             * misma casilla, y el tablero sigue tan campante.
             *
             * Y no se pierde ninguna jugada legal por elegir un orden: los pares
             * se enumeran ORDENADOS, así que si `i` antes de `k` no vale, ahí está
             * `dividir:carta:k:…:i` para probar el otro sentido.
             */
            for (const i of míos) {
                for (let a = 1; a < VALOR_PARTIBLE; a++) {
                    const di = destinoAdelante(p, i, a, -1);
                    if (di === null) continue;
                    for (const k of míos) {
                        if (k === i) continue;
                        const dk = destinoAdelante(p, k, VALOR_PARTIBLE - a, i);
                        if (dk === null) continue;
                        // Lo único prohibido: que las dos acaben en la misma casilla.
                        if (di === dk && di < VUELTA) continue;
                        out.push(`dividir:${carta}:${i}:${a}:${k}`);
                    }
                }
            }
            return out;
        }

        for (const i of míos) {
            if (destinoAdelante(p, i, v) !== null) out.push(`jugar:${carta}:${i}`);
        }
        return out;
    }

    /**
     * Las jugadas legales de QUIEN TIENE EL TURNO.
     *
     * ⚠️ De quien tiene el turno, no de quien mira. La convención está escrita en
     * `bazas.js` y repetida en `remigio.js`: `legal_moves` depende del TURNO y no
     * del asiento, y la fuga se tapa en el árbitro, que es el único que sabe quién
     * está sentado dónde. Inventar aquí una convención distinta —devolver lista
     * vacía cuando no es tu turno— deja el juego «muerto de pie»: sin jugadas
     * legales y sin terminar, un estado del que una partida no sale.
     */
    function legales(p) {
        if (p.fin) return [];
        const mi = p.manos[p.turno];
        // Sin cartas no hay jugada posible; se pasa y se roba. No debería pasar
        // —siempre se roba al final del turno— pero un juego que se queda sin
        // opciones y sin final es justo lo que caza `prueba_reglas.mjs`.
        if (!mi.length) return ['pasar'];

        const out = [];
        for (const c of mi) out.push(...jugadasDeCarta(p, p.turno, c));
        if (out.length) return out;

        // Nada jugable: tiras una y pasas. Sólo AQUÍ, que si no el descarte sería
        // una válvula para deshacerse de la carta que no te conviene.
        return mi.map(c => `descartar:${c}`);
    }

    /** Deja la ficha en su destino y come lo que hubiera. Ya validado. */
    function aterrizar(p, i, destino) {
        const f = p.fichas[i];
        f.pos = destino === FINAL ? META : destino;
        for (const k of comibles(p, f.color, casillaDe(f.color, f.pos))) {
            p.fichas[k].pos = CASA;
            p.comidas++;
        }
    }

    /**
     * Roba hasta completar la mano. Si el mazo se acaba, se rebaraja el descarte.
     *
     * ⚠️ CONSUME AZAR, Y POR ESO SÓLO SE LLAMA DESDE EL CAMINO ACEPTADO DE
     * `mover()`. Ver la nota de la cabecera de `parchis.js`: si el azar se gastara
     * en una jugada que luego se rechaza, la re-simulación del verificador iría
     * desfasada y acabaría **rechazando partidas legítimas**.
     */
    function robar(p, pid) {
        while (p.manos[pid].length < mano) {
            if (!p.mazo.length) {
                if (p.descarte.length <= 1) break;       // no queda nada que rebarajar
                // La última tirada se queda a la vista: es información pública y
                // el montón tiene que seguir teniendo cara.
                const cima = p.descarte.pop();
                p.mazo = barajar(p.descarte, p._rnd);
                p.descarte = [cima];
                p.rebarajadas++;
            }
            if (!p.mazo.length) break;
            p.manos[pid].push(p.mazo.pop());
        }
    }

    /** Cierra el turno: la carta al descarte, se roba y pasa al siguiente. */
    function cerrarTurno(p, pid, carta) {
        if (carta) {
            const k = p.manos[pid].indexOf(carta);
            if (k >= 0) p.manos[pid].splice(k, 1);
            p.descarte.push(carta);
        }
        robar(p, pid);
        p.turnos++;
        if (p.turnos >= TOPE_TURNOS) p.fin = true;       // tope declarado, ver arriba
        if (!p.fin) p.turno = (p.turno + 1) % jugadores;
    }

    const metidas = (p, c) => p.fichas.filter(f => f.color === c && f.pos === META).length;
    const avance  = (p, c) => p.fichas
        .filter(f => f.color === c)
        .reduce((s, f) => s + (f.pos === CASA ? 0 : f.pos === META ? FINAL : f.pos), 0);

    return {

        /** A que se juega, para quien no ve la mesa. Lo publica ProtoHub.state. */

        OBJETIVO: 'Objetivo: llevar tus fichas a casa antes que nadie; aqui las cartas mandan sobre el dado.',
        // CUÁNTAS SILLAS TIENE LA MESA. Sale de `jugadores` (por defecto 4,
        // los cuatro colores, igual que el parchís). Se cruza contra
        // `marcador` en `estado()`.
        ASIENTOS: jugadores,
        nombre: 'canadiense',

        nuevaPartida(opts = {}) {
            const semilla = (opts.semilla ?? opts.seed ?? Date.now()) >>> 0;
            // ⚠️ UN SOLO HILO DE AZAR para el reparto y para las rebarajas. Con dos
            // generadores habría que sembrar los dos y acordarse de los dos; con uno,
            // `{juego, semilla, jugadas}` reconstruye la partida entera.
            const _rnd = mulberry32(semilla);
            const cartas = barajar(cartasDe(baraja), _rnd);

            const p = {
                semilla, jugadores, fichas: [], manos: [],
                mazo: [], descarte: [],
                turno: 0, turnos: 0, jugadas: [], fin: false, ganador: null,
                comidas: 0, rebarajadas: 0,
                biblioteca: baraja.biblioteca,
                _rnd,
            };
            for (let c = 0; c < jugadores; c++) {
                for (let k = 0; k < fichas; k++) p.fichas.push({ color: c, pos: CASA });
            }
            for (let c = 0; c < jugadores; c++) p.manos.push(cartas.splice(0, mano));
            // Una carta boca arriba para que el descarte tenga cara desde el
            // principio: si no, el primer turno el montón «no existe» y la mesa
            // dibuja un hueco donde luego habrá algo.
            p.descarte.push(cartas.pop());
            p.mazo = cartas;
            return p;
        },

        /**
         * ⚠️ `asiento` NO ES `turno`. Publicar la mano del asiento 0 a quien mira
         * desde el 1 le enseña las cartas al rival, y eso ya se ha escapado dos
         * veces en esta casa en silencio: la partida seguía, los turnos iban bien
         * y el recibo verificaba. De los demás sólo sale CUÁNTAS cartas tienen.
         */
        estado(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && p.manos[asiento] ? asiento : 0;

            /**
             * ⚠️ EL MARCADOR PUNTÚA LO LEJOS QUE HAS LLEGADO, no sólo si ganaste.
             * El aviso viene de `sokoban.js` y se repite en `parchis.js`: en una
             * carrera de cuatro se pierde tres de cada cuatro veces, y si sólo
             * contara ganar, tres agentes distintos empatarían a cero y la tabla no
             * ordenaría nada. Aquí además hay tope de turnos, así que hay partidas
             * en las que NADIE mete las cuatro — y aun así hay que poder ordenarlas.
             */
            const puntos = p.ganador === yo
                ? 500 + avance(p, yo)
                : avance(p, yo) + metidas(p, yo) * 50;
            // ⚠️ MISMA FÓRMULA, UNA POR ASIENTO. `p.ganador` es un único color o
            // `null` (tope de turnos), así que como mucho un `c` cae en la rama
            // de los 500; el resto en avance+metidas. Patrón de `bazas.js`.
            const marcador = Array.from({ length: jugadores }, (_, c) =>
                p.ganador === c ? 500 + avance(p, c) : avance(p, c) + metidas(p, c) * 50);

            return {
                juego: 'canadiense',
                asiento: yo,
                // Tu mano, entera. La de los demás, sólo el número.
                mano: [...p.manos[yo]],
                manos_rivales: p.manos.filter((_, i) => i !== yo).map(m => m.length),
                mazo_restante: p.mazo.length,
                descarte: p.descarte[p.descarte.length - 1] ?? null,
                descarte_restante: p.descarte.length,
                rebarajadas: p.rebarajadas,
                // El tablero es PÚBLICO: dónde está cada ficha lo ve todo el mundo,
                // y es la mitad del juego. Lo oculto son las cartas, nada más.
                mis_fichas: p.fichas.filter(f => f.color === yo).map(f => f.pos),
                posiciones: Array.from({ length: jugadores }, (_, c) =>
                    p.fichas.filter(f => f.color === c).map(f => f.pos)),
                metidas: Array.from({ length: jugadores }, (_, c) => metidas(p, c)),
                avance: Array.from({ length: jugadores }, (_, c) => avance(p, c)),
                comidas: p.comidas,
                seguros: [...SEGUROS],
                turnos: p.turnos,
                tope_turnos: TOPE_TURNOS,
                marcador,
                puntos,
                score: puntos,
                turn: p.turno === yo ? 'player' : `cpu${p.turno}`,
                semilla: p.semilla,
                biblioteca: p.biblioteca,
                legal_moves: legales(p),
                is_game_over: p.fin,
                desenlace: !p.fin ? null
                    : (p.ganador === null ? 'se acabaron los turnos'
                       : p.ganador === yo ? 'ganaste' : `ganó ${p.ganador}`),
            };
        },

        /**
         * ⚠️ SE VALIDA TODO ANTES DE TOCAR NADA.
         *
         * `legales()` sólo emite jugadas enteramente legales, así que comprobar
         * contra la lista ES la validación completa — y ocurre antes de mover una
         * ficha, antes de descartar y, sobre todo, antes de robar. Robar consume
         * `p._rnd`; si se robara y luego se devolviera `false`, la partida viva y
         * la re-simulación del verificador quedarían desfasadas y el verificador
         * acabaría rechazando partidas legítimas de gente honesta.
         */
        mover(p, jugada) {
            const j = String(jugada ?? '');
            if (j === 'nueva' || j === 'reset' || p.fin) return false;
            if (!legales(p).includes(j)) return false;

            const pid = p.turno;
            const partes = j.split(':');
            const verbo = partes[0];

            if (verbo === 'pasar') {
                cerrarTurno(p, pid, null);
                p.jugadas.push(j);
                return true;
            }

            const carta = partes[1];

            if (verbo === 'descartar') {
                cerrarTurno(p, pid, carta);
                p.jugadas.push(j);
                return true;
            }

            if (verbo === 'sacar') {
                aterrizar(p, Number(partes[2]), 0);
            } else if (verbo === 'cambiar') {
                const i = Number(partes[2]), k = Number(partes[3]);
                const { nuevoI, nuevoK } = intercambio(p, i, k);
                // Se intercambian de casilla y no se comen: la jota mueve, no mata.
                p.fichas[i].pos = nuevoI;
                p.fichas[k].pos = nuevoK;
                p.intercambios = (p.intercambios ?? 0) + 1;
            } else if (verbo === 'dividir') {
                const i = Number(partes[2]), a = Number(partes[3]), k = Number(partes[4]);
                // Primero una y después la otra, con la compañera excluida del test
                // de apilamiento: las dos mitades se comprobaron contra el tablero
                // de antes y lo único que podía chocar —el mismo destino— ya se
                // descartó al generar la jugada.
                aterrizar(p, i, destinoAdelante(p, i, a, k));
                aterrizar(p, k, destinoAdelante(p, k, VALOR_PARTIBLE - a, -1));
            } else {                                   // 'jugar'
                const i = Number(partes[2]);
                aterrizar(p, i, valorDe(carta) === VALOR_ATRAS
                    ? destinoAtras(p, i, VALOR_ATRAS)
                    : destinoAdelante(p, i, avanceDe(carta)));
            }

            if (metidas(p, pid) === fichas) {
                p.fin = true;
                p.ganador = pid;
            }

            cerrarTurno(p, pid, carta);
            p.jugadas.push(j);
            return true;
        },

        /**
         * El rival de la casa.
         *
         * Come si puede, mete en meta si puede, saca de casa —una ficha en casa no
         * juega y no puntúa nunca— y si no, adelanta lo que más avance neto dé. El
         * retroceso del 4 sale bien sin caso especial: el destino ES el contador de
         * pasos, así que retroceder desde la salida da 64 y el heurístico lo ve
         * como el avance enorme que de verdad es.
         *
         * ⚠️ Y DEJA TECHO A PROPÓSITO, que es lo que se le pide a un rival de banco
         * de pruebas. No guarda cartas para después —que es la decisión NUEVA que
         * este juego trae y la que separa a un agente bueno de uno correcto—, no
         * mira si deja una ficha a tiro y no cuenta las cartas que han salido.
         *
         * ⚠️ NO CONSUME `p._rnd`. Esto se llama fuera de la secuencia de jugadas;
         * si gastara azar, pedir consejo cambiaría la partida. Para desempatar usa
         * un hash sin estado de la semilla y el número de jugadas, como `frentes.js`.
         */
        sugerencia(p) {
            const opciones = legales(p);
            if (!opciones.length) return null;
            if (opciones.length === 1) return opciones[0];

            const come = (color, destino) =>
                comibles(p, color, casillaDe(color, destino)).length;

            const valor = (m) => {
                const t = m.split(':');
                const carta = t[1];
                if (t[0] === 'pasar' || t[0] === 'descartar') return -1000;
                if (t[0] === 'sacar') return 900;                  // sacar es prioritario
                if (t[0] === 'cambiar') {
                    const i = Number(t[2]), k = Number(t[3]);
                    const { nuevoI, nuevoK } = intercambio(p, i, k);
                    // Lo que gano yo más lo que pierde él: las dos mitades cuentan.
                    return (nuevoI - p.fichas[i].pos) + (p.fichas[k].pos - nuevoK);
                }
                if (t[0] === 'dividir') {
                    const i = Number(t[2]), a = Number(t[3]), k = Number(t[4]);
                    const di = destinoAdelante(p, i, a, k);
                    const dk = destinoAdelante(p, k, VALOR_PARTIBLE - a, -1);
                    return (come(p.fichas[i].color, di) + come(p.fichas[k].color, dk)) * 1000
                         + (di === FINAL ? 400 : 0) + (dk === FINAL ? 400 : 0)
                         + VALOR_PARTIBLE;
                }
                const i = Number(t[2]);
                const d = valorDe(carta) === VALOR_ATRAS
                    ? destinoAtras(p, i, VALOR_ATRAS)
                    : destinoAdelante(p, i, avanceDe(carta));
                if (d === null) return -1000;
                return come(p.fichas[i].color, d) * 1000
                     + (d === FINAL ? 400 : 0)
                     + (d - p.fichas[i].pos + VUELTA) % VUELTA;   // avance neto en el anillo
            };

            const mezcla = revuelto(p.semilla ^ p.jugadas.length);
            const vals = opciones.map(m => ({ m, v: valor(m) }));
            const maxV = vals.reduce((M, x) => Math.max(M, x.v), -Infinity);
            const best = vals.filter(x => x.v === maxV);
            return best[mezcla % best.length].m;
        },

        /**
         * ⚠️ EL PUNTO DEL EXPERIMENTO: LAS TRES ESTRUCTURAS, Y LAS DOS FAMILIAS.
         *
         * `rejilla` + `piezas` son el tablero, como en el parchís. `zonas` son la
         * mano, las manos tapadas de los rivales, el mazo, el descarte y las fichas
         * que esperan en casa — o sea todo lo que en los juegos de cartas ES el
         * juego. Es el primero que publica las dos cosas a la vez, que era la
         * pregunta: si la frontera «zonas sin rejilla ⇒ cartas» de `montarMesa.js`
         * era una propiedad o una casualidad de los treinta y dos que había.
         */
        sustrato(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && p.manos[asiento] ? asiento : 0;

            /**
             * ⚠️ EL RECORRIDO ES UN ANILLO, Y EL VOCABULARIO NO ME LO INVENTO YO:
             * 0 vacío · 1 muro · 2 destino, que es lo que leen `pintar2d.js` y
             * `pintar3d.js`. `parchis.js` lo aprendió por las malas —extendió las 68
             * casillas en fila y las marcó con `1`, y el tablero salió como un
             * macizo de cubos oscuros— y aquí se copia su solución: 18×18 tiene
             * exactamente 4·18−4 = 68 celdas de perímetro, así que el anillo cae
             * redondo sin inventarse un tamaño.
             *
             * Sí, esto está duplicado con `parchis.js`. Es duplicación consciente y
             * de un solo turno: extraer el anillo a un módulo común tocaría un
             * tercer fichero, y hoy toca no pisar a nadie. Cuando entre el tercer
             * juego de tablero circular, ése es el momento de sacarlo —igual que se
             * hizo con `azar.js` y `baraja.js`, y por el mismo motivo.
             */
            const LADO = 18;
            const anillo = (i) => {
                if (i < LADO) return { x: i, y: 0 };                                // arriba →
                if (i < LADO * 2 - 1) return { x: LADO - 1, y: i - LADO + 1 };       // derecha ↓
                if (i < LADO * 3 - 2) return { x: LADO * 3 - 3 - i, y: LADO - 1 };   // abajo ←
                return { x: 0, y: LADO * 4 - 4 - i };                                // izquierda ↑
            };

            const celdas = new Array(LADO * LADO).fill(1);      // 1 = muro: no se pisa
            for (let c = 0; c < VUELTA; c++) {
                const { x, y } = anillo(c);
                celdas[y * LADO + x] = SEGUROS.has(c) ? 2 : 0;  // 2 = seguro · 0 = pista
            }

            const piezas = [];
            for (const f of p.fichas) {
                const casilla = casillaDe(f.color, f.pos);
                if (casilla === null) continue;         // en casa o en meta: no se pinta
                const { x, y } = anillo(casilla);
                piezas.push({ x, y, t: 'ficha', de: f.color });
            }

            const zonas = [
                { id: 'mano', de: yo, items: [...p.manos[yo]], ocultas: 0 },
                // ⚠️ Lo oculto se MARCA, no se omite: si la zona del rival no
                // existiera, el dibujo diría que no tiene cartas. Es la mentira que
                // `sustrato.js` documenta haber cometido con el póker.
                ...p.manos
                    .map((m, i) => ({ i, n: m.length }))
                    .filter(x => x.i !== yo)
                    .map(x => ({ id: 'mano', de: x.i, items: [], ocultas: x.n })),
            ];
            if (p.descarte.length) {
                zonas.push({ id: 'descarte', de: null,
                             items: [p.descarte[p.descarte.length - 1]],
                             ocultas: p.descarte.length - 1 });
            }
            if (p.mazo.length) {
                zonas.push({ id: 'mazo', de: null, items: [], ocultas: p.mazo.length });
            }
            // Y las fichas que esperan en casa: no están en ninguna casilla, así que
            // no son piezas del tablero sino un montón al lado. Cuántas te quedan
            // por sacar es información pública que decide el juego. Sin esto, la
            // primera jugada se ve sobre un tablero vacío.
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
