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

import { colorDe, contrasteDe } from './paleta.js';

/**
 * El tinte de las casillas y los muros por ambiente. Vive aquí y no en `atmosfera.js`
 * porque son colores de MATERIAL DE PIEZA, y ese fichero es de cielo y niebla: quien
 * dibuja el suelo es este pintor, y mezclarlos obligaría a importar uno desde el otro
 * para nada. Las claves son las mismas de `AMBIENTES`, a propósito.
 */
const PALETAS = {
    hierba: { claro: 0x9dc47a, oscuro: 0x5f8f45, muro: 0x6b5236 },
    piedra: { claro: 0xa8a396, oscuro: 0x6e6a5f, muro: 0x8a7f68 },
    metal:  { claro: 0xc6cdd6, oscuro: 0x7d8896, muro: 0x9aa3ad },
    arena:  { claro: 0xe3cfa2, oscuro: 0xb59a68, muro: 0x8a7346 },
    noche:  { claro: 0x9a93b5, oscuro: 0x6b6488, muro: 0x574f74 },
};
let paletaPuesta;
// El prop pedido por la rejilla y las variantes ya cargadas. Llega tarde a proposito.
let propPedido = null;
let propMuros = null;

/** Alturas por tipo. Lo que no esté aquí sale como ficha baja. */
const ALTO = {
    muro: 1.0, cabeza: 0.6, cuerpo: 0.45, bolita: 0.12, comida: 0.3,
    jugador: 0.8, coche_der: 0.4, coche_izq: 0.4,
};
const COLOR_DE = { 0: 0x2a3550, 1: 0xc0392b, 2: 0x2e8b57, 3: 0xd68910, null: 0x7f8c8d };

/**
 * ⚠️ UNA PIEZA TOCADA ES UNA PIEZA MÁS PEQUEÑA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Si el sustrato dice `vida` y `vida_max`, la pieza se encoge en proporción. Y
 * el motivo por el que se hace con la ESCALA y no con el color es la propia
 * arquitectura de este fichero: las piezas van en mallas instanciadas agrupadas
 * por (forma + dueño), y una malla instanciada comparte material. Colorear una
 * sola instancia obliga a un `instanceColor` y a tocar los materiales de todos.
 * La escala, en cambio, ya viaja por instancia — `poner` lleva `escY` y `escXZ`
 * desde el principio. Es gratis y no rompe el agrupado.
 *
 * ⚠️ Y ESTO NO ES DE UN JUEGO: ES DEL VOCABULARIO.
 *
 * Nació con `defensa`, donde un bicho aguanta cuatro golpes y una torre le quita
 * uno por ronda, así que «¿le queda uno o cuatro?» decide si hace falta otra
 * torre. Ese número existía dentro de las reglas y no se publicaba: se jugaba a
 * ciegas. Pero la regla no dice «defensa»: dice «si publicas vida, se ve». Los
 * once juegos que se pintan con esta mesa la tienen desde hoy sin tocar nada, y
 * el que la quiera sólo tiene que publicarla.
 *
 * El suelo de 0,45 no es estética: una pieza a punto de morir tiene que SEGUIR
 * VIÉNDOSE. Encogerla hasta desaparecer la escondería justo en el momento en que
 * más importa mirarla — el mismo fallo del jugador camuflado de fagocito, que no
 * estaba oculto sino indistinguible.
 */
function escalaPorVida(p) {
    const v = Number(p?.vida), max = Number(p?.vida_max);
    if (!Number.isFinite(v) || !Number.isFinite(max) || max <= 0) return 1;
    return 0.45 + 0.55 * Math.max(0, Math.min(1, v / max));
}

/**
 * Desde qué silla se está mirando. El sustrato lo dice cuando importa —una mesa
 * de invitada, una sala compartida— y cuando no lo dice es que sólo hay una.
 *
 * Con `?? 0` y no con `|| 0`: el asiento 0 es un asiento, no una ausencia.
 */
const yoSoy = (sus) => sus?.yo ?? sus?.asiento ?? 0;

// Los dados, en su propia pieza: los piden generala, parchís y oca, y los tres pasan
// por aquí. THREE se le entrega, como a `tapete.js` y `mueble.js`.
import { crearDado, esDado, valorDeDado, LADO as LADO_DADO } from '../dados.js';
// Las fichas de dominó. Van aparte de los dados por lo mismo que los dados van aparte
// de las cartas: son otro material, con otra forma y otra manera de colocarse.
import { crearFicha, esFicha, disponerCadena } from '../fichas.js';
// Los props en GLB: geometria de verdad para los muros, sin perder el instanciado.
import { geometriasDeProp } from '../props.js';
// El emparejamiento de piezas entre fotogramas, suelto para poder probarlo sin
// navegador. Ver la cabecera de cercar.js.
import { acercar } from './acercar.js';

/**
 * Una etiqueta de casilla: el texto pintado en un lienzo y pegado a un plano tumbado.
 *
 * Con lienzo y no con geometría de letras por lo mismo que los puntos de los dados y
 * de las fichas: treinta y dos rótulos son treinta y dos texturas pequeñas, y en
 * geometría serían cientos de mallas para leer «Data-1».
 *
 * `depthWrite: false` porque el plano va a seis centésimas del suelo y sin eso pelea
 * con él por el mismo píxel — el efecto es el parpadeo de siempre al mover la cámara.
 */
function crearEtiqueta(THREE, texto) {
    const W = 256, H = 128;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#12161c';
    g.font = 'bold 34px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // Los nombres largos se parten por el guion, que es donde el nuestro los corta.
    const partes = String(texto).split('-');
    if (partes.length > 1) {
        g.fillText(partes[0], W / 2, H / 2 - 20);
        g.font = 'bold 44px system-ui, sans-serif';
        g.fillText(partes.slice(1).join('-'), W / 2, H / 2 + 24);
    } else {
        const cabe = g.measureText(texto).width <= W - 16;
        if (!cabe) g.font = 'bold 26px system-ui, sans-serif';
        g.fillText(texto, W / 2, H / 2);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.92, 0.46),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.name = `etiqueta:${texto}`;
    return m;
}

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
        // La ficha de domino boca abajo: la misma silueta que crearFicha, para que
        // lo tapado se distinga de lo tapado de una baraja.
        ficha: new THREE.BoxGeometry(0.86, 0.10, 0.43),
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
        /**
         * ⚠️ Y EL CLARO ERA DEMASIADO CLARO: «LA LUZ QUEMA EL TABLERO».
         * ═══════════════════════════════════════════════════════════════════
         *     — flota, frentes, defensa y damas. Cuatro betatesters, la misma frase.
         *
         * Estaba en `0xeceff4`, que es sRGB 0,94: un seis por ciento de margen
         * antes de reventar. Y las luces de esta mesa llegan fuertes —hemisférico
         * 2,20 y direccional 3,61 medidos en la escena viva, porque
         * `montarMesa.js` multiplica toda intensidad por π para compensar la
         * migración de three—. Con esos dos números, una superficie al 0,94 no se
         * ilumina: se recorta a blanco.
         *
         * ⚠️ Y NO ERA LA LUZ, AUNQUE LO PAREZCA. Medido, mismo día, misma mesa:
         *
         *     flota  material más claro  #eceff4  sRGB 0,94   ← se queja
         *     go     material más claro  #7d6039  sRGB 0,36   ← no se queja
         *
         * Las mismas luces exactas en los dos. Bajarlas habría oscurecido a los
         * nueve juegos que están bien para arreglar los cuatro que no.
         *
         * Es el mismo fallo que los edificios de la ciudad —allí a 0,08, aquí a
         * 0,94— y la misma lección por los dos extremos: cuando algo «se ve mal
         * de luz», hay que mirar el COLOR DEL MATERIAL antes que las lámparas.
         *
         * ⚠️ Y EL NÚMERO SALE DE PROBARLO, NO DE CALCULARLO. LA PRIMERA VEZ NO.
         *
         * Bajé a `0xc9d0dc` (sRGB 0,83) razonando que con un 17% de margen ya no
         * reventaría. Abrí la captura y estaba EXACTAMENTE IGUAL de blanca: plana,
         * sin degradado en perspectiva, que es la firma del recorte. El material
         * había cambiado —comprobado en la escena viva y en el fichero servido— y
         * la imagen no.
         *
         * Así que se buscó el punto de corte a mano, cambiando el color en la
         * escena y mirando si aparecía degradado entre las casillas cercanas y las
         * lejanas:
         *
         *     0,83  plana, recortada
         *     0,71  plana, recortada
         *     0,65  degradado leve; las de delante rozan el corte
         *     0,59  degradado claro, con margen
         *
         * `0x949dad` es 0,63, justo debajo de donde empieza a doler. El contraste
         * con el oscuro queda en 0,27 — menos que antes, pero el damero se lee y
         * ahora las casillas tienen VOLUMEN en vez de ser papel recortado.
         *
         * El oscuro no se toca: lo eligió una captura, según la nota de arriba.
         */
        sueloA: material(0x949dad, { roughness: 0.9 }),
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
    /** Los dados van aparte de los montones: seis materiales no se instancian. */
    const dados = new Map();
    /** Y las fichas de domino igual: cada una lleva su propia cara pintada. */
    const fichas = new Map();
    // Los rótulos de las casillas, por clave t<celda>:<texto>. Ver crearEtiqueta.
    const etiquetas = new Map();
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion();
    const POS = new THREE.Vector3(), ESC = new THREE.Vector3();

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ LAS PIEZAS SE MUEVEN, NO SE TELETRANSPORTAN
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Cuatro betatesters escribieron lo mismo en cuatro juegos distintos —go,
     * dominó, alisapolis, mancala—: «parece que juego yo solo». Comprobado por el
     * árbitro, la casa SÍ juega: go reparte 150/150, alisapolis 122/123, parchís
     * entre cuatro. Lo que fallaba es que no se VE mover a nadie.
     *
     * Y la causa estaba en el andamio: `TWEEN` va cargado en las cuarenta mesas
     * —32 KB— y `mesa_tablero.mjs` ya llama a `TWEEN.update()` en cada fotograma,
     * con su guarda de `document.hidden` y todo. Lo usa el motor de cartas (22
     * llamadas) y NO lo usa este fichero. Las mesas de cartas animan; las de
     * tablero teletransportan. Un motor girando en vacío.
     *
     * ⚠️ Y NO SE PUEDE USAR TWEEN AQUÍ, AUNQUE ESTÉ CARGADO.
     * TWEEN anima PROPIEDADES DE UN OBJETO. Una carta es una malla suya y se le
     * tira un tween a `.position`. Estas piezas van en `InstancedMesh` —treinta y
     * dos piezas de ajedrez son dos llamadas de dibujo, no treinta y dos objetos—
     * y no hay objeto al que animar: hay matrices que escribir. Así que se
     * interpolan números y se vuelcan las matrices, que es lo mismo un piso más
     * abajo.
     *
     * ⚠️ EL EMPAREJAMIENTO ES LO DIFÍCIL, NO LA INTERPOLACIÓN.
     * El sustrato manda una FOTO: dónde está todo ahora. Para animar hay que saber
     * qué pieza de la foto nueva es cuál de la vieja, y eso el sustrato no lo dice
     * salvo que el juego publique `id` —lo que hoy hace uno—. Sin `id` se empareja
     * por cercanía dentro del grupo: cuando una ficha se mueve, todas las demás
     * casan consigo mismas a distancia cero y la que sobra es la que viajó.
     *
     * Lo que NO se interpola: una pieza que aparece de la nada. Se pone en su
     * sitio directamente. Deslizarla desde el sitio de otra sería inventarse un
     * movimiento que nadie hizo — y en un juego con recibo eso es peor que un
     * salto.
     */
    const mostradas = new Map();          // clave de grupo → posiciones en pantalla
    let grupos = new Map();               // el último reparto por aspecto
    let ultimo = null;                    // { sus, dx, dz }, para repetir por fotograma

    function volcarPiezas(sus, dx, dz) {
        ultimo = { sus, dx, dz };
        grupos = new Map();
        for (const p of (sus.piezas ?? [])) {
            /**
             * ⚠️ LA ALTURA LA PUEDE DECLARAR EL JUEGO, Y HASTA HOY NO PODÍA.
             *
             * `ALTO` es una tabla de este fichero con ocho tipos dentro, y todo lo
             * que no esté en ella cae a 0,25 — o sea a disco. Un tipo nuevo nace
             * plano, y con la forma decidiéndose por la altura (`>= 0.4` es cubo),
             * eso significa que un juego nuevo no puede tener un bulto.
             *
             * Lo encontró `mecha` al estrenarse: sus cajas, sus bombas y sus
             * llamas salían las tres como el mismo disco, y una caja que se rompe
             * y una llama que mata tienen que distinguirse a la primera.
             *
             * Es el mismo trato que ya tienen `simbolos`, `terreno` y `leyenda`:
             * lo declara el juego, no lo adivina el pintor. Aditivo — quien no
             * declara `alturas` sigue exactamente igual que antes.
             */
            const alto = sus.alturas?.[p.t] ?? ALTO[p.t] ?? 0.25;
            const forma = (p.t === 'bolita' || p.t === 'comida') ? 'punto'
                        : alto >= 0.4 ? 'cubo' : 'disco';
            const clave = `p:${forma}:${p.de}`;
            if (!grupos.has(clave)) grupos.set(clave, { forma, de: p.de, alto, items: [] });
            grupos.get(clave).items.push(p);
        }

        for (const [clave, g] of grupos) {
            // El emparejamiento vive en `acercar.js`, suelto y sin THREE, porque
            // es la parte que se equivoca en silencio y hay que poder probarla
            // sin navegador. Ver su cabecera.
            const objetivos = g.items.map((p) => ({ x: p.x + dx, z: p.y + dz, id: p.id }));
            const ahora = acercar(mostradas.get(clave) ?? [], objetivos);
            for (let i = 0; i < ahora.length; i++) ahora[i].p = g.items[i];
            mostradas.set(clave, ahora);

            // La forma del disco depende del dueño: es lo que hace que los
            // bandos se distingan sin depender del color.
            const forma = g.forma === 'disco' ? discoDe(g.de) : geo[g.forma];
            const m = monton(clave, forma, materialDe(g.de, sus.colores), ahora.length);
            /**
             * El contorno va por detrás en el mismo bucle: mismas posiciones,
             * misma geometría, un pelo más ancho. Ver la nota de `contornoDe`.
             *
             * ⚠️ SIN EXCEPCIONES, Y ANTES PUSE UNA. Dejé fuera las bolitas
             *    —`punto`— pensando que son demasiado pequeñas para que un anillo
             *    se lea. No lo medí: es justo la comida que persigues en
             *    `fagocito`, o sea lo que más hay que ver. La comprobación la
             *    cazó como el único grupo sin contorno de los 36.
             */
            const s = monton(`s:${g.forma}:${g.de}`, forma,
                             contornoDe(g.de, sus.colores), ahora.length);
            for (const o of ahora) {
                const f = escalaPorVida(o.p);
                const y = (g.alto * f) / 2 + 0.08;
                const escY = (g.forma === 'cubo' ? g.alto : 1) * f;
                poner(m, o.x, y, o.z, escY, 0, f);
                if (s) poner(s, o.x, y, o.z, escY, 0, f * ANCHO_CONTORNO);
            }
            m.instanceMatrix.needsUpdate = true;
            if (s) s.instanceMatrix.needsUpdate = true;
        }
        // Los grupos que ya no tienen piezas dejan de recordar dónde estaban: si
        // no, al volver a aparecer una pieza vendría deslizándose desde donde
        // estuvo hace tres jugadas.
        for (const clave of [...mostradas.keys()]) if (!grupos.has(clave)) mostradas.delete(clave);
    }

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

            /**
             * ⚠️ LOS HOSHI. NO SON ADORNO: SON CÓMO SE LEE UN GOBAN.
             * ═══════════════════════════════════════════════════════════════
             *
             * Un tablero de go de verdad lleva nueve puntos marcados —las
             * «estrellas»— y no están por decoración: son el sistema de
             * coordenadas con el que se habla del juego. «El 4-4 de arriba a la
             * derecha» sólo significa algo si esos puntos se ven. Sin ellos, un
             * 19×19 es una cuadrícula uniforme donde no puedes decir dónde estás
             * sin contar líneas desde el borde, una por una.
             *
             * Las posiciones son las reglamentarias y dependen del tamaño:
             *
             *     19×19   líneas 4, 10, 16   (nueve puntos)
             *     13×13   líneas 4,  7, 10
             *      9×9    líneas 3,  5,  7
             *
             * Se dibujan aquí, con el goban, porque son parte del tablero y no de
             * la partida: se cachean igual y no cuestan un solo repintado.
             *
             * Y sólo en tableros cuadrados de los tamaños con hoshi definido. El
             * xiangqi también se juega en intersecciones y NO lleva estrellas — le
             * pintaría nueve puntos que en ese juego no significan nada, que es
             * peor que no pintar ninguno.
             *
             * ⚠️ EL TAMAÑO ESTÁ MEDIDO CONTRA EL TABLERO DE VERDAD, NO ELEGIDO.
             *
             * Diámetro 0,15 sobre una casilla de 1 — el 15 %. En un goban real el
             * punto son unos 4 mm sobre casillas de 22, o sea el 18 %. Y lo que
             * decide si se lee es la comparación con la línea, no el número
             * absoluto: aquí sale **3,5 veces el grosor de la línea** (6 px contra
             * 1,7 en la fila de delante, 4 px en la de atrás), y en un goban de
             * madera es unas 4 veces. Está donde tiene que estar; agrandarlo para
             * que «se vea mejor» sería dejar de parecerse a un goban.
             */
            const HOSHI = { 19: [3, 9, 15], 13: [3, 6, 9], 9: [2, 4, 6] };
            const marcas = cols === filas ? HOSHI[cols] : null;
            if (marcas) {
                const geoP = new THREE.CylinderGeometry(0.075, 0.075, 0.016, 16);
                for (const a of marcas) for (const b of marcas) {
                    const p = new THREE.Mesh(geoP, mat.linea);
                    p.position.set(a + dx, 0.008, b + dz);
                    g.add(p);
                }
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

    /** El tono real de un bando: el que declaró el juego, o el genérico del pintor. */
    const hexDe = (de, colores) => colorDe(de, colores) ?? COLOR_DE[de] ?? COLOR_DE.null;

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL CONTORNO — IDEA DE OSCAR
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Una ficha clara sobre el suelo claro del damero pierde el borde, y una
     * oscura contra la sombra hace lo mismo por el otro lado. Un contorno del
     * color contrario devuelve el borde en los dos casos. De qué color va lo
     * decide `contrasteDe` en `paleta.js`, por luminancia y no por el nombre.
     *
     * ⚠️ CASCO INVERTIDO, NO POSTPROCESO.
     *
     * Lo habitual fuera es un `OutlinePass`, que pide `EffectComposer` y una
     * pasada más de pantalla completa. Aquí el arcade es three r128 con scripts
     * clásicos: meter una cadena de postproceso por un contorno sería pagar el
     * andamio entero por el adorno. El casco invertido es la misma malla, un pelo
     * más ancha, pintada por dentro: lo único que asoma es el borde.
     *
     * ⚠️ Y CUESTA EXACTAMENTE UN `InstancedMesh` MÁS POR GRUPO, NO POR PIEZA.
     *
     * El pintor ya agrupa por `(forma, dueño)` — cuatro o cinco montones en un
     * tablero cargado— así que el contorno de las treinta y dos piezas del
     * ajedrez son dos llamadas de dibujo, no treinta y dos.
     *
     * ⚠️ SÓLO CRECE EN X-Z, NO EN Y, Y ESO ES A PROPÓSITO.
     *
     * Creciendo también en alto, el casco asomaría por debajo del tablero y se
     * pelearía con el tapete, y por arriba taparía la cara de la ficha. Creciendo
     * sólo a lo ancho queda un anillo alrededor, que es justo lo que separa la
     * pieza del suelo desde la cámara de esta mesa.
     *
     * ⚠️ Y NO SE LLAMA `p:` SINO `s:`. `prueba_vistas` cuenta las piezas dibujadas
     *    por ese prefijo y las cruza con el sustrato: si el contorno se llamara
     *    igual, los 41 juegos dibujarían el doble de piezas de las que hay.
     */
    const ANCHO_CONTORNO = 1.10;
    const matsContorno = new Map();
    function contornoDe(de, colores) {
        const hex = contrasteDe(hexDe(de, colores));
        if (!matsContorno.has(hex)) {
            matsContorno.set(hex, new THREE.MeshBasicMaterial({
                color: hex,
                side: THREE.BackSide,   // se pinta por dentro: sólo asoma el borde
            }));
        }
        return matsContorno.get(hex);
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
        // ¿Esta mesa reparte fichas de domino? Se mira lo que hay, no el nombre del juego.
        const hayFichas = (sus?.zonas ?? []).some(z => (z.items ?? []).some(it => esFicha(it?.id ?? it)));

        // ── El terreno ──────────────────────────────────────────────────
        if (sus.rejilla) {
            const { ancho: cols, alto: filas, celdas, niebla } = sus.rejilla;
            const dx = -(cols - 1) / 2, dz = -(filas - 1) / 2;

            /**
             * ⚠️ DÓNDE CAE CADA CASILLA, PUBLICADO. ES EL CONTRATO QUE LE FALTABA.
             *
             * Las piezas se pueden comprobar desde fuera porque LLEVAN NOMBRE en la
             * malla (`p:<tipo>:<dueño>`): un instrumento las proyecta y sabe a qué está
             * apuntando. Las casillas no tenían nada equivalente, y sin eso la única
             * medida posible de «¿se puede jugar tocando el tablero?» era una rejilla a
             * ciegas — cuyo cero no distingue «no se puede tocar» de «no lo encontré».
             *
             * Intenté deducirlo mirando la escena y me equivoqué en tres juegos de seis
             * sin un solo error en consola: la malla plana más grande, que parecía
             * obviamente el tablero, era el SUELO de la habitación. Y de cerca son
             * cuatro geometrías distintas: ajedrez tiene 64 casillas como objetos,
             * reversi el tablero pintado en una sola malla, y el goban de go ni
             * siquiera es una malla plana.
             *
             * ⚠️ Y NO SE HACE CON UNA MALLA POR CASILLA, AUNQUE ASÍ LO HAGA EL AJEDREZ.
             *
             * Aquí el terreno se dibuja con `InstancedMesh` justamente para que
             * fagocito —28x28, 784 celdas— no cueste 784 objetos. Estandarizar «como el
             * ajedrez» sería tirar esa optimización para poder medir, que es dejar que
             * el instrumento decida cómo se dibuja. Lo que hace falta no es un objeto
             * por casilla: es SABER DÓNDE ESTÁ CADA UNA, y eso son seis números.
             *
             * La regla es la misma que usa el pintado de abajo: la casilla (c,f) cae en
             * (c + dx, f + dz) y mide una unidad de lado.
             */
            escena.userData.rejillaMundo = { cols, filas, dx, dz, lado: 1, y: 0 };

            /**
             * ═══════════════════════════════════════════════════════════════
             *  ⚠️ Y LAS CASILLAS TAMBIÉN TOMAN EL AMBIENTE
             * ═══════════════════════════════════════════════════════════════
             *
             * `atmosfera.js` puso cielo, suelo y niebla alrededor, y al mirar las tres
             * capturas del piloto la conclusión fue la misma en las tres: **el aire
             * funciona y el tablero no**. La pradera salía con hierba de verdad y encima
             * un damero de ajedrez azul y blanco — un tablero tirado en un césped, no un
             * prado. Y la nave, con casco metálico fuera y muros de MADERA dentro.
             *
             * Las casillas y los muros se pintaban con tres colores fijos que sirven a
             * los veinticuatro. Aquí se les da el tinte del ambiente cuando lo hay, y se
             * quedan como estaban cuando no. Es el mismo trato que el resto: lo declara
             * el juego, no lo adivina nadie, y quien no pide nada no cambia.
             *
             * Se cambia el color del material que YA existe en vez de hacer otro: el
             * suelo se dibuja instanciado —una llamada para las 784 celdas de fagocito—
             * y crear un material por ambiente tiraría esa optimización para pintar.
             */
            /**
             * ═══════════════════════════════════════════════════════════════
             *  ⚠️ LOS MUROS PUEDEN SER ROCAS DE VERDAD, Y SIGUEN SIENDO UNA LLAMADA
             * ═══════════════════════════════════════════════════════════════
             *
             * `public/props/` tiene 21 variantes de roca en GLB, de 72 a 102 triángulos
             * cada una, y el arcade dibujaba cubos. Con `rejilla.prop = 'roca'` se le
             * cambia la GEOMETRÍA al `InstancedMesh` que ya existe: misma llamada de
             * dibujo, otra forma. Ver la nota de `protohub/props.js` sobre por qué se
             * pide la geometría y no el objeto.
             *
             * Es asíncrono y no se espera: los muros se pintan como cubos y se vuelven
             * roca cuando el modelo llega. Bloquear el primer fotograma por esto sería
             * cambiar una pantalla negra por otra.
             *
             * Y el material del GLB se deja en su sitio: la roca trae el suyo, con su
             * color, y pisárselo con el nuestro sería traerse la geometría y tirar la
             * mitad de lo que la hace parecer una roca.
             */
            const propMuro = sus.rejilla.prop ?? null;
            if (propMuro && propMuro !== propPedido) {
                propPedido = propMuro;
                geometriasDeProp(THREE, propMuro).then((vs) => {
                    if (!vs?.length || propPedido !== propMuro) return;
                    /**
                     * ⚠️ LA ROCA TOMA EL COLOR DEL MUNDO, Y NO ES ESTÉTICA: ES QUE SI NO
                     * SE COME AL JUGADOR.
                     *
                     * Los GLB vienen gris oscuro, y el peón de la casa es `0x2a3550`.
                     * `npm run legibilidad` lo cantó a la primera: «camuflaje —
                     * p:disco:0 sobre muro (18)», por debajo del umbral de 32. Segunda
                     * vez en el mismo día que hacerlo bonito hace invisible al jugador.
                     *
                     * Se TIÑE, no se pinta: `material.color` multiplica la textura, así
                     * que la roca conserva su sombreado y sus facetas y sólo cambia de
                     * familia de color. Y de paso obedece al contrato de luz de la casa
                     * —una paleta por mundo—, en vez de meter un gris que no está en
                     * ninguna de las cinco.
                     *
                     * Se clona el material porque el original vive en la caché del prop
                     * y lo comparten todos los juegos que pidan esa roca: pisarlo aquí
                     * teñiría la cripta con el color de la pradera.
                     */
                    const tinte = PALETAS[sus.rejilla.ambiente]?.muro;
                    propMuros = vs.map(({ geometria, material }) => {
                        if (!tinte) return { geometria, material };
                        const m = material.clone();
                        m.color = new THREE.Color(tinte);
                        return { geometria, material: m };
                    });
                });
            }

            const amb = PALETAS[sus.rejilla.ambiente];
            if (amb !== paletaPuesta) {
                paletaPuesta = amb;
                mat.sueloA.color.setHex(amb?.claro ?? 0x949dad);
                mat.sueloB.color.setHex(amb?.oscuro ?? 0x4a5a70);
                mat.muro.color.setHex(amb?.muro ?? 0x5c5040);
            }

            /**
             * ═══════════════════════════════════════════════════════════════
             *  ⚠️ EL NOMBRE DE LA CASILLA, ESCRITO EN LA CASILLA
             * ═══════════════════════════════════════════════════════════════
             *
             * `rejilla.nombres` lleva tiempo publicándose y no lo dibujaba nadie: sólo
             * lo leía el respaldo del tacto. En un tablero de casillas ANÓNIMAS —el
             * ajedrez, el go— no hace falta, pero en el alisápolis el nombre ES el
             * juego: se ve el anillo y los peones y no distingues Data de Heritage.
             *
             * ⚠️ SE DIBUJA SÓLO SI LA REJILLA LO PIDE (`etiquetas: true`).
             *
             * Flota también publica nombres —`a1`…`j10`— y ponerle cien etiquetas
             * encima sería llenarle el tablero de ruido para arreglarle el problema a
             * otro juego. Lo dice el sustrato, no adivina el pintor.
             *
             * Provisional a propósito: texto negro sobre el propio suelo, tumbado, sin
             * más diseño. Lo bonito ya se hará.
             */
            if (sus.rejilla.etiquetas && Array.isArray(sus.rejilla.nombres)) {
                for (let k = 0; k < sus.rejilla.nombres.length; k++) {
                    const txt = sus.rejilla.nombres[k];
                    if (!txt) continue;
                    const clave = `et${k}:${txt}`;
                    let m = etiquetas.get(clave);
                    if (!m) {
                        // Se limpia la que hubiera en esa casilla con otro texto: si no,
                        // al cambiar de partida se apilarían dos nombres en el mismo sitio.
                        for (const [c, vieja] of etiquetas) {
                            if (c.startsWith(`et${k}:`)) { raiz.remove(vieja); etiquetas.delete(c); }
                        }
                        m = crearEtiqueta(THREE, txt);
                        raiz.add(m);
                        etiquetas.set(clave, m);
                    }
                    const c = k % cols, f = Math.floor(k / cols);
                    m.position.set(c + dx, 0.06, f + dz);
                    m.visible = true;
                    usados.add(clave);
                }
            }

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
                // ⚠️ Si llegó el prop, el muro se dibuja con SU geometría y SU material.
                // Ver la nota de arriba: es el mismo `InstancedMesh`, otra forma.
                ['muro', muros, propMuros?.[0]?.geometria ?? geo.cubo,
                        propMuros?.[0]?.material ?? mat.muro, ALTO.muro / 2, ALTO.muro],
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
            // Se saca a `volcarPiezas` porque hay que poder repetirlo POR
            // FOTOGRAMA sin repintar el resto de la mesa: es lo que convierte un
            // salto en un movimiento. Ver su cabecera.
            volcarPiezas(sus, dx, dz);
            // El contorno de cada grupo es otro montón, con su propia clave. Sin
            // apuntarlo aquí, el barrido de abajo lo daría por no usado y lo
            // escondería — y los contornos parpadearían un cuadro sí y otro no.
            for (const [clave, g] of grupos) {
                usados.add(clave);
                usados.add(`s:${g.forma}:${g.de}`);
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
            // Una ficha de dominó es más larga que una carta: si el paso no lo sabe,
            // la mano sale como una barra. Ver el respaldo de `colocar`.
            const sitios = colocar(z, iz, total, hayFichas ? 0.98 : 0.7);

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
            /**
             * ⚠️ UN DADO SE DIBUJA COMO UN DADO, NO COMO UNA LÁMINA CON UN NÚMERO.
             *
             * Aquí ya se arregló una vez lo importante —que un `d6_5` y un `d6_2` no
             * salieran idénticos— pintando el valor sobre la carta plana. El DATO
             * quedó bien y el objeto no: sobre una mesa, un dado tumbado del grosor de
             * un naipe se lee como una ficha, y en cuanto orbitas la cámara se ve que
             * es una lámina. La generala reparte cinco y el parchís y la oca uno.
             *
             * `protohub/dados.js` da un cubo de verdad, con las opuestas sumando siete
             * y el valor arriba por GIRO, así que aguanta que lo mires desde donde sea.
             *
             * No van instanciados como el resto: un dado son seis materiales, uno por
             * cara, y `InstancedMesh` comparte material. Son cinco como mucho, así que
             * mallas sueltas — con el mismo trato que los montones, reaprovechadas por
             * clave y escondidas cuando no se usan, que es lo que evita crear y tirar
             * objetos sesenta veces por segundo.
             */
            /**
             * ⚠️ LA CADENA DE DOMINÓ NO SE COLOCA COMO UNA MANO. AQUÍ ESTÁ LO NUEVO.
             *
             * Todo lo demás que pasa por esta función se coloca en sitios que alguien
             * decidió antes: una fila, un abanico, una rejilla. La cadena de dominó no
             * tiene sitio previo — su forma sale de cómo se jugó, ficha a ficha, y hay
             * que RECORRERLA para saber dónde acaba cada una.
             *
             * `disponerCadena` hace ese recorrido: pone en línea, dobla cuando se pasa
             * de largo, y cruza los dobles (que además ocupan la mitad). Devuelve
             * coordenadas y no dibuja, para que sirva a cualquier mesa.
             *
             * Las fichas de la MANO y del pozo también son fichas, pero ésas sí van en
             * fila como cualquier mano: se colocan con `sitios`, como las cartas.
             */
            if (z.items.some(it => esFicha(it?.id ?? it))) {
                const ids = z.items.map(it => String(it?.id ?? it));
                const enCadena = z.id === 'cadena';
                const puestos = enCadena ? disponerCadena(ids) : null;
                ids.forEach((id, k) => {
                    const clave = `ficha:${iz}:${k}`;
                    let f = fichas.get(clave);
                    if (!f || f.userData.id !== id) {
                        if (f) { raiz.remove(f); f.geometry.dispose();
                                 for (const m of f.material) { m.map?.dispose(); m.dispose(); } }
                        f = crearFicha(THREE, id);
                        f.userData.id = id;
                        raiz.add(f);
                        fichas.set(clave, f);
                    }
                    const s = puestos ? puestos[k] : (sitios[k] ?? { x: 0, z: 0, rot: 0 });
                    f.visible = true;
                    f.position.set(s.x, 0.15, s.z);
                    f.rotation.y = s.rot ?? 0;
                    usados.add(clave);
                });
                return;
            }

            if (z.items.some(it => esDado(it?.id ?? it))) {
                z.items.forEach((it, k) => {
                    const id = String(it?.id ?? it ?? '·');
                    const clave = `dado:${iz}:${k}`;
                    const valor = valorDeDado(id);
                    let d = dados.get(clave);
                    // Se rehace sólo si CAMBIÓ el valor: las caras son texturas y
                    // repintarlas en cada cuadro sería el mismo derroche.
                    if (!d || d.userData.valor !== valor) {
                        if (d) { raiz.remove(d); d.geometry.dispose();
                                 for (const m of d.material) { m.map?.dispose(); m.dispose(); } }
                        d = crearDado(THREE, valor);
                        d.userData.valor = valor;
                        raiz.add(d);
                        dados.set(clave, d);
                    }
                    const s = sitios[k] ?? { x: 0, z: 0, rot: 0 };
                    d.visible = true;
                    d.position.set(s.x, LADO_DADO / 2 + 0.1, s.z);
                    usados.add(clave);
                });
                return;
            }

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

            /**
             * Las tapadas siguen siendo todas iguales, que es lo que son.
             *
             * ⚠️ PERO CON LA FORMA DEL MATERIAL QUE SE ESTÁ JUGANDO. Boca abajo, una
             * ficha de dominó y una carta se distinguen igual: por su silueta. Dibujar
             * la mano del rival y el pozo del dominó como naipes dejaba una mesa donde
             * lo que se ve es de dominó y lo que se adivina es de cartas — y en un
             * juego donde CUÁNTAS le quedan al otro es la mitad de la información, esa
             * silueta es un dato, no un adorno.
             *
             * Se decide mirando lo que hay en la mesa, no el nombre del juego: si
             * alguna zona reparte fichas, las tapadas de esta mesa son fichas.
             */
            const ocultas = z.ocultas ?? 0;
            if (ocultas > 0) {
                const clave = `z${iz}:ocultas`;
                const m = monton(clave, hayFichas ? geo.ficha : geo.carta, mat.oculta, ocultas);
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
        // Y los dados igual: la generala guarda dados entre tiradas, así que la zona
        // encoge y crece, y esconder es más barato que rehacer.
        for (const [clave, d] of dados) if (!usados.has(clave)) d.visible = false;
        for (const [clave, f] of fichas) if (!usados.has(clave)) f.visible = false;
        for (const [clave, e] of etiquetas) if (!usados.has(clave)) e.visible = false;
    }

    /** Dónde va cada carta. Con `CroupierSystem` si lo hay; si no, en fila. */
    function colocar(z, iz, total, paso = 0.7) {
        /**
         * ⚠️ UN POZO NO ES UNA FILA, ES UN MONTÓN.
         *
         * Las catorce fichas del pozo del dominó salían tendidas en línea, ocupando
         * más ancho que la cadena entera: la mesa decía «aquí hay catorce fichas
         * expuestas» cuando lo que hay es un montón boca abajo. Y no es cosmético —
         * cuántas quedan por robar es información pública, pero DÓNDE está cada una
         * no lo es, y dibujarlas en fila la inventa.
         *
         * Se apilan en el mismo sitio; la altura ya la pone `poner`, que suma
         * `alturaCarta * k`. Lo dice la zona, no el nombre del juego.
         */
        if (z.apilada) {
            return Array.from({ length: total }, () => ({ x: 0, z: 2.4 + iz * 1.2, rot: 0 }));
        }
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
        //
        // ⚠️ El paso lo manda quien llama, y no es un detalle: 0.7 es el ancho de una
        // carta, y una ficha de dominó mide 0.86 de largo. Con el paso de carta las
        // siete de tu mano se montaban unas sobre otras y se leían como UNA barra
        // blanca — que es exactamente lo que se veía en la captura del 19-08.
        return Array.from({ length: total }, (_, k) => ({
            x: (k - (total - 1) / 2) * paso, z: 2.4 + iz * 1.2, rot: 0,
        }));
    }

    return {
        pintar,
        raiz,
        /**
         * Acerca las piezas a donde deberían estar. Se llama POR FOTOGRAMA, al
         * lado del `TWEEN.update()` que la mesa ya tiene.
         *
         * ⚠️ NO REPINTA LA MESA: sólo vuelca las matrices de las piezas, que es
         * barato porque `monton` reutiliza las mallas del fondo común. Repintar
         * todo a sesenta por segundo sería rehacer el tapete, los rótulos y las
         * zonas para mover una ficha.
         *
         * Y no hace nada antes del primer `pintar()`: sin sustrato no hay a dónde
         * ir. Devuelve si ha movido algo, para que se pueda medir sin adivinar.
         */
        animar() {
            if (!ultimo) return false;
            volcarPiezas(ultimo.sus, ultimo.dx, ultimo.dz);
            return true;
        },
        /** Dónde se está dibujando cada pieza AHORA. Para poder medir el viaje. */
        get posicionesEnPantalla() {
            const fuera = [];
            for (const [clave, lista] of mostradas) {
                for (const o of lista) fuera.push({ clave, id: o.id, x: +o.x.toFixed(4), z: +o.z.toFixed(4) });
            }
            return fuera;
        },
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
