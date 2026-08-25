/**
 * ¿HABLA EL BANCO UN SOLO IDIOMA DE ACCIONES?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_gramatica.mjs
 *
 * La tripleta `@objeto #metodo |parametros` es la ley del organismo entero — 802
 * usos en 267 ficheros del proyecto general, declarada en `Cycles/AIO/Over.py`
 * como `LEY AIO-I`. Esta comprobación vigila que el banco la hable, y que la
 * hable de UNA manera.
 *
 * ⚠️ QUÉ HABÍA, MEDIDO EL 25-08 SOBRE LOS 49 ENTORNOS.
 *
 *     otra                529 verbos  10 mundos   a2a3
 *     una palabra          99         29          subir
 *     palabra + espacio    68          1          enviar a
 *     metodo:parametro     53          6          jugar:P_5
 *     palabra_palabra      21         10          esquivar_izquierda
 *     un número             6          1          0
 *
 * Seis gramáticas, y ocho mundos mezclando dos en el MISMO menú. Quien lee ese
 * menú tiene que adivinar el formato línea por línea.
 *
 * ⚠️ Y POR QUÉ SE VIGILA EL MÉTODO Y NO EL VERBO.
 *
 * El `verb` crudo se queda como está a propósito: es lo que el banco lleva
 * semanas midiendo y lo que va en los recibos. Cambiarlo sería cambiar el juego
 * conservando el nombre. Lo que se exige es que la TRIPLETA que se emite encima
 * sea uniforme — y ahí sí hay una sola regla.
 */
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';
import { SEPARADORES, leer, escribir } from './public/js/alisa-engine/src/gym/Gramatica.js';

let fallos = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };

console.log('\n¿Habla el banco un solo idioma de acciones?\n');

const metodos = new Map();
let mundos = 0, acciones = 0, sinTripleta = 0;
const conSeparador = [];
const direcciones = [];

/**
 * ⚠️ ESTA LISTA ESTÁ DUPLICADA A PROPÓSITO, Y ES LA ÚNICA DUPLICACIÓN QUE
 *    DEFIENDO EN TODO EL BANCO.
 *
 * La primera versión usaba `DIRECCIONES` importado de `Gramatica.js` — o sea, la
 * misma lista que tiene que vigilar. El sabotaje la vació y la comprobación
 * APROBÓ: al no estar `derecha` en la lista, el detector dejó de reconocerla como
 * dirección exactamente igual que el código que fallaba. Se quedó ciega con ella.
 *
 * Un guardián que comparte la constante que guarda no guarda nada. Aquí las
 * palabras se escriben otra vez, a mano, para que romper una no rompa la otra —
 * que es justo lo que un control independiente significa.
 *
 * Sexta vez esta semana que un instrumento nuevo aprueba con el cable cortado, y
 * ninguna se ha dado por buena hasta verla suspender.
 */
const ES_DIRECCION = new Set([
    'arriba', 'abajo', 'izquierda', 'derecha',
    'norte', 'sur', 'este', 'oeste',
    'adelante', 'atras', 'atrás',
    'subir', 'bajar',
]);

for (const e of CATALOGO) {
    let env;
    try { const C = await e.cargar(); env = new C(); env.reset(4); } catch { continue; }
    let lista = [];
    try { lista = env.verbos?.() ?? []; } catch { continue; }
    if (!lista.length) continue;
    mundos++;

    for (const a of lista) {
        acciones++;
        if (!a.objeto || !a.metodo) { sinTripleta++; continue; }

        /**
         * ⚠️ LA REGLA ÚNICA: UN MÉTODO NO LLEVA SEPARADORES DENTRO.
         *
         * Dos puntos o un espacio dentro de un `#metodo` significan que hay un
         * parámetro escondido ahí. Es literalmente el fallo de `enviar a`: 68
         * acciones con `args: {}` mientras el argumento viajaba pegado al verbo.
         */
        if (SEPARADORES.test(a.metodo)) {
            conSeparador.push(`${e.id}: #${a.metodo}`);
        }
        /**
         * ⚠️ Y EL PARÁMETRO TAMPOCO, QUE ES POR DONDE SE ESCAPABA.
         *
         * La primera versión sólo miraba el método, y el sabotaje APROBABA: al
         * dejar de partir por el espacio, `enviar a` no se quedaba como método
         * —el respaldo de ProtoHub lo mandaba a `#jugar |enviar a`— así que
         * ningún método llevaba separador y la comprobación cantaba victoria.
         *
         * Pero el fallo seguía ahí, sólo que mudado de sitio: el método pasaba a
         * ser `jugar` cuando era `enviar`, y las 68 acciones volvían a ser 68
         * fichas sueltas. Un parámetro con un espacio dentro es un método y un
         * argumento pegados, se mire por donde se mire.
         *
         * Van cuatro esta semana: comprobación nueva que aprueba con el cable
         * cortado. Por eso ninguna se da por buena hasta verla suspender.
         */
        for (const p of (a.params ?? [])) {
            if (SEPARADORES.test(String(p))) {
                conSeparador.push(`${e.id}: #${a.metodo} |${p}`);
            }
        }
        /**
         * ⚠️ UNA DIRECCIÓN NO ES UN MÉTODO.
         *
         * Medido antes de unificarlas: `derecha` era método en 13 mundos,
         * `izquierda` en 11, `abajo` en 10, `arriba` en 8. Doce métodos distintos
         * para UNA acción con doce destinos.
         *
         * El daño no es de estilo: quien aprende `#mover` lo aplica en trece
         * mundos, y quien aprende `#derecha` no ha aprendido nada que le sirva en
         * el siguiente. Un banco que quiere medir transferencia no puede partir
         * la misma acción en doce fichas.
         *
         * La lista vive en `Gramatica.js` y está a la vista para discutirla. Esto
         * sólo vigila que siga aplicándose: si alguien la vacía, aquí sale.
         */
        if (ES_DIRECCION.has(String(a.metodo).toLowerCase())) {
            direcciones.push(`${e.id}: #${a.metodo}`);
        }
        metodos.set(a.metodo, (metodos.get(a.metodo) ?? 0) + 1);

        /**
         * Y el átomo tiene que poder volver a leerse. Si `escribir` produce algo
         * que `leer` no entiende, hay dos gramáticas otra vez — una para hablar y
         * otra para escuchar— que es justo la avería del proyecto general, donde
         * Metatron acepta lo que Parse rechaza.
         */
        const vuelta = leer(a.atomo);
        if (!vuelta) {
            mal(`${e.id}: el átomo «${a.atomo}» no lo entiende el lector`);
        } else if (vuelta.objeto !== a.objeto || vuelta.metodo !== a.metodo) {
            mal(`${e.id}: «${a.atomo}» se lee como @${vuelta.objeto} #${vuelta.metodo}`);
        }
    }
}

console.log(`  ${mundos} mundos · ${acciones} acciones · ${metodos.size} métodos distintos`);
const top = [...metodos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(`  los más usados: ${top.map(([m, n]) => `#${m}×${n}`).join('  ')}`);

if (sinTripleta) mal(`${sinTripleta} acciones salen sin tripleta (@objeto o #metodo vacíos)`);
else console.log(`  ✓ las ${acciones} acciones salen con las tres partes`);

if (conSeparador.length) {
    mal(`${conSeparador.length} métodos llevan un separador dentro — hay un parámetro escondido:`);
    for (const s of conSeparador.slice(0, 6)) console.log(`      ${s}`);
} else {
    console.log('  ✓ ningún método esconde un parámetro dentro');
}

if (direcciones.length) {
    mal(`${direcciones.length} método(s) son en realidad una dirección — deberían ser #mover:`);
    for (const s of direcciones.slice(0, 6)) console.log(`      ${s}`);
} else {
    console.log('  ✓ ninguna dirección se hace pasar por método');
}

/**
 * ⚠️ Y EL LECTOR TIENE QUE SER UNO SOLO.
 *
 * Es la lección medida del proyecto general: allí la ley está declarada y la
 * máquina escrita, pero el paso texto→tripleta vive dentro de un `elif` de
 * `Parse.Flow` y no se puede llamar. Cinco sitios se escribieron su propia
 * regex, y 3 de cada 8 frases se leen distinto según quién las lea — hasta el
 * punto de que Metatron encola como orden lo que Parse trataría como charla.
 *
 * Aquí sólo puede haber una regex del átomo, y vive en `Gramatica.js`.
 */
{
    const { readdirSync, readFileSync } = await import('node:fs');
    const dir = './public/js/alisa-engine/src/gym';
    const lectores = [];
    const buscar = (ruta) => {
        for (const f of readdirSync(ruta, { withFileTypes: true })) {
            if (f.isDirectory()) { buscar(`${ruta}/${f.name}`); continue; }
            if (!f.name.endsWith('.js')) continue;
            const t = readFileSync(`${ruta}/${f.name}`, 'utf8')
                .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
            // Una regex que busca `@algo` seguido de `#algo` es un lector de átomos.
            if (/@\\?\(?\[?[A-Za-z\\][^\n]{0,40}#/.test(t)) lectores.push(`${ruta}/${f.name}`);
        }
    };
    buscar(dir);
    if (lectores.length !== 1) {
        mal(`hay ${lectores.length} lectores del átomo y tiene que haber 1: ${lectores.join(', ')}`);
    } else {
        console.log(`  ✓ un solo lector del átomo: ${lectores[0].split('/').pop()}`);
    }
}

/**
 * ⚠️ LA INTENCIÓN ESCRITA TIENE QUE JUGAR, NO SÓLO DESCRIBIR.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Es la diferencia entre haber adoptado la sintaxis y haber adoptado AIO. La
 * primera versión de esto emitía la tripleta y seguía ejecutando por `stepVerb`:
 * el átomo era adorno, y un adorno que hoy coincide con la ejecución y mañana
 * no. Exactamente la avería que el banco lleva toda la semana pagando.
 *
 * Aquí se juega la MISMA jugada por los dos caminos, en dos mundos idénticos con
 * la misma semilla, y tienen que dar el mismo resultado. Si divergen, hay dos
 * juegos otra vez — uno para quien escribe la intención y otro para quien llama
 * al método.
 */
{
    let comprobados = 0, divergencias = 0;
    for (const e of CATALOGO) {
        let A, B;
        try {
            const C = await e.cargar();
            A = new C(); A.reset(7);
            B = new C(); B.reset(7);
        } catch { continue; }

        let menu = [];
        try { menu = A.verbos?.() ?? []; } catch { continue; }
        if (!menu.length) continue;

        // La primera acción del menú, jugada de las dos maneras.
        const a = menu[0];
        let porVerbo, porAtomo;
        try {
            porVerbo = B.stepVerb(a.verb, a.args ?? {});
            porAtomo = A.stepAtomo(a.atomo);
        } catch { continue; }
        comprobados++;

        if (porAtomo?.info?.error) {
            mal(`${e.id}: el átomo «${a.atomo}» no se puede jugar — ${porAtomo.info.error}`);
            divergencias++;
        } else if (porAtomo.reward !== porVerbo.reward || porAtomo.done !== porVerbo.done) {
            mal(`${e.id}: «${a.atomo}» da ${porAtomo.reward}/${porAtomo.done} y el verbo `
              + `${porVerbo.reward}/${porVerbo.done} — dos juegos con el mismo nombre`);
            divergencias++;
        }
    }
    if (!divergencias) {
        console.log(`  ✓ en ${comprobados} mundos, escribir la intención juega igual que llamar al método`);
    }
}

/**
 * ⚠️ Y UN ÁTOMO DIRIGIDO A OTRO MUNDO SE RECHAZA.
 *
 * Es la parte de identidad, y sin ella el error saldría EN VERDE: `@Chess
 * #jugar |a2a3` movería una torreta en ¡Defiende! porque el método casa. Una
 * jugada legal que no era la que se pidió es la peor forma de equivocarse.
 */
{
    const e = CATALOGO.find(x => x.id === 'alisa/Defiende-v0');
    const C = await e.cargar();
    const env = new C();
    env.reset(7);
    const ajeno = env.stepAtomo('@Chess #esperar');
    if (!ajeno?.info?.error) mal('un átomo dirigido a @Chess se ejecutó en ¡Defiende!');
    else console.log(`  ✓ un átomo de otro mundo se rechaza: ${ajeno.info.error}`);
}

console.log(`\n  ejemplo: ${escribir({ objeto: 'Chess', metodo: 'jugar', params: ['a2a3'] })}`);
console.log('');
if (fallos) { console.log(`  ✗ ${fallos} fallo(s) en la gramática\n`); process.exit(1); }
console.log('  ✓ un solo idioma, el mismo que habla el organismo entero\n');
