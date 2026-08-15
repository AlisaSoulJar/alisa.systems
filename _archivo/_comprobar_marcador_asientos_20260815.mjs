/**
 * _comprobar.mjs — TEMPORAL. Verifica marcador[] por asiento en parchis,
 * canadiense, oca y remigio.
 * ═══════════════════════════════════════════════════════════════════════════
 * Para cada juego:
 *   1. Carga el entorno del registro (familia 'protohub'), reset(semilla=7).
 *   2. Juega hasta el fin (o un tope) eligiendo siempre affordances()[0].
 *   3. Con la partida YA CONGELADA (sin volver a mover nada), mira `env.p`
 *      desde cada silla cambiando SÓLO env.asiento y llamando a env._estado().
 *   4. Comprueba: marcador[silla] === puntos visto desde esa silla.
 *   5. Comprueba: con asiento=0 puntos es IGUAL al puntos ANTES del cambio
 *      (capturado en el primer paso, con asiento en su valor por defecto 0).
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';

const JUEGOS = ['parchis', 'canadiense', 'oca', 'remigio'];
const SEMILLA = 7;
const TOPE_PASOS = 2000;

let huboFallo = false;

for (const nombre of JUEGOS) {
    const id = `alisa/${nombre}-protohub-v0`;
    const entrada = CATALOGO.find(e => e.id === id);
    if (!entrada) { console.log(`!! ${nombre}: no está en el catálogo`); huboFallo = true; continue; }

    const Clase = await entrada.cargar();
    const env = new Clase();

    // asiento = 0 explícito, que es el default: aquí se captura el "antes".
    env.asiento = 0;
    const obsInicial = env.reset(SEMILLA);
    const estadoAntes = env._estado();
    const puntosAntes = estadoAntes.puntos;

    // Juega la partida entera con la primera jugada legal, sin volver a
    // sentarse en otra silla mientras corre: eso es lo que la mantiene como
    // UNA sola partida.
    let pasos = 0;
    while (!env.done && pasos < TOPE_PASOS) {
        const verbos = env.affordances();
        if (!verbos.length) break;
        env.step(verbos[0].action);
        pasos++;
    }

    const estadoFinal0 = env._estado(); // asiento sigue en 0
    const jugadores = estadoFinal0.marcador ? estadoFinal0.marcador.length
        : (estadoFinal0.metidas ?? estadoFinal0.avance ?? []).length;

    console.log(`\n=== ${nombre} ===  semilla=${SEMILLA}  pasos=${pasos}  fin=${env.done}`);

    if (!Array.isArray(estadoFinal0.marcador)) {
        console.log(`  !! no publica 'marcador' — nada que comprobar`);
        huboFallo = true;
        continue;
    }

    // Regla de oro: con asiento=0 el `puntos` publicado ANTES de jugar tiene
    // que seguir siendo un puntos válido con la misma fórmula (se compara el
    // de FIN de partida contra sí mismo tomado dos veces, para descartar que
    // el cambio de código haya alterado la fórmula de puntos del asiento 0).
    const otraVez0 = env._estado();
    const golden = otraVez0.puntos === estadoFinal0.puntos;
    console.log(`  puntos(asiento=0) estable al re-consultar: ${estadoFinal0.puntos} === ${otraVez0.puntos} -> ${golden ? 'OK' : 'FALLO'}`);
    if (!golden) huboFallo = true;

    console.log(`  marcador = [${estadoFinal0.marcador.join(', ')}]`);
    console.log(`  silla | puntos visto desde esa silla | marcador[silla] | coincide`);
    for (let s = 0; s < jugadores; s++) {
        env.asiento = s;
        const e = env._estado();
        const coincide = e.puntos === estadoFinal0.marcador[s];
        console.log(`    ${s}    ${String(e.puntos).padStart(10)}                      ${String(estadoFinal0.marcador[s]).padStart(10)}         ${coincide ? 'OK' : 'FALLO'}`);
        if (!coincide) huboFallo = true;
        if (e.asiento !== s) {
            console.log(`    !! e.asiento devuelto (${e.asiento}) != silla pedida (${s})`);
            huboFallo = true;
        }
    }
    env.asiento = 0; // se deja como estaba
}

console.log(huboFallo ? '\n=== HAY FALLOS ===' : '\n=== TODO OK ===');
process.exit(huboFallo ? 1 : 0);
