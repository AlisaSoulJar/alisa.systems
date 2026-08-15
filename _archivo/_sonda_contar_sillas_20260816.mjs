/** ¿QUÉ CAMPOS DEL ESTADO INICIAL DELATAN CUÁNTAS SILLAS HAY? */
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';

for (const e of CATALOGO.filter(x => x.familia === 'protohub')) {
    const Env = await e.cargar();
    const env = new Env();
    env.reset(7);
    const ini = env._estado();
    // Y el final, para saber cuántas sillas tiene DE VERDAD.
    for (let i = 0; i < 400; i++) {
        const v = env.affordances();
        if (!v.length) break;
        if (env.step(v[0].verb).done) break;
    }
    const fin = env._estado();
    const verdad = Array.isArray(fin.marcador) ? fin.marcador.length
                 : Array.isArray(ini.marcador) ? ini.marcador.length : null;
    if (!verdad || verdad < 2) continue;      // sólo interesan los multijugador

    const pistas = [];
    if (Array.isArray(ini.marcador)) pistas.push(`marcador:${ini.marcador.length}`);
    if (Array.isArray(ini.manos_rivales)) pistas.push(`manos_rivales+1:${ini.manos_rivales.length + 1}`);
    if (Array.isArray(ini.avance)) pistas.push(`avance:${ini.avance.length}`);
    if (typeof ini.jugadores === 'number') pistas.push(`jugadores:${ini.jugadores}`);
    if (Array.isArray(ini.jugadores)) pistas.push(`jugadores[]:${ini.jugadores.length}`);
    console.log(`  ${e.juego.padEnd(11)} sillas de verdad: ${verdad}`
        + `   al empezar: ${pistas.join('  ') || '— NADA —'}`);
}
