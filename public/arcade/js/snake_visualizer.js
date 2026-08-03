// snake_visualizer.js — ALISA Sovereign Arena
const engine = new SovereignBoardEngine({
    gameId: 'snake',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 15, 12);
        camera.lookAt(0, 0, 0);

        // Grid
        const grid = new THREE.GridHelper(20, 20, 0x00FF00, 0x0A330A);
        scene.add(grid);
        
        // Floor
        const planeGeo = new THREE.PlaneGeometry(20, 20);
        const planeMat = new THREE.MeshBasicMaterial({color: 0x020802, side: THREE.DoubleSide, transparent: true, opacity: 0.8});
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = Math.PI / 2;
        plane.position.y = -0.01;
        scene.add(plane);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        
        this.snakeSegments = [];
        this.foodMesh = null;
        this.cubeGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
        this.snakeMat = new THREE.MeshLambertMaterial({color: 0x00FF00, emissive: 0x004400});
        this.headMat = new THREE.MeshLambertMaterial({color: 0x55FF55, emissive: 0x008800});
        this.foodMat = new THREE.MeshLambertMaterial({color: 0xFF0000, emissive: 0x880000});
    },
    onStateSync: function(data) {
        // Expected data: { snake: [{x, y}, ...], food: {x, y}, score, direction }
        if (!data || !data.snake) return;
        
        // Clean up previous meshes
        for (let mesh of this.snakeSegments) {
            this.scene.remove(mesh);
        }
        this.snakeSegments = [];
        
        if (this.foodMesh) {
            this.scene.remove(this.foodMesh);
            this.foodMesh = null;
        }
        
        // Draw food
        if (data.food) {
            this.foodMesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), this.foodMat);
            this.foodMesh.position.set(data.food.x - 10 + 0.5, 0.5, data.food.y - 10 + 0.5);
            this.scene.add(this.foodMesh);
        }
        
        // Draw snake
        data.snake.forEach((segment, i) => {
            const isHead = i === 0;
            const mesh = new THREE.Mesh(this.cubeGeo, isHead ? this.headMat : this.snakeMat);
            
            // Convert grid pos to 3D pos (assuming 20x20 grid mapping to -10..10)
            mesh.position.set(segment.x - 10 + 0.5, 0.5, segment.y - 10 + 0.5);
            
            if (isHead) {
                // Bounce scale animation on head
                mesh.scale.setScalar(1.2);
            }
            
            this.scene.add(mesh);
            this.snakeSegments.push(mesh);
        });
        
        // Update HUD
        const html = `
            <div class="status-row">
                <span>Score</span>
                <span class="val turn-white">${data.score || 0}</span>
            </div>
            <div class="status-row">
                <span>Length</span>
                <span class="val">${data.snake.length}</span>
            </div>
        `;
        document.getElementById('hud-content').innerHTML = html;
    }
});

engine.mountAgentHUD('hud-container', 'Snake RL Arena', `<div id="hud-content">Waiting for sync...</div>`);
engine.start();

// ═══════════════════════════════════════════════════════════════════
//  JUGAR CON EL TECLADO
// ═══════════════════════════════════════════════════════════════════
// Flechas o WASD. Cada pulsación es UNA jugada — el mismo `step(acción)` que
// usa un agente, así que persona y máquina hablan el mismo idioma.
(function () {
    if (!window.ALISA_ENTRADA) return;
    window.ALISA_ENTRADA.teclasDireccion(engine, { repetirSolo: true, msPorTick: 220 });
})();
