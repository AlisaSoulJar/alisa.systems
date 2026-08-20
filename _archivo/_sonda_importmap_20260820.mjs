/**
 * ¿Se puede inyectar un mapa de importación desde JS y que valga para los `import()`
 * que vengan después? Si sí, el pipeline cinematográfico entra en el arcade con seis
 * líneas. Si no, hay que generar copias de una docena de ficheros con el
 * especificador reescrito, como se hizo con OrbitControls.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const PUERTO = 8981;
const srv = spawn('python', ['servir.py', String(PUERTO)], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), stdio: 'ignore',
});
const base = `http://127.0.0.1:${PUERTO}`;
for (let i = 0; i < 40; i++) {
    try { await fetch(`${base}/arcade/`); break; } catch { await new Promise(r => setTimeout(r, 250)); }
}
const nav = await chromium.launch({ channel: 'chrome', headless: true });
const p = await nav.newPage();
await p.goto(`${base}/arcade/cripta.html?semilla=7`, { waitUntil: 'load' });
await p.waitForTimeout(3000);

const r = await p.evaluate(async () => {
    const salida = { navegador: navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] ?? '?' };
    try {
        const mapa = document.createElement('script');
        mapa.type = 'importmap';
        mapa.textContent = JSON.stringify({
            imports: {
                three: '/vendor/three-0.170.0/build/three.module.js',
                'three/addons/': '/vendor/three-0.170.0/examples/jsm/',
            },
        });
        document.head.appendChild(mapa);
        salida.inyectado = true;
    } catch (e) { salida.inyectado = 'error: ' + e.message; }

    try {
        const m = await import('/js/alisa-engine/src/soma/plugins/CinematicPipelinePlugin.js');
        salida.plugin = typeof m.CinematicPipelinePlugin === 'function' ? 'CARGA' : 'sin la clase';
    } catch (e) { salida.plugin = 'FALLA: ' + String(e.message).slice(0, 130); }
    return salida;
});
console.log(JSON.stringify(r, null, 2));
await nav.close();
srv.kill();
