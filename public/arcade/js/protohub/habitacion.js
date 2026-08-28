import { montarSitio } from './render/sitio.js';

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

/**
 * EL MANIFIESTO DE LA MESA DE CARTAS.
 *
 * ⚠️ ESTA FUNCIÓN ERA CIENTO CINCUENTA LÍNEAS QUE CONSTRUÍAN LA SALA A MANO.
 *    AHORA LA DECLARA, Y ESA ES TODA LA DIFERENCIA.
 *
 * Lo que había aquí montaba suelo, rejilla, luz, niebla y revelado con los
 * números escritos dentro. Funcionaba, y no se podía hacer nada con ello: para
 * un ambiente nuevo había que escribir otra función igual.
 *
 * Ahora esto devuelve una LISTA DE PIEZAS y quien las monta es
 * `render/sitio.js`. La consecuencia es la que buscábamos: **un sitio nuevo
 * cuesta un fichero, no una función** — si sus piezas ya existen, no se toca
 * código.
 *
 * ⚠️ Y LOS NÚMEROS SIGUEN SALIENDO DE `radio`, QUE NO ES PEREZA.
 *
 * Podría escribir 336 y 672 directamente. Pero la relación entre ellos es lo que
 * hace que la sala se sienta la misma que el hall: allí una casilla de rejilla
 * mide lo que una mesa, y aquí `radio * 28 / 42` da exactamente eso. Escribir los
 * números sueltos perdería el motivo, y un número sin motivo es el que alguien
 * cambia el mes que viene sin saber qué rompe.
 *
 * El paso siguiente —cuando el editor exista— es que este objeto se lea de un
 * JSON en vez de calcularse. La forma ya es la buena; sólo cambia de dónde viene.
 */
/**
 * ⚠️ ESTA FUNCIÓN SIRVE A LAS DOS SALAS, Y ES EL «TERCER CICLO» DE LAS DOS QUE
 *    HABÍA. CADA UNA TRAÍA ALGO MEJOR.
 *
 * Había dos habitaciones escritas por separado y casi iguales: ésta, y otra a
 * mano dentro de `arcade/sala.html`. Comparadas pieza a pieza:
 *
 *                    sala.html (a mano)        habitacion.js (manifiesto)
 *     suelo          CircleGeometry(55)        radio × 14
 *     rejilla        110/55 → 2 m              casilla 20 → 2 m
 *     hemisférico    2,4                       2,4
 *     cenital        2,2 desde (-2,5·8·6)      2,2, misma dirección
 *     revelado       ACES 1,02 + PMREM         ACES 1,02 + PMREM
 *     NIEBLA         lineal 12 → 50            exponencial 0,00062
 *
 * Todo coincidía menos la niebla, y ahí la de `sala.html` estaba MEJOR RAZONADA,
 * con la medida escrita al lado: con la exponencial, a 6,5 m —el tope de la
 * rueda— ya hay un 12 % de blanco encima de las cartas, para no disolver ningún
 * horizonte, porque a esa distancia no hay horizonte que disolver. La lineal deja
 * cero niebla donde se juega y se come el borde del suelo antes del plano lejano.
 *
 * Y de aquí lo bueno era lo contrario: que todo salga de un parámetro, así que la
 * sala escala sola en vez de tener los números sueltos.
 *
 * El tercero se queda con las dos cosas: la forma de la niebla se DECLARA —con su
 * motivo— y todo lo demás se deriva. Y de paso desaparece la segunda habitación:
 * las dos salas piden ahora el mismo manifiesto con distintos números.
 *
 * @param {object} [o]
 *   suelo       radio del suelo, en unidades de ESTA escena
 *   y           altura del suelo; negativa deja la mesa por encima
 *   casilla     lado de la baldosa. 2 m en las unidades que use la escena
 *   niebla      `{densidad}` para exponencial, `{cerca, lejos}` para lineal
 *   luz         `{desde, caja, lejos}` — posiciones, que sí dependen de la escala
 *   exposicion  del revelado ACES
 */
export function manifiestoDeSala({
    sitio = 'sala',
    suelo = 336,
    y = 0,
    casilla = 20,
    lado = suelo * 2,
    niebla = { densidad: 0.00062 },
    luz = {},
    exposicion = 1.02,
} = {}) {
    const ySuelo = y;
    return {
        sitio,
        porque: 'la Sala del Huevo: espacio abierto, sin muro ni techo',
        piezas: [
            // El suelo va por DEBAJO de la mesa. Con los dos en y=0 la tarjeta no
            // podía decidir cuál va delante y salían cuñas alternándose desde el
            // centro — el «tapete hace cosas raras» que se reportó dos veces.
            { pieza: 'suelo', radio: suelo, lados: 96, y: ySuelo },

            /**
             * ⚠️ AQUÍ PONÍA `divisiones: 42` Y LA BALDOSA SALÍA UN 20 % PEQUEÑA.
             *
             * 672/42 = 16 unidades = 1,60 m a esta escala, cuando la Sala del Huevo
             * y la sala de bolsillo tienen las dos 2,00 m. Y el comentario que había
             * aquí decía que era «la misma proporción que el hall». No lo era: lo
             * escribí yo anteanoche y nadie —yo el primero— lo miró, porque un
             * cociente escondido dentro de una llamada no se lee.
             *
             * Se declara la CASILLA, que es la medida con significado, y las
             * divisiones se derivan. 20 unidades = 2 m, la del hall.
             */
            { pieza: 'rejilla', lado, casilla, y: ySuelo + casilla * 0.001 },

            // La luz del hall, con los números de allí sin convertir: la
            // intensidad no depende de la escala. Las posiciones sí, y por eso
            // vienen de fuera.
            {
                pieza: 'luz-sala',
                ambiente: 2.4, cenital: 2.2,
                desde: luz.desde ?? [-suelo * 0.043, suelo * 0.157, suelo * 0.1],
                caja: luz.caja ?? suelo * 0.114, lejos: luz.lejos ?? suelo * 0.43,
            },

            /**
             * La niebla, en la forma que pida quien monta la sala.
             *
             * ⚠️ NO ES UNA PREFERENCIA: DEPENDE DE SI LA CÁMARA SE MUEVE.
             *
             * Exponencial donde se ANDA —crece sola con la distancia y disuelve un
             * horizonte que está lejos— y lineal donde la cámara está clavada, que
             * es donde la exponencial cobra un velo sobre lo único que hay que
             * leer sin disolver nada a cambio.
             */
            niebla.densidad !== undefined
                ? { pieza: 'niebla', densidad: niebla.densidad }
                : { pieza: 'niebla', cerca: niebla.cerca, lejos: niebla.lejos },

            // Va el último a propósito: necesita el renderizador y avisa si no lo
            // tiene, y ese aviso se lee mejor al final de la lista que en medio.
            { pieza: 'revelado', exposicion },
        ],
    };
}

/**
 * @param {object} scene
 * @param {object} opciones
 *   radio   el tamaño de la sala, en unidades de ESTA escena
 *   hondo   cuánto queda la mesa por encima del suelo
 *   piel    con qué se viste; por defecto la de la casa
 *   render  el renderizador. Opcional, pero sin él la luz no es la del hall:
 *           el revelado ACES y el entorno reflejado viven ahí.
 *
 * `alto` se acepta y se ignora: era la altura de la pared, y no hay pared. Se
 * deja para no romper a quien lo pasa, y se dice aquí para que nadie lo busque.
 */
export function amueblar(scene, { radio = 24, alto = 15, hondo = 7, piel, render = null } = {}) {
    return montarSitio(THREE, scene, manifiestoDeSala({
        sitio: 'mesa-de-cartas',
        suelo: radio * 14,
        y: -hondo,
        casilla: 20,                    // 2 m: la mesa mide 20 unidades y allí 2
        lado: radio * 28,
        niebla: { densidad: 0.00062 },  // aquí se ORBITA, así que exponencial
        luz: {
            desde: [-radio * 0.6, radio * 2.2, radio * 1.4],
            caja: radio * 1.6, lejos: radio * 6,
        },
    }), { piel, render });
}

/**
 * La sala de bolsillo: la misma, a escala de persona.
 *
 * Es lo que se abre al sentarse a una mesa de la Sala del Huevo, y estaba escrita
 * a mano dentro de `arcade/sala.html` — la misma habitación, por segunda vez.
 * Ahora es este puñado de números.
 *
 * ⚠️ EL RADIO DEL SUELO NO ES UN GUSTO: EL PLANO LEJANO DE ESA CÁMARA ES 60.
 * Un suelo de 320 —el del hall— se cortaría en seco a 60 m con un tajo recto en
 * mitad del aire. Y subir el plano lejano pagaría precisión de profundidad justo
 * donde no sobra: las cartas viven entre 0,98 y 0,99, a cinco milímetros unas de
 * otras. 55 cabe, y la niebla se lo come antes.
 */
export function manifiestoDeBolsillo() {
    return manifiestoDeSala({
        sitio: 'sala-de-bolsillo',
        suelo: 55, y: -0.02,
        casilla: 2, lado: 110,
        // Aquí la cámara está clavada a 2,15 m de la mesa: lineal, y sin niebla
        // ninguna dentro de lo que alcanza la rueda.
        niebla: { cerca: 12, lejos: 50 },
        luz: { desde: [-2.5, 8, 6], caja: 6, lejos: 26 },
    });
}
