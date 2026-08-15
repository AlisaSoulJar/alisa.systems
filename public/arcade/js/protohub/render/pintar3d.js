/**
 * pintar3d.js — LA MISMA MATRIZ, CON ALTURA. El ledger visual.
 * ═══════════════════════════════════════════════════════════════════════════
 *     const pintor = crearPintor3d(escena, THREE, { croupier });
 *     pintor.pintar(sustrato);
 *
 * ⚠️ ES LA HERMANA DE `pintar2d.js`, NO SU SUSTITUTA.
 * Las dos reciben `{ rejilla, piezas, zonas }` y no preguntan nada más. Ninguna
 * sabe a qué se juega. Esa es la tesis del motor dicha en código: **el 3D es
 * sólo un ledger visual; el estado de verdad es una matriz plana.**
 *
 * Consecuencia práctica: un género nuevo se ve en 2D y en 3D **el mismo día que
 * tiene reglas**, sin escribir un visualizador. Hoy hay catorce visualizadores a
 * medida y cada uno trajo su bug.
 *
 * ⚠️ SE DIBUJA INSTANCIADO, Y NO ES UNA OPTIMIZACIÓN PREMATURA.
 * La primera versión creaba una malla por celda y otra por pieza. Con ajedrez
 * (64 + 32) iba de sobra; con **fagocito, que son 28×28 celdas y 561 piezas**,
 * son 1.345 llamadas de dibujo y el compositor del navegador dejaba de responder
 * — la página seguía viva (JavaScript contestaba en 5 ms) pero no se podía ni
 * capturar la pantalla.
 *
 * Un ledger visual que se cae con el tablero número diez no es un ledger visual.
 * Ahora es **una llamada por familia**: una para el suelo, una para los muros y
 * una por cada aspecto de pieza. Fagocito pasa de 1.345 a menos de diez.
 *
 * ⚠️ AQUÍ ES DONDE ENTRAN LAS FACTORÍAS Y LOS PLUGINS, Y NO ANTES.
 * `CroupierSystem` ya sabe **dónde va cada carta** en una mesa —en abanico, en
 * arco, tapadas, comunitarias— y es agnóstico al juego. Se le pasa por
 * `opciones` y coloca las zonas. No decide nada del juego: dice dónde poner las
 * cosas, que es exactamente lo que un espectador puede hacer.
 */

import { colorDe } from './paleta.js';

/** Alturas por tipo. Lo que no esté aquí sale como ficha baja. */
const ALTO = {
    muro: 1.0, cabeza: 0.6, cuerpo: 0.45, bolita: 0.12, comida: 0.3,
    jugador: 0.8, coche_der: 0.4, coche_izq: 0.4,
};
const COLOR_DE = { 0: 0x2a3550, 1: 0xc0392b, 2: 0x2e8b57, 3: 0xd68910, null: 0x7f8c8d };

/**
 * Desde qué silla se está mirando. El sustrato lo dice cuando importa —una mesa
 * de invitada, una sala compartida— y cuando no lo dice es que sólo hay una.
 *
 * Con `?? 0` y no con `|| 0`: el asiento 0 es un asiento, no una ausencia.
 */
const yoSoy = (sus) => sus?.yo ?? sus?.asiento ?? 0;

export function crearPintor3d(escena, THREE, opciones = {}) {
    const { croupier = null, alturaCarta = 0.02 } = opciones;

    const raiz = new THREE.Group();
    raiz.name = '__sustrato';
    escena.add(raiz);

    const geo = {
        celda: new THREE.BoxGeometry(0.96, 0.08, 0.96),
        cubo: new THREE.BoxGeometry(0.7, 1, 0.7),
        disco: new THREE.CylinderGeometry(0.36, 0.36, 0.18, 16),
        punto: new THREE.SphereGeometry(0.13, 8, 6),
        // El faro de «cuál soy yo». Se le da la vuelta a la GEOMETRÍA y no a la
        // instancia porque `poner()` sólo sabe girar sobre Y: una escala negativa
        // apuntaría el cono hacia abajo, sí, y de paso le daría la vuelta a las
        // normales y lo dejaría negro justo cuando su trabajo es que se vea.
        faro: new THREE.ConeGeometry(0.2, 0.45, 10).rotateX(Math.PI),
        carta: new THREE.BoxGeometry(0.62, 0.012, 0.9),
    };

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ CADA BANDO CON SU FORMA, NO SÓLO CON SU COLOR
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Es requisito de accesibilidad en la guía de interfaz de Board Game Arena, no
     * un extra: «empareja color con iconos, texturas o formas», y un símbolo o
     * contorno único por cada color de peón. Con azul contra rojo, una de cada doce
     * personas —la proporción de daltonismo en hombres— está jugando a adivinar de
     * quién es cada ficha.
     *
     * Y no hace falta añadir nada encima: basta con el NÚMERO DE LADOS. Redondo,
     * hexagonal, cuadrado, triangular. Se distinguen en escala de grises, a
     * cualquier zoom y desde cualquier ángulo, siguen siendo fichas planas de la
     * misma familia, y no cuesta ni una malla más — el pintor ya agrupa por
     * `(forma, dueño)`, así que cada bando YA tenía su propio montón instanciado.
     * Lo único que cambia es qué geometría se le da.
     *
     * ⚠️ SÓLO EN LOS DISCOS, Y A PROPÓSITO.
     *
     * Los cubos son muros y las bolitas comida: terreno y cosas de nadie, que no
     * tienen bando que distinguir. Darles forma por dueño sería contar algo que no
     * existe.
     */
    const LADOS_POR_DUEÑO = { 0: 16, 1: 6, 2: 4, 3: 3 };
    const discos = new Map();
    const discoDe = (de) => {
        const lados = LADOS_POR_DUEÑO[de] ?? 16;
        if (!discos.has(lados)) {
            // El giro alinea el hexágono y el cuadrado con el tablero: sin él, un
            // cuadrado sale en rombo y parece otra cosa en vez de otro bando.
            discos.set(lados, new THREE.CylinderGeometry(0.36, 0.36, 0.18, lados)
                .rotateY(lados === 4 ? Math.PI / 4 : 0));
        }
        return discos.get(lados);
    };
    const material = (color, extra = {}) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
    const mat = {
        /**
         * ⚠️ EL DAMERO SE VE. ANTES ESTABA Y NO SE NOTABA.
         *
         * Este pintor lleva desde siempre alternando dos suelos —`(f + c) % 2`, más
         * abajo— pero eran `0xf2f4f7` y `0xd8dfe6`: dos blancos separados por un 7%
         * de luminosidad. Con la luz cenital de esta mesa el damero desaparecía y el
         * tablero salía como una sábana blanca con rayas.
         *
         * Se vio en la captura de las damas recién portadas a esta mesa: sesenta y
         * cuatro casillas blancas y las fichas flotando encima. Un tablero de damas
         * SIN damero, que es lo primero que se mira para orientarse.
         *
         * No sobraba ninguna de las dos: estaban demasiado juntas. El oscuro baja a
         * un gris azulado que contrasta con las fichas de los dos bandos —azul
         * marino y rojo— sin competir con ninguna.
         */
        sueloA: material(0xeceff4, { roughness: 0.9 }),
        sueloB: material(0x4a5a70, { roughness: 0.9 }),
        /**
         * ⚠️ EL MURO ERA CASI EL MISMO AZUL QUE EL DUEÑO 0, Y ESE FUE EL FALLO.
         *
         * `0x39485c` contra `0x2a3550` son 19 puntos de distancia sobre 255. Por eso
         * el jugador de fagocito —un cubo del dueño 0 en un laberinto de muros—
         * estaba perfectamente dibujado y no se veía. Le puse un faro encima, que
         * resuelve «cuál soy yo», pero el choque de color seguía ahí para cualquier
         * otra pieza oscura sobre muro.
         *
         * El muro se va a un gris cálido: es TERRENO, y que la estructura no compita
         * con las fichas en la misma familia de color es lo correcto de todas formas.
         * Medido contra lo que hay: dueño 0 → 50, suelo claro → 144, suelo oscuro →
         * 48. Ninguno por debajo del umbral de `legibilidad.mjs`.
         */
        muro: material(0x5c5040, { roughness: 0.85 }),
        carta: material(0xfdfdfd, { roughness: 0.45 }),
        oculta: material(0x8a5a9a, { roughness: 0.6 }),
        /**
         * ⚠️ EL DESTINO ERA EXACTAMENTE EL MISMO ROJO QUE EL DUEÑO 1. DISTANCIA 0.
         *
         * `0xc0392b` en los dos sitios. O sea que en sokoban una ficha del dueño 1
         * encima de su casilla objetivo desaparecía — justo en el momento en que
         * más importa verla, que es cuando has resuelto ese hueco.
         *
         * Lo encontró `legibilidad.mjs` en su primera pasada de verdad, comparando
         * materiales. A ojo no lo vi en ninguna captura, y llevo dos días mirándolas.
         *
         * Ámbar: el destino es una MARCA, no un bando, y así no compite con ninguno.
         * Medido: dueño 1 → 107, dueño 3 (que es el otro ámbar) → 49, suelo claro
         * → 75. Todos por encima del umbral.
         */
        destino: material(0xd9a441, { roughness: 0.7 }),
        /**
         * ⚠️ LA NIEBLA ERA LO MÁS BRILLANTE DE LA PANTALLA, Y ESO ESTÁ AL REVÉS.
         *
         * En cripta lo sin explorar es casi todo el tablero, y con `0xaeb8c4` salía
         * un campo blanco enorme que se comía la vista mientras lo YA EXPLORADO
         * —que es lo único que has ganado jugando— quedaba de manchita en una
         * esquina. La partida se lee del revés: lo que no sabes grita y lo que sabes
         * se pierde.
         *
         * No es un problema de color bonito: en un juego que va de explorar, el
         * mapa conocido tiene que ser la figura y lo desconocido el fondo. Se baja a
         * un gris azulado oscuro que se hunde en el negro de la escena.
         *
         * Lo vi abriendo la captura. Ninguna medida lo dice: `mirar` lo da limpio y
         * el laboratorio lo da pintado — y las dos tienen razón, está todo dibujado.
         */
        /**
         * ⚠️ Y AL OSCURECERLA ANOCHE LA DEJÉ CHOCANDO CON EL DUEÑO 0.
         *
         * `0x333c49` contra `0x2a3550` son NUEVE puntos. O sea que una pieza oscura
         * sobre casilla con niebla —en cripta o en flota, que es media partida—
         * quedaba invisible. Arreglé un problema de lectura y creé otro.
         *
         * Lo cazó `legibilidad.mjs` en su primera pasada, o sea unas horas después
         * de que yo lo metiera. Ésa es exactamente la razón de escribir la
         * comprobación en vez de seguir abriendo capturas de una en una.
         *
         * Ahora es un gris muy oscuro y sin azul: se hunde en el fondo negro —que es
         * lo que quiere la niebla— y deja sitio a cualquier ficha. Medido: dueño 0 →
         * 37, muro → 56, suelo claro → 200.
         */
        niebla: material(0x24262b, { roughness: 1.0 }),
        // El faro de «cuál soy yo». Ámbar y emisivo: tiene que ganarle a
        // cualquier paleta de juego, porque su único trabajo es que lo encuentres.
        faro: material(0xffc23c, { emissive: 0x8a5c00, roughness: 0.35 }),
        // El tablero de líneas: madera clara y línea oscura, que es como se ve un
        // goban de verdad y —lo que importa aquí— contrasta con las piedras
        // blancas y negras sin parecerse a ninguna de las dos.
        // ⚠️ La madera es MÁS OSCURA de lo que parece que debería. `0xd8b273` es el
        // color de un goban en una foto, y aquí salía amarillo fosforito: esta mesa
        // lleva luz cenital fuerte y un tono claro se va de rango. Es el mismo error
        // que el damero de dos blancos —elegir el color mirando la muestra en vez
        // del render— sólo que al revés.
        madera: material(0x7d6039, { roughness: 0.95 }),
        linea: material(0x2e2010, { roughness: 0.95 }),
        de: Object.fromEntries(Object.entries(COLOR_DE)
            .map(([k, c]) => [k, material(c, { metalness: 0.1 })])),
    };

    /**
     * Un montón instanciado por familia. Se guarda por clave y se reaprovecha
     * entre cuadros: crear y tirar `InstancedMesh` a sesenta por segundo tendría
     * el mismo problema que crear mallas sueltas, sólo que más difícil de ver.
     */
    const montones = new Map();
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion();
    const POS = new THREE.Vector3(), ESC = new THREE.Vector3();

    function monton(clave, geometria, materialUsado, cuantas) {
        let m = montones.get(clave);
        if (!m || m.instanceMatrix.count < cuantas) {
            if (m) { raiz.remove(m); m.dispose(); }
            // Se pide algo de holgura para no rehacerlo en cuanto entre una
            // pieza más: un tablero gana y pierde fichas todo el rato.
            m = new THREE.InstancedMesh(geometria, materialUsado, Math.max(16, Math.ceil(cuantas * 1.4)));
            // El nombre es la clave, para que desde fuera se pueda hablar de un
            // montón concreto — el encuadre necesita poder dejar fuera la niebla.
            m.name = clave;
            m.frustumCulled = false;
            raiz.add(m);
            montones.set(clave, m);
        }
        m.geometry = geometria;
        m.material = materialUsado;
        m.count = 0;
        m.visible = true;
        return m;
    }

    /**
     * La cara de un item de zona, dibujada. Se guarda por identidad: en una
     * partida se piden los mismos seis o siete una y otra vez, y generar un lienzo
     * por fotograma sería el mismo error que crear `InstancedMesh` a sesenta por
     * segundo, sólo que más caro.
     *
     * Se dibuja en vez de cargarse de un fichero por lo mismo que el tapete: no
     * hay recursos que versionar ni una petición más, y escala sin pixelarse.
     */
    const caras = new Map();
    function caraDe(id) {
        if (caras.has(id)) return caras.get(id);
        const L = 128;
        const c = document.createElement('canvas');
        c.width = c.height = L;
        const g = c.getContext('2d');
        g.fillStyle = '#fdfdfd';
        g.fillRect(0, 0, L, L);
        g.strokeStyle = '#c9ced6';
        g.lineWidth = 5;
        g.strokeRect(3, 3, L - 6, L - 6);
        // `d6_5` enseña el 5, `S_A` el as: lo que va detrás del palo, que es la
        // convención de carta que ya usa toda la casa (`baraja.js`).
        const s = String(id);
        const txt = (s.includes('_') ? s.split('_').slice(1).join('_') : s).slice(0, 4);
        g.fillStyle = '#1b232e';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `bold ${txt.length > 2 ? 40 : 76}px Georgia, serif`;
        g.fillText(txt, L / 2, L / 2);
        const m = material(0xffffff, { map: new THREE.CanvasTexture(c), roughness: 0.45 });
        caras.set(id, m);
        return m;
    }

    /**
     * El tablero de LÍNEAS, para los juegos que se juegan en las intersecciones.
     *
     * ⚠️ SE GUARDA POR TAMAÑO Y NO SE REHACE.
     *
     * Un goban de 19x19 son treinta y ocho barras más la madera. Construirlo en
     * cada repintado sería el mismo error que crear `InstancedMesh` a sesenta por
     * segundo — el que ya está documentado dos veces en este fichero— sólo que
     * más difícil de ver, porque el resultado se vería BIEN. Se cachea por
     * `${cols}x${filas}` porque eso es todo lo que lo determina.
     */
    const gobanes = new Map();
    function ponerGoban(cols, filas, dx, dz) {
        const clave = `goban:${cols}x${filas}`;
        let g = gobanes.get(clave);
        if (!g) {
            g = new THREE.Group();

            // La madera llega media casilla más allá del último cruce por los dos
            // lados: si acabara justo en la línea, las piedras del borde caerían
            // medio fuera del tablero.
            const madera = new THREE.Mesh(
                new THREE.BoxGeometry(cols, 0.08, filas), mat.madera);
            madera.position.set(0, -0.04, 0);
            g.add(madera);

            const barra = (largo, ancho, x, z) => {
                const b = new THREE.Mesh(
                    new THREE.BoxGeometry(largo, 0.012, ancho), mat.linea);
                b.position.set(x, 0.006, z);
                g.add(b);
            };
            const L = 0.045;
            for (let f = 0; f < filas; f++) barra(cols - 1, L, 0, f + dz);
            for (let c = 0; c < cols; c++) {
                const b = new THREE.Mesh(
                    new THREE.BoxGeometry(L, 0.012, filas - 1), mat.linea);
                b.position.set(c + dx, 0.006, 0);
                g.add(b);
            }

            raiz.add(g);
            gobanes.set(clave, g);
        }
        g.visible = true;
        // Los de otro tamaño se apagan: un juego puede cambiar de tablero entre
        // partidas y dos gobanes superpuestos no dan error, dan un borrón.
        for (const [k, otro] of gobanes) if (k !== clave) otro.visible = false;
    }

    /**
     * El material de un dueño. Si el juego declaró color, ése; si no, el genérico
     * de siempre. La paleta y el aviso de nombre inventado viven en `paleta.js`,
     * que es el mismo sitio del que lee el pintor 2D — si cada uno tuviera el suyo,
     * el go saldría con piedras negras en la mesa y azules en el minimapa.
     */
    const matsColor = new Map();
    function materialDe(de, colores) {
        const hex = colorDe(de, colores);
        if (hex === null) return mat.de[de] ?? mat.de.null;
        if (!matsColor.has(hex)) matsColor.set(hex, material(hex, { metalness: 0.1 }));
        return matsColor.get(hex);
    }

    const poner = (m, x, y, z, escY = 1, rotY = 0, escXZ = 1) => {
        POS.set(x, y, z); ESC.set(escXZ, escY, escXZ);
        Q.setFromAxisAngle({ x: 0, y: 1, z: 0 }, rotY);
        M.compose(POS, Q, ESC);
        m.setMatrixAt(m.count++, M);
    };

    /**
     * ⚠️ LO QUE LE FALTA A ESTA MESA PARA ADMITIR EL GO Y EL XIANGQI.
     *
     * El 13-08-2026 porté los dos aquí y los DEVOLVÍ al verlos. El go salió como un
     * damero de 19×19 —parecía un tablero de damas gigante— y el xiangqi igual con
     * menos escándalo. Los dos se juegan sobre LÍNEAS, con las piezas en las
     * INTERSECCIONES, y sin damero ninguno.
     *
     * No es un problema de colores: es que esta mesa sólo sabe dibujar una rejilla
     * de CELDAS, y hay una familia entera de tableros que no son celdas. Mientras
     * eso no exista, sus visualizadores propios se quedan — el trinquete es un
     * medio, no un fin, y publicar un go que parece otro juego es peor que tener un
     * fichero de más.
     *
     * Lo que hace falta, y sigue el mismo patrón que todo lo de hoy —lo dice el
     * dato, no lo adivina quien pinta—: que la rejilla pueda declarar su forma.
     *
     *     rejilla: { ancho, alto, celdas, patron: 'intersecciones' }
     *
     * Con eso el pintor dibujaría líneas en vez de casillas y colocaría las piezas
     * en los cruces, que es media docena de líneas aquí y ninguna en los juegos.
     * Damas, ajedrez y reversi seguirían con su damero porque seguirían sin
     * declarar nada.
     */
    function pintar(sus) {
        if (!sus) return;
        const usados = new Set();

        // ── El terreno ──────────────────────────────────────────────────
        if (sus.rejilla) {
            const { ancho: cols, alto: filas, celdas, niebla } = sus.rejilla;
            const dx = -(cols - 1) / 2, dz = -(filas - 1) / 2;

            /**
             * ⚠️ AQUÍ FALTABAN DOS FAMILIAS, Y UNA LLEVABA TIEMPO FALTANDO.
             *
             * Esto agrupaba en tres montones: suelo claro, suelo oscuro y muro.
             * Todo lo que no era muro caía en «suelo» — así que **los destinos de
             * sokoban no se dibujaban en 3D**. El mismo estado contado por tres
             * proyecciones, y una de ellas callándose dónde hay que dejar la caja.
             *
             * Es exactamente el fallo que el sustrato existe para hacer visible: si
             * el dibujo se inventa cómo leer el terreno, tarde o temprano se deja
             * un valor sin mirar. La regla está escrita en `pintar2d.js` y aquí no
             * se cumplía: **0 vacío · 1 muro · 2 destino · >2 cuenta**.
             */
            /**
             * ═══════════════════════════════════════════════════════════════
             *  ⚠️ HAY TABLEROS QUE NO SON CASILLAS, Y ESTA MESA NO LO SABÍA
             * ═══════════════════════════════════════════════════════════════
             *
             * El 13-08-2026 porté el go aquí y lo devolví al verlo: salió un
             * damero de 19x19 y parecía un tablero de damas gigante. El xiangqi
             * igual con menos escándalo. Los dos se juegan sobre LÍNEAS, con las
             * piezas en las INTERSECCIONES, y sin damero ninguno. Dejé apuntado
             * aquí mismo lo que hacía falta; esto es eso.
             *
             * `patron: 'intersecciones'` lo declara la rejilla, o sea el juego.
             * Damas, ajedrez y reversi siguen con su damero porque siguen sin
             * declarar nada — que es la propiedad que importa: lo nuevo no toca
             * a quien no lo pide.
             *
             * ⚠️ Y LAS PIEZAS NO SE MUEVEN NI UN MILÍMETRO.
             *
             * Da un poco de vértigo, porque «va en la intersección» suena a que
             * hay que desplazarlas media casilla. No: con casillas, la pieza va
             * en el CENTRO de la celda (c, f); con intersecciones, va en el CRUCE
             * (c, f). Es el mismo punto — lo que cambia es lo que se dibuja
             * debajo, que pasa de un damero a un cruce de dos líneas. La celda
             * era el andamio, no la posición.
             */
            const cruces = sus.rejilla.patron === 'intersecciones';
            if (cruces) ponerGoban(cols, filas, dx, dz);
            else for (const g of gobanes.values()) g.visible = false;

            /**
             * ⚠️ CON CRUCES SE QUITA EL DAMERO, NO EL TERRENO.
             *
             * La primera versión se saltaba este bucle entero cuando el tablero era
             * de intersecciones. Funciona —el go y el xiangqi no tienen muros ni
             * niebla ni destinos— y es una mina puesta a mano: el primer juego de
             * cruces que tenga un muro lo vería desaparecer, sin error y sin que
             * ninguna prueba dijera nada. Ya he tenido hoy bastante de eso.
             *
             * Lo que sobra con un goban es el SUELO alterno, así que es lo único
             * que se deja de meter.
             */
            /**
             * ⚠️ EL 1 NO SIEMPRE ES UN MURO, Y LA LEYENDA LLEVABA DICIÉNDOLO DESDE
             *    EL PRINCIPIO.
             * ═══════════════════════════════════════════════════════════════════
             *
             * Aquí ponía `if (v === 1) muros.push(punto)` a secas: una convención
             * numérica fija, ignorando el campo `leyenda` que la rejilla publica para
             * decir qué es cada valor. Y tres juegos declaran que su 1 **no** es un
             * muro sino el hueco de fuera del tablero:
             *
             *     parchís      256 celdas «fuera»
             *     canadiense   256 celdas «fuera»
             *     oca           18 celdas «fuera del recorrido»
             *
             * O sea que el parchís salía enterrado bajo **256 bloques marrones** que
             * no son parte del juego: el recorrido de colores apenas se veía y las
             * casas del centro quedaban en un pozo. No estaba roto —el laboratorio lo
             * aprobaba, `legibilidad` también— estaba ILEGIBLE, que es peor de
             * detectar y peor de sufrir.
             *
             * Y es el mismo fallo de siempre: el dato bien declarado, el consumidor
             * inventándose una convención. Los otros doce juegos con celdas de valor
             * 1 no declaran leyenda, así que ahí sigue siendo un muro y no cambia
             * nada — comprobado uno a uno antes de tocarlo.
             */
            const nombreDe = (v) => sus.rejilla.leyenda?.[v] ?? sus.leyenda?.[v] ?? null;
            const esHueco = (v) => {
                const n = nombreDe(v);
                // Sin leyenda manda la convención de siempre: 1 = muro.
                return n !== null && /^(fuera|vac[íi]o|nada|hueco)\b/i.test(String(n));
            };

            const claras = [], oscuras = [], muros = [], destinos = [], nieblas = [];
            for (let f = 0; f < filas; f++) {
                for (let c = 0; c < cols; c++) {
                    const i = f * cols + c, punto = [c + dx, f + dz];
                    if (niebla?.[i]) { nieblas.push(punto); continue; }
                    const v = celdas?.[i] ?? 0;
                    // «Fuera» no se dibuja: ni bloque ni suelo. Es lo que significa —
                    // ahí no hay tablero, y pintar algo sería inventarse una pieza de
                    // atrezo que compite con el juego por la atención.
                    if (esHueco(v)) continue;
                    if (v === 1) muros.push(punto);
                    else {
                        if (!cruces) ((f + c) % 2 ? oscuras : claras).push(punto);
                        if (v === 2) destinos.push(punto);   // encima del suelo
                    }
                }
            }
            for (const [clave, lista, g, mt, alturaY, escY] of [
                ['sueloA', claras, geo.celda, mat.sueloA, 0, 1],
                ['sueloB', oscuras, geo.celda, mat.sueloB, 0, 1],
                ['muro', muros, geo.cubo, mat.muro, ALTO.muro / 2, ALTO.muro],
                ['destino', destinos, geo.celda, mat.destino, 0.02, 1],
                // La niebla es un bloque bajo: se ve que hay algo sin decir qué.
                ['niebla', nieblas, geo.cubo, mat.niebla, 0.18, 0.36],
            ]) {
                if (!lista.length) continue;
                const m = monton(clave, g, mt, lista.length);
                for (const [x, z] of lista) poner(m, x, alturaY, z, escY);
                m.instanceMatrix.needsUpdate = true;
                usados.add(clave);
            }

            // ── Las piezas, agrupadas por aspecto ───────────────────────
            // La clave es (forma + dueño), que es lo que decide cómo se ve. Así
            // treinta y dos piezas de ajedrez son dos llamadas, no treinta y dos.
            const grupos = new Map();
            for (const p of (sus.piezas ?? [])) {
                const alto = ALTO[p.t] ?? 0.25;
                const forma = (p.t === 'bolita' || p.t === 'comida') ? 'punto'
                            : alto >= 0.4 ? 'cubo' : 'disco';
                const clave = `p:${forma}:${p.de}`;
                if (!grupos.has(clave)) grupos.set(clave, { forma, de: p.de, alto, items: [] });
                grupos.get(clave).items.push(p);
            }
            for (const [clave, g] of grupos) {
                // La forma del disco depende del dueño: es lo que hace que los
                // bandos se distingan sin depender del color.
                const forma = g.forma === 'disco' ? discoDe(g.de) : geo[g.forma];
                const m = monton(clave, forma, materialDe(g.de, sus.colores), g.items.length);
                for (const p of g.items) {
                    poner(m, p.x + dx, g.alto / 2 + 0.08, p.y + dz,
                          g.forma === 'cubo' ? g.alto : 1);
                }
                m.instanceMatrix.needsUpdate = true;
                usados.add(clave);
            }

            /**
             * ═══════════════════════════════════════════════════════════════
             *  ⚠️ ¿CUÁL SOY YO?
             * ═══════════════════════════════════════════════════════════════
             *
             * En fagocito no se veía al jugador. No «se veía mal»: se abría la
             * partida y no estabas. Y no estaba oculto — estaba CAMUFLADO, que
             * es peor porque no se nota que falta algo: `ALTO.jugador` es 0,8, o
             * sea forma de cubo, y el dueño 0 pinta 0x2a3550, que es justo el
             * azul oscuro de los muros del laberinto. Un cubo azul entre cubos
             * azules, en un tablero de 28x28 con quinientas cincuenta y siete
             * bolitas.
             *
             * Ninguna medida lo dice, y las tengo todas: `mirar` lo da limpio,
             * el laboratorio lo da pintado al 36% con dos jugadas legales y
             * «llega sí», el sustrato publica `{x:1, y:1, t:'jugador', de:0}`
             * perfectamente. Todo verdad. Y no te ves. Van cinco veces hoy que
             * lo que encuentra el fallo es abrir la imagen.
             *
             * ⚠️ LA REGLA SALE DEL DATO, NO DE UNA LISTA DE JUEGOS.
             *
             * Poner «fagocito, snake, peaton, cripta, sigilo…» sería otra lista
             * paralela que se separa el día que alguien añada un juego — el
             * fallo que este proyecto lleva arreglado seis veces. Lo que hace
             * falta preguntar es: ¿mi asiento tiene UNA sola pieza? Si sí, ésa
             * soy yo y hay que poder encontrarla. Si tengo dieciséis es un
             * ajedrez y un faro sobrando encima de cada peón.
             *
             * El faro va por encima de la altura de muro a propósito: así no
             * depende del ángulo de cámara ni de dónde estés en el laberinto.
             */
            const mias = (sus.piezas ?? []).filter(p => p.de === yoSoy(sus));
            if (mias.length === 1) {
                const p = mias[0];

                /**
                 * ⚠️ EL FARO SE MIDE EN PANTALLA, NO EN CASILLAS.
                 *
                 * A tamaño fijo salía y se veía… en sokoban, que es 5x3. En el
                 * laberinto de 28x28 quedaba una mota amarilla de tres píxeles:
                 * técnicamente presente, prácticamente igual de invisible que
                 * antes. Y lo habría dado por bueno, porque el contador decía
                 * `faro=1` y era verdad.
                 *
                 * La mesa normaliza cualquier tablero al mismo ancho de pantalla,
                 * así que una casilla de un 28x28 sale casi seis veces más pequeña
                 * que una de un 5x3. Compensarlo con el ancho de la rejilla deja
                 * el faro del mismo tamaño APARENTE en los dos, que es la única
                 * medida que le importa a quien mira.
                 */
                const lado = Math.max(sus.rejilla?.ancho ?? 8, sus.rejilla?.alto ?? 8);
                const k = Math.max(1, lado / 7);

                /**
                 * Y la PUNTA justo encima de los muros, no el cono entero por
                 * ahí arriba: con la altura a ojo se quedaba flotando en el
                 * cielo, señalando a nada y comiéndose sitio del encuadre —la
                 * mesa mete el faro en la caja que tiene que caber, así que un
                 * faro alto encoge el tablero—. El cono mide 0,45 y se escala
                 * por `k`, o sea media altura `0,225·k`; sumándosela al 1,2 la
                 * punta cae siempre a la misma distancia del suelo, mida lo que
                 * mida el tablero.
                 */
                const f = monton('faro', geo.faro, mat.faro, 1);
                poner(f, p.x + dx, 1.2 + 0.225 * k, p.y + dz, k, 0, k);
                f.instanceMatrix.needsUpdate = true;
                usados.add('faro');
            }
        }

        // ── Los montones ────────────────────────────────────────────────
        (sus.zonas ?? []).forEach((z, iz) => {
            const total = z.items.length + (z.ocultas ?? 0);
            if (!total) return;
            const sitios = colocar(z, iz, total);

            /**
             * ⚠️ ESTO DIBUJABA «HAY ALGO», NO «QUÉ HAY». Y EL QUÉ ES TODO EL DATO.
             *
             * El bucle de antes sólo usaba `z.items.length` y el índice: todas las
             * vistas salían con el mismo material blanco. Nunca se leyó el
             * CONTENIDO de `z.items`.
             *
             * Con los diez juegos de cartas no se notaba, porque ésos no pasan por
             * aquí: `montarMesa` les da la mesa de casino, que pinta cada carta. Y
             * ningún juego de tablero publicaba zonas… hasta que hizo falta un
             * dado. Un `d6_5` y un `d6_2` salían IDÉNTICOS, una lámina en blanco:
             * la mesa diría «hay un dado» y no cuál, que es lo único que importa.
             * Verde y mintiendo — el modo de fallo de la casa.
             *
             * Lo encontró Fable al revisar la arquitectura, y se comprobó leyendo
             * estas mismas líneas antes de tocarlas.
             *
             * Se agrupa por IDENTIDAD y sale un montón instanciado por cada una,
             * con su cara dibujada. Para un dado son seis como mucho. Si algún día
             * pasara por aquí una baraja entera serían cuarenta grupos, que sigue
             * siendo poco — y esa mesa tiene su propio motor precisamente por eso.
             */
            const porId = new Map();
            z.items.forEach((it, k) => {
                const id = String(it?.id ?? it ?? '·');
                if (!porId.has(id)) porId.set(id, []);
                porId.get(id).push(k);
            });

            let fam = 0;
            for (const [id, indices] of porId) {
                const clave = `z${iz}:v${fam++}`;
                const m = monton(clave, geo.carta, caraDe(id), indices.length);
                for (const k of indices) {
                    const s = sitios[k] ?? { x: 0, z: 0, rot: 0 };
                    poner(m, s.x, alturaCarta * (k + 1) + 0.1, s.z, 1, s.rot ?? 0);
                }
                m.instanceMatrix.needsUpdate = true;
                usados.add(clave);
            }

            // Las tapadas siguen siendo todas iguales, que es lo que son.
            const ocultas = z.ocultas ?? 0;
            if (ocultas > 0) {
                const clave = `z${iz}:ocultas`;
                const m = monton(clave, geo.carta, mat.oculta, ocultas);
                for (let k = z.items.length; k < total; k++) {
                    const s = sitios[k] ?? { x: 0, z: 0, rot: 0 };
                    poner(m, s.x, alturaCarta * (k + 1) + 0.1, s.z, 1, s.rot ?? 0);
                }
                m.instanceMatrix.needsUpdate = true;
                usados.add(clave);
            }
        });

        // Lo que no se usó este cuadro se esconde, no se destruye: volverá.
        for (const [clave, m] of montones) if (!usados.has(clave)) m.visible = false;
    }

    /** Dónde va cada carta. Con `CroupierSystem` si lo hay; si no, en fila. */
    function colocar(z, iz, total) {
        if (croupier?.calculatePlayerHands) {
            try {
                const r = croupier.calculatePlayerHands(1, total, 'fan', (z.ocultas ?? 0) > 0);
                const puntos = r?.[0]?.cards ?? r?.hands?.[0] ?? r?.[0] ?? [];
                if (puntos.length >= total) {
                    return puntos.map(p => ({ x: p.x ?? 0, z: (p.z ?? 0) + iz * 1.2,
                                              rot: p.rotY ?? p.rot ?? 0 }));
                }
            } catch { /* si no encaja, la fila de abajo */ }
        }
        // Respaldo honesto: una fila. Fea pero correcta, y nunca falla.
        return Array.from({ length: total }, (_, k) => ({
            x: (k - (total - 1) / 2) * 0.7, z: 2.4 + iz * 1.2, rot: 0,
        }));
    }

    return {
        pintar,
        raiz,
        /** Cuántas llamadas de dibujo cuesta el cuadro. Para poder vigilarlo. */
        get llamadas() { return [...montones.values()].filter(m => m.visible).length; },
        soltar() {
            for (const m of montones.values()) { raiz.remove(m); m.dispose(); }
            montones.clear();
            Object.values(geo).forEach(g => g.dispose?.());
            escena.remove(raiz);
        },
    };
}
