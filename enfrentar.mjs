/**
 * enfrentar.mjs — las cuentas de la segunda tabla, sueltas y probables
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `enfrentamiento.mjs` es un guion: carga cuarenta juegos, juega miles de
 * partidas y escribe una tabla. Nada de eso se puede probar deprisa, y por eso
 * las tres cuentas de las que depende el resultado viven aquí sueltas — igual que
 * `medir.mjs` sacó `huecoEmparejado` de las sondas que lo usaban.
 *
 * Son las tres que, si se equivocan, se equivocan EN SILENCIO y en verde:
 *
 *   `repartoDe`     si no reparte parejo, la ventaja de la primera silla se
 *                   contabiliza como habilidad de quien la ocupe
 *   `bradleyTerry`  si dependiera del orden, la misma tanda daría dos tablas
 *   `contarSillas`  si cuenta de menos, un juego de ocho pasa por solitario
 */

/**
 * Qué participante ocupa cada silla en la vuelta `r`.
 *
 *     silla k  ←  participante (k + r) mod P
 *
 * Con r recorriendo 0..P−1, el participante p ocupa la silla k exactamente cuando
 * r ≡ p − k (mod P): UNA vez por vuelta, PARA CADA SILLA. De ahí salen las dos
 * propiedades que sostienen la tabla —el reparto parejo de sillas, y que por cada
 * (semilla, silla) pasen todos, que es la mano duplicada del bridge— y las dos se
 * comprueban contando en `prueba_enfrentamiento.mjs`, no confiando en esta nota.
 */
export function repartoDe(sillas, r, P) {
    return Array.from({ length: sillas }, (_, k) => (k + r) % P);
}

/**
 * Cuántas sillas tiene un juego, leído de lo que su estado publique.
 *
 * Cuatro candidatos porque los cuarenta juegos no se pusieron de acuerdo en cómo
 * decirlo, y ninguno lo dice de las cuatro formas:
 *
 *   `marcador`       una entrada por silla — los de cartas y tablero
 *   `manos_rivales`  «los demás», por eso el +1
 *   `avance`         los de recorrido
 *   `vivos`          los de deducción social, y es un NÚMERO, no una lista
 *
 * ⚠️ `vivos` MENGUA según cae gente, así que quien llame a esto tiene que
 * quedarse con el máximo visto en la partida y no con el de un instante. Sin ese
 * cuarto candidato, shinigami —ocho sillas con puntuación y roles propios— salía
 * clasificado como juego de un jugador, sin dar un solo error.
 */
export function contarSillas(e) {
    return Math.max(1,
        Array.isArray(e?.marcador) ? e.marcador.length : 0,
        Array.isArray(e?.manos_rivales) ? e.manos_rivales.length + 1 : 0,
        Array.isArray(e?.avance) ? e.avance.length : 0,
        Number.isInteger(e?.vivos) ? e.vivos : 0);
}

/**
 * BRADLEY–TERRY POR MINORIZACIÓN (MM).
 *
 *     fuerza_i  ←  victorias_i / Σ_j  partidas_ij / (fuerza_i + fuerza_j)
 *
 * Es la versión de máxima verosimilitud del modelo del que sale Elo, ajustada
 * sobre el conjunto ENTERO de partidas. Elo actualiza una a una y por eso su
 * resultado depende del orden en que se jueguen; esto no depende de nada más que
 * de las cuentas `n` y `w`, así que las mismas partidas dan la misma tabla
 * siempre. En una casa donde todo lleva recibo, un número que cambia según el
 * orden de lectura no vale.
 *
 * Se normaliza por la media geométrica en cada vuelta: fija la escala sin mover
 * las diferencias, que son lo único que el modelo determina.
 *
 * ⚠️ Quien no pierda ni una vez se va a infinito, y no es un fallo del método: no
 * hay dato que diga CUÁNTO mejor es, sólo que no perdió. Quien llame a esto tiene
 * que regularizar antes y avisar en la fila.
 */
export function bradleyTerry(n, w, vueltas = 500) {
    const P = w.length;
    let f = new Array(P).fill(1);
    for (let it = 0; it < vueltas; it++) {
        const nuevo = new Array(P).fill(0);
        for (let i = 0; i < P; i++) {
            let den = 0;
            for (let j = 0; j < P; j++) {
                if (i === j || !n[i][j]) continue;
                den += n[i][j] / (f[i] + f[j]);
            }
            nuevo[i] = den > 0 ? w[i] / den : f[i];
        }
        const positivos = nuevo.filter((x) => x > 0);
        const g = positivos.length
            ? Math.exp(positivos.reduce((s, x) => s + Math.log(x), 0) / positivos.length) : 1;
        f = nuevo.map((x) => (x > 0 ? x / g : 1e-9));
    }
    return f;
}

/** De fuerzas a puntos tipo Elo, anclando al participante `base` en 1000. */
export const aElo = (f, base = 0) =>
    f.map((x) => 1000 + 400 * Math.log10(x / (f[base] > 0 ? f[base] : 1)));
