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
import { amueblar } from './protohub/habitacion.js';

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
const sitios = (estrecha) => ({
    0:    { x:  0.0, z:  2.9, layout: 'fan',  reparto: 'x', paso: 6 },  // tú, cerca de la cámara
    1:    { x:  0.0, z: -2.9, layout: 'fan',  reparto: 'x', paso: 6 },  // el de enfrente
    2:    { x: estrecha ? -3.2 : -6.5, z: 0.0, layout: 'fan', reparto: 'z', paso: 4 },
    3:    { x: estrecha ?  3.2 :  6.5, z: 0.0, layout: 'fan', reparto: 'z', paso: 4 },
    mesa: { x:  0.0, z:  0.0, layout: 'line', reparto: 'x', paso: estrecha ? 3.6 : 11 },
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
    const estrecha = motor.esPantallaEstrecha();
    const { mesa, canto, tapiz } = motor.piezasMesa ?? {};
    if (mesa)  mesa.visible  = !estrecha;
    if (canto) canto.visible = !estrecha;
    if (tapiz) tapiz.visible = estrecha;

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
    const caja = document.getElementById('mesa-jugadas');
    if (!caja) return;

    // En una sala manda el árbitro: sus acciones, y sólo si te toca a ti.
    const enSala = motor.backend?.tipo === 'sala';
    const acciones = (enSala ? motor.sala.acciones()
                             : (data.legal_moves ?? data.legal_actions ?? []))
        .filter(m => m !== 'nueva' && m !== 'reset');

    if (data.is_game_over) { caja.innerHTML = '<span class="dato">partida terminada</span>'; return; }
    if (enSala && motor.sala.espectador) {
        caja.innerHTML = '<span class="dato">la mesa estaba llena — miras</span>';
        return;
    }
    if (enSala && !motor.sala.meToca()) {
        caja.innerHTML = `<span class="dato">le toca a ${motor.sala.ultimo?.turno_de ?? 'otro asiento'}…</span>`;
        return;
    }
    if (!acciones.length) { caja.innerHTML = '<span class="dato">—</span>'; return; }

    caja.innerHTML = '';
    for (const m of acciones) {
        const b = document.createElement('button');
        b.className = 'mesa-jugada';
        b.textContent = String(m).replace(/^jugar:|^pedir:/, '');
        b.title = m;
        b.onclick = async () => {
            // Se apagan TODOS, no sólo el pulsado: en una sala el viaje de ida y
            // vuelta dura lo suyo, y sin esto se mandan tres jugadas antes de que
            // conteste la primera. El árbitro rechazaría las de más, pero quien
            // juega vería tres errores por un clic de más.
            [...caja.children].forEach(x => { x.disabled = true; });
            await motor.sendMove(m);
        };
        caja.appendChild(b);
    }
}

const engine = new SovereignCardEngine({
    gameId: window.ALISA_JUEGO ?? 'entropy',

    onInit3D(scene, camera) {
        // Fieltro. Ovalado, como el de póker: una mesa redonda hace que las
        // manos de arriba y abajo queden demasiado lejos en pantalla.
        const geo = new THREE.CylinderGeometry(10, 10, 0.4, 64);
        geo.scale(1, 1, 0.6);
        const mesa = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
            color: 0x073b18, roughness: 0.9,
        }));
        mesa.position.y = -0.2;
        mesa.receiveShadow = true;
        scene.add(mesa);

        // Un canto de madera, que es lo que separa «mesa de casino» de «disco
        // verde». Cuesta ocho líneas y se nota entero.
        const canto = new THREE.Mesh(
            new THREE.TorusGeometry(10.05, 0.42, 12, 80),
            new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.6, metalness: 0.05 }));
        canto.rotation.x = Math.PI / 2;
        canto.scale.set(1, 0.6, 1);
        canto.position.y = -0.15;
        scene.add(canto);

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

        this.piezasMesa = { mesa, canto, tapiz };

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
        const sus = sustratoDe(juego, data);

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
        const porValor = data.cara === 'valor' && data.valores;
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
            return p ? `num_${texto}|${p.color}|${p.simbolo}` : `num_${texto}`;
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
        const SITIO = sitios(this.esPantallaEstrecha());

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

                // Un montón no es una fila corta: es lo que se hace cuando no cabe.
                const disposicion = cartas.length > CABEN ? 'pile' : sitio.layout;

                // `line` se dibuja desde el borde izquierdo; `fan` y `pile`, desde
                // el centro. Aplicarle a un abanico el centrado de una fila lo
                // desplazaba media mano hacia un lado.
                const x = disposicion === 'line'
                    ? cx - ((cartas.length - 1) * ESPACIO) / 2
                    : cx;

                this.drawZone(cartas, `${z.id}_${clave}_${i}`, x, cz,
                    { layout: disposicion, spacing: ESPACIO });
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
          + `<div id="mesa-jugadas" class="mesa-jugadas"></div>`;

        pintarJugadas(this, data);

        // Lo que necesita la capa de clics: el estado de verdad y mis casillas.
        // Se guardan aquí y no se vuelven a deducir en ningún sitio.
        estadoActual = data;
        cajaActual = zonas.find(z => z.id === 'caja' && z.de === 0)?.casillas ?? null;
        // Si la partida avanzó, el comodín a medio recolocar ya no significa nada.
        if (!data.robada) esperandoTuki = null;
        repintarMarcas(this);
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
engine.start();
