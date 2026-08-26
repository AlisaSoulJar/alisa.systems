/**
 * teclado_mundo.mjs — LAS TECLAS DE UNA ETAPA EN VOLUMEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const mando = montarTeclado(() => nucleo);
 *     ...
 *     nucleo.tick(dt, mando.hayAlgo() ? mando.estado : null);
 *
 * Cuatro direcciones y una acción. Estaba copiado igual en las dos etapas del
 * género, veinte líneas cada una, y la tercera lo habría copiado otra vez.
 *
 * ⚠️ EL NÚCLEO SE PIDE POR FUNCIÓN, NO SE GUARDA.
 *
 * La partida empieza cuando la persona pulsa el botón, así que cuando esto se
 * monta el núcleo todavía no existe. Guardarlo aquí obligaría a montar el teclado
 * después —y entonces las teclas pulsadas antes de empezar se perderían—. Se pide
 * cada vez, que además deja que una etapa reinicie su núcleo sin reenganchar nada.
 *
 * ⚠️ Y EL ESPACIO LLEVA `preventDefault`, QUE NO ES UN DETALLE.
 *
 * Sin él, el navegador desplaza la página con la barra espaciadora. En una etapa a
 * pantalla completa no se nota; en un móvil pequeño, sí. Lo encontró un
 * betatester, y está escrito igual en `jugables.css` del arcade.
 */

/**
 * @param {Function} dameNucleo  `() => nucleo` — o `null` si aún no hay partida
 * @param {Object}   [cfg]
 * @param {Function} [cfg.accion] qué hacer con ESPACIO; por defecto `escanear()`
 * @returns {{estado: Object, hayAlgo: Function, soltar: Function}}
 */
export function montarTeclado(dameNucleo, cfg = {}) {
    const estado = { subir: false, bajar: false, izquierda: false, derecha: false };

    /**
     * ⚠️ TECLAS DE MÁS, DECLARADAS — NO UN SEGUNDO ESCUCHADOR.
     *
     * El submarino tiene SHIFT para avanzar, que no es ninguna de las cuatro
     * direcciones. La salida fácil habría sido que su página se pusiera su propio
     * `keydown` al lado, y entonces habría dos sitios decidiendo lo mismo — que
     * es exactamente cómo empezaron los HUD y las cartelas que acabo de recoger.
     *
     * `extra: { shift: 'adelante' }` añade el campo al estado y lo mantiene.
     */
    for (const campo of Object.values(cfg.extra ?? {})) estado[campo] = false;

    const cual = (k) => (
        (k === 'w' || k === 'arrowup') ? 'subir'
        : (k === 's' || k === 'arrowdown') ? 'bajar'
        : (k === 'a' || k === 'arrowleft') ? 'izquierda'
        : (k === 'd' || k === 'arrowright') ? 'derecha'
        : (cfg.extra?.[k] ?? null)
    );

    const abajo = (e) => {
        const n = dameNucleo();
        if (!n || n.terminado()) return;
        const k = e.key.toLowerCase();
        const d = cual(k);
        if (d) { estado[d] = true; return; }
        if (k === ' ') {
            e.preventDefault();
            (cfg.accion ?? ((nn) => nn.escanear()))(n);
        }
    };
    const arriba = (e) => {
        const d = cual(e.key.toLowerCase());
        if (d) estado[d] = false;
    };

    addEventListener('keydown', abajo);
    addEventListener('keyup', arriba);

    return {
        estado,
        hayAlgo: () => estado.subir || estado.bajar || estado.izquierda || estado.derecha,
        soltar() {
            removeEventListener('keydown', abajo);
            removeEventListener('keyup', arriba);
        },
    };
}
