/**
 * salas.mjs — ¿funcionan las mesas compartidas, juego por juego?
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run salas          los que admiten dos sillas
 *     npm run salas ajedrez  sólo ése
 *
 * Importa más de lo que parece: una partida entre dos personas —o una persona
 * contra la casa— destapa cosas que una partida en solitario no puede destapar.
 * Es la vía por la que un betatester encuentra lo que pasa DURANTE la partida.
 *
 * ⚠️ SE MIDE CON DOS NAVEGADORES, Y CON EL CONTRATO DELANTE.
 *
 * Los tres caminos de montaje llaman a `crearSala`, y eso no prueba nada: cable no
 * es corriente. Pero medirlo mal es peor que no medirlo, y aquí ya me equivoqué
 * tres veces seguidas:
 *
 *   1. buscando el objeto de la sala en `window`, donde nadie lo publicaba
 *      (ahora sí: `window.ALISA_SALA`);
 *   2. jugando siempre con la primera pestaña — y daba «nadie tenía jugadas
 *      legales» cuando simplemente le tocaba a la otra silla;
 *   3. leyendo un contador de jugadas que ese objeto no tiene. Me inventé el
 *      nombre del campo en vez de mirar `sala.js`.
 *
 * ⚠️ LA SEÑAL ES EL RECIBO DEL ÁRBITRO, Y COSTÓ DOS INTENTOS.
 *
 * No se pueden comparar los dos tableros: en un juego con información oculta los
 * dos asientos ven cosas distintas A PROPÓSITO, y eso ya me dio un falso rojo.
 *
 * Lo segundo que probé fue el TURNO, y también estaba mal: en entropy `robar_mazo`
 * no cambia de turno —sigues tú, ahora decides qué haces con la carta— así que una
 * mesa perfectamente sana salía en rojo. Una señal que sólo vale para los juegos de
 * una acción por turno no vale.
 *
 * Lo que sí sirve lo publica el árbitro y está en su contrato:
 * `receipt: { game, seed, moves }`. Esa lista es UNA, es de la mesa y no de la
 * silla, y crece cuando juega cualquiera. Si una juega y a la otra le crece el
 * recibo, están en la misma partida. Es además el mismo dato con el que se
 * verifica: si estuviera mal, no verificaría nada.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const P = 8161;
const RAIZ = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const s = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));

const pedidos = process.argv.slice(2).filter(a => !a.startsWith('-'));
const juegos = (pedidos.length ? pedidos : Object.keys(paginas))
    .filter(j => paginas[j] && (paginas[j].sillas ?? 1) >= 2);

/** Lo que la sala sabe de sí misma, con el contrato de `sala.js` delante. */
const mirar = (p) => p.evaluate(async () => {
    const m = window.ALISA_SALA;
    if (!m) return null;
    try { await m.refrescar(); } catch { /* se informa de lo que haya */ }
    return {
        yo: m.yo,
        espectador: !!m.espectador,
        turno: m.ultimo?.turn ?? null,
        // La lista de jugadas de LA MESA: una sola, comun a las dos sillas.
        recibo: m.ultimo?.receipt?.moves?.length ?? null,
        legales: (m.acciones() ?? []).length,
        meToca: !!m.meToca(),
    };
});

const b = await chromium.launch({ channel: 'chrome', headless: true });
console.log(`\n¿Se ven dos personas en la misma mesa?  (${juegos.length} juegos de dos o más sillas)\n`);
const malos = [];

for (const juego of juegos) {
    const sala = `p${Math.random().toString(36).slice(2, 8)}`;
    const url = (yo) => `http://127.0.0.1:${P}/arcade/${paginas[juego].pagina}`
                      + `?juego=${juego}&sala=${sala}&yo=${yo}`;
    const uno = await b.newPage({ viewport: { width: 900, height: 650 } });
    const dos = await b.newPage({ viewport: { width: 900, height: 650 } });
    let queja = null, detalle = '';
    try {
        /**
         * ⚠️ SE ESPERA A QUE LA SALA EXISTA, NO UNOS SEGUNDOS.
         *
         * Esto eran dos `waitForTimeout(5000)`. Con cuatro juegos iba de sobra; con
         * los veinticinco seguidos, brisca salía «no hay sala en la primera pestaña»
         * — y pasaba sola dos minutos después. El mismo fallo que tenía el
         * laboratorio esta mañana: medir a una hora fija en vez de esperar a que lo
         * medido exista.
         *
         * Sentarse implica una ida y vuelta al árbitro, que está en Cloudflare: eso
         * tarda lo que tarde. Se espera a que aparezca, con plazo, y si no aparece
         * en quince segundos ESO ya es el hallazgo.
         */
        const esperarSala = async (p) => {
            for (let t = 0; t < 15000; t += 500) {
                if (await p.evaluate(() => !!window.ALISA_SALA?.ultimo)) return true;
                await p.waitForTimeout(500);
            }
            return false;
        };
        await uno.goto(url('ana'), { waitUntil: 'load', timeout: 25000 });
        const sentadaUna = await esperarSala(uno);   // que se siente antes de abrir la otra
        await dos.goto(url('bea'), { waitUntil: 'load', timeout: 25000 });
        const sentadaDos = await esperarSala(dos);
        if (!sentadaUna || !sentadaDos) {
            queja = `la sala no llegó en 15 s (${!sentadaUna ? 'primera' : 'segunda'} pestaña)`;
        }
        if (!queja) {

        const a = await mirar(uno), c = await mirar(dos);
        if (!a || !c) {
            queja = `no hay sala en ${!a ? 'la primera' : 'la segunda'} pestaña`;
        } else if (a.espectador && c.espectador) {
            queja = 'las dos entraron de espectadoras';
        } else {
            // Juega la que tenga el turno. Que a una le toque y a la otra no es
            // precisamente lo que se espera de una mesa de dos.
            const [quien, miron] = a.meToca ? [uno, dos] : [dos, uno];
            const antes = (a.meToca ? c : a).recibo;
            const jugada = await quien.evaluate(async () => {
                const m = window.ALISA_SALA;
                const acc = m.acciones();
                if (!acc?.length) return null;
                await m.jugar(acc[0]);
                return acc[0];
            });
            if (!jugada) {
                queja = `a nadie le tocaba (ana ${a.turno}/${a.legales}, bea ${c.turno}/${c.legales})`;
            } else {
                await miron.waitForTimeout(3000);
                const d = await mirar(miron);
                detalle = `jugó ${jugada}`;
                /**
                 * ⚠️ SE COMPARA EL RECIBO, Y HAY QUE COMPARARLO CON LO QUE ES.
                 *
                 * Un descuido al cambiar de señal dejó esto comparando `d.turno`
                 * —un nombre— con `antes` —un número—. Nunca son iguales, así que
                 * la queja no saltaba NUNCA y entropy salía en verde sin haber
                 * comprobado nada. Un instrumento que aprueba a todos es peor que
                 * uno que suspende a todos: el segundo se nota.
                 */
                if (!(d.recibo > antes)) {
                    queja = `${detalle} y la otra sigue con ${d.recibo} jugadas (tenía ${antes})`;
                }
            }
        }
        }
    } catch (e) {
        queja = String(e.message).split('\n')[0].slice(0, 50);
    }
    if (queja) malos.push(juego);
    console.log(`  ${queja ? '✗' : '✓'} ${juego.padEnd(11)} ${queja ?? `${detalle} y la otra lo ve`}`);
    await uno.close(); await dos.close();
}

console.log(`\n  ${juegos.length - malos.length}/${juegos.length} mesas compartidas funcionando`);
if (malos.length) console.log(`  fallan: ${malos.join(', ')}`);
await b.close();
s.kill();
