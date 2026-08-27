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
import { CATALOGO } from './public/js/alisa-engine/src/gym/registry.js';

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
    'alisa/RaccoonSpace-v1':
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
    'alisa/RaccoonPlanet-v1':
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
    /**
     * ⚠️ AQUÍ ESTUVO `alisa/CorpStealth-v0` UN DÍA, Y SE VA PORQUE YA SEPARA.
     *
     * Entró el 26-08 con las siete políticas a cero: registrar exige estar al
     * lado, mirando y con luz, y ninguna política ciega junta las tres. Al día
     * siguiente esta prueba avisó —«ya separan y siguen declarados»— y tenía
     * razón. Lo que cambió en medio: la recompensa dejó de cobrar por abrir un
     * mueble y pasó a sumar, así que las políticas que tropiezan con uno ya no
     * empatan con las que se quedan quietas.
     *
     * Se quita el mismo día que lo dice. Una lista de excepciones que no se
     * limpia deja de leerse, y entonces protege lo que no debe.
     *
     * ⚠️ EL DE UN BOTÓN: NO HAY NADA QUE DEDUCIR, Y AUN ASÍ NINGUNA CIEGA PASA UN MURO.
     *
     * Es el caso más raro de esta lista y por eso conviene contarlo. En los del
     * mapache la recompensa está detrás de NAVEGAR, y se entiende que una
     * política ciega no llegue. Aquí está a la vista: dos verbos, seis números, y
     * el primer muro llega a los cuatro segundos.
     *
     * Y aun así las siete sacan -1,0, porque **ninguna aguanta un segundo**: la
     * que siempre impulso se estrella contra el techo en 0,9 s y la que nunca
     * impulso contra el suelo en 0,8. Las partidas SÍ salen distintas —la prueba
     * cuenta siete— pero morir en 0,8 o en 0,9 no es una diferencia de destreza,
     * es ruido.
     *
     * Lo que separa aquí está medido y no es reflejo bruto: es saberse la propia
     * física. Un empujon sube siempre `impulso² / 2g` = 2,40, así que quien apunta
     * al CENTRO del hueco se sale por arriba justo esa cantidad.
     *
     *     conoce su empujon y apunta medio por debajo   42,3 muros
     *     apunta al centro del hueco                    0,9 muros
     *     se mantiene a media altura                    0,4 muros
     *
     * De 0,9 a 42 con un cambio de 1,2 unidades en el objetivo. Eso es lo que
     * mide, y no lo alcanza nadie sin mirar dónde está el hueco.
     */
    'alisa/Impulso-v0':
        'ninguna política ciega aguanta un segundo —la que impulso siempre se estrella contra '
      + 'el techo en 0,9 s— así que las siete mueren antes del primer muro. Con un piloto que '
      + 'apunta medio empujon por debajo del hueco pasa 42,3 muros; apuntando al centro, 0,9',
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
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ Y EL TOPE LO DECIDE LA FAMILIA, QUE HASTA HOY NO LA LEÍA NADIE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Había un solo tope, 3.000, y esta misma prueba llevaba días avisando de que
 * **ocho entornos se medían cortados**. El aviso era correcto y el arreglo no
 * era subir el número a ojo: es que 3.000 no significa lo mismo en un juego de
 * turnos que en uno de tiempo real. CorpBuilding declara 40 y ¡Impulso! 7.200.
 *
 * La distinción ya estaba declarada —cada cartucho tiene su `familia` en la
 * `static ROM` y los treinta del ProtoHub la traen del adaptador— y **no la
 * consumía ni una línea de código**. Un campo que se escribe y no se lee acaba
 * mintiendo, porque nadie se entera cuando se equivoca.
 *
 * Ahora manda aquí:
 *
 *     turnos       400   una partida de tablero cabe de sobra
 *     tiempo_real 7200   dos minutos a 60 Hz, que es lo que declaran los largos
 *
 * El tope sigue existiendo para que la prueba no tarde una eternidad, y cuando
 * corta se sigue diciendo.
 */
const TOPES = { turnos: 400, tiempo_real: 7200 };
const TOPE_SIN_FAMILIA = 3000;

/**
 * La familia de un entorno: la suya propia si la declara, y si no la del
 * cartucho que monta. Devuelve `null` cuando nadie lo ha dicho — y eso se
 * cuenta, en vez de adivinarlo: inferir «esto parece de turnos» es cómo se
 * fabrica una etiqueta que nadie ha verificado.
 */
export function familiaDe(Clase) {
    return Clase?.familia ?? Clase?.Core?.ROM?.familia ?? null;
}

const horizonteDe = (Clase) => {
    const tope = TOPES[familiaDe(Clase)] ?? TOPE_SIN_FAMILIA;
    return Math.min(Number(Clase.meta?.horizon) || 600, tope);
};

/** Un azar barato y sembrado: la misma política da siempre la misma partida. */
/**
 * ⚠️ EL SUELO YA NO VIVE AQUÍ.
 *
 * Estaba escrito aquí y COPIADO en creditar.mjs, y las dos copias habían
 * divergido el mismo día: semillas [1,7,99] contra [1,7,42], bandido con
 * exploración contra bandido sin ella. Un recibo se juzgaba contra una vara y
 * la tabla se publicaba con otra.
 *
 * Ahora vive en lisa-engine/src/gym/baseline.js y lo importa quien lo necesite.
 * Ésta es la canónica —la que produjo el «46 de 49»— y por eso se movió tal cual,
 * sin tocar ni una semilla: si el suelo cambia, ese número deja de significar lo
 * que dice.
 */
import { blindPolicies as politicas } from './public/js/alisa-engine/src/gym/baseline.js';
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
const sinFamilia = [];

for (const e of CATALOGO) {
    let Clase;
    try { Clase = await ENTORNOS[e.id](); }
    catch (err) { fallos.push(`${e.id}: no se pudo cargar (${err.message.slice(0, 50)})`); continue; }

    const familia = familiaDe(Clase);
    if (!familia) sinFamilia.push(e.id);
    const pasos = horizonteDe(Clase);
    if ((Number(Clase.meta?.horizon) || 0) > pasos) cortados++;

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

/**
 * ⚠️ AQUÍ SE PUBLICA, Y ES A PROPÓSITO QUE LO HAGA EL QUE MIDE.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Los nueve mundos propios —los del patrón oro, en los que llevo semanas— no
 * tenían NI UNA nota publicada. La clasificación del sitio son los 40 de arcade,
 * que se enfrentan en torneo; los propios se juegan en solitario y no caben en
 * esa tabla, así que se habían quedado fuera sin que nadie lo dijera.
 *
 * Lo obvio habría sido escribir `tabla_mundos.mjs`. Y habría sido el fallo del
 * día otra vez: un segundo medidor que se separa del primero. Ya me pasó esta
 * misma tarde con las políticas ciegas —dos copias, semillas distintas— y la
 * página de clasificación ya se separó ocho días de su JSON en agosto.
 *
 * Así que publica QUIEN MIDE. Este fichero corre en cada `npm test`, así que el
 * número medido y el número publicado no pueden separarse: son la misma línea.
 *
 * Se guarda lo que hace falta para que una nota signifique algo: contra qué suelo
 * se midió, con cuántos pasos, con qué forma de mandar la jugada, y si el entorno
 * separa. Una nota sin eso es un número suelto.
 */
{
    const { writeFile, mkdir } = await import('node:fs/promises');
    const filas = [...vivos, ...planos]
        .map(([id, m]) => ({
            id,
            familia: CATALOGO.find(e => e.id === id)?.familia ?? '?',
            separa: m.separa > 1,
            /** Las siete notas ciegas, en el orden de `blindPolicies()`. */
            suelo: m.notas.map(n => Math.round(n * 1000) / 1000),
            mejorCiega: Math.max(...m.notas),
            peorCiega: Math.min(...m.notas),
            pasos: m.pasos,
            semilla: m.semilla,
            forma: m.forma,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

    await mkdir(new URL('./public/data/', import.meta.url), { recursive: true });
    await writeFile(new URL('./public/data/suelo_por_entorno.json', import.meta.url),
        JSON.stringify({
            _que_es: 'Contra qué suelo se mide cada entorno. Una nota sólo significa algo '
                   + 'comparada con estas siete políticas ciegas, en el mismo mundo, con la '
                   + 'misma semilla y el mismo horizonte. Ver acreditar.mjs.',
            _suelo: 'alisa-engine/src/gym/baseline.js — ciclo, primera, ultima, azar1, azar7, azar99, bandido',
            _medido_por: 'prueba_senal.mjs, en cada npm test. Publica quien mide, para que no se separen.',
            propios: filas.filter(f => f.familia === 'propio').length,
            total: filas.length,
            entornos: filas,
        }, null, 2) + '\n', 'utf8');
    console.log(`\n  ✎ publicado public/data/suelo_por_entorno.json `
              + `(${filas.filter(f => f.familia === 'propio').length} propios de ${filas.length})`);
}

console.log(`\n  ${vivos.length}/${CATALOGO.length} entornos dan notas distintas a políticas distintas`);
console.log(`  ${planos.length} no separan (declarados: ${Object.keys(NO_SEPARAN).length})`);
if (cortados) {
    console.log(`  ⚠️ ${cortados} entorno(s) declaran un horizonte mayor que el tope de su familia`
              + ' y se han medido cortados');
}

/**
 * ⚠️ TRINQUETE: LOS QUE NO DICEN DE QUÉ FAMILIA SON. **SÓLO PUEDE BAJAR.**
 *
 * Un entorno sin familia se mide con el tope genérico, que es el que llevaba
 * cortando a ocho. No es un fallo —hay entornos viejos que nacieron antes de que
 * existiera el campo— pero es deuda, y la deuda que no se cuenta no se paga.
 *
 * Medido el 27-08 al enchufar la familia por primera vez.
 */
const TECHO_SIN_FAMILIA = 1;
console.log(`\n  entornos que no declaran familia: ${sinFamilia.length} (techo: ${TECHO_SIN_FAMILIA})`);
if (sinFamilia.length) console.log(`    ${sinFamilia.join(', ')}`);
if (sinFamilia.length > TECHO_SIN_FAMILIA) {
    fallos.push(`${sinFamilia.length} entorno(s) no declaran familia y se miden con el tope genérico: `
              + sinFamilia.join(', '));
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
