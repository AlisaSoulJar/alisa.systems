/**
 * SI UNA PIEZA TIENE NOMBRE, TIENE QUE SER EL SUYO Y NO CAMBIARLO
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_identidad.mjs
 *
 * El contrato del sustrato dice que una pieza PUEDE llevar `id`, y que si lo
 * lleva tiene que cumplir dos cosas: ser único dentro de la partida y ser estable
 * entre turnos. Las dos se rompen en silencio.
 *
 *   · si se repite, dos piezas son una sola para quien las siga — el pintor
 *     animará una y dejará la otra clavada, y nadie verá un error;
 *   · si cambia de un turno a otro, la pieza deja de ser la misma: el pintor
 *     creerá que una desapareció y nació otra, así que teletransportará en vez de
 *     mover. Que es exactamente el aspecto que ya tiene hoy sin `id`, o sea que
 *     el fallo se disfraza de «todavía no está hecho».
 *
 * ⚠️ Y VIGILA TAMBIÉN LOS NOMBRES DE LOS CAMPOS, QUE ES DE DONDE VINO EL DAÑO.
 *
 * Alisapolis publicaba `{id, x, y, dueno, tipo}` cuando el contrato dice `de` y
 * `t`. El pintor leía `undefined` en los dos y sus cuatro peones salían como
 * discos grises idénticos — con un aviso de betatester diciendo «parece que juego
 * yo solo» que se leía como un problema de turnos. Un campo mal llamado no da
 * error: dibuja otra cosa.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { cargarReglas, JUEGOS } = await impo('public/arcade/js/protohub/rules/index.js');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

/** Los nombres del contrato. Cualquier otro campo en una pieza es un dialecto. */
const DEL_CONTRATO = new Set(['x', 'y', 't', 'de', 'id', 'vida', 'vida_max']);
/**
 * ⚠️ Y ESTOS SON LOS PROHIBIDOS, POR PARECERSE DEMASIADO.
 * No se prohíbe todo lo que no esté en el contrato —un juego puede publicar algo
 * suyo con motivo, como `vida` en defensa— sino los que DUPLICAN un campo que ya
 * existe. Ésos no añaden nada y sí rompen el pintor.
 */
const DIALECTO = { dueno: 'de', dueño: 'de', owner: 'de', tipo: 't', type: 't', kind: 't' };

console.log('\nSi una pieza tiene nombre, tiene que ser el suyo y no cambiarlo\n');
const fallos = [];
let conId = 0, revisados = 0, camposRaros = new Map();

for (const juego of JUEGOS) {
    let R;
    try { R = await cargarReglas(juego, {}); } catch { continue; }
    if (typeof R.sustrato !== 'function') continue;
    revisados++;

    const p = R.nuevaPartida({ semilla: 11 });
    const vistos = new Map();        // id → última posición conocida
    let usaId = false;

    for (let turno = 0; turno < 60; turno++) {
        let s;
        try { s = R.sustrato(p, 0); } catch { break; }
        const piezas = s?.piezas ?? [];

        // ── los nombres de los campos ──
        for (const z of piezas) {
            for (const k of Object.keys(z)) {
                if (DIALECTO[k]) {
                    const clave = `${juego}: «${k}» debería ser «${DIALECTO[k]}»`;
                    camposRaros.set(clave, (camposRaros.get(clave) ?? 0) + 1);
                } else if (!DEL_CONTRATO.has(k)) {
                    // Campo propio, no duplicado: se cuenta pero no se suspende.
                }
            }
        }

        // ── único dentro del turno ──
        const ids = piezas.map((z) => z.id).filter((x) => x !== undefined);
        if (ids.length) {
            usaId = true;
            if (new Set(ids).size !== ids.length) {
                const rep = ids.filter((x, i) => ids.indexOf(x) !== i)[0];
                fallos.push(`${juego}: dos piezas con el mismo id («${rep}») en el turno ${turno}`);
                break;
            }
            for (const z of piezas) if (z.id !== undefined) vistos.set(z.id, z);
        }

        const st = R.estado(p);
        if (st.is_game_over) break;
        const leg = (st.legal_moves ?? []).filter((x) => x !== 'nueva' && x !== 'reset');
        if (!leg.length || !R.mover(p, R.sugerencia?.(p) ?? leg[0])) break;
    }
    if (usaId) conId++;
}

if (camposRaros.size) {
    for (const [q, n] of camposRaros) fallos.push(`${q} (${n} veces)`);
} else {
    console.log(`  ${verde('✓')} ningún juego publica un campo que duplique a otro del contrato`
        + gris(` (${revisados} con sustrato)`));
}

if (!fallos.length) {
    console.log(`  ${verde('✓')} los id que hay son únicos dentro de cada turno`
        + gris(` (${conId} juego(s) usan id)`));
}

/**
 * ── ⚠️ LA QUE PROTEGE DE VERDAD: ESTABLE ENTRE TURNOS ──
 *
 * Un `id` que cambia cada turno pasa las dos comprobaciones de arriba —es único
 * en cada foto— y no sirve para nada. Se mide en alisapolis, que es quien los
 * usa: sus peones dan vueltas al tablero y tienen que seguir llamándose igual
 * después de moverse.
 */
{
    const R = await cargarReglas('alisapolis', {});
    const p = R.nuevaPartida({ semilla: 11 });
    const primeros = new Set((R.sustrato(p, 0)?.piezas ?? []).map((z) => z.id));
    let movidas = 0;
    for (let i = 0; i < 40; i++) {
        const st = R.estado(p);
        if (st.is_game_over) break;
        const leg = (st.legal_moves ?? []).filter((x) => x !== 'nueva' && x !== 'reset');
        if (!leg.length || !R.mover(p, R.sugerencia?.(p) ?? leg[0])) break;
        movidas++;
    }
    const finales = new Set((R.sustrato(p, 0)?.piezas ?? []).map((z) => z.id));
    // Puede haber MENOS al final —alguien quiebra y sale del tablero— pero no
    // puede aparecer un nombre que no estaba: eso sería renombrar.
    const nuevos = [...finales].filter((x) => !primeros.has(x));
    if (!primeros.size) fallos.push('alisapolis no publica id: la comprobación de estabilidad no mira nada');
    else if (nuevos.length) fallos.push(`alisapolis renombró piezas tras ${movidas} jugadas: aparecieron ${nuevos.join(', ')}`);
    else console.log(`  ${verde('✓')} los id sobreviven al movimiento`
        + gris(` (alisapolis, ${movidas} jugadas, ${primeros.size} peones y ningún nombre nuevo)`));
}

if (fallos.length) {
    console.log(rojo(`\n✗ ${fallos.length} fallo(s):`));
    fallos.forEach((f) => console.log(rojo(`    · ${f}`)));
    process.exit(1);
}
console.log(verde('\n✓ las piezas con nombre lo tienen propio y no lo cambian\n'));
