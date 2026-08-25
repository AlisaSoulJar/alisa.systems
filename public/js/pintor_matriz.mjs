/**
 * pintor_matriz — LA VISTA PLANA, DIBUJADA DESDE EL SUSTRATO Y NADA MÁS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La hermana 2D de `pintor_mundo.mjs`. Recibe un `sustrato()` y lo pinta en un
 * lienzo. No sabe a qué se juega.
 *
 * ⚠️ POR QUÉ EXISTE, Y ES LA TESIS DEL PROYECTO PUESTA A PRUEBA.
 *
 * `defiende_sendero.html` dibujaba leyendo `nucleo.observacion()` — un método
 * propio de ESE juego, con `entidades` que tienen `que` y `z`. Funcionaba, pero
 * hacía del escaparate un dibujante PARALELO: acertaba porque lo escribí el
 * mismo día, no porque saliera del mismo sitio que el banco.
 *
 * Y eso se separa solo con el tiempo. Es literalmente lo que pasó con ¡Busca!:
 * la persona y el banco jugaban dos juegos con el mismo nombre durante semanas,
 * y nadie lo vio hasta medirlo.
 *
 * La tesis del proyecto es que **todo sale del mismo sustrato de texto plano y
 * se le van sumando capas**. Mientras una capa lea otra cosa, la tesis es una
 * intención. Desde que sólo lee el sustrato, es mecánica: si el estado cambia,
 * se mueven a la vez lo que ve la persona, lo que lee el agente y lo que mide el
 * banco, porque los tres salen del mismo sitio.
 *
 * ⚠️ LOS ESCALARES NO ESTÁN AQUÍ, Y ES A PROPÓSITO.
 *
 * Vidas, presupuesto y oleada no son sustrato: el sustrato dice QUÉ HAY EN EL
 * MUNDO, no cómo va el marcador. Es la misma frontera que el arcade lleva
 * años usando —`describirSustrato` para el tablero, `describirEstado` para lo
 * demás—. El HUD los pide aparte, y eso está bien: mezclarlos haría que un
 * dibujante genérico tuviera que saber qué escalares tiene cada juego.
 */

/** Los colores por defecto del terreno, por valor de celda. */
const TERRENO = ['#0e1620', '#2b2417', '#1d4030', '#3a2020', '#14303c'];

export class PintorMatriz {
    /**
     * @param {HTMLCanvasElement} lienzo
     * @param {Object} [estilo] por tipo de pieza: `{color, forma, radio}`. Es lo
     *        único que aporta el juego, y es cosmética: sin estilo se dibuja
     *        igual, sólo más soso.
     */
    constructor(lienzo, estilo = {}) {
        this.lienzo = lienzo;
        this.ctx = lienzo.getContext('2d');
        this.estilo = estilo;
    }

    /**
     * Pinta un sustrato. Devuelve el tamaño de celda, que es lo que hace falta
     * fuera para traducir un clic a coordenadas del mundo.
     */
    pintar(sus, opciones = {}) {
        const { ctx, lienzo } = this;
        const r = sus.rejilla;
        if (!r) return 0;
        const c = Math.floor(Math.min(lienzo.width / r.ancho, lienzo.height / r.alto));
        ctx.clearRect(0, 0, lienzo.width, lienzo.height);

        // 1. El terreno, con los colores del juego si los declara.
        const colores = opciones.colores ?? TERRENO;
        for (let z = 0; z < r.alto; z++) {
            for (let x = 0; x < r.ancho; x++) {
                const v = r.celdas[z * r.ancho + x] ?? 0;
                ctx.fillStyle = colores[v] ?? colores[0];
                ctx.fillRect(x * c, z * c, c - 1, c - 1);
            }
        }

        // 2. Las piezas, con su glifo o su estilo.
        ctx.font = `${Math.floor(c * 0.62)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const p of (sus.piezas ?? [])) {
            const e = this.estilo[p.t] ?? {};
            const px = (p.x + 0.5) * c, pz = (p.y + 0.5) * c;

            /**
             * ⚠️ EL ALCANCE SE DIBUJA SI LA PIEZA LO TRAE, Y NO SE INVENTA.
             * Un dibujante que supusiera que las torretas tienen alcance estaría
             * sabiendo una regla. Si el sustrato lo publica, se pinta; si no, no
             * existe para esta capa.
             */
            if (p.alcance) {
                ctx.beginPath();
                ctx.arc(px, pz, p.alcance * c, 0, Math.PI * 2);
                ctx.fillStyle = e.halo ?? 'rgba(78,235,187,0.05)';
                ctx.fill();
                ctx.strokeStyle = e.aro ?? 'rgba(78,235,187,0.22)';
                ctx.stroke();
            }

            if (e.emoji) {
                ctx.fillText(e.emoji, px, pz);
            } else {
                ctx.beginPath();
                ctx.arc(px, pz, c * (e.radio ?? 0.26), 0, Math.PI * 2);
                ctx.fillStyle = e.color ?? '#8ad';
                ctx.fill();
            }

            /**
             * La vida se ve. Sin ella un bicho a punto de caer se ve igual que
             * uno recién llegado, y no se puede decidir nada — que es el mismo
             * criterio por el que el pintor 3D escala las piezas por su vida.
             */
            if (p.vida !== undefined && p.vida < 1) {
                const w = c * 0.6;
                ctx.fillStyle = '#300';
                ctx.fillRect(px - w / 2, pz - c * 0.4, w, 3);
                ctx.fillStyle = '#4e6';
                ctx.fillRect(px - w / 2, pz - c * 0.4, w * Math.max(0, p.vida), 3);
            }
        }
        return c;
    }
}
