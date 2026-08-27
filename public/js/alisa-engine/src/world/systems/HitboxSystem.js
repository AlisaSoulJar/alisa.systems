/**
 * HitboxSystem — ¿QUÉ TOCA A QUÉ, Y CON CUÁNTA HOLGURA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     Hitbox.distancia(a, b)              → la separación entre dos puntos
 *     Hitbox.tocan(a, b, holgura)         → ¿se solapan sus radios?
 *     Hitbox.zona(a, b, CORTES)           → 'toca' · 'roza' · null
 *     Hitbox.dentroDeCaja(punto, caja)    → para lo que no es redondo
 *
 * ⚠️ POR QUÉ EXISTE: ONCE FICHEROS SE ESCRIBEN SU PROPIO `Math.hypot`.
 *
 * Contado el 27-08-2026 sobre los 65 sistemas del motor. No es que la cuenta sea
 * difícil —son tres restas y una raíz— es que cuando está escrita once veces,
 * cada juego tiene su propio criterio de qué significa «tocar»: uno suma los dos
 * radios, otro pone un umbral plano, otro compara al cuadrado. Y entonces «me ha
 * dado» quiere decir cosas distintas en dos etapas del mismo sitio, que es
 * exactamente la avería que `Bandas.js` vino a arreglar con las palabras.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ LA RAÍZ ESTÁ COPIADA LETRA POR LETRA, Y ESO NO ES DESCUIDO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Math.sqrt(dx*dx + dy*dy + dz*dz)` y `Math.hypot(dx, dy, dz)` **no dan el
 * mismo número**. `hypot` está hecho para no desbordar y hace un escalado
 * interno; el resultado puede diferir en el último bit. En un banco donde una
 * partida se verifica volviéndola a jugar, ese bit es la diferencia entre «la
 * huella no se ha movido» y una tarde buscando qué se rompió.
 *
 * Así que esto es el `dist3` de `AsteroidsSystem`, tal cual, sin mejorarlo.
 * Cuando se saca una pieza de un juego que ya tiene notas publicadas, la
 * fidelidad manda sobre el gusto.
 *
 * ⚠️ Y TIENE DOS NIVELES A PROPÓSITO, PORQUE NO TODO CHOQUE ES UNA SUMA.
 *
 * Al ir a enchufarlo salió que la nave de Pedrisco **no tiene radio**: su choque
 * contra una bala es `dist3(p, nave) < 2.0`, un umbral plano. Pasarlo por
 * `tocan()` habría dado `d < p.radius + 2.0` —otro juego, sin avisar—. La salida
 * fácil era inventarle un radio a la nave para que el átomo luciera más usado.
 *
 * No se hace. Quien tiene un umbral plano llama a `distancia()` y compara él;
 * quien suma radios llama a `tocan()`. Forzar un sitio para que encaje en la
 * pieza es cómo una extracción cambia un juego sin que nadie lo pida.
 */

export class Hitbox {
    /** La separación entre dos puntos con `x,y,z`. Los que no traen `z` valen 0. */
    static distancia(a, b) {
        const dx = a.x - b.x;
        const dy = (a.y ?? 0) - (b.y ?? 0);
        const dz = (a.z ?? 0) - (b.z ?? 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Sin la raíz, para cuando sólo hay que comparar y no medir. Es la forma que
     * ya usaban por su cuenta `LightFixtureSystem` y `EcosystemSystem`: comparar
     * cuadrados evita una raíz por vecino y por fotograma, y con muchos bichos
     * eso se nota.
     */
    static distanciaSq(a, b) {
        const dx = a.x - b.x;
        const dy = (a.y ?? 0) - (b.y ?? 0);
        const dz = (a.z ?? 0) - (b.z ?? 0);
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * ¿Se solapan? Suma de radios más la holgura que se quiera.
     *
     * Un objeto sin `radius` cuenta como un punto. Es el caso de la mayoría de
     * las balas contra cosas gordas, y hacerlo explícito evita el `undefined`
     * silencioso que convierte una comparación en `false` para siempre.
     */
    static tocan(a, b, holgura = 0) {
        return Hitbox.distancia(a, b) < (a.radius ?? 0) + (b.radius ?? 0) + holgura;
    }

    /**
     * En qué banda de cercanía está `a` respecto de `b`. Los cortes van del más
     * cerrado al más abierto: `[[1.2, 'toca'], [4, 'roza']]`.
     *
     * ⚠️ ESTO ES LA MECÁNICA COMPARTIDA, NO UN ADORNO SOBRE `tocan`.
     *
     * Pedrisco tiene dos radios sobre el mismo asteroide: uno mata y el otro
     * —cuatro unidades más afuera— cuenta un roce y SUMA. Pasar rozando es la
     * mecánica que da puntos en ese juego. Y pasar entre dos tuberías sin tocar
     * ninguna es exactamente lo mismo contado de otra forma.
     *
     * Dos juegos con la misma regla es lo que convierte esto en una pieza y no
     * en un ayudante privado.
     *
     * ⚠️ Y LA COMPARACIÓN CONSERVA LA FORMA DEL ORIGINAL: `d < r + holgura`.
     *
     * Se podría restar —`d - r < holgura`— y leería mejor. Pero en coma flotante
     * restar-y-comparar no da siempre lo mismo que sumar-y-comparar, y este
     * método se estrenó sustituyendo a un juego con la huella sellada.
     *
     * @param {number} [d] la distancia, si ya se calculó fuera
     * @returns {string|null} el nombre de la banda, o `null` si está lejos
     */
    static zona(a, b, cortes, d = Hitbox.distancia(a, b)) {
        const r = b.radius ?? 0;
        for (const [holgura, nombre] of cortes) {
            if (d < r + holgura) return nombre;
        }
        return null;
    }

    /**
     * ¿Está el punto dentro de la caja? La caja es su centro más sus tres
     * medidas COMPLETAS —no medias—, que es como se leen en un plano.
     *
     * ⚠️ ESTA MITAD ES NUEVA Y NO LA PRUEBA PEDRISCO. Se dice aquí.
     *
     * Todo lo de arriba salió de un juego sellado y se comprobó con su huella:
     * si hubiera cambiado un bit, `prueba_huella` lo habría dicho. Esto no —
     * Pedrisco sólo choca por esferas—. Lo estrena ¡Impulso!, y quien lo prueba
     * es la huella de ¡Impulso!, que es una prueba más floja porque el juego nace
     * con ella. Marcarlo es más honesto que dejar que se confunda con lo otro.
     *
     * Un eje sin medida no acota: una caja con `fondo` sin definir es una pared
     * infinita hacia el fondo, que es justo lo que hace falta para un obstáculo
     * en un juego de perfil.
     */
    static dentroDeCaja(punto, caja) {
        const dentro = (v, c, medida) => medida === undefined
            || (v >= c - medida / 2 && v <= c + medida / 2);
        return dentro(punto.x, caja.x, caja.ancho)
            && dentro(punto.y ?? 0, caja.y ?? 0, caja.alto)
            && dentro(punto.z ?? 0, caja.z ?? 0, caja.fondo);
    }

    /**
     * Lo mismo pero con un cuerpo redondo en vez de un punto: el radio se le
     * suma a la caja por los tres lados. Es lo que hace falta cuando quien
     * choca no es un punto sino un bicho con tamaño.
     */
    static tocaCaja(cuerpo, caja, holgura = 0) {
        const r = (cuerpo.radius ?? 0) + holgura;
        return Hitbox.dentroDeCaja(cuerpo, {
            x: caja.x, y: caja.y, z: caja.z,
            ancho: caja.ancho === undefined ? undefined : caja.ancho + r * 2,
            alto: caja.alto === undefined ? undefined : caja.alto + r * 2,
            fondo: caja.fondo === undefined ? undefined : caja.fondo + r * 2,
        });
    }
}

export default Hitbox;
