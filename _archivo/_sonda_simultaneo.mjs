/**
 * ¿AGUANTA UNA SALA UN JUEGO SIMULTÁNEO?
 *
 * Oscar propone un segundo worker para tiempo real, con `nave` como ejemplo. Antes
 * de construirlo hay que saber si hace falta, y la casa ya tiene una definición
 * escrita de «simultáneo» en la matriz de géneros:
 *
 *     se decide a la vez: el segundo no ve lo que eligió el primero
 *
 * Eso NO es tiempo real: es compromiso oculto, y se puede expresar con turnos
 * mientras la elección del primero no se vea hasta que resuelva. Lo que hay que
 * comprobar es exactamente eso, porque es lo único que se rompería en una mesa por
 * turnos: que al mover el primero, el segundo no pueda leer lo que hizo.
 *
 * Se mira el TEXTO además del estado: es la puerta por la que juega un agente, y
 * una filtración en prosa cuenta igual que una en un campo.
 */
const MESAS = 'https://alisa-mesas.prime-6d5.workers.dev';
const JUEGOS = ['nave', 'frentes'];

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const pedir = async (ruta, cuerpo) => {
    const r = await fetch(`${MESAS}${ruta}`, cuerpo
        ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }
        : {});
    return { codigo: r.status, datos: await r.json().catch(() => ({})) };
};

let fallos = 0;
for (const juego of JUEGOS) {
    const sala = `simul-${juego}-${Math.floor(Math.random() * 1e6)}`;
    const sec = {};
    for (const quien of ['ana', 'bruno']) {
        const { datos } = await pedir(`/mesa/${sala}/sentarse`, { quien, juego, jugadores: 2 });
        sec[quien] = datos.secret ?? datos.secreto;
    }

    const { datos: antes } = await pedir(`/mesa/${sala}?quien=ana`);
    const quienMueve = antes.turn;
    const legales = (antes.legal_moves ?? []).filter((m) => m !== 'nueva');
    if (legales.length < 2) { console.log(`  ${gris('·')} ${juego}: hacen falta dos jugadas distintas`); continue; }

    /**
     * ⚠️ NO SE BUSCA LA JUGADA EN EL TEXTO. ESO NO MIDE NADA.
     *
     * Mi primera versión hacía `texto.includes(elegida)` y denunció a frentes, cuyas
     * jugadas son LETRAS SUELTAS: buscar «e» en una frase castellana acierta siempre.
     * El predicado no distinguía una filtración de la letra e.
     *
     * La pregunta de verdad se puede hacer sin buscar nada: **¿depende de lo que
     * eligió ana lo que ve bruno?** Se juega la MISMA partida dos veces —misma sala
     * de estreno, misma semilla— cambiando sólo la elección de ana, y se comparan las
     * dos vistas de bruno. Si son idénticas, no hay forma de que bruno lo sepa,
     * mire donde mire. Si difieren, la elección se le está contando, esté escrita
     * como esté.
     */
    const vistaDeBruno = async (jugadaDeAna) => {
        const s = `simul-${juego}-${jugadaDeAna}-${Math.floor(Math.random() * 1e6)}`;
        const k = {};
        for (const quien of ['ana', 'bruno']) {
            const { datos } = await pedir(`/mesa/${s}/sentarse`, { quien, juego, semilla: 11, jugadores: 2 });
            k[quien] = datos.secret ?? datos.secreto;
        }
        await pedir(`/mesa/${s}/jugar`, { quien: quienMueve, secreto: k[quienMueve], jugada: jugadaDeAna });
        const otro = quienMueve === 'ana' ? 'bruno' : 'ana';
        const { datos } = await pedir(`/mesa/${s}?quien=${otro}`);
        return JSON.stringify({ text: datos.text ?? null, state: datos.state ?? null });
    };

    const [a, b] = [legales[0], legales[legales.length - 1]];
    const conA = await vistaDeBruno(a);
    const conB = await vistaDeBruno(b);

    if (conA !== conB) {
        fallos++;
        console.log(`  ${rojo('✗')} ${juego.padEnd(9)} lo que ve el otro CAMBIA según ${quienMueve} elija «${a}» o «${b}»`);
    } else {
        console.log(`  ${verde('✓')} ${juego.padEnd(9)} ${gris(`elija «${a}» o «${b}», el otro ve exactamente lo mismo`)}`);
    }
}

console.log(fallos
    ? rojo(`\n✗ ${fallos} juegos simultáneos filtran la elección en una sala\n`)
    : verde('\n✓ el compromiso oculto sobrevive a una mesa por turnos\n'));
