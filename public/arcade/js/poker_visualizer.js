// poker_visualizer.js — ALISA Sovereign Arena
const engine = new SovereignCardEngine({
    gameId: 'poker',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 5, 8);
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
        }
        
        // Player 0 (Bottom center, closer to camera)
        if (playerHand.length > 0) {
            this.drawZone(playerHand, 'player_0', -0.5, 2.5, { layout: 'fan', hidden: false });
        }
        
        // Player 2 (Top center, opponent)
        if (oppHand.length > 0) {
            // Trick: oppHand array contains just string tokens, we map to actual back objects if hidden
            // Since drawZone needs actual cardIds, if they are dummy 'back' strings, the schema might drop them
            // We'll pass them but hidden=true ensures they render as backs
            this.drawZone(oppHand, 'player_2', -0.5, -2.5, { layout: 'fan', hidden: true });
        }
        
        // Update HUD
        const html = `
            <div class="status-row">
                <span>Pot Size</span>
                <span class="val turn-white" style="color:#FFD700; font-size:16px;">$${data.pot || 0}</span>
            </div>
            <div class="status-row">
                <span>Player Stack</span>
                <span class="val">${data.player_stack || 0}</span>
            </div>
            <div class="status-row">
                <span>Opponent Stack</span>
                <span class="val">${data.opponent_stack || 0}</span>
            </div>
            <div class="status-row" style="margin-top:10px;">
                <span>Phase</span>
                <span class="val" style="color:#00ffaa; font-weight:bold;">${data.phase || 'Pre-Flop'}</span>
            </div>
            <div id="mesa-jugadas" class="mesa-jugadas"></div>
        `;
        document.getElementById('hud-content').innerHTML = html;

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
            pintarJugadas(document.getElementById('mesa-jugadas'), {
                acciones: data.legal_moves ?? data.legal_actions ?? [],
                terminada: !!data.is_game_over,
                enviar: (m) => engine.sendMove(m),
            });
        });
    }
});

engine.mountAgentHUD('hud-container', 'Texas Holdem Pro', `<div id="hud-content">Waiting for sync...</div>`);
engine.start();
