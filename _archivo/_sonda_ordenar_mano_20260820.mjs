/**
 * ¿ORDENA DE VERDAD LA MANO, Y SIGUE SIENDO LA MISMA MANO?
 *
 * Dos cosas que hay que comprobar juntas, porque una sin la otra miente:
 *   1. que el ORDEN DIBUJADO cambie al pulsar — si no, el botón es decorado;
 *   2. que el CONJUNTO de cartas sea idéntico — si al ordenar se pierde o se
 *      duplica una, habría convertido una vista en una trampa.
 *
 * Se mide sobre las mallas de la escena, no sobre el sustrato: el sustrato es lo que
 * yo permuto, así que preguntarle a él si está permutado no prueba nada. Ya me pasó
 * hoy con las figuras — el código que regeneraba el lienzo decía 33 % con la pantalla
 * vacía.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const PUERTO = 8971;
const raiz = new URL('../../../../../../alisa_project/alisa/World/Synthesis/Web/alisa-systems/', import.meta.url);
const cwd = 'Q:/alisa_project/alisa/World/Synthesis/Web/alisa-systems';
const srv = spawn('python', ['servir.py', String(PUERTO)], { cwd, stdio: 'ignore' });
const base = `http://127.0.0.1:${PUERTO}`;
for (let i = 0; i < 40; i++) {
    try { await fetch(`${base}/arcade/remigio.html`); break; } catch { await new Promise(r => setTimeout(r, 250)); }
}

const nav = await chromium.launch({ channel: 'chrome' });
const p = await nav.newPage({ viewport: { width: 1280, height: 720 } });
const errores = [];
p.on('pageerror', e => errores.push(e.message));

/** Las cartas de TU mano, en el orden en que están dibujadas de izquierda a derecha. */
/** Lo que la mesa TIENE dibujado, por `cardMeshes` — que es como lo lee ella misma. */
const manoDibujada = () => p.evaluate(() => {
    const e = window.ALISA_MOTOR ?? window.engine ?? window.ALISA_ENGINE;
    const ms = e?.cardMeshes;
    if (!ms) return null;
    const filas = Object.entries(ms)
        .map(([id, m]) => ({ id, zona: m.userData?.zona, i: m.userData?.indice, x: m.position?.x }))
        .filter(f => f.zona !== undefined);
    if (!filas.length) return null;
    // La zona con más cartas boca arriba y con `indice` es la mano propia.
    const porZona = new Map();
    for (const f of filas) porZona.set(f.zona, [...(porZona.get(f.zona) ?? []), f]);
    let mia = null;
    for (const [, v] of porZona) if (!mia || v.length > mia.length) mia = v;
    return mia.sort((a, b) => (a.i ?? a.x) - (b.i ?? b.x)).map(f => String(f.id).replace(/^[a-z]+_\d+_\d+_/, '').replace(/_\d+$/, ''));
});

for (const juego of ['remigio', 'chinchon']) {
    await p.goto(`${base}/arcade/${juego}.html?semilla=11`, { waitUntil: 'load' });
    await p.waitForTimeout(2200);

    const botones = await p.$$eval('.orden-mano', bs => bs.map(b => b.dataset.orden));
    console.log(`\n  ${juego} · botones: ${botones.join(' ') || 'NINGUNO'}`);
    if (!botones.length) continue;

    const vistos = {};
    for (const o of botones) {
        await p.click(`.orden-mano[data-orden="${o}"]`);
        await p.waitForTimeout(1800);
        vistos[o] = await manoDibujada();
        const visibles = await p.evaluate(() => {
            const e = window.ALISA_MOTOR ?? window.engine;
            const ms = Object.values(e?.cardMeshes ?? {});
            return { total: ms.length, visibles: ms.filter(m => m.visible).length };
        });
        console.log(`    ${o.padEnd(8)} [${vistos[o]?.length ?? 0} leidas · ${visibles.visibles}/${visibles.total} mallas visibles] ${vistos[o] ? vistos[o].join(' ') : '-'}`);
    }

    const listas = Object.values(vistos).filter(Boolean);
    if (listas.length >= 2) {
        const conjuntos = listas.map(l => [...l].sort().join(','));
        const mismasCartas = conjuntos.every(c => c === conjuntos[0]);
        const ordenesDistintos = new Set(listas.map(l => l.join(','))).size;
        console.log(`    ¿las mismas cartas en todos? ${mismasCartas ? 'sí' : '✗ NO — se pierde o duplica alguna'}`);
        console.log(`    órdenes distintos: ${ordenesDistintos} de ${listas.length}`
                  + (ordenesDistintos > 1 ? '  ✓ reordena' : '  ✗ el botón no hace nada'));
    }
}

console.log(errores.length ? `\n  ⚠️ errores de JS: ${errores.join(' · ')}` : '\n  sin errores de JS');
await nav.close();
srv.kill();
