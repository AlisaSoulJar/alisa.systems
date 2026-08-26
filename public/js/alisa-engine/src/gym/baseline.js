/**
 * suelo.js — EL SUELO CIEGO: LAS SIETE POLÍTICAS QUE NO MIRAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Siete formas de jugar sin entender nada. Son la vara con la que se mide todo
 * lo demás en este banco: un entorno vale si les da notas distintas, y una
 * partida acredita si les gana.
 *
 * ⚠️ POR QUÉ ESTÁN AQUÍ Y NO EN CADA SITIO QUE LAS USA.
 *
 * Estaban escritas dos veces —`prueba_senal.mjs` y `acreditar.mjs`— y **no eran
 * iguales**. Medido el 25-08, el mismo día que escribí la segunda:
 *
 *     prueba_senal   semillas [1, 7, 99]   bandido con exploración ε=0.15
 *     acreditar      semillas [1, 7, 42]   bandido sin exploración
 *
 * Y en `acreditar.mjs` puse el comentario «las MISMAS siete de prueba_senal, no
 * se inventa un suelo nuevo». Era falso mientras lo escribía.
 *
 * La consecuencia no es estética: un recibo se juzgaba contra un suelo DISTINTO
 * del que el banco publica. Alguien podía acreditar contra una vara y aparecer
 * en una tabla medida con otra, y las dos dirían «superó a las siete políticas
 * ciegas» significando cosas distintas.
 *
 * Es exactamente la avería que llevo el día persiguiendo en el parser del
 * organismo —seis lectores de un idioma, tres de cada ocho frases leídas
 * distinto— cometida por mí en la misma tarde en que la denunciaba. Por eso el
 * suelo vive aquí, expuesto, y quien lo quiera lo importa.
 *
 * ⚠️ Y LA CANÓNICA ES LA DE `prueba_senal`, NO LA MÍA.
 *
 * No por antigüedad: porque es la que tiene trinquete y sabotaje declarado, y
 * la que produjo el número publicado «46 de 49 entornos separan políticas». Si
 * se adopta la otra, ese número deja de significar lo que dice.
 */

/** El azar del suelo: reproducible, y el mismo para todos. */
export function seededRng(semilla) {
    let x = semilla >>> 0 || 1;
    return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
}

/** Las semillas de las tres políticas de azar. Parte del contrato del suelo. */
export const BASELINE_SEEDS = [1, 7, 99];

/**
 * Las siete, recién hechas. Se llama una vez por medición: el bandido tiene
 * memoria, y reusar la instancia entre entornos le daría un recuerdo prestado.
 *
 * `elegir(opciones, i)` devuelve UN elemento de la lista, sea del tipo que sea:
 * los mundos propios ofrecen objetos `{verb, args}` y el arcade cadenas sueltas.
 * Ninguna política mira dentro — por eso son ciegas, y por eso valen para los dos.
 *
 * `aprender(clave, premio)` sólo lo usa el bandido. La clave la pone quien
 * llama, porque sólo él sabe qué identifica una jugada en su mundo.
 */
export function blindPolicies() {
    const lista = [
        { nombre: 'ciclo',   elegir: (v, i) => v[i % v.length] },
        { nombre: 'primera', elegir: (v) => v[0] },
        { nombre: 'ultima',  elegir: (v) => v[v.length - 1] },
    ];
    for (const s of BASELINE_SEEDS) {
        const r = seededRng(s);
        lista.push({ nombre: `azar${s}`, elegir: (v) => v[Math.floor(r() * v.length) % v.length] });
    }

    /**
     * El bandido: se queda con la jugada que mejor media de recompensa lleva, y
     * de vez en cuando prueba otra. No sabe jugar a nada, pero encuentra la
     * palanca que paga — y con eso basta para separar un entorno de uno plano.
     *
     * Es el rival exigente del suelo: ganar a `primera` no dice gran cosa;
     * ganarle a éste significa que hiciste algo que no se descubre a tientas.
     */
    const memoria = new Map();
    const r = seededRng(4242);
    lista.push({
        nombre: 'bandido',
        elegir: (v) => {
            if (r() < 0.15) return v[Math.floor(r() * v.length) % v.length];
            let mejor = v[0], mejorNota = -Infinity;
            for (const o of v) {
                const clave = o?.verb ?? o;
                const m = memoria.get(clave);
                const nota = m ? m.suma / m.n : 0.001;   // lo no probado, un pelín mejor que 0
                if (nota > mejorNota) { mejorNota = nota; mejor = o; }
            }
            return mejor;
        },
        aprender: (clave, premio) => {
            const m = memoria.get(clave) ?? { suma: 0, n: 0 };
            m.suma += premio; m.n++;
            memoria.set(clave, m);
        },
    });
    return lista;
}
