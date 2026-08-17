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
import { readFile, writeFile } from 'node:fs/promises';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { jugarEpisodio } = await impo('public/arcade/js/agentes/llm.js');
// El mismo censo que usa `tabla.mjs`, para medir sobre el conjunto que ella mide.
const { CATALOGO } = await impo('public/js/alisa-engine/src/gym/registro.js');
const ENTORNOS = Object.fromEntries(CATALOGO.map(e => [e.juego, e]));

/**
 * Los topes que se prueban, en orden. Se puede pasar otra escalera con `--topes` para
 * afinar: la de fábrica salta de 1200 a 4000 y eso deja sin mirar todo lo de en medio,
 * que en la clasificación son minutos de más por juego.
 */
const args = process.argv.slice(2);
const iT = args.indexOf('--topes');
const TOPES = iT >= 0 ? args[iT + 1].split(',').map(Number) : [120, 400, 1200, 4000];
/**
 * ⚠️ TRES SEMILLAS NO BASTAN, Y LO APRENDÍ PUBLICANDO.
 *
 * Con 3 semillas snake y fagocito daban «terminan con tope 400», y la clasificación
 * —que juega 120— los descartó igualmente por corte. No es que la sonda mintiera: es
 * que el conjunto que miraba no contenía las semillas malas. Se pasa `--semillas` para
 * medir con las mismas que va a jugar la tabla, que es lo único que vale.
 */
const iS = args.indexOf('--semillas');
const SEMILLAS = iS >= 0 ? Number(args[iS + 1]) : 3;
const consumidos = new Set([args[iT + 1], args[iS + 1]].filter(Boolean));
const pedidos = args.filter(a => !a.startsWith('-') && !consumidos.has(a));

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
        /**
         * ⚠️ EL MISMO UMBRAL QUE `tabla.mjs`, Y TIENE QUE SER EL MISMO.
         *
         * La tabla acepta un juego cuando termina el 95% de las partidas de referencia,
         * porque exigir el 100% borraba fagocito por DOS partidas de doscientas cuarenta
         * —dos bucles de la política tonta—. Si esta sonda exigiera el 100%, diría «no
         * termina nunca» de un juego que la tabla acepta, y entonces no habría tope
         * apuntado para él y la tabla lo cortaría. Dos umbrales distintos para la misma
         * pregunta es la clase de contradicción que no da ningún error.
         */
        const MINIMO = 0.95;
        fila.push(`${fin}/${total}`);
        if (fin / total >= MINIMO && terminaEn === null) terminaEn = tope;
        if (fin / total >= MINIMO) break;
    }
    while (fila.length < TOPES.length) fila.push('·');
    veredictos[juego] = terminaEn;
    console.log(`  ${juego.padEnd(12)}  ${fila.map(f => f.padStart(8)).join('')}    `
        + (terminaEn ? `terminan con tope ${terminaEn}`
                     : `ni con ${TOPES[TOPES.length - 1]} llega al 95%`));
}

const soloTope = Object.entries(veredictos).filter(([, t]) => t).map(([j]) => j);
const sinFinal = Object.entries(veredictos).filter(([, t]) => !t).map(([j]) => j);
console.log(`\n  sólo les faltaba tope (${soloTope.length}): ${soloTope.join(', ') || '—'}`);
console.log(`  sin desenlace, cortar es su final (${sinFinal.length}): ${sinFinal.join(', ') || '—'}`);

/**
 * ⚠️ SE ESCRIBE LO MEDIDO, O `tabla.mjs` NO PUEDE USARLO.
 *
 * Este número es el que hace que un juego entre o no en la clasificación, así que
 * dejarlo sólo en la terminal es lo mismo que no medirlo. Se guarda para que la tabla
 * lo lea, y con MARGEN: el tope que se publica es el medido por dos.
 *
 * El margen no es superstición, es lo que costó aprender dos veces en un rato. Con 3
 * semillas snake daba 400 y la tabla, que juega 120, lo descartó igual; medido con 30
 * daba 1200. El tope que necesita una partida depende de la semilla, y el máximo de una
 * muestra siempre se queda corto para la siguiente. Duplicar cuesta segundos de cómputo
 * en tres juegos; quedarse corto cuesta que el juego desaparezca del banco.
 *
 * ⚠️ Y SÓLO SE ESCRIBE SI SE MIDIERON TODOS LOS QUE HAY EN EL FICHERO. Guardar una
 * pasada parcial borraría los topes de los que no se midieron esta vez, y la tabla los
 * volvería a cortar sin que nadie tocara nada.
 */
const salida = new URL('./public/data/topes.json', import.meta.url);
const previos = await readFile(salida, 'utf-8').then(t => JSON.parse(t)).catch(() => ({ juegos: {} }));
const juntos = { ...previos.juegos };
for (const [j, t] of Object.entries(veredictos)) {
    if (t) juntos[j] = t * 2;
    // Un juego que no termina ni con el tope más alto probado NO se apunta: poner un
    // número aquí sería fingir que se sabe cuál es.
}
await writeFile(salida, JSON.stringify({
    fecha: new Date().toISOString().slice(0, 10),
    medido_con_semillas: SEMILLAS,
    nota: 'tope medido × 2. Lo que no está aquí usa el global de tabla.mjs.',
    juegos: juntos,
}, null, 1));
console.log(`  escrito public/data/topes.json (${Object.keys(juntos).length} juegos con tope propio)\n`);
