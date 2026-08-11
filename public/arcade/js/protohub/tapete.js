/**
 * tapete.js — el paño de la mesa, dibujado, y el mismo en las dos salas
 * ═══════════════════════════════════════════════════════════════════════════
 *     const paño = crearTapete(THREE, 2.10);
 *
 * ⚠️ POR QUÉ ESTO ES UN MÓDULO Y NO DOS TROZOS DE CÓDIGO PARECIDOS.
 *
 * El tapete existía dos veces: uno en `sala.html` y otro en la Sala del Huevo, y
 * ya se habían separado sin que nadie lo viera — 2,68 contra 1,34, el doble de
 * ancho. Al sentarte cambiaba de tamaño debajo de las manos. Dos copias de una
 * cosa decorativa divergen igual que dos copias de una regla; sólo que cuando
 * diverge una regla te enteras.
 *
 * ⚠️ Y POR QUÉ SE DIBUJA EN VEZ DE CARGAR UNA IMAGEN.
 *
 * No hay ningún logo en fichero: la marca de este proyecto es tipográfica. Un PNG
 * habría que crearlo, versionarlo, servirlo y acordarse de él. Un lienzo se
 * calcula al arrancar, escala a cualquier tamaño sin pixelarse y no añade una
 * petición — que además es lo que exige la prueba de «ninguna página carga código
 * ni recursos desde fuera».
 *
 * El paño es el FONDO de una partida: tiene que verse bonito de reojo y
 * desaparecer cuando miras las cartas. Por eso el ribete es la única parte con
 * contraste y la palabra del centro va casi al borde de lo visible: si compite
 * con una carta, ha ganado la parte equivocada.
 */

/** El morado del HUD (`--glow-chess`). La marca de la casa, no un color al azar. */
export const MORADO = '#a180ff';
/** El verde del paño, el mismo `0x14352a` que ya usaban las dos salas. */
export const VERDE = '#14352a';

/**
 * @param {object} THREE   el three de quien llama — esta pieza no importa el suyo,
 *                         que sería un segundo three en memoria (ya nos costó caro
 *                         con TWEEN: dos objetos y las cartas congeladas).
 * @param {number} lado    en metros
 * @param {object} opciones
 *   texto   la palabra del centro; '' para ninguna
 *   verde   el color del paño
 *   ribete  el color del filo
 */
export function crearTapete(THREE, lado = 2.10, opciones = {}) {
    const { texto = 'ALISA', verde = VERDE, ribete = MORADO } = opciones;

    const L = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = L;
    const g = c.getContext('2d');

    // ── El paño ──────────────────────────────────────────────────────────
    g.fillStyle = verde;
    g.fillRect(0, 0, L, L);

    /**
     * Un verde plano se lee como plástico. El fieltro tiene grano, y basta con
     * muy poco: mil manchas de un píxel a opacidad baja. Se dibuja con un azar
     * FIJO —no `Math.random()`— para que dos jugadores en la misma sala vean el
     * mismo paño; que no cambie nada del juego no lo hace menos raro.
     */
    let semilla = 0x9e3779b9;
    const azar = () => {
        semilla ^= semilla << 13; semilla ^= semilla >>> 17; semilla ^= semilla << 5;
        return ((semilla >>> 0) % 1000) / 1000;
    };
    for (let i = 0; i < 22000; i++) {
        g.fillStyle = azar() > 0.5 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.028)';
        g.fillRect(azar() * L, azar() * L, 2, 2);
    }

    // Un halo suave en el centro: la luz de la lámpara cae ahí, y sin esto el
    // paño se ve igual de plano en el borde que debajo del foco.
    const halo = g.createRadialGradient(L / 2, L / 2, L * 0.05, L / 2, L / 2, L * 0.62);
    halo.addColorStop(0, 'rgba(255,255,255,0.075)');
    halo.addColorStop(1, 'rgba(0,0,0,0.16)');
    g.fillStyle = halo;
    g.fillRect(0, 0, L, L);

    // ── El ribete ────────────────────────────────────────────────────────
    // Dos filos y no uno: el fino de dentro es lo que hace que parezca cosido en
    // vez de pintado. Es el mismo truco que el borde doble de una carta.
    g.strokeStyle = ribete;
    g.globalAlpha = 0.85;
    g.lineWidth = 10;
    g.strokeRect(26, 26, L - 52, L - 52);
    g.globalAlpha = 0.35;
    g.lineWidth = 3;
    g.strokeRect(46, 46, L - 92, L - 92);
    g.globalAlpha = 1;

    // ── La marca ─────────────────────────────────────────────────────────
    if (texto) {
        g.save();
        g.translate(L / 2, L / 2);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        // Muy tenue a propósito: esto va DEBAJO de las cartas. Un logo que se lee
        // bien sobre un tapete es un logo que estorba durante la partida.
        g.globalAlpha = 0.10;
        g.fillStyle = ribete;
        g.font = `600 ${Math.round(L * 0.105)}px Inter, "Segoe UI", sans-serif`;
        // Abierto, pero no tanto que la palabra cruce la mesa de lado a lado: a
        // 0,05 las letras quedaban tan sueltas que se leían como cinco cosas.
        g.letterSpacing = `${Math.round(L * 0.022)}px`;  // ignorado si el navegador no lo soporta
        g.fillText(texto, Math.round(L * 0.011), 0);     // compensa el espaciado de la última letra
        g.globalAlpha = 1;
        g.restore();
    }

    const textura = new THREE.CanvasTexture(c);
    textura.anisotropy = 4;

    const m = new THREE.Mesh(
        new THREE.BoxGeometry(lado, 0.005, lado),
        // Lambert y no Standard: este paño está en dos salas con luces distintas,
        // y Lambert se ve igual en las dos. Un material físico se vería más verde
        // bajo el foco de una y más apagado bajo la otra — que es exactamente la
        // diferencia que esta pieza existe para quitar.
        new THREE.MeshLambertMaterial({ map: textura }),
    );
    m.receiveShadow = true;
    return m;
}
