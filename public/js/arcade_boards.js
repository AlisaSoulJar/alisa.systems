
// ALISA Arcade Board Generators

window.buildReversiBoard = function(boardGroup, piecesGroup) {
    const size = 1;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const geo = new THREE.BoxGeometry(size * 0.95, 0.2, size * 0.95);
            const mat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.8 });
            const sq = new THREE.Mesh(geo, mat);
            sq.position.set(c - 3.5, -0.1, r - 3.5);
            sq.receiveShadow = true;
            boardGroup.add(sq);
        }
    }
    
    const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 32);
    const mEdge = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const mw = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const mb = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });

    function spawn(r, c, isW) {
        const coin = new THREE.Mesh(coinGeo, [mEdge, mw, mb]);
        coin.rotation.x = isW ? 0 : Math.PI;
        coin.position.set(c - 3.5, 0.1, r - 3.5);
        coin.castShadow = true;
        piecesGroup.add(coin);
    }
    spawn(3, 3, true); spawn(4, 4, true);
    spawn(3, 4, false); spawn(4, 3, false);
};

window.buildMancalaBoard = function(boardGroup, piecesGroup) {
    const PIT_RADIUS = 0.5;
    const STORE_WIDTH = 1.0;
    const STORE_LENGTH = 3.0;
    const X_SPACING = 1.3;

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
    
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xbb8855, roughness: 0.8 });
    const topBoard = new THREE.Mesh(boardGeo, boardMat);
    topBoard.position.y = 0;
    topBoard.castShadow = true;
    topBoard.receiveShadow = true;
    boardGroup.add(topBoard);

    // Initial seeds (4 per pit)
    const seedGeo = new THREE.SphereGeometry(0.12, 16, 16);
    function spawnSeeds(cx, cz, count) {
        for(let j=0; j<count; j++) {
            const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05 });
            const seed = new THREE.Mesh(seedGeo, mat);
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * (PIT_RADIUS - 0.15) * 0.8;
            seed.position.set(cx + Math.cos(angle)*r, -0.05 - (j*0.005), cz + Math.sin(angle)*r);
            seed.castShadow = true;
            piecesGroup.add(seed);
        }
    }

    for (let i = 0; i < 6; i++) {
        spawnSeeds(-3.25 + i * X_SPACING, 1.0, 4);
        spawnSeeds(3.25 - i * X_SPACING, -1.0, 4);
    }
};


// ═══════════════════════════════════════════════════
// CHECKERS (DAMAS)
// ═══════════════════════════════════════════════════
window.buildCheckersBoard = function(boardGroup, piecesGroup) {
    const SQUARE_SIZE = 1.0;
    const HALF_BOARD = 4.0;
    
    const geo = new THREE.BoxGeometry(SQUARE_SIZE, 0.5, SQUARE_SIZE);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.8 });

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const isDark = (r + c) % 2 !== 0;
            const mesh = new THREE.Mesh(geo, isDark ? darkMat : lightMat);
            mesh.position.set(
                c * SQUARE_SIZE - HALF_BOARD + SQUARE_SIZE / 2,
                -0.25,
                r * SQUARE_SIZE - HALF_BOARD + SQUARE_SIZE / 2
            );
            mesh.receiveShadow = true;
            boardGroup.add(mesh);
        }
    }

    // Default Starting pieces for Checkers (Standard 8x8)
    const coinGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 32);
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xF0F0F0, roughness: 0.3, metalness: 0.1 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0xCC1111, roughness: 0.3, metalness: 0.1 });

    function spawnChecker(r, c, material) {
        const mesh = new THREE.Mesh(coinGeo, material);
        mesh.position.set(
            c * SQUARE_SIZE - HALF_BOARD + SQUARE_SIZE / 2,
            0.075,
            r * SQUARE_SIZE - HALF_BOARD + SQUARE_SIZE / 2
        );
        mesh.castShadow = true;
        piecesGroup.add(mesh);
    }
    
    // Top 3 rows for Black (Red actually)
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 !== 0) spawnChecker(r, c, blackMat);
        }
    }
    // Bottom 3 rows for White
    for (let r = 5; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 !== 0) spawnChecker(r, c, whiteMat);
        }
    }
};

// ═══════════════════════════════════════════════════
// GO (BADUK)
// ═══════════════════════════════════════════════════
window.buildGoBoard = function(boardGroup, piecesGroup) {
    const GRID_DIVISIONS = 18;
    const BOARD_SIZE = 10.0;
    const SPACING = BOARD_SIZE / GRID_DIVISIONS;

    const boardMat = new THREE.MeshStandardMaterial({ color: 0xE3C185, roughness: 0.9 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(BOARD_SIZE + 0.8, 0.5, BOARD_SIZE + 0.8), boardMat);
    base.position.y = -0.25;
    base.receiveShadow = true;
    boardGroup.add(base);

    const grid = new THREE.GridHelper(BOARD_SIZE, GRID_DIVISIONS, 0x000000, 0x000000);
    grid.position.y = 0.01;
    grid.material.opacity = 0.6;
    grid.material.transparent = true;
    boardGroup.add(grid);
    
    const points = [3, 9, 15];
    const hoshiGeo = new THREE.CircleGeometry(0.06, 16);
    const hoshiMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    hoshiGeo.rotateX(-Math.PI/2);
    
    for (const x of points) {
        for (const y of points) {
            const dot = new THREE.Mesh(hoshiGeo, hoshiMat);
            dot.position.set((x - 9) * SPACING, 0.012, (y - 9) * SPACING);
            boardGroup.add(dot);
        }
    }
    
    // Visual mockup: 2 stones placed
    const stoneGeo = new THREE.SphereGeometry(SPACING * 0.45, 32, 16);
    stoneGeo.scale(1, 0.4, 1);
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.2 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xF5F5F5, roughness: 0.1, metalness: 0.1 });

    function placeStone(cx, cy, mat) {
        const mesh = new THREE.Mesh(stoneGeo, mat);
        mesh.position.set((cx - 9) * SPACING, 0.08, (cy - 9) * SPACING);
        mesh.castShadow = true;
        piecesGroup.add(mesh);
    }
    
    placeStone(15, 3, blackMat);
    placeStone(3, 15, whiteMat);
    placeStone(16, 15, blackMat);
    placeStone(16, 4, whiteMat);
};

// ═══════════════════════════════════════════════════
// XIANGQI (CHINESE CHESS)
// ═══════════════════════════════════════════════════
window.buildXiangqiBoard = function(boardGroup, piecesGroup) {
    const GRID_ROWS = 9;   
    const GRID_COLS = 8;
    
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xF3E5AB, roughness: 0.9 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(GRID_COLS + 1.0, 0.3, GRID_ROWS + 1.0), boardMat);
    base.position.y = -0.16;
    base.receiveShadow = true;
    boardGroup.add(base);

    const lineMat = new THREE.LineBasicMaterial({ color: 0x000000 });
    for(let r=0; r<=9; r++){
        const pts = [];
        pts.push(new THREE.Vector3(-4, 0.01, r - 4.5));
        pts.push(new THREE.Vector3(4, 0.01, r - 4.5));
        boardGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    
    for(let c=0; c<=8; c++){
        let x = c - 4;
        const pts1 = [new THREE.Vector3(x, 0.01, -4.5), new THREE.Vector3(x, 0.01, -0.5)];
        const pts2 = [new THREE.Vector3(x, 0.01, 0.5),  new THREE.Vector3(x, 0.01, 4.5)];
        boardGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), lineMat));
        boardGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), lineMat));
        
        if(c === 0 || c === 8) {
            const pts3 = [new THREE.Vector3(x, 0.01, -0.5), new THREE.Vector3(x, 0.01, 0.5)];
            boardGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts3), lineMat));
        }
    }
    
    // Fake Xiangqi setup piece for aesthetics
    const pieceGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 32);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.2 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 });

    function placePiece(c, r, mat) {
        const mesh = new THREE.Mesh(pieceGeo, mat);
        mesh.position.set(c - 4, 0.08, r - 4.5);
        mesh.castShadow = true;
        piecesGroup.add(mesh);
    }
    
    placePiece(4, 0, blackMat); // General
    placePiece(4, 9, redMat); // General
    placePiece(1, 2, blackMat); // Cannon
    placePiece(7, 2, blackMat); // Cannon
    placePiece(1, 7, redMat); // Cannon
    placePiece(7, 7, redMat); // Cannon
};

// ═══════════════════════════════════════════════════
// BACKGAMMON (TABLAS REALES)
// ═══════════════════════════════════════════════════
window.buildBackgammonBoard = function(boardGroup, piecesGroup) {
    const POINT_WIDTH = 0.6;
    const POINT_LENGTH = 4.0;
    const POINT_SPACING = 0.65;
    const BOARD_GAP = 1.0;

    const boardMat = new THREE.MeshStandardMaterial({ color: 0xbb9977, roughness: 0.9 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 9), boardMat);
    base.position.y = -0.25;
    base.receiveShadow = true;
    boardGroup.add(base);

    const pointDarkMat = new THREE.MeshBasicMaterial({ color: 0x8a2be2 });
    const pointLightMat = new THREE.MeshBasicMaterial({ color: 0x333333 });

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(POINT_WIDTH / 2, POINT_LENGTH);
    shape.lineTo(POINT_WIDTH, 0);
    shape.lineTo(0, 0);

    const geom = new THREE.ShapeGeometry(shape);
    geom.rotateX(-Math.PI / 2);

    // Bottom 12 points
    for (let i = 0; i < 12; i++) {
        const mat = (i % 2 === 0) ? pointDarkMat : pointLightMat;
        const mesh = new THREE.Mesh(geom, mat);
        let xOffset = (11 - i) * POINT_SPACING - 3.9;
        if (i < 6) xOffset += BOARD_GAP;
        mesh.position.set(xOffset, 0.01, 4.2);
        boardGroup.add(mesh);
    }

    // Top 12 points
    const geomTop = geom.clone();
    geomTop.rotateY(Math.PI);
    for (let i = 0; i < 12; i++) {
        const mat = (i % 2 === 0) ? pointDarkMat : pointLightMat;
        const mesh = new THREE.Mesh(geomTop, mat);
        let xOffset = i * POINT_SPACING - 3.9;
        if (i >= 6) xOffset += BOARD_GAP;
        mesh.position.set(xOffset + POINT_WIDTH, 0.01, -4.2);
        boardGroup.add(mesh);
    }

    // Sample pieces
    const coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.15, 32);
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xE0E0E0, roughness: 0.2 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });

    function spawnCoin(x, z, isWhite, stack) {
        for (let s = 0; s < stack; s++) {
            const mesh = new THREE.Mesh(coinGeo, isWhite ? whiteMat : blackMat);
            mesh.position.set(x, 0.1 + s * 0.16, z);
            mesh.castShadow = true;
            piecesGroup.add(mesh);
        }
    }

    // Standard backgammon initial position (simplified)
    spawnCoin(3.35, 4.0, true, 2);
    spawnCoin(-3.9, 4.0, false, 5);
    spawnCoin(-2.6, -4.0, true, 5);
    spawnCoin(3.35, -4.0, false, 2);
};

