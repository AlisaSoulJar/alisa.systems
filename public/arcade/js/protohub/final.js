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
    /**
     * ⚠️ EL RELOJ DEL APORTE SE CORTA ANTES DE REHACER LA CAJA.
     *
     * `innerHTML = ''` borra los nodos y NO los temporizadores: un `setInterval` de
     * un pintado anterior seguiría vivo, apuntando a una casilla que ya no está en la
     * página, y llegaría a mandar la partida por su cuenta. La firma `@final` hace
     * que esto no se repinte en cada sondeo, así que hoy no pasa — pero «hoy no pasa
     * porque otro sitio lo evita» es exactamente la clase de dependencia que se rompe
     * el día que alguien toca el otro sitio.
     */
    clearInterval(caja._relojAporte);
    caja.innerHTML = '';
    caja.classList.add('mesa-final');

    const linea = document.createElement('div');
    linea.className = 'final-linea';
    // El rótulo es nuestro y va como marcado; el resultado sale del estado del juego
    // y va como TEXTO. Hoy son `white` y `black`, pero un juego puede publicar en
    // `winner` lo que quiera, y eso no debería poder escribir HTML en el panel.
    const rotulo = document.createElement('b');
    rotulo.textContent = 'partida terminada';
    linea.append(rotulo, ' ' + resultadoEnPalabras(estado));
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

        // La nota va la ÚLTIMA: es la respuesta a lo de abajo, y puesta encima se lee
        // como si contestara a los botones. Se pasa el nodo para poder colocar la
        // casilla delante de ella.
        if (recibo.jugadas?.length) aportar(caja, { recibo, estado, decir, nota });
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  APORTAR AL CORPUS — MARCADO, Y SE PUEDE DESMARCAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Era un botón que había que pulsar, y el corpus llevaba DOS partidas. La decisión
 * de ponerlo marcado por defecto es de Oscar (15-08-2026): «yo guardaría dataset por
 * defecto, pondría algo en plan si no quieres desmárcalo».
 *
 * ⚠️ Y POR ESO LA CASILLA TIENE QUE VERSE ANTES, NO DESPUÉS.
 *
 * Marcado por defecto está bien; marcado y escondido, no. La diferencia entera entre
 * las dos cosas es que se vea qué va a pasar y se pueda decir que no ANTES de que
 * pase, sin buscarlo. Por eso hay una espera corta y visible: la casilla sale
 * desmarcable, el envío ocurre después, y quien la desmarque a tiempo no manda nada.
 *
 * ⚠️ QUÉ VIAJA, Y POR QUÉ SE PUEDE ENSEÑAR ENTERO.
 *
 * `{juego, semilla, jugadas}` y nada más. No hay nombre, ni cuenta, ni de dónde
 * vienes: una partida de damas no dice nada de quien la jugó. Y `qué se manda` lo
 * enseña literal, igual que hace el buzón de avisos — nadie manda a ciegas algo que
 * no puede ver.
 *
 * ⚠️ Y EL CORPUS NO SE FÍA DE ESTO, QUE ES LO BUENO.
 *
 * La puntuación no se manda para que la crean: el servidor vuelve a jugar la partida
 * y RECALCULA. Una partida inflada, una jugada ilegal o una semilla que no cuadra se
 * rechazan solas. Por eso esto puede estar abierto a cualquiera sin moderación, sin
 * cuentas y sin confianza.
 */
const ESPERA_MS = 4000;

/**
 * ⚠️ EN LOCAL NO SE APORTA, Y NO ES SÓLO POR EL ERROR DE CONSOLA.
 *
 * `/api/dataset` vive en el servidor: sirviendo el sitio con `servir.py` un POST
 * contesta **501 Unsupported method**, y eso lo apunta el navegador aunque el fetch
 * esté capturado. Lo suspendió el laboratorio en sokoban —que termina en una jugada,
 * así que llegaba a la pantalla de fin y mandaba— y tenía razón: una página que deja
 * un error rojo en consola está rota aunque se vea bien.
 *
 * Pero el motivo de fondo es mejor que el síntoma: **las partidas de desarrollo no
 * deben entrar en el corpus público**. Cada pasada del laboratorio son 35 partidas de
 * un script; con la casilla marcada por defecto, ese ruido se colaría en el mismo
 * banco que decimos que cualquiera puede descargarse y creer. El corpus vale
 * justamente por lo que NO tiene dentro.
 *
 * Así que en local la casilla sale desmarcada y explicada. No se esconde: se dice por
 * qué, que es la diferencia entre una decisión y un misterio.
 */
const enLocal = () => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);

function aportar(caja, { recibo, estado, decir, nota }) {
    const cuerpo = { ...recibo, puntos: puntuacionDe(estado), tipo: 'persona' };

    const local = enLocal();
    const linea = document.createElement('label');
    linea.className = 'final-aportar';
    linea.innerHTML = `<input type="checkbox"${local ? '' : ' checked'}>`
        + `<span class="final-aportar-txt">guardar esta partida en el corpus público`
        + (local ? ` <i>— en local no hay corpus: esto sólo funciona en el sitio publicado</i>` : '')
        + ` <b class="final-cuenta"></b></span>`;
    const casilla = linea.querySelector('input');
    const cuenta = linea.querySelector('.final-cuenta');

    const detalle = document.createElement('details');
    detalle.className = 'final-detalle';
    detalle.innerHTML = `<summary>qué se manda</summary><pre></pre>`;
    detalle.querySelector('pre').textContent = JSON.stringify(cuerpo, null, 1);

    // Delante de la nota: lo que se cuenta ahí («guardada», «no se manda nada») es la
    // RESPUESTA a esta casilla, y encima se lee como si contestara a los botones.
    if (nota && nota.parentNode === caja) caja.insertBefore(linea, nota);
    else caja.appendChild(linea);
    caja.insertBefore(detalle, linea.nextSibling);

    /**
     * El listener va ANTES del corte de «en local», o marcarla a mano no haría nada
     * y el rótulo estaría prometiendo algo que no pasa. Es el mismo tipo de botón
     * muerto que llevo arreglando todo el día, y casi lo escribo yo.
     */
    casilla.addEventListener('change', () => {
        clearInterval(caja._relojAporte);
        if (casilla.checked) enviar();
        else { cuenta.textContent = ''; decir('no se manda nada.'); }
    });

    // En local no arranca la cuenta atrás: no hay corpus al que mandar, y las
    // partidas de un instrumento no deberían entrar en el banco público de todas
    // formas. Marcarla a mano sigue funcionando, por el listener de arriba.
    if (local) return;

    let restan = Math.round(ESPERA_MS / 1000);
    const pintar = () => { cuenta.textContent = restan > 0 ? `— se manda en ${restan}s` : ''; };
    pintar();

    const reloj = caja._relojAporte = setInterval(() => {
        restan--;
        pintar();
        if (restan > 0) return;
        clearInterval(reloj);
        // Se relee la casilla en el último momento: lo que vale es lo que hay
        // cuando toca mandar, no lo que había cuando arrancó la cuenta.
        if (!casilla.checked) { cuenta.textContent = ''; return; }
        enviar();
    }, 1000);

    async function enviar() {
        casilla.disabled = true;
        cuenta.textContent = '';
        decir('el servidor la está volviendo a jugar…');
        try {
            const r = await fetch('/api/dataset', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(cuerpo),
            }).then(x => x.json());
            if (r.guardada) decir(`guardada · ${r.puntos} puntos recalculados por el servidor`);
            // Un rechazo NO es un error del servicio: es el servicio funcionando.
            else decir(`no se guardó: ${r.motivo ?? 'sin motivo'}`);
        } catch (e) {
            decir(`el corpus no contesta (${String(e.message).slice(0, 40)})`);
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
