// go_visualizer.js — ALISA Sovereign Go Arena
// Clean architecture using SovereignBoardEngine + Procedural ThreeJS

let boardGroup = new THREE.Group();
let piecesGroup = new THREE.Group();

const GRID_SIZE = 19;
const SPACING = 0.8;
const BOARD_SIZE = (GRID_SIZE - 1) * SPACING;
const HALF_BOARD = BOARD_SIZE / 2;

const engine = new SovereignBoardEngine({
    gameId: 'go',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 14, 12);
        camera.lookAt(0, 0, 0);

        engine.controls = new THREE.OrbitControls(camera, renderer.domElement);
         engine.controls.enableDamping = true;
         engine.controls.dampingFactor = 0.08;
         engine.controls.maxPolarAngle = Math.PI / 2.1;
         engine.controls.minDistance = 5;
         engine.controls.maxDistance = 25;

        // Warm "Kaya" wood lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.45));
        const keyLight = new THREE.SpotLight(0xfff0dd, 2.0);
        keyLight.position.set(-8, 15, 8);
        keyLight.castShadow = true;
        scene.add(keyLight);
        scene.add(new THREE.SpotLight(0x4fc3f7, 0.8)).position.set(8, 12, -8);

        scene.add(boardGroup);
        scene.add(piecesGroup);
        
        buildBoard();
    },
    onStateSync: function(data) {
        if (data.state) syncGoState(data.state);
        else if (data.fen) syncGoState(data.fen);
        else if (data.board) syncGoState(data.board);
    },
    onFrame: function(time) {
        if (engine.controls) engine.controls.update();
    }
});

function createWhiteMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0xfdfdfd, roughness: 0.1, metalness: 0.05,
        clearcoat: 0.5, clearcoatRoughness: 0.2 // Clamshell sheen
    });
}

function createBlackMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x111111, roughness: 0.2, metalness: 0.1,
        clearcoat: 0.3, clearcoatRoughness: 0.3 // Slate sheen
    });
}

function buildBoard() {
    // Solid wooden block base (Goban)
    const baseMargin = 1.2;
    const blockGeo = new THREE.BoxGeometry(BOARD_SIZE + baseMargin*2, 1.5, BOARD_SIZE + baseMargin*2);
    // Yellowish Kaya Wood color
    const blockMat = new THREE.MeshStandardMaterial({ color: 0xe6b877, roughness: 0.8, metalness: 0.0 });
    const block = new THREE.Mesh(blockGeo, blockMat);
    block.position.y = -0.75;
    block.receiveShadow = true;
    boardGroup.add(block);

    // Draw lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const lineGeoX = new THREE.BoxGeometry(BOARD_SIZE, 0.02, 0.04);
    const lineGeoZ = new THREE.BoxGeometry(0.04, 0.02, BOARD_SIZE);

    for (let i = 0; i < GRID_SIZE; i++) {
        const offset = i * SPACING - HALF_BOARD;
        
        // Horizontal lines
        const lx = new THREE.Mesh(lineGeoX, lineMat);
        lx.position.set(0, 0.01, offset);
        boardGroup.add(lx);

        // Vertical lines
        const lz = new THREE.Mesh(lineGeoZ, lineMat);
        lz.position.set(offset, 0.01, 0);
        boardGroup.add(lz);
    }
    
    // Hoshi points (Star points) for 19x19
    const hoshiGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16);
    const stars = [3, 9, 15];
    for (let rx of stars) {
        for (let ry of stars) {
            const h = new THREE.Mesh(hoshiGeo, lineMat);
            h.position.set(rx * SPACING - HALF_BOARD, 0.01, ry * SPACING - HALF_BOARD);
            boardGroup.add(h);
        }
    }
}

function spawnStone(isWhite, x, y) {
    const geo = new THREE.SphereGeometry(0.38, 32, 16);
    const mat = isWhite ? createWhiteMaterial() : createBlackMaterial();
    const stone = new THREE.Mesh(geo, mat);
    
    // Flatten the sphere slightly to look like a Yunzi stone
    stone.scale.set(1, 0.45, 1);
    
    const posX = x * SPACING - HALF_BOARD;
    const posZ = y * SPACING - HALF_BOARD;
    
    stone.position.set(posX, 0.18, posZ);
    stone.castShadow = true;
    stone.receiveShadow = true;
    
    piecesGroup.add(stone);
}

function syncGoState(state) {
    const b = state.board;
    const minimap = document.getElementById('minimapCanvas');
    if (minimap && b) {
        const ctx = minimap.getContext('2d');
        ctx.clearRect(0, 0, 128, 128);
        const cz = 128 / 19;
        ctx.strokeStyle = '#223';
        for (let i = 0; i < 19; i++) {
            ctx.beginPath(); ctx.moveTo(cz/2, i*cz+cz/2); ctx.lineTo(128-cz/2, i*cz+cz/2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(i*cz+cz/2, cz/2); ctx.lineTo(i*cz+cz/2, 128-cz/2); ctx.stroke();
        }
        for (let r = 0; r < 19; r++) {for (let c = 0; c < 19; c++) {
            if (b[r][c] !== 0) {
                ctx.beginPath(); ctx.arc(c*cz+cz/2, r*cz+cz/2, cz/2.2, 0, Math.PI*2);
                ctx.fillStyle = b[r][c] === 1 ? '#000' : '#fff';
                ctx.fill();
                ctx.lineWidth=1; ctx.strokeStyle='#555'; ctx.stroke();
            }
        }}
    }

    // Clear pieces
    while (piecesGroup.children.length > 0) {
        piecesGroup.remove(piecesGroup.children[0]);
    }
    
    if (!state) return;
    
    // Parsing logic for whatever array/matrix format the Go engine uses.
    // Assume state is an array of arrays or flat 361 array.
    // 0 = empty, 1 = Black, 2 = White (standard ML representation)
    if (Array.isArray(state)) {
        if (state.length === 19) {
            // 2D Array
            for (let y = 0; y < 19; y++) {
                for (let x = 0; x < 19; x++) {
                    const val = state[y][x];
                    if (val === 1 || val === 'B' || val === 'b') spawnStone(false, x, y);
                    if (val === 2 || val === 'W' || val === 'w') spawnStone(true, x, y);
                }
            }
        } else if (state.length === 361) {
            // Flat Array
            for (let i = 0; i < 361; i++) {
                const y = Math.floor(i / 19);
                const x = i % 19;
                const val = state[i];
                if (val === 1 || val === 'B' || val === 'b') spawnStone(false, x, y);
                if (val === 2 || val === 'W' || val === 'w') spawnStone(true, x, y);
            }
        }
    } else if (typeof state === 'string') {
        // String format (e.g. 361 chars 'E','W','B')
        const clean = state.replace(/\s/g, '');
        for (let i = 0; i < Math.min(361, clean.length); i++) {
            const y = Math.floor(i / 19);
            const x = i % 19;
            const char = clean[i];
            if (char === 'B' || char === 'b' || char === '1') spawnStone(false, x, y);
            if (char === 'W' || char === 'w' || char === '2') spawnStone(true, x, y);
        }
    }
}

engine.mountAgentHUD('hud-container', 'Sovereign Go', `
    <div style="font-size:10px; color:#a180ff; text-align:center; padding: 5px;">
        19x19 Goban Protocol Activated
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
    // ⚠️ Aquí había `SZ = 1.0, OFFX = -8.5` — constantes INVENTADAS. Las de
    // verdad son las que usa este mismo fichero para colocar las piedras
    // (`x * SPACING - HALF_BOARD`, con SPACING 0.8). Con las inventadas cada
    // clic caía en una intersección que no era, así que no coincidía con
    // ninguna jugada legal y no pasaba nada. Se atan a las reales.
    const LETRAS = 'abcdefghijklmnopqrs';

    const aCasilla = (x, z) => {
        const c = Math.round((x + HALF_BOARD) / SPACING);
        const f = Math.round((z + HALF_BOARD) / SPACING);
        if (c < 0 || c >= GRID_SIZE || f < 0 || f >= GRID_SIZE) return null;
        return LETRAS[c] + (GRID_SIZE - f);
    };
    const posicionDe = (sq) => {
        const c = LETRAS.indexOf(sq[0]);
        const n = parseInt(sq.slice(1), 10);
        if (c < 0 || isNaN(n) || n < 1 || n > GRID_SIZE) return null;
        const f = GRID_SIZE - n;
        return { x: c * SPACING - HALF_BOARD, z: f * SPACING - HALF_BOARD };
    };

    window.ALISA_ENTRADA.clicEnTablero(engine, {
        aCasilla, posicionDe, unSoloPaso: true, alturaMarca: 0.25,
    });
})();
