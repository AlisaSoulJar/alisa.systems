// grimorio_visualizer.js — ALISA Sovereign Arena
const engine = new SovereignCardEngine({
    gameId: 'grimorio',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 8, 12);
        camera.lookAt(0, 0, 0);

        // Grimorio Playmat
        const matGeo = new THREE.PlaneGeometry(24, 16);
        const matMat = new THREE.MeshStandardMaterial({
            color: 0x1A0A2E, // Deep purple/void space
            roughness: 0.9,
            metalness: 0.1
        });
        const playmat = new THREE.Mesh(matGeo, matMat);
        playmat.rotation.x = -Math.PI / 2;
        playmat.position.y = -0.1;
        playmat.receiveShadow = true;
        scene.add(playmat);
        
        // Battlefield boundary lines
        const grid = new THREE.GridHelper(24, 12, 0x4fc3f7, 0x2a2a44);
        grid.position.y = -0.09;
        scene.add(grid);

        // Lighting
        const spotLight = new THREE.SpotLight(0xffffff, 1.0, 0, Math.PI / 3, 0.5, 1);
        spotLight.position.set(0, 15, 5);
        spotLight.castShadow = true;
        scene.add(spotLight);
        scene.add(new THREE.AmbientLight(0xffffff, 0.3));

        // Use standard courts/backs as a placeholder for Grimorio cards
        this.preloadCourtImages('/arcade/assets/cards/courts');
        this.activeDeckBack = 'tarot_purple'; // Fits Grimorio synergy
    },
    onStateSync: function(data) {
        if (!data) return;
        
        // Abstract State representations
        const playerHand = data.player_hand || [];
        const playerLands = data.player_lands || [];
        const playerCreatures = data.player_creatures || [];
        const opponentCreatures = data.opponent_creatures || [];
        
        this.gcCards();
        
        // Player Hand (Bottom Center)
        if (playerHand.length > 0) {
            this.drawZone(playerHand, 'hand', -((playerHand.length-1)*0.9)/2, 5.0, { layout: 'fan', hidden: false });
        }
        
        // Player Lands (Mid-Bottom)
        if (playerLands.length > 0) {
            this.drawZone(playerLands, 'lands', -((playerLands.length-1)*1.2)/2, 2.5, { layout: 'line', hidden: false });
        }
        
        // Player Battlefield / Creatures (Center)
        if (playerCreatures.length > 0) {
            this.drawZone(playerCreatures, 'creatures', -((playerCreatures.length-1)*1.2)/2, 0.5, { layout: 'line', hidden: false });
        }
        
        // Opponent Battlefield (Top)
        if (opponentCreatures.length > 0) {
            this.drawZone(opponentCreatures, 'opp_creatures', -((opponentCreatures.length-1)*1.2)/2, -2.5, { layout: 'line', hidden: false });
        }
        
        // Update HUD
        const html = `
            <div class="status-row" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; margin-bottom: 10px;">
                <span style="color:#00ffaa;">Player Life</span>
                <span class="val turn-white" style="color:#00ffaa; font-size:16px;">${data.player_life !== undefined ? data.player_life : 20}</span>
            </div>
            <div class="status-row" style="color:#FF4081;">
                <span>Opponent Life</span>
                <span class="val" style="color:#FF4081; font-size:16px;">${data.opponent_life !== undefined ? data.opponent_life : 20}</span>
            </div>
            <div class="status-row" style="margin-top:10px;">
                <span style="color:#4fc3f7;">Mana Pool</span>
                <span class="val" style="color:#4fc3f7; font-weight:bold;">${data.mana_pool || '0/0'}</span>
            </div>
            <div class="status-row" style="margin-top:10px;">
                <span>Phase</span>
                <span class="val" style="color:#FFD700; font-weight:bold;">${data.phase || 'Main 1'}</span>
            </div>
        `;
        document.getElementById('hud-content').innerHTML = html;
    }
});

engine.mountAgentHUD('hud-container', 'Grimorio TCG Matrix', `<div id="hud-content">Waiting for sync...</div>`);
engine.start();
