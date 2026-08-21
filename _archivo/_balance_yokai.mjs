/**
 * ¿CON CUÁNTOS YOKAI Y CUÁNTOS VECINOS ES UN JUEGO?
 *
 * La primera versión —6 sillas, 2 yokai, fin por paridad— la ganaban los yokai 56
 * de 60. La aritmética manda: una muerte de noche y un linchamiento errado ya son
 * dos contra dos. No se elige a ojo; se prueban las combinaciones y se mira.
 *
 * Lo que se busca no es 50-50: es que las dos partes GANEN A VECES y que la
 * partida dure lo bastante para que hablar tenga sitio. Un juego que se acaba en
 * dos días no mide una conversación.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const RUTA = 'public/arcade/js/protohub/rules/yokai.js';
const orig = readFileSync(RUTA, 'utf8');
const TMP = './_tmp_yokai.mjs';

const combos = [
    { sillas: 6, yokais: 2, fin: 'paridad' },
    { sillas: 6, yokais: 1, fin: 'paridad' },
    { sillas: 8, yokais: 2, fin: 'paridad' },
    { sillas: 6, yokais: 2, fin: 'ultimo' },
    { sillas: 7, yokais: 2, fin: 'paridad' },
    { sillas: 8, yokais: 2, fin: 'ultimo' },
];

console.log('\n¿Con cuántos yokai y cuántos vecinos es un juego?\n');
for (const c of combos) {
    const letras = 'abcdefgh'.slice(0, c.sillas).split('');
    let t = orig
        .replace(/const SILLAS = \[[^\]]*\];/, `const SILLAS = ${JSON.stringify(letras)};`)
        .replace(/const YOKAIS = \d+;/, `const YOKAIS = ${c.yokais};`);
    if (c.fin === 'ultimo') {
        t = t.replace('const gananYokai = !gananHumanos && yokaisVivos >= humanosVivos;',
                      'const gananYokai = !gananHumanos && humanosVivos <= 1;');
    }
    writeFileSync(TMP, t);
    const { yokai: R } = await import(`${TMP}?${Date.now()}`);

    let aldea = 0, yk = 0, sin = 0, pasos = 0, dias = 0;
    const N = 80;
    for (let s = 1; s <= N; s++) {
        const p = R.nuevaPartida({ semilla: s });
        let n = 0;
        while (n++ < 900) {
            const st = R.estado(p, letras.indexOf(p.turno));
            if (st.is_game_over) break;
            const j = R.sugerencia(p);
            if (!j || !R.mover(p, j)) break;
        }
        const f = R.estado(p, 0);
        pasos += n; dias += p.noche;
        if (/expulsó a los/.test(f.desenlace || '')) aldea++;
        else if (/igualaron|se quedaron/.test(f.desenlace || '')) yk++;
        else sin++;
    }
    console.log(`  ${c.sillas} sillas · ${c.yokais} yokai · fin ${c.fin.padEnd(8)}`
        + ` → aldea ${String(aldea).padStart(2)} · yokai ${String(yk).padStart(2)} · sin resolver ${String(sin).padStart(2)}`
        + `  (${(pasos / N).toFixed(0)} jugadas, ${(dias / N).toFixed(1)} días)`);
}
unlinkSync(TMP);
console.log('');
