/**
 * salas.mjs — ¿en cuántos juegos se puede jugar ACOMPAÑADO de verdad?
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run salas
 *
 * `worker-mesas/prueba_mesa.mjs` ya comprueba una mesa compartida de punta a punta
 * —dos seres se sientan, el árbitro rechaza a quien no le toca, se juega entera, y
 * el recibo verifica— pero lo hace con UN juego: brisca por defecto. Y de un juego
 * no se concluye sobre treinta y cinco; eso es exactamente el error que este
 * proyecto lleva contando en `COMO_MEDIR.md`.
 *
 * Esto pasa esa misma prueba por todos los juegos que tienen más de una silla, que
 * son los únicos donde «jugar acompañado» quiere decir algo. Los de una silla no
 * salen: no es que fallen, es que no aplica.
 *
 * ⚠️ QUÉ SILLAS TIENE CADA JUEGO YA NO SE ADIVINA
 *
 * Sale de `ASIENTOS`, que los 35 declaran desde el 16-08 y que se cruza contra lo
 * que reparte la partida y contra el mapa del árbitro. Antes había que suponerlo por
 * el nombre, y suponerlo es como la ficha del ajedrez acabó anunciando un asiento.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { JUEGOS, cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');

const pedidos = process.argv.slice(2).filter(a => !a.startsWith('-'));

const multi = [];
for (const juego of JUEGOS) {
    if (pedidos.length && !pedidos.includes(juego)) continue;
    try {
        const r = await cargarReglas(juego, {});
        if (Number.isInteger(r.ASIENTOS) && r.ASIENTOS > 1) multi.push({ juego, sillas: r.ASIENTOS });
    } catch { /* si no carga, ya lo dicen otras comprobaciones */ }
}

console.log(`\n¿En cuántos juegos se puede jugar acompañado?\n`);
console.log(`  ${multi.length} juegos con más de una silla — los de una no aplican\n`);

const correr = (juego) => new Promise((res) => {
    const p = spawn('node', ['worker-mesas/prueba_mesa.mjs', '--juego', juego],
                    { cwd: AQUI, stdio: ['ignore', 'pipe', 'pipe'] });
    let sal = '';
    p.stdout.on('data', d => { sal += d; });
    p.stderr.on('data', d => { sal += d; });
    p.on('close', (cod) => res({ cod, sal }));
});

const bien = [], mal = [];
for (const { juego, sillas } of multi) {
    const { cod, sal } = await correr(juego);
    if (cod === 0) {
        bien.push(juego);
        console.log(`  ✓ ${juego.padEnd(12)} ${sillas} sillas`);
    } else {
        /**
         * El PRIMER paso que falla es el diagnóstico: si no consigue sentarse, el
         * problema es la sala; si se sienta y no verifica el recibo, el problema
         * está entre la mesa y el verificador. Un «falla» a secas no distingue esas
         * dos cosas y son arreglos completamente distintos.
         */
        const primerFallo = (sal.split('\n').find(l => l.includes('✗')) ?? '')
            .replace(/\s+/g, ' ').trim().slice(0, 88);
        mal.push({ juego, primerFallo });
        console.log(`  ✗ ${juego.padEnd(12)} ${sillas} sillas — ${primerFallo || 'sin salida'}`);
    }
}

console.log(`\n  ${bien.length}/${multi.length} juegos se pueden jugar acompañados de verdad`);
if (mal.length) {
    console.log(`\n  los ${mal.length} que no, por dónde se rompen:`);
    for (const m of mal) console.log(`    ${m.juego.padEnd(12)} ${m.primerFallo}`);
}
console.log('');
process.exit(mal.length ? 1 : 0);
