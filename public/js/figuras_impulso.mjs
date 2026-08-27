/**
 * figuras_impulso.mjs — EL ASPECTO DEL JUEGO DE UN BOTÓN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const pintor = new PintorMundo(escena, figurasDeImpulso(THREE), 1);
 *
 * ⚠️ EL MURO ES EL MONOLITO DE PEDRISCO, Y NO POR AHORRAR TRABAJO.
 *
 * `AST_TYPES.MONO` es el bloque negro e irrompible de ¡Esquiva! 1 —`hp: 999999`—
 * y su figura ya dice lo que hay que decir: liso, oscuro, brillante, «esto no se
 * rompe, se esquiva». En este juego eso es exactamente lo que es un muro.
 *
 * Reusar su COLOR y su acabado hace que las dos etapas de la saga se lean como
 * la misma familia sin que nadie tenga que acordarse de un manual de estilo. Es
 * lo mismo que ya hacen `Bandas.js` con las palabras: el vocabulario compartido
 * ahorra menos trabajo del que parece y evita más confusiones de las que parece.
 *
 * ⚠️ Y EL MURO NO ES UNA FIGURA FIJA: SE ESTIRA CON SU PIEZA.
 *
 * Cada muro son dos cajas de altura distinta —lo que queda por debajo y por
 * encima del hueco— y esa altura la publica el núcleo en `largo`. Aquí se lee y
 * se escala. Si la figura tuviera una altura propia, el dibujo diría un hueco y
 * las reglas otro, que es la avería que este proyecto lleva un mes persiguiendo.
 */

/**
 * El encuadre: de perfil y de frente, como un juego de plataformas. Va con las
 * figuras porque desde dónde se mira decide tanto como de qué color es cada cosa
 * —y porque así la página no mueve ni un objeto 3D—.
 */
/**
 * ⚠️ SE ENCUADRA POR ANCHO **Y** POR ALTO, Y HAY QUE MIRAR EL `aspect`.
 *
 * La primera versión ponía la cámara a `max(ancho, alto) * 1,15` y en una
 * ventana apaisada se veía bien. En una estrecha —o en la captura, que es
 * vertical— la mitad del mundo se quedaba fuera: **los muros nacían fuera de
 * cuadro y aparecían de golpe a once unidades del pájaro**, medio segundo de
 * aviso en un juego que va de anticipar. No era un problema de estética: era el
 * juego contando otra cosa según el tamaño de la ventana.
 *
 * En una cámara en perspectiva el `fov` es VERTICAL, así que el ancho visible
 * depende del `aspect`. Se calculan las dos distancias y se coge la mayor.
 */
export function encuadrarImpulso(gfx, alto = 24, ancho = 34) {
    const cam = gfx.camera;
    /** El mundo que hay que ver: del pájaro (x=0) hasta donde nacen los muros. */
    const xMin = -4, xMax = ancho + 2;
    const centroX = (xMin + xMax) / 2;
    const semiAncho = (xMax - xMin) / 2;
    const semiAlto = alto / 2 + 1;

    const mediaFov = ((cam.fov ?? 50) * Math.PI) / 180 / 2;
    const porAlto = semiAlto / Math.tan(mediaFov);
    const porAncho = semiAncho / (Math.tan(mediaFov) * (cam.aspect || 1));

    cam.position.set(centroX, alto / 2, Math.max(porAlto, porAncho) * 1.06);
    gfx.controls.target.set(centroX, alto / 2, 0);
    gfx.controls.update();
}

/**
 * Inclina la nave según si sube o baja, y enciende la llama cuando empuja.
 *
 * Es lo único que se anima por fotograma y no cambia ninguna regla: sale todo de
 * `vy`, que ya viaja en el sustrato. La llama importa más de lo que parece —
 * este juego tiene UNA decisión y hasta ahora no se veía cuándo se había
 * tomado—, pero sigue siendo aspecto: quien juega ya lo sabía porque acababa de
 * pulsar; el que mira, no.
 */
export function inclinarNave(pintor, sustrato) {
    const p = (sustrato?.piezas ?? []).find((q) => q.t === 'nave');
    const m = pintor?.malla?.('nave');
    if (!p || !m) return;
    const objetivo = Math.max(-0.9, Math.min(0.7, (p.vy ?? 0) * 0.05));
    m.rotation.z += (objetivo - m.rotation.z) * 0.25;
    const llama = m.getObjectByName('llama');
    if (llama) {
        llama.visible = (p.vy ?? 0) > 1;
        llama.scale.setScalar(0.6 + Math.min(1.2, Math.max(0, (p.vy ?? 0) / 12)));
    }
}

export function figurasDeImpulso(THREE) {
    /**
     * El acabado del monolito de Pedrisco, letra por letra. No se importa
     * `AST_TYPES` porque de allí sólo saldría el color y aquí hace falta también
     * el material: copiar cuatro números y decir de dónde salen es más honesto
     * que un import que sugiere que comparten algo que no comparten.
     */
    const muro = (opacidad, brillo) => (tipo, pieza) => {
        const g = new THREE.Group();
        const alto = Math.max(0.001, pieza?.largo ?? 1);
        const ancho = pieza?.ancho ?? 2.2;
        g.add(new THREE.Mesh(
            new THREE.BoxGeometry(ancho, alto, ancho),
            new THREE.MeshStandardMaterial({
                color: 0x111111, roughness: 0.15, metalness: 0.9,
                emissive: 0x2a1a4a, emissiveIntensity: brillo,
                transparent: opacidad < 1, opacity: opacidad,
            })));
        return g;
    };

    /**
     * El suelo y el techo. Son una sola figura porque son una sola regla —el
     * borde del mundo— y porque el núcleo los publica en una pieza sola con su
     * `ancho` y su `largo`. Si tuvieran altura propia aquí, el dibujo diría un
     * borde y las reglas otro.
     */
    const marco = () => (tipo, pieza) => {
        const g = new THREE.Group();
        const ancho = (pieza?.ancho ?? 34) + 12;
        const alto = pieza?.largo ?? 24;
        const mat = new THREE.MeshStandardMaterial({
            color: 0x2b2f45, roughness: 0.95, metalness: 0.05,
            emissive: 0x151a2e, emissiveIntensity: 0.8,
        });
        for (const y of [0, alto]) {
            const losa = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.6, 3), mat);
            losa.position.set(ancho / 2 - 8, y, 0);
            g.add(losa);
        }
        return g;
    };

    return {
        marco: { malla: marco() },
        muro: { malla: muro(1, 0.5) },
        /** Ya pasado: el mismo bloque apagado, para que se vea lo que llevas. */
        muro_pasado: { malla: muro(0.35, 0.15) },

        /**
         * ⚠️ LA MISMA NAVE DE ¡ESQUIVA! 1, Y ES LO MÁS BARATO QUE HE HECHO HOY.
         *
         * Era una bola amarilla con un pico —un pájaro— y dejó de tener sentido
         * en cuanto el juego dejó de llamarse como se llamaba. La sustituye el
         * cono de `figuras_pedrisco`: mismo color, mismo brillo, misma luz.
         *
         * Y no es sólo ahorro. Las dos etapas de la saga pasan a enseñar **la
         * misma nave esquivando los mismos monolitos negros**: en la 1 vuelas
         * libre por un túnel, en la 2 sólo tienes empuje. Que se vea que es la
         * misma nave es exactamente lo que una saga tiene que contar, y sale
         * gratis por reusar la figura en vez de dibujar otra.
         *
         * El cono nace apuntando a +Y y aquí se recuesta sobre +X, porque este
         * juego avanza en horizontal y no en profundidad.
         */
        nave: {
            malla: () => {
                const g = new THREE.Group();
                const color = 0x7fd1ff;
                const cuerpo = new THREE.Mesh(
                    new THREE.ConeGeometry(0.55, 1.8, 8),
                    new THREE.MeshStandardMaterial({
                        color, emissive: color, emissiveIntensity: 0.9,
                        roughness: 0.35, metalness: 0.7,
                    }));
                cuerpo.rotation.z = -Math.PI / 2;
                g.add(cuerpo);
                /**
                 * La llama del empuje. Se enciende sólo cuando la nave sube, así
                 * que quien mire ve CUÁNDO se ha pulsado — que es la única
                 * decisión que tiene este juego, y hasta ahora no se veía.
                 */
                const llama = new THREE.Mesh(
                    new THREE.ConeGeometry(0.3, 1.1, 7),
                    new THREE.MeshBasicMaterial({
                        color: 0xffb347, transparent: true, opacity: 0.85,
                    }));
                llama.name = 'llama';
                llama.rotation.z = Math.PI / 2;
                llama.position.x = -1.0;
                llama.visible = false;
                g.add(llama);
                g.add(new THREE.PointLight(color, 4, 18, 2));
                return g;
            },
        },
    };
}
