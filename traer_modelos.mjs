/**
 * traer_modelos.mjs — MODELOS DE poly.pizza, AL PAQUETE Y CON SUS CRÉDITOS
 * ═══════════════════════════════════════════════════════════════════════════
 *     node traer_modelos.mjs             trae lo que pida la lista
 *     node traer_modelos.mjs --ver silla  busca y enseña, sin bajar nada
 *
 * ⚠️ SE BAJAN AL EMPAQUETAR, NO EN EL NAVEGADOR. Y NO ES UN DETALLE DE ESTILO.
 *
 * `preflight.py` suspende si una página carga código desde un CDN, y el paquete
 * se publica autocontenido a propósito: una sala que depende de que otro servidor
 * conteste no es una sala, es una promesa. Así que esto corre en el ordenador,
 * deja los `.glb` dentro de `public/props/polypizza/` y el sitio no habla nunca
 * con poly.pizza.
 *
 * ⚠️ Y EL TRABAJO DE VERDAD NO ES BAJAR: ES LA LICENCIA.
 *
 * poly.pizza reparte modelos CC0 y CC-BY. El CC0 no pide nada; el CC-BY pide
 * atribución, y si se publica sin ella se está incumpliendo una licencia — que es
 * exactamente la clase de cosa por la que este repositorio ya deja fuera del
 * paquete los recursos de Seaeees, que prohíben redistribuirse.
 *
 * Por eso cada fichero que entra deja su ficha en `public/data/creditos_modelos.json`
 * —título, autor, licencia y enlace— y `preflight.py` suspende si aparece un
 * modelo sin ficha. La atribución la redacta la propia API en su campo
 * `Attribution`, así que se guarda tal cual en vez de reescribirla: menos sitios
 * donde equivocarse.
 *
 * ⚠️ CUENTA LO QUE PESA, PORQUE YA PESAMOS.
 *
 * El paquete son 72 MB y 34 de ellos ya son modelos. El tope del sitio está en
 * 350 MB, así que bajar sin mirar es cómodo hoy y caro dentro de un mes. Se
 * declara un presupuesto y se para al llegar.
 *
 * La clave vive en `.env` (que git ignora) como `POLY_PIZZA_KEY`. Se saca en
 * poly.pizza/settings/api. La API es gratis para uso de aficionado y de pago para
 * uso comercial: conviene saberlo antes de atarse.
 */
import { readFile, writeFile, mkdir, stat, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DESTINO = path.join(AQUI, 'public/props/polypizza');
const FICHAS = path.join(AQUI, 'public/data/creditos_modelos.json');
const PEDIDOS = path.join(AQUI, 'public/data/modelos_pedidos.json');

/** Cuántos MB se permite que ocupen los modelos traídos de fuera, en total. */
const PRESUPUESTO_MB = 12;

const clave = await (async () => {
    const env = await readFile(path.join(AQUI, '.env'), 'utf8').catch(() => '');
    const l = env.split('\n').find(x => x.startsWith('POLY_PIZZA_KEY='));
    return l ? l.slice('POLY_PIZZA_KEY='.length).trim() : (process.env.POLY_PIZZA_KEY ?? '');
})();

if (!clave) {
    console.log('\n  No hay `POLY_PIZZA_KEY` en `.env` ni en el entorno.');
    console.log('  Se saca en https://poly.pizza/settings/api y se pone en `.env`,');
    console.log('  que git ignora. Sin ella esto no puede pedir nada.\n');
    process.exit(1);
}

const buscar = async (que, limite = 8) => {
    const u = `https://api.poly.pizza/v1/search/${encodeURIComponent(que)}?limit=${limite}`;
    const r = await fetch(u, { headers: { 'X-Auth-Token': clave } });
    if (!r.ok) throw new Error(`poly.pizza contestó ${r.status} a «${que}»`);
    return (await r.json()).results ?? [];
};

/** Sólo mirar: para elegir sin llenar el disco de pruebas. */
const iVer = process.argv.indexOf('--ver');
if (iVer >= 0) {
    const que = process.argv[iVer + 1];
    if (!que) { console.log('\n  `--ver` necesita algo que buscar.\n'); process.exit(1); }
    const res = await buscar(que, 12);
    console.log(`\n  ${res.length} resultados para «${que}»\n`);
    for (const m of res) {
        console.log(`  ${String(m['Tri Count']).padStart(6)} tris · ${String(m.Licence).padEnd(10)} `
            + `${m.Animated ? 'animado ' : '        '}${m.Title}  ${m.Creator?.Username ?? ''}`);
    }
    console.log('');
    process.exit(0);
}

const pedidos = JSON.parse(await readFile(PEDIDOS, 'utf8').catch(() => '[]'));
if (!pedidos.length) {
    console.log(`\n  La lista está vacía: ${path.relative(AQUI, PEDIDOS)}`);
    console.log('  Cada entrada es `{ clave, busca, licencias?, variantes? }`.');
    console.log('  Para elegir sin bajar nada: `node traer_modelos.mjs --ver silla`\n');
    process.exit(0);
}

await mkdir(DESTINO, { recursive: true });
const fichas = JSON.parse(await readFile(FICHAS, 'utf8').catch(() => '{}'));

/** Lo que ya ocupa lo traído, para no pasarse del presupuesto. */
let bytes = 0;
for (const f of await readdir(DESTINO).catch(() => [])) {
    if (f.endsWith('.glb')) bytes += (await stat(path.join(DESTINO, f))).size;
}

let traidos = 0, saltados = 0;
for (const p of pedidos) {
    const licencias = p.licencias ?? ['CC0'];
    const variantes = Math.max(1, p.variantes ?? 1);
    let res;
    try { res = await buscar(p.busca, Math.max(12, variantes * 4)); }
    catch (e) { console.log(`  ✗ ${p.clave.padEnd(16)} ${e.message}`); continue; }

    // ⚠️ Se filtra por licencia ANTES de bajar. Bajar y decidir después deja el
    // fichero en disco, y un fichero en disco acaba en el paquete.
    const valen = res.filter(m => licencias.some(l => String(m.Licence).toUpperCase().startsWith(l)));
    if (!valen.length) {
        console.log(`  ✗ ${p.clave.padEnd(16)} ninguno con licencia ${licencias.join('/')} `
            + `entre ${res.length} resultados de «${p.busca}»`);
        continue;
    }

    for (let n = 0; n < Math.min(variantes, valen.length); n++) {
        const m = valen[n];
        const nombre = `${p.clave}_${n + 1}.glb`;
        const ruta = path.join(DESTINO, nombre);
        if (await stat(ruta).then(() => true).catch(() => false)) { saltados++; continue; }
        if (bytes / 1048576 >= PRESUPUESTO_MB) {
            console.log(`  · presupuesto agotado (${PRESUPUESTO_MB} MB). Lo demás no se baja.`);
            break;
        }
        const r = await fetch(m.Download);
        if (!r.ok) { console.log(`  ✗ ${nombre}: descarga ${r.status}`); continue; }
        const buf = Buffer.from(await r.arrayBuffer());
        await writeFile(ruta, buf);
        bytes += buf.length;
        traidos++;
        fichas[nombre] = {
            titulo: m.Title,
            autor: m.Creator?.Username ?? null,
            licencia: m.Licence,
            atribucion: m.Attribution,        // la redacta la API; se guarda tal cual
            origen: `https://poly.pizza/m/${m.ID}`,
            triangulos: m['Tri Count'] ?? null,
            animado: !!m.Animated,
            bytes: buf.length,
        };
        console.log(`  ✓ ${nombre.padEnd(24)} ${String(m['Tri Count']).padStart(6)} tris · `
            + `${String(m.Licence).padEnd(10)} ${m.Title} — ${m.Creator?.Username ?? '?'}`);
    }
}

await writeFile(FICHAS, JSON.stringify(fichas, null, 4) + '\n');
console.log(`\n  ${traidos} traídos · ${saltados} ya estaban · `
    + `${(bytes / 1048576).toFixed(1)} MB de ${PRESUPUESTO_MB} del presupuesto`);
console.log(`  fichas en ${path.relative(AQUI, FICHAS)}\n`);
