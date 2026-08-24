/**
 * ¿PUNTÚA A ALGUIEN ESTE ENTORNO, O LE DA LA MISMA NOTA A TODO EL MUNDO?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_senal.mjs      → 0 todo bien · 1 hay fallos
 *
 * El banco ya comprobaba que sus entornos se importan, aceptan sus verbos y son
 * REPETIBLES: misma semilla, mismo resultado. Eso es la mitad del contrato —«lo
 * que no verifica, no puntúa»— y la otra mitad no la miraba nadie:
 *
 *     **lo que no DISTINGUE tampoco puntúa.**
 *
 * Un entorno que le da la misma nota a políticas distintas es perfectamente
 * verificable y no sirve para comparar a nadie. Sale en verde en todas las
 * comprobaciones que había, publica su recibo, entra en la tabla — y la tabla no
 * significa nada, porque la nota no depende de lo que hiciste.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ LA PRIMERA VERSIÓN DE ESTA PRUEBA ACUSÓ A SIETE ENTORNOS SANOS.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Se escribió el 23-08 con tres políticas —recorrer en ciclo, coger siempre la
 * primera, coger siempre la última— y **150 pasos**. Dio siete «no separan», con
 * su lista, su trinquete y su sabotaje. Y estaba mal, por dos motivos que se
 * midieron al día siguiente al ir a arreglar los entornos acusados:
 *
 *   1. **LAS TRES POLÍTICAS SON IGUAL DE MALAS.** Que tres jugadores pésimos
 *      empaten no dice nada del examen. Medido con la política de la casa
 *      —`sugerencia()`, que existe en los 35 del ProtoHub—:
 *
 *          snake    las tres sondas 0     · la casa 100
 *          relevo   las tres sondas -156  · la casa 287
 *          oca      las tres sondas 250   · la casa 1520
 *
 *   2. **150 PASOS EN ENTORNOS QUE DECLARAN 3000 Y 5400.** El horizonte estaba
 *      en `meta.horizon`, escrito por quien hizo el entorno, y la prueba lo
 *      ignoraba. `ChopperAquarium` separa perfectamente en el suyo (15 contra
 *      40) y en 150 pasos no ha empezado a pasar nada.
 *
 * Y el séptimo, `RaccoonSpace`, tampoco estaba roto: con un piloto que apunta a
 * un planeta y escanea saca **-40** donde las políticas ciegas sacan **-100**.
 * Lo que tiene es la recompensa entera detrás de una puerta —hay que NAVEGAR
 * hasta un planeta para que se ofrezca `escanear`— y ninguna política ciega la
 * cruza. Eso es un problema difícil, no un entorno roto, y la diferencia importa.
 *
 * Sexta y séptima vez en dos días que el instrumento era el sospechoso. Por eso
 * aquí se dice lo que se ha medido —«no he conseguido que separe»— y no lo que
 * apetecería concluir —«no puede puntuar a nadie»—: son cosas distintas, y la
 * primera versión de esta prueba habría hecho que se «arreglaran» cinco entornos
 * que funcionaban.
 */
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';

/**
 * ⚠️ TRINQUETE. Entornos a los que NO SE LES HA CONSEGUIDO sacar dos notas, con
 * lo medido en cada uno. **Sólo puede subir de tamaño con explicación.** Si
 * aparece uno nuevo, es que se ha añadido al banco algo que no distingue.
 */
const NO_SEPARAN = {
    'alisa/guerra-protohub-v0':
        'juego de CONTROL: la única jugada es voltear. No hay nada que decidir, y eso es su razón de ser',
    /**
     * ⚠️ LAS TRES DEL MAPACHE: TIENEN SEÑAL POR ENCIMA DE UN UMBRAL, Y DEBAJO NO.
     *
     * `RaccoonSpace` entró aquí el 23-08, salió el 24-08 por la mañana y ha
     * vuelto por la tarde, y las tres veces por un motivo distinto. Vale la pena
     * contarlo porque es el mejor ejemplo de lo fácil que es confundir «este
     * entorno no mide» con «mi sonda no sabe jugar»:
     *
     *   1. Entró con tres sondas tontas y 150 pasos: no separaba.
     *   2. Salió al medirlo con su horizonte real y un bandido: separaba.
     *   3. Ha vuelto, y esta vez de verdad.
     *
     * Lo que pasó en medio: se metió la PISTA en el núcleo —la que la persona
     * tenía en la página y el agente no— y con ella la etapa se ganaba el 71% en
     * vez del 43%. Al recalibrar el combustible para que la escalera de ¡Busca!
     * subiera de verdad, el margen se estrechó y las siete políticas pasaron a
     * morir todas sin escanear.
     *
     * ⚠️ Y AQUÍ EL BANDIDO NO APRENDE: APRENDE AL REVÉS. Medido, da la MISMA nota
     * con cualquier semilla y con cualquier número de objetivos —-42 con
     * combustible 32, -142 con 28— porque descubre que `escanear` cuesta -1
     * cuando no hay nada a tiro y deja de intentarlo para siempre. Su nota
     * depende sólo de cuánto tarda en morir.
     *
     * Se podría «arreglar» dando recompensa por acercarse. Sería cambiar el juego
     * para contentar al instrumento: la persona tampoco cobra por acercarse, y
     * las dos puertas volverían a jugar a cosas distintas, que es justo lo que se
     * acaba de arreglar. Así que se declara y no se toca.
     *
     * Lo que sí se dice, porque es verdad y es medible: con un piloto competente
     * los tres separan perfectamente. No están rotos: son difíciles.
     */
    'alisa/RaccoonSpace-v0':
        'la recompensa está detrás de NAVEGAR y ninguna política ciega llega a escanear. '
      + 'Con el piloto de `calibrar_busca.mjs` gana el 52% de las partidas',
    /**
     * ⚠️ Y EL PLANETA HA VUELTO A ENTRAR AQUÍ. TERCERA VEZ, Y CON MOTIVO NUEVO.
     *
     * Estuvo declarado, se quitó porque separaba de verdad, y vuelve. Lo que
     * cambió en medio: hasta el 24-08 esta etapa se pilotaba como una NAVE
     * —empuje cartesiano sobre una esfera— porque el banco le daba los verbos de
     * la etapa 6. La página, mientras, dejaba escanear desde cualquier sitio. Al
     * unirlas quedó lo que de verdad es: un satélite que se mueve en latitud,
     * longitud y altura, y que tiene que ponerse ENCIMA y BAJAR para escanear.
     *
     * Con eso, una política ciega no llega nunca — igual que en el espacio. No es
     * que la etapa se haya roto: es que antes se estaba midiendo otra cosa.
     *
     * ⚠️ Y NO SE ARREGLA CON EL ALCANCE DEL ESCÁNER. Lo probé: de 25 a 70, que
     * además tiene sentido físico —un escáner orbital no es la cámara de un
     * dron—. Las siete políticas siguieron sacando -100 clavado. Subir un número
     * hasta que el instrumento calle es lo contrario de medir, así que se
     * revirtió y se declara.
     */
    'alisa/RaccoonPlanet-v0':
        'el satélite tiene que ponerse encima Y bajar la órbita para escanear, y ninguna '
      + 'política ciega lo consigue. Con el piloto de `calibrar_busca.mjs` gana el 72%',
    /**
     * ⚠️ Y AQUÍ DECLARÉ DE MÁS: metí también a `RaccoonCity` y `RaccoonPlanet`
     * dando por hecho que si el hermano grande no separa, los pequeños tampoco.
     * La prueba lo cantó en la pasada siguiente —«ya separan y siguen
     * declarados»— y tenía razón: en un sitio pequeño y con doce objetivos, una
     * política ciega SÍ tropieza con algo que escanear de vez en cuando.
     *
     * Declarar de más es tan malo como declarar de menos: una lista de
     * excepciones con nombres que no hacen falta deja de leerse.
     */
};
/**
 * ⚠️ `sokoban` TAMBIÉN ESTUVO AQUÍ, Y TAMBIÉN ERA MENTIRA MÍA.
 *
 * Entró como «el generador reparte instancias triviales». No hay generador: hay
 * ocho niveles escritos a mano, de fácil a difícil, y el primero es `#@$.#` —un
 * tutorial de una jugada— que la semilla 1234 escoge. Uno de ocho es 12,5%, y
 * las 200 semillas que medí daban 14%. Cuadraba, y yo leí el número como un
 * defecto en vez de como la lista de niveles funcionando.
 *
 * Se arregló probando más de una semilla, que era el fallo de verdad: juzgar un
 * entorno cuya partida depende de la semilla mirando UNA sola.
 */
/**
 * ⚠️ `RaccoonSpace` ESTUVO AQUÍ Y SE HA IDO, QUE ES LO QUE TIENE QUE PASAR.
 *
 * Entró con la nota «la recompensa está detrás de NAVEGAR: `escanear` sólo se
 * ofrece con un planeta al alcance, y ninguna política ciega llega». Era verdad
 * con las tres sondas tontas. Con el bandido —que aprende qué verbo paga— y con
 * su horizonte de verdad, separa. La excepción duró exactamente lo que tardó el
 * instrumento en mejorar, que es lo que debe durar una excepción.
 */

const ENTORNOS = Object.fromEntries(CATALOGO.map(e => [e.id, e.cargar]));

/**
 * ⚠️ EL HORIZONTE LO DICE EL ENTORNO, NO YO.
 *
 * `meta.horizon` lo escribió quien hizo el entorno y va de 150 a 5400. Medir a
 * todos con el mismo número es preguntarle a un maratón cómo va a los cien
 * metros. El tope existe sólo para que la prueba no tarde una eternidad, y
 * cuando corta, se dice — cortar en silencio sería la mentira de siempre.
 */
const TOPE_PASOS = 3000;
const horizonteDe = (Clase) => Math.min(Number(Clase.meta?.horizon) || 600, TOPE_PASOS);

/** Un azar barato y sembrado: la misma política da siempre la misma partida. */
function azar(semilla) {
    let x = semilla >>> 0 || 1;
    return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
}

/**
 * Las políticas. Las tres primeras son estructurales y baratas; las de azar
 * exploran de verdad; y el bandido APRENDE cuál de los verbos paga, que es lo
 * más parecido a un jugador competente que se puede escribir sin saber el juego.
 */
function politicas() {
    const lista = [
        { nombre: 'ciclo',   elegir: (v, i) => v[i % v.length] },
        { nombre: 'primera', elegir: (v) => v[0] },
        { nombre: 'ultima',  elegir: (v) => v[v.length - 1] },
    ];
    for (const s of [1, 7, 99]) {
        const r = azar(s);
        lista.push({ nombre: `azar${s}`, elegir: (v) => v[Math.floor(r() * v.length) % v.length] });
    }
    /**
     * El bandido: se queda con el verbo que mejor media de recompensa lleva, y
     * de vez en cuando prueba otro. No sabe jugar a nada, pero encuentra la
     * palanca que paga — y con eso basta para separar a un entorno de uno plano.
     */
    const memoria = new Map();
    const r = azar(4242);
    lista.push({
        nombre: 'bandido',
        elegir: (v) => {
            if (r() < 0.15) return v[Math.floor(r() * v.length) % v.length];
            let mejor = v[0], mejorNota = -Infinity;
            for (const o of v) {
                const m = memoria.get(o.verb);
                const nota = m ? m.suma / m.n : 0.001;   // lo no probado, un pelín mejor que 0
                if (nota > mejorNota) { mejorNota = nota; mejor = o; }
            }
            return mejor;
        },
        aprender: (verbo, premio) => {
            const m = memoria.get(verbo) ?? { suma: 0, n: 0 };
            m.suma += premio; m.n++;
            memoria.set(verbo, m);
        },
    });
    return lista;
}

/** Las dos formas VÁLIDAS de mandar una jugada. Ver la nota de abajo. */
const FORMAS = [['action', (o) => o.action], ['verb', (o) => o.verb]];

function correr(Clase, comoMandar, pasosMax, semilla = 1234) {
    const notas = [], trazas = [];
    for (const pol of politicas()) {
        const env = new Clase();
        env.reset(semilla);
        let r = 0;
        const traza = [];
        for (let i = 0; i < pasosMax; i++) {
            const v = env.affordances();
            if (!v.length) break;
            const o = pol.elegir(v, i);
            // La traza guarda las TRES señas: verbo, argumentos y acción nativa.
            // Con sólo `args` —que muchos entornos dejan vacío— dos jugadas
            // distintas parecían la misma, y salía «no hay nada que elegir»
            // para entornos con siete opciones por paso.
            traza.push(JSON.stringify([o.verb, o.args ?? null, o.action ?? null]));
            let paso;
            try { paso = env.step(comoMandar(o)); } catch { break; }
            const premio = paso?.reward ?? 0;
            pol.aprender?.(o.verb, premio);
            r += premio;
            if (paso?.done) break;
        }
        notas.push(r); trazas.push(traza.join('|'));
    }
    return {
        notas,
        jugadas: new Set(trazas).size,
        separa: new Set(notas.map(x => x.toFixed(3))).size,
    };
}

console.log('\n¿Le da este entorno la misma nota a todo el mundo?\n');

const fallos = [];
const planos = [], vivos = [];
let cortados = 0;

for (const e of CATALOGO) {
    let Clase;
    try { Clase = await ENTORNOS[e.id](); }
    catch (err) { fallos.push(`${e.id}: no se pudo cargar (${err.message.slice(0, 50)})`); continue; }

    const pasos = horizonteDe(Clase);
    if ((Number(Clase.meta?.horizon) || 0) > TOPE_PASOS) cortados++;

    let mejor = null;
    for (const [nombre, f] of FORMAS) {
        const r = correr(Clase, f, pasos);
        if (!mejor || r.separa > mejor.separa) mejor = { ...r, forma: nombre, pasos, semilla: 1234 };
    }

    /**
     * ⚠️ UNA SOLA SEMILLA NO JUZGA A UN ENTORNO CUYA PARTIDA DEPENDE DE ELLA.
     *
     * `sokoban` tiene ocho niveles y la semilla elige cuál. El primero es
     * `#@$.#` — jugador, caja y destino en fila: un TUTORIAL que se resuelve de
     * una jugada. La semilla 1234 cae justo en él, así que la prueba medía a
     * sokoban en un nivel de un movimiento y concluía que no distingue a nadie.
     * Uno de ocho niveles, 12,5%, y medido sobre 200 semillas: 14%. Cuadra.
     *
     * No estaba roto ni el entorno ni el generador: estaba roto juzgar por una
     * sola muestra. Sólo se prueban más semillas con los que salen planos, que
     * es donde la duda existe y donde el rato extra se paga solo.
     */
    if (mejor.separa === 1) {
        for (const s of [7, 99, 2026]) {
            for (const [nombre, f] of FORMAS) {
                const r = correr(Clase, f, pasos, s);
                if (r.separa > mejor.separa) mejor = { ...r, forma: nombre, pasos, semilla: s };
            }
            if (mejor.separa > 1) break;
        }
    }

    (mejor.separa > 1 ? vivos : planos).push([e.id, mejor]);
}

for (const [id, m] of planos) {
    const razon = NO_SEPARAN[id];
    console.log(`  ${razon ? '·' : '✗'} ${id.padEnd(30)} ${m.notas[0].toFixed(1)} `
              + `las ${m.notas.length} politicas  (horizonte ${m.pasos}, ${m.jugadas} partidas distintas, `
              + `4 semillas probadas)`);
    if (razon) console.log(`      ${razon}`);
    else fallos.push(`${id}: ${m.notas.length} políticas distintas sacan ${m.notas[0].toFixed(1)} todas`
                   + ' — no se ha conseguido que este entorno distinga a un jugador de otro');
}

console.log(`\n  ${vivos.length}/${CATALOGO.length} entornos dan notas distintas a políticas distintas`);
console.log(`  ${planos.length} no separan (declarados: ${Object.keys(NO_SEPARAN).length})`);
if (cortados) {
    console.log(`  ⚠️ ${cortados} entorno(s) declaran un horizonte mayor que el tope de ${TOPE_PASOS}`
              + ' y se han medido cortados');
}

const sobran = Object.keys(NO_SEPARAN).filter(id => !planos.some(([p]) => p === id));
if (sobran.length) {
    console.log(`\n  ↓ estos ya separan y siguen declarados: ${sobran.join(', ')}`);
    console.log('    Quítalos de NO_SEPARAN — una lista de excepciones que no se limpia deja de ser una lista.');
}

/**
 * CONTROL POSITIVO. Si esto midiera mal y diera «todos separan», el número de
 * arriba saldría perfecto y no significaría nada. Se exige que la mayoría separe:
 * si no lo hace, antes de creer que el banco está roto, sospecha de esta prueba —
 * que ya se equivocó una vez, y en grande.
 */
if (vivos.length < CATALOGO.length / 2) {
    fallos.push('CONTROL POSITIVO FALLIDO: menos de la mitad de los entornos separan. '
              + 'Antes de creer que el banco entero está roto, sospecha de esta prueba.');
}

if (fallos.length) {
    console.log(`\n✗ ${fallos.length} fallo(s):`);
    fallos.forEach(f => console.log(`    · ${f}`));
    process.exit(1);
}
console.log('\n✓ los entornos que puntúan, puntúan; y los que no, están declarados con lo medido\n');
