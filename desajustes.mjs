/**
 * desajustes.mjs — LO QUE SE PUBLICA Y NADIE LEE, Y LO QUE SE LEE Y NADIE PUBLICA
 * ═══════════════════════════════════════════════════════════════════════════
 *     node desajustes.mjs
 *
 * POR QUÉ EXISTE
 * Go llevaba publicando su tablero desde siempre, en `board`. La puerta de
 * lenguaje lo buscaba en `tablero`. Resultado: durante meses un agente sin visión
 * jugaba al go **sin ver una sola piedra**, y al medirlo el diagnóstico fue «a go
 * le falta publicar el tablero» — falso: le faltaba una palabra a quien
 * preguntaba. Casi le abro un hueco en el backlog por un fallo mío.
 *
 * Ese fallo no avisa. No hay error, no hay excepción: simplemente el dato no
 * llega y todo lo demás sigue funcionando lo justo para que parezca bien.
 *
 * Esta herramienta lo busca a lo bruto:
 *
 *   · PUBLICADO Y NUNCA LEÍDO  — el juego se toma la molestia de decir algo y
 *     nadie lo escucha. Puede ser una capacidad que creemos no tener.
 *   · LEÍDO Y NUNCA PUBLICADO  — alguien pregunta por un campo que ningún juego
 *     emite. Ahí siempre sale `undefined`, y `undefined` no da error: da silencio.
 *
 * ⚠️ No todo desajuste es un fallo. Un campo que sólo tiene sentido en un juego
 * saldrá como «leído por uno solo», y está bien. Esto señala dónde MIRAR, no
 * dónde hay bug: la última palabra es de quien lea la lista.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(AQUI, 'public');

// Las reglas leen `card_library.json` con fetch; en Node eso es file://
const fetchReal = globalThis.fetch;
globalThis.fetch = async (entrada, init) => {
    const url = entrada instanceof URL ? entrada : new URL(String(entrada));
    if (url.protocol !== 'file:') return fetchReal(entrada, init);
    return new Response(await readFile(fileURLToPath(url), 'utf-8'), { status: 200 });
};
const { JUEGOS, cargarReglas } = await import(
    pathToFileURL(path.join(PUB, 'arcade/js/protohub/rules/index.js')).href);

// ── 1. Lo que PUBLICA cada juego ────────────────────────────────────────
// Se recoge del estado inicial y de unas cuantas jugadas: hay campos que sólo
// aparecen con la partida en marcha (`baza`, `robada`, `preguntas`…).
const publicado = new Map();          // campo -> Set(juegos)
for (const juego of JUEGOS) {
    const reglas = await cargarReglas(juego, {});
    const p = reglas.nuevaPartida({ semilla: 5, seed: 5 });
    const anota = (st) => {
        for (const k of Object.keys(st ?? {})) {
            if (!publicado.has(k)) publicado.set(k, new Set());
            publicado.get(k).add(juego);
        }
    };
    anota(reglas.estado(p));
    for (let i = 0; i < 12; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) break;
        const m = (st.legal_moves ?? []).filter(x => x !== 'nueva' && x !== 'reset')[0];
        if (!m || !reglas.mover(p, m)) break;
        anota(reglas.estado(p));
    }
}

// ── 2. Quién LEE campos de estado ───────────────────────────────────────
/**
 * ⚠️ ESTA LISTA ERA A MANO, Y ESO LE DABA FALSOS NEGATIVOS. LOS PEORES.
 *
 * Eran seis ficheros escritos aquí más los `*_visualizer.js`. Faltaban, entre
 * otros, `SovereignCardEngine.js` —el motor de TODAS las mesas de cartas— y
 * `worker-mesas/mesas.js`, que es el árbitro por el que juegan los agentes.
 *
 * Consecuencia verificada: esta herramienta afirmaba que `legal_actions` «se
 * publica y no lo lee nadie». Es falso. `SovereignCardEngine.js` lo lee en su
 * `updateHUD()` SIN caer a `legal_moves` si falta. Borrar ese campo fiándose de
 * aquí habría dejado el panel de jugadas de toda mesa de cartas diciendo «None»
 * en silencio.
 *
 * O sea: la herramienta que existe para cazar «uno publica X y otro lee Y»
 * tenía dentro exactamente esa enfermedad, en forma de lista que se separa de la
 * realidad sin avisar. Es la sexta vez que este proyecto la sufre —los juegos
 * del README, el escaparate, el catálogo del gym, las barajas, las páginas— y la
 * primera que se esconde dentro del detector.
 *
 * Un falso negativo aquí es peor que no tener la herramienta: no dice «no sé»,
 * dice «no lo lee nadie», y con esa frase se borran campos.
 *
 * Ahora se BUSCA quién lee. Cualquier fichero que toque un estado de partida
 * entra, esté donde esté. Lo encontró Fable 5 revisando esto como consultor.
 */
const RAICES = [
    { base: PUB, sub: ['arcade', 'js/alisa-engine/src'] },
    { base: path.join(PUB, '..'), sub: ['worker-mesas'] },
];
/** Lo que delata a un consumidor: mira dentro de un estado de partida. */
const HUELLA = /\b(?:st|state|stateObj|estado|data|partida)\??\.(?:\w+)|reglas\.estado\(|\.legal_moves\b|\.legal_actions\b/;

async function* recorrer(dir) {
    let entradas;
    try { entradas = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
        const p = path.join(dir, e.name);
        // `vendor` y `legacy` son código de fuera o congelado: leerlo daría
        // consumidores que ya no existen y taparía los que sí.
        if (e.isDirectory()) {
            if (['vendor', 'legacy', 'node_modules', '_archive'].includes(e.name)) continue;
            yield* recorrer(p);
        } else if (/\.(js|mjs|html)$/.test(e.name)) {
            yield p;
        }
    }
}

const CONSUMIDORES = [];
for (const { base, sub } of RAICES) {
    for (const s of sub) {
        for await (const abs of recorrer(path.join(base, s))) {
            let txt;
            try { txt = await readFile(abs, 'utf8'); } catch { continue; }
            if (HUELLA.test(txt)) CONSUMIDORES.push(path.relative(PUB, abs).replace(/\\/g, '/'));
        }
    }
}

const leido = new Map();              // campo -> Set(ficheros)
for (const rel of CONSUMIDORES) {
    let txt;
    try { txt = await readFile(path.join(PUB, rel), 'utf8'); } catch { continue; }
    // `st.campo`, `data.campo`, `e.campo`, `estado.campo`, `st?.campo`,
    // y los desestructurados `const { a, b } = st`.
    for (const m of txt.matchAll(/\b(?:st|state|estado|data|e|d)\??\.(\w+)/g)) {
        if (!leido.has(m[1])) leido.set(m[1], new Set());
        leido.get(m[1]).add(path.basename(rel));
    }
}

// ── 3. El desajuste ─────────────────────────────────────────────────────
// Ruido conocido: los `.length`, `.map` y demás del propio JavaScript.
const RUIDO = new Set(['length', 'map', 'filter', 'slice', 'join', 'push', 'find',
    'includes', 'some', 'every', 'forEach', 'target', 'value', 'json', 'ok', 'status',
    'toFixed', 'split', 'trim', 'replace', 'match', 'keys', 'at', 'reduce', 'sort',
    'concat', 'indexOf', 'startsWith', 'endsWith', 'flatMap', 'flat', 'padStart']);

const sinLeer = [...publicado.entries()]
    .filter(([k]) => !leido.has(k) && !RUIDO.has(k))
    .sort((a, b) => b[1].size - a[1].size);

const sinPublicar = [...leido.entries()]
    .filter(([k]) => !publicado.has(k) && !RUIDO.has(k))
    .sort((a, b) => b[1].size - a[1].size);

console.log('\n═══ PUBLICADO Y NUNCA LEÍDO ═══');
console.log('  El juego lo dice y nadie escucha. Aquí es donde estaba `board`.\n');
for (const [k, js] of sinLeer) {
    console.log(`  ${k.padEnd(22)} lo publican ${js.size}: ${[...js].slice(0, 6).join(', ')}`);
}
if (!sinLeer.length) console.log('  (ninguno)');

console.log('\n═══ LEÍDO Y NUNCA PUBLICADO ═══');
console.log('  Alguien pregunta y siempre sale `undefined`. Sin error.\n');
for (const [k, fs] of sinPublicar) {
    console.log(`  ${k.padEnd(22)} lo leen: ${[...fs].slice(0, 4).join(', ')}`);
}
if (!sinPublicar.length) console.log('  (ninguno)');
console.log('');
