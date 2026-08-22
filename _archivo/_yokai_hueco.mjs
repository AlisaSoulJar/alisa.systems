/**
 * ¿SEPARA YA LA CASA DEL SUELO EN YOKAI?
 *
 * La tabla lo descartó con «la casa no supera al suelo», y la causa era que
 * abstenerse salía gratis: la política tonta callaba y no votaba, y eso costaba
 * lo mismo que jugar bien. Se le puso precio a la abstención; esto mide si con eso
 * el hueco existe.
 *
 * ⚠️ SE USA `huecoEmparejado` DE `medir.mjs`, Y ES SU PRIMER USO DE VERDAD.
 *
 * Lo escribí hoy después de anunciar un conflicto entre dos configuraciones
 * comparando huecos crudos sin su error. Aquí el error importa el doble: en un
 * juego de papeles ocultos, la varianza de «te tocó yokai o no» es enorme, así
 * que las dos políticas juegan las MISMAS semillas en las MISMAS sillas y se
 * resta partida a partida.
 */
import { huecoEmparejado, diHueco } from './medir.mjs';
import { cargarReglas, SILLAS as SILLAS_DE } from './public/arcade/js/protohub/rules/index.js';

const R = await cargarReglas('yokai', {});
const LETRAS = 'abcdefgh'.slice(0, SILLAS_DE.yokai).split('');
const N = 80;

function jugar(semilla, silla, politica) {
    const p = R.nuevaPartida({ semilla });
    let n = 0;
    while (n++ < 400) {
        const i = LETRAS.indexOf(p.turno);
        const st = R.estado(p, i);
        if (st.is_game_over) break;
        const leg = st.legal_moves.filter((x) => x !== 'nueva');
        if (!leg.length) break;
        const j = i === silla
            ? (politica === 'casa' ? R.sugerencia(p) : leg[0])
            : R.sugerencia(p);
        if (!j || !R.mover(p, j)) break;
    }
    return R.estado(p, silla).puntos;
}

const casa = [], suelo = [];
for (let s = 1; s <= N; s++) {
    for (let silla = 0; silla < LETRAS.length; silla++) {
        casa.push(jugar(s, silla, 'casa'));
        suelo.push(jugar(s, silla, 'primera'));
    }
}

const h = huecoEmparejado(casa, suelo);
const media = (a) => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`\n  casa ${media(casa).toFixed(1)} · suelo ${media(suelo).toFixed(1)}`);
console.log(`  hueco: ${diHueco(h)}\n`);
