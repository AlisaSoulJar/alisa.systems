/**
 * ¿POR QUÉ `apartarDelPanel()` NO APARTA NADA EN SNAKE?
 *
 * El mecanismo está: snake carga `montarMesa`, que carga `encuadre.js`, así que
 * `window.ALISA_ENCUADRE` existe. Y `SovereignBoardEngine` llama a `apartarDelPanel()`
 * justo después de `onInit3D`. Aun así la comida sigue cayendo en (269,180), debajo del
 * panel.
 *
 * La función tiene CINCO puertas de salida antes de hacer nada. Esto pregunta por cuál
 * se va, en vez de adivinarlo:
 *
 *   1. no hay cámara o no hay ALISA_ENCUADRE
 *   2. no hay `.hud-panel`
 *   3. el panel no es una columna (ancho fuera de 5%–50% de la pantalla)
 *   4. `cajaReal` de la escena está vacía  ← la sospecha: al llamarse justo tras
 *      `onInit3D`, en snake sólo hay el suelo y el grid, y el grid es LineSegments
 *   5. `invade <= 0`, o sea que no hay nada que ganar
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const RAIZ = 'Q:/alisa_project/alisa/World/Synthesis/Web/alisa-systems';
const F = `${RAIZ}/public/arcade/js/SovereignBoardEngine.js`;
const original = await readFile(F, 'utf8');

const trazas = [
    ['if (!this.camera || !window.ALISA_ENCUADRE) return;',
     `if (!this.camera || !window.ALISA_ENCUADRE) { console.log('[SONDA] salida 1: sin camara o sin ALISA_ENCUADRE'); return; }`],
    ['if (!panel) return;',
     `if (!panel) { console.log('[SONDA] salida 2: no hay .hud-panel'); return; }`],
    ['if (!(r.width / anchoPantalla > 0.05 && r.width / anchoPantalla < 0.5)) return;',
     `if (!(r.width / anchoPantalla > 0.05 && r.width / anchoPantalla < 0.5)) { console.log('[SONDA] salida 3: el panel no es columna, ancho', r.width, 'de', anchoPantalla); return; }`],
    ['if (!(Math.max(t.x, t.y, t.z) > 0.001)) return;',
     `if (!(Math.max(t.x, t.y, t.z) > 0.001)) { console.log('[SONDA] salida 4: cajaReal VACIA'); return; }`],
    ['if (invade <= 0) return;',
     `if (invade <= 0) { console.log('[SONDA] salida 5: invade =', invade, '(izq', izq, ', panel derecha', r.right, ')'); return; }
        console.log('[SONDA] APARTA:', invade, 'px · izq', izq, '· panel derecha', r.right);`],
];

let texto = original;
for (const [de, a] of trazas) {
    if (!texto.includes(de)) { console.log('  no encuentro:', de.slice(0, 45)); process.exit(1); }
    texto = texto.replace(de, a);
}
await writeFile(F, texto);

const P = 8901;
const srv = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1800));
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
for (const [juego, pagina] of [['snake', 'snake.html'], ['ajedrez (control)', 'chess.html']]) {
    const p = await ctx.newPage();
    const lineas = [];
    p.on('console', m => { if (m.text().startsWith('[SONDA]')) lineas.push(m.text().replace('[SONDA] ', '')); });
    await p.goto(`http://127.0.0.1:${P}/arcade/${pagina}?semilla=7`, { waitUntil: 'load' });
    await p.waitForTimeout(5000);
    console.log(`  ${juego.padEnd(18)} ${lineas.length ? [...new Set(lineas)].join(' | ') : 'ni se llamó'}`);
    await p.close();
}
await b.close();
srv.kill();

await writeFile(F, original);
console.log('  (fichero restaurado:', (await readFile(F, 'utf8')) === original, ')');
