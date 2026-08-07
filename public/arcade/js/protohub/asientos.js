/**
 * asientos.js — QUIÉN OCUPA CADA SILLA: personas, políticas y modelos, mezclados
 * ═══════════════════════════════════════════════════════════════════════════
 * Una mesa de este proyecto tiene N asientos, y cada uno lo puede llevar:
 *
 *   · una PERSONA   — pulsa los botones, que son `legal_moves`;
 *   · una POLÍTICA  — las mismas `primera`, `azar` y `casa` que hacen de línea
 *                     base en la tabla de clasificación, sin una copia nueva;
 *   · un MODELO     — lee `describe()` y contesta un número, exactamente igual
 *                     que en el banco de pruebas.
 *
 * Y se combinan como se quiera: persona contra modelo, modelo contra política,
 * dos modelos distintos, cuatro políticas jugando solas mientras alguien mira.
 *
 * ⚠️ LAS TRES PUERTAS SON LA MISMA MESA
 * Esto no es un modo «contra la IA» pegado al juego. Los tres controladores
 * reciben LO MISMO —el estado y la lista de jugadas legales— y devuelven una de
 * esas jugadas. Por eso una partida entre una persona y un modelo produce el
 * mismo recibo `{juego, semilla, jugadas}` que cualquier otra, y se verifica
 * igual. Si cada tipo de jugador tuviera su propio camino, no se podrían
 * comparar y el banco de pruebas no mediría nada.
 *
 * ⚠️ UNA POLÍTICA NO ES UN MODELO, Y AQUÍ SE NOTA
 * `casa` recibe la partida entera porque es código: le pregunta al juego su
 * sugerencia. Un modelo sólo recibe texto y no puede tocar nada. Esa frontera
 * está en `politicas.js` y aquí se respeta — un modelo no puede hacer lo que
 * hace `casa`, y es importante que quien lea la tabla lo sepa.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { POLITICAS } from '../agentes/politicas.js';
import { construirPrompt, interpretar } from '../agentes/llm.js';
import { describirEstado, opcionesDe } from './descripcion.js';

/**
 * El catálogo de lo que puede sentarse.
 *
 * Las claves son las que viajan en la URL (`?asientos=persona,fsm:casa`), así
 * que son parte del contrato: si cambian, se rompen los enlaces compartidos.
 */
export const CONTROLADORES = {
    persona: { etiqueta: 'persona', tipo: 'persona',
               ayuda: 'pulsa los botones' },
    'fsm:primera': { etiqueta: 'FSM · primera', tipo: 'politica',
                     ayuda: 'siempre la primera opción — el suelo del banco' },
    'fsm:azar': { etiqueta: 'FSM · azar', tipo: 'politica',
                  ayuda: 'al azar entre las legales, reproducible' },
    'fsm:casa': { etiqueta: 'FSM · casa', tipo: 'politica',
                  ayuda: 'la heurística del propio juego — el techo blando' },
    llm: { etiqueta: 'modelo', tipo: 'llm',
           ayuda: 'lee la partida en texto y contesta un número' },
};

/** ¿Este asiento lo lleva alguien de carne y hueso? */
export const esPersona = (spec) => (spec ?? 'persona') === 'persona';

/**
 * Un proveedor de modelo que habla con un servidor compatible con OpenAI.
 *
 * ⚠️ SE PIDE LA DIRECCIÓN, NO SE ADIVINA. `proveedores.js` trae `ollama`
 * apuntando a `127.0.0.1:11434`, que va de maravilla con la página servida en
 * local y NO puede funcionar desde `https://alisa.systems`: un navegador no deja
 * que una página segura llame a `http://`. Fingir que sí y fallar en silencio
 * sería peor que preguntar, así que el campo está a la vista y dice para qué es.
 */
export function proveedorHTTP({ url, modelo, temperatura = 0 }) {
    return async (prompt) => {
        const t0 = Date.now();
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                model: modelo,
                messages: [{ role: 'user', content: prompt }],
                temperature: temperatura,
                stream: false,
            }),
        });
        if (!r.ok) throw new Error(`el modelo contestó ${r.status}`);
        const d = await r.json();
        const texto = d.choices?.[0]?.message?.content
                   ?? d.message?.content ?? d.response ?? '';
        return { texto, ms: Date.now() - t0 };
    };
}

/**
 * Construye el que decide por un asiento.
 *
 * @returns {{tipo: string, etiqueta: string, elegir: (ctx) => Promise<string|null>}}
 *          `elegir` recibe `{juego, st, acciones, p, reglas}` y devuelve UNA de
 *          las acciones, o `null` si no ha sabido.
 */
export function crearControlador(spec, { juego, reglas, llm } = {}) {
    const clave = String(spec ?? 'persona');

    if (esPersona(clave)) {
        return { tipo: 'persona', etiqueta: 'persona', elegir: async () => null };
    }

    if (clave.startsWith('fsm:')) {
        const nombre = clave.slice(4);
        const fabrica = POLITICAS[nombre];
        if (!fabrica) throw new Error(`no existe la política '${nombre}'`);
        const politica = fabrica();
        return {
            tipo: 'politica',
            etiqueta: CONTROLADORES[clave]?.etiqueta ?? clave,
            async elegir({ st, acciones, p }) {
                const opciones = acciones.map(a => ({ verb: a, label: a }));
                if (!opciones.length) return null;
                // La firma es la del banco: `(env, opciones, Clase)`. Se le da un
                // `env` con la partida dentro y una `Clase` con las reglas, que es
                // lo único que `casa` mira. Así corre el MISMO código que produce
                // las líneas base de la tabla, sin una versión «de página».
                const i = politica({ p }, opciones, { reglas });
                return opciones[Math.max(0, Math.min(i | 0, opciones.length - 1))].verb;
            },
        };
    }

    if (clave.startsWith('llm')) {
        if (!llm?.url || !llm?.modelo) {
            throw new Error('un asiento de modelo necesita dirección y nombre del modelo');
        }
        const proveedor = proveedorHTTP(llm);
        return {
            tipo: 'llm',
            etiqueta: `modelo · ${llm.modelo}`,
            async elegir({ juego: j, st, acciones }) {
                const opciones = acciones.map(a => ({ verb: a, label: a }));
                if (!opciones.length) return null;
                // El mismo prompt y el mismo intérprete que en el banco. En
                // `estricto` porque aquí no se está evaluando la elocuencia.
                const env = { describe: () => describirEstado(j ?? juego, st) };
                const { texto } = await proveedor(construirPrompt(env, opciones, true));
                const i = interpretar(texto, opciones);
                // ⚠️ Cuando el modelo no acierta a elegir NO se juega por él en
                // silencio: se devuelve `null` y quien llama decide. En el banco
                // eso se cuenta como «forzada» y se publica el porcentaje; una
                // mesa que rellenara el hueco sin decirlo estaría regalando
                // partidas a un modelo que no supo jugarlas.
                return i >= 0 ? opciones[i].verb : null;
            },
        };
    }

    throw new Error(`no sé quién es '${clave}'`);
}

/**
 * Lee y escribe la lista de asientos en la URL.
 *
 * Que viaje en la dirección es lo que hace que una mesa se pueda COMPARTIR ya
 * montada: «juega tú de blancas contra mi modelo» es un enlace, no un párrafo de
 * instrucciones.
 */
export const leerAsientos = (params) =>
    String(params.get('asientos') ?? '').split(',').map(s => s.trim()).filter(Boolean);

/**
 * El panel para elegir quién lleva cada asiento.
 *
 * @param {object} opts
 *   nodo       — dónde pintarlo
 *   asientos   — nombres de los asientos del juego, en orden de turno
 *   valores    — spec actual de cada uno
 *   alCambiar  — (indice, spec) => void
 *   fijos      — índices que no se pueden cambiar (p.ej. el tuyo en una sala)
 */
export function pintarPanel({ nodo, asientos, valores, alCambiar, fijos = [],
                              excluir = [], llm, alCambiarLlm }) {
    nodo.innerHTML = '';
    asientos.forEach((nombre, i) => {
        const fila = document.createElement('div');
        fila.className = 'asiento';
        const etiqueta = document.createElement('span');
        etiqueta.className = 'dato';
        etiqueta.textContent = nombre ?? `asiento ${i + 1}`;
        fila.appendChild(etiqueta);

        const sel = document.createElement('select');
        sel.disabled = fijos.includes(i);
        for (const [clave, c] of Object.entries(CONTROLADORES)) {
            // Un controlador que no puede funcionar aquí no se enseña apagado:
            // no se enseña. Ver el motivo en quien llama con `excluir`.
            if (excluir.includes(clave)) continue;
            const o = document.createElement('option');
            o.value = clave;
            o.textContent = c.etiqueta;
            o.title = c.ayuda;
            if (clave === (valores[i] ?? 'persona')) o.selected = true;
            sel.appendChild(o);
        }
        sel.onchange = () => alCambiar(i, sel.value);
        fila.appendChild(sel);
        nodo.appendChild(fila);
    });

    // Los datos del modelo sólo aparecen si hay algún asiento que los necesite:
    // enseñar una casilla de dirección a quien juega con personas es ruido.
    if (valores.some(v => String(v ?? '').startsWith('llm'))) {
        const caja = document.createElement('div');
        caja.className = 'asiento llm';
        caja.innerHTML =
            `<span class="dato">modelo</span>` +
            `<input id="llm_url" placeholder="http://127.0.0.1:11434/v1/chat/completions" value="${llm?.url ?? ''}">` +
            `<input id="llm_modelo" placeholder="llama3.2" value="${llm?.modelo ?? ''}">`;
        nodo.appendChild(caja);
        const leer = () => alCambiarLlm({
            url: caja.querySelector('#llm_url').value.trim(),
            modelo: caja.querySelector('#llm_modelo').value.trim(),
        });
        caja.querySelector('#llm_url').onchange = leer;
        caja.querySelector('#llm_modelo').onchange = leer;
        const nota = document.createElement('div');
        nota.className = 'dato nota';
        // Se dice ANTES de que falle, no después.
        nota.textContent = location.protocol === 'https:'
            ? 'ojo: desde una página https el navegador no deja llamar a http://127.0.0.1. '
            + 'Con Ollama en tu máquina, abre esta página en local; si no, pon una dirección https.'
            : 'con Ollama: ollama serve, y aquí la dirección /v1/chat/completions.';
        nodo.appendChild(nota);
    }
}
