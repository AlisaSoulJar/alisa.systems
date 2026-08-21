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
 * ⚠️ QUIEN ABRE UN ENLACE COMPARTIDO PUEDE DECIR CÓMO SE LLAMA.
 * ═══════════════════════════════════════════════════════════════════════════
 *     const yo = await nombrePreguntando(sala, params.get('yo'), { juego });
 *
 * El enlace de invitar no lleva nombre a propósito —así UNO solo sirve para
 * todos, cada navegador coge el suyo y se sienta por orden— pero el precio era
 * que te sentabas llamándote `invitado-4nuq` sin que nadie te preguntara. En una
 * mesa de dos eso da igual; en una de cuatro, tres `invitado-` son tres
 * desconocidos y el historial de la partida deja de poder leerse.
 *
 * Se pregunta SÓLO cuando no hay nada de donde sacarlo:
 *
 *   · con `?yo=` en la dirección     no se pregunta (lo trae quien montó la sala)
 *   · con un nombre ya guardado      no se pregunta (vuelves tras recargar)
 *   · sin nada                       se pregunta, con el `invitado-` puesto ya
 *
 * Las dos primeras importan tanto como la tercera: preguntar al recargar sería
 * un estorbo cada vez que se refresca a media partida, y —peor— la respuesta
 * podría cambiar el nombre y con él la silla. Por eso se guarda en la MISMA
 * clave que usa `nombreParaSala`, y no en una paralela.
 *
 * ⚠️ Y LA SILLA SE PIDE DESPUÉS DE CONTESTAR, QUE ES MEDIO ARREGLO EN SÍ.
 * Antes, abrir el enlace ocupaba asiento en el acto: quien lo abría para echar
 * un vistazo y se iba dejaba una silla cogida por nadie. Ahora la reserva el
 * gesto de sentarse, no el de mirar.
 *
 * El recuadro se dibuja aquí, con su estilo dentro, porque esto lo llaman cuatro
 * páginas que no cargan las mismas hojas. Un `alert()` habría sido una línea, y
 * también habría sido un cuadro del navegador encima de una mesa 3D.
 *
 * @returns {Promise<string>} el nombre, ya limpio y guardado
 */
export function nombrePreguntando(sala, pedido, { juego = '', titulo = '' } = {}) {
    const limpio = limpiar(pedido, 24);
    if (limpio) return Promise.resolve(limpio);
    const clave = `alisa:sala:${sala}:yo`;
    const guardado = leer(clave);
    if (guardado) return Promise.resolve(guardado);
    // Sin documento no hay a quién preguntar —pruebas en node, agentes sin
    // pantalla—: se cae al comportamiento de siempre en vez de fallar.
    if (typeof document === 'undefined') return Promise.resolve(nombreParaSala(sala, pedido));

    const porDefecto = nombreSuelto();
    return new Promise((listo) => {
        const capa = document.createElement('div');
        capa.className = 'alisa-antesala';
        /**
         * ⚠️ EL TÍTULO SALE DEL DE LA PÁGINA, NO DE LA CLAVE DEL JUEGO.
         *
         * Con la clave se leía «entropy» en minúscula, y «gofish» habría salido así
         * en vez de «Go Fish». El catálogo de títulos vive en `rules/index.js` y
         * traerlo hasta aquí sería importar las reglas enteras para pintar una línea.
         *
         * Pero `montarMesa` ya pone `document.title = 'ALISA Arcade — Entropy'` en
         * todas las mesas, o sea que el nombre bueno ya está escrito y basta con
         * quitarle el prefijo. Si algún día no lo estuviera, se cae a la clave.
         */
        const nombreMesa = titulo
            || (document.title.split('—').pop() ?? '').trim()
            || juego || 'Una mesa';
        capa.innerHTML = `
            <div class="alisa-antesala-caja">
                <div class="alisa-antesala-titulo">${esc(nombreMesa)}</div>
                <div class="alisa-antesala-sub">sala <b>${esc(sala)}</b> · te sientas al abrir</div>
                <label for="alisa-antesala-n">Tu nombre en la mesa</label>
                <input id="alisa-antesala-n" type="text" maxlength="24" autocomplete="off"
                       spellcheck="false" value="${esc(porDefecto)}">
                <button type="button" id="alisa-antesala-ok">Sentarme</button>
                <div class="alisa-antesala-nota">Sólo distingue tu silla de las demás.
                    Si lo dejas así entras como <b>${esc(porDefecto)}</b>.</div>
            </div>`;
        const estilo = document.createElement('style');
        estilo.textContent = ESTILO_ANTESALA;
        capa.appendChild(estilo);
        document.body.appendChild(capa);

        const campo = capa.querySelector('#alisa-antesala-n');
        const cerrar = () => {
            // Si borra el campo entero se usa el de por defecto: quedarse sin
            // nombre no es una opción, y no vamos a regañar a nadie por un campo
            // vacío cuando ya tenemos una respuesta razonable.
            const elegido = limpiar(campo.value, 24) || porDefecto;
            guardar(clave, elegido);
            capa.remove();
            listo(elegido);
        };
        capa.querySelector('#alisa-antesala-ok').addEventListener('click', cerrar);
        campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') cerrar(); });
        // Se enfoca y se selecciona: escribir sustituye, y el `invitado-` sigue
        // ahí para quien no quiera pensarlo.
        setTimeout(() => { campo.focus(); campo.select(); }, 40);
    });
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ESTILO_ANTESALA = `
.alisa-antesala {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(8, 6, 16, 0.82); backdrop-filter: blur(3px);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
}
.alisa-antesala-caja {
    width: min(420px, calc(100vw - 32px));
    padding: 22px 22px 18px;
    background: #14101f; color: #e0e0ec;
    border: 1px solid rgba(160, 140, 220, 0.35); border-radius: 12px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);
}
.alisa-antesala-titulo { font-size: 19px; font-weight: 700; }
.alisa-antesala-sub { margin-top: 3px; font-size: 12px; color: rgba(226, 226, 240, 0.5); }
.alisa-antesala label {
    display: block; margin: 16px 0 6px;
    font-size: 10px; letter-spacing: 0.11em; text-transform: uppercase;
    color: rgba(226, 226, 240, 0.55);
}
.alisa-antesala input {
    width: 100%; box-sizing: border-box; padding: 11px 12px;
    background: rgba(255, 255, 255, 0.05); color: #e0e0ec;
    border: 1px solid rgba(160, 140, 220, 0.35); border-radius: 8px;
    font: inherit; font-size: 15px;
}
.alisa-antesala input:focus { outline: none; border-color: #a78bfa; }
.alisa-antesala button {
    width: 100%; margin-top: 14px; padding: 12px;
    background: linear-gradient(90deg, #7c3aed, #a78bfa); color: #fff;
    border: 0; border-radius: 8px; cursor: pointer;
    font: inherit; font-size: 15px; font-weight: 700;
}
.alisa-antesala-nota {
    margin-top: 10px; font-size: 11px; line-height: 1.5;
    color: rgba(226, 226, 240, 0.42);
}
`;

/**
 * ⚠️ UNA MESA QUE ESPERA TIENE QUE PARECER QUE ESPERA.
 *
 * Al mandar `jugadores`, la mesa deja de arrancar con una sola persona: se queda
 * quieta hasta que llegue la otra. Eso es lo correcto —así nadie le pierde la
 * silla a nadie— y a la vez es exactamente lo que se lee como «esto está
 * colgado» si la pantalla no lo cuenta: juegas tu turno, pasa el turno a un
 * asiento vacío y no vuelve a moverse nada.
 *
 * El árbitro publicaba `waiting_for` desde el principio y no lo leía NADIE. El
 * dato estaba, faltaba enseñarlo — que es el mismo patrón que el objetivo que no
 * llegaba a las salas.
 *
 * Va aquí y no en el panel porque hay tres caminos de panel distintos y cuatro
 * páginas que entran a una sala; puesto en `refrescar()`, ninguna se queda sin
 * él. Y lleva el enlace: quien está esperando es justo quien necesita mandarlo.
 */
function pintarEspera(m, sala, yo, alEmpezar) {
    if (typeof document === 'undefined') return;
    const faltan = Number(m?.waiting_for) || 0;
    let caja = document.getElementById('alisa-espera');
    if (!faltan) { caja?.remove(); return; }
    if (!caja) {
        caja = document.createElement('div');
        caja.id = 'alisa-espera';
        document.body.appendChild(caja);
        // El estilo va a la cabecera y una sola vez: dentro de la caja lo borraría
        // el primer `innerHTML`, y volver a meterlo en cada repintado deja una pila
        // de hojas idénticas creciendo mientras dure la espera.
        if (!document.getElementById('alisa-espera-css')) {
            const estilo = document.createElement('style');
            estilo.id = 'alisa-espera-css';
            estilo.textContent = ESTILO_ESPERA;
            document.head.appendChild(estilo);
        }
    }
    const texto = faltan === 1 ? 'Falta una persona por sentarse'
                               : `Faltan ${faltan} personas por sentarse`;
    /**
     * ⚠️ «EMPEZAR YA» SÓLO SI ESTÁS SENTADO, Y ESO SE MIRA AQUÍ.
     *
     * Quien mira desde fuera no arranca la partida de otros. El árbitro lo
     * rechaza igualmente —comprueba silla y secreto—, pero ofrecer un botón que
     * va a rebotar es peor que no ofrecerlo: parece que puedes y no puedes.
     */
    const sentado = (m?.seats ?? []).some(a => a.who === yo);
    const firma = `${texto}·${sentado}`;
    // Se repinta sólo si cambió: dentro hay botones, y rehacerlos en cada latido
    // los quitaría de debajo del dedo justo cuando alguien va a pulsar.
    if (caja.dataset.firma === firma) return;
    caja.dataset.firma = firma;
    const enlace = `${location.origin}${location.pathname}?sala=${encodeURIComponent(sala)}`;
    caja.innerHTML = `<span class="alisa-espera-txt">${esc(texto)}</span>
        <button type="button" class="alisa-espera-btn" data-que="copiar">copiar enlace</button>`
        + (sentado ? `<button type="button" class="alisa-espera-btn" data-que="empezar">empezar ya</button>` : '');
    caja.querySelector('[data-que="copiar"]').addEventListener('click', (e) => {
        // Sin `clipboard` —o sin permiso— se enseña el enlace para copiarlo a mano
        // en vez de dejar un botón que no hace nada.
        navigator.clipboard?.writeText(enlace)
            .then(() => { e.target.textContent = 'copiado'; })
            .catch(() => { e.target.textContent = enlace; });
    });
    caja.querySelector('[data-que="empezar"]')?.addEventListener('click', (e) => {
        e.target.disabled = true;
        e.target.textContent = 'empezando…';
        alEmpezar?.();
    });
}

const ESTILO_ESPERA = `
#alisa-espera {
    position: fixed; top: 14px; left: 50%; transform: translateX(-50%); z-index: 9998;
    display: flex; align-items: center; gap: 12px;
    padding: 9px 14px; border-radius: 999px;
    background: rgba(20, 16, 31, 0.92); color: #e0e0ec;
    border: 1px solid rgba(160, 140, 220, 0.4);
    font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
#alisa-espera .alisa-espera-btn {
    padding: 5px 10px; border-radius: 999px; cursor: pointer;
    background: rgba(167, 139, 250, 0.18); color: #cbb6ff;
    border: 1px solid rgba(167, 139, 250, 0.45);
    font: inherit; font-size: 11px;
}
`;

/**
 * @param {object} cfg
 *   sala, yo, juego, semilla   qué partida y quién eres
 *   mesas       opcional: otro árbitro (para pruebas)
 *   avisar      qué hacer con el motivo de un rechazo; por defecto, nada
 *   puedoJugar  si la silla la lleva una persona o algo automático. `mesa.html`
 *               le pasa su `?asientos=`; una mesa sin esa idea deja el sí.
 *   esperaA     a cuántas PERSONAS espera la mesa antes de que la casa rellene
 *               los huecos. Por defecto `'todas'` —las sillas que el juego
 *               declare—; se puede pasar un número para esperar a menos.
 */
export function crearSala({ sala, yo, juego, semilla, mesas = MESAS,
                            avisar = () => {}, puedoJugar = () => true,
                            esperaA = 'todas' }) {
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
            const ocupados = (m.seats ?? []).length;
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
            const sillas = m.max_seats ?? m.seats_seen ?? 1;
            const yaEstoy = (m.seats ?? []).some(a => a.who === yo);
            /**
             * ⚠️ «ANTES DE LA PRIMERA JUGADA PASA CUALQUIERA» SÓLO VALE SIN TOPE.
             *
             * Esto era `yaEstoy || m.moves === 0 || ocupados < sillas`, y el `moves
             * === 0` se tragaba la comprobación entera justo en el momento en que
             * más se usa: dos betatesters sentados y todavía sin mover.
             *
             * Medido con tres pestañas en una mesa de entropy: el tercero pasaba el
             * filtro, pedía silla, el árbitro le devolvía su 409 con el motivo —«la
             * mesa está completa: Entropy es de 2 jugadores»— y la página se quedaba
             * enseñándole la partida con «le toca a ana…». Ni jugador ni espectador:
             * la misma pantalla que un jugador esperando su turno, esperando un
             * turno que no iba a llegar nunca.
             *
             * El escape existía para cuando no se sabía cuántas sillas había. Ahora
             * `max_seats` lo declara el juego, así que se reserva para eso: si NO
             * hay tope declarado —worker viejo—, sigue pasando.
             */
            const sinTopeDeclarado = m.max_seats == null;
            return yaEstoy || ocupados < sillas || (sinTopeDeclarado && m.moves === 0);
        },

        async entrar() {
            if (!(await this.mirarPrimero())) {
                this.espectador = true;
                return true;                 // se ve la partida, no se juega
            }
            /**
             * ⚠️ `jugadores` NO SE MANDABA, Y POR ESO LA CASA SE SENTABA EN TU SITIO.
             *
             * El árbitro espera a `jugadores` antes de rellenar huecos, y el cliente
             * web no lo decía nunca: la mesa quedaba con `esperaA = 1`, o sea «en
             * cuanto haya uno, adelante». Medido en una sala de entropy con una sola
             * persona: ocho jugadas suyas y `played_by_house: 1` — la casa ya estaba
             * jugando la silla del amigo que todavía venía de camino.
             *
             * Es exactamente lo que rompe el enlace único: repartes UN enlace, el
             * primero que llega empieza a jugar mientras espera, y para cuando el
             * segundo abre, su asiento lleva rato en manos de la casa.
             *
             * ⚠️ SE ESPERA A TODAS LAS SILLAS, Y ANTES ERAN DOS.
             *
             * Dos arreglaba el caso de la pareja y dejaba el de cuatro igual de
             * roto: en un parchís con un enlace repartido, el tercero y el cuarto
             * llegaban a encontrarse la casa en sus sitios. Se descartó `max_seats`
             * la primera vez por miedo a dejar mesas paradas para siempre — y ese
             * miedo era correcto, pero la respuesta no era esperar a menos gente:
             * era poder decir «ya estamos». Eso es `/empezar`, y con él la espera es
             * una oferta en vez de una condición.
             *
             * Va como palabra y no como número porque el número lo sabe el árbitro:
             * aquí, al sentarse, todavía no se ha visto la respuesta que trae
             * `max_seats`. Los solitarios no se enteran: allí `'todas'` es una.
             */
            const r = await this.pedir('/sentarse',
                { quien: yo, tipo: 'persona', juego, semilla, jugadores: esperaA });
            // Un «no» con motivo se enseña tal cual. La mesa se toma la molestia de
            // explicar por qué en algunos juegos no cabe un segundo; tragarse esa
            // explicación y dejar la pantalla en blanco sería desperdiciarla.
            /**
             * ⚠️ Y SI EL «NO» ES «ESTÁ LLENA», SE MIRA. ES EL CINTURÓN DEL FILTRO.
             *
             * `mirarPrimero()` decide con lo que la mesa contó hace un instante, y
             * entre esa foto y la petición cabe otra persona: dos pestañas que abren
             * el enlace a la vez ven las dos un hueco, y una de las dos se lo
             * encuentra ocupado al llegar. Con el filtro arreglado eso deja de pasar
             * casi siempre, pero «casi siempre» no es una carrera ganada.
             *
             * Quien llega tarde a una mesa llena no ha fallado en nada: ha llegado a
             * ver una partida. Eso es exactamente un espectador, y así el 409 se
             * convierte en una pantalla que dice qué pasa en vez de un limbo.
             */
            if (r.codigo === 409) { this.ultimo = r; this.espectador = true; return true; }
            if (r.codigo !== 200) { this.ultimo = r; return false; }
            /**
             * Sólo se pisa el secreto si llega uno NUEVO. Cuando vuelves tras
             * recargar, la mesa responde `ya_sentado` sin secreto: machacar el
             * guardado con ese `undefined` sería tirar la llave que acabábamos de
             * recuperar, y volveríamos al 403 que esto viene a arreglar.
             */
            if (r.secret) { secreto = r.secret; guardar(LLAVE, secreto); }
            this.ultimo = r;
            return true;
        },

        // `?quien=` es lo que hace que la mesa enseñe TU mano y no la del asiento 0.
        // Sin él se recibe la vista canónica, que es la del primero que se sentó.
        async refrescar() {
            this.ultimo = await this.pedir(`?quien=${encodeURIComponent(yo)}`);
            pintarEspera(this.ultimo, sala, yo, () => this.empezar());
        },

        /**
         * «Ya estamos, que juegue la casa el resto.» Ver la nota de `/empezar` en
         * el árbitro: sin esto, esperar a todas las sillas dejaría una mesa de
         * cuatro parada para siempre en cuanto sólo aparecieran dos.
         */
        async empezar() {
            const r = await this.pedir('/empezar', { quien: yo, secreto });
            if (r.codigo === 200) { this.ultimo = r; pintarEspera(r, sala, yo, null); return true; }
            avisar(r.error ?? 'no se pudo empezar');
            return false;
        },

        estado() { return this.ultimo?.state ?? {}; },

        /**
         * ⚠️ EN UNA SALA SÓLO MANDAS SOBRE TU SILLA.
         * Las demás las lleva quien se haya sentado en ellas, en su propia pestaña.
         */
        miIndice: () => 0,
        indiceTurno() { return this.ultimo?.turn === yo ? 0 : -1; },
        meToca() { return this.ultimo?.turn === yo && puedoJugar(); },
        acciones() { return this.ultimo?.legal_moves ?? []; },

        async jugar(m) {
            const r = await this.pedir('/jugar', { quien: yo, jugada: m, secreto });
            // (`quien`, `jugada` y `secreto` son de ENTRADA: los lee el worker,
            //  y sus nombres viven en las rutas, que no se traducen.)
            if (r.codigo === 200) { this.ultimo = r; avisar(''); return; }
            // El árbitro dijo que no, y casi siempre por un motivo legítimo: otro se
            // adelantó entre que se pintó el botón y se pulsó. Se adopta SU estado,
            // que es el bueno — el de esta pestaña ya era viejo.
            avisar(r.error ?? 'la jugada no entró');
            if (r.estado) this.ultimo = r; else await this.refrescar();
        },

        recibo() { return this.ultimo?.receipt; },

        resumen() {
            const m = this.ultimo;
            if (!m?.seats) return '';
            const quien = m.seats.map(a =>
                `${a.who === yo ? '<b>' + a.who + ' (tú)</b>' : a.who}`
                + `<span class="dato"> · ${a.seat ?? '—'}</span>`).join(' &nbsp;·&nbsp; ');
            const casa = m.played_by_house
                ? ` &nbsp;·&nbsp; <span class="dato">+${m.played_by_house} de la casa</span>` : '';
            return `sala <b>${sala}</b> &nbsp;·&nbsp; ${quien}${casa}`;
        },
    };
}
