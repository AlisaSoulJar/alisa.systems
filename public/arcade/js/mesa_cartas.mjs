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
import { obtenerSustrato } from './protohub/sustrato.js';

/**
 * Dónde se sienta cada zona. La mesa mira desde el asiento 0, abajo.
 *
 * `reparto` dice hacia dónde se separan las zonas de un mismo dueño cuando tiene
 * varias (mano y bazas ganadas, caja y descarte). Los de abajo y arriba tienen
 * sitio a lo ancho; los de los lados, a lo hondo. Apilarlas todas hacia el centro
 * —que es lo que hacía esto antes— las montaba unas sobre otras.
 */
const SITIO = {
    0:    { x:  0.0, z:  2.6, layout: 'fan',  reparto: 'x' },  // tú, cerca de la cámara
    1:    { x:  0.0, z: -2.6, layout: 'fan',  reparto: 'x' },  // el de enfrente
    2:    { x: -5.5, z:  0.0, layout: 'fan',  reparto: 'z' },
    3:    { x:  5.5, z:  0.0, layout: 'fan',  reparto: 'z' },
    mesa: { x:  0.0, z:  0.0, layout: 'line', reparto: 'x' },  // de nadie: descarte, comunes, mazo
};

/** El mismo hueco entre cartas que usa la mesa de póker. */
const ESPACIO = 0.9;

/** Cuánto se separan dos zonas del mismo dueño. Poco más que un abanico lleno. */
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
         * ⚠️ EL SUSTRATO SE PIDE CON EL ASIENTO DESDE EL QUE SE MIRA.
         * En un juego de información oculta eso no es cosmética: decide qué
         * cartas se ven. `?asiento=1` abre la vista del otro, que es como se
         * comprueba —con dos pestañas— que no se filtra nada.
         */
        const asiento = Number(new URLSearchParams(location.search).get('asiento')) || 0;
        const sus = reglas?.sustrato
            ? reglas.sustrato(p, asiento)
            : obtenerSustrato(juego, reglas, p, data);

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
                const desvio = (i - (lote.length - 1) / 2) * SEPARA;
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
                const cartas = [
                    ...z.items.map(c => (c && typeof c === 'object' ? { ...c, oculta: false }
                                                                   : { id: c, oculta: false })),
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
        document.getElementById('hud-content').innerHTML =
            (data.turn !== undefined ? fila('Turno', data.turn, '#00ffaa') : '')
          + (marcador !== undefined ? fila('Puntos', marcador, '#FFD700') : '')
          + zonas.map(z => fila(
                `${z.id}${z.de === null || z.de === undefined ? '' : ' · ' + z.de}`,
                `${z.items.length} vistas${z.ocultas ? ` + ${z.ocultas} tapadas` : ''}`)).join('')
          + (data.is_game_over ? fila('Estado', data.desenlace ?? 'Terminada', '#ff8080') : '');
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
