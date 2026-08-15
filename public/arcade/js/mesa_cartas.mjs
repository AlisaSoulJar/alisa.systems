/**
 * mesa_cartas.mjs — UNA mesa de casino para los diez juegos de cartas
 * ═══════════════════════════════════════════════════════════════════════════
 *     montarMesa({ juego: 'entropy', visualizador: 'mesa_cartas.mjs' })
 *
 * Fieltro verde, foco cenital y cartas repartidas en abanico — el aspecto de
 * `poker.html`, que es el bueno. La diferencia está en de dónde saca las cartas.
 *
 * ⚠️ LEE EL SUSTRATO, NO LOS CAMPOS DEL JUEGO.
 *
 * `poker_visualizer.js` hace esto:
 *
 *     const community = data.community_cards || [];
 *     const playerHand = data.player_hand || [];
 *     const oppHand    = data.opponent_hand || ['back','back'];
 *
 * Tres nombres de campo del póker. Por eso ese fichero sirve para un juego y
 * hubo que escribir catorce visualizadores para catorce juegos — y de ahí
 * salieron los peores fallos del proyecto: `syncGoState` leyendo el tablero de
 * dos maneras dentro de la misma función, las piedras del go sin dibujarse
 * durante meses, el ajedrez entregando jugadas legales sin tablero. Ninguno daba
 * error. Dibujaban mal, callados.
 *
 * El sustrato ya normaliza eso. Cualquier juego de cartas publica lo mismo:
 *
 *     zonas: [{ id, de, items: [...], ocultas: n }, ...]
 *
 * `id` dice qué es (mano, caja, descarte, comunes), `de` de quién es —o `null`
 * si es de la mesa—, `items` lo que se ve y `ocultas` **cuántas hay boca abajo**.
 * Con eso se dibuja entropy, la brisca o el tute sin saber a qué se juega.
 *
 * ⚠️ Y LO OCULTO SE PINTA, QUE NO ES LO MISMO QUE OMITIRLO.
 * Si las cartas tapadas del rival no salieran, el cuadro diría que no tiene
 * nada. Eso no es una omisión, es una mentira — y ya la cometimos una vez: el
 * adaptador perdía la mano tapada del póker y el dibujo afirmaba que el
 * contrario iba con las manos vacías.
 */
import { sustratoDe } from './protohub/sustrato.js';
import { crearMarcas, VERDE, MORADO, ACIERTO } from './protohub/marcas.js';
import { amueblar, ponerMesaDeVerdad } from './protohub/habitacion.js';
import { pintarJugadas as pintarBotones } from './protohub/jugadas.js';
import { volcarMesa, volcando, ponerBoton } from './protohub/render/volcar.js';

/**
 * Dónde se sienta cada zona. La mesa mira desde el asiento 0, abajo.
 *
 * `reparto` dice hacia dónde se separan las zonas de un mismo dueño cuando tiene
 * varias (mano y bazas ganadas, caja y descarte). Los de abajo y arriba tienen
 * sitio a lo ancho; los de los lados, a lo hondo. Apilarlas todas hacia el centro
 * —que es lo que hacía esto antes— las montaba unas sobre otras.
 */
/**
 * Dónde va cada zona. Depende de la FORMA DE LA PANTALLA, no del juego.
 *
 * ⚠️ EN UN TELÉFONO LA MESA ES ALTA Y ESTRECHA, Y EL REPARTO ANCHO NO CABE.
 *
 * En horizontal el mazo y el descarte van a los lados (x ±6,5), que es donde
 * sobra sitio y donde se ve de un vistazo que no son de nadie. En un móvil en
 * vertical eso obliga a alejar la cámara hasta que las cartas son ilegibles: lo
 * ancho manda sobre lo alto aunque la pantalla diga lo contrario.
 *
 * Así que en estrecho se meten EN MEDIO, entre las dos cajas, y la mesa entera
 * pasa a ser un rectángulo alto de unos 5 de ancho por 11 de fondo — que es
 * justo la forma de un teléfono. Mismo juego, mismas zonas, otra colocación.
 */
/**
 * ⚠️ Y DEPENDE DE SI HAY ALGUIEN SENTADO A LOS LADOS.
 *
 * Las zonas de nadie —mazo, descarte, baza— se separaban 11 en horizontal, o sea
 * a x ±5,5. Eso era libre en entropy, que se juega entre DOS: los lados estaban
 * vacíos. La brisca se juega entre cuatro, y sus asientos laterales ocupan de 5,69
 * a 7,31... justo encima. La baza y el mazo se dibujaban DENTRO de las manos de
 * los rivales, y como todo son cartas blancas sobre fieltro verde, no parecía un
 * error: parecía que el mazo había desaparecido.
 *
 * No se arregla moviendo el mazo a mano, que sería volver a calibrar mirando un
 * juego. Se arregla preguntando lo único que decide el sitio: si esos asientos
 * están ocupados. Con dos jugadores el centro sigue teniendo toda la anchura.
 */
const sitios = (estrecha, conLaterales = false) => ({
    0:    { x:  0.0, z:  2.9, layout: 'fan',  reparto: 'x', paso: 6 },  // tú, cerca de la cámara
    1:    { x:  0.0, z: -2.9, layout: 'fan',  reparto: 'x', paso: 6 },  // el de enfrente
    2:    { x: estrecha ? -3.2 : -6.5, z: 0.0, layout: 'fan', reparto: 'z', paso: 4 },
    3:    { x: estrecha ?  3.2 :  6.5, z: 0.0, layout: 'fan', reparto: 'z', paso: 4 },
    mesa: { x:  0.0, z:  0.0, layout: 'line', reparto: 'x',
            paso: estrecha ? 3.6 : (conLaterales ? 5 : 11) },
});

/**
 * Sitios que NO dependen de quién sea la zona, sino de qué es.
 *
 * La carta que acabas de robar es «tuya» (`de: 0`), pero ponerla junto a tu caja
 * la metía en el mismo reparto y desplazaba la rejilla del centro. Va delante de
 * todo, entre tú y tu caja, que es donde la tendrías en la mano.
 */
const SITIO_ZONA = {
    robada: { x: 0, z: 5.6, layout: 'line', paso: 0 },
};

/** El mismo hueco entre cartas que usa la mesa de póker. */
const ESPACIO = 0.9;

/**
 * Y en una rejilla las cartas NO se solapan: se ven enteras las ocho.
 * La carta mide 1,2 × 1,8 tumbada, así que el hueco va por encima de eso.
 */
const REJILLA_X = 1.4;
const REJILLA_Z = 2.0;

/** Cuánto se separan dos zonas del mismo dueño, si su sitio no dice otra cosa. */
const SEPARA = 6;

/**
 * ⚠️ CUÁNTAS CARTAS CABEN EN FILA. PASADO ESTO, ES UN MONTÓN.
 *
 * El mazo de entropy tiene 79 cartas. En fila ocupaban 71 unidades sobre un
 * fieltro de 20: cruzaban la mesa entera y se salían de la pantalla por los dos
 * lados. No era un fallo del dato —el mazo tiene 79— sino de creer que toda zona
 * se enseña extendida.
 *
 * La disposición la decide CUÁNTAS hay, que es algo que publican los diez juegos,
 * y no cómo se llame la zona, que sólo lo sabe quien conozca ese juego. Un mazo
 * es un montón porque no cabe, no porque se llame mazo.
 */
const CABEN = 9;

/**
 * Pone la cámara y elige mesa o tapiz según la forma de la pantalla.
 *
 * ⚠️ EN VERTICAL SE MIRA CASI DESDE ARRIBA, y no es un capricho de estilo.
 *
 * La mesa mide unas 5 unidades de ancho por 11 de fondo. En una vista tumbada,
 * la profundidad se aplasta por la perspectiva y las cartas del rival quedan
 * diminutas mientras sobra pantalla a los lados. Mirando desde arriba, «fondo»
 * se convierte en «alto» — que es justo lo que un teléfono tiene de sobra.
 *
 * Va suelta y no dentro de la configuración porque el motor sólo copia tres
 * ganchos (`onInit3D`, `onStateSync`, `onResize`): cualquier otra cosa puesta
 * ahí se pierde en silencio. Ya me pasó con `pintarJugadas`.
 */
function encuadrar(motor) {
    /**
     * ⚠️ DE INVITADO NO SE TOCA LA CÁMARA NI SE AMUEBLA NADA.
     *
     * Cuando esta mesa vive dentro de otra sala, la cámara es de la sala y el
     * sitio ya existe. Mover su cámara sería arrancarle el punto de vista al
     * anfitrión en mitad de su propia escena, y amueblar sería meter un segundo
     * suelo y un segundo techo dentro de una habitación que ya los tiene.
     */
    if (motor.invitado) return;

    const estrecha = motor.esPantallaEstrecha();
    const { mesa, canto, tapiz, mueble } = motor.piezasMesa ?? {};
    if (mesa)   mesa.visible   = !estrecha;
    if (canto)  canto.visible  = !estrecha;
    // El mueble es `Table.glb`, el mismo que las salas pocket. Se esconde en
    // vertical por lo mismo que la mesa: ahí se juega sobre tapiz a pantalla
    // completa, porque ver la mesa entera obliga a alejar hasta que no se lee.
    if (mueble) mueble.visible = !estrecha;
    if (tapiz)  tapiz.visible  = estrecha;

    // Girar el teléfono cambia qué se ve: en horizontal cabe la habitación, en
    // vertical no. Se quita y se pone de verdad —no se esconde— para que la
    // niebla vuelva a ser la del motor, que es distinta de la de la sala.
    const quiereSitio = new URLSearchParams(location.search).get('sitio') !== 'no';
    if (quiereSitio && !estrecha && !motor.habitacion) motor.habitacion = amueblar(motor.scene);
    if ((estrecha || !quiereSitio) && motor.habitacion) {
        motor.habitacion.quitar();
        motor.habitacion = null;
    }

    if (estrecha) {
        motor.camera.position.set(0, 13.5, 5.2);
        motor.camera.lookAt(0, 0, 0.9);
    } else {
        // Póker mira desde (0, 5, 8) porque enseña dos cartas por jugador. Aquí
        // una caja son ocho en rejilla y además está la carta que tienes en la
        // mano, delante de todo: con esa cámara lo tuyo se salía por abajo.
        motor.camera.position.set(0, 9.5, 12.5);
        motor.camera.lookAt(0, 0, 1.3);
    }
    if (motor.controls) { motor.controls.target.set(0, 0, estrecha ? 0.9 : 1.3); motor.controls.update(); }
    // Se acaba de recalibrar, así que el techo de `acercar()` vuelve a ser éste.
    motor.techoCamara = 0;
}

/**
 * ⚠️ Y ACERCARSE HASTA QUE LO REPARTIDO LLENE LA PANTALLA.
 *
 * Las posiciones de arriba se calibraron mirando ENTROPY, que extiende una rejilla
 * de ocho por jugador. La brisca reparte tres cartas a cada uno: ocupa 16 unidades
 * de ancho donde esa cámara encuadra 30, o sea que la mitad de la pantalla era
 * fieltro vacío y las cartas salían a cincuenta píxeles — ilegibles por lejanas, no
 * por mal dibujadas. Es el mismo error que agrandar la letra de un cartel que está
 * demasiado lejos.
 *
 * Una posición fija no puede servir a diez juegos que reparten cantidades muy
 * distintas, y una tabla de posiciones por juego sería otra lista escrita a mano
 * que se separa de la realidad en cuanto alguien cambie un reparto. Así que se
 * MIDE: se coge lo que hay repartido y se acerca la cámara por su propio eje hasta
 * que quepa justo, con un margen.
 *
 * Se itera porque al acercarse cambia la perspectiva y con ella lo que ocupa: cinco
 * pasadas bastan para converger.
 *
 * ⚠️ Y NO PUEDE SER UN TRINQUETE, QUE ES COMO LO ESCRIBÍ LA PRIMERA VEZ.
 *
 * El tope era «nunca más lejos de donde estás», leyendo la distancia actual en
 * cada pasada. Eso encoge y no vuelve: en cuanto se acercaba una vez, ese pasaba a
 * ser el techo. Con un reparto que CRECE —el remigio roba y pasa de 10 cartas a
 * 11— la mano se salía por abajo de la pantalla y la cámara ya no podía retroceder
 * a buscarla.
 *
 * Es el mismo fallo que `sala.html` tenía esta tarde y por el mismo motivo:
 * confundir «de dónde vengo» con «hasta dónde puedo ir». El tope de verdad es la
 * posición CALIBRADA —la que pone `encuadrar()` mirando la forma de la pantalla—,
 * así que se guarda esa y se compara siempre contra ella.
 */
function acercar(motor, margen = 1.12) {
    if (motor.invitado || !motor.camera || !motor.scene) return;
    const caja = new THREE.Box3();
    let hay = false;
    motor.scene.traverse((o) => {
        if (o.isMesh && o.userData && o.userData.zona !== undefined) { caja.expandByObject(o); hay = true; }
    });
    if (!hay || caja.isEmpty()) return;   // sin repartir todavía: no hay qué encuadrar

    const objetivo = motor.controls ? motor.controls.target.clone()
                                    : new THREE.Vector3(0, 0, 1.3);
    const eje = motor.camera.position.clone().sub(objetivo);
    const lejos = eje.length();
    if (!(lejos > 0.001)) return;
    eje.normalize();

    // El techo es la distancia CALIBRADA, no la de ahora. `encuadrar()` la fija y
    // la borra cada vez que cambia la pantalla, que es cuando deja de valer.
    if (!(motor.techoCamara > 0.001)) motor.techoCamara = lejos;
    const techo = motor.techoCamara;

    const esquinas = [];
    for (const x of [caja.min.x, caja.max.x])
        for (const y of [caja.min.y, caja.max.y])
            for (const z of [caja.min.z, caja.max.z]) esquinas.push(new THREE.Vector3(x, y, z));

    const tanV = Math.tan((motor.camera.fov * Math.PI) / 360);
    const tanH = tanV * motor.camera.aspect;

    let d = lejos;
    for (let paso = 0; paso < 5; paso++) {
        motor.camera.position.copy(objetivo).addScaledVector(eje, d);
        motor.camera.lookAt(objetivo);
        motor.camera.updateMatrixWorld(true);
        const inv = motor.camera.matrixWorldInverse;
        let peor = 0;
        for (const e of esquinas) {
            const v = e.clone().applyMatrix4(inv);
            const prof = -v.z;
            if (prof <= 0.01) return;     // algo detrás de la cámara: mejor no tocar
            peor = Math.max(peor, Math.abs(v.x) / (prof * tanH), Math.abs(v.y) / (prof * tanV));
        }
        if (!(peor > 0)) return;
        d *= peor * margen;
        if (d > techo) d = techo;         // nunca más lejos de lo calibrado
    }
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ Y TU MANO TIENE QUE PODER LEERSE. NO TODAS LAS CARTAS VALEN IGUAL.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Lo de arriba encuadra TODO: las cuatro manos, el mazo y el descarte. En un
     * tute son cuarenta cartas, así que la caja es enorme, la cámara se va lejos y
     * TU mano acaba midiendo cincuenta píxeles por carta. En un juego donde servir
     * al palo es OBLIGATORIO y no puedes leer de qué palo son las tuyas.
     *
     * Vino de un aviso: «¿tenemos baraja española porque estamos usando este tipo
     * de cartas?». Fui a comprobar el catálogo —sí, `spanish_40`, oros copas
     * espadas bastos— y saqué la cara de una carta a tamaño real: el 2 de oros,
     * perfecto, con sus monedas. O sea que el dibujo estaba bien y lo que fallaba
     * era el TAMAÑO en pantalla. La pregunta era buena y la respuesta no era la
     * que yo iba a dar.
     *
     * ⚠️ NO TODAS LAS CARTAS VALEN IGUAL, Y ESO ES LO QUE ARREGLA ESTO.
     *
     * Las manos de los rivales están BOCA ABAJO: de ellas sólo hace falta saber
     * cuántas hay, y eso se lee igual con el borde cortado. La tuya hay que
     * leerla carta por carta. Encuadrarlas con el mismo peso es tratar como igual
     * de importante lo que se cuenta y lo que se lee.
     *
     * Así que si tu mano baja de la mitad del ancho de pantalla, la cámara se
     * acerca hasta que llegue — aunque las de los demás se salgan por los lados.
     */
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ TU MANO TIENE QUE PODER LEERSE. NO TODAS LAS CARTAS VALEN IGUAL.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Lo de arriba encuadra TODO: las cuatro manos, el mazo y el descarte. En un
     * tute son cuarenta cartas, así que la caja es enorme, la cámara se va lejos y
     * cada carta TUYA acaba midiendo 46 px de ancho. En un juego donde servir al
     * palo es OBLIGATORIO y no se distingue de qué palo son las tuyas.
     *
     * Vino de un aviso: «¿tenemos baraja española porque estamos usando este tipo
     * de cartas?». Fui a comprobarlo —sí, `spanish_40`, oros copas espadas
     * bastos— y saqué la cara de una carta a tamaño real: el 2 de oros, perfecto,
     * con sus monedas. El dibujo estaba bien. Lo que fallaba era el TAMAÑO.
     *
     * ⚠️ Y NO ES EL ABANICO, QUE FUE MI SEGUNDA CORAZONADA.
     *
     * Con `paso: 6` para diez cartas quedan 0,67 de separación y la carta mide
     * 0,62: casi no se solapan. Estaba mirando una captura y viendo «solapadas»
     * donde lo que había era «pequeñas». Se distingue midiendo, no mirando.
     *
     * ⚠️ Y LA PRIMERA VEZ PUSE EL MÍNIMO EN 0,42 CUANDO YA ESTABA EN 0,41.
     *
     * O sea que el bloque corregía un 2% y yo esperando ver algo. El número no
     * salía de ninguna medida: lo escribí a ojo. 0,72 sí sale de una: para que una
     * carta llegue a ~90 px con diez en la mano, la mano tiene que ocupar el 72%
     * del semiancho.
     *
     * Las manos de los rivales están BOCA ABAJO —de ellas sólo hace falta saber
     * cuántas hay, y eso se cuenta igual con el borde cortado—. Encuadrarlas con
     * el mismo peso que la tuya es tratar igual lo que se cuenta y lo que se lee.
     */
    const miCaja = new THREE.Box3();
    let mia = false;
    motor.scene.traverse((o) => {
        // `mano_0_0`, no `mano_0`: la zona lleva dueño Y un índice detrás. Con la
        // igualdad exacta este bloque entero era código muerto.
        if (o.isMesh && String(o.userData?.zona ?? '').startsWith('mano_0_')) {
            miCaja.expandByObject(o); mia = true;
        }
    });
    if (mia && !miCaja.isEmpty()) {
        motor.camera.position.copy(objetivo).addScaledVector(eje, d);
        motor.camera.lookAt(objetivo);
        motor.camera.updateMatrixWorld(true);
        const inv = motor.camera.matrixWorldInverse;

        let ancho = 0;
        for (const x of [miCaja.min.x, miCaja.max.x])
            for (const y of [miCaja.min.y, miCaja.max.y])
                for (const z of [miCaja.min.z, miCaja.max.z]) {
                    const v = new THREE.Vector3(x, y, z).applyMatrix4(inv);
                    const prof = -v.z;
                    if (prof > 0.01) ancho = Math.max(ancho, Math.abs(v.x) / (prof * tanH));
                }

        const MINIMO = 0.80;
        if (ancho > 0.001 && ancho < MINIMO) {
            d *= ancho / MINIMO;
            // Un suelo por si el reparto es de UNA carta: sin esto la cámara se
            // metería dentro de la mesa persiguiendo un naipe suelto.
            d = Math.max(d, techo * 0.4);
        }

        /**
         * ⚠️ Y UN MÁXIMO, QUE ES LO QUE ME FALTABA.
         *
         * Esto sólo sabía ACERCARSE cuando la mano salía pequeña. Con trece cartas
         * en un móvil pasa lo contrario: el abanico es más ancho que la pantalla y
         * las de los extremos se salen. Medido con `legibilidad.mjs` en vertical —
         * hearts y remigio, dos cartas fuera cada uno.
         *
         * Y no lo vi anoche porque arreglé el tamaño mirando SÓLO escritorio. La
         * comprobación mide las dos formas, que es justo para lo que se escribió.
         *
         * `0.95` deja un pelo de aire contra el borde: a 1.0 la carta toca el filo y
         * se le come el canto.
         */
        const TOPE = 0.95;
        if (ancho > TOPE) d *= ancho / TOPE;
    }

    motor.camera.position.copy(objetivo).addScaledVector(eje, d);
    motor.camera.lookAt(objetivo);
    if (motor.controls) motor.controls.update();
}

/**
 * ═══ JUGAR CON EL RATÓN ═════════════════════════════════════════════════════
 *
 * Los botones del panel son la interfaz COMPLETA: ahí está toda jugada legal,
 * con su nombre, igual que la ve un agente. Esto de aquí no quita ninguna — es
 * un atajo encima para que un humano no tenga que traducir «cambiar:5» a un
 * hueco contando casillas.
 *
 * Se hace como en las damas, que es el patrón que ya tiene la casa: se clica y
 * se marcan los destinos posibles, sacados SIEMPRE de `legal_moves`. Nunca de lo
 * que el visualizador crea que se puede hacer — esa lista y las reglas se
 * separarían el primer día.
 */
let marcas = null;            // se crea con la escena, en el primer dibujo
let estadoActual = null;      // el último estado, para traducir clics
let cajaActual = null;        // mis casillas, para saber qué empareja
let esperandoTuki = null;     // hueco cuyo comodín hay que recolocar

/**
 * El halo va DEBAJO de la carta y no sobre ella: los materiales del motor están
 * cacheados por cara, así que teñir uno teñiría todas las cartas de ese número.
 */
function marcar(motor, x, z, color) {
    if (!marcas) marcas = crearMarcas(motor.scene, { y: (motor.tableY ?? 0.1) - 0.02 });
    marcas.poner(x, z, { color });
}
const borrarMarcas = () => marcas?.limpiar();

/** Dónde está dibujada una casilla concreta, para poder marcarla. */
function posicionDe(motor, zona, indice) {
    for (const [, malla] of Object.entries(motor.cardMeshes)) {
        if (malla.userData.zona === zona && malla.userData.indice === indice) return malla.position;
    }
    return null;
}

/**
 * ⚠️ LA SUGERENCIA SÓLO MIRA LO QUE TÚ VES.
 *
 * Marca los huecos donde poner la carta robada anularía la columna. Se calcula
 * con `casillas`, que trae `null` en lo tapado — así que es literalmente
 * imposible que sugiera usando una carta que no has visto. Si mirara el estado
 * interno sería un chivato: te diría dónde están tus cartas buenas y el juego
 * dejaría de medir memoria.
 */
function huecosQueEmparejan(caja, valorRobado, valores) {
    if (!caja || valorRobado == null) return [];
    const cols = 4;
    const salen = [];
    for (let i = 0; i < caja.length; i++) {
        const otro = i < cols ? i + cols : i - cols;
        const c = caja[otro];
        if (!c) continue;                               // tapada: no se sabe, no se sugiere
        const v = valores?.[String(c).split('_').slice(1).join('_')];
        if (v !== undefined && v === valorRobado) salen.push(i);
    }
    return salen;
}

function repintarMarcas(motor) {
    borrarMarcas();
    const st = estadoActual;
    if (!st || st.is_game_over) return;
    const legales = st.legal_moves ?? [];

    /**
     * Acabas de destapar un comodín y el juego espera adónde te lo llevas. No es
     * un modo de la pantalla: es un estado de la PARTIDA —`comodin_destapado`—
     * así que se ve igual desde una sala compartida y sobrevive a una recarga.
     */
    if (st.comodin_destapado !== null && st.comodin_destapado !== undefined) {
        for (const m of legales) {
            const c = m.match(/^mover_comodin:(\d+)$/);
            if (!c) continue;
            const p = posicionDe(motor, 'caja_0_0', Number(c[1]));
            if (p) marcar(motor, p.x, p.z, MORADO);
        }
        return;
    }

    // Recolocando el comodín: sólo se marcan los destinos que la regla permite.
    if (esperandoTuki !== null) {
        for (const m of legales) {
            const c = m.match(new RegExp(`^cambiar:${esperandoTuki}:mueve:(\\d+)$`));
            if (!c) continue;
            const p = posicionDe(motor, 'caja_0_0', Number(c[1]));
            if (p) marcar(motor, p.x, p.z, MORADO);
        }
        return;
    }

    // Sin carta en la mano: de dónde se puede robar.
    if (!st.robada) {
        for (const [zona, color] of [['mazo', VERDE], ['descarte', VERDE]]) {
            if (!legales.includes(zona === 'mazo' ? 'robar_mazo' : 'robar_descarte')) continue;
            for (const malla of Object.values(motor.cardMeshes)) {
                if (String(malla.userData.zona).startsWith(zona + '_')) {
                    marcar(motor, malla.position.x, malla.position.z, color);
                    break;
                }
            }
        }
        return;
    }

    // Con carta en la mano: dónde formaría pareja. Ésa es LA sugerencia.
    const valor = st.valores?.[String(st.robada).split('_').slice(1).join('_')];
    for (const i of huecosQueEmparejan(cajaActual, valor, st.valores)) {
        const p = posicionDe(motor, 'caja_0_0', i);
        if (p) marcar(motor, p.x, p.z, ACIERTO);
    }
}

/**
 * ⚠️ UNA MESA DONDE NO SE PUEDE JUGAR ES UN CUADRO.
 *
 * `SovereignCardEngine.updateHUD` sólo LISTA las jugadas legales como texto; los
 * botones los ponía cada página por su cuenta. Así que una mesa nueva nacía
 * preciosa y muda: se veía la partida avanzar y no había por dónde meter mano.
 *
 * Los botones son `legal_moves` y nada más — los mismos que ve un agente por la
 * puerta de texto. Ésa es la propiedad que sostiene el banco de pruebas entero:
 * si la persona tuviera acciones que el agente no tiene, dejarían de estar
 * jugando al mismo juego y la tabla no compararía nada.
 *
 * Va suelto y no dentro de la configuración porque el motor sólo copia tres
 * ganchos (`onInit3D`, `onStateSync`, `onResize`): cualquier otra cosa puesta ahí
 * se pierde en silencio. Y además es del visualizador, no del motor.
 */
function pintarJugadas(motor, data) {
    // En una sala manda el árbitro: sus acciones, y sólo si te toca a ti.
    const enSala = motor.backend?.tipo === 'sala';
    pintarBotones(document.getElementById('mesa-jugadas'), {
        acciones: enSala ? motor.sala.acciones()
                         : (data.legal_moves ?? data.legal_actions ?? []),
        meToca: !enSala || motor.sala.meToca(),
        turnoDe: enSala ? motor.sala.ultimo?.turn : null,
        terminada: !!data.is_game_over,
        // Repitiendo se mira, no se juega — y se dice por qué. Dejar los botones
        // puestos sin que hicieran nada sería la peor de las tres opciones.
        espectador: motor.repitiendo ? 'estás viendo una partida volver a jugarse'
                                     : (enSala && motor.sala.espectador),
        // Para la pantalla de fin de partida. El recibo sale del ProtoHub, que es
        // quien graba: en una sala no hay partida viva aquí y por eso va `null`.
        estado: data,
        recibo: enSala ? null : window.ALISA_PROTOHUB?.partida?.(window.ALISA_JUEGO),
        enSala,
        enviar: (m) => motor.sendMove(m),
    });
}

/**
 * ⚠️ AQUÍ HABÍA UN `?? 'entropy'`, Y SE COMIÓ SIETE JUEGOS SIN DAR UN ERROR.
 *
 * Esta mesa se carga como `<script type="module">` que se monta solo, así que
 * recibe el juego por `window.ALISA_JUEGO`. `entropy.html` lo ponía a mano y
 * `montarMesa` no —de modo que la brisca, el tute y los otros cinco abrían la
 * mesa, la dibujaban entera... y repartían ENTROPY—. Lo único que se veía era un
 * «Repartiendo…» eterno y un aviso en consola nombrando un juego que no era el de
 * la dirección.
 *
 * El valor por defecto es lo que lo hizo invisible: el único caso probado era
 * justo el del defecto, así que la trampa estaba tapada por quien la puso. Ahora
 * no hay defecto — quien monte esta mesa declara a qué se juega o revienta aquí
 * mismo, en voz alta, en la línea que tiene la culpa.
 */
if (!window.ALISA_JUEGO) {
    throw new Error('mesa_cartas: falta `window.ALISA_JUEGO`. Lo pone `montarMesa` '
                  + '(o la sala que hospeda). Sin eso no se sabe qué se reparte.');
}

const engine = new SovereignCardEngine({
    gameId: window.ALISA_JUEGO,

    /**
     * ⚠️ SI ALGUIEN HA PUESTO UNA SALA, SE JUEGA DENTRO DE ELLA.
     *
     * `window.ALISA_ANFITRION = { grupo, escena, camara }` — lo pone la página
     * que hospeda, antes de cargar este visualizador. Sin eso, esta mesa monta
     * su propia escena como siempre y nadie nota la diferencia.
     *
     * Va por `window` y no por parámetro porque este fichero se carga como un
     * `<script type="module">` que se monta solo: no hay nadie a quien pasarle
     * argumentos. Es el mismo camino que ya usan `ALISA_JUEGO` y `ALISA_TITULO`.
     */
    anfitrion: window.ALISA_ANFITRION ?? null,

    onInit3D(scene, camera) {
        /**
         * ⚠️ DE INVITADO NO SE CONSTRUYE EL MUEBLE. NI SIQUIERA OCULTO.
         *
         * La primera versión lo creaba y lo ponía `visible = false`, que parece
         * lo mismo y no lo es: `Box3.setFromObject` mide TAMBIÉN lo invisible.
         * El anfitrión encoge el grupo hasta que quepa en su mesa, así que un
         * tapiz oculto de 80×80 le hacía calcular sobre ochenta unidades — y las
         * cartas salían a 3,8 cm en vez de a 8,8, la mitad de pequeñas de lo que
         * debían, sin que nada fallara.
         *
         * Se vio en el número: escala 0,0313 × 80 = 2,5, exactamente el ancho que
         * le habíamos pedido. La cuenta era correcta; lo que medía, no.
         */
        if (this.invitado) {
            this.piezasMesa = {};
            this.preloadCourtImages('/arcade/assets/cards/courts');
            this.activeDeckBack = 'classic_red';
            return;
        }

        // Fieltro. Ovalado, como el de póker: una mesa redonda hace que las
        // manos de arriba y abajo queden demasiado lejos en pantalla.
        /**
         * ⚠️ EL ÓVALO SE HACE ESCALANDO LA MESA, NO SU GEOMETRÍA. AQUÍ ESTABA EL
         * «TAPETE HACE COSAS RARAS».
         *
         * Esto era `geo.scale(1, 1, 0.6)`: deformar los vértices del cilindro sin
         * tocar sus NORMALES. La tapa de un cilindro de 64 lados es un abanico de 64
         * triángulos que salen del centro, y con las normales torcidas cada uno
         * recibe la luz de una manera. En la captura sale exactamente eso: cuñas
         * verdes radiando desde el centro, unas claras y otras oscuras, como un
         * abanico roto.
         *
         * Escalando el OBJETO, three calcula su matriz de normales y la luz vuelve a
         * repartirse plana. Es el mismo óvalo, dicho donde no rompe nada.
         *
         * Lo reportó Oscar dos veces —en brisca y en entropy— y yo lo estuve
         * buscando en la mesa, que era lo que él mencionaba. Estaba en una línea que
         * lleva meses ahí, y sólo se ve MIRANDO la captura: ninguna medida lo
         * detecta, porque el fieltro se pinta y ocupa lo que tiene que ocupar.
         */
        const geo = new THREE.CylinderGeometry(10, 10, 0.4, 64);
        const mesa = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
            color: 0x073b18, roughness: 0.9,
        }));
        mesa.scale.z = 0.6;
        mesa.position.y = -0.2;
        mesa.receiveShadow = true;
        scene.add(mesa);

        /**
         * ⚠️ LA MESA ES LA MISMA QUE LA DE LA SALA DEL HUEVO.
         *
         * Aquí había un canto de madera hecho con un torus, con el comentario
         * «cuesta ocho líneas y se nota entero». Se notaba, sí: Oscar lo reportó dos
         * veces —en brisca y en entropy— con las mismas palabras, «el tapete se ve
         * raro, ¿no debería ser una mesa como las de la sala del huevo?». Y remató
         * lo que importa: «eso lo teníamos solucionado con las salas pocket».
         *
         * Lo teníamos. `Table.glb`, el mismo modelo que montan `room_pocket_blanco`
         * y `room_sala_del_huevo`. El fieltro se queda —una carta blanca necesita el
         * verde para leerse, y el óvalo está medido— y el modelo va debajo, que es
         * lo que es una mesa de casino: madera y tapete.
         *
         * El canto de torus se conserva como RESPALDO y sólo si el modelo no llega:
         * un fichero que no carga no puede dejar la mesa flotando en el vacío.
         */
        const canto = new THREE.Mesh(
            new THREE.TorusGeometry(10.05, 0.42, 12, 80),
            new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.6, metalness: 0.05 }));
        canto.rotation.x = Math.PI / 2;
        canto.scale.set(1, 0.6, 1);
        canto.position.y = -0.15;
        canto.visible = false;
        scene.add(canto);

        // El modelo tarda en llegar, así que se registra cuando llega y se le pide
        // a `encuadrar` que vuelva a decidir qué se ve — es quien manda en eso, y
        // poner `visible` a mano aquí duraría hasta el primer cambio de tamaño.
        /**
         * ⚠️ LA TAPA VA POR DEBAJO DEL FIELTRO, NO A SU ALTURA.
         *
         * La puse a -0,15 y el fieltro ocupa de -0,4 a 0: la tapa quedaba DENTRO, y
         * las dos superficies se peleaban píxel a píxel. En la captura salían unas
         * cuñas verdes radiando desde el centro, como un abanico roto.
         *
         * Y eso es literalmente lo que Oscar reportó dos veces —«el tapete hace
         * cosas raras»— antes de que yo tocara nada: el fieltro ya se peleaba con
         * algo. Poner la mesa a su misma altura no lo habría causado; lo habría
         * duplicado.
         *
         * -0,45 la deja justo debajo, tocando y sin solaparse.
         */
        ponerMesaDeVerdad(scene, { ancho: 21, largo: 13, y: -0.45 }).then((m) => {
            if (m) this.piezasMesa.mueble = m;
            else this.piezasMesa.canto = canto;   // sin modelo, vuelve el canto
            encuadrar(this);
        }).catch(() => { this.piezasMesa.canto = canto; encuadrar(this); });

        /**
         * ⚠️ Y EN UN MÓVIL, TAPIZ A PANTALLA COMPLETA: NADA DE MESA.
         *
         * Una mesa ovalada es bonita porque se ve entera, y verla entera en un
         * teléfono significa alejar la cámara hasta que las cartas no se leen. El
         * canto de madera y el óvalo son entonces lo peor de los dos mundos:
         * ocupan pantalla y no aportan información.
         *
         * Así que en estrecho se apagan y queda un fieltro sin bordes, con la
         * cámara pegada. Se pierde el marco y se gana lo único que importa: que
         * un 12 se distinga de un 2 sin acercar el ojo.
         *
         * Se construyen las DOS y se enseña una. Al girar el teléfono cambia la
         * forma de la pantalla, y reconstruir la escena entera en ese momento
         * sería perder las cartas de vista mientras se rehace.
         */
        const tapiz = new THREE.Mesh(
            new THREE.PlaneGeometry(80, 80),
            new THREE.MeshStandardMaterial({ color: 0x073b18, roughness: 0.95 }));
        tapiz.rotation.x = -Math.PI / 2;
        tapiz.position.y = -0.02;
        tapiz.receiveShadow = true;
        scene.add(tapiz);

        // `canto` NO entra aquí de salida: es el respaldo, y sólo se registra si el
        // modelo de mesa no llega. Si entrara, `encuadrar` lo haría visible en
        // escritorio y se vería el torus atravesando la mesa buena.
        this.piezasMesa = { mesa, tapiz };

        /**
         * ⚠️ LA MESA, DENTRO DE UN SITIO.
         *
         * Hasta ahora flotaba en negro. Una habitación no es adorno: da escala
         * —sin paredes no sabes si la mesa mide un metro o diez— y da sombra, que
         * es lo que hace que las cartas parezcan estar APOYADAS y no pegadas.
         *
         * Sólo en pantalla ancha, por lo mismo que el óvalo: en un teléfono la
         * mesa ocupa la pantalla entera y las paredes no llegan a verse, así que
         * serían seis mallas que nadie mira.
         *
         * `?sitio=no` la apaga. No es un ajuste para el jugador: es para poder
         * comparar las dos versiones sin recompilar nada cuando algo se vea raro.
         */
        const quiere = new URLSearchParams(location.search).get('sitio') !== 'no';
        if (quiere && !this.esPantallaEstrecha()) this.habitacion = amueblar(scene);

        encuadrar(this);

        const foco = new THREE.SpotLight(0xffffff, 0.9, 0, Math.PI / 4, 0.5, 1);
        foco.position.set(0, 6.5, 0);
        foco.castShadow = true;
        scene.add(foco);
        scene.add(new THREE.HemisphereLight(0xbfd4e6, 0x0a2a14, 0.55));

        this.preloadCourtImages('/arcade/assets/cards/courts');
        this.activeDeckBack = 'classic_red';
    },

    /**
     * Girar el teléfono cambia la forma de la pantalla, y con ella dónde va cada
     * zona. Se vuelve a encuadrar y se REPINTA con el último estado: si sólo se
     * moviera la cámara, el mazo seguiría a un lado en una pantalla donde ya no
     * cabe. Sin pedir nada a la red — el estado que hay es el bueno.
     */
    onResize() {
        encuadrar(this);
        if (estadoActual) this.onStateSync(estadoActual);
    },

    onStateSync(data) {
        if (!data) return;
        // Con la mesa por el aire no se repinta: repintar coloca cada carta en su
        // destino, así que a mitad del vuelo se recompondría de golpe en el aire.
        // La cuenta la lleva `volcar.js`, no una bandera de aquí.
        if (volcando()) { estadoActual = data; return; }
        this.gcCards();

        const juego = this.gameId;

        /**
         * ⚠️ SE DIBUJA LO QUE EL JUEGO PUBLICA. NADA MÁS, Y DESDE UN SOLO SITIO.
         *
         * Esto tenía dos caminos —en una sala, el estado del árbitro; en local,
         * `reglas.sustrato(partida)`— y el segundo era una trampa armada:
         * `ProtoHub.partida()` no devuelve la partida viva, devuelve el RECIBO
         * `{juego, semilla, jugadas}`. Hoy no rompe nada porque ninguno de los
         * diez juegos de cartas publica sustrato nativo y todos caen al derivado,
         * que sólo mira el estado. El día que uno lo publique, la mesa le pasaría
         * un recibo donde espera una partida y dibujaría cualquier cosa sin dar
         * un error.
         *
         * `sustratoDe(juego, estado)` es el camino bueno para las dos: deriva las
         * zonas de lo PUBLICADO. Comprobado que da zonas idénticas en los diez.
         *
         * Y hace verdad la tesis del motor. Si el dibujo necesitara mirar dentro
         * del objeto de la partida, no sería un espectador: sería una segunda
         * fuente de verdad, y las dos se separarían el día que una cambie.
         *
         * ⚠️ De paso desaparece `?asiento=`, que esta página anunciaba y NUNCA
         * hizo nada: pasaba por la rama nativa, que en cartas no existe. Quien
         * quiera mirar desde otra silla tiene la mesa compartida con `?quien=`,
         * donde el recorte lo hace el árbitro y no una opción de la pantalla.
         */
        /**
         * ⚠️ Y AQUÍ SE IGNORABA EL SUSTRATO NATIVO, QUE LLEVABA UN DÍA MINTIENDO.
         *
         * El comentario de arriba se escribió cuando era cierto que «ninguno de los
         * diez juegos de cartas publica sustrato nativo». El remigio lo publica
         * desde el mismo día, así que la premisa caducó sin que nada avisara — y
         * las dos versiones YA no coinciden:
         *
         *     nativo    descarte 1 vista + 2 debajo
         *     derivado  descarte 1 vista + 0
         *
         * El adaptador no sabe que un descarte tiene montón, así que la mesa lleva
         * todo el día dibujando la pila sin su fondo. Poca cosa; el problema es que
         * es una SEGUNDA FUENTE DE VERDAD, y las dos se separan el día que una
         * cambie — que es exactamente lo que pasó.
         *
         * Y el siguiente en pisarlo se rompería del todo: un juego de dados publica
         * zonas que el adaptador no conoce (`dados`, `guardados`), así que saldría
         * un tapete vacío con «este juego no reparte cartas» y sin un error.
         *
         * `ProtoHub.sustrato()` ya decide bien entre las dos vías, y lo hace donde
         * se puede decidir: donde están la partida viva y las reglas. Lo escribí
         * ayer para esto mismo y esta mesa era la única que no lo usaba.
         *
         * EN UNA SALA COMPARTIDA sigue mandando el derivado, y no es una excepción
         * caprichosa: allí el estado lo manda el árbitro por la red y aquí no hay
         * partida viva que preguntar. Derivar de lo publicado es lo único posible.
         */
        // ⚠️ `enSala` se calcula AQUÍ y no se toma prestado. La primera versión
        // usaba el de `pintarJugadas`, que vive en otra función: `ReferenceError`,
        // muere el repintado entero y con él los botones. El laboratorio lo cazó en
        // cuatro mesas de cinco — y lo cazó por los BOTONES, no por el dibujo,
        // porque la escena anterior se queda en pantalla y parece que todo va bien.
        const enPartidaCompartida = this.backend?.tipo === 'sala';
        const hub = window.ALISA_PROTOHUB;
        const sus = (!enPartidaCompartida && hub?.soporta?.(juego))
            ? hub.sustrato(juego, 0)
            : sustratoDe(juego, data);

        /**
         * ⚠️ LA CARA DE LA CARTA LA ELIGE EL JUEGO, NO LA MESA.
         *
         * Con `cara: 'valor'` se dibuja el número y no el palo. Entropy lo pide
         * porque ninguna de sus reglas mira el palo —se suman valores y se anulan
         * dos iguales en la misma columna—, así que oros y copas sólo obligaban a
         * traducir «R» a 12 de cabeza. La brisca y el tute NO lo piden, y ahí el
         * palo es el juego: por eso se declara en vez de deducirse de que haya
         * una tabla de valores, que la tienen los tres.
         *
         * Cambia lo que se ve, no lo que se juega: la carta sigue siendo `R_4` en
         * el estado y en el recibo, y la partida se re-simula igual.
         */
        /**
         * `'color'` es lo mismo que `'valor'` con una diferencia: quién tiñe el
         * número. En entropy lo tiñe su tramo, porque allí el valor es lo que se
         * suma; en UNIT lo tiñe el palo, porque allí el color ES la carta. Se
         * declara en vez de deducirse: las dos publican `valores` y `palos`, así
         * que no hay nada en el dato que distinga un caso del otro.
         */
        const porColor = data.cara === 'color';
        const porValor = (data.cara === 'valor' || porColor) && data.valores;
        const paloDe  = (c) => String(c).split('_')[0];
        const rangoDe = (c) => String(c).split('_').slice(1).join('_');
        const caraDe = (c) => {
            if (!porValor) return c;
            const r = rangoDe(c);
            // Un comodín vale 0, pero pintar un «0» lo confundiría con una carta
            // normal muy buena. Lleva su símbolo, que declara el catálogo.
            const texto = data.simbolos?.[r] ?? data.valores[r] ?? r;
            // Y la pinta del palo va detrás, separada por `|`. El comodín no tiene
            // palo, así que no lleva ninguna: se queda sólo con su emoji.
            const p = data.palos?.[paloDe(c)];
            if (!p) return `num_${texto}`;
            // El cuarto trozo dice «tiñe con el color del palo». Va como bandera y
            // no como color suelto para que el dibujante siga recibiendo el palo
            // completo: la pinta pequeña lo sigue necesitando.
            return `num_${texto}|${p.color}|${p.simbolo}${porColor ? '|palo' : ''}`;
        };

        const zonas = sus?.zonas ?? [];
        if (!zonas.length) {
            document.getElementById('hud-content').innerHTML =
                `<div class="status-row"><span>Este juego no reparte cartas.</span></div>`;
            return;
        }

        // Primero se agrupa por dueño: hasta saber cuántas zonas tiene, no se
        // puede repartirle el sitio.
        const porDueno = new Map();
        for (const z of zonas) {
            // Las zonas con sitio propio se agrupan aparte, o entrarían en el
            // reparto de su dueño y desplazarían lo demás.
            const clave = SITIO_ZONA[z.id] ? `@${z.id}`
                : (z.de === null || z.de === undefined ? 'mesa' : z.de);
            if (!porDueno.has(clave)) porDueno.set(clave, []);
            porDueno.get(clave).push(z);
        }

        // La colocación se pregunta AQUÍ y no se guarda: en un móvil que gira,
        // una tabla calculada al arrancar sería la de la orientación anterior.
        const SITIO = sitios(this.esPantallaEstrecha(),
                             porDueno.has(2) || porDueno.has(3));

        for (const [clave, lote] of porDueno) {
            const sitio = String(clave).startsWith('@')
                ? SITIO_ZONA[String(clave).slice(1)]
                : (SITIO[clave] ?? SITIO.mesa);
            lote.forEach((z, i) => {
                const desvio = (i - (lote.length - 1) / 2) * (sitio.paso ?? SEPARA);
                const cx = sitio.x + (sitio.reparto === 'x' ? desvio : 0);
                const cz = sitio.z + (sitio.reparto === 'z' ? desvio : 0);

                /**
                 * ⚠️ LA ZONA SE DIBUJA DE UNA VEZ, VISTAS Y TAPADAS JUNTAS.
                 *
                 * Antes eran dos llamadas y cada una centraba su abanico como si
                 * fuera la mano entera: las dos mitades salían superpuestas. El
                 * reparto sólo cuadra si se calcula sobre el total, así que las
                 * tapadas viajan marcadas carta a carta con `oculta`.
                 *
                 * Y van con la identidad `back`, no con la suya disimulada: lo
                 * que no se puede ver tampoco debe llegar al navegador. Una carta
                 * boca abajo que por dentro es el as de picas se lee abriendo la
                 * consola.
                 */
                /**
                 * ⚠️ UNA ZONA CON CASILLAS SE DIBUJA EN SU SITIO, CASILLA A CASILLA.
                 *
                 * La caja de entropy son ocho huecos en dos filas de cuatro —así
                 * es el juego del que viene, donde a esa disposición la llaman «la
                 * caja»— y las casillas son parte de las reglas: `cambiar:5` nombra
                 * un hueco fijo, y dos cartas iguales EN LA MISMA COLUMNA se anulan.
                 *
                 * Antes esto amontonaba las vistas a un lado y las tapadas al otro,
                 * o sea que inventaba un orden. Con eso no se puede señalar
                 * `cambiar:5` ni ver una columna: la regla que hace interesante al
                 * juego era invisible en la mesa que lo dibuja.
                 */
                if (z.casillas) {
                    const cols = z.columnas || z.casillas.length;
                    const filas = Math.ceil(z.casillas.length / cols);
                    const cartas = z.casillas.map((c) =>
                        c === null || c === undefined
                            ? { id: 'back', oculta: true }
                            : { id: caraDe(c), oculta: false });
                    this.drawZone(cartas, `${z.id}_${clave}_${i}`,
                        cx - ((cols - 1) * REJILLA_X) / 2,
                        cz - ((filas - 1) * REJILLA_Z) / 2,
                        { layout: 'grid', columns: cols,
                          spacing: REJILLA_X, spacingZ: REJILLA_Z });
                    return;
                }

                const cartas = [
                    ...z.items.map(c => (c && typeof c === 'object'
                        ? { ...c, id: caraDe(c.id ?? c), oculta: false }
                        : { id: caraDe(c), oculta: false })),
                    ...Array.from({ length: z.ocultas ?? 0 }, () => ({ id: 'back', oculta: true })),
                ];
                if (!cartas.length) return;

                /**
                 * ⚠️ UNA MANO NO SE APILA AUNQUE NO QUEPA: SE APRIETA.
                 *
                 * Aquí ponía `cartas.length > CABEN ? 'pile' : layout` a secas, y
                 * el razonamiento de arriba —un mazo es un montón porque no cabe,
                 * no porque se llame mazo— sigue siendo bueno. Pero mezclaba dos
                 * cosas: un mazo de 79 cartas no se puede enseñar, y una mano de
                 * 10 SÍ, solapada, que es exactamente lo que hace cualquiera que
                 * sostenga diez cartas.
                 *
                 * Lo destapó el remigio, que reparte 10 y `CABEN` es 9: la mano
                 * salía apilada y sólo se veía la de encima. Las diez estaban
                 * dibujadas y medidas, una encima de otra — o sea injugable sin
                 * un solo error, otra vez.
                 *
                 * La diferencia no es el nombre de la zona: es que TIENE DUEÑO.
                 * Una zona de alguien son cartas que esa persona lee; una de nadie
                 * es un montón sobre la mesa. Eso está en el sustrato (`de`), así
                 * que no hay que saberse ningún juego para decidirlo.
                 *
                 * Al apretarse, la mano ocupa siempre lo que ocuparían `CABEN`
                 * cartas y se solapan más. Se leen por el índice de la esquina,
                 * que para eso está. Por debajo de `SOLAPE_MINIMO` ni eso se ve, y
                 * entonces sí es un montón.
                 */
                const SOLAPE_MINIMO = 0.3;
                const deAlguien = z.de !== null && z.de !== undefined;
                const apretado = deAlguien && cartas.length > CABEN
                    ? ((CABEN - 1) * ESPACIO) / (cartas.length - 1)
                    : ESPACIO;
                const disposicion = (cartas.length > CABEN && apretado < SOLAPE_MINIMO)
                    || (!deAlguien && cartas.length > CABEN)
                    ? 'pile'
                    : sitio.layout;
                const hueco = disposicion === 'pile' ? ESPACIO : apretado;

                // `line` se dibuja desde el borde izquierdo; `fan` y `pile`, desde
                // el centro. Aplicarle a un abanico el centrado de una fila lo
                // desplazaba media mano hacia un lado.
                const x = disposicion === 'line'
                    ? cx - ((cartas.length - 1) * hueco) / 2
                    : cx;

                this.drawZone(cartas, `${z.id}_${clave}_${i}`, x, cz,
                    { layout: disposicion, spacing: hueco });
            });
        }

        // El HUD sale del propio estado: lo que el juego publique y se pueda
        // enseñar. Nada de campos con nombre de un juego concreto.
        const fila = (k, v, color) =>
            `<div class="status-row"><span>${k}</span>`
          + `<span class="val"${color ? ` style="color:${color}"` : ''}>${v}</span></div>`;
        const marcador = data.puntos ?? data.score ?? data.marcador;
        const hud = document.getElementById('hud-content');
        hud.innerHTML =
            // Quién eres en la mesa, no sólo que estás sentado: con nombre
            // automático, «le toca a invitado-k3f9» no dice nada si no sabes que
            // ése eres tú, y te quedas esperando tu propio turno.
            (this.sala ? fila('Tú', this.sala.espectador ? `mirando (${this.sala.yo})` : this.sala.yo, '#9ecbff') : '')
          + (data.turn !== undefined ? fila('Turno', data.turn, '#00ffaa') : '')
          + (marcador !== undefined ? fila('Puntos', marcador, '#FFD700') : '')
          + zonas.map(z => fila(
                `${z.id}${z.de === null || z.de === undefined ? '' : ' · ' + z.de}`,
                `${z.items.length} vistas${z.ocultas ? ` + ${z.ocultas} tapadas` : ''}`)).join('')
          + (data.is_game_over ? fila('Estado', data.desenlace ?? 'Terminada', '#ff8080') : '')
          ;

        /**
         * ⚠️ PLEGAR EL PANEL NO PUEDE ESCONDER LA FORMA DE JUGAR.
         *
         * Lo encontró un betatester y lo dijo así: «no me deja coger la carta del
         * descarte». Estaba en un móvil de 276 px — lo sabemos porque el aviso trae
         * el tamaño de pantalla, y por eso lo trae.
         *
         * En pantalla estrecha el panel arranca PLEGADO, que lo puse yo para que se
         * viera la mesa. Plegado, `#hud-content` queda con `max-height: 0` y
         * `overflow: hidden`… y los botones de jugar vivían dentro. Resultado: la
         * mesa se ve, las cartas se ven, y no hay ninguna forma de jugar. Sin un
         * error, y en escritorio no pasa nunca porque allí el panel arranca abierto.
         *
         * Plegar tiene que esconder los DATOS —turno, puntos, cuántas cartas hay en
         * cada montón— y nunca las jugadas. Así que la caja vive FUERA de
         * `#hud-content`, hermana suya, fuera de lo que se recorta.
         *
         * ⚠️ Y SE CREA UNA VEZ, NO EN CADA REPINTADO. Mi primer arreglo la metía en
         * el `innerHTML` y luego la MOVÍA fuera. Como esto corre cada vez que llega
         * un estado, el `innerHTML` siguiente creaba otra —la anterior ya no estaba
         * dentro, así que no se borraba— y se iban acumulando: medido en un móvil,
         * CUATRO `div#mesa-jugadas` con el mismo id, uno con botones y tres vacíos
         * que sumaban 70 px de panel. Crecía sin parar y sin dar un error, y encima
         * disfrazado de «problema de CSS»: ayer intenté encogerlo con un `@media` y
         * no se movía, porque lo que sobraba no era relleno sino DOM de más.
         */
        const panel = hud.parentElement;
        if (panel && !panel.querySelector(':scope > #mesa-jugadas')) {
            const caja = document.createElement('div');
            caja.id = 'mesa-jugadas';
            caja.className = 'mesa-jugadas';
            panel.appendChild(caja);
        }

        /**
         * ⚠️ LA PISTA VA FUERA DEL PLEGADO, JUNTO A LOS BOTONES.
         *
         * Si un juego publica `pista` —una línea que explica qué toca— se enseña.
         * Nace de la queja de un betatester: los botones dicen la jugada exacta que
         * manda un agente (`descartar_y_voltear:1`), y esa igualdad es la que hace
         * comparables persona y máquina, así que no se pueden rotular de otra forma.
         * Lo que sí se puede es explicar la fase al lado.
         *
         * Y va fuera de `#hud-content` por lo mismo que los botones: en móvil el
         * panel arranca plegado, que es exactamente donde estaba quien se quejó. Una
         * ayuda que sólo se ve desplegando no ayuda a quien no sabe que hay que
         * desplegar.
         */
        if (panel) {
            let pista = panel.querySelector(':scope > .mesa-pista');
            if (data.pista) {
                if (!pista) {
                    pista = document.createElement('div');
                    pista.className = 'mesa-pista';
                    panel.insertBefore(pista, panel.querySelector(':scope > #mesa-jugadas'));
                }
                pista.textContent = data.pista;
            } else if (pista) pista.remove();
        }

        pintarJugadas(this, data);

        // Lo que necesita la capa de clics: el estado de verdad y mis casillas.
        // Se guardan aquí y no se vuelven a deducir en ningún sitio.
        estadoActual = data;
        cajaActual = zonas.find(z => z.id === 'caja' && z.de === 0)?.casillas ?? null;
        // Si la partida avanzó, el comodín a medio recolocar ya no significa nada.
        if (!data.robada) esperandoTuki = null;
        repintarMarcas(this);

        // Con las cartas ya colocadas se puede medir qué ocupan, que es lo único
        // que dice a qué distancia hay que ponerse. Antes de repartir no hay nada.
        acercar(this);
    },
});

/**
 * ⚠️ UN MÓDULO NO DEJA NADA EN `window`, Y AQUÍ ESO SE NOTA.
 *
 * Los visualizadores viejos son scripts clásicos: su `engine` quedaba global y
 * tanto la consola como el resto del arcade lo encontraban. Éste es un módulo y
 * su `engine` no sale de aquí — así que la mesa se volvía imposible de mirar
 * desde fuera justo cuando había que averiguar dónde estaba dibujando.
 *
 * Se publica con el mismo nombre que ya usan las páginas de tablero.
 */
/**
 * Un clic sobre una carta, traducido a jugada.
 *
 * Toda salida de aquí se comprueba contra `legal_moves` antes de enviarse. Un
 * atajo que pudiera mandar algo ilegal sería un atajo que se cree las reglas, y
 * eso ya nos costó caro con el ProtoHub: doscientos clics, cero jugadas grabadas
 * y ni un error en consola.
 */
window.addEventListener('cardInspect', (ev) => {
    const { zona, indice } = ev.detail ?? {};
    const st = estadoActual;
    if (!zona || !st || st.is_game_over) return;
    const legales = st.legal_moves ?? [];
    const enviar = (m) => { if (legales.includes(m)) engine.sendMove(m); };

    // Comodín recién destapado: el clic dice adónde se lo lleva.
    if (st.comodin_destapado !== null && st.comodin_destapado !== undefined) {
        if (zona === 'caja_0_0') enviar(`mover_comodin:${indice}`);
        return;
    }

    // Segundo clic del comodín: adónde se corre.
    if (esperandoTuki !== null) {
        if (zona === 'caja_0_0') enviar(`cambiar:${esperandoTuki}:mueve:${indice}`);
        esperandoTuki = null;
        repintarMarcas(engine);
        return;
    }

    if (!st.robada) {
        if (String(zona).startsWith('mazo_'))     enviar('robar_mazo');
        if (String(zona).startsWith('descarte_')) enviar('robar_descarte');
        return;
    }

    // Con carta en la mano, clicar el descarte es tirarla; entonces hay que
    // decir qué destapas, y eso son los botones (o el siguiente clic).
    if (String(zona).startsWith('descarte_')) { enviar('descartar'); return; }

    if (zona === 'caja_0_0') {
        // Si ahí hay un comodín que puede apartarse, se pregunta adónde antes de
        // tirarlo: es estrictamente mejor y sería una pena perderlo por un clic.
        const hayTuki = legales.some(m => m.startsWith(`cambiar:${indice}:mueve:`));
        if (hayTuki) { esperandoTuki = indice; repintarMarcas(engine); return; }
        enviar(`cambiar:${indice}`);
    }
});

window.ALISA_MESA = engine;

engine.mountAgentHUD('hud-container',
    (window.ALISA_TITULO ?? 'Mesa de cartas'),
    `<div id="hud-content">Repartiendo…</div>`);

/**
 * La rabieta. Va en la CABECERA, no entre las jugadas: ahí dentro parecería una
 * acción del juego y no lo es — no entra en `legal_moves` ni cambia el estado.
 * Al terminar se pide un repintado, y ese repintado es el que lo recoloca todo.
 */
ponerBoton(document.querySelector('.hud-header'), async () => {
    await volcarMesa(Object.values(engine.cardMeshes ?? {}));
    if (estadoActual) engine.onStateSync(estadoActual);
});

engine.start();
