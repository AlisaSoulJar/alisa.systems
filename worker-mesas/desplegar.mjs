/**
 * desplegar.mjs — despliega las mesas Y ESPERA A QUE LLEGUEN
 * ═══════════════════════════════════════════════════════════════════════════
 *     node worker-mesas/desplegar.mjs        (o: npm run desplegar:mesas)
 *
 * POR QUÉ EXISTE
 * `wrangler deploy` dice «Deployed» y devuelve el control unos segundos antes de
 * que el código nuevo conteste en todas partes. Durante esa ventana el worker
 * responde con el código VIEJO, sin avisar y sin error.
 *
 * En una sola tarde saqué cuatro conclusiones falsas de esa ventana: «el
 * guardián no funciona», «faltan campos en la respuesta», «el arreglo no sirvió».
 * Las cuatro veces el arreglo estaba bien y lo que fallaba era mi prisa. Y las
 * cuatro veces el rato se fue en buscar el fallo donde no estaba.
 *
 * Así que la espera deja de ser una costumbre y pasa a ser un paso: se lee el
 * identificador de versión que imprime wrangler y se pregunta al worker quién es
 * hasta que conteste ese mismo. Sin adivinar segundos.
 *
 * Se despliega desde la RAÍZ del sitio, no desde esta carpeta, porque el `.env`
 * con las credenciales vive allí y wrangler lo busca junto al fichero de config.
 */
// `execSync` y no `execFileSync`: en Windows el ejecutable es `npx.cmd` y un
// `.cmd` no se lanza sin intérprete. Pasar por la shell funciona en los dos
// sitios y aquí no hay ninguna entrada de fuera que meter en el comando.
import { execSync } from 'node:child_process';

const URL_MESAS = process.argv.includes('--url')
    ? process.argv[process.argv.indexOf('--url') + 1]
    : 'https://alisa-mesas.prime-6d5.workers.dev';

console.log('\n── desplegando ──');
const salida = execSync('npx wrangler deploy -c worker-mesas/wrangler.toml',
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
console.log(salida.trim().split('\n').slice(-4).join('\n'));

const esperada = salida.match(/Current Version ID:\s*([0-9a-f-]+)/i)?.[1];
if (!esperada) {
    console.log('\n⚠️  wrangler no ha impreso un identificador de versión.');
    console.log('   No se puede esperar a nada concreto, así que no se espera: comprueba a mano.\n');
    process.exit(0);
}

console.log(`\n── esperando a que conteste la versión ${esperada.slice(0, 8)} ──`);
const empezó = Date.now();
for (let intento = 1; intento <= 40; intento++) {
    let sirviendo = null;
    try {
        sirviendo = (await fetch(URL_MESAS, { cache: 'no-store' }).then(r => r.json())).version;
    } catch { /* aún no contesta; se reintenta */ }

    if (sirviendo === esperada) {
        console.log(`\n✓ llegó en ${((Date.now() - empezó) / 1000).toFixed(1)} s — ya se puede medir\n`);
        process.exit(0);
    }
    process.stdout.write(sirviendo ? '.' : '?');
    await new Promise(r => setTimeout(r, 1500));
}

// No se falla en silencio ni se sigue como si nada: medir contra código viejo da
// resultados que parecen buenos y no lo son.
console.log(`\n\n✗ 60 s después el worker sigue contestando con otra versión.`);
console.log(`  No midas todavía: lo que salga no será de este código.\n`);
process.exit(1);
