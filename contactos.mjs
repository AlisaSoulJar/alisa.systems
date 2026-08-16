/**
 * contactos.mjs — los 35 juegos en UNA imagen, para poder mirarlos de verdad
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run contactos
 *
 * ⚠️ POR QUÉ EXISTE: LAS CAPTURAS YA SE HACÍAN Y NO LAS MIRABA NADIE
 *
 * `laboratorio_mesas.mjs` deja 41 capturas en `capturas_laboratorio/` en cada
 * pasada. Están en `.gitignore`, pesan 5 MB, y el día que se escribió esto las
 * últimas eran de la tarde anterior — o sea, de antes de una noche entera de
 * arreglos. El problema nunca fue que faltaran capturas: es que abrir cuarenta y
 * una imágenes de una en una no lo hace nadie dos veces.
 *
 * Y mirar SÍ hace falta. Esta semana los dos fallos más gordos —la comida de snake
 * y el descarte de entropy, los dos tapados por el panel— aparecieron mirando una
 * captura, no midiendo. Los instrumentos vinieron después, a preguntarle lo mismo a
 * los 35. El orden que funciona es: **mirar encuentra, medir explica, el
 * instrumento generaliza**; y saltarse el primer paso deja una lista visual que no
 * baja en tres semanas.
 *
 * Así que esto no mide nada ni aprueba nada: sólo hace que mirar cueste treinta
 * segundos en vez de cuarenta y una aperturas. Es una herramienta para OJOS.
 *
 * ⚠️ LO QUE ESTO **NO** ES
 *
 * No es una comprobación y no sale en `npm test`: no puede fallar, porque no sabe
 * qué es «estar bien». Una máquina no dice «esto está feo». Lo que sí puede decir
 * una captura es qué CAMBIÓ respecto de la anterior, y eso va aparte.
 */
import { chromium } from 'playwright-core';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(AQUI, 'capturas_laboratorio');

const paginas = JSON.parse(await readFile(path.join(AQUI, 'public/data/paginas.json'), 'utf-8'));
const ficheros = new Set(await readdir(DIR));

/**
 * El orden es el del catálogo, no alfabético: así los parecidos caen juntos y una
 * rareza de familia —tres tableros iguales y el cuarto de otro color— salta a la
 * vista sin buscarla.
 */
const juegos = Object.keys(paginas).filter(j => paginas[j]);
const filas = juegos.map(j => ({
    juego: j,
    fichero: ficheros.has(`${j}.png`) ? `${j}.png` : null,
}));

const sinCaptura = filas.filter(f => !f.fichero);
const conCaptura = filas.filter(f => f.fichero);

/**
 * Cada miniatura lleva su nombre DEBAJO y no encima: al recorrer una rejilla la
 * vista va a la imagen primero, y el rótulo sirve para volver a ella, no para
 * encontrarla. Y las que faltan se pintan como hueco con su nombre — un juego sin
 * captura es un dato, no una casilla que se calla.
 */
const html = `<!doctype html><meta charset="utf-8">
<title>ALISA — hoja de contactos</title>
<style>
 body{margin:0;padding:28px;background:#12141a;color:#e6e9ef;
      font:13px/1.4 ui-monospace,SFMono-Regular,monospace}
 h1{font-size:15px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 4px}
 p.sub{color:#8a93a3;margin:0 0 22px;font-size:12px}
 .rejilla{display:grid;grid-template-columns:repeat(5,1fr);gap:18px 14px}
 figure{margin:0}
 img{width:100%;aspect-ratio:16/9;object-fit:cover;object-position:top center;
     background:#000;border:1px solid #2a2f3a;border-radius:4px;display:block}
 .falta{width:100%;aspect-ratio:16/9;border:1px dashed #4a3030;border-radius:4px;
        background:#1b1416;display:flex;align-items:center;justify-content:center;
        color:#c47b7b;font-size:11px;letter-spacing:.08em}
 figcaption{margin-top:5px;color:#aab3c2;letter-spacing:.04em}
 figcaption.ausente{color:#c47b7b}
</style>
<h1>Hoja de contactos — ${conCaptura.length} de ${filas.length} juegos</h1>
<p class="sub">Generada por contactos.mjs. Las capturas salen de <code>npm run laboratorio</code>;
 si alguna está vieja, es que esa pasada es vieja. Esto no aprueba nada: es para mirar.</p>
<div class="rejilla">
${filas.map(f => f.fichero
    // Ruta a secas: el HTML se escribe DENTRO de `capturas_laboratorio/`, así que
    // repetir la carpeta la buscaba anidada y salían las 35 en negro… mientras el
    // script decía «35/35 juegos con captura». La primera pasada de esta herramienta
    // se cazó a sí misma, que es exactamente para lo que sirve mirar.
    ? `<figure><img src="./${f.fichero}" alt="${f.juego}">
       <figcaption>${f.juego}</figcaption></figure>`
    : `<figure><div class="falta">sin captura</div>
       <figcaption class="ausente">${f.juego}</figcaption></figure>`).join('\n')}
</div>`;

const salidaHtml = path.join(AQUI, 'capturas_laboratorio', '_hoja.html');
await writeFile(salidaHtml, html);

const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await (await b.newContext({ viewport: { width: 1900, height: 1200 },
                                      deviceScaleFactor: 1 })).newPage();
await p.goto('file:///' + salidaHtml.replace(/\\/g, '/'), { waitUntil: 'load' });
await p.waitForTimeout(1200);

/**
 * ⚠️ QUE EL FICHERO EXISTA NO ES QUE LA IMAGEN SE VEA, Y LA PRIMERA VERSIÓN DE ESTO
 *    CONFUNDÍA LAS DOS COSAS.
 *
 * Comprobaba `readdir` y anunciaba «35/35 juegos con captura» tan contento — con la
 * ruta mal puesta y las treinta y cinco miniaturas en negro. Una herramienta para
 * mirar que no comprueba si hay algo que mirar es la broma más cara posible, así que
 * se le pregunta al navegador: `naturalWidth` sólo es mayor que cero si el píxel
 * llegó de verdad.
 */
const cargadas = await p.evaluate(() =>
    [...document.querySelectorAll('img')].filter(i => i.naturalWidth > 0).length);

const salidaPng = path.join(AQUI, 'capturas_laboratorio', '_hoja.png');
await p.screenshot({ path: salidaPng, fullPage: true });
await b.close();

if (cargadas !== conCaptura.length) {
    console.log(`\n  ✗ la hoja salió con ${cargadas} imágenes de ${conCaptura.length}:`
        + ` el resto no cargó y saldrían en negro.`);
    process.exit(1);
}

console.log(`\n  ${conCaptura.length}/${filas.length} juegos con captura, y las ${cargadas} se ven`);
if (sinCaptura.length) {
    console.log(`  sin captura: ${sinCaptura.map(f => f.juego).join(', ')}`);
    console.log('  (corre `npm run laboratorio` para tenerlas todas)');
}
console.log(`\n  hoja:  capturas_laboratorio/_hoja.png`);
console.log(`  y en vivo, con zoom:  capturas_laboratorio/_hoja.html\n`);
