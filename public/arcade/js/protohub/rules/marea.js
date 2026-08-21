/**
 * marea.js — EL ENTORNO PUENTE: EL ÚNICO CUYO NÚMERO SE ENTIENDE DESDE FUERA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Inclinas la rejilla y todo se desliza a ese lado. Dos fichas iguales que chocan
 * se funden en una del doble. Después de cada movimiento aparece una ficha nueva
 * donde le da la gana. Se acaba cuando ya no cabe ni un movimiento que cambie algo.
 *
 * ⚠️ POR QUÉ ESTE JUEGO Y NO OTRO: PORQUE SU NÚMERO SE ENTIENDE SIN EXPLICARLO.
 *
 * Nadie de fuera sabe qué significa un 0,38 en canadiense. Este juego —la familia
 * del 2048— lleva años siendo entorno de referencia en aprendizaje por refuerzo,
 * así que su puntuación ya tiene con qué compararse en la cabeza de cualquiera que
 * lea la tabla. Para un banco de pruebas que se publica, un entorno PUENTE vale
 * más que un entorno nuevo: ancla todos los demás.
 *
 * Por eso las reglas son las canónicas y no una versión de la casa: 4×4, aparece
 * un 2 el 90 % de las veces y un 4 el 10 %, cada ficha se funde una sola vez por
 * movimiento, y la puntuación es la suma de lo que sale de cada fusión. Cambiar
 * cualquiera de esas cuatro cosas rompería justo lo que lo hace útil.
 *
 * ⚠️ Y TRAE ALGO QUE NINGUNO DE LOS TREINTA Y NUEVE TENÍA: AZAR **DESPUÉS**.
 *
 * El parchís y la generala tienen dado, pero *antes* de decidir: tiras y luego
 * eliges qué hacer con lo que salió. Aquí es al revés — decides, y entonces el
 * mundo mete una ficha donde quiera. Planificar contra un futuro que reacciona a
 * lo que acabas de hacer es otro problema, y hasta hoy no se medía.
 *
 * ⚠️ Y TERMINA SOLO, QUE AQUÍ NO ES UN DETALLE.
 *
 * «Una partida sin final es veneno para el banco» está escrito en `blackjack.js`
 * desde hace tiempo: lo que no termina no se puede verificar ni puntuar. Éste
 * termina por construcción y sin poner un tope artificial — cada jugada legal mete
 * una ficha, así que un tablero sin fusiones se llena en dieciséis.
 */
import { mulberry32 } from './azar.js';
import { describirSustrato } from '../descripcion.js';

const LADO = 4;
const DIRS = ['izquierda', 'derecha', 'arriba', 'abajo'];

export const OBJETIVO = 'Objetivo: inclinar la rejilla para juntar fichas iguales, que se funden'
                      + ' en una del doble. Cada fusión suma su valor. Se acaba cuando ningún'
                      + ' movimiento cambia nada.';

const vacio = () => Array.from({ length: LADO * LADO }, () => 0);
const libres = (c) => c.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);

/**
 * Desliza y funde UNA fila hacia el principio.
 *
 * ⚠️ CADA FICHA SE FUNDE UNA VEZ POR MOVIMIENTO, Y ES LA REGLA QUE TODO EL MUNDO
 * IMPLEMENTA MAL LA PRIMERA VEZ. Con `[2,2,4]` el resultado es `[4,4]`, no `[8]`:
 * el 4 que sale de fundir los dos doses ya no puede volver a fundirse en la misma
 * jugada. Sin eso, una fila de cuatro iguales daría el cuádruple y las
 * puntuaciones dejarían de ser comparables con las de fuera, que es lo único por
 * lo que este juego está aquí.
 */
function apretar(fila) {
    const vivas = fila.filter((v) => v);
    const salida = [];
    let ganado = 0;
    for (let i = 0; i < vivas.length; i++) {
        if (i + 1 < vivas.length && vivas[i] === vivas[i + 1]) {
            const fundida = vivas[i] * 2;
            salida.push(fundida);
            ganado += fundida;
            i++;                       // la siguiente ya se ha usado
        } else salida.push(vivas[i]);
    }
    while (salida.length < LADO) salida.push(0);
    return { fila: salida, ganado };
}

/** Las cuatro filas de la rejilla en el orden en que hay que apretarlas. */
function lineas(celdas, dir) {
    const out = [];
    for (let k = 0; k < LADO; k++) {
        const idx = [];
        for (let j = 0; j < LADO; j++) {
            if (dir === 'izquierda') idx.push(k * LADO + j);
            else if (dir === 'derecha') idx.push(k * LADO + (LADO - 1 - j));
            else if (dir === 'arriba') idx.push(j * LADO + k);
            else idx.push((LADO - 1 - j) * LADO + k);
        }
        out.push(idx);
    }
    return out;
}

/** Aplica un movimiento sobre una COPIA. Devuelve el tablero, lo ganado y si cambió. */
function inclinar(celdas, dir) {
    const nuevo = celdas.slice();
    let ganado = 0, cambio = false;
    for (const idx of lineas(celdas, dir)) {
        const antes = idx.map((i) => nuevo[i]);
        const r = apretar(antes);
        ganado += r.ganado;
        idx.forEach((i, j) => {
            if (nuevo[i] !== r.fila[j]) cambio = true;
            nuevo[i] = r.fila[j];
        });
    }
    return { celdas: nuevo, ganado, cambio };
}

export const marea = {
    OBJETIVO,
    ASIENTOS: 1,

    nuevaPartida(opts = {}) {
        const semilla = Number(opts.semilla ?? opts.seed ?? 1) || 1;
        const azar = mulberry32(semilla);
        const p = { semilla, azar, celdas: vacio(), puntos: 0, jugadas: 0, mayor: 0 };
        this._sembrar(p); this._sembrar(p);
        return p;
    },

    /** Una ficha nueva en un hueco: 2 el 90 % de las veces, 4 el 10 %. */
    _sembrar(p) {
        const huecos = libres(p.celdas);
        if (!huecos.length) return;
        const donde = huecos[Math.floor(p.azar() * huecos.length)];
        p.celdas[donde] = p.azar() < 0.9 ? 2 : 4;
    },

    sustrato(p) {
        return {
            /**
             * `celdas` lleva el EXPONENTE y no el número: así el pintor puede dar
             * un color por escalón sin tener que saber que 1024 va después de 512,
             * y `nombres` lleva el número que se lee. Es la misma división que en
             * los demás: la celda dice de qué clase es, el nombre dice qué pone.
             */
            rejilla: {
                ancho: LADO, alto: LADO,
                celdas: p.celdas.map((v) => (v ? Math.log2(v) : 0)),
                nombres: p.celdas.map((v) => (v ? String(v) : null)),
                etiquetas: true,
                ambiente: 'arena',
            },
            piezas: [], zonas: [],
            leyenda: { 0: 'hueco', ...Object.fromEntries(
                Array.from({ length: 12 }, (_, i) => [i + 1, String(2 ** (i + 1))])) },
        };
    },

    describir(p) {
        const st = this.estado(p);
        return `Marea. ${OBJETIVO}\n`
             + `Puntos: ${st.puntos} · mayor ficha: ${st.mayor} · jugadas: ${p.jugadas}\n`
             + describirSustrato(this.sustrato(p))
             + (st.is_game_over
                 ? `\n${st.desenlace}.`
                 : `\nPuedes: ${st.legal_moves.join(', ')}.`);
    },

    estado(p) {
        /**
         * ⚠️ SÓLO ES LEGAL LO QUE CAMBIA ALGO, Y ESO NO ES UN CAPRICHO.
         *
         * Inclinar hacia un lado donde nada se mueve no es una jugada: es no jugar.
         * Si se ofreciera, un agente podría quedarse dándole a la misma tecla para
         * siempre y la partida no terminaría nunca — que es exactamente lo que este
         * juego no puede permitirse. Y de paso es lo que hace que termine solo: cada
         * jugada legal mete una ficha.
         */
        const legales = DIRS.filter((d) => inclinar(p.celdas, d).cambio);
        const terminada = legales.length === 0;
        const mayor = Math.max(0, ...p.celdas);
        return {
            juego: 'marea',
            objetivo: OBJETIVO,
            turn: 'player',
            puntos: p.puntos,
            score: p.puntos,
            mayor,
            huecos: libres(p.celdas).length,
            jugadas: p.jugadas,
            semilla: p.semilla,
            desenlace: terminada ? `Se llenó la rejilla con ${p.puntos} puntos y un ${mayor}` : null,
            legal_moves: terminada ? ['nueva'] : legales,
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        const orden = String(jugada);
        const st = this.estado(p);
        if (st.is_game_over || !st.legal_moves.includes(orden)) return false;
        const r = inclinar(p.celdas, orden);
        if (!r.cambio) return false;
        p.celdas = r.celdas;
        p.puntos += r.ganado;
        p.jugadas++;
        p.mayor = Math.max(0, ...p.celdas);
        this._sembrar(p);
        return true;
    },

    /**
     * El rival de la casa. Techo BLANDO, como manda la casa: mira UNA jugada, no
     * dos, y no sabe nada de las estrategias buenas de este juego —fijar la mayor
     * en una esquina y no mover nunca en la dirección que la despega—. Un agente
     * que planifique dos movimientos ya debería pasarle por encima, que es
     * exactamente lo que se quiere poder medir.
     *
     * Lo que sí hace es no jugarse la partida por un punto: entre dos jugadas que
     * puntúan igual prefiere la que deja más hueco, porque quedarse sin sitio es la
     * única forma de perder.
     */
    sugerencia(p) {
        const st = this.estado(p);
        const legales = st.legal_moves.filter((m) => m !== 'nueva');
        if (!legales.length) return null;
        let mejor = null, mejorValor = -Infinity;
        for (const d of DIRS) {
            if (!legales.includes(d)) continue;
            const r = inclinar(p.celdas, d);
            // Hueco pesa más que puntos: sobrevivir es la condición de seguir
            // puntuando. Los pesos son a ojo y no se han afinado a propósito.
            const valor = r.ganado + libres(r.celdas).length * 12;
            if (valor > mejorValor) { mejorValor = valor; mejor = d; }
        }
        return mejor ?? legales[0];
    },

    deshacer() { return false; },
};
