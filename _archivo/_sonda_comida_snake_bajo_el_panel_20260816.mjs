/** ¿DÓNDE ACABA LA ESFERA DE LA COMIDA? Traza temporal justo después de crearla. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const RAIZ = 'Q:/alisa_project/alisa/World/Synthesis/Web/alisa-systems';
const F = `${RAIZ}/public/arcade/js/snake_visualizer.js`;
const original = await readFile(F, 'utf8');
const MARCA = '            this.scene.add(this.foodMesh);';
if (!original.includes(MARCA)) { console.log('  marca no encontrada'); process.exit(1); }

const TRAZA = MARCA + `
            try {
                const c = this.camera ?? this._camara;
                const v = this.foodMesh.position.clone();
                const info = { mundo: [v.x, v.y, v.z], hayCamara: !!c, enEscena: !!this.foodMesh.parent,
                               visible: this.foodMesh.visible };
                if (c) { const m = v.clone().project(c);
                    info.pantalla = [Math.round((m.x*0.5+0.5)*innerWidth), Math.round((-m.y*0.5+0.5)*innerHeight), +m.z.toFixed(2)]; }
                console.log('[SONDA]', JSON.stringify(info));
            } catch (e) { console.log('[SONDA] error', e.message); }`;

await writeFile(F, original.replace(MARCA, TRAZA));

const P = 8899;
const srv = spawn('python', ['servir.py', String(P)], { cwd: RAIZ, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const lineas = [];
p.on('console', m => { if (m.text().startsWith('[SONDA]')) lineas.push(m.text()); });
await p.goto(`http://127.0.0.1:${P}/arcade/snake.html?semilla=7`, { waitUntil: 'load' });
await p.waitForTimeout(5000);
await b.close();
srv.kill();

await writeFile(F, original);
console.log(lineas.length ? [...new Set(lineas)].slice(0, 3).join('\n') : '  la esfera NO se llegó a añadir');
console.log('  (fichero restaurado:', (await readFile(F, 'utf8')) === original, ')');
