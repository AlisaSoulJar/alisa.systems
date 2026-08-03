// usura_visualizer.js — ALISA Sovereign Arena
const engine = new SovereignCardEngine({
    gameId: 'usura',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 5, 8);
        camera.lookAt(0, 0, 0);

        // Poker Table
        const tableGeo = new THREE.CylinderGeometry(10, 10, 0.5, 64);
        tableGeo.scale(1, 1, 0.5); // Semi-circle feel
        const tableMat = new THREE.MeshStandardMaterial({color: 0x0A4410, roughness: 0.8});
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.y = -0.25;
        table.receiveShadow = true;
        scene.add(table);
        
        // Rim
        const rimGeo = new THREE.TorusGeometry(10, 0.4, 16, 64);
        const rimMat = new THREE.MeshStandardMaterial({color: 0x3A2210, roughness: 0.4, metalness: 0.2});
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = -0.25;
        rim.receiveShadow = true;
        scene.add(rim);

        // Lighting
        const spotLight = new THREE.SpotLight(0xffffff, 0.8, 0, Math.PI / 4, 0.5, 1);
        spotLight.position.set(0, 6, 0);
        spotLight.castShadow = true;
        scene.add(spotLight);

        // Load Court Assets for Hybrid Mode
        this.preloadCourtImages('/arcade/assets/cards/courts');
        this.activeDeckBack = 'tarot_purple'; // Fits the magical Usura vibe
    },
    onStateSync: function(data) {
        if (!data) return;
        
        const hand = data.hand || [];
        const played = data.played || [];
        
        // Garbage Collection for deleted cards
        this.gcCards();
        
        // Use abstract CardEngine zoning
        if (hand.length > 0) {
            this.drawZone(hand, 'hand', -((hand.length - 1) * 0.9) / 2, 2.5, { layout: 'fan', hidden: false });
        }
        if (played.length > 0) {
            this.drawZone(played, 'played', -((played.length - 1) * 1.2) / 2, -1.0, { layout: 'line', hidden: false });
        }
        
        // Update HUD
        const html = `
            <div class="status-row" style="margin-bottom:10px; border-bottom:1px dashed rgba(255,255,255,0.2); padding-bottom:5px;">
                <span style="font-size:14px; font-weight:bold; color:#FFD700;">Score</span>
                <span class="val turn-white" style="font-size:16px; font-weight:bold; color:#FFD700; text-shadow: 0 0 5px rgba(255,215,0,0.5);">${data.score || 0}</span>
            </div>
            <div class="status-row">
                <span style="color:#00AAFF;">Chips</span>
                <span class="val" style="color:#00AAFF; font-weight:bold;">${data.chips || 0}</span>
            </div>
            <div class="status-row">
                <span style="color:#FF4444;">Multi</span>
                <span class="val" style="color:#FF4444; font-weight:bold;">x${data.mult || 1}</span>
            </div>
            <div class="status-row" style="margin-top:10px;">
                <span>Hand Size</span>
                <span class="val">${hand.length}</span>
            </div>
        `;
        document.getElementById('hud-content').innerHTML = html;
    }
});

engine.mountAgentHUD('hud-container', 'Usura Synergy Engine', `<div id="hud-content">Waiting for sync...</div>`);
engine.start();
