/**
 * ¿PUEDE UN SER JUGAR EN EL BANCO, Y LE LLEGA LA INFORMACIÓN POR SU PUERTA?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_puente.mjs
 *
 * Vigila la costura que junta las dos mitades del proyecto:
 *
 *   EL MODELO DE SER   `SovereignBeing` — cerebro triúnico, niveles T0..T5
 *   EL BANCO           entornos con tres puertas, semilla y nota comparable
 *
 * `PuenteDeGimnasio` los une: el menú del Neocórtex sale de `affordances()` y la
 * decisión se despacha con `stepVerb()`.
 *
 * ⚠️ Y LO QUE DE VERDAD SE MIDE AQUÍ ES SI LA PUERTA DE LENGUAJE DICE BASTANTE.
 *
 * Nació de un fallo mío, encontrado el 25-08 al enchufar el puente por primera
 * vez: un Ser jugó 900 pasos a ¡Defiende! y colocó dos torretas donde no pasaba
 * nadie. Culpé al agente. Era la descripción: `describe()` decía «el camino
 * entra por (0,0), llega a (6,6) y pasa por 27 celdas» — cuántas, no CUÁLES.
 *
 * La puerta numérica mandaba las 144 celdas del terreno y la humana lo pintaba.
 * La de lenguaje daba los extremos y a callar. Con eso, un modelo no podía
 * colocar bien ni queriendo, **y su mala nota habría hablado de la puerta, no de
 * él** — que es la peor forma de mentir que tiene un banco.
 *
 * Medido antes y después de escribir la ruta entera en la descripción:
 *
 *     agente que lee el camino   55  →  525
 *     agente ciego               55      (no cambia: no lee)
 *
 * O sea que la información estaba, y sólo por una puerta.
 */
import { SovereignBeing } from './public/js/alisa.js';
import { Psyches, CognitiveTiers } from './public/js/psyche.js';
import { PuenteDeGimnasio, jugarComoSer } from './public/js/alisa-engine/src/gym/PuenteDeGimnasio.js';
import { DefiendeEnv } from './public/js/alisa-engine/src/gym/envs/DefiendeEnv.js';

let fallos = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };
const nacer = () => new SovereignBeing({ position: { x: 0, y: 0, z: 0 } },
    { psyche: Psyches.NEUTRAL, cognitiveTier: CognitiveTiers.T2_CLOUD_FREE });

console.log('\n¿Puede un Ser jugar en el banco?\n');

/**
 * 1. SIN AGENTE NO SE FINGE QUE SE PIENSA.
 * Ni el puente se construye sin `decidir`, ni el Neocórtex inventa una jugada
 * cuando no tiene puente. Las dos cosas se ven igual desde fuera que un Ser
 * pensando, y por eso las dos tienen que decirse.
 */
{
    const env = new DefiendeEnv(); env.reset(1);
    let saltó = false;
    try { new PuenteDeGimnasio({ entorno: env }); } catch { saltó = true; }
    if (!saltó) mal('el puente se deja construir sin `decidir`: un Ser sin agente parecería pensar');

    const ser = nacer();
    const r = await ser.neocortex.think(ser, {});
    if (r.action !== 'sin_puente') {
        mal(`un Ser en T2 sin puente devuelve "${r.action}" en vez de decir que no tiene con qué pensar`);
    }
    if (!fallos) console.log('  ✓ sin agente y sin puente se dice, no se finge');
}

/**
 * 2. UN VERBO INVENTADO SE RECHAZA EN LA FRONTERA.
 * `stepVerb` de un verbo desconocido devuelve `{error}` y sigue como si nada, así
 * que un agente que alucine gastaría turnos sin enterarse.
 */
{
    const env = new DefiendeEnv(); env.reset(1);
    const ser = nacer();
    const r = await jugarComoSer(ser, env, () => 'invocar_dragon', { pasos: 60 });
    if (r.rechazados !== r.pasos) {
        mal(`de ${r.pasos} verbos inventados sólo se rechazaron ${r.rechazados}`);
    } else {
        console.log(`  ✓ los ${r.rechazados} verbos inventados se rechazan en la frontera`);
    }
}

/**
 * 3. ⚠️ LA PRUEBA QUE IMPORTA: ¿LLEVA LA PUERTA DE LENGUAJE LO QUE HACE FALTA?
 *
 * Dos agentes con la MISMA capacidad de decidir. Uno lee la descripción para
 * saber por dónde va el camino; el otro no la lee. Si la puerta de lenguaje
 * lleva la información, el que lee tiene que ganar de calle.
 *
 * Si algún día dejan de separarse, es que alguien ha recortado la descripción —
 * y la nota de los modelos empezaría a hablar de la puerta y no de ellos.
 */
{
    const decisorQueLee = (ctx) => {
        const construir = ctx.verbos.filter(v => v.verb.startsWith('construir_'));
        if (!construir.length) return 'esperar';
        const m = ctx.descripcion.match(/en este orden: ([^.]+)\./);
        if (!m) return 'esperar';
        const camino = [...m[1].matchAll(/\((\d+),(\d+)\)/g)].map(x => ({ x: +x[1], z: +x[2] }));
        let mejor = null, cob = -1;
        for (const v of construir) {
            const c = v.desc.match(/\((\d+), (\d+)\)/), a = v.desc.match(/alcance ([\d.]+)/);
            if (!c || !a) continue;
            const n = camino.filter(p => Math.hypot(p.x - +c[1], p.z - +c[2]) <= +a[1]).length;
            if (n > cob) { cob = n; mejor = v; }
        }
        return cob > 0 ? mejor : 'esperar';
    };
    const decisorCiego = (ctx) => {
        const c = ctx.verbos.filter(v => v.verb.startsWith('construir_'));
        return c.length ? c[c.length - 1] : 'esperar';
    };

    const jugar = async (decisor) => {
        let total = 0;
        for (let s = 1; s <= 6; s++) {
            const env = new DefiendeEnv(); env.reset(s);
            total += (await jugarComoSer(nacer(), env, decisor, { pasos: 7200 })).nota;
        }
        return total / 6;
    };
    const lee = await jugar(decisorQueLee);
    const ciego = await jugar(decisorCiego);
    const MARGEN = 3;   // el que lee tiene que sacar al menos el triple

    console.log(`\n  el que LEE la descripción: ${lee.toFixed(0)}   ·   el CIEGO: ${ciego.toFixed(0)}`);
    if (lee < ciego * MARGEN) {
        mal(`leer la puerta de lenguaje apenas sirve (${lee.toFixed(0)} contra ${ciego.toFixed(0)}). `
          + '`describe()` no lleva lo que hace falta para jugar, y la nota de un modelo '
          + 'hablaría de la puerta y no de él.');
    } else {
        console.log('  ✓ la puerta de lenguaje lleva lo que hace falta para jugar bien');
    }
}

console.log('');
if (fallos) { console.log(`  ✗ ${fallos} fallo(s) en el puente\n`); process.exit(1); }
console.log('  ✓ un Ser juega en el banco, y por su puerta le llega el problema entero\n');
