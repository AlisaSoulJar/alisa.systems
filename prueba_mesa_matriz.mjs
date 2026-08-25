/**
 * ¿PINTA LA MESA PLANA DESDE EL SUSTRATO, SIN SABER A QUÉ SE JUEGA?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_mesa_matriz.mjs
 *
 * `MesaMatriz` es la vista 2D del banco, y la prueba de que la tesis del
 * proyecto se cumple en la capa de arriba: **todo sale del mismo sustrato y se
 * le van sumando capas**.
 *
 * ⚠️ QUÉ HABÍA ANTES, Y POR QUÉ NO VALÍA AUNQUE FUNCIONARA.
 *
 * `defiende_sendero.html` dibujaba leyendo `nucleo.observacion()` — un método
 * propio de ESE juego. Se veía bien. Pero era un dibujante PARALELO: acertaba
 * porque lo escribí el mismo día que el motor, no porque saliera del mismo sitio
 * que el banco.
 *
 * Eso se separa solo con el tiempo, y no es una hipótesis: es lo que pasó con
 * ¡Busca!, donde la persona y el banco jugaron dos juegos con el mismo nombre
 * durante semanas sin que nadie lo viera.
 *
 * ⚠️ Y SE COMPRUEBA CON UN LIENZO DE MENTIRA, NO CON UNA CAPTURA.
 *
 * Un lienzo falso que apunta lo que le mandan dibujar contesta la pregunta
 * exacta: ¿pintó una celda por casilla y una figura por pieza? Una captura sólo
 * diría «se ve algo» — que es justo lo que decían las páginas rotas.
 */
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';
import { MesaMatriz } from './public/js/mesa_matriz.mjs';

let fallos = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };

/** Un lienzo que no dibuja: apunta. */
function lienzoFalso(w = 600, h = 600) {
    const apuntes = { rects: 0, arcos: 0, textos: [], limpiezas: 0 };
    const ctx = {
        fillStyle: '', strokeStyle: '', font: '', textAlign: '', textBaseline: '',
        clearRect: () => apuntes.limpiezas++,
        fillRect: () => apuntes.rects++,
        beginPath: () => {}, fill: () => {}, stroke: () => {},
        arc: () => apuntes.arcos++,
        fillText: (t) => apuntes.textos.push(t),
    };
    return { lienzo: { width: w, height: h, getContext: () => ctx }, apuntes };
}

console.log('\n¿Pinta la mesa plana desde el sustrato?\n');

{
    const e = CATALOGO.find(x => x.id === 'alisa/Defiende-v0');
    const C = await e.cargar();
    const env = new C();
    env.reset(7);

    const { lienzo, apuntes } = lienzoFalso();
    const mesa = new MesaMatriz(lienzo, {
        guijarro: { emoji: '🪨' }, peon: { color: '#8ad' },
    });

    const sus0 = env.sys.sustrato();
    const celda = mesa.pintar(sus0);
    const L = sus0.rejilla.ancho;

    if (celda !== Math.floor(600 / L)) mal(`el tamaño de celda sale ${celda}, se esperaba ${Math.floor(600 / L)}`);
    if (apuntes.rects !== L * L) {
        mal(`pintó ${apuntes.rects} casillas y la rejilla tiene ${L * L}`);
    } else {
        console.log(`  ✓ una casilla por celda: ${apuntes.rects} de ${L * L}`);
    }

    // Ahora con torretas y bichos: tiene que pintar una figura por pieza.
    const libres = env.sys.celdasLibres();
    env.sys.construir('guijarro', libres[0].x, libres[0].z);
    for (let i = 0; i < 600; i++) env.sys.step(1 / 60);

    const sus1 = env.sys.sustrato();
    const { lienzo: l2, apuntes: a2 } = lienzoFalso();
    const mesa2 = new MesaMatriz(l2, { guijarro: { emoji: '🪨' }, peon: { color: '#8ad' } });
    mesa2.pintar(sus1);

    const conEmoji = sus1.piezas.filter(p => p.t === 'guijarro').length;
    const conAlcance = sus1.piezas.filter(p => p.alcance).length;
    if (a2.textos.length !== conEmoji) {
        mal(`${conEmoji} pieza(s) con emoji declarado y se pintaron ${a2.textos.length} textos`);
    }
    /**
     * Los arcos son las piezas sin emoji (un círculo) más los círculos de
     * alcance. Si no cuadra, el dibujante está inventándose figuras o
     * saltándose piezas.
     */
    const arcosEsperados = (sus1.piezas.length - conEmoji) + conAlcance;
    if (a2.arcos !== arcosEsperados) {
        mal(`pintó ${a2.arcos} arcos y tocaban ${arcosEsperados} `
          + `(${sus1.piezas.length - conEmoji} piezas redondas + ${conAlcance} alcances)`);
    } else {
        console.log(`  ✓ una figura por pieza: ${sus1.piezas.length} piezas, `
                  + `${conEmoji} con emoji, ${conAlcance} con alcance dibujado`);
    }
}

/**
 * ⚠️ Y LA PRUEBA QUE DE VERDAD IMPORTA: QUE NO SEPA A QUÉ SE JUEGA.
 *
 * Se le pasa el sustrato de OTRO mundo con rejilla —el edificio de oficinas, que
 * no tiene torretas ni bichos— y tiene que pintarlo igual. Si el dibujante
 * necesitara saber algo de ¡Defiende!, aquí se rompería.
 */
{
    const e = CATALOGO.find(x => x.id === 'alisa/CorpBuilding-v0');
    const C = await e.cargar();
    const env = new C();
    env.reset(4);
    const sus = env.sustrato();
    const { lienzo, apuntes } = lienzoFalso();
    new MesaMatriz(lienzo, {}).pintar(sus);
    const celdas = sus.rejilla.ancho * sus.rejilla.alto;
    if (apuntes.rects !== celdas) {
        mal(`con el sustrato del edificio pintó ${apuntes.rects} casillas de ${celdas}`);
    } else {
        console.log(`  ✓ el mismo dibujante pinta otro mundo distinto sin cambiar nada`);
    }
}

console.log('');
if (fallos) { console.log(`  ✗ ${fallos} fallo(s) en la mesa plana\n`); process.exit(1); }
console.log('  ✓ la vista humana sale del sustrato, igual que el texto, los números y el 3D\n');
