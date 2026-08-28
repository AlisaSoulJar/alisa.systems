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

    /**
     * ── Los props del catálogo ────────────────────────────────────────
     *
     * ⚠️ ESTOS NUEVE NOMBRES NO ME LOS HE INVENTADO: LOS CONTÉ.
     *
     * `public/props/*.json` son dieciséis catálogos con 234 props y 754 piezas,
     * cada una con sus medidas en metros y —esto es lo bueno— **su material
     * declarado por NOMBRE**, no por hex. Contados:
     *
     *     365  dark        51  container      17  sprite
     *     196  base        35  l3_screen      15  red_neo
     *      29  glass       33  cyan_neo       13  vehicle
     *
     * O sea que el catálogo ya cumplía la ley de `paleta.js` —declarar por
     * nombre— desde antes de que existiera este fichero. Sólo le faltaba alguien
     * a quien preguntarle qué significa cada nombre. Van con prefijo `prop:` para
     * no chocar con los roles de la sala.
     *
     * ⚠️ Y LAS PANTALLAS Y LOS NEONES SON LECTURA, NO DECORACIÓN.
     *
     * `l3_screen`, `cyan_neo` y `red_neo` son pantallas y rótulos: llevan
     * INFORMACIÓN. Un cartel que se apaga porque la sala cambió de luz es el
     * mismo fallo que la carta lavada, y en un editor abierto sería el primero
     * que alguien provocaría sin querer.
     */
    'prop:base':       ESCENOGRAFIA,
    'prop:dark':       ESCENOGRAFIA,
    'prop:container':  ESCENOGRAFIA,
    'prop:glass':      ESCENOGRAFIA,
    'prop:sprite':     ESCENOGRAFIA,
    'prop:vehicle':    ESCENOGRAFIA,
    'prop:l3_screen':  LECTURA,
    'prop:cyan_neo':   LECTURA,
    'prop:red_neo':    LECTURA,
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

        // Los nueve del catálogo entran abajo, desde la paleta `concrete`.
    },
};

/**
 * ⚠️ LA PALETA `concrete`, COPIADA DE `palettes.json` — Y VIGILADA.
 *
 * Los props del catálogo no tienen color propio: lo pone la paleta. Así que la
 * piel de la casa les da la NEUTRA de las diez, que es la que existe para eso.
 *
 * Está copiada aquí porque este fichero no lee disco ni red —es lo que lo hace
 * puro y utilizable desde los dos motores— y una copia se separa: eso ya nos ha
 * pasado con el acabado de la mesa, dos veces. Por eso `prueba_aspecto.mjs`
 * compara estos cinco colores contra `public/props/palettes.json` y suspende si
 * dejan de coincidir. Una copia con guardia no es una copia: es una caché.
 *
 * ⚠️ Y NO ELEGÍ YO ESTOS GRISES. La única decisión mía es CUÁL de las diez
 * paletas es la de por defecto, y `concrete` es la única sin carácter — las
 * otras nueve pintan un sitio (industrial, médico, abandonado…), y un color por
 * defecto que ya cuenta una historia no es un valor por defecto.
 */
export const PALETA_CONCRETE = {
    colors: ['#808080', '#909090', '#707070', '#999999', '#686868'],
    accents: ['#505050'],
    overlays: ['ov_concrete', 'ov_dirt'],
    textures: [],
    roughness: [0.85, 1],
};

Object.assign(PIEL_CASA.roles, pielDePaleta('concrete', PALETA_CONCRETE).roles);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  UNA PALETA DEL CATÁLOGO, CONVERTIDA EN PIEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ YA TENEMOS DIEZ PIELES ESCRITAS Y NADIE LO SABÍA.
 *
 * `public/props/palettes.json` guarda diez paletas con nombre —industrial,
 * organic, luxury, abandoned, military, medical, cyber, nautical, residential,
 * concrete— y cada una trae exactamente lo que una piel necesita:
 *
 *     colors[]     el cuerpo             accents[]   lo que llama la atención
 *     roughness    [min, max]            overlays[]  el grano
 *
 * Las carga `AssetManager`, que resuelve categoría → paleta → semilla → color. Y
 * `AssetManager.spawn()` no lo llama NADIE: comprobado, cero llamantes fuera de
 * su propio fichero. Así que la biblioteca de pieles del Maker no hay que
 * escribirla; hay que enchufarla.
 *
 * ⚠️ LA PALETA ENTRA POR PARÁMETRO: ESTE FICHERO NO LEE DISCO NI RED.
 * Es lo que lo mantiene puro, probable en Node sin navegador y utilizable desde
 * los dos motores. Cargar el JSON es del que llama.
 *
 * ⚠️ Y LOS ACENTOS VAN A LAS PANTALLAS, QUE NO ES UNA DECISIÓN ESTÉTICA.
 * En la paleta `cyber` los acentos son `#00ffff`, `#ff00ff`, `#39ff14` — cian,
 * magenta y verde neón. Son literalmente los colores de un rótulo encendido, y
 * los roles que los reciben son los tres de LECTURA. Cuadra porque el catálogo
 * ya estaba pensado así; yo sólo he unido las dos mitades.
 *
 * @param {string} nombre   cómo se llama la paleta, para poder decirlo
 * @param {object} paleta   la entrada de `palettes.json`
 * @param {object} [opts]   `semilla` — la misma da siempre la misma piel
 */
export function pielDePaleta(nombre, paleta, { semilla = 0 } = {}) {
    const hex = (s) => parseInt(String(s).replace('#', ''), 16);
    const colores = paleta?.colors?.length ? paleta.colors : ['#808080'];
    const acentos = paleta?.accents?.length ? paleta.accents : colores;
    const [rMin = 0.8, rMax = 0.9] = paleta?.roughness ?? [];

    // Un reparto determinista: la misma semilla da siempre la misma piel, que es
    // lo que permite que dos personas en la misma sala vean lo mismo.
    const elige = (lista, i) => hex(lista[(semilla + i) % lista.length]);
    const rug = (i) => +(rMin + ((rMax - rMin) * ((semilla + i) % 5)) / 4).toFixed(3);

    return {
        nombre: `paleta:${nombre}`,
        roles: {
            'prop:base':      { color: elige(colores, 0), rugosidad: rug(0), metal: 0.02 },
            'prop:dark':      { color: elige(colores, 4), rugosidad: rug(1), metal: 0.05 },
            'prop:container': { color: elige(colores, 2), rugosidad: rug(2), metal: 0.10 },
            'prop:vehicle':   { color: elige(colores, 3), rugosidad: rug(3), metal: 0.25 },
            'prop:sprite':    { color: elige(colores, 1), rugosidad: rug(4), metal: 0.00 },
            // El cristal no sale de la paleta: es cristal en todas ellas.
            'prop:glass':     { color: 0x9fb0c0, rugosidad: 0.08, metal: 0.00, opacidad: 0.35 },
            // Los tres de lectura, con los acentos.
            'prop:l3_screen': { color: elige(acentos, 0) },
            'prop:cyan_neo':  { color: elige(acentos, 1) },
            'prop:red_neo':   { color: elige(acentos, 2) },
        },
    };
}

/**
 * El desgaste, que es el segundo eje que la paleta ya traía.
 *
 * `palettes.json._wear_effects` declara cinco estados —`pristine`, `used`,
 * `worn`, `damaged`, `ruined`— con cuánto oscurecen, cuánta rugosidad añaden y
 * cuánta saturación quitan. Es una piel aplicada sobre otra piel, y por eso se
 * escribe como una función y no como una tabla más.
 *
 * ⚠️ NO TOCA LOS ROLES DE LECTURA. Una pantalla desgastada sigue teniendo que
 * leerse: envejecer un cartel hasta que no se distingue es cambiar el juego, no
 * el aspecto. Es la misma ley de arriba, aplicada al segundo eje — y si no
 * estuviera aquí, el desgaste sería la puerta de atrás para apagar una lectura.
 */
export function gastar(piel, efecto) {
    if (!efecto) return piel;
    const { darken = 0, roughnessBoost = 0, saturationMult = 1 } = efecto;
    const roles = {};
    for (const [rol, v] of Object.entries(piel?.roles ?? {})) {
        if (ROLES[rol] === LECTURA) { roles[rol] = v; continue; }
        const r = Math.max(0, Math.min(255, (v.color >> 16) & 255));
        const g = Math.max(0, Math.min(255, (v.color >> 8) & 255));
        const b = Math.max(0, Math.min(255, v.color & 255));
        const media = (r + g + b) / 3;
        const ajusta = (c) => Math.round(
            Math.max(0, Math.min(255, (media + (c - media) * saturationMult) * (1 - darken))));
        roles[rol] = {
            ...v,
            color: (ajusta(r) << 16) | (ajusta(g) << 8) | ajusta(b),
            rugosidad: v.rugosidad === undefined
                ? undefined : Math.min(1, v.rugosidad + roughnessBoost),
        };
    }
    return { nombre: `${piel?.nombre ?? 'piel'}+${efecto.nombre ?? 'gastada'}`, roles };
}

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
