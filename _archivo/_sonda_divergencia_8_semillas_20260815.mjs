/**
 * ¿EN QUÉ PASO DIVERGEN `marcador` Y `avance`, Y AGUANTA ESO OTRAS SEMILLAS?
 *
 * `prueba_sustrato` acaba de ganar topes por juego (parchís 520, canadiense 130, oca
 * 110) con margen de 9 a 12 pasos sobre lo medido CON UNA SOLA SEMILLA. Si con otra
 * semilla la carrera tarda más en dar su primer premio, la prueba suspende sin que
 * nada esté roto — y un fallo intermitente es el peor de todos.
 */
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';

const TOPES = { parchis: 520, canadiense: 130, oca: 110 };

for (const e of CATALOGO.filter(x => x.familia === 'protohub' && TOPES[x.juego])) {
    const pasos = [];
    for (const semilla of [1, 2, 3, 6, 7, 11, 23, 42]) {
        const Env = await e.cargar();
        const env = new Env();
        env.reset(semilla);
        let cuando = null, i = 0;
        // ⚠️ El estado se mira TAMBIÉN después del último paso: el bono de fin de
        // partida es justo lo que separa `marcador` de `avance`, y salir del bucle
        // al ver `done` sin volver a mirar se lo pierde entero.
        const difieren = () => {
            const st = env._estado();
            return Array.isArray(st.marcador) && Array.isArray(st.avance)
                && JSON.stringify(st.marcador) !== JSON.stringify(st.avance);
        };
        for (; i < 3000; i++) {
            if (difieren()) { cuando = i; break; }
            const v = env.affordances();
            if (!v.length) break;
            if (env.step(v[0].verb).done) { if (difieren()) cuando = i + 1; break; }
        }
        pasos.push(cuando);
    }
    const validos = pasos.filter(p => p !== null);
    const peor = validos.length ? Math.max(...validos) : null;
    const tope = TOPES[e.juego];
    console.log(`  ${e.juego.padEnd(11)} divergen en: ${JSON.stringify(pasos).padEnd(46)}`
        + ` peor ${String(peor).padStart(5)}  tope ${String(tope).padStart(4)}`
        + (peor === null ? '  ← NUNCA DIVERGEN en alguna'
           : peor >= tope ? `  ← ¡EL TOPE SE QUEDA CORTO!` : `  margen ${tope - peor}`));
}
