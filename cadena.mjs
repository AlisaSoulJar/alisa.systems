/**
 * cadena.mjs — cuánto de la cadena del ajedrez tiene cada juego
 * ═══════════════════════════════════════════════════════════════════════════
 *     node cadena.mjs      → escribe public/data/cadena.json
 *
 * POR QUÉ EXISTE
 * `/lab` era un inventario de ficheros: 118 tarjetas ordenadas por carpeta. Un
 * inventario no demuestra nada — enseña que tienes cosas, no que el motor sepa
 * hacerlas.
 *
 * El ajedrez es el patrón oro porque tiene la cadena ENTERA: reglas propias,
 * página jugable, entorno de gym, marcador que cambia con la partida, rival de
 * casa, una prueba que comprueba sus reglas, y una estación en la sala. Medir
 * cuántos juegos llegan ahí sí dice lo que el motor sabe hacer — y también,
 * honestamente, dónde no llega.
 *
 * Lo que salió la primera vez que se midió:
 *
 *     reglas 19/19 · gym 19/19 · marcador 19/19 · casa 19/19
 *     página 12/19 · prueba 7/19 · sala 8/19
 *
 * O sea: **el motor está completo para los diecinueve; lo que falta es el
 * escaparate**. Esa frase no se podía decir antes de medirlo, y cambia lo que
 * hay que construir a continuación — no más reglas, sino más mesas.
 *
 * Se emite como JSON para que el índice lo pinte sin tener que ejecutar
 * JavaScript de juego dentro del generador de Python. Mismo patrón que
 * `estado_salas.json`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(AQUI, 'public');

const fetchReal = globalThis.fetch;
globalThis.fetch = async (entrada, init) => {
    const url = entrada instanceof URL ? entrada : new URL(String(entrada));
    if (url.protocol !== 'file:') return fetchReal(entrada, init);
    return new Response(await readFile(fileURLToPath(url), 'utf-8'), { status: 200 });
};
const imp = (rel) => import(pathToFileURL(path.join(PUB, 'arcade/js/protohub', rel)).href);
const { JUEGOS, TITULOS, cargarReglas } = await imp('rules/index.js');
const { puntuacionDe } = await imp('Verificador.js');

const arcade = await readdir(path.join(PUB, 'arcade'));
const labs = await readdir(path.join(PUB, 'labs'));
const sala = await readFile(path.join(PUB, 'rooms/room_sala_del_huevo.html'), 'utf8');
const registro = await readFile(path.join(PUB, 'js/alisa-engine/src/gym/registro.js'), 'utf8');

// El fichero de la página no siempre se llama como el juego: son nombres de
// mesa, no identificadores. Se declara en vez de adivinarse.
const ALIAS = { ajedrez: 'chess', damas: 'checkers' };

const ESLABONES = [
    ['reglas',   'reglas propias en JavaScript'],
    ['pagina',   'página en la que se juega'],
    ['gym',      'entorno para máquinas'],
    ['marcador', 'puntúa, y el número cambia'],
    ['casa',     'rival de la casa'],
    ['prueba',   'una prueba que comprueba SUS reglas'],
    ['sala',     'estación en la Sala del Huevo'],
];

const juegos = [];
for (const juego of JUEGOS) {
    const reglas = await cargarReglas(juego);
    const st = reglas.estado(reglas.nuevaPartida({ semilla: 1, seed: 1 }));
    const pagina = ALIAS[juego] ?? juego;
    const tiene = {
        reglas: true,
        pagina: arcade.includes(pagina + '.html'),
        gym: registro.includes(`'${juego}'`),
        // Que exista un marcador NUMÉRICO publicado. El ajedrez no lo tenía y
        // valía 0 en toda partida jugara quien jugara — ver `docs/como-nos-equivocamos.md`.
        marcador: (st.score !== undefined || st.puntos !== undefined)
                  && typeof puntuacionDe(st) === 'number',
        casa: typeof reglas.sugerencia === 'function',
        prueba: labs.some(f => f.includes(juego) && /test|perft/.test(f)),
        sala: sala.includes(`'${juego}-protohub`) || sala.includes(`/${pagina}.html`),
    };
    juegos.push({
        juego, titulo: TITULOS[juego] ?? juego, tiene,
        completos: ESLABONES.filter(([k]) => tiene[k]).length,
    });
}

const total = {};
for (const [k] of ESLABONES) total[k] = juegos.filter(j => j.tiene[k]).length;

await mkdir(path.join(PUB, 'data'), { recursive: true });
await writeFile(path.join(PUB, 'data', 'cadena.json'),
    JSON.stringify({ eslabones: ESLABONES, juegos, total, fecha: Date.now() }, null, 2));

const oro = juegos.filter(j => j.completos === ESLABONES.length);
console.log(`\n  cadena completa: ${oro.length}/${juegos.length}  → ${oro.map(j => j.titulo).join(', ')}`);
for (const [k, desc] of ESLABONES) {
    console.log(`    ${k.padEnd(9)} ${String(total[k]).padStart(2)}/${juegos.length}   ${desc}`);
}
console.log(`\n  escrito public/data/cadena.json\n`);
