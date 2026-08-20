/**
 * props.js — GEOMETRÍA DE VERDAD EN LUGAR DE CUBOS, SIN PERDER EL INSTANCIADO
 * ═══════════════════════════════════════════════════════════════════════════
 *     const roca = await geometriaDeProp(THREE, 'roca');
 *     if (roca) malla.geometry = roca.geometria;       // una llamada de dibujo igual
 *
 * ⚠️ HAY 122 PROPS EN GLB Y NO LOS USABA NADIE.
 *
 * `public/props/` tiene 34 MB de modelos: 21 variantes de roca —con musgo y con
 * nieve—, animales, objetos y personajes. Y el arcade dibuja cubos. La frontera era
 * que el arcade corría en r128; se cayó hoy.
 *
 * ⚠️ Y SON PERFECTOS PARA ESTO, MEDIDO ANTES DE USARLOS.
 *
 *     Rock_3        72 tris · 1 malla · 0 huesos · 0 clips
 *     Chicken      648 tris · 5 mallas · 0 huesos · 0 clips
 *     Beagle       712 tris · 1 malla
 *
 * Ninguno trae esqueleto ni animación horneada — o sea que el movimiento tiene que
 * ser procedural, que es exactamente lo que dice la lección de la casa sobre avatares
 * («si puedes evitar calcular un codo, elimina el codo»: senos y cosenos, coste cero).
 * Y con 72 triángulos, una roca cuesta menos que el cubo que sustituye en cuanto hay
 * más de una en pantalla.
 *
 * ⚠️ SE PIDE LA GEOMETRÍA, NO EL OBJETO. Y ESO ES TODO EL TRUCO.
 *
 * El pintor dibuja los muros con `InstancedMesh`: UNA llamada para las 784 celdas de
 * fagocito. Clonar un GLB por muro tiraría esa optimización a la basura — es
 * literalmente el fallo que la cabecera de `pintar3d.js` cuenta que ya costó una vez,
 * con el navegador sin responder.
 *
 * Así que de un GLB de UNA malla se le saca la geometría y el material, y se le
 * enchufan al `InstancedMesh` que ya existía. Misma llamada de dibujo, otra forma.
 * Los props de varias mallas no valen para esto y se dice: se cargan como objeto
 * suelto, para piezas que son pocas.
 */

const RAIZ = '/props';

/**
 * El catálogo. Clave de MUNDO, no de juego —`roca` la puede pedir la cripta y el que
 * venga después—, igual que los ambientes. Las variantes se eligen por posición, así
 * que dos muros contiguos no salen calcados.
 */
export const CATALOGO = {
    roca:        { rutas: [3, 4, 5, 6, 7].map(n => `${RAIZ}/models/Rock_${n}.glb`) },
    roca_musgo:  { rutas: [1, 2, 3, 4, 5].map(n => `${RAIZ}/models/Rock_Moss_${n}.glb`) },
    roca_nieve:  { rutas: [1, 2, 3].map(n => `${RAIZ}/models/Rock_Snow_${n}.glb`) },
};

const cache = new Map();      // clave → Promise<{geometria, material}[]>

/** El mapa de importación, una vez: `GLTFLoader` importa de `'three'` a secas. */
let mapaPuesto = false;
function ponerMapa() {
    if (mapaPuesto || document.querySelector('script[type="importmap"]')) { mapaPuesto = true; return; }
    const s = document.createElement('script');
    s.type = 'importmap';
    s.textContent = JSON.stringify({ imports: {
        three: '/vendor/three-0.170.0/build/three.module.js',
        'three/addons/': '/vendor/three-0.170.0/examples/jsm/',
    } });
    document.head.appendChild(s);
    mapaPuesto = true;
}

/**
 * Carga las variantes de un prop y devuelve sus geometrías, normalizadas a un lado de
 * una unidad — que es lo que mide una casilla.
 *
 * @returns {Promise<null|{geometria:object, material:object}[]>} `null` si no se pudo
 */
export async function geometriasDeProp(THREE, clave) {
    if (cache.has(clave)) return cache.get(clave);
    const entrada = CATALOGO[clave];
    if (!entrada) return null;

    const promesa = (async () => {
        try {
            ponerMapa();
            const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
            const loader = new GLTFLoader();
            const cargar = (ruta) => new Promise((ok, mal) => loader.load(ruta, ok, undefined, mal));
            const out = [];
            for (const ruta of entrada.rutas) {
                const g = await cargar(ruta).catch(() => null);
                if (!g) continue;
                let malla = null;
                g.scene.traverse((o) => { if (o.isMesh && !malla) malla = o; });
                if (!malla) continue;

                /**
                 * ⚠️ SE NORMALIZA LA GEOMETRÍA, NO LA INSTANCIA.
                 *
                 * Cada roca viene con el tamaño que tuviera en su escena original, y
                 * el pintor coloca las instancias suponiendo un lado de una unidad. Si
                 * se escalara la instancia, cada juego tendría que saber cuánto mide
                 * cada modelo — otra lista paralela. Escalando la geometría UNA vez, el
                 * pintor sigue sin enterarse de nada.
                 */
                const geo = malla.geometry.clone();
                geo.computeBoundingBox();
                const c = geo.boundingBox.getSize(new THREE.Vector3());
                const mayor = Math.max(c.x, c.y, c.z) || 1;
                geo.scale(1 / mayor, 1 / mayor, 1 / mayor);
                geo.center();
                out.push({ geometria: geo, material: malla.material });
            }
            return out.length ? out : null;
        } catch (e) {
            console.warn(`[props] no se pudo cargar «${clave}»:`, e?.message ?? e);
            return null;
        }
    })();

    cache.set(clave, promesa);
    return promesa;
}

/**
 * ⚠️ EL MOVIMIENTO: SENOS, NO ESQUELETOS.
 *
 * `Data/Lecciones/2026-04-03_giants_procedural_avatars_rayman_spore.md` lo deja dicho:
 * el torso sube y baja con `Math.sin`, y si hay varias piezas se les desfasa el paso.
 * «Cuesta 0 CPU» y da el trote saltarín retro. Los props no traen ni un hueso, así que
 * además es la única opción — pero es que también sería la elegida.
 *
 * El desfase sale de la POSICIÓN y no de un contador: dos rocas contiguas tienen que
 * respirar distinto, y con un contador global respirarían todas a la vez, que se lee
 * como un parpadeo en vez de como vida.
 */
export function respirar(obj, t, { altura = 0.03, giro = 0.05, velocidad = 1.4 } = {}) {
    if (!obj) return;
    const fase = (obj.position.x * 1.7 + obj.position.z * 2.3);
    obj.position.y = (obj.userData._y0 ??= obj.position.y) + Math.sin(t * velocidad + fase) * altura;
    obj.rotation.z = Math.sin(t * velocidad * 0.7 + fase) * giro;
}
