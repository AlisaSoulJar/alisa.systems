/**
 * ¿PINTA EL PINTOR COMPARTIDO LOS NUEVE MUNDOS, SIN SABER A QUÉ SE JUEGA?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_pintor_mundo.mjs
 *
 * `pintor_mundo.mjs` es el análogo de `mesa_tablero.mjs`: recibe un `sustrato()` y
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
import { CATALOGO } from './public/js/alisa-engine/src/gym/registry.js';
import { PintorMundo } from './public/js/pintor_mundo.mjs';

let fallos = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };

console.log('\n¿Pinta el pintor compartido los nueve mundos?\n');
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
    const pintor = new PintorMundo(escena, {}, 1);

    const s0 = sys.sustrato();
    pintor.pintar(s0);
    const mallas = [...pintor._piezas.values()].filter(m => m.visible).length;
    const conTerreno = !!pintor.suelo;
    const pos0 = [...pintor._piezas.values()].map(m => m.position.clone());

    // Se juega y se vuelve a pintar: las mallas tienen que seguir al estado.
    for (let i = 0; i < 150 && !env.done; i++) {
        try {
            const esp = env.constructor.actionSpace;
            if (esp?.type === 'discrete' && Number.isFinite(esp.n)) env.step(1 + (i % Math.max(1, esp.n - 1)));
            else { const m = env.affordances?.() ?? []; if (!m.length) break; env.stepVerb(m[i % m.length].verb, m[i % m.length].args ?? {}); }
        } catch { break; }
    }
    pintor.pintar(sys.sustrato());
    const pos1 = [...pintor._piezas.values()].map(m => m.position.clone());
    const seMueven = pos0.some((p, i) => pos1[i] && p.distanceTo(pos1[i]) > 1e-6);

    if (mallas !== s0.piezas.length) {
        mal(`${e.id}: ${s0.piezas.length} piezas en el sustrato y ${mallas} mallas visibles`);
    }
    if (s0.rejilla && !conTerreno) mal(`${e.id}: publica rejilla y no se dibujó terreno`);
    for (const m of pintor._piezas.values()) {
        if (!Number.isFinite(m.position.x) || !Number.isFinite(m.position.y) || !Number.isFinite(m.position.z)) {
            mal(`${e.id}: una malla acabó en NaN — se vería en el centro o en ninguna parte`);
            break;
        }
    }

    console.log(`  ${e.id.padEnd(26)} ${String(s0.piezas.length).padStart(6)}  ${String(mallas).padStart(6)}`
              + `  ${(conTerreno ? 'sí' : '—').padStart(11)}  ${(seMueven ? 'sí' : '—').padStart(9)}`);
    pintor.limpiar();
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
    const pintor = new PintorMundo(escena, {}, 1);
    const base = { rejilla: null, zonas: [], leyenda: { bicho: 'un bicho' },
                   piezas: [{ x: 0, y: 0, t: 'bicho' }, { x: 1, y: 1, t: 'bicho' }] };
    pintor.pintar(base);
    const antes = [...pintor._piezas.values()].filter(m => m.visible).length;
    pintor.pintar({ ...base, piezas: [base.piezas[0]] });
    const despues = [...pintor._piezas.values()].filter(m => m.visible).length;
    if (antes !== 2 || despues !== 1) {
        mal(`una pieza que desaparece sigue viéndose (${antes} → ${despues}, se esperaba 2 → 1)`);
    } else {
        console.log('\n  ✓ una pieza que desaparece deja de verse');
    }
}

/**
 * ⚠️ UN MUNDO SIN CASILLAS SE PINTA DONDE DICE EL SUSTRATO, Y NI MEDIO PASO MÁS.
 *
 * El fallo que había: el pintor corría la escena media rejilla para centrar el
 * tablero, y se lo hacía TAMBIÉN a los mundos sin rejilla. En ¡Busca! en el cubo
 * eso ponía la nave en 0.5 con el motor diciendo 0 — un error pequeño y constante,
 * de los que nadie ve y lo desmontan todo cuando se compara con el radar.
 *
 * No lo cazó nadie porque hasta hoy este pintor tenía nueve mundos en las pruebas y
 * cero páginas en pantalla.
 */
{
    const escena = new THREE.Scene();
    const pintor = new PintorMundo(escena, {}, 1);
    pintor.pintar({ piezas: [{ x: 0, y: 0, alto: 0, t: 'nave' }], zonas: [], leyenda: {} });
    const m = [...pintor._piezas.values()][0];
    if (m.position.x !== 0 || m.position.z !== 0 || m.position.y !== 0) {
        mal(`sin rejilla, una pieza en (0,0,0) se pintó en (${m.position.x}, ${m.position.y}, ${m.position.z})`);
    } else {
        console.log('  ✓ sin rejilla no se centra nada: la pieza cae donde dice el sustrato');
    }
}

/**
 * ⚠️ Y SI EL MUNDO TRAE SU PROPIA FIGURA, SE USA LA SUYA.
 *
 * Es lo que hace que el pintor valga para las páginas con arte: ¡Busca! tiene
 * planetas con textura hechos por una factoría, y sin este enganche habría que
 * elegir entre el sustrato y lo que se ve. El pintor sigue llevando la posición, la
 * identidad y el «esto ya no está»; la página sólo pone la figura.
 */
{
    const escena = new THREE.Scene();
    let veces = 0;
    const propia = () => { veces++; return new THREE.Group(); };
    const pintor = new PintorMundo(escena, { nave: { malla: propia } }, 1);
    const sus = { piezas: [{ x: 3, y: 4, alto: 5, t: 'nave' }], zonas: [], leyenda: {} };
    pintor.pintar(sus);
    pintor.pintar(sus);   // segundo fotograma: NO se vuelve a fabricar
    const m = [...pintor._piezas.values()][0];
    if (veces !== 1) mal(`la figura del mundo se fabricó ${veces} veces, y tocaba una`);
    else if (!(m instanceof THREE.Group)) mal('se dibujó una esfera en vez de la figura del mundo');
    else if (m.position.x !== 3 || m.position.y !== 5 || m.position.z !== 4) {
        mal(`la figura propia se colocó en (${m.position.x}, ${m.position.y}, ${m.position.z}) y tocaba (3, 5, 4)`);
    } else {
        console.log('  ✓ la página pone la figura y el pintor la coloca desde el sustrato');
    }
}

/**
 * ⚠️ Y LA PRUEBA QUE MONTA LA PÁGINA ENTERA SIN NAVEGADOR.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esto reproduce el cableado exacto de `raccoon_space.html`: figuras propias
 * repartidas por `cajon`, un núcleo de verdad, y una partida en la que se
 * ESCANEA un planeta — que es cuando la pieza cambia de tipo.
 *
 * Es el riesgo concreto de hoy. Con la clave vieja, `tipo#índice`, un planeta
 * escaneado pasaba por pieza nueva: el pintor fabricaba otra figura y escondía la
 * que la página llevaba puesta. En pantalla se vería el planeta desaparecer al
 * escanearlo, que es justo lo contrario de lo que hace el juego.
 *
 * Y se comprueba aquí y no mirando la página porque mirar no sirve: la pestaña
 * de pruebas estaba oculta, `requestAnimationFrame` no disparaba, y la captura
 * salía perfecta con el mundo congelado. Una pantalla bonita no es una medida.
 */
{
    const e = CATALOGO.find(x => x.id === 'alisa/RaccoonSpace-v1');
    const Clase = await e.cargar();
    const env = new Clase();
    env.reset(42);
    const core = [env.core, env.sys, env.nucleo, env].find(o => o && typeof o.sustrato === 'function');

    // Las «figuras de la página»: una por pieza, reconocibles por su nombre.
    const hechas = new Map();
    const propia = (t, p) => {
        const g = new THREE.Group();
        g.name = p.cajon;
        hechas.set(p.cajon, (hechas.get(p.cajon) ?? 0) + 1);
        return g;
    };
    /**
     * ⚠️ ESTA LISTA SE ESCRIBE A MANO, Y HAY QUE AÑADIRLE LOS TIPOS NUEVOS.
     *
     * El pintor tiene figura POR DEFECTO para un tipo que no conoce, así que un
     * tipo nuevo se ve igual — pero esta prueba busca las mallas por el `cajon`
     * de la pieza, y sólo las figuras que pone la página llevan ese nombre. Si
     * el mundo gana un tipo y no se añade aquí, la prueba lo cuenta como
     * «figura que no está donde dice el sustrato».
     *
     * Pasó el 2026-08-26 al meter los puntos de sincronización en
     * `RaccoonSpaceCore`: «3 de 40 figuras no están donde dice el sustrato», y
     * las tres eran los puntos nuevos. La prueba tenía razón en quejarse —no
     * podía emparejarlos— pero el fallo era suyo, no del mundo.
     */
    const ESTILO = { nave: { malla: propia }, asteroide: { malla: propia } };
    for (const t of ['sin_escanear', 'encontrado', 'escaneado',
                     'caliente', 'templado', 'fresco', 'frío', 'helado',
                     // Los tres puntos de recarga: la piel la elige cada etapa
                     // según su vehículo (dron→pila, satélite→sincronización,
                     // nave→bidón), así que los tres tipos pueden aparecer.
                     'pila', 'sincronizacion', 'bidon']) {
        ESTILO[t] = { malla: propia };
    }

    const escena = new THREE.Scene();
    const pintor = new PintorMundo(escena, ESTILO, 1);
    pintor.pintar(core.sustrato());
    const figuraDeP0 = [...pintor._piezas.values()].find(m => m.name === 'p0');

    /**
     * Se lleva la nave hasta un planeta y se escanea. Volar hasta él con verbos
     * sería más bonito y no medía nada: la primera versión empujaba a ciegas
     * cuatro mil pasos y no llegaba a ninguno, así que la prueba pasaba sin
     * comprobar lo que decía comprobar. Lo que se está midiendo es el dibujante,
     * no el pilotaje.
     */
    const destino = core.planetas[1];
    core.nave.x = destino.x; core.nave.y = destino.y; core.nave.z = destino.z;
    core.step('escanear', 1 / 60);
    core.step('nada', 1 / 60);
    const escaneados = core.planetas.filter(p => p.escaneado).length;
    const sus = core.sustrato();
    pintor.pintar(sus);

    if (!escaneados) {
        mal('no se pudo escanear ningún planeta: la prueba no llega a comprobar nada');
    } else {
        const repetidas = [...hechas.entries()].filter(([, n]) => n > 1);
        if (repetidas.length) {
            mal(`el pintor volvió a pedir figura para ${repetidas.map(([c]) => c).join(', ')}`
              + ' — una pieza que cambia de tipo se trató como pieza nueva');
        } else {
            console.log(`  ✓ ${escaneados} planeta(s) escaneado(s) y ninguna pieza perdió su figura`);
        }

        const ahora = [...pintor._piezas.values()].find(m => m.name === 'p0');
        if (ahora !== figuraDeP0) mal('el planeta 0 cambió de figura sin morirse');

        /**
         * Y lo que se ve tiene que estar donde dice el sustrato. Si el pintor
         * colocara mal, todo lo anterior daría igual: sería el mismo dibujante
         * paralelo de antes, sólo que compartido.
         */
        let desviadas = 0;
        for (const p of sus.piezas) {
            const m = [...pintor._piezas.values()].find(x => x.name === p.cajon);
            if (!m) { desviadas++; continue; }
            if (Math.abs(m.position.x - p.x) > 1e-9
             || Math.abs(m.position.y - (p.alto ?? 0)) > 1e-9
             || Math.abs(m.position.z - p.y) > 1e-9) desviadas++;
        }
        if (desviadas) mal(`${desviadas} de ${sus.piezas.length} figuras no están donde dice el sustrato`);
        else console.log(`  ✓ las ${sus.piezas.length} figuras están exactamente donde dice el sustrato`);
    }
}

console.log(`\n  ${vistos} mundos pintados por el mismo dibujante`);
if (fallos) { console.log(`\n  ✗ ${fallos} fallo(s) en el pintor de mundos\n`); process.exit(1); }
console.log('  ✓ un solo dibujante para los nueve, y no sabe ninguna regla\n');
