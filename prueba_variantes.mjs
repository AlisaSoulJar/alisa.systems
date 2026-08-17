/**
 * ¿Se pueden variar las normas con variables, sin romper la verificación?
 *
 * Lo que hay que demostrar son TRES cosas, y la tercera es la que importa:
 *   1. cada combinación de normas juega distinto
 *   2. una partida jugada con unas normas se vuelve a jugar igual con ESAS normas
 *   3. y NO se vuelve a jugar con otras — si esto fallara, el verificador estaría
 *      dando por buenas partidas que nunca ocurrieron
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');
const { verificar } = await impo('public/arcade/js/protohub/Verificador.js');

const COMBINACIONES = {
    'anglosajona  ': { damaVuela: false, peonComeAtras: false },
    'española     ': { damaVuela: true,  peonComeAtras: false },
    'internacional': { damaVuela: true,  peonComeAtras: true  },
    'peón feroz   ': { damaVuela: false, peonComeAtras: true  },
};

// Un rival tonto pero determinista: siempre la misma jugada de la lista.
function jugarPartida(reglas, tope = 120) {
    const p = reglas.nuevaPartida({ semilla: 7, seed: 7 });
    const jugadas = [];
    for (let i = 0; i < tope; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over || !st.legal_moves.length) break;
        const j = st.legal_moves[i % st.legal_moves.length];
        if (!reglas.mover(p, j)) break;
        jugadas.push(j);
    }
    return { p, jugadas };
}

console.log('\n¿Se pueden variar las normas con variables?\n');
const partidas = {};
for (const [nombre, normas] of Object.entries(COMBINACIONES)) {
    const reglas = await cargarReglas('damas', { normas });
    const { p, jugadas } = jugarPartida(reglas);
    const st = reglas.estado(p);
    partidas[nombre] = { normas, jugadas };
    // La jugada más larga dice si la dama vuela: "c3g7" son cuatro caracteres por
    // casilla en cadena; un vuelo simple es un salto grande en una sola.
    const larga = jugadas.reduce((a, b) => (b.length > a.length ? b : a), '');
    console.log(`  ${nombre} · ${String(jugadas.length).padStart(3)} jugadas`
        + ` · la más larga: ${larga.padEnd(12)}`
        + ` · fin: ${st.result ?? 'sin terminar'}`
        + ` · normas publicadas en el estado: ${JSON.stringify(st.normas)}`);
}

console.log('\n  ¿La misma lista de jugadas vale con OTRAS normas?\n');
let cruzadosMal = 0;
for (const [nombreA, a] of Object.entries(partidas)) {
    const fila = [];
    for (const [nombreB, b] of Object.entries(partidas)) {
        const reglas = await cargarReglas('damas', { normas: b.normas });
        // El recibo se lleva las normas con las que se jugó, que es justo lo que
        // faltaba: sin ellas la lista de jugadas es ambigua.
        const recibo = { juego: 'damas', semilla: 7, jugadas: a.jugadas, normas: a.normas };
        const v = verificar(reglas, recibo);
        const propio = nombreA === nombreB;
        if (!propio && v.valida) cruzadosMal++;
        fila.push(`${nombreB.trim()}:${v.valida ? 'sí' : 'no'}`);
    }
    console.log(`    jugado con ${nombreA} -> ${fila.join('  ')}`);
}
console.log(`\n  ${cruzadosMal === 0
    ? '✓ ninguna partida se valida con normas que no son las suyas'
    : `✗ ${cruzadosMal} partidas se validan con normas ajenas — el recibo NO basta`}`);

/**
 * ⚠️ Y COMER TIENE QUE QUITAR UNA FICHA. ESTO FALTABA, Y AQUÍ ESTÁ POR QUÉ DUELE.
 *
 * Lo de arriba comprueba dos cosas ciertas —que cada variante juega distinto y que una
 * partida se repite igual con sus normas— y las dos las cumplía un juego ROTO. Con
 * `damaVuela`, la captura de la dama no retiraba a la víctima: `mover` sólo quitaba la
 * ficha del medio cuando el salto medía dos casillas, y un vuelo de a1 a e5 mide cuatro.
 *
 * O sea que en la variante española y en la internacional se capturaba SIN COMER. Y no
 * lo cazó nada, porque el fallo es consistente consigo mismo: la partida es legal, se
 * repite igual, y cada variante sigue jugando distinto. Lo que faltaba no era otra
 * comprobación de reproducibilidad — era una invariante sobre lo que las reglas DICEN
 * que hacen. La misma idea que el `cartas_intactas` de la Guerra.
 *
 * Se comprueba lo mínimo indiscutible: el número de fichas nunca sube, y cuando el
 * estado dice `captura_obligada` y se juega esa captura, BAJA.
 */
console.log('\n  ¿Comer quita una ficha? (la invariante que faltaba)\n');
let malas = 0;
for (const [nombre, normas] of Object.entries(COMBINACIONES)) {
    const reglas = await cargarReglas('damas', { normas });
    const p = reglas.nuevaPartida({ semilla: 7, seed: 7 });
    let capturas = 0, comidas = 0, subidas = 0;
    for (let i = 0; i < 200; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over || !st.legal_moves.length) break;
        const antes = st.pieces.white + st.pieces.black;
        const obligada = st.captura_obligada;
        if (!reglas.mover(p, st.legal_moves[i % st.legal_moves.length])) break;
        const desp = reglas.estado(p);
        const ahora = desp.pieces.white + desp.pieces.black;
        if (ahora > antes) subidas++;
        if (obligada) { capturas++; if (ahora < antes) comidas++; }
    }
    const bien = capturas > 0 && comidas === capturas && subidas === 0;
    if (!bien) malas++;
    console.log(`  ${bien ? '✓' : '✗'} ${nombre} · ${comidas}/${capturas} capturas comieron`
        + (subidas ? ` · ⚠ ${subidas} veces APARECIERON fichas` : '')
        + (capturas === 0 ? ' · ninguna captura en la partida: no dice nada' : ''));
}
if (malas) {
    console.log(`\n  ✗ ${malas} variante(s) capturan sin comer. La partida es legal, se`);
    console.log('    repite igual y juega distinto — el fallo es consistente consigo mismo.');
}

/**
 * ⚠️ Y EL CASO CONCRETO, PUESTO A MANO. LO DE ARRIBA NO BASTABA.
 *
 * Escribí la invariante de más arriba, volví a meter el fallo a propósito… y siguió en
 * verde: `11/11 capturas comieron`. Y era verdad — en una partida desde la posición
 * inicial, con un rival tonto y doscientas jugadas, TODAS las capturas que salen son
 * saltos de dos casillas, que es justo el caso que el fallo sí trataba bien. La dama
 * aparece tarde y no llega a hacer un vuelo largo.
 *
 * O sea que la comprobación medía lo correcto sobre un conjunto que no contenía el
 * caso. Es el mismo error de denominador de siempre, ahora dentro de una prueba escrita
 * para cazar un fallo que acababa de ver con mis ojos.
 *
 * Un vuelo largo no se espera de la partida: se construye. Dama blanca en a1, peón
 * negro en d4, y el resto del tablero vacío — un salto de CUATRO casillas.
 */
console.log('\n  El vuelo largo, con la posición puesta a mano\n');
let vueloMal = 0;
{
    const reglas = await cargarReglas('damas', { normas: { damaVuela: true, peonComeAtras: false } });
    const p = reglas.nuevaPartida({ semilla: 7, seed: 7 });
    p.tablero = Array.from({ length: 8 }, () => new Array(8).fill(null));
    p.tablero[7][0] = 'W';        // dama blanca en a1
    p.tablero[4][3] = 'b';        // peón negro en d4
    p.blancasJuegan = true;
    const movs = reglas.estado(p).legal_moves;
    const largo = movs.find(m => m === 'a1e5');
    if (!largo) {
        vueloMal++;
        console.log(`  ✗ la dama voladora no ofrece 'a1e5' saltando sobre d4: ${movs.join(', ')}`);
    } else {
        reglas.mover(p, largo);
        const comida = !p.tablero[4][3];
        if (!comida) vueloMal++;
        console.log(`  ${comida ? '✓' : '✗'} a1e5 sobre d4 (salto de cuatro): `
            + (comida ? 'la víctima desaparece' : 'LA VÍCTIMA SIGUE EN EL TABLERO — se captura sin comer'));
    }
}
process.exit(cruzadosMal || malas || vueloMal ? 1 : 0);
