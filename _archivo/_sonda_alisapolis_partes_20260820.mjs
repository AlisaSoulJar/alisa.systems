/**
 * ¿QUÉ PARTE DE MI HEURÍSTICA RESTA?
 *
 * La casa pierde contra «la primera jugada legal» y llevo dos intentos adivinando por
 * qué. Se deja de adivinar: la casa tiene tres componentes y se prueban por separado,
 * cada uno contra el mismo suelo y sobre las mismas semillas.
 *
 *     completa   construye + compra con criterio + puja hasta su valoración
 *     sin_obra   igual, pero NO construye nunca
 *     sin_puja   igual, pero en la subasta puja como la tonta (siempre)
 *     solo_obra  como la tonta en todo, salvo que construye
 *
 * El que suba al quitarlo es el que resta. Es la misma idea que un sabotaje, aplicada
 * a una política en vez de a una comprobación.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { crearAlisapolis } = await impo('public/arcade/js/protohub/rules/alisapolis.js');

const N = Number(process.argv[2] ?? 200);
const VUELTAS = Number(process.argv[3] ?? 20);

const primeraDe = (st) => st.legal_moves.filter(m => m !== 'nueva' && m !== 'reset')[0];

/** Cada variante filtra lo que la casa propone y lo sustituye por lo de la tonta. */
const VARIANTES = {
    completa:  (j) => j,
    sin_obra:  (j, st) => (String(j).startsWith('construir:') ? 'tirar' : j),
    sin_puja:  (j, st, fase) => (fase === 'subasta' ? primeraDe(st) : j),
    solo_obra: (j, st, fase) => (String(j).startsWith('construir:') ? j : primeraDe(st)),
};

async function jugar(semilla, casaEn, variante) {
    const R = await crearAlisapolis({ vueltas: VUELTAS });
    const p = R.nuevaPartida({ semilla });
    for (let i = 0; i < 8000; i++) {
        const st0 = R.estado(p, 0);
        if (st0.is_game_over) break;
        const decide = p.fase === 'subasta' ? p.subasta.vivos[p.subasta.enTurno] : p.turno;
        const st = R.estado(p, decide);
        let j;
        if (decide === casaEn) {
            j = VARIANTES[variante](R.sugerencia(p), st, p.fase);
            if (!j || !st.legal_moves.includes(j)) j = primeraDe(st);
        } else {
            j = primeraDe(st);
        }
        if (!j || !R.mover(p, j)) return null;
    }
    const fin = R.estado(p, 0);
    return fin.marcador[casaEn] - fin.marcador[1 - casaEn];
}

const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const ic95 = (xs) => {
    const m = media(xs);
    const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
    return 1.96 * Math.sqrt(v / xs.length);
};

console.log(`\n  ALISÁPOLIS · ${N} semillas × 2 sillas · ${VUELTAS} vueltas\n`);
for (const v of Object.keys(VARIANTES)) {
    const dif = [];
    for (let s = 1; s <= N; s++) {
        for (const silla of [0, 1]) {
            const d = await jugar(s, silla, v);
            if (d !== null) dif.push(d);
        }
    }
    const h = media(dif), r = ic95(dif);
    console.log(`  ${v.padEnd(10)} hueco ${h.toFixed(1).padStart(8)} ± ${r.toFixed(1).padStart(6)}`
              + `   ${Math.abs(h) > r ? (h > 0 ? '✓ gana' : '✗ PIERDE') : '· ruido'}`);
}
