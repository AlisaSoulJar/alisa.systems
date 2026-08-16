/**
 * comprobar_desplegado.mjs — que lo desplegado sirva lo que dice servir
 * ═══════════════════════════════════════════════════════════════════════════
 *     node comprobar_desplegado.mjs https://mi-despliegue.pages.dev
 *
 * POR QUÉ EXISTE
 * El sitio estuvo meses con la portada rota **sin que se notara desde fuera**.
 * La raíz del despliegue estaba mal puesta y, al no haber página 404, cualquier
 * ruta inexistente devolvía la portada con un **200 triunfal**. Así que
 * `/src/main.js` —un módulo que la portada importaba— contestaba HTML. El
 * navegador recibía una página donde esperaba JavaScript, fallaba en la consola,
 * y la web «cargaba».
 *
 * Ninguna prueba del repositorio podía verlo: todas corren en local, donde
 * `servir.py` siempre sirvió la carpeta correcta. **Lo desplegado y el árbol de
 * trabajo pueden llevar meses siendo cosas distintas.**
 *
 * QUÉ COMPRUEBA, CONTRA EL DESPLIEGUE DE VERDAD
 *   1. el canario: una ruta inventada tiene que dar 404, no la portada
 *   2. cada `import`, `src`, `href` y `fetch` de las páginas principales existe
 *   3. y —lo importante— **que un `.js` no venga con cuerpo de HTML**, que es la
 *      forma exacta que tomó el fallo
 *   4. el verificador de servidor: acepta una partida legítima y caza la inflada
 *
 * Es lo único de la suite que mira HACIA FUERA. Todo lo demás demuestra que el
 * código es correcto; esto demuestra que lo correcto es lo que está servido.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const BASE = (process.argv[2] ?? 'https://alisa.systems').replace(/\/$/, '');
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo  = (s) => `\x1b[31m${s}\x1b[0m`;
const gris  = (s) => `\x1b[90m${s}\x1b[0m`;

let fallos = 0;
const ok = (b, txt) => { if (!b) fallos++; return `${b ? verde('✓') : rojo('✗')} ${txt}`; };

/** ¿El cuerpo empieza como un documento HTML? */
const pareceHtml = (t) => /^\s*(<!doctype html|<html)/i.test(t);

async function pedir(ruta) {
    const r = await fetch(BASE + ruta, { redirect: 'follow' });
    const cuerpo = await r.text();
    return { estado: r.status, tipo: r.headers.get('content-type') ?? '', cuerpo };
}

console.log(`\n  comprobando ${BASE}\n`);

/**
 * ⚠️ «NO LLEGO AL SITIO» Y «EL SITIO SIRVE ALGO MAL» NO SON LO MISMO.
 *
 * El 16-08-2026 esto escupió una traza de `undici` de veinte líneas acabada en
 * `UND_ERR_CONNECT_TIMEOUT` justo después de un despliegue, y me hizo dudar de un
 * despliegue que estaba perfecto. La causa no era el sitio: el ISP de esta casa no
 * tiene ruta a `188.114.96.0/24`, uno de los pools de Cloudflare, y el resolutor del
 * router devuelve precisamente ése. Pidiéndoselo a `1.1.1.1` salen `172.67.x`/`104.21.x`
 * y el dominio contesta 200 en 0,2 s.
 *
 * O sea que el instrumento que existe para mirar HACIA FUERA se calla justo cuando lo
 * de fuera no se puede mirar, y lo hace con la cara de un fallo del despliegue. Un
 * fallo de red y un fallo de despliegue piden cosas distintas —uno se arregla en el
 * router, el otro volviendo a desplegar— así que se separan y se dice cuál es.
 */
try {
    await fetch(BASE + '/', { signal: AbortSignal.timeout(15000) });
} catch (e) {
    const host = new URL(BASE).host;
    console.log(rojo(`  ✗ no se llega a ${host} desde esta máquina.`));
    console.log(gris(`    (${e.cause?.code ?? e.name ?? e.message})`));
    console.log(`\n  Esto NO dice nada del despliegue: dice que desde aquí no hay ruta.`);
    console.log(`  Para separarlo:`);
    console.log(gris(`    · qué IPs da tu resolutor      nslookup ${host}`));
    console.log(gris(`    · qué IPs da Cloudflare        nslookup ${host} 1.1.1.1`));
    console.log(gris(`    · si son distintas y sólo unas responden, es la RUTA del ISP`));
    console.log(`\n  Y para comprobar el despliegue mientras tanto, por la URL de producción:`);
    console.log(gris(`    node comprobar_desplegado.mjs https://alisa-systems.pages.dev\n`));
    process.exit(2);
}

// ── 1. el canario ────────────────────────────────────────────────
for (const ruta of ['/noexiste.html', '/tampoco/existe/', '/js/inventado.js']) {
    const { estado, cuerpo } = await pedir(ruta);
    console.log('  ' + ok(estado === 404,
        `${ruta.padEnd(22)} ${estado}` +
        (estado === 200 && pareceHtml(cuerpo)
            ? rojo('  ← devuelve una página: el sitio dice que sí a todo')
            : gris('  (una ruta inventada debe dar 404)'))));
}

// ── 2 y 3. las páginas y todo lo que cargan ──────────────────────
//
// ⚠️ LAS ESTACIONES SE DESCUBREN, NO SE ESCRIBEN.
// La primera versión miraba sólo la portada y la sala, y las dos salían
// perfectas mientras **no se podía jugar a nada**: los juegos entran en la sala
// dentro de un iframe, así que sus fallos ocurren un nivel más abajo y desde
// fuera la sala parece intacta. La lista sale de la propia sala; una lista
// escrita a mano aquí se quedaría corta al añadir la máquina veintiocho.
const PAGINAS = ['/', '/rooms/room_sala_del_huevo.html'];
{
    const { cuerpo } = await pedir('/rooms/room_sala_del_huevo.html');
    for (const m of cuerpo.matchAll(/u:\s*'([^']+)'/g)) {
        PAGINAS.push(new URL(m[1], BASE + '/rooms/').pathname);
    }
    console.log(gris(`  ${PAGINAS.length - 2} estaciones descubiertas en la sala`));
}
for (const pagina of PAGINAS) {
    const { estado, cuerpo } = await pedir(pagina);
    console.log(`\n  ${ok(estado === 200, `${pagina}  ${estado}  ${cuerpo.length.toLocaleString()} B`)}`);
    if (estado !== 200) continue;

    // Todo lo que la página va a pedir: etiquetas, imports dinámicos y fetch.
    const rutas = new Set();
    for (const re of [/(?:src|href)\s*=\s*"([^"#?]+)"/g,
                      /import\s*\(\s*['"]([^'"]+)/g,
                      /fetch\s*\(\s*['"]([^'"]+)/g]) {
        for (const m of cuerpo.matchAll(re)) rutas.add(m[1]);
    }

    for (const cruda of rutas) {
        if (/^(https?:|data:|mailto:|about:|#|javascript:)/i.test(cruda)) {
            // Sólo se avisa de lo que apunta fuera y no va a existir en producción.
            if (/^https?:\/\/(127\.0\.0\.1|localhost)/i.test(cruda)) {
                console.log('    ' + rojo('!') + ` ${cruda}` +
                    rojo('  ← llama a una máquina local; en producción no responde'));
            }
            continue;
        }
        const abs = new URL(cruda, BASE + pagina).pathname;

        /**
         * ⚠️ `/cdn-cgi/` NO ES NUESTRO. LO INYECTA CLOUDFLARE Y AQUÍ DABA UN 404 FALSO.
         *
         * La zona tiene activada la ofuscación de correos: cuando encuentra una
         * dirección en el HTML —`research.html` lleva una de contacto en el pie— la
         * sustituye por un enlace a `/cdn-cgi/l/email-protection` y añade su propio
         * script para descifrarla en el navegador.
         *
         * Esa ruta no existe como fichero, así que esta comprobación la seguía, veía
         * un 404 y suspendía el despliegue. En un navegador de verdad funciona: el
         * script `/cdn-cgi/scripts/…/email-decode.min.js` la resuelve en cliente
         * —comprobado, viene servido en la misma página—.
         *
         * Se salta y se dice por qué. Un instrumento que suspende por algo que no se
         * puede ni se debe arreglar enseña a ignorar los suspensos, y entonces el día
         * que suspenda de verdad nadie mirará. Esa es la diferencia entre «hay que
         * arreglarlo» y «hay que saberlo».
         */
        if (abs.startsWith('/cdn-cgi/')) {
            console.log('    ' + gris(`· ${abs}  (lo pone Cloudflare, no el repositorio)`));
            continue;
        }
        const { estado, tipo, cuerpo: c } = await pedir(abs);
        // EL FALLO QUE BUSCAMOS: pedir un módulo y recibir una página.
        const esperaJs = abs.endsWith('.js') || abs.endsWith('.mjs');
        const esperaJson = abs.endsWith('.json');
        const disfrazado = (esperaJs || esperaJson) && pareceHtml(c);

        const bien = estado === 200 && !disfrazado;
        if (!bien) fallos++;
        console.log(`    ${bien ? verde('✓') : rojo('✗')} ${abs.padEnd(46)} ${estado}`
            + gris(` ${tipo.split(';')[0]}`)
            + (disfrazado ? rojo('  ← HTML donde debería ir código') : ''));
    }
}

// ── 4. el verificador de servidor ────────────────────────────────
console.log('\n  verificador de servidor');
const partida = { juego: 'guerra', semilla: 11, jugadas: ['voltear', 'voltear', 'voltear'] };
try {
    const pide = async (puntos) => {
        const r = await fetch(BASE + '/api/verificar', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ...partida, puntos }),
        });
        return r.status === 200 ? r.json() : { valida: null, estado: r.status };
    };
    const legitima = await pide(2);
    const inflada = await pide(999999);
    console.log('    ' + ok(legitima.valida === true,
        `partida legítima aceptada  ${gris(JSON.stringify(legitima).slice(0, 70))}`));
    console.log('    ' + ok(inflada.valida === false,
        `puntuación inflada cazada  ${gris(inflada.motivo ?? JSON.stringify(inflada))}`));
} catch (e) {
    fallos++;
    console.log('    ' + rojo(`✗ no responde: ${e.message}`));
}

console.log(`\n  ${fallos === 0
    ? verde('lo desplegado sirve lo que dice servir')
    : rojo(`${fallos} problema(s) en el despliegue`)}\n`);
process.exit(fallos ? 1 : 0);
