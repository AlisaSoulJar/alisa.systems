/**
 * Entrada.js — que una PERSONA pueda jugar
 * ═══════════════════════════════════════════════════════════════════════════
 * De dieciséis visualizadores, catorce solo se dejaban MIRAR. Un tablero 3D
 * precioso al que no puedes tocar es una maqueta, no un juego. Y no se notaba
 * probando por código: las pruebas movían fichas llamando a `sendMove()`
 * directamente, así que todo pasaba… y nadie podía jugar.
 *
 * Esto es el manejador compartido. Cada visualizador lo engancha en cinco
 * líneas en vez de reescribir raycasting y detección de arrastre.
 *
 * DOS FORMAS DE ENTRADA, PORQUE HAY DOS TIPOS DE JUEGO
 * ---------------------------------------------------
 *   `clicEnTablero`  — tablero: pulsas una casilla (ajedrez, go, damas…)
 *   `teclasDireccion` — acción: flechas o WASD (snake, fagocito, peatón)
 *
 * REGLA DE ORO
 * ------------
 * Nunca se inventa una jugada. Todo lo que se envía sale de
 * `engine.currentLegalMoves`; si no está ahí, no se manda. El motor de reglas
 * manda, la interfaz solo traduce dedos a verbos.
 *
 * ⚠️ CUÁNDO ENGANCHARLO
 * `engine.renderer` NO existe hasta que `start()` ejecuta `init3D()`. Estas
 * funciones se llaman DESPUÉS de `engine.start()`, o dentro del gancho
 * `onInit3D`. Enganchar antes revienta con «Cannot read properties of null» —
 * y como pasa antes del arranque, deja la página entera muerta.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Pulsar casillas de un tablero.
 *
 * @param {Object} engine  SovereignBoardEngine ya arrancado
 * @param {Object} opts
 * @param {Function} opts.aCasilla     (x, z) → nombre de casilla, o null
 * @param {Function} opts.posicionDe   (casilla) → {x, z} para pintar la marca
 * @param {Function} [opts.destinoDe]  (jugada) → casilla final. Por defecto,
 *                                     los caracteres 3 y 4 ("e2e4" → "e4")
 * @param {Function} [opts.empiezaEn]  (jugada) → casilla inicial. Por defecto,
 *                                     los dos primeros
 * @param {boolean}  [opts.unSoloPaso] true si la jugada es solo el destino
 *                                     (go, mancala: pulsas dónde y ya está)
 * @param {THREE.Group} [opts.grupo]   dónde colgar las marcas
 * @param {number} [opts.alturaMarca=0.2]
 */
function clicEnTablero(engine, opts) {
    const {
        aCasilla, posicionDe,
        destinoDe = (m) => m.slice(2, 4),
        empiezaEn = (m) => m.slice(0, 2),
        unSoloPaso = false,
        grupo = engine.scene,
        alturaMarca = 0.2,
    } = opts;

    let seleccion = null;
    let marcas = [];
    let pulsadoEn = null;

    const borrarMarcas = () => {
        for (const m of marcas) grupo.remove(m);
        marcas = [];
    };

    const marcar = (casillas, color = 0x7CFC98) => {
        borrarMarcas();
        const geo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
        for (const sq of casillas) {
            const p = posicionDe(sq);
            if (!p) continue;
            const disco = new THREE.Mesh(geo, mat);
            disco.position.set(p.x, alturaMarca, p.z);
            grupo.add(disco);
            marcas.push(disco);
        }
    };

    const casillaBajoElRaton = (ev) => {
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
        return aCasilla(punto.x, punto.z);
    };

    const alPulsar = (ev) => { pulsadoEn = { x: ev.clientX, y: ev.clientY }; };

    const alSoltar = (ev) => {
        if (!pulsadoEn) return;
        // Distinguir clic de arrastre: girar la cámara no debe mover fichas.
        const arrastre = Math.hypot(ev.clientX - pulsadoEn.x, ev.clientY - pulsadoEn.y);
        pulsadoEn = null;
        if (arrastre > 5) return;

        const sq = casillaBajoElRaton(ev);
        const legales = engine.currentLegalMoves || [];
        if (!sq) { seleccion = null; borrarMarcas(); return; }

        // Juegos de un solo paso: pulsas dónde quieres poner y listo.
        if (unSoloPaso) {
            const jugada = legales.find(m => m === sq || destinoDe(m) === sq);
            if (jugada) engine.sendMove(jugada);
            return;
        }

        if (!seleccion) {
            if (!legales.some(m => empiezaEn(m) === sq)) return;   // nada que hacer ahí
            seleccion = sq;
            marcar(legales.filter(m => empiezaEn(m) === sq).map(destinoDe));
            return;
        }

        const candidatas = legales.filter(m => empiezaEn(m) === seleccion && destinoDe(m) === sq);
        borrarMarcas();
        if (candidatas.length) {
            // Con varias (coronación), la primera con dama; si no, la primera.
            const conDama = candidatas.find(m => m.length === 5 && m[4] === 'q');
            engine.sendMove(conDama || candidatas[0]);
            seleccion = null;
            return;
        }
        // Pulsar otra pieza propia cambia la selección, sin tener que anular antes.
        seleccion = legales.some(m => empiezaEn(m) === sq) ? sq : null;
        if (seleccion) marcar(legales.filter(m => empiezaEn(m) === sq).map(destinoDe));
    };

    engine.renderer.domElement.addEventListener('pointerdown', alPulsar);
    engine.renderer.domElement.addEventListener('pointerup', alSoltar);

    /**
     * El mapeo casilla↔espacio queda publicado a propósito.
     *
     * Sin esto, para probar que el ratón funciona hay que REPETIR fuera las
     * constantes del tablero — y si las copias mal, la prueba miente en la
     * misma dirección que el fallo. Ya pasó con go (SPACING 0.8 escrito como
     * 1.0) y con xiangqi (media casilla de desvío): el clic caía en la casilla
     * de al lado y todo parecía correcto. Preguntándole al juego dónde está
     * cada casilla, un mapeo torcido hace fallar la prueba, que es su trabajo.
     */
    engine.entrada = { aCasilla, posicionDe, borrarMarcas, marcar };

    return { borrarMarcas, marcar };
}

/**
 * ¿Está la persona escribiendo ahora mismo?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ VIVE AQUÍ, SUELTA Y CON NOMBRE, PORQUE ESTABA EN DOS SITIOS Y FALTABA EN LOS DOS.
 *
 * La primera versión de esta comprobación la escribí dentro de `teclasDireccion`, y
 * `peaton_visualizer.js` —que tiene su propio manejador copiado— necesitaba otra
 * igual. Dos copias de la misma regla es exactamente cómo el fallo llegó a estar en
 * dos sitios: el manejador se copió, y el olvido con él.
 *
 * Sacándola aquí hay UNA, y `prueba_teclado.mjs` puede comprobar que cada manejador
 * la LLAMA — que es una marca concreta, no «en este fichero aparece la palabra
 * activeElement en alguna parte». Esa marca laxa ya se quedó verde con el arreglo
 * saboteado, y ése es el tipo de instrumento que aquí no sirve.
 *
 * Global y no `export` porque esto es un script clásico: lo cargan páginas que no
 * son módulos.
 */
function estaEscribiendo() {
    const e = document.activeElement;
    if (!e) return false;
    const t = (e.tagName || '').toUpperCase();
    // `isContentEditable` cubre los editores que no son `input` ni `textarea`.
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || !!e.isContentEditable;
}
window.ALISA_ESCRIBIENDO = estaEscribiendo;

/**
 * Jugar con las flechas (o WASD). Para los juegos de acción.
 *
 * Aunque el juego avance por ticks, cada pulsación es UNA jugada — el mismo
 * `step(acción)` que usa un agente. Persona y máquina hablan igual.
 *
 * @param {Object} engine
 * @param {Object} [opts]
 * @param {Object} [opts.mapa] tecla → verbo. Por defecto flechas + WASD.
 * @param {boolean} [opts.repetirSolo=false] si true, repite la última dirección
 *        cada tick — para juegos donde no pararse es parte de la gracia.
 * @param {number} [opts.msPorTick=250]
 */
function teclasDireccion(engine, opts = {}) {
    const mapa = opts.mapa ?? {
        ArrowUp: 'arriba', ArrowDown: 'abajo',
        ArrowLeft: 'izquierda', ArrowRight: 'derecha',
        w: 'arriba', s: 'abajo', a: 'izquierda', d: 'derecha',
        W: 'arriba', S: 'abajo', A: 'izquierda', D: 'derecha',
        ' ': 'esperar',
    };
    let ultima = null;
    let reloj = null;

    const enviar = (verbo) => {
        const legales = engine.currentLegalMoves || [];
        // Si el motor publica sus jugadas, se respeta; si no, se manda igual y
        // que las reglas decidan. Nunca se inventa un verbo que no exista.
        if (legales.length && !legales.includes(verbo)) return;
        engine.sendMove(verbo);
    };

    /**
     * ⚠️ SI ESTÁS ESCRIBIENDO, LAS TECLAS SON LETRAS Y NO JUGADAS.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Esto escuchaba en `window` sin mirar dónde estaba el foco, y el mapa incluye
     * `w a s d`, sus mayúsculas y **el espacio**, con `preventDefault()`. Así que al
     * escribir en cualquier campo de texto de la página pasaban las dos cosas a la
     * vez: el personaje se movía de verdad, y la letra NO SE ESCRIBÍA.
     *
     * Es decir: en los juegos de teclas no se podía escribir una frase. Ni los
     * espacios entre palabras.
     *
     * ⚠️ MEDIDO EN SNAKE, ESCRIBIENDO UNA FRASE DE VERDAD EN EL BUZÓN:
     *
     *     quería escribir  «las casas se ven raras y no se donde estoy»
     *     salió            «lcevenrrynoeoneetoy»
     *     letras perdidas  23
     *     y la serpiente   se movió 17 veces
     *
     * Con esta línea: 0 letras perdidas y 0 jugadas. Afecta a los juegos que usan
     * este manejador —snake y peatón— y al botón de «¿algo va raro?», que es el
     * único sitio de todo el arcade donde alguien escribe una frase.
     *
     * ⚠️ Y CÓMO SE ENCONTRÓ, QUE ES LO INTERESANTE: LA SOSPECHA ERA FALSA.
     *
     * Salió de repetir el aviso de un betatester en FAGOCITO —«no se ve el tablero
     * completo y parece que es difícil escribir los mensajes»— cuyo recibo son 25
     * pasos abajo seguidos y 7 a la derecha. Pensé: no estaba jugando, estaba
     * intentando escribir, y cada `s` era un paso abajo.
     *
     * Fagocito NO usa este manejador —va por la mesa genérica— así que ahí la
     * hipótesis no se sostiene, y su queja sigue sin explicar. Pero al ir a medirla
     * apareció el fallo de verdad, en los dos juegos de al lado. Segunda vez hoy que
     * una corazonada equivocada encuentra algo real por obligar a medir en vez de
     * razonar.
     */
    const alPulsar = (ev) => {
        if (estaEscribiendo()) return;
        const verbo = mapa[ev.key];
        if (!verbo) return;
        ev.preventDefault();
        ultima = verbo;
        enviar(verbo);
    };

    window.addEventListener('keydown', alPulsar);

    if (opts.repetirSolo) {
        reloj = setInterval(() => { if (ultima) enviar(ultima); }, opts.msPorTick ?? 250);
    }

    return {
        parar() {
            window.removeEventListener('keydown', alPulsar);
            if (reloj) clearInterval(reloj);
        }
    };
}

// Se expone como global porque los visualizadores son scripts CLÁSICOS y se
// ejecutan de forma síncrona: un módulo ES llegaría tarde, después de que el
// visualizador ya hubiera llamado a `engine.start()`.
window.ALISA_ENTRADA = { clicEnTablero, teclasDireccion };
