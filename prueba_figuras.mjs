/**
 * prueba_figuras.mjs — ¿la figura llega A LA CARTA QUE ESTÁ EN LA MESA?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POR QUÉ EXISTE
 *
 * Las veinticuatro figuras —doce francesas y doce españolas— se cargan como imagen y
 * se pintan sobre la carta. Durante meses las doce francesas salieron EN BLANCO en la
 * mesa, con su letra y su palo en la esquina y nada en medio, y nadie lo vio.
 *
 * La razón de que no se viera es lo interesante. El reparto ocurre antes de que las
 * imágenes terminen de cargar, así que la carta se monta con el material de la figura
 * dibujada. Cuando la imagen llegaba, el código borraba la entrada del caché — y eso
 * arregla la SIGUIENTE carta que alguien pida, no la que ya está en el tapete, que se
 * quedó con ese objeto en la mano.
 *
 * Y la medida que teníamos mentía en la peor dirección: `_tintaDeCara` REGENERA el
 * canvas desde cero para contarlo, así que devolvía 33 % —«tiene dibujo»— mientras la
 * pantalla enseñaba una carta vacía. Una comprobación que se fabrica su propio sujeto
 * no está midiendo lo que hay.
 *
 * QUÉ MIDE ÉSTA
 *
 * La textura que la malla TIENE PUESTA, no una que se regenere para la ocasión. Se
 * busca la carta en la escena, se lee el canvas de su material de cara y se cuenta la
 * tinta ahí. Una figura con dibujo pasa del 25 %; una con sólo la letra en la esquina
 * se queda por debajo del 20 %.
 *
 * SABOTAJE DECLARADO
 *   · se vuelve a borrar del caché en vez de repintar → las cartas de la mesa se
 *     quedan sin figura y esto tiene que decirlo
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const PUERTO = 9061;

/**
 * Semillas elegidas porque reparten figuras en la mano del asiento 0. Una mano de
 * treses no prueba nada, y con semilla al azar la prueba pasaría o fallaría según el
 * día — que es la clase de prueba que se acaba ignorando.
 */
const CASOS = [
    { juego: 'tute',   semilla: 11, familia: 'española' },
    { juego: 'hearts', semilla: 1,  familia: 'francesa' },
];

/** Por debajo de esto la carta lleva letra y nada más. Medido: vacías dan 14–19 %. */
const SUELO = 25;

const srv = spawn('python', ['servir.py', String(PUERTO)], { stdio: 'ignore' });
for (let i = 0; i < 60; i++) {
    try { await fetch(`http://127.0.0.1:${PUERTO}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 300)); }
}

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
let fallos = 0;

console.log('\n¿Llega la figura a la carta que está en la mesa?\n');

for (const { juego, semilla, familia } of CASOS) {
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${PUERTO}/arcade/${juego}.html?semilla=${semilla}`,
                 { waitUntil: 'load', timeout: 30000 });
    await new Promise(r => setTimeout(r, 6500));

    const medido = await p.evaluate((SUELO) => {
        const e = window.ALISA_MOTOR ?? window.engine ?? window.ALISA_ENGINE;
        const st = window.ALISA_PROTOHUB.state(window.ALISA_JUEGO);
        const figuras = (st.mano ?? []).filter(c => /_(S|C|R|J|Q|K)$/.test(String(c)));

        // ⚠️ Del MATERIAL QUE LA MALLA TIENE, no de uno recién hecho. Es toda la
        // diferencia entre esta prueba y la que ya había.
        const tintaDeLaMesa = (id) => {
            const mats = e.cachedMaterials?.[id];
            const cara = Array.isArray(mats) ? mats[4] : null;
            const lienzo = cara?.map?.image;
            if (!lienzo || !lienzo.width) return null;
            const g = lienzo.getContext('2d');
            const d = g.getImageData(0, 0, lienzo.width, lienzo.height).data;
            let n = 0;
            for (let i = 0; i < d.length; i += 4) {
                // Pintado = se aparta del blanco del papel.
                if (d[i] < 230 || d[i + 1] < 230 || d[i + 2] < 230) n++;
            }
            return (100 * n) / (lienzo.width * lienzo.height);
        };

        return figuras.map(id => ({ id, tinta: tintaDeLaMesa(id) }));
    }, SUELO);
    await p.close();

    if (!medido.length) {
        fallos++;
        console.log(`  ✗ ${juego.padEnd(7)} — no ha repartido ninguna figura; la semilla ya no sirve`);
        continue;
    }
    // Una carta sin material cacheado no está en la mesa: se dice, no se calla.
    const sinMaterial = medido.filter(m => m.tinta === null);
    const vacias = medido.filter(m => m.tinta !== null && m.tinta < SUELO);
    if (sinMaterial.length || vacias.length) {
        fallos++;
        console.log(`  ✗ ${juego.padEnd(7)} — ${familia}: `
            + (vacias.length ? `${vacias.length} de ${medido.length} sin dibujo `
                + `(${vacias.map(v => `${v.id} ${v.tinta.toFixed(1)}%`).join(', ')})` : '')
            + (sinMaterial.length ? `  ${sinMaterial.length} sin material en la mesa` : ''));
    } else {
        const min = Math.min(...medido.map(m => m.tinta));
        console.log(`  ✓ ${juego.padEnd(7)} — ${familia}: las ${medido.length} con dibujo `
                  + `(la más floja, ${min.toFixed(1)}%)`);
    }
}

await navegador.close();
srv.kill();

console.log(fallos === 0
    ? '\n✓ las figuras de las dos barajas llegan a la mesa\n'
    : `\n✗ ${fallos} caso(s): la carta se pinta sin figura y la partida sigue como si nada\n`);
process.exit(fallos === 0 ? 0 : 1);
