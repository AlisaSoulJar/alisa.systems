// ticks_visualizer.js
// ALISA Engine - Ticking Grids (Peatón)

let scene, camera, renderer, boardGroup;
let frogMesh;
let hazardMeshes = [];
let gridW = 11, gridH = 11;
let tickerInterval;
let cachedState = null;

// Phase 5: Agentic Controls
let autoMode = false;
let isGameOver = false;

function init3D() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 15, 10);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Cyan glow
    const spotLight = new THREE.SpotLight(0x00ffc8, 1);
    spotLight.position.set(0, 20, 5);
    spotLight.angle = Math.PI / 3;
    spotLight.penumbra = 0.8;
    scene.add(spotLight);

    boardGroup = new THREE.Group();
    scene.add(boardGroup);

    // Initial grid rendering is delayed until first state fetch to get dimensions
    
    window.addEventListener('resize', onWindowResize);
    
    // Setup keyboard listener
    // Los verbos son los que entienden las reglas (`DIRS` en peaton.js): en
    // castellano, igual que en el resto del arcade. Antes se mandaba
    // 'up'/'down'/…, que las reglas no reconocen y descartan en silencio, así
    // que aunque el backend hubiera respondido el peatón no se habría movido.
    const TECLAS = {
        ArrowUp: 'arriba',    w: 'arriba',    W: 'arriba',
        ArrowDown: 'abajo',   s: 'abajo',     S: 'abajo',
        ArrowLeft: 'izquierda', a: 'izquierda', A: 'izquierda',
        ArrowRight: 'derecha',  d: 'derecha',   D: 'derecha',
        ' ': 'esperar',
    };
    window.addEventListener('keydown', (e) => {
        /**
         * ⚠️ SI ESTÁS ESCRIBIENDO, ESTO SON LETRAS Y NO JUGADAS.
         *
         * El mapa de arriba incluye `w a s d` y el ESPACIO, con `preventDefault()`.
         * Sin esta línea, escribir en cualquier campo de la página —el buzón de «algo
         * va raro», sin ir más lejos— movía al peatón de verdad y se comía la letra.
         * O sea: no se podían escribir espacios.
         *
         * Medido en snake, que tiene el mismo manejador: escribiendo «las casas se
         * ven raras y no se donde estoy» salían «lcevenrrynoeoneetoy» —23 letras
         * perdidas— y la serpiente daba 17 pasos. Mismo fallo, copiado en dos
         * sitios; el otro está en `Entrada.js`, con la historia entera.
         */
        // La comprobación es LA MISMA que usa `Entrada.js`, no una copia: dos copias
        // de esta regla es justo cómo el fallo acabó estando en dos sitios.
        if (window.ALISA_ESCRIBIENDO?.()) return;
        const verbo = TECLAS[e.key];
        if (verbo) { e.preventDefault(); sendMove(verbo); }
    });

    animate();
}

let boardBuilt = false;
function buildBaseBoard(w, h) {
    if (boardBuilt) return;
    gridW = w; gridH = h;
    
    const matSafe = new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.9, wireframe: true });
    const matRoad = new THREE.MeshStandardMaterial({ color: 0x050a10, roughness: 1.0 });

    for (let y = 0; y < h; y++) {
        const isSafe = (y === 0 || y === h - 1);
        const rowGeo = new THREE.BoxGeometry(w, 0.2, 1);
        const rowMesh = new THREE.Mesh(rowGeo, isSafe ? matSafe : matRoad);
        rowMesh.position.set(0, -0.1, -y + (h / 2));
        boardGroup.add(rowMesh);
    }
    
    // Frog Material
    const frogGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const frogMat = new THREE.MeshStandardMaterial({ color: 0x00ffc8, roughness: 0.2, emissive: 0x005544 });
    frogMesh = new THREE.Mesh(frogGeo, frogMat);
    boardGroup.add(frogMesh);
    
    boardBuilt = true;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(time);
    renderer.render(scene, camera);
}


// ── LOGIC & TELEMETRY ──

function coordToPhys(x, y) {
    // x: 0 to W-1
    // y: 0 to H-1
    const pX = x - (gridW / 2) + 0.5;
    const pZ = -y + (gridH / 2);
    return { x: pX, y: 0.5, z: pZ };
}

function createHazard() {
    const geo = new THREE.BoxGeometry(0.9, 0.6, 0.9);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0044, roughness: 0.5, emissive: 0x440011 });
    return new THREE.Mesh(geo, mat);
}

function syncStateToBoard(state) {
    buildBaseBoard(state.width, state.height);
    
    // Move Frog
    const p = coordToPhys(state.frog.x, state.frog.y);
    new TWEEN.Tween(frogMesh.position)
        .to({ x: p.x, z: p.z }, 150)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
        
    // Re-draw Hazards
    hazardMeshes.forEach(m => boardGroup.remove(m));
    hazardMeshes = [];
    
    for (let y = 0; y < state.height; y++) {
        const rowCars = state.hazards[y];
        if (!rowCars) continue;
        
        for (const coche of rowCars) {
            // Las reglas mandan `{x, dir}`, no un número suelto. Tratándolo
            // como número, `coordToPhys` devolvía NaN y los coches se pintaban
            // en ninguna parte: el carril parecía despejado siempre.
            const cx = (typeof coche === 'object') ? coche.x : coche;
            const hPos = coordToPhys(cx, y);
            const hz = createHazard();
            hz.position.set(hPos.x, hPos.y, hPos.z);
            boardGroup.add(hz);
            hazardMeshes.push(hz);
        }
    }
}

/** Escribe en un hueco del HUD si existe. Antes se daba por hecho que sí, y
 *  un `getElementById` nulo tumbaba el refresco entero con un TypeError. */
function _hueco(id, texto, color) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerText = texto;
    if (color) el.style.color = color;
}

/**
 * ⚠️ ESTA PÁGINA ESCRIBÍA EN UN HUD QUE NO EXISTÍA, Y LLEVA ASÍ DESDE SIEMPRE.
 *
 * `_hueco()` busca `ui-tick`, `ui-conn` y `ui-agent`… y ninguno estaba en el
 * documento: la página traía un `<div id="hud-container">` VACÍO y nada lo
 * llenaba —los otros visualizadores llaman a `mountAgentHUD`, y éste no, porque
 * no usa el motor de tablero: lleva su propio bucle—. Y como `_hueco` sale de
 * puntillas cuando el hueco falta (con razón: antes tumbaba el refresco entero),
 * el resultado era jugar a ciegas, sin marcador y sin saber si habías muerto,
 * con cero errores en consola.
 *
 * Se monta aquí, una vez, con las clases que ya tiene la hoja compartida. Y las
 * jugadas van por `pintarJugadas`, el mismo de todas las mesas: es donde vive la
 * regla de que no se ofrece nada que no esté en `legal_moves`.
 */
function _montarHUD() {
    const caja = document.getElementById('hud-container');
    if (!caja || caja.children.length) return;
    caja.innerHTML = `
        <div class="hud-panel">
          <div class="hud-header"><h1>Peatón</h1></div>
          <div id="hud-content">
            <div class="status-row"><span>Estado</span><span class="val" id="ui-agent">—</span></div>
            <div class="status-row"><span>Tick</span><span class="val" id="ui-tick">0</span></div>
            <div class="status-row"><span>Conexión</span><span class="val" id="ui-conn">…</span></div>
            <div id="mesa-jugadas" class="mesa-jugadas"></div>
          </div>
        </div>`;
}

function updateHUD(data) {
    _montarHUD();
    _hueco('ui-conn', 'SYNCED', '#4CAF50');
    if (data.status !== 'ok') return;

    const state = data.state;
    cachedState = state;
    _hueco('ui-tick', state.tick);

    import('./protohub/jugadas.js').then(({ pintarJugadas }) => {
        pintarJugadas(document.getElementById('mesa-jugadas'), {
            acciones: state.legal_moves ?? state.acciones ?? [],
            terminada: !!state.game_over,
            enviar: (m) => sendMove(m),
        });
    });

    if (state.game_over) {
        isGameOver = true;
        _hueco('ui-agent', state.winner ? 'MISSION COMPLETE' : 'ROADKILL',
                           state.winner ? '#00ffc8' : '#ff0044');
        clearInterval(tickerInterval);
    } else {
        isGameOver = false;
        _hueco('ui-agent', 'ALIVE', '#fff');
    }
}

// ═══════════════════════════════════════════════════════════════════
//  EL BACKEND
// ═══════════════════════════════════════════════════════════════════
// Estas tres funciones llamaban por `fetch` a `/arcade/peaton/state` y
// `/arcade/peaton/move`, que solo existen si está levantado el hub de la
// colonia. Abierta la página sola, daban 404 y 501: el peatón no se movía y
// la consola escupía errores. Ahora hablan con el ProtoHub, que tiene las
// mismas reglas dentro del navegador — y si el hub aparece, ProtoHub lo usa
// sin que aquí cambie una línea.

function _hub() {
    return window.ALISA_PROTOHUB || null;
}

/** El estado del ProtoHub, en el formato que espera esta página. */
function _adaptar(st) {
    return {
        status: 'ok',
        state: {
            ...st.state,
            tick: st.t,
            game_over: st.is_game_over,
            winner: st.result === 'white',
            // Las jugadas legales viven al lado de `state`, no dentro, así que
            // este adaptador las dejaba fuera y el HUD no tenía qué ofrecer. Es
            // el sitio donde arreglarlo: aquí es donde se traduce un formato al
            // otro, y cualquier otro sitio sería volver a deducirlas.
            legal_moves: st.legal_moves ?? [],
        },
    };
}

async function fetchState() {
    const hub = _hub();
    if (!hub) return;
    try {
        pintar(_adaptar(hub.state('peaton')));
    } catch (e) {
        const conn = document.getElementById('ui-conn');
        if (conn) { conn.innerText = 'TIMED OUT'; conn.style.color = '#ff0044'; }
    }
}

function pintar(data) {
    syncStateToBoard(data.state);
    updateHUD(data);
}

async function sendMove(direction) {
    const hub = _hub();
    if (!hub) return;
    try {
        await hub.move('peaton', { move: direction });
        pintar(_adaptar(hub.state('peaton')));
    } catch (e) { console.warn(e); }
}

/**
 * Un tick es el mundo avanzando sin que tú hagas nada: los coches se mueven
 * igual. En las reglas eso es la jugada `esperar`, no un verbo aparte.
 */
async function sendTick() {
    if (isGameOver) return;
    await sendMove('esperar');
}

// Boot
// ProtoHub se importa como módulo, y los módulos se ejecutan DESPUÉS de los
// scripts clásicos como este. Si se pinta de inmediato, `window.ALISA_PROTOHUB`
// aún no existe y la página arranca en blanco. Se espera a que aparezca.
init3D();

(function arrancar(intentos = 0) {
    if (window.ALISA_PROTOHUB) {
        fetchState();
        tickerInterval = setInterval(sendTick, 1000);   // el mundo, a 1 Hz
        return;
    }
    if (intentos > 100) {                                // ~5 s y me rindo
        const conn = document.getElementById('ui-conn');
        if (conn) { conn.innerText = 'SIN REGLAS'; conn.style.color = '#ff0044'; }
        return;
    }
    setTimeout(() => arrancar(intentos + 1), 50);
})();

// ─────────────────────────────────────────────────────────────────
// PHASE 5: AUTONOMOUS WEB WORKER & HEURISTIC DRIVER
// ─────────────────────────────────────────────────────────────────

function toggleAutoMode() {
    autoMode = !autoMode;
    const btn = document.getElementById('autoToggleBtn');
    if (autoMode) {
        btn.classList.add('active');
        btn.innerText = "[ ENGAGE AUTO-WORKER - RUNNING ]";
        clearInterval(tickerInterval);
        executeWebWorkerLoop();
    } else {
        btn.classList.remove('active');
        btn.innerText = "[ ENGAGE AUTO-WORKER ]";
        if (!isGameOver && !window.REPLAY_MODE) {
            tickerInterval = setInterval(sendTick, 1000);
        }
    }
}

/**
 * El jugador automático. Dos arreglos:
 *  · devolvía 'up'/'left'/'wait', que las reglas no entienden;
 *  · comparaba `hazards.includes(fX)` — un número contra objetos `{x,dir}`,
 *    que nunca coincide. Creía que el carril de arriba SIEMPRE estaba libre y
 *    cruzaba de frente contra los coches.
 */
function evaluateHeuristic(state) {
    if (!state) return 'esperar';

    const ocupado = (fila, x) =>
        (state.hazards[fila] || []).some(c => (typeof c === 'object' ? c.x : c) === x);

    const fX = state.frog.x;
    const fY = state.frog.y;

    const arriba = fY + 1;
    if (arriba >= state.height) return 'arriba';       // la otra acera
    if (!ocupado(arriba, fX)) return 'arriba';

    // Bloqueado: esquivar a un lado, si el lado tampoco está pisado.
    if (fX > 0 && !ocupado(arriba, fX - 1) && !ocupado(fY, fX - 1)) return 'izquierda';
    if (fX < state.width - 1 && !ocupado(arriba, fX + 1) && !ocupado(fY, fX + 1)) return 'derecha';

    return 'esperar';                                  // atrapado: quieto
}

async function executeWebWorkerLoop() {
    if (!autoMode || isGameOver || window.REPLAY_MODE) return;
    
    const move = evaluateHeuristic(cachedState);
    await sendMove(move);
    
    // Play fast
    setTimeout(executeWebWorkerLoop, 300);
}

// Aquí había un bloque que llamaba a `ALISA_ENTRADA.teclasDireccion(engine)`.
// Esta página no tiene `engine` — no usa SovereignBoardEngine, lleva su propio
// bucle — así que reventaba con «engine is not defined» y ni se ejecutaba. El
// teclado de peatón está arriba, en `init3D()`, que es donde siempre estuvo.
