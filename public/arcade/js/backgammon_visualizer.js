// backgammon_visualizer.js — ALISA Sovereign Arena
let boardGroup = new THREE.Group();
let piecesGroup = new THREE.Group();

const POINT_WIDTH = 0.6;
const POINT_LENGTH = 4.0;
const POINT_SPACING = 0.65;
const BOARD_GAP = 1.0; // The middle bar

let whiteMat, blackMat, pointDarkMat, pointLightMat, boardMat, coinGeo;

const engine = new SovereignBoardEngine({
    gameId: 'backgammon',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 10, 8);
        camera.lookAt(0, 0, 0);

        engine.controls = new THREE.OrbitControls(camera, renderer.domElement);
        engine.controls.enableDamping = true;
        engine.controls.dampingFactor = 0.08;
        engine.controls.maxPolarAngle = Math.PI / 2.1;
        
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);

        // Geometries & Materials
        coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.15, 32);
        whiteMat = new THREE.MeshStandardMaterial({ color: 0xE0E0E0, roughness: 0.2 });
        blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
        
        pointDarkMat = new THREE.MeshBasicMaterial({ color: 0x8a2be2 }); // ALISA Purple
        pointLightMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        boardMat = new THREE.MeshStandardMaterial({ color: 0xbb9977, roughness: 0.9 }); // Wooden base

        scene.add(boardGroup);
        scene.add(piecesGroup);
        
        buildBoard();
    },
    onStateSync: function(data) {
        if (data.board) syncBackgammonState(data);
    }
});

function buildBoard() {
    // Base wood
    const base = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 9), boardMat);
    base.position.y = -0.25;
    boardGroup.add(base);

    // Draw the 24 triangles
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(POINT_WIDTH/2, POINT_LENGTH);
    shape.lineTo(POINT_WIDTH, 0);
    shape.lineTo(0, 0);
    
    const geom = new THREE.ShapeGeometry(shape);
    // Rotate to lie flat
    geom.rotateX(-Math.PI/2);
    
    // Bottom 12 points (1-12 in pygammon array indices 0..11)
    // Points 1-6 are on the right, 7-12 are on the left
    for (let i = 0; i < 12; i++) {
        const mat = (i % 2 === 0) ? pointDarkMat : pointLightMat;
        const mesh = new THREE.Mesh(geom, mat);
        let xOffset = (11 - i) * POINT_SPACING - 3.9;
        if (i < 6) xOffset += BOARD_GAP; // Shift the right quadrant
        
        mesh.position.set(xOffset, 0.01, 4.2);
        boardGroup.add(mesh);
    }

    // Top 12 points (13-24 in pygammon array indices 12..23)
    const geomTop = geom.clone();
    geomTop.rotateY(Math.PI); // Flipped pointing down
    for (let i = 0; i < 12; i++) {
        const mat = (i % 2 === 0) ? pointDarkMat : pointLightMat;
        const mesh = new THREE.Mesh(geomTop, mat);
        let xOffset = i * POINT_SPACING - 3.9;
        if (i >= 6) xOffset += BOARD_GAP;
        
        mesh.position.set(xOffset + POINT_WIDTH, 0.01, -4.2);
        boardGroup.add(mesh);
    }
}

function syncBackgammonState(data) {
    // Clear pieces
    while(piecesGroup.children.length > 0){ 
        piecesGroup.remove(piecesGroup.children[0]); 
    }

    // 0..11 -> bottom. 12..23 -> top.
    const board = data.board;
    for (let i = 0; i < 24; i++) {
        const count = board[i];
        if (count !== 0) {
            const isWhite = count > 0;
            const absCount = Math.abs(count);
            
            // Calculate XY
            let isTop = i >= 12;
            let logicalX = isTop ? (i - 12) : (11 - i); 
            
            let xOffset = logicalX * POINT_SPACING - 3.9;
            if (logicalX >= 6) xOffset += BOARD_GAP;
            xOffset += POINT_WIDTH/2;
            
            for(let p=0; p<absCount; p++) {
                const mesh = new THREE.Mesh(coinGeo, isWhite ? whiteMat : blackMat);
                let zOffset = isTop ? -4.0 + (p * 0.3) : 4.0 - (p * 0.3);
                mesh.position.set(xOffset, 0.1, zOffset);
                piecesGroup.add(mesh);
            }
        }
    }
    
    // Draw Bar
    if (data.bar.white > 0) {
        for(let p=0; p<data.bar.white; p++) {
            const m = new THREE.Mesh(coinGeo, whiteMat);
            m.position.set(0, 0.1, 1.0 + p*0.3);
            piecesGroup.add(m);
        }
    }
    if (data.bar.black > 0) {
        for(let p=0; p<data.bar.black; p++) {
            const m = new THREE.Mesh(coinGeo, blackMat);
            m.position.set(0, 0.1, -1.0 - p*0.3);
            piecesGroup.add(m);
        }
    }
    
    // Update HUD
    const hudHtml = `
        <div style="font-size:11px; margin-bottom:5px;">
            <span style="color:#FFF;">Dice:</span> <span style="color:#FFA500;">[${data.dice.join(', ')}]</span><br>
            <span style="color:#AAA;">Unused:</span> ${data.unused_dice.join(', ')}
        </div>
        <div style="font-size:10px; color:#2ecc71;">
            🟢 PyGammon Hub Connected
        </div>
    `;
    document.getElementById('hud-container').innerHTML = engine.baseHudHTML(hudHtml, data.turn);
}

engine.mountAgentHUD('hud-container', 'Stochastic Backgammon', `
    <div style="font-size:10px; text-align:center; padding:5px; color:#FFD700;">
        Syncing with PyGammon...
    </div>
`);
engine.start();
