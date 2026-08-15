/** ¿ESTÁ LA COMIDA DE SNAKE DEBAJO DEL PANEL? Se captura con el panel plegado. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const RAIZ = 'Q:/alisa_project/alisa/World/Synthesis/Web/alisa-systems';
const P = 8899;
const srv = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));

const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
for (const [nombre, plegar] of [['desplegado', false], ['plegado', true]]) {
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${P}/arcade/snake.html?semilla=7`, { waitUntil: 'load' });
    await p.waitForTimeout(4500);
    if (plegar) {
        await p.evaluate(() => document.querySelector('.hud-panel')?.classList.add('collapsed'));
        await p.waitForTimeout(900);
    }
    await p.screenshot({ path: `_m_snake_${nombre}.png` });
    await p.close();
}
await b.close();
srv.kill();
