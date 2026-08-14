/**
 * prueba_objetivo.mjs — ¿sabe un agente A QUÉ JUEGA?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un juego puede declarar `OBJETIVO` en sus reglas, y el hub lo mete en el estado
 * para que la puerta de texto lo diga lo primero, antes que los puntos.
 *
 * ⚠️ POR QUÉ ESTO ES UNA PRUEBA Y NO UNA NOTA EN UN CUADERNO.
 *
 * Lo encontré jugando yo misma una mano de entropy, leyendo sólo lo que recibe un
 * agente sin ojos: nada decía si convenía puntuar alto o bajo. Lo DEDUJE viendo
 * moverse el número después de una jugada que ya creía buena — pero un agente que
 * juega una sola jugada, o uno más débil, no puede. En un banco cuya gracia es
 * comparar a una persona con una máquina, no decir el objetivo mide la capacidad de
 * adivinarlo.
 *
 * Y una persona no tiene ese problema: abre la página, ve un tablero de damas y
 * sabe a qué juega. La asimetría es sólo contra el agente, o sea contra la mitad de
 * la tabla.
 *
 * ⚠️ EL NÚMERO SÓLO PUEDE SUBIR.
 *
 * Igual que `prueba_sustrato.mjs` cuenta los que dependen del adaptador y su techo
 * sólo baja, aquí se cuenta cuántos lo declaran y el suelo sólo sube. Escribir
 * treinta y cinco frases es trabajo de contenido y se hace poco a poco; lo que no
 * puede pasar es que se olvide, ni que un juego nuevo nazca mudo.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { JUEGOS, cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');

/**
 * Cuántos lo declaran hoy. Sube y se actualiza este número; si baja, algo se ha
 * perdido por el camino y la prueba lo dice.
 *
 * ⚠️ 13-08-2026: LLEGÓ A 35 Y ESO LE CAMBIA EL SENTIDO.
 * Mientras iba por la mitad, esto era una cuenta atrás: «faltan tantos». Ahora
 * que están todos ya no mide progreso, mide OTRA COSA — que un juego nuevo no
 * pueda nacer mudo. El primero que se añada sin objetivo baja el número y esto
 * se pone rojo, que es exactamente para lo que se escribió.
 */
const SUELO = 35;

const con = [], sin = [];
for (const juego of JUEGOS) {
    let reglas = null;
    try { reglas = await cargarReglas(juego, {}); } catch { /* se cuenta como mudo */ }
    (reglas?.OBJETIVO ? con : sin).push(juego);
}

console.log(`\n¿Sabe un agente a qué juega?\n`);
console.log(`  ${con.length}/${JUEGOS.length} juegos declaran su objetivo (suelo: ${SUELO})`);
if (sin.length) console.log(`  sin decirlo todavía: ${sin.join(', ')}`);

// Y que lo que se declara SIRVA: una frase vacía o de tres letras no es un
// objetivo, es un campo relleno para que la cuenta suba. Eso ya lo hemos visto
// pasar con otras listas.
const flojos = [];
for (const j of con) {
    const reglas = await cargarReglas(j, {});
    if (String(reglas.OBJETIVO).trim().length < 20) flojos.push(j);
}
if (flojos.length) {
    console.log(`\n  ✗ objetivo demasiado corto para servir de algo: ${flojos.join(', ')}`);
    process.exit(1);
}

if (con.length < SUELO) {
    console.log(`\n  ✗ han bajado de ${SUELO} a ${con.length}: alguien se ha dejado uno por el camino.`);
    console.log(`    El número sólo puede subir. Si de verdad sobra un objetivo, baja el suelo A MANO`);
    console.log(`    y explica por qué en el commit.`);
    process.exit(1);
}
console.log(`\n  ✓ ninguno ha perdido el suyo`);
