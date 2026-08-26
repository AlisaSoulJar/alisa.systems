/**
 * pintor_radar.mjs — EL CUARTO PINTOR: EL MUNDO, PEQUEÑO Y DESDE ARRIBA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const radar = new PintorRadar(lienzo, ESTILO, { alcance: 200 });
 *     radar.pintar(nucleo.sustrato());       // una vez por fotograma
 *
 * Hermano de `PintorMundo` (piezas en un volumen), `PintorMatriz` (cuadrícula
 * plana) y `PintorEdificio` (cuadrícula dentro de un edificio). Éste dibuja lo
 * mismo que ellos —el sustrato— pero pequeño, desde arriba y centrado en ti.
 *
 * Pide lo mismo que los otros tres: `pintar(sustrato)` y nada más.
 *
 * ⚠️ POR QUÉ ES UN PINTOR Y NO UN SISTEMA. ESTO ES LO IMPORTANTE.
 *
 * Medido el 26-08-2026: **dieciocho ficheros se dibujan su propio radar** y no
 * hay ninguna pieza compartida. Al mirar uno de cerca —el de `raccoon_space`—
 * se ve por qué no bastaba con extraerlo:
 *
 *     function updateRadar() {
 *         planets.forEach(p => {
 *             const relPos = p.pos.clone().sub(shipRoot.position);
 *             …
 *
 * Lee `planets` y `shipRoot`, que son el estado que la PÁGINA lleva por su
 * cuenta. O sea que el minimapa se dibuja de una fuente distinta que el mundo, y
 * puede desviarse de él sin que nada avise. Es exactamente la avería que este
 * proyecto persigue —dos copias del mismo mundo— en la esquina de la pantalla.
 *
 * Un radar no necesita saber nada: lo que dibuja —dónde está cada cosa, de qué
 * tipo es y cuál eres tú— ya está TODO en el sustrato. Por eso no hace falta un
 * `RadarSystem`: hace falta que el radar mire donde miran los otros tres
 * pintores. Así no puede mentir.
 *
 * ⚠️ Y USA `x` Y `y`, QUE SON LOS DOS EJES DEL SUELO.
 *
 * En el contrato del sustrato `y` es el SEGUNDO EJE DEL SUELO y `alto` es la
 * altura. Un radar mira desde arriba, así que dibuja `x` contra `y` y no mira
 * `alto` — que es justo lo que hay que ignorar en una vista cenital. Cuando una
 * pieza sólo trae `alto` (una torre por plantas), todas caen en el mismo punto,
 * y eso también es verdad: desde arriba, una torre es un punto.
 */

export class PintorRadar {
    /**
     * @param {HTMLCanvasElement} lienzo
     * @param {Object} estilo    `{ [tipo]: { color, radio? } }`
     * @param {Object} [cfg]
     * @param {number} [cfg.alcance=200]  cuánto mundo cabe de borde a borde
     * @param {string} [cfg.jugador]      el tipo de pieza que eres tú; si no se
     *                                    dice, se usa la que traiga `de: 1`
     * @param {boolean}[cfg.redondo=true] recorta en círculo, como una pantalla
     * @param {string} [cfg.fondo='rgba(0,0,0,0.5)']
     */
    constructor(lienzo, estilo = {}, cfg = {}) {
        this.lienzo = lienzo;
        this.ctx = lienzo.getContext('2d');
        this.estilo = estilo;
        this.alcance = cfg.alcance ?? 200;
        this.jugador = cfg.jugador ?? null;
        this.redondo = cfg.redondo !== false;
        this.fondo = cfg.fondo ?? 'rgba(0,0,0,0.5)';
    }

    /**
     * Pinta un sustrato. Devuelve la escala usada —píxeles por unidad de mundo—
     * que es lo que hace falta fuera para traducir un clic, igual que
     * `PintorMatriz` devuelve el lado de la celda.
     */
    pintar(sus) {
        const { ctx, lienzo } = this;
        const w = lienzo.width, h = lienzo.height;
        const cx = w / 2, cy = h / 2;
        const escala = Math.min(w, h) / this.alcance;

        ctx.clearRect(0, 0, w, h);
        ctx.save();
        if (this.redondo) {
            ctx.beginPath();
            ctx.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2);
            ctx.clip();
        }
        ctx.fillStyle = this.fondo;
        ctx.fillRect(0, 0, w, h);

        const piezas = sus?.piezas ?? [];
        /**
         * Quién eres. Se acepta por nombre de tipo, y si no se dice se busca la
         * pieza de la capa 1 — que es donde esta casa pone al jugador en las
         * etapas en volumen. Si no hay ninguna, el radar se centra en el origen,
         * que es lo honrado: un radar sin «tú» es un mapa.
         */
        const yo = this.jugador
            ? piezas.find((p) => p.t === this.jugador)
            : piezas.find((p) => p.de === 1);
        const ox = yo?.x ?? 0;
        const oy = yo?.y ?? 0;

        for (const p of piezas) {
            const e = this.estilo[p.t];
            if (!e) continue;
            const px = cx + ((p.x ?? 0) - ox) * escala;
            const py = cy + ((p.y ?? 0) - oy) * escala;
            if (px < 0 || px > w || py < 0 || py > h) continue;

            /**
             * El `alcance` de una pieza —el que ya publican las pilas, los
             * refugios del submarino y las luces— se dibuja como un halo. No es
             * adorno: es lo que dice hasta dónde llega esa cosa, y en un radar
             * es justo lo que hace falta ver para decidir a dónde ir.
             */
            if (p.alcance > 0) {
                ctx.beginPath();
                ctx.arc(px, py, p.alcance * escala, 0, Math.PI * 2);
                ctx.fillStyle = e.halo ?? 'rgba(255,255,255,0.07)';
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(px, py, e.radio ?? 3, 0, Math.PI * 2);
            ctx.fillStyle = e.color ?? '#fff';
            ctx.fill();
        }

        ctx.restore();
        return escala;
    }
}
