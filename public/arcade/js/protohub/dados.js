/**
 * dados.js — un dado de verdad, en un solo sitio
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *     const d = crearDado(THREE, 5);      // un cinco, mirando arriba
 *     escena.add(d);
 *
 * ⚠️ POR QUÉ EXISTE
 *
 * Los dados estaban en el SUSTRATO y no existían como OBJETO. Los tres juegos que los
 * usan publican exactamente el mismo vocabulario —`d6_5` dentro de una zona— y ninguno
 * de los dos pintores sabía qué hacer con él:
 *
 *   · generala  zona `dados` con cinco items → `mesa_cartas.mjs` los dibujaba como
 *               NAIPES, cinco cartas blancas con un interrogante.
 *   · parchís   zona `dado` con un item      → `mesa_tablero.mjs` no menciona `zonas`
 *   · oca       zona `dado` con un item        ni una vez, así que el dado que acabas
 *                                              de tirar no aparecía en ninguna parte.
 *
 * Lo segundo es lo grave: puedes ver el tablero, ver tu ficha moverse, y no ver nunca
 * el número que te ha tocado. La información existía, estaba publicada, y no se
 * dibujaba — que es justo la asimetría que este proyecto persigue.
 *
 * ⚠️ ES UN DADO, NO UNA IMAGEN DE UN DADO.
 *
 * Las seis caras están donde deben: las opuestas suman siete (1-6, 2-5, 3-4). Eso no
 * es pedantería de aficionado: si mirases el dado desde otro ángulo —y en una mesa 3D
 * se puede orbitar— un dado con las caras mal puestas se nota, y un dado que se nota
 * falso rompe la mesa entera. Poner el valor arriba se hace GIRÁNDOLO, como se giraría
 * uno de verdad, no repintando la cara de encima.
 *
 * ⚠️ Y THREE VA POR PARÁMETRO, como en `tapete.js` y `mueble.js`: esto lo cargan
 * páginas con tres versiones distintas del motor y una importación fija las obligaría
 * a todas a la misma.
 */

/** Cuánto mide el dado, en unidades del mundo. Un naipe del arcade mide 1,2 de ancho. */
export const LADO = 0.62;

/**
 * La cara, pintada. Se dibuja en un lienzo en vez de colocar esferas por dos motivos:
 * un dado son seis texturas y no ciento veintiséis mallas, y los puntos quedan
 * clavados al plano de la cara sin tener que calcular su posición en 3D.
 */
function caraDeDado(valor, { fondo = '#f4f1ea', punto = '#1a1a1f' } = {}) {
    const N = 160;
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d');

    // El marfil con una esquina redondeada: un cuadrado perfecto se lee como azulejo.
    g.fillStyle = fondo;
    g.beginPath();
    if (g.roundRect) g.roundRect(0, 0, N, N, N * 0.14);
    else g.rect(0, 0, N, N);
    g.fill();

    // Las nueve posiciones de una cara. Un dado sólo usa estas, y siempre las mismas.
    const a = N * 0.26, m = N * 0.5, b = N * 0.74;
    const SITIOS = {
        1: [[m, m]],
        2: [[a, a], [b, b]],
        3: [[a, a], [m, m], [b, b]],
        4: [[a, a], [b, a], [a, b], [b, b]],
        5: [[a, a], [b, a], [m, m], [a, b], [b, b]],
        6: [[a, a], [b, a], [a, m], [b, m], [a, b], [b, b]],
    };
    g.fillStyle = punto;
    for (const [x, y] of (SITIOS[valor] ?? [])) {
        g.beginPath();
        g.arc(x, y, N * 0.085, 0, Math.PI * 2);
        g.fill();
    }
    return c;
}

/**
 * ⚠️ EL ORDEN DE LAS CARAS LO MANDA `BoxGeometry`, NO YO.
 *
 * Sus materiales van [+X, −X, +Y, −Y, +Z, −Z]. Con el 1 arriba y el 2 al frente —que es
 * como se fotografía un dado— las opuestas suman siete solas.
 */
const CARAS = [3, 4, 1, 6, 2, 5];

/**
 * Cómo hay que girar el dado para que un valor mire hacia arriba. Se gira el objeto
 * entero, así que las otras cinco caras acaban donde les toca sin tocarlas.
 */
const GIRO = {
    1: [0, 0, 0],
    6: [Math.PI, 0, 0],
    2: [-Math.PI / 2, 0, 0],        // el +Z sube
    5: [Math.PI / 2, 0, 0],
    3: [0, 0, Math.PI / 2],         // el +X sube
    4: [0, 0, -Math.PI / 2],
};

/**
 * @param {object} THREE
 * @param {number|string} valor  1..6, o `'?'`/`null` para un dado sin tirar
 * @param {object} [opts]
 * @param {number} [opts.lado]   tamaño; por defecto `LADO`
 * @returns {object} un `THREE.Mesh` con el valor pedido mirando arriba
 */
export function crearDado(THREE, valor, opts = {}) {
    const lado = opts.lado ?? LADO;
    const v = Number(valor);
    const conocido = Number.isInteger(v) && v >= 1 && v <= 6;

    const materiales = CARAS.map((n) => {
        // Sin tirar, todas las caras van en blanco: un dado boca abajo no enseña un
        // interrogante, no enseña nada. Es más honesto y se lee igual.
        const tex = new THREE.CanvasTexture(caraDeDado(conocido ? n : 0));
        tex.anisotropy = 4;
        return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.04 });
    });

    const d = new THREE.Mesh(new THREE.BoxGeometry(lado, lado, lado), materiales);
    d.castShadow = d.receiveShadow = true;
    d.name = conocido ? `p:dado:${v}` : 'p:dado:?';

    const [rx, ry, rz] = GIRO[conocido ? v : 1];
    d.rotation.set(rx, ry, rz);
    return d;
}

/** ¿Este item del sustrato es un dado? El vocabulario es `d6_N`, y lo usan los tres. */
export const esDado = (id) => /^d\d+_/.test(String(id));

/** El valor que lleva dentro, o `null` si aún no se ha tirado (`d6_?`). */
export const valorDeDado = (id) => {
    const n = Number(String(id).split('_')[1]);
    return Number.isInteger(n) ? n : null;
};
