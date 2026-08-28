/**
 * prueba_aspecto.mjs — que una piel pueda vestir la sala y no pueda apagar la carta
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_aspecto.mjs     → 0 todo bien · 1 hay fallos · 2 la prueba no vale
 *
 * POR QUÉ EXISTE
 *
 * `render/aspecto.js` abre el aspecto a quien quiera: una piel es un JSON con
 * roles y colores, y la idea es que se pueda escribir sin pedir permiso. Eso sólo
 * es defendible si hay UNA cosa que una piel no puede tocar.
 *
 * Esa cosa está medida. Al traer la luz de la Sala del Huevo a las páginas de
 * cartas, el contraste dentro de la mano cayó de 177 a 50: el número y el palo se
 * fueron con el blanco porque la cara de la carta se come la luz de la sala. Con
 * la cara sin luz vuelve a 133. De ahí las dos clases —ESCENOGRAFIA se viste,
 * LECTURA se lee— y de ahí la ley: **se ilumina el objeto; no se ilumina lo que
 * hay que leer**.
 *
 * La ley no es una promesa de la documentación: es el orden de una línea de
 * `aspectoDe`, donde `sinLuz` se decide DESPUÉS de aplicar la piel. Una garantía
 * que depende del orden de un `spread` es exactamente la clase de garantía que se
 * pierde en un refactor de tres minutos sin que nadie se entere hasta que un
 * jugador no ve su carta. Por eso esto está escrito.
 *
 * QUÉ MIDE
 *   1. **todo rol resuelve** — `color` numérico y `sinLuz` booleano, para los que
 *      hay en `ROLES`. Un rol declarado que no se puede pintar es una entrada
 *      muerta que alguien copiará a su piel
 *   2. **LA LEY** — a todo rol de clase LECTURA se le tira encima una piel
 *      hostil, con `sinLuz: false` puesto a mano, y tiene que seguir saliendo
 *      `sinLuz: true`
 *   3. **y no al revés** — un rol de ESCENOGRAFIA SÍ deja que una piel le cambie
 *      el color. Sin esto, «la piel no puede apagar nada» lo cumpliría también un
 *      sustrato que ignora las pieles enteras, que es lo mismo que no tenerlas
 *   4. **un rol desconocido no revienta** — devuelve algo pintable y AVISA
 *   5. **`revisarPiel` caza un rol inventado** — antes de aplicarlo, no después
 *
 * ⚠️ CONTROL POSITIVO, Y NO ES CEREMONIA: ESTA PRUEBA SE APRUEBA SOLA SIN ÉL.
 *
 * «Ninguna lectura se apaga» es verdad, trivialmente, en un vocabulario que no
 * tiene lecturas. Si alguien borra los roles de carta de `ROLES`, la comprobación
 * 2 recorre cero roles, no encuentra ni un fallo y sale en VERDE justo cuando la
 * ley ha dejado de existir. Así que si no hay al menos un rol de cada clase esto
 * sale con 2 —«la prueba no vale»— en vez de aprobar.
 *
 * SABOTAJE DECLARADO — las dos veces sobre una COPIA de `aspecto.js`, no sobre el
 * fichero de verdad; una prueba que se demuestra sabiendo romper el repo se acaba
 * dejando el repo roto.
 *
 *   A · `sinLuz: clase === LECTURA`  →  `sinLuz: encima.sinLuz ?? (clase === LECTURA)`
 *       (o sea: dejar que la piel mande, que es el refactor razonable que la rompe)
 *       ⇒ la comprobación 2 dio «carta-cara salió sinLuz=false · carta-reverso
 *          salió sinLuz=false» y salió 1.
 *
 *   B · borrar `carta-cara` y `carta-reverso` de `ROLES`
 *       ⇒ salió 2 —«CONTROL POSITIVO FALLIDO: 9 de escenografía y 0 de lectura»—
 *          y NO 0, que es lo que habría salido sin el control.
 *
 * Hoy son 9 roles de escenografía y 2 de lectura; `carta-canto` cuenta como
 * escenografía a propósito, que es lo que hace que una carta parezca apoyada.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RENDER = path.join(AQUI, 'public', 'arcade', 'js', 'protohub', 'render');
const imp = (rel) => import(pathToFileURL(path.join(RENDER, rel)).href);

// El vocabulario NO se escribe aquí: sale del propio módulo. Un comprobador con
// su propia lista de roles se queda atrás en cuanto alguien añade uno, y entonces
// mide un mundo que ya no existe — es el fallo que esta casa ha arreglado seis
// veces en un día.
const { aspectoDe, revisarPiel, ROLES, ESCENOGRAFIA, LECTURA } = await imp('aspecto.js');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo  = (s) => `\x1b[31m${s}\x1b[0m`;
const gris  = (s) => `\x1b[90m${s}\x1b[0m`;

const fallos = [];
const bien = (t, d) => console.log(`  ${verde('✓')} ${t.padEnd(34)} ${gris(d)}`);
const mal  = (t, d) => { fallos.push(`${t}: ${d}`); console.log(`  ${rojo('✗')} ${t.padEnd(34)} ${rojo(d)}`); };

console.log('\n¿Puede una piel vestir la sala sin apagar la carta?\n');

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL POSITIVO — antes de medir nada, ¿hay algo que medir?
// ═══════════════════════════════════════════════════════════════════════════
const lecturas = Object.keys(ROLES).filter((r) => ROLES[r] === LECTURA);
const escenas  = Object.keys(ROLES).filter((r) => ROLES[r] === ESCENOGRAFIA);
if (!lecturas.length || !escenas.length) {
    console.log(rojo(`CONTROL POSITIVO FALLIDO: el vocabulario trae ${escenas.length} roles de `
        + `escenografía y ${lecturas.length} de lectura. Con una de las dos clases a cero, `
        + `«ninguna lectura se apaga» lo cumple también un vocabulario sin lecturas, y este `
        + `verde no diría nada.`));
    process.exit(2);
}
console.log(gris(`  ${escenas.length} roles de escenografía · ${lecturas.length} de lectura\n`));

// ═══════════════════════════════════════════════════════════════════════════
// 1 · Todo rol resuelve a algo pintable
// ═══════════════════════════════════════════════════════════════════════════
{
    const rotos = [];
    for (const rol of Object.keys(ROLES)) {
        const a = aspectoDe(rol);
        // `Number.isInteger` y no `typeof number`: un `NaN` es un número y pintaría
        // negro sin quejarse, que es la avería que no se ve.
        if (!Number.isInteger(a?.color)) rotos.push(`${rol} → color ${JSON.stringify(a?.color)}`);
        else if (typeof a.sinLuz !== 'boolean') rotos.push(`${rol} → sinLuz ${JSON.stringify(a.sinLuz)}`);
    }
    if (rotos.length) mal('todo rol resuelve', rotos.join(' · '));
    else bien('todo rol resuelve', `${Object.keys(ROLES).length} roles con color numérico y sinLuz booleano`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · LA LEY — una piel hostil no puede apagar una lectura
// ═══════════════════════════════════════════════════════════════════════════
{
    // Una piel que hace TODO lo que no debe: apagar la clase y, de paso, pintar la
    // carta de negro. Lo segundo tiene que colar —una piel puede pintar— y lo
    // primero no. Si sólo probara `sinLuz` no sabría si la piel se aplicó siquiera.
    const hostil = {
        nombre: 'hostil',
        roles: Object.fromEntries(lecturas.map((r) => [r, { sinLuz: false, color: 0x000000 }])),
    };
    const rotos = [];
    let pintados = 0;
    for (const rol of lecturas) {
        const a = aspectoDe(rol, { piel: hostil });
        if (a.sinLuz !== true) rotos.push(`${rol} salió sinLuz=${a.sinLuz}`);
        if (a.color === 0x000000) pintados++;
    }
    if (rotos.length) mal('la piel NO apaga una lectura', rotos.join(' · '));
    else if (pintados !== lecturas.length) {
        // Verde sospechoso: si la piel no llegó a aplicarse, `sinLuz` sale bien por
        // el motivo equivocado y la ley no se ha probado.
        mal('la piel NO apaga una lectura',
            `sinLuz aguanta, pero la piel sólo pintó ${pintados}/${lecturas.length}: no se aplicó, así que no se ha probado nada`);
    } else bien('la piel NO apaga una lectura',
        `${lecturas.length} lecturas repintadas de negro por la piel y las ${lecturas.length} siguen sin luz`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · ...y la escenografía SÍ se deja vestir
// ═══════════════════════════════════════════════════════════════════════════
{
    const rol = escenas[0];
    const antes = aspectoDe(rol).color;
    // Un color que no puede coincidir por casualidad con el de la casa.
    const NARANJA = 0xff7a00;
    const piel = { nombre: 'de prueba', roles: { [rol]: { color: NARANJA } } };
    const despues = aspectoDe(rol, { piel });
    if (despues.color !== NARANJA) {
        mal('la escenografía SÍ se viste', `«${rol}» ignoró la piel: sigue en 0x${antes.toString(16)}`);
    } else if (despues.sinLuz !== false) {
        mal('la escenografía SÍ se viste', `«${rol}» es escenografía y salió sinLuz=true`);
    } else bien('la escenografía SÍ se viste',
        `«${rol}» pasó de 0x${antes.toString(16).padStart(6, '0')} a 0x${NARANJA.toString(16)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · Un rol desconocido no revienta, sale pintable y se dice
// ═══════════════════════════════════════════════════════════════════════════
{
    // El aviso se recoge en vez de silenciarlo: que salga en magenta es media
    // garantía, la otra media es que se DIGA. Un rol que falta y no avisa se cuela
    // en la piel de alguien y nadie se entera hasta que lo mira un jugador.
    const avisos = [];
    const antes = console.warn;
    console.warn = (...a) => avisos.push(a.join(' '));
    let a, reventó = null;
    try { a = aspectoDe('rol-que-no-existe-' + Date.now()); }
    catch (e) { reventó = e.message; }
    finally { console.warn = antes; }

    if (reventó) mal('rol desconocido no revienta', `lanzó: ${reventó}`);
    else if (!Number.isInteger(a?.color) || typeof a?.sinLuz !== 'boolean') {
        mal('rol desconocido no revienta', `devolvió algo impintable: ${JSON.stringify(a)}`);
    } else if (!avisos.length) {
        mal('rol desconocido no revienta', 'salió pintable pero en silencio: nadie se enterará');
    } else bien('rol desconocido no revienta',
        `color 0x${a.color.toString(16).padStart(6, '0')} y ${avisos.length} aviso(s)`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · `revisarPiel` caza un rol inventado ANTES de aplicarlo
// ═══════════════════════════════════════════════════════════════════════════
{
    const buena = { nombre: 'buena', roles: { [escenas[0]]: { color: 0x123456 } } };
    const mala  = { nombre: 'mala',  roles: { 'sofá-de-la-abuela': { color: 0x123456 } } };
    const qBuena = revisarPiel(buena);
    const qMala  = revisarPiel(mala);
    if (qBuena.length) {
        // El control del control: si suspende hasta a una piel legal, el instrumento
        // está roto y su «✗» a la piel mala no significa nada.
        mal('revisarPiel caza el rol inventado', `suspende una piel legal: ${qBuena.join(', ')}`);
    } else if (!qMala.some((q) => q.includes('sofá-de-la-abuela'))) {
        mal('revisarPiel caza el rol inventado', `dejó pasar «sofá-de-la-abuela»: ${JSON.stringify(qMala)}`);
    } else bien('revisarPiel caza el rol inventado', `piel legal 0 quejas · piel con rol inventado: ${qMala.join(', ')}`);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('');
if (fallos.length) {
    console.log(rojo(`✗ ${fallos.length} comprobación(es) suspendidas\n`));
    process.exit(1);
}
console.log(verde(`✓ el aspecto se deja vestir y las ${lecturas.length} lecturas siguen sin apagarse\n`));
process.exit(0);
