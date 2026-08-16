// traza_entropy2.mjs — como bajo_el_panel.mjs pero muestreando VARIAS veces tras cada
// clic (no sólo a los 600ms), para ver si la cámara que deja `acercar()` se queda quieta
// o deriva sola en los frames siguientes (control damping, RAF, etc.).
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const RAIZ = 'Q:\\alisa_project\\alisa\\World\\Synthesis\\Web\\alisa-systems';
const P = 8959;
const servidor = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const base = `http://127.0.0.1:${P}`;

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(() => {
    window.__CAPTURA = null;
    window.__TRAZA = [];
    const engancha = () => {
        if (!window.THREE?.WebGLRenderer || window.__parcheado) return !!window.__parcheado;
        const Original = THREE.WebGLRenderer;
        function Parcheado(...args) {
            const instancia = new Original(...args);
            const renderOriginal = instancia.render.bind(instancia);
            instancia.render = function (escena, camara) {
                window.__CAPTURA = { escena, camara, renderer: instancia };
                return renderOriginal(escena, camara);
            };
            return instancia;
        }
        Parcheado.prototype = Original.prototype;
        THREE.WebGLRenderer = Parcheado;
        window.__parcheado = true;
        return true;
    };
    if (!engancha()) {
        const reloj = setInterval(() => { if (engancha()) clearInterval(reloj); }, 20);
        setTimeout(() => clearInterval(reloj), 20000);
    }
});
const page = await ctx.newPage();
page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0, 300)));

await page.goto(`${base}/arcade/entropy.html?semilla=7`, { waitUntil: 'load', timeout: 25000 });
await page.waitForTimeout(4500);
await page.evaluate(() => document.querySelector('.hud-panel')?.classList.remove('collapsed'));
await page.waitForTimeout(400);

const medir = async () => page.evaluate(() => {
    const cap = window.__CAPTURA;
    const panel = document.querySelector('.hud-panel');
    if (!cap?.escena || !cap?.camara || !panel) return null;
    const r = panel.getBoundingClientRect();
    const canvas = cap.renderer?.domElement;
    const rectLienzo = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    cap.escena.updateMatrixWorld(true);
    cap.camara.updateMatrixWorld(true);
    const V = new THREE.Vector3();
    let tapadas = 0;
    const nombres = [];
    cap.escena.traverse((o) => {
        if (!o.isMesh || !o.visible || o.userData?.zona === undefined) return;
        V.setFromMatrixPosition(o.matrixWorld);
        const p = V.clone().project(cap.camara);
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.z < -1 || p.z > 1) return;
        const x = rectLienzo.left + (p.x * 0.5 + 0.5) * rectLienzo.width;
        const y = rectLienzo.top + (1 - (p.y * 0.5 + 0.5)) * rectLienzo.height;
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return;
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { tapadas++; nombres.push(String(o.userData.zona)); }
    });
    return {
        tapadas, nombres,
        camPos: cap.camara.position.toArray().map(n => +n.toFixed(3)),
        camTarget: window.ALISA_MESA?.controls?.target?.toArray?.().map(n => +n.toFixed(3)) ?? null,
        enableDamping: window.ALISA_MESA?.controls?.enableDamping ?? null,
    };
});

const volcarTraza = async (etiqueta) => {
    const traza = await page.evaluate(() => { const t = window.__TRAZA; window.__TRAZA = []; return t; });
    console.log(`  [traza interna ${etiqueta}: ${traza.length} eventos] última: ${JSON.stringify(traza[traza.length - 1])}`);
};

const muestrear = async (etiqueta, tiempos) => {
    console.log(`\n── ${etiqueta} ──`);
    for (const t of tiempos) {
        await page.waitForTimeout(t.espera);
        const m = await medir();
        console.log(`  +${t.total}ms  tapadas=${m?.tapadas}  ${JSON.stringify(m?.nombres)}  camPos=${JSON.stringify(m?.camPos)}  target=${JSON.stringify(m?.camTarget)}  damping=${m?.enableDamping}`);
    }
    await volcarTraza(etiqueta);
};

await muestrear('al abrir', [{ espera: 0, total: 0 }]);

for (let i = 0; i < 3; i++) {
    const botones = page.locator('.mesa-jugada');
    const cuantos = await botones.count().catch(() => 0);
    if (!cuantos) { console.log(`\n(jugada ${i + 1}: sin botón, se para)`); break; }
    await botones.first().click({ timeout: 3000 });
    await muestrear(`tras jugada ${i + 1}`, [
        { espera: 50, total: 50 }, { espera: 150, total: 200 }, { espera: 200, total: 400 },
        { espera: 200, total: 600 }, { espera: 400, total: 1000 }, { espera: 1000, total: 2000 },
    ]);
}

await navegador.close();
servidor.kill();
process.exit(0);
