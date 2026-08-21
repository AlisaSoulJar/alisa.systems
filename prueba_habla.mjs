/**
 * HABLAR ES UNA JUGADA, Y TIENE QUE SEGUIR SIENDO AUDITABLE
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_habla.mjs
 *
 * Hasta ahora toda jugada tenía que estar en `legal_moves`, y eso deja fuera lo
 * único que hace interesante un juego de deducción social: una frase. La salida
 * fue que el juego DECLARE la forma —`legal_patterns`— y que el verificador
 * acepte lo que encaje en ella.
 *
 * ⚠️ ESO ES UNA PUERTA EN LA PIEZA QUE SOSTIENE TODO EL PROYECTO.
 *
 * El verificador es lo que convierte una partida en algo demostrable. Un patrón
 * es, por construcción, un cheque en blanco del tamaño que el juego quiera: con
 * `.*` dejaría de auditar nada mientras sigue diciendo «válida». Así que esto
 * vigila las cuatro cosas que pueden salir mal, y son distintas entre sí:
 *
 *   1. que una partida hablada VERIFIQUE (si no, el habla no sirve de nada)
 *   2. que el recibo DIGA cuántas jugadas pasaron por forma y no por lista
 *   3. que la forma siga acotando: una frase de 400 caracteres no cuela
 *   4. que la puerta no se abra de más: una jugada inventada sigue siendo ilegal
 *
 * La cuarta es la que de verdad protege: es la que suspende si alguien amplía un
 * patrón «para que quepa todo».
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');
const { verificar } = await impo('public/arcade/js/protohub/Verificador.js');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const SILLAS = ['a', 'b', 'c', 'd'];
const NORMAS = { rondasDeDebate: 2, hablaLibre: true };

/** Juega una partida de nave metiendo frases de verdad en cuanto hay debate. */
async function partidaHablada(reglas) {
    const p = reglas.nuevaPartida({ semilla: 7 });
    const jugadas = [];
    let frases = 0;
    for (let i = 0; i < 400; i++) {
        const st = reglas.estado(p, SILLAS.indexOf(p.turno));
        if (st.is_game_over) break;
        const j = (st.fase_junta === 'debate' && frases < 4)
            ? (frases++, `decir:creo que fue ${SILLAS[(i + 1) % 4]}, estaba solo en el pasillo`)
            : (reglas.sugerencia(p) || st.legal_moves.filter(x => x !== 'nueva')[0]);
        if (!j || !reglas.mover(p, j)) break;
        jugadas.push(j);
    }
    return { jugadas, frases };
}

console.log('\nHablar es una jugada, y sigue siendo auditable\n');
const fallos = [];
const reglas = await cargarReglas('nave', { normas: NORMAS });
const { jugadas, frases } = await partidaHablada(reglas);

if (!frases) fallos.push('la partida no llegó a ninguna junta: no hay nada que comprobar');

// 1 y 2 — verifica, y dice cuánto se auditó por forma.
const v = verificar(reglas, { juego: 'nave', semilla: 7, jugadas, normas: NORMAS });
if (!v.valida) fallos.push(`una partida hablada no verifica: ${v.motivo}`);
else if (v.porPatron !== frases) {
    fallos.push(`el recibo dice ${v.porPatron} jugadas por forma y se dijeron ${frases}`);
} else console.log(`  ${verde('✓')} verifica una partida con ${frases} frases, y lo declara`
                 + gris(` (por patrón: ${v.porPatron} de ${jugadas.length})`));

// 3 — la forma acota. Una frase que se pasa de largo no es una jugada.
const larga = jugadas.map(x => x.startsWith('decir:') ? `decir:${'x'.repeat(400)}` : x);
const w = verificar(reglas, { juego: 'nave', semilla: 7, jugadas: larga, normas: NORMAS });
if (w.valida) fallos.push('una frase de 400 caracteres pasó el audito');
else console.log(`  ${verde('✓')} una frase de 400 caracteres no cuela`);

/**
 * 4 — ⚠️ LA QUE PROTEGE DE VERDAD.
 *
 * Se cuela una jugada inventada donde iba una frase. No empieza por `decir:`, así
 * que ningún patrón honrado la acepta. Si esto pasara, querría decir que algún
 * patrón se ha ampliado hasta tragárselo todo — y entonces «verificada» dejaría
 * de significar nada, en silencio y para todos los juegos.
 */
const inventada = jugadas.map(x => x.startsWith('decir:') ? 'saltar:luna' : x);
const z = verificar(reglas, { juego: 'nave', semilla: 7, jugadas: inventada, normas: NORMAS });
if (z.valida) fallos.push('una jugada inventada («saltar:luna») pasó el audito: hay un patrón demasiado ancho');
else console.log(`  ${verde('✓')} una jugada inventada sigue siendo ilegal`);

// 5 — y hablar sin la norma tampoco vale: las dos divisiones son dos juegos.
const sinHabla = { rondasDeDebate: 2, hablaLibre: false };
const reglasSin = await cargarReglas('nave', { normas: sinHabla });
const y = verificar(reglasSin, { juego: 'nave', semilla: 7, jugadas, normas: sinHabla });
if (y.valida) fallos.push('se pudo hablar en la división de protocolo, donde sólo hay menú');
else console.log(`  ${verde('✓')} sin la norma de habla libre, una frase no es una jugada`);

if (fallos.length) {
    console.log(rojo(`\n✗ ${fallos.length} fallo(s):`));
    fallos.forEach(f => console.log(rojo(`    · ${f}`)));
    process.exit(1);
}
console.log(verde('\n✓ el habla libre viaja en el recibo y sigue auditada\n'));
