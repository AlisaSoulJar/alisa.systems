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
import { CATALOGO } from './public/js/alisa-engine/src/gym/registry.js';
import { worldFingerprint } from './public/js/alisa-engine/src/gym/WorldFingerprint.js';

const ARCHIVO = 'resultados/huellas.json';
const sellar = process.argv.includes('--sellar');

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL CONTRATO, ESCRITO EN EL PROPIO FICHERO DE HUELLAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ POR QUÉ LOS TRES QUE CAMBIARON ESTA SEMANA SIGUEN SIENDO `-v0`.
 *
 * El estándar de la industria —Gym, Gymnasium, ALE— es que **el id es el
 * contrato**: dos notas sólo se comparan dentro del mismo id, y se sube versión
 * ante cualquier cambio de comportamiento. El ejemplo canónico es `CartPole-v0`
 * → `v1`, que se diferencian SÓLO en el límite de pasos (200 → 500) y el umbral
 * de recompensa. Un umbral bastó.
 *
 * Lo que cambiamos —el vehículo de dos etapas, el combustible, el número de
 * objetivos, el generador de los muebles— está muy por encima de eso.
 *
 * Pero el estándar tiene un matiz que aquí aplica: **no se sube versión durante
 * el desarrollo de un entorno, sólo desde que se publica**. Nadie bumpea un env
 * que lleva tres días vivo y del que no hay resultados.
 *
 * Medido el 25-08: CERO notas publicadas referencian a `RaccoonCity-v0`,
 * `RaccoonPlanet-v0` ni `CabinetEscape-v0` — la tabla publicada son los 32
 * juegos de arcade. Y los tres nacieron o se calibraron esta misma semana.
 *
 * Así que se SELLAN aquí, y desde este fichero el `-v0` pasa a ser un contrato:
 * a partir de ahora, cambiar el comportamiento obliga a `-v1`. La decisión queda
 * escrita en vez de implícita, que es la diferencia entre una convención y un
 * olvido.
 */
const CONTRATO = {
    _contrato: {
        sellado: '2026-08-25',
        regla: 'El id es el contrato: dos notas sólo se comparan dentro del mismo id. '
             + 'Cambiar el comportamiento obliga a subir la versión (…-v0 → …-v1).',
        antes_de_esta_fecha: 'Los mundos estaban en desarrollo y no había notas publicadas '
             + 'que proteger (medido: 0 referencias en resultados/tabla.json). '
             + 'Desde aquí, cualquier cambio de comportamiento exige versión nueva.',
        estandar: 'Gym/Gymnasium: CartPole-v0 → v1 se diferencian sólo en el límite de '
             + 'pasos y el umbral de recompensa. Un umbral basta para una versión.',
        /**
         * ⚠️ ESTAS NOTAS VIVEN AQUÍ Y NO EN EL JSON, PORQUE SELLAR LO REESCRIBE.
         *
         * Las escribí a mano en `huellas.json` y el primer `--sellar` se las llevó
         * por delante: el fichero se regenera entero desde esta plantilla. Una nota
         * que desaparece cada vez que se sella es una nota que se va a perder.
         */
        cobertura: 'La huella MUESTREA cuatro puertas: el sustrato (qué hay), la observación '
             + 'numérica (los escalares), el comportamiento (pasos, recompensa, fin) y el TEXTO '
             + 'que lee un agente de lenguaje, tomado al empezar y al acabar.',
        lo_que_no_demuestra: 'Que dos juegos sean idénticos. Es una MUESTRA: una política fija '
             + 'sobre cuatro semillas. Medido el 25-08: añadí a ¡Busca! una línea que dice si la '
             + 'nave va derivando y la huella no se movió, porque esa política alterna empujar y '
             + 'frenar y acaba PARADA, así que esa línea no aparecía nunca. Por eso el texto se '
             + 'toma ahora en dos momentos, y por eso el contrato dice «sigue comportándose como '
             + 'cuando se selló» y no «es idéntico».',
        el_texto_entro_el_25_08: 'Y lo destapé cambiando un juego yo misma: a los tres ¡Busca! les '
             + 'di el radar completo en describe() —de 163 a 458 caracteres— y la huella dijo «sin '
             + 'cambios» en los nueve. Hasta entonces hasheaba las tres puertas que NO usa un '
             + 'agente de lenguaje.',
        por_que_no_suben_a_v1: 'Porque no hay nota que proteger: cero entradas de mundos propios '
             + 'en resultados/tabla.json. Y porque cuando dos puertas discrepaban, las notas viejas '
             + 'no eran obsoletas sino inválidas —medían la puerta, no al agente—. Una versión '
             + 'nueva conserva medidas buenas; no dignifica medidas rotas.',
    },
};

let declaradas = {};
if (existsSync(ARCHIVO)) declaradas = JSON.parse(readFileSync(ARCHIVO, 'utf8'));

let fallos = 0, nuevos = 0, iguales = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };
const ahora = { ...CONTRATO };

console.log('\n¿Sigue siendo el mismo juego que cuando se publicó su nota?\n');

for (const e of CATALOGO) {
    if (e.familia !== 'propio') continue;
    let Clase;
    try { Clase = await e.cargar(); } catch (err) {
        mal(`${e.id}: no carga (${String(err.message).slice(0, 60)})`); continue;
    }
    const { huella, detalle } = worldFingerprint(Clase);
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
        if (id.startsWith('_')) continue;   // el contrato no es un juego
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
