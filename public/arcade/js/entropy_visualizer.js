// entropy_visualizer.js — ALISA Sovereign Arena
const engine = new SovereignCardEngine({
    gameId: 'entropy',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 7, 8);
        camera.lookAt(0, 0, 0);

        // Entropy specific table
        const tableGeo = new THREE.CylinderGeometry(10, 10, 0.4, 64);
        tableGeo.scale(1, 1, 0.5);
        const tableMat = new THREE.MeshStandardMaterial({color: 0x1d4a36, roughness: 0.8}); // Deep green felt
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.y = -0.2;
        table.receiveShadow = true;
        scene.add(table);
        
        const spotLight = new THREE.SpotLight(0xffffff, 0.9, 0, Math.PI / 4, 0.5, 1);
        spotLight.position.set(0, 8, 0);
        spotLight.castShadow = true;
        scene.add(spotLight);
        
        this.activeDeckBack = 'classic_blue';
    },
    onStateSync: function(data) {
        if (!data) return;
        
        this.gcCards(); // Abstract memory sweep
        
        // Draw Player Grid
        const pCaja = data.caja || [];
        for (let i = 0; i < pCaja.length; i++) {
            const col = i % data.columnas;
            const fila = Math.floor(i / data.columnas);
            const card = pCaja[i];
            
            const x = -1.5 + col * 1.0;
            const z = 2.0 - fila * 1.3;
            
            this.drawZone(card ? [card] : [{}], `p_hueco_${i}`, x, z, { layout: 'line', hidden: !card });
        }
        
        // Draw Rival Grid (assuming 1 rival)
        if (data.cajas_rivales && data.cajas_rivales[0]) {
            const rCaja = data.cajas_rivales[0];
            for (let i = 0; i < rCaja.length; i++) {
                const col = i % data.columnas;
                const fila = Math.floor(i / data.columnas);
                const card = rCaja[i];
                
                const x = -1.5 + col * 1.0;
                const z = -2.0 + fila * 1.3;
                
                this.drawZone(card ? [card] : [{}], `r_hueco_${i}`, x, z, { layout: 'line', hidden: !card });
            }
        }
        
        // Draw Deck
        if (data.mazo_restante > 0) {
            // Draw a stack representing the deck
            const mazoArr = Array.from({length: Math.min(5, data.mazo_restante)}).fill({});
            this.drawZone(mazoArr, 'mazo', 3, 0, { layout: 'stack', hidden: true });
        }
        
        // Draw Discard
        if (data.descarte) {
            this.drawZone([data.descarte], 'descarte_cima', 1.8, 0, { layout: 'line', hidden: false });
        }
        
        // Draw Card in Hand
        if (data.robada) {
            this.drawZone([data.robada], 'mano_robada', 0, 0, { layout: 'line', hidden: false });
        }
        
        // Update HUD
        const html = `
            <div class="status-row">
                <span>Mis Puntos</span>
                <span class="val turn-white" style="color:#00ffaa; font-size:16px;">${data.marcador ? -data.marcador[0] : (data.puntos ? -data.puntos : 0)}</span>
            </div>
            <div class="status-row" style="color:#FF4081;">
                <span>Puntos Rival</span>
                <span class="val" style="color:#FF4081; font-size:16px;">${data.marcador ? -data.marcador[1] : '?'}</span>
            </div>
            <div class="status-row" style="margin-top:10px;">
                <span>Estado</span>
                <span class="val" style="color:#FFD700; font-weight:bold;">${data.is_game_over ? 'Terminado' : 'En Juego'}</span>
            </div>
            <div id="ent-botones" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:14px;"></div>
        `;
        document.getElementById('hud-content').innerHTML = html;

        const cajaBotones = document.getElementById('ent-botones');
        
        const etiquetas = {
            'robar_mazo': 'ROBAR MAZO',
            'robar_descarte': 'ROBAR DESCARTE',
            'descartar': 'DESCARTAR'
        };
        
        for (const jugada of (data.legal_moves || [])) {
            const b = document.createElement('button');
            b.className = 'hud-btn';
            
            if (jugada.startsWith('cambiar:')) {
                b.textContent = 'CAMBIAR ' + jugada.split(':')[1];
            } else if (jugada.startsWith('descartar_y_voltear:')) {
                b.textContent = 'VOLTEAR ' + jugada.split(':')[1];
            } else {
                b.textContent = etiquetas[jugada] || jugada.toUpperCase();
            }
            
            b.style.cssText = `flex:1 1 45%; padding:9px 6px; cursor:pointer;
                background:rgba(255,255,255,.06); color:#e8ecef;
                border:1px solid rgba(255,255,255,.25); border-radius:6px;
                font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.12em; text-align:center;`;
            b.onclick = () => engine.sendMove(jugada);
            cajaBotones.appendChild(b);
        }
    }
});

engine.mountAgentHUD('hud-container', 'Entropy', `<div id="hud-content">Cargando...</div>`);
engine.start();
