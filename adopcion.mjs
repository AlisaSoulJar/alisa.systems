/**
 * adopcion.mjs — el denominador, publicado
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Idea de Oscar, dicha con estas palabras: «el proyecto tiene mejor maquinaria de
 * la que ejecuta». Es un patrón, y lo caro de él es que **no se parece a código
 * muerto**.
 *
 * Medido el 29-08-2026 sobre los 1.194 ficheros del repositorio: 593 símbolos
 * exportados y 43 que no nombra nadie, la mayoría en `dist/`, que es salida de
 * compilación. En código fuente son unos quince. O sea que de basura sin usar,
 * casi nada — y sin embargo esta semana han aparecido cinco casos gordos:
 *
 *     sfx.js, 37 KB de motor de sonido      2 páginas de 111
 *     DeterministicScope                    26 ficheros, y 0 de los 22 arneses
 *     descripcion.js (texto para ciegos)    el banco, y ninguna de las 41 mesas
 *     familia `peaton` del léxico           2 sonidos tocados de 5 escritos
 *     check_gym_envs.mjs                    en el repositorio, sin correr
 *
 * ⚠️ NINGUNO HABRÍA SALIDO EN UNA LISTA DE HUÉRFANOS. TODOS TENÍAN USUARIOS.
 *    El problema era el DENOMINADOR.
 *
 * Así que lo que hay que publicar no es «¿se usa?» sino «¿de cuántos que podían?».
 *
 * ⚠️ Y POR QUÉ ESTO NO RECALCULA NADA.
 *
 * Los números buenos ya los calculan las 31 pruebas que llevan techos y suelos
 * declarados — 57 contados. Volver a calcularlos aquí sería una segunda copia que
 * se separa de la primera, que es la avería que este repositorio lleva arreglando
 * desde agosto. Cada prueba APUNTA su ratio al pasar, igual que `prueba_senal`
 * publica hoy `suelo_por_entorno.json`, y esta página los recoge.
 *
 * Si un número está viejo es porque esa prueba no corrió, y eso también se ve:
 * cada ratio lleva cuándo se midió y quién lo midió.
 *
 * ⚠️ EL FICHERO VIVE EN `public/data/` A PROPÓSITO.
 *    `prueba_de_las_pruebas` fotografía esa carpeta entera antes de sabotear y la
 *    devuelve al final, así que un ratio medido con el motor averiado no se queda
 *    en el repositorio. Esa protección ya existía y costó 732 líneas descubrirla.
 */
import { readFile, writeFile } from 'node:fs/promises';

const FICHERO = new URL('./public/data/adopcion.json', import.meta.url);

const VACIO = {
    schema: 'alisa.adopcion.v1',
    _note: 'Cuantos USAN una capacidad de los que PODRIAN usarla. Lo escriben las '
         + 'pruebas al pasar, cada una el suyo; nadie recalcula aqui. Ver adopcion.mjs.',
    _pagina: 'public/adopcion.html',
    ratios: {},
};

async function leer() {
    try { return JSON.parse(await readFile(FICHERO, 'utf8')); }
    catch { return structuredClone(VACIO); }
}

/**
 * Apunta un ratio de adopción. Lo llama una prueba, una sola vez, cuando ya tiene
 * el número medido.
 *
 * @param {string} clave     identificador estable, en minúsculas con guiones
 * @param {string} titulo    qué se cuenta, en una línea y en español llano
 * @param {number} usan      cuántos lo usan HOY
 * @param {number} podrian   cuántos podrían usarlo — el denominador, que es el dato
 * @param {string} quien     el fichero que lo mide, para poder ir a mirarlo
 * @param {string} [nota]    qué pasa si baja, o de dónde viene el número
 */
export async function apuntar({ clave, titulo, usan, podrian, quien, nota }) {
    if (!clave || !quien) throw new Error('adopcion: hace falta `clave` y `quien`');
    if (!Number.isFinite(usan) || !Number.isFinite(podrian)) {
        throw new Error(`adopcion: «${clave}» tiene que traer dos números`);
    }
    /**
     * ⚠️ UN RATIO MAYOR QUE UNO NO ES UN NÚMERO RARO: ES UN ERROR DE MEDIDA.
     * Si «usan» supera a «podrían» es que se está contando otra cosa en cada lado,
     * y publicarlo sería inventarse una tranquilidad. Mejor que reviente aquí.
     */
    if (usan > podrian) {
        throw new Error(`adopcion: «${clave}» dice ${usan} de ${podrian}. `
            + 'Los dos lados no cuentan lo mismo.');
    }
    const doc = await leer();
    doc.ratios[clave] = {
        titulo, usan, podrian, quien,
        ...(nota ? { nota } : {}),
        medido: new Date().toISOString().slice(0, 19) + 'Z',
    };
    // Se ordena por clave para que el diff de git sea legible y no baile.
    doc.ratios = Object.fromEntries(Object.entries(doc.ratios).sort(([a], [b]) => a < b ? -1 : 1));
    await writeFile(FICHERO, JSON.stringify(doc, null, 2) + '\n');
    return doc.ratios[clave];
}

/** Todo lo apuntado, para quien quiera mirarlo desde Node. */
export async function ratios() {
    return (await leer()).ratios;
}
