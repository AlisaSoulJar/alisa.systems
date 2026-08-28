/**
 * material.js — EL ADAPTADOR: de la descripción de `aspecto.js` a un material real
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     import { materialDe } from './render/material.js';
 *     const m = materialDe(THREE, 'paño');          // MeshStandardMaterial
 *     const c = materialDe(THREE, 'carta-cara');    // MeshBasicMaterial, sin luz
 *
 * QUÉ ES
 *
 * `aspecto.js` es el sustrato: dice CÓMO SE VE una cosa y devuelve un JSON. Esto
 * es el lado de THREE de ese sustrato — el mismo sitio que ocupa `pintar3d.js`
 * respecto a `sustrato.js`. Veinte líneas de traducción y ninguna decisión: si
 * aquí aparece un número de color, está mal puesto y va a `aspecto.js`.
 *
 * ⚠️ THREE SE RECIBE POR PARÁMETRO, NO SE IMPORTA. ES LA RAZÓN DE QUE ESTE
 *    ADAPTADOR SEA UNO SOLO Y NO DOS.
 *
 * `public/arcade/**` corre three r128 con `<script>` global; `public/rooms/**`
 * corre three 0.160 como módulos ESM. Si este fichero hiciera `import * as THREE`
 * metería un SEGUNDO three en memoria de quien lo cargue, y sus materiales serían
 * de otro three que el de la escena. Ya nos costó caro con TWEEN: dos objetos y
 * las cartas congeladas a mitad de reparto.
 *
 * Es exactamente el trato que ya tienen `tapete.js` (`crearTapete(THREE, lado)`),
 * `mueble.js`, `dados.js` y `atmosfera.js`, y su cabecera lo dice con estas
 * palabras: «esta pieza no importa el suyo, que sería un segundo three en
 * memoria». Aquí paga doble: gracias a eso, las dos versiones de three comparten
 * ESTE fichero además de compartir la descripción. Un solo adaptador, dos motores.
 *
 * ⚠️ LO QUE AQUÍ NO SE DECIDE: EL COLOR, EL ACABADO Y SI LLEVA LUZ.
 *
 * Todo eso lo trae `aspectoDe(rol, { piel })` ya resuelto —piel aplicada, clase
 * decidida— y esta función sólo elige la clase de material y copia los campos.
 * En particular un ROL DESCONOCIDO ya sale en magenta y ya se avisa desde
 * `aspecto.js`; no se vuelve a comprobar aquí, porque dos avisos del mismo fallo
 * son dos sitios que hay que mantener de acuerdo y uno que se olvidará.
 */
import { aspectoDe } from './aspecto.js';

/**
 * El material de un rol, en el three de quien llama.
 *
 * @param {object} THREE  el three de quien llama (ver la cabecera: NO se importa)
 * @param {string} rol    una clave de `ROLES`
 * @param {object} [opts]
 *   piel   la piel a usar; por defecto la de la casa
 *   tipo   fuerza la clase del material CON LUZ: 'lambert' | 'basic'.
 *          Por defecto `MeshStandardMaterial`.
 * @returns {object} un material de THREE, listo para una malla
 */
export function materialDe(THREE, rol, { piel, tipo } = {}) {
    const a = aspectoDe(rol, { piel });

    const params = { color: a.color };

    /**
     * La opacidad sólo se toca si la descripción la trae Y es de verdad menor que
     * uno. Poner `transparent: true` con opacidad 1 no se ve distinto pero manda la
     * malla a la pasada de transparencias, donde se ordena por distancia y se
     * dibuja sin escribir profundidad: cambia el ORDEN de dibujo de la escena
     * entera. Un «no cambia nada» que cambia lo que tapa a lo que.
     */
    if (a.opacidad !== undefined && a.opacidad < 1) {
        params.opacity = a.opacidad;
        params.transparent = true;
    }

    /**
     * ⚠️ LA CLASE LECTURA MANDA SOBRE `tipo`, Y ESO ES EL INVARIANTE ENTERO.
     *
     * Si `sinLuz` es verdadero estamos ante una LECTURA —la cara de una carta, una
     * casilla, una pieza—: algo cuyo trabajo es leerse IGUAL EN CUALQUIER SALA. Un
     * material difuso se come la luz del sitio, y medido, el contraste dentro de la
     * mano bajaba de 177 a 50. Así que aquí no se pregunta qué prefiere quien
     * llama: por eso `tipo` no puede rescatar una lectura a un material con luz.
     *
     * Y `toneMapped: false` NO es un adorno. Con el revelado ACES puesto en el
     * renderizador —que es lo que hace la Sala del Huevo— hasta un material sin luz
     * pasa por la curva de revelado, y el blanco de la carta sale lavado igual. El
     * material sin luz quita la luz de la sala; esta línea quita el revelado. Hacen
     * falta las dos: con una sola, el arreglo se quedaba a medias.
     */
    if (a.sinLuz) {
        return new THREE.MeshBasicMaterial({ ...params, toneMapped: false });
    }

    /**
     * ESCENOGRAFÍA: la ilumina la sala. `tipo` existe porque no todo el mundo pinta
     * con el material físico y no quiero que este adaptador se lo cambie por
     * sorpresa — el motor de cartas usa Lambert a propósito, y el tapete también
     * («este paño está en dos salas con luces distintas, y Lambert se ve igual en
     * las dos»). Cambiárselo desde aquí sería reabrir justo la diferencia que esas
     * piezas existen para cerrar.
     *
     * `rugosidad` y `metal` sólo se pasan al material físico: `MeshLambertMaterial`
     * y `MeshBasicMaterial` no los conocen y three suelta un aviso por cada
     * propiedad que no entiende, uno por malla.
     */
    if (tipo === 'basic')   return new THREE.MeshBasicMaterial(params);
    if (tipo === 'lambert') return new THREE.MeshLambertMaterial(params);

    if (a.rugosidad !== undefined) params.roughness = a.rugosidad;
    if (a.metal !== undefined)     params.metalness = a.metal;
    return new THREE.MeshStandardMaterial(params);
}
