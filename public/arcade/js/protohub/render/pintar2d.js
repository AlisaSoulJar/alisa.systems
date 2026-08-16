/**
 * pintar2d.js — el sustrato, en un canvas. Una vez, para los diecinueve.
 * ═══════════════════════════════════════════════════════════════════════════
 *     pintar2d(ctx, sustrato, { ancho, alto })
 *
 * ⚠️ ES UNA FUNCIÓN PURA DEL SUSTRATO, Y ESO ES EL PUNTO ENTERO.
 * No sabe a qué se juega. No pregunta por el turno, ni por las reglas, ni por el
 * marcador. Recibe `{ rejilla, piezas, zonas }` y dibuja. Mismo sustrato, mismo
 * cuadro — siempre.
 *
 * Eso es lo que significa «el render es un espectador, no un nervio». Los
 * catorce visualizadores a medida que hay hoy son lo contrario: cada uno se
 * inventó cómo leer el estado, y de ahí salieron los bugs de la semana —
 * `syncGoState` leyendo el tablero de dos formas en la misma función, las
 * piedras sin dibujarse durante meses.
 *
 * ⚠️ Y POR QUÉ 2D ANTES QUE 3D, TENIENDO 25 FACTORÍAS
 * Porque esto funciona sin WebGL, sin luces, sin assets y sin ajustar una cámara
 * por pieza. Un género nuevo sale jugable el día que tiene reglas. El 3D es la
 * misma matriz con altura —`pintar3d.js`— y llega después, no en vez de.
 */

import { colorDe, enCSS } from './paleta.js';

/** Paleta. Sobria a propósito: esto es un instrumento, no una portada. */
const COLOR = {
    fondo: '#f4f6f8', linea: '#c9d3dd', muro: '#39485c',
    celda: '#ffffff', celdaAlt: '#e9eef3',
    jugador0: '#1a2230', jugador1: '#c0392b', neutro: '#7f8c8d',
    texto: '#1a2230', oculto: '#b9c4d0', sinVer: '#dde3ea',
    velo: 'rgba(58,72,92,0.34)',
};

/**
 * ⚠️ EL DISCO LLEVABA LA INICIAL EN INGLÉS, Y ESA ES UNA PUERTA DE MENOS.
 *
 * Un peón salía con una `P` y una dama con una `Q`: las iniciales de `pawn` y `queen`.
 * Para un agente de visión eso no es la pieza, es su nombre en un idioma — tiene que
 * saber inglés y ajedrez para leer un tablero. El símbolo lo entiende cualquiera que
 * haya visto un tablero, y es el mismo dibujo que ve una persona.
 *
 * Se pintan los glifos SÓLIDOS en los dos bandos, no el par sólido/hueco: quién es de
 * quién ya lo dice el color del disco, y los huecos sobre un disco de color no se ven.
 *
 * ⚠️ Y XIANGQI NO ES AJEDREZ CON OTRO NOMBRE.
 *
 * Comparte `r n b k p` con el ajedrez —carro, caballo, elefante, general, soldado— y
 * tiene dos que no existen allí: el consejero (`a`) y el cañón (`c`), que no tienen
 * glifo de ajedrez. Mezclar `♜` con `砲` sería peor que las iniciales, así que el
 * juego chino lleva sus caracteres, que es lo que las piezas dicen de verdad. Se usa
 * el juego de un solo bando: el sustrato da el tipo y el dueño, no el color histórico.
 */
const SIMBOLOS_AJEDREZ = { r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', p: '♟' };
const SIMBOLOS_XIANGQI = { r: '車', n: '馬', b: '象', a: '士', k: '將', c: '砲', p: '卒' };

/** Cómo se dibuja cada tipo de pieza. Lo que no esté aquí sale como disco. */
const FORMAS = {
    muro: 'cuadro', bolita: 'punto', comida: 'punto',
    cabeza: 'cuadro', cuerpo: 'cuadro',
    coche_der: 'flecha_der', coche_izq: 'flecha_izq',
};

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{rejilla, piezas, zonas, leyenda}} sus
 */
export function pintar2d(ctx, sus, { ancho, alto } = {}) {
    const W = ancho ?? ctx.canvas.width;
    const H = alto ?? ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COLOR.fondo;
    ctx.fillRect(0, 0, W, H);
    if (!sus) return;

    // Las zonas (cartas) ocupan una franja abajo; el tablero, el resto.
    const franja = sus.zonas?.length ? Math.min(H * 0.42, 26 * sus.zonas.length + 16) : 0;
    const altoTablero = H - franja;

    if (sus.rejilla) pintarRejilla(ctx, sus, W, altoTablero);
    if (sus.zonas?.length) pintarZonas(ctx, sus.zonas, W, H - franja, franja);
}

function pintarRejilla(ctx, sus, W, H) {
    const { ancho: cols, alto: filas, celdas, niebla, sinVista } = sus.rejilla;
    if (!(cols > 0 && filas > 0)) return;

    // Celdas cuadradas y centradas: un tablero deformado se lee mal y, peor,
    // engaña sobre la geometría del juego.
    const lado = Math.max(2, Math.floor(Math.min(W / cols, H / filas)));
    const x0 = Math.floor((W - lado * cols) / 2);
    const y0 = Math.floor((H - lado * filas) / 2);

    for (let f = 0; f < filas; f++) {
        for (let c = 0; c < cols; c++) {
            // Lo no explorado se pinta, y se pinta DISTINTO. Dejarlo del color
            // del suelo diría «despejado» de un sitio donde nadie ha estado.
            if (niebla?.[f * cols + c]) {
                ctx.fillStyle = COLOR.sinVer;
                ctx.fillRect(x0 + c * lado, y0 + f * lado, lado - 1, lado - 1);
                continue;
            }
            const v = celdas?.[f * cols + c] ?? 0;
            /**
             * ⚠️ EL CONTRATO DEL TERRENO: 0 vacío · 1 muro · 2 destino ·
             * más de 2, una CUENTA (las semillas de un hoyo de mancala).
             *
             * La primera versión pintaba el número siempre que fuera mayor que
             * uno, así que los destinos de sokoban salían como un «2» — un
             * número donde debía haber una marca. Y el descriptor de texto sí lo
             * distinguía (`o`), o sea que el dibujo y el texto contaban cosas
             * distintas del MISMO sustrato. Eso es justo lo que este contrato
             * existe para impedir.
             */
            ctx.fillStyle = v === 1 ? COLOR.muro
                          : ((f + c) % 2 ? COLOR.celdaAlt : COLOR.celda);
            ctx.fillRect(x0 + c * lado, y0 + f * lado, lado - 1, lado - 1);

            const cx = x0 + c * lado + lado / 2, cy = y0 + f * lado + lado / 2;
            if (v === 2) {
                // Destino: un anillo. Se ve debajo de la pieza que lo ocupe, que
                // es lo que hace falta para saber si una caja está colocada.
                ctx.strokeStyle = COLOR.jugador1;
                ctx.lineWidth = Math.max(1, lado * 0.08);
                ctx.beginPath(); ctx.arc(cx, cy, lado * 0.24, 0, Math.PI * 2); ctx.stroke();
            } else if (v > 2 && lado >= 14) {
                ctx.fillStyle = COLOR.texto;
                ctx.font = `${Math.floor(lado * 0.45)}px ui-monospace, monospace`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(String(v), cx, cy);
            }
        }
    }

    /**
     * ⚠️ `sinVista` NO ES NIEBLA: el terreno SE PINTA, y encima va un velo.
     *
     * Son dos ignorancias distintas y por eso son dos campos. `niebla` es «no sé
     * qué hay aquí» —se tapa entero—; `sinVista` es «conozco el sitio pero ahora
     * mismo no lo veo», que es lo que pasa en la nave: sabes dónde está el
     * pasillo, no sabes quién está en él. El velo dice exactamente eso: se ve la
     * forma, no la ocupación.
     */
    if (sinVista) {
        ctx.fillStyle = COLOR.velo;
        for (let f = 0; f < filas; f++) {
            for (let c = 0; c < cols; c++) {
                if (sinVista[f * cols + c]) ctx.fillRect(x0 + c * lado, y0 + f * lado, lado - 1, lado - 1);
            }
        }
    }

    /**
     * Qué alfabeto toca se decide MIRANDO las piezas que hay, no pasando el nombre del
     * juego: el consejero y el cañón sólo existen en xiangqi, así que su presencia lo
     * identifica. Preguntar el juego obligaría a que esta función lo supiera, y hoy
     * pinta los 35 sin saber a cuál está pintando — que es justo por lo que funciona.
     */
    const tipos = new Set((sus.piezas ?? []).map(p => p.t));
    const simbolos = (tipos.has('a') || tipos.has('c')) ? SIMBOLOS_XIANGQI : SIMBOLOS_AJEDREZ;

    for (const p of (sus.piezas ?? [])) {
        const cx = x0 + p.x * lado + lado / 2;
        const cy = y0 + p.y * lado + lado / 2;
        pintarPieza(ctx, p, cx, cy, lado, sus.leyenda, sus.colores, simbolos);
    }
}

function pintarPieza(ctx, p, cx, cy, lado, leyenda, colores, simbolos = SIMBOLOS_AJEDREZ) {
    /**
     * ⚠️ EL COLOR QUE DECLARA EL JUEGO MANDA TAMBIÉN AQUÍ.
     *
     * Esto tenía su propia tabla por dueño y `pintar3d.js` la suya. En cuanto el go
     * declaró `{0:'negro', 1:'blanco'}`, la mesa le hacía caso y este minimapa no:
     * piedras negras en el tablero y azules en el panel, a la vez y en la misma
     * pantalla. El mismo estado contado por dos proyecciones, y una mintiendo — que
     * es exactamente lo que el sustrato existe para impedir.
     *
     * Los dos leen ahora de `paleta.js`. Sin declaración, cada uno sigue con lo
     * suyo de siempre.
     */
    const declarado = colorDe(p.de, colores);
    const color = declarado !== null ? enCSS(declarado)
                : p.de === 0 ? COLOR.jugador0 : p.de === 1 ? COLOR.jugador1 : COLOR.neutro;
    const forma = FORMAS[p.t] ?? 'disco';
    ctx.fillStyle = color;

    if (forma === 'cuadro') {
        ctx.fillRect(cx - lado * 0.38, cy - lado * 0.38, lado * 0.76, lado * 0.76);
    } else if (forma === 'punto') {
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, lado * 0.14), 0, Math.PI * 2); ctx.fill();
    } else if (forma === 'flecha_der' || forma === 'flecha_izq') {
        const s = forma === 'flecha_der' ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(cx - s * lado * 0.35, cy - lado * 0.28);
        ctx.lineTo(cx + s * lado * 0.35, cy);
        ctx.lineTo(cx - s * lado * 0.35, cy + lado * 0.28);
        ctx.closePath(); ctx.fill();
    } else {
        ctx.beginPath(); ctx.arc(cx, cy, lado * 0.36, 0, Math.PI * 2); ctx.fill();
        // El símbolo encima, que es lo que distingue un peón de una dama sin
        // necesitar treinta y dos sprites.
        if (lado >= 16 && p.t && p.t.length <= 2) {
            const glifo = simbolos[p.t] ?? p.t.toUpperCase();
            const propio = glifo !== p.t.toUpperCase();
            ctx.fillStyle = '#fff';
            /**
             * El glifo va más grande que la letra y con su propia pila de fuentes: en
             * `ui-monospace` los símbolos de ajedrez y los caracteres chinos no están,
             * y el navegador dibuja el rectángulo vacío sin avisar de nada. Si no hay
             * símbolo para este tipo se cae a la inicial, con la fuente de antes.
             */
            ctx.font = propio
                ? `${Math.floor(lado * 0.62)}px "Segoe UI Symbol", "Noto Sans Symbols 2", "Noto Sans CJK SC", "Microsoft YaHei", "DejaVu Sans", sans-serif`
                : `bold ${Math.floor(lado * 0.42)}px ui-monospace, monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(glifo, cx, cy + 1);
        }
    }
}

function pintarZonas(ctx, zonas, W, y0, alto) {
    const fila = Math.min(24, alto / Math.max(1, zonas.length));
    zonas.forEach((z, i) => {
        const y = y0 + i * fila + 2;
        ctx.fillStyle = COLOR.texto;
        ctx.font = '11px ui-monospace, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const etiqueta = z.de === null || z.de === undefined ? z.id : `${z.id} ${z.de}`;
        ctx.fillText(etiqueta, 8, y + fila / 2);

        let x = 88;
        const ancho = 20, hueco = 3;
        for (const it of z.items) {
            ctx.fillStyle = COLOR.celda; ctx.fillRect(x, y, ancho, fila - 5);
            ctx.strokeStyle = COLOR.linea; ctx.strokeRect(x + .5, y + .5, ancho - 1, fila - 6);
            ctx.fillStyle = COLOR.texto;
            ctx.font = '9px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(String(it).slice(0, 4), x + ancho / 2, y + (fila - 5) / 2);
            x += ancho + hueco;
            if (x > W - 40) break;
        }
        // ⚠️ Lo oculto SE PINTA. Si las cartas boca abajo no salieran, el cuadro
        // diría que el rival no tiene nada — y eso es una mentira, no una
        // omisión. El sustrato las cuenta justo para poder dibujarlas.
        for (let k = 0; k < (z.ocultas ?? 0) && x < W - 40; k++) {
            ctx.fillStyle = COLOR.oculto; ctx.fillRect(x, y, ancho, fila - 5);
            x += ancho + hueco;
        }
        ctx.textAlign = 'left';
    });
}
