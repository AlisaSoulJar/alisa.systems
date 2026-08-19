/**
 * fichas.js — la ficha de dominó, y cómo se coloca una cadena
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *     const f = crearFicha(THREE, '6-3');       // una ficha, tumbada
 *     const sitios = disponerCadena(['6-3','3-3','3-1']);
 *
 * ⚠️ POR QUÉ ESTO ES DISTINTO A `dados.js` Y A `tapete.js`
 *
 * Un dado se dibuja donde le digas. Una carta también. Una ficha de dominó NO: su
 * sitio depende de la que tiene al lado, y la forma de la cadena entera sale de cómo
 * se jugó, no de una matriz declarada. Es la primera geometría de la casa que no se
 * puede escribir de antemano.
 *
 * Por eso hay dos cosas aquí y no una: el OBJETO (`crearFicha`) y la COLOCACIÓN
 * (`disponerCadena`). La segunda es la que no teníamos.
 *
 * ⚠️ LOS DOBLES SE CRUZAN, Y NO ES ADORNO.
 *
 * En una mesa de verdad el doble se pone atravesado. Sirve para algo: marca a simple
 * vista dónde está, y como ocupa la mitad de largo, la cadena cabe más. Aquí se hace
 * igual porque además es lo que espera cualquiera que haya jugado — y una cadena donde
 * el doble va en línea se lee mal sin saber por qué.
 */

/** Una ficha tumbada: el doble de larga que ancha, como la de verdad. */
export const LARGO = 0.86;
export const ANCHO = 0.43;
const GRUESO = 0.10;

const valoresDe = (id) => String(id).replace(/^f:/, '').split('-').map(Number);

/** ¿Este item del sustrato es una ficha? El vocabulario es `f:a-b`. */
export const esFicha = (id) => /^f:\d+-\d+$/.test(String(id));
export const valoresDeFicha = (id) => valoresDe(id);
export const esDoble = (id) => { const [a, b] = valoresDe(id); return a === b; };

/**
 * La cara de la ficha, pintada: dos mitades con sus puntos y la raya en medio.
 * Se dibuja en un lienzo por lo mismo que los dados — doce puntos son doce arcos y
 * no doce mallas— y además así la raya divisoria es una línea y no un objeto.
 */
function caraDeFicha(a, b, { fondo = '#f6f3ec', punto = '#1b1b20' } = {}) {
    const W = 320, H = 160;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');

    g.fillStyle = fondo;
    g.beginPath();
    if (g.roundRect) g.roundRect(0, 0, W, H, 18); else g.rect(0, 0, W, H);
    g.fill();

    // La raya del medio, sin llegar a los bordes: así se lee como una ficha y no
    // como dos azulejos pegados.
    g.strokeStyle = 'rgba(27,27,32,0.55)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(W / 2, 16);
    g.lineTo(W / 2, H - 16);
    g.stroke();

    /** Las nueve posiciones de media ficha; son las mismas que en un dado. */
    const mitad = (ox, n) => {
        const s = H;                       // cada mitad es cuadrada
        const a1 = ox + s * 0.26, m = ox + s * 0.5, b1 = ox + s * 0.74;
        const y1 = s * 0.26, ym = s * 0.5, y2 = s * 0.74;
        const SITIOS = {
            0: [],
            1: [[m, ym]],
            2: [[a1, y1], [b1, y2]],
            3: [[a1, y1], [m, ym], [b1, y2]],
            4: [[a1, y1], [b1, y1], [a1, y2], [b1, y2]],
            5: [[a1, y1], [b1, y1], [m, ym], [a1, y2], [b1, y2]],
            6: [[a1, y1], [b1, y1], [a1, ym], [b1, ym], [a1, y2], [b1, y2]],
        };
        g.fillStyle = punto;
        for (const [x, y] of (SITIOS[n] ?? [])) {
            g.beginPath();
            g.arc(x, y, s * 0.075, 0, Math.PI * 2);
            g.fill();
        }
    };
    mitad(0, a);
    mitad(H, b);
    return c;
}

/**
 * @param {object} THREE
 * @param {string} id      `f:6-3` o `6-3`
 * @returns {object} un `THREE.Mesh` tumbado, con la cara arriba y `a` a la izquierda
 */
export function crearFicha(THREE, id) {
    const [a, b] = valoresDe(id);
    const tex = new THREE.CanvasTexture(caraDeFicha(a, b));
    tex.anisotropy = 4;

    const canto = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.5 });
    const cara = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.03 });
    // El orden de `BoxGeometry`: [+X, −X, +Y, −Y, +Z, −Z]. La cara mira al cielo.
    const materiales = [canto, canto, cara, canto, canto, canto];

    const f = new THREE.Mesh(new THREE.BoxGeometry(LARGO, GRUESO, ANCHO), materiales);
    f.castShadow = f.receiveShadow = true;
    f.name = `p:ficha:${a}-${b}`;
    return f;
}

/**
 * ⚠️ DÓNDE VA CADA FICHA DE LA CADENA. AQUÍ ESTÁ LO QUE NO TENÍAMOS.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * La cadena se va colocando en línea y, cuando se pasa de largo, DOBLA. No es un
 * adorno: sin doblar, una partida entera son veintiocho fichas en fila —más de veinte
 * unidades— y no cabe en ninguna mesa ni en ninguna pantalla sin alejar la cámara
 * hasta que no se lean los puntos.
 *
 * Se serpentea: derecha hasta el límite, un paso hacia el jugador, izquierda hasta el
 * límite, y así. Es lo que hace cualquiera en una mesa pequeña, y tiene la propiedad
 * de que la cadena crece hacia ti en vez de alejarse.
 *
 * ⚠️ Y EL DOBLE OCUPA LA MITAD, porque va cruzado. Si se le diera el mismo hueco que a
 * los demás quedaría un espacio muerto a cada lado y la cadena se leería rota.
 *
 * Devuelve, por ficha, `{ x, z, rot }` en coordenadas del grupo. No dibuja nada: eso
 * es de quien pinte, que puede ser esta mesa o cualquier otra.
 *
 * @param {string[]} ids   las fichas, de punta izquierda a punta derecha
 * @param {object} [opts]
 * @param {number} [opts.ancho]  cuánto puede crecer antes de doblar, en unidades
 */
export function disponerCadena(ids, opts = {}) {
    const anchoMax = opts.ancho ?? 6.2;
    const sitios = [];
    // Se arranca a la izquierda del todo para que la cadena quede centrada de largo.
    let x = -anchoMax / 2, z = 0, sentido = 1;

    for (const id of ids) {
        const doble = esDoble(id);
        const paso = doble ? ANCHO : LARGO;

        // ¿Cabe en esta fila? Si no, se dobla antes de poner, no después: doblar
        // después dejaría la ficha a caballo del giro.
        if (Math.abs(x + paso * sentido) > anchoMax / 2 + 0.001) {
            sentido *= -1;
            z += ANCHO * 1.9;              // una fila más cerca del jugador
            x += (paso / 2) * sentido;
        }

        sitios.push({
            x: x + (paso / 2) * sentido,
            z,
            // Tumbada en el sentido de la marcha; el doble, cruzado.
            rot: doble ? Math.PI / 2 : 0,
        });
        x += paso * sentido;
    }
    return sitios;
}
