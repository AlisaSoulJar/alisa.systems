/**
 * raton_tablero.js — CLICAR UN TABLERO, UNA VEZ PARA TODOS
 * ═══════════════════════════════════════════════════════════════════════════
 * Cuatro tableros —go, reversi, mancala, xiangqi— se dibujaban preciosos y no
 * se podían tocar: sus visualizadores no tenían un solo manejador de ratón ni
 * una llamada a `sendMove`. La única forma de jugarlos era escribir la jugada en
 * una caja de texto. Sólo ajedrez y damas estaban terminados.
 *
 * ⚠️ NO SON CUATRO PROBLEMAS. SON UNO, CONFIGURADO CUATRO VECES.
 * Todos son rejillas. Lo único que cambia entre ellos es el tamaño, la
 * separación entre casillas y cómo se llama una casilla en la jugada. Escribir
 * cuatro raycasters a medida habría sido escribir cuatro veces el mismo error.
 *
 * Y hay dos familias, no cuatro:
 *   · COLOCAR (un clic)  — go `a19`, reversi `e6`, mancala `3`
 *   · MOVER   (dos clics) — xiangqi `a6a5`, damas `a3b4`, ajedrez `a2a3`
 *
 * ⚠️ LA JUGADA SE COMPRUEBA CONTRA `currentLegalMoves`, SIEMPRE.
 * El ratón no construye jugadas: propone un nombre de casilla y busca si existe
 * entre las legales. Eso hace imposible que un clic produzca algo ilegal —la
 * misma garantía que tienen los botones de la mesa y que tiene un LLM— y además
 * hace que un error de geometría se note como «no pasa nada» en vez de como una
 * jugada equivocada colada en el recibo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const LETRAS = 'abcdefghijklmnopqrstuvwxyz';

/** Nombre clásico: columna en letra, fila en número empezando por 1. */
export const nombrarLetraNumero = ({ desdeCero = false, filaInvertida = false, filas }) =>
    (col, fil) => LETRAS[col] + ((filaInvertida ? filas - 1 - fil : fil) + (desdeCero ? 0 : 1));

/**
 * Engancha el ratón a un tablero de rejilla.
 *
 * @param {object} cfg
 *   engine     el SovereignBoardEngine ya construido
 *   escena     el THREE.Group / Scene contra el que trazar el rayo
 *   columnas, filas
 *   paso       separación entre centros de casilla, en unidades del mundo
 *   origen     coordenada del centro de la casilla (0,0): `{x, z}`
 *   nombrar    (col, fil) => nombre de casilla, p.ej. 'e6'
 *   modo       'colocar' (un clic) | 'mover' (dos clics)
 *   alMarcar   opcional: (nombre|null) para dibujar la selección
 */
export function engancharRaton({ engine, columnas, filas, paso, origen,
                                 nombrar, modo = 'colocar', alMarcar }) {
    /**
     * ⚠️ `engine.lienzo` Y NO `engine.renderer.domElement`.
     *
     * De invitado —dentro de la sala de bolsillo— el renderizador es de la sala, así
     * que ese camino es `null` y esto moría con
     * `Cannot read properties of null (reading 'domElement')`, llevándose por delante
     * al mancala entero. El motor sabe de quién es el lienzo; aquí sólo hay que
     * preguntárselo. Lo usan cuatro visualizadores, así que arreglarlo aquí los
     * arregla a los cuatro.
     */
    const lienzo = engine.lienzo;
    if (!lienzo) return () => {};
    const rayo = new THREE.Raycaster();
    const raton = new THREE.Vector2();
    // Un plano a la altura del tablero. Se traza contra ÉL y no contra las
    // piezas: así se puede clicar una casilla vacía —que es justo lo que hace
    // falta en go y en reversi— y no depende de cómo cada visualizador haya
    // construido su geometría.
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const punto = new THREE.Vector3();
    let seleccion = null;

    /**
     * ⚠️ EL TABLERO NO SIEMPRE ESTÁ EN `y = 0` NI A ESCALA 1.
     *
     * Esta cuenta —«redondea `(x - origen.x) / paso`»— está escrita en las mismas
     * unidades en que el visualizador construyó su tablero. Eso vale mientras el
     * tablero cuelgue de la escena, que no tiene transformación.
     *
     * De invitado cuelga del GRUPO de la sala, que lo baja a la altura de la mesa
     * (0,985) y lo encoge hasta 1,30 m. Un plano en `y = 0` del mundo está entonces
     * un metro por debajo del tablero, y aunque acertara, las coordenadas del punto
     * estarían en metros de sala y no en las del visualizador: se clicaría el hoyo 0
     * queriendo el 4, o ninguno.
     *
     * Se resuelve preguntándole al propio contenedor dónde está: el plano se saca de
     * SU matriz de mundo, y el punto se traduce a SUS coordenadas antes de contar
     * casillas. Sin invitado, `engine.scene` es la escena, su matriz es la identidad
     * y todo esto vale exactamente lo que valía antes.
     */
    const raiz = () => engine.scene ?? null;
    const arriba = new THREE.Vector3();
    const centro = new THREE.Vector3();
    const situarPlano = () => {
        const r = raiz();
        if (!r) { plano.set(new THREE.Vector3(0, 1, 0), 0); return; }
        r.updateMatrixWorld();
        centro.set(0, 0, 0).applyMatrix4(r.matrixWorld);
        arriba.set(0, 1, 0).transformDirection(r.matrixWorld).normalize();
        plano.setFromNormalAndCoplanarPoint(arriba, centro);
    };

    const casillaEn = (ev) => {
        const r = lienzo.getBoundingClientRect();
        raton.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
        raton.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
        rayo.setFromCamera(raton, engine.camera);
        // Se resitúa en cada clic: la sala encuadra y escala mientras la partida
        // arranca, así que un plano calculado una vez se queda viejo.
        situarPlano();
        if (!rayo.ray.intersectPlane(plano, punto)) return null;
        raiz()?.worldToLocal(punto);
        const col = Math.round((punto.x - origen.x) / paso);
        const fil = Math.round((punto.z - origen.z) / paso);
        if (col < 0 || col >= columnas || fil < 0 || fil >= filas) return null;
        return nombrar(col, fil);
    };

    lienzo.addEventListener('pointerdown', (ev) => {
        const casilla = casillaEn(ev);
        if (!casilla) return;
        const legales = engine.currentLegalMoves || [];

        if (modo === 'colocar') {
            if (legales.includes(casilla)) engine.sendMove(casilla);
            return;
        }

        // Modo mover: el primer clic elige origen, el segundo destino. Sólo se
        // acepta como origen una casilla que EMPIECE alguna jugada legal, para
        // que no se quede seleccionada una pieza que no puede ir a ningún sitio.
        if (!seleccion) {
            if (legales.some(m => m.startsWith(casilla))) {
                seleccion = casilla;
                alMarcar?.(casilla);
            }
            return;
        }
        const jugada = legales.find(m => m === seleccion + casilla);
        seleccion = null;
        alMarcar?.(null);
        if (jugada) engine.sendMove(jugada);
    });
}
