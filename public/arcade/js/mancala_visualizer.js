// mancala_visualizer.js — ALISA Sovereign Arena
// El tablero de mancala NO es una rejilla cuadrada: son 14 huecos en óvalo, así
// que no entraba en el patrón genérico de `Entrada.js` y se quedó sin ratón
// mientras los otros ocho ya se jugaban. Estas constantes salen de cómo el
// propio visualizador coloca las semillas (`spawnSeeds`), no de suponerlas.
const MANCALA_X0 = -3.25;      // centro del hueco 0
const MANCALA_DX = 1.3;        // separación entre huecos
const MANCALA_Z = 1.0;         // fila del jugador 0 (la del rival, en -1.0)

let boardGroup = new THREE.Group();
let piecesGroup = new THREE.Group();

const PIT_RADIUS = 0.5;
const STORE_WIDTH = 1.0;
const STORE_LENGTH = 3.0;
const X_SPACING = 1.3;

let whiteMat, blackMat, pitMat, boardMat, seedGeo;

const engine = new SovereignBoardEngine({
    gameId: 'mancala',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 8, 5);

        // ⚠️ MANCALA ES EL RARO, Y POR ESO ENCAJA IGUAL.
        // Sus jugadas no son coordenadas sino el ÍNDICE del hoyo: `0`…`5`. Aun
        // así entra en el mismo módulo — una rejilla de 6 por 1— sin más que
        // decirle cómo se llama una casilla. Que el caso raro no necesite código
        // propio es la prueba de que la abstracción estaba bien elegida.
        // La geometría sale de sus propios hoyos: `-3.25 + i * X_SPACING` en la
        // fila `z = 1.0`, que es la del jugador 0.
        import('./raton_tablero.js').then(({ engancharRaton }) => {
            engancharRaton({
                engine, modo: 'colocar',
                columnas: 6, filas: 1, paso: X_SPACING,
                origen: { x: -3.25, z: MANCALA_Z },
                nombrar: (c) => String(c),
            });
        });
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
        seedGeo = new THREE.SphereGeometry(0.12, 16, 16);
        
        // Materials
        pitMat = new THREE.MeshStandardMaterial({ color: 0x221100, roughness: 0.9, depthWrite: false });
        boardMat = new THREE.MeshStandardMaterial({ color: 0xbb8855, roughness: 0.8 }); // Light Wood

        scene.add(boardGroup);
        scene.add(piecesGroup);
        
        buildBoard();
    },
    onStateSync: function(data) {
        if (data.state) syncMancalaState(data.state);
    }
});

function buildBoard() {
    const darkPitMat = new THREE.MeshStandardMaterial({ color: 0x110800, roughness: 0.9 });
    const bottomBase = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.4, 4.2), darkPitMat);
    bottomBase.position.y = -0.3;
    boardGroup.add(bottomBase);

    const shape = new THREE.Shape();
    shape.moveTo(-5.1, -2.1);
    shape.lineTo(5.1, -2.1);
    shape.lineTo(5.1, 2.1);
    shape.lineTo(-5.1, 2.1);
    shape.lineTo(-5.1, -2.1);

    for (let i = 0; i < 6; i++) {
        const h = new THREE.Path();
        h.absarc(-3.25 + i * X_SPACING, 1.0, PIT_RADIUS, 0, Math.PI*2, false);
        shape.holes.push(h);
    }
    for (let i = 0; i < 6; i++) {
        const h = new THREE.Path();
        h.absarc(3.25 - i * X_SPACING, -1.0, PIT_RADIUS, 0, Math.PI*2, false);
        shape.holes.push(h);
    }
    const s1 = new THREE.Path();
    s1.absellipse(4.3, 0, STORE_WIDTH/2, STORE_LENGTH/2, 0, Math.PI*2, false, 0);
    shape.holes.push(s1);
    const s2 = new THREE.Path();
    s2.absellipse(-4.3, 0, STORE_WIDTH/2, STORE_LENGTH/2, 0, Math.PI*2, false, 0);
    shape.holes.push(s2);

    const extrudeSettings = { depth: 0.2, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
    const boardGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    boardGeo.rotateX(Math.PI / 2);
    
    const topBoard = new THREE.Mesh(boardGeo, boardMat);
    topBoard.position.y = 0;
    boardGroup.add(topBoard);

    /**
     * ⚠️ DÓNDE CAE CADA HOYO, PUBLICADO — EL MISMO CONTRATO QUE `pintar3d`.
     *
     * Los hoyos de este tablero son AGUJEROS en una forma extruida, no mallas: no hay
     * nada a lo que ponerle nombre ni nada que proyectar. Por eso mancala salía «a
     * ciegas» en `tacto` —trescientos veinte toques repartidos por la pantalla— y su
     * cero no significaba que no se pudiera tocar, sino que no lo encontraba.
     *
     * Y le encaja igual que a un tablero de casillas, porque su jugada ES el índice del
     * hoyo (`0`…`5`): con una fila de seis, el índice de la casilla y el nombre de la
     * jugada son el mismo número. La geometría es la de arriba, sin duplicar cuentas.
     */
    boardGroup.userData.rejillaMundo = {
        cols: 6, filas: 1, lado: X_SPACING, dx: -3.25, dz: 1.0, y: 0,
    };
}
function syncMancalaState(state) {
    const board = state.board;
    const minimap = document.getElementById('minimapCanvas');
    if (minimap && board) {
        const ctx = minimap.getContext('2d');
        ctx.clearRect(0, 0, 128, 128);
        
        ctx.fillStyle = '#bb8855'; // board bg
        ctx.fill(new Path2D("M 10 40 L 118 40 A 10 10 0 0 1 128 50 L 128 78 A 10 10 0 0 1 118 88 L 10 88 A 10 10 0 0 1 0 78 L 0 50 A 10 10 0 0 1 10 40 Z"));
        
        ctx.fillStyle = '#221100'; // dark pit
        ctx.textAlign = 'center'; ctx.textBaseline='middle'; ctx.font='8px sans-serif';
        const dX = 14; const pX = 25;
        // P2 Pits (Top: 7-12)
        for (let i = 0; i < 6; i++) {
            const x = pX + (5-i)*dX; const y = 50;
            ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillText(board[i+7], x, y); ctx.fillStyle = '#221100';
        }
        // P1 Pits (Bottom: 0-5)
        for (let i = 0; i < 6; i++) {
            const x = pX + i*dX; const y = 78;
            ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillText(board[i], x, y); ctx.fillStyle = '#221100';
        }
        // P1 Store (Right)
        ctx.beginPath(); ctx.ellipse(115, 64, 6, 16, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff'; ctx.fillText(board[6], 115, 64); ctx.fillStyle='#221100';
        // P2 Store (Left)
        ctx.beginPath(); ctx.ellipse(13, 64, 6, 16, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff'; ctx.fillText(board[13], 13, 64);
    }

    while(piecesGroup.children.length > 0){ 
        piecesGroup.remove(piecesGroup.children[0]); 
    }

    // const board = state.board; // removed to fix syntax error
    // Helper to add random seeds in a radius
    function spawnSeeds(cx, cz, count, radius) {
                for(let j=0; j<count; j++) {
            const colors = [0xffffff, 0xf5f5f5, 0xeaeaea];
            // `clearcoat` es de MeshPhysicalMaterial, no de Standard: three.js
            // avisaba por cada semilla y llenaba la consola de ~200 líneas en
            // cada refresco. Con Physical el brillo se queda y la consola calla.
            const mat = new THREE.MeshPhysicalMaterial({
                color: colors[Math.floor(Math.random()*colors.length)],
                roughness: 0.05, metalness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.0
            });
            const seed = new THREE.Mesh(seedGeo, mat);
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * (radius - 0.15) * 0.8;
            seed.position.set(cx + Math.cos(angle)*r, -0.05 - (j*0.005), cz + Math.sin(angle)*r);
            piecesGroup.add(seed);
        }
    }

    // P1 Pits
    for (let i = 0; i < 6; i++) {
        spawnSeeds(-3.25 + i * X_SPACING, 1.0, board[i], PIT_RADIUS);
    }
    // P2 Pits
    for (let i = 0; i < 6; i++) {
        spawnSeeds(3.25 - i * X_SPACING, -1.0, board[i+7], PIT_RADIUS);
    }
    // Stores
    spawnSeeds(4.3, 0, board[6], STORE_WIDTH/2);
    spawnSeeds(-4.3, 0, board[13], STORE_WIDTH/2);
    
    // Update HUD
    const hudContainer = document.getElementById('custom-hud-status');
    if(hudContainer) {
        hudContainer.innerHTML = `Scores: White [${board[6]}] - Black [${board[13]}]`;
    }
}

engine.mountAgentHUD('hud-container', 'Oware Mancala', `
    <div class="minimap-block">
        <canvas id="minimapCanvas" width="128" height="128" style="background: rgba(5,5,10,0.9); border: 1px solid rgba(138,43,226,0.25); border-radius: 6px; margin: 0 auto; display: block;"></canvas>
    </div>
`);
engine.start();

// ═══════════════════════════════════════════════════════════════════
//  JUGAR CON EL RATÓN
// ═══════════════════════════════════════════════════════════════════
// Se pulsa el hueco que quieres sembrar. Solo los tuyos y solo si tienen
// semillas — eso lo decide el motor de reglas; aquí solo se traduce el punto
// del ratón al índice del hueco.
(function () {
    if (!window.ALISA_ENTRADA) return;

    const aCasilla = (x, z) => {
        // ¿Qué fila? La del jugador 0 está en z=+1; la del rival, en z=-1.
        const filaPropia = z > 0;
        if (Math.abs(Math.abs(z) - MANCALA_Z) > 0.9) return null;   // fuera de fila
        const i = Math.round((x - MANCALA_X0) / MANCALA_DX);
        if (i < 0 || i > 5) return null;
        // Los del rival van al revés y empiezan en el 7.
        return String(filaPropia ? i : 7 + (5 - i));
    };

    const posicionDe = (sq) => {
        const n = parseInt(sq, 10);
        if (isNaN(n)) return null;
        if (n <= 5) return { x: MANCALA_X0 + n * MANCALA_DX, z: MANCALA_Z };
        if (n >= 7 && n <= 12) {
            const i = 5 - (n - 7);
            return { x: MANCALA_X0 + i * MANCALA_DX, z: -MANCALA_Z };
        }
        return null;   // los graneros (6 y 13) no se pulsan
    };

    window.ALISA_ENTRADA.clicEnTablero(engine, {
        aCasilla, posicionDe, unSoloPaso: true, alturaMarca: 0.35,
    });
})();
