/**
 * prueba_censo.mjs — ¿miden los medidores sobre TODOS los juegos que hay?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ ESTA COMPROBACIÓN VIGILA UNA CLASE QUE EL SABOTAJE NO PUEDE VER.
 *
 * Todo lo demás en este repositorio comprueba PREDICADOS: «¿esta condición detecta
 * este fallo?». Y para eso están los sabotajes de `npm run pruebas`, que rompen a
 * propósito lo que cada comprobación vigila y exigen que suspenda.
 *
 * Pero el sabotaje es **estructuralmente ciego** a los errores de DENOMINADOR. Una
 * comprobación cuyo universo está recortado sigue sabiendo suspender perfectamente
 * *dentro de su universo recortado*: `check_gym_envs` con su `filter` de una familia
 * habría pasado cualquier sabotaje sobre los seis entornos que miraba, mientras
 * ignoraba treinta y cinco. Que aquello se cazara fue un accidente afortunado —el
 * sabotaje cayó justo en la zona no mirada—, y un accidente no es un mecanismo.
 *
 * El diagnóstico vino de una auditoría externa (16-08) al ponerle delante los nueve
 * números falsos de la semana: **siete eran de denominador**, no de predicado. Universo
 * recortado por un `filter`, universo con una vía de menos, universo en otra parte,
 * universo vacío por una clave mal escrita, universo temporal de un instante.
 *
 * ⚠️ POR QUÉ EMPIEZA POR `tabla.mjs` Y NO POR OTRO
 *
 * Porque es el único medidor cuyo resultado sale al dominio. Un error de denominador
 * en los demás muere en un informe interno que se rectifica con una nota; aquí
 * saldría publicado como una comparación persona-contra-agente falsa, en un banco
 * cuyo argumento entero es que los números se recalculan y no se declaran.
 *
 * ⚠️ CÓMO, SIN PAGAR UNA PASADA ENTERA
 *
 * Medir de verdad tarda minutos. Así que el medidor declara su universo con
 * `--censo` —una línea `universo=N` y la lista— y aquí se compara con el censo
 * canónico. Preguntar tarda un segundo.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { JUEGOS } = await impo('public/arcade/js/protohub/rules/index.js');

/** Los medidores que se preguntan, y con qué se les pregunta. */
const MEDIDORES = [
    { nombre: 'tabla.mjs', args: ['--import', './resolver_three.mjs', 'tabla.mjs', '--censo'] },
];

const preguntar = (m) => new Promise((res) => {
    const p = spawn('node', m.args, { cwd: AQUI, stdio: ['ignore', 'pipe', 'pipe'] });
    let sal = '';
    p.stdout.on('data', d => { sal += d; });
    p.stderr.on('data', d => { sal += d; });
    p.on('close', () => res(sal));
});

console.log('\n¿Miden los medidores sobre todos los juegos que hay?\n');
console.log(`  censo canónico: ${JUEGOS.length} juegos\n`);

let fallos = 0;
for (const m of MEDIDORES) {
    const sal = await preguntar(m);
    const n = Number((sal.match(/universo=(\d+)/) ?? [])[1]);
    const lista = (sal.split('\n').find(l => l.includes(',')) ?? '').trim().split(',').filter(Boolean);

    if (!Number.isInteger(n)) {
        fallos++;
        console.log(`  ✗ ${m.nombre} no declaró su universo.`);
        console.log('    Tiene que aceptar `--censo` e imprimir `universo=N` y la lista.');
        continue;
    }
    const faltan = JUEGOS.filter(j => !lista.includes(j));
    const sobran = lista.filter(j => !JUEGOS.includes(j));
    if (faltan.length || sobran.length) {
        fallos++;
        console.log(`  ✗ ${m.nombre} mide sobre ${n}, y el censo son ${JUEGOS.length}:`);
        if (faltan.length) console.log(`      existen y no se miden: ${faltan.join(', ')}`);
        if (sobran.length) console.log(`      se miden y no existen: ${sobran.join(', ')}`);
    } else {
        console.log(`  ✓ ${m.nombre.padEnd(12)} mide sobre los ${n}`);
    }
}

console.log(fallos
    ? '\n  Un medidor que no mide sobre todo publica una media de otra cosa.\n'
    : '\n  ✓ ningún medidor se deja juegos fuera\n');
process.exit(fallos ? 1 : 0);
