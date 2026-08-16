/**
 * ¿CUÁNTO DEL PANEL SOBRA SI LA JUGADA SE PUEDE HACER TOCANDO LA MESA?
 *
 * El panel muestra todas las `legal_moves` como botones. Pero muchas de esas jugadas
 * SON una pieza que está en la mesa —una carta, una casilla— y desde hoy se pueden
 * pulsar ahí. Un botón que repite algo que ya se puede tocar es ruido para la puerta
 * humana, mientras que para el LLM la lista sigue siendo la spec.
 *
 * Esto separa, juego por juego:
 *   · jugadas que NOMBRAN una pieza (llevan un id que aparece en el sustrato)
 *   · verbos sueltos —robar, pasar, tirar— que no están en ninguna parte de la mesa
 *
 * Los segundos tienen que quedarse en el panel sí o sí. Los primeros son los
 * candidatos a desaparecer de él sin perder ninguna jugada.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { JUEGOS, cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');
const { obtenerSustrato } = await impo('public/arcade/js/protohub/sustrato.js');

console.log('\n  juego         legales   nombran pieza   verbos sueltos   panel mínimo\n');
let totalLeg = 0, totalVerbos = 0;
for (const juego of JUEGOS) {
    let st, sus;
    try {
        const reglas = await cargarReglas(juego, {});
        const p = reglas.nuevaPartida({ semilla: 7, seed: 7 });
        st = reglas.estado(p, 0) ?? {};
        sus = obtenerSustrato(juego, reglas, p, st) ?? {};
    } catch { continue; }

    const legales = (st.legal_moves ?? []).filter(m => m !== 'nueva' && m !== 'reset');
    if (!legales.length) continue;

    /** Todo lo que la mesa tiene y se puede señalar: piezas, items de zona, casillas. */
    const señalables = new Set();
    for (const p of (sus.piezas ?? [])) { if (p.t !== undefined) señalables.add(String(p.t)); }
    for (const z of (sus.zonas ?? [])) {
        for (const it of (z.items ?? [])) {
            const id = it && typeof it === 'object' ? (it.id ?? it.carta) : it;
            if (id !== undefined) señalables.add(String(id));
        }
    }
    // Y las casillas: una jugada tipo `d2d4` o `12` señala un sitio del tablero.
    const hayRejilla = !!sus.rejilla;

    const nombran = legales.filter(m => {
        const cola = String(m).split(':').pop();
        if (señalables.has(cola)) return true;
        // coordenadas de tablero (`d2d4`, `e4`) o índice de casilla (`12`)
        return hayRejilla && (/^[a-z]\d[a-z]?\d?$/i.test(cola) || /^\d+$/.test(cola));
    });
    const verbos = legales.filter(m => !nombran.includes(m));

    totalLeg += legales.length; totalVerbos += verbos.length;
    const pct = Math.round(100 * verbos.length / legales.length);
    console.log(`  ${juego.padEnd(12)} ${String(legales.length).padStart(6)}`
        + `   ${String(nombran.length).padStart(11)}`
        + `   ${String(verbos.length).padStart(12)}`
        + `   ${String(pct).padStart(4)}%`
        + (verbos.length && verbos.length <= 4 ? `   ${verbos.slice(0, 4).join(', ')}` : ''));
}
console.log(`\n  en total: ${totalLeg} jugadas legales · ${totalVerbos} son verbos que NO están en la mesa`);
console.log(`  el panel podría quedarse en el ${Math.round(100 * totalVerbos / totalLeg)}% de sus botones\n`);
