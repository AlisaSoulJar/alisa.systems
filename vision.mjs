/**
 * vision.mjs — el asiento que MIRA el tablero en vez de leerlo
 * ═══════════════════════════════════════════════════════════════════════════
 *     node vision.mjs --juego damas --modelo llama3.2-vision:11b --jugadas 6
 *
 * ⚠️ EL SEXTO TIPO DE JUGADOR, Y HASTA HOY NO EXISTÍA.
 *
 * El sistema declara cinco asientos (`asientos.js`): persona, tres políticas y un
 * modelo. Ese modelo juega **por la puerta de texto** — recibe el estado descrito y
 * contesta un número. Lo pidió Oscar mirando el hueco: «y faltaría agentes con
 * visión, ¿no?». Falta, sí.
 *
 * Y no es un capricho de completismo. El banco entero existe para comparar personas
 * con máquinas en el MISMO juego, y hoy no juegan igual:
 *
 *     persona   ve el tablero dibujado, y los botones de jugada legal
 *     modelo    lee el estado en texto perfecto y estructurado, sin verlo
 *
 * Son dos tareas distintas disfrazadas de una. El agente de texto lo tiene más fácil
 * en lo perceptivo —le damos el estado ya digerido— y más difícil en lo espacial. Un
 * asiento que mire la misma imagen que la persona es el que cierra esa comparación.
 *
 * ⚠️ CÓMO SE DIBUJA, SIN INVENTAR UN RENDER NUEVO.
 *
 * `pintar2d.js` ya es una función PURA del sustrato: `(ctx, sustrato) → cuadro`, sin
 * saber a qué se juega. Sirve para los 35 sin una línea por juego, que es la misma
 * propiedad que hace que el repetidor funcione en todos. Se pinta en un Chrome
 * headless —el mismo que usan `mirar` y el laboratorio— y sale un PNG.
 *
 * ⚠️ Y LO QUE VE ES LO QUE VE UNA PERSONA. NI MÁS NI MENOS.
 *
 * Se le manda la imagen y la lista de jugadas legales, porque eso es exactamente lo
 * que tiene delante quien juega: el tablero y los botones del panel. No se le manda
 * el estado en texto — eso sería el asiento de texto con una imagen de adorno, y
 * mediríamos otra cosa creyendo que medimos ésta.
 *
 * Esto es una PRUEBA DE CONCEPTO medida, no un asiento de producción: dice si el
 * camino existe y cuánto cuesta. Lo que salga decide si merece entrar en
 * `asientos.js` como sexto controlador.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LO QUE SALIÓ — 15-08-2026, llama3.2-vision:11b en el Ollama local
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * EL CAMINO EXISTE. El sustrato se pinta con `pintar2d` (los 35 juegos, cero líneas
 * por juego), la imagen llega al modelo y contesta. **1,4 s por jugada** tras la
 * carga inicial —la primera tarda ~200 s mientras el modelo entra en memoria— y 0 €,
 * porque corre en local.
 *
 * PERO EL 4/4 «DENTRO DE LA LISTA» NO SIGNIFICABA LO QUE PARECÍA. Preguntándole
 * sobre la misma imagen cosas cuya respuesta yo ya sabía:
 *
 *     ¿cuántas fichas rojas hay?      dijo 9      (son 12)   ✗
 *     ¿cuántas oscuras?               dijo 9      (son 12)   ✗
 *     ¿cuántas filas están vacías?    dijo 2      (son 2)    ✓
 *     ¿las rojas arriba o abajo?      no contestó            ✗
 *
 * O sea: **mira** —acertar «2 filas vacías» no es adivinable— y **no cuenta**. Ve la
 * estructura gruesa y no el detalle. Elegir un número dentro del rango no es elegir
 * mirando, y sin esta comprobación me habría quedado con un verde que no era verdad.
 *
 * LO QUE LO HACE VIABLE ES MARCAR LAS OPCIONES SOBRE EL TABLERO (`--marcar`), porque
 * deja de pedirle una tarea de conteo que una persona tampoco hace: quien juega no
 * cuenta fichas, ve dónde cae cada jugada. Medido en los 35 con la semilla 7, de 626
 * opciones **559 tienen casilla** (89 %) y 24 comparten destino — se apilan («3·6»)
 * en vez de taparse. Las 67 sin casilla son verbos («tirar», «arriba») y siguen sólo
 * en la lista, que es donde deben estar.
 *
 * LO QUE ESTO TODAVÍA NO DICE: si juega BIEN. Para eso hace falta lo que hace
 * `calibrar.mjs` con las políticas —muchas partidas y comparar la puntuación contra
 * la línea base—, y con 1,4 s por jugada eso son horas. Es el siguiente paso, y es
 * el único que puede decir si un agente que mira compite con uno que lee.
 */
import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const valor = (n, pd) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : pd; };
const JUEGO = valor('--juego', 'damas');
const MODELO = valor('--modelo', 'llama3.2-vision:11b');
const URL_LLM = valor('--url', 'http://127.0.0.1:11434/v1/chat/completions');
const CUANTAS = Number(valor('--jugadas', 6));
const SEMILLA = Number(valor('--semilla', 7));
const GUARDAR = args.includes('--guardar');
/**
 * ⚠️ `--marcar`: LOS NÚMEROS DE LAS OPCIONES, PINTADOS SOBRE EL TABLERO.
 *
 * La primera medida salió 4/4 «dentro de la lista» y no significaba nada: preguntando
 * al modelo cosas de la imagen que yo ya sabía, contestó **9 fichas rojas donde hay
 * 12**. O sea que percibe la estructura gruesa —acertó cuántas filas están vacías— y
 * no el detalle. Elegir un número del rango no es elegir mirando.
 *
 * Y eso apunta a que el problema no es «no se puede», sino «no se puede ASÍ». Una
 * persona no cuenta fichas para jugar: mira el tablero **y** ve los botones de sus
 * jugadas legales, y sobre todo ve DÓNDE cae cada una — es justo lo que construimos
 * esta mañana con las marcas moradas y verdes.
 *
 * Con `--marcar`, cada opción lleva su número dibujado en la casilla a la que va. Eso
 * pone al agente de visión en las mismas condiciones que la persona, en vez de
 * pedirle una tarea de conteo que la persona nunca hace.
 */
const MARCAR = args.includes('--marcar');

const { cargarReglas } = await import('./public/arcade/js/protohub/rules/index.js');
const { ProtoHub } = await import('./public/arcade/js/protohub/ProtoHub.js');
const { interpretar } = await import('./public/js/alisa-engine/src/gym/prompt.js')
    .catch(() => import('./public/arcade/js/protohub/asientos.js'));

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo  = (s) => `\x1b[31m${s}\x1b[0m`;
const gris  = (s) => `\x1b[90m${s}\x1b[0m`;

const reglas = await cargarReglas(JUEGO, {});
if (!reglas) { console.error(`sin reglas para '${JUEGO}'`); process.exit(1); }

const hub = new ProtoHub().registrar(JUEGO, reglas);
hub.reset(JUEGO, { semilla: SEMILLA });

// ── El pintor, en un Chrome sin ventana ─────────────────────────────────────
const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const pagina = await navegador.newPage({ viewport: { width: 520, height: 520 } });

/**
 * El módulo del pintor se inyecta como texto y se evalúa dentro de la página. Es la
 * misma `pintar2d` que corre en el navegador de una persona — no una copia adaptada,
 * que es como se separan dos versiones sin que nadie lo note.
 */
const fuentePintor = await readFile('./public/arcade/js/protohub/render/pintar2d.js', 'utf8');
const fuentePaleta = await readFile('./public/arcade/js/protohub/render/paleta.js', 'utf8');
await pagina.setContent(`<!doctype html><meta charset="utf-8">
    <body style="margin:0;background:#f4f6f8"><canvas id="c" width="520" height="520"></canvas>
    <script type="module">
      ${fuentePaleta.replace(/export\s+/g, '')}
      ${fuentePintor.replace(/^import .*$/m, '').replace(/export\s+/g, '')}
      window.__pintar = (sus, marcas) => {
        const c = document.getElementById('c');
        const ctx = c.getContext('2d');
        pintar2d(ctx, sus, { ancho: 520, alto: 520 });
        if (!marcas || !marcas.length || !sus.rejilla) return;
        // Los números de las opciones, sobre la casilla a la que van. Es lo que ve
        // una persona cuando señala una jugada en el panel: dónde cae.
        const { ancho, alto } = sus.rejilla;
        const lado = Math.min(520 / ancho, 520 / alto);
        const dx = (520 - lado * ancho) / 2, dy = (520 - lado * alto) / 2;
        ctx.font = 'bold ' + Math.max(13, Math.round(lado * 0.5)) + 'px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const m of marcas) {
          const cx = dx + (m.c + 0.5) * lado, cy = dy + (m.f + 0.5) * lado;
          // Las casillas con varias jugadas llevan «3·6», así que el disco se
          // ensancha para que quepa en vez de recortar el número.
          const texto = String(m.n);
          const r = lado * (texto.length > 2 ? 0.46 : 0.32);
          if (texto.length > 2) ctx.font = 'bold ' + Math.max(10, Math.round(lado * 0.3)) + 'px sans-serif';
          else ctx.font = 'bold ' + Math.max(13, Math.round(lado * 0.5)) + 'px sans-serif';
          ctx.beginPath();
          ctx.ellipse(cx, cy, r, lado * 0.32, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,235,59,0.92)';
          ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = '#1a2230'; ctx.stroke();
          ctx.fillStyle = '#1a2230';
          ctx.fillText(String(m.n), cx, cy + 1);
        }
      };
    </script>`);
// Si el módulo inyectado revienta, el `waitForFunction` de abajo sólo diría
// «timeout» — que es el síntoma y no la causa. Se escucha el error de verdad.
const erroresPagina = [];
pagina.on('pageerror', (e) => erroresPagina.push(String(e.message)));
pagina.on('console', (m) => { if (m.type() === 'error') erroresPagina.push(m.text()); });
try {
    await pagina.waitForFunction('typeof window.__pintar === "function"', null, { timeout: 15000 });
} catch {
    console.error(rojo('\n  el pintor no llegó a montarse en la página:'));
    for (const e of erroresPagina.slice(0, 4)) console.error(`    ${e}`);
    if (!erroresPagina.length) console.error('    (y no hubo ningún error en consola)');
    await navegador.close();
    process.exit(1);
}

const { celdasDeJugada } = await import('./public/arcade/js/protohub/sustrato.js');

async function fotoDelTablero(opciones = []) {
    const sus = hub.sustrato(JUEGO);
    let marcas = [];
    if (MARCAR && sus?.rejilla) {
        /**
         * ⚠️ SE MARCA EL DESTINO, QUE ES LO QUE IMPORTA PARA ELEGIR.
         *
         * `celdasDeJugada` devuelve las casillas que toca una jugada — dos en las de
         * origen→destino («a3b4»), una en las de un solo paso. Se pinta el número en
         * la ÚLTIMA, que es a donde va la pieza: es la información que usa quien
         * juega para decidir, y la misma regla que ya sigue el subrayado de la mesa.
         *
         * Las jugadas sin casilla —«tirar», «pasar», «arriba»— no se marcan y siguen
         * sólo en la lista de texto. Marcar una casilla inventada para ellas sería
         * enseñarle al modelo algo que no es verdad.
         */
        /**
         * ⚠️ VARIAS JUGADAS PUEDEN IR A LA MISMA CASILLA, Y SE PISABAN.
         *
         * Medido en los 35 con la semilla 7: de 626 opciones, 559 tienen casilla y
         * **24 comparten destino** — concentradas en los juegos donde dos piezas
         * pueden ir al mismo sitio: xiangqi (17), ajedrez (4), damas (3). Pintando
         * una encima de otra, la de abajo desaparecía: en la primera imagen de damas
         * se veían 4 números de 7, y las tres tapadas eran inelegibles mirando.
         *
         * Se apilan en la misma casilla («3·6») en vez de desplazarlas: moverlas
         * mentiría sobre a dónde va la jugada, que es justo lo único que este dibujo
         * aporta.
         */
        const porCelda = new Map();
        opciones.forEach((o, i) => {
            const celdas = celdasDeJugada(o, sus.rejilla);
            if (!celdas?.length) return;
            const c = celdas[celdas.length - 1];
            if (!porCelda.has(c)) porCelda.set(c, []);
            porCelda.get(c).push(i + 1);
        });
        marcas = [...porCelda].map(([c, ns]) => ({
            n: ns.join('·'),
            c: c % sus.rejilla.ancho,
            f: Math.floor(c / sus.rejilla.ancho),
        }));
    }
    await pagina.evaluate(([s, m]) => window.__pintar(s, m), [sus, marcas]);
    const png = await pagina.locator('#c').screenshot();
    return { b64: png.toString('base64'), marcadas: marcas.length };
}

// ── El modelo que mira ──────────────────────────────────────────────────────
/**
 * ⚠️ EL PROMPT PIDE UN NÚMERO, NO UNA JUGADA.
 *
 * Es la misma decisión que en el asiento de texto: pedir la jugada escrita obliga al
 * modelo a acertar una notación además de acertar la jugada, y entonces se estaría
 * midiendo su ortografía. Un índice se interpreta sin ambigüedad y no se puede
 * inventar una jugada ilegal.
 */
async function eligeMirando(b64, opciones) {
    const lista = opciones.map((o, i) => `${i + 1}. ${o}`).join('\n');
    const prompt = `Estás jugando a "${JUEGO}". La imagen es el tablero AHORA MISMO.\n`
        + (MARCAR ? `Los círculos amarillos con un número marcan a dónde va cada jugada.\n` : '')
        + `Estas son las únicas jugadas legales:\n${lista}\n\n`
        + `Mira el tablero y elige una. Contesta SOLO con el número, nada más.`;
    const t0 = Date.now();
    const r = await fetch(URL_LLM, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            model: MODELO, temperature: 0, stream: false,
            messages: [{ role: 'user', content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
            ] }],
        }),
    });
    if (!r.ok) throw new Error(`el modelo contestó ${r.status}: ${(await r.text()).slice(0, 120)}`);
    const d = await r.json();
    const texto = d.choices?.[0]?.message?.content ?? d.message?.content ?? '';
    // El primer número que aparezca. Si contesta con parrafada, se le perdona la
    // parrafada pero no la elección.
    const m = String(texto).match(/\d+/);
    const i = m ? Number(m[0]) - 1 : -1;
    return { i, texto: String(texto).trim().slice(0, 90), ms: Date.now() - t0 };
}

// ── La partida ──────────────────────────────────────────────────────────────
console.log(`\nEL ASIENTO QUE MIRA — ${MODELO} jugando a ${JUEGO}`);
console.log(gris(`  ve el tablero dibujado y la lista de jugadas legales. Nada de texto del estado.\n`));

let acertadas = 0, fuera = 0, totalMs = 0;
for (let n = 0; n < CUANTAS; n++) {
    const st = hub.state(JUEGO);
    if (st.is_game_over) { console.log(gris('  la partida terminó')); break; }
    const opciones = (st.legal_moves ?? st.legal_actions ?? [])
        .filter(m => m !== 'nueva' && m !== 'reset');
    if (!opciones.length) break;

    const { b64, marcadas } = await fotoDelTablero(opciones);
    if (GUARDAR && n === 0) {
        const nombre = `vision_${JUEGO}${MARCAR ? '_marcado' : ''}_0.png`;
        await writeFile(nombre, Buffer.from(b64, 'base64'));
        // `marcadas` son CASILLAS, no opciones: varias jugadas al mismo destino
        // comparten disco. Decir «4/7 opciones marcadas» era falso — están las 7.
        console.log(gris(`  (primera imagen guardada en ${nombre} — míralo`
            + (MARCAR ? `, ${opciones.length} opciones en ${marcadas} casillas` : '') + ')'));
    }

    let elec;
    try { elec = await eligeMirando(b64, opciones); }
    catch (e) { console.log(rojo(`  ✗ ${e.message}`)); break; }
    totalMs += elec.ms;

    const valida = elec.i >= 0 && elec.i < opciones.length;
    const jugada = valida ? opciones[elec.i] : opciones[0];
    if (valida) acertadas++; else fuera++;

    console.log(`  ${String(n + 1).padStart(2)}. ${opciones.length} opciones · `
        + (valida ? verde(`eligió ${elec.i + 1} → ${jugada}`)
                  : rojo(`fuera de rango («${elec.texto}») → se juega la 1ª`))
        + gris(`  ${(elec.ms / 1000).toFixed(1)}s`));

    if (!hub.move(JUEGO, { move: jugada }).ok) { console.log(rojo('  la jugada fue rechazada')); break; }
}

await navegador.close();

const rec = hub.partida(JUEGO);
const intentos = acertadas + fuera;
console.log(`\n  eligió dentro de la lista  ${acertadas}/${intentos}`);
console.log(`  media por jugada           ${intentos ? (totalMs / intentos / 1000).toFixed(1) : '—'}s`);
console.log(`  recibo                     semilla ${rec.semilla} · ${rec.jugadas.length} jugadas`);
console.log(gris(`\n  El camino existe: el sustrato se pinta con \`pintar2d\` (los 35 juegos, sin`));
console.log(gris(`  una línea por juego) y el modelo contesta sobre la imagen. Lo que decide si`));
console.log(gris(`  esto entra en \`asientos.js\` como sexto controlador es esa tasa y ese tiempo.\n`));
