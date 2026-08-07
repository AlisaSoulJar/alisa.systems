// reversi_visualizer.js — ALISA Sovereign Reversi Arena
// Clean architecture using SovereignBoardEngine

let boardGroup;
let pieces = {};
let currentFen = "";

const engine = new SovereignBoardEngine({
    gameId: 'reversi',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 10, 8);
        camera.lookAt(0, 0, 0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);

        // El ratón, igual que en go: mismo módulo, otra configuración. Aquí el
        // tablero es 8×8 con celda 1 centrada en el origen — se ve en
        // `createBoard()`: `sq.position.set(c - 3.5, -0.1, r - 3.5)`.
        import('./raton_tablero.js').then(({ engancharRaton, nombrarLetraNumero }) => {
            engancharRaton({
                engine, modo: 'colocar',
                columnas: 8, filas: 8, paso: 1,
                origen: { x: -3.5, z: -3.5 },
                nombrar: nombrarLetraNumero({ filas: 8 }),
            });
        });

        boardGroup = new THREE.Group();
        scene.add(boardGroup);

        createBoard();
    },
    onStateSync: function(data) {
        // Count discs from FEN (Reversi specific UI)
        const fenBoard = (data.fen || "").split(" ")[0];
        const wCount = (fenBoard.match(/W/g) || []).length;
        const bCount = (fenBoard.match(/B/g) || []).length;
        const wEl = document.getElementById('white-discs');
        const bEl = document.getElementById('black-discs');
        if (wEl) wEl.innerText = wCount;
        if (bEl) bEl.innerText = bCount;

        syncFenToBoard(data.fen);
    }
});

// Custom overriding of UI reset to clear local pieces safely
const baseRestart = engine.restartGame.bind(engine);
engine.restartGame = async () => {
    for (const sq in pieces) boardGroup.remove(pieces[sq]);
    pieces = {}; currentFen = "";
    await baseRestart();
};

const baseUndo = engine.undoMove.bind(engine);
engine.undoMove = async () => {
    for (const sq in pieces) boardGroup.remove(pieces[sq]);
    pieces = {}; currentFen = "";
    await baseUndo();
};

// ═══════════════════════════════════════════════════════════════════
// BOARD PROCEDURAL MESHES
// ═══════════════════════════════════════════════════════════════════

function createBoard() {
    const size = 1;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const geo = new THREE.BoxGeometry(size * 0.95, 0.2, size * 0.95);
            const mat = new THREE.MeshStandardMaterial({ 
                color: 0x2e8b57,
                roughness: 0.8
            });
            const sq = new THREE.Mesh(geo, mat);
            sq.position.set(c - 3.5, -0.1, r - 3.5);
            boardGroup.add(sq);
        }
    }
}

function algebraicToPos(sq) {
    const c = sq.charCodeAt(0) - 97;
    const r = 8 - parseInt(sq[1]);
    return { x: c - 3.5, y: 0.1, z: r - 3.5 };
}

function createCoinMesh() {
    const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 32);
    const matEdge = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });
    const matTop = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const matBot = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
    
    const mesh = new THREE.Mesh(geo, [matEdge, matTop, matBot]);
    return mesh;
}

function syncFenToBoard(fen) {
    if (fen === currentFen) return;
    currentFen = fen;
    
    const boardPart = fen.split(" ")[0];
    const rows = boardPart.split("/");
    
    // Track which squares should have pieces
    const activeSqs = new Set();
    
    let r = 0;
    for (const row of rows) {
        let c = 0;
        for (const char of row) {
            if (!isNaN(parseInt(char))) {
                c += parseInt(char);
            } else {
                const isWhite = char === 'W';
                const file = String.fromCharCode(97 + c);
                const rank = 8 - r;
                const sq = `${file}${rank}`;
                activeSqs.add(sq);
                
                if (!pieces[sq]) {
                    const p = createCoinMesh();
                    p._isWhite = isWhite;
                    p.rotation.x = isWhite ? 0 : Math.PI; 
                    
                    const pos = algebraicToPos(sq);
                    p.position.set(pos.x, 3, pos.z);
                    boardGroup.add(p);
                    pieces[sq] = p;
                    
                    if (typeof TWEEN !== 'undefined') {
                        new TWEEN.Tween(p.position)
                            .to({ y: pos.y }, 600)
                            .easing(TWEEN.Easing.Bounce.Out)
                            .start();
                    } else {
                        p.position.y = pos.y;
                    }
                } else {
                    const p = pieces[sq];
                    if (p._isWhite !== isWhite) {
                        p._isWhite = isWhite;
                        if (typeof TWEEN !== 'undefined') {
                            new TWEEN.Tween(p.rotation)
                                .to({ x: isWhite ? 0 : Math.PI }, 500)
                                .easing(TWEEN.Easing.Quadratic.InOut)
                                .start();
                            new TWEEN.Tween(p.position)
                                .to({ y: 0.6 }, 250)
                                .yoyo(true).repeat(1)
                                .easing(TWEEN.Easing.Quadratic.Out)
                                .start();
                        } else {
                            p.rotation.x = isWhite ? 0 : Math.PI;
                        }
                    }
                }
                c++;
            }
        }
        r++;
    }
    
    // Remove pieces no longer on board (undo support)
    for (const sq in pieces) {
        if (!activeSqs.has(sq)) {
            boardGroup.remove(pieces[sq]);
            delete pieces[sq];
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════

engine.mountAgentHUD('hud-container', 'Sovereign Reversi', `
    <div class="disc-counts">
        <span class="white-count">⚪ <span id="white-discs">2</span></span>
        <span class="black-count">⚫ <span id="black-discs">2</span></span>
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
    const N = 8, SZ = 1.0, OFFX = -3.0, OFFZ = -3.0;
    const LETRAS = 'abcdefgh';
    const FILAS = 8;

    const aCasilla = (x, z) => {
        const c = Math.round((x - OFFX) / SZ);
        const f = Math.round((z - OFFZ) / SZ);
        if (c < 0 || c >= N || f < 0 || f >= FILAS) return null;
        return LETRAS[c] + (8 - f);
    };
    const posicionDe = (sq) => {
        const c = LETRAS.indexOf(sq[0]);
        const n = parseInt(sq.slice(1), 10);
        if (c < 0 || isNaN(n)) return null;
        const f = 8 - n;
        return { x: OFFX + c * SZ, z: OFFZ + f * SZ };
    };

    window.ALISA_ENTRADA.clicEnTablero(engine, {
        aCasilla, posicionDe, unSoloPaso: true, alturaMarca: 0.25,
    });
})();
