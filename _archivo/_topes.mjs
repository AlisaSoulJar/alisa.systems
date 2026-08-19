/**
 * ¿POR QUÉ NO TERMINAN? SON DOS CAUSAS DISTINTAS EN EL MISMO SACO.
 *
 * La clasificación descarta un juego cuando las políticas de referencia no llegan al
 * final dentro del tope de decisiones, y el motivo escrito en `tabla.mjs` es bueno:
 *
 *     «Una partida cortada por el tope no es un mal resultado, es un resultado que no
 *      existe: falta el desenlace, que es donde se reparte casi todo el marcador.»
 *
 * Eso es exactamente cierto en el ajedrez —si nadie da mate, no hay resultado— y
 * exactamente falso en snake, donde NO HAY DESENLACE que falte: la puntuación se
 * acumula mientras juegas y cortar es su final normal. Es la distinción que Gymnasium
 * hace con dos palabras distintas, `terminated` y `truncated`, y que aquí va junta.
 *
 * ⚠️ Y LA LISTA NO SE ESCRIBE A MANO: SE MIDE.
 *
 * Escribir «éstos cuatro son de supervivencia» sería la enésima lista paralela que se
 * separa del código. Se juega cada juego con topes crecientes y se mira si la política
 * de referencia llega a terminar alguna vez:
 *
 *     termina con más sitio  →  sólo le faltaba tope. Se sube y entra con su desenlace.
 *     nunca termina          →  no tiene desenlace. Cortar ES su final.
 *
 * Los dos casos se arreglan distinto, y confundirlos deja once juegos fuera del banco
 * por comportarse como deben.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { jugarEpisodio } = await impo('public/arcade/js/agentes/llm.js');
// El mismo censo que usa `tabla.mjs`, para medir sobre el conjunto que ella mide.
const { CATALOGO } = await impo('public/js/alisa-engine/src/gym/registro.js');
const ENTORNOS = Object.fromEntries(CATALOGO.map(e => [e.juego, e]));

const TOPES = [120, 400, 1200, 4000];
const SEMILLAS = 3;
const pedidos = process.argv.slice(2).filter(a => !a.startsWith('-'));

/**
 * ⚠️ SE MIDEN LAS DOS REFERENCIAS, Y LA SEGUNDA ES LA QUE IMPORTA.
 *
 * Empecé midiendo sólo la política tonta, pensando que si la tonta termina cualquiera
 * termina. Es al revés, y snake lo cantó: la tonta se mata en veinte pasos y termina de
 * sobra a las 120, mientras la de la casa —que juega bien— SOBREVIVE y se la come el
 * tope. La clasificación descarta cuando CUALQUIERA de las dos se corta, así que el
 * juego cae por culpa de su buen jugador.
 *
 * Dicho así se ve la forma del problema: en un juego de supervivencia, jugar bien es
 * durar más, y durar más es acercarse al tope. La regla actual castiga al género
 * entero por comportarse como debe.
 */
const { POLITICAS } = await impo('public/arcade/js/agentes/politicas.js');
const REFERENCIAS = [
    { nombre: 'tonta', politica: POLITICAS.primera() },
    { nombre: 'casa',  politica: POLITICAS.casa() },
];
const proveedorMudo = async () => ({ texto: '1' });

const lista = ENTORNOS ? Object.keys(ENTORNOS) : [];
const juegos = pedidos.length ? pedidos : lista;
if (!juegos.length) {
    console.log('\n  no encuentro la lista de entornos; pásame los juegos a mano\n');
    process.exit(2);
}

console.log(`\n  ${juegos.length} juegos · ${SEMILLAS} semillas · topes ${TOPES.join(' ')}\n`);
console.log('  juego         ' + TOPES.map(t => String(t).padStart(6)).join('') + '    veredicto\n');

const veredictos = {};
for (const juego of juegos) {
    const entrada = ENTORNOS[juego];
    if (!entrada) { console.log(`  ${juego.padEnd(12)}  (no está en el censo)`); continue; }
    const Clase = await entrada.cargar();
    const fila = [];
    let terminaEn = null;
    for (const tope of TOPES) {
        // Las dos referencias tienen que terminar, porque es lo que exige la
        // clasificación: se descarta si cualquiera de las dos se corta.
        let fin = 0, total = 0;
        for (const ref of REFERENCIAS) {
            for (let s = 1; s <= SEMILLAS; s++) {
                total++;
                try {
                    const r = await jugarEpisodio(Clase, proveedorMudo,
                        { semilla: s, tope, politica: ref.politica });
                    if (r.metricas?.terminada) fin++;
                } catch { /* un juego que revienta se cuenta como 0 y se ve en la fila */ }
            }
        }
        fila.push(`${fin}/${total}`);
        if (fin === total && terminaEn === null) terminaEn = tope;
        if (fin === total) break;
    }
    while (fila.length < TOPES.length) fila.push('·');
    veredictos[juego] = terminaEn;
    console.log(`  ${juego.padEnd(12)}  ${fila.map(f => f.padStart(7)).join('')}    `
        + (terminaEn ? `las dos referencias terminan con tope ${terminaEn}`
                     : 'ni con 4000 — cortar es su final'));
}

const soloTope = Object.entries(veredictos).filter(([, t]) => t).map(([j]) => j);
const sinFinal = Object.entries(veredictos).filter(([, t]) => !t).map(([j]) => j);
console.log(`\n  sólo les faltaba tope (${soloTope.length}): ${soloTope.join(', ') || '—'}`);
console.log(`  sin desenlace, cortar es su final (${sinFinal.length}): ${sinFinal.join(', ') || '—'}\n`);
