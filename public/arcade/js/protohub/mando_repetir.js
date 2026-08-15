/**
 * mando_repetir.js — los botones de ver una partida repetirse
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Va aparte del repetidor a propósito: el repetidor no sabe nada de pantallas —sólo
 * habla con el hub— y así se puede usar sin interfaz, por ejemplo desde una prueba.
 * Esto es la cara, y es la única parte que hay que rehacer si algún día se quiere
 * dentro de otra sala.
 *
 * ⚠️ Y LO PRIMERO QUE DICE ES QUE ESTO NO ES UN VÍDEO.
 *
 * «Se está volviendo a jugar desde la semilla» no es un adorno: es la diferencia
 * entre enseñar una grabación —que se puede montar— y volver a ejecutar la partida
 * con las mismas reglas, que es lo que aquí se puede comprobar. Quien mira tiene
 * derecho a saber cuál de las dos cosas está viendo.
 */

/**
 * ⚠️ EL DE REPRODUCIR LLEVA PALABRA, Y NO ES ADORNO.
 *
 * La primera versión eran cinco iconos: `⏮ ◀ ▶ ▶| ⏭`. Mirando la captura, el
 * cuarto y el quinto son casi el mismo dibujo a tamaño de botón — y el tercero y
 * el cuarto, los dos un triángulo. Tres de los cinco pidiendo que adivines.
 *
 * Es el mismo criterio que aplica `legibilidad` a las piezas del tablero: si dos
 * cosas distintas se ven igual, da igual que el dato esté bien. Aquí se arregla
 * poniendo la palabra en el único botón que cambia de modo, que además es el que
 * más se pulsa; los pasos se quedan con flechas simples, que sí se distinguen.
 */
const ICONO = { inicio: '⏮', atras: '◀', delante: '▶', fin: '⏭' };

export function ponerMandoRepetir(donde, repetidor, { juego, semilla } = {}) {
    if (!donde) return null;

    const barra = document.createElement('div');
    barra.className = 'repetir';
    barra.innerHTML =
        `<div class="repetir-titulo">volviéndose a jugar desde la semilla `
      + `<b>${semilla ?? '—'}</b> — esto no es un vídeo</div>`
      + `<div class="repetir-mandos">`
      + `<button class="repetir-btn" data-a="inicio" title="al principio" aria-label="al principio">${ICONO.inicio}</button>`
      + `<button class="repetir-btn" data-a="atras" title="una atrás" aria-label="una jugada atrás">${ICONO.atras}</button>`
      + `<button class="repetir-btn repetir-play" data-a="play" title="ver" aria-label="ver la partida">▶ ver</button>`
      + `<button class="repetir-btn" data-a="delante" title="una adelante" aria-label="una jugada adelante">${ICONO.delante}</button>`
      + `<button class="repetir-btn" data-a="fin" title="al final" aria-label="al final">${ICONO.fin}</button>`
      + `<span class="repetir-cuenta"></span>`
      + `</div>`
      + `<div class="repetir-aviso"></div>`;
    donde.appendChild(barra);

    const play = barra.querySelector('.repetir-play');
    const cuenta = barra.querySelector('.repetir-cuenta');
    const aviso = barra.querySelector('.repetir-aviso');

    barra.addEventListener('click', (ev) => {
        const b = ev.target.closest('.repetir-btn');
        if (!b) return;
        ({ inicio: () => repetidor.alInicio(),
           atras: () => repetidor.anterior(),
           play: () => repetidor.alternar(),
           delante: () => repetidor.siguiente(),
           fin: () => repetidor.alFinal() })[b.dataset.a]?.();
    });

    const pintar = (e) => {
        play.textContent = e.corriendo ? '⏸ pausa' : '▶ ver';
        play.title = e.corriendo ? 'pausa' : 'ver';
        play.setAttribute('aria-label', e.corriendo ? 'pausar' : 'ver la partida');
        cuenta.textContent = `${e.i} / ${e.total}`;
        if (e.roto) {
            /**
             * ⚠️ SI UNA JUGADA NO ENTRA, SE DICE CUÁL Y SE PARA.
             *
             * Aquí es donde esto deja de ser una animación y pasa a ser una prueba:
             * un recibo que no se puede volver a jugar es un recibo falso, y eso hay
             * que verlo, no esconderlo. Es el mismo criterio que el verificador, que
             * rechaza en vez de aproximar.
             */
            aviso.textContent = `se paró en la jugada ${e.roto.en + 1} («${e.roto.jugada}»): `
                              + `${e.roto.motivo}. Este recibo no se puede volver a jugar entero.`;
            aviso.hidden = false;
        } else {
            aviso.hidden = true;
        }
    };
    repetidor.alPaso(pintar);
    pintar(repetidor.estado());
    return { barra, pintar };
}
