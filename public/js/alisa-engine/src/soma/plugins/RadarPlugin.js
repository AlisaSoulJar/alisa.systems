/**
 * RadarPlugin.js — el radar circular, sacado del juego y hecho pieza
 * ═══════════════════════════════════════════════════════════════════════════
 * DE DÓNDE SALE
 * -------------
 * `games/raccoon_space.html` llevaba meses con un radar que funciona muy bien:
 * círculo con barrido girando y un punto por cada planeta, colocado por
 * posición relativa a la nave. Estaba encerrado dentro del juego, en 40 líneas
 * de HTML+CSS que nadie más podía usar. Esto es esa idea, reutilizable.
 *
 * QUÉ CAMBIA RESPECTO AL ORIGINAL
 * -------------------------------
 * 1. **No recrea los puntos cada fotograma.** El original hacía
 *    `querySelectorAll('.radar-blip').forEach(remove)` y volvía a crearlos: son
 *    60 borrados y 60 creaciones de DOM por segundo por cada objeto. Aquí hay
 *    una reserva de puntos que se reutiliza; solo se mueven.
 * 2. **Gira con tu cabeza.** El original apuntaba siempre al norte, que en una
 *    nave con la cámara detrás vale. Si andas en primera persona, un radar que
 *    no gira contigo se lee al revés cada vez que te das la vuelta. Con
 *    `orientar: true` lo de delante sale arriba, que es lo que espera cualquiera.
 * 3. **No sabe nada de tu mundo.** Le das una lista de `{x, z, color, tenue}`
 *    y la posición y el ángulo de quien mira. Sirve para naves, para salas y
 *    para lo que venga.
 *
 * USO
 *   const radar = new RadarPlugin({ padre: document.body, alcance: 80 });
 *   radar.pintar(estaciones, camara.position, giroH);
 */
export class RadarPlugin {
    /**
     * @param {Object} cfg
     * @param {HTMLElement} cfg.padre   dónde colgarlo
     * @param {number} [cfg.tam]        diámetro en píxeles
     * @param {number} [cfg.alcance]    metros que abarca el radio del círculo
     * @param {boolean} [cfg.orientar]  girar con el ángulo de quien mira
     * @param {string} [cfg.tinta]      color del marco y el barrido
     */
    constructor({ padre = document.body, tam = 132, alcance = 80,
                  orientar = true, tinta = '#93a7bd', barrido = true } = {}) {
        this.tam = tam;
        this.radio = tam / 2;
        this.alcance = alcance;
        this.orientar = orientar;
        this.reserva = [];

        this.raiz = document.createElement('div');
        this.raiz.className = 'radar-alisa';
        Object.assign(this.raiz.style, {
            position: 'absolute', width: `${tam}px`, height: `${tam}px`,
            borderRadius: '50%', border: `1px solid ${tinta}66`,
            background: 'rgba(255,255,255,.28)', backdropFilter: 'blur(2px)',
            overflow: 'hidden', pointerEvents: 'none', zIndex: 12,
        });

        // Las dos cruces: dan escala sin necesidad de números.
        for (const eje of ['h', 'v']) {
            const l = document.createElement('div');
            Object.assign(l.style, {
                position: 'absolute', background: `${tinta}33`,
                ...(eje === 'h' ? { left: 0, top: '50%', width: '100%', height: '1px' }
                                : { top: 0, left: '50%', height: '100%', width: '1px' }),
            });
            this.raiz.appendChild(l);
        }

        if (barrido) {
            const s = document.createElement('div');
            Object.assign(s.style, {
                position: 'absolute', top: 0, left: '50%',
                width: '50%', height: '50%', transformOrigin: 'bottom left',
                background: `linear-gradient(to right, ${tinta}00 0%, ${tinta}55 100%)`,
                animation: 'radar-alisa-giro 3.4s linear infinite',
            });
            this.raiz.appendChild(s);
            if (!document.getElementById('radar-alisa-css')) {
                const st = document.createElement('style');
                st.id = 'radar-alisa-css';
                st.textContent = '@keyframes radar-alisa-giro{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
                document.head.appendChild(st);
            }
        }

        // Tú, en el centro.
        const yo = document.createElement('div');
        Object.assign(yo.style, {
            position: 'absolute', left: '50%', top: '50%', width: '3px', height: '3px',
            marginLeft: '-1.5px', marginTop: '-1.5px', borderRadius: '50%',
            background: tinta,
        });
        this.raiz.appendChild(yo);

        padre.appendChild(this.raiz);
    }

    /** Coloca el radar (mismas unidades que CSS: '18px', '2vw'…). */
    situar({ arriba, abajo, izquierda, derecha }) {
        const s = this.raiz.style;
        if (arriba !== undefined) s.top = arriba;
        if (abajo !== undefined) s.bottom = abajo;
        if (izquierda !== undefined) s.left = izquierda;
        if (derecha !== undefined) s.right = derecha;
        return this;
    }

    _punto(i) {
        if (this.reserva[i]) return this.reserva[i];
        const p = document.createElement('div');
        Object.assign(p.style, {
            position: 'absolute', width: '5px', height: '5px', borderRadius: '50%',
            transform: 'translate(-50%,-50%)', transition: 'opacity .3s',
        });
        this.raiz.appendChild(p);
        this.reserva.push(p);
        return p;
    }

    /**
     * @param {Array} cosas  [{x, z, color?, tenue?}] en coordenadas del mundo
     * @param {{x:number,z:number}} yo   dónde estoy
     * @param {number} [giro]  hacia dónde miro, en radianes
     */
    pintar(cosas, yo, giro = 0) {
        // Girar el mundo al revés que la cabeza: así lo de delante queda arriba.
        const a = this.orientar ? -giro : 0;
        const cos = Math.cos(a), sin = Math.sin(a);
        const k = this.radio / this.alcance;
        let usados = 0;

        for (const c of cosas) {
            const dx = c.x - yo.x, dz = c.z - yo.z;
            // Rotación en el plano, y OJO: en pantalla el eje Y crece hacia
            // abajo, así que lo de delante (-z) tiene que subir.
            const rx = dx * cos - dz * sin;
            const rz = dx * sin + dz * cos;
            const px = this.radio + rx * k;
            const py = this.radio + rz * k;
            const dentro = Math.hypot(px - this.radio, py - this.radio) <= this.radio - 3;
            if (!dentro) continue;                       // fuera de alcance: no se pinta
            const p = this._punto(usados++);
            p.style.left = `${px}px`;
            p.style.top = `${py}px`;
            p.style.background = c.color || '#1a2230';
            p.style.opacity = c.tenue ? '0.34' : '0.95';
            p.style.display = 'block';
        }
        // Los sobrantes se esconden, no se destruyen.
        for (let i = usados; i < this.reserva.length; i++) this.reserva[i].style.display = 'none';
    }

    destruir() { this.raiz.remove(); }
}
