// ¿Que piezas del motor usa alguien, y cuales llevan ahi sin estrenar?
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const piezas = JSON.parse(await readFile(path.join(RAIZ, 'public/data/clasificacion_piezas.json'), 'utf-8'));
const todas = (Array.isArray(piezas) ? piezas : piezas.piezas ?? []).map(p => p.nombre).filter(Boolean);

// Se busca cada nombre en todo lo que un navegador puede llegar a ejecutar.
async function textos(dir, acc = []) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (/node_modules|alisa-engine|vendor|dist/.test(e.name)) continue;
            await textos(p, acc);
        } else if (/\.(js|mjs|html)$/.test(e.name)) {
            acc.push(await readFile(p, 'utf-8'));
        }
    }
    return acc;
}
const cuerpo = (await textos(path.join(RAIZ, 'public'))).join('\n');

const usadas = [], sinUsar = [];
for (const n of todas) {
    // Se cuenta una mención fuera de su propia definición.
    const veces = (cuerpo.match(new RegExp(`\\b${n}\\b`, 'g')) ?? []).length;
    (veces > 0 ? usadas : sinUsar).push(n);
}

const sistemas = todas.filter(n => /System$/.test(n));
const sistemasSinUsar = sinUsar.filter(n => /System$/.test(n));

console.log(`\n  ${todas.length} piezas en el catalogo`);
console.log(`  ${usadas.length} usadas por algo que se sirve · ${sinUsar.length} SIN ESTRENAR`);
console.log(`\n  de ellas, ${sistemas.length} son *System y ${sistemasSinUsar.length} estan sin estrenar:`);
console.log('    ' + sistemasSinUsar.join(', '));
console.log(`\n  el resto sin estrenar (${sinUsar.length - sistemasSinUsar.length}):`);
console.log('    ' + sinUsar.filter(n => !/System$/.test(n)).join(', '));
