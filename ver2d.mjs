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
/**
 * ⚠️ SE PUEDEN JUGAR N JUGADAS ANTES DE MIRAR: `node ver2d.mjs cabina 3`.
 *
 * Esto pintaba SIEMPRE la posición inicial, y con eso no se puede comprobar nada
 * que sólo exista después de jugar. Al añadir los `dichos` —lo que alguien dice—
 * quedó a la vista: en cabina no hay ninguno hasta que la guía habla, así que la
 * captura salía idéntica a la de antes del cambio y no demostraba nada.
 */
const args = process.argv.slice(2);
const pasos = Number(args[args.length - 1]);
const juegos = Number.isFinite(pasos) ? args.slice(0, -1) : args;
const jugadas = Number.isFinite(pasos) ? pasos : 0;

for (const j of (juegos.length ? juegos : ['ajedrez', 'xiangqi'])) {
    const r = await cargarReglas(j, {});
    const p = r.nuevaPartida({ semilla: 7, seed: 7 });
    for (let i = 0; i < jugadas; i++) {
        const previo = r.estado(p, 0) ?? {};
        if (previo.is_game_over) break;
        const m = (previo.legal_moves ?? []).filter(x => x !== 'nueva' && x !== 'reset')[0];
        if (!m || !r.mover(p, m)) break;
    }
    const st = r.estado(p, 0) ?? {};
    const s = obtenerSustrato(j, r, p, st);
    await pag.evaluate((x) => window.__pintar(x), s);
    await writeFile(`${salida}/2d_${j}.png`, await pag.locator('#c').screenshot());
    console.log(`  ${j} pintado`);
}
await nav.close();
