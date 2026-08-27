// blackjack_visualizer.js — ALISA Sovereign Arena

/**
 * ⚠️ AHORA SÍ SE NOMBRA LA BANCA, Y ANTES NO SE PODÍA.
 *
 * Esta cabecera decía —con razón, entonces— que sólo se nombraba `player_hand`:
 * `sustratoDe()` miraba `st.mano ?? st.player_hand` y no tenía ninguna rama para
 * `dealer_hand`, así que la matriz contaba 2 piezas y la vista dibujaba 4.
 * Nombrar la banca habría convertido «no comprobable» en «discrepa», que es peor.
 * El hueco era del adaptador y se dijo así, remitiendo a otro fichero.
 *
 * El 27-08 blackjack publica su PROPIO sustrato con la mano de la casa dentro, o
 * sea que la premisa caducó — y como caducan siempre estas cosas, en silencio:
 * `prueba_vistas` se puso en rojo con «sustrato 3 · dibujadas 2» sin que nadie
 * tocara este fichero.
 *
 * Se nombran las tres zonas con el contrato de siempre: `p:carta:<dueño>` lo que
 * se ve, `oculta` lo que está boca abajo. La tapada NO lleva prefijo de pieza a
 * propósito — vive en `ocultas` del sustrato, no en `items`, y contarla como
 * pieza volvería a descuadrar la cuenta por el otro lado.
 *
 * Repite la fórmula EXACTA de `drawZone()` en `SovereignCardEngine.js` para
 * encontrar la malla ya creada (`${zona}_${baseId}_${idx}`, la rama que no es
 * `grid`): una copia de esa cuenta que no coincidiera sería un nombre que
 * apunta a ninguna malla.
 */
function nombrarCartas(engine, cartas, zona, dueño, ocultas = false) {
    cartas.forEach((carta, idx) => {
        const baseId = typeof carta === 'string' ? carta
                     : (carta.id || (carta.rank + carta.suit) || `c_${idx}`);
        const mesh = engine.cardMeshes[`${zona}_${baseId}_${idx}`];
        if (mesh) mesh.name = ocultas ? 'oculta' : `p:carta:${dueño}`;
    });
}

const engine = new SovereignCardEngine({
    gameId: 'blackjack',
    onInit3D: function(scene, camera, renderer) {
        /**
         * ⚠️ DE INVITADO NO SE TRAE MUEBLE NI LUZ. LOS PONE LA SALA.
         *
         * Estas tres cosas —cámara, mesa y foco— son de cuando este juego era dueño de
         * su página. Dentro de la sala de bolsillo cada una estorba de su manera: la
         * cámara le desharía el encuadre a la sala; el foco iluminaría el muro y los
         * taburetes con una intensidad pensada para una escena vacía; y la mesa mide
         * VEINTE UNIDADES de diámetro, así que dentro de un grupo escalado a metro y
         * pico se traga la habitación entera. Era eso lo que se veía en el póker
         * —«tapete de tamaño de sala y ninguna carta»—, y aquí habría pasado igual.
         *
         * Perder el fieltro rojo tiene un coste: el blackjack deja de tener su mesa y
         * pasa a jugarse en la verde de la casa. Eso no es una pérdida, es lo que se
         * pidió: que sentarse en cualquier mesa de la Sala del Huevo se sienta el
         * mismo sitio. Su página propia la conserva intacta.
         */
        if (!this.invitado) {
            camera.position.set(0, 5, 8);
            camera.lookAt(0, 0, 0);

            // Blackjack specific table
            const tableGeo = new THREE.CylinderGeometry(10, 10, 0.4, 64);
            tableGeo.scale(1, 1, 0.5); // Semi-circle feel
            const tableMat = new THREE.MeshStandardMaterial({color: 0x660000, roughness: 0.8}); // Deep red felt
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
        this.activeDeckBack = 'classic_blue';
    },
    onStateSync: function(data) {
        if (!data) return;
        
        const playerHand = data.player_hand || [];
        const dealerHand = data.dealer_hand || [];
        
        this.gcCards(); // Abstract memory sweep
        
        // Use abstract CardEngine zoning
        if (playerHand.length > 0) {
            this.drawZone(playerHand, 'player_0', -((playerHand.length-1)*0.6)/2, 2.0, { layout: 'fan', hidden: false });
            nombrarCartas(this, playerHand, 'player_0', 0);
        }
        
        // Dealer hand at the top
        if (dealerHand.length > 0) {
            // First card typically hidden in blackjack if length == 2 and state == playing
            const hideFirst = (dealerHand.length === 2 && data.status === 'Playing');
            // We can draw them individually or as a line with partial hiding logic.
            // For now, draw as a line. SovereignCardEngine currently expects all hidden or all visible per zone call.
            // We bypass by drawing card 0 and then the rest.
            
            if (hideFirst) {
                this.drawZone([dealerHand[0]], 'dealer_hole', -0.5, -1.5, { layout: 'line', hidden: true });
                this.drawZone([dealerHand[1]], 'dealer_up', 0.5, -1.5, { layout: 'line', hidden: false });
                // La tapada va como `oculta`: se dibuja, pero no cuenta como pieza —
                // en el sustrato vive en `ocultas`, no en `items`.
                nombrarCartas(this, [dealerHand[0]], 'dealer_hole', 1, true);
                nombrarCartas(this, [dealerHand[1]], 'dealer_up', 1);
            } else {
                this.drawZone(dealerHand, 'dealer', -((dealerHand.length-1)*0.9)/2, -1.5, { layout: 'line', hidden: false });
                nombrarCartas(this, dealerHand, 'dealer', 1);
            }
        }
        
        // Update HUD
        const html = `
            <div class="status-row">
                <span>Tu mano</span>
                <span class="val turn-white" style="color:#00ffaa; font-size:16px;">${data.player_score || 0}</span>
            </div>
            <div class="status-row" style="color:#FF4081;">
                <span>La banca enseña</span>
                <span class="val" style="color:#FF4081; font-size:16px;">${data.dealer_score || '?'}</span>
            </div>
            <div class="status-row" style="margin-top:10px;">
                <span>Estado</span>
                <span class="val" style="color:#FFD700; font-weight:bold;">${data.status || 'jugando'}</span>
            </div>
            ${data.manos ? `
            <div class="status-row" style="opacity:.75; font-size:11px;">
                <span>Manos</span>
                <span class="val">${data.ganadas}G · ${data.perdidas}P · ${data.empates}E &nbsp;(${data.manos})</span>
            </div>` : ''}
            <!-- ⚠️ Sin estos botones el juego era INJUGABLE para una persona:
                 no había forma de pedir carta ni de plantarse. La partida solo
                 podía moverla un agente por el endpoint. -->
            <div id="bj-botones" style="display:flex; gap:8px; margin-top:14px;"></div>
        `;
        document.getElementById('hud-content').innerHTML = html;

        // Los botones salen de `legal_moves`, no de una lista escrita a mano:
        // así el HUD nunca ofrece algo que las reglas vayan a rechazar.
        const caja = document.getElementById('bj-botones');
        // `double` sale de la ficha del juego (`card_library.json`), así que si
        // mañana la biblioteca declara `split` o `insurance`, el botón aparece
        // solo — y sin etiqueta se vería el nombre crudo. Por eso van todas.
        const etiquetas = { hit: 'PEDIR', stand: 'PLANTARSE', deal: 'OTRA MANO',
                            double: 'DOBLAR', split: 'SEPARAR', insurance: 'SEGURO',
                            nueva: 'ZAPATO NUEVO' };
        for (const jugada of (data.legal_moves || [])) {
            const b = document.createElement('button');
            b.className = 'hud-btn';
            b.textContent = etiquetas[jugada] || jugada.toUpperCase();
            b.style.cssText = `flex:1; padding:9px 6px; cursor:pointer;
                background:rgba(255,255,255,.06); color:#e8ecef;
                border:1px solid rgba(255,255,255,.25); border-radius:6px;
                font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.12em;`;
            b.onclick = () => engine.sendMove(jugada);
            caja.appendChild(b);
        }
    }
});

engine.mountAgentHUD('hud-container', 'Blackjack', `<div id="hud-content">Conectando con la partida…</div>`);
engine.start();
