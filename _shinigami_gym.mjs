/**
 * SHINIGAMI VISTO POR EL ARNÉS QUE DECIDE, NO POR EL MÍO
 *
 * La tabla descarta shinigami con «la casa no supera al suelo» por tercera vez, y mi
 * sonda dice que el hueco es 18,8 ± 3,4. Uno de los dos mide otra cosa, y ya sé
 * cuál tiene razón: el que decide.
 *
 * Así que esto usa `ProtoHubEnv` —el mismo que usa `tabla.mjs`— en vez de llamar
 * a las reglas por mi cuenta. Es la regla 5 de `docs/COMO_MEDIR.md` llevada hasta
 * el final: si el instrumento oficial existe, se usa el instrumento oficial.
 */
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';
import { cargarReglas } from './public/arcade/js/protohub/rules/index.js';
import { huecoEmparejado, diHueco } from './medir.mjs';

const entrada = CATALOGO.find((e) => e.juego === 'shinigami');
const Clase = await entrada.cargar();
const R = await cargarReglas('shinigami', {});
const N = 60;

/**
 * Un episodio con una política sentada en la silla que el entorno le dé.
 * `casa` usa la sugerencia de las reglas sobre la partida VIVA del entorno, que
 * es lo que hace `tabla.mjs`; `primera` coge la primera jugada legal.
 */
function episodio(semilla, politica) {
    const env = new Clase();
    env.reset(semilla);
    let acc = 0, pasos = 0;
    for (let i = 0; i < 400; i++) {
        const st = env._estado ? env._estado() : null;
        const leg = (st?.legal_moves ?? []).filter((x) => x !== 'nueva' && x !== 'reset');
        if (!leg.length) break;
        const j = politica === 'casa'
            ? (R.sugerencia(env.p) ?? leg[0])
            : leg[0];
        const r = env.step(j);
        acc += Number(r?.reward) || 0;
        pasos++;
        if (r?.done) break;
    }
    return { puntos: acc, pasos };
}

const casa = [], suelo = [];
let pasosCasa = 0, pasosSuelo = 0;
for (let s = 1; s <= N; s++) {
    const c = episodio(s, 'casa'); const b = episodio(s, 'primera');
    casa.push(c.puntos); suelo.push(b.puntos);
    pasosCasa += c.pasos; pasosSuelo += b.pasos;
}
const media = (a) => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`\n  Por el arnés del gym (${N} semillas):`);
console.log(`    casa  ${media(casa).toFixed(1)}  ·  ${(pasosCasa / N).toFixed(1)} decisiones`);
console.log(`    suelo ${media(suelo).toFixed(1)}  ·  ${(pasosSuelo / N).toFixed(1)} decisiones`);
console.log(`    hueco: ${diHueco(huecoEmparejado(casa, suelo))}\n`);
