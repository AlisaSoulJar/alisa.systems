/**
 * png.mjs — leer los píxeles de una captura, sin dependencias
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Vivía dentro de `laboratorio_mesas.mjs`, que era su único usuario. Sale aquí
 * porque ahora son dos —`legibilidad.mjs` también mira colores— y dos copias de un
 * decodificador se separan igual que dos copias de una lista. Este proyecto lleva
 * seis arreglos del mismo fallo con otra ropa.
 *
 * ⚠️ Y POR QUÉ SE LEE UNA CAPTURA Y NO EL LIENZO DE LA PÁGINA.
 *
 * Lo natural sería copiar el `<canvas>` a uno 2D y leer de ahí, y es lo que hacía
 * `mirar.mjs`. No funciona: el renderizador se crea sin `preserveDrawingBuffer`, así
 * que fuera del fotograma el buffer está vacío y `drawImage` devuelve NEGRO.
 *
 * Medido el 15-08-2026 en las damas: 0 píxeles vivos de 9502 muestras, brillo medio
 * 0. O sea que la comprobación de «¿se sale el tablero por los bordes?» llevaba
 * desde siempre midiendo una imagen negra y diciendo que todo estaba bien. Pasaba
 * por vacía, que es la peor forma de pasar.
 *
 * Poner `preserveDrawingBuffer: true` lo arreglaría y costaría rendimiento a TODO EL
 * MUNDO para que una prueba pueda mirar. La captura de Playwright ve exactamente lo
 * que ve una persona y no le cuesta nada a quien juega.
 *
 * Sólo sabe leer PNG de 8 bits sin entrelazar, que es lo que hace Playwright. Si un
 * día llega otro, lanza en vez de devolver números inventados.
 */
import { inflateSync } from 'node:zlib';

export function leerPNG(buf) {
    let i = 8, ancho = 0, alto = 0, canales = 0, datos = [];
    while (i < buf.length) {
        const largo = buf.readUInt32BE(i);
        const tipo = buf.toString('ascii', i + 4, i + 8);
        const cuerpo = buf.subarray(i + 8, i + 8 + largo);
        if (tipo === 'IHDR') {
            ancho = cuerpo.readUInt32BE(0);
            alto = cuerpo.readUInt32BE(4);
            if (cuerpo[8] !== 8) throw new Error(`PNG de ${cuerpo[8]} bits, no lo sé leer`);
            if (cuerpo[12] !== 0) throw new Error('PNG entrelazado, no lo sé leer');
            canales = { 0: 1, 2: 3, 4: 2, 6: 4 }[cuerpo[9]];
            if (!canales) throw new Error(`PNG de tipo ${cuerpo[9]}, no lo sé leer`);
        } else if (tipo === 'IDAT') datos.push(cuerpo);
        else if (tipo === 'IEND') break;
        i += 12 + largo;
    }
    const crudo = inflateSync(Buffer.concat(datos));
    const px = Buffer.alloc(ancho * alto * canales);
    const bpp = canales;
    for (let y = 0; y < alto; y++) {
        const filtro = crudo[y * (ancho * bpp + 1)];
        const linea = crudo.subarray(y * (ancho * bpp + 1) + 1, (y + 1) * (ancho * bpp + 1));
        for (let x = 0; x < ancho * bpp; x++) {
            const a = x >= bpp ? px[y * ancho * bpp + x - bpp] : 0;
            const b = y > 0 ? px[(y - 1) * ancho * bpp + x] : 0;
            const c = (x >= bpp && y > 0) ? px[(y - 1) * ancho * bpp + x - bpp] : 0;
            let v = linea[x];
            if (filtro === 1) v += a;
            else if (filtro === 2) v += b;
            else if (filtro === 3) v += (a + b) >> 1;
            else if (filtro === 4) {
                const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
            }
            px[y * ancho * bpp + x] = v & 0xff;
        }
    }
    return { ancho, alto, canales, px };
}

/**
 * El color en un punto, en coordenadas de PÁGINA (CSS), no de imagen.
 *
 * Playwright captura al factor de escala del dispositivo, así que en un móvil la
 * imagen mide el doble que la ventana. Confundir los dos espacios lee el color del
 * sitio equivocado y no da error: da un número plausible y falso.
 */
export function colorEn(img, xCss, yCss, anchoCss) {
    const escala = img.ancho / anchoCss;
    const x = Math.round(xCss * escala), y = Math.round(yCss * escala);
    if (x < 0 || y < 0 || x >= img.ancho || y >= img.alto) return null;
    const i = (y * img.ancho + x) * img.canales;
    return [img.px[i], img.px[i + 1], img.px[i + 2]];
}

/** Distancia de color: el canal que más se separa. Basta para «¿se distingue?». */
export const distanciaColor = (a, b) => (a && b)
    ? Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
    : null;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL MISMO COLOR, VISTO POR QUIEN NO DISTINGUE EL ROJO DEL VERDE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ «COLORES DISTINTOS» NO ES LA PREGUNTA. LA PREGUNTA ES «DISTINGUIBLES».
 *
 * El azul del dueño 0 (`0x2a3550`) y el rojo del dueño 1 (`0xc0392b`) están a 150
 * puntos de distancia: separadísimos, y cualquier medida en RGB dice que van bien.
 * Para un deuteranope —una de cada doce personas con cromosoma Y— los dos se
 * acercan mucho, porque lo que los separa es justo el eje que esa vista no tiene.
 *
 * Así que medir en RGB y darlo por bueno es medir con la vista de quien programa.
 * Esto convierte los dos colores a como se ven SIN ese eje y compara ahí.
 *
 * Es la aproximación de Viénot–Brettel–Mollon, la de siempre para esto: se pasa a
 * espacio LMS, se reconstruye el canal que falta a partir de los otros dos y se
 * vuelve. No es un simulador clínico y no hace falta que lo sea — hace falta para
 * contestar «¿estos dos bandos se distinguen sin el tono?», que es una pregunta de
 * sí o no.
 *
 * La respuesta cuando sale que NO no es cambiar el color: es que la FORMA los
 * distinga, que es lo que pide la guía de accesibilidad de Board Game Arena y lo
 * que hace el pintor dando un número de lados por dueño.
 */
const aLMS = ([r, g, b]) => [
    0.31399022 * r + 0.63951294 * g + 0.04649755 * b,
    0.15537241 * r + 0.75789446 * g + 0.08670142 * b,
    0.01775239 * r + 0.10944209 * g + 0.87256922 * b,
];
const deLMS = ([l, m, s]) => [
    5.47221206 * l - 4.6419601 * m + 0.16963708 * s,
    -1.1252419 * l + 2.29317094 * m - 0.1678952 * s,
    0.02980165 * l - 0.19318073 * m + 1.16364789 * s,
].map(v => Math.max(0, Math.min(255, Math.round(v))));

export function comoLoVeUnDaltonico(rgb, tipo = 'deuteranopia') {
    if (!rgb) return null;
    const [l, m, s] = aLMS(rgb);
    // Se reconstruye el cono que falta desde los otros dos.
    if (tipo === 'protanopia') return deLMS([0.0 * l + 1.05118294 * m - 0.05116099 * s, m, s]);
    return deLMS([l, 0.9513092 * l + 0.0 * m + 0.04866992 * s, s]);   // deuteranopia
}

/** Lo peor de las dos vistas: si en alguna se confunden, se confunden. */
export const distanciaSinTono = (a, b) => Math.min(
    distanciaColor(comoLoVeUnDaltonico(a, 'deuteranopia'), comoLoVeUnDaltonico(b, 'deuteranopia')),
    distanciaColor(comoLoVeUnDaltonico(a, 'protanopia'), comoLoVeUnDaltonico(b, 'protanopia')),
);
