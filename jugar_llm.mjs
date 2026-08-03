/**
 * jugar_llm.mjs — pon un modelo a jugar y saca su fila de la tabla
 * ═══════════════════════════════════════════════════════════════════════════
 *   node jugar_llm.mjs --modelo qwen3:0.6b --juegos gofish,blackjack --semillas 3
 *   node jugar_llm.mjs --modelo eco                    (el control del arnés)
 *   node jugar_llm.mjs --listar
 *
 * LO QUE HACE DISTINTO A ESTO
 * Cada fila que sale de aquí lleva recibo, y **el recibo se verifica antes de
 * imprimir la fila**: se coge `{juego, semilla, jugadas, puntos}`, se vuelve a
 * jugar contra el mismo fichero de reglas y se comprueba que sale lo mismo. Si
 * no cuadra, la fila no se publica y se dice por qué.
 *
 * Lo normal en el sector es subir una trayectoria y que la puntúe otro modelo.
 * Aquí no hay juez: hay una re-simulación. Un resultado no se cree, se recalcula.
 *
 * EL CONTROL
 * `--modelo eco` no llama a ningún modelo: elige siempre la primera opción. Su
 * fila TIENE que coincidir con la política tonta de `calibrar.mjs`. Si no
 * coincide, el roto es este arnés y no el modelo que estemos midiendo. Un banco
 * de pruebas sin control mide su propia instrumentación sin saberlo.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

// Los módulos de reglas leen `card_library.json` con `fetch`. En Node eso es
// `file://`, que su fetch no sirve — y caerían al respaldo EN SILENCIO.
const fetchReal = globalThis.fetch;
globalThis.fetch = async (entrada, init) => {
    const url = entrada instanceof URL ? entrada : new URL(String(entrada));
    if (url.protocol !== 'file:') return fetchReal(entrada, init);
    return new Response(await readFile(fileURLToPath(url), 'utf-8'), { status: 200 });
};

const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { CATALOGO } = await impo('public/js/alisa-engine/src/gym/registro.js');
const { verificar } = await impo('public/arcade/js/protohub/Verificador.js');
const { cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');
const { jugarEpisodio } = await impo('agentes/llm.mjs');
const { ollama, eco, azar } = await impo('agentes/proveedores.mjs');

// ── argumentos ───────────────────────────────────────────────────
const args = {};
for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--')) args[a.slice(2)] = (process.argv[i + 1]?.startsWith('--') ?? true) ? true : process.argv[++i];
}
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo  = (s) => `\x1b[31m${s}\x1b[0m`;
const gris  = (s) => `\x1b[90m${s}\x1b[0m`;

if (args.listar) {
    for (const e of CATALOGO) console.log(`  ${e.id.padEnd(28)} ${e.titulo ?? ''}`);
    process.exit(0);
}

const nombreModelo = String(args.modelo ?? 'eco');
const proveedor = nombreModelo === 'eco' ? eco()
                : nombreModelo === 'azar' ? azar(7)
                : ollama({ modelo: nombreModelo });

const SEMILLAS = Number(args.semillas ?? 3);
const TOPE = Number(args.tope ?? 40);
const pedidos = args.juegos ? String(args.juegos).split(',').map(s => s.trim()) : null;

// Sólo entornos del ProtoHub: son los que emiten recibo verificable. Los nativos
// juegan igual pero todavía no lo emiten, y una tabla mezclada daría a entender
// que todas las filas están igual de respaldadas.
const entornos = CATALOGO.filter(e => e.familia !== 'propio')
    .filter(e => !pedidos || pedidos.includes(e.juego));

if (!entornos.length) { console.log(rojo('  ningún entorno coincide')); process.exit(2); }

console.log(`\n  modelo: ${verde(proveedor.nombre)} · ${entornos.length} juegos`
          + ` · ${SEMILLAS} semillas · tope ${TOPE} llamadas\n`);
console.log(gris('  juego         puntos  forzadas  llamadas   tok/jugada   ms/jugada  recibo'));

const filas = [];
for (const e of entornos) {
    const Clase = await e.cargar();
    const reglas = await cargarReglas(e.juego);

    let puntos = 0, forzadas = 0, llamadas = 0, tokens = 0, ms = 0;
    let verificadas = 0, rechazos = [];
    let fallo = null;

    for (let s = 1; s <= SEMILLAS; s++) {
        let r;
        try { r = await jugarEpisodio(Clase, proveedor, { semilla: s, tope: TOPE }); }
        catch (err) { fallo = err.message; break; }
        if (r.error) { fallo = r.error; break; }

        puntos += r.puntos; forzadas += r.forzadas; llamadas += r.llamadas;
        tokens += r.tokens.entrada + r.tokens.salida; ms += r.ms;

        // ⚠️ LA FILA SE VERIFICA ANTES DE EXISTIR.
        if (r.recibo && reglas) {
            const v = verificar(reglas, r.recibo);
            if (v.valida) verificadas++;
            else rechazos.push(`semilla ${s}: ${v.motivo}`);
        }
    }

    if (fallo) {
        console.log(`  ${rojo('✗')} ${e.juego.padEnd(12)} ${rojo(fallo.slice(0, 60))}`);
        continue;
    }

    const jugadasTotales = Math.max(1, llamadas);
    const ok = verificadas === SEMILLAS;
    filas.push({ juego: e.juego, puntos: puntos / SEMILLAS, forzadas, llamadas,
                 tokens, ms, verificadas, total: SEMILLAS });

    console.log(`  ${ok ? verde('✓') : rojo('✗')} ${e.juego.padEnd(12)}`
        + `${(puntos / SEMILLAS).toFixed(1).padStart(8)}`
        + `${String(forzadas).padStart(10)}`
        + `${String(llamadas).padStart(10)}`
        + `${(tokens / jugadasTotales).toFixed(0).padStart(13)}`
        + `${(ms / jugadasTotales).toFixed(0).padStart(12)}`
        + `   ${verificadas}/${SEMILLAS}`
        + (rechazos.length ? rojo('  ← ' + rechazos[0]) : ''));
}

// ── resumen ──────────────────────────────────────────────────────
const suma = (k) => filas.reduce((a, f) => a + f[k], 0);
const verif = suma('verificadas'), total = suma('total');
const forz = suma('forzadas'), llam = suma('llamadas');

console.log(`\n  ${verif === total && total > 0 ? verde(`${verif}/${total} partidas verificadas`)
                                                : rojo(`${verif}/${total} partidas verificadas`)}`
    + gris(`  ·  forzadas ${forz}/${llam} (${llam ? (100 * forz / llam).toFixed(0) : 0}%)`)
    + gris(`  ·  ${(suma('tokens') / 1000).toFixed(1)}k tokens  ·  ${(suma('ms') / 1000).toFixed(1)} s`));

if (args.guardar) {
    const dir = path.join(AQUI, 'resultados');
    await mkdir(dir, { recursive: true });
    const f = path.join(dir, `${proveedor.nombre.replace(/[^\w.-]+/g, '_')}.json`);
    await writeFile(f, JSON.stringify({ modelo: proveedor.nombre, fecha: new Date().toISOString(),
                                        semillas: SEMILLAS, tope: TOPE, filas }, null, 2));
    console.log(gris(`  guardado en resultados/${path.basename(f)}`));
}
console.log();
process.exit(verif === total ? 0 : 1);
