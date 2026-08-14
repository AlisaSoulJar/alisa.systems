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
const FORMAS = [
    { nombre: 'ancho', width: 1280, height: 720 },
    { nombre: 'bajo',  width: 1366, height: 633 },
];

const b = await chromium.launch({ channel: 'chrome', headless: true });
console.log('\nLa pasada de betatester, medida\n');
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

        /** ¿Hay jugadas pulsables? */
        const botones = document.querySelectorAll('.mesa-jugada').length;

        /** ¿El panel habla en inglés? */
        const texto = document.querySelector('.hud-panel')?.innerText ?? '';
        const ingles = EN_INGLES.filter(w => texto.includes(w));

        return {
            bordes, botones, ingles,
            panel: Math.round(100 * panel / (total || 1)),
        };
    }, { EN_INGLES, W: forma.width, H: forma.height });

    // Se desborda si toca DOS bordes o más con muchos puntos: uno solo puede ser
    // una sala que llega hasta el filo, que es correcto.
    const tocados = Object.values(r.bordes).filter(n => n > 12).length;
    const quejas = [];
    if (tocados >= 2) quejas.push(`se sale por ${Object.entries(r.bordes).filter(([, n]) => n > 12).map(([k]) => k).join('/')}`);
    if (r.panel > 22) quejas.push(`el panel tapa el ${r.panel}%`);
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
