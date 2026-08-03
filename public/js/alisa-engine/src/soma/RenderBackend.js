/**
 * RenderBackend.js — elegir backend sin casarse con ninguno
 * ═══════════════════════════════════════════════════════════════════════════
 * El motor va en WebGL y así se queda. Esto solo añade la POSIBILIDAD de usar
 * WebGPU donde interese, sin tocar nada de lo que ya funciona.
 *
 * CÓMO SE USA
 *   import * as THREE from 'three';
 *   import { crearRenderer } from '@alisa-engine/src/soma/RenderBackend.js';
 *   const { renderer, backend } = await crearRenderer(THREE, { antialias: true });
 *   // …y si hace falta metérselo al núcleo:
 *   new AlisaRenderCore({ renderer });
 *
 * LO QUE HAY QUE SABER ANTES (medido, no supuesto)
 * ------------------------------------------------
 * · `three` y `three/webgpu` son **builds distintos**. El de WebGPU **no
 *   exporta `WebGLRenderer`**, y el normal no exporta `WebGPURenderer`. No se
 *   mezclan en la misma página: el importmap decide en qué mundo estás. Por eso
 *   esta función recibe el namespace y usa LO QUE HAYA, en vez de importar.
 * · `WebGPURenderer` **ya se repliega solo a WebGL** si el navegador no trae
 *   WebGPU. O sea que pedir WebGPU nunca deja a nadie fuera; solo hay que
 *   preguntarle DESPUÉS qué backend acabó usando, que es lo que devolvemos.
 * · Necesita `await renderer.init()`. Saltárselo da una pantalla negra sin un
 *   solo error, que es la peor clase de fallo.
 * · En r170, `three/tsl` apunta AL MISMO fichero que `three/webgpu`.
 */

/**
 * @param {object} THREE  el namespace ya importado (webgpu o normal)
 * @param {object} [opciones]  las de siempre del renderer
 * @param {'auto'|'webgpu'|'webgl'} [opciones.preferir]
 * @returns {Promise<{renderer:object, backend:'WebGPU'|'WebGL', pedido:string}>}
 */
export async function crearRenderer(THREE, opciones = {}) {
    const { preferir = 'auto', ...resto } = opciones;
    const hayWebGPU = typeof THREE.WebGPURenderer === 'function';
    const quiereWebGPU = preferir === 'webgpu' || (preferir === 'auto' && hayWebGPU);

    if (quiereWebGPU && hayWebGPU) {
        const renderer = new THREE.WebGPURenderer({ antialias: true, ...resto });
        await renderer.init();
        // El backend REAL puede no ser el pedido: preguntarlo y decir la verdad
        // es la diferencia entre una capacidad y una promesa.
        const real = renderer.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL';
        return { renderer, backend: real, pedido: preferir };
    }

    if (quiereWebGPU && !hayWebGPU) {
        console.warn('[RenderBackend] pediste WebGPU, pero este build de three no lo trae '
                   + '(el importmap apunta al build normal). Sigo con WebGL.');
    }
    if (typeof THREE.WebGLRenderer !== 'function') {
        throw new Error('[RenderBackend] este build no trae ni WebGPURenderer ni WebGLRenderer');
    }
    return {
        renderer: new THREE.WebGLRenderer({ antialias: true, ...resto }),
        backend: 'WebGL', pedido: preferir,
    };
}

/** ¿Puede este navegador, hoy? Útil para decidir antes de cargar nada. */
export function hayWebGPUenElNavegador() {
    return typeof navigator !== 'undefined' && !!navigator.gpu;
}
