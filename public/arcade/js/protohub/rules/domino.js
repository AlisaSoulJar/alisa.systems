/**
 * domino.js — el primero donde DÓNDE puede ir una pieza depende de QUÉ es
 * ═══════════════════════════════════════════════════════════════════════════
 * Doble-seis: veintiocho fichas, siete cada uno, el resto al pozo. En tu turno
 * pones una ficha en una de las dos puntas de la cadena, si encaja. Si no tienes
 * ninguna que encaje, robas del pozo hasta que salga una; si el pozo se acaba,
 * pasas. Gana quien se queda sin fichas, o —si nadie puede— el de menos puntos.
 *
 * ⚠️ POR QUÉ ESTE JUEGO ENTRA EN EL BANCO DE PRUEBAS
 *
 * Los treinta y cinco anteriores colocan piezas en sitios LIBRES: una casilla
 * vacía, un hueco de la caja de entropy, un asiento. La legalidad es «¿está
 * ocupado?».
 *
 * Aquí no. El 6:3 sólo entra si en una punta hay un 6 o un 3, y entra en un
 * sentido u otro según cuál. La legalidad es un EMPAREJAMIENTO, y el sitio donde
 * acaba la ficha no lo decide quien juega: lo decide la forma de lo que ya hay.
 * «Unas cosas encajan y otras no» es el juego entero, y no lo mide ningún otro de
 * la casa.
 *
 * Idea de Oscar, y con el motivo dicho: quería un caso que enseñara a posicionar.
 *
 * ⚠️ Y SIN EMBARGO EL ESPACIO DE ACCIONES ES DIMINUTO
 *
 * Por muchas fichas que tengas, la cadena sólo tiene DOS puntas. Así que las
 * jugadas legales son `jugar:6-3:izq`, `jugar:6-3:der`, `robar` y `pasar` — cabe
 * en `legal_moves` sin retorcer nada y se le cuenta a un modelo en una frase. Es
 * justo lo contrario que el remigio, donde el estado es simple y las jugadas
 * explotan.
 *
 * ⚠️ LA ORIENTACIÓN NO ES UNA JUGADA, ES UNA CONSECUENCIA
 *
 * Tentación: ofrecer `jugar:6-3:izq:volteada`. Sería mentir sobre el juego —
 * puesta una ficha en una punta, el sentido en que casa está determinado— y
 * además duplicaría las acciones sin añadir ni una decisión. Lo que SÍ se publica
 * es cómo quedó (`[a, b]` ya en el orden en que se lee la cadena), porque eso lo
 * necesita quien la dibuja.
 *
 * ⚠️ ROBAR NO ES OPCIONAL, Y POR ESO NO SIEMPRE ES UNA JUGADA
 *
 * En el dominó de pozo se roba OBLIGATORIAMENTE mientras no tengas nada que
 * poner. Ofrecer `robar` cuando ya tienes una ficha jugable convertiría una
 * obligación en una decisión, y entonces sería otro juego —uno donde puedes
 * cavar el pozo buscando la ficha buena—. Así que `robar` sólo aparece cuando no
 * hay ninguna jugada, y `pasar` sólo cuando además el pozo está vacío.
 */

import { mulberry32 } from './azar.js';

/** Doble-seis. Cambiarlo da doble-9 o doble-12, que son variantes de verdad. */
const MAXIMO = 6;

/** `6-3`, siempre con el mayor delante: una ficha es un CONJUNTO, no un par. */
const nombreDe = (a, b) => `${Math.max(a, b)}-${Math.min(a, b)}`;
const valoresDe = (f) => String(f).split('-').map(Number);
const puntosDe = (f) => { const [a, b] = valoresDe(f); return a + b; };

/** Las veintiocho, en orden fijo: el azar entra al barajar, no al construir. */
function todasLasFichas() {
    const out = [];
    for (let a = 0; a <= MAXIMO; a++) for (let b = 0; b <= a; b++) out.push(nombreDe(a, b));
    return out;
}

export async function crearDomino({ jugadores = 2, mano = 7 } = {}) {

    /** Las dos puntas de la cadena, o `null` si está vacía. */
    const puntas = (p) => {
        if (!p.cadena.length) return null;
        return [p.cadena[0].lee[0], p.cadena[p.cadena.length - 1].lee[1]];
    };

    /**
     * ¿Dónde encaja esta ficha? Devuelve los extremos donde entra.
     *
     * Con la cadena vacía entra en cualquier sitio, y se dice `der` a secas: no hay
     * dos puntas todavía, así que ofrecer las dos sería ofrecer la misma jugada dos
     * veces con nombres distintos — y eso le rompe la cuenta a cualquiera que mida
     * ramificación.
     */
    const encajes = (p, ficha) => {
        const [a, b] = valoresDe(ficha);
        const pt = puntas(p);
        if (!pt) return ['der'];
        const out = [];
        if (a === pt[0] || b === pt[0]) out.push('izq');
        if (a === pt[1] || b === pt[1]) out.push('der');
        return out;
    };

    /** Cómo se LEE la ficha una vez puesta en ese extremo. Lo necesita el pintor. */
    const comoQueda = (p, ficha, donde) => {
        const [a, b] = valoresDe(ficha);
        const pt = puntas(p);
        if (!pt) return [a, b];
        if (donde === 'izq') {
            // Se lee hacia la izquierda: el valor que casa va pegado a la cadena.
            return (b === pt[0]) ? [a, b] : [b, a];
        }
        return (a === pt[1]) ? [a, b] : [b, a];
    };

    const jugablesDe = (p, quien) =>
        p.manos[quien].flatMap(f => encajes(p, f).map(d => `jugar:${f}:${d}`));

    return {

        /** A qué se juega, para quien no ve la mesa. Lo publica ProtoHub.state. */
        OBJETIVO: 'Objetivo: quedarte sin fichas. Cada ficha va en una punta que case.',
        ASIENTOS: jugadores,
        nombre: 'domino',

        nuevaPartida(opts = {}) {
            const semilla = (opts.semilla ?? opts.seed ?? Date.now()) >>> 0;
            const rnd = mulberry32(semilla);
            const pozo = todasLasFichas();
            for (let i = pozo.length - 1; i > 0; i--) {
                const j = Math.floor(rnd() * (i + 1));
                [pozo[i], pozo[j]] = [pozo[j], pozo[i]];
            }
            const manos = [];
            for (let i = 0; i < jugadores; i++) manos.push(pozo.splice(0, mano));
            return {
                semilla, jugadores, manos, pozo,
                cadena: [],            // [{ ficha, lee: [a, b] }] de izquierda a derecha
                turno: 0,
                pasesSeguidos: 0,
                historial: [],
                puntos: Array(jugadores).fill(0),
            };
        },

        /**
         * ⚠️ EL FINAL TIENE DOS FORMAS, Y LAS DOS CUENTAN DISTINTO.
         *
         * Se acaba porque alguien se queda sin fichas —«dominó»— o porque nadie puede
         * poner y el pozo está vacío —«cerrado», o tranca—. En el primer caso gana el
         * que cerró; en el segundo, el de menos puntos en la mano. Tratar los dos
         * igual haría que trancar fuera una forma de ganar sin jugar bien.
         */
        estado(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && p.manos[asiento] ? asiento : 0;
            const sinFichas = p.manos.findIndex(m => m.length === 0);
            const trancado = p.pasesSeguidos >= p.jugadores;
            const terminada = sinFichas >= 0 || trancado;

            const mios = p.manos[yo].reduce((s, f) => s + puntosDe(f), 0);
            let desenlace = null;
            if (sinFichas >= 0) desenlace = sinFichas === yo ? 'dominó' : 'te ganaron';
            else if (trancado) {
                const sumas = p.manos.map(m => m.reduce((s, f) => s + puntosDe(f), 0));
                const mejor = Math.min(...sumas);
                desenlace = sumas[yo] === mejor
                    ? (sumas.filter(s => s === mejor).length > 1 ? 'cerrado, empate' : 'cerrado, ganas')
                    : 'cerrado, pierdes';
            }

            /**
             * ⚠️ `legal_moves` ES DE QUIEN MUEVE, MIRE QUIEN MIRE — Y EL RESPALDO TAMBIÉN.
             *
             * Aquí había dos ramas, una para «me toca» y otra para «mira otro», y sólo
             * la primera caía a `robar`/`pasar` cuando no había ficha jugable. La
             * segunda devolvía la lista VACÍA, así que en cuanto el rival se quedaba
             * sin nada que poner la partida se moría de pie: sin jugadas legales y sin
             * terminar.
             *
             * Lo cazó `prueba_reglas.mjs` en la primera pasada, con la semilla 7 y a
             * una jugada de empezar. La regla que ya está escrita en `bazas.js` es la
             * buena: las jugadas legales no dependen del asiento sino del TURNO, así
             * que la vista no cambia la lista — sólo cambia qué mano ves.
             */
            let legales = [];
            if (terminada) legales = ['nueva'];
            else {
                legales = jugablesDe(p, p.turno);
                // Robar sólo si no hay nada que poner; pasar sólo si además no hay pozo.
                if (!legales.length) legales = p.pozo.length ? ['robar'] : ['pasar'];
            }

            const pt = puntas(p);
            return {
                juego: 'domino',
                asiento: yo,
                mano: p.manos[yo],
                manos_rivales: p.manos.filter((_, i) => i !== yo).map(m => m.length),
                cadena: p.cadena.map(x => x.lee.join('-')),
                puntas: pt,
                pozo_restante: p.pozo.length,
                // Menos es mejor: son los puntos que te quedan en la mano.
                mis_puntos: mios,
                puntos: -mios,
                score: -mios,
                marcador: p.manos.map(m => -m.reduce((s, f) => s + puntosDe(f), 0)),
                historial: p.historial,
                semilla: p.semilla,
                turn: p.turno === yo ? 'player' : `cpu${p.turno}`,
                pista: terminada ? null
                    : (pt ? `Puntas ${pt[0]} y ${pt[1]}: pon una ficha que case por un lado.`
                          : 'Cadena vacía: sale la ficha que quieras.'),
                legal_moves: legales,
                is_game_over: terminada,
                desenlace,
            };
        },

        mover(p, jugada) {
            const j = String(jugada ?? '');
            if (j === 'nueva' || j === 'reset') return false;   // lo maneja el hub
            /**
             * ⚠️ Y TAMPOCO SE JUEGA DESPUÉS DEL FINAL. LA MISMA CUENTA QUE `estado()`.
             *
             * Allí `terminada = alguien sin fichas || trancado`, y aquí no se miraba:
             * un `pasar` colaba con la partida acabada y seguía subiendo
             * `pasesSeguidos`. Menos grave que en el go —no revive nada— pero es el
             * mismo agujero, y se tapa igual: quien defiende el final es el juego, no
             * el que lo llama.
             */
            if (p.manos.some(m => m.length === 0) || p.pasesSeguidos >= p.jugadores) return false;
            const quien = p.turno;

            if (j === 'pasar') {
                if (p.pozo.length || jugablesDe(p, quien).length) return false;
                p.pasesSeguidos++;
                p.historial.push(j);
                p.turno = (p.turno + 1) % p.jugadores;
                return true;
            }

            if (j === 'robar') {
                if (!p.pozo.length || jugablesDe(p, quien).length) return false;
                p.manos[quien].push(p.pozo.pop());
                p.historial.push(j);
                // No se pasa el turno: robas hasta que puedas poner, que es la regla.
                return true;
            }

            const m = /^jugar:(\d-\d):(izq|der)$/.exec(j);
            if (!m) return false;
            const [, ficha, donde] = m;
            const i = p.manos[quien].indexOf(ficha);
            if (i < 0) return false;
            if (!encajes(p, ficha).includes(donde)) return false;

            const lee = comoQueda(p, ficha, donde);
            p.manos[quien].splice(i, 1);
            if (donde === 'izq') p.cadena.unshift({ ficha, lee });
            else p.cadena.push({ ficha, lee });
            p.historial.push(j);
            p.pasesSeguidos = 0;
            p.turno = (p.turno + 1) % p.jugadores;
            return true;
        },

        /**
         * ⚠️ EL RIVAL DE LA CASA. NO VA DE SOLTAR FICHAS, VA DE MANDAR EN LAS PUNTAS.
         *
         * Sin esto la casa caía en `primera`: la primera jugada legal de la lista. Eso
         * no es jugar mal al dominó, es no jugar al dominó — y como el banco compara a
         * todo el mundo contra la casa, un rival así mide la suerte del reparto y nada
         * más. El dominó se decide en QUÉ NÚMERO LE DEJAS VIVO al de enfrente, y esa
         * decisión existe justo cuando tu ficha entra por los dos lados.
         *
         * Tres criterios, y el orden importa:
         *
         *   1. CONTROL — cuántas de las que me quedan podría poner después. Pesa diez
         *      veces más que los puntos porque es lo único que se parece a jugar bien:
         *      dejar vivo un número del que tú tienes muchas es quedarte con la mano.
         *   2. PESO — a igualdad de control, suelta la gorda. Si la partida se tranca
         *      gana quien menos puntos tenga, así que lo pesado quema.
         *   3. EL DOBLE ANTES — es la ficha que menos sitios tiene, y quedarse con ella
         *      es quedarse con el que no entra en ningún lado.
         *
         * ⚠️ Y DEJA TECHO A PROPÓSITO: no cuenta lo que el rival NO tiene. Cada vez que
         * alguien pasa está diciendo en voz alta que no lleva ninguna de las dos puntas,
         * y esa es la mitad buena del juego. No se usa. Un rival de casa que juega
         * perfecto no separa a nadie, que es lo que ya dice `gofish.js`.
         *
         * Sin `Math.random`: el desempate es el orden de la lista, que es fijo. La misma
         * semilla tiene que dar la misma partida o el recibo no vale nada.
         */
        sugerencia(p) {
            const quien = p.turno;
            const legales = jugablesDe(p, quien);
            if (!legales.length) return p.pozo.length ? 'robar' : 'pasar';

            const mano = p.manos[quien];

            /** Cómo quedan las dos puntas DESPUÉS de poner esa ficha en ese extremo. */
            const puntasTras = (ficha, donde) => {
                const lee = comoQueda(p, ficha, donde);
                const pt = puntas(p);
                if (!pt) return [lee[0], lee[1]];
                return donde === 'izq' ? [lee[0], pt[1]] : [pt[0], lee[1]];
            };

            const valor = (jugada) => {
                const m = /^jugar:(\d-\d):(izq|der)$/.exec(jugada);
                if (!m) return -Infinity;
                const [, ficha, donde] = m;
                const [a, b] = valoresDe(ficha);
                const [izq, der] = puntasTras(ficha, donde);
                const salidas = mano.filter(f => f !== ficha).filter(f => {
                    const [x, y] = valoresDe(f);
                    return x === izq || y === izq || x === der || y === der;
                }).length;
                return salidas * 10 + puntosDe(ficha) + (a === b ? 3 : 0);
            };

            let mejor = legales[0], tope = -Infinity;
            for (const j of legales) {
                const v = valor(j);
                if (v > tope) { tope = v; mejor = j; }
            }
            return mejor;
        },

        /**
         * ⚠️ EL SUSTRATO: UNA ZONA POR MANO Y UNA POR LA CADENA.
         *
         * La cadena NO es una rejilla y no se declara como tal: su forma sale de cómo
         * se jugó, no de una matriz. Es una zona ORDENADA, y ese orden es el dato —la
         * primera ficha es la punta izquierda y la última la derecha—.
         *
         * Las fichas se nombran `f:a-b` para que el pintor las distinga de una carta
         * (`S_A`) o de un dado (`d6_5`) mirando el identificador, que es como ya
         * distingue a los otros dos.
         */
        sustrato(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && p.manos[asiento] ? asiento : 0;
            const zonas = [
                { id: 'cadena', de: null, items: p.cadena.map(x => `f:${x.lee.join('-')}`), ocultas: 0 },
                { id: 'mano', de: yo, items: p.manos[yo].map(f => `f:${f}`), ocultas: 0 },
            ];
            for (let i = 0; i < p.jugadores; i++) {
                if (i === yo) continue;
                zonas.push({ id: 'mano', de: i, items: [], ocultas: p.manos[i].length });
            }
            // `apilada` porque el pozo es un MONTÓN boca abajo, no una fila tendida.
            // Cuántas quedan es público; dónde está cada una, no — y dibujarlas en
            // línea inventaba esa segunda información. Lo dice la zona y lo obedece
            // el pintor, así que sirve a cualquier juego con mazo, no sólo a éste.
            zonas.push({ id: 'pozo', de: null, items: [], ocultas: p.pozo.length, apilada: true });
            return {
                rejilla: null,
                piezas: [],
                zonas,
                leyenda: {
                    cadena: 'la cadena, de punta izquierda a punta derecha',
                    mano: 'tus fichas',
                    pozo: 'lo que queda por robar',
                },
            };
        },
    };
}
