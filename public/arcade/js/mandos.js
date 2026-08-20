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

        /**
         * ═══════════════════════════════════════════════════════════════════
         *  ⚠️ ULTRA / NORMAL — Y POR QUÉ ES UN BOTÓN Y NO OTRA VERSIÓN DEL ARCADE
         * ═══════════════════════════════════════════════════════════════════
         *
         * Idea de Oscar: «como en los juegos, que puedes poner ultra o normal». La
         * alternativa era mantener dos arcades —uno sencillo y otro con luces— y no se
         * hizo por una razón medible: hay SEIS instrumentos que miden una página
         * pintada (laboratorio, pantallas, legibilidad, tacto, contactos, asimetría).
         * Con dos pinturas, o se mide el doble o una mitad se queda sin medir, y una
         * mitad sin medir se pudre. Aquí es la MISMA escena con cuatro pasadas más.
         *
         * ⚠️ Y RECARGA LA PÁGINA A PROPÓSITO.
         *
         * El compositor se monta al arrancar y desmontarlo en caliente sería tocar el
         * bucle de pintado mientras corre. Recargar cuesta un segundo y no puede dejar
         * la mesa a medias — que en un juego con partida en curso importa más que la
         * elegancia. La partida se conserva porque la semilla viaja en la dirección.
         *
         * Sólo sale donde puede hacer algo: la mesa de tablero. En una mesa de cartas
         * el botón existiría y no cambiaría nada, que es peor que no tenerlo.
         */
        if (document.getElementById('canvas-container') && !window.ALISA_ANFITRION) {
            const ultra = (() => {
                const u = new URLSearchParams(location.search).get('calidad');
                if (u) return u === 'ultra';
                try { return localStorage.getItem('alisa.calidad') === 'ultra'; } catch { return false; }
            })();
            const bCalidad = boton(ultra ? '✦' : '✧',
                ultra ? 'calidad: ultra — pulsa para normal' : 'calidad: normal — pulsa para ultra',
                () => {
                    const nueva = ultra ? 'normal' : 'ultra';
                    try { localStorage.setItem('alisa.calidad', nueva); } catch { /* sin permiso */ }
                    const u = new URL(location.href);
                    u.searchParams.set('calidad', nueva);
                    location.href = u.toString();
                });
            bCalidad.setAttribute('aria-pressed', String(ultra));
            barra.appendChild(bCalidad);
        }

        /**
         * ⚠️ COMPARTIR LA PARTIDA — Y ESTE ES EL BOTÓN QUE LE DA SENTIDO AL RESTO.
         *
         * La tesis del proyecto es que cualquiera puede verificar una partida
         * volviéndola a jugar, y el repetidor ya lo hace en las treinta y cinco
         * mesas. Pero un enlace que hay que FABRICAR A MANO no lo fabrica nadie:
         * hasta aquí, la única forma de conseguir uno era escribirlo en la barra de
         * direcciones con las jugadas separadas por comas.
         *
         * Con esto, la partida que estás jugando se convierte en una dirección que
         * se puede pegar en cualquier sitio — y quien la abra ve exactamente esa
         * partida, jugada otra vez desde la semilla, no una parecida.
         *
         * Y es la contestación buena a «esto está amañado», que es la queja más
         * repetida de los sitios de cartas: en vez de prometer que el reparto es
         * limpio, se enseña.
         */
        const bCopiar = boton('🔗', 'copiar el enlace de esta partida', async () => {
            const hub = window.ALISA_PROTOHUB;
            const juego = window.ALISA_JUEGO;
            const recibo = hub?.partida?.(juego);
            // Ruta absoluta del sitio, no relativa: esto es un script CLÁSICO y a
            // qué base resuelve su `import()` no es lo mismo en todos los
            // navegadores. Adivinar una estructura en vez de fijarla ya ha costado
            // varias medidas falsas en este proyecto.
            const { enlaceRepetidor } = await import('/arcade/js/protohub/enlace_repetidor.js');
            const enlace = recibo && enlaceRepetidor(recibo, { sitio: location.origin });
            if (!enlace) return decir(bCopiar, 'esta partida todavía no se puede repetir');

            try {
                await navigator.clipboard.writeText(enlace);
                decir(bCopiar, recibo.jugadas?.length
                    ? `copiado — ${recibo.jugadas.length} jugadas`
                    : 'copiado — el reparto, sin jugadas todavía');
            } catch {
                /**
                 * El portapapeles falla sin ser un fallo: hace falta contexto seguro
                 * y, en algunos navegadores, un gesto que el navegador se crea. Se
                 * enseña el enlace ya seleccionado para poder copiarlo a mano.
                 *
                 * NO se usa `prompt()`: un diálogo del navegador congela la página
                 * entera, y aquí hay una escena 3D corriendo detrás.
                 */
                enseñarEnlace(enlace);
            }
        });
        barra.appendChild(bCopiar);

        document.body.appendChild(barra);
    }

    /** Un acuse de un segundo y medio en el propio botón. Sin diálogos. */
    function decir(boton, texto) {
        const antes = boton.textContent;
        boton.textContent = '✓';
        boton.classList.add('mando-hecho');
        const globo = document.createElement('span');
        globo.className = 'mando-globo';
        globo.textContent = texto;
        boton.appendChild(globo);
        setTimeout(() => {
            boton.textContent = antes;
            boton.classList.remove('mando-hecho');
        }, 1600);
    }

    /** Cuando el portapapeles no está: el enlace a la vista y ya seleccionado. */
    function enseñarEnlace(enlace) {
        document.getElementById('alisa-enlace')?.remove();
        const caja = document.createElement('div');
        caja.id = 'alisa-enlace';
        const campo = document.createElement('input');
        campo.type = 'text';
        campo.readOnly = true;
        campo.value = enlace;
        const cerrar = document.createElement('button');
        cerrar.type = 'button';
        cerrar.textContent = '✕';
        cerrar.title = 'cerrar';
        cerrar.addEventListener('click', () => caja.remove());
        caja.append(campo, cerrar);
        document.body.appendChild(caja);
        campo.focus();
        campo.select();
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
