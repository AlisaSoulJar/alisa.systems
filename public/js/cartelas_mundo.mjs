/**
 * cartelas_mundo.mjs — LAS DOS CARTELAS DE UNA ETAPA, DECLARADAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const cartel = montarCartel(nucleo.rom.cartel, (ajustes) => empezar(ajustes));
 *     ...
 *     cartel.final(nucleo.info());
 *
 * La de entrada —título, de qué va, semilla y el botón— y la de final. Eran las
 * dos únicas cosas que quedaban escritas a mano en las páginas después de sacar
 * el estilo y el HUD.
 *
 * ⚠️ Y ERAN VOZ DEL CARTUCHO ESCRITA DOS VECES.
 *
 * La descripción del modal de `satelite_estacion.html` era casi palabra por
 * palabra el `meta.summary` que la ROM ya declara para el catálogo del gimnasio.
 * O sea: el mismo texto, en dos ficheros, uno para la persona y otro para el
 * agente — y el día que uno cambie, el otro no.
 *
 * ⚠️ LA CARTELA FINAL SE RELLENA DESDE `info()`, NO DESDE LA PÁGINA.
 *
 * Las plantillas llevan `{campo}` y se resuelven contra lo que el núcleo publica.
 * Eso obligó a que `info()` diga la SOLUCIÓN al terminar —antes cada página se la
 * sacaba de `nucleo.busqueda.objetivo`, metiéndole la mano por dentro—. Es el
 * mismo efecto que tuvo declarar el HUD: una vista declarativa no puede leer lo
 * que el núcleo no dice, así que obliga a decirlo.
 */

/** Sustituye `{campo}` por lo que valga en `datos`. Lo que falte se ve. */
function rellenar(plantilla, datos) {
    return String(plantilla ?? '').replace(/\{(\w+)\}/g, (_, k) => (
        datos[k] === undefined || datos[k] === null ? `{${k}}` : datos[k]
    ));
}

function nodo(id) {
    let d = document.getElementById(id);
    if (!d) { d = document.createElement('div'); d.id = id; document.body.appendChild(d); }
    return d;
}

/**
 * @param {Object}   decl              `ROM.cartel`
 * @param {string}   decl.titulo
 * @param {string[]} decl.parrafos     admiten `<b>`; se escriben en la ROM
 * @param {string}   [decl.pie]        la línea de «Powered by»
 * @param {Array}    decl.ajustes      `[{ clave, etiqueta, valor, min?, max? }, …]`
 * @param {string}   decl.boton
 * @param {Object}   decl.final        `{ gana, pierde, detalle }` — plantillas
 * @param {Function} alEmpezar         recibe `{clave: valor}` con lo tecleado
 */
export function montarCartel(decl, alEmpezar) {
    const modal = nodo('modal');
    const fin = nodo('fin');

    const campos = (decl.ajustes ?? []).map((a) => `
        <label>${a.etiqueta}</label><input id="in_${a.clave}" value="${a.valor}">`).join('');

    modal.innerHTML = `<div class="caja">
        <h1>${decl.titulo}</h1>
        ${(decl.parrafos ?? []).map((p) => `<p>${p}</p>`).join('')}
        ${decl.pie ? `<p style="color:#6d7891">${decl.pie}</p>` : ''}
        ${campos ? `<div style="margin-top:14px">${campos}</div>` : ''}
        <button id="btnEmpezar">${decl.boton}</button>
    </div>`;

    fin.innerHTML = `<div class="caja">
        <h1 id="finTitulo"></h1><p id="finTexto"></p>
        <button id="btnOtra">Otra vez</button>
    </div>`;
    fin.querySelector('#btnOtra').addEventListener('click', () => location.reload());

    modal.querySelector('#btnEmpezar').addEventListener('click', () => {
        const puestos = {};
        for (const a of decl.ajustes ?? []) {
            const bruto = parseInt(document.getElementById(`in_${a.clave}`).value, 10);
            const v = Number.isFinite(bruto) ? bruto : a.valor;
            puestos[a.clave] = a.min !== undefined
                ? Math.max(a.min, Math.min(a.max ?? Infinity, v))
                : v;
        }
        modal.style.display = 'none';
        alEmpezar(puestos);
    });

    return {
        /** La cartela de final, rellenada con lo que el núcleo publica. */
        final(info) {
            fin.querySelector('#finTitulo').textContent =
                info.ganado ? decl.final.gana : decl.final.pierde;
            fin.querySelector('#finTexto').textContent = rellenar(
                info.ganado ? decl.final.detalleGana : decl.final.detallePierde, info);
            fin.style.display = 'grid';
        },
    };
}
