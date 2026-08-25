/**
 * ¿PINTA LA MESA COMPARTIDA LOS NUEVE MUNDOS, SIN SABER A QUÉ SE JUEGA?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_mesa_mundo.mjs
 *
 * `mesa_mundo.mjs` es el análogo de `mesa_tablero.mjs`: recibe un `sustrato()` y
 * lo dibuja. La condición para que mereciera la pena escribirlo era tener nueve
 * clientes en vez de uno, y eso lo dio publicar el sustrato en los nueve mundos.
 *
 * ⚠️ SE COMPRUEBA CONTANDO MALLAS, NO MIRANDO LA PANTALLA.
 *
 * Un dibujante se puede comprobar sin ojos si se pregunta lo correcto: cuántas
 * mallas hay, dónde están, y si dejan de estar cuando la pieza desaparece. Mirar
 * una captura diría «se ve algo» — que es lo que decían las páginas de ¡Busca!
 * mientras la persona y el banco jugaban a dos juegos distintos.
 */
import * as THREE from 'three';
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';
import { MesaMundo } from './public/js/mesa_mundo.mjs';

let fallos = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };

console.log('\n¿Pinta la mesa compartida los nueve mundos?\n');
console.log('  mundo                      piezas  mallas  con terreno  se mueven');

let vistos = 0;
for (const e of CATALOGO) {
    if (e.familia !== 'propio') continue;
    const Clase = await e.cargar();
    const env = new Clase();
    env.reset(4);
    const sys = [env.sys, env.core, env.nucleo, env.motor, env].find(o => o && typeof o.sustrato === 'function');
    if (!sys) { mal(`${e.id}: sin sustrato`); continue; }
    vistos++;

    const escena = new THREE.Scene();
    const mesa = new MesaMundo(escena, {}, 1);

    const s0 = sys.sustrato();
    mesa.pintar(s0);
    const mallas = [...mesa._piezas.values()].filter(m => m.visible).length;
    const conTerreno = !!mesa.suelo;
    const pos0 = [...mesa._piezas.values()].map(m => m.position.clone());

    // Se juega y se vuelve a pintar: las mallas tienen que seguir al estado.
    for (let i = 0; i < 150 && !env.done; i++) {
        try {
            const esp = env.constructor.actionSpace;
            if (esp?.type === 'discrete' && Number.isFinite(esp.n)) env.step(1 + (i % Math.max(1, esp.n - 1)));
            else { const m = env.affordances?.() ?? []; if (!m.length) break; env.stepVerb(m[i % m.length].verb, m[i % m.length].args ?? {}); }
        } catch { break; }
    }
    mesa.pintar(sys.sustrato());
    const pos1 = [...mesa._piezas.values()].map(m => m.position.clone());
    const seMueven = pos0.some((p, i) => pos1[i] && p.distanceTo(pos1[i]) > 1e-6);

    if (mallas !== s0.piezas.length) {
        mal(`${e.id}: ${s0.piezas.length} piezas en el sustrato y ${mallas} mallas visibles`);
    }
    if (s0.rejilla && !conTerreno) mal(`${e.id}: publica rejilla y no se dibujó terreno`);
    for (const m of mesa._piezas.values()) {
        if (!Number.isFinite(m.position.x) || !Number.isFinite(m.position.y) || !Number.isFinite(m.position.z)) {
            mal(`${e.id}: una malla acabó en NaN — se vería en el centro o en ninguna parte`);
            break;
        }
    }

    console.log(`  ${e.id.padEnd(26)} ${String(s0.piezas.length).padStart(6)}  ${String(mallas).padStart(6)}`
              + `  ${(conTerreno ? 'sí' : '—').padStart(11)}  ${(seMueven ? 'sí' : '—').padStart(9)}`);
    mesa.limpiar();
}

/**
 * ⚠️ Y UNA PIEZA QUE MUERE TIENE QUE DEJAR DE VERSE.
 *
 * Es el fallo clásico de un dibujante que reusa mallas: se esconde de pintarlas
 * y se quedan donde estaban. En pantalla se ve un bicho muerto que sigue ahí, y
 * quien juega decide contra un fantasma.
 */
{
    const escena = new THREE.Scene();
    const mesa = new MesaMundo(escena, {}, 1);
    const base = { rejilla: null, zonas: [], leyenda: { bicho: 'un bicho' },
                   piezas: [{ x: 0, y: 0, t: 'bicho' }, { x: 1, y: 1, t: 'bicho' }] };
    mesa.pintar(base);
    const antes = [...mesa._piezas.values()].filter(m => m.visible).length;
    mesa.pintar({ ...base, piezas: [base.piezas[0]] });
    const despues = [...mesa._piezas.values()].filter(m => m.visible).length;
    if (antes !== 2 || despues !== 1) {
        mal(`una pieza que desaparece sigue viéndose (${antes} → ${despues}, se esperaba 2 → 1)`);
    } else {
        console.log('\n  ✓ una pieza que desaparece deja de verse');
    }
}

console.log(`\n  ${vistos} mundos pintados por el mismo dibujante`);
if (fallos) { console.log(`\n  ✗ ${fallos} fallo(s) en la mesa de mundos\n`); process.exit(1); }
console.log('  ✓ un solo dibujante para los nueve, y no sabe ninguna regla\n');
