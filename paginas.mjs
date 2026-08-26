/**
 * paginas.mjs — ¿CUÁNTO CÓDIGO PROPIO TIENE CADA PÁGINA?
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run paginas
 *
 * El patrón dorado de una página, dicho del derecho: **no debería saber hacer
 * casi nada**. Compone piezas compartidas —el sustrato, un pintor, una factoría,
 * `montarMundo`— y aporta cosmética. Ni reglas, ni dibujo, ni física.
 *
 * ⚠️ POR QUÉ SE MIDE, Y NO SE DEJA COMO BUENA INTENCIÓN.
 *
 * Una página con lógica propia acierta el día que se escribe y se separa
 * después. Es lo que pasó con ¡Busca!: sus tres páginas llevaban el juego
 * escrito dentro mientras el banco medía otro motor, y la persona y el agente
 * jugaron dos juegos con el mismo nombre durante semanas.
 *
 * `defiende_sendero.html` acaba de pasar por esto: sus cuarenta líneas de lienzo
 * se fueron a `PintorMatriz` y lo único que le queda es qué emoji lleva cada
 * torreta. Ese es el listón.
 *
 * LO QUE SE CUENTA
 *   propio     líneas de código en sus `<script type="module">`
 *   compone    cuántas piezas compartidas importa
 *   señales    marcas de que hace algo que no le toca: pintar a mano en un
 *              lienzo, tocar mallas de THREE, o aritmética de simulación
 *   sustrato   si lo que enseña sale de `sustrato()` o se lo saca al motor
 *
 * ⚠️ LAS DOS COLUMNAS NO MIDEN LO MISMO, Y ESA ES LA TRAMPA.
 *
 * `raccoon_planet.html` compone tres piezas compartidas y no dibuja ni una malla
 * — sale «limpia» de sobra. Pero lee el estado del motor por dentro
 * (`nucleo.ciudades[i].escaneada`), no el sustrato. Es exactamente lo que era
 * ¡Busca! cuando la persona y el banco jugaban a dos juegos con el mismo nombre.
 *
 * Componer bien evita duplicar máquina. Leer el sustrato evita duplicar VERDAD.
 * Sólo lo segundo es la tesis, y por eso va en columna aparte.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const DIRS = ['public/games', 'public/labs'];

/** Piezas compartidas: si una página importa esto, está componiendo. */
const COMPARTIDAS = [
    'montarMundo', 'montarMesa', 'pintor_matriz', 'pintor_mundo', 'mesa_tablero',
    'mesa_cartas', 'Factory', 'alisa-engine/src', 'protohub', '/js/sfx',
];

/**
 * ⚠️ SEÑALES DE QUE UNA PÁGINA HACE LO QUE NO LE TOCA.
 *
 * No son pecados por sí solas —una página puede necesitar un `fillRect` para un
 * HUD— pero juntas dibujan el perfil de una página que se ha escrito su propio
 * motor. Se cuentan y se dicen; el juicio es de quien lea.
 */
const SENALES = [
    [/ctx\.(fillRect|arc|fillText|drawImage|beginPath)/g, 'pinta a mano'],
    [/new THREE\.(Mesh|Geometry|\w*Geometry)/g, 'crea mallas'],
    [/\.position\.(set|copy|add)\(/g, 'mueve objetos 3D'],
    [/\bMath\.(hypot|atan2)\(/g, 'hace geometría'],
    [/\*\s*dt\b|\bdt\s*\*/g, 'integra por tiempo'],
];

const filas = [];
for (const d of DIRS) {
    let ficheros = [];
    try { ficheros = readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith('.html')); } catch { continue; }
    for (const f of ficheros) {
        const bruto = readFileSync(path.join(RAIZ, d, f), 'utf8');
        let codigo = '';
        for (const m of bruto.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) codigo += m[1] + '\n';
        if (!codigo.trim()) continue;

        /**
         * Se quitan los comentarios ANTES de contar. En esta casa se comenta
         * mucho a propósito, y contar prosa como código diría que las páginas
         * mejor documentadas son las peores — que es lo contrario de la verdad.
         * (Y ya me ha pasado cuatro veces con otros detectores.)
         */
        const limpio = codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        const propio = limpio.split('\n').filter(l => l.trim()).length;
        const compone = COMPARTIDAS.filter(p => new RegExp(`import[^;]*${p}`).test(limpio)).length;
        const senales = SENALES
            .map(([re, que]) => [(limpio.match(re) ?? []).length, que])
            .filter(([n]) => n > 0);
        /**
         * ⚠️ NO BASTA CON QUE LA PÁGINA NOMBRE EL SUSTRATO: TIENE QUE PINTARLO.
         *
         * La primera versión de esto buscaba `sustrato(` en cualquier parte, y
         * era inútil: ¡Defiende! lo llama en dos sitios —al dibujar y al
         * publicarlo en `window`— así que cambiar el dibujo a `observacion()`
         * seguía dando «sí». El sabotaje habría pasado con el cable cortado, que
         * es el fallo que llevo cometiendo toda la semana con mis propios
         * detectores.
         *
         * Lo que se exige es que el sustrato **entre en la llamada que pinta**.
         * Los dos pintores —plana y 3D— se llaman igual, `pintar(sus)`, así que la
         * regla vale para las dos sin saber cuál usa la página.
         */
        /**
         * ⚠️ Y SE MIRA UN NIVEL MÁS ABAJO, PORQUE COMPONER NO ES DEJAR DE HACERLO.
         *
         * `dron_torre.html` pasó de 89 líneas a 3 delegando en `montarVolumen`, y
         * esta vara la suspendió: dejó de tener `pintar(sustrato)` DENTRO. Pero el
         * sustrato se sigue pintando — una capa más abajo, en la pieza compartida.
         *
         * Suspender a una página por componer es exactamente lo contrario de lo
         * que este fichero existe para premiar, y habría empujado a la siguiente
         * etapa a copiar el bucle otra vez para «aprobar». Un instrumento que
         * castiga lo que quiere fomentar no está midiendo: está estorbando.
         *
         * Así que si la página no lo hace ella, se busca en los módulos propios
         * que importa (`/js/...`). UN nivel, no más: a partir de ahí ya no se
         * puede decir que la página lo enseñe, y una cadena larga escondería que
         * nadie lo hace.
         */
        const pinta = (txt) => /pintar\s*\([^)]*sustrato/.test(txt)
            || (/\b(?:const|let|var)\s+\w+\s*=\s*[^;\n]*sustrato\s*\(/.test(txt)
                && /pintar\s*\(/.test(txt));

        let sustrato = pinta(limpio);
        if (!sustrato) {
            for (const m of limpio.matchAll(/from\s+['"](\/js\/[\w./-]+)['"]/g)) {
                try {
                    const suyo = readFileSync(path.join(RAIZ, 'public', m[1]), 'utf8');
                    if (pinta(suyo)) { sustrato = true; break; }
                } catch { /* un import que no resuelve ya lo dice `prueba_enlaces` */ }
            }
        }
        filas.push({
            f, propio, compone, senales, sustrato,
            esJuego: d === 'public/games',
            peso: senales.reduce((s, [n]) => s + n, 0),
        });
    }
}

filas.sort((a, b) => b.peso - a.peso || b.propio - a.propio);

console.log('\n  ¿Cuánto código propio tiene cada página?\n');
console.log('  página                              propio  compone  sustrato  señales de hacer lo que no le toca');
for (const r of filas) {
    const s = r.senales.map(([n, q]) => `${q}×${n}`).join(', ');
    const sus = r.sustrato ? '   sí   ' : '   no   ';
    console.log(`  ${r.f.padEnd(36)} ${String(r.propio).padStart(6)}  ${String(r.compone).padStart(7)}  ${sus}  ${s || '—'}`);
}

/**
 * ⚠️ EL TECHO SÓLO BAJA.
 *
 * Como el suelo de juegos completos, pero al revés: la suma de «señales» de todas
 * las páginas no puede subir. Una página nueva que se escriba su propio dibujo lo
 * dice aquí, y el día que se limpie una se actualiza a la baja.
 *
 * Medido el 25-08, después de pasar `defiende_sendero.html` a `PintorMatriz`.
 *
 * ⚠️ BAJADO A 340 EL 26-08, Y LA HISTORIA MERECE CONTARSE.
 *
 * La etapa nueva `dron_torre.html` nació escribiéndose su propio estilo de
 * dibujo dentro y subió el total a 349. La tentación era subir el techo ocho
 * puntos «porque la página es nueva». Pero este comentario ya decía para qué
 * existe la vara: «una página nueva que se escriba su propio dibujo lo dice
 * aquí». El aviso no estaba equivocado.
 *
 * El estilo se sacó a `/js/figuras_torre.mjs` —donde además lo puede reusar la
 * siguiente torre— y la página pasó de diez señales a una.
 *
 * ⚠️ Y A 339 CON LA SEGUNDA ETAPA, QUE ES CUANDO SE VIO LA REGLA ENTERA.
 *
 * Al entrar `submarino.html` el total volvió a 341: cada página nueva costaba
 * UNA señal, la de encuadrar su cámara. Con la regla «sólo baja» tal cual,
 * añadir etapas sería imposible sin saltársela — y ése no puede ser el sentido.
 *
 * La salida no fue subir la vara: el ENCUADRE también es aspecto —desde dónde se
 * mira decide tanto como de qué color es cada cosa—, así que se fue con las
 * figuras. Las dos páginas quedaron a CERO señales y el total en 339.
 *
 * O sea que la vara no impedía crecer: impedía crecer mal.
 */
const TECHO_SENALES = 339;
const total = filas.reduce((s, r) => s + r.peso, 0);
console.log(`\n  señales en total: ${total} (techo: ${TECHO_SENALES})`);
console.log(`  ${filas.filter(r => r.peso === 0).length} de ${filas.length} páginas no hacen nada que no les toque`);

/**
 * ⚠️ Y EL SUELO QUE IMPORTA: CUÁNTOS JUEGOS ENSEÑAN EL SUSTRATO.
 *
 * Sólo se exige a `public/games` — los laboratorios son experimentos y no
 * pretenden ser la vista de un juego que el banco también mide. Exigírselo sería
 * medir por medir, y ya me ha pasado cuatro veces acusar a código sano.
 *
 * Medido el 25-08. Sube cuando se enchufa una página; nunca baja.
 *
 * ⚠️ Y SE PONE EN LO MEDIDO, NO EN UN NÚMERO CÓMODO.
 *
 * Estuvo un rato en 1 con dos páginas enchufadas, y con ese margen el sabotaje
 * APROBABA con el cable cortado: se podía romper ¡Defiende! entero y el suelo
 * seguía cumpliéndose gracias a ¡Busca!. Un trinquete con holgura no es un
 * trinquete, es un adorno.
 */
/**
 * ⚠️ 7 → 8 CON `corp_sigilo.html`, QUE NACIÓ ENSEÑÁNDOLO.
 *
 * No es una página que se haya arreglado: es la primera que se escribe ya sobre
 * las piezas compartidas —cartela, HUD, pintor y figuras—, y le salieron 56
 * líneas propias y CERO señales. Es lo que esta vara lleva pidiendo desde que
 * existe, así que sube.
 */
const SUELO_SUSTRATO = 8;
const juegos = filas.filter(r => r.esJuego);
const conSustrato = juegos.filter(r => r.sustrato);
console.log(`\n  juegos que enseñan el sustrato: ${conSustrato.length} de ${juegos.length} (suelo: ${SUELO_SUSTRATO})`);
console.log(`  ${conSustrato.map(r => r.f).join(', ') || '—'}`);
const sinSustrato = juegos.filter(r => !r.sustrato).map(r => r.f);
if (sinSustrato.length) console.log(`  leen el motor por dentro: ${sinSustrato.join(', ')}`);

let mal = 0;
if (total > TECHO_SENALES) { console.log(`\n  ✗ el techo de señales ha subido de ${TECHO_SENALES} a ${total}`); mal++; }
if (conSustrato.length < SUELO_SUSTRATO) { console.log(`\n  ✗ el suelo de sustrato ha bajado de ${SUELO_SUSTRATO} a ${conSustrato.length}`); mal++; }
console.log('');
process.exit(mal ? 1 : 0);
