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
import { obtenerSustrato, sustratoDe } from './protohub/sustrato.js';

/**
 * Dónde se sienta cada zona. La mesa mira desde el asiento 0, abajo.
 *
 * `reparto` dice hacia dónde se separan las zonas de un mismo dueño cuando tiene
 * varias (mano y bazas ganadas, caja y descarte). Los de abajo y arriba tienen
 * sitio a lo ancho; los de los lados, a lo hondo. Apilarlas todas hacia el centro
 * —que es lo que hacía esto antes— las montaba unas sobre otras.
 */
const SITIO = {
    0:    { x:  0.0, z:  2.9, layout: 'fan',  reparto: 'x', paso: 6 },  // tú, cerca de la cámara
    1:    { x:  0.0, z: -2.9, layout: 'fan',  reparto: 'x', paso: 6 },  // el de enfrente
    2:    { x: -6.5, z:  0.0, layout: 'fan',  reparto: 'z', paso: 4 },
    3:    { x:  6.5, z:  0.0, layout: 'fan',  reparto: 'z', paso: 4 },
    /**
     * Lo de nadie —descarte, comunes, mazo— va a los LADOS y no en medio.
     *
     * Con manos en abanico el centro estaba libre y esto cabía ahí. En cuanto la
     * caja de entropy pasó a ser una rejilla de 2×4, las dos cajas ocupan el
     * centro entero y el descarte quedaba pegado a su columna izquierda. Se
     * separan lo suficiente para que se vea de quién es cada cosa sin leer el HUD.
     */
    mesa: { x:  0.0, z:  0.0, layout: 'line', reparto: 'x', paso: 11 },
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
        // ⚠️ MÁS ATRÁS QUE LA DE PÓKER, Y NO POR GUSTO.
        //
        // Póker mira desde (0, 5, 8) porque enseña dos cartas por jugador. Aquí
        // una mano de entropy son ocho y el abanico ocupa cinco unidades y media:
        // con la cámara de póker la mano de abajo —la TUYA, la única que puedes
        // jugar— se salía por el borde inferior de la pantalla.
        camera.position.set(0, 8, 11);
        camera.lookAt(0, 0, 0.4);

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

        const foco = new THREE.SpotLight(0xffffff, 0.9, 0, Math.PI / 4, 0.5, 1);
        foco.position.set(0, 6.5, 0);
        foco.castShadow = true;
        scene.add(foco);
        scene.add(new THREE.HemisphereLight(0xbfd4e6, 0x0a2a14, 0.55));

        this.preloadCourtImages('/arcade/assets/cards/courts');
        this.activeDeckBack = 'classic_red';
    },

    onStateSync(data) {
        if (!data) return;
        this.gcCards();

        const juego = this.gameId;
        const proto = window.ALISA_PROTOHUB;
        const p = proto?.partida?.(juego) ?? null;
        const reglas = proto?.reglas?.get?.(juego) ?? null;

        /**
         * ⚠️ EN UNA SALA, LA PARTIDA DE ESTA PESTAÑA NO ES LA PARTIDA.
         *
         * Fuera de la sala el sustrato se saca del objeto local, que es el bueno
         * porque las reglas corren aquí. Con `?sala=` corren en el árbitro: el
         * `p` de esta pestaña es una partida distinta que nadie está jugando, y
         * dibujarla sería enseñar una mesa inventada con toda la seguridad del
         * mundo — exactamente el tipo de mentira muda que este proyecto persigue.
         *
         * Así que se dibuja lo que manda el árbitro, y sólo eso. `sustratoDe`
         * deriva las zonas del ESTADO publicado sin tocar ninguna partida, y ese
         * estado ya viene recortado a tu asiento por el `?quien=` de `sala.js`:
         * lo que no te toca ver no llega al navegador, no es que se dibuje menos.
         */
        let sus;
        if (this.backend?.tipo === 'sala') {
            sus = sustratoDe(juego, data);
        } else {
            /**
             * ⚠️ EL SUSTRATO SE PIDE CON EL ASIENTO DESDE EL QUE SE MIRA.
             * En un juego de información oculta eso no es cosmética: decide qué
             * cartas se ven. `?asiento=1` abre la vista del otro, que es como se
             * comprueba —con dos pestañas— que no se filtra nada.
             */
            const asiento = Number(new URLSearchParams(location.search).get('asiento')) || 0;
            sus = reglas?.sustrato
                ? reglas.sustrato(p, asiento)
                : obtenerSustrato(juego, reglas, p, data);
        }

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
            const clave = z.de === null || z.de === undefined ? 'mesa' : z.de;
            if (!porDueno.has(clave)) porDueno.set(clave, []);
            porDueno.get(clave).push(z);
        }

        for (const [clave, lote] of porDueno) {
            const sitio = SITIO[clave] ?? SITIO.mesa;
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
            (this.sala ? fila('Sala', this.sala.espectador ? 'mirando' : 'sentado', '#9ecbff') : '')
          + (data.turn !== undefined ? fila('Turno', data.turn, '#00ffaa') : '')
          + (marcador !== undefined ? fila('Puntos', marcador, '#FFD700') : '')
          + zonas.map(z => fila(
                `${z.id}${z.de === null || z.de === undefined ? '' : ' · ' + z.de}`,
                `${z.items.length} vistas${z.ocultas ? ` + ${z.ocultas} tapadas` : ''}`)).join('')
          + (data.is_game_over ? fila('Estado', data.desenlace ?? 'Terminada', '#ff8080') : '')
          + `<div id="mesa-jugadas" class="mesa-jugadas"></div>`;

        pintarJugadas(this, data);
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
window.ALISA_MESA = engine;

engine.mountAgentHUD('hud-container',
    (window.ALISA_TITULO ?? 'Mesa de cartas'),
    `<div id="hud-content">Repartiendo…</div>`);
engine.start();
