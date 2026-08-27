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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA PALETA ES LA DE LA SALA DEL HUEVO, Y NO ES UNA ELECCIÓN DE GUSTO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Encargo de Oscar, en una frase: «la idea es que CUELE que estás en la sala del
 * huevo y te sientas en una mesa». Esa sala es por donde se entra: se anda por
 * ella, se pincha una mesa y te abduce a pantalla completa. Si al sentarte
 * cambias de mundo, el truco se rompe en el mismo momento en que empieza.
 *
 * Y se estaba rompiendo. Aquí ponía «suelo de madera oscura, paredes en penumbra»
 * — una taberna. Medido en `room_sala_del_huevo.html`, la sala de al lado es lo
 * contrario:
 *
 *     niebla        FogExp2(0xe6ebf0)      azul-gris muy claro
 *     luz           Hemisphere(0xffffff, 0xdfe6ec, 3.1) + direccional 1.5
 *     superficies   0xffffff con roughness 0.82
 *     lo oscuro     0x1b232e — las máquinas, no las paredes
 *     acentos       0x4fd0ff cian y 0xffaa00 ámbar
 *
 * O sea: blanca, fría y muy iluminada, con lo oscuro reservado a los objetos. Al
 * sentarte a una mesa aterrizabas en un cuarto marrón sin ventanas.
 *
 * Estos tres colores salen de esa medida, no de mi gusto. El techo se pinta del
 * color de la niebla a propósito, para que se deshaga en ella en vez de cerrar
 * una tapa — que es lo que hace la sala grande y por lo que no parece una caja.
 *
 * ⚠️ Y LA NIEBLA VIENE GRATIS: más abajo se monta con `PARED`, así que aclarar la
 * pared aclara la niebla sin tocar una línea más. Eso ya estaba bien pensado.
 */
const SUELO = 0xd4dee6;   // el gris azulado claro de la sala
const PARED = 0xe6ebf0;   // el color de su niebla: la pared se funde con el fondo
const TECHO = 0xf4f6f8;   // el blanco de sus paneles

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
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA MESA DE VERDAD, LA MISMA QUE LA SALA DEL HUEVO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Oscar, por el buzón y dos veces —en brisca y en entropy—: «el tapete se ve raro,
 * ¿no debería ser una mesa como las de la sala del huevo?». Y lo remató: «eso lo
 * teníamos solucionado con las salas pocket».
 *
 * Lo teníamos. `room_sala_del_huevo.html` y `room_pocket_blanco.html` montan
 * `/props/models/Table.glb`, y aquí había un cilindro verde de 20 de diámetro con
 * un torus de madera haciendo de canto. Ocho líneas que «cuestan poco y se notan
 * enteras», dice el comentario de al lado — y se notan, pero no en la buena.
 *
 * ⚠️ Y LA MESA VA DEBAJO DEL FIELTRO, NO EN VEZ DE.
 *
 * Una mesa de casino es madera Y tapete: el verde es la superficie de juego y hace
 * falta para que una carta blanca se lea. Así que el modelo se mete por debajo y el
 * fieltro se queda donde está, que además es ovalado a propósito —una mesa redonda
 * deja las manos de arriba y abajo demasiado lejos en pantalla, y eso ya está
 * medido en `mesa_cartas.mjs`.
 *
 * ⚠️ SI EL MODELO NO LLEGA, NO PASA NADA.
 *
 * Devuelve `null` y quien llama se queda con lo que tenía. Un fichero que no carga
 * no puede dejar la mesa sin superficie: se juega con lo que hay, más feo.
 *
 * @param {THREE.Scene} scene
 * @param {object} med  `ancho` y `largo` del hueco que tiene que ocupar, y la `y`
 *                      de su TAPA — no de su base: lo que importa es dónde se
 *                      apoyan las cartas.
 * @returns {Promise<THREE.Object3D|null>}
 */
export async function ponerMesaDeVerdad(scene, { ancho = 20, largo = 12, y = -0.2 } = {}) {
    /**
     * ⚠️ SE CARGA CON EL `GLTFLoader` DE r128, NO CON EL `AssetManager` DEL MOTOR.
     *
     * Lo intenté primero con `AssetManager.loadModelAsync`, que es lo que usan las
     * salas, y falla siempre: ese gestor no sabe leer un `.glb` por su cuenta —
     * espera que alguien le registre un cargador con `setGLTFDelegate`, y quien se
     * lo registra es un plugin del motor nuevo que estas páginas no cargan.
     *
     * Y no se puede cargar sin más: las salas corren three 0.160 como módulos y el
     * arcade corre **three r128** como global. Su `GLTFLoader` de `examples/jsm`
     * importa `three` por su nombre y aquí no hay nada que resolverlo.
     *
     * Lo que sí encaja está en el vendor desde siempre:
     * `/vendor/three-r128/GLTFLoader.js`, un script clásico que cuelga
     * `THREE.GLTFLoader` del global que esta página ya tiene. Es el cargador de
     * este mundo; el otro es el del de al lado.
     */
    if (!THREE.GLTFLoader) {
        try {
            await new Promise((listo, falla) => {
                const s = document.createElement('script');
                s.src = '/vendor/three-r128/GLTFLoader.js';
                s.onload = listo;
                s.onerror = () => falla(new Error('no se pudo cargar GLTFLoader'));
                document.head.appendChild(s);
            });
        } catch (e) {
            console.warn('[Mesa] sin GLTFLoader; se usa la mesa dibujada:', e.message);
            return null;
        }
    }
    if (!THREE.GLTFLoader) return null;

    let modelo;
    try {
        const gltf = await new Promise((listo, falla) => {
            new THREE.GLTFLoader().load('/props/models/Table.glb', listo, undefined, falla);
        });
        modelo = gltf.scene ?? gltf.scenes?.[0] ?? null;
    } catch (e) {
        console.warn('[Mesa] no se pudo cargar Table.glb; se usa la dibujada:', e?.message ?? e);
        return null;
    }
    if (!modelo) return null;

    /**
     * Se escala por la HUELLA y no por la altura, al revés que en las salas.
     *
     * Allí la referencia es una persona —una mesa mide 0,95 y punto—, aquí no hay
     * personas: hay un fieltro de veinte de ancho que tiene que quedar tapado. Una
     * mesa a escala de metros dentro de esta escena sería una miniatura debajo de un
     * lago verde.
     */
    const caja = new THREE.Box3().setFromObject(modelo);
    const t = caja.getSize(new THREE.Vector3());

    /**
     * ⚠️ SE ESCALA CADA EJE POR SU LADO, Y SÍ, ESO DEFORMA LA MESA.
     *
     * Primero lo hice uniforme por el lado que más creciera, que es lo correcto
     * cuando quieres respetar la forma de un objeto. Medido: salía **33,8 de ancho
     * para un fieltro de 20**. El modelo es proporcionalmente más estrecho de fondo
     * que el hueco, así que cubrir el fondo lo desbordaba a lo ancho — una mesa
     * enorme con un mantelito verde en medio.
     *
     * El fieltro es ovalado a propósito, y no hay ninguna mesa de verdad con esa
     * proporción: un óvalo de póker ES una mesa estirada. Así que se estira. Las
     * patas quedan algo más anchas de lo que su autor dibujó, y desde una cámara
     * que mira desde arriba en ángulo eso no se ve; una mesa que no coincide con su
     * tapete se ve desde el primer momento, y es justo lo que había que arreglar.
     */
    modelo.scale.set(ancho / (t.x || 1), 1, largo / (t.z || 1));
    // La altura, aparte y uniforme con la anchura: si se dejara a 1 la mesa se
    // quedaría del grosor del modelo original mientras la tapa mide veinte.
    modelo.scale.y = modelo.scale.x;

    // Y se cuelga por su TAPA: se vuelve a medir después de escalar, porque el
    // tamaño de antes ya no vale, y se baja hasta que su cara superior toque la `y`
    // pedida. Medir una vez y escalar después es cómo se acaba con una mesa
    // flotando o enterrada, y no se ve hasta que se mira de lado.
    const caja2 = new THREE.Box3().setFromObject(modelo);
    modelo.position.y += y - caja2.max.y;

    modelo.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = true; } });
    scene.add(modelo);
    return modelo;
}

export function amueblar(scene, { radio = 24, alto = 15, hondo = 7 } = {}) {
    const piezas = [];
    const añadir = (m) => { scene.add(m); piezas.push(m); return m; };

    /**
     * ⚠️ EL SUELO VA POR DEBAJO DE LA MESA. AQUÍ ESTABA EL «TAPETE HACE COSAS
     * RARAS», Y LLEVABA MESES.
     *
     * El suelo estaba en `y = 0`. La tapa del fieltro está en `y = 0` TAMBIÉN. Dos
     * superficies exactamente coplanares: la tarjeta gráfica no puede decidir cuál
     * va delante y elige distinto en cada trozo. Y como este suelo es un
     * `CircleGeometry(radio, 48)`, sus trozos son cuarenta y ocho triángulos que
     * salen del centro — así que el desastre sale con forma de abanico.
     *
     * Eso es exactamente lo que Oscar reportó dos veces, en brisca y en entropy:
     * «el tapete hace cosas raras». Cuñas verdes y marrones alternándose desde el
     * centro. El marrón era ESTE suelo, `0x2b211c`, asomando a través del fieltro.
     *
     * Lo busqué antes en la mesa, en las normales del cilindro y en las sombras del
     * foco — tres hipótesis, tres arreglos, cero cambios en la captura. Lo encontró
     * abrir la misma página con `?sitio=no`: sin habitación se ve perfecta. No era
     * la mesa; era el cuarto donde la habíamos metido.
     *
     * `hondo` es cuánto queda la mesa por encima del suelo, que es lo que hace una
     * mesa. Y la habitación entera baja con él: las paredes tienen que arrancar del
     * suelo, no de donde estaban.
     */
    const ySuelo = -hondo;

    // ── El sitio ──────────────────────────────────────────────────────────
    // Un cilindro en vez de cuatro paredes: una esquina obliga a decidir hacia
    // dónde mira la sala, y aquí se mira desde cualquier silla.
    const suelo = añadir(new THREE.Mesh(
        new THREE.CircleGeometry(radio, 48),
        new THREE.MeshStandardMaterial({ color: SUELO, roughness: 0.95 })
    ));
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.y = ySuelo;

    const muro = añadir(new THREE.Mesh(
        new THREE.CylinderGeometry(radio, radio, alto, 48, 1, true),
        new THREE.MeshStandardMaterial({ color: PARED, roughness: 1, side: THREE.BackSide })
    ));
    muro.position.y = ySuelo + alto / 2;

    const techo = añadir(new THREE.Mesh(
        new THREE.CircleGeometry(radio, 48),
        new THREE.MeshStandardMaterial({ color: TECHO, roughness: 1 })
    ));
    techo.rotation.x = Math.PI / 2;
    techo.position.y = ySuelo + alto;

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
        new THREE.MeshStandardMaterial({ color: 0x1b232e, roughness: 0.8, side: THREE.DoubleSide })
    ));
    lampara.position.y = alturaLampara;

    const cable = añadir(new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, alto - alturaLampara, 8),
        new THREE.MeshBasicMaterial({ color: 0x1b232e })
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
