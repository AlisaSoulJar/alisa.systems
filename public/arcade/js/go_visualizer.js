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
        // Un goban de 19×19 con paso 0,8 mide 14,4 de lado — casi el doble que un
        // tablero de ajedrez. Con la cámara a (0,14,12) se salía por abajo. Ahora
        // cabe entero. (Se vio en cuanto dejó de estar fuera de plano: mientras el
        // mundo estaba desplazado, el encuadre era el menor de los problemas.)
        camera.position.set(0, 19, 16);
        camera.lookAt(0, 0, 0);

        // ⚠️ EL RATÓN. Hasta hoy este tablero no se podía tocar: se dibujaba y
        // ya está. La única forma de jugar al go aquí era escribir `a19` en una
        // caja de texto. El enganche vive en `raton_tablero.js` porque a
        // reversi, mancala y xiangqi les faltaba EXACTAMENTE lo mismo, y cuatro
        // raycasters a medida serían cuatro veces el mismo error.
        import('./raton_tablero.js').then(({ engancharRaton, nombrarLetraNumero }) => {
            engancharRaton({
                engine, modo: 'colocar',
                columnas: GRID_SIZE, filas: GRID_SIZE, paso: SPACING,
                origen: { x: -HALF_BOARD, z: -HALF_BOARD },
                nombrar: nombrarLetraNumero({ filas: GRID_SIZE }),
            });
        });

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
        /**
         * ⚠️ ESTA LÍNEA MOVÍA EL MUNDO. TRES LÍNEAS EN VEZ DE UNA, A PROPÓSITO.
         *
         * Estaba escrita así, encadenada:
         *
         *     scene.add(new THREE.SpotLight(0x4fc3f7, 0.8)).position.set(8, 12, -8);
         *
         * y parece que coloca el foco. No lo hace: `Object3D.add()` devuelve
         * **la escena**, no el objeto añadido. Así que ese `.position.set()`
         * movía la ESCENA ENTERA a (8, 12, -8) y dejaba el foco en el origen.
         *
         * Consecuencia: el tablero quedaba fuera del encuadre y la página se veía
         * NEGRA. Sin un error, sin un aviso: el bucle de dibujo corría, el lienzo
         * era el correcto, las luces estaban, la geometría estaba bien colocada
         * —en local— y el renderer informaba de 120 triángulos donde tocaban 576,
         * porque el frustum descartaba casi todo. Se podía jugar al go entero por
         * la caja de texto sin ver una piedra.
         *
         * Se tardó en encontrar porque todo lo sospechoso estaba bien. Sólo salió
         * al comparar la posición LOCAL de una pieza (0, -0.75, 0) con la de
         * MUNDO (8, 11.25, -8): un desplazamiento idéntico para todos, que no
         * podía venir del grupo —tenía posición 0— ni de las piezas.
         */
        const relleno = new THREE.SpotLight(0x4fc3f7, 0.8);
        relleno.position.set(8, 12, -8);
        scene.add(relleno);

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

/**
 * ⚠️ `MeshPhysicalMaterial`, NO `MeshStandardMaterial`.
 *
 * `clearcoat` y `clearcoatRoughness` —el brillo de concha que promete el
 * comentario original— **no existen en `MeshStandardMaterial`**. Three lo avisaba
 * por consola dos veces por piedra (186 avisos en una partida de dos jugadas) y
 * descartaba las dos propiedades: las piedras blancas llevaban desde siempre sin
 * el acabado que el código creía estar dándoles.
 *
 * Un aviso repetido cientos de veces se vuelve invisible, y ahí estaba escondido.
 */
function createWhiteMaterial() {
    return new THREE.MeshPhysicalMaterial({
        color: 0xfdfdfd, roughness: 0.1, metalness: 0.05,
        clearcoat: 0.5, clearcoatRoughness: 0.2   // brillo de concha
    });
}

function createBlackMaterial() {
    // Mismo caso que la blanca: `clearcoat` es de `MeshPhysicalMaterial`.
    return new THREE.MeshPhysicalMaterial({
        color: 0x111111, roughness: 0.2, metalness: 0.1,
        clearcoat: 0.3, clearcoatRoughness: 0.3   // brillo de pizarra
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

/**
 * ⚠️ GEOMETRÍA Y MATERIALES UNA VEZ, NO UNO POR PIEDRA.
 *
 * `spawnStone` creaba una `SphereGeometry(0.38, 32, 16)` y un material NUEVOS en
 * cada piedra — y `syncGoState` vacía y repuebla el tablero en cada refresco, o
 * sea varias veces por segundo. En una partida avanzada eso son cientos de
 * objetos de GPU creados y tirados por segundo.
 *
 * Se vio por los avisos de consola: 186 en una partida de dos jugadas, dos por
 * cada piedra creada. El aviso era de otra cosa (ver abajo) pero el NÚMERO
 * delataba que se estaba construyendo mucho más de lo necesario.
 */
let geoPiedra = null, matBlanca = null, matNegra = null;

function spawnStone(isWhite, x, y) {
    geoPiedra ??= new THREE.SphereGeometry(0.38, 32, 16);
    matBlanca ??= createWhiteMaterial();
    matNegra ??= createBlackMaterial();
    const stone = new THREE.Mesh(geoPiedra, isWhite ? matBlanca : matNegra);
    
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
    
    /**
     * ⚠️ ESTA FUNCIÓN LEÍA EL TABLERO DE DOS FORMAS DISTINTAS, Y SÓLO UNA IBA.
     *
     * Arriba, para el minimapa, hace `const b = state.board`. Aquí abajo, para el
     * 3D, preguntaba `Array.isArray(state)` — y `state` es `{ board: [...] }`, un
     * envoltorio, no el array. O sea que la condición era SIEMPRE falsa y el
     * bucle que crea las piedras no llegó a ejecutarse nunca.
     *
     * El síntoma engañaba: el minimapa del HUD sí pintaba las piedras, así que
     * parecía que el juego se dibujaba bien y que el problema era «del 3D». Eran
     * dos lecturas del mismo dato en veinte líneas, una buena y otra no.
     *
     * Se acepta cualquiera de las dos formas —el envoltorio y el array pelado—
     * porque este visualizador también sirve partidas venidas de un hub, y allí
     * el formato no lo decidimos nosotros.
     */
    const rejilla = Array.isArray(state) ? state : b;
    if (Array.isArray(rejilla)) {
        if (rejilla.length === 19) {
            // 2D Array
            for (let y = 0; y < 19; y++) {
                for (let x = 0; x < 19; x++) {
                    const val = rejilla[y][x];
                    if (val === 1 || val === 'B' || val === 'b') spawnStone(false, x, y);
                    if (val === 2 || val === 'W' || val === 'w') spawnStone(true, x, y);
                }
            }
        } else if (rejilla.length === 361) {
            // Flat Array
            for (let i = 0; i < 361; i++) {
                const y = Math.floor(i / 19);
                const x = i % 19;
                const val = rejilla[i];
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
