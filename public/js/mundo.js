/**
 * mundo.js — UNA sola declaración de dónde está three, para todos los mundos
 * ═══════════════════════════════════════════════════════════════════════════
 *     <script src="/js/mundo.js"></script>          ← en <head>, ANTES de módulos
 *     <script type="module"> import { montarMundo } … </script>
 *
 * ⚠️ POR QUÉ ESTO EXISTE Y NO ES UN `importmap` PEGADO EN CADA PÁGINA
 *
 * Medido el 2026-08-23 sobre las 189 páginas del sitio:
 *
 *     three-0.160.0   191 referencias      ← todo lo que no es el arcade
 *     three-0.170.0    14 referencias      ← el arcade, desde `montarMesa.js`
 *
 * Tres copias de three en `vendor/` (r128 incluida) y cada página declarando la
 * suya a mano. Eso no es sólo repetición: es la razón de que
 * `CinematicPipelinePlugin` —el pipeline que hace bonito a lo bonito— lo importen
 * DOS de las seis páginas de la saga. Cuando el andamio se copia, lo que no es
 * imprescindible no se copia.
 *
 * ⚠️ Y POR QUÉ ES UN SCRIPT CLÁSICO EN LUGAR DE UN MÓDULO
 *
 * El motor importa `three` como especificador desnudo (`import * as THREE from
 * 'three'`), así que hace falta un `importmap`. Y un `importmap` NO se puede
 * añadir una vez que ha empezado a cargar un módulo — el navegador lo rechaza.
 * Un módulo que lo inyectara llegaría siempre tarde para sí mismo.
 *
 * Un `<script src>` clásico sin `defer` en el `<head>` sí llega a tiempo: bloquea
 * el análisis y se ejecuta antes que cualquier `<script type="module">`, que van
 * diferidos por definición. Por eso esto es clásico y por eso va arriba.
 *
 * ⚠️ SI YA HAY UN `importmap` EN LA PÁGINA, ESTE NO SE PONE.
 * Durante la migración conviven páginas con el suyo propio. Dos mapas es un error
 * del navegador, así que se mira antes; y se avisa por consola, porque una página
 * que se queda con el mapa viejo se queda también con la versión vieja de three
 * sin que nada más lo delate.
 */
(function () {
    'use strict';

    // La versión buena es la 0.170: es la que el arcade lleva en producción con
    // sus veintisiete scripts clásicos, y la única para la que `vendor` trae los
    // addons modernos —bloom, SSAO, cielo de Rayleigh, sombras en cascada—.
    const MAPA = {
        imports: {
            'three': '/vendor/three-0.170.0/build/three.module.js',
            'three/addons/': '/vendor/three-0.170.0/examples/jsm/',
            '@alisa-engine/': '/js/alisa-engine/',
        },
    };

    if (document.querySelector('script[type="importmap"]')) {
        console.warn('[mundo] la página ya trae su propio importmap: se respeta y NO se pone el común.'
            + ' Mientras siga así, esta página no usa three 0.170.');
        return;
    }
    const el = document.createElement('script');
    el.type = 'importmap';
    el.textContent = JSON.stringify(MAPA);
    document.head.appendChild(el);
    window.ALISA_MUNDO_MAPA = MAPA;      // para que una prueba pueda comprobarlo
})();
