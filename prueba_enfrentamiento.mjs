/**
 * LA SEGUNDA TABLA MIDE HABILIDAD, NO SITIO EN LA MESA
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_enfrentamiento.mjs
 *
 * `enfrentamiento.mjs` puntúa a los participantes unos contra otros. Todo lo que
 * hace descansa en tres cuentas, y las tres se equivocan EN SILENCIO:
 *
 *   1. el reparto de sillas — si no es parejo, la ventaja de salir primero se
 *      apunta como habilidad de quien la ocupe. Canadiense premia a quien empieza
 *      con seis puntos sobre el reparto limpio: eso, mal repartido, es la mitad de
 *      la diferencia que la tabla llama «jugar mejor».
 *   2. la mano duplicada — comparar la misma silla de la misma semilla es lo que
 *      quita el papel y las cartas de en medio. Si por una (semilla, silla) no
 *      pasan TODOS, se vuelve a comparar a un shinigami con un aldeano.
 *   3. Bradley–Terry — si dependiera del orden, la misma tanda daría dos tablas
 *      distintas, y aquí toda cifra tiene que poder repetirse.
 *
 * La tercera se comprueba contra la solución EXACTA, que existe: con dos
 * jugadores y un historial de 3 a 1, la máxima verosimilitud da fuerza 3 contra 1,
 * o sea 400·log₁₀3 = 190,85 puntos de diferencia. Un número cerrado que no depende
 * de esta implementación y que ninguna aproximación floja acierta por casualidad.
 */
import { repartoDe, contarSillas, bradleyTerry, aElo } from './enfrentar.mjs';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

console.log('\nLa segunda tabla mide habilidad, no sitio en la mesa\n');
const fallos = [];

// ── 1. Cada participante se sienta en cada silla el mismo número de veces ──
// Se prueba en varias formas de mesa a propósito: la propiedad tiene que valer
// cuando hay más sillas que participantes (shinigami, 8 contra 3) y cuando hay menos
// (entropy, 2 contra 3), que son los dos casos reales y se rompen distinto.
{
    let mal = [];
    for (const [sillas, P] of [[2, 3], [3, 3], [4, 3], [8, 3], [4, 5]]) {
        const cuenta = Array.from({ length: P }, () => new Array(sillas).fill(0));
        for (let r = 0; r < P; r++) {
            const rep = repartoDe(sillas, r, P);
            for (let k = 0; k < sillas; k++) cuenta[rep[k]][k]++;
        }
        const todas = cuenta.flat();
        if (!todas.every((x) => x === todas[0])) mal.push(`${sillas} sillas × ${P}`);
    }
    if (mal.length) fallos.push(`el reparto no es parejo en: ${mal.join(', ')}`);
    else console.log(`  ${verde('✓')} cada participante se sienta en cada silla las mismas veces`
        + gris(' (2×3, 3×3, 4×3, 8×3, 4×5)'));
}

// ── 2. Por cada (semilla, silla) pasan TODOS: la mano duplicada ──
{
    let mal = [];
    for (const [sillas, P] of [[2, 3], [4, 3], [8, 3]]) {
        for (let k = 0; k < sillas; k++) {
            const pasan = new Set();
            for (let r = 0; r < P; r++) pasan.add(repartoDe(sillas, r, P)[k]);
            if (pasan.size !== P) mal.push(`${sillas}×${P} silla ${k}: sólo ${pasan.size}`);
        }
    }
    if (mal.length) fallos.push(`la mano no queda duplicada en: ${mal.slice(0, 3).join('; ')}`);
    else console.log(`  ${verde('✓')} por cada silla pasan los tres, así que la mano es duplicada`);
}

// ── 3. Bradley–Terry contra la solución exacta ──
{
    const EXACTO = 400 * Math.log10(3);        // 190.849…
    const elo = aElo(bradleyTerry([[0, 4], [4, 0]], [3, 1]), 1);
    const dado = elo[0] - elo[1];
    if (Math.abs(dado - EXACTO) > 0.5) {
        fallos.push(`con 3 victorias de 4, el hueco debería ser ${EXACTO.toFixed(2)} y sale ${dado.toFixed(2)}`);
    } else {
        console.log(`  ${verde('✓')} 3 de 4 da ${dado.toFixed(2)} puntos`
            + gris(` (exacto: 400·log₁₀3 = ${EXACTO.toFixed(2)})`));
    }
}

// ── 4. Y no depende del orden, que es la razón de no usar Elo ──
// Se alimenta la MISMA tanda de partidas contada al revés. Con Elo saldrían dos
// tablas; aquí tiene que salir la misma hasta el último decimal.
{
    const n = [[0, 7, 5], [7, 0, 9], [5, 9, 0]];
    const w = [8, 6.5, 6.5];
    const a = aElo(bradleyTerry(n, w), 0);
    const vuelta = [2, 1, 0];
    const nR = vuelta.map((i) => vuelta.map((j) => n[i][j]));
    const wR = vuelta.map((i) => w[i]);
    const b = aElo(bradleyTerry(nR, wR), 2);      // el ancla también se da la vuelta
    const igual = a.every((x, i) => Math.abs(x - b[vuelta.indexOf(i)]) < 1e-6);
    if (!igual) fallos.push(`la misma tanda leída al revés da otra tabla: ${a.map(x => x.toFixed(2))} vs ${b.map(x => x.toFixed(2))}`);
    else console.log(`  ${verde('✓')} la misma tanda leída al revés da la misma tabla`);
}

/**
 * ── 5. ⚠️ LA QUE PROTEGE DE VERDAD: CONTAR SILLAS ──
 *
 * Si `contarSillas` se queda corto, el juego no sale mal puntuado: **sale como
 * juego de un jugador y desaparece de la tabla**, sin un error y sin una fila que
 * mirar. Le pasó a shinigami —ocho sillas, dos shinigami, un oráculo— por no leer `vivos`,
 * que es lo único que publican los de deducción social.
 *
 * Los cuatro candidatos se prueban por separado porque cada juego usa el suyo, y
 * quitar uno sólo rompe a su familia: el que quitara `avance` no notaría nada en
 * las cartas y dejaría fuera a la oca y al parchís.
 */
{
    const casos = [
        ['marcador (cartas)', { marcador: [0, 0, 0, 0] }, 4],
        ['manos_rivales', { manos_rivales: [3, 3] }, 3],
        ['avance (recorrido)', { avance: [0, 0] }, 2],
        ['vivos (deducción social)', { vivos: 8 }, 8],
        ['sin nada — solitario', { puntos: 3 }, 1],
    ];
    const mal = casos.filter(([, e, esperado]) => contarSillas(e) !== esperado);
    if (mal.length) {
        for (const [nombre, e, esperado] of mal) {
            fallos.push(`contarSillas ${nombre}: esperaba ${esperado} y da ${contarSillas(e)}`);
        }
    } else console.log(`  ${verde('✓')} las sillas se cuentan por los cuatro caminos`
        + gris(' (marcador · manos_rivales · avance · vivos)'));
}

if (fallos.length) {
    console.log(rojo(`\n✗ ${fallos.length} fallo(s):`));
    fallos.forEach((f) => console.log(rojo(`    · ${f}`)));
    process.exit(1);
}
console.log(verde('\n✓ el reparto es parejo, la mano es duplicada y la puntuación no depende del orden\n'));
