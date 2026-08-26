/**
 * hud_mundo.mjs — EL PANEL DE ESTADO, DECLARADO EN VEZ DE ESCRITO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const hud = montarHud(nucleo.rom.hud);
 *     ...
 *     hud.pintar(nucleo.info(), nucleo);      // una vez por fotograma
 *
 * Un HUD de estas etapas es siempre lo mismo: un título, tres o cuatro números
 * que salen de `info()`, y una barra de recurso que se pone roja cuando queda
 * poco. Lo único que cambia entre una etapa y otra son las PALABRAS y de qué
 * campo sale cada número.
 *
 * ⚠️ POR QUÉ ESTO NO ES UN CAPRICHO DE ORDEN.
 *
 * Medido: la página del dron y la de la estación tenían 89 y 83 líneas propias,
 * y **casi todas eran esto** — cuatro `getElementById`, una regla de tres para el
 * ancho de la barra y un `classList.toggle`. Copiado dos veces, y la tercera etapa
 * lo habría copiado otra vez.
 *
 * Es exactamente lo que `montarMesa` resolvió para las mesas: su cabecera dice
 * «Ni CSS, ni lista de scripts, ni HUD, ni orden de carga», escrita después de
 * encontrar el mismo bloque repetido seis veces. Esto es esa misma puerta para
 * las etapas en volumen.
 *
 * ⚠️ Y LA DECLARACIÓN VIVE EN LA ROM, NO AQUÍ.
 *
 * Los rótulos son parte del cartucho, como los números y como el texto de la
 * puerta de lenguaje: quien escribe la ROM decide si su recurso se llama
 * «Batería» o «Enlace». Este fichero sólo sabe pintar filas.
 */

/**
 * @param {Object} decl                 `ROM.hud`
 * @param {string} decl.titulo          lo que va en negrita arriba
 * @param {string} [decl.subtitulo]
 * @param {Array}  decl.filas           `[{ etiqueta, campo, de?, sufijo? }, …]`
 *        `campo` es una clave de `info()`. `de` es otra clave (o un número) para
 *        escribir «3 / 18». Una fila con `barra: true` dibuja la barra de recurso.
 * @param {string} [decl.acento]        color de acento de esta etapa
 * @returns {{pintar: Function, nodo: HTMLElement}}
 */
export function montarHud(decl) {
    const raiz = document.getElementById('hud') ?? (() => {
        const d = document.createElement('div');
        d.id = 'hud';
        document.body.appendChild(d);
        return d;
    })();

    if (decl.acento) document.documentElement.style.setProperty('--acento', decl.acento);

    raiz.innerHTML = '';
    const cabecera = document.createElement('div');
    cabecera.innerHTML = `<b>${decl.titulo}</b>${decl.subtitulo ? ` — ${decl.subtitulo}` : ''}`;
    raiz.appendChild(cabecera);

    const vivos = [];
    for (const f of decl.filas) {
        const fila = document.createElement('div');
        if (f.barra) {
            const caja = document.createElement('span');
            caja.className = 'barra';
            const relleno = document.createElement('i');
            relleno.style.width = '100%';
            caja.appendChild(relleno);
            const valor = document.createElement('b');
            fila.append(`${f.etiqueta}: `, caja, ' ', valor);
            vivos.push({ ...f, caja, relleno, valor });
        } else {
            const valor = document.createElement('b');
            fila.append(`${f.etiqueta}: `, valor);
            if (f.de !== undefined) {
                const tope = document.createElement('span');
                fila.append(' / ', tope);
                vivos.push({ ...f, valor, tope });
            } else {
                vivos.push({ ...f, valor });
            }
        }
        raiz.appendChild(fila);
        vivos[vivos.length - 1].fila = fila;
    }

    /**
     * `info()` es la puerta que ya publica el núcleo, la misma que lee el banco.
     * Si un campo no existe, se ve en pantalla como un hueco — y ése es el
     * comportamiento que se quiere: un HUD que se inventa un cero es un HUD que
     * miente sobre un núcleo roto.
     */
    function pintar(info, nucleo = null) {
        for (const v of vivos) {
            const n = info?.[v.campo];
            if (v.barra) {
                const max = typeof v.de === 'number' ? v.de : (nucleo?.[v.de] ?? info?.[v.de] ?? 100);
                const pct = Math.max(0, Math.min(100, (n / max) * 100));
                v.relleno.style.width = pct + '%';
                v.caja.classList.toggle('baja', pct < (v.avisaBajo ?? 35));
                v.valor.textContent = Math.round(n) + (v.sufijo ?? '');
            } else {
                v.valor.textContent = typeof n === 'number' ? Math.round(n * 10) / 10 : (n ?? '—');
                if (v.tope) {
                    const t = typeof v.de === 'number' ? v.de : (nucleo?.[v.de] ?? info?.[v.de] ?? '');
                    v.tope.textContent = t;
                }
            }
        }
    }

    return { pintar, nodo: raiz };
}

/**
 * El pie con los mandos. Tres líneas, pero eran las mismas tres en cada etapa y
 * el texto también es del cartucho.
 */
export function montarPie(texto) {
    const pie = document.getElementById('pie') ?? (() => {
        const d = document.createElement('div');
        d.id = 'pie';
        document.body.appendChild(d);
        return d;
    })();
    pie.textContent = texto;
    return pie;
}
