/**
 * marcas.js — resaltar sitios en una escena 3D, en un solo sitio
 * ═══════════════════════════════════════════════════════════════════════════
 *     const marcas = crearMarcas(engine.scene);
 *     marcas.limpiar();
 *     marcas.poner(x, z, { color: VERDE });
 *
 * ⚠️ POR QUÉ EXISTE: ESTABA ESCRITO CINCO VECES.
 *
 * `checkers_visualizer.js`, `chess_visualizer.js`, `snake_visualizer.js`,
 * `grimorio_visualizer.js` y la mesa de cartas tenían cada uno su `marcas = []`,
 * su `borrarMarcas()` y su geometría a mano. Cinco copias de doce líneas que
 * nadie había hecho divergir todavía — que es exactamente el momento de juntarlas,
 * porque la sexta ya no se parecería a las otras.
 *
 * Y no es cosmético: es el mecanismo por el que una persona sabe **dónde puede
 * jugar**. El día que una copia deje de limpiarse, esa mesa se llena de marcas
 * fantasma que dicen que puedes hacer algo que ya no puedes.
 *
 * ⚠️ LO QUE ESTO NO ES
 * No es «reusar el motor de tablero». Ese motor es una escena entera con su
 * propio bucle, y una página no puede montar dos. Lo que se comparte es la pieza
 * pequeña —dónde brilla el suelo— que sirve igual a un tablero de damas que a una
 * caja de cartas en rejilla, porque las dos cosas son casillas con posición.
 */

/** Verde «puedes jugar aquí», que es el de las damas. */
export const VERDE = 0x7CFC98;
/** Morado «elige uno de éstos», para el segundo paso de una jugada compuesta. */
export const MORADO = 0xA180FF;
/** Verde intenso «esto es la jugada buena»: una sugerencia, no una opción más. */
export const ACIERTO = 0x00E05A;

/**
 * El «ahí no». Un rojo apagado y no un rojo de alarma: es una respuesta, no una
 * regañina — el jugador no ha hecho nada malo, ha probado. Y dura poco: lo que
 * hace falta es que la mesa CONTESTE, no que se quede señalando el error.
 */
export const RECHAZO = 0xE05A5A;

/**
 * @param {THREE.Object3D} donde  escena o grupo al que colgar las marcas
 * @param {object} [opciones]
 *   y      altura sobre el suelo (por defecto, casi pegada)
 *   ancho  y `largo`: el tamaño de una casilla en esta mesa
 */
export function crearMarcas(donde, { y = 0.02, ancho = 1.5, largo = 2.1 } = {}) {
    const puestas = [];
    // Una geometría y un material por color, compartidos: una marca por casilla
    // en un tablero de ajedrez son sesenta y cuatro objetos, y crearlos de nuevo
    // en cada clic es basura que el recolector acaba notando.
    const geo = new THREE.PlaneGeometry(ancho, largo);
    const materiales = new Map();

    const material = (color, opacidad) => {
        const clave = `${color}:${opacidad}`;
        if (!materiales.has(clave)) {
            materiales.set(clave, new THREE.MeshBasicMaterial({
                color, transparent: true, opacity: opacidad, depthWrite: false,
            }));
        }
        return materiales.get(clave);
    };

    return {
        /** Pone una marca plana en (x, z). */
        poner(x, z, { color = VERDE, opacidad = 0.42, altura = y } = {}) {
            const m = new THREE.Mesh(geo, material(color, opacidad));
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, altura, z);
            donde.add(m);
            puestas.push(m);
            return m;
        },

        /** Quita todas. Se llama SIEMPRE antes de volver a marcar: una marca que
         *  sobrevive a un cambio de estado señala una jugada que ya no existe. */
        limpiar() {
            for (const m of puestas) donde.remove(m);
            puestas.length = 0;
        },

        get cuantas() { return puestas.length; },
    };
}
