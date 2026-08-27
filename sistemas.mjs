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
    'BallisticSystem.js',           // caer con gravedad, y saltar
    'ScrollTrackSystem.js',         // la vía: un mundo que avanza y no vuelve
    'ProjectileSystem.js',          // lo que sale disparado y vuela en recta
]);

/**
 * ⚠️ Y UNA ADVERTENCIA SOBRE ESTA LISTA, QUE ME COSTÓ MEDIA HORA EL 27-08.
 *
 * `KinematicControllerSystem` lleva aquí desde el principio como «andar y
 * saltar». Al ir a componer un juego que salta, resultó que **no se puede
 * llamar**: pide una malla de THREE y su modo `FPS_WALK` ni está implementado.
 * O sea que la lista decía que teníamos un átomo de andar y no lo teníamos.
 *
 * Estar declarado como átomo no prueba que sirva. Se queda —sigue moviendo lo
 * que mueve en las páginas— pero que conste que un núcleo sin pantalla no puede
 * usarlo, y que por eso hubo que escribir `BallisticSystem` en vez de reutilizar.
 */

/**
 * Los núcleos que declaran contrato, por nombre de fichero.
 *
 * ⚠️ TRES CAMBIOS EL 26-08, Y LOS TRES BAJAN EL DENOMINADOR — ASÍ QUE SE
 *    EXPLICAN, QUE SI NO ESTO ES MAQUILLAR LA VARA.
 *
 * Salen `RaccoonCitySystem` y `CabinetJumpscareSystem`. Al ir a declararles la
 * ROM se vio que **no son juegos**: el primero inclina un dron, gira sus hélices
 * y abre su haz de luz —su juego es el cartucho `RaccoonCity`, que vive en
 * `RaccoonSpaceCore`—; el segundo es una escena de susto que mueve mallas y
 * cámara. Ninguno tiene `info()` ni `sustrato()` ni sabe cuándo se acaba nada.
 * Declararles un cartucho habría sido inventarles un juego para que la columna
 * saliera bonita.
 *
 * Y sale `BulletHeavenEngine` para que entre `MarabuntaSystem`, que es quien de
 * verdad es el juego: el motor nace VACÍO —sin armas, sin bichos, sin oleadas— y
 * quien se las pone es el cartucho. El mueble no se mide como si fuera un juego,
 * igual que no se mide `SearchInVolumeCore`.
 *
 * Los dos pintores siguen contándose en la vara de integradores, que mira TODOS
 * los ficheros: que no sean juegos no les quita el `+= algo * dt`.
 */
const NUCLEOS = [
    'DroneTowerCore.js', 'SatelliteSweepCore.js', 'CorpBuildingCore.js',
    'AsteroidsSystem.js', 'SubmarineCore.js', 'RaccoonSpaceCore.js',
    'MarabuntaSystem.js', 'DefiendeSystem.js', 'ChopperAquariumEngine.js',
    'CorpStealthCore.js', 'ImpulsoCore.js',
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
/**
 * Recorta el bloque que empieza en `desde` contando su pareja de signos. Se
 * cuenta en vez de buscar la indentación de cierre porque un cartucho anidado
 * cierra a doce espacios y el mueble a cuatro, y una regla por sangría se
 * equivoca en cuanto alguien reformatea.
 */
function bloque(t, desde, abre, cierra) {
    let n = 0;
    for (let i = desde; i < t.length; i++) {
        if (t[i] === abre) n++;
        else if (t[i] === cierra) { n--; if (n === 0) return t.slice(desde, i + 1); }
    }
    return null;
}

/**
 * ⚠️ Y `ROMS` EN PLURAL, PORQUE UN MUEBLE PUEDE TENER VARIOS CARTUCHOS.
 *
 * `RaccoonSpaceCore` es un solo núcleo con TRES juegos publicados encima
 * —ciudad, planeta y espacio—, cada uno con su id y su huella. Contarlo como
 * «una ROM» diría menos verdad que la realidad: son tres cartuchos en el mismo
 * mueble, igual que `SearchInVolumeCore` sostiene dos en dos ficheros.
 *
 * Así que esto devuelve las piezas Y cuántos cartuchos las declaran.
 */
function declaracion(t) {
    const m = t.match(/static\s+ROMS?\s*=\s*\{/);
    if (!m) return null;
    const cuerpo = bloque(t, m.index + m[0].length - 1, '{', '}');
    if (!cuerpo) return null;

    const listas = [];
    for (const s of cuerpo.matchAll(/sistemas\s*:\s*\[/g)) {
        const lista = bloque(cuerpo, s.index + s[0].length - 1, '[', ']');
        if (lista) listas.push([...lista.matchAll(/\[\s*['"]([\w]+)['"]/g)].map((x) => x[1]));
    }
    if (!listas.length) return null;
    return { piezas: [...new Set(listas.flat())], cartuchos: listas.length };
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
    const piezas = declarada?.piezas ?? [...t.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]*?([\w]+(?:System|Component|Core))\.js['"]/g)]
        .map((m) => m[2])
        .filter((n) => n !== f.replace('.js', ''));
    const unicas = [...new Set(piezas)];
    const cartuchos = declarada?.cartuchos ?? 0;
    filas.push({ f, unicas, cartuchos });
    const marca = (cartuchos > 1 ? `ROM×${cartuchos}` : cartuchos ? 'ROM' : '—').padEnd(6);
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
/**
 * ⚠️ 6 → 9 EL 26-08: LOS NUEVE. Y ESO CONVIERTE ESTA VARA EN OTRA COSA.
 *
 * Mientras iba por 6 de 11 medía un progreso. En 9 de 9 ya no mide progreso:
 * mide que **no se pueda añadir un juego que no componga**. El siguiente núcleo
 * que entre con toda su física escrita dentro suspende aquí, que es exactamente
 * para lo que se puso.
 */
const SUELO_COMPONEN = 11;

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
/**
 * ⚠️ 22 → 21 EL 27-08. LA PRIMERA VEZ QUE ESTE NÚMERO BAJA DESDE QUE SE MIDIÓ.
 *
 * `KinematicRageSystem` sale de la lista: su caída —gravedad a la velocidad,
 * velocidad a la posición— se fue a `BallisticSystem` y él se queda con lo suyo,
 * que es el estropicio. Se comprobó con una huella de mano de doce escombros y
 * 240 pasos: mismo resumen antes y después, `0fa3c20e`.
 *
 * Y merece decirse cómo se llegó: no fue una campaña de limpieza, fue **hacer un
 * juego nuevo**. Al ir a componer un juego de un botón hicieron falta tres piezas; dos
 * estaban escondidas dentro de Pedrisco y salieron con su huella `fd061509`
 * quieta, y la tercera no existía en ninguna parte. La deuda se paga un juego
 * por vez, y el juego nuevo es el que dice qué falta.
 */
/**
 * ⚠️ 21 → 20 EL 27-08, Y ESTA VEZ SIN ESCRIBIR NINGUNA PIEZA NUEVA.
 *
 * `TurretCombatSystem` sale de la lista: su vuelo de balas —posición más
 * velocidad por dt, cuatro veces entre dos listas— se fue a `ProjectileSystem`,
 * que es un átomo declarado y tiene derecho a integrar.
 *
 * Y salió de un sitio que no me esperaba: ese fichero era el 90% de un sistema
 * de disparo, headless y bien hecho, escondido dentro de un juego **que no juega
 * nadie** —su único llamador es una prueba que además lleva rota desde antes,
 * en un Katamari, y que `npm test` ni siquiera corre—. Comprobado con una huella
 * de mano de 900 pasos: `c621a176` antes y después.
 */
const TECHO_INTEGRADORES = 20;

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
/**
 * ⚠️ 4 → 11 EL 26-08, Y AQUÍ SE ACABA LA CONVERSIÓN: NO QUEDA NINGUNO.
 *
 * Los nueve núcleos del banco declaran su cartucho, y entre los nueve suman
 * once —el mueble del mapache sostiene tres—. Ninguno cambió de comportamiento
 * al declararlo: las once huellas de `prueba_huella.mjs` siguen donde estaban, y
 * el acuario, que no está sellado, se comprobó a mano antes y después (misma
 * partida, mismo resumen `d5c341c3`).
 *
 * Ésa es toda la prueba de que esto no es papeleo: si la tabla describiera un
 * juego distinto del que se jugaba, la huella lo habría dicho once veces.
 */
/**
 * ⚠️ Y 11 → 12 CON EL PRIMERO QUE NACE DE LAS PIEZAS EN VEZ DE MUDARSE A ELLAS.
 *
 * `CorpStealthCore` no es una conversión: es un juego nuevo, y compone SEIS
 * sistemas sin escribir una sola cuenta de física. Andar incluido — lo cazó esta
 * misma vara, que subió el techo de integradores a 23 en cuanto el núcleo se
 * escribió su propio `x -= velocidad * dt`. La pieza que faltaba resultó ser la
 * que la propia página ya usaba para su jugador, y al enchufarla la huella no se
 * movió: `bd87b6ef` antes y después.
 */
/**
 * ⚠️ Y 13 → 14 CON ¡IMPULSO!, QUE LLEVABA DÍAS SIN RECOGERSE.
 *
 * El aviso salía en verde —«↑ sube a 14»— y por eso nadie lo leyó. Un suelo por
 * debajo de la realidad no protege lo ganado: durante esos días se podía haber
 * perdido un cartucho sin que esta vara dijera una palabra, porque seguía
 * midiendo contra un número viejo.
 *
 * Un aviso en verde no es un aviso. Recogido el 27-08.
 */
const SUELO_ROMS = 14;
const conRom = filas.filter((r) => r.cartuchos);
/** Se cuentan CARTUCHOS, no ficheros: el mueble del mapache sostiene tres. */
const cartuchos = filas.reduce((s, r) => s + r.cartuchos, 0);

console.log(`\n  juegos declarados como ROM: ${cartuchos} en ${conRom.length} de ${filas.length} núcleos (suelo: ${SUELO_ROMS})`);
console.log(`  ${conRom.map((r) => r.f.replace('.js', '') + (r.cartuchos > 1 ? `×${r.cartuchos}` : '')).join(', ') || '—'}`);

console.log(`\n  núcleos que componen dos o más piezas: ${componen.length} de ${filas.length} (suelo: ${SUELO_COMPONEN})`);
console.log(`  ${componen.map((r) => r.f.replace('.js', '')).join(', ') || '—'}`);

console.log(`\n  sistemas que se integran el movimiento por su cuenta: ${integradores.length} (techo: ${TECHO_INTEGRADORES})`);
console.log(`  ${integradores.map((f) => f.replace('.js', '')).join(', ')}`);
console.log(`\n  átomos de movimiento declarados: ${[...ATOMOS].map((f) => f.replace('.js', '')).join(', ')}`);

let mal = 0;
if (cartuchos < SUELO_ROMS) {
    console.log(`\n  ✗ el suelo de ROMs ha bajado de ${SUELO_ROMS} a ${cartuchos}`);
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
