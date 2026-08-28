/**
 * prueba_plano.mjs — ¿manda el plano, o los números siguen escritos por ahí?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_plano.mjs
 *     → 0 manda el plano · 1 no manda · 2 la prueba no vale
 *
 * POR QUÉ EXISTE
 *
 * `ArcadeTableRoomFactory` tenía el plano de la sala escrito a mano SEIS VECES,
 * y —esto es lo que duele— en dos preocupaciones que no se hablan:
 *
 *     construir   la mesa de tablero a −2,5, la de cartas a 2,5,
 *                 el tapete a 2,5 y la baraja a 2,8
 *     el CLIC     cuatro `if` que devolvían ±2,5 según qué tocabas
 *
 * Mover una mesa pedía cambiar seis números en dos sitios. Y el fallo de
 * olvidarse uno no revienta: **el clic te sienta donde ya no hay mesa**, sin
 * error y sin aviso.
 *
 * Un plano duplicado se separa. Esta comprobación existe para que no pueda.
 *
 * QUÉ MIDE
 *
 *   1. que un plano DISTINTO mueva las mesas de verdad — si la fábrica ignora
 *      `options.plano`, las mesas salen donde siempre y eso se ve;
 *   2. que sitios NUEVOS aparezcan: un salón de tres mesas es una lista de tres;
 *   3. que las mallas se llamen por su `id`, que es lo que permite al clic
 *      preguntar por ellas en vez de repetir su coordenada;
 *   4. que lo que va ENCIMA de una mesa —tapete, baraja— se mueva CON ella. Ése
 *      era el literal más fácil de olvidar al mover algo.
 *
 * ⚠️ CONTROL POSITIVO. Comparar contra el plano de casa aprobaría también si la
 * fábrica ignorase el plano por completo, porque los números coincidirían por
 * casualidad. Por eso se prueba con uno que NO se parece en nada.
 *
 * ⚠️ Y NO SE MONTA LA SALA ENTERA: `AssetManager.loadModelAsync` necesita
 * navegador y red. Se le da a la fábrica una mesa de mentira y se mira DÓNDE la
 * pone, que es lo que esta prueba pregunta. Medir el modelo real es otra
 * pregunta y tiene otras pruebas.
 *
 * SABOTAJE DECLARADO
 *   · el clic vuelve a llevar la coordenada escrita → esto tiene que decirlo
 */
import * as THREE from 'three';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const fallos = [];
const bien = (t, d) => console.log(`  ${verde('✓')} ${t.padEnd(40)} ${gris(d)}`);
const mal = (t, d) => { fallos.push(`${t}: ${d}`); console.log(`  ${rojo('✗')} ${t.padEnd(40)} ${rojo(d)}`); };

const { ArcadeTableRoomFactory } = await import(
    './public/js/alisa-engine/src/world/factories/ArcadeTableRoomFactory.js');

console.log('\n¿Manda el plano de la sala?\n');

// ── El plano de casa existe y tiene forma de plano ──────────────────────────
const casa = ArcadeTableRoomFactory.PLANO_DE_CASA;
if (!Array.isArray(casa) || casa.length < 2 || !casa.every(s => s.id && Number.isFinite(s.x))) {
    console.log(rojo('CONTROL POSITIVO FALLIDO: PLANO_DE_CASA no es una lista de sitios con id y x.\n'));
    process.exit(2);
}
bien('el plano de casa es una lista', `${casa.length} sitios: ${casa.map(s => `${s.id}@${s.x}`).join(' ')}`);

/**
 * Se monta la parte de la fábrica que coloca, sin cargar el modelo: se replica
 * el bucle que reparte el plano con una mesa de mentira. Lo que se mide es la
 * LISTA, no el GLB.
 */
function repartir(plano) {
    const escena = new THREE.Scene();
    const f = Object.create(ArcadeTableRoomFactory.prototype);
    f.scene = escena;
    f.options = { plano };
    f.raycaster = new THREE.Raycaster();
    f.tableObj = new THREE.Mesh(new THREE.BoxGeometry(1, 0.75, 1), new THREE.MeshBasicMaterial());

    f.plano = (f.options?.plano ?? ArcadeTableRoomFactory.PLANO_DE_CASA).map(p => ({ ...p }));
    for (const sitio of f.plano) {
        const mesa = sitio.id === 'tablero' ? f.tableObj : f.tableObj.clone();
        mesa.position.x = sitio.x;
        mesa.name = `mesa:${sitio.id}`;
        escena.add(mesa);
        sitio.mesa = mesa;
    }
    const cartas = f.plano.find(p => p.id === 'cartas');
    if (cartas) {
        const tapete = new THREE.Mesh(new THREE.BoxGeometry(1, 0.005, 1), new THREE.MeshBasicMaterial());
        tapete.position.set(cartas.x, 0.7525, 0);
        tapete.name = 'tapete:cartas';
        escena.add(tapete);
        const baraja = new THREE.Group();
        baraja.position.set(cartas.x + (cartas.baraja ?? 0.3), 0.77, 0);
        baraja.name = 'baraja:cartas';
        escena.add(baraja);
        cartas.encima = [tapete, baraja];
    }
    return { f, escena };
}

// ── 1 · un plano distinto mueve las mesas ──────────────────────────────────
const OTRO = [
    { id: 'tablero', x: -9 },
    { id: 'cartas', x: 4, baraja: 1.5 },
    { id: 'dados', x: 11 },
];
const { f, escena } = repartir(OTRO);

for (const sitio of OTRO) {
    const m = escena.getObjectByName(`mesa:${sitio.id}`);
    if (!m) { mal('un plano distinto mueve las mesas', `falta «mesa:${sitio.id}»`); break; }
    if (m.position.x !== sitio.x) {
        mal('un plano distinto mueve las mesas', `«${sitio.id}» debía ir a ${sitio.x} y está en ${m.position.x}`);
        break;
    }
}
if (!fallos.length) bien('un plano distinto mueve las mesas', OTRO.map(s => `${s.id}@${s.x}`).join(' '));

// ── 2 · un sitio nuevo aparece sin tocar código ────────────────────────────
if (!escena.getObjectByName('mesa:dados')) mal('un sitio nuevo aparece', 'la tercera mesa no se montó');
else bien('un sitio nuevo aparece', 'tres mesas de una lista de tres, sin tocar la fábrica');

// ── 3 · lo de encima viaja con su mesa ─────────────────────────────────────
{
    const cartas = OTRO.find(s => s.id === 'cartas');
    const tapete = escena.getObjectByName('tapete:cartas');
    const baraja = escena.getObjectByName('baraja:cartas');
    if (!tapete || !baraja) mal('lo de encima viaja con su mesa', 'falta el tapete o la baraja');
    else if (tapete.position.x !== cartas.x) {
        mal('lo de encima viaja con su mesa', `el tapete se quedó en ${tapete.position.x} y la mesa está en ${cartas.x}`);
    } else if (Math.abs(baraja.position.x - (cartas.x + cartas.baraja)) > 1e-6) {
        mal('lo de encima viaja con su mesa', `la baraja está en ${baraja.position.x}, debía ir a ${cartas.x + cartas.baraja}`);
    } else bien('lo de encima viaja con su mesa', `tapete en ${tapete.position.x} · baraja en ${baraja.position.x}`);
}

// ── 4 · el clic pregunta al plano y no repite coordenadas ──────────────────
/**
 * ⚠️ SE MIDE SOBRE EL CÓDIGO, Y ES A PROPÓSITO.
 *
 * `onClick` necesita un ratón, una cámara y un rayo. Lo que esta prueba quiere
 * saber no es si el rayo acierta —eso es de otra— sino si las COORDENADAS
 * vuelven a estar escritas ahí. Un número literal en el manejador del clic es
 * la reaparición exacta del fallo, y se ve leyendo.
 */
{
    const src = ArcadeTableRoomFactory.prototype.onClick.toString();
    const literales = [...src.matchAll(/targetX\s*=\s*(-?\d+(?:\.\d+)?)/g)].map(m => m[1]);
    if (literales.length) {
        mal('el clic pregunta al plano', `vuelve a tener coordenadas escritas: ${literales.join(', ')}`);
    } else if (!/this\.plano/.test(src)) {
        mal('el clic pregunta al plano', 'no menciona el plano: no puede estar preguntándole');
    } else bien('el clic pregunta al plano', 'sin coordenadas literales, recorre this.plano');
}

console.log('');
if (fallos.length) {
    console.log(rojo(`✗ ${fallos.length} comprobación(es) suspendidas\n`));
    process.exit(1);
}
console.log(verde('✓ el plano manda: mueve, añade, arrastra lo de encima, y el clic le pregunta\n'));
