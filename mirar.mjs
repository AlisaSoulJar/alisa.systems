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

const b = await chromium.launch({ channel: 'chrome', headless: true });
console.log('\nLa pasada de betatester, medida\n');
const malos = [];

for (const juego of juegos) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    const info = paginas[juego];
    try {
        await p.goto(`http://127.0.0.1:${P}/arcade/${info.pagina}?semilla=7&juego=${juego}`,
                     { waitUntil: 'load', timeout: 25000 });
        await p.waitForTimeout(5000);
    } catch { }

    const r = await p.evaluate(({ EN_INGLES }) => {
        const W = 1280, H = 720;

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
    }, { EN_INGLES });

    // Se desborda si toca DOS bordes o más con muchos puntos: uno solo puede ser
    // una sala que llega hasta el filo, que es correcto.
    const tocados = Object.values(r.bordes).filter(n => n > 12).length;
    const quejas = [];
    if (tocados >= 2) quejas.push(`se sale por ${Object.entries(r.bordes).filter(([, n]) => n > 12).map(([k]) => k).join('/')}`);
    if (r.panel > 22) quejas.push(`el panel tapa el ${r.panel}%`);
    if (!r.botones) quejas.push('sin jugadas pulsables');
    if (r.ingles.length) quejas.push(`en inglés (${r.ingles.slice(0, 3).join(', ')})`);

    if (quejas.length) malos.push(juego);
    console.log(`  ${quejas.length ? '✗' : '✓'} ${juego.padEnd(11)}`
        + ` panel ${String(r.panel).padStart(2)}% · ${String(r.botones).padStart(3)} botones`
        + (quejas.length ? `   ⚠ ${quejas.join(' · ')}` : ''));
    await p.close();
}

console.log(`\n  ${juegos.length - malos.length}/${juegos.length} limpios`);
if (malos.length) console.log(`  mira estas capturas: ${malos.join(', ')}`);
await b.close();
s.kill();
