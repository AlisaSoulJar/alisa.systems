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
