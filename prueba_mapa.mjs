/**
 * ¿VE EL AGENTE EL MISMO TABLERO QUE LA PERSONA?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_mapa.mjs
 *
 * ⚠️ ESTA PRUEBA LA PIDIÓ UNA BETA TESTER, Y ERA UN AGENTE.
 *
 * El 25-08 se invitó a las hermanas de la colonia a jugar en el banco por HTTP.
 * Motoko probó Sokoban y Mancala y devolvió esto en la primera hora:
 *
 *   «En Sokoban no puedo jugar razonando porque el estado que me devuelve la API
 *    es puramente numérico. NO ME MUESTRA EL MAPA. Sin ver dónde están los muros,
 *    el jugador o las cajas, me obligas a elegir arriba/abajo a ciegas como si
 *    fuera un modelo RL, no un agente de lenguaje. Si el contrato de la API no me
 *    da el contexto espacial, un LLM jugará igual que una política al azar.»
 *
 * Tenía razón. `/api/gym` devolvía `{nivel, cajas_colocadas, pasos,
 * distancia_restante}` y ni un muro. Y el mapa EXISTÍA: `describirSustrato` lleva
 * semanas dibujándolo para la página humana.
 *
 * O sea que la persona veía el tablero y el agente no. La misma avería de
 * siempre —dos puertas, dos juegos— y esta vez con una consecuencia que va a la
 * línea de flotación del proyecto: **la nota no medía al agente, medía la
 * puerta.** Los 46 de 49 entornos que «separan políticas» sólo demuestran que no
 * son indiferentes; con el mapa oculto, un modelo que razona no podía demostrar
 * que razona.
 *
 * ⚠️ Y SE COMPRUEBA CONTRA LA CADENA REAL, NO CONTRA UN DOBLE.
 *
 * Se llama al mismo `describirSustrato` que sirve la puerta, sobre el sustrato
 * que publican las reglas de verdad. Un doble diría que sí y la puerta seguiría
 * muda, que es exactamente lo que pasó hasta hoy.
 */
import { JUEGOS, cargarReglas } from './public/arcade/js/protohub/rules/index.js';
import { describirSustrato } from './public/arcade/js/protohub/descripcion.js';

let fallos = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };

console.log('\n¿Ve el agente el mismo tablero que la persona?\n');

const conRejilla = [];
const sinRejilla = [];

for (const juego of JUEGOS) {
    let reglas, st, sus;
    try {
        reglas = await cargarReglas(juego, {});
        const p = reglas.nuevaPartida({ semilla: 42, seed: 42 });
        st = reglas.estado(p);
        sus = st.sustrato ?? (typeof reglas.sustrato === 'function' ? reglas.sustrato(p) : null);
    } catch { continue; }

    if (!sus?.rejilla) { sinRejilla.push(juego); continue; }

    const mapa = describirSustrato(sus);
    conRejilla.push(juego);

    /**
     * Un mapa que no dibuja nada es peor que ninguno: parece que la puerta habla
     * y el agente sigue a ciegas. Se exige que tenga varias líneas y que use de
     * verdad el vocabulario que el propio mundo declara.
     */
    const lineas = mapa.split('\n').filter(l => l.trim());
    if (lineas.length < 3) {
        mal(`${juego}: el mapa tiene ${lineas.length} línea(s) — no dibuja el tablero`);
        continue;
    }
    const ancho = sus.rejilla.ancho;
    const dibujo = lineas.filter(l => l.length >= ancho && !l.includes(' muro'));
    if (dibujo.length < sus.rejilla.alto) {
        mal(`${juego}: el mapa trae ${dibujo.length} fila(s) y la rejilla tiene ${sus.rejilla.alto}`);
    }
}

console.log(`  ${conRejilla.length} juegos publican mapa: ${conRejilla.join(', ')}`);
console.log(`  ${sinRejilla.length} sin rejilla (cartas y dados), y no se inventa ninguno`);

/**
 * ⚠️ Y EL CASO QUE LO DESTAPÓ, CLAVADO COMO PRUEBA.
 *
 * Sokoban con semilla 42. Si algún día su mapa vuelve a no tener muros ni
 * jugador, esta línea lo dice — con el nombre de quien lo encontró.
 */
{
    const reglas = await cargarReglas('sokoban', {});
    const p = reglas.nuevaPartida({ semilla: 42, seed: 42 });
    const st = reglas.estado(p);
    const sus = st.sustrato ?? reglas.sustrato?.(p);
    const mapa = describirSustrato(sus ?? {});
    const tiene = (c, que) => {
        if (!mapa.includes(c)) mal(`sokoban: el mapa no tiene ${que} («${c}»)`);
    };
    tiene('#', 'muros');
    tiene('@', 'al jugador');
    tiene('$', 'ninguna caja');
    tiene('o', 'ningún destino');
    if (!fallos) console.log('  ✓ sokoban dibuja muros, cajas, destinos y jugador');
}

/**
 * ⚠️ Y AHORA LA PUERTA DE VERDAD, QUE ES LO QUE FALLABA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Todo lo de arriba comprueba el DIBUJANTE, y el dibujante nunca estuvo roto:
 * llevaba semanas funcionando. Lo que estaba mudo era la PUERTA. Una prueba que
 * se quedara arriba diría «verde» con el agente jugando a ciegas exactamente
 * igual que hasta hoy.
 *
 * Así que se llama al manejador HTTP real, con una petición real, y se mira lo
 * que sale por el cable.
 */
{
    const { onRequestPost } = await import('./functions/api/gym.js');
    const peticion = new Request('https://alisa.systems/api/gym', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ juego: 'sokoban', semilla: 42, jugadas: [] }),
    });
    const res = await onRequestPost({ request: peticion, env: {} });
    const cuerpo = await res.json();

    if (!cuerpo.mapa) {
        mal('la puerta /api/gym NO manda `mapa` para sokoban — el agente sigue a ciegas');
    } else if (!cuerpo.mapa.includes('@') || !cuerpo.mapa.includes('#')) {
        mal(`la puerta manda un mapa sin jugador o sin muros: ${cuerpo.mapa.slice(0, 40)}`);
    } else {
        const filas = cuerpo.mapa.split('\n').filter(l => l.trim()).length;
        console.log(`  ✓ /api/gym manda el mapa por el cable: ${filas} líneas, con muros y jugador`);
    }
    if (!cuerpo.descripcion) mal('la puerta no manda `descripcion` — el estado en texto que lee la persona');

    /**
     * Y un juego SIN rejilla no debe traer mapa inventado. Un mapa falso es peor
     * que ninguno: el agente decidiría contra un tablero que no existe.
     */
    const p2 = new Request('https://alisa.systems/api/gym', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ juego: 'brisca', semilla: 42, jugadas: [] }),
    });
    const c2 = await (await onRequestPost({ request: p2, env: {} })).json();
    if (c2.mapa) mal(`brisca no tiene rejilla y la puerta se inventó un mapa: ${String(c2.mapa).slice(0, 40)}`);
    else console.log('  ✓ un juego de cartas no recibe mapa inventado');
}

console.log('');
if (fallos) { console.log(`  ✗ ${fallos} fallo(s): hay agentes jugando a ciegas\n`); process.exit(1); }
console.log('  ✓ la puerta del agente sirve el mismo tablero que ve la persona\n');
