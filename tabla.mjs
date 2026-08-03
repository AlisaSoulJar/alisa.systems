/**
 * tabla.mjs — la clasificación: modelos y líneas base en las mismas filas
 * ═══════════════════════════════════════════════════════════════════════════
 *   node tabla.mjs --modelos llama3.2:3b,gemma2:2b --juegos gofish,blackjack
 *   node tabla.mjs --modelos gemma2:2b --semillas 3 --md resultados/tabla.md
 *
 * EL PROBLEMA QUE RESUELVE LA NORMALIZACIÓN
 * Las puntuaciones no son comparables entre juegos: el xiangqi va en miles y el
 * Go Fish en unidades. Sumarlas da un número dominado por el juego de escala más
 * grande, que es exactamente lo que hacen las tablas que promedian «puntos» sin
 * mirar. Aquí cada juego se lleva a una escala común:
 *
 *     0.00  = tan bueno como elegir siempre la primera opción
 *     1.00  = tan bueno como el rival de casa del juego
 *
 *          normalizado = (puntos − primera) / (casa − primera)
 *
 * Es interpretable sin leer la letra pequeña —«0,6 quiere decir que se ha comido
 * el 60% del hueco entre no pensar y la heurística de la casa»— y **los dos
 * extremos se miden en la misma tanda**, no se copian de una ejecución vieja.
 * Puede salir negativo (peor que no pensar) o mayor que 1 (mejor que la casa), y
 * las dos cosas son informativas.
 *
 * ⚠️ SU LÍMITE, DICHO AQUÍ Y NO EN UNA NOTA AL PIE
 * Si `casa` y `primera` sacan casi lo mismo en un juego, el denominador es
 * diminuto y el normalizado se dispara por ruido. Esos juegos se marcan y **no
 * entran en la media**: son justo los que `calibrar.mjs` da como «sin señal».
 * Un banco de pruebas que promedie sobre entornos que no distinguen está
 * inventando precisión.
 *
 * Y TODA FILA LLEVA RECIBO. Cada episodio se re-simula contra el mismo fichero
 * de reglas antes de contarse. Lo que no verifica, no puntúa.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const fetchReal = globalThis.fetch;
globalThis.fetch = async (entrada, init) => {
    const url = entrada instanceof URL ? entrada : new URL(String(entrada));
    if (url.protocol !== 'file:') return fetchReal(entrada, init);
    return new Response(await readFile(fileURLToPath(url), 'utf-8'), { status: 200 });
};
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);

const { CATALOGO } = await impo('public/js/alisa-engine/src/gym/registro.js');
const { verificar } = await impo('public/arcade/js/protohub/Verificador.js');
const { cargarReglas, TITULOS } = await impo('public/arcade/js/protohub/rules/index.js');
const { jugarEpisodio } = await impo('agentes/llm.mjs');
const { ollama } = await impo('agentes/proveedores.mjs');
const { POLITICAS } = await impo('agentes/politicas.mjs');

const args = {};
for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--')) args[a.slice(2)] = (process.argv[i + 1]?.startsWith('--') ?? true) ? true : process.argv[++i];
}
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo  = (s) => `\x1b[31m${s}\x1b[0m`;
const gris  = (s) => `\x1b[90m${s}\x1b[0m`;

const SEMILLAS = Number(args.semillas ?? 2);
/**
 * ⚠️ LAS LÍNEAS BASE SE MIDEN CON MUCHAS MÁS SEMILLAS, Y ES LA CORRECCIÓN MÁS
 * ÚTIL DE TODA ESTA HERRAMIENTA.
 *
 * En la primera tanda, la tabla expulsó al spades con el motivo «la casa no
 * supera al suelo». Comprobado aparte con 400 semillas: la casa saca 3,00 y el
 * suelo 2,17. La casa SÍ estaba arriba — el hueco es de 0,8 puntos y yo lo
 * estaba midiendo con TRES partidas. El juego no tenía nada malo; el instrumento
 * sí. Un guardia que descarta entornos sanos es peor que no tener guardia,
 * porque su veredicto suena a diagnóstico.
 *
 * Lo que lo arregla es gratis: el suelo y el techo son políticas de código, no
 * cuestan ni un token. Quien limita las semillas es el modelo, no la regla.
 * Así que la REGLA se mide con muchas y los modelos con las que se pueda pagar.
 */
const SEMILLAS_BASE = Number(args['semillas-base'] ?? 60);
const TOPE = Number(args.tope ?? 25);
const pedidos = args.juegos ? String(args.juegos).split(',').map(s => s.trim()) : null;
const modelos = args.modelos ? String(args.modelos).split(',').map(s => s.trim()) : [];

const entornos = CATALOGO.filter(e => e.familia !== 'propio')
    .filter(e => !pedidos || pedidos.includes(e.juego));
if (!entornos.length) { console.log(rojo('  ningún entorno coincide')); process.exit(2); }

/** Los participantes: primero las líneas base, luego los modelos. */
const participantes = [
    { nombre: 'primera (suelo)', tipo: 'base', politica: POLITICAS.primera() },
    { nombre: 'azar',            tipo: 'base', politica: POLITICAS.azar() },
    { nombre: 'casa (techo blando)', tipo: 'base', politica: POLITICAS.casa() },
    ...modelos.map(m => ({ nombre: m, tipo: 'modelo', proveedor: ollama({ modelo: m }) })),
];

console.log(`\n  ${entornos.length} juegos · ${SEMILLAS} semillas · tope ${TOPE}`
          + ` · ${participantes.length} participantes\n`);

/** Corre un participante sobre un juego. Verifica cada recibo. */
async function correr(part, e, Clase, reglas) {
    // Una política de código no cuesta nada: se le dan todas las semillas que
    // hagan falta para que el metro sea de fiar. Un modelo, las que se paguen.
    const N = part.tipo === 'base' ? SEMILLAS_BASE : SEMILLAS;
    let puntos = 0, forzadas = 0, llamadas = 0, tokens = 0, ms = 0, ok = 0, fin = 0;
    const serie = [];      // la puntuación de cada semilla, para medir el ruido
    for (let s = 1; s <= N; s++) {
        const r = await jugarEpisodio(Clase, part.proveedor ?? (async () => ({ texto: '1' })), {
            semilla: s, tope: TOPE, politica: part.politica,
        });
        if (r.error) throw new Error(r.error);
        serie.push(r.puntos);
        puntos += r.puntos; forzadas += r.forzadas; llamadas += r.llamadas;
        tokens += r.tokens.entrada + r.tokens.salida; ms += r.ms;
        // ⚠️ Que el episodio TERMINE importa tanto como la puntuación. Con un
        // tope corto, una brisca de 40 jugadas se corta a la mitad y el número
        // que sale es el de media partida — comparable entre participantes, sí,
        // pero no es «lo que saca en la brisca». Se cuenta y se avisa.
        if (r.metricas?.terminada) fin++;
        if (r.recibo && reglas && verificar(reglas, r.recibo).valida) ok++;
    }
    return {
        puntos: puntos / N, serie, forzadas, llamadas, tokens, ms,
        verificadas: ok, terminadas: fin, semillas: N,
        // La media sobre las MISMAS semillas que juegan los modelos. Es la que
        // se usa para normalizar: comparar un modelo de 3 partidas contra un
        // suelo de 60 sería comparar dos cosas distintas. El promedio largo
        // sirve para decidir SI el juego puntúa; el corto, para el cuánto.
        puntosCortos: serie.slice(0, SEMILLAS).reduce((a, b) => a + b, 0) / Math.min(N, SEMILLAS),
    };
}

/** Desviación típica de una serie de partidas. */
function desviacion(xs) {
    if (!xs || xs.length < 2) return 0;
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Error típico de una media: lo que se mueve el PROMEDIO, no una partida. */
const errorTipico = (xs) => (xs?.length ? desviacion(xs) / Math.sqrt(xs.length) : 0);

/**
 * ⚠️ SEGUNDA VERSIÓN DEL GUARDIA, Y LA PRIMERA ERA DEMASIADO DURA.
 *
 * Comparaba el hueco contra la desviación de UNA partida. Con eso, la brisca
 * —hueco 7, desviación 17— quedaba fuera. Pero el hueco separa dos PROMEDIOS de
 * 80 partidas, y un promedio de 80 se mueve nueve veces menos que una partida:
 * su error típico es 17/√80 ≈ 1,9, así que 7 puntos son casi cuatro errores
 * típicos. La brisca distingue de sobra, y yo la estaba echando.
 *
 * Es el mismo error de bulto que la versión anterior, con el signo cambiado:
 * antes llamaba señal al ruido, ahora llamaba ruido a la señal. Lo que hay que
 * comparar es siempre lo mismo — la diferencia contra lo que se mueve esa
 * diferencia —, y con cuántas partidas se ha medido cada cosa.
 */
function separaDeVerdad(fila) {
    const suelo = fila['primera (suelo)']?.serie ?? [];
    const techo = fila['casa (techo blando)']?.serie ?? [];
    const hueco = (fila['casa (techo blando)']?.puntos ?? 0) - (fila['primera (suelo)']?.puntos ?? 0);
    const se = Math.hypot(errorTipico(suelo), errorTipico(techo));
    // ⚠️ SIN `&& se > 0`, Y ESTA ES LA SEGUNDA VEZ QUE LO ESCRIBO MAL.
    // Puse ese guardia esta misma mañana en `calibrar.mjs`, lo quité allí porque
    // invertía el sentido, y lo volví a escribir aquí de memoria. Reversi sale de
    // posición fija: las 80 partidas son idénticas, el error típico es 0 y el
    // hueco de 9 puntos es exacto — la mejor señal que puede haber. Con el
    // guardia puesto, se descartaba por «no supera al ruido» siendo ruido cero.
    //
    // Que el mismo error aparezca dos veces el mismo día en dos ficheros dice
    // algo que no es sobre el error: una condición sutil copiada de memoria se
    // copia mal. Si se repite una tercera vez, esto se va a un módulo común.
    return { hueco, se, ok: hueco > 2 * se };
}

// ── la tanda ─────────────────────────────────────────────────────
const datos = new Map();          // juego → { participante → resultado }
const descartes = new Map();      // juego → motivo por el que no puntúa, o null
for (const e of entornos) {
    const Clase = await e.cargar();
    const reglas = await cargarReglas(e.juego);
    const fila = {};
    for (const part of participantes) {
        try { fila[part.nombre] = await correr(part, e, Clase, reglas); }
        catch (err) { fila[part.nombre] = { error: err.message }; }
    }
    datos.set(e.juego, fila);

    const c = fila['casa (techo blando)'], p = fila['primera (suelo)'];
    const cortadas = participantes.some(x => {
        const r = fila[x.nombre];
        return r && (r.terminadas ?? 0) < (r.semillas ?? SEMILLAS);
    });
    // El veredicto de SI el juego puntúa se toma con los promedios largos.
    const { hueco, se, ok } = separaDeVerdad(fila);

    descartes.set(e.juego,
        !(hueco > 0) ? 'la casa no supera al suelo: la escala se invertiría'
        : cortadas ? `el tope de ${TOPE} decisiones corta la partida`
        : !ok ? `el hueco (${hueco.toFixed(1)}) no supera al ruido de la medida (±${(2 * se).toFixed(1)})`
        : null);

    console.log(gris(`  ${e.juego.padEnd(12)} suelo ${Number(p?.puntos).toFixed(1).padStart(8)}`
        + ` · casa ${Number(c?.puntos).toFixed(1).padStart(8)}`
        + ` · hueco ${hueco.toFixed(1).padStart(7)} ± ${(2 * se).toFixed(1)}`)
        + (descartes.get(e.juego) ? rojo(`   ← fuera: ${descartes.get(e.juego)}`) : ''));
}

// ── normalización ────────────────────────────────────────────────
// ⚠️ SÓLO ENTRAN LOS JUEGOS CON HUECO POSITIVO.
// Si la casa saca MENOS que el suelo, el denominador es negativo y la escala se
// da la vuelta: un participante mediocre sale con 2,86 y uno bueno con −1. Le
// pasó a la brisca en la primera tanda. Un hueco negativo no es un juego difícil,
// es un juego donde la referencia de arriba no está arriba — y hasta que eso se
// arregle, ese juego no puede ordenar a nadie.
const normalizados = new Map();
const incertidumbres = new Map();
const juegosUtiles = [];
for (const [juego, fila] of datos) {
    if (descartes.get(juego)) continue;
    // El CUÁNTO se normaliza sobre las mismas semillas que jugaron los modelos.
    const suelo = fila['primera (suelo)']?.puntosCortos;
    const techo = fila['casa (techo blando)']?.puntosCortos;
    const hueco = techo - suelo;
    if (!Number.isFinite(hueco) || hueco <= 0) continue;
    juegosUtiles.push(juego);
    const n = {};
    const inc = {};
    for (const part of participantes) {
        const r = fila[part.nombre];
        n[part.nombre] = r?.error ? null : (r.puntosCortos - suelo) / hueco;
        // ⚠️ LA INCERTIDUMBRE VIAJA CON EL NÚMERO.
        // Un modelo se mide con 3 partidas porque cuesta dinero, y 3 partidas de
        // un juego de cartas dicen poco. Publicar «0,71» a secas es fingir una
        // precisión que no se tiene. Se publica el ± y que cada cual juzgue.
        inc[part.nombre] = r?.error ? null
            : 2 * errorTipico((r.serie ?? []).slice(0, SEMILLAS)) / Math.abs(hueco);
    }
    incertidumbres.set(juego, inc);
    normalizados.set(juego, n);
}

// ── la tabla ─────────────────────────────────────────────────────
console.log(`\n  ${verde('CLASIFICACIÓN')}  ${gris(`0 = elegir la primera · 1 = rival de casa · ${juegosUtiles.length}/${entornos.length} juegos con hueco`)}\n`);
console.log(gris('  participante            media      ±   peor   mejor   forzadas    tokens      s   recibos'));

const resumen = [];
for (const part of participantes) {
    const vals = juegosUtiles.map(j => normalizados.get(j)[part.nombre]).filter(v => v !== null);
    if (!vals.length) { console.log(`  ${rojo('✗')} ${part.nombre.padEnd(22)} sin datos`); continue; }
    const media = vals.reduce((a, b) => a + b, 0) / vals.length;
    // Las incertidumbres de juegos independientes se suman en cuadratura.
    const incs = juegosUtiles.map(j => incertidumbres.get(j)[part.nombre]).filter(v => v !== null);
    const inc = Math.hypot(...incs) / Math.max(1, incs.length);
    const tot = (k) => juegosUtiles.reduce((a, j) => a + (datos.get(j)[part.nombre]?.[k] ?? 0), 0);
    // Cada participante juega las semillas que le tocan: las bases muchas más.
    const verif = tot('verificadas'), esperadas = tot('semillas');
    resumen.push({ participante: part.nombre, tipo: part.tipo, media, incertidumbre: inc,
                   tokens: tot('tokens'), segundos: tot('ms') / 1000,
                   forzadas: tot('forzadas'), llamadas: tot('llamadas'),
                   verificadas: verif, esperadas,
                   porJuego: Object.fromEntries(juegosUtiles.map(j => [j, normalizados.get(j)[part.nombre]])) });

    console.log(`  ${verif === esperadas ? verde('✓') : rojo('✗')} ${part.nombre.padEnd(22)}`
        + `${media.toFixed(2).padStart(7)}${('±' + inc.toFixed(2)).padStart(7)}`
        + `${Math.min(...vals).toFixed(2).padStart(7)}${Math.max(...vals).toFixed(2).padStart(8)}`
        + `${String(tot('forzadas')).padStart(11)}${(tot('tokens') / 1000).toFixed(1).padStart(10)}k`
        + `${(tot('ms') / 1000).toFixed(0).padStart(7)}   ${verif}/${esperadas}`);
}

// ── por juego ────────────────────────────────────────────────────
console.log(`\n${gris('  detalle por juego (normalizado)')}\n`);
const anchos = participantes.map(p => Math.max(7, p.nombre.length + 1));
console.log('  ' + 'juego'.padEnd(12) + participantes.map((p, i) => p.nombre.padStart(anchos[i])).join(''));
for (const juego of juegosUtiles) {
    const n = normalizados.get(juego);
    console.log('  ' + (TITULOS[juego] ?? juego).padEnd(12)
        + participantes.map((p, i) => (n[p.nombre] === null ? '—' : n[p.nombre].toFixed(2)).padStart(anchos[i])).join(''));
}

// ── salida a fichero ─────────────────────────────────────────────
const dir = path.join(AQUI, 'resultados');
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, 'tabla.json'), JSON.stringify(
    { fecha: new Date().toISOString(), semillas: SEMILLAS, tope: TOPE,
      juegos: juegosUtiles,
      descartados: Object.fromEntries([...descartes].filter(([, m]) => m)),
      resumen }, null, 2));

if (args.md) {
    const md = [
        '# Clasificación', '',
        `Generada por \`tabla.mjs\` el ${new Date().toISOString().slice(0, 10)}.`,
        `${SEMILLAS} semillas por juego, tope ${TOPE} decisiones.`, '',
        '**0,00** = tan bueno como elegir siempre la primera opción legal.',
        '**1,00** = tan bueno como el rival de casa del juego.',
        'Las dos referencias se miden en la misma tanda que los modelos.', '',
        `Los modelos juegan ${SEMILLAS} semillas por juego; las líneas base, ${SEMILLAS_BASE}.`,
        'Las base no cuestan tokens, así que el metro se mide con muchas más partidas',
        'que lo que se mide con él. El ± es la incertidumbre real de cada fila.', '',
        '| participante | media | ± | forzadas | tokens | recibos verificados |',
        '|---|---|---|---|---|---|',
        ...resumen.map(r => `| ${r.participante} | ${r.media.toFixed(2)} | ±${r.incertidumbre.toFixed(2)} | ${r.forzadas}/${r.llamadas} `
            + `| ${(r.tokens / 1000).toFixed(1)}k | ${r.verificadas}/${r.esperadas} |`),
        '', `Juegos que puntúan: ${juegosUtiles.join(', ')}.`, '',
        ...([...descartes].filter(([, m]) => m).length
            ? ['Fuera de la media, y por qué:', '',
               ...[...descartes].filter(([, m]) => m).map(([j, m]) => `- **${j}** — ${m}`), '']
            : []),
        '', 'Cada partida se re-simula contra el mismo fichero de reglas antes de contarse.',
        'Lo que no verifica, no puntúa.', '',
    ].join('\n');
    await writeFile(path.join(AQUI, String(args.md)), md);
    console.log(gris(`\n  markdown en ${args.md}`));
}
console.log(gris(`  json en resultados/tabla.json`) + '\n');
