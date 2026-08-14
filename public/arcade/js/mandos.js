/**
 * mandos.js — pantalla completa y esconder el panel, en todos los juegos
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dos botones flotantes, arriba a la derecha:
 *
 *     ⛶  pantalla completa
 *     ▣  esconder el panel — y cuando está escondido, el mismo botón lo trae
 *
 * ⚠️ POR QUÉ NO VAN DENTRO DEL PANEL.
 *
 * Porque uno de los dos sirve para HACER DESAPARECER el panel. Un botón que se
 * esconde a sí mismo deja al jugador sin forma de volver, y en un móvil sin
 * teclado eso es un callejón sin salida: recargar. Van fuera y se quedan, que es
 * lo que los convierte en «un solo icono» de verdad.
 *
 * ⚠️ Y POR QUÉ AQUÍ Y NO EN CADA MOTOR.
 *
 * Hay dos motores —tableros y cartas— y treinta y cinco páginas. Escribirlo en los
 * dos es tener dos copias que se separan, que es literalmente el fallo que este
 * proyecto ha pagado seis veces. Es la misma decisión que con `gestos.js` y
 * `objetivo_visible.js`: script clásico, global, y lo monta `montarMesa` cuando el
 * panel ya existe.
 *
 * ⚠️ EL PLEGADO QUE YA HABÍA NO SE TOCA.
 *
 * El panel tiene su `▾` de siempre, que lo encoge dejando las jugadas a la vista
 * —pensado para jugar con el panel pequeño—. Esto es otra cosa: quitarlo de en
 * medio del todo para ver la mesa. Son dos necesidades distintas y las dos son
 * legítimas, así que conviven.
 */
(function () {
    'use strict';

    const HAY_PANTALLA_COMPLETA = !!(document.documentElement.requestFullscreen
                                  || document.documentElement.webkitRequestFullscreen);

    function enPantallaCompleta() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }

    async function alternarPantalla() {
        try {
            if (enPantallaCompleta()) {
                await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
            } else {
                const e = document.documentElement;
                await (e.requestFullscreen?.() ?? e.webkitRequestFullscreen?.());
            }
        } catch (err) {
            // ⚠️ Se traga a propósito y se dice por consola: iOS en Safari no deja
            // pantalla completa en el documento, y ahí el navegador RECHAZA la
            // promesa. Sin este catch, un error sin gestionar en cada toque.
            console.warn('[mandos] pantalla completa no disponible:', err?.message ?? err);
        }
    }

    function montar() {
        if (document.getElementById('alisa-mandos')) return;   // ya está

        const barra = document.createElement('div');
        barra.id = 'alisa-mandos';

        const boton = (icono, titulo, alPulsar) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'mando';
            b.textContent = icono;
            b.title = titulo;
            b.setAttribute('aria-label', titulo);
            // `click` y no `touchstart`: en un botón, `click` ya llega de los dos
            // sitios y con `touchstart` el toque dispararía dos veces en los
            // navegadores que además emiten el click sintético.
            b.addEventListener('click', alPulsar);
            return b;
        };

        if (HAY_PANTALLA_COMPLETA) {
            const bPantalla = boton('⛶', 'pantalla completa', async () => {
                await alternarPantalla();
                bPantalla.textContent = enPantallaCompleta() ? '⤡' : '⛶';
                bPantalla.title = enPantallaCompleta() ? 'salir de pantalla completa'
                                                       : 'pantalla completa';
            });
            barra.appendChild(bPantalla);

            // Se puede salir con Escape sin tocar el botón, así que el icono se
            // corrige escuchando al navegador y no fiándose de nuestro último clic.
            document.addEventListener('fullscreenchange', () => {
                bPantalla.textContent = enPantallaCompleta() ? '⤡' : '⛶';
            });
        }

        const bPanel = boton('▣', 'esconder el panel', () => {
            const panel = document.querySelector('.hud-panel');
            if (!panel) return;
            const oculto = panel.classList.toggle('oculto');
            bPanel.textContent = oculto ? '▢' : '▣';
            bPanel.title = oculto ? 'ver el panel' : 'esconder el panel';
            bPanel.setAttribute('aria-label', bPanel.title);
            bPanel.setAttribute('aria-pressed', String(oculto));
        });
        bPanel.setAttribute('aria-pressed', 'false');
        barra.appendChild(bPanel);

        document.body.appendChild(barra);
    }

    /**
     * Espera a que exista el panel antes de montarse.
     *
     * ⚠️ NO ES PARANOIA: LOS DOS MOTORES MONTAN SU HUD EN MOMENTOS DISTINTOS.
     *
     * Los visualizadores clásicos lo montan al cargarse; la mesa genérica es un
     * módulo y lo construye después. Montar esto antes que el panel dejaría el
     * botón de esconder buscando un elemento que todavía no está — y no fallaría,
     * simplemente no haría nada al pulsarlo. Un botón que no hace nada es peor que
     * un botón que falta.
     */
    function montarCuandoHaya({ intentos = 40, cada = 100 } = {}) {
        let n = 0;
        const mirar = () => {
            if (document.querySelector('.hud-panel')) return montar();
            if (++n < intentos) setTimeout(mirar, cada);
            // Si no aparece, se monta igual: la pantalla completa no necesita panel.
            else montar();
        };
        mirar();
    }

    window.ALISA_MANDOS = { montar, montarCuandoHaya, alternarPantalla };
})();
