/**
 * ¿MIDE ALGO EL ALISÁPOLIS YA CONSTRUIDO?
 *
 * La sonda de la subasta sola dio señal/ruido 30, pero eso era la subasta desnuda:
 * doce fincas, todas subastadas, presupuesto único. En el juego real la mayoría de las
 * fincas se COMPRAN al caer, la partida dura ocho vueltas y puede que un distrito no
 * se complete nunca — y si no se completa, la cuenta que separa a un jugador bueno de
 * uno malo no llega a importar.
 *
 * Así que se pregunta tres cosas, y la primera es la que decide:
 *   1. ¿se completa algún distrito? Si casi nunca, la mecánica central no se ejerce.
 *   2. ¿gana la casa a la política tonta, con hueco por encima del ruido?
 *   3. ¿cuántas jugadas dura? Lo necesita el tope de la clasificación.
 *
 * Con las sillas cambiadas, que es la lección de ayer: en remigio el asiento valía
 * −55 contra +135 y se comía la señal entera.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { crearAlisapolis, DISTRITOS } =
    await impo('public/arcade/js/protohub/rules/alisapolis.js');

const N = Number(process.argv[2] ?? 300);
const VUELTAS = Number(process.argv[3] ?? 8);

const primera = (st) => st.legal_moves.filter(m => m !== 'nueva' && m !== 'reset')[0];

async function jugar(semilla, casaEn) {
    const R = await crearAlisapolis({ vueltas: VUELTAS });
    const p = R.nuevaPartida({ semilla });
    let pasos = 0;
    for (; pasos < 6000; pasos++) {
        const st = R.estado(p, 0);
        if (st.is_game_over) break;
        // Quién decide AHORA: en la subasta no es `p.turno`.
        const decide = p.fase === 'subasta' ? p.subasta.vivos[p.subasta.enTurno] : p.turno;
        const j = decide === casaEn ? R.sugerencia(p) : primera(R.estado(p, decide));
        if (!j || !R.mover(p, j)) return null;
    }
    const fin = R.estado(p, 0);
    // ¿Alguien tuvo un distrito entero?
    const completos = DISTRITOS.filter(d => {
        for (let q = 0; q < p.jugadores; q++) {
            const total = p.duenos.filter((x, k) => x === q).length;
            if (!total) continue;
        }
        // Se cuenta sobre `casas`, que sólo existe si se completó, o mirando dueños.
        return false;
    });
    return {
        pasos,
        marcador: fin.marcador,
        casas: Object.keys(p.casas).length,
        quebrados: p.quebrados.length,
        p, R,
    };
}

/** Cuántos distritos completos hay al final, mirando los dueños. */
function completosDe(p) {
    let n = 0;
    for (const d of DISTRITOS) {
        for (let q = 0; q < p.jugadores; q++) {
            const míos = p.duenos.filter((x, k) => x === q).length;
            if (!míos) continue;
        }
    }
    return n;
}

const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const ic95 = (xs) => {
    const m = media(xs);
    const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
    return 1.96 * Math.sqrt(v / xs.length);
};

const dif = [], pasos = [], conCasas = [], quiebras = [];
let rotas = 0;
for (let s = 1; s <= N; s++) {
    const casaEn = s % 2;
    const r = await jugar(s, casaEn);
    if (!r) { rotas++; continue; }
    dif.push(r.marcador[casaEn] - r.marcador[1 - casaEn]);
    pasos.push(r.pasos);
    conCasas.push(r.casas > 0 ? 1 : 0);
    quiebras.push(r.quebrados > 0 ? 1 : 0);
}

const h = media(dif), ruido = ic95(dif);
console.log(`\n  ALISÁPOLIS · ${dif.length} partidas · ${VUELTAS} vueltas`);
console.log(`    distritos completados (hubo casas): ${(100 * media(conCasas)).toFixed(0)}% de las partidas`);
console.log(`    alguien quebró: ${(100 * media(quiebras)).toFixed(0)}%`);
console.log(`    jugadas por partida: ${media(pasos).toFixed(0)} (máx ${Math.max(...pasos)})`);
console.log(`    casa contra tonta: hueco ${h.toFixed(1)} ± ${ruido.toFixed(1)}`
          + `   ${Math.abs(h) > ruido ? '✓ separa' : '✗ no separa'}`
          + `   (señal/ruido ${(Math.abs(h) / (ruido || 1e-9)).toFixed(1)})`);
if (rotas) console.log(`    ⚠️ ${rotas} partidas rotas`);
