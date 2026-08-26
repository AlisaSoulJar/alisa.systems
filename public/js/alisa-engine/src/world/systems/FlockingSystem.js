/**
 * FlockingSystem.js — LA LEY DE LA BANDADA, CON SUS PESOS FUERA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const b = FlockingSystem.force(pez, peces, CFG_PECES, distanciaSq);
 *     if (b.count > 0) { dx += b.x; dy += b.y; dz += b.z; }
 *
 * Un átomo: dados un individuo y sus posibles vecinos, devuelve hacia dónde le
 * empuja el grupo. No sabe qué es un pez, ni un tanque, ni un juego. Todo lo que
 * lo hace «peces de acuario» y no «pájaros» son los NÚMEROS que se le pasan.
 *
 * ⚠️ ESTO NO ES `BoidsSystem`, Y CONFUNDIRLOS ERA MI ERROR.
 *
 * Conté que había «dos implementaciones del mismo Reynolds». Al leerlas de cerca
 * no lo son: son DOS LEYES DISTINTAS, y la diferencia se ve en el juego.
 *
 *   · `BoidsSystem` + `SteeringSystem` — familia FUERZA DE DIRECCIÓN. Cada regla
 *     produce una velocidad deseada, se resta la actual y se recorta por
 *     `maxForce`. Es el Reynolds del libro. Alinea por la VELOCIDAD del vecino.
 *
 *   · esto — familia DESEOS NORMALIZADOS CON PESO. Cada regla da un vector
 *     unitario y se suman con pesos (0,4 · 0,3 · 1,2 en el acuario). No hay
 *     recorte de fuerza: hay mezcla. Alinea por la DIRECCIÓN AL OBJETIVO del
 *     vecino, no por su velocidad — o sea, por su intención, no por su inercia.
 *
 * Un banco de peces con la segunda se mueve como un banco de peces; con la
 * primera, como una nube de partículas. Sustituir una por otra no habría sido
 * «quitar un duplicado»: habría sido cambiar el juego sin decirlo.
 *
 * Lo que sí era amalgama es que la ley viviera DENTRO de `EcosystemSystem`,
 * entre la estigmergia, el metabolismo y los escondites, con sus pesos escritos
 * a mano en medio del bucle. Eso es lo que sale aquí.
 *
 * ⚠️ Y SE MOVIÓ SIN CAMBIAR UNA MILÉSIMA.
 *
 * Las operaciones están en el MISMO ORDEN que tenían dentro del bucle, incluidos
 * los `|| 1` que evitan dividir por cero. En coma flotante el orden importa: si
 * se reordena una suma, la partida diverge tres mil pasos después. Lo vigila
 * `prueba_huella.mjs` — si esta extracción hubiera cambiado algo, la huella del
 * submarino se habría movido, y no se movió.
 */

export class FlockingSystem {
    /**
     * @param {Object}   self            el individuo: `{x, y, z, ...}`
     * @param {Array}    others          candidatos a vecino (se filtran con `skip`)
     * @param {Object}   cfg
     * @param {number}   cfg.neighbourRadiusSq   radio de vecindad, AL CUADRADO
     * @param {number}   cfg.separationRadius    dentro de esto, se apartan
     * @param {number}   cfg.alignmentWeight
     * @param {number}   cfg.cohesionWeight
     * @param {number}   cfg.separationWeight
     * @param {Function} cfg.heading     `(other) => ({x, y, z})` hacia dónde va un
     *                                   vecino. En el acuario es su objetivo; en
     *                                   un Reynolds de libro sería su velocidad.
     * @param {Function} cfg.skip        `(self, other) => boolean`, quién no cuenta
     * @param {Function} distanceSq      `(a, b) => number`, la métrica del mundo
     * @returns {{x: number, y: number, z: number, count: number}}
     */
    static force(self, others, cfg, distanceSq) {
        let alignX = 0, alignY = 0, alignZ = 0;
        let cohX = 0, cohY = 0, cohZ = 0;
        let sepX = 0, sepY = 0, sepZ = 0;
        let count = 0;

        for (let j = 0; j < others.length; j++) {
            const other = others[j];
            if (cfg.skip(self, other)) continue;
            const dSq = distanceSq(self, other);
            if (dSq < cfg.neighbourRadiusSq) {
                const d = Math.sqrt(dSq);
                count++;

                const h = cfg.heading(other);
                const odLen = Math.sqrt(h.x * h.x + h.y * h.y + h.z * h.z) || 1;

                alignX += h.x / odLen; alignY += h.y / odLen; alignZ += h.z / odLen;
                cohX += other.x; cohY += other.y; cohZ += other.z;

                if (d < cfg.separationRadius && d > 0.001) {
                    sepX += (self.x - other.x) / d;
                    sepY += (self.y - other.y) / d;
                    sepZ += (self.z - other.z) / d;
                }
            }
        }

        if (count === 0) return { x: 0, y: 0, z: 0, count: 0 };

        const alLen = Math.sqrt(alignX * alignX + alignY * alignY + alignZ * alignZ) || 1;
        alignX = (alignX / count / alLen) * cfg.alignmentWeight;
        alignY = (alignY / count / alLen) * cfg.alignmentWeight;
        alignZ = (alignZ / count / alLen) * cfg.alignmentWeight;

        cohX = (cohX / count) - self.x;
        cohY = (cohY / count) - self.y;
        cohZ = (cohZ / count) - self.z;
        const coLen = Math.sqrt(cohX * cohX + cohY * cohY + cohZ * cohZ) || 1;
        cohX = (cohX / coLen) * cfg.cohesionWeight;
        cohY = (cohY / coLen) * cfg.cohesionWeight;
        cohZ = (cohZ / coLen) * cfg.cohesionWeight;

        const sepLen = Math.sqrt(sepX * sepX + sepY * sepY + sepZ * sepZ) || 1;
        sepX = (sepX / sepLen) * cfg.separationWeight;
        sepY = (sepY / sepLen) * cfg.separationWeight;
        sepZ = (sepZ / sepLen) * cfg.separationWeight;

        return {
            x: alignX + cohX + sepX,
            y: alignY + cohY + sepY,
            z: alignZ + cohZ + sepZ,
            count,
        };
    }
}

/**
 * Los números del acuario, con nombre. Es lo único que hace que esta ley sea «un
 * banco de peces» y no otra cosa — y ahora se puede leer, comparar y cambiar sin
 * abrir el bucle del ecosistema.
 */
export const SHOAL = {
    neighbourRadiusSq: 25.0,      // radio 5
    separationRadius: 1.5,
    alignmentWeight: 0.4,
    cohesionWeight: 0.3,
    separationWeight: 1.2,
    heading: (o) => ({ x: o.tx - o.x, y: o.ty - o.y, z: o.tz - o.z }),
    skip: (self, o) => !o.alive || o.id === self.id || o.isHidden,
};
