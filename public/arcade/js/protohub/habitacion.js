/**
 * habitacion.js — poner la mesa DENTRO de un sitio
 * ═══════════════════════════════════════════════════════════════════════════
 *     import { amueblar } from './protohub/habitacion.js';
 *     amueblar(scene, { radio: 14 });
 *
 * ⚠️ QUÉ RESUELVE, QUE NO ES DECORACIÓN.
 *
 * Hoy hay dos cosas que no se tocan: salas 3D preciosas SIN juego dentro
 * (`room_pocket_blanco`, `room_sovereign_casino`) y juegos que funcionan
 * flotando en un vacío negro (`entropy.html`). El cruce —una mesa de verdad, en
 * un sitio, con la partida jugándose encima— no existía.
 *
 * Esto es el paso pequeño hacia eso: amueblar la escena que el juego YA tiene.
 * No hace falta que el motor deje de ser dueño de su escena, que es el cambio
 * grande; sólo que lo que dibuja esté rodeado de algo.
 *
 * ⚠️ Y POR QUÉ NO SE REUSA `ArcadeTableRoomFactory`.
 *
 * Existe, y hace casi esto — pero carga `Table.glb` y pone DOS mesas fijas en
 * x=±2.5, porque su trabajo es montar un salón de arcade entero. Aquí ya hay una
 * mesa dibujada por el juego, en el sitio que el juego decide. Meter la factory
 * traería una segunda mesa atravesando la primera.
 *
 * Lo que sí se le copia es la iluminación, que es lo que hace que una habitación
 * parezca un sitio y no un decorado: hemisférica de relleno más una direccional
 * que proyecta sombra.
 *
 * ⚠️ TODO ES GEOMETRÍA PROCEDURAL, CERO DESCARGAS.
 * Seis mallas y ninguna textura. Una sala que tarda en aparecer no es una sala:
 * es un juego que empieza tarde, y esto se abre desde un enlace que alguien
 * comparte por el móvil.
 */

/** Suelo de madera oscura, paredes en penumbra: que la mesa sea lo que se ve. */
const SUELO = 0x2b211c;
const PARED = 0x191521;
const TECHO = 0x120f18;

/**
 * Amuebla una escena alrededor del origen.
 *
 * @param {THREE.Scene} scene
 * @param {object} [opciones]
 *   radio  cuánto se aleja la pared del centro
 *   alto   del suelo al techo
 * @returns {{piezas: THREE.Object3D[], quitar: () => void}}
 */
/**
 * ⚠️ LA SALA TIENE QUE CONTENER A LA CÁMARA, Y ESO NO ES OBVIO.
 *
 * La primera versión medía 15 de radio y 6,5 de alto — proporciones de una
 * habitación de verdad. Pero la cámara de la mesa mira desde (0, 9,5, 12,5): a
 * NUEVE de altura, o sea **por encima del techo**, y a 12,5 del centro con la
 * pared a 15. Estabas fuera de tu propia sala, mirando hacia dentro a través de
 * un techo que sólo era invisible por casualidad (el culling de una cara).
 *
 * No se vio mirando, se vio midiendo: comparar dónde está la cámara con dónde
 * está el techo. Un decorado que no contiene al que mira no es un sitio.
 *
 * Estos números salen de esa cuenta, no del gusto: la mesa mide 20 de ancho, la
 * cámara se aleja 12,5 y sube 9,5, así que la sala va holgada por encima de las
 * dos cosas.
 */
export function amueblar(scene, { radio = 24, alto = 15 } = {}) {
    const piezas = [];
    const añadir = (m) => { scene.add(m); piezas.push(m); return m; };

    // ── El sitio ──────────────────────────────────────────────────────────
    // Un cilindro en vez de cuatro paredes: una esquina obliga a decidir hacia
    // dónde mira la sala, y aquí se mira desde cualquier silla.
    añadir(new THREE.Mesh(
        new THREE.CircleGeometry(radio, 48),
        new THREE.MeshStandardMaterial({ color: SUELO, roughness: 0.95 })
    )).rotation.x = -Math.PI / 2;

    const muro = añadir(new THREE.Mesh(
        new THREE.CylinderGeometry(radio, radio, alto, 48, 1, true),
        new THREE.MeshStandardMaterial({ color: PARED, roughness: 1, side: THREE.BackSide })
    ));
    muro.position.y = alto / 2;

    const techo = añadir(new THREE.Mesh(
        new THREE.CircleGeometry(radio, 48),
        new THREE.MeshStandardMaterial({ color: TECHO, roughness: 1 })
    ));
    techo.rotation.x = Math.PI / 2;
    techo.position.y = alto;

    // ── La luz ────────────────────────────────────────────────────────────
    // La lámpara se ve, y eso importa: una luz que cae de ninguna parte deja la
    // escena con aspecto de maqueta. Con la pantalla colgando, el ojo entiende
    // de dónde viene la sombra que hay sobre la mesa.
    // Cuelga BAJO, sobre la mesa — no pegada al techo. Con la sala alta, una
    // lámpara arriba del todo queda fuera del encuadre y no ilumina nada que se
    // vea. Ésta baja hasta justo encima de la cámara.
    const alturaLampara = 11.5;

    const lampara = añadir(new THREE.Mesh(
        new THREE.ConeGeometry(3.2, 1.8, 24, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x2a2233, roughness: 0.8, side: THREE.DoubleSide })
    ));
    lampara.position.y = alturaLampara;

    const cable = añadir(new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, alto - alturaLampara, 8),
        new THREE.MeshBasicMaterial({ color: 0x2a2233 })
    ));
    cable.position.y = alturaLampara + (alto - alturaLampara) / 2;

    // El bombillo, visible bajo la pantalla: el foco de la mesa sale de aquí.
    añadir(new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xfff2d0 })
    )).position.y = alturaLampara - 0.75;

    /**
     * ⚠️ Y LA NIEBLA SE PONE AQUÍ, PERO SE GUARDA LA DE ANTES.
     *
     * El motor de cartas trae su propia niebla, calibrada para una mesa
     * flotando en negro: con paredes a quince unidades se las come enteras y la
     * sala vuelve a parecer el vacío del que veníamos.
     *
     * Se sustituye por una que llega hasta la pared, y se devuelve cómo
     * deshacerlo — porque `quitar()` que no deja la escena como estaba no es
     * quitar, es dejar otra cosa.
     */
    const nieblaPrevia = scene.fog;
    scene.fog = new THREE.Fog(PARED, radio * 0.75, radio * 2.1);

    return {
        piezas,
        quitar() {
            for (const p of piezas) {
                scene.remove(p);
                p.geometry?.dispose?.();
                p.material?.dispose?.();
            }
            piezas.length = 0;
            scene.fog = nieblaPrevia;
        },
    };
}
