// bestiario_visualizer.js — ALISA Sovereign Arena
const engine = new SovereignBoardEngine({
    gameId: 'bestiario',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 10, 14);
        camera.lookAt(0, 0, 0);

        // ⚠️ IMAGEN PROPIA — LEER ANTES DE TOCAR EL SUELO
        // Este suelo era, literalmente, una Pokéball: media circunferencia roja,
        // media blanca, línea central y círculo con otro dentro. Eso es *trade
        // dress* y está protegido aunque el juego se llame de otra forma —
        // renombrar el comentario a "Sello" no cambiaba la geometría.
        //
        // Ahora el suelo es NUESTRO: los cuatro cuadrantes de la Mesa Esmeralda
        // (Soma, Psyche, World, Data), que es la iconografía de la colonia y de
        // donde salen los propios yokai del bestiario.
        const arena = new THREE.Mesh(
            new THREE.CylinderGeometry(12, 12, 0.5, 64),
            new THREE.MeshStandardMaterial({ color: 0x0B1014, roughness: 0.85 })
        );
        arena.position.y = -0.25;
        scene.add(arena);

        // Un cuarto de círculo por cuadrante.
        const CUADRANTES = [
            { nombre: 'soma',   color: 0x1F6F5C },   // cuerpo — verde
            { nombre: 'psyche', color: 0x5B3E8C },   // mente — violeta
            { nombre: 'world',  color: 0x2A5E8C },   // mundo — azul
            { nombre: 'data',   color: 0x8C6A2A },   // dato — ámbar
        ];
        CUADRANTES.forEach((q, i) => {
            const geo = new THREE.CylinderGeometry(
                11.8, 11.8, 0.52, 24, 1, false, (Math.PI / 2) * i, Math.PI / 2
            );
            const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
                color: q.color, roughness: 0.7, emissive: q.color, emissiveIntensity: 0.06,
            }));
            m.position.y = -0.25;
            m.userData.cuadrante = q.nombre;
            scene.add(m);
        });

        // La costura donde se juntan los cuatro: la arista. Eso es el centro.
        const cruz1 = new THREE.Mesh(new THREE.BoxGeometry(23.6, 0.54, 0.22),
            new THREE.MeshStandardMaterial({ color: 0x0B1014 }));
        cruz1.position.y = -0.25;
        scene.add(cruz1);
        const cruz2 = cruz1.clone();
        cruz2.rotation.y = Math.PI / 2;
        scene.add(cruz2);

        const centro = new THREE.Mesh(
            new THREE.CylinderGeometry(1.6, 1.6, 0.56, 6),      // hexágono, no círculo
            new THREE.MeshStandardMaterial({ color: 0x7FD0FF, emissive: 0x1B4A66, emissiveIntensity: 0.4 })
        );
        centro.position.y = -0.25;
        scene.add(centro);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 15, 5);
        scene.add(dirLight);
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        
        this.entityMeshes = {};
        
        // Fallback colors for abstract rendering
        this.typeColors = {
            'Fire': 0xFF4422, 'Water': 0x3399FF, 'Grass': 0x77CC55, 'Electric': 0xFFCC33,
            'Normal': 0xAAAA99, 'Fighting': 0xBB5544, 'Flying': 0x8899FF, 'Poison': 0xAA5599,
            'Ground': 0xDDBB55, 'Rock': 0xBBAA66, 'Bug': 0xAABB22, 'Ghost': 0x6666BB,
            'Steel': 0xAAAABB, 'Psychic': 0xFF5599, 'Ice': 0x66CCFF, 'Dragon': 0x7766EE,
            'Dark': 0x775544, 'Fairy': 0xFFAAFF
        };
    },
    onStateSync: function(data) {
        if (!data) return;
        
        // Expected Data: { player_active: [{id, hp, type1}], opponent_active: [{id, hp, type1}], weather, turn }
        const pActive = data.player_active || [];
        const oActive = data.opponent_active || [];
        
        // Remove old entities
        Object.values(this.entityMeshes).forEach(mesh => this.scene.remove(mesh));
        this.entityMeshes = {};
        
        // Render Player side (Bottom: z = 3, x = -3 and 3)
        pActive.forEach((pkm, i) => {
            const color = this.typeColors[pkm.type1] || 0xAAAAAA;
            const geo = new THREE.CylinderGeometry(1, 1, 2.5, 16);
            const mat = new THREE.MeshStandardMaterial({color: color, emissive: color, emissiveIntensity: 0.2});
            const mesh = new THREE.Mesh(geo, mat);
            
            mesh.position.set(i === 0 ? -3 : 3, 1.25, 3);
            
            // HP Ring Indicator
            const hpRing = new THREE.Mesh(
                new THREE.RingGeometry(1.2, 1.4, 32),
                new THREE.MeshBasicMaterial({color: (pkm.hp > 50) ? 0x00FF00 : (pkm.hp > 20) ? 0xFFFF00 : 0xFF0000, side: THREE.DoubleSide})
            );
            hpRing.rotation.x = Math.PI / 2;
            hpRing.position.y = -1.2;
            mesh.add(hpRing);
            
            this.scene.add(mesh);
            this.entityMeshes['p_'+i] = mesh;
        });

        // Render Opponent side (Top: z = -3, x = 3 and -3)
        oActive.forEach((pkm, i) => {
            const color = this.typeColors[pkm.type1] || 0x444444;
            const geo = new THREE.CylinderGeometry(1, 1, 2.5, 16);
            const mat = new THREE.MeshStandardMaterial({color: color, emissive: color, emissiveIntensity: 0.2});
            const mesh = new THREE.Mesh(geo, mat);
            
            mesh.position.set(i === 0 ? 3 : -3, 1.25, -3);
            
            // HP Ring Indicator
            const hpRing = new THREE.Mesh(
                new THREE.RingGeometry(1.2, 1.4, 32),
                new THREE.MeshBasicMaterial({color: (pkm.hp > 50) ? 0x00FF00 : (pkm.hp > 20) ? 0xFFFF00 : 0xFF0000, side: THREE.DoubleSide})
            );
            hpRing.rotation.x = Math.PI / 2;
            hpRing.position.y = -1.2;
            mesh.add(hpRing);
            
            this.scene.add(mesh);
            this.entityMeshes['o_'+i] = mesh;
        });

        // Update HUD
        const html = `
            <div class="status-row" style="margin-bottom:10px;">
                <span style="color:#00ffaa; font-weight:bold;">Player (Bottom)</span>
                <span class="val turn-white">${pActive.length} Active</span>
            </div>
            <div class="status-row" style="margin-bottom:10px;">
                <span style="color:#FF4081; font-weight:bold;">Opponent (Top)</span>
                <span class="val">${oActive.length} Active</span>
            </div>
            <div class="status-row" style="margin-top:15px; border-top:1px dashed rgba(255,255,255,0.2); padding-top:10px;">
                <span style="color:#4fc3f7;">Weather / Field</span>
                <span class="val" style="color:#4fc3f7; font-weight:bold;">${data.weather || 'Clear'}</span>
            </div>
            <div class="status-row">
                <span>Turn Count</span>
                <span class="val" style="color:#FFD700; font-weight:bold;">${data.turn || 1}</span>
            </div>
        `;
        document.getElementById('hud-content').innerHTML = html;
    }
});

engine.mountAgentHUD('hud-container', 'Bestiario Bestiario Colosseum', `<div id="hud-content">Waiting for sync...</div>`);
engine.start();
