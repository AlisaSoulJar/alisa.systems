/**
 * prueba_vistas.mjs — ¿lo que se DIBUJA sale del sustrato?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La tesis de este banco, dicha por Oscar en una frase: **hay una sola fuente de
 * verdad, una matriz plana de texto, y cada puerta añade una capa encima sin cambiar
 * la de abajo.** El FSM lee la matriz; el LLM la matriz y el texto; un agente con
 * visión eso más la imagen; una persona todo eso más el arte y la animación.
 *
 * Si esa pila es cierta, entonces **todo lo que ve una persona tiene que estar en el
 * sustrato**. Una pieza dibujada que no esté en la matriz es una verdad fuera de la
 * fuente única, y ahí se acaba la comparación honesta: la persona estaría jugando con
 * información que el agente no tiene.
 *
 * Hasta hoy nada comprobaba eso. Se comprobaba que el sustrato EXISTA y sea válido
 * (`prueba_sustrato`), no que las vistas salgan de él.
 *
 * ⚠️ QUÉ SE PUEDE COMPROBAR Y QUÉ NO, QUE ES LA MITAD DEL VALOR
 *
 * Los juegos que pasan por el pintor genérico NOMBRAN lo que dibujan: `muro`,
 * `niebla`, `sueloA`, y las piezas con prefijo `p:` o `z<zona>:v<valor>`. En ésos la
 * cuenta se puede cruzar contra el sustrato y cuadra.
 *
 * Los que tienen visualizador propio dibujan mallas **sin nombre**: el ajedrez son
 * 97 objetos «(sin nombre)», y no hay forma de saber cuáles son piezas ni si salen
 * de la matriz. Ésos NO se cuentan como aprobados: se cuentan como no comprobables,
 * que es una verdad distinta. Confundir «no falla» con «no se ha mirado» es el error
 * que este proyecto lleva semanas persiguiendo.
 *
 * Bajar ese número es hacer que los visualizadores propios nombren lo que dibujan —
 * que además es lo que necesita un agente que mire la escena en vez de la imagen.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { JUEGOS, cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');
const { obtenerSustrato } = await impo('public/arcade/js/protohub/sustrato.js');
const paginas = JSON.parse(await readFile(path.join(AQUI, 'public/data/paginas.json'), 'utf8'));

/**
 * ⚠️ TRINQUETE AL REVÉS: los NO comprobables sólo pueden bajar.
 * Hoy son los que tienen visualizador propio y dibujan sin nombrar. Si sube, es que
 * alguien ha añadido un juego que pinta a su manera sin decir qué pinta.
 */
const TECHO_A_CIEGAS = 13;

const pedidos = process.argv.slice(2).filter(a => !a.startsWith('-'));
const juegos = (pedidos.length ? pedidos : JUEGOS).filter(j => paginas[j]);

const P = 8137 + 41;
const srv = spawn('python', ['servir.py', String(P)], { cwd: AQUI, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}

const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });

/** Mismo enganche probado que `bajo_el_panel.mjs`: se sustituye la CLASE. */
await ctx.addInitScript(() => {
    window.__escena = null;
    const engancha = () => {
        if (!window.THREE?.WebGLRenderer || window.__parcheado) return !!window.__parcheado;
        const Original = window.THREE.WebGLRenderer;
        function Parcheado(...args) {
            const inst = new Original(...args);
            const orig = inst.render.bind(inst);
            inst.render = function (escena, camara) { window.__escena = escena; return orig(escena, camara); };
            return inst;
        }
        Parcheado.prototype = Original.prototype;
        window.THREE.WebGLRenderer = Parcheado;
        window.__parcheado = true;
        return true;
    };
    if (!engancha()) { const r = setInterval(() => { if (engancha()) clearInterval(r); }, 20); }
});

console.log('\n¿Lo que se dibuja sale del sustrato?\n');

const cuadran = [], discrepan = [], aCiegas = [];
for (const juego of juegos) {
    let nSustrato = 0;
    try {
        const reglas = await cargarReglas(juego, {});
        const p0 = reglas.nuevaPartida({ semilla: 7, seed: 7 });
        const st = reglas.estado(p0, 0) ?? {};
        const sus = obtenerSustrato(juego, reglas, p0, st) ?? {};
        nSustrato = (sus.piezas ?? []).length
            + (sus.zonas ?? []).reduce((a, z) => a + ((z.items ?? z.contenido ?? []).length || 0), 0);
    } catch { /* si no carga, ya lo dicen otras comprobaciones */ }

    const pg = await ctx.newPage();
    let vista = null;
    try {
        await pg.goto(`http://127.0.0.1:${P}/arcade/${paginas[juego].pagina}?semilla=7`,
                      { waitUntil: 'load', timeout: 25000 });
        await pg.waitForTimeout(4200);
        vista = await pg.evaluate(() => {
            const esc = window.__escena;
            if (!esc) return null;
            let nombradas = 0, sinNombre = 0, piezas = 0;
            esc.traverse((o) => {
                if (!o.isMesh) return;
                const n = o.name || '';
                const cuantas = o.isInstancedMesh ? o.count : 1;
                if (!n) { sinNombre += cuantas; return; }
                nombradas += cuantas;
                // Las piezas del pintor genérico: `p:tipo:valor` o `z<zona>:v<valor>`.
                if (/^p:/.test(n) || /^z\d+:v/.test(n)) piezas += cuantas;
            });
            return { nombradas, sinNombre, piezas };
        });
    } catch { /* el fallo de carga lo cuentan otras */ }
    await pg.close();

    /**
     * ⚠️ «NO HABLA EL IDIOMA» NO ES LO MISMO QUE «DICE OTRA COSA».
     *
     * Primero puse «si tiene mallas con nombre, es comprobable», y las mesas de
     * cartas salieron como fallo: nombran el MUEBLE —`Node`, del modelo 3D— pero sus
     * cartas no llevan el prefijo de pieza, así que salía «el sustrato dice 8 y se
     * dibujan 0», que suena a bug gordo y sólo era que ese pintor no marca sus
     * piezas.
     *
     * La frontera real es si la escena marca ALGUNA pieza con el prefijo. Sin eso no
     * hay nada que cruzar, y decirlo es más honesto que contarlo como fallo — y
     * mucho más que contarlo como aprobado.
     */
    if (!vista || (vista.piezas === 0 && nSustrato > 0)) {
        aCiegas.push(juego);
        const cuantas = vista ? vista.sinNombre + vista.nombradas : '?';
        console.log(`  · ${juego.padEnd(12)} no se puede comprobar — dibuja ${cuantas} mallas sin marcar sus piezas`);
    } else if (vista.piezas === nSustrato) {
        cuadran.push(juego);
        console.log(`  ✓ ${juego.padEnd(12)} ${nSustrato} piezas en el sustrato, ${vista.piezas} dibujadas`);
    } else {
        discrepan.push({ juego, nSustrato, dibujadas: vista.piezas });
        console.log(`  ✗ ${juego.padEnd(12)} el sustrato dice ${nSustrato} y se dibujan ${vista.piezas}`);
    }
}

await b.close();
srv.kill();

console.log(`\n  ${cuadran.length} juegos dibujan exactamente lo que dice su sustrato`);
console.log(`  ${aCiegas.length} no se pueden comprobar (techo: ${TECHO_A_CIEGAS})`);

let fallos = 0;
if (discrepan.length) {
    fallos++;
    console.log(`\n  ✗ ${discrepan.length} dibujan algo que no está en la matriz, o al revés:`);
    for (const d of discrepan) console.log(`      ${d.juego}: sustrato ${d.nSustrato} · dibujadas ${d.dibujadas}`);
    console.log('    Si se ve una pieza que no está en el sustrato, la persona juega');
    console.log('    con información que el agente no tiene, y la comparación se cae.');
}
if (aCiegas.length > TECHO_A_CIEGAS) {
    fallos++;
    console.log(`\n  ✗ han subido los que dibujan sin decir qué dibujan: `
              + `${aCiegas.length} > ${TECHO_A_CIEGAS}.`);
    console.log('    Un visualizador que no nombra sus mallas no se puede cruzar con');
    console.log('    el sustrato, y tampoco lo puede leer un agente que mire la escena.');
} else if (aCiegas.length < TECHO_A_CIEGAS && !pedidos.length) {
    console.log(`\n  ↑ bajaron a ${aCiegas.length}: aprieta TECHO_A_CIEGAS.`);
}
console.log('');
process.exit(fallos ? 1 : 0);
