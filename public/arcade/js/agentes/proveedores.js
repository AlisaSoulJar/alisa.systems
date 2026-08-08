/**
 * proveedores.js — de dónde sale una respuesta de modelo
 * ═══════════════════════════════════════════════════════════════════════════
 * Un proveedor es una función `async (prompt) => { texto, entrada, salida, ms }`.
 * Nada más. El arnés no sabe si detrás hay un modelo de 600 MB en tu portátil,
 * una API de pago o un dado: sólo pide texto y cuenta lo que cuesta.
 *
 * Esa frontera es a propósito. El día que se añada un proveedor nuevo, el arnés
 * y la tabla no se tocan — y sobre todo: **el proveedor no puede tocar el
 * entorno**. Un modelo no ve el estado interno, no elige la semilla y no puede
 * saltarse el verificador. Sólo devuelve texto.
 *
 * `entrada` y `salida` son tokens si el proveedor los da. Si no, se estiman por
 * caracteres —y se dice, para que nadie compare una estimación con una medida
 * creyendo que son lo mismo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Estimación grosera cuando el proveedor no informa. ~4 caracteres por token. */
const estimarTokens = (s) => Math.ceil((s ?? '').length / 4);

/**
 * Ollama local. Cero euros y cero datos fuera de la máquina.
 *
 * Se usa `/api/chat` con `stream:false` y temperatura 0: sin determinismo del
 * modelo, dos ejecuciones del mismo agente sobre la misma semilla darían
 * partidas distintas, y entonces la fila de la tabla no se puede repetir. El
 * entorno es reproducible; el agente debe intentarlo también.
 */
/**
 * ⚠️ EL PRESUPUESTO DE SALIDA ERA **24 TOKENS**, Y ESO EXPULSABA A LOS MODELOS
 * QUE RAZONAN.
 *
 * Veinticuatro sobran para contestar «7», que es lo que hace un modelo pequeño.
 * Pero uno que piensa en voz alta gasta cientos antes de decidir, así que se
 * quedaba sin frase a mitad del razonamiento y no llegaba nunca a la jugada.
 * Medido: `qwen3:8b` y `phi4-mini-reasoning` fallaban **la mitad exacta** de sus
 * jugadas, 11 de 22 las dos.
 *
 * Y lo peligroso es cómo se leía ese número. `forzadas` existe para detectar
 * modelos que no saben elegir; aquí decía que dos modelos capaces jugaban fatal
 * cuando lo que pasaba es que les cortábamos la boca. Una tabla publicada con
 * eso habría ordenado a los participantes por «¿escupe el token pelado?» — y hoy
 * casi todos los modelos punteros piensan antes de responder.
 *
 * El límite alto no sale caro a los demás: un modelo terso emite su respuesta y
 * para. Sólo gasta quien necesita gastar.
 */
const TOPE_SALIDA = Number(process.env?.ALISA_TOPE_SALIDA ?? 1536);

export function ollama({ modelo, url = 'http://127.0.0.1:11434', temperatura = 0 } = {}) {
    const fn = async (prompt) => {
        const t0 = Date.now();
        const r = await fetch(`${url}/api/chat`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                model: modelo,
                stream: false,
                options: { temperature: temperatura, num_predict: TOPE_SALIDA },
                messages: [
                    { role: 'system', content: 'Eres un jugador. Respondes SOLO con el número de la opción elegida. Nada más.' },
                    { role: 'user', content: prompt },
                ],
            }),
        });
        if (!r.ok) throw new Error(`ollama ${r.status}: ${(await r.text()).slice(0, 120)}`);
        const j = await r.json();
        /**
         * ⚠️ HAY MODELOS QUE ESCRIBEN EN OTRO CAMPO, Y LOS DÁBAMOS POR MUDOS.
         *
         * Ollama separa el razonamiento (`message.thinking`) de la respuesta
         * (`message.content`) en los modelos que piensan. Medido con `qwen3:8b`:
         * `content` venía **vacío** con 512 tokens gastados. Leíamos el campo
         * equivocado y lo anotábamos como «no dio una jugada válida» — un modelo
         * capaz saliendo en la tabla como incapaz, que es la peor clase de error
         * que puede cometer un banco de pruebas.
         *
         * Se prefiere `content`, y si viene vacío se lee el pensamiento: la
         * conclusión suele estar al final. `truncado` viaja aparte porque
         * quedarse sin presupuesto NO es lo mismo que no saber elegir, y hasta
         * hoy las dos cosas caían en el mismo contador.
         */
        const contenido = j?.message?.content?.trim() ? j.message.content
                        : (j?.message?.thinking ?? '');
        return {
            texto: contenido,
            truncado: j?.done_reason === 'length',
            entrada: j?.prompt_eval_count ?? estimarTokens(prompt),
            salida: j?.eval_count ?? estimarTokens(j?.message?.content),
            medidos: j?.eval_count !== undefined,
            ms: Date.now() - t0,
        };
    };
    fn.nombre = `ollama/${modelo}`;
    fn.coste = 0;          // €/millón de tokens: local es gratis
    return fn;
}

/**
 * Un «modelo» falso y determinista: siempre elige la primera opción.
 *
 * No es un juguete: es el CONTROL del arnés. Sale exactamente igual que la
 * política tonta que ya está en la tabla de calibración, así que si un modelo de
 * verdad no le gana, el que falla no es el entorno — y si la fila de `eco` no
 * coincide con la de `tonta`, el que falla es el arnés. Sin él, un fallo del
 * arnés se leería como un fallo del modelo.
 */
export function eco() {
    const fn = async () => ({ texto: '1', entrada: 0, salida: 0, medidos: true, ms: 0 });
    fn.nombre = 'eco/primera-opcion';
    fn.coste = 0;
    return fn;
}

/** Elige al azar entre las opciones ofrecidas. La otra línea base clásica. */
export function azar(semilla = 1) {
    let a = semilla >>> 0;
    const fn = async (prompt) => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        const n = Number((prompt.match(/^\s*(\d+)\)/gm) ?? ['1)']).length) || 1;
        return { texto: String((((t ^ (t >>> 14)) >>> 0) % n) + 1),
                 entrada: 0, salida: 0, medidos: true, ms: 0 };
    };
    fn.nombre = 'azar';
    fn.coste = 0;
    return fn;
}

export const PROVEEDORES = { ollama, eco, azar };
