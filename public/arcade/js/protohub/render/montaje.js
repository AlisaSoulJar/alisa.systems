/**
 * montaje.js — varias cámaras en un mismo lienzo, con la disposición del léxico.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     celdasEnPixeles(celdas, { ancho, alto })   → datos, se prueba sin navegador
 *     pintarMontaje(render, celdas, vistas, …)   → el adaptador, cuatro líneas
 *
 * ⚠️ DE DÓNDE SALE: LA ÚNICA PANTALLA PARTIDA DEL PROYECTO ESTABA EN legacy/.
 *
 * Medido el 28-08-2026 sobre las 30 técnicas del sitio: `setViewport` y
 * `setScissor` no los usa NADIE en el motor. Sólo `legacy/camera_cctv_split_vision.html`
 * y el three.js empaquetado. Y son cinco líneas:
 *
 *     function renderQuadrant(cam, vx, vy, vw, vh) {
 *         renderer.setViewport(vx, vy, vw, vh);
 *         renderer.setScissor(vx, vy, vw, vh);
 *         renderer.render(scene, cam);
 *     }
 *
 * El valor no es la técnica —son cinco líneas— sino que allí las coordenadas son
 * PÍXELES y un 2×2 escrito a mano, y aquí salen del léxico de montaje, que trae
 * siete disposiciones en proporción: `full`, `split_2`, `split_2h`, `grid_4`,
 * `grid_6`, `pip` y `cctv_2x2`. Es el mismo patrón de siempre: una decisión
 * cableada en unidades absolutas donde había que poner una proporción.
 *
 * Y con esto el director queda entero. `montaje_lexicon.json` lo dice en su nota:
 * «N single-avatar performances → N² interactions by composition». Ese es el
 * multiplicador barato: no hacen falta escenas nuevas, hace falta componerlas.
 */

/**
 * ⚠️ EL LÉXICO CUENTA DESDE ARRIBA Y THREE.JS DESDE ABAJO. HAY QUE VOLTEAR.
 *
 * `split_2h` se describe como «uno encima de otro» y sus celdas son `y:0` y
 * `y:0.5`, en ese orden: la primera es la de arriba. Es el convenio de la
 * pantalla, el de CSS. Pero `setViewport` cuenta desde la esquina de ABAJO a la
 * izquierda, que es el convenio de OpenGL.
 *
 * Sin voltear, `split_2h` sale del revés y `pip` se va a la esquina contraria.
 *
 * ⚠️ Y ESTO NO SE PUEDE PROBAR CON UNA REJILLA. `grid_4` y `cctv_2x2` son
 *    simétricos arriba-abajo: volteados se ven idénticos. Una prueba que sólo
 *    mirara la rejilla aprobaría con el eje invertido. Los que delatan son
 *    `split_2h` y `pip`, y por eso la prueba los usa a ellos.
 */

/**
 * Las celdas del léxico (proporción, origen arriba) a píxeles enteros para
 * `setViewport` (origen abajo).
 *
 * ⚠️ SE REDONDEAN LOS BORDES, NO LOS ANCHOS. `grid_6` reparte 0.333 / 0.334 /
 *    0.333; redondeando cada ancho por separado, tres columnas de 426 px en un
 *    lienzo de 1280 dejan dos px sin pintar y se ve la costura. Redondeando el
 *    borde izquierdo y el derecho y restando, las columnas encajan sin hueco.
 */
export function celdasEnPixeles(celdas, { ancho, alto } = {}) {
    if (!Number.isFinite(ancho) || !Number.isFinite(alto) || ancho <= 0 || alto <= 0) {
        throw new Error(`[montaje] hacen falta ancho y alto positivos, y llegaron ${ancho}×${alto}`);
    }
    return (celdas ?? []).map((c) => {
        const izq = Math.round(c.x * ancho);
        const der = Math.round((c.x + c.w) * ancho);
        // Bordes en el convenio de la pantalla, y luego se voltean de una vez.
        const arriba = Math.round(c.y * alto);
        const abajo = Math.round((c.y + c.h) * alto);
        return { x: izq, y: alto - abajo, w: der - izq, h: abajo - arriba };
    });
}

/**
 * Pinta cada vista en su celda.
 *
 * @param render   cualquier cosa con setViewport / setScissor / setScissorTest /
 *                 render. No se importa THREE: aquí sólo se usan esos cuatro
 *                 métodos, así que vale un renderizador de verdad y vale uno de
 *                 mentira en una prueba.
 * @param celdas   las del léxico, en proporción
 * @param vistas   [{ escena, camara }] — una por celda, en orden
 */
export function pintarMontaje(render, celdas, vistas, { ancho, alto } = {}) {
    const w = ancho ?? render?.domElement?.width;
    const h = alto ?? render?.domElement?.height;
    const rects = celdasEnPixeles(celdas, { ancho: w, alto: h });

    if (vistas.length > rects.length) {
        console.warn(`[montaje] ${vistas.length} vistas para ${rects.length} celdas: `
            + `las ${vistas.length - rects.length} últimas no se pintan.`);
    }

    /**
     * ⚠️ SE ENCIENDE Y SE APAGA. El donante nunca dibujaba a pantalla completa,
     *    así que dejaba el recorte encendido para siempre y no le pasaba nada. Si
     *    aquí se dejara puesto, el siguiente `render.render()` normal de otra
     *    página saldría recortado al último cuadrante, sin error y sin motivo
     *    aparente. Se restaura el lienzo entero al salir.
     */
    render.setScissorTest(true);
    const pintadas = Math.min(vistas.length, rects.length);
    for (let i = 0; i < pintadas; i++) {
        const r = rects[i];
        const v = vistas[i];
        if (!v?.escena || !v?.camara) continue;
        render.setViewport(r.x, r.y, r.w, r.h);
        render.setScissor(r.x, r.y, r.w, r.h);
        // La proporción de cada celda no es la de la ventana: sin esto, las caras
        // salen estiradas en cuanto la celda deja de ser cuadrada.
        if (v.camara.aspect !== undefined && r.h > 0) {
            const quiere = r.w / r.h;
            if (v.camara.aspect !== quiere) {
                v.camara.aspect = quiere;
                v.camara.updateProjectionMatrix?.();
            }
        }
        render.render(v.escena, v.camara);
    }
    render.setScissorTest(false);
    render.setViewport(0, 0, w, h);
    render.setScissor(0, 0, w, h);
    return pintadas;
}

/** ¿Cuántas vistas admite una disposición? Para que quien la pida lo sepa antes. */
export function plazasDe(celdas) {
    return (celdas ?? []).length;
}

/**
 * ¿Se cubre el lienzo entero y sin solapes? Un léxico editable a mano necesita
 * quien le diga que no, igual que `revisarPiel` y `revisarLexico`.
 *
 * ⚠️ `pip` SOLAPA A PROPÓSITO —una ventanita encima de la imagen grande— así que
 *    solapar no es un error por sí mismo; se informa y decide quien llame.
 */
export function revisarCeldas(celdas) {
    const quejas = [];
    if (!Array.isArray(celdas) || !celdas.length) return ['no hay celdas'];
    let area = 0;
    for (const [i, c] of celdas.entries()) {
        for (const k of ['x', 'y', 'w', 'h']) {
            if (!Number.isFinite(c[k])) quejas.push(`celda ${i}: «${k}» no es un número`);
        }
        if (c.w <= 0 || c.h <= 0) quejas.push(`celda ${i}: no ocupa nada (${c.w}×${c.h})`);
        if (c.x < 0 || c.y < 0 || c.x + c.w > 1.0001 || c.y + c.h > 1.0001) {
            quejas.push(`celda ${i} se sale del cuadro: x+w=${(c.x + c.w).toFixed(3)}, y+h=${(c.y + c.h).toFixed(3)}`);
        }
        area += c.w * c.h;
    }
    return { quejas, area, solapa: area > 1.0001 };
}
