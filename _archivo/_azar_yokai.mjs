/**
 * ¿QUÉ CONFIGURACIÓN MIDE MÁS HABILIDAD?
 *
 * El equilibrio no basta para elegir: un juego puede estar 50-50 y no medir nada
 * —si gana quien tiene suerte con el reparto—. Lo que importa es cuánto del hueco
 * entre no pensar y la casa recorre el AZAR. Cuanto más bajo, más sitio hay para
 * jugar bien.
 *
 * Se mide como mide el banco, y esto lo aprendí equivocándome ayer con nave: el
 * participante ocupa UNA silla y la casa juega las demás. Poner la misma política
 * en todas las sillas mide otra cosa —lo comprobé y me dio 0.21 donde la tabla
 * daba 0.41—.
 *
 * Y se pasa por TODAS las sillas: en un juego de papeles ocultos, la silla decide
 * si te toca ser yokai, y eso mueve la puntuación más que cualquier decisión.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const RUTA = 'public/arcade/js/protohub/rules/yokai.js';
const orig = readFileSync(RUTA, 'utf8');
const TMP = './_tmp_azar.mjs';
const N = 60;

const combos = [
    { sillas: 6, yokais: 2 },
    { sillas: 7, yokais: 2 },
    { sillas: 8, yokais: 2 },
];

/** Una partida con `silla` en manos de `politica` y el resto en las de la casa. */
function jugar(R, letras, semilla, silla, politica) {
    const p = R.nuevaPartida({ semilla });
    let s = semilla * 7919 + silla * 13;
    const azar = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    let n = 0;
    while (n++ < 900) {
        const i = letras.indexOf(p.turno);
        const st = R.estado(p, i);
        if (st.is_game_over) break;
        const leg = st.legal_moves.filter((x) => x !== 'nueva');
        if (!leg.length) break;
        const j = i !== silla ? R.sugerencia(p)
            : politica === 'azar' ? leg[Math.floor(azar() * leg.length)]
            : politica === 'casa' ? R.sugerencia(p)
            : leg[0];
        if (!j || !R.mover(p, j)) break;
    }
    return R.estado(p, silla).puntos;
}

console.log('\n¿Qué configuración deja más sitio para jugar bien?\n');
for (const c of combos) {
    const letras = 'abcdefgh'.slice(0, c.sillas).split('');
    const t = orig
        .replace(/const SILLAS = \[[^\]]*\];/, `const SILLAS = ${JSON.stringify(letras)};`)
        .replace(/const YOKAIS = \d+;/, `const YOKAIS = ${c.yokais};`);
    writeFileSync(TMP, t);
    const { yokai: R } = await import(`${TMP}?${Date.now()}`);

    let primera = 0, azarP = 0, casa = 0, cuantos = 0;
    for (let s = 1; s <= N; s++) {
        for (let silla = 0; silla < c.sillas; silla++) {
            primera += jugar(R, letras, s, silla, 'primera');
            azarP += jugar(R, letras, s, silla, 'azar');
            casa += jugar(R, letras, s, silla, 'casa');
            cuantos++;
        }
    }
    primera /= cuantos; azarP /= cuantos; casa /= cuantos;
    const ratio = (azarP - primera) / ((casa - primera) || 1);
    console.log(`  ${c.sillas} sillas · ${c.yokais} yokai →`
        + ` suelo ${primera.toFixed(1)} · azar ${azarP.toFixed(1)} · casa ${casa.toFixed(1)}`
        + `   el azar recorre ${ratio.toFixed(2)}`);
}
unlinkSync(TMP);
console.log('\n  (más bajo = más habilidad que medir. Nave está en 0.38-0.41.)\n');
