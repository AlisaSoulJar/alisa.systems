/**
 * volcar.js — la rabieta: tirar la mesa, y que se recomponga sola
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * (╯°□°)╯︵ ┻━┻
 *
 * ⚠️ VOLCAR NO ES UNA JUGADA, Y ESA ES TODA LA GRACIA.
 *
 * No entra en `legal_moves`, no se manda al hub, no viaja en el recibo y no cambia
 * el estado ni un bit. Es la misma razón de siempre: los botones de jugar son la
 * lista LITERAL que recibe un agente por la puerta de texto, y si una persona
 * tuviera una acción que él no tiene, dejarían de estar jugando a lo mismo. Rendirse
 * de verdad sería una jugada y ningún juego la ofrece; esto es sólo el gesto.
 *
 * Y por eso funciona el remate: como el estado no se toca, EL SIGUIENTE REPINTADO LO
 * DEVUELVE TODO A SU SITIO. Vuelcas, las cartas ruedan por el suelo, y un segundo
 * después están colocadas otra vez. Es la tesis del motor hecha broma: el render es
 * un espectador, no un nervio — puedes tirarle la mesa encima y la partida ni se
 * entera.
 *
 * ⚠️ MIENTRAS DURA, EL SONDEO NO PUEDE REPINTAR.
 *
 * El estado se consulta cada segundo y repintar coloca cada pieza en su destino: a
 * mitad del vuelo, la mesa se recompondría de golpe en el aire. Por eso `volcando()`
 * es público y las mesas lo consultan antes de dibujar. La cuenta la lleva ESTE
 * módulo y no cada mesa por su cuenta, que es como se acaba teniendo dos banderas
 * que dicen cosas distintas.
 */
import { KinematicRageSystem } from '/js/alisa-engine/src/world/systems/KinematicRageSystem.js';

let enMarcha = false;

/** ¿Hay una mesa por el aire ahora mismo? Las mesas lo miran antes de repintar. */
export function volcando() { return enMarcha; }

/**
 * Tira la mesa y espera a que caiga todo.
 *
 * @param {THREE.Object3D[]} piezas  Lo que sale volando. Se leen y escriben sus
 *        `position` y `rotation` directamente: el motor trabaja con objetos
 *        abstractos `{id, position, rotation}` y no sabe que existe three.js, así
 *        que el puente es esto y son cuatro líneas.
 * @param {object} [opciones]
 * @param {number} [opciones.suelo]   Altura del suelo donde rebotan.
 * @param {number} [opciones.duracion] Milisegundos antes de devolver el control.
 * @param {() => number} [opciones.azar] Para repetir el mismo estropicio.
 * @param {boolean} [opciones.comoTablero] Trata todo lo que le pases como tablero:
 *        menos fuerza y sin dar vueltas sobre sí mismo. Es lo que quieren los juegos
 *        de tablero, donde lo que se vuelca es UNA cosa —el tablero entero, que es
 *        un `THREE.Group` sin geometría propia y por eso no se puede medir sola.
 * @returns {Promise<void>} Se resuelve cuando ha terminado. Quien llama repinta
 *          después, y ese repintado es el que lo recoloca todo.
 */
export async function volcarMesa(piezas, opciones = {}) {
    if (enMarcha || !piezas?.length) return;
    enMarcha = true;

    const { suelo = -6, duracion = 2600, azar, comoTablero = false } = opciones;
    const rabia = new KinematicRageSystem({ gravity: -60, azar });

    // ⚠️ SE GUARDA DÓNDE ESTABA CADA COSA ANTES DE TIRARLA.
    //
    // El repintado devuelve a su sitio lo que el estado conoce —las cartas, las
    // fichas— pero puede haber piezas de adorno que no salen de ningún estado y se
    // quedarían tiradas por el suelo para siempre. Se restauran a mano al final.
    const original = piezas.map(m => ({
        m,
        p: { x: m.position.x, y: m.position.y, z: m.position.z },
        r: { x: m.rotation.x, y: m.rotation.y, z: m.rotation.z },
    }));

    let cuerpos = rabia.applyImpulse(
        piezas.map((m, i) => ({
            id: i,
            position: { x: m.position.x, y: m.position.y, z: m.position.z },
            rotation: { x: m.rotation.x, y: m.rotation.y, z: m.rotation.z },
            // La pieza más ancha hace de tablero: sale con menos fuerza y sin girar
            // sobre sí misma, que es como se vuelca una mesa de verdad.
            isBoard: comoTablero || anchura(m) > 4,
        })),
        { floorY: suelo, horizontalForce: 14, verticalForce: 26 },
    );

    const t0 = performance.now();
    let anterior = t0;
    await new Promise((listo) => {
        const paso = (ahora) => {
            // dt real y con techo: si la pestaña se va a segundo plano, un salto de
            // varios segundos mandaría todo a la estratosfera de un solo fotograma.
            const dt = Math.min((ahora - anterior) / 1000, 0.05);
            anterior = ahora;
            cuerpos = rabia.tick(cuerpos, dt);
            for (const c of cuerpos) {
                const m = piezas[c.id];
                m.position.set(c.position.x, c.position.y, c.position.z);
                m.rotation.set(c.rotation.x, c.rotation.y, c.rotation.z);
            }
            if (ahora - t0 < duracion) requestAnimationFrame(paso);
            else listo();
        };
        requestAnimationFrame(paso);
    });

    for (const { m, p, r } of original) {
        m.position.set(p.x, p.y, p.z);
        m.rotation.set(r.x, r.y, r.z);
    }
    enMarcha = false;
}

/** Lo ancho que es algo, para distinguir el tablero de las fichas. */
function anchura(malla) {
    const g = malla.geometry;
    if (!g) return 0;
    if (!g.boundingBox) g.computeBoundingBox?.();
    const b = g.boundingBox;
    if (!b) return 0;
    const ex = (b.max.x - b.min.x) * (malla.scale?.x ?? 1);
    const ez = (b.max.z - b.min.z) * (malla.scale?.z ?? 1);
    return Math.max(ex, ez);
}

/**
 * El botón. Va en la cabecera del panel y NO entre las jugadas: si cayera ahí
 * dentro parecería una acción del juego, y no lo es.
 */
export function ponerBoton(donde, alPulsar) {
    if (!donde || donde.querySelector(':scope > .mesa-volcar')) return;
    const b = document.createElement('button');
    b.className = 'mesa-volcar';
    b.type = 'button';
    b.title = 'Volcar la mesa (no es una jugada: no cambia la partida)';
    b.setAttribute('aria-label', 'volcar la mesa');
    b.textContent = '(╯°□°)╯︵ ┻━┻';
    b.addEventListener('click', (e) => { e.stopPropagation(); alPulsar(); });
    donde.appendChild(b);
}
