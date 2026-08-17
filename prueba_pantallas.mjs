/**
 * ¿SE VE BIEN EN TODAS LAS PANTALLAS? — la columna que faltaba en la ficha
 * ═══════════════════════════════════════════════════════════════════════════
 * Idea de Oscar. Y hacía falta porque hoy he encontrado DOS juegos impecables en
 * escritorio y rotos en el móvil, y ninguno de mis instrumentos lo buscaba:
 *
 *     mancala   4 de sus 6 hoyos FUERA de la pantalla en 390x844
 *     ajedrez   26 de sus 64 casillas FUERA
 *
 * Los dos llevaban ahí quién sabe cuánto. Y los dos se me presentaron disfrazados de
 * otra cosa: `tacto` decía «0 de 6 hoyos contestan» y «0 de 23 jugadas», que yo leí como
 * que el clic estaba roto. El clic estaba bien; lo que no cabía era el tablero. Cuatro
 * intentos perdidos en el ajedrez por creer el disfraz.
 *
 * ⚠️ UNA PANTALLA ESTRECHA NO ES UNA PEQUEÑA CON MENOS SITIO: ES OTRA FORMA.
 *
 * En Three el campo de visión que se declara es el VERTICAL; el horizontal sale de
 * multiplicarlo por el aspecto. Con 1280x800 (1,6) sobra ancho; con 390x844 (0,46) se ve
 * menos de la mitad de ancho que de alto. Un tablero apaisado es exactamente la forma que
 * peor encaja ahí, y ninguna cuenta hecha en escritorio lo predice.
 *
 * ⚠️ Y LO QUE NO SE CUENTA, QUE ES LA MITAD DEL TRABAJO
 *
 * Las manos de los RIVALES se salen de cuadro A PROPÓSITO en las mesas de cartas: están
 * boca abajo y de ellas sólo hace falta saber cuántas hay, así que el encuadre prioriza
 * que la TUYA se lea. Está documentado como decisión en `mesa_cartas.mjs`.
 *
 * Contarlas aquí daría 35 falsas alarmas y enterraría las dos verdaderas. Así que sólo
 * cuenta lo que una persona necesita alcanzar: sus propias cartas (`mano_0*`) y las
 * piezas del tablero. Elegir bien el denominador ES la medida.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const PUERTO = 9021;
const args = process.argv.slice(2);
const pedidos = args.filter(a => !a.startsWith('-'));

/**
 * Las cuatro formas que importan. El móvil tumbado va aparte del de pie porque es lo
 * que hace quien no ve bien algo — y si el encuadre sólo se calcula al arrancar, girar
 * el teléfono lo rompe otra vez.
 */
const PANTALLAS = [
    { nombre: 'móvil',    ancho: 390,  alto: 844 },
    { nombre: 'tumbado',  ancho: 844,  alto: 390 },
    { nombre: 'tableta',  ancho: 820,  alto: 1180 },
    { nombre: 'escritorio', ancho: 1280, alto: 800 },
];

const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));
const juegos = (pedidos.length ? pedidos : Object.keys(paginas)).filter(j => paginas[j]);

const srv = spawn('python', ['servir.py', String(PUERTO)], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), stdio: 'ignore',
});
const base = `http://127.0.0.1:${PUERTO}`;
for (let i = 0; i < 60; i++) {
    try { await fetch(`${base}/arcade/index.html`); break; } catch { await new Promise(r => setTimeout(r, 300)); }
}

const nav = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => {
    window.__CAP = null;
    const engancha = () => {
        if (!window.THREE?.WebGLRenderer || window.__p) return !!window.__p;
        const O = THREE.WebGLRenderer;
        function P(...a) {
            const i = new O(...a); const r = i.render.bind(i);
            i.render = function (s, c) { window.__CAP = { escena: s, camara: c }; return r(s, c); };
            return i;
        }
        P.prototype = O.prototype; THREE.WebGLRenderer = P; window.__p = true; return true;
    };
    if (!engancha()) { const t = setInterval(() => { if (engancha()) clearInterval(t); }, 20); setTimeout(() => clearInterval(t), 20000); }
});

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

console.log(`\n  ${juegos.length} juegos × ${PANTALLAS.length} pantallas`);
console.log(gris('  se cuenta lo que hay que ALCANZAR: tus cartas y las piezas del tablero.'));
console.log(gris('  las manos de los rivales se salen a propósito y no cuentan.\n'));
console.log('  juego        ' + PANTALLAS.map(p => p.nombre.padStart(12)).join('') + '\n');

const salida = {};
for (const juego of juegos) {
    const fila = {};
    for (const pant of PANTALLAS) {
        const p = await ctx.newPage();
        try {
            await p.setViewportSize({ width: pant.ancho, height: pant.alto });
            const pag = paginas[juego].pagina;
            await p.goto(`${base}/arcade/${pag}?semilla=7` + (pag === 'mesa.html' ? `&juego=${juego}` : ''),
                { waitUntil: 'load', timeout: 30000 });
            await p.waitForTimeout(4600);
            fila[pant.nombre] = await p.evaluate(() => {
                const c = window.__CAP;
                if (!c?.escena || !c?.camara) return null;
                /**
                 * ⚠️ EL PANEL ES UN RECTÁNGULO, NO UNA BANDA. Y ESTO ME DIO 96 FALSAS.
                 *
                 * La primera versión preguntaba `y < panel.bottom`, o sea trataba el panel
                 * como una franja horizontal que ocupa todo el ancho. En un móvil lo es. En
                 * escritorio el panel es una COLUMNA a la izquierda, así que todo lo que
                 * está a su derecha —y se ve perfectamente— caía por debajo de su borde
                 * inferior y se contaba como tapado: 96 casillas del ajedrez «tapadas» en
                 * una pantalla donde yo tengo una captura del tablero entero.
                 *
                 * Usar una dimensión donde hay dos. Se pregunta si el punto está DENTRO del
                 * rectángulo, que es lo que significa estar tapado.
                 */
                const panel = document.querySelector('.hud-panel')?.getBoundingClientRect();
                const enPanel = (x, y) => !!panel
                    && x >= panel.left - 4 && x <= panel.right + 4
                    && y >= panel.top - 4 && y <= panel.bottom + 4;
                const caja = new THREE.Box3(), v = new THREE.Vector3();
                let dentro = 0, fuera = 0, tapadas = 0;

                const cuenta = (x, y) => {
                    if (x < 2 || x > innerWidth - 2 || y < 2 || y > innerHeight - 2) fuera++;
                    else if (enPanel(x, y)) tapadas++;
                    else dentro++;
                };
                // Piezas: sólo las MÍAS o las del tablero. Ver la nota del denominador.
                c.escena.traverse((o) => {
                    if (!o.visible || !o.isMesh || !o.name) return;
                    if (!/^(p:|z\d+:v\d+|oculta)/.test(o.name)) return;
                    const zona = String(o.userData?.zona ?? '');
                    if (zona && !zona.startsWith('mano_0') && !zona.startsWith('mesa')) return;
                    caja.setFromObject(o);
                    if (caja.isEmpty()) return;
                    caja.getCenter(v).project(c.camara);
                    cuenta((v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight);
                });
                // Y las casillas, si el tablero dice dónde están.
                let g = null;
                c.escena.traverse((o) => { if (!g && o.userData?.rejillaMundo) g = { o, m: o.userData.rejillaMundo }; });
                if (g && g.m.cols * g.m.filas <= 400) {
                    for (let f = 0; f < g.m.filas; f++) for (let cc = 0; cc < g.m.cols; cc++) {
                        const w = new THREE.Vector3(cc * g.m.lado + g.m.dx, g.m.y ?? 0, f * g.m.lado + g.m.dz);
                        g.o.localToWorld(w); w.project(c.camara);
                        cuenta((w.x + 1) / 2 * innerWidth, (1 - w.y) / 2 * innerHeight);
                    }
                }
                return { dentro, fuera, tapadas };
            });
        } catch { fila[pant.nombre] = null; }
        await p.close();
    }
    salida[juego] = fila;

    /**
     * ⚠️ «FUERA» Y «BAJO EL PANEL» SON DOS PROBLEMAS DISTINTOS, Y MEZCLARLOS ENGAÑA.
     *
     * La primera versión imprimía «0 fuera» cuando lo que fallaba era que las piezas
     * caían DEBAJO del panel del HUD. Un mensaje que dice cero de lo que enseña es peor
     * que no decir nada, y además manda a arreglar lo que no toca: fuera de cuadro se
     * arregla con la cámara, y bajo el panel se arregla plegando o moviendo el panel.
     */
    const pinta = (r) => {
        if (!r) return gris('   —      ');
        if (r.dentro + r.fuera + r.tapadas === 0) return gris('  s/datos ');
        if (r.fuera === 0 && r.tapadas === 0) return verde(`   ${String(r.dentro).padStart(3)} ✓    `);
        if (r.fuera > 0) return rojo(` ${r.fuera} fuera`.padEnd(12));
        return rojo(` ${r.tapadas} tapadas`.padEnd(12));
    };
    console.log(`  ${juego.padEnd(12)} ` + PANTALLAS.map(pa => pinta(fila[pa.nombre])).join(''));
}

await nav.close();
srv.kill();

/**
 * ⚠️ SÓLO SE ESCRIBE LA PASADA COMPLETA. Guardar una parcial dejaría a los juegos no
 * medidos como si estuvieran bien, que es la mentira más cómoda de todas.
 */
if (!pedidos.length) {
    await writeFile(new URL('./public/data/pantallas.json', import.meta.url), JSON.stringify({
        fecha: new Date().toISOString().slice(0, 10),
        pantallas: PANTALLAS,
        nota: 'Sólo se cuenta lo alcanzable: tus cartas y las piezas del tablero. Las manos de los rivales se salen a propósito.',
        juegos: salida,
    }, null, 1));
    console.log(`\n  escrito public/data/pantallas.json`);
}

/**
 * ⚠️ EL VEREDICTO CUENTA LAS DOS COSAS, Y NO PRESUME DE LOS 35 SI MIDIÓ CINCO.
 *
 * La primera versión sólo miraba `fuera`, así que decía «en las cuatro pantallas se
 * alcanza todo» debajo de una tabla llena de problemas — el resumen contradiciendo al
 * detalle en la misma pantalla. Y decía «en los 35» aunque se le hubieran pasado cinco
 * juegos por argumento. Un resumen que no cuadra con lo que tiene encima enseña a no
 * leer los resúmenes.
 */
const conFuera = Object.entries(salida).filter(([, f]) => Object.values(f).some(r => r && r.fuera > 0));
const conTapadas = Object.entries(salida).filter(([, f]) => Object.values(f).some(r => r && r.fuera === 0 && r.tapadas > 0));
const cuantos = Object.keys(salida).length;
if (!conFuera.length && !conTapadas.length) {
    console.log(`\n  ${verde(`en las cuatro pantallas se alcanza todo, en los ${cuantos} medidos`)}\n`);
} else {
    if (conFuera.length) {
        console.log(`\n  ${rojo(`${conFuera.length} con piezas FUERA DE CUADRO`)} (se arregla con la cámara): `
                  + conFuera.map(([j]) => j).join(', '));
    }
    if (conTapadas.length) {
        console.log(`  ${rojo(`${conTapadas.length} con piezas BAJO EL PANEL`)} (se arregla plegando o moviendo el panel): `
                  + conTapadas.map(([j]) => j).join(', '));
    }
    console.log(gris(`  de ${cuantos} juegos medidos\n`));
}
process.exit(conFuera.length || conTapadas.length ? 1 : 0);
