/**
 * ¿Cuáles de los props traen animación DE VERDAD, y cómo se llaman sus clips?
 *
 * La doctrina de la casa —`Data/Lecciones/.../giants_procedural_avatars`— dice que el
 * movimiento se hace con senos y no con esqueletos: «si puedes evitar calcular un
 * codo, elimina el codo». Pero si un modelo YA trae su ciclo de andar horneado, usarlo
 * cuesta cero y se ve mejor que cualquier seno.
 *
 * Así que antes de decidir, se mira: quién tiene clips, cuántos y con qué nombre. Un
 * `Walk` que existe vale más que una discusión sobre cinemática.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';

const PUERTO = 8985;
const srv = spawn('python', ['servir.py', String(PUERTO)], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), stdio: 'ignore',
});
const base = `http://127.0.0.1:${PUERTO}`;
for (let i = 0; i < 40; i++) {
    try { await fetch(`${base}/arcade/`); break; } catch { await new Promise(r => setTimeout(r, 250)); }
}

const listos = ['Chicken.glb','Duck.glb','Hyena.glb','Beagle.glb'];
const rocas = ['Rock_3.glb', 'Rock_Moss_2.glb', 'Rock_Snow_1.glb'];

const nav = await chromium.launch({ channel: 'chrome', headless: true });
const p = await nav.newPage();
await p.goto(`${base}/arcade/cripta.html`, { waitUntil: 'load' });
await p.waitForTimeout(2500);

const r = await p.evaluate(async ({ listos, rocas }) => {
    const mapa = document.createElement('script');
    mapa.type = 'importmap';
    mapa.textContent = JSON.stringify({ imports: {
        three: '/vendor/three-0.170.0/build/three.module.js',
        'three/addons/': '/vendor/three-0.170.0/examples/jsm/',
    } });
    document.head.appendChild(mapa);
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    const mirar = (ruta) => new Promise((ok) => {
        loader.load(ruta, (g) => {
            let tris = 0, mallas = 0, huesos = 0;
            g.scene.traverse(o => {
                if (o.isMesh) { mallas++; tris += (o.geometry?.index?.count ?? o.geometry?.attributes?.position?.count ?? 0) / 3; }
                if (o.isBone) huesos++;
            });
            const nn=[]; g.scene.traverse(o=>{ if(o.isMesh) nn.push(o.name||'(sin nombre)'); });
            ok({ clips: g.animations.map(a => a.name), mallas, tris: Math.round(tris), huesos, nombres: nn.slice(0,8) });
        }, undefined, (e) => ok({ error: String(e?.message ?? e).slice(0, 60) }));
    });
    const out = {};
    for (const f of listos) out['ready/' + f] = await mirar('/props/ready/' + f);
    for (const f of rocas) out['models/' + f] = await mirar('/props/models/' + f);
    return out;
}, { listos, rocas });

for (const [k, v] of Object.entries(r)) {
    if (v.error) { console.log(`  ${k.padEnd(30)} ✗ ${v.error}`); continue; }
    console.log(`  ${k.padEnd(30)} ${String(v.tris).padStart(6)} tris · ${v.mallas} mallas · `
              + `${v.huesos} huesos · clips: ${v.clips.length ? v.clips.join(', ') : '(ninguno)'}`);
}
await nav.close();
srv.kill();
