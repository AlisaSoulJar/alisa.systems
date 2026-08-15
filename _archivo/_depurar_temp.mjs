import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const P = 8957;
const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const servidor = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(() => {
    window.__CAPTURA = null;
    window.__log = [];
    const engancha = () => {
        window.__log.push('intento ' + typeof window.THREE);
        if (!window.THREE?.WebGLRenderer || THREE.WebGLRenderer.prototype.__alisaParcheado) return !!window.__parcheado;
        const original = THREE.WebGLRenderer.prototype.render;
        THREE.WebGLRenderer.prototype.render = function (escena, camara) {
            window.__CAPTURA = { escena, camara, renderer: this };
            return original.call(this, escena, camara);
        };
        THREE.WebGLRenderer.prototype.__alisaParcheado = true;
        window.__parcheado = true;
        window.__log.push('PARCHEADO');
        return true;
    };
    if (!engancha()) {
        const reloj = setInterval(() => { if (engancha()) clearInterval(reloj); }, 20);
        setTimeout(() => clearInterval(reloj), 20000);
    }
});
const page = await ctx.newPage();
page.on('console', m => console.log('  [console]', m.type(), m.text().slice(0,200)));
page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0,200)));
await page.goto(`http://127.0.0.1:${P}/arcade/snake.html?semilla=7`, { waitUntil: 'load', timeout: 25000 });
await page.waitForTimeout(4500);
const rafCount = await page.evaluate(() => new Promise(res => {
    let n = 0;
    const tick = () => { n++; if (n < 30) requestAnimationFrame(tick); else res(n); };
    requestAnimationFrame(tick);
    setTimeout(() => res(n), 3000);
}));
const info = await page.evaluate((rafCount) => ({
    tieneTHREE: typeof window.THREE,
    tieneHud: !!document.querySelector('.hud-panel'),
    tieneMotor: !!window.ALISA_MOTOR,
    tieneCaptura: !!window.__CAPTURA,
    parcheado: window.THREE?.WebGLRenderer?.prototype?.__alisaParcheado ?? null,
    scripts: [...document.scripts].map(s => s.src).filter(Boolean).slice(-8),
    log: window.__log,
    hidden: document.hidden,
    visibilityState: document.visibilityState,
    motorRenderer: !!window.ALISA_MOTOR?.renderer,
    motorTieneRenderMethod: typeof window.ALISA_MOTOR?.renderer?.render,
    rendererParcheado: window.ALISA_MOTOR?.renderer && Object.prototype.hasOwnProperty.call(window.ALISA_MOTOR.renderer, 'render'),
    rafCount,
}), rafCount);
console.log(JSON.stringify(info, null, 2));
await ctx.close();
await b.close();
servidor.kill();
process.exit(0);
