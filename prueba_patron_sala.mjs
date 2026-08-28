/**
 * prueba_patron_sala.mjs — el PATRÓN de la sala, para poder cambiarla sin cambiarla
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_patron_sala.mjs           → compara
 *     node --import ./resolver_three.mjs prueba_patron_sala.mjs --grabar  → congela
 *
 * POR QUÉ EXISTE
 *
 * `habitacion.js` monta la sala a mano, con los números escritos dentro. La vamos
 * a pasar a un manifiesto de datos para que crear un ambiente nuevo cueste un
 * fichero en vez de una función. Y el riesgo de esa clase de cambio es siempre el
 * mismo: que la sala nueva se parezca a la vieja y no sea la vieja.
 *
 * Así que primero se congela lo que hay —cada malla, cada luz, su sitio, su
 * tamaño y su color— y después se exige que lo montado desde el manifiesto dé
 * EXACTAMENTE eso. Un refactor que no puede demostrar que no cambió nada no es un
 * refactor: es una reescritura con la esperanza puesta.
 *
 * ⚠️ EL TRES QUE SE USA AQUÍ NO ES EL DEL NAVEGADOR, Y DA IGUAL.
 *
 * `habitacion.js` vive en el arcade, que corre three r128 como global. Aquí se le
 * pone un three de módulos por `globalThis.THREE`. Eso NO sirve para decir «se ve
 * igual en el navegador» — no es lo que mide. Sirve para lo único que tiene que
 * medir: que DOS construcciones, bajo el mismo three, salgan idénticas. La
 * versión es una constante compartida por los dos lados de la comparación, así
 * que se cancela.
 */
import * as THREE from 'three';
import { readFile, writeFile } from 'node:fs/promises';

globalThis.THREE = THREE;

// `habitacion.js` usa `document.createElement('canvas')` para el entorno PMREM y
// un renderizador que aquí no hay. Se le pasa `render: null`, que es el camino
// declarado para «sin revelado»: la sala se monta igual y avisa por consola.
const { amueblar } = await import('./public/arcade/js/protohub/habitacion.js');

const PATRON = './public/data/patron_sala_cartas.json';

/**
 * La huella de una escena: qué hay, dónde y de qué color.
 *
 * ⚠️ SE ORDENA, PORQUE EL ORDEN DE `scene.children` NO ES INFORMACIÓN.
 *
 * Si mañana el manifiesto monta el suelo después de la rejilla, la sala es la
 * misma y la comparación tiene que decir que sí. Lo que no puede cambiar es QUÉ
 * hay. Ordenar por la propia descripción hace la comparación insensible al orden
 * de construcción y sensible a todo lo demás.
 */
function retratar(scene) {
    const filas = [];
    const n = (v) => (typeof v === 'number' ? +v.toFixed(5) : v);

    for (const o of scene.children) {
        const f = { tipo: o.type, y: n(o.position.y), x: n(o.position.x), z: n(o.position.z) };

        if (o.isLight) {
            f.intensidad = n(o.intensity);
            f.color = o.color?.getHexString?.();
            if (o.groundColor) f.suelo = o.groundColor.getHexString();
            if (o.castShadow) f.sombra = true;
        } else if (o.isMesh || o.type === 'GridHelper' || o.type === 'LineSegments') {
            const p = o.geometry?.parameters ?? {};
            f.geometria = o.geometry?.type;
            for (const k of ['radius', 'width', 'height', 'depth', 'segments', 'radialSegments']) {
                if (p[k] !== undefined) f[k] = n(p[k]);
            }

            /**
             * ⚠️ ESTO FALTABA, Y EL PATRÓN MINTIÓ EN VERDE LA PRIMERA VEZ QUE HIZO
             *    FALTA QUE DIJERA QUE NO.
             *
             * Cambié la rejilla de 42 divisiones a una casilla de 20 unidades —o
             * sea, de 672/42 a 680/34— y esta comprobación dijo «idéntica». El
             * motivo: una `GridHelper` construye una `BufferGeometry` a pelo, sin
             * `geometry.parameters`, así que el bucle de arriba no encontraba ni
             * `width` ni `segments` y no guardaba NADA de su tamaño. Comparaba su
             * color, su altura y su rotación, que eran justo lo que no había
             * cambiado.
             *
             * Un patrón que no ve la dimensión de lo que congela aprueba cualquier
             * cambio de dimensión. Y el fallo tiene la forma de siempre: no es que
             * midiera mal, es que su universo estaba recortado y dentro de su
             * recorte tenía razón.
             *
             * La caja envolvente y el número de vértices no dependen de que la
             * geometría publique parámetros: los tiene cualquier malla. Con eso, el
             * tamaño de la rejilla y sus divisiones entran en la comparación.
             */
            const g = o.geometry;
            if (g?.attributes?.position) {
                g.computeBoundingBox?.();
                const c = g.boundingBox;
                if (c) f.caja = [n(c.max.x - c.min.x), n(c.max.y - c.min.y), n(c.max.z - c.min.z)];
                f.vertices = g.attributes.position.count;
            }
            const m = Array.isArray(o.material) ? o.material[0] : o.material;
            if (m) {
                f.color = m.color?.getHexString?.();
                if (m.roughness !== undefined) f.rugosidad = n(m.roughness);
                if (m.metalness !== undefined) f.metal = n(m.metalness);
                if (m.opacity !== undefined && m.opacity < 1) f.opacidad = n(m.opacity);
            }
            f.rotX = n(o.rotation.x);
        }
        filas.push(f);
    }

    const escena = {
        niebla: scene.fog ? { clase: scene.fog.constructor.name,
                              color: scene.fog.color?.getHexString?.(),
                              densidad: n(scene.fog.density),
                              cerca: n(scene.fog.near), lejos: n(scene.fog.far) } : null,
        fondo: scene.background?.getHexString?.() ?? null,
        piezas: filas.map(f => JSON.stringify(f)).sort().map(s => JSON.parse(s)),
    };
    return escena;
}

const escena = new THREE.Scene();
const sala = amueblar(escena, { radio: 24, alto: 15, hondo: 7 });
const ahora = retratar(escena);

if (process.argv.includes('--grabar')) {
    await writeFile(PATRON, JSON.stringify(ahora, null, 2) + '\n');
    console.log(`\n  patrón congelado · ${ahora.piezas.length} piezas · ${PATRON}\n`);
    process.exit(0);
}

let patron;
try {
    patron = JSON.parse(await readFile(PATRON, 'utf8'));
} catch {
    console.log(`\nCONTROL POSITIVO FALLIDO: no hay patrón en ${PATRON}.`);
    console.log(`Una comparación sin nada con qué comparar aprueba siempre. Congélalo con --grabar.\n`);
    process.exit(2);
}

if (!patron.piezas?.length) {
    console.log('\nCONTROL POSITIVO FALLIDO: el patrón está vacío.\n');
    process.exit(2);
}

const a = JSON.stringify(patron, null, 1);
const b = JSON.stringify(ahora, null, 1);

console.log(`\n¿Sigue siendo la misma sala?  (${patron.piezas.length} piezas congeladas)\n`);

if (a === b) {
    console.log('  ✓ idéntica: mismas piezas, mismos sitios, mismos colores, misma niebla\n');
    sala.quitar();
    process.exit(0);
}

// Qué cambió, en concreto. Un «no coincide» sin decir dónde obliga a mirar a mano
// justo lo que esta prueba existe para no tener que mirar a mano.
const la = a.split('\n'), lb = b.split('\n');
console.log(`  ✗ la sala cambió\n`);
let dichas = 0;
for (let i = 0; i < Math.max(la.length, lb.length) && dichas < 24; i++) {
    if (la[i] !== lb[i]) {
        console.log(`      línea ${i + 1}`);
        console.log(`        patrón: ${la[i] ?? '(nada)'}`);
        console.log(`        ahora : ${lb[i] ?? '(nada)'}`);
        dichas++;
    }
}
console.log('');
process.exit(1);
