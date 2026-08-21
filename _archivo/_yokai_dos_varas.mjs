/**
 * NADAR Y GUARDAR LA ROPA: LAS DOS VARAS A LA VEZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Yokai tiene que ser jugable para una persona Y servir de medida. Las dos cosas
 * piden lo contrario a ratos, así que se miden juntas y se elige con los números
 * delante en vez de con una intuición.
 *
 * PARA LA PERSONA
 *   equilibrio     que las dos partes ganen a veces
 *   duración       una partida de dos días se acaba antes de que pase nada
 *
 * PARA EL BANCO
 *   decisiones     cuántas toma el agente. Con cinco no hay nada que medir:
 *                  es el fallo que la tabla enseñó con un azar de 2.15
 *   hueco/ruido    cuánto separa la casa del suelo COMPARADO con lo que
 *                  tiembla la medida. Un hueco grande con ruido mayor no vale
 *
 * ⚠️ EL HUECO SE MIDE EMPAREJADO. Las dos políticas juegan las MISMAS semillas
 * en las MISMAS sillas, y se resta partida a partida. Sin emparejar, la varianza
 * del reparto de papeles —que es enorme, te toca yokai o no— se cuela entera en
 * el error y esconde el hueco que se busca.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const RUTA = 'public/arcade/js/protohub/rules/yokai.js';
const orig = readFileSync(RUTA, 'utf8');
const TMP = './_tmp_varas.mjs';
const N = 80;

/** Juega una silla con una política y la casa en las demás. Devuelve puntos y decisiones. */
function jugar(R, letras, semilla, silla, politica) {
    const p = R.nuevaPartida({ semilla });
    let s = semilla * 7919 + silla * 13;
    const azar = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    let n = 0, mias = 0;
    while (n++ < 900) {
        const i = letras.indexOf(p.turno);
        const st = R.estado(p, i);
        if (st.is_game_over) break;
        const leg = st.legal_moves.filter((x) => x !== 'nueva');
        if (!leg.length) break;
        let j;
        if (i === silla) {
            mias++;
            j = politica === 'azar' ? leg[Math.floor(azar() * leg.length)]
              : politica === 'casa' ? R.sugerencia(p)
              : leg[0];
        } else j = R.sugerencia(p);
        if (!j || !R.mover(p, j)) break;
    }
    return { puntos: R.estado(p, silla).puntos, mias, dias: p.noche };
}

console.log('\nYokai: jugable para una persona y útil como medida\n');
console.log('           equilibrio      días  decisiones   hueco casa−suelo');
for (const sillas of [6, 7, 8]) {
    const letras = 'abcdefgh'.slice(0, sillas).split('');
    writeFileSync(TMP, orig
        .replace(/const SILLAS = \[[^\]]*\];/, `const SILLAS = ${JSON.stringify(letras)};`));
    const { yokai: R } = await import(`${TMP}?${Date.now()}`);

    let aldea = 0, yk = 0, dias = 0, decisiones = 0, pares = [];
    for (let s = 1; s <= N; s++) {
        // El equilibrio se mide con la casa en TODAS las sillas: es la partida
        // "normal", sin nadie jugando distinto.
        const p = R.nuevaPartida({ semilla: s });
        let n = 0;
        while (n++ < 900) {
            const st = R.estado(p, letras.indexOf(p.turno));
            if (st.is_game_over) break;
            const j = R.sugerencia(p);
            if (!j || !R.mover(p, j)) break;
        }
        const f = R.estado(p, 0);
        if (/expulsó a los/.test(f.desenlace || '')) aldea++;
        else if (/igualaron/.test(f.desenlace || '')) yk++;
        dias += p.noche;

        // El hueco, emparejado silla a silla.
        for (let silla = 0; silla < sillas; silla++) {
            const c = jugar(R, letras, s, silla, 'casa');
            const b = jugar(R, letras, s, silla, 'primera');
            pares.push(c.puntos - b.puntos);
            decisiones += c.mias;
        }
    }
    const media = pares.reduce((a, b) => a + b, 0) / pares.length;
    const varianza = pares.reduce((a, b) => a + (b - media) ** 2, 0) / (pares.length - 1);
    const ee = Math.sqrt(varianza / pares.length);
    const senal = Math.abs(media / (ee || 1));
    console.log(`  ${sillas} sillas   ${String(aldea).padStart(2)}–${String(yk).padEnd(2)}`
        + `        ${(dias / N).toFixed(1)}      ${(decisiones / pares.length).toFixed(1)}`
        + `       ${media.toFixed(1)} ± ${ee.toFixed(1)}  (señal ${senal.toFixed(1)}×)`);
}
unlinkSync(TMP);
console.log('\n  señal = cuántas veces el hueco supera a su propio error. Por debajo de 2 no se distingue de cero.\n');
