/**
 * mueble.js — la mesa redonda de ALISA, en un solo sitio
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *     const mesa = crearMesaRedonda(THREE);
 *     escena.add(mesa);            // tapa, pie y tres taburetes
 *
 * ⚠️ POR QUÉ EXISTE
 *
 * Esta mesa estaba escrita DOS VECES: en `rooms/room_sala_del_huevo.html`, donde te
 * sientas, y en `arcade/sala.html`, la sala de bolsillo a la que te lleva sentarte.
 * Las dos con los mismos números —tapa Ø3,0 × 0,11 a 0,92 de alto, pie Ø0,68 cónico,
 * tres taburetes Ø0,6 a 2,5 del centro— y por eso mismo es fácil no verlo.
 *
 * Ya se separaron una vez: `sala.html` lo confiesa en su propio comentario, que la
 * tapa era `#d8d4e0` contra `#ffffff` y el pie `#241f2b` contra `#1b232e`, y que hubo
 * que **recorrer las dos escenas comparando malla a malla** para volver a igualarlas.
 *
 * Y cuando fui a mirar, seguían siendo distintas: los colores sí se habían copiado,
 * pero el ACABADO no. La Sala del Huevo pinta con `roughness 0.55 / metalness 0.06` y
 * la de bolsillo con `roughness 0.85` y sin metal. O sea que la reconciliación a mano
 * arregló lo que se comparó y dejó lo que no se miró — que es lo que siempre pasa con
 * una lista mantenida a mano, y por eso esto es una pieza y no una tercera copia.
 *
 * ⚠️ LOS VALORES SON LOS DE LA SALA DEL HUEVO, y no por antigüedad: es la sala donde
 * estás DE PIE y donde la mesa se ve entera. La de bolsillo declara explícitamente
 * estar copiada de allí, así que allí está el original.
 *
 * ⚠️ LO QUE NO ENTRA AQUÍ: el tapete y la baraja física. El tapete ya es una pieza
 * (`tapete.js`) y la baraja vive en `ArcadeTableRoomFactory`. Esto es sólo el mueble;
 * lo que se pone encima lo decide cada sala, que es lo que las diferencia de verdad.
 *
 * ⚠️ Y NO SE USA `ArcadeTableRoomFactory` PARA ESTO, aunque suene a que debería.
 * Esa fábrica monta DOS mesas rectangulares clavadas en x=±2,5, con sus luces, su
 * click global y una cámara de órbita, a partir de un GLB. La Sala del Huevo ya lo
 * estudió y lo dejó escrito: «de esta factory NO uso la sala, pero sí sus piezas».
 * Tragarse una sala entera para sacarle una mesa es peor que tener la mesa aparte.
 */

/** El original vive en la Sala del Huevo; estos son sus números, medidos de allí. */
export const MESA = {
    tapa:      { radio: 1.5,  alto: 0.11, y: 0.92, lados: 40 },
    pie:       { arriba: 0.16, abajo: 0.34, alto: 0.92, y: 0.46, lados: 20 },
    taburete:  { radio: 0.3,  alto: 0.5,  y: 0.25, lados: 16, distancia: 2.5, cuantos: 3 },
    claro:     { color: 0xffffff, roughness: 0.55, metalness: 0.06 },
    oscuro:    { color: 0x1b232e, roughness: 0.42, metalness: 0.22 },
};

/**
 * @param {object} THREE  el módulo, que se pasa en vez de importarse: este fichero lo
 *                        cargan páginas con tres versiones distintas de three (r128,
 *                        r160, r170) y una importación fija las obligaría a todas a la
 *                        misma. Es el mismo trato que ya tiene `tapete.js`.
 * @param {object} [opts]
 * @param {number} [opts.angulo] desfase de los taburetes, en radianes. La Sala del
 *                 Huevo los reparte con su propio azar sembrado para que dos mesas no
 *                 salgan calcadas; la de bolsillo no tiene por qué.
 * @returns {object} un `THREE.Group` con la tapa, el pie y los taburetes.
 */
export function crearMesaRedonda(THREE, opts = {}) {
    const g = new THREE.Group();
    g.name = 'mesa-redonda';

    const claro = new THREE.MeshStandardMaterial(MESA.claro);
    const oscuro = new THREE.MeshStandardMaterial(MESA.oscuro);

    const t = MESA.tapa;
    const tapa = new THREE.Mesh(
        new THREE.CylinderGeometry(t.radio, t.radio, t.alto, t.lados), claro);
    tapa.position.y = t.y;
    // La tapa recibe Y proyecta: es la que hace la sombra sobre el suelo, y sin
    // `castShadow` la mesa flota aunque esté a la altura correcta.
    tapa.castShadow = tapa.receiveShadow = true;
    tapa.name = 'mesa-tapa';
    g.add(tapa);

    const p = MESA.pie;
    const pie = new THREE.Mesh(
        new THREE.CylinderGeometry(p.arriba, p.abajo, p.alto, p.lados), oscuro);
    pie.position.y = p.y;
    pie.name = 'mesa-pie';
    g.add(pie);

    const s = MESA.taburete;
    const desfase = opts.angulo ?? 0;
    for (let i = 0; i < s.cuantos; i++) {
        const a = (i / s.cuantos) * Math.PI * 2 + desfase;
        const tab = new THREE.Mesh(
            new THREE.CylinderGeometry(s.radio, s.radio, s.alto, s.lados), claro);
        tab.position.set(Math.cos(a) * s.distancia, s.y, Math.sin(a) * s.distancia);
        tab.castShadow = true;
        tab.name = `mesa-taburete-${i}`;
        g.add(tab);
    }
    return g;
}
