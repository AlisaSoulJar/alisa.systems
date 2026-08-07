/**
 * resolver_three_hook.mjs — el gancho de resolución que usa `resolver_three.mjs`
 * ═══════════════════════════════════════════════════════════════════════════
 * Traduce los especificadores desnudos del navegador a rutas de disco:
 *
 *     'three'                     → public/vendor/three-0.160.0/build/three.module.js
 *     'three/addons/loaders/X.js' → public/vendor/three-0.160.0/examples/jsm/loaders/X.js
 *     '@alisa-engine/src/…'       → public/js/alisa-engine/src/…
 *
 * Es exactamente el mismo mapeo que declaran las páginas en su
 * `<script type="importmap">`. Escribirlo dos veces sería una lista paralela,
 * así que conviene recordar de dónde salió: si un día cambia el importmap de las
 * páginas, esto hay que moverlo con él — o las pruebas dejarán de medir lo que
 * ve un usuario.
 */
let destino = null;

export function initialize(data) {
    destino = data;
}

export async function resolve(especificador, contexto, siguiente) {
    if (!destino) return siguiente(especificador, contexto);

    if (especificador === 'three') {
        return { url: destino.three, shortCircuit: true };
    }
    if (especificador.startsWith('three/addons/')) {
        return { url: destino.addons + especificador.slice('three/addons/'.length),
                 shortCircuit: true };
    }
    // Algunas piezas piden `three/webgpu` o `three/tsl`, que en r160 no existen.
    // Se deja fallar con su propio error en vez de apuntar a otro sitio: un
    // módulo que pide un build que no tenemos tiene que decirlo, no callarse.
    return siguiente(especificador, contexto);
}
