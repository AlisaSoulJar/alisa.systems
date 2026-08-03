// xiangqi_visualizer.js — ALISA Sovereign Arena
let boardGroup = new THREE.Group();
let piecesGroup = new THREE.Group();

const GRID_ROWS = 9;   // 10 lines, so 9 row-intervals
const GRID_COLS = 8;   // 9 lines, so 8 col-intervals
const SPACING = 1.0;

let redMat, blackMat, boardMat, pieceGeo;

const engine = new SovereignBoardEngine({
    gameId: 'xiangqi',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 10, 8);
        camera.lookAt(0, 0, 0);

        engine.controls = new THREE.OrbitControls(camera, renderer.domElement);
        engine.controls.enableDamping = true;
        engine.controls.dampingFactor = 0.08;
        engine.controls.maxPolarAngle = Math.PI / 2.1;
        
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(2, 10, 2);
        scene.add(dirLight);

        // Geometries
        pieceGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 32);
        
        // Materials
        redMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.2 });
        blackMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 });
        boardMat = new THREE.MeshStandardMaterial({ color: 0xF3E5AB, roughness: 0.9 }); // Paper/Wood

        scene.add(boardGroup);
        scene.add(piecesGroup);
        
        buildBoard();
    },
    onStateSync: function(data) {
        if (data.state) syncXiangqiState(data.state);
    }
});

function buildBoard() {
    // Solid wood block
    const base = new THREE.Mesh(new THREE.BoxGeometry(GRID_COLS + 1.0, 0.3, GRID_ROWS + 1.0), boardMat);
    base.position.y = -0.16;
    boardGroup.add(base);

    // Draw the grid lines specifically
    // 10 horizontal lines 
    const lineMat = new THREE.LineBasicMaterial({ color: 0x000000 });
    
    // Draw 10 Horizontal lines
    for(let r=0; r<=9; r++){
        const pts = [];
        pts.push(new THREE.Vector3(-4, 0.01, r - 4.5));
        pts.push(new THREE.Vector3(4, 0.01, r - 4.5));
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        boardGroup.add(new THREE.Line(geom, lineMat));
    }
    
    // Draw 9 Vertical lines. In Xiangqi, the vertical lines don't cross the "River" (between row 4 and 5)
    for(let c=0; c<=8; c++){
        let x = c - 4;
        // Bottom half (r=0 to 4)
        const pts1 = [
            new THREE.Vector3(x, 0.01, -4.5),
            new THREE.Vector3(x, 0.01, -0.5)
        ];
        // Top half (r=5 to 9)
        const pts2 = [
            new THREE.Vector3(x, 0.01, 0.5),
            new THREE.Vector3(x, 0.01, 4.5)
        ];
        
        boardGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), lineMat));
        boardGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), lineMat));
        
        // Connect the outer border over the river
        if(c === 0 || c === 8) {
            const pts3 = [
                new THREE.Vector3(x, 0.01, -0.5),
                new THREE.Vector3(x, 0.01, 0.5)
            ];
            boardGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts3), lineMat));
        }
    }
}

function syncXiangqiState(state) {
    const grid = state.grid;
    const minimap = document.getElementById('minimapCanvas');
    if (minimap && grid) {
        const ctx = minimap.getContext('2d');
        ctx.clearRect(0, 0, 128, 128);
        const cx = 128 / 9; const cy = 128 / 10;
        ctx.strokeStyle = '#432';
        for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(cx/2, i*cy+cy/2); ctx.lineTo(128-cx/2, i*cy+cy/2); ctx.stroke(); }
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i*cx+cx/2, cy/2); ctx.lineTo(i*cx+cx/2, 128-cy/2); ctx.stroke(); }
        ctx.fillStyle = '#111'; ctx.fillRect(0, 4*cy+cy/2, 128, cy); // River
        for (let r = 0; r < 10; r++) {for (let c = 0; c < 9; c++) {
            const char = grid[r][c];
            if (char && char !== '') {
                ctx.beginPath(); ctx.arc(c*cx+cx/2, r*cy+cy/2, cx/2.2, 0, Math.PI*2);
                ctx.fillStyle = char === char.toUpperCase() ? '#c22' : '#222';
                ctx.fill();
                ctx.fillStyle = '#fff'; ctx.font='bold 9px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
                ctx.fillText(char, c*cx+cx/2, r*cy+cy/2);
            }
        }}
    }

    while(piecesGroup.children.length > 0){ 
        piecesGroup.remove(piecesGroup.children[0]); 
    }

    // const grid = state.grid; // removed to fix syntax error
    if(!grid) return;
    
    const legendHtml = [];

    // Rows (y) 0->9, Cols (x) 0->8
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
            const char = grid[r][c];
            if (char && char !== "") {
                const isRed = (char === char.toUpperCase());
                const mat = isRed ? redMat : blackMat;
                const mesh = new THREE.Mesh(pieceGeo, mat);
                // Center math: C=4 is X=0. R=4.5 is Z=0.
                mesh.position.set(c - 4, 0.08, r - 4.5);
                piecesGroup.add(mesh);
            }
        }
    }
    
    // Update HUD
    const hudContainer = document.getElementById('custom-hud-status');
    if(hudContainer) {
        hudContainer.innerHTML = `FEN: ${state.fen.split(' ')[0]}`;
    }
}

engine.mountAgentHUD('hud-container', 'Chinese Chess (Xiangqi)', `
    <div class="minimap-block">
        <canvas id="minimapCanvas" width="128" height="128" style="background: rgba(5,5,10,0.9); border: 1px solid rgba(138,43,226,0.25); border-radius: 6px; margin: 0 auto; display: block;"></canvas>
    </div>
`);
engine.start();

// ═══════════════════════════════════════════════════════════════════
//  JUGAR CON EL RATÓN
// ═══════════════════════════════════════════════════════════════════
// Antes este tablero solo se dejaba MIRAR. Se engancha DESPUÉS de start(),
// porque `engine.renderer` no existe hasta que init3D() ha corrido.
(function () {
    if (!window.ALISA_ENTRADA) return;
    // ⚠️ Aquí había `OFFX = -3.5, OFFZ = -4.0`, inventados. Los buenos salen de
    // dónde coloca este fichero las piezas: `position.set(c - 4, y, r - 4.5)`.
    // Media casilla de error basta para que el clic caiga en la vecina y, al no
    // coincidir con ninguna jugada legal, no ocurra nada.
    const N = 9, SZ = 1.0, OFFX = -4.0, OFFZ = -4.5;
    const LETRAS = 'abcdefghi';
    const FILAS = 10;

    const aCasilla = (x, z) => {
        const c = Math.round((x - OFFX) / SZ);
        const f = Math.round((z - OFFZ) / SZ);
        if (c < 0 || c >= N || f < 0 || f >= FILAS) return null;
        return LETRAS[c] + (f);
    };
    const posicionDe = (sq) => {
        const c = LETRAS.indexOf(sq[0]);
        const n = parseInt(sq.slice(1), 10);
        if (c < 0 || isNaN(n)) return null;
        const f = n;
        return { x: OFFX + c * SZ, z: OFFZ + f * SZ };
    };

    window.ALISA_ENTRADA.clicEnTablero(engine, {
        aCasilla, posicionDe, unSoloPaso: false, alturaMarca: 0.25,
    });
})();
