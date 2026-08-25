/**
 * Gramatica — EL IDIOMA DE LAS ACCIONES: `@objeto #metodo |parametros`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Es la misma tripleta con la que habla el organismo entero: 802 usos en 267
 * ficheros del proyecto general, y consagrada allí como ley en la cabecera de
 * `Cycles/AIO/Over.py`:
 *
 *     [Canon: LEY AIO-I] @Object #Method |Params is the universal action atom.
 *     "Parse percibe. Pure explica. Over EJECUTA."
 *
 * ⚠️ POR QUÉ AQUÍ, Y QUÉ HABÍA ANTES.
 *
 * El banco emitía `{verb, args}` — que ya son `#metodo |parametros`— pero sin
 * gramática declarada. Medido el 25-08 sobre los 49 entornos del catálogo:
 *
 *     otra                529 verbos  10 mundos   a2a3
 *     una palabra          99         29          subir
 *     palabra + espacio    68          1          enviar a
 *     metodo:parametro     53          6          jugar:P_5
 *     palabra_palabra      21         10          esquivar_izquierda
 *     un número             6          1          0
 *
 * **Seis gramáticas en el mismo banco, y ocho mundos mezclando dos de ellas en
 * el MISMO menú.** Quien lee ese menú —persona o modelo— tiene que adivinar qué
 * formato le están hablando en cada línea.
 *
 * ⚠️ Y EL CASO QUE LO ENSEÑA ENTERO.
 *
 * `defensa-protohub` ofrecía 68 verbos así:
 *
 *     { verb: "enviar a", args: {} }
 *     { verb: "enviar b", args: {} }
 *
 * Un método y 68 objetivos, pegados dentro de la cadena con un espacio — y
 * `args: {}` MINTIENDO: el parámetro existe, sólo que está donde nadie puede
 * leerlo. Es exactamente lo que la ley evita teniendo las tres partes separadas.
 *
 * ⚠️ EL OBJETO NO ES UNA ETIQUETA: ES LO QUE SE PUEDE RESOLVER.
 *
 * `@Chess #move |d7` no es `chess_move(d7)` con adornos. El objeto es la cosa
 * que publica `sustrato()`, así que un método genérico puede leer de él cuántas
 * casillas hay, qué leyenda usa y qué piezas existen, sin saber a qué se juega.
 * Es lo mismo que hace `Over.Resolve` allí: `_being_instances[OBJ].method(...)`.
 *
 * Y de ahí sale el premio: un Ser del proyecto general habla esta tripleta. Si
 * el banco la emite, puede jugar **sin traductor** — que es justo para lo que
 * existe `PuenteDeGimnasio`.
 *
 * ⚠️ LA GRAMÁTICA SE DECLARA, NO SE ADIVINA.
 *
 * Adivinar es lo que produjo las seis. Un guión bajo no es un separador —
 * `ir_a_planta` es UN método y `esquivar_izquierda` también—, así que aquí nadie
 * parte por guiones. Quien sabe dónde acaba el método es el mundo que lo emite,
 * y por eso lo dice él. Lo único que se impone es la regla de abajo.
 */

/**
 * ⚠️ LA ÚNICA REGLA: UN MÉTODO NO LLEVA SEPARADORES DENTRO.
 *
 * Dos puntos o un espacio dentro de un `#metodo` significan que hay un parámetro
 * escondido ahí — es literalmente el fallo de `enviar a`. Se comprueba, y por eso
 * el banco no puede volver a tener seis gramáticas sin que salte.
 */
export const SEPARADORES = /[:\s]/;

/** `alisa/Defiende-v0` → `Defiende`. El objeto es el mundo, resoluble. */
export function nombreDe(id) {
    const s = String(id ?? '');
    const barra = s.lastIndexOf('/');
    const corto = barra >= 0 ? s.slice(barra + 1) : s;
    return corto.replace(/-v\d+$/, '') || 'Mundo';
}

/**
 * Parte un verbo crudo en método y parámetros SÓLO por separadores explícitos.
 * Si no los lleva, el verbo entero es el método y no hay parámetros — que es lo
 * correcto para `subir` y para `ir_a_planta` por igual.
 */
export function partir(verbo) {
    const v = String(verbo ?? '').trim();
    if (!v) return { metodo: '', params: [] };
    const dosPuntos = v.indexOf(':');
    if (dosPuntos > 0) {
        /**
         * ⚠️ EL PRIMER DOS-PUNTOS SEPARA MÉTODO DE PARÁMETROS; LOS DEMÁS SEPARAN
         * PARÁMETROS ENTRE SÍ.
         *
         * `gofish` emite `pedir:4:1` — «pide el 4 al jugador 1». Con un solo
         * corte quedaba `#pedir |4:1`, un parámetro con estructura dentro que
         * nadie fuera puede leer: exactamente el mismo vicio que `enviar a`, en
         * pequeño. Son dos cosas, así que son dos parámetros.
         */
        return {
            metodo: v.slice(0, dosPuntos),
            params: v.slice(dosPuntos + 1).split(':').map(s => s.trim()).filter(Boolean),
        };
    }
    const espacio = v.search(/\s/);
    if (espacio > 0) {
        return { metodo: v.slice(0, espacio), params: v.slice(espacio + 1).trim().split(/\s+/).filter(Boolean) };
    }
    return { metodo: v, params: [] };
}

/**
 * La tripleta de una acción. `metodo` y `params` se respetan si el mundo los
 * declara —él sabe dónde acaba su método— y sólo se derivan cuando no lo hace.
 */
export function tripleta(objeto, accion) {
    const declarado = accion.metodo !== undefined;
    const { metodo, params } = declarado
        ? { metodo: accion.metodo, params: accion.params ?? [] }
        : partir(accion.verb);
    return { objeto: nombreDe(objeto), metodo, params: [...params] };
}

/** La forma canónica en texto: lo que una persona lee y un Ser escribe. */
export function escribir({ objeto, metodo, params = [] }) {
    const cola = params.length ? ` |${params.join(',')}` : '';
    return `@${objeto} #${metodo}${cola}`;
}

/**
 * ⚠️ EL LECTOR ÚNICO, Y EXISTE PORQUE ALLÍ NO EXISTE.
 *
 * En el proyecto general la ley está declarada y la máquina está escrita, pero
 * el paso texto→tripleta vive dentro de un `elif` de `Parse.Flow` y no se puede
 * llamar. Resultado medido: cinco sitios más se escribieron su propia regex y
 * tres de cada ocho frases se leen distinto según quién las lea.
 *
 * Aquí nace expuesto desde el primer día. Si algún día hace falta un segundo
 * lector, la comprobación lo dirá.
 */
const ATOMO = /^@([A-Za-z][\w-]*)\s+#([A-Za-z_][\w]*)(?:\s*\|\s*(.*))?$/;

export function leer(texto) {
    const m = ATOMO.exec(String(texto ?? '').trim());
    if (!m) return null;
    const crudo = (m[3] ?? '').trim();
    return {
        objeto: m[1],
        metodo: m[2],
        params: crudo ? crudo.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
}
