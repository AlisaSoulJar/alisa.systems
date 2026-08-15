/**
 * final.js — qué pasa cuando la partida termina
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ HASTA AHORA NO PASABA NADA. LITERALMENTE.
 *
 * El panel de jugadas empezaba así:
 *
 *     if (terminada) return aviso('partida terminada');
 *
 * Y ahí se acababa la página. Sin botón para jugar otra, en las treinta y cinco
 * mesas: había que recargar. Y midiéndolo resulta que era peor de lo que parecía —
 * DIECISIETE de los treinta y cinco juegos OFRECEN `nueva` entre sus jugadas legales
 * justo al terminar, exactamente para que el HUD tenga ese botón, y esta línea la
 * tiraba a la basura antes de mirarla.
 *
 *     ofrecen «nueva» y se descartaba   17  (blackjack, brisca, tute, guerra…)
 *     no ofrecen nada al terminar       16
 *
 * O sea que el dato estaba puesto, con su comentario explicando para qué servía, y
 * el consumidor lo descartaba en la primera línea. Es la misma forma de fallo que ya
 * se ha pagado varias veces aquí: nadie se equivoca, los dos lados son razonables
 * por separado, y la costura de en medio no existe.
 *
 * ⚠️ Y ES EL PEOR SITIO POSIBLE PARA UNA PANTALLA MUERTA.
 *
 * El final de una partida es el momento exacto en que alguien decide si juega otra o
 * cierra la pestaña. En un blackjack —que es una mano detrás de otra— quedarse sin
 * salida al terminar la primera es perder al jugador en su primer minuto.
 *
 * Así que aquí van las tres cosas que se pueden querer en ese momento, y no por
 * casualidad son las tres patas del proyecto:
 *
 *   · JUGAR OTRA          — que la página no sea un callejón sin salida
 *   · COPIAR EL ENLACE    — la partida que acabas de jugar, para que otro la vea
 *                           volverse a jugar. La tesis, en un botón
 *   · APORTAR AL CORPUS   — la misma partida, al banco público que sólo acepta lo
 *                           que puede volver a jugar él mismo
 *
 * ⚠️ APORTAR LO DECIDE QUIEN JUEGA, SIEMPRE.
 *
 * Es un botón y no algo automático. Aportar publica la partida en un corpus abierto
 * que cualquiera se puede descargar, y eso no se hace por nadie sin preguntar por
 * mucho que la partida sea de damas y no diga nada de quien la jugó.
 */
import { puntuacionDe } from './Verificador.js';
import { enlaceRepetidor } from './enlace_repetidor.js';

/**
 * @param {HTMLElement} caja  la misma donde iban las jugadas
 * @param {object} cfg
 *   estado      el estado del juego, tal cual
 *   recibo      {juego, semilla, jugadas, normas?} — puede faltar
 *   enSala      en una mesa compartida no se empieza otra por tu cuenta
 *   otraPartida () => void; si falta, no se ofrece
 */
export function pintarFinal(caja, { estado = {}, recibo = null, enSala = false, otraPartida } = {}) {
    if (!caja) return;
    caja.innerHTML = '';
    caja.classList.add('mesa-final');

    const linea = document.createElement('div');
    linea.className = 'final-linea';
    linea.innerHTML = `<b>partida terminada</b> ${resultadoEnPalabras(estado)}`;
    caja.appendChild(linea);

    const fila = document.createElement('div');
    fila.className = 'final-botones';
    caja.appendChild(fila);

    const nota = document.createElement('div');
    nota.className = 'final-nota';
    nota.hidden = true;
    caja.appendChild(nota);

    const decir = (t) => { nota.textContent = t; nota.hidden = false; };

    const boton = (texto, titulo, alPulsar) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mesa-jugada final-btn';
        b.textContent = texto;
        b.title = titulo;
        b.addEventListener('click', () => alPulsar(b));
        fila.appendChild(b);
        return b;
    };

    /**
     * ⚠️ «JUGAR OTRA» VALE PARA LOS 35, LA OFREZCA EL JUEGO O NO.
     *
     * Los diecisiete que publican `nueva` la mandan por ahí; en los otros dieciséis
     * el ProtoHub la entiende igual —`move('nueva')` es un `reset`, y está escrito
     * en su código con ese propósito—. Así que no hay dos caminos ni una lista de
     * juegos que mantener: se manda `nueva` y ya.
     */
    if (otraPartida && !enSala) {
        boton('jugar otra', 'empezar otra partida', () => otraPartida());
    } else if (enSala) {
        // En una sala manda el árbitro: empezar otra es cosa de la mesa, no tuya.
        // Se dice, en vez de poner un botón que no haría nada.
        decir('en una mesa compartida, la siguiente partida la empieza la sala');
    }

    const enlace = recibo && enlaceRepetidor(recibo, { sitio: location.origin });
    if (enlace) {
        boton('copiar el enlace', 'quien lo abra verá esta partida volverse a jugar', async (b) => {
            try {
                await navigator.clipboard.writeText(enlace);
                decir(`copiado — quien lo abra verá estas ${recibo.jugadas.length} jugadas volverse a jugar`);
            } catch {
                // El portapapeles necesita contexto seguro. Sin él, el enlace a la
                // vista: peor, pero no un botón que no hace nada.
                decir(enlace);
            }
            b.blur();
        });

        /**
         * ⚠️ EL CORPUS NO SE FÍA DE ESTE BOTÓN, Y ESO ES LO BUENO.
         *
         * No se manda la puntuación para que la crean: el servidor vuelve a jugar la
         * partida y RECALCULA. Una partida inflada, una jugada ilegal o una semilla
         * que no cuadra se rechazan solas. Por eso este botón puede estar abierto a
         * cualquiera sin moderación, sin cuentas y sin confianza — que es justo lo
         * contrario de lo que le pasa a un corpus que hay que vigilar.
         */
        if (recibo.jugadas?.length) {
            boton('aportar al corpus', 'el servidor la vuelve a jugar antes de guardarla', async (b) => {
                b.disabled = true;
                decir('el servidor la está volviendo a jugar…');
                try {
                    const r = await fetch('/api/dataset', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ ...recibo, puntos: puntuacionDe(estado), tipo: 'persona' }),
                    }).then(x => x.json());
                    if (r.guardada) decir(`guardada · ${r.puntos} puntos recalculados por el servidor`);
                    // Un rechazo NO es un error del servicio: es el servicio
                    // funcionando. Se dice el motivo tal cual lo da él.
                    else { decir(`no se guardó: ${r.motivo ?? 'sin motivo'}`); b.disabled = false; }
                } catch (e) {
                    decir(`el corpus no contesta (${String(e.message).slice(0, 40)})`);
                    b.disabled = false;
                }
            });
        }
    }
}

/**
 * Lo mismo, para los dos MOTORES clásicos.
 *
 * ⚠️ HAY DOS CAMINOS DE PANEL, Y LO DESCUBRÍ CON EL FINAL YA ESCRITO.
 *
 * Cablé la pantalla de fin en `jugadas.js`, abrí un blackjack, lo jugué hasta el
 * final... y salió el «nueva» pelado de siempre. Blackjack no pasa por ahí: los
 * visualizadores propios usan el `pintarJugadasPulsables` de su motor, que es otra
 * función con otro nombre en otro fichero. Dos caminos hacia la misma caja.
 *
 * Se arregla con esta puerta y una línea en cada motor, en vez de copiar la pantalla
 * dos veces. Copiarla sería la forma exacta en que las dos versiones se separan — y
 * este proyecto ya ha pagado eso seis veces.
 *
 * Devuelve `true` si ha pintado el final, para que el llamador pare ahí.
 */
export function finalSiTerminada(caja, { estado, juego, enviar, enSala = false } = {}) {
    if (!caja) return false;
    if (!estado?.is_game_over) {
        // Hay partida viva otra vez: se suelta la marca y la clase, venga el reinicio
        // de donde venga. Fiarlo sólo al botón de «jugar otra» dejaría la segunda
        // partida sin pantalla de fin — un fallo que sólo sale a la segunda.
        if (caja.dataset.firma === '@final') { caja.dataset.firma = ''; caja.classList.remove('mesa-final'); }
        return false;
    }
    // El motor sondea cada segundo: sin esto la pantalla se reconstruiría entera una
    // vez por segundo y un botón se perdería bajo el dedo entre pulsar y soltar.
    if (caja.dataset.firma === '@final') return true;
    caja.dataset.firma = '@final';
    pintarFinal(caja, {
        estado,
        recibo: window.ALISA_PROTOHUB?.partida?.(juego) ?? null,
        enSala,
        otraPartida: enviar ? () => { caja.dataset.firma = ''; enviar('nueva'); } : null,
    });
    return true;
}

/**
 * El resultado en una frase. Se usa `puntuacionDe`, que es LA MISMA función con la
 * que puntúa el verificador y con la que se hace la clasificación: si la pantalla
 * dijera un número distinto del que cuenta, tendríamos dos verdades.
 */
function resultadoEnPalabras(st) {
    const puntos = puntuacionDe(st);
    // Los juegos no se ponen de acuerdo en cómo llaman al ganador. `desajustes.mjs`
    // vigila esto mismo; aquí se aceptan los nombres que hay y ya está.
    const quien = st.winner ?? st.ganador ?? st.result ?? st.resultado ?? null;
    const trozos = [];
    if (quien !== null && quien !== undefined && quien !== '') trozos.push(`gana ${quien}`);
    if (Number.isFinite(puntos)) trozos.push(`${puntos} puntos`);
    return trozos.length ? `— ${trozos.join(' · ')}` : '';
}
