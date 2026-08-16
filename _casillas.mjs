/**
 * ¿SE PUEDE APUNTAR A UNA CASILLA VACÍA?
 *
 * `tacto` ya sabe apuntar a una PIEZA: proyecta su malla y le pregunta al trazador de
 * rayos si hay algún píxel donde esté delante. Con eso las mesas de cartas se miden de
 * verdad. Pero la mitad de los juegos no juegan a piezas: en ajedrez la jugada es
 * `d2d4` —dos casillas, y la segunda casi siempre vacía— y en go son los 357 cruces
 * libres del goban, que no tienen malla porque todavía no hay piedra.
 *
 * Mientras eso no se sepa medir, la garantía tiene que seguir siendo el panel, y el
 * panel no puede dejar de ser pulsable. Esto es el prototipo de la medida que falta.
 *
 * ⚠️ LA IDEA, Y POR QUÉ SE COMPRUEBA A SÍ MISMA.
 *
 * El sustrato dice cuántas casillas hay (`rejilla`). El tablero es una malla grande y
 * plana. Repartir la rejilla sobre su caja envolvente da el centro de cada casilla —y
 * es una SUPOSICIÓN: que las casillas están repartidas uniformemente sobre el tablero.
 *
 * Así que no se cree: se comprueba. Al tocar la casilla (c,f) se mira si la jugada que
 * sale habla de ESA coordenada. Si el reparto estuviera girado, desplazado o del revés,
 * saldrían jugadas de otras casillas y se vería. Un mapa que no se verifica es una
 * rejilla a ciegas con más pasos.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LO QUE CONTESTÓ, 16-08-2026, Y POR QUÉ NO SE SIGUE POR AQUÍ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     ajedrez   65 planos · 64 del mismo tamaño   ← las casillas YA son mallas
 *     xiangqi   20 planos · 19 del mismo tamaño   ← son las LÍNEAS, no casillas
 *     reversi   2 planos                          ← el tablero es UNA malla pintada
 *     damas     2 planos                          ← igual
 *     flota     2 planos                          ← igual
 *     go        ningún plano                      ← el goban no es una malla plana
 *
 * Seis juegos, cuatro geometrías distintas. Y el que parecía más fácil de todos —la
 * malla plana más grande es el tablero, obviamente— daba `sueloA`, el suelo de la
 * habitación, en tres de ellos. La misma trampa que ya está apuntada en
 * `bajo_el_panel`: la escena tiene suelo, niebla, luces y tapete.
 *
 * ⚠️ LA CONCLUSIÓN NO ES «HAY QUE ESCRIBIR CUATRO DETECTORES».
 *
 * Es la misma que ya resolvió esto para las piezas: las mallas de las piezas se pueden
 * apuntar porque LLEVAN NOMBRE —`p:<tipo>:<dueño>`—, no porque se dedujera su forma. La
 * casilla necesita el mismo contrato y no lo tiene. Adivinar la geometría de cada
 * visualizador es escribir una lista a mano disfrazada de heurística, y en el primer
 * intento ya se equivocó en tres de seis sin dar ningún error.
 *
 * Mientras las casillas no se nombren, la garantía de `tacto` para los juegos de
 * tablero tiene que seguir siendo el panel, y el panel NO puede dejar de ser pulsable.
 * Esto se queda como prototipo y como prueba de que la medida que falta es un nombre,
 * no un algoritmo.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const PUERTO = 8951;
const juegos = process.argv.slice(2).filter(a => !a.startsWith('-'));
const paginas = JSON.parse(await readFile(new URL('./public/data/paginas.json', import.meta.url), 'utf-8'));

const srv = spawn('python', ['servir.py', String(PUERTO)], {
    cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), stdio: 'ignore',
});
const base = `http://127.0.0.1:${PUERTO}`;
for (let i = 0; i < 40; i++) {
    try { await fetch(`${base}/arcade/index.html`); break; } catch { await new Promise(r => setTimeout(r, 250)); }
}

/**
 * La rejilla se pide al SUSTRATO desde Node, no a la página: la página no publica el
 * sustrato en ninguna variable, y añadirla sólo para que esto pueda mirarla sería
 * cablear el instrumento dentro de lo que mide.
 */
const { cargarReglas } = await import('./public/arcade/js/protohub/rules/index.js');
const { obtenerSustrato } = await import('./public/arcade/js/protohub/sustrato.js');
const rejillas = {};
for (const j of (juegos.length ? juegos : ['ajedrez', 'reversi', 'damas', 'go'])) {
    try {
        const r = await cargarReglas(j, {});
        const par = r.nuevaPartida({ semilla: 7, seed: 7 });
        const sus = obtenerSustrato(j, r, par, r.estado(par, 0) ?? {});
        if (sus?.rejilla) rejillas[j] = sus.rejilla;
    } catch { /* el juego que no tenga rejilla no la tiene, y se dice abajo */ }
}

const nav = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => {
    window.__CAPTURA = null;
    const engancha = () => {
        if (!window.THREE?.WebGLRenderer || window.__parcheado) return !!window.__parcheado;
        const Original = THREE.WebGLRenderer;
        function Parcheado(...a) {
            const i = new Original(...a); const r = i.render.bind(i);
            i.render = function (e, c) { window.__CAPTURA = { escena: e, camara: c }; return r(e, c); };
            return i;
        }
        Parcheado.prototype = Original.prototype; THREE.WebGLRenderer = Parcheado;
        window.__parcheado = true; return true;
    };
    if (!engancha()) { const t = setInterval(() => { if (engancha()) clearInterval(t); }, 20); setTimeout(() => clearInterval(t), 20000); }
});

console.log('\n  juego        rejilla   casillas ubicadas   toques   jugadas   coinciden\n');
for (const juego of (juegos.length ? juegos : ['ajedrez', 'reversi', 'damas', 'go'])) {
    const p = await ctx.newPage();
    try {
        await p.goto(`${base}/arcade/${paginas[juego].pagina}?semilla=7`, { waitUntil: 'load', timeout: 25000 });
        await p.waitForTimeout(4500);

        // El espía: graba la jugada y NO la deja pasar, para que el tablero no cambie
        // debajo mientras se recorren las 64 casillas.
        await p.evaluate(() => {
            const h = window.ALISA_PROTOHUB, st = h.state(window.ALISA_JUEGO);
            window.__t = [];
            const jd = (a) => (typeof a === 'string' ? a : a?.params?.action ?? a?.params?.jugada ?? a?.move ?? a?.jugada ?? a?.action ?? null);
            h.move = (...a) => { const j = jd(a[1]); if (j && j !== 'move') window.__t.push(String(j)); return Promise.resolve(st); };
        });

        const info = await p.evaluate(() => {
            const c = window.__CAPTURA;
            if (!c?.escena) return null;
            /**
             * ⚠️ LA MALLA PLANA MÁS GRANDE ES EL SUELO DE LA HABITACIÓN, NO EL TABLERO.
             *
             * Buscando por tamaño salían `sueloA` en reversi y en damas: el suelo de la
             * sala, que es plano y enorme. Es la misma trampa que ya está apuntada en
             * `bajo_el_panel` —la escena tiene suelo, niebla, luces y tapete— y caí
             * igual.
             *
             * El tablero es el plano MÁS PEQUEÑO QUE CONTIENE A LAS PIEZAS. Eso descarta
             * el suelo sin escribir un solo nombre a mano, y funciona igual en go, donde
             * sólo hay dos piedras puestas: el goban las contiene y el suelo también,
             * pero el goban es menor.
             */
            const caja = new THREE.Box3();
            const piezas = new THREE.Box3(); piezas.makeEmpty();
            const planos = [];
            c.escena.traverse((o) => {
                if (!o.visible || !o.isMesh) return;
                caja.setFromObject(o);
                if (caja.isEmpty()) return;
                if (o.name && /^(p:|z\d+:v\d+|oculta)/.test(o.name)) { piezas.union(caja); return; }
                const dx = caja.max.x - caja.min.x, dy = caja.max.y - caja.min.y, dz = caja.max.z - caja.min.z;
                if (dy > Math.min(dx, dz) * 0.5) return;      // no es plano
                planos.push({ nombre: o.name || '(sin nombre)', min: caja.min.clone(), max: caja.max.clone(), area: dx * dz });
            });
            if (piezas.isEmpty() || !planos.length) return null;
            const contiene = planos.filter(q =>
                q.min.x <= piezas.min.x + 1e-3 && q.max.x >= piezas.max.x - 1e-3 &&
                q.min.z <= piezas.min.z + 1e-3 && q.max.z >= piezas.max.z - 1e-3);
            const cand = (contiene.length ? contiene : planos).sort((a, b) => a.area - b.area)[0];
            /**
             * ⚠️ ¿HAY QUE REPARTIR LA REJILLA, O LAS CASILLAS YA SON MALLAS?
             *
             * Ajedrez tiene 65 planos: el suelo y las sesenta y cuatro casillas. Si las
             * casillas ya existen como objetos, repartir una caja envolvente entre ocho
             * es inventar una geometría que ya está puesta —y suponer que es uniforme—
             * cuando se puede apuntar a la casilla igual que a una pieza.
             *
             * Se detectan por tamaño repetido: un tablero son N planos casi idénticos.
             */
            const areas = planos.map(q => q.area).sort((a, b) => a - b);
            const mediana = areas[Math.floor(areas.length / 2)];
            const parecidas = planos.filter(q => Math.abs(q.area - mediana) < mediana * 0.15);
            return {
                nombre: cand.nombre, min: cand.min.toArray(), max: cand.max.toArray(),
                piezas: [piezas.min.toArray(), piezas.max.toArray()],
                planos: planos.length, contienen: contiene.length,
                iguales: parecidas.length,
            };
        });
        if (!info) { console.log(`  ${juego.padEnd(12)} sin tablero plano localizable`); await p.close(); continue; }
        const rej = rejillas[juego];
        console.log(`  ${juego.padEnd(12)} tablero '${info.nombre}' de ${info.planos} planos`
                  + ` (${info.contienen} contienen las piezas) · rejilla ${rej ? `${rej.ancho}x${rej.alto}` : '—'}`
                  + ` · ${info.iguales} planos del mismo tamaño`
                  + (rej && info.iguales === rej.ancho * rej.alto ? '  ← las casillas YA son mallas' : ''));
    } catch (e) {
        console.log(`  ${juego.padEnd(12)} ! ${String(e.message).split('\n')[0].slice(0, 60)}`);
    }
    await p.close();
}
await nav.close();
srv.kill();
