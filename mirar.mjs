/**
 * mirar.mjs — la pasada de betatester, pero medida
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run mirar            los 35
 *     npm run mirar go mancala sólo esos
 *
 * ⚠️ POR QUÉ EXISTE, Y POR QUÉ NO ES EL LABORATORIO.
 *
 * El laboratorio pregunta «¿se puede jugar?» y responde bien: pinta, llega una
 * jugada, cambia la imagen. Con eso los 35 salen en verde. Y aun así, mirando las
 * capturas una por una aparecieron cosas que ninguna de sus seis medidas ve:
 *
 *   · el suelo de la habitación partía el tapete en cuñas, meses, con 92,9% pintado
 *   · once juegos daban sus jugadas como texto gris cortado en vez de botones
 *   · en fagocito y mancala el tablero se sale de la pantalla
 *   · el panel tapa media mesa en algunos, y está en inglés en once
 *
 * Todo eso se ve MIRANDO. Lo que hace esto es coger las cuatro que ya he visto y
 * convertirlas en números, para no tener que abrir treinta y una imágenes cada vez.
 * Las capturas siguen guardándose: esto dice CUÁLES merece la pena abrir.
 *
 * No sustituye a mirar. Encuentra lo que ya sé buscar; lo que no sé, sigue estando
 * en las imágenes.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const P = 8157;
const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const s = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));

/** Palabras que delatan un panel sin traducir. */
const EN_INGLES = ['CONNECTION', 'ENGINE TURN', 'CHECK STATUS', 'STOP MATCH', 'START MATCH',
                   'UNDO', 'RESTART', 'SEND', 'Move (e.g.'];

const pedidos = process.argv.slice(2).filter(a => !a.startsWith('-'));
const juegos = (pedidos.length ? pedidos : Object.keys(paginas)).filter(j => paginas[j]);

/**
 * ⚠️ DOS FORMAS DE VENTANA, Y LA SEGUNDA ES LA QUE ME PILLÓ.
 *
 * Esto miraba a 1280x720 y sólo a 1280x720. El 13-08-2026 llegó un aviso:
 *
 *     «no se ve el tablero completo en fagocito»   — escritorio, 1366x633
 *
 * Y esta misma prueba daba fagocito LIMPIO, con razón: a 720 de alto cabe entero.
 * El fallo no estaba en el juego ni en la comprobación —que ya miraba si el
 * dibujo toca los bordes, y lo miraba bien—, estaba en que sólo se preguntaba de
 * UNA forma. Una cámara escrita a mano acierta en la ventana en la que se
 * escribió; medir en esa misma ventana no descubre nada.
 *
 * `bajo` es 1366x633 porque es literalmente la ventana del aviso: no un tamaño
 * inventado que parezca difícil, sino el que ya rompió una vez. Los tamaños que
 * fallaron de verdad valen más que los que uno imagina.
 */
/**
 * ⚠️ Y LA TERCERA ES UN MÓVIL, PORQUE SIN ELLA LA COMPROBACIÓN NUEVA NO VE NADA.
 *
 * Las dos de arriba son de escritorio, y ahí el panel es una columna lateral que
 * deja libre el centro: `arribaLibre` vale 0 y no hay nada que esquivar. El fallo
 * que destapó la comprobación de piezas escondidas —xiangqi con once de treinta y
 * dos debajo del HUD— sólo ocurre en vertical, donde el panel ocupa el ancho entero
 * y se come el 45% del alto.
 *
 * O sea que había escrito una comprobación que no podía ver el fallo para el que la
 * escribí. Y no es casualidad que se me escapara: los avisos de betatester llegan de
 * teléfonos —uno vino de una pantalla de 276 px— y aquí no se miraba ninguno.
 */
const FORMAS = [
    { nombre: 'ancho', width: 1280, height: 720 },
    { nombre: 'bajo',  width: 1366, height: 633 },
    /**
     * ⚠️ Y CON SU PROPIO LISTÓN DE «CUÁNTO TAPA EL PANEL».
     *
     * El 22% se calibró mirando escritorio, donde el panel es una columna estrecha a
     * un lado. En vertical es una franja que ocupa el ancho entero: mide un 30% en
     * xiangqi y un 24% en go, y eso NO es un fallo — es el diseño, y el tablero se
     * coloca debajo a propósito.
     *
     * No subo el número para que se ponga verde: lo que hago es reconocer que el
     * porcentaje era un sustituto de la pregunta buena —«¿se ve lo que hay que
     * ver?»— y que en vertical ese sustituto ya no vale. Quien contesta la pregunta
     * buena es la cuenta de piezas escondidas, que no depende de la forma.
     *
     * El 48% sigue siendo un tope real: un panel que se coma media pantalla vertical
     * deja el juego en una rendija, y eso sí hay que saberlo.
     */
    { nombre: 'móvil', width: 390,  height: 844, topePanel: 48 },
];

const b = await chromium.launch({ channel: 'chrome', headless: true });

/**
 * ⚠️ ESTO TARDA, Y HAY QUE PODER DISTINGUIR «LENTO» DE «COLGADO».
 *
 * Son dos formas de ventana por juego, o sea setenta cargas de página con Chrome
 * de verdad: entre diez y veinticinco minutos según lo que más esté corriendo a la
 * vez. El 14-08-2026 lo di por colgado y lo maté cuando iba por la mitad — y luego
 * me inventé una causa (un puerto ocupado) que además era falsa, porque esto sirve
 * por el 8157 con `servir.py` y el proceso que sospeché estaba en el 8099.
 *
 * Lo que me dejó a ciegas fue filtrar esta salida por `Select-String` al lanzarlo:
 * imprime juego a juego a propósito, y colando la salida por un filtro que sólo
 * busca el total no se ve avanzar nada hasta el final. Un instrumento largo que no
 * dice por dónde va es un instrumento que se mata por error.
 *
 * Se anuncia el trabajo ANTES de empezarlo, que es lo que faltaba.
 */
console.log(`\nLa pasada de betatester, medida`);
console.log(`  ${juegos.length} juegos x ${FORMAS.length} ventanas = `
          + `${juegos.length * FORMAS.length} cargas. Esto tarda un rato; va imprimiendo.\n`);
const malos = [];

for (const juego of juegos) {
  for (const forma of FORMAS) {
    const p = await b.newPage({ viewport: { width: forma.width, height: forma.height } });
    const info = paginas[juego];
    try {
        await p.goto(`http://127.0.0.1:${P}/arcade/${info.pagina}?semilla=7&juego=${juego}`,
                     { waitUntil: 'load', timeout: 25000 });
        await p.waitForTimeout(5000);
    } catch { }

    const r = await p.evaluate(({ EN_INGLES, W, H }) => {

        /**
         * ¿Se sale el tablero de la pantalla? Se mira si hay contenido dibujado
         * PEGADO a los bordes del lienzo. Un tablero encuadrado deja aire; uno que
         * se desborda llega hasta el filo y sigue.
         */
        const c = document.querySelector('canvas');
        let bordes = { arriba: 0, abajo: 0, izq: 0, der: 0 };
        if (c) {
            const g = document.createElement('canvas');
            g.width = c.width; g.height = c.height;
            g.getContext('2d').drawImage(c, 0, 0);
            const ctx = g.getContext('2d');
            const vivo = (x, y) => {
                const d = ctx.getImageData(x, y, 1, 1).data;
                // Vivo = no es el fondo casi negro de la escena.
                return (d[0] + d[1] + d[2]) > 90;
            };
            const N = 40;
            for (let i = 1; i < N; i++) {
                const x = Math.round(g.width * i / N), y = Math.round(g.height * i / N);
                if (vivo(x, 2)) bordes.arriba++;
                if (vivo(x, g.height - 3)) bordes.abajo++;
                if (vivo(2, y)) bordes.izq++;
                if (vivo(g.width - 3, y)) bordes.der++;
            }
        }

        /** ¿Cuánto de la pantalla se come el panel? */
        let panel = 0, total = 0;
        for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) {
            total++;
            const e = document.elementFromPoint(x, y);
            if (e && e.closest('.hud-panel')) panel++;
        }

        /**
         * ⚠️ ¿HAY PIEZAS DEBAJO DEL PANEL? NO ES LO MISMO QUE «CUÁNTO TAPA».
         *
         * Justo aquí abajo se mide qué porcentaje de pantalla ocupa el panel, y los
         * treinta y cinco pasaban el listón del 22%. Pero un porcentaje bajo no
         * impide que lo tapado sea justo lo único que hay que ver: en snake la
         * comida sale a veces debajo del HUD, y en xiangqi móvil quedaban ONCE de
         * treinta y dos piezas escondidas — con el panel ocupando un 18%.
         *
         * Así que se pregunta lo que importa: proyectar cada pieza con la cámara de
         * verdad y contar cuántas caen dentro del rectángulo del panel.
         *
         * Sólo se puede en las mesas genéricas, que exponen `ALISA_PINTOR` y
         * `ALISA_CAMARA`. Las de visualizador propio quedan sin medir y se DICE —
         * contarlas como limpias sería peor que no mirarlas.
         *
         * ⚠️ SE PREGUNTA A LA MALLA, NO SE INTERPOLA SOBRE LA CAJA.
         *
         * La primera versión sacaba la posición de cada pieza interpolando sobre el
         * `Box3` de la raíz. Esa caja incluye el FARO, que va metro y medio por
         * encima del tablero, así que proyectaba todas las piezas por los aires — o
         * sea dentro del panel. Daba «11 de 32 tapadas» ANTES y DESPUÉS del arreglo,
         * exactamente igual, porque no medía las piezas: medía mi cuenta.
         *
         * Las matrices de instancia dicen dónde está cada pieza de verdad. Y se
         * filtra por `p:` para no contar el suelo ni el faro.
         */
        let escondidas = null;
        try {
            const cam = window.ALISA_CAMARA, raiz = window.ALISA_PINTOR?.raiz;
            const panelR = document.querySelector('.hud-panel')?.getBoundingClientRect();
            if (cam && raiz && panelR) {
                raiz.updateMatrixWorld(true);
                const m = new THREE.Matrix4(), pos = new THREE.Vector3();
                let vistas = 0;
                escondidas = 0;
                raiz.traverse((o) => {
                    if (!o.isInstancedMesh || !o.count || !/^p:/.test(o.name || '')) return;
                    for (let i = 0; i < o.count; i++) {
                        o.getMatrixAt(i, m);
                        m.premultiply(o.matrixWorld);
                        pos.setFromMatrixPosition(m).project(cam);
                        const px = (pos.x + 1) / 2 * W, py = (1 - pos.y) / 2 * H;
                        vistas++;
                        if (px >= panelR.left && px <= panelR.right
                            && py >= panelR.top && py <= panelR.bottom) escondidas++;
                    }
                });
                if (!vistas) escondidas = null;      // sin piezas: no hay nada que decir
            }
        } catch { escondidas = null; }

        /** ¿Hay jugadas pulsables? */
        const botones = document.querySelectorAll('.mesa-jugada').length;

        /** ¿El panel habla en inglés? */
        const texto = document.querySelector('.hud-panel')?.innerText ?? '';
        const ingles = EN_INGLES.filter(w => texto.includes(w));

        return {
            bordes, botones, ingles, escondidas,
            panel: Math.round(100 * panel / (total || 1)),
        };
    }, { EN_INGLES, W: forma.width, H: forma.height });

    // Se desborda si toca DOS bordes o más con muchos puntos: uno solo puede ser
    // una sala que llega hasta el filo, que es correcto.
    const tocados = Object.values(r.bordes).filter(n => n > 12).length;
    const quejas = [];
    if (tocados >= 2) quejas.push(`se sale por ${Object.entries(r.bordes).filter(([, n]) => n > 12).map(([k]) => k).join('/')}`);
    const topePanel = forma.topePanel ?? 22;
    if (r.panel > topePanel) quejas.push(`el panel tapa el ${r.panel}% (tope ${topePanel})`);
    // Una sola pieza escondida ya es una queja: no hay «poquito invisible».
    if (r.escondidas > 0) quejas.push(`${r.escondidas} pieza(s) DEBAJO del panel`);
    if (!r.botones) quejas.push('sin jugadas pulsables');
    if (r.ingles.length) quejas.push(`en inglés (${r.ingles.slice(0, 3).join(', ')})`);

    // Un juego se cuenta UNA vez aunque falle en las dos formas: lo que se mide es
    // cuántos juegos están bien, no cuántas pasadas salieron mal.
    if (quejas.length && !malos.includes(juego)) malos.push(juego);
    console.log(`  ${quejas.length ? '✗' : '✓'} ${juego.padEnd(11)} ${forma.nombre.padEnd(5)}`
        + ` panel ${String(r.panel).padStart(2)}% · ${String(r.botones).padStart(3)} botones`
        + (quejas.length ? `   ⚠ ${quejas.join(' · ')}` : ''));
    await p.close();
  }
}

console.log(`\n  ${juegos.length - malos.length}/${juegos.length} limpios`
          + ` (mirados en ${FORMAS.map(f => `${f.width}x${f.height}`).join(' y ')})`);
if (malos.length) console.log(`  mira estas capturas: ${malos.join(', ')}`);
await b.close();
s.kill();
