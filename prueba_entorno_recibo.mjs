/**
 * LOS JUEGOS BONITOS TAMBIÉN TIENEN QUE DEMOSTRAR SU PARTIDA
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_entorno_recibo.mjs
 *
 * La casa tiene dos formas de juego. Los cuarenta del arcade son módulos de
 * reglas —`nuevaPartida`, `mover`, `estado`—. Los seis con física propia —Cucco
 * Swarm, Raccoon Space, Asteroids, Cabinet Escape, RueDelPercebe,
 * ChopperAquarium— son clases con `reset(semilla)` y `step(verbo)`: son los
 * bonitos, con GLB, animación y luces.
 *
 * Estaban fuera de la tabla por una línea sin comentar en `tabla.mjs`. Y no les
 * faltaba nada: semilla, determinismo, verbos declarados y `affordances()`. Lo
 * que faltaba era que el verificador supiera repetir la segunda forma.
 *
 * Esto comprueba las cuatro cosas que pueden salir mal, y son distintas:
 *
 *   1. que una partida de entorno VERIFIQUE (si no, no puede entrar en la tabla)
 *   2. que sea REPETIBLE: misma semilla y mismos verbos, misma puntuación
 *   3. que una puntuación inflada se cace
 *   4. que un verbo inventado se cace
 *
 * La 2 es la que de verdad importa: si el entorno no fuera determinista, la 1 y
 * la 3 pasarían por casualidad la mitad de las veces y no lo sabríamos.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { CATALOGO } = await impo('public/js/alisa-engine/src/gym/registro.js');
const { verificar } = await impo('public/arcade/js/protohub/Verificador.js');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

/** Juega una partida corta eligiendo siempre el primer verbo legal. */
function jugar(Clase, semilla, pasos) {
    const env = new Clase();
    env.reset(semilla);
    const jugadas = [];
    let puntos = 0;
    for (let i = 0; i < pasos; i++) {
        const a = env.affordances?.() ?? [];
        const legales = a.map((x) => (typeof x === 'string' ? x : x?.verb)).filter(Boolean);
        if (!legales.length) break;
        const j = legales[0];
        const r = env.step(j);
        jugadas.push(j);
        puntos += Number(r?.reward) || 0;
        if (r?.done) break;
    }
    return { jugadas, puntos };
}

console.log('\nLos juegos con física propia también demuestran su partida\n');
const propios = CATALOGO.filter((e) => e.familia === 'propio');
let fallos = 0;

for (const e of propios) {
    let Clase;
    try { Clase = await e.cargar(); } catch (err) { console.log(`  ${rojo('✗')} ${e.id} no carga: ${err.message}`); fallos++; continue; }

    const SEMILLA = 7;
    const { jugadas, puntos } = jugar(Clase, SEMILLA, 120);
    if (!jugadas.length) { console.log(`  ${gris('·')} ${e.titulo}: no ofreció ninguna jugada`); continue; }

    const recibo = { juego: e.juego ?? e.id, semilla: SEMILLA, jugadas, puntos };
    const malo = [];

    // 1 — verifica
    const v = verificar(Clase, recibo);
    if (!v.valida) malo.push(`no verifica: ${v.motivo}`);

    /**
     * 2 — ⚠️ Y ES REPETIBLE, QUE ES LO QUE SOSTIENE TODO LO DEMÁS.
     *
     * Se vuelve a jugar desde cero con la misma semilla y se compara la
     * puntuación. Si esto fallara, el «válida» de arriba sería casualidad — y un
     * verificador que da verdes por casualidad es peor que no tenerlo.
     */
    const otra = jugar(Clase, SEMILLA, jugadas.length);
    if (Math.abs(otra.puntos - puntos) > 1e-6) {
        malo.push(`no es repetible: ${puntos} la primera vez, ${otra.puntos} la segunda`);
    }

    // 3 — una puntuación inflada se caza
    const inflado = verificar(Clase, { ...recibo, puntos: puntos + 1000 });
    if (inflado.valida) malo.push('una puntuación inflada pasó el audito');

    // 4 — un verbo inventado se caza (sólo si el entorno publica sus legales)
    const conBasura = jugadas.slice();
    conBasura[Math.max(0, conBasura.length - 1)] = 'volar_a_la_luna';
    const basura = verificar(Clase, { ...recibo, jugadas: conBasura, puntos: undefined });
    if (basura.valida && v.porPatron === 0) malo.push('un verbo inventado pasó el audito');

    if (malo.length) { fallos++; console.log(`  ${rojo('✗')} ${String(e.titulo).padEnd(16)} ${malo.join('\n      ')}`); }
    else console.log(`  ${verde('✓')} ${String(e.titulo).padEnd(16)}`
        + gris(`${jugadas.length} jugadas · ${puntos.toFixed(1)} puntos · repetible`
             + (v.porPatron ? ` · ${v.porPatron} sin lista de legales` : '')));
}

console.log(fallos
    ? rojo(`\n✗ ${fallos} de ${propios.length} entornos no pueden demostrar su partida\n`)
    : verde(`\n✓ los ${propios.length} entornos con física propia demuestran su partida\n`));
process.exit(fallos ? 1 : 0);
