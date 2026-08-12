/**
 * reportar.js — «esto va raro», y la partida que lo provocó
 * ═══════════════════════════════════════════════════════════════════════════
 * Un botón discreto en todas las mesas. Quien lo pulsa escribe qué ha visto, y
 * el aviso viaja con el RECIBO de la partida: `{juego, semilla, jugadas}`.
 *
 * ⚠️ POR QUÉ EL RECIBO Y NO SÓLO EL COMENTARIO. ES TODA LA IDEA.
 *
 * «Las cartas se ven raras» no se puede arreglar. «Las cartas se ven raras» más
 * la partida exacta sí: aquí una partida se VUELVE A JUGAR con esos tres datos
 * —es lo que hace el verificador— así que un aviso deja de ser una anécdota y
 * pasa a ser algo reproducible. Se abre el mismo enlace, sale el mismo reparto,
 * se repiten las mismas jugadas y se mira.
 *
 * Este proyecto lleva un día entero demostrando que aquí los fallos no dan error:
 * dan verde y mienten. La brisca repartía entropy, las cartas llevaban años
 * ilegibles, el póker no tenía forma de jugar. Ninguno se habría encontrado por un
 * informe; todos por MIRAR una partida concreta. Esto es darle a un desconocido la
 * capacidad de señalar exactamente cuál.
 *
 * ⚠️ Y LO QUE VE EL NAVEGADOR, QUE ES LA MITAD QUE FALTA.
 *
 * Va también el tamaño de la ventana y si estaba oculta. Los dos han mentido hoy:
 * una proporción de pantalla rara descuadraba el encuadre, y con la ventana
 * minimizada no hay fotogramas —`document.hidden`— así que la página parece viva
 * y no dibuja. Sin esos dos datos, la mitad de los avisos serían irreproducibles.
 *
 * ⚠️ NO SE MANDA NADA SIN QUE ALGUIEN LO PULSE. No hay telemetría, no hay envío
 * automático y no se recoge nada al cargar la página. Se manda lo que se ve en el
 * cuadro, cuando se le da a mandar, y se dice antes de mandarlo.
 */

const BUZON = 'https://alisa-mesas.prime-6d5.workers.dev/reporte';

/** Lo que se manda. Se construye aquí para poder enseñarlo antes de enviarlo. */
function recoger(comentario) {
    const hub = window.ALISA_PROTOHUB;
    const juego = window.ALISA_JUEGO
        ?? [...(hub?.reglas?.keys?.() ?? [])][0]
        ?? null;

    let recibo = null;
    try {
        // `partida()` devuelve el RECIBO —{juego, semilla, jugadas}—, no la partida
        // viva. Aquí es justo lo que hace falta, y conviene decirlo porque
        // confundirlo ya costó una tarde en la mesa de cartas.
        recibo = juego ? hub.partida(juego) : null;
    } catch { /* si no se puede, se manda el aviso igual: vale menos, no nada */ }

    let estado = null;
    try {
        const st = juego ? hub.state(juego) : null;
        // Del estado sólo lo que sitúa el aviso. La mano entera no: no hace falta
        // para reproducir —el recibo la reconstruye— y es de quien la tiene.
        if (st) estado = { turn: st.turn, fase: st.fase, is_game_over: st.is_game_over,
                           legal_moves: (st.legal_moves ?? []).length };
    } catch { /* igual */ }

    return {
        comentario: String(comentario).slice(0, 2000),
        juego,
        pagina: location.pathname + location.search,
        recibo,
        estado,
        // Lo que ve el navegador. Ver la nota de arriba: los dos han mentido hoy.
        pantalla: { ancho: innerWidth, alto: innerHeight,
                    dpr: Math.round((devicePixelRatio ?? 1) * 100) / 100,
                    oculta: document.hidden,
                    /**
                     * ⚠️ QUÉ APARATO, Y SE DEDUCE DE TRES COSAS, NO DE UNA.
                     *
                     * La cadena del navegador miente por diseño —un iPad lleva años
                     * diciendo «Macintosh»— y sólo por el ancho tampoco vale: una
                     * ventana estrecha en un escritorio no es un móvil, y esa
                     * diferencia importa porque el encuadre de estas mesas cambia
                     * con la FORMA de la pantalla y ya nos costó un fallo.
                     *
                     * Así que se juntan las tres señales que sí dicen algo distinto:
                     * si hay dedos (`pointer: coarse`), la orientación, y el ancho.
                     * Y va también la cadena entera para poder desmentir esto.
                     */
                    aparato: (() => {
                        const dedos = matchMedia?.('(pointer: coarse)')?.matches ?? false;
                        const menor = Math.min(innerWidth, innerHeight);
                        if (!dedos) return 'escritorio';
                        return menor < 520 ? 'móvil' : 'tableta';
                    })(),
                    vertical: innerHeight > innerWidth },
        agente: navigator.userAgent.slice(0, 180),
        cuando: new Date().toISOString(),
    };
}

function montar() {
    if (document.getElementById('alisa-reportar')) return;

    const boton = document.createElement('button');
    boton.id = 'alisa-reportar';
    boton.type = 'button';
    boton.textContent = '¿algo va raro?';
    boton.title = 'Cuéntanoslo. Se manda con la partida exacta para poder repetirla.';
    Object.assign(boton.style, {
        position: 'fixed', right: '14px', bottom: '14px', zIndex: 99998,
        padding: '9px 14px', borderRadius: '999px', cursor: 'pointer',
        border: '1px solid rgba(161,128,255,0.45)', background: 'rgba(18,16,28,0.82)',
        color: '#cbbcff', font: '600 12px/1 Inter, system-ui, sans-serif',
        backdropFilter: 'blur(6px)',
    });
    document.body.appendChild(boton);

    boton.onclick = () => {
        if (document.getElementById('alisa-reportar-caja')) return;

        const caja = document.createElement('div');
        caja.id = 'alisa-reportar-caja';
        Object.assign(caja.style, {
            position: 'fixed', right: '14px', bottom: '58px', zIndex: 99999,
            width: 'min(380px, calc(100vw - 28px))', padding: '16px',
            borderRadius: '14px', border: '1px solid rgba(161,128,255,0.35)',
            background: 'rgba(14,12,22,0.96)', color: '#e2e2f0',
            font: '13px/1.5 Inter, system-ui, sans-serif',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        });
        caja.innerHTML = `
            <div style="font-weight:700;margin-bottom:6px">¿Qué has visto?</div>
            <div style="color:#8a8a9e;font-size:11px;margin-bottom:10px">
              Va con la partida exacta, para poder repetirla igual. Nada más.
            </div>
            <textarea id="ar-txt" rows="4" placeholder="p. ej.: las cartas se amontonan y no leo la mía"
              style="width:100%;box-sizing:border-box;padding:8px;border-radius:8px;
                     border:1px solid rgba(255,255,255,0.14);background:#0b0a12;
                     color:#e2e2f0;font:13px/1.4 inherit;resize:vertical"></textarea>
            <details style="margin:10px 0 12px">
              <summary style="cursor:pointer;color:#8a8a9e;font-size:11px">qué se manda</summary>
              <pre id="ar-json" style="max-height:150px;overflow:auto;margin:8px 0 0;
                   font-size:10px;color:#9aa3b2;white-space:pre-wrap"></pre>
            </details>
            <div style="display:flex;gap:8px;justify-content:flex-end">
              <button id="ar-no" type="button" style="padding:7px 12px;border-radius:8px;
                border:1px solid rgba(255,255,255,0.14);background:transparent;
                color:#8a8a9e;cursor:pointer;font:inherit">dejarlo</button>
              <button id="ar-si" type="button" style="padding:7px 14px;border-radius:8px;
                border:0;background:#a180ff;color:#12101c;cursor:pointer;
                font:600 13px inherit">mandarlo</button>
            </div>
            <div id="ar-fin" style="margin-top:10px;font-size:11px;color:#8a8a9e"></div>`;
        document.body.appendChild(caja);

        const txt = caja.querySelector('#ar-txt');
        const json = caja.querySelector('#ar-json');
        // ⚠️ Se enseña ANTES de mandarlo, y se actualiza mientras se escribe. Nadie
        // manda a ciegas algo que no puede ver: es su partida, no la nuestra.
        const refrescar = () => { json.textContent = JSON.stringify(recoger(txt.value), null, 1); };
        refrescar();
        txt.oninput = refrescar;
        txt.focus();

        caja.querySelector('#ar-no').onclick = () => caja.remove();
        caja.querySelector('#ar-si').onclick = async () => {
            const fin = caja.querySelector('#ar-fin');
            const cuerpo = recoger(txt.value);
            if (!cuerpo.comentario.trim()) { fin.textContent = 'Escribe algo primero.'; return; }
            fin.textContent = 'mandando…';
            try {
                const r = await fetch(BUZON, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(cuerpo),
                });
                if (!r.ok) throw new Error(`el buzón contestó ${r.status}`);
                fin.textContent = '¡Gracias! Con esto se puede repetir la partida.';
                setTimeout(() => caja.remove(), 1800);
            } catch (e) {
                /**
                 * ⚠️ SI EL BUZÓN NO CONTESTA, NO SE PIERDE EL AVISO.
                 * Un botón que se traga lo que alguien se ha molestado en escribir
                 * es peor que no tenerlo. Se deja el texto a la vista y se ofrece
                 * copiarlo, que es lo único que se puede prometer sin red.
                 */
                fin.innerHTML = `No llegó (${String(e.message).slice(0, 60)}). `
                              + `<a href="#" id="ar-copiar" style="color:#a180ff">copiar y mandarlo a mano</a>`;
                caja.querySelector('#ar-copiar').onclick = (ev) => {
                    ev.preventDefault();
                    navigator.clipboard?.writeText(JSON.stringify(cuerpo, null, 1))
                        .then(() => { fin.textContent = 'Copiado. Pégaselo a Oscar.'; })
                        .catch(() => { json.textContent = JSON.stringify(cuerpo, null, 1); });
                };
            }
        };
    };
}

if (document.body) montar();
else addEventListener('DOMContentLoaded', montar);
