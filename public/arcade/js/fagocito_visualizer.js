// fagocito_visualizer.js — ALISA Sovereign Arena
//
// ⚠️ IMAGEN PROPIA — LEER ANTES DE TOCAR LOS COLORES
// Este visualizador heredaba la identidad visual de otro juego: el jugador era
// el círculo AMARILLO icónico (0xFFFF00), el laberinto AZUL (0x0000BB) y los
// perseguidores llevaban su paleta exacta, con los nombres de los personajes
// escritos en los comentarios. Eso es *trade dress*, y está protegido aunque
// cambies el nombre del juego. Renombrar el fichero no arreglaba nada.
//
// Ahora la identidad es la que le corresponde a lo que ES: una célula que
// engulle mientras la persiguen. Membrana translúcida con núcleo, patógenos con
// forma de espícula, y el laberinto como tejido, no como muro de arcade.
// Si algún día se retocan los colores, que no vuelvan al amarillo y al azul.
const engine = new SovereignBoardEngine({
    gameId: 'fagocito',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 20, 15);
        camera.lookAt(0, 0, 0);

        // Rejilla en verde biológico, no en azul de recreativa.
        const grid = new THREE.GridHelper(28, 28, 0x1B5E4A, 0x0A1F18);
        scene.add(grid);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);
        scene.add(new THREE.AmbientLight(0xBFEFD8, 0.45));

        this.entities = [];
        this.mazeMeshes = [];
        this.pelletMeshes = [];

        // El fagocito: membrana translúcida verdosa, no un disco amarillo.
        this.pacMat = new THREE.MeshPhongMaterial({
            color: 0x7CFC98, emissive: 0x1B5E3A, transparent: true, opacity: 0.72,
            shininess: 80,
        });
        this.nucleoMat = new THREE.MeshLambertMaterial({ color: 0x1B5E3A });

        // Los patógenos, por función y no por color de nadie:
        this.ghostMats = {
            cazador: new THREE.MeshLambertMaterial({ color: 0xB5179E }),  // magenta
            flanco:  new THREE.MeshLambertMaterial({ color: 0x7209B7 }),  // violeta
            errante: new THREE.MeshLambertMaterial({ color: 0x4361EE }),  // añil
        };
        this.ghostFallback = new THREE.MeshLambertMaterial({ color: 0x8D6E9C });

        // Tejido, no muro de laberinto.
        this.wallMat = new THREE.MeshLambertMaterial({
            color: 0x14332B, transparent: true, opacity: 0.85,
        });
        this.pelletMat = new THREE.MeshBasicMaterial({ color: 0xCDEFD2 });
    },
    onStateSync: function(data) {
        // Expected data: { maze:[...], fagocito: {x,y}, ghosts: [{x,y,type}], pellets: [{x,y}], score }
        if (!data || !data.fagocito) return;
        
        // Clean dynamic entities
        for (let m of this.entities) this.scene.remove(m);
        this.entities = [];
        
        // Initialize static maze only once if not done
        if (this.mazeMeshes.length === 0 && data.maze) {
            data.maze.forEach(wall => {
                const w = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.wallMat);
                w.position.set(wall.x - 14 + 0.5, 0.5, wall.y - 14 + 0.5);
                this.scene.add(w);
                this.mazeMeshes.push(w);
            });
        }
        
        // Spawn pellets dynamically based on state
        for (let p of this.pelletMeshes) this.scene.remove(p);
        this.pelletMeshes = [];
        if (data.pellets) {
            data.pellets.forEach(pel => {
                const p = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), this.pelletMat);
                p.position.set(pel.x - 14 + 0.5, 0.2, pel.y - 14 + 0.5);
                this.scene.add(p);
                this.pelletMeshes.push(p);
            });
        }
        
        // El fagocito: membrana translúcida con núcleo visible dentro.
        // Una célula, no un disco con boca.
        const celula = new THREE.Group();
        const membrana = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 16), this.pacMat);
        celula.add(membrana);
        const nucleo = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), this.nucleoMat);
        nucleo.position.set(0.08, 0, 0.05);
        celula.add(nucleo);
        celula.position.set(data.fagocito.x - 14 + 0.5, 0.5, data.fagocito.y - 14 + 0.5);
        this.scene.add(celula);
        this.entities.push(celula);

        // Los patógenos: espículas puntiagudas, cada una del color de SU papel.
        // El color va por `type`, no por índice: así se lee de un vistazo cuál
        // es el que va a por ti y cuál el impredecible.
        if (data.ghosts) {
            data.ghosts.forEach((g) => {
                const mat = this.ghostMats[g.type] ?? this.ghostFallback;
                const cuerpo = new THREE.Group();
                cuerpo.add(new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.9, 10), mat));
                const corona = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 6, 12), mat);
                corona.rotation.x = Math.PI / 2;
                corona.position.y = -0.4;
                cuerpo.add(corona);
                cuerpo.position.set(g.x - 14 + 0.5, 0.5, g.y - 14 + 0.5);
                this.scene.add(cuerpo);
                this.entities.push(cuerpo);
            });
        }
        
        // Update HUD
        const html = `
            <div class="status-row">
                <span>Score</span>
                <span class="val turn-white">${data.score || 0}</span>
            </div>
            <div class="status-row">
                <span>Pellets Left</span>
                <span class="val">${data.pellets ? data.pellets.length : 0}</span>
            </div>
        `;
        document.getElementById('hud-content').innerHTML = html;
    }
});

engine.mountAgentHUD('hud-container', 'Fagocito RL Arena', `<div id="hud-content">Waiting for sync...</div>`);
engine.start();

// ═══════════════════════════════════════════════════════════════════
//  JUGAR CON EL TECLADO
// ═══════════════════════════════════════════════════════════════════
// Flechas o WASD. Cada pulsación es UNA jugada — el mismo `step(acción)` que
// usa un agente, así que persona y máquina hablan el mismo idioma.
(function () {
    if (!window.ALISA_ENTRADA) return;
    window.ALISA_ENTRADA.teclasDireccion(engine, { repetirSolo: true, msPorTick: 260 });
})();
