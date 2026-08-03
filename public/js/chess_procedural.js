let boardGroup = new THREE.Group();
let piecesGroup = new THREE.Group();
const PREFABS = {};
const SQUARE_SIZE = 1.0;
const HALF_BOARD = 4.0;

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


// BOARD BUILDER — Grid, Border, Coordinates
// ═══════════════════════════════════════════════════════════════════

function buildBoard() {
    const geo = new THREE.BoxGeometry(SQUARE_SIZE, 0.2, SQUARE_SIZE);
    const matLight = new THREE.MeshStandardMaterial({ color: 0xe8e5e0, roughness: 0.65, metalness: 0.05 });
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


const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const FEN_MAP_OBJ = { 'p': 'Pawn', 'r': 'Rook', 'n': 'Knight', 'b': 'Bishop', 'q': 'Queen', 'k': 'King' };

window.spawnChessPieces = function(fen = START_FEN) {
    // Clear existing pieces before rendering new FEN
    while(piecesGroup.children.length > 0){ 
        piecesGroup.remove(piecesGroup.children[0]); 
    }

    let rank = 7, file = 0;
    // Only parse the board part of the FEN (before the first space)
    const boardFen = fen.split(' ')[0];
    
    for (let char of boardFen) {
        if (char === '/') { rank--; file = 0; }
        else if (/[1-8]/.test(char)) { file += parseInt(char); }
        else {
            const isWhite = char === char.toUpperCase();
            const type = FEN_MAP_OBJ[char.toLowerCase()];
            if (PREFABS[type]) {
                const mesh = PREFABS[type].clone();
                mesh.children[0].material = isWhite ? createWhiteMaterial() : createBlackMaterial();
                if (!isWhite && type === 'Knight') mesh.rotation.y = Math.PI; // Face black knights forward
                
                const x = file * SQUARE_SIZE - HALF_BOARD + SQUARE_SIZE / 2;
                const z = rank * SQUARE_SIZE - HALF_BOARD + SQUARE_SIZE / 2;
                mesh.position.set(x, 0, z);
                piecesGroup.add(mesh);
            }
            file++;
        }
    }
}

