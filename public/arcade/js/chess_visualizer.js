// chess_visualizer.js — ALISA Sovereign Chess Arena
// Clean architecture using SovereignBoardEngine

let boardGroup = new THREE.Group();
let piecesGroup = new THREE.Group();

const PREFABS = {};
const SQUARE_SIZE = 1.0;
const HALF_BOARD = 4.0;

// FEN char → piece type
const FEN_MAP = {
    'p': 'Pawn', 'r': 'Rook', 'n': 'Knight',
    'b': 'Bishop', 'q': 'Queen', 'k': 'King'
};
const UNICODE_PIECES = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

const engine = new SovereignBoardEngine({
    gameId: 'chess',
    onInit3D: function(scene, camera, renderer) {
        camera.position.set(0, 8, 10);
        camera.lookAt(0, 0, 0);

        // Controls
        engine.controls = new THREE.OrbitControls(camera, renderer.domElement);
        engine.controls.enableDamping = true;
        engine.controls.dampingFactor = 0.08;
        engine.controls.maxPolarAngle = Math.PI / 2.1;
        engine.controls.minDistance = 5;
        engine.controls.maxDistance = 20;

        /**
         * ═══════════════════════════════════════════════════════════════════
         *  LA LUZ CLAVE ES NEUTRA. EL COLOR VA EN LOS ACENTOS.
         * ═══════════════════════════════════════════════════════════════════
         *
         * ⚠️ AQUÍ LA LUZ PRINCIPAL ERA VIOLETA A 2.5, Y SE COMÍA EL JUEGO.
         *
         * Mirando la captura dije «las piezas son cilindros y cajas genéricas». Era
         * FALSO, y preguntándoselo al navegador salió lo contrario: las 32 piezas son
         * Staunton de verdad —28 torneadas con `LatheGeometry` y 4 caballos
         * extruidos— y sus materiales son correctos:
         *
         *     piezas blancas   #f0f0f0        casillas claras   #d8d2c8
         *     piezas negras    #080808        casillas oscuras  #2a2a35
         *
         * O sea que el tablero nunca fue morado ni las piezas rosas. Lo eran las
         * LUCES: un foco violeta (#8A2BE2) a intensidad 2.5 contra un ambiente neutro
         * de 0.4. Con las piezas blancas a rugosidad 0.15 y algo de metal, reflejaban
         * el violeta y salían rosa fucsia — encima de casillas teñidas del mismo
         * violeta. En un ajedrez eso no es estilo: es no distinguir los bandos.
         *
         * Es dirección de arte básica y se cumplía al revés: **el color de acento no
         * puede ser la luz clave**. Ahora la clave es cálida y neutra, el ambiente
         * sube, y el cian y el rosa se quedan como acentos —que es donde el neón hace
         * su trabajo sin discutirle la silueta a las piezas—. El fondo, el panel y la
         * niebla no se tocan: la identidad del sitio sigue donde estaba.
         *
         * Probado en vivo antes de escribirlo, comparando las dos capturas.
         */
        scene.add(new THREE.AmbientLight(0xffffff, 1.1));

        const keyLight = new THREE.SpotLight(0xfff4e0, 2.2);
        keyLight.position.set(-6, 12, 6);
        keyLight.angle = Math.PI / 4;
        keyLight.penumbra = 0.6;
        keyLight.castShadow = true;
        scene.add(keyLight);

        const fillLight = new THREE.SpotLight(0x4fc3f7, 0.5);
        fillLight.position.set(6, 10, -6);
        fillLight.penumbra = 0.8;
        scene.add(fillLight);

        const rimLight = new THREE.PointLight(0xff4081, 0.25);
        rimLight.position.set(0, 3, -8);
        scene.add(rimLight);

        // Build scene
        scene.add(boardGroup);
        scene.add(piecesGroup);
        buildBoard();
        forgePieces();
    },
    onStateSync: function(data) {
        if (data.fen) syncBoardState(data.fen);
    },
    onFrame: function(time) {
        if (engine.controls) engine.controls.update();
    }
});

function createWhiteMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0xf0f0f0, roughness: 0.15, metalness: 0.25,
        emissive: 0x111111, emissiveIntensity: 0.05
    });
}
function createBlackMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x080808, roughness: 0.85, metalness: 0.05,
        emissive: 0x000000, emissiveIntensity: 0.0
    });
}

// ═══════════════════════════════════════════════════════════════════
// BOARD BUILDER — Grid, Border, Coordinates
// ═══════════════════════════════════════════════════════════════════

function buildBoard() {
    const geo = new THREE.BoxGeometry(SQUARE_SIZE, 0.2, SQUARE_SIZE);
    /**
     * ⚠️ LA CASILLA CLARA ERA CASI LA PIEZA BLANCA. `0xe8e5e0` CONTRA `0xf0f0f0`.
     *
     * Dieciséis puntos sobre 255. Se ven porque las luces de esta escena son fuertes
     * y las piezas llevan sombra propia, o sea que la SILUETA la está haciendo la
     * iluminación y no el color. Eso funciona hasta que alguien toca una luz.
     *
     * Lo encontró `legibilidad.mjs` comparando materiales, y de paso me corrigió: yo
     * había mirado la captura y dicho «las negras sobre las oscuras casi no tienen
     * silueta». Las negras están a 45 de las casillas oscuras, holgadas. Lo que yo
     * leía como poco contraste era la penumbra de esa mitad del tablero.
     *
     * Marfil cálido contra blanco frío: es la diferencia de siempre en un tablero de
     * verdad, y sube la distancia a 40.
     */
    const matLight = new THREE.MeshStandardMaterial({ color: 0xd8d2c8, roughness: 0.65, metalness: 0.05 });
    const matDark  = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.6, metalness: 0.1 });

    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const isLight = (rank + file) % 2 !== 0;
            const square = new THREE.Mesh(geo, isLight ? matLight : matDark);
            const x = file * SQUARE_SIZE - HALF_BOARD + SQUARE_SIZE / 2;
            const z = rank * SQUARE_SIZE - HALF_BOARD + SQUARE_SIZE / 2;
            square.position.set(x, -0.1, z);
            square.receiveShadow = true;
            boardGroup.add(square);
        }
    }

    /**
     * ⚠️ DÓNDE CAE CADA CASILLA, PUBLICADO — EL MISMO CONTRATO QUE `pintar3d`.
     *
     * Una pieza se puede comprobar desde fuera porque su malla lleva nombre. Una
     * casilla no tenía nada equivalente, y sin eso «¿se puede jugar tocando el
     * tablero?» sólo se podía medir con una rejilla a ciegas, cuyo cero no distingue
     * «no se puede tocar» de «no lo encontré».
     *
     * Intenté deducirlo de la escena y salió el SUELO de la habitación en tres juegos
     * de seis, sin un solo error. Son seis números y aquí ya están calculados: la
     * casilla (c,f) cae en (c·lado + dx, f·lado + dz).
     */
    boardGroup.userData.rejillaMundo = {
        cols: 8, filas: 8, lado: SQUARE_SIZE,
        dx: -HALF_BOARD + SQUARE_SIZE / 2, dz: -HALF_BOARD + SQUARE_SIZE / 2, y: 0,
    };

    // Outer border
    const borderGeo = new THREE.BoxGeometry(SQUARE_SIZE * 8.6, 0.3, SQUARE_SIZE * 8.6);
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x0c0c12, metalness: 0.9, roughness: 0.1 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(0, -0.25, 0);
    boardGroup.add(border);

    // Coordinate labels
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let i = 0; i < 8; i++) {
        // Rank numbers (1-8) on left edge
        const rankSpr = createCoordSprite((8 - i).toString());
        rankSpr.position.set(-HALF_BOARD - 0.5, 0.1, i * SQUARE_SIZE - HALF_BOARD + SQUARE_SIZE / 2);
        boardGroup.add(rankSpr);

        // File letters (a-h) on bottom edge
        const fileSpr = createCoordSprite(files[i]);
        fileSpr.position.set(i * SQUARE_SIZE - HALF_BOARD + SQUARE_SIZE / 2, 0.1, HALF_BOARD + 0.5);
        boardGroup.add(fileSpr);
    }
}

function createCoordSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'Bold 38px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(0.5, 0.5, 1);
    return sprite;
}

// ═══════════════════════════════════════════════════════════════════
// PROCEDURAL GEOMETRY FORGE — High-Fidelity Staunton Profiles
// Uses CubicBezierCurve3 for silk-smooth lathe silhouettes
// ═══════════════════════════════════════════════════════════════════

function forgePieces() {
    // Helper: build a smooth profile from control segments, sample N points
    function profileFromCurves(curveSegments, sampleCount = 40) {
        const points = [];
        const perSegment = Math.max(2, Math.floor(sampleCount / curveSegments.length));
        for (const seg of curveSegments) {
            if (seg.length === 2) {
                // Linear segment
                points.push(new THREE.Vector2(seg[0][0], seg[0][1]));
                points.push(new THREE.Vector2(seg[1][0], seg[1][1]));
            } else if (seg.length === 3) {
                // Quadratic Bézier
                const curve = new THREE.QuadraticBezierCurve(
                    new THREE.Vector2(seg[0][0], seg[0][1]),
                    new THREE.Vector2(seg[1][0], seg[1][1]),
                    new THREE.Vector2(seg[2][0], seg[2][1])
                );
                const sampled = curve.getPoints(perSegment);
                points.push(...sampled);
            } else if (seg.length === 4) {
                // Cubic Bézier
                const curve = new THREE.CubicBezierCurve(
                    new THREE.Vector2(seg[0][0], seg[0][1]),
                    new THREE.Vector2(seg[1][0], seg[1][1]),
                    new THREE.Vector2(seg[2][0], seg[2][1]),
                    new THREE.Vector2(seg[3][0], seg[3][1])
                );
                const sampled = curve.getPoints(perSegment);
                points.push(...sampled);
            }
        }
        return points;
    }

    function lathe(curveSegments, segs = 48) {
        const profile = profileFromCurves(curveSegments);
        const geo = new THREE.LatheGeometry(profile, segs);
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, createWhiteMaterial());
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const group = new THREE.Group();
        group.add(mesh);
        return group;
    }

    // ── PAWN: Classic Staunton — wide base, collar, sphere top ──
    PREFABS["Pawn"] = lathe([
        // Base plate
        [[0.00, 0.00], [0.28, 0.00]],
        [[0.28, 0.00], [0.28, 0.04]],
        // Base molding curve
        [[0.28, 0.04], [0.30, 0.06], [0.28, 0.08], [0.22, 0.10]],
        // Stem taper
        [[0.22, 0.10], [0.18, 0.14], [0.12, 0.30], [0.10, 0.42]],
        // Collar ring
        [[0.10, 0.42], [0.15, 0.44], [0.15, 0.47], [0.10, 0.49]],
        // Neck
        [[0.10, 0.49], [0.09, 0.53]],
        // Head sphere
        [[0.09, 0.53], [0.16, 0.56], [0.18, 0.66], [0.14, 0.74]],
        [[0.14, 0.74], [0.10, 0.78], [0.04, 0.80], [0.00, 0.80]]
    ]);

    // ── ROOK: Staunton castle — sturdy body, crenellations ──
    PREFABS["Rook"] = lathe([
        // Base plate
        [[0.00, 0.00], [0.32, 0.00]],
        [[0.32, 0.00], [0.32, 0.05]],
        // Base molding
        [[0.32, 0.05], [0.34, 0.07], [0.32, 0.09], [0.26, 0.12]],
        // Body column
        [[0.26, 0.12], [0.22, 0.18], [0.18, 0.45], [0.20, 0.60]],
        // Crown rim flare
        [[0.20, 0.60], [0.22, 0.63], [0.26, 0.65], [0.28, 0.67]],
        // Battlements (stepped crenellation profile)
        [[0.28, 0.67], [0.28, 0.82]],
        [[0.28, 0.82], [0.22, 0.82]],
        [[0.22, 0.82], [0.22, 0.76]],
        [[0.22, 0.76], [0.16, 0.76]],
        [[0.16, 0.76], [0.16, 0.82]],
        [[0.16, 0.82], [0.00, 0.82]]
    ]);

    // ── BISHOP: Staunton miter — tapered body, pointed cap ──
    PREFABS["Bishop"] = lathe([
        // Base plate
        [[0.00, 0.00], [0.30, 0.00]],
        [[0.30, 0.00], [0.30, 0.04]],
        // Base molding
        [[0.30, 0.04], [0.32, 0.06], [0.30, 0.08], [0.24, 0.11]],
        // Stem taper
        [[0.24, 0.11], [0.20, 0.16], [0.13, 0.40], [0.11, 0.52]],
        // Collar
        [[0.11, 0.52], [0.16, 0.54], [0.16, 0.57], [0.11, 0.59]],
        // Miter body
        [[0.11, 0.59], [0.14, 0.65], [0.15, 0.72], [0.12, 0.80]],
        // Miter point
        [[0.12, 0.80], [0.08, 0.88], [0.04, 0.94], [0.00, 0.97]],
    ]);

    // ── QUEEN: Staunton corona — elegant curves, crown points ──
    PREFABS["Queen"] = lathe([
        // Base plate
        [[0.00, 0.00], [0.32, 0.00]],
        [[0.32, 0.00], [0.32, 0.05]],
        // Base molding
        [[0.32, 0.05], [0.35, 0.07], [0.33, 0.10], [0.26, 0.13]],
        // Stem taper
        [[0.26, 0.13], [0.22, 0.18], [0.14, 0.48], [0.12, 0.60]],
        // Collar
        [[0.12, 0.60], [0.17, 0.62], [0.17, 0.65], [0.12, 0.67]],
        // Crown body swell
        [[0.12, 0.67], [0.18, 0.74], [0.24, 0.82], [0.26, 0.88]],
        // Crown points (zigzag corona)
        [[0.26, 0.88], [0.20, 0.92]],
        [[0.20, 0.92], [0.24, 0.96]],
        [[0.24, 0.96], [0.16, 1.00]],
        [[0.16, 1.00], [0.20, 1.04]],
        // Finial sphere
        [[0.20, 1.04], [0.12, 1.08], [0.08, 1.12], [0.00, 1.12]]
    ]);

    // ── KING: Staunton sovereign — tallest piece, cross finial ──
    PREFABS["King"] = lathe([
        // Base plate
        [[0.00, 0.00], [0.34, 0.00]],
        [[0.34, 0.00], [0.34, 0.05]],
        // Base molding
        [[0.34, 0.05], [0.36, 0.07], [0.34, 0.10], [0.28, 0.14]],
        // Stem taper
        [[0.28, 0.14], [0.24, 0.20], [0.15, 0.52], [0.13, 0.65]],
        // Collar
        [[0.13, 0.65], [0.18, 0.67], [0.18, 0.70], [0.13, 0.72]],
        // Crown body
        [[0.13, 0.72], [0.20, 0.80], [0.28, 0.88], [0.26, 0.94]],
        // Crown rim
        [[0.26, 0.94], [0.28, 0.96], [0.26, 0.98], [0.20, 1.00]],
        // Neck to cross
        [[0.20, 1.00], [0.14, 1.04], [0.10, 1.08], [0.08, 1.12]],
        // Cross arms (horizontal bar via profile indentation)
        [[0.08, 1.12], [0.14, 1.14]],
        [[0.14, 1.14], [0.14, 1.18]],
        [[0.14, 1.18], [0.08, 1.18]],
        // Cross top
        [[0.08, 1.18], [0.08, 1.30]],
        [[0.08, 1.30], [0.04, 1.32], [0.02, 1.34], [0.00, 1.34]]
    ]);

    // Knight — extruded horse silhouette with Bézier curves
    PREFABS["Knight"] = forgeKnight();

    console.log("[ALISA] High-fidelity Staunton assets forged. 0 external requests.");
}

function forgeKnight() {
    const shape = new THREE.Shape();

    // Base
    shape.moveTo(-0.24, 0.00);
    shape.lineTo( 0.24, 0.00);

    // Front chest curve
    shape.quadraticCurveTo(0.22, 0.15, 0.18, 0.25);
    // Throat
    shape.quadraticCurveTo(0.20, 0.38, 0.28, 0.50);
    // Snout/muzzle
    shape.quadraticCurveTo(0.38, 0.58, 0.35, 0.64);
    shape.quadraticCurveTo(0.30, 0.66, 0.22, 0.68);
    // Nose bridge
    shape.quadraticCurveTo(0.15, 0.72, 0.10, 0.76);
    // Forehead
    shape.quadraticCurveTo(0.05, 0.82, 0.00, 0.88);
    // Ear peak
    shape.quadraticCurveTo(-0.04, 0.94, -0.06, 0.92);
    // Back of head
    shape.quadraticCurveTo(-0.10, 0.85, -0.15, 0.75);
    // Mane
    shape.quadraticCurveTo(-0.25, 0.60, -0.30, 0.45);
    // Back
    shape.quadraticCurveTo(-0.28, 0.25, -0.24, 0.00);

    const settings = {
        depth: 0.24,
        bevelEnabled: true,
        bevelSegments: 6,
        steps: 2,
        bevelSize: 0.05,
        bevelThickness: 0.05
    };
    const geo = new THREE.ExtrudeGeometry(shape, settings);
    geo.computeVertexNormals();
    geo.center();
    geo.translate(0, 0.44, 0);

    const mesh = new THREE.Mesh(geo, createWhiteMaterial());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const group = new THREE.Group();
    group.add(mesh);
    return group;
}

// ═══════════════════════════════════════════════════════════════════
// HUB POLLING & HUD
// ═══════════════════════════════════════════════════════════════════

async function pollHub() {
    try {
        const res = await fetch(HUB_URL);
        if (!res.ok) throw new Error("Hub offline");
        const data = await res.json();
        updateHUD(data);
        syncBoardState(data.fen);
    } catch (err) {
        const conn = document.getElementById('ui-conn');
        if (conn) {
            conn.innerText = "SIN CONEXIÓN";
            conn.style.color = "#FF4081";
        }
    }
}

function updateHUD(data) {
    document.getElementById('ui-conn').innerText = "EN LÍNEA";
    document.getElementById('ui-conn').style.color = "#4CAF50";

    currentLegalMoves = data.legal_moves || [];
    isGameOver = data.is_game_over || false;
    currentTurn = data.turn || 'white';

    const turnEl = document.getElementById('ui-turn');
    turnEl.innerText = data.turn.toUpperCase();
    turnEl.className = "val " + (data.turn === 'white' ? "turn-white" : "turn-black");

    const checkEl = document.getElementById('ui-check');
    if (data.is_game_over) {
        checkEl.innerText = "PARTIDA TERMINADA";
        checkEl.style.color = "#FFD700";
    } else if (data.is_check) {
        checkEl.innerText = "¡JAQUE!";
        checkEl.style.color = "#FF4081";
    } else {
        checkEl.innerText = "SIN JAQUE";
        checkEl.style.color = "#666";
    }

    const movesEl = document.getElementById('ui-moves');
    movesEl.innerText = `Vectors: ${data.legal_moves.length} | Games: ${gamesPlayed}\n${data.legal_moves.slice(0, 20).join(", ")}${data.legal_moves.length > 20 ? '...' : ''}`;
}

// ═══════════════════════════════════════════════════════════════════
// CAPTURED PIECES — compare FEN to starting set
// ═══════════════════════════════════════════════════════════════════

// Full starting set piece counts
const STARTING_PIECES = {
    'P': 8, 'R': 2, 'N': 2, 'B': 2, 'Q': 1, 'K': 1,
    'p': 8, 'r': 2, 'n': 2, 'b': 2, 'q': 1, 'k': 1
};

// Piece value order for display sorting (most valuable first)
const PIECE_VALUE = { 'q': 9, 'r': 5, 'b': 3, 'n': 3, 'p': 1, 'k': 0 };

function updateCaptured(fen) {
    const placement = fen.split(" ")[0];

    // Count current pieces on board
    const current = {};
    for (const ch of placement) {
        if (/[a-zA-Z]/.test(ch)) {
            current[ch] = (current[ch] || 0) + 1;
        }
    }

    // Diff against starting set → missing pieces are captured
    let whiteCaptured = []; // black pieces killed by white
    let blackCaptured = []; // white pieces killed by black

    for (const [piece, count] of Object.entries(STARTING_PIECES)) {
        const alive = current[piece] || 0;
        const dead = count - alive;
        const isUpperCase = piece === piece.toUpperCase();
        const symbol = UNICODE_PIECES[piece];
        for (let i = 0; i < dead; i++) {
            if (isUpperCase) {
                blackCaptured.push({ symbol, value: PIECE_VALUE[piece.toLowerCase()] });
            } else {
                whiteCaptured.push({ symbol, value: PIECE_VALUE[piece] });
            }
        }
    }

    // Sort by value descending
    whiteCaptured.sort((a, b) => b.value - a.value);
    blackCaptured.sort((a, b) => b.value - a.value);

    const wEl = document.getElementById('white-captures');
    const bEl = document.getElementById('black-captures');
    if (wEl) wEl.innerText = whiteCaptured.map(p => p.symbol).join(' ');
    if (bEl) bEl.innerText = blackCaptured.map(p => p.symbol).join(' ');
}

// ═══════════════════════════════════════════════════════════════════
// FEN PARSER & BOARD SYNC
// ═══════════════════════════════════════════════════════════════════

function syncBoardState(fen) {
    const placement = fen.split(" ")[0];
    const rows = placement.split("/");

    // Update captured pieces cemetery
    updateCaptured(fen);

    // Clear previous pieces
    while (piecesGroup.children.length > 0) {
        piecesGroup.remove(piecesGroup.children[0]);
    }

    // Draw minimap
    const minimap = document.getElementById('minimapCanvas');
    let ctx = null;
    const cz = 128 / 8;

    if (minimap) {
        ctx = minimap.getContext('2d');
        ctx.clearRect(0, 0, 128, 128);

        // Draw checkerboard background on minimap
        for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
                ctx.fillStyle = (r + f) % 2 === 0 ? '#1a1a2e' : '#16213e';
                ctx.fillRect(f * cz, r * cz, cz, cz);
            }
        }
    }

    // Parse FEN rows
    for (let rank = 0; rank < 8; rank++) {
        let file = 0;
        const rowStr = rows[rank];
        for (let i = 0; i < rowStr.length; i++) {
            const char = rowStr[i];
            if (!isNaN(char)) {
                file += parseInt(char);
            } else {
                spawnPiece(char, rank, file);
                // Minimap — draw Unicode chess piece
                if (ctx) {
                    const symbol = UNICODE_PIECES[char] || '?';
                    const isW = char === char.toUpperCase();
                    // Drop shadow for readability
                    ctx.font = `${cz - 2}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillText(symbol, file * cz + cz / 2 + 1, rank * cz + cz / 2 + 1);
                    ctx.fillStyle = isW ? '#f0f0f0' : '#c060ff';
                    ctx.fillText(symbol, file * cz + cz / 2, rank * cz + cz / 2);
                }
                file += 1;
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// PIECE INSTANCING
// ═══════════════════════════════════════════════════════════════════

function spawnPiece(char, rank, file) {
    const isWhite = char === char.toUpperCase();
    const type = FEN_MAP[char.toLowerCase()];
    if (!type || !PREFABS[type]) return;

    const clone = PREFABS[type].clone();

    // Apply fresh material per-piece (prevents shared mutation)
    const mat = isWhite ? createWhiteMaterial() : createBlackMaterial();
    /**
     * ⚠️ EL NOMBRE ES EL MISMO CAMPO QUE YA LEE `deFen()` EN `sustrato.js`.
     *
     * `t` es la letra del FEN en minúscula (`p r n b q k`) y `de` es 0/1 según
     * mayúscula/minúscula — literalmente `ch.toLowerCase()` y
     * `ch===ch.toUpperCase()?0:1`, la misma cuenta que hace `deFen`. No se
     * inventa una tabla de nombres nueva: se repite la que ya decide el
     * sustrato, para que 32 piezas nombradas sean 32 piezas comprobables.
     */
    const t = char.toLowerCase();
    const de = isWhite ? 0 : 1;
    clone.traverse((child) => {
        if (child.isMesh) {
            child.material = mat;
            child.name = `p:${t}:${de}`;
        }
    });

    const pivot = new THREE.Group();

    // Grid placement
    const x = file * SQUARE_SIZE - HALF_BOARD + SQUARE_SIZE / 2;
    const z = rank * SQUARE_SIZE - HALF_BOARD + SQUARE_SIZE / 2;
    pivot.position.set(x, 0, z);

    /**
     * ⚠️ EL CABALLO NO ES UNA CAJA: ERA SU GIRO, NO SU MOLDE.
     *
     * Medido con capturas (no supuesto): el caballo es un `ExtrudeGeometry` con
     * el perfil del caballo en el plano XY y solo 0.24 de profundidad en Z. Ese
     * perfil se lee perfecto — pero el código lo giraba 90° "para mirar al
     * rival", y girar 90° en Y manda el perfil ancho (eje X local) al eje Z del
     * mundo y la profundidad fina (eje Z local) al eje X del mundo. La cámara
     * de juego está en (0,8,10): mira sobre todo a lo largo de Z. Con el giro
     * de 90°, lo que la cámara veía de frente era el canto de 0.24 — un
     * bloque liso — mientras el perfil del caballo quedaba de canto,
     * escorzado. Comprobado moviendo la cámara a lo largo de X (de perfil):
     * ahí sí aparece la cabeza, el cuello, las crines.
     *
     * El arreglo es no rotar el caballo aparte: se queda con la misma regla
     * que ya usan las otras cinco piezas (identidad para blancas, 180° para
     * negras), así el plano del perfil —su cara ancha— quede mirando al eje Z,
     * que es por donde entra la cámara por defecto.
     */
    if (!isWhite) {
        clone.rotation.y = Math.PI;
    }

    // Scale hierarchy — King > Queen > Rook/Bishop/Knight > Pawn
    let s = 0.8;
    if (type === 'King')   s = 1.05;
    if (type === 'Queen')  s = 1.0;
    if (type === 'Bishop') s = 0.85;
    if (type === 'Rook')   s = 0.85;
    clone.scale.set(s, s, s);

    pivot.add(clone);
    piecesGroup.add(pivot);
}


// ═══════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════

engine.mountAgentHUD('hud-container', 'Sovereign Chess', `
    <div class="minimap-block">
        <div class="captured-row white-captures" id="white-captures"></div>
        <canvas id="minimapCanvas" width="128" height="128"></canvas>
        <div class="captured-row black-captures" id="black-captures"></div>
    </div>
`);

// ═══════════════════════════════════════════════════════════════════
//  JUGAR CON EL RATÓN
// ═══════════════════════════════════════════════════════════════════
// Esto NO EXISTÍA. El ajedrez solo se podía jugar escribiendo "e2e4" en una
// caja de texto — o sea, no se podía jugar. Un tablero 3D que no se deja tocar
// es una maqueta, no un juego.
//
// Cómo funciona: se lanza un rayo desde el ratón al plano del tablero, se
// convierte el punto en casilla, y se busca entre las jugadas legales una que
// vaya de la casilla marcada a la pulsada. Nunca se inventa una jugada: si no
// está en `currentLegalMoves`, no se envía.

let seleccion = null;      // casilla de origen
let marcas = [];           // discos que señalan los destinos

const SQ = SQUARE_SIZE;
const casillaDesde3D = (x, z) => {
    const file = Math.round(x + HALF_BOARD - SQ / 2);
    const rank = Math.round(z + HALF_BOARD - SQ / 2);
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return 'abcdefgh'[file] + (8 - rank);      // rank 0 arriba = fila 8
};

function borrarMarcas() {
    for (const m of marcas) boardGroup.remove(m);
    marcas = [];
}

function marcarDestinos(desde) {
    borrarMarcas();
    const geo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20);
    const mat = new THREE.MeshBasicMaterial({ color: 0x7CFC98, transparent: true, opacity: 0.8 });
    for (const m of engine.currentLegalMoves || []) {
        if (!m.startsWith(desde)) continue;
        const destino = m.slice(2, 4);
        const file = 'abcdefgh'.indexOf(destino[0]);
        const rank = 8 - parseInt(destino[1], 10);
        const disco = new THREE.Mesh(geo, mat);
        disco.position.set(
            file * SQ - HALF_BOARD + SQ / 2, 0.06,
            rank * SQ - HALF_BOARD + SQ / 2
        );
        boardGroup.add(disco);
        marcas.push(disco);
    }
}

// Se distingue un CLIC de un ARRASTRE: si no, girar la cámara con OrbitControls
// contaría como jugada y moverías piezas sin querer.
let pulsadoEn = null;

function alPulsar(ev) {
    pulsadoEn = { x: ev.clientX, y: ev.clientY };
}

function alSoltar(ev) {
    if (!pulsadoEn) return;
    const arrastre = Math.hypot(ev.clientX - pulsadoEn.x, ev.clientY - pulsadoEn.y);
    pulsadoEn = null;
    if (arrastre > 5) return;                  // estaba girando la cámara

    const rect = engine.renderer.domElement.getBoundingClientRect();
    const raton = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(raton, engine.camera);
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const punto = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plano, punto)) return;

    const sq = casillaDesde3D(punto.x, punto.z);
    if (!sq) { seleccion = null; borrarMarcas(); return; }

    const legales = engine.currentLegalMoves || [];

    if (!seleccion) {
        // Solo se puede coger una pieza que tenga alguna jugada legal: así el
        // jugador descubre solo de quién es el turno y qué está clavado.
        if (!legales.some(m => m.startsWith(sq))) return;
        seleccion = sq;
        marcarDestinos(sq);
        return;
    }

    // Segundo clic. Coronación: si la jugada la exige, se corona dama por
    // defecto — es lo que quiere el 99% de las veces.
    const candidatas = legales.filter(m => m.startsWith(seleccion) && m.slice(2, 4) === sq);
    borrarMarcas();
    if (candidatas.length) {
        const conDama = candidatas.find(m => m.length === 5 && m[4] === 'q');
        engine.sendMove(conDama || candidatas[0]);
        seleccion = null;
        return;
    }
    // Si no vale como destino pero SÍ tiene jugadas, se reinterpreta como
    // "quería coger esta otra pieza". Evita tener que deseleccionar a mano.
    seleccion = legales.some(m => m.startsWith(sq)) ? sq : null;
    if (seleccion) marcarDestinos(seleccion);
}

// ⚠️ EL ORDEN IMPORTA: `engine.renderer` NO EXISTE hasta que `start()` ejecuta
// `init3D()`. Enganchar los escuchadores antes reventaba con
// "Cannot read properties of null (reading 'domElement')" — y como eso ocurría
// ANTES de `engine.start()`, el motor no llegaba a arrancar: la página se
// quedaba sin backend, sin sondeo y sin partida. Un fallo en el orden de dos
// líneas dejaba el juego entero muerto.
engine.start();

engine.renderer.domElement.addEventListener('pointerdown', alPulsar);
engine.renderer.domElement.addEventListener('pointerup', alSoltar);
