/**
 * prueba_realizacion.mjs — ¿manda un compás sobre los cinco departamentos?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_realizacion.mjs
 *         → 0 bien · 1 mal · 2 la prueba no vale
 *
 * ⚠️ LO QUE MÁS SE VIGILA AQUÍ NO ES QUE ACIERTE: ES QUE NO SE CALLE.
 *
 * Un director que, al pedirle un momento que no existe, devuelve el de casa sin
 * decir nada, es la avería de esta semana entera: `ArcadeTableRoomFactory`
 * recibía `options` y no las guardaba, `gen_semantic_props` no conocía las cuñas y
 * las piezas desaparecían sin error. Las dos veces el fallo no era equivocarse:
 * era equivocarse EN SILENCIO.
 *
 * Así que la mitad de esta prueba comprueba que los huecos se digan, y que al
 * decirlos el departamento se quede en `null` en vez de en un valor plausible.
 */
import { readFile } from 'node:fs/promises';
import { compasDe, resolverGuion, costuras, vocabulario }
    from './public/arcade/js/protohub/render/realizacion.js';
import { camaraDe } from './public/arcade/js/protohub/render/camara.js';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const nombres = ['camera', 'light', 'montaje', 'face', 'gesture'];
const lexicos = Object.fromEntries(await Promise.all(nombres.map(async (n) => [
    n, JSON.parse(await readFile(`./public/data/realizacion/${n}_lexicon.json`, 'utf8')),
])));

const fallos = [];
const mal = (m) => fallos.push(m);
let comprobaciones = 0;

const voc = vocabulario({ lexicos });
const cos = costuras({ lexicos });

// ── 1. El vocabulario existe y no está vacío (control positivo) ─────────────
if (voc.momentos.length < 5 || voc.emociones.length < 10 || voc.disposiciones.length < 3) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: vocabulario casi vacío `
        + `(${voc.momentos.length} momentos, ${voc.emociones.length} emociones). `
        + `Con los léxicos vacíos todo lo demás aprueba solo.\n`));
    process.exit(2);
}

// ── 2. Un compás bueno reparte trabajo a los cinco ──────────────────────────
{
    const r = compasDe({ momento: 'revelacion', emocion: 'shock', duracion: 1200 }, { lexicos });
    comprobaciones += 5;
    if (!r.camara?.encuadre) mal('«revelacion» no le dice nada a la cámara');
    if (!r.luz?.key) mal('«revelacion» no le dice nada a la luz');
    if (!r.cara?.expression) mal('«shock» no le dice nada a la cara');
    if (!r.gesto?.gesture) mal('«shock» no le dice nada al gesto');
    if (!r.montaje?.celdas?.length) mal('no sale disposición de montaje');
    comprobaciones++;
    if (r.huecos.length) mal(`un compás entero no debería tener huecos, y trae: ${r.huecos.join('; ')}`);
}

// ── 3. LOS DOS EJES SON INDEPENDIENTES ──────────────────────────────────────
/**
 * ⚠️ ÉSTA ES LA TESIS DEL MÓDULO. Si cambiar la emoción cambiara la cámara, no
 *    serían dos ejes: sería una lista disfrazada, y entonces sí habría que
 *    fundirlos. Se comprueba que no.
 */
{
    const a = compasDe({ momento: 'revelacion', emocion: 'shock' }, { lexicos });
    const b = compasDe({ momento: 'revelacion', emocion: 'relief' }, { lexicos });
    comprobaciones += 2;
    if (JSON.stringify(a.camara) !== JSON.stringify(b.camara)) mal('la emoción ha cambiado la cámara: no son dos ejes');
    if (JSON.stringify(a.luz) !== JSON.stringify(b.luz)) mal('la emoción ha cambiado la luz: no son dos ejes');
    comprobaciones++;
    if (JSON.stringify(a.cara) === JSON.stringify(b.cara)) mal('«shock» y «relief» dan la misma cara: el eje de emoción no distingue');

    const c = compasDe({ momento: 'duda', emocion: 'shock' }, { lexicos });
    comprobaciones += 2;
    if (JSON.stringify(a.cara) !== JSON.stringify(c.cara)) mal('el momento ha cambiado la cara: no son dos ejes');
    if (JSON.stringify(a.camara) === JSON.stringify(c.camara)) mal('«revelacion» y «duda» dan la misma cámara: el eje de momento no distingue');
}

// ── 4. NADA SE RELLENA EN SILENCIO ──────────────────────────────────────────
{
    const r = compasDe({ momento: 'no_existe', emocion: 'tampoco_existe' }, { lexicos });
    comprobaciones += 4;
    if (r.camara !== null) mal('un momento inventado ha devuelto una cámara en vez de null');
    if (r.luz !== null) mal('un momento inventado ha devuelto una luz en vez de null');
    if (r.cara !== null) mal('una emoción inventada ha devuelto una cara en vez de null');
    if (r.huecos.length < 4) mal(`cuatro cosas inventadas y sólo ${r.huecos.length} quejas`);

    // ⚠️ CONTROL POSITIVO DEL DELATOR. Si `huecos` se llenara siempre, lo de
    //    arriba no probaría nada.
    const bueno = compasDe({ momento: 'duda', emocion: 'unease' }, { lexicos });
    if (bueno.huecos.length) {
        console.log(rojo(`\nCONTROL POSITIVO FALLIDO: un compás correcto también se queja `
            + `(${bueno.huecos.join('; ')}). El delator no distingue.\n`));
        process.exit(2);
    }
    comprobaciones++;
}

// ── 5. El ritmo se avisa, no se corrige ─────────────────────────────────────
{
    const minimo = lexicos.montaje.rhythm.min_shot_ms;
    const r = compasDe({ momento: 'duda', duracion: minimo - 1 }, { lexicos });
    comprobaciones += 2;
    if (!r.huecos.some((h) => h.includes('mínimo'))) mal(`un plano de ${minimo - 1} ms no se ha avisado`);
    if (r.duracion !== minimo - 1) mal('la duración se ha corregido sola en vez de avisarse');
}

// ── 6. LA CADENA ENTERA: momento → cámara → una cámara de verdad ────────────
/**
 * `realizacion.js` dice QUÉ plano; `camara.js` dice DÓNDE. Si los dos no encajan,
 * la separación es decorativa. Se prueba en los dos sujetos extremos.
 */
for (const sujeto of [{ centro: [0, 0.85, 0], altura: 1.7 }, { centro: [0, 110, 0], altura: 220 }]) {
    for (const momento of voc.momentos) {
        const r = compasDe({ momento }, { lexicos });
        comprobaciones++;
        if (!r.camara) { mal(`«${momento}» no da plan de cámara`); continue; }
        const c = camaraDe(sujeto, r.camara, { lexico: lexicos.camera });
        comprobaciones++;
        if (![...c.pos, ...c.look, c.fov, c.dist].every(Number.isFinite)) {
            mal(`«${momento}» sobre un sujeto de ${sujeto.altura} m da números no finitos`);
        }
    }
}

// ── 7. Un guion entero se resuelve y suma su duración ───────────────────────
{
    const guion = [
        { momento: 'establecer', duracion: 2000, transicion: 'fade' },
        { momento: 'escucha', emocion: 'nervous', duracion: 1500 },
        { momento: 'confesion_dramatica', emocion: 'guilt', duracion: 2500, transicion: 'hard_cut' },
        { momento: 'revelacion', emocion: 'shock', duracion: 1800 },
    ];
    const g = resolverGuion(guion, { lexicos });
    comprobaciones += 3;
    if (g.compases.length !== 4) mal('el guion ha perdido compases');
    if (g.duracion !== 7800) mal(`la duración total sale ${g.duracion} y deberían ser 7800 ms`);
    if (!g.quejas.every((q) => /^compás \d+:/.test(q))) mal('las quejas no dicen de qué compás son');
}

// ── 8. LA COSTURA, CON TECHO QUE BAJA EN LOS DOS SENTIDOS ───────────────────
/**
 * ⚠️ Ocho de los once momentos no tienen ambiente de luz. Eso NO es un fallo del
 *    código: es una decisión de dirección que le toca a Oscar, y son ocho líneas
 *    en `light_lexicon.json`. Lo que sí es un fallo es que el número se mueva sin
 *    que nadie se entere, en cualquiera de los dos sentidos.
 */
const TECHO_SIN_LUZ = 8;
const TECHO_LUCES_HUERFANAS = 3;
comprobaciones += 2;
if (cos.sinLuz.length !== TECHO_SIN_LUZ) {
    mal(`${cos.sinLuz.length} momentos sin ambiente de luz y el techo dice ${TECHO_SIN_LUZ}. `
        + (cos.sinLuz.length < TECHO_SIN_LUZ
            ? `Bájalo: un límite por detrás de la realidad ya no vigila. Faltan: ${cos.sinLuz.join(', ')}`
            : `Alguien añadió un plano sin luz: ${cos.sinLuz.join(', ')}`));
}
if (cos.lucesHuerfanas.length !== TECHO_LUCES_HUERFANAS) {
    mal(`${cos.lucesHuerfanas.length} ambientes que ningún plano puede pedir, y el techo dice `
        + `${TECHO_LUCES_HUERFANAS}: ${cos.lucesHuerfanas.join(', ')}`);
}

// ── veredicto ────────────────────────────────────────────────────────────────
const MINIMO = 40;
console.log(`\n¿Manda un compás sobre los cinco departamentos?\n`);
console.log(gris(`  ${voc.momentos.length} momentos × ${voc.emociones.length} emociones · `
    + `${voc.disposiciones.length} disposiciones · ${voc.transiciones.length} transiciones · `
    + `${comprobaciones} comprobaciones`));
console.log(gris(`  costura: ${cos.sinLuz.length} momentos sin luz · `
    + `${cos.lucesHuerfanas.length} ambientes huérfanos · `
    + `${cos.sinCara.length} emociones sin cara · ${cos.sinGesto.length} sin gesto`));

if (comprobaciones < MINIMO) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: ${comprobaciones} comprobaciones, mínimo ${MINIMO}.\n`));
    process.exit(2);
}
if (fallos.length) {
    for (const f of fallos.slice(0, 12)) console.log(rojo(`  ✗ ${f}`));
    if (fallos.length > 12) console.log(gris(`  … y ${fallos.length - 12} más`));
    console.log(rojo(`\n✗ ${fallos.length} fallos\n`));
    process.exit(1);
}
console.log(verde('✓ un compás reparte a los cinco, los dos ejes no se estorban, y los huecos se dicen\n'));
