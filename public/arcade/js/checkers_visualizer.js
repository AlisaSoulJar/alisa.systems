// checkers_visualizer.js — ALISA Sovereign Damas Arena
//
// RECONSTRUIDO. El original se quedó a 0 bytes tras el `git clean`, así que la
// página existía, el enlace del índice funcionaba… y al abrirla no había nada.
// Está modelado sobre reversi_visualizer.js, que ya resolvía el mismo problema:
// fichas redondas sobre un tablero de 8×8.
//
// Lee el FEN de damas del ProtoHub:
//     w = peón blanco · W = dama blanca · b = peón negro · B = dama negra

let boardGroup;
let pieces = {};
let currentFen = "";
let seleccion = null;      // casilla de origen elegida por el humano
let marcas = [];           // discos que resaltan los destinos posibles

const CASILLA = 1.0;
const OFFSET = -3.5;       // centra el tablero de 8 casillas en el origen

const engine = new SovereignBoardEngine({
    gameId: 'checkers',
    onInit3D: function (scene, camera, renderer) {
        camera.position.set(0, 10, 8);
        camera.lookAt(0, 0, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 0.45));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(5, 12, 6);
        dirLight.castShadow = true;
        scene.add(dirLight);

        boardGroup = new THREE.Group();
        scene.add(boardGroup);
        createBoard();

        renderer.domElement.addEventListener('pointerdown', onPointerDown);
    },
    onStateSync: function (data) {
        const fenBoard = (data.fen || "").split(" ")[0];
        const w = (fenBoard.match(/[wW]/g) || []).length;
        const b = (fenBoard.match(/[bB]/g) || []).length;
        const wEl = document.getElementById('white-discs');
        const bEl = document.getElementById('black-discs');
        if (wEl) wEl.innerText = w;
        if (bEl) bEl.innerText = b;

        // Avisar de que comer es obligatorio cambia por completo la lectura.
        const aviso = document.getElementById('ui-forced');
        if (aviso) {
            aviso.innerText = data.captura_obligada ? 'CAPTURA OBLIGADA' : '';
            aviso.style.color = '#ffd166';
        }
        syncFenToBoard(data.fen);
    }
});

// Al reiniciar o deshacer hay que tirar las piezas locales, o se quedan fantasmas.
const baseRestart = engine.restartGame.bind(engine);
engine.restartGame = async () => { limpiar(); await baseRestart(); };
const baseUndo = engine.undoMove.bind(engine);
engine.undoMove = async () => { limpiar(); await baseUndo(); };

function limpiar() {
    for (const sq in pieces) boardGroup.remove(pieces[sq]);
    pieces = {}; currentFen = ""; seleccion = null;
    borrarMarcas();
}

// ═══════════════════════════════════════════════════════════════════
//  TABLERO
// ═══════════════════════════════════════════════════════════════════
function createBoard() {
    const claro = new THREE.MeshStandardMaterial({ color: 0xd8c9a8, roughness: 0.75 });
    const oscuro = new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.85 });
    const geo = new THREE.BoxGeometry(CASILLA, 0.16, CASILLA);

    for (let f = 0; f < 8; f++) {
        for (let c = 0; c < 8; c++) {
            const m = new THREE.Mesh(geo, (f + c) % 2 === 1 ? oscuro : claro);
            m.position.set(OFFSET + c * CASILLA, 0, OFFSET + f * CASILLA);
            m.receiveShadow = true;
            boardGroup.add(m);
        }
    }
    const marco = new THREE.Mesh(
        new THREE.BoxGeometry(8.6, 0.1, 8.6),
        new THREE.MeshStandardMaterial({ color: 0x1a1108, roughness: 0.9 })
    );
    marco.position.y = -0.09;
    boardGroup.add(marco);
}

function crearFicha(esBlanca, esDama) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
        color: esBlanca ? 0xf2f0e6 : 0x1b1b1f,
        roughness: esBlanca ? 0.35 : 0.55,
        metalness: 0.15,
        emissive: esBlanca ? 0x222018 : 0x000000,
    });
    const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.16, 28), mat);
    disco.castShadow = true;
    g.add(disco);

    if (esDama) {
        // Una dama es literalmente dos fichas apiladas: se ve desde lejos.
        const arriba = disco.clone();
        arriba.position.y = 0.17;
        g.add(arriba);
        const corona = new THREE.Mesh(
            new THREE.TorusGeometry(0.17, 0.045, 10, 24),
            new THREE.MeshStandardMaterial({ color: 0xffc94d, metalness: 0.7, roughness: 0.3 })
        );
        corona.rotation.x = Math.PI / 2;
        corona.position.y = 0.27;
        g.add(corona);
    }
    return g;
}

// ═══════════════════════════════════════════════════════════════════
//  SINCRONIZAR CON EL FEN
// ═══════════════════════════════════════════════════════════════════
function syncFenToBoard(fen) {
    if (!fen || fen === currentFen) return;
    currentFen = fen;

    const filas = fen.split(" ")[0].split("/");
    const vivas = new Set();

    for (let f = 0; f < filas.length; f++) {
        let c = 0;
        for (const ch of filas[f]) {
            if (!isNaN(parseInt(ch, 10))) { c += parseInt(ch, 10); continue; }
            const sq = 'abcdefgh'[c] + (8 - f);
            const esBlanca = ch === 'w' || ch === 'W';
            const esDama = ch === 'W' || ch === 'B';
            vivas.add(sq);

            const clave = `${sq}:${ch}`;             // si cambia el tipo, se recrea
            if (!pieces[sq] || pieces[sq]._clave !== clave) {
                if (pieces[sq]) boardGroup.remove(pieces[sq]);
                const p = crearFicha(esBlanca, esDama);
                p._clave = clave;
                p.position.set(OFFSET + c * CASILLA, 0.16, OFFSET + f * CASILLA);
                boardGroup.add(p);
                pieces[sq] = p;
            }
            c++;
        }
    }
    for (const sq in pieces) {
        if (!vivas.has(sq)) { boardGroup.remove(pieces[sq]); delete pieces[sq]; }
    }
}

// ═══════════════════════════════════════════════════════════════════
//  JUGAR CON EL RATÓN
// ═══════════════════════════════════════════════════════════════════
function casillaDesdeEvento(ev) {
    const rect = engine.renderer.domElement.getBoundingClientRect();
    const raton = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(raton, engine.camera);
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const punto = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plano, punto)) return null;

    const c = Math.round((punto.x - OFFSET) / CASILLA);
    const f = Math.round((punto.z - OFFSET) / CASILLA);
    if (c < 0 || c > 7 || f < 0 || f > 7) return null;
    return 'abcdefgh'[c] + (8 - f);
}

function borrarMarcas() {
    for (const m of marcas) boardGroup.remove(m);
    marcas = [];
}

function marcarDestinos(desde) {
    borrarMarcas();
    const geo = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 20);
    const mat = new THREE.MeshBasicMaterial({ color: 0x7CFC98, transparent: true, opacity: 0.75 });
    for (const m of engine.currentLegalMoves || []) {
        if (!m.startsWith(desde)) continue;
        // El destino final de la jugada (una captura múltiple tiene varios saltos).
        const pasos = m.match(/[a-h][1-8]/g);
        const fin = pasos[pasos.length - 1];
        const c = 'abcdefgh'.indexOf(fin[0]);
        const f = 8 - parseInt(fin[1], 10);
        const disco = new THREE.Mesh(geo, mat);
        disco.position.set(OFFSET + c * CASILLA, 0.2, OFFSET + f * CASILLA);
        boardGroup.add(disco);
        marcas.push(disco);
    }
}

function onPointerDown(ev) {
    const sq = casillaDesdeEvento(ev);
    if (!sq) return;

    if (!seleccion) {
        // Solo deja elegir una pieza que tenga alguna jugada legal: así el
        // jugador descubre solo que hay captura obligada.
        const tiene = (engine.currentLegalMoves || []).some(m => m.startsWith(sq));
        if (!tiene) return;
        seleccion = sq;
        marcarDestinos(sq);
        return;
    }

    // Segundo clic: buscar la jugada que empieza donde se marcó y acaba aquí.
    const candidata = (engine.currentLegalMoves || []).find(m => {
        if (!m.startsWith(seleccion)) return false;
        const pasos = m.match(/[a-h][1-8]/g);
        return pasos[pasos.length - 1] === sq;
    });
    borrarMarcas();
    if (candidata) engine.sendMove(candidata);
    seleccion = null;
}

/**
 * ⚠️ ESTA PÁGINA NO MONTABA EL HUD, Y NADIE LO HABÍA NOTADO.
 *
 * Las otras cinco páginas de tablero llaman a `mountAgentHUD` y ésta no. Sin él
 * no había ni panel de asientos —o sea que no se podía poner una política ni un
 * modelo a jugar— ni caja para escribir una jugada. Sólo el ratón.
 *
 * Es justo lo que pasa cuando el mismo andamio está copiado en seis sitios: una
 * copia se queda atrás y sigue pareciendo que funciona, porque funciona… menos
 * en lo que le falta. Se vio al estandarizar los asientos: `checkers` era la
 * única que escribía `engine,engine` en la dirección, porque leía unos
 * desplegables que no existían.
 *
 * El bloque de arriba es el mismo que usa `reversi_visualizer.js` — los dos
 * cuentan fichas— y `ui-forced` es lo suyo: el aviso de captura obligada.
 */
engine.mountAgentHUD('hud-container', 'Sovereign Checkers', `
    <div class="disc-counts">
        <span class="white-count">⚪ <span id="white-discs">12</span></span>
        <span class="black-count">⚫ <span id="black-discs">12</span></span>
    </div>
    <div id="ui-forced" style="font-size:10px; color:#FF4081; min-height:12px; text-align:center;"></div>
`);
engine.start();
