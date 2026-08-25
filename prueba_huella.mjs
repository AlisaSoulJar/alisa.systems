/**
 * ¿SIGUE SIENDO EL MISMO JUEGO QUE CUANDO SE PUBLICÓ SU NOTA?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_huella.mjs           comprueba
 *     node --import ./resolver_three.mjs prueba_huella.mjs --sellar  re-declara
 *
 * Une dos facetas del proyecto que tiraban en direcciones opuestas:
 *
 *   GIMNASIO        quiere juegos QUIETOS: una nota de hace un mes tiene que
 *                   poder compararse con una de hoy.
 *   ENTRADA HUMANA  quiere juegos que MEJOREN: uno que no se toca se queda flojo.
 *
 * La unificación no es elegir: es que **el cambio sea visible**. Cambia el juego
 * cuando haga falta — pero entonces deja de ser el mismo y tiene que decirlo,
 * `-v0` → `-v1`, como hace Gym desde siempre. Así las notas viejas siguen siendo
 * válidas CONTRA SU VERSIÓN y nadie las compara sin querer con las nuevas.
 *
 * ⚠️ ESTO NO ES TEÓRICO: LOS TRES CAMBIARON ESTA SEMANA Y NINGUNO LO DIJO.
 *
 *     RaccoonCity-v0    12 objetivos → 10 · combustible 30 → 38 → 30
 *     RaccoonPlanet-v0  mando de órbita, coste de escaneo, combustible 26 → 11
 *     CabinetEscape-v0  otro generador, y con él todos sus muebles
 *
 * Cualquier nota publicada antes es hoy incomparable con una de después, y no
 * hay forma de saberlo mirando. Es la mentira en verde de siempre, en el eje del
 * tiempo en vez del de las puertas.
 *
 * ⚠️ Y `--sellar` NO ES UN ATAJO PARA CALLAR ESTO.
 *
 * Sellar dice «sí, este juego ha cambiado y lo asumo». Si se sella sin subir la
 * versión, la prueba lo sigue diciendo — porque el problema no es que la huella
 * cambie: es que cambie **con el mismo nombre**.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';
import { huellaDeMundo } from './public/js/alisa-engine/src/gym/HuellaDeMundo.js';

const ARCHIVO = 'resultados/huellas.json';
const sellar = process.argv.includes('--sellar');

let declaradas = {};
if (existsSync(ARCHIVO)) declaradas = JSON.parse(readFileSync(ARCHIVO, 'utf8'));

let fallos = 0, nuevos = 0, iguales = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };
const ahora = {};

console.log('\n¿Sigue siendo el mismo juego que cuando se publicó su nota?\n');

for (const e of CATALOGO) {
    if (e.familia !== 'propio') continue;
    let Clase;
    try { Clase = await e.cargar(); } catch (err) {
        mal(`${e.id}: no carga (${String(err.message).slice(0, 60)})`); continue;
    }
    const { huella, detalle } = huellaDeMundo(Clase);
    ahora[e.id] = { huella, sellada: new Date().toISOString().slice(0, 10) };

    const previa = declaradas[e.id];
    if (!previa) {
        nuevos++;
        console.log(`  + ${e.id.padEnd(26)} ${huella}   (primera vez que se sella)`);
        continue;
    }
    if (previa.huella === huella) {
        iguales++;
        console.log(`  ✓ ${e.id.padEnd(26)} ${huella}   sin cambios desde ${previa.sellada}`);
    } else {
        /**
         * El aviso dice las dos salidas posibles, y en este orden: primero
         * revertir. Subir la versión es legítimo pero rompe la comparación con
         * todo lo anterior, así que no debe ser el reflejo automático.
         */
        console.log(`  ⚠ ${e.id.padEnd(26)} ${previa.huella} → ${huella}`);
        console.log(`      el juego se comporta distinto desde el ${previa.sellada}.`);
        console.log(`      Si NO querías cambiarlo: revierte.`);
        console.log(`      Si sí: sube la versión del id (…-v0 → …-v1) y vuelve a sellar,`);
        console.log(`      porque las notas de antes ya no se pueden comparar con las de ahora.`);
        for (const d of detalle.slice(0, 2)) {
            console.log(`         semilla ${d.semilla}: ${d.pasos} pasos, `
                      + `recompensa ${d.recompensa}, nota ${d.nota}`);
        }
        fallos++;
    }
}

if (sellar) {
    mkdirSync(path.dirname(ARCHIVO), { recursive: true });
    writeFileSync(ARCHIVO, JSON.stringify(ahora, null, 2) + '\n');
    console.log(`\n  ✎ selladas ${Object.keys(ahora).length} huellas en ${ARCHIVO}`);
    console.log('    ⚠️ sellar NO arregla nada: si cambiaste un juego sin subirle la versión,');
    console.log('       las notas viejas siguen siendo incomparables y nadie lo sabrá.');
    process.exit(0);
}

/**
 * ⚠️ Y DOS JUEGOS DISTINTOS NO PUEDEN TENER LA MISMA HUELLA.
 *
 * `huella.js` del arcade lleva esto escrito en su cabecera: al añadir los juegos
 * de baza, **hearts y spades salieron idénticos** porque comparten baraja,
 * reparto y semilla, y la huella sólo miraba el estado inicial.
 *
 * Volví a caer en lo mismo la primera vez que corrí esto: `RaccoonSpace-v0` y
 * `RaccoonCity-v0` dieron `92650e99` los dos. Son juegos distintos —otro tamaño,
 * otro vehículo, otro combustible— pero la política fija se queda sin
 * combustible en ambos y el -100 de la muerte domina el resultado.
 *
 * Una huella que confunde dos juegos no protege ninguno: el día que uno cambie y
 * se vuelva igual al otro, esto diría que todo va bien.
 */
{
    const porHuella = new Map();
    for (const [id, v] of Object.entries(ahora)) {
        if (!porHuella.has(v.huella)) porHuella.set(v.huella, []);
        porHuella.get(v.huella).push(id);
    }
    for (const [h, ids] of porHuella) {
        if (ids.length > 1) {
            mal(`${ids.length} juegos comparten la huella ${h}: ${ids.join(', ')}. `
              + 'Una huella que no los distingue no puede protegerlos.');
        }
    }
}

console.log(`\n  ${iguales} sin cambios · ${nuevos} nuevos · ${fallos} cambiados sin decirlo`);
if (fallos) {
    console.log('\n  ✗ hay juegos que se comportan distinto con el mismo nombre.\n');
    process.exit(1);
}
console.log('  ✓ cada juego se comporta como cuando se selló su nombre\n');
