/**
 * sistemas.mjs — ¿SON LOS JUEGOS COMPOSICIONES DE SISTEMAS?
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run sistemas
 *
 * La tesis, dicha del derecho: **un juego no debería ser un motor**. Debería ser
 * una LISTA de piezas del motor y los NÚMEROS con los que se las llama. Si eso es
 * verdad, un núcleo casi no tiene aritmética: compone y parametriza.
 *
 * Esto lo mide con dos varas, las dos de una sola dirección — como el techo de
 * señales de `paginas.mjs` y el suelo de núcleos de `prueba_contrato.mjs`.
 *
 *   SUELO_COMPONEN     cuántos núcleos componen dos o más sistemas.  SÓLO SUBE.
 *   TECHO_INTEGRADORES cuántos sistemas se integran el movimiento por su cuenta
 *                      teniendo átomos que ya lo hacen.              SÓLO BAJA.
 *
 * ⚠️ POR QUÉ LA SEGUNDA VARA MIRA EL MOVIMIENTO Y NO OTRA COSA.
 *
 * Porque es donde más se repite y donde mejor se ve. Medido el 26-08-2026:
 * **veintidós sistemas se integran su propio movimiento y dos usan el
 * compartido**. Y no es que falten las piezas —`VolumeVehicle`, `Boids`,
 * `Steering`, `IDM`, `KinematicController`, `OrbitalKinematics` ya estaban
 * escritas—: es que los amalgamas no las llaman.
 *
 * ⚠️ Y UN AVISO SOBRE «QUITAR DUPLICADOS», QUE ME COSTÓ UNA EQUIVOCACIÓN.
 *
 * Conté que `EcosystemSystem` y `BoidsSystem` eran «dos implementaciones del
 * mismo Reynolds». Al leerlas de cerca NO lo son: una recorta por fuerza máxima
 * y alinea por la velocidad del vecino; la otra mezcla deseos normalizados con
 * pesos y alinea por su INTENCIÓN. Sustituir una por otra habría cambiado el
 * juego sin decirlo. Ver la cabecera de `FlockingSystem.js`.
 *
 * Por eso esta vara cuenta INTEGRADORES, no «copias»: parecerse no es ser igual,
 * y el trabajo honesto es sacar la ley con sus pesos fuera, no unificar a ojo.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const SISTEMAS = 'public/js/alisa-engine/src/world/systems';

/**
 * Los ÁTOMOS de movimiento: tienen derecho a integrar, porque para eso están.
 * Que esta lista esté escrita a mano es a propósito — es una decisión, no una
 * deducción, y quien añada un átomo nuevo tiene que declararlo aquí.
 */
const ATOMOS = new Set([
    'VolumeVehicleSystem.js',   // nave con inercia en un volumen
    'BoidsSystem.js',               // Reynolds de libro, por fuerza de dirección
    'FlockingSystem.js',            // bandada por deseos normalizados con peso
    'IDMSystem.js',                 // coche que sigue a otro coche
    'KinematicControllerSystem.js', // andar y saltar, sin inercia
    'OrbitalKinematicsSystem.js',   // balística y órbitas
]);

/** Los núcleos que declaran contrato, por nombre de fichero. */
const NUCLEOS = [
    'DroneTowerCore.js', 'SatelliteSweepCore.js', 'CorpBuildingCore.js', 'SubmarineCore.js', 'RaccoonSpaceCore.js',
    'BulletHeavenEngine.js', 'AsteroidsSystem.js', 'DefiendeSystem.js',
    'RaccoonCitySystem.js', 'CabinetJumpscareSystem.js', 'ChopperAquariumEngine.js',
];

const dir = path.join(RAIZ, SISTEMAS);
const ficheros = readdirSync(dir).filter((f) => f.endsWith('.js'));

/** Un fichero «integra movimiento» si multiplica por dt Y acumula en posición. */
function integra(texto) {
    const porDt = /\*\s*dt\b|\bdt\s*\*/.test(texto);
    const acumula = /(pos|position|\.x|\.y|\.z|vx|vy|vz)\s*\+=/.test(texto);
    return porDt && acumula;
}

const integradores = [];
for (const f of ficheros) {
    if (ATOMOS.has(f)) continue;
    const t = readFileSync(path.join(dir, f), 'utf8');
    if (integra(t)) integradores.push(f);
}

console.log('\n  ¿Son los juegos composiciones de sistemas?\n');
console.log('  núcleo                         decl.  compone  piezas');

/**
 * ⚠️ SE LEE LA DECLARACIÓN CUANDO LA HAY, Y LOS IMPORTS CUANDO NO.
 *
 * Medir la composición por los `import` es medir la SOMBRA: dice qué se trajo el
 * fichero, no qué compone el juego. Un núcleo con una `static ROM` dice las dos
 * cosas —qué piezas y con qué números— y eso es lo que se cuenta aquí.
 *
 * Se lee del TEXTO y no importando el módulo a propósito: la mitad de los
 * núcleos arrastran el motor de render al importarlos, y una vara que necesita
 * un navegador para medir no se puede poner en `npm test`.
 */
function declaracion(t) {
    const bloque = t.match(/static\s+ROM\s*=\s*\{[\s\S]*?\n {4}\};/);
    if (!bloque) return null;
    const lista = bloque[0].match(/sistemas\s*:\s*\[([\s\S]*?)\n {8}\]/);
    if (!lista) return null;
    return [...lista[1].matchAll(/\[\s*['"]([\w]+)['"]/g)].map((m) => m[1]);
}

const filas = [];
for (const f of NUCLEOS) {
    let t;
    try { t = readFileSync(path.join(dir, f), 'utf8'); } catch { continue; }

    const declarada = declaracion(t);
    /**
     * Respaldo: los `import` de OTRAS piezas del motor. No cualquier import —
     * traerse una utilidad de texto no es componer un sistema.
     */
    const piezas = declarada ?? [...t.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]*?([\w]+(?:System|Component|Core))\.js['"]/g)]
        .map((m) => m[2])
        .filter((n) => n !== f.replace('.js', ''));
    const unicas = [...new Set(piezas)];
    filas.push({ f, unicas, rom: !!declarada });
    const marca = declarada ? 'ROM' : ' — ';
    console.log(`  ${f.replace('.js', '').padEnd(30)} ${marca}  ${String(unicas.length).padStart(5)}  ${unicas.join(', ') || '—'}`);
}

const componen = filas.filter((r) => r.unicas.length >= 2);

/**
 * ⚠️ MEDIDO EL 26-08-2026, Y SE PONE EN LO MEDIDO.
 *
 * Un suelo con holgura no es un trinquete, es un adorno: con margen, el sabotaje
 * aprueba con el cable cortado. Es la lección que `paginas.mjs` lleva escrita
 * desde que su suelo estuvo en 1 con dos páginas enchufadas.
 */
const SUELO_COMPONEN = 6;

/**
 * ⚠️ VEINTIDÓS. ÉSA ES LA DEUDA, Y ESTÁ CONTADA, NO ESTIMADA.
 *
 * Antes de escribir esto dije «diecinueve» de memoria, contando a ojo con otro
 * filtro. La primera pasada del instrumento dijo veintidós, y la vara se pone en
 * lo MEDIDO: un techo puesto por debajo de la realidad nace roto, y uno puesto
 * por encima es una holgura por la que se cuela el siguiente.
 *
 * Cada uno de éstos se escribió su propio `pos += vel * dt` teniendo al lado un
 * átomo que ya lo hacía. Bajar este número es el trabajo; que no suba es el
 * trato. La forma de bajarlo está probada: cuando `VolumeVehicleSystem` se
 * sacó del acuario, la física quedó IDÉNTICA BIT A BIT y `prueba_huella.mjs` no
 * se movió; lo mismo acaba de pasar sacando la bandada a `FlockingSystem`. Sin
 * ese arnés esto no sería refactor, sería fe.
 */
const TECHO_INTEGRADORES = 22;

/**
 * ⚠️ CUÁNTOS JUEGOS SE DECLARAN COMO DATOS. SÓLO SUBE.
 *
 * Una ROM es el juego dicho como tabla: qué piezas y con qué números. La prueba
 * de que no es un adorno es que el núcleo se CONSTRUYA desde ella — si los
 * números están escritos dos veces, la tabla se desincroniza el martes.
 *
 * `DroneTowerCore` fue la primera, y la huella NO se movió al pasarlo de 438
 * líneas escritas a mano a una tabla: ésa es la prueba de que la declaración
 * describe el juego y no otra cosa parecida.
 *
 * `SatelliteSweepCore` es la segunda y nació ya así — dos tablas, cero líneas de
 * física— y tiene su propia huella, distinta. Eso es lo que separa una ROM nueva
 * de un cambio de piel: si la huella fuera la misma, sería el mismo juego con
 * otro nombre.
 */
const SUELO_ROMS = 3;
const conRom = filas.filter((r) => r.rom);

console.log(`\n  juegos declarados como ROM: ${conRom.length} de ${filas.length} (suelo: ${SUELO_ROMS})`);
console.log(`  ${conRom.map((r) => r.f.replace('.js', '')).join(', ') || '—'}`);

console.log(`\n  núcleos que componen dos o más piezas: ${componen.length} de ${filas.length} (suelo: ${SUELO_COMPONEN})`);
console.log(`  ${componen.map((r) => r.f.replace('.js', '')).join(', ') || '—'}`);

console.log(`\n  sistemas que se integran el movimiento por su cuenta: ${integradores.length} (techo: ${TECHO_INTEGRADORES})`);
console.log(`  ${integradores.map((f) => f.replace('.js', '')).join(', ')}`);
console.log(`\n  átomos de movimiento declarados: ${[...ATOMOS].map((f) => f.replace('.js', '')).join(', ')}`);

let mal = 0;
if (conRom.length < SUELO_ROMS) {
    console.log(`\n  ✗ el suelo de ROMs ha bajado de ${SUELO_ROMS} a ${conRom.length}`);
    mal++;
}
if (componen.length < SUELO_COMPONEN) {
    console.log(`\n  ✗ el suelo de composición ha bajado de ${SUELO_COMPONEN} a ${componen.length}`);
    mal++;
}
if (integradores.length > TECHO_INTEGRADORES) {
    console.log(`\n  ✗ el techo de integradores ha subido de ${TECHO_INTEGRADORES} a ${integradores.length}`);
    console.log('    alguien se ha escrito su propio movimiento teniendo un átomo al lado.');
    mal++;
}
console.log('');
process.exit(mal ? 1 : 0);
