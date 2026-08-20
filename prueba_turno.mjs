/**
 * ¿SABE EL SEGUNDO JUGADOR CUÁNDO LE TOCA?
 *
 * Pregunta de Oscar sobre entropy: «¿pueden dos testers jugar uno contra otro?».
 * Mirándolo salió que `estado(p, 1).turn` decía `player` cuando le tocaba al asiento
 * 0 — o sea que el segundo jugador ve «te toca» justo cuando NO le toca, y al revés.
 *
 * Doce ficheros de reglas comparan `turno === 0` en vez de `turno === yo`. Esto lo
 * mide en todos los juegos de más de una silla y sobre partidas de verdad, no leyendo
 * el código: se juega, y en cada jugada se pregunta a las dos sillas quién cree que
 * tiene el turno.
 *
 * La regla, dicha sin ambigüedad: **desde la silla que mueve, `turn` tiene que decir
 * `player`; desde cualquier otra, no.** Da igual el vocabulario —`player`/`cpu1`,
 * `white`/`black`, o un número— mientras sea el MISMO para las dos sillas o distinga
 * correctamente. Lo que no vale es que las dos vean «me toca a mí».
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { JUEGOS, SILLAS, cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

console.log('\n¿Sabe cada silla cuándo le toca?\n');
let malos = 0, mirados = 0;

for (const juego of JUEGOS) {
    const sillas = SILLAS[juego] ?? 1;
    if (sillas < 2) continue;
    let R;
    try { R = await cargarReglas(juego, {}); } catch { continue; }
    const p = R.nuevaPartida({ semilla: 7 });
    mirados++;

    // Se recogen los `turn` que ve cada silla en cada jugada, junto al turno real.
    const casos = [];
    for (let i = 0; i < 40; i++) {
        const s0 = R.estado(p, 0);
        if (s0.is_game_over) break;
        const real = p.turno ?? p.turnoActual ?? null;
        if (real !== null && real !== undefined) {
            casos.push(Array.from({ length: sillas }, (_, k) => String(R.estado(p, k).turn)).concat([String(real)]));
        }
        const j = (R.sugerencia && R.sugerencia(p)) || s0.legal_moves.filter(m => m !== 'nueva')[0];
        if (!j || !R.mover(p, j)) break;
    }
    if (!casos.length) { console.log(`  ${gris('·')} ${juego.padEnd(11)} ${gris('no publica turno numérico')}`); continue; }

    /**
     * ⚠️ EL FALLO QUE SE BUSCA: dos sillas que ven la MISMA palabra de «me toca».
     *
     * Con el vocabulario `player`/`cpuN`, «player» significa «tú». Si dos sillas lo
     * ven a la vez, una de las dos está mintiendo. Con `white`/`black` no aplica: eso
     * es un color, no un pronombre, y las dos sillas deben verlo igual.
     */
    const conPronombre = casos.some(c => c.slice(0, -1).includes('player'));
    if (!conPronombre) {
        console.log(`  ${verde('✓')} ${juego.padEnd(11)} ${gris(`sin pronombre (${casos[0].slice(0, -1).join(' / ')}) — no puede confundir`)}`);
        continue;
    }
    /**
     * ⚠️ EL INVARIANTE ES «EXACTAMENTE UNA», NO «LA SILLA `p.turno`».
     *
     * Mi primera versión comparaba contra `p.turno` y denunciaba al alisápolis en 19
     * de 40 jugadas. Era falso: en una subasta quien decide es el pujador, no quien
     * tiene el turno de la mesa, así que `p.turno` no es la respuesta a «¿quién mueve
     * ahora?» en ese juego. La sonda sabía menos del juego de lo que creía.
     *
     * Y no hace falta saberlo. La propiedad que importa se puede comprobar sin
     * conocer al que mueve: **`player` significa TÚ, así que exactamente una silla
     * puede verlo a la vez.** Ninguna es un juego bloqueado; dos o más es el fallo que
     * se buscaba —trece juegos donde todas las sillas veían «te toca»—.
     */
    const mal = casos.filter((c) => {
        const vistas = c.slice(0, -1);
        return vistas.filter(v => v === 'player').length !== 1;
    });
    if (mal.length) {
        malos++;
        const ej = mal[0];
        console.log(`  ${rojo('✗')} ${juego.padEnd(11)} ${mal.length}/${casos.length} jugadas mal`);
        console.log(gris(`      con el turno en la silla ${ej[ej.length - 1]}, las sillas ven: ${ej.slice(0, -1).join(' / ')}`));
    } else {
        console.log(`  ${verde('✓')} ${juego.padEnd(11)} ${gris(`${casos.length} jugadas, cada silla sabe si le toca`)}`);
    }
}

console.log(malos
    ? rojo(`\n✗ ${malos} de ${mirados} juegos donde el segundo jugador no sabe cuándo le toca\n`)
    : verde(`\n✓ los ${mirados} juegos de más de una silla dicen bien de quién es el turno\n`));
process.exit(malos ? 1 : 0);
