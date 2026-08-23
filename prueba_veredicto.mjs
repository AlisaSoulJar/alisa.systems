/**
 * EL BUZÓN NO PUEDE DECIR «ARREGLADO» SIN HABERLO MIRADO
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_veredicto.mjs
 *
 * `veredicto.mjs` clasifica cada queja de betatester y dice dónde buscar. Se
 * prueba con los comentarios REALES del buzón —copiados tal cual, con sus faltas
 * y su prisa— porque una clasificación probada con frases inventadas por mí
 * clasificaría bien las frases que yo escribo.
 *
 * ⚠️ Y LO QUE MÁS IMPORTA VIGILAR ES QUE NO SE PASE DE LISTO.
 *
 * Si un día alguien hace que «gráficamente muy pobre» devuelva un veredicto
 * automático, el buzón empezará a marcar como resuelto lo que nadie ha mirado — y
 * eso es peor que no tener veredicto, porque parece trabajo hecho. Por eso hay una
 * comprobación dedicada a que las familias de aspecto SIGAN diciendo «hay que
 * mirarlo».
 */
import { familia, veredicto, AUTOMATICAS, NECESITAN_OJOS, repartoDeTurnos } from './veredicto.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const { cargarReglas } = await import(pathToFileURL(path.join(AQUI, 'public/arcade/js/protohub/rules/index.js')).href);

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

/** Del buzón, 12–23 de agosto de 2026. Tal cual los escribieron. */
const REALES = [
    ['casa', 'solo juego yo? la casa no juega?'],
    ['casa', 'Parece que solo juego yo la casa no saca piezas'],
    ['casa', 'parece que juego yo solo, las pujas no tienen limite'],
    ['casa', 'va solo no? o se juega asi? ni idea tengo de como se juega en realidad XD'],
    ['movimiento', 'las piedras se mueven antes de tocarlas cada frame tiene una posicion diferente'],
    ['movimiento', 'hay un error en el mazo y en el zoom. Esta buggueado. Se mueve todo el rato'],
    ['movimiento', 'Hay un bucle en el marzo que no para de moverse.'],
    ['pulsar', 'le doy a voltear y no pasa nada'],
    ['pulsar', 'No me deja coger la carta del descarte'],
    ['pulsar', 'no se puede robar del mazo. Hay que hacerlo desde los comandos del menu. Asi no funciona'],
    ['instrucciones', 'no deberia mostrar las reglas/instrucciones del juego?'],
    ['instrucciones', 'ni idea de como se juega y no hay normas ni nada no?'],
    ['aspecto', 'la mesa/tapete no cumple el standar oro no?'],
    ['aspecto', 'la luz quema el tablero un poco, y podemos hacerlo mucho mejor'],
    ['aspecto', 'graficamente muy pobre, dificil de entender para humanos, el dado no se mueve'],
    ['aspecto', 'no se ve el tablero de parchis, graficamente muy pobre, no hay fichas ni dados animados'],
    ['reglas', 'Remigio no iría con la baraja española y dos barajas'],
    ['reglas', 'la reina daama solo mueve de uno en uno?'],
];

console.log('\nEl buzón no puede decir «arreglado» sin haberlo mirado\n');
const fallos = [];

// ── 1. Cada queja real cae en su familia ──
{
    const mal = REALES.filter(([esperada, texto]) => familia(texto) !== esperada)
        .map(([esperada, texto]) => `«${texto.slice(0, 42)}…» → ${familia(texto) ?? 'ninguna'}, esperaba ${esperada}`);
    if (mal.length) mal.forEach((m) => fallos.push(m));
    else console.log(`  ${verde('✓')} las ${REALES.length} quejas reales caen en su familia`
        + gris(`  (${[...new Set(REALES.map(r => r[0]))].join(' · ')})`));
}

/**
 * ── 2. ⚠️ «EL DADO NO SE MUEVE» NO ES «SE MUEVE TODO EL RATO» ──
 *
 * Son la queja contraria y comparten las tres palabras. La primera versión del
 * clasificador metía la de la oca en `movimiento` —la familia del temblor— y
 * habría mandado a alguien a buscar un bucle de animación donde lo que falta es
 * la animación entera. Una clasificación que confunde una cosa con su contraria
 * es peor que no clasificar.
 */
{
    const f = familia('graficamente muy pobre, dificil de entender, el dado no se mueve');
    if (f === 'movimiento') fallos.push('«el dado NO se mueve» se clasificó como temblor: es la queja contraria');
    else console.log(`  ${verde('✓')} «el dado no se mueve» no se confunde con «se mueve todo el rato»`
        + gris(`  (${f})`));
}

/**
 * ── 3. ⚠️ LA QUE PROTEGE DE VERDAD: LO DE ASPECTO NECESITA OJOS ──
 *
 * El día que «gráficamente muy pobre» devuelva un veredicto automático, el buzón
 * empezará a dar por resuelto lo que nadie ha mirado. Y eso no da error: da una
 * lista más corta.
 */
{
    /**
     * ⚠️ SE VIGILA LA DECLARACIÓN, NO SÓLO EL RESULTADO. Y AL PRINCIPIO NO.
     *
     * La primera versión sólo miraba que el veredicto saliera «mirar», y el
     * sabotaje —quitar `aspecto` de la lista— NO la hacía suspender: hay un camino
     * por defecto al final de `veredicto()` que devuelve «mirar» igualmente. O sea
     * que la comprobación pasaba por el motivo equivocado y habría seguido en
     * verde el día que alguien le pusiera una comprobación automática de verdad.
     *
     * Lo dijo el arnés de sabotajes, que es exactamente para esto.
     */
    const DEBEN_PEDIR_OJOS = ['aspecto', 'reglas', 'movimiento'];
    const faltan = DEBEN_PEDIR_OJOS.filter((f) => !NECESITAN_OJOS.has(f));
    if (faltan.length) {
        fallos.push(`estas familias ya no están declaradas como «necesita ojos»: ${faltan.join(', ')}`
            + ' — el buzón podría dar por juzgado lo que nadie ha mirado');
    }
    const deAspecto = REALES.filter(([f]) => DEBEN_PEDIR_OJOS.includes(f));
    const mal = deAspecto.filter(([, texto]) => veredicto({ comentario: texto }).estado !== 'mirar');
    if (mal.length) {
        fallos.push(`${mal.length} queja(s) de aspecto/reglas recibieron veredicto automático: «${mal[0][1].slice(0, 40)}…»`);
    } else if (!faltan.length) {
        console.log(`  ${verde('✓')} las ${deAspecto.length} quejas de aspecto, reglas y temblor piden ojos`
            + gris('  (declaradas Y comprobadas)'));
    }
    const solapan = [...AUTOMATICAS].filter((x) => NECESITAN_OJOS.has(x));
    if (solapan.length) fallos.push(`una familia está en las dos listas: ${solapan.join(', ')}`);
}

// ── 4. «Parece que juego yo solo» se resuelve mirando el árbitro ──
{
    const reglas = await cargarReglas('go', {});
    const r = repartoDeTurnos(reglas);
    const v = veredicto({ comentario: 'solo juego yo? la casa no juega?' }, { reglas });
    if (r.sillas < 2) fallos.push(`go debería repartir turnos y da ${r.sillas} silla(s)`);
    else if (v.estado !== 'pantalla') fallos.push(`con el árbitro repartiendo, el veredicto debería ser «pantalla» y es «${v.estado}»`);
    else console.log(`  ${verde('✓')} con el árbitro repartiendo, la queja se manda a la pantalla`
        + gris(`  (go: ${r.detalle})`));
}

// ── 4.bis «No pasa nada al pulsar» se contesta JUGÁNDOLO ──
/**
 * ⚠️ Y LA TRAMPA DE ESTA COMPROBACIÓN ES ELEGIR MAL LA JUGADA.
 *
 * `movioLaPantalla` nació porque el aviso de `guerra` —«le doy a voltear y no
 * pasa nada»— era cierto y no lo era: el árbitro movía las 52 cartas y el juego
 * no publicaba sustrato, así que la pantalla no tenía nada que dibujar.
 *
 * Su primera versión jugaba tres veces la PRIMERA jugada legal y acusó a seis
 * juegos sanos: la primera legal de `defensa` es `pasar`, la de `relevo` es
 * `esperar` y la de `shinigami` es `senalar` — jugadas que por definición no
 * mueven el tablero. Por eso aquí se comprueba con juegos que SÍ mueven algo
 * evidente: si `damas` o `guerra` dejan de verse, es que la comprobación volvió
 * a elegir mal, y ese es el fallo que se busca.
 */
{
    const { movioLaPantalla } = await import('./veredicto.mjs');
    const seVen = [];
    /**
     * ⚠️ `defensa` Y `relevo` SON LOS QUE HACEN QUE ESTO SIRVA DE ALGO.
     *
     * Con sólo damas/guerra/sokoban/go esta comprobación aprobaba igual con el
     * cable cortado —lo dijo `prueba_de_las_pruebas.mjs`— porque en los cuatro la
     * PRIMERA jugada legal ya se ve, y el sabotaje que reduce la búsqueda a una
     * sola candidata no cambiaba nada. Los dos que lo destapan son justo los dos
     * que engañaron al instrumento: `defensa` empieza por `pasar` y `relevo` por
     * `esperar`. Si alguien vuelve a coger sólo la primera, aquí se cae.
     */
    for (const j of ['damas', 'guerra', 'sokoban', 'go', 'defensa', 'relevo']) {
        const reglas = await cargarReglas(j, {});
        const m = movioLaPantalla(reglas, { juego: j });
        if (!m.arbitroMueve) fallos.push(`${j}: el árbitro no mueve ni jugando — eso no es de pantalla`);
        else if (!m.pantallaMueve) fallos.push(`${j}: ninguna jugada cambia el dibujo (${m.detalle})`
            + ' — o el juego está roto, o esta comprobación elige mal la jugada');
        else seVen.push(`${j}: ${m.detalle}`);
    }
    if (seVen.length === 6) {
        console.log(`  ${verde('✓')} en los seis, alguna jugada SÍ cambia el dibujo`
            + gris(`  (${seVen[0]})`));
    }

    // Y el veredicto usa esa medida: con reglas delante, no dice «sin-datos».
    const reglas = await cargarReglas('guerra', {});
    const v = veredicto({ juego: 'guerra', comentario: 'le doy a voltear y no pasa nada' }, { reglas });
    if (v.familia !== 'pulsar') fallos.push(`«no pasa nada» debería ser de la familia pulsar y es «${v.familia}»`);
}

// ── 5. Y nunca dice «arreglado» ──
{
    const posibles = new Set(REALES.map(([, t]) => veredicto({ comentario: t }, { reglas: null }).estado));
    if (posibles.has('arreglado') || posibles.has('resuelto')) {
        fallos.push('el veredicto afirma que algo está arreglado: eso no lo puede saber');
    } else console.log(`  ${verde('✓')} ningún veredicto afirma «arreglado»`
        + gris(`  (los que da: ${[...posibles].join(' · ')})`));
}

if (fallos.length) {
    console.log(rojo(`\n✗ ${fallos.length} fallo(s):`));
    fallos.forEach((f) => console.log(rojo(`    · ${f}`)));
    process.exit(1);
}
console.log(verde('\n✓ el buzón dice dónde buscar, y admite lo que no puede juzgar\n'));
