/** El mismo juego en normal y en ultra, uno al lado del otro. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const JUEGO = process.argv[2] ?? 'cripta';
const PUERTO = 8983;
const srv = spawn('python', ['servir.py', String(PUERTO)], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), stdio: 'ignore',
});
const base = `http://127.0.0.1:${PUERTO}`;
for (let i = 0; i < 40; i++) {
    try { await fetch(`${base}/arcade/`); break; } catch { await new Promise(r => setTimeout(r, 250)); }
}
const nav = await chromium.launch({ channel: 'chrome', headless: true });

for (const calidad of ['normal', 'ultra']) {
    const p = await nav.newPage({ viewport: { width: 1280, height: 720 } });
    const dichos = [];
    p.on('console', m => { const t = m.text(); if (/cine|Cinematic|🎬/.test(t)) dichos.push(t.slice(0, 110)); });
    p.on('pageerror', e => dichos.push('ERROR ' + e.message.slice(0, 110)));
    await p.goto(`${base}/arcade/${JUEGO}.html?semilla=7&calidad=${calidad}`, { waitUntil: 'load' });
    await p.waitForTimeout(7000);
    // Unas jugadas para que la cripta tenga algo explorado que enseñar.
    for (let k = 0; k < 5; k++) {
        const b = await p.$('#mesa-jugadas button, .mesa-jugada');
        if (!b) break;
        await b.click().catch(() => {});
        await p.waitForTimeout(400);
    }
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `capturas_laboratorio/_${JUEGO}_${calidad}.png` });
    console.log(`  ${calidad.padEnd(7)} ${dichos.join(' | ') || '(sin mensajes)'}`);
    await p.close();
}
await nav.close();
srv.kill();
