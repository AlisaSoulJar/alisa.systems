/**
 * prueba_camara.mjs — ¿encuadra de verdad lo que dice que encuadra?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_camara.mjs
 *         → 0 bien · 1 encuadra mal · 2 la prueba no vale
 *
 * ⚠️ NO SE VUELVE A HACER LA CUENTA: SE PROYECTA.
 *
 * `camara.js` saca la distancia con `dist = (alto/2) / tan(fov/2)`. Una prueba
 * que compruebe eso rehaciendo esa misma división no comprueba nada: aprobaría
 * con la trigonometría cambiada de signo, porque estaría cambiada en los dos
 * sitios. Ya me pasó con el mapa de bandos —la prueba copiaba la lógica que
 * medía y seguía diciendo «6 afectados» después de arreglarlo.
 *
 * Así que aquí mide OTRO: se monta una `PerspectiveCamera` de three.js de verdad,
 * con su `lookAt`, su matriz de mundo y su matriz de proyección, y se proyectan
 * los dos bordes del cuadro que `camara.js` dice haber conseguido. Si su
 * trigonometría está mal, la matriz de three no la va a acompañar en el error.
 *
 * Los bordes se toman sobre el ARRIBA LOCAL de la cámara, no sobre la Y del
 * mundo: en un contrapicado el cuadro está inclinado, y medir en vertical
 * mediría otra cosa. Ése fue el detalle que casi se me escapa.
 */
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { camaraDe, planoDe, nombresDe, revisarLexico } from './public/arcade/js/protohub/render/camara.js';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const LEXICO = JSON.parse(await readFile('./public/data/realizacion/camera_lexicon.json', 'utf8'));

const fallos = [];
const mal = (m) => fallos.push(m);
let comprobaciones = 0;

/** El cuadro que three.js ve de verdad, en unidades de mundo, sobre el punto mirado. */
function cuadroReal({ pos, look, fov }) {
    const cam = new THREE.PerspectiveCamera(fov, 16 / 9, 0.001, 1e7);
    cam.position.set(...pos);
    cam.lookAt(new THREE.Vector3(...look));
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    // Buscamos qué separación, sobre el arriba LOCAL, cae justo en el borde.
    const arriba = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const centro = new THREE.Vector3(...look);
    const sonda = centro.clone().add(arriba.clone().multiplyScalar(1)).project(cam);
    const centroNdc = centro.clone().project(cam);
    // 1 unidad de mundo mueve `sonda.y - centroNdc.y` de NDC; el borde está en 1.
    return 2 / Math.abs(sonda.y - centroNdc.y);
}

// ── 1. El léxico del disco, ¿se sostiene? ────────────────────────────────────
const quejas = revisarLexico(LEXICO);
comprobaciones++;
if (quejas.length) mal(`el léxico del disco no pasa su propia revisión: ${quejas.join('; ')}`);

// ⚠️ CONTROL POSITIVO. Un revisor que no sabe decir que no aprueba cualquier cosa.
const roto = structuredClone(LEXICO);
roto.presets.confesion_intima.framing = 'un_encuadre_que_no_existe';
roto.framings.mcu.h_frame = -1;
comprobaciones++;
if (revisarLexico(roto).length < 2) {
    console.log(rojo('\nCONTROL POSITIVO FALLIDO: revisarLexico aprueba un léxico roto a propósito.\n'));
    process.exit(2);
}

// ── 2. El cuadro prometido es el cuadro obtenido, a cualquier escala ─────────
/**
 * ⚠️ Y ÉSTE ES EL PUNTO DE TODO EL MÓDULO. Tres sujetos que no se parecen en
 *    nada: un peón de ajedrez, una persona y una torre corporativa. El mismo
 *    plano tiene que encuadrarlos igual de bien, porque el léxico habla en
 *    proporciones del sujeto y no en metros.
 */
const SUJETOS = [
    { nombre: 'peón',    centro: [0, 0.025, 0],  altura: 0.05 },
    { nombre: 'persona', centro: [3, 0.85, -2],  altura: 1.70 },
    { nombre: 'torre',   centro: [0, 110, 0],    altura: 220 },
];
const { encuadres, angulos } = nombresDe(LEXICO);
const proporciones = new Map();

for (const suj of SUJETOS) {
    for (const encuadre of encuadres) {
        for (const angulo of angulos) {
            const r = camaraDe(suj, { encuadre, angulo }, { lexico: LEXICO });
            const enc = LEXICO.framings[encuadre];
            const prometido = enc.h_frame * suj.altura * (1 + (enc.z_pad ?? 0));
            const obtenido = cuadroReal(r);
            comprobaciones++;
            const error = Math.abs(obtenido - prometido) / prometido;
            if (error > 1e-4) {
                mal(`${suj.nombre} · ${encuadre}/${angulo}: prometía un cuadro de `
                    + `${prometido.toFixed(4)} y three ve ${obtenido.toFixed(4)} (${(error * 100).toFixed(2)}%)`);
            }
            // La proporción distancia/altura no puede depender del tamaño del sujeto.
            const clave = `${encuadre}/${angulo}`;
            const prop = r.dist / suj.altura;
            if (!proporciones.has(clave)) proporciones.set(clave, prop);
            comprobaciones++;
            if (Math.abs(proporciones.get(clave) - prop) / prop > 1e-9) {
                mal(`${clave}: la proporción cambia con la escala — ${suj.nombre} da ${prop.toFixed(6)} `
                    + `y otro sujeto daba ${proporciones.get(clave).toFixed(6)}`);
            }
        }
    }
}

// ⚠️ CONTROL POSITIVO DEL INSTRUMENTO. Si `cuadroReal` aprobara cualquier
//    distancia, todo lo de arriba sería decorado. Se aparta la cámara un 20% y
//    tiene que notarse.
{
    const suj = SUJETOS[1];
    const r = camaraDe(suj, { encuadre: 'mcu', angulo: 'eye' }, { lexico: LEXICO });
    const lejos = { ...r, pos: r.look.map((v, i) => v + (r.pos[i] - r.look[i]) * 1.2) };
    const enc = LEXICO.framings.mcu;
    const prometido = enc.h_frame * suj.altura * (1 + enc.z_pad);
    comprobaciones++;
    if (Math.abs(cuadroReal(lejos) - prometido) / prometido < 0.15) {
        console.log(rojo('\nCONTROL POSITIVO FALLIDO: apartar la cámara un 20% no cambia la medida.\n'));
        process.exit(2);
    }
}

// ── 3. Dos cosas que el cuadro NO puede ver, y casi se me cuelan ────────────
/**
 * ⚠️ EL APARTADO 2 TIENE UN PUNTO CIEGO, Y LO ENCONTRÉ ROMPIENDO EL MÓDULO.
 *
 * Probé cinco averías a propósito y dos APROBARON: ignorar el `fov_bias` del
 * ángulo, y mirar al centro del sujeto en vez de a su `y_target`. Las dos son
 * gordas —un ojo de pez deja de ser un ojo de pez, un plano de ojos apunta al
 * ombligo— y las dos pasaban.
 *
 * El motivo es el mismo: aquel apartado mide el cuadro RELATIVO a lo que el
 * propio módulo devuelve. Si el `fov` sale mal, la distancia sale mal en la misma
 * proporción y el cuadro vuelve a cuadrar. Si el punto mirado sale mal, el cuadro
 * cuadra alrededor del punto equivocado.
 *
 * Es decir: comprobaba que es COHERENTE consigo mismo, no que sea FIEL al léxico.
 * Lo de abajo es la fidelidad, y se dice en consecuencias observables —no
 * repitiendo la suma, que era el error del que venimos.
 */

// El ángulo cambia el OBJETIVO, no sólo el sitio. Más ángulo de visión para el
// mismo encuadre significa acercarse: eso es lo que hace un ojo de pez.
{
    const s = { centro: [0, 1, 0], altura: 2 };
    const conBias = angulos
        .map((a) => ({ a, bias: LEXICO.angles[a].fov_bias ?? 0,
                       r: camaraDe(s, { encuadre: 'mcu', angulo: a }, { lexico: LEXICO }) }))
        .sort((x, y) => x.bias - y.bias);
    for (let i = 1; i < conBias.length; i++) {
        const antes = conBias[i - 1], ahora = conBias[i];
        if (ahora.bias === antes.bias) continue;
        comprobaciones += 2;
        if (!(ahora.r.fov > antes.r.fov)) {
            mal(`«${ahora.a}» abre más el objetivo que «${antes.a}» y da el mismo fov (${ahora.r.fov})`);
        }
        if (!(ahora.r.dist < antes.r.dist)) {
            mal(`«${ahora.a}» abre el objetivo, así que debería acercarse más que «${antes.a}», `
                + `y da ${ahora.r.dist.toFixed(3)} contra ${antes.r.dist.toFixed(3)}`);
        }
    }
    comprobaciones++;
    const pez = camaraDe(s, { encuadre: 'ecu', angulo: 'fisheye' }, { lexico: LEXICO });
    if (!(pez.fov > 60)) mal(`un ojo de pez con menos de 60° no deforma nada: da ${pez.fov}`);
}

// A dónde mira. Un plano de ojos apunta a la cabeza y uno general al cuerpo.
{
    const s = { centro: [0, 1, 0], altura: 2 };
    const pies = s.centro[1] - s.altura / 2;
    const ordenados = encuadres
        .map((e) => ({ e, y_target: LEXICO.framings[e].y_target ?? 0.5,
                       mira: camaraDe(s, { encuadre: e, angulo: 'eye' }, { lexico: LEXICO }).look[1] }))
        .sort((x, y) => x.y_target - y.y_target);
    for (let i = 1; i < ordenados.length; i++) {
        comprobaciones++;
        if (!(ordenados[i].mira > ordenados[i - 1].mira - 1e-9)) {
            mal(`«${ordenados[i].e}» apunta más alto que «${ordenados[i - 1].e}» en el léxico `
                + `y sale más bajo (${ordenados[i].mira.toFixed(3)} vs ${ordenados[i - 1].mira.toFixed(3)})`);
        }
    }
    for (const { e, mira } of ordenados) {
        comprobaciones++;
        if (mira < pies || mira > pies + s.altura) {
            mal(`«${e}» mira fuera del sujeto: ${mira.toFixed(3)} no está entre ${pies} y ${pies + s.altura}`);
        }
    }
    const ojos = ordenados.at(-1);
    comprobaciones++;
    if (!(ojos.mira > pies + s.altura * 0.9)) {
        mal(`«${ojos.e}» es el plano más alto del léxico y no llega a la cabeza: ${ojos.mira.toFixed(3)}`);
    }
    // El ángulo orbita alrededor de lo mirado; no cambia lo que se mira.
    const desdeArriba = camaraDe(s, { encuadre: 'mcu', angulo: 'high' }, { lexico: LEXICO });
    const aLosOjos = camaraDe(s, { encuadre: 'mcu', angulo: 'eye' }, { lexico: LEXICO });
    comprobaciones++;
    if (JSON.stringify(desdeArriba.look) !== JSON.stringify(aLosOjos.look)) {
        mal('cambiar el ángulo ha cambiado lo que se mira, y sólo debería cambiar desde dónde');
    }
}

// ── 4. Los signos son los que dicen las descripciones ────────────────────────
/**
 * ⚠️ Esto no es matemática, es una DECISIÓN: el dato dice `low: elevation -26` y
 *    lo describe como contrapicado, «looks up at subject». Que el signo negativo
 *    ponga la cámara ABAJO va con esa frase. Si algún día se invierte el
 *    convenio, esto tiene que suspender y no pasar en silencio.
 */
const suj = { centro: [0, 1, 0], altura: 2 };
const alt = (a) => {
    const r = camaraDe(suj, { encuadre: 'medium', angulo: a }, { lexico: LEXICO });
    return r.pos[1] - r.look[1];
};
comprobaciones += 3;
if (!(alt('low') < -0.01)) mal(`«low» es contrapicado y debería poner la cámara abajo, y da ${alt('low').toFixed(3)}`);
if (!(alt('high') > 0.01)) mal(`«high» es picado y debería poner la cámara arriba, y da ${alt('high').toFixed(3)}`);
if (Math.abs(alt('eye')) > 1e-9) mal(`«eye» debería quedar a la altura de los ojos, y da ${alt('eye').toFixed(6)}`);

const ots = camaraDe(suj, { encuadre: 'medium', angulo: 'ots' }, { lexico: LEXICO });
comprobaciones++;
if (Math.abs(ots.pos[0] - ots.look[0]) < 0.01) mal('«ots» es un tres cuartos y no se aparta del eje');

// ── 5. Un plano se pide de dos maneras y sale el mismo ───────────────────────
const porPreset = camaraDe(suj, 'confesion_intima', { lexico: LEXICO });
const porPiezas = camaraDe(suj, { encuadre: 'mcu', angulo: 'eye', movimiento: 'static' }, { lexico: LEXICO });
comprobaciones++;
if (JSON.stringify(porPreset.pos) !== JSON.stringify(porPiezas.pos)) {
    mal('el preset «confesion_intima» y sus tres piezas dan cámaras distintas');
}

// Lo explícito manda sobre el preset, como en el motor que se perdió.
comprobaciones++;
if (planoDe({ preset: 'confesion_intima', angulo: 'dutch' }, LEXICO).angulo !== 'dutch') {
    mal('un ángulo explícito debería mandar sobre el del preset');
}

// Un preset que no existe avisa y sigue; no revienta la escena.
comprobaciones++;
try {
    const r = camaraDe(suj, 'no_existe_este_preset', { lexico: LEXICO });
    if (!Number.isFinite(r.fov)) mal('un preset desconocido debería caer en el de casa');
} catch (e) {
    mal(`un preset desconocido no debería reventar: ${e.message}`);
}

// ── 6. El movimiento sale sin tocar, con lo que hace falta para animarlo ─────
const empuja = camaraDe(suj, 'confesion_dramatica', { lexico: LEXICO });
comprobaciones++;
if (empuja.movimiento?.nombre !== 'push_in' || !(empuja.movimiento.distance_factor > 0)) {
    mal('«confesion_dramatica» debería traer el push_in con su factor para poder animarlo');
}
comprobaciones++;
if (!(empuja.dist > 0)) mal('sin `dist` nadie puede animar un movimiento');

// ── veredicto ────────────────────────────────────────────────────────────────
const MINIMO = 100;
console.log(`\n¿Encuadra de verdad lo que dice que encuadra?\n`);
console.log(gris(`  ${encuadres.length} encuadres × ${angulos.length} ángulos × ${SUJETOS.length} sujetos `
    + `de 0,05 m a 220 m · ${comprobaciones} comprobaciones`));

if (comprobaciones < MINIMO) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: sólo ${comprobaciones} comprobaciones, `
        + `por debajo del mínimo de ${MINIMO}. Un recorrido vacío aprueba solo.\n`));
    process.exit(2);
}
if (fallos.length) {
    for (const f of fallos.slice(0, 12)) console.log(rojo(`  ✗ ${f}`));
    if (fallos.length > 12) console.log(gris(`  … y ${fallos.length - 12} más`));
    console.log(rojo(`\n✗ ${fallos.length} fallos de encuadre\n`));
    process.exit(1);
}
console.log(verde('✓ el cuadro prometido es el que three.js proyecta, a cualquier escala\n'));
