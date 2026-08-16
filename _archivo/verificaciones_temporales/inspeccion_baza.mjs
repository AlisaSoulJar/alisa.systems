// inspeccion_baza.mjs — script de verificación TEMPORAL, fuera del repo protegido.
// Igual que bajo_el_panel.mjs pero sin agrupar el nombre (para saber si «mano»
// tapada es mano_0 (propia, grave) o mano_N rival (por diseño)) y con captura.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const P = 8957;
const RAIZ = 'Q:/alisa_project/alisa/World/Synthesis/Web/alisa-systems/';
const SEMILLA = 7;

const servidor = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${P}/arcade/index.html`); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
}
const base = `http://127.0.0.1:${P}`;
const paginas = JSON.parse(await readFile(RAIZ + 'public/data/paginas.json', 'utf-8'));

const juegos = process.argv.slice(2);
const navegador = await chromium.launch({ channel: 'chrome', headless: true });

async function conParche(contexto) {
    await contexto.addInitScript(() => {
        window.__CAPTURA = null;
        const engancha = () => {
            if (!window.THREE?.WebGLRenderer || window.__parcheado) return !!window.__parcheado;
            const Original = THREE.WebGLRenderer;
            function Parcheado(...args) {
                const instancia = new Original(...args);
                const renderOriginal = instancia.render.bind(instancia);
                instancia.render = function (escena, camara) {
                    window.__CAPTURA = { escena, camara, renderer: instancia };
                    return renderOriginal(escena, camara);
                };
                return instancia;
            }
            Parcheado.prototype = Original.prototype;
            THREE.WebGLRenderer = Parcheado;
            window.__parcheado = true;
            return true;
        };
        if (!engancha()) {
            const reloj = setInterval(() => { if (engancha()) clearInterval(reloj); }, 20);
            setTimeout(() => clearInterval(reloj), 20000);
        }
    });
    return contexto;
}

function evaluarEscenaCruda(panelRect) {
    const cap = window.__CAPTURA;
    if (!cap?.escena || !cap?.camara) return { medible: false };
    const { escena, camara, renderer } = cap;
    const canvas = renderer?.domElement;
    const rectLienzo = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    escena.updateMatrixWorld(true);
    camara.updateMatrixWorld(true);
    const UMBRAL_RADIO = 2.5;
    const V = new THREE.Vector3();
    const M = new THREE.Matrix4();
    function proyectar(mundo) {
        const p = mundo.clone().project(camara);
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.z < -1 || p.z > 1) return null;
        const x = rectLienzo.left + (p.x * 0.5 + 0.5) * rectLienzo.width;
        const y = rectLienzo.top + (1 - (p.y * 0.5 + 0.5)) * rectLienzo.height;
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return null;
        return { x, y };
    }
    const piezas = [];
    escena.traverse((obj) => {
        if (!obj.visible) return;
        if (obj.isMesh) {
            if (obj.geometry && !obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere?.();
            const posAux = new THREE.Vector3(), rotAux = new THREE.Quaternion(), escAux = new THREE.Vector3();
            obj.matrixWorld.decompose(posAux, rotAux, escAux);
            const escalaProm = (escAux.x + escAux.y + escAux.z) / 3;
            const radio = (obj.geometry?.boundingSphere?.radius ?? 0) * escalaProm;
            if (radio > UMBRAL_RADIO) return;
            V.setFromMatrixPosition(obj.matrixWorld);
            const p = proyectar(V);
            if (p && obj.userData?.zona !== undefined) piezas.push({ zona: obj.userData.zona, x: p.x, y: p.y });
        }
    });
    const dentro = piezas.filter(pz => pz.x >= panelRect.left && pz.x <= panelRect.right && pz.y >= panelRect.top && pz.y <= panelRect.bottom);
    return { medible: true, dentro: dentro.map(d => d.zona) };
}

for (const juego of juegos) {
    const p = paginas[juego];
    const url = `${base}/arcade/${p.pagina}?semilla=${SEMILLA}` + (p.pagina === 'mesa.html' ? `&juego=${juego}` : '');
    const ctx = await conParche(await navegador.newContext({ viewport: { width: 1280, height: 720 } }));
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(4500);

    console.log(`\n== ${juego} ==`);
    // Mismo patrón que bajo_el_panel.mjs: hasta 4 clics, midiendo tras CADA uno,
    // y una captura tras la 1ª y la 2ª jugada (con la baza a la vista, antes de
    // que se recoja).
    for (let i = 1; i <= 4; i++) {
        const boton = page.locator('.mesa-jugada').first();
        if (!(await boton.count().catch(() => 0))) break;
        await boton.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(600);
        const panelRect = await page.evaluate(() => {
            const panel = document.querySelector('.hud-panel');
            if (!panel) return null;
            panel.classList.remove('collapsed');
            const r = panel.getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        });
        if (!panelRect) continue;
        const datos = await page.evaluate(evaluarEscenaCruda, panelRect);
        console.log(`  jugada ${i}:`, datos.dentro);
        if (i <= 2) {
            await page.screenshot({ path: `Q:/SystemRelief/OscarTemp/Active/claude/Q--/248d4bf5-cde4-4dcd-902c-e80e4f2e9efa/scratchpad/captura_${juego}_jugada${i}.png` });
        }
    }
    await ctx.close();
}

await navegador.close();
servidor.kill();
