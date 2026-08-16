import { chromium } from 'playwright-core';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const RAIZ = 'Q:/alisa_project/alisa/World/Synthesis/Web/alisa-systems';
const { JUEGOS, cargarReglas } = await import(`file:///${RAIZ}/public/arcade/js/protohub/rules/index.js`);
const { obtenerSustrato } = await import(`file:///${RAIZ}/public/arcade/js/protohub/sustrato.js`);

const nav = await chromium.launch({ channel: 'chrome', headless: true });
const pag = await nav.newPage({ viewport: { width: 520, height: 520 } });
const fp = await readFile(`${RAIZ}/public/arcade/js/protohub/render/pintar2d.js`, 'utf8');
const fl = await readFile(`${RAIZ}/public/arcade/js/protohub/render/paleta.js`, 'utf8');

await pag.setContent(`<!doctype html><meta charset="utf-8">
<body style="margin:0;background:#f4f6f8"><canvas id="c" width="520" height="520"></canvas>
<script type="module">
${fl.replace(/export\s+/g, '')}
${fp.replace(/^import .*$/m, '').replace(/export\s+/g, '')}
window.__pintar = (s) => pintar2d(document.getElementById('c').getContext('2d'), s, { ancho: 520, alto: 520 });
</script>`);
await pag.waitForFunction(() => !!window.__pintar);

const salida = `${RAIZ}/capturas_verbos`;
await mkdir(salida, { recursive: true });
for (const j of (process.argv.slice(2).length ? process.argv.slice(2) : ['ajedrez', 'xiangqi'])) {
    const r = await cargarReglas(j, {});
    const p = r.nuevaPartida({ semilla: 7, seed: 7 });
    const st = r.estado(p, 0) ?? {};
    const s = obtenerSustrato(j, r, p, st);
    await pag.evaluate((x) => window.__pintar(x), s);
    await writeFile(`${salida}/2d_${j}.png`, await pag.locator('#c').screenshot());
    console.log(`  ${j} pintado`);
}
await nav.close();
