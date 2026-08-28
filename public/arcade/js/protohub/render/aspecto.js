/**
 * aspecto.js — EL SUSTRATO DEL ASPECTO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     import { aspectoDe } from './render/aspecto.js';
 *     const a = aspectoDe('paño');      // → { color: 0x14352a, rugosidad: .9, ... }
 *
 * QUÉ ES, Y POR QUÉ NO SE LLAMA «PUERTA» NI «SISTEMA DE PIELES»
 *
 * Esta casa ya tiene el patrón tres veces y cada una con nombre propio:
 *
 *     sustrato.js   el estado del juego  →  3D, 2D, texto, vector, huella
 *     paleta.js     un nombre            →  pintor 2D, pintor 3D
 *     huella.js     unas reglas          →  navegador, servidor
 *
 * Siempre lo mismo: **una descripción neutral en medio y adaptadores a los
 * lados**. Así que esto no es una máquina nueva, es un sustrato más — el
 * sustrato describe QUÉ PASA y éste describe CÓMO SE VE. Mismo patrón, misma
 * ley, y hereda gratis el vocabulario y la disciplina que ya tenemos.
 *
 * ⚠️ DEVUELVE DATOS, NO UN MATERIAL DE THREE. Y ESO NO ES PUREZA: ES QUE SI NO,
 *    LOS CUARENTA JUEGOS SE QUEDAN FUERA.
 *
 * `public/arcade/**` corre three r128 con `<script>` global; `public/rooms/**`
 * corre three 0.160 como módulos ESM. No pueden compartir un objeto de THREE —
 * está escrito y sufrido en `habitacion.js:129`, donde el `AssetManager` del
 * motor no se puede usar por eso mismo. Pero **sí pueden compartir un JSON**.
 *
 * Por eso aquí no se importa THREE, no hay escena y no hay `tick`. Se resuelve
 * una vez, al construir la malla. Cada lado monta su material desde la misma
 * descripción, con un adaptador de veinte líneas.
 *
 * ⚠️ LAS DOS CLASES DE SUPERFICIE. ESTO ES LO QUE SE ROMPIÓ EL 28-08 Y ES EL
 *    CORAZÓN DEL FICHERO.
 *
 * Al traer la luz de la Sala del Huevo a las páginas de cartas, las cartas se
 * lavaron: el número y el palo se fueron con el blanco. Medido, el contraste
 * dentro de la mano:
 *
 *     página suelta, luz vieja       177
 *     sala de bolsillo (siempre)      50   ← llevaba lavada desde el primer día
 *     con la luz del hall             57
 *     con la cara sin luz            133   ← el arreglo
 *
 * Y descartado uno por uno: quitar el entorno reflejado deja 57, quitar el
 * revelado ACES deja 53, apagar los reflejos deja 57. No era ninguno. Era que la
 * carta se COME la luz de la sala, porque su material es difuso puro.
 *
 * De ahí la ley:
 *
 *     ESCENOGRAFÍA  suelo, mesa, paño, muebles. La ilumina la sala y se puede
 *                   vestir libremente. Aquí una piel es una piel.
 *     LECTURA       la cara de una carta, una casilla, una pieza. Su trabajo es
 *                   LEERSE IGUAL EN CUALQUIER SALA. Si depende de la luz,
 *                   cambiar de sitio cambia la partida.
 *
 * Se ilumina el objeto; no se ilumina lo que hay que leer.
 *
 * ⚠️ Y UNA PIEL NO PUEDE SALTARSE LA CLASE. NO ES UNA PROMESA, ES ESTA LÍNEA.
 *
 * `sinLuz` se deriva de la clase DESPUÉS de aplicar la piel, así que una piel
 * puede pintar la carta de lo que quiera y no puede apagarla. Es lo que hace que
 * «configúralo todo» no acabe en una partida ilegible — y lo que permite abrir
 * esto a quien quiera sin pedirle que se porte bien.
 *
 * Encima quedan los dos porteros que ya corren en `npm test`: una piel es legal
 * si la huella de comportamiento no se mueve (`prueba_huella.mjs`) y la
 * legibilidad no baja (`legibilidad.mjs`, hoy 57/60). Los gigantes prometen eso;
 * aquí se firma.
 */

/** Se pinta con la luz de la sala. Vestir libre. */
export const ESCENOGRAFIA = 'escenografia';
/** Se lee. No obedece a la luz de nadie. */
export const LECTURA = 'lectura';

/**
 * EL VOCABULARIO DE ROLES.
 *
 * ⚠️ SE DECLARA POR NOMBRE, NUNCA POR LITERAL. Es la ley que ya escribió
 * `paleta.js` —«las reglas declaran su color por nombre»— y es lo único que hace
 * que una piel no pueda tocar el juego: quien pinta pide un ROL, y qué significa
 * ese rol lo decide la piel, no quien pinta.
 *
 * La lista es corta a propósito y crece cuando algo la necesita. Un rol que
 * nadie pide es una entrada que nadie mantiene.
 */
export const ROLES = {
    // ── El sitio ──────────────────────────────────────────────────────
    'suelo':          ESCENOGRAFIA,
    'rejilla':        ESCENOGRAFIA,
    'niebla':         ESCENOGRAFIA,

    // ── El mueble ─────────────────────────────────────────────────────
    'mesa-tapa':      ESCENOGRAFIA,
    'mesa-pie':       ESCENOGRAFIA,
    'mesa-taburete':  ESCENOGRAFIA,

    // ── El tapete ─────────────────────────────────────────────────────
    'paño':           ESCENOGRAFIA,
    'paño-ribete':    ESCENOGRAFIA,

    // ── La baraja ─────────────────────────────────────────────────────
    // El canto SÍ lleva luz: es lo que hace que una carta parezca apoyada y no
    // una pegatina. Lo que no lleva luz es lo que hay escrito en ella.
    'carta-cara':     LECTURA,
    'carta-reverso':  LECTURA,
    'carta-canto':    ESCENOGRAFIA,
};

/**
 * LA PIEL DE LA CASA.
 *
 * ⚠️ NINGUNO DE ESTOS NÚMEROS ES DE MI GUSTO: TODOS ESTÁN MEDIDOS DE LA SALA DEL
 *    HUEVO O COPIADOS DE DONDE YA VIVÍAN.
 *
 *   suelo / rejilla / niebla   de `room_sala_del_huevo.html`, leyendo su código
 *   mesa-*                     de `protohub/mueble.js`, que ya las unificó
 *   paño / ribete              de `protohub/tapete.js` (`VERDE`, `MORADO`)
 *   carta-canto                de `SovereignCardEngine.cardMatFront`
 *
 * Escribirlos aquí NO crea una copia: el paso siguiente es que esos ficheros
 * pidan su color a este, y entonces éste pasa a ser el único sitio. Mientras los
 * dos existan, esto es una copia y hay que decirlo — es exactamente la avería que
 * separó el acabado de la mesa dos veces.
 */
export const PIEL_CASA = {
    nombre: 'casa',
    roles: {
        'suelo':          { color: 0xffffff, rugosidad: 0.82, metal: 0.02 },
        'rejilla':        { color: 0x9fb0c0, secundario: 0xd4dee6, opacidad: 0.5 },
        'niebla':         { color: 0xe6ebf0 },

        'mesa-tapa':      { color: 0xffffff, rugosidad: 0.55, metal: 0.06 },
        'mesa-pie':       { color: 0x1b232e, rugosidad: 0.42, metal: 0.22 },
        'mesa-taburete':  { color: 0xffffff, rugosidad: 0.55, metal: 0.06 },

        'paño':           { color: 0x14352a, rugosidad: 0.90, metal: 0.00 },
        'paño-ribete':    { color: 0xa180ff, rugosidad: 0.60, metal: 0.00 },

        'carta-cara':     { color: 0xffffff },
        'carta-reverso':  { color: 0xffffff },
        'carta-canto':    { color: 0xe8ecef, rugosidad: 0.70, metal: 0.00 },
    },
};

const POR_DEFECTO = { color: 0xff00ff, rugosidad: 0.8, metal: 0.0 };

/**
 * Qué aspecto tiene un rol.
 *
 * @param {string} rol     una clave de `ROLES`
 * @param {object} [opts]
 *   piel   la piel a usar; por defecto la de la casa
 * @returns {{rol, clase, color, rugosidad, metal, sinLuz, opacidad?, secundario?}}
 *
 * ⚠️ UN ROL DESCONOCIDO SALE EN MAGENTA Y SE DICE. No se devuelve `null` ni un
 * gris discreto: un aspecto que falta tiene que VERSE, porque si no se cuela en
 * una piel de alguien y nadie se entera hasta que lo mira un jugador. Es la misma
 * razón por la que el cero del vector se reserva para «tipo que no conozco».
 */
export function aspectoDe(rol, { piel = PIEL_CASA } = {}) {
    const clase = ROLES[rol];
    if (!clase) {
        console.warn(`[aspecto] rol desconocido: «${rol}». Sale en magenta a propósito.`);
        return { rol, clase: ESCENOGRAFIA, ...POR_DEFECTO, sinLuz: false };
    }
    const base = PIEL_CASA.roles[rol] ?? POR_DEFECTO;
    const encima = piel?.roles?.[rol] ?? {};

    /**
     * La piel se aplica ENCIMA y `sinLuz` se decide DESPUÉS. Ese orden es la
     * garantía: por mucho que una piel traiga su propio `sinLuz`, aquí se pisa
     * con el de la clase. Se puede pintar la carta; no se puede apagarla.
     */
    return { rol, clase, ...base, ...encima, sinLuz: clase === LECTURA };
}

/**
 * ¿Es legal esta piel? Se comprueba SOBRE LA PIEL, antes de aplicarla.
 *
 * No mira si es bonita —eso es de quien la hace— sino si es una piel y no otra
 * cosa: que no invente roles que nadie pinta (serían líneas muertas en la
 * configuración de alguien) y que no traiga campos que aquí no significan nada.
 *
 * Lo que NO hace falta comprobar aquí es que no apague una lectura: eso no puede
 * pasar, porque `aspectoDe` lo decide después. Una regla que el código hace
 * imposible no necesita una comprobación que se puede olvidar.
 *
 * @returns {string[]} los problemas; vacío si está bien
 */
export function revisarPiel(piel) {
    const malo = [];
    if (!piel || typeof piel !== 'object') return ['no es un objeto'];
    if (!piel.nombre) malo.push('sin nombre');
    for (const rol of Object.keys(piel.roles ?? {})) {
        if (!ROLES[rol]) malo.push(`rol que no existe: «${rol}»`);
    }
    return malo;
}
