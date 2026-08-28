/**
 * prueba_esqueletos.mjs — ¿construye ProceduralRigging.js un esqueleto por arquetipo?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_esqueletos.mjs
 *     → 0 todos · 1 alguno falla · 2 la prueba no vale
 *
 * POR QUÉ EXISTE
 *
 * `public/data/ontology.json` declara 22 arquetipos en `taxonomy.biological` —
 * justo el número que dice el propio docstring de la clase: «ALISA's 22
 * phylogenetic archetypes». `public/data/skeletons.json` y
 * `public/data/kinematics.json` ya traían la geometría platónica y el gait de
 * CADA UNO, `equine` y `theropod` incluidos.
 *
 * Pero `ProceduralRigging.buildArchetypeSkeleton` — la única pieza que convierte
 * esos datos en huesos de verdad (`THREE.Bone` con jerarquía) — tenía una
 * cadena de `else if` que iba de `canine`/`feline` directa a `arachnid`.
 * Caballo y dinosaurio bípedo se etiquetaban (clasificador), se declaraban
 * (skeletons.json/kinematics.json)... y no se construían (ProceduralRigging.js).
 * Ningún error, ningún aviso: la rama simplemente no existía, así que el
 * `else` la ignoraba en silencio.
 *
 * Medido: **2 arquetipos de 22 sin una sola rama** — `equine` y `theropod`.
 * Rescatados desde `_archivo/proceduralrigging/ProceduralRigging_pre_topo.js`
 * (la versión anterior al extractor topológico / a `bindSkin`), injertados sin
 * tocar nada más del fichero vivo.
 *
 * QUÉ MIDE
 *
 *   1. que CADA arquetipo de la ontología produzca un esqueleto con al menos
 *      un hueso — no sólo equine/theropod: los 22 biológicos más los 2
 *      mecánicos que sí pasan por esta clase (wheeled, hovering);
 *   2. que equine, theropod y canine salgan con esqueletos DISTINTOS entre sí
 *      — si theropod calcase a canine, la rama nueva existiría en el código
 *      pero no estaría haciendo nada;
 *   3. que ninguna posición de hueso sea NaN/Infinity — con un `renderGroup`
 *      sin malla real, `modelBox` sale infinito y las reglas de snapping
 *      semántico (spineY/sternumY, líneas ~1009-1045) lo convierten en NaN sin
 *      avisar; por eso esta prueba monta una malla real, como hace cualquier
 *      llamador de verdad (`MorpheusSimulationSystem.js`, `ArtDirectionPipeline.js`).
 *
 * ⚠️ IGOR_SURGICAL Y PYGMALION_SCANNER, EXCLUIDOS A PROPÓSITO.
 * `taxonomy.mechanical` de la ontología también los lista, pero NO pasan por
 * `buildArchetypeSkeleton`: sólo aparecen en `PygmalionTopologySystem.js`, con
 * su propio rig por ángulos objetivo (`kinematics.json` los describe con
 * `rom.targetLeftX/Y/Z`, no con los `gaits` de locomoción del resto). No es el
 * hueco que se rescató aquí — meterlos en la lista haría fallar la prueba por
 * una razón ajena a este rescate, y por instrucción de la tarea no se debía
 * inventar ni tocar ese otro sistema.
 *
 * ⚠️ EL CONTROL POSITIVO. Un recorrido sobre una lista vacía de arquetipos
 * aprueba siempre — no ha mirado nada. Se exige un mínimo de arquetipos
 * recorridos.
 *
 * SABOTAJE DECLARADO (verificado a mano contra esta prueba, no vive aquí)
 *   · quitar la rama `equine` de ProceduralRigging.js → debe suspender
 *   · hacer que `theropod` copie el `bones` de `canine`  → debe suspender por
 *     «no son distintos»
 */
import * as THREE from 'three';
import { readFile } from 'node:fs/promises';
import { ProceduralRigging } from './public/js/alisa-engine/src/soma/ProceduralRigging.js';

const MINIMO_ARQUETIPOS = 20; // hoy hay 24 (22 biológicos + wheeled + hovering); si bajan de aquí, algo se perdió

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

// EXCLUIDOS A PROPÓSITO: ver la nota ⚠️ de arriba — no pasan por esta clase.
const EXCLUIDOS_MECANICA_NO_ARCHETYPE = new Set(['igor_surgical', 'pygmalion_scanner']);

const ontologia = JSON.parse(await readFile('./public/data/ontology.json', 'utf8'));
const archetipos = [
    ...ontologia.taxonomy.biological,
    ...ontologia.taxonomy.mechanical.filter(t => !EXCLUIDOS_MECANICA_NO_ARCHETYPE.has(t)),
];

if (archetipos.length < MINIMO_ARQUETIPOS) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: sólo ${archetipos.length} arquetipos para recorrer `
        + `(mínimo ${MINIMO_ARQUETIPOS}). Una lista corta o vacía aprueba sin haber probado nada.\n`));
    process.exit(2);
}

// Una malla real, como la que monta cualquier llamador de verdad (Morpheus, ArtDirection).
// Sin esto `modelBox` sale infinito (Box3 vacío) y el snapping semántico devuelve NaN
// para CUALQUIER arquetipo, no sólo los nuevos — mediríamos un fallo que no es el nuestro.
function nuevoRenderGroup() {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 8));
    group.add(mesh);
    return group;
}

function construir(tipo) {
    const renderGroup = nuevoRenderGroup();
    const logOriginal = console.log;
    console.log = () => {}; // silenciar "📍 Punto Cero (UB) anclado" y compañía: son ruido aquí
    try {
        return ProceduralRigging.buildArchetypeSkeleton(tipo, renderGroup, []);
    } finally {
        console.log = logOriginal;
    }
}

// Firma = posiciones absolutas de todos los nodos, ordenadas. Si dos arquetipos
// producen la misma firma, uno de los dos no está aportando geometría propia.
function firmaEsqueleto(rawBones) {
    return rawBones
        .map(b => `${b.userData.worldPos.x.toFixed(3)},${b.userData.worldPos.y.toFixed(3)},${b.userData.worldPos.z.toFixed(3)}`)
        .sort()
        .join('|');
}

const problemas = [];
const firmas = {};
let arquetiposConHueso = 0;

for (const tipo of archetipos) {
    let res;
    try {
        res = construir(tipo);
    } catch (e) {
        problemas.push(`${tipo}: lanzó una excepción — ${e.message}`);
        continue;
    }

    const rawBones = res?.rawBones || [];
    if (rawBones.length === 0) {
        problemas.push(`${tipo}: 0 nodos — la rama no existe o no genera huesos`);
        continue;
    }

    // Un "hueso" es una arista: un nodo cuyo padre es otro Bone (no la raíz del grupo).
    const huesos = rawBones.filter(b => b.parent && b.parent.isBone).length;
    if (huesos < 1) {
        problemas.push(`${tipo}: ${rawBones.length} nodo(s) pero 0 huesos conectados (sin aristas)`);
        continue;
    }
    arquetiposConHueso++;

    let noFinito = false;
    for (const b of rawBones) {
        const p = b.userData.worldPos;
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
            noFinito = true;
            break;
        }
    }
    if (noFinito) {
        problemas.push(`${tipo}: posición no finita (NaN/Infinity) en algún hueso`);
        continue;
    }

    if (['equine', 'theropod', 'canine'].includes(tipo)) {
        firmas[tipo] = firmaEsqueleto(rawBones);
    }
}

console.log(`\n¿Construye ProceduralRigging un esqueleto por arquetipo?  `
    + `(${archetipos.length} arquetipos; excluidos a propósito: ${[...EXCLUIDOS_MECANICA_NO_ARCHETYPE].join(', ')})\n`);
console.log(gris(`  con al menos un hueso: ${arquetiposConHueso}/${archetipos.length}\n`));

if (firmas.equine && firmas.theropod && firmas.equine === firmas.theropod) {
    problemas.push('equine y theropod producen exactamente el mismo esqueleto — la rama nueva no distingue nada');
}
if (firmas.equine && firmas.canine && firmas.equine === firmas.canine) {
    problemas.push('equine y canine producen exactamente el mismo esqueleto');
}
if (firmas.theropod && firmas.canine && firmas.theropod === firmas.canine) {
    problemas.push('theropod y canine producen exactamente el mismo esqueleto');
}

if (problemas.length) {
    for (const p of problemas) console.log(`  ${rojo('✗')} ${p}`);
    console.log(rojo(`\n✗ ${problemas.length} problema(s)\n`));
    process.exit(1);
}

console.log(verde(`✓ los ${archetipos.length} arquetipos construyen esqueleto, con huesos finitos, `
    + `y equine/theropod/canine son distintos entre sí\n`));
