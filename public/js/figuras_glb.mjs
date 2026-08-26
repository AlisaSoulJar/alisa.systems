/**
 * figuras_glb.mjs — PONER UN MODELO DE VERDAD DONDE HAY UNA ESFERA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     import { figuraGLB } from '/js/figuras_glb.mjs';
 *     const ESTILO = {
 *         pez:     { malla: figuraGLB(THREE, 'Fish1.glb', { alto: 3.2 }) },
 *         tiburon: { malla: figuraGLB(THREE, 'Shark.glb', { alto: 14 }) },
 *     };
 *
 * Devuelve una figura para el enganche `malla` de `PintorMundo`: un grupo con un
 * respaldo dentro que se sustituye cuando llega el modelo. El pintor ya lleva la
 * posición, la identidad y el «esto ya no está»; esto sólo pone la forma.
 *
 * ⚠️ ESTE FICHERO SE ESCRIBIÓ DOS VECES, Y LA PRIMERA FUE UN ERROR ENTERO.
 *
 * La primera versión medía la caja del modelo en tiempo de ejecución, se
 * inventaba la escala y cargaba con `GLTFModelPool.get()`. Después salió el
 * inventario de lo que ya había, y era esto:
 *
 *   · `props/avatar_*.json` — NUEVE catálogos que ya atan nombre → GLB →
 *     escala → tinte. `avatar_beast.json` ya tenía `fish1`, `fish2` y `fish3`.
 *   · **968 ficheros `<modelo>.glb.katamari.json`** con la altura REAL ya
 *     medida (`deduced_size_meters`), la categoría semántica y la corrección de
 *     giro. `Fish1.glb` → 4,57 m.
 *   · `AquariumEnvironmentFactory._syncEcosystemGroup` — respaldo mientras
 *     carga, normalizado, corrección de giro y orientación por velocidad. Ya
 *     escrito, y llamado con `'Fish1.glb'`.
 *   · `InteractionLabFactory` y `ArachneEngine.applyKatamariScale` — medir y
 *     apoyar en el suelo, dos veces.
 *
 * O sea: la séptima versión de algo que existía cuatro veces, escrita el mismo
 * día en que llevaba la cuenta de esa avería. Queda aquí escrito porque el
 * siguiente que vaya a «resolver» las escalas de los GLB tiene que tropezar con
 * este párrafo antes que con su editor.
 *
 * Lo que hace ahora: LEE la medida que ya está en disco, y sólo mide si no la
 * hay.
 */
import { GLTFModelPool } from '@alisa-engine/src/soma/plugins/GLTFModelPool.js';

const RUTA = '/props/models/';

/**
 * ⚠️ UNA CARGA POR MODELO, NO UNA POR BICHO.
 *
 * `GLTFModelPool.get()` es el cargador ESTÁTICO y carga fresco en cada llamada
 * —está documentado en su propia cabecera— así que veinticinco peces eran
 * veinticinco descargas del mismo fichero de 70 KB. Esta caché guarda la
 * PROMESA, no el resultado: veinticinco figuras creadas en el mismo fotograma
 * comparten la misma descarga en vuelo en vez de lanzar veinticinco.
 *
 * No se usa `GLTFModelPool.load()` —que sí cachea— por una razón medida y no
 * por desconocimiento: normaliza por la DIAGONAL de la caja, y aquí se declara
 * una ALTURA. Un pez largo y plano y un pez corto y alto con la misma diagonal
 * saldrían del mismo tamaño, que es justo lo que hay que evitar en un juego
 * donde el tamaño dice quién te come.
 */
const enVuelo = new Map();
const medidas = new Map();

/**
 * ⚠️ LOS ESQUELETOS HAY QUE MOVERLOS, Y ESO ES LO QUE ME FALTABA.
 *
 * `Fish1.glb`, `Lionfish.glb` y `Shark.glb` son SkinnedMesh con una animación
 * («Armature|Swim»). Un skinned mesh clonado y sin nadie que le mueva el
 * esqueleto se queda en la pose de reposo — y si el modelo se exportó con esa
 * pose colapsada, no se ve NADA. Medido: los tres estaban en escena, con su
 * tamaño correcto (pez 3,2 · cazador 7 · tiburón 14) y en su sitio, y la
 * pantalla no enseñaba ninguno.
 *
 * La receta es la de `MarabuntaEnvironmentFactory:163-177`, que es la pieza más
 * completa de la casa en esto: un `AnimationMixer` por instancia y el clip
 * puesto a sonar. Aquí se guardan todos y el juego los mueve con `animarGLB(dt)`
 * desde su bucle — el pintor coloca, esto anima.
 */
const mixers = [];

/** Mueve los esqueletos. Se llama una vez por fotograma desde el bucle del juego. */
export function animarGLB(dt) {
    for (const m of mixers) m.update(dt);
}

/**
 * Lo que el `.katamari.json` del modelo sabe y aquí sirve: la CORRECCIÓN DE
 * GIRO. Hay 968 de estos ficheros en `props/`, uno por modelo, y llevan además
 * `deduced_size_meters` y un tier semántico — que NO son el tamaño de la malla
 * sino el de la cosa en el mundo real. Ver la nota de la escala más abajo.
 */
async function medidaDeDisco(fichero) {
    if (medidas.has(fichero)) return medidas.get(fichero);
    const p = fetch(`${RUTA}${fichero}.katamari.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => (j
            ? {
                giro: (j.rotation_y_offset_deg ?? 0) * Math.PI / 180,
                // Se guarda aunque no se use de divisor: sirve para saber si la
                // escala que declara un juego es coherente con el mundo real.
                metrosReales: j.deduced_size_meters ?? null,
                tier: j.target_tier ?? null,
            }
            : null))
        .catch(() => null);
    medidas.set(fichero, p);
    return p;
}

function cargar(fichero) {
    if (!enVuelo.has(fichero)) {
        enVuelo.set(fichero, GLTFModelPool.get(RUTA + fichero).then((gltf) => {
            /**
             * ⚠️ ESTA LÍNEA ES EL FALLO ENTERO, Y COSTÓ MEDIA MAÑANA.
             *
             * `SkeletonUtils.clone` copia el estado de las matrices del original.
             * Si al original no se las ha calculado NADIE todavía —y recién
             * salido del cargador no se las ha calculado nadie—, el clon nace
             * con un esqueleto en estado sucio, y medirlo miente:
             *
             *     gltf.scene con las matrices al día      5,76 × 5,27 × 15,38
             *     el clon de un original sin calcular      575 × 1537 × 527
             *
             * Cien veces. Y como de ahí sale la escala, el tiburón se quedaba en
             * 0,009 en vez de 0,81: dos píxeles en pantalla, sin un solo error en
             * consola. Calcularlas DESPUÉS, en el clon, no lo arregla — el daño
             * ya está copiado dentro.
             */
            gltf.scene.updateWorldMatrix(true, true);
            return gltf;
        }));
    }
    return enVuelo.get(fichero);
}

/**
 * ⚠️ SE PREPARA UNA VEZ Y SE CLONA TAL CUAL.
 *
 * Alinear, escalar y centrar se hacen sobre el ORIGINAL, dentro de un envoltorio,
 * y cada bicho es un clon del envoltorio al que ya no se le toca nada. Es la
 * forma de `GLTFModelPool.load()` —envoltorio fuera, transformación dentro— y la
 * que usa `MarabuntaEnvironmentFactory` para su Janitor, que es el único sitio de
 * la casa donde un SkinnedMesh escalado se ve bien.
 *
 * Además sale gratis: veinticinco peces son veinticinco clones de un trabajo
 * hecho una sola vez, no veinticinco mediciones.
 */
const preparados = new Map();

/**
 * @param {Object} THREE
 * @param {string} fichero            nombre del `.glb` en `public/props/models/`
 * @param {Object} [cfg]
 * @param {number} [cfg.alto=1]       cuánto debe medir POR SU LADO MAYOR, en
 *                                    unidades del mundo. En un pez o un coche
 *                                    eso es el LARGO, no la altura — es la regla
 *                                    de `ModelUtils.fitToBox`, y es la única que
 *                                    no depende de cómo exportó el modelo quien
 *                                    lo hizo.
 * @param {boolean}[cfg.apoyar=true]  apoyar en el suelo del grupo (props) o
 *                                    centrar (bichos que nadan o vuelan)
 * @param {number} [cfg.giroY]        corrección extra de orientación (radianes)
 * @param {string|number} [cfg.emisivo] tinte de emisión, para que se lea a oscuras
 * @param {number} [cfg.brillo=0.55]
 * @param {string|number} [cfg.tinte] color base, para los pequeños
 * @param {boolean}[cfg.sombra=true]
 * @param {Function} [cfg.respaldo]   figura mientras carga o si el GLB no está
 * @returns {Function} `(tipo, pieza) => THREE.Object3D`
 */
/**
 * Prepara el modelo UNA VEZ: lo tumba si viene de pie, lo escala por su lado
 * mayor y lo centra dentro de un envoltorio. Devuelve el envoltorio y los clips.
 * A partir de ahí cada bicho es un clon al que ya no hay que tocarle nada.
 */
function preparar(THREE, fichero, cfg) {
    if (preparados.has(fichero)) return preparados.get(fichero);

    const p = Promise.all([cargar(fichero), medidaDeDisco(fichero)]).then(async ([gltf, disco]) => {
        /**
         * ⚠️ SE ESCALA EL ORIGINAL Y **LUEGO** SE CLONA. NUNCA AL REVÉS.
         *
         * Ésa es la diferencia entera, y se vio poniendo las dos cosas en pantalla
         * una al lado de la otra con un cubo de 14 unidades de regla al lado:
         *
         *   · escalar el original y clonar   → un tiburón que llena el cubo
         *   · clonar y escalar el clon       → dos píxeles
         *
         * Y `Box3` decía «14,0» en los dos casos: en un SkinnedMesh la caja se
         * calcula en la CPU con los huesos, y la GPU pinta otra cosa. La medida
         * que vale aquí es la pantalla.
         *
         * El porqué: al clonar se copia el estado de vinculación del esqueleto. Si
         * el original ya venía escalado, el clon nace con esa escala dentro; si se
         * escala después, la matriz de vinculación se queda con la de antes y el
         * dibujado la deshace.
         *
         * Es exactamente el orden de `GLTFModelPool.load()` —escala `gltf.scene`,
         * lo mete en un envoltorio— y el de `MarabuntaEnvironmentFactory`, que
         * clona ese envoltorio ya preparado. Es el único sitio de la casa donde un
         * SkinnedMesh escalado se ve bien, y ahora se sabe por qué.
         *
         * Consecuencia: la preparación es POR FICHERO, no por tamaño. Si dos
         * juegos piden el mismo modelo con tamaños distintos, manda el primero y
         * el segundo ajusta con la escala de su propio grupo — proporcional, así
         * que nunca queda absurdo. Hoy no pasa; el día que pase, está dicho.
         */
        let clonar = (o) => o.clone();
        try { ({ clone: clonar } = await import('three/addons/utils/SkeletonUtils.js')); } catch { /* sin SkeletonUtils */ }
        const modelo = gltf.scene;

        const medir = () => {
            modelo.updateWorldMatrix(true, true);
            const c = new THREE.Box3().setFromObject(modelo);
            return { c, t: c.getSize(new THREE.Vector3()) };
        };

        /**
         * ⚠️ PRIMERO SE TUMBA EL BICHO, LUEGO SE MIDE. Y NO ES IDEA MÍA: es la
         * «Auto Alignment Therapy» de `KatamariScaleSystem:215-228`.
         *
         * Medido en pantalla con los peces cargados y en su sitio: `Fish1`
         * ocupaba 0,3 × 2,8 × 0,7. Su eje LARGO es la Y —viene de un Blender en
         * Z-arriba y sale de pie sobre la cola—, así que el pez quedaba de canto:
         * tres píxeles de ancho.
         */
        let { c: caja, t: tam } = medir();
        if (tam.y > Math.max(tam.x, tam.z) * 1.2) {
            modelo.rotation.x = -Math.PI / 2;
            ({ c: caja, t: tam } = medir());
        }

        /**
         * ⚠️ Y SE ESCALA POR EL EJE MAYOR, NO POR LA ALTURA.
         *
         * Es la regla de `ModelUtils.fitToBox`, la pieza de la casa para esto:
         * `f = s / max(x, y, z)`. Yo dividía por `tam.y`, y en un pez la Y no es
         * la altura sino el largo — declarar «3,2» daba un bicho de 0,7 de alto.
         *
         * No se LLAMA a `fitToBox` por una razón medida, no por no mirarla: su
         * primera línea pone a 1 toda escala de hijo mayor que 1,5, y en estos
         * modelos la geometría cruda mide 0,03 y son los NODOS los que la
         * multiplican por cien. Esa poda —correcta para un prop de Blender— aquí
         * aplasta al bicho. La regla se copia; la poda, no.
         */
        const altoPreparado = cfg.alto ?? 1;
        const mayor = Math.max(tam.x, tam.y, tam.z);
        const escala = mayor > 1e-6 ? altoPreparado / mayor : 1;
        modelo.scale.setScalar(escala);

        /**
         * El pintor coloca el grupo donde dice el sustrato, así que el modelo
         * tiene que quedar CENTRADO dentro de él — si no, un GLB con el origen en
         * un pie aparece a medio cuerpo de donde el juego cree que está.
         * `fitToBox` centra en X y Z y apoya en Y, que es lo correcto para un prop
         * sobre un suelo. Un bicho que NADA no se apoya en nada: ahí la pieza es
         * su centro, y por eso `apoyar` se puede apagar.
         */
        const centro = caja.getCenter(new THREE.Vector3());
        modelo.position.set(
            -centro.x * escala,
            cfg.apoyar === false ? -centro.y * escala : -caja.min.y * escala,
            -centro.z * escala);
        modelo.rotation.y = (cfg.giroY ?? 0) + (disco?.giro ?? 0);

        const sombra = cfg.sombra !== false;
        modelo.traverse((n) => {
            if (!n.isMesh && !n.isSkinnedMesh) return;
            if (sombra) { n.castShadow = true; n.receiveShadow = true; }
            // `frustumCulled = false` como en TrafficEnvironmentFactory: la caja
            // de un SkinnedMesh es la de su pose de reposo y al animarse el bicho
            // puede salirse de ella y desaparecer de golpe.
            n.frustumCulled = false;
            if (!n.material) return;
            /**
             * Los materiales se CLONAN antes de teñirlos. Son compartidos con el
             * original del cargador, y sin esto el primer juego que pida un pez
             * azul deja azul el `Fish1.glb` de toda la sesión — el siguiente que
             * lo pida se lo encuentra teñido. Es lo que hace `GLTFModelPool.load`
             * en su paso 3, y por la misma razón.
             */
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            const nuevos = mats.map((m) => {
                const c = m.clone();
                if ('emissive' in c && cfg.emisivo !== undefined) {
                    c.emissive = new THREE.Color(cfg.emisivo);
                    c.emissiveIntensity = cfg.brillo ?? 0.55;
                }
                /**
                 * Teñir la emisión no basta cuando el modelo viene oscuro de
                 * fábrica: medido con una caja de alambre encima, los peces
                 * estaban renderizados y en su sitio y no se leían. `tinte` es
                 * opcional a propósito — un modelo con buena textura no se
                 * repinta; se usa en los pequeños, que se leen por luz.
                 */
                if (cfg.tinte !== undefined && c.color) c.color = new THREE.Color(cfg.tinte);
                return c;
            });
            n.material = Array.isArray(n.material) ? nuevos : nuevos[0];
        });

        const raiz = new THREE.Group();
        raiz.add(modelo);

        /**
         * Los clips vienen del cargador; `GLTFPlugin` además los copia a
         * `scene.userData.animations`, así que se miran los dos sitios.
         */
        const clips = gltf.animations?.length
            ? gltf.animations
            : (gltf.scene.userData?.animations ?? []);

        return { raiz, clips, clonar, altoPreparado };
    });

    preparados.set(fichero, p);
    return p;
}

export function figuraGLB(THREE, fichero, cfg = {}) {
    const alto = cfg.alto ?? 1;

    return (tipo, pieza) => {
        const g = new THREE.Group();

        /**
         * El respaldo se pone YA, no cuando falle. Un GLB tarda, y sin nada
         * dentro la pieza EXISTE en el sustrato y no se ve — que es peor que una
         * esfera fea, porque parece que el juego ha perdido algo. Es lo mismo que
         * hace `AquariumEnvironmentFactory` con su cono.
         */
        const provisional = cfg.respaldo
            ? cfg.respaldo(tipo, pieza)
            : new THREE.Mesh(
                new THREE.SphereGeometry(alto * 0.5, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0x556070, roughness: 0.8 }));
        g.add(provisional);

        preparar(THREE, fichero, cfg).then(({ raiz, clips, clonar, altoPreparado }) => {
            const modelo = clonar(raiz);

            // Si otro juego preparó este modelo con otro tamaño, se corrige aquí
            // FUERA del clon — nunca tocando su escala, que es lo que lo rompía.
            if (Math.abs(altoPreparado - alto) > 1e-6 && altoPreparado > 1e-6) {
                g.scale.setScalar(alto / altoPreparado);
            }

            /**
             * El clip, puesto a sonar. Se elige por nombre —nadar, andar, idle— y
             * si no hay ninguno reconocible, el primero: un bicho moviéndose mal
             * es infinitamente mejor que uno invisible.
             */
            if (clips.length) {
                const mixer = new THREE.AnimationMixer(modelo);
                const porNombre = (re) => clips.find((c) => re.test(c.name.toLowerCase()));
                const clip = porNombre(/swim|nad|walk|run|idle/) ?? clips[0];
                mixer.clipAction(clip).play();
                // Cada bicho arranca en un punto distinto del ciclo: veinticinco
                // peces batiendo la cola a la vez parecen una sola cosa.
                mixer.update(Math.random() * clip.duration);
                mixers.push(mixer);
            }

            g.remove(provisional);
            provisional.geometry?.dispose?.();
            provisional.material?.dispose?.();
            g.add(modelo);
        }).catch((e) => {
            /**
             * ⚠️ SE AVISA. UN `catch` MUDO ES LO QUE ESCONDIÓ ESTE FALLO.
             *
             * Sin modelo se juega igual —el respaldo se queda, y un adorno que no
             * carga no puede tumbar una etapa—, pero callarse convierte «el GLB
             * revienta» en «los peces no se ven», que es media tarde de diferencia
             * buscándolo. Es la misma avería que tenía el acuario: una excepción
             * envuelta que se leía como otra cosa.
             */
            console.warn(`[figuraGLB] ${fichero} no se pudo poner:`, e?.message ?? e);
        });

        return g;
    };
}
