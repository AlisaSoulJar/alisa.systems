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

        return `<div class="hud-objetivo"><b>A qué se juega</b> ${esc(cuerpo)}</div>`;
    };
})();
