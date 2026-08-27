/**
 * canto.mjs — ¿se ve dónde acaba la mesa y empieza el suelo?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     node canto.mjs brisca        (con el servidor local en el 8000)
 *
 * POR QUÉ EXISTE
 *
 * `arcade/sala.html` —la sala de bolsillo, lo que se abre al sentarse a una mesa
 * de la Sala del Huevo— tenía suelo `#2b211c` y muro `#191521`, y se pasó al
 * espacio abierto y blanco de la sala grande. Contra un suelo marrón, una tapa
 * `#ffffff` se recorta sola; contra el suelo blanco de allí, no está claro que se
 * recorte. Eso no se puede decidir mirando: se mide.
 *
 * QUÉ MIDE Y CÓMO
 *
 * Igual que `legibilidad.mjs`: las POSICIONES las calcula la página, que es quien
 * las sabe, y los COLORES se leen fuera, sobre la captura — el renderizador no
 * conserva el buffer y leerlo desde dentro da negro.
 *
 * Proyecta el borde de la tapa (Ø3,0 a 0,98) en dieciséis radios, y en cada uno
 * mira a seis píxeles hacia dentro y hacia fuera de la silueta. El umbral es el de
 * la casa, 24 sobre 255, el mismo que usa `legibilidad.mjs`.
 *
 * LO QUE CONTESTÓ, PARA QUE NO HAYA QUE VOLVER A PREGUNTARLO
 *
 * Nueve de once bordes dan CERO: `246,246,246` a los dos lados. Los dos que pasan
 * no son el canto, es la esquina del tapete asomando. No es un fallo que se pueda
 * apagar con luz —las dos caras miran hacia arriba y reciben lo mismo— ni con
 * sombra —desde la silla, la propia tapa oculta los dos metros y medio de suelo
 * donde la sombra cae—. El porqué entero está en `sala.html`, donde se decide.
 *
 * O sea que esto NO está en `npm test`: no vigila un invariante, contesta una
 * pregunta. Y la contesta con un número, que era lo que hacía falta para poder
 * decir «la mesa no se recorta» sin que fuera una impresión.
 */
import { chromium } from 'playwright-core';
import { leerPNG, colorEn, distanciaDeValor } from './png.mjs';

const P = 8000;
const juego = process.argv[2] ?? 'brisca';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${P}/arcade/sala.html?juego=${juego}`, { waitUntil: 'load' });
await p.waitForTimeout(5000);

/**
 * ⚠️ MI PRIMERA VERSIÓN MEDÍA PÍXELES QUE LA PROPIA MESA TAPABA.
 *
 * Cogía un punto sobre la tapa y otro en el suelo, al mismo ángulo, y comparaba.
 * Pero desde una cámara que mira HACIA ABAJO, el suelo del fondo queda detrás y
 * debajo de la tapa: el píxel que yo llamaba «suelo» era tapa. Salía verde —color
 * del tapete— y estuve a punto de apuntarlo como una medida.
 *
 * Así que no se eligen dos puntos del mundo: se busca la SILUETA en pantalla —el
 * borde de la tapa proyectado— y se mira a un lado y a otro de ella, a seis
 * píxeles. Los dos son visibles por construcción, porque están pegados al borde
 * que separa lo uno de lo otro. Es la pregunta de verdad: ¿hay un borde ahí?
 */
const pares = await p.evaluate(() => {
    const A = window.ALISA_ANFITRION, cam = A.camara;
    const r = A.lienzo.getBoundingClientRect();
    const proy = (x, y, z) => {
        const v = new THREE.Vector3(x, y, z).project(cam);
        return [(v.x * 0.5 + 0.5) * r.width, (-v.y * 0.5 + 0.5) * r.height];
    };
    const RADIO = 1.5, ALTO = 0.98;   // tapa de la mesa: Ø3,0 a 0,92 + 0,055 de canto
    const SEPARA = 6;                 // píxeles a cada lado del borde
    const salida = [];
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const sx = Math.sin(a), sz = Math.cos(a);
        // el borde y un punto un pelo más adentro: su diferencia da la normal en pantalla
        const borde = proy(sx * RADIO, ALTO, sz * RADIO);
        const dentroM = proy(sx * (RADIO - 0.25), ALTO, sz * (RADIO - 0.25));
        const nx = borde[0] - dentroM[0], ny = borde[1] - dentroM[1];
        const n = Math.hypot(nx, ny);
        if (!(n > 0.001)) continue;
        const ux = nx / n, uy = ny / n;
        salida.push({
            a: Math.round(a * 57.3),
            dentro: [Math.round(borde[0] - ux * SEPARA), Math.round(borde[1] - uy * SEPARA)],
            fuera:  [Math.round(borde[0] + ux * SEPARA), Math.round(borde[1] + uy * SEPARA)],
        });
    }
    return salida;
});

const img = leerPNG(await p.screenshot());
const mirar = ([x, y]) => colorEn(img, x, y, 1366);

console.log(`\n  ${juego} — ¿se distingue la tapa del suelo?\n`);
let visibles = 0, medidos = 0;
for (const q of pares) {
    const d = mirar(q.dentro), f = mirar(q.fuera);
    if (!d || !f) { console.log(`   ${String(q.a).padStart(3)}°  fuera de cuadro`); continue; }
    medidos++;
    const dif = Math.round(distanciaDeValor(d, f));
    if (dif >= 24) visibles++;
    console.log(`   ${String(q.a).padStart(3)}°  tapa ${d.join(',').padEnd(11)} · suelo ${f.join(',').padEnd(11)}`
              + `  → ${String(dif).padStart(3)} ${dif >= 24 ? '✓' : '·'}`);
}
console.log(`\n  ${visibles}/${medidos} bordes por encima de 24\n`);
await b.close();
