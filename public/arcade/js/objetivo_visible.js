/**
 * objetivo_visible.js — decirle A LA PERSONA a qué juega, no sólo al agente.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ DE DÓNDE SALE ESTO: DE UN AVISO DE BETATESTER, Y ME PILLÓ EN LO MISMO.
 *
 * El 13-08-2026 llegó esto desde mancala:
 *
 *     «va solo no? o se juega asi? ni idea tengo de como se juega en realidad XD»
 *
 * Y lo que duele es que ESE MISMO DÍA había terminado de escribir los treinta y
 * cinco objetivos. La puerta de texto ya decía «Mancala. Objetivo: acabar con más
 * semillas en tu granero que el rival», perfectamente, desde por la mañana.
 *
 * O sea: se lo estaba contando al agente y no a la persona. Escribí el campo
 * pensando en que un agente ciego no puede adivinar a qué juega, y di por hecho
 * que una persona sí porque «abre la página y ve un tablero». Es verdad con las
 * damas. Con un mancala, o un fagocito, o un frentes, no lo es en absoluto — y de
 * los treinta y cinco, la mayoría no son juegos que se reconozcan de un vistazo.
 *
 * La asimetría que documenté en `prueba_objetivo.mjs` era real pero iba al revés
 * de como la conté: no era sólo contra el agente. Era contra quien no conociera
 * ya el juego, que es la mitad de los betatesters y todos los visitantes nuevos.
 *
 * ⚠️ POR QUÉ VA FUERA DE `#hud-content`.
 *
 * Es la misma razón por la que ya están fuera los botones de jugada y la pista:
 * plegado, `#hud-content` queda con `max-height: 0`, y lo que esté dentro
 * desaparece. Alguien que pliega el panel para ver la mesa es EXACTAMENTE quien
 * más va a necesitar acordarse de a qué juega.
 *
 * No hace falta más: el texto ya lo escribieron las reglas de cada juego, aquí
 * sólo se pinta. Si un juego no declara objetivo esto no pinta nada — y entonces
 * `prueba_objetivo.mjs` estará en rojo, que es su trabajo.
 */
(function () {
    'use strict';

    window.ALISA_OBJETIVO_HTML = function objetivoHTML() {
        const txt = window.ALISA_OBJETIVO;
        if (!txt || typeof txt !== 'string') return '';

        // Las reglas escriben la frase empezando por «Objetivo: …» porque la
        // puerta de texto la lee de corrido. Aquí el rótulo ya lo pone el
        // recuadro, así que se quita para no decirlo dos veces.
        const cuerpo = txt.replace(/^\s*Objetivo:\s*/i, '');

        const esc = (s) => s.replace(/[&<>"]/g, (c) => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

        /**
         * ⚠️ EL OBJETIVO VA EN SU PROPIO ELEMENTO PARA PODER RECORTARLO SOLO.
         *
         * Con el panel plegado, el CSS resume esto a dos líneas. Pero el rótulo es
         * `display:block`, así que se llevaba UNA de las dos: del objetivo quedaba una
         * línea, cortada a media palabra —«acabar con la caja mas BAJA… posible: cada
         * carta suma su valor y»—. Un recuadro que existe para explicar a qué se juega
         * y que se corta antes de decirlo.
         *
         * Lo pedía un betatester desde mancala («ni idea tengo de como se juega») y es
         * lo primero que ve quien entra por la puerta de casuals, así que es justo el
         * sitio donde no puede quedarse a medias. Separándolo, el recorte cuenta líneas
         * de objetivo y el rótulo no le roba ninguna.
         */
        /**
         * ⚠️ Y EL CAMINO A LAS REGLAS, QUE ESTABAN ESCRITAS Y NO SE ALCANZABAN.
         *
         * `fichas_prosa.json` tiene las CUARENTA fichas completas —qué es,
         * reparto, turno, cómo se gana, lo que pilla a todo el mundo la primera
         * vez, y en qué se aparta del juego de la calle— y `ficha.html` las pinta
         * bien. Medido el 24-08: **2 de 55 páginas de arcade enlazaban allí.**
         * El trabajo hecho, bien hecho, y sin llegar a la pantalla.
         *
         * El objetivo dice A QUÉ juegas en una línea; esto dice CÓMO. Van juntos
         * porque es la misma pregunta y porque la hace la misma persona, en el
         * mismo momento: la primera vez que abre el juego.
         *
         * ⚠️ Y VA AQUÍ Y NO EN UNA ESQUINA. Lo puse primero flotando abajo a la
         * izquierda desde `montarMesa`, y la captura lo enseñó DEBAJO de la fila
         * de botones —tapado en 1280 y en 390, las dos—. La esquina parecía libre
         * mirando el código y no lo estaba. Se vio abriendo la imagen, como casi
         * todo lo de esta semana.
         */
        const juego = window.ALISA_JUEGO;
        const reglas = juego
            ? `<a class="hud-objetivo-reglas" target="_blank" rel="noopener"`
            + ` href="/arcade/ficha.html?juego=${encodeURIComponent(juego)}"`
            + ` title="Reparto, turno, cómo se gana, y en qué se aparta del juego de la calle"`
            + `>cómo se juega →</a>`
            : '';
        return `<div class="hud-objetivo"><b>A qué se juega</b>`
             + `<span class="hud-objetivo-txt">${esc(cuerpo)}</span>${reglas}</div>`;
    };
})();
