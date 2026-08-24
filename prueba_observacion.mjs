/**
 * ¿BASTA EL SUSTRATO? — DE ÉL TIENE QUE SALIR UN VECTOR JUGABLE, SIN TOCAR NADA
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_observacion.mjs
 *
 * Esta prueba contesta a una pregunta de arquitectura que llevaba abierta desde
 * que se planteó migrar los motores a ECS: **¿hace falta ECS para que la
 * observación se escriba sola?**
 *
 * La respuesta, medida el 25-08: no. El SUSTRATO ya lleva bastante. De los nueve
 * mundos sale un vector numérico finito, en rango y que refleja el juego, con
 * `ObservacionDeSustrato.js` y sin una línea por juego.
 *
 * ⚠️ Y ESO IMPORTA PORQUE UN VECTOR ESCRITO A MANO ES UN SITIO DONDE MENTIR.
 *
 * Cada entorno se fabrica el suyo —24 números en ¡Busca!, 64 en Marabunta— y ahí
 * es donde apareció que `escaner_listo` valía 1 mientras la puerta de lenguaje
 * decía «lo tienes al alcance, pero ya lo escaneaste». El estado decía una cosa
 * y su copia otra, desde antes de que nadie mirara.
 *
 * Esto no reemplaza las observaciones publicadas —cambiarlas movería notas de
 * quien ya jugó— pero demuestra que la información ESTÁ, y deja a los mundos
 * nuevos con observación gratis.
 */
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';
import { observacionDeSustrato, largoDeObservacion } from './public/js/alisa-engine/src/gym/ObservacionDeSustrato.js';

let fallos = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };

console.log('\n¿Sale un vector jugable del sustrato, en los nueve mundos?\n');

let vistos = 0;
for (const e of CATALOGO) {
    if (e.familia !== 'propio') continue;
    const Clase = await e.cargar();
    const env = new Clase();
    env.reset(4);
    const sys = [env.sys, env.core, env.nucleo, env.motor, env].find(o => o && typeof o.sustrato === 'function');
    if (!sys) { mal(`${e.id}: sin \`sustrato()\` — lo vigila prueba_sustrato.mjs`); continue; }
    vistos++;

    const v0 = observacionDeSustrato(sys.sustrato());

    /**
     * ⚠️ Y LAS ACCIONES NO PUEDEN CANCELARSE ENTRE SÍ, QUE ES COMO ME EQUIVOQUÉ.
     *
     * La primera versión recorría las acciones con `(i*7) % n`, que en un espacio
     * de 8 verbos da el ciclo 0,7,6,5,4,3,2,1 — y ahí `oeste` anula a `este`,
     * `sur` a `norte` y `subir` a `bajar`. Con 120 pasos son 15 ciclos completos:
     * el satélite del planeta volvía EXACTAMENTE al punto de partida y yo di por
     * roto un entorno sano. La pista estaba en el combustible, que sí bajaba.
     *
     * Un barrido uniforme de acciones se cancela solo en cualquier espacio
     * simétrico — y los espacios de movimiento lo son casi siempre.
     */
    for (let i = 0; i < 150 && !env.done; i++) {
        try {
            const esp = env.constructor.actionSpace;
            if (esp?.type === 'discrete' && Number.isFinite(esp.n)) {
                env.step(1 + (i % Math.max(1, esp.n - 1)));
            } else {
                const m = env.affordances?.() ?? [];
                if (!m.length) break;
                env.stepVerb(m[i % m.length].verb, m[i % m.length].args ?? {});
            }
        } catch { break; }
    }
    const v1 = observacionDeSustrato(sys.sustrato());

    if (v0.length !== largoDeObservacion()) {
        mal(`${e.id}: el vector mide ${v0.length} y se declaran ${largoDeObservacion()}`);
    }
    if (!v0.every(Number.isFinite) || !v1.every(Number.isFinite)) {
        mal(`${e.id}: el vector trae NaN o Infinity — una red no puede aprender de eso`);
    }
    if (!v0.every(x => x >= -1 && x <= 1) || !v1.every(x => x >= -1 && x <= 1)) {
        mal(`${e.id}: hay números fuera de [-1, 1] — el mundo grande aplastaría al pequeño`);
    }
    /**
     * El que de verdad importa: si el vector no cambia al jugar, no lleva el
     * juego dentro. Es la versión numérica de «lo que no distingue tampoco
     * puntúa».
     */
    if (!v0.some((x, i) => x !== v1[i])) {
        mal(`${e.id}: el vector NO cambia después de jugar — no lleva el juego dentro`);
    }

    /**
     * ⚠️ Y EL CÓDIGO DE UN TIPO TIENE QUE SER EL MISMO SIEMPRE.
     *
     * Esto es lo que de verdad se rompe si los tipos se derivan de las piezas
     * presentes en vez de la `leyenda` declarada: al aparecer o desaparecer un
     * tipo, TODOS los índices se desplazan, y «serpiente» pasa a valer un número
     * distinto de un tick para otro. Una red entrenada así aprende ruido.
     *
     * Y no lo caza la comprobación de arriba: con la derivación mala el vector
     * cambia igualmente — cambia por el motivo equivocado. Lo descubrí porque el
     * arnés de sabotajes aprobó con el cable cortado.
     *
     * Se mide quitando una pieza: si los códigos de las que quedan se mueven, la
     * codificación no es estable.
     */
    const sus = sys.sustrato();
    if ((sus.piezas?.length ?? 0) >= 2) {
        const codigoDe = (s) => observacionDeSustrato(s).slice(3, 8)[0];   // tipo de la 1ª pieza
        const completo = codigoDe(sus);
        const recortado = codigoDe({ ...sus, piezas: sus.piezas.slice(0, -1) });
        if (completo !== recortado) {
            mal(`${e.id}: el código del tipo se mueve al quitar una pieza `
              + `(${completo} → ${recortado}). Los tipos tienen que salir de \`leyenda\`, `
              + 'no de las piezas presentes: si no, el mismo tipo vale distinto cada tick.');
        }
    }
}

console.log(`  ${vistos} mundos revisados`);
console.log('');
if (fallos) { console.log(`  ✗ ${fallos} fallo(s): el sustrato no basta en algún mundo\n`); process.exit(1); }
console.log('  ✓ de los nueve sustratos sale un vector jugable, sin una línea por juego\n');
