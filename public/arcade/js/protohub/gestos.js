/**
 * gestos.js — deslizar para moverse, en cualquier mesa
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un puñado de juegos de esta casa se juegan con cuatro palabras: `arriba`,
 * `abajo`, `izquierda`, `derecha`. En un móvil, la forma natural de decir eso no es
 * buscar un botón: es deslizar el dedo. Es lo que hace cualquier juego de teléfono
 * desde hace quince años.
 *
 * ⚠️ ESTO VIVE APARTE PORQUE SI NO SE COPIA CUATRO VECES.
 *
 * Lo escribí dentro de `mesa_tablero.mjs` para sus quince juegos, y a los dos días
 * hacía falta igual en snake, fagocito y peatón, que tienen visualizador propio.
 * Cuatro copias de la misma cuenta es como se consigue que tres se arreglen y una
 * no — que es literalmente el fallo que este proyecto lleva arreglando todo el mes.
 *
 * ⚠️ Y NADA QUE NO ESTÉ EN `legal_moves` SALE DE AQUÍ.
 *
 * El gesto no decide la jugada: propone una dirección y se manda sólo si está en la
 * lista. Un atajo que pudiera mandar algo ilegal sería un atajo que se cree las
 * reglas. El panel sigue estando y sigue siendo la lista literal que ve un agente:
 * esto es un segundo camino a las MISMAS jugadas.
 */

/** Los dos vocabularios que hay en casa. Los dos salen de `legal_moves`. */
const DIRECCIONES = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };
const PREFIJOS = ['', 'di:'];

/**
 * 24 px: por debajo de eso es un toque tembloroso, no un gesto. Y hay que poder
 * distinguirlo del arrastre que gira la cámara, que ya existía en todas las mesas.
 */
const MINIMO_GESTO = 24;

/**
 * Engancha el deslizamiento a un lienzo.
 *
 * @param {object} cfg
 * @param {HTMLCanvasElement} cfg.lienzo   dónde se escucha
 * @param {THREE.Camera}      cfg.camara   para saber dónde cae el dedo en la mesa
 * @param {() => string[]}    cfg.legales  las jugadas legales AHORA (se pregunta en
 *        el momento, no se guarda: entre un gesto y el siguiente cambian)
 * @param {(m: string) => void} cfg.enviar  qué hacer con la jugada elegida
 * @returns {() => void} para desengancharlo, si alguna vez hace falta
 */
function deslizarParaMoverse({ lienzo, camara, legales, enviar }) {
    if (!lienzo || !camara) return () => {};

    /**
     * Dónde cae un punto de la pantalla, sobre la mesa.
     *
     * ⚠️ SIN REDONDEAR A CASILLAS, y esto costó encontrarlo: sokoban tiene una
     * rejilla de 5x3 que la mesa escala para llenar la pantalla, así que una casilla
     * mide media pantalla y un deslizamiento normal empieza y acaba DENTRO de la
     * misma. Restando casillas salía cero y el gesto no hacía nada.
     */
    const enLaMesa = (x, y) => {
        const caja = lienzo.getBoundingClientRect();
        const raton = new THREE.Vector2(
            ((x - caja.left) / caja.width) * 2 - 1,
            -((y - caja.top) / caja.height) * 2 + 1,
        );
        const rayo = new THREE.Raycaster();
        rayo.setFromCamera(raton, camara);
        const punto = new THREE.Vector3();
        return rayo.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), punto)
            ? punto : null;
    };

    let desde = null;
    const alEmpezar = (ev) => { desde = { x: ev.clientX, y: ev.clientY }; };

    const alSoltar = (ev) => {
        if (!desde) return;
        // El punto de partida se copia ANTES de soltar la variable. Lo escribí al
        // revés una vez —`desde = null` y tres líneas después `desde.x`— y el gesto
        // dejó de hacer nada en nueve juegos a la vez, sin más señal que un error
        // en la consola que nadie mira.
        const inicio = desde;
        desde = null;

        if (Math.hypot(ev.clientX - inicio.x, ev.clientY - inicio.y) < MINIMO_GESTO) return;

        /**
         * ⚠️ LA PANTALLA NO ESTÁ ALINEADA CON LA MESA: LA CÁMARA GIRA.
         *
         * «Arriba» tiene que ser arriba EN LA MESA, no en el cristal. Si se tomara
         * el gesto en píxeles, en cuanto alguien girase la vista un poco, deslizar
         * hacia arriba movería en diagonal. Así que se convierten los dos extremos
         * del gesto a coordenadas de la mesa y se restan: el gesto se mide donde se
         * juega.
         */
        const a = enLaMesa(inicio.x, inicio.y);
        const b = enLaMesa(ev.clientX, ev.clientY);
        if (!a || !b) return;
        const gx = b.x - a.x, gz = b.z - a.z;
        if (gx === 0 && gz === 0) return;
        const [ex, ez] = Math.abs(gx) >= Math.abs(gz) ? [Math.sign(gx), 0] : [0, Math.sign(gz)];

        const ahora = legales() ?? [];
        for (const [nombre, [vx, vz]] of Object.entries(DIRECCIONES)) {
            if (vx !== ex || vz !== ez) continue;
            for (const p of PREFIJOS) {
                if (ahora.includes(p + nombre)) { enviar(p + nombre); return; }
            }
        }
    };

    lienzo.addEventListener('pointerdown', alEmpezar);
    lienzo.addEventListener('pointerup', alSoltar);
    return () => {
        lienzo.removeEventListener('pointerdown', alEmpezar);
        lienzo.removeEventListener('pointerup', alSoltar);
    };
}

/**
 * ⚠️ SE PUBLICA EN `window` Y NO CON `export`, Y NO ES DEJADEZ.
 *
 * Quien más lo necesita es `SovereignBoardEngine.js`, y los motores y los
 * visualizadores viejos de esta casa NO son módulos: son scripts clásicos que se
 * hablan por globales. Un `export` aquí los dejaría fuera, que son justo los ocho
 * juegos que no tenían manera de jugarse con el dedo.
 *
 * Los módulos (`mesa_tablero.mjs`) leen el global igual de bien. Convertir los
 * motores a módulos es otra tarea, y mezclarla con ésta haría imposible saber cuál
 * de los dos cambios rompió qué — que es lo que ya dice `montarMesa.js`.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LAS NORMAS DEL JUEGO, VISIBLES Y CAMBIABLES EN LA MESA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un juego puede tener normas variables —damas es el primero: `damaVuela`,
 * `peonComeAtras`— y hasta ahora sólo se podían poner escribiendo `?normas=` en la
 * dirección. Eso sirve para una prueba y no para una persona.
 *
 * ⚠️ CAMBIAR UNA NORMA RECARGA LA PÁGINA, Y ES LO CORRECTO.
 *
 * Las reglas se construyen al montar la mesa, así que cambiarlas a media partida
 * dejaría jugadas ya hechas bajo unas normas y las siguientes bajo otras: un recibo
 * que no se puede volver a jugar de ninguna manera. Recargar empieza una partida
 * limpia, que es lo honesto y además lo que espera cualquiera al cambiar las reglas.
 *
 * Va en la cabecera, junto al título y al botón de volcar: es una propiedad de la
 * MESA, no una jugada. Entre los botones de jugar sería otra acción que un agente no
 * tiene, y eso rompería la comparación.
 */
function ponerNormas(donde, declaradas, activas) {
    if (!donde || !declaradas || donde.querySelector(':scope > .mesa-normas')) return;
    const caja = document.createElement('div');
    caja.className = 'mesa-normas';

    for (const nombre of Object.keys(declaradas)) {
        const et = document.createElement('label');
        et.className = 'mesa-norma';
        const marca = document.createElement('input');
        marca.type = 'checkbox';
        marca.checked = !!activas[nombre];
        marca.addEventListener('change', () => {
            const puestas = Object.keys(declaradas)
                .filter(k => (k === nombre ? marca.checked : !!activas[k]));
            const u = new URL(location.href);
            if (puestas.length) u.searchParams.set('normas', puestas.join(','));
            else u.searchParams.delete('normas');
            // La semilla se suelta: cambiar las reglas empieza otra partida, y
            // conservar la semilla haría creer que es la misma.
            u.searchParams.delete('semilla');
            location.href = u.href;
        });
        et.append(marca, document.createTextNode(nombre));
        caja.appendChild(et);
    }
    donde.appendChild(caja);
}

window.ALISA_GESTOS = { deslizarParaMoverse, ponerNormas };
