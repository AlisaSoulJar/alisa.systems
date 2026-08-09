/**
 * sala.js — el cliente del árbitro compartido, para quien quiera una silla
 * ═══════════════════════════════════════════════════════════════════════════
 *     const mesa = crearSala({ sala: 'cocina', yo: 'oscar', juego: 'entropy', semilla: 5 });
 *     await mesa.entrar();
 *     await mesa.refrescar();
 *     mesa.estado();  mesa.acciones();  mesa.meToca();  await mesa.jugar(m);
 *
 * ⚠️ POR QUÉ ESTO ES UN MÓDULO Y NO SIGUE DENTRO DE `mesa.html`.
 *
 * Vivía ahí dentro, y ahí funcionaba: una mesa de texto que sirve a los treinta
 * juegos, con árbitro, asientos y recibo verificable. El problema es que la mesa
 * de casino en 3D quería exactamente lo mismo, y lo único que tenía a mano era
 * copiarlo.
 *
 * Copiarlo habría sido escribir por segunda vez el rechazo de la mesa llena, el
 * `?quien=` que hace que veas TU mano, y la adopción del estado del árbitro
 * cuando te rechaza una jugada. Tres cosas que costaron sangre por separado —una
 * agente invitada se quedó de pie porque un espectador le quitó las negras— y que
 * en una copia se habrían quedado a medias sin que nadie lo notara hasta jugar.
 *
 * Aquí no hay lógica nueva. Es el mismo objeto, con las cuatro cosas que miraban
 * al DOM de `mesa.html` recibidas por parámetro.
 */

/** El árbitro público. Una sala es una partida, no un sitio donde se juega a varias cosas. */
export const MESAS = 'https://alisa-mesas.prime-6d5.workers.dev';

/** Lo que se puede poner en una URL sin que sea otra cosa. */
export const limpiar = (v, max) => String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, max);

/** Un nombre para quien no ponga el suyo. No identifica a nadie: sólo distingue asientos. */
export const nombreSuelto = () => 'invitado-' + Math.random().toString(36).slice(2, 6);

/**
 * El almacén del navegador, sin poder tumbar la página.
 *
 * En modo privado y con las cookies bloqueadas, `localStorage` LANZA al leerlo —
 * no devuelve null—. Una mesa que reviente por no poder recordar un nombre sería
 * peor que una que no recuerda nada.
 */
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* da igual */ } };

/**
 * ⚠️ QUIÉN ERES EN ESTA SALA, Y QUE SIGAS SIENDO EL MISMO AL RECARGAR.
 *
 * Sin `?yo=` se inventaba un `invitado-xxxx` en cada carga. Eso es lo que permite
 * repartir UN solo enlace —cada navegador coge un nombre distinto y por tanto una
 * silla distinta— pero al recargar salía otro nombre: la mesa te veía como
 * alguien nuevo, las dos sillas estaban ocupadas (por el otro y por tu yo
 * anterior) y entrabas de espectador a tu propia partida.
 *
 * Se recuerda por sala. El enlace único sigue funcionando y una recarga te
 * devuelve a tu sitio.
 */
export function nombreParaSala(sala, pedido) {
    const limpio = limpiar(pedido, 24);
    if (limpio) return limpio;
    const clave = `alisa:sala:${sala}:yo`;
    let guardado = leer(clave);
    if (!guardado) { guardado = nombreSuelto(); guardar(clave, guardado); }
    return guardado;
}

/**
 * @param {object} cfg
 *   sala, yo, juego, semilla   qué partida y quién eres
 *   mesas       opcional: otro árbitro (para pruebas)
 *   avisar      qué hacer con el motivo de un rechazo; por defecto, nada
 *   puedoJugar  si la silla la lleva una persona o algo automático. `mesa.html`
 *               le pasa su `?asientos=`; una mesa sin esa idea deja el sí.
 */
export function crearSala({ sala, yo, juego, semilla, mesas = MESAS,
                            avisar = () => {}, puedoJugar = () => true }) {
    /**
     * ⚠️ EL SECRETO DE TU ASIENTO. VIVE AQUÍ Y NO SALE.
     *
     * La mesa lo entrega UNA vez, al sentarte, y lo exige para mover: sin él
     * `quien` era sólo una etiqueta y cualquiera que supiera el nombre de la sala
     * podía mandar `{quien:'motoko', jugada:…}` y mover sus piezas.
     *
     * El árbitro se blindó y **el cliente del navegador no se enteró**: seguía
     * mandando `/jugar` sin secreto, así que desde la web toda partida compartida
     * contestaba 403 con el motivo escrito y nadie lo leía. Media función de
     * seguridad es una función rota — con la particularidad de que el lado que se
     * rompió es el de los usuarios y el que funciona es el que dice que no.
     *
     * Va en una variable del cierre, no en el objeto: lo que no es una propiedad
     * no se cuela en un `JSON.stringify` del estado ni aparece en un `console.log`
     * del objeto entero. La mesa ya se llevó un susto publicando asientos con
     * `{...a}` y repartiendo los secretos de todos.
     */
    /**
     * ⚠️ Y SOBREVIVE A UNA RECARGA, PORQUE SI NO TE QUEDAS FUERA DE TU SILLA.
     *
     * Vivía sólo en memoria. Al recargar la página, el nombre volvía en la URL
     * pero el secreto no: la mesa contestaba «ya estás sentado» —sin devolverlo,
     * y hace bien, dárselo a quien diga tu nombre sería regalar la identidad— y a
     * partir de ahí TODA jugada daba 403. Con un mensaje que además parece culpa
     * tuya: «ese asiento no es tuyo».
     *
     * Recargar no es un caso raro: es lo primero que hace cualquiera cuando algo
     * se ve lento. Se guarda por sala y por nombre; si mañana entras a otra sala,
     * ese secreto no sirve para nada.
     */
    const LLAVE = `alisa:sala:${sala}:${yo}:secreto`;
    let secreto = leer(LLAVE);

    return {
        compartida: true,
        espectador: false,
        ultimo: null,
        // Con quién nombre estás sentado. Importa enseñarlo cuando NO lo has
        // elegido tú: si la mesa dice «le toca a invitado-k3f9» y no sabes que
        // ése eres tú, te quedas esperando tu propio turno.
        yo,

        async pedir(ruta, cuerpo) {
            const r = await fetch(`${mesas}/mesa/${sala}${ruta}`, cuerpo ? {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(cuerpo),
            } : undefined);
            return { codigo: r.status, ...(await r.json()) };
        },

        /**
         * ⚠️ ABRIR EL ENLACE NO TE SIENTA SI LA MESA YA ESTÁ LLENA.
         *
         * Antes esto sentaba a cualquiera que abriera la página. Pasó jugando: abrí
         * una partida de ajedrez para otra agente, alguien entró a MIRAR desde el
         * navegador y **se llevó las negras**; la invitada se quedó de pie con las
         * acciones vacías y el turno no le llegaba nunca.
         *
         * El error de fondo es tratar «mirar» y «jugar» como la misma acción. Un
         * enlace que se comparte lo abre mucha más gente de la que va a jugar, así
         * que lo seguro es entrar como espectador y sentarse sólo si sobra sitio.
         */
        async mirarPrimero() {
            await this.refrescar();
            const m = this.ultimo ?? {};
            const ocupados = (m.asientos ?? []).length;
            /**
             * ⚠️ EL TOPE DECLARADO MANDA SOBRE EL DESCUBIERTO.
             *
             * Esto miraba `asientos_del_juego`, que la mesa DESCUBRE jugando y que
             * vale 1 hasta que el turno cambia de manos por primera vez. Resultado
             * visto jugando: la segunda jugadora de un entropy abrió el enlace
             * entre el primer robo y el cambio de turno, el árbitro dijo todavía
             * «una silla» y entró como espectadora **a una mesa con un asiento
             * libre**. Sin error, sin aviso y sin vuelta atrás.
             *
             * `sillas` es lo que el juego declara en `rules/index.js`, que es el
             * mismo número con el que el árbitro rechaza a quien sobra. Se deja el
             * descubierto de respaldo para mesas servidas por un worker viejo.
             */
            const sillas = m.sillas ?? m.asientos_del_juego ?? 1;
            const yaEstoy = (m.asientos ?? []).some(a => a.quien === yo);
            // Antes de la primera jugada se deja pasar igualmente: si ni siquiera
            // hay tope declarado, es el único momento en que no se puede saber.
            return yaEstoy || m.jugadas === 0 || ocupados < sillas;
        },

        async entrar() {
            if (!(await this.mirarPrimero())) {
                this.espectador = true;
                return true;                 // se ve la partida, no se juega
            }
            const r = await this.pedir('/sentarse', { quien: yo, tipo: 'persona', juego, semilla });
            // Un «no» con motivo se enseña tal cual. La mesa se toma la molestia de
            // explicar por qué en algunos juegos no cabe un segundo; tragarse esa
            // explicación y dejar la pantalla en blanco sería desperdiciarla.
            if (r.codigo !== 200) { this.ultimo = r; return false; }
            /**
             * Sólo se pisa el secreto si llega uno NUEVO. Cuando vuelves tras
             * recargar, la mesa responde `ya_sentado` sin secreto: machacar el
             * guardado con ese `undefined` sería tirar la llave que acabábamos de
             * recuperar, y volveríamos al 403 que esto viene a arreglar.
             */
            if (r.secreto) { secreto = r.secreto; guardar(LLAVE, secreto); }
            this.ultimo = r;
            return true;
        },

        // `?quien=` es lo que hace que la mesa enseñe TU mano y no la del asiento 0.
        // Sin él se recibe la vista canónica, que es la del primero que se sentó.
        async refrescar() { this.ultimo = await this.pedir(`?quien=${encodeURIComponent(yo)}`); },

        estado() { return this.ultimo?.estado ?? {}; },

        /**
         * ⚠️ EN UNA SALA SÓLO MANDAS SOBRE TU SILLA.
         * Las demás las lleva quien se haya sentado en ellas, en su propia pestaña.
         */
        miIndice: () => 0,
        indiceTurno() { return this.ultimo?.turno_de === yo ? 0 : -1; },
        meToca() { return this.ultimo?.turno_de === yo && puedoJugar(); },
        acciones() { return this.ultimo?.acciones ?? []; },

        async jugar(m) {
            const r = await this.pedir('/jugar', { quien: yo, jugada: m, secreto });
            if (r.codigo === 200) { this.ultimo = r; avisar(''); return; }
            // El árbitro dijo que no, y casi siempre por un motivo legítimo: otro se
            // adelantó entre que se pintó el botón y se pulsó. Se adopta SU estado,
            // que es el bueno — el de esta pestaña ya era viejo.
            avisar(r.error ?? 'la jugada no entró');
            if (r.estado) this.ultimo = r; else await this.refrescar();
        },

        recibo() { return this.ultimo?.recibo; },

        resumen() {
            const m = this.ultimo;
            if (!m?.asientos) return '';
            const quien = m.asientos.map(a =>
                `${a.quien === yo ? '<b>' + a.quien + ' (tú)</b>' : a.quien}`
                + `<span class="dato"> · ${a.asiento ?? '—'}</span>`).join(' &nbsp;·&nbsp; ');
            const casa = m.los_juega_la_casa
                ? ` &nbsp;·&nbsp; <span class="dato">+${m.los_juega_la_casa} de la casa</span>` : '';
            return `sala <b>${sala}</b> &nbsp;·&nbsp; ${quien}${casa}`;
        },
    };
}
