// poker_visualizer.js — ALISA Sovereign Arena

/**
 * ⚠️ MISMA RECETA QUE `blackjack_visualizer.js`, Y AQUÍ SÍ CUBRE LAS TRES ZONAS.
 *
 * A diferencia de blackjack, `sustratoDe()` (en `protohub/sustrato.js`) SÍ
 * publica las tres piezas de este juego: `player_hand` → zona `mano` (de:0),
 * `community_cards` → zona `comunes` (de:null), y `opponent_hand` → zona
 * `mano` (de:1) PERO filtrando las cartas tapadas (`tapada()`, ahí mismo:
 * `'??'`, `'?'` o vacío no cuentan). Con la semilla 7 el rival reparte
 * `['??','??']` — las dos ocultas — así que el sustrato da 0 piezas suyas y
 * este visualizador tampoco debe nombrarlas: son el reverso que pide el
 * encargo no contar como pieza.
 *
 * Repite la fórmula de `drawZone()` en `SovereignCardEngine.js`
 * (`${zona}_${baseId}_${idx}`, rama no-`grid`) para encontrar la malla ya
 * creada y ponerle nombre sin tocar el motor.
 */
function nombrarCartas(engine, cartas, zona, dueño) {
    cartas.forEach((carta, idx) => {
        const baseId = typeof carta === 'string' ? carta
                     : (carta.id || (carta.rank + carta.suit) || `c_${idx}`);
        const mesh = engine.cardMeshes[`${zona}_${baseId}_${idx}`];
        if (mesh) mesh.name = `p:carta:${dueño}`;
    });
}

// La misma comprobación que hace `sustrato.js` para no contar un reverso
// como pieza — repetida aquí, no importada, porque este visualizador es un
// script clásico sin acceso a los módulos internos de `sustrato.js`.
const cartaTapada = (c) => !c || c === '??' || c === '?';

const engine = new SovereignCardEngine({
    gameId: 'poker',
    onInit3D: function(scene, camera, renderer) {
        /**
         * ⚠️ (0, 5, 8) MIRABA TAN DESDE ABAJO QUE ENTRABA EN CUADRO EL VACÍO DE
         * DETRÁS DE LA MESA — MEDIDO, NO A OJO.
         *
         * Esta mesa es un disco flotando en la niebla (`FogExp2` de
         * `SovereignCardEngine`, casi negra): no hay suelo ni sala alrededor,
         * a diferencia de `mesa_cartas.mjs`, que sí amuebla una habitación. Con
         * la cámara a sólo 32° sobre el horizonte (`atan(5/8)`), el rayo de
         * arriba del encuadre —FOV vertical 45°— pasaba por encima del borde
         * trasero del óvalo antes de tocar el fieltro, y desde ahí no había
         * nada que pintar. Medido con una columna de píxeles al 75% del ancho:
         * el negro puro llegaba hasta el 26,1% de la pantalla.
         *
         * Subir la cámara hasta cuadrar bien arriba —al estilo de la vista de
         * `encuadrar()` en vertical, casi cenital— sí lo tapa del todo, pero
         * de paso acerca tanto la mesa que tus dos cartas, las más próximas a
         * la cámara, se salen por el borde inferior de la pantalla: comprobado
         * proyectando sus esquinas con `camera.project()`, no mirando la
         * captura. (0, 8.5, 4) es el punto medido donde las dos cosas conviven:
         * el negro baja al 14,3% —ya no es una FRANJA, son las esquinas del
         * óvalo, como en cualquier mesa redonda vista en perspectiva— y las
         * cinco cartas comunes y las dos propias quedan enteras dentro del
         * encuadre, con sitio de sobra.
         */
        /**
         * ⚠️ DE INVITADO, NADA DE ESTO. Y ERA EL CASO QUE MÁS SE NOTABA.
         *
         * Todo el párrafo de arriba razona sobre una mesa que flota en la niebla sin
         * suelo ni sala alrededor. Dentro de la sala de bolsillo hay las dos cosas,
         * así que el razonamiento no aplica: la cámara la pone la sala y encuadra su
         * mesa, no ésta.
         *
         * Y el óvalo mide VEINTE unidades de diámetro. Metido en un grupo escalado a
         * metro y pico se come la habitación entera: eso fue literalmente lo que se
         * midió al enchufar los cuatro visualizadores de golpe —«el póker puso un
         * tapete de tamaño de sala y ninguna carta»—. Las cartas estaban; lo que no
         * había era sitio para verlas.
         *
         * Dicho de otro modo: este fichero traía SU PROPIA MESA de casino, y la sala
         * de bolsillo ya es una mesa de casino. Dos mesas en el mismo sitio.
         */
        if (!this.invitado) {
            camera.position.set(0, 8.5, 4);
            camera.lookAt(0, 0, 0);

            // Procedural Casino Table
            const tableGeo = new THREE.CylinderGeometry(10, 10, 0.4, 64);
            tableGeo.scale(1, 1, 0.6); // Oval
            const tableMat = new THREE.MeshStandardMaterial({ color: 0x073b18, roughness: 0.9 }); // Deep green felt
            const table = new THREE.Mesh(tableGeo, tableMat);
            table.position.y = -0.2;
            table.receiveShadow = true;
            scene.add(table);

            // Lighting
            const spotLight = new THREE.SpotLight(0xffffff, 0.8, 0, Math.PI / 4, 0.5, 1);
            spotLight.position.set(0, 6, 0);
            spotLight.castShadow = true;
            scene.add(spotLight);
        }

        // Load Court Assets for Hybrid Mode
        this.preloadCourtImages('/arcade/assets/cards/courts');
        this.activeDeckBack = 'classic_red';
    },
    onStateSync: function(data) {
        if (!data) return;
        
        const community = data.community_cards || [];
        const playerHand = data.player_hand || [];
        const oppHand = data.opponent_hand || ['back', 'back']; // Opponent hidden cards
        
        // Clear all cards that are no longer part of the state
        const allNewCards = new Set([...community, ...playerHand, ...oppHand.map((c,i)=>`opp_${i}`)]);
        // Simple garbage collection simulation: in real SovereignCardEngine this is handled via GC methods or manually iterating meshes
        this.gcCards(); // Clean any orphans
        
        // Use abstract CardEngine zoning (drawZone)
        
        // Community (Center of the table, x=0, z=0)
        if (community.length > 0) {
            this.drawZone(community, 'community', -((community.length-1)*0.9)/2, 0, { layout: 'line', hidden: false });
            nombrarCartas(this, community, 'community', null);
        }

        // Player 0 (Bottom center, closer to camera)
        if (playerHand.length > 0) {
            this.drawZone(playerHand, 'player_0', -0.5, 2.5, { layout: 'fan', hidden: false });
            nombrarCartas(this, playerHand, 'player_0', 0);
        }

        // Player 2 (Top center, opponent)
        if (oppHand.length > 0) {
            // Trick: oppHand array contains just string tokens, we map to actual back objects if hidden
            // Since drawZone needs actual cardIds, if they are dummy 'back' strings, the schema might drop them
            // We'll pass them but hidden=true ensures they render as backs
            this.drawZone(oppHand, 'player_2', -0.5, -2.5, { layout: 'fan', hidden: true });
            // Sólo se nombran las que el sustrato SÍ cuenta: las que no están
            // tapadas. Con la semilla de la prueba son las dos, `['??','??']`,
            // así que hoy esto no nombra nada — y es lo correcto: un reverso no
            // es información, y `sustrato.js` tampoco lo cuenta como pieza.
            nombrarCartas(this, oppHand.filter(c => !cartaTapada(c)), 'player_2', 1);
        }
        
        // Update HUD
        const html = `
            <div class="status-row">
                <span>Bote</span>
                <span class="val turn-white" style="color:#FFD700; font-size:16px;">$${data.pot || 0}</span>
            </div>
            <div class="status-row">
                <span>Tus fichas</span>
                <span class="val">${data.player_stack || 0}</span>
            </div>
            <div class="status-row">
                <span>Fichas del rival</span>
                <span class="val">${data.opponent_stack || 0}</span>
            </div>
            <div class="status-row" style="margin-top:10px;">
                <span>Fase</span>
                <span class="val" style="color:#00ffaa; font-weight:bold;">${data.phase || 'antes del flop'}</span>
            </div>
        `;
        document.getElementById('hud-content').innerHTML = html;

        /**
         * ⚠️ LA TIRA DE JUGADAS VA FUERA DE `#hud-content`, Y ANTES ESTABA DENTRO.
         *
         * Escrita en este HTML acababa donde acaba todo lo de aquí: dentro del
         * bloque que se pliega. Y plegado —que en un móvil es como arranca— eso va
         * a `max-height: 0; overflow: hidden`: los botones conservan su rectángulo,
         * así que desde fuera parece que están, pero quedan recortados y fuera del
         * reparto de golpes. Es el mismo fallo que dejaba el ajedrez sin poder
         * jugarse en un móvil.
         *
         * Y encima había DOS con el mismo `id`: ésta y la que pone la plantilla del
         * motor. `getElementById` devuelve la primera, así que una se rellenaba y la
         * otra se quedaba con botones que no respondían a nadie. Medido: de cinco
         * pulsaciones, las dos primeras no hacían nada y las dos siguientes sí. Para
         * quien juega, una mesa que te ignora la mitad de las veces.
         *
         * Se busca la que ya exista —la del motor, hermana de `#hud-content`— y sólo
         * se crea si no hay ninguna. Reescribir `innerHTML` en cada sincronización se
         * llevaba la de dentro y la volvía a crear; ésta, al estar fuera, sobrevive.
         */
        let tira = document.getElementById('mesa-jugadas');
        if (!tira) {
            const panel = document.querySelector('.hud-panel');
            if (panel) {
                tira = document.createElement('div');
                tira.id = 'mesa-jugadas';
                tira.className = 'mesa-jugadas';
                panel.appendChild(tira);
            }
        }

        /**
         * ⚠️ ESTA MESA ENSEÑABA UNA PARTIDA QUE NO SE PODÍA JUGAR.
         *
         * El HUD contaba el bote, las fichas y la fase, y ahí acababa. Con
         * `legal_moves: ['check','raise']` y el turno tuyo, en pantalla no había ni
         * un botón: una mesa preciosa, perfectamente dibujada, y sin forma de mover.
         * No daba error porque no falta nada — sencillamente nunca se pintó.
         *
         * Se cae en la cuenta comparando: blackjack, que es su hermano de
         * visualizador propio, sí tiene PEDIR/PLANTARSE/DOBLAR. Uno lo hizo y el
         * otro no, que es lo que pasa cuando cada página pinta sus botones.
         *
         * Por eso se usa `pintarJugadas`, el mismo de la mesa compartida: ahí vive
         * la regla de oro —no se ofrece nada que no esté en `legal_moves`— y una
         * copia suya es una copia con la posibilidad de saltársela. Va por `import()`
         * dinámico porque este visualizador es un script clásico, no un módulo.
         */
        import('./protohub/jugadas.js').then(({ pintarJugadas }) => {
            pintarJugadas(tira, {
                acciones: data.legal_moves ?? data.legal_actions ?? [],
                terminada: !!data.is_game_over,
                enviar: (m) => engine.sendMove(m),
            });
        });
    }
});

engine.mountAgentHUD('hud-container', 'Póker · Texas hold\'em', `<div id="hud-content">Conectando con la partida…</div>`);
engine.start();
