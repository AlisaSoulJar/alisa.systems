import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const P = 8200;
const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const s = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));
const b = await chromium.launch({ channel: 'chrome', headless: true });

/**
 * Cuántas columnas tiene cada tablero, y si a 390 px de ancho una casilla baja del
 * mínimo legible. Antes de decidir un umbral conviene saber a cuántos afecta: si son
 * dos, no vale la pena; si son ocho, es una carencia del arcade en teléfono.
 */
console.log('\n  juego        columnas   casilla a 390px');
const grandes = [];
for (const juego of Object.keys(paginas)) {
    const info = paginas[juego];
    if (!info) continue;
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    try {
        await p.goto(`http://127.0.0.1:${P}/arcade/${info.pagina}?semilla=7`
            + (info.pagina === 'mesa.html' ? `&juego=${juego}` : ''), { waitUntil: 'load', timeout: 22000 });
        await p.waitForTimeout(3800);
        const r = await p.evaluate(() => {
            const rej = window.ALISA_PROTOHUB?.sustrato(window.ALISA_JUEGO)?.rejilla;
            if (!rej?.ancho) return null;
            const cam = window.ALISA_CAMARA, raiz = window.ALISA_PINTOR?.raiz;
            if (!cam || !raiz) return { cols: rej.ancho, px: null };
            raiz.updateMatrixWorld(true);
            const u0 = new THREE.Vector3(0, 0, 0).applyMatrix4(raiz.matrixWorld).project(cam);
            const u1 = new THREE.Vector3(1, 0, 0).applyMatrix4(raiz.matrixWorld).project(cam);
            return { cols: rej.ancho,
                     px: Math.round(Math.hypot((u1.x - u0.x) / 2 * 390, (u1.y - u0.y) / 2 * 844)) };
        });
        if (r) {
            const apretado = r.px !== null && r.px < 14;
            if (apretado) grandes.push(`${juego} (${r.cols} col, ${r.px} px)`);
            console.log(`  ${juego.padEnd(12)} ${String(r.cols).padStart(4)}      ${String(r.px ?? '—').padStart(4)} px${apretado ? '  ← apretado' : ''}`);
        }
    } catch { /* sin rejilla o visualizador propio */ }
    await ctx.close();
}
console.log(`\n  apretados en vertical: ${grandes.length ? grandes.join(', ') : 'ninguno'}`);
await b.close(); s.kill(); process.exit(0);
