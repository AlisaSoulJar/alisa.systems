/**
 * figuras_submarino.mjs — EL ASPECTO DE ¡SOBREVIVE! EN EL AGUA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     import { figurasDeSubmarino } from '/js/figuras_submarino.mjs';
 *     const pintor = new PintorMundo(escena, figurasDeSubmarino(THREE), 1);
 *
 * Un `estilo` para `PintorMundo`. El pintor lleva la posición, la identidad y el
 * «esto ya no está»; esto sólo dice cómo se ve cada cosa.
 *
 * ⚠️ VA APARTE DE LA PÁGINA POR LA MISMA RAZÓN QUE `figuras_torre.mjs`.
 * `paginas.mjs` cuenta las «señales» de cada página —fabricar mallas, mover
 * objetos 3D— con un techo que SÓLO PUEDE BAJAR. Una página que se escribe su
 * propio dibujo lo dice ahí, y tiene razón en decirlo.
 *
 * ⚠️ Y EL TAMAÑO CUENTA ALGO, NO ES DECORACIÓN.
 * El submarino es del tamaño de un pez a propósito: en este juego eres uno más
 * de la cadena, no un vehículo que la observa. Los cazadores y los tiburones son
 * visiblemente mayores porque lo que decide la partida es si te alcanzan.
 */

/**
 * El encuadre inicial. Va con las figuras y no en la página porque **es parte
 * del aspecto**: desde dónde se mira decide tanto como de qué color es cada
 * cosa. Y de paso la página se queda sin mover objetos 3D, que es lo que cuenta
 * `paginas.mjs` — su techo sólo baja, y una etapa nueva no debería gastarlo.
 */
export function encuadrarSubmarino(gfx) {
    /**
     * ⚠️ CERCA, Y ESO SE DECIDIÓ MIRANDO LA PANTALLA.
     *
     * El primer encuadre estaba a 130 del centro de un tanque de 120. Con bichos
     * de 2 a 8 unidades, cada uno ocupaba entre uno y seis píxeles: los modelos
     * cargaban, estaban en su sitio, y no se veía ninguno. Lo único legible eran
     * las medusas y el arrecife, que son bolas de radio 6 y 8.
     *
     * Una etapa donde no distingues un pez de un tiburón no es difícil: es
     * ilegible. Y eso no lo dice ninguna prueba — sólo se ve abriéndola.
     */
    gfx.camera.position.set(0, 52, 78);
    gfx.controls.target.set(0, 38, 0);
    gfx.controls.update();
}

import { figuraGLB } from '/js/figuras_glb.mjs';

export function figurasDeSubmarino(THREE) {
    const bicho = (color, radio, brillo = 0.35, luz = 0) => () => {
        const g = new THREE.Group();
        const cuerpo = new THREE.Mesh(
            new THREE.SphereGeometry(radio, 12, 8),
            new THREE.MeshStandardMaterial({
                color, emissive: color, emissiveIntensity: brillo,
                roughness: 0.5, metalness: 0.2,
            }));
        cuerpo.scale.z = 1.8;               // alargado: se ve hacia dónde nada
        g.add(cuerpo);
        if (luz) g.add(new THREE.PointLight(color, luz, radio * 14, 2));
        return g;
    };

    /**
     * Medusas y arrecifes son los ESCONDITES, y por eso se dibujan huecos y
     * translúcidos: tienes que poder ver que estás dentro. Si fueran sólidos, el
     * submarino desaparecería detrás justo en el momento en que más importa.
     */
    const refugio = (color, opacidad) => (tipo, pieza) => {
        const r = pieza?.alcance ?? 6;
        const g = new THREE.Group();
        g.add(new THREE.Mesh(
            new THREE.SphereGeometry(r, 16, 12),
            new THREE.MeshStandardMaterial({
                color, transparent: true, opacity: opacidad, side: THREE.DoubleSide,
                emissive: color, emissiveIntensity: 0.25, roughness: 0.9,
            })));
        return g;
    };

    /**
     * ⚠️ MODELOS DE VERDAD DONDE LOS HAY, PRIMITIVAS DONDE NO.
     *
     * Medido: la casa tiene 103 GLB y 55 no los nombraba nadie. Para este juego
     * había `Fish1.glb`, `Lionfish.glb` y `Shark.glb` esperando, y las etapas se
     * dibujaban con esferas. No era que no se pudiera: es que nadie ataba un
     * TIPO del sustrato a un modelo.
     *
     * Medusas y arrecifes se quedan en primitivas A PROPÓSITO: son ESCONDITES, y
     * lo que tienen que comunicar es su volumen hueco —ver que estás dentro—.
     * Un modelo sólido de coral sería más bonito y peor: taparía al submarino
     * justo en el momento en que más importa verlo.
     *
     * El `alto` es en unidades del mundo, y de ahí sale la escala midiendo la
     * caja del modelo. Ver `figuras_glb.mjs`: multiplicar no funciona cuando los
     * GLB no comparten unidad, y aquí no la comparten.
     */
    /**
     * El color no es sólo del respaldo: tiñe también el modelo cargado. En una
     * escena nocturna un GLB sin emisión sale negro —medido: al cambiar las
     * esferas por `Fish1.glb` y `Shark.glb` los bichos desaparecieron y sólo
     * quedaron los escondites—. Y de paso el color CUENTA algo: azul lo que no
     * te hace nada, naranja y rojo lo que te caza, amarillo tú.
     */
    const conRespaldo = (fichero, alto, color, radio, brillo, luz, tinte) => figuraGLB(
        THREE, fichero, {
            alto, emisivo: color, brillo: brillo ?? 0.5, tinte,
            // Aquí nadie se apoya en nada: la pieza del sustrato es el CENTRO del
            // bicho, no sus pies. Ver la nota de `apoyar` en `figuras_glb.mjs`.
            apoyar: false,
            respaldo: bicho(color, radio, brillo, luz),
        });

    return {
        /**
         * Los tamaños están en unidades del mundo y son la ESCALERA de la
         * amenaza: un pez es la mitad que tú, un cazador el doble, un tiburón
         * cinco veces. Que se lea de un vistazo quién te come es la información
         * más importante de la pantalla.
         */
        /**
         * Las alturas son en unidades del mundo. La escala sale de la medida
         * REAL del modelo, que ya está en su `.katamari.json` —968 modelos la
         * llevan— y sólo se mide en vivo si falta. Ver `figuras_glb.mjs`.
         */
        submarino: { malla: conRespaldo('Butter Robot.glb', 4.5, 0xffe066, 1.6, 0.9, 8) },
        /**
         * El pez lleva MÁS brillo que los demás y no es por importancia: es por
         * contraste. Azul sobre agua azul oscura desaparece — medido: los
         * veinticinco estaban pintados, con su modelo y su emisión, y no se veía
         * ninguno. Los grandes se leen por silueta; los pequeños, sólo por luz.
         */
        pez: { malla: conRespaldo('Fish1.glb', 3.2, 0x9fe0ff, 1.0, 1.1, 0, 0xbfeaff) },
        cazador: { malla: conRespaldo('Lionfish.glb', 7.0, 0xff8a3d, 2.2, 0.6) },
        tiburon: { malla: conRespaldo('Shark.glb', 14.0, 0xff4d4d, 3.6, 0.6, 3) },
        medusa: { malla: refugio(0xc38fff, 0.16) },
        arrecife: { malla: refugio(0x3ddc97, 0.2) },
    };
}
