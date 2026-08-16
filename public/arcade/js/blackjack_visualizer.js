// blackjack_visualizer.js — ALISA Sovereign Arena

/**
 * ⚠️ SÓLO SE NOMBRA LO QUE `sustrato.js` PUBLICA, Y HOY ES SÓLO `player_hand`.
 *
 * `sustratoDe()` (en `protohub/sustrato.js`) mira `st.mano ?? st.player_hand`
 * para la zona `mano`, y NO tiene ninguna rama para `dealer_hand` — se
 * comprobó leyendo el fichero entero, no adivinando. Con la semilla 7 la
 * matriz da 2 piezas (las dos cartas del jugador); la banca reparte otras dos
 * que la vista SÍ dibuja pero que la matriz no cuenta.
 *
 * Nombrar las cartas de la banca como `p:` haría que la vista dibujara más
 * piezas de las que dice el sustrato: la prueba pasaría de «no comprobable» a
 * «discrepa», que es peor —es el mismo error que nombrar las 64 casillas del
 * ajedrez como piezas—. Así que aquí sólo se nombra la mano del jugador. El
 * hueco es del adaptador (`sustrato.js`, fuera de este encargo), no de este
 * visualizador.
 *
 * Repite la fórmula EXACTA de `drawZone()` en `SovereignCardEngine.js` para
 * encontrar la malla ya creada (`${zona}_${baseId}_${idx}`, la rama que no es
 * `grid`): una copia de esa cuenta que no coincidiera sería un nombre que
 * apunta a ninguna malla.
 */
function nombrarCartas(engine, cartas, zona, dueño) {
    cartas.forEach((carta, idx) => {
        const baseId = typeof carta === 'string' ? carta
                     : (carta.id || (carta.rank + carta.suit) || `c_${idx}`);
        const mesh = engine.cardMeshes[`${zona}_${baseId}_${idx}`];
        if (mesh) mesh.name = `p:carta:${dueño}`;
    });
}

const engine = new SovereignCardEngine({
    gameId: 'blackjack',
    onInit3D: function(scene, camera, renderer) {
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
            } else {
                this.drawZone(dealerHand, 'dealer', -((dealerHand.length-1)*0.9)/2, -1.5, { layout: 'line', hidden: false });
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
