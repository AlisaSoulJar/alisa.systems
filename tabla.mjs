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

const { CATALOGO } = await impo('public/js/alisa-engine/src/gym/registry.js');
/**
 * El censo canónico de juegos, para comprobar más abajo que se mide sobre TODOS.
 * Se importa del mismo sitio del que se sirven las reglas y el árbitro de salas: si
 * el universo de esta tabla y ese censo divergen, uno de los dos miente y no vale
 * seguir midiendo.
 */
const { JUEGOS } = await impo('public/arcade/js/protohub/rules/index.js');
const { verificar } = await impo('public/arcade/js/protohub/Verificador.js');
const { cargarReglas, TITULOS, SILLAS } = await impo('public/arcade/js/protohub/rules/index.js');
const { jugarEpisodio } = await impo('public/arcade/js/agentes/llm.js');
const { proveedorDesde } = await impo('public/arcade/js/agentes/proveedores.js');
const { POLITICAS, semillaDe } = await impo('public/arcade/js/agentes/politicas.js');

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

/**
 * ⚠️ UN TOPE POR JUEGO, MEDIDO, EN VEZ DE UN NÚMERO IGUAL PARA TODOS.
 *
 * Un tope global tiene que servir a la vez a la generala —once casillas, se acaba en
 * cincuenta jugadas— y al go, que con la política tonta llena el tablero y necesita
 * mil ochocientas. Puesto bajo, corta las partidas largas y el juego cae de la tabla;
 * puesto alto, se pagan minutos de más en los treinta que no lo necesitan.
 *
 * Y el descarte por corte no es un detalle: la clasificación excluía ONCE juegos por
 * «el tope de 120 decisiones corta la partida», y al medirlo resultó que nueve sólo
 * necesitaban sitio. La creencia de que snake y fagocito no terminaban NUNCA —que yo
 * misma defendí— era falsa: terminan con 1200. Se midió con `_topes.mjs`.
 *
 * Así que el tope de esos juegos sale de `public/data/topes.json`, que escribe esa
 * sonda. Lo que no esté ahí usa el global. Un número medido y guardado, no elegido.
 */
const TOPES_POR_JUEGO = await (await import('node:fs/promises'))
    .readFile(path.join(AQUI, 'public/data/topes.json'), 'utf-8')
    .then(t => JSON.parse(t).juegos ?? {})
    .catch(() => ({}));
const topeDe = (juego) => TOPES_POR_JUEGO[juego] ?? TOPE;
const pedidos = args.juegos ? String(args.juegos).split(',').map(s => s.trim()) : null;
const modelos = args.modelos ? String(args.modelos).split(',').map(s => s.trim()) : [];

const entornos = CATALOGO.filter(e => e.familia !== 'propio')
    .filter(e => !pedidos || pedidos.includes(e.juego));
if (!entornos.length) { console.log(rojo('  ningún entorno coincide')); process.exit(2); }

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  ⚠️ ¿ESTAMOS MIDIENDO SOBRE TODOS LOS JUEGOS QUE HAY? EL CONTROL DEL DENOMINADOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * La línea de arriba es un `filter` por exclusión, y ese patrón exacto ya nos costó
 * un fallo: `check_gym_envs` decía vigilar el banco entero y miraba **6 de 41**
 * porque filtraba por una familia. Aquí es el complementario, y hoy da los 35
 * correctos — pero es igual de frágil: el día que el catálogo gane una tercera
 * familia, entrará aquí sin que nadie lo decida.
 *
 * Y este medidor no es uno cualquiera: de aquí sale la clasificación PUBLICADA. Un
 * error de denominador en los otros muere en un informe interno que se rectifica;
 * aquí saldría al dominio como una comparación persona-contra-agente falsa.
 *
 * Lo señaló una auditoría externa (16-08) con el diagnóstico que faltaba: nuestra
 * maquinaria comprueba si una condición detecta su fallo, y nunca si el conjunto
 * sobre el que mide es el que existe. Peor: **el sabotaje es ciego a esa clase**,
 * porque una prueba con el universo recortado sigue suspendiendo perfectamente
 * dentro de su universo recortado.
 *
 * Así que aquí no se comprueba una condición: se compara el universo con el CENSO
 * CANÓNICO —`JUEGOS`, el mismo que usan las reglas y el árbitro de salas—. Si no
 * coinciden, no se mide: se para. Una clasificación sobre el conjunto equivocado es
 * peor que no tener clasificación, porque parece una.
 */
/**
 * `--censo` imprime sobre qué mide esta tabla y sale, sin jugar nada.
 *
 * Es lo que permite vigilar el denominador SIN pagar una pasada entera: una
 * comprobación de `npm test` le pregunta al medidor cuál es su universo y lo compara
 * con el censo. Medir de verdad tarda minutos; preguntar tarda uno.
 *
 * La idea es de la auditoría del 16-08: que cada medidor declare su universo en una
 * línea parseable, para que el conjunto deje de ser una suposición de quien lee el
 * resultado.
 */
if (args.censo) {
    const lista = entornos.map(e => e.juego);
    console.log(`universo=${lista.length}`);
    console.log(lista.join(','));
    process.exit(0);
}

if (!pedidos) {
    const mios = new Set(entornos.map(e => e.juego));
    const faltan = JUEGOS.filter(j => !mios.has(j));
    const sobran = [...mios].filter(j => !JUEGOS.includes(j));
    if (faltan.length || sobran.length) {
        console.log(rojo(`\n  ✗ el universo de la tabla NO es el censo de juegos.`));
        if (faltan.length) console.log(rojo(`    existen y no se miden: ${faltan.join(', ')}`));
        if (sobran.length) console.log(rojo(`    se miden y no están en el censo: ${sobran.join(', ')}`));
        console.log('    Se para antes de medir: una clasificación sobre el conjunto');
        console.log('    equivocado es peor que no tenerla, porque parece una.');
        process.exit(2);
    }
}

/** Los participantes: primero las líneas base, luego los modelos. */
const participantes = [
    { nombre: 'primera (suelo)', tipo: 'base', politica: POLITICAS.primera() },
    { nombre: 'azar',            tipo: 'base', politica: POLITICAS.azar() },
    { nombre: 'casa (techo blando)', tipo: 'base', politica: POLITICAS.casa() },
    ...modelos.map(m => ({ nombre: m, tipo: 'modelo', proveedor: proveedorDesde(m) })),
];

const conTopePropio = entornos.filter(e => TOPES_POR_JUEGO[e.juego]);
console.log(`\n  ${entornos.length} juegos · ${SEMILLAS} semillas · tope ${TOPE}`
          + ` · ${participantes.length} participantes`
          + (conTopePropio.length
             ? `\n  ${conTopePropio.length} con tope propio medido: `
               + conTopePropio.map(e => `${e.juego} ${TOPES_POR_JUEGO[e.juego]}`).join(' · ')
             : '') + '\n');

/** Corre un participante sobre un juego. Verifica cada recibo. */
async function correr(part, e, Clase, reglas) {
    // Una política de código no cuesta nada: se le dan todas las semillas que
    // hagan falta para que el metro sea de fiar. Un modelo, las que se paguen.
    const N = part.tipo === 'base' ? SEMILLAS_BASE : SEMILLAS;
    let puntos = 0, forzadas = 0, llamadas = 0, tokens = 0, ms = 0, ok = 0, fin = 0;
    const serie = [];      // la puntuación de cada semilla, para medir el ruido
    for (let s = 1; s <= N; s++) {
        /**
         * ⚠️ CADA PARTIDA SIEMBRA LA SUYA. Sin esto, la política de azar arrastra
         * su estado de un juego al siguiente y el suelo de `cripta` depende de
         * cuántas jugadas gastó `brisca` antes. Una línea base que cambia según
         * con quién se mida no es una línea base.
         */
        part.politica?.sembrar?.(semillaDe(e.juego, s));

        /**
         * ⚠️ LAS SILLAS PODRÍAN ROTAR, PERO NO ROTAN TODAVÍA. Y NO ES UN OLVIDO.
         *
         * El problema es real: todos se sientan SIEMPRE en el primer turno, y en
         * canadiense esa silla gana el 31% contra el 25% limpio de parchís con los
         * cuatro asientos jugando igual. Seis puntos que la clasificación se apunta
         * como habilidad de quien la ocupe.
         *
         * ✅ **EL PRIMER BLOQUEO YA NO EXISTE (15-08-2026): LA PUNTUACIÓN SÍ SIGUE
         *    AL ASIENTO.** Aquí ponía que los juegos no la publicaban por silla. Al
         *    ir a arreglarlo resultó que el trabajo estaba HECHO en las reglas y
         *    nadie lo había enchufado: DIECISÉIS de los treinta y cinco declaran
         *    `estado(p, asiento = 0)` y lo usan bien —`bazas.js` hasta resuelve el
         *    caso difícil, `puntos: MENOR_GANA ? -míos : míos`, que es el que impide
         *    leer `marcador[asiento]` a pelo porque en hearts el marcador crudo
         *    tiene el signo al revés—. Lo que faltaba era una línea en
         *    `ProtoHubEnv._estado()`, que llamaba a `reglas.estado(this.p)` sin
         *    pasarle el asiento.
         *
         *    Conectado y comprobado con la MISMA partida vista desde cada silla (no
         *    con una partida por silla, que diverge y no prueba nada):
         *
         *        brisca  marcador=[40,31,18,31]  → s0:40  s1:31  s2:18  s3:31
         *        hearts  marcador=[17, 1, 0, 8]  → s0:-17 s1:-1  s2:0   s3:-8
         *
         * ✅ **Y EL SEGUNDO BLOQUEO TAMBIÉN CAYÓ (16-08): LAS SILLAS SE ENUMERAN.**
         *
         * El que quedaba era que `asiento` hacía DOS cosas a la vez —dejar pasar N
         * turnos a la casa **y** elegir el punto de vista—. En un juego de cuatro son
         * la misma; en uno de dos, no: pedir la silla 2 en entropy no te sienta en
         * ninguna silla nueva, te hace empezar dos turnos más tarde en la misma. La
         * medida mezclaba «qué silla ocupo» con «cuándo entro»:
         *
         *     entropy   -44.9  -14.9  -15.8  -16.2      ← ¡y sólo tiene dos jugadores!
         *
         * Faltaba saber cuántas sillas tiene cada juego, y resultó que ya se sabía sin
         * inventar nada: `marcador` lleva un elemento POR SILLA. `ProtoHubEnv` cuenta
         * ahora con eso —más `manos_rivales`+1 y `avance`, porque `marcador` no siempre
         * está desde el primer turno— y envuelve la silla pedida sobre las que hay.
         *
         * La comprobación que no se puede falsear: en un juego de dos, las sillas 0 y 2
         * tienen que dar EXACTAMENTE lo mismo. Con 30 semillas y política tonta:
         *
         *     remigio  2 sillas   -54.5   131.8   -54.5   131.8   ✓
         *     oca      2 sillas   554.3  1306.5   554.3  1306.5   ✓
         *     gofish   3 sillas     2.1     3.8     4.1     2.1   ✓
         *
         * Y con eso el sesgo por fin se lee limpio, que es lo que hacía falta para
         * corregirlo: brisca 19.5 / 21.4 / 25.2 / 27.6 —la silla 3 saca un 42 % más que
         * la 0—, parchís 262 contra 465, canadiense 138 contra 236.
         *
         * ⚠️ ASÍ QUE AHORA SE ROTA POR DEFECTO, Y `--sin-rotar` LO APAGA.
         *
         * Rotar no quita el sesgo del juego —canadiense seguirá premiando a quien
         * empieza— sino que lo reparte: todos los participantes pasan por todas las
         * sillas, así que la ventaja deja de contarse como habilidad de uno.
         *
         * ⚠️ Y LOS NÚMEROS DE LA TABLA CAMBIAN. Es lo que se quería, pero significa
         * que una clasificación rotada NO es comparable con las de antes. La de
         * `resultados/` es de cuando no se rotaba: al regenerarla, se regenera entera.
         *
         * Ya no hace falta el `% 4` de antes: el entorno envuelve la silla sobre las
         * que el juego tiene de verdad, que era justamente lo que no sabía hacer.
         */
        /**
         * ═══════════════════════════════════════════════════════════════════════
         *  ⚠️ CADA SEMILLA SE JUEGA EN TODAS LAS SILLAS, NO EN UNA
         * ═══════════════════════════════════════════════════════════════════════
         *
         * Rotar la silla por semilla —lo de antes— reparte el sesgo pero NO lo quita
         * de la medida: cada partida sigue cayendo entera en una silla u otra, así que
         * la diferencia entre sillas se cuela como varianza de la muestra. Y en algunos
         * juegos esa varianza se lo come todo.
         *
         * Medido en remigio, 120 semillas × 2 sillas, con `jugarEpisodio` (el mismo
         * arnés de esta tabla, que medirlo con uno propio ya me dio un hueco cuatro
         * veces mayor que el real):
         *
         *                 silla 0   silla 1   varianza dentro   entre sillas
         *     primera       −55,4    +135,1              1471           9069
         *     casa          +43,4     +54,7              3207             31
         *
         * ⚠️ Y AHÍ ESTÁ LO QUE NO ESPERABA: el sesgo de silla NO es del juego, es de
         * QUIEN JUEGA MAL. La casa sale casi indiferente a la silla (31); la política
         * tonta está a su merced (9069, seis veces su propia varianza interna). O sea
         * que la silla no era una constante del entorno que se pudiera restar: es una
         * interacción entre el entorno y la política, y por eso parear las dos series
         * no la cancelaba —correlación medida 0,089 y −0,148, o sea nada—.
         *
         * Jugando cada semilla en las dos sillas y promediando:
         *
         *     remigio    como hoy  10,4 ± 20,4  ✗      las dos  9,2 ± 4,9  ✓
         *     chinchón   como hoy  12,2 ± 20,6  ✗      las dos  1,2 ± 1,8  ✗
         *
         * El ruido cae cuatro veces. Y el chinchón sigue sin separar CON el ruido
         * quitado, que es una respuesta distinta y mejor: ya no es «no se puede medir»
         * sino «su rival de casa juega poco mejor que el tonto». Eso se arregla en el
         * juego, no en la tabla.
         *
         * Sólo para las líneas base: no cuestan nada y son el metro. Un modelo paga
         * tokens por partida, así que sigue con una silla por semilla, rotando — sobre
         * muchas semillas pasa por todas igual, sólo que con más ruido.
         */
        const sillasDe = (part.tipo === 'base' && !args['sin-rotar'])
            ? (SILLAS[e.juego] ?? 1) : 1;
        const asientos = sillasDe > 1
            ? Array.from({ length: sillasDe }, (_, k) => k)
            : [args['sin-rotar'] ? 0 : (s - 1)];

        let suma = 0;
        // ⚠️ Terminar y verificar se cuentan por SEMILLA y a la baja: la semilla
        // cuenta como terminada sólo si terminaron TODAS sus sillas. Contar por
        // silla cambiaría el denominador —`terminadas` se compara contra el número
        // de semillas— y «termina el 94 %» pasaría a significar otra cosa sin que
        // nadie lo notara. A la baja porque media partida no es una partida.
        let todasFin = true, todasOk = true;
        for (const asiento of asientos) {
            const r = await jugarEpisodio(Clase, part.proveedor ?? (async () => ({ texto: '1' })), {
                semilla: s, tope: topeDe(e.juego), politica: part.politica, asiento,
            });
            if (r.error) throw new Error(r.error);
            suma += r.puntos;
            forzadas += r.forzadas; llamadas += r.llamadas;
            tokens += r.tokens.entrada + r.tokens.salida; ms += r.ms;
            if (!r.metricas?.terminada) todasFin = false;
            if (!(r.recibo && reglas && verificar(reglas, r.recibo).valida)) todasOk = false;
        }
        // La puntuación de la SEMILLA es la media de sus sillas. Es el número que
        // deja de depender de dónde te tocó sentarte.
        const puntosSemilla = suma / asientos.length;
        serie.push(puntosSemilla);
        puntos += puntosSemilla;
        // ⚠️ Que el episodio TERMINE importa tanto como la puntuación. Con un
        // tope corto, una brisca de 40 jugadas se corta a la mitad y el número
        // que sale es el de media partida — comparable entre participantes, sí,
        // pero no es «lo que saca en la brisca». Se cuenta y se avisa.
        if (todasFin) fin++;
        if (todasOk) ok++;
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
    /**
     * ⚠️ LAS DOS REFERENCIAS JUEGAN LAS MISMAS SEMILLAS. NO SON MUESTRAS INDEPENDIENTES.
     * ═══════════════════════════════════════════════════════════════════════════
     *
     * Esto era `Math.hypot(errorTipico(suelo), errorTipico(techo))`, que es el error de
     * la diferencia entre dos muestras SUELTAS. Y no lo son: `serie[i]` es la partida
     * de la semilla `i` en las dos, o sea el MISMO reparto jugado dos veces con dos
     * políticas. En un juego de cartas el reparto es de lejos la mayor fuente de
     * varianza —te tocan diez cartas ligadas o te tocan diez sueltas— y al parear se
     * cancela sola. Sin parear, esa varianza se cuenta DOS veces y encima como ruido
     * de la comparación, cuando es exactamente lo que las dos tienen en común.
     *
     * ⚠️ Y MEDIDO, NO CAMBIA NADA. LO DEJO PUESTO Y DIGO POR QUÉ.
     *
     * Vine a esto convencido de que era el culpable de que remigio, chinchón y unit
     * salieran «no supera al ruido». No lo es: remigio pasa de ±16,6 a ±16,7 y
     * chinchón de ±15,9 a ±16,4. O sea que las dos series están prácticamente SIN
     * correlacionar, y parear sólo cuesta un grado de libertad.
     *
     * Tiene sentido visto a posteriori: la semilla fija el reparto y el orden del
     * mazo, pero las dos políticas divergen en la PRIMERA jugada, así que a partir de
     * ahí no comparten nada. En un juego de bazas o de tablero lo compartido pesa
     * mucho más; aquí, casi nada.
     *
     * Se queda porque es el estadístico que corresponde al experimento que se hizo
     * —las dos referencias juegan las mismas semillas y la misma silla, ver la nota de
     * rotación en `correr`— y porque cuando SÍ haya correlación la aprovechará sin que
     * nadie tenga que acordarse. Si algún día dejaran de compartir semillas, la
     * comprobación de longitud lo devuelve solo a `hypot`.
     *
     * ⚠️ Y LO QUE DE VERDAD AHOGA A ESTOS TRES ESTÁ EN OTRO SITIO: el sesgo de silla.
     * La nota de `correr` lo tiene medido — en remigio, con la política tonta, la
     * silla 0 saca −54,5 y la silla 1 saca +131,8. Como se ROTA por semilla, cada
     * partida cae en uno de dos regímenes separados por casi doscientos puntos, y esa
     * varianza es la que se come el hueco de diez. No se arregla aquí ni de
     * madrugada: es una decisión sobre cómo mide el banco los juegos asimétricos.
     */
    const pareable = suelo.length > 1 && suelo.length === techo.length;
    const se = pareable
        ? errorTipico(techo.map((v, i) => v - suelo[i]))
        : Math.hypot(errorTipico(suelo), errorTipico(techo));
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ RE-PINTAR NO ES RE-JUGAR: `--desde resultados/tabla.json`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La primera clasificación con modelos costó dos horas de máquina y 7,8 M de
 * tokens. Se lanzó sin `--html`, así que la página del sitio se quedó con la
 * tabla vieja —la de sólo líneas base— y para arreglarlo había que **volver a
 * jugarlo todo**: dos horas más para cambiar un fichero de texto.
 *
 * Eso es absurdo y además peligroso: invita a re-medir por motivos de maquetación
 * y a que la página publicada nunca coincida con la última tanda buena. La
 * clasificación es una MEDIDA; la página es una VISTA de esa medida. Volver a
 * medir para redibujar es confundir las dos cosas.
 *
 * El JSON guarda todo lo que la vista necesita: `resumen` trae por participante
 * su `porJuego` con los valores ya normalizados, y `juegos` y `descartados`
 * traen el resto. Así que se reconstruyen las cuatro estructuras y se salta la
 * tanda entera.
 *
 * ⚠️ Y NO SE TOCA LA FECHA. La página dirá cuándo se MIDIÓ, no cuándo se pintó:
 * si al redibujar se pusiera la fecha de hoy, una tabla de la semana pasada
 * parecería recién medida, que es la mentira exacta que este proyecto persigue.
 */
const DESDE = args.desde ? String(args.desde) : null;
let guardado = null;
if (DESDE) {
    guardado = JSON.parse(await readFile(path.join(AQUI, DESDE), 'utf-8'));
    console.log(gris(`\n  re-pintando desde ${DESDE} — medido el ${guardado.fecha}`));
    console.log(gris('  (no se juega nada: esto es la VISTA de una medida ya hecha)\n'));
}

// ── la tanda ─────────────────────────────────────────────────────
const datos = new Map();          // juego → { participante → resultado }
const descartes = new Map();      // juego → motivo por el que no puntúa, o null
for (const e of (DESDE ? [] : entornos)) {
    const Clase = await e.cargar();
    const reglas = await cargarReglas(e.juego);
    const fila = {};
    for (const part of participantes) {
        try { fila[part.nombre] = await correr(part, e, Clase, reglas); }
        catch (err) { fila[part.nombre] = { error: err.message }; }
    }
    datos.set(e.juego, fila);

    const c = fila['casa (techo blando)'], p = fila['primera (suelo)'];
    /**
     * ⚠️ SI UN JUEGO PUNTÚA O NO LO DECIDEN LAS REFERENCIAS, NO LOS CONCURSANTES.
     *
     * Esto era `participantes.some(...)`, o sea: **si un solo participante no
     * terminaba un juego, el juego se caía para todos**. Con un modelo apenas se
     * notaba. Con tres, la tabla salió literalmente vacía — `0/26 juegos con
     * hueco`, «sin datos» en todas las filas, incluidas las líneas base que
     * habían jugado sus sesenta semillas enteras sin un fallo.
     *
     * El error de fondo es de atribución. Que un juego sepa ordenar a quien lo
     * juega es una propiedad DEL JUEGO, y se demuestra con el suelo y el techo,
     * que son deterministas y baratos. Que un modelo concreto no llegue al final
     * es un dato SOBRE ESE MODELO — pertenece a su fila, no puede borrar el
     * juego del banco de pruebas.
     *
     * Dicho de otro modo: un concursante lento no puede descalificar la prueba.
     * Y aquí lo hizo literalmente — `gemma4` tarda diez segundos por jugada
     * (sesenta veces más que qwen2.5) y con eso se llevó por delante los
     * veintiséis juegos y las tres líneas base.
     */
    /**
     * ⚠️ EXIGIR EL 100% BORRABA UN JUEGO POR DOS PARTIDAS DE DOSCIENTAS CUARENTA.
     *
     * Esto pedía que TODAS las partidas de las dos referencias terminaran. Medido en
     * fagocito con las 120 semillas que juega la tabla: 238 de 240 terminan, y las dos
     * que no son de la política TONTA —«la primera jugada legal siempre»— que entra en
     * un bucle por el laberinto y los fantasmas no llegan a alcanzarla. Puntúa 10 y no
     * se muere nunca.
     *
     * Y eso es exactamente lo que dice el párrafo de arriba, aplicado a la referencia
     * en vez de al modelo: que un jugador concreto no llegue al final es un dato SOBRE
     * ESE JUGADOR. Una política tonta que cicla en el 0,8% de las partidas sigue siendo
     * un suelo perfectamente válido — el promedio se calcula con las 240 y esas dos
     * están dentro.
     *
     * Lo que el corte protege de verdad es de un marcador al que le falta el desenlace
     * EN GENERAL. Con 238 de 240 no le falta a casi nadie. Así que se exige la inmensa
     * mayoría y NO se calla el resto: la fracción exacta se publica en el motivo.
     *
     * El umbral es una decisión, no un dato, y por eso está aquí con un nombre y no
     * escondido en una comparación.
     */
    const MINIMO_TERMINADAS = 0.95;
    const REFERENCIAS = ['primera (suelo)', 'casa (techo blando)'];
    let peorFraccion = 1;
    for (const nombre of REFERENCIAS) {
        const r = fila[nombre];
        if (!r) continue;
        const f = (r.terminadas ?? 0) / (r.semillas ?? SEMILLAS);
        if (f < peorFraccion) peorFraccion = f;
    }
    const cortadas = peorFraccion < MINIMO_TERMINADAS;
    // El veredicto de SI el juego puntúa se toma con los promedios largos.
    const { hueco, se, ok } = separaDeVerdad(fila);

    descartes.set(e.juego,
        !(hueco > 0) ? 'la casa no supera al suelo: la escala se invertiría'
        // Se dice el tope DE ESE JUEGO, no el global: con topes por juego, publicar el
        // número general convertiría el motivo en una pista falsa.
        // Se dice la FRACCIÓN, no sólo que se corta: «sólo termina el 60%» y «termina
        // el 94%» son dos diagnósticos muy distintos y antes se leían igual.
        : cortadas ? `el tope de ${topeDe(e.juego)} decisiones corta la partida`
                   + ` (sólo termina el ${Math.round(peorFraccion * 100)}% de las de referencia)`
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
/** Juegos donde el azar supera al rival de la casa: su columna se lee mal. */
const techosFlojos = [];
for (const [juego, fila] of datos) {
    if (descartes.get(juego)) continue;
    // El CUÁNTO se normaliza sobre las mismas semillas que jugaron los modelos.
    const suelo = fila['primera (suelo)']?.puntosCortos;
    const techo = fila['casa (techo blando)']?.puntosCortos;
    const hueco = techo - suelo;
    /**
     * ⚠️ UN JUEGO NO PUEDE DESAPARECER DE LAS DOS LISTAS A LA VEZ.
     *
     * Esto era un `continue` a secas: el juego no entraba en la clasificación Y
     * tampoco en `descartados`, así que se evaporaba. Ni ranqueado ni descartado ni
     * mencionado — la tabla decía «29 juegos» y el catálogo tenía 37, y los dos
     * números eran ciertos por separado.
     *
     * Lo destapó el dominó: se lo saltó una pasada completa y no dijo por qué;
     * corriéndolo solo daba hueco 5,0 ± 3,1, o sea que ENTRABA. Un juego que se cae
     * de la tabla en silencio es peor que uno descartado, porque el descarte lleva
     * motivo y esto no llevaba nada — y este banco publica esa tabla como su
     * argumento principal.
     *
     * `descartes` ya es el sitio donde vive «por qué no puntúa este juego». Se usa.
     */
    /**
     * ⚠️ Y ESTE MOTIVO NO ES EL MISMO QUE EL DE ARRIBA, AUNQUE SE PAREZCA.
     *
     * El veredicto de SI un juego puntúa lo da `separaDeVerdad` con los promedios
     * LARGOS —las `--semillas-base` que juegan las referencias— y ya está escrito
     * arriba. Esto de aquí es otra cosa: el DENOMINADOR con el que se normaliza a los
     * modelos, que tiene que salir de las mismas semillas que ellos jugaron, o se
     * compararía un modelo de 15 partidas contra un suelo de 200.
     *
     * Así que un juego puede separar de verdad y aun así no poder normalizarse, si en
     * el trozo corto el suelo y el techo se cruzan por azar. Eso NO es «la casa no
     * supera al suelo»: es «con estas semillas no se puede poner la escala», y se
     * arregla subiendo `--semillas`, no tocando el juego.
     *
     * Lo destapó el dominó: con 2 semillas daba hueco +5,0 y con 15 daba −2,6. El
     * mismo juego y la misma casa; lo que cambiaba era el trozo. Escribirlo como
     * «la casa no supera al suelo» habría mandado a arreglar una heurística que está
     * bien — y que en el largo gana 56,8 % de las partidas.
     */
    if (!Number.isFinite(hueco)) {
        descartes.set(juego, descartes.get(juego)
            ?? 'no se pudo poner la escala: faltan partidas terminadas en las semillas cortas');
        continue;
    }
    if (hueco <= 0) {
        descartes.set(juego, descartes.get(juego)
            ?? `no se puede poner la escala: en las ${SEMILLAS} semillas que juegan los `
             + `modelos el suelo y la casa se cruzan (hueco ${hueco.toFixed(1)}). `
             + 'El juego sí separa en el promedio largo; sube --semillas.');
        continue;
    }
    juegosUtiles.push(juego);
    const n = {};
    const inc = {};
    for (const part of participantes) {
        const r = fila[part.nombre];
        /**
         * ⚠️ Y LO QUE NO SE TERMINÓ NO SE PUNTÚA — PERO SÓLO A QUIEN NO LO
         * TERMINÓ.
         *
         * La otra mitad del arreglo de arriba. Una partida cortada por el tope no
         * es un mal resultado, es un resultado que no existe: falta el desenlace,
         * que es donde se reparte casi todo el marcador. Contarla como si fuera
         * una puntuación baja castiga al lento como si fuera malo, que son cosas
         * distintas y sólo una de las dos se está midiendo aquí.
         *
         * Así que su casilla va vacía y su fila lo dice. El juego sigue en pie
         * para los demás.
         */
        const incompleta = !r?.error && (r?.terminadas ?? 0) < (r?.semillas ?? SEMILLAS);
        n[part.nombre] = (r?.error || incompleta) ? null : (r.puntosCortos - suelo) / hueco;
        /**
         * ⚠️ LA INCERTIDUMBRE VIAJA CON EL NÚMERO.
         * Un modelo se mide con 3 partidas porque cuesta dinero, y 3 partidas de
         * un juego de cartas dicen poco. Publicar «0,71» a secas es fingir una
         * precisión que no se tiene. Se publica el ± y que cada cual juzgue.
         *
         * ⚠️ Y NO SE RECORTA LA SERIE PARA CALCULARLA — ANTES SÍ, Y MENTÍA.
         *
         * Estaba `.slice(0, SEMILLAS)`, que tiene sentido para la MEDIA (los
         * modelos y las bases deben compararse sobre las mismas semillas) y
         * ninguno para la dispersión: recortaba a una muestra las 80 partidas que
         * las líneas base sí habían jugado. Con `--semillas 1` el efecto era el
         * peor posible — el error típico de una sola muestra es cero, así que
         * **la tabla entera salía con `±0,00`, incluido el azar**, declarando
         * precisión perfecta justo en la tanda con menos datos.
         *
         * Con una sola partida la dispersión no es cero: es DESCONOCIDA. Se dice
         * `null` y se imprime «—», porque un hueco en la tabla es honrado y un
         * cero es una afirmación.
         */
        const serie = r?.serie ?? [];
        inc[part.nombre] = r?.error || serie.length < 2 ? null
            : 2 * errorTipico(serie) / Math.abs(hueco);
    }
    /**
     * ⚠️ SI EL AZAR LE GANA A LA CASA, LA CASA NO ES UN TECHO.
     *
     * Ya se descarta el juego cuyo techo no supera al suelo —la escala se
     * invertiría—, pero faltaba el caso de en medio y apareció midiendo de
     * verdad: en `rebaño` el azar sacó **2,39** y en `relevo` **1,80**, sobre una
     * escala donde 1,00 es «tan bueno como el rival de la casa».
     *
     * No invalida el juego: sigue separando a quien juega de quien no. Lo que
     * invalida es la LECTURA de su columna, porque un agente mediocre puede salir
     * por encima de uno y parecer que ha batido al techo cuando lo que ha batido
     * es una heurística mía que resultó peor que dar tumbos.
     *
     * Se avisa en vez de descartar. Descartarlo escondería el problema; decirlo
     * lo pone donde se puede arreglar, que es en la política de la casa.
     */
    const azarN = n['azar'], casaN = n['casa (techo blando)'];
    if (Number.isFinite(azarN) && Number.isFinite(casaN) && azarN > casaN) {
        techosFlojos.push({ juego, azar: azarN });
    }

    incertidumbres.set(juego, inc);
    normalizados.set(juego, n);
}

/**
 * Con `--desde`, las cuatro estructuras que la VISTA necesita se reconstruyen
 * del JSON en vez de medirse. Se mutan en su sitio porque son `const`: lo que
 * importa es que a partir de aquí el resto del fichero no sepa —ni le haga
 * falta saber— si los números vienen de jugar o de leer.
 */
if (DESDE) {
    participantes.length = 0;
    participantes.push(...guardado.resumen.map(r => ({ nombre: r.participante, tipo: r.tipo })));
    juegosUtiles.push(...guardado.juegos);
    for (const j of guardado.juegos) {
        normalizados.set(j, Object.fromEntries(
            guardado.resumen.map(r => [r.participante, r.porJuego?.[j] ?? null])));
    }
    for (const [j, motivo] of Object.entries(guardado.descartados ?? {})) descartes.set(j, motivo);
}

// ── la tabla ─────────────────────────────────────────────────────
console.log(`\n  ${verde('CLASIFICACIÓN')}  ${gris(`0 = elegir la primera · 1 = rival de casa · ${juegosUtiles.length}/${DESDE ? juegosUtiles.length + Object.keys(guardado.descartados ?? {}).length : entornos.length} juegos con hueco`)}\n`);
console.log(gris('  participante          mediana   media      ±   peor   mejor   forzadas    tokens      s   recibos'));

const resumen = DESDE ? [...guardado.resumen] : [];
/**
 * ⚠️ Y RE-PINTANDO TAMBIÉN SE IMPRIME LA TABLA EN LA CONSOLA.
 *
 * La primera versión saltaba el bucle de abajo, que es quien imprime las filas —
 * así que salía la cabecera, ninguna fila, y el fichero bien escrito. Una salida
 * que enseña el encabezado de una tabla vacía hace pensar que no hay datos
 * cuando los hay: el error contrario al de siempre, pero error igual.
 */
if (DESDE) {
    for (const r of resumen) {
        const vals = juegosUtiles.map(j => r.porJuego?.[j]).filter(v => v !== null && v !== undefined);
        console.log(`  ${r.verificadas === r.esperadas ? verde('✓') : rojo('✗')} ${r.participante.padEnd(22)}`
            + `${r.mediana.toFixed(2).padStart(7)}${r.media.toFixed(2).padStart(8)}`
            + `${('±' + r.incertidumbre.toFixed(2)).padStart(7)}`
            + `${(vals.length ? Math.min(...vals) : 0).toFixed(2).padStart(7)}`
            + `${(vals.length ? Math.max(...vals) : 0).toFixed(2).padStart(8)}`
            + `${String(r.forzadas).padStart(11)}${(r.tokens / 1000).toFixed(1).padStart(10)}k`
            + `${String(Math.round(r.segundos)).padStart(7)}   ${r.verificadas}/${r.esperadas}`);
    }
}
for (const part of (DESDE ? [] : participantes)) {
    const vals = juegosUtiles.map(j => normalizados.get(j)[part.nombre]).filter(v => v !== null);
    if (!vals.length) { console.log(`  ${rojo('✗')} ${part.nombre.padEnd(22)} sin datos`); continue; }
    const media = vals.reduce((a, b) => a + b, 0) / vals.length;
    /**
     * ⚠️ EL TITULAR ES LA MEDIANA, Y NO ES UN TECNICISMO: LA MEDIA MENTÍA.
     *
     * Medido en la primera tanda completa: `qwen2.5:7b` salía con media −1,02 y
     * mediana −0,10; el azar, con media −0,19 y mediana +0,20. Dos historias
     * distintas de los mismos quince juegos.
     *
     * La culpa la tiene la normalización, y es inevitable: dividir por el hueco
     * entre suelo y techo convierte un hueco pequeño en un multiplicador enorme.
     * En brisca ese hueco es mínimo, así que una partida floja daba **−10,25** y
     * esa sola casilla se llevaba por delante el promedio de los otros catorce.
     * El número resultante no describía al participante: describía a brisca.
     *
     * No es un problema nuestro ni nuevo — es por lo que los bancos de Atari
     * publican mediana normalizada desde hace años. La media se sigue enseñando
     * al lado, porque la distancia entre las dos ES el dato: cuando se separan,
     * hay un juego dominando y conviene ir a mirarlo.
     */
    const ord = [...vals].sort((a, b) => a - b);
    const mediana = ord.length % 2
        ? ord[(ord.length - 1) / 2]
        : (ord[ord.length / 2 - 1] + ord[ord.length / 2]) / 2;
    // Las incertidumbres de juegos independientes se suman en cuadratura.
    const incs = juegosUtiles.map(j => incertidumbres.get(j)[part.nombre]).filter(v => v !== null);
    // Sin ninguna dispersión medible no hay dispersión que publicar: `null`, no
    // cero. `Math.hypot()` sin argumentos vale 0, y ese cero se colaba como si
    // fuera una medida — el mismo cero falso que ya salía por el recorte de arriba.
    const inc = incs.length ? Math.hypot(...incs) / incs.length : null;
    const tot = (k) => juegosUtiles.reduce((a, j) => a + (datos.get(j)[part.nombre]?.[k] ?? 0), 0);
    // Cada participante juega las semillas que le tocan: las bases muchas más.
    const verif = tot('verificadas'), esperadas = tot('semillas');
    resumen.push({ participante: part.nombre, tipo: part.tipo, mediana, media, incertidumbre: inc,
                   tokens: tot('tokens'), segundos: tot('ms') / 1000,
                   forzadas: tot('forzadas'), llamadas: tot('llamadas'),
                   verificadas: verif, esperadas,
                   porJuego: Object.fromEntries(juegosUtiles.map(j => [j, normalizados.get(j)[part.nombre]])) });

    console.log(`  ${verif === esperadas ? verde('✓') : rojo('✗')} ${part.nombre.padEnd(22)}`
        + `${mediana.toFixed(2).padStart(7)}${media.toFixed(2).padStart(8)}`
        + `${(inc === null ? '—' : '±' + inc.toFixed(2)).padStart(7)}`
        + `${Math.min(...vals).toFixed(2).padStart(7)}${Math.max(...vals).toFixed(2).padStart(8)}`
        + `${String(tot('forzadas')).padStart(11)}${(tot('tokens') / 1000).toFixed(1).padStart(10)}k`
        + `${(tot('ms') / 1000).toFixed(0).padStart(7)}   ${verif}/${esperadas}`);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL ANCLA — LO ÚNICO DE ESTA TABLA QUE SE ENTIENDE SIN LEER EL PROYECTO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `marea.js` existe explícitamente para esto, y lo dice en su cabecera: *«nadie
 * de fuera sabe qué significa un 0,38 en canadiense»*. Es el 2048 canónico —4×4,
 * 90/10, una fusión por ficha, puntuación = suma de fusiones— y lleva años
 * siendo entorno de referencia, así que su número ya tiene con qué compararse en
 * la cabeza de quien lea la tabla.
 *
 * ⚠️ Y LA TABLA LO ESTABA TIRANDO A LA BASURA.
 *
 * Medido el 24-08 sobre la primera clasificación con modelos: `porJuego` sólo
 * guardaba el valor NORMALIZADO. Para marea eso da `0.35`, que no significa nada
 * fuera de aquí. El puente estaba construido y la tabla cruzaba por debajo.
 *
 * Se publican los dos números que cualquiera reconoce: la puntuación y la ficha
 * más alta. Y de paso sirven de comprobación externa de que nuestro juego es el
 * que decimos que es — medido con 200 semillas, el azar saca 1058 y llega a la
 * ficha 128, que es justo lo que da la literatura para una política aleatoria.
 * Es la única validación de este banco que no depende de nosotros.
 */
const PUENTE = 'marea';
if (datos.has(PUENTE)) {
    const crudos = datos.get(PUENTE);
    console.log(`\n  ${verde('ANCLA')}  ${gris('marea = 2048 canónico · lo que estos números valen fuera de aquí')}\n`);
    console.log('  ' + 'participante'.padEnd(22) + 'puntuación'.padStart(11) + '   semillas');
    for (const part of participantes) {
        const d = crudos[part.nombre];
        if (!d) continue;
        /**
         * ⚠️ Y SE DICE CON CUÁNTAS SEMILLAS, PORQUE EN EL 2048 ESO LO ES TODO.
         *
         * Desviación medida por partida: 519 con la política del azar y **1702**
         * con la de la casa. Con tres semillas el error de la media es de ±300 a
         * ±983 — más grande que la distancia entre el suelo (814) y el azar
         * (1058). Publicar un número de tres semillas aquí es publicar ruido con
         * cara de medida, así que la cuenta va al lado y quien lea decide.
         */
        const n = d.semillas ?? 0;
        const aviso = n < 20 ? gris(`  ⚠ pocas: ±${Math.round(1702 / Math.sqrt(Math.max(1, n)))} de error`) : '';
        console.log('  ' + part.nombre.padEnd(22)
            + (d.puntos ?? 0).toFixed(0).padStart(11) + String(n).padStart(11) + aviso);
    }
}

if (techosFlojos.length) {
    console.log(`\n  ${rojo('⚠ techo flojo')} — el azar supera al rival de la casa en: `
        + techosFlojos.map(t => `${t.juego} (${t.azar.toFixed(2)})`).join(', '));
    console.log(gris('    Su columna sigue ordenando, pero el 1,00 deja de ser un techo:'));
    console.log(gris('    ahí la política de la casa es peor que dar tumbos, y hay que arreglarla.'));
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ UNA TANDA PARCIAL NO PISA LA CLASIFICACIÓN PUBLICADA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esto escribía `resultados/tabla.json` SIEMPRE, y ese fichero es la
 * clasificación que se publica. El 24-08 me lo cargué dos veces en una tarde:
 * una probando tres juegos con dos semillas, y otra comprobando que el bloque
 * del ancla se pintaba. La segunda vez la tabla buena —tres modelos, 32 juegos,
 * 96 recibos verificados por modelo, dos horas de máquina— quedó sustituida por
 * un ensayo de tres juegos.
 *
 * Se salvó por casualidad: el `.md` de la tanda buena seguía ahí porque la
 * prueba no llevaba `--md`. Depender de la casualidad para no perder dos horas
 * de medida no es un plan.
 *
 * Con `--juegos` la tanda es por definición un ensayo, así que se escribe a un
 * fichero aparte y se dice. Sobrescribir lo publicado tiene que costar
 * escribirlo entero, que es exactamente cuando se quiere sobrescribir.
 */
const dir = path.join(AQUI, 'resultados');
await mkdir(dir, { recursive: true });
const parcial = !!pedidos;
const salidaJson = parcial ? 'tabla_ensayo.json' : 'tabla.json';
if (parcial) {
    console.log(gris('\n  ⚠ tanda PARCIAL (--juegos): no se toca la clasificación publicada.'));
}
/**
 * ⚠️ RE-PINTANDO NO SE REESCRIBE LA MEDIDA. Con `--desde` la única salida son
 * el HTML y el markdown: tocar el JSON sólo serviría para cambiarle la fecha a
 * una medida que no se ha vuelto a hacer.
 */
if (!DESDE) await writeFile(path.join(dir, salidaJson), JSON.stringify(
    { fecha: new Date().toISOString(), semillas: SEMILLAS, tope: TOPE,
      // Los topes propios van en el resultado porque cambian lo que significa el
      // número: una puntuación de go a 1800 decisiones y otra a 400 no son la misma
      // medida, y quien lea el JSON tiene que poder saber cuál es cuál.
      topesPorJuego: Object.fromEntries(entornos.map(e => [e.juego, topeDe(e.juego)])
                                                .filter(([j]) => TOPES_POR_JUEGO[j])),
      juegos: juegosUtiles,
      descartados: Object.fromEntries([...descartes].filter(([, m]) => m)),
      resumen }, null, 2));

/**
 * ⚠️ LA CLASIFICACIÓN, EN UNA PÁGINA — Y ES LO QUE NOS DIFERENCIA.
 *
 * El argumento entero del proyecto es que una partida se comprueba VOLVIÉNDOLA A
 * JUGAR, no pidiéndole a otro modelo que la puntúe. Eso sólo vale algo si la
 * tabla resultante está donde cualquiera pueda mirarla y, sobre todo, discutirla:
 * cada fila lleva cuántos recibos verificaron y cuántas jugadas hubo que forzar,
 * que son las dos cifras con las que se destapa un banco de pruebas amañado.
 *
 * Se genera en la misma pasada que la mide. Una tabla de resultados escrita a
 * mano es exactamente lo que este proyecto lleva semanas quitando de en medio.
 */
if (args.html) {
    const pct = (r) => r.llamadas ? (r.forzadas / r.llamadas * 100).toFixed(0) : '0';
    const filas = resumen.map(r => `<tr><th>${r.participante}</th>`
        + `<td class="n"><b>${r.mediana.toFixed(2)}</b></td>`
        + `<td class="n gris">${r.media.toFixed(2)}</td>`
        + `<td class="n gris">${r.incertidumbre === null
              ? '<span title="una sola partida: la dispersión no se ha medido">—</span>'
              : '±' + r.incertidumbre.toFixed(2)}</td>`
        + `<td class="n">${r.forzadas}/${r.llamadas} <span class="gris">(${pct(r)}%)</span></td>`
        + `<td class="n gris">${(r.tokens / 1000).toFixed(1)}k</td>`
        + `<td class="n">${r.verificadas}/${r.esperadas}</td></tr>`).join('\n');

    const cab = participantes.map(p => `<th>${p.nombre}</th>`).join('');
    const porJuego = juegosUtiles.map(j => {
        const n = normalizados.get(j);
        return `<tr><th><a href="/arcade/jugar.html?juego=${j}">${TITULOS[j] ?? j}</a></th>`
            + participantes.map(p => `<td class="n">${n[p.nombre] === null ? '—' : n[p.nombre].toFixed(2)}</td>`).join('')
            + '</tr>';
    }).join('\n');

    const fuera = [...descartes].filter(([, m]) => m);
    await writeFile(path.join(AQUI, String(args.html)), `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ALISA — clasificación</title>
<meta name="alisa-escaparate" content="motor">
<style>
:root{color-scheme:light dark}
body{margin:0;padding:2.5rem 1.25rem;background:#f4f6f8;color:#1a2230;
     font:15px/1.6 ui-sans-serif,system-ui,sans-serif}
main{max-width:56rem;margin:0 auto}
h1{font:600 1.5rem/1.2 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase}
h2{font:600 1rem/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;margin-top:2.2rem}
p.sub{color:#4a5866;max-width:46rem}
table{border-collapse:collapse;width:100%;margin:1.2rem 0;background:#fff;
      border:1px solid #d9e0e7;font-size:14px}
th,td{padding:.42rem .6rem;border-bottom:1px solid #eef2f5}
thead th{font:600 11px/1.4 ui-monospace,monospace;text-transform:uppercase;
         letter-spacing:.06em;color:#4a5866;text-align:right}
thead th:first-child{text-align:left}
tbody th{text-align:left;font-weight:500}
tbody th a{color:#1a2230;text-decoration:none;border-bottom:1px solid #c9d3dd}
td.n{text-align:right;font-variant-numeric:tabular-nums}
.gris{color:#7f8c8d}
.escala{background:#e9eef3;padding:.7rem .9rem;border-radius:4px;max-width:46rem}
footer{margin-top:2.5rem;color:#7f8c8d;font-size:13px}
@media(prefers-color-scheme:dark){
 body{background:#12171d;color:#e6ecf2}table{background:#1a2028;border-color:#2b3540}
 th,td{border-bottom-color:#232c36}tbody th a{color:#e6ecf2;border-bottom-color:#3a4550}
 p.sub,thead th,.gris{color:#9aa8b5}.escala{background:#1a2028}}
</style></head><body><main>
<h1>Clasificación</h1>
<p class="sub">Modelos y líneas base en las mismas filas, medidos en la misma tanda.
${SEMILLAS} semillas por juego para los modelos y ${SEMILLAS_BASE} para las bases —no
cuestan tokens, así que el metro se mide con más partidas que lo que se mide con él.</p>
<p class="escala"><b>0,00</b> = tan bueno como elegir siempre la primera opción legal.<br>
<b>1,00</b> = tan bueno como el rival de casa del juego.<br>
<span class="gris">Las puntuaciones crudas no son comparables entre juegos —el xiangqi va
en miles y el Go Fish en unidades— así que sumarlas daría un número que sólo habla del
juego de escala más grande. Cada juego se lleva a esta escala común antes de promediar.</span></p>
<table><thead><tr><th>participante</th><th>mediana</th><th>media</th><th>±</th>
<th>jugadas forzadas</th><th>tokens</th><th>recibos verificados</th></tr></thead>
<tbody>${filas}</tbody></table>
<p class="sub"><b>El titular es la mediana, y la media va al lado a propósito.</b>
Normalizar obliga a dividir por el hueco entre suelo y techo, así que un juego con
hueco pequeño convierte una partida floja en un número enorme. Medido aquí: una sola
casilla de brisca valía <b>−10,25</b> y arrastraba el promedio de los otros catorce —
el resultado describía a brisca, no al participante. Es el motivo por el que los bancos
de Atari publican mediana normalizada. <b>Cuando las dos columnas se separan mucho, hay
un juego mandando</b>, y merece la pena ir a mirar cuál en la tabla de abajo.</p>
<p class="sub"><b>Las dos columnas que importan para desconfiar.</b> «Forzadas» son las
veces que el participante no dio una jugada válida y hubo que elegir por él: si ese número
sube, la fila mide el arnés y no al modelo. «Recibos verificados» son las partidas que se
volvieron a jugar entero contra el mismo fichero de reglas y dieron el mismo resultado.
<b>Lo que no verifica, no puntúa</b> — y no hay ningún modelo juez en ninguna parte.</p>
<h2>Por juego</h2>
<table><thead><tr><th>juego</th>${cab}</tr></thead><tbody>${porJuego}</tbody></table>
${techosFlojos.length ? `<h2>Techos flojos</h2><p class="sub">En estos juegos <b>el azar
supera al rival de la casa</b>, así que el 1,00 de su columna deja de ser un techo y un
agente mediocre puede parecer que lo bate: ${techosFlojos.map(t => `<b>${t.juego}</b> (${t.azar.toFixed(2)})`).join(', ')}.
Se dice en vez de esconderlo — el juego sigue ordenando, lo que hay que arreglar es
nuestra política, no la tabla.</p>` : ''}
${fuera.length ? `<h2>Fuera de la media, y por qué</h2><ul class="sub">`
    + fuera.map(([j, m]) => `<li><b>${j}</b> — ${m}</li>`).join('') + '</ul>' : ''}
<footer>Generada por <code>tabla.mjs</code> el ${new Date().toISOString().slice(0, 10)},
tope ${TOPE} decisiones. Los juegos cuyo hueco entre líneas base no supera al ruido salen
de la media con el motivo puesto: un juego que no distingue a quien lo juega no puede
ordenar a nadie. · <a href="/generos.html">Qué estructuras cubre el motor</a></footer>
</main></body></html>
`);
    console.log(gris(`\n  html en ${args.html}`));
}

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
        'El titular es la **mediana**: normalizar divide por el hueco entre suelo y techo,',
        'así que un juego con hueco pequeño convierte una partida floja en un número enorme',
        'y se lleva por delante el promedio. La media va al lado — cuando se separan mucho,',
        'hay un juego mandando. Es por lo que los bancos de Atari publican mediana.', '',
        '| participante | mediana | media | ± | forzadas | tokens | recibos verificados |',
        '|---|---|---|---|---|---|---|',
        ...resumen.map(r => `| ${r.participante} | **${r.mediana.toFixed(2)}** | ${r.media.toFixed(2)} `
            + `| ${r.incertidumbre === null ? '— (sin medir)' : '±' + r.incertidumbre.toFixed(2)} | ${r.forzadas}/${r.llamadas} `
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
console.log(gris(DESDE ? '  (re-pintado: la medida no se ha tocado)' : `  json en resultados/${salidaJson}`) + '\n');
