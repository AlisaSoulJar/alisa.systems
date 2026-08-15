/**
 * repetidor.js — VER una partida volverse a jugar
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     /arcade/checkers.html?semilla=7&repetir=a3b4,b6a5,b4c5
 *
 * ⚠️ ESTO ES LA TESIS DEL PROYECTO, PUESTA DONDE SE VE.
 *
 * Todo esto se sostiene sobre una frase: «cualquiera puede verificar una partida
 * volviéndola a jugar». Está en el README, en la especificación de la API y en el
 * verificador, que la comprueba con aritmética y no con un modelo que opine.
 *
 * Y hasta ahora vivía entera dentro de un recibo de texto. Se podía COMPROBAR, y no
 * se podía VER. La diferencia importa: en los sitios de cartas más usados hay hilos
 * enteros de gente convencida de que el reparto está amañado, y a esa sospecha no se
 * le contesta con una promesa — se le contesta enseñándosela.
 *
 * ⚠️ Y NO TOCA EL RENDER. NI UNA LÍNEA.
 *
 * El repetidor sólo habla con el hub: reinicia con la semilla y va aplicando las
 * jugadas. La mesa —cualquiera de las dos, tablero o cartas— dibuja lo que el hub
 * diga, como hace siempre, porque el render es un espectador y no un nervio.
 *
 * Consecuencia: funciona en los TREINTA Y CINCO juegos sin escribir nada por juego,
 * y en el que venga mañana. No es que se haya portado a todos: es que nunca supo de
 * ninguno.
 *
 * ⚠️ NO SE «REPRODUCE UN VÍDEO»: SE VUELVE A JUGAR.
 *
 * No hay estados guardados ni fotogramas. Cada paso llama a `mover()` con la misma
 * jugada que se hizo, sobre una partida creada con la misma semilla. Si el recibo
 * fuera falso, aquí se rompería — y por eso una jugada que el juego rechaza no se
 * salta en silencio: se para y se dice cuál.
 */

/** Lo que separa una jugada de otra en la URL. Coma: legible y no hay que escapar. */
const SEPARADOR = /[,\s]+/;

/**
 * Lee el recibo de la dirección. Devuelve `null` si no hay nada que repetir, que es
 * el caso normal — jugar es lo que hace todo el mundo.
 */
export function reciboDeLaURL(busqueda = location.search) {
    const q = new URLSearchParams(busqueda);
    const crudo = q.get('repetir');
    if (crudo === null) return null;
    const jugadas = crudo.split(SEPARADOR).map(s => s.trim()).filter(Boolean);
    const semilla = Number(q.get('semilla'));
    return {
        jugadas,
        // Sin semilla no hay partida que repetir: el reparto sería otro y las
        // jugadas caerían sobre un tablero distinto. Mejor decirlo que fingirlo.
        semilla: Number.isFinite(semilla) && semilla > 0 ? semilla : null,
    };
}

/**
 * Vuelve a jugar la partida sobre el hub, paso a paso.
 *
 * @param {object} cfg
 *   hub, juego      con quién y a qué
 *   jugadas         la lista del recibo
 *   semilla         el reparto
 *   alCambiar       se llama tras cada paso; la mesa repinta ahí
 *   msPorJugada     ritmo. 900 por defecto: lo bastante para seguirlo
 */
export function crearRepetidor({ hub, juego, jugadas, semilla, alCambiar, msPorJugada = 900 }) {
    let i = 0;                 // cuántas jugadas se han aplicado
    let reloj = null;
    let roto = null;           // la primera jugada que el juego rechazó, si la hubo

    const escuchas = new Set();
    const avisar = () => {
        alCambiar?.();
        for (const f of escuchas) f(estado());
    };

    const estado = () => ({ i, total: jugadas.length, corriendo: reloj !== null, roto });

    /** Deja la partida exactamente en la jugada `n`, re-jugando desde cero. */
    function irA(n) {
        const meta = Math.max(0, Math.min(jugadas.length, n));
        hub.reset(juego, { semilla, seed: semilla });
        roto = null;
        for (let k = 0; k < meta; k++) {
            const r = hub.move(juego, { move: jugadas[k] });
            if (r && r.ok === false) {
                /**
                 * ⚠️ UNA JUGADA QUE NO ENTRA SE DICE, NO SE SALTA.
                 *
                 * Saltarla dejaría la partida avanzando sobre un tablero que ya no
                 * es el del recibo, y lo que se viera a partir de ahí sería una
                 * ficción con aspecto de prueba. Es exactamente lo contrario de
                 * para lo que existe esto.
                 */
                roto = { en: k, jugada: jugadas[k], motivo: r.error ?? 'la rechazó el juego' };
                i = k;
                avisar();
                return;
            }
        }
        i = meta;
        avisar();
    }

    function parar() {
        if (reloj !== null) { clearInterval(reloj); reloj = null; }
    }

    return {
        estado,
        alPaso(f) { escuchas.add(f); return () => escuchas.delete(f); },

        /** Al principio del todo: el reparto, antes de la primera jugada. */
        alInicio() { parar(); irA(0); },

        /** Una jugada adelante. Sin re-jugar todo: sólo aplicar la siguiente. */
        siguiente() {
            parar();
            if (roto || i >= jugadas.length) return;
            const r = hub.move(juego, { move: jugadas[i] });
            if (r && r.ok === false) {
                roto = { en: i, jugada: jugadas[i], motivo: r.error ?? 'la rechazó el juego' };
            } else i++;
            avisar();
        },

        /**
         * Una atrás. Aquí SÍ hay que re-jugar desde el principio, y no es un
         * descuido: estas reglas no saben deshacer en general —sólo algunas— y
         * fingir que sí daría un tablero que nunca existió. Volver a jugar cuarenta
         * jugadas cuesta milisegundos y es exacto por construcción.
         */
        anterior() { parar(); irA(i - 1); },

        alFinal() { parar(); irA(jugadas.length); },
        irA(n) { parar(); irA(n); },

        /** Solo o parado. Al llegar al final se para: no vuelve a empezar sin que se lo pidas. */
        alternar() {
            if (reloj !== null) { parar(); avisar(); return; }
            if (i >= jugadas.length || roto) irA(0);
            reloj = setInterval(() => {
                if (roto || i >= jugadas.length) { parar(); avisar(); return; }
                const r = hub.move(juego, { move: jugadas[i] });
                if (r && r.ok === false) {
                    roto = { en: i, jugada: jugadas[i], motivo: r.error ?? 'la rechazó el juego' };
                    parar();
                } else i++;
                avisar();
            }, msPorJugada);
            avisar();
        },

        soltar() { parar(); escuchas.clear(); },
    };
}
