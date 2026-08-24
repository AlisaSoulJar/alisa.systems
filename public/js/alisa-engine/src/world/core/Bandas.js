/**
 * BANDAS — «CALIENTE / FRÍO», UNA SOLA ESCALA PARA TODO EL BANCO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Varios juegos de la casa dicen «te estás acercando» y hasta hoy cada uno lo
 * decía a su manera. Medido el 24-08:
 *
 *     RaccoonSpaceCore   5 bandas: caliente · templado · fresco · frío · helado
 *                        cortes 0,424 / 0,583 / 0,720 / 0,872 sobre distancia
 *                        normalizada, calibrados a quintiles MEDIDOS
 *     CorpBuildingEnv    3 bandas: CALIENTE · TIBIO · FRÍO
 *                        cortes d===0 y d<=2 sobre plantas, puestos a mano
 *
 * O sea que **«caliente» quería decir cosas distintas en dos juegos del mismo
 * banco**, y «TIBIO» no existía en el otro. Un agente que aprende a leer una
 * escala se equivoca con la otra, y eso no es una dificultad del juego: es ruido
 * de vocabulario que el banco le mete encima.
 *
 * ⚠️ LO QUE SE UNIFICA ES EL IDIOMA, NO LOS CORTES.
 *
 * Los cortes tienen que seguir siendo de cada juego: los de Raccoon salen de
 * medir dónde caen sus distancias y los del edificio cuentan plantas enteras.
 * Igualarlos sería inventarse una calibración. Lo que se comparte es CÓMO SE
 * LLAMAN los peldaños y en qué orden van, que es lo único que un modelo puede
 * transferir de un juego a otro.
 *
 * Y un juego con menos información publica menos peldaños — pero de esta misma
 * escala, no de otra.
 */

/**
 * La escala, de más cerca a más lejos. El orden ES la información: quien la lea
 * puede comparar dos bandas sin saber nada del juego.
 */
export const ESCALA = ['caliente', 'templado', 'fresco', 'frío', 'helado'];

/**
 * La versión de tres peldaños, para juegos cuya pista es más gruesa. Se sacan de
 * la escala grande —los extremos y el medio— en vez de inventar palabras nuevas:
 * así «caliente» sigue siendo el peldaño de estar encima y «helado» el de estar
 * lejísimos, valga para el juego que valga.
 */
export const ESCALA_CORTA = ['caliente', 'fresco', 'helado'];

/**
 * Construye una función que traduce un número a su banda.
 *
 * @param {Array<[number, string]>} cortes pares [umbral, etiqueta], de menor a
 *        mayor. El último debe ser `Infinity` para que nada se quede fuera.
 * @returns {(valor:number) => string}
 *
 * ⚠️ EL ÚLTIMO CORTE TIENE QUE SER `Infinity`, Y SE COMPRUEBA.
 * Sin él, un valor mayor que el último umbral devuelve `undefined`, y
 * `undefined` viajando como si fuera una pista es un fallo que no da error:
 * la puerta de lenguaje diría «el 3 estaba undefined» y la numérica pondría un
 * cero, que significa otra cosa.
 */
export function crearBandas(cortes) {
    if (!Array.isArray(cortes) || !cortes.length) {
        throw new Error('crearBandas: hacen falta cortes [[umbral, etiqueta], …]');
    }
    const ultimo = cortes[cortes.length - 1];
    if (ultimo[0] !== Infinity) {
        throw new Error('crearBandas: el último corte tiene que ser Infinity, o habrá '
                      + `valores sin banda (el último es ${ultimo[0]})`);
    }
    for (const [, etiqueta] of cortes) {
        if (!ESCALA.includes(etiqueta)) {
            throw new Error(`crearBandas: "${etiqueta}" no está en la escala común `
                          + `(${ESCALA.join(', ')}). Un nombre nuevo es un idioma nuevo.`);
        }
    }
    return (valor) => {
        for (const [umbral, etiqueta] of cortes) if (valor < umbral) return etiqueta;
        return cortes[cortes.length - 1][1];
    };
}

/** Cómo de cerca está una banda, de 1 (encima) a 0 (lejísimos). Para la puerta numérica. */
export function calorDe(banda) {
    const i = ESCALA.indexOf(banda);
    return i < 0 ? 0 : 1 - i / (ESCALA.length - 1);
}
