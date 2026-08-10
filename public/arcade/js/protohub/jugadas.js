/**
 * jugadas.js — los botones de jugar, en un solo sitio
 * ═══════════════════════════════════════════════════════════════════════════
 *     pintarJugadas(caja, { acciones, meToca, terminada, enviar });
 *
 * ⚠️ ESTOS BOTONES SON LA INTERFAZ COMPLETA, NO UN ATAJO.
 *
 * Aquí está TODA jugada legal, con su nombre — la misma lista que recibe un
 * agente por la puerta de texto. Los clics sobre las cartas o el tablero son un
 * añadido encima para que un humano no tenga que traducir `cambiar:5` a un
 * hueco; no añaden ni una jugada.
 *
 * Ésa es la propiedad que sostiene el banco de pruebas entero: si la persona
 * tuviera acciones que el agente no tiene, dejarían de estar jugando al mismo
 * juego y las dos filas de la tabla no compararían nada.
 *
 * ⚠️ Y POR QUÉ ESTÁ AQUÍ Y NO DENTRO DE LA MESA DE CARTAS.
 *
 * Vivía en `mesa_cartas.mjs`. En cuanto `sala.html` pasó a servir también
 * tableros hubo que elegir entre copiarlo o sacarlo, y copiar esto es copiar la
 * regla de oro —«nada que no esté en `legal_moves`»— con la posibilidad de que
 * una de las dos copias se la salte. Este proyecto ya ha pagado seis veces por
 * la misma decisión tomada al revés.
 */

/**
 * @param {HTMLElement} caja  dónde se pintan
 * @param {object} cfg
 *   acciones   las jugadas legales, tal cual las publica el juego
 *   meToca     si no, se dice de quién es el turno en vez de ofrecer botones
 *   turnoDe    nombre de quien tiene el turno, para poder decirlo
 *   terminada  la partida acabó
 *   espectador entraste a mirar: la mesa estaba llena
 *   enviar     (jugada) => void
 */
export function pintarJugadas(caja, { acciones = [], meToca = true, turnoDe = null,
                                      terminada = false, espectador = false, enviar } = {}) {
    if (!caja) return;

    const aviso = (t) => { caja.innerHTML = `<span class="dato">${t}</span>`; };

    if (terminada)  return aviso('partida terminada');
    if (espectador) return aviso('la mesa estaba llena — miras');
    if (!meToca)    return aviso(`le toca a ${turnoDe ?? 'otro asiento'}…`);

    const legales = acciones.filter(m => m !== 'nueva' && m !== 'reset');
    if (!legales.length) return aviso('—');

    caja.innerHTML = '';
    for (const m of legales) {
        const b = document.createElement('button');
        b.className = 'mesa-jugada';
        // `jugar:` y `pedir:` son ruido para quien mira: el verbo ya lo dice el
        // contexto. El título conserva la jugada entera, que es lo que viaja al
        // recibo y lo que hay que poder leer si algo no cuadra.
        b.textContent = String(m).replace(/^jugar:|^pedir:/, '');
        b.title = m;
        b.onclick = async () => {
            /**
             * Se apagan TODOS, no sólo el pulsado. En una sala compartida el
             * viaje de ida y vuelta dura lo suyo, y sin esto se mandan tres
             * jugadas antes de que conteste la primera: el árbitro rechazaría
             * las de más, pero quien juega vería tres errores por un clic de más.
             */
            [...caja.children].forEach(x => { x.disabled = true; });
            await enviar?.(m);
        };
        caja.appendChild(b);
    }
}
