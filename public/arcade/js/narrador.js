/**
 * narrador.js — que la mesa se pueda jugar sin verla
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este proyecto lleva meses cuidando el texto que lee un agente sin visión:
 * `descripcion.js` dice el objetivo, las normas activas, los puntos, el turno, lo
 * que hay sobre la mesa y las jugadas legales. `prueba_asimetria` comprueba en un
 * navegador de verdad que nada de eso esté escondido a la persona, y
 * `prueba_vistas` que nada dibujado salga fuera del sustrato.
 *
 * O sea que la mitad difícil de la accesibilidad —tener algo bueno que decir—
 * estaba hecha desde hace tiempo. Lo que faltaba era el altavoz.
 *
 * ⚠️ MEDIDO ANTES DE ESCRIBIR ESTO: `aria-live` aparecía en TRES ficheros de todo
 *    el proyecto, y ninguno era del arcade. Un lector de pantalla veía el tablero
 *    cambiar y no decía nada. El texto existía y no llegaba a nadie.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LAS CUATRO DECISIONES, Y POR QUÉ NO SON DE ESTILO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ 1. DOS REGIONES, NO UNA.
 *
 * La tentación es meter `describirEstado` entero en la región viva y darse por
 * satisfecho. Sería inservible: un lector de pantalla lee lo que entra en una
 * región viva ENTERO y sin que puedas pararlo, y en el go eso son 361 jugadas
 * legales cada vez que alguien pone una piedra. Se pisa a sí mismo, y quien lo usa
 * apaga el sitio.
 *
 * Así que van dos cosas distintas: un AVISO corto y vivo —qué acaba de pasar y a
 * quién le toca— y una DESCRIPCIÓN completa, quieta, a la que se va cuando se
 * quiere. Es la misma diferencia que entre la fanfarria y el registro de jugadas.
 *
 * ⚠️ 2. LO IMPORTANTE, PRIMERO.
 *
 * A un aviso hablado se le puede cortar en cualquier momento —basta tocar una
 * tecla—, así que el orden no es cosmético: es cuánto llega. Primero de quién es
 * el turno, luego qué pasó, y al final cuántas opciones hay. Al revés, la única
 * parte que siempre se oye sería la menos útil.
 *
 * ⚠️ 3. SE ESCONDE CON `clip`, NO CON `display:none`.
 *
 * `display:none` y `visibility:hidden` sacan el elemento del árbol de
 * accesibilidad: el lector no lo ve tampoco. Es el fallo clásico de esto —queda
 * bonito en el código, no dice nada—. El recorte de un píxel lo deja invisible
 * para el ojo y presente para el lector.
 *
 * ⚠️ 4. NO SE REPITE LO QUE YA SE DIJO.
 *
 * El estado se repregunta en cada repintado. Sin cerrojo, el lector estaría
 * diciendo «te toca» sesenta veces por segundo. Es exactamente el mismo motivo por
 * el que la fanfarria del final lleva su propio cerrojo en `sonido_mesa.js`.
 */
(function () {
    'use strict';

    const OCULTO = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;'
                 + 'overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0';

    let aviso = null, descrito = null;

    function montar() {
        if (aviso || typeof document === 'undefined' || !document.body) return;

        aviso = document.createElement('div');
        aviso.id = 'narrador-aviso';
        aviso.setAttribute('role', 'status');
        aviso.setAttribute('aria-live', 'polite');
        // Sin `aria-atomic` el lector canta sólo lo que cambió — «3» suelto, en
        // vez de «te toca, 3 jugadas». La frase entera o nada.
        aviso.setAttribute('aria-atomic', 'true');
        aviso.style.cssText = OCULTO;
        document.body.appendChild(aviso);

        descrito = document.createElement('div');
        descrito.id = 'narrador-mesa';
        // Se puede tabular hasta él y tiene nombre: es el sitio al que se va a
        // preguntar «¿cómo está la mesa?». Sin `tabindex` habría que buscarlo
        // navegando por encabezados, que es justo lo que no hay aquí.
        descrito.setAttribute('tabindex', '0');
        descrito.setAttribute('role', 'region');
        descrito.setAttribute('aria-label', 'cómo está la mesa ahora mismo');
        descrito.style.cssText = OCULTO;
        document.body.appendChild(descrito);
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
        else montar();
    }

    let ultimoAviso = '';

    /** El aviso corto y vivo. No repite lo que acaba de decir. */
    window.narrar = function narrar(texto) {
        montar();
        if (!aviso || !texto || texto === ultimoAviso) return;
        ultimoAviso = texto;
        aviso.textContent = texto;
    };

    /**
     * Lo que pasa en la mesa, contado en dos sitios a la vez.
     *
     * @param {string} juego
     * @param {object} st        lo que devuelve `reglas.estado(p)`
     * @param {string} [ultima]  la jugada que se acaba de hacer, si se sabe
     */
    window.narrarMesa = function narrarMesa(juego, st, ultima) {
        if (!st) return;
        montar();

        /**
         * ⚠️ QUÉ JUGÓ EL OTRO, QUE ES LA MITAD QUE IMPORTA.
         *
         * Medido en el ajedrez con la casa enfrente: por el camino del `backend`
         * no llega ninguna jugada, así que el aviso decía «juegan blancas, 20
         * posibles» y nada más. Quien ve el tablero sabe que el rival ha movido
         * un caballo; quien no lo ve se entera de que el número ha cambiado.
         *
         * El recibo de la partida ya lleva la lista de jugadas —es lo que hace
         * que se pueda volver a jugar— así que la última está a mano y no hay que
         * inventarse un canal nuevo. Si esta mesa es compartida y el recibo lo
         * lleva el árbitro, no habrá recibo y el aviso se queda como estaba: sin
         * jugada, pero con turno y opciones.
         */
        if (ultima === undefined) {
            try { ultima = window.ALISA_PROTOHUB?.partida?.(juego)?.jugadas?.at(-1); }
            catch { /* sin recibo se avisa igual, con menos */ }
        }

        /**
         * La descripción completa es LA MISMA que lee un agente de lenguaje, sin
         * una palabra de diferencia. Eso no es pereza: es la tesis del banco. Si
         * aquí se escribiera un texto «más bonito para personas», una persona
         * ciega y un modelo estarían jugando a dos juegos distintos, y la
         * comparación —que es todo lo que este sitio vende— dejaría de significar
         * nada. Ver la cabecera de `descripcion.js`.
         */
        if (descrito && typeof window.describirMesa === 'function') {
            try { descrito.textContent = window.describirMesa(juego, st); }
            catch { /* sin descripción se sigue jugando: el aviso corto va aparte */ }
        }

        if (st.is_game_over) {
            const p = Number(st.puntos);
            const cómo = Number.isFinite(p)
                ? (p > 0 ? 'has ganado' : p < 0 ? 'has perdido' : 'empate')
                : 'partida terminada';
            window.narrar(`Fin: ${cómo}.`);
            return;
        }

        // El orden importa: ver la decisión 2 de la cabecera.
        const turno = st.turn ? `Juegan ${st.turn}.` : '';
        const hizo = ultima ? ` Última jugada: ${ultima}.` : '';
        const n = (st.legal_moves ?? []).length;
        const puedes = n ? ` ${n} jugada${n === 1 ? '' : 's'} posible${n === 1 ? '' : 's'}.` : '';
        window.narrar(`${turno}${hizo}${puedes}`.trim());
    };

    /**
     * Para los dos motores clásicos, que sí tienen `backend`: se envuelve
     * `state` igual que hace `conSonidoDeMesa` con el sonido, y por el mismo
     * motivo — ahí se ve el estado después de que juegue quien sea, no sólo
     * después de mis jugadas.
     *
     * ⚠️ Va aquí y no dentro de `conSonidoDeMesa` a propósito. Aquel fichero es
     *    presentación sonora; éste es la puerta de accesibilidad. Meterlos en la
     *    misma función haría que apagar uno apagara el otro, y son cosas
     *    distintas: el sonido es adorno y esto es si se puede jugar o no.
     *
     * Devuelve el mismo objeto si no hay nada que envolver, igual que aquél: una
     * página sin este script tiene que seguir funcionando exactamente igual.
     */
    window.conVozDeMesa = function conVozDeMesa(backend, juego) {
        if (!backend || typeof backend.state !== 'function') return backend;
        const verEstado = backend.state;
        backend.state = async function () {
            const st = await verEstado.apply(this, arguments);
            try { window.narrarMesa(juego ?? window.ALISA_JUEGO ?? 'mesa', st); }
            catch { /* sin voz se sigue jugando; el fallo no puede parar la mesa */ }
            return st;
        };
        return backend;
    };
})();
