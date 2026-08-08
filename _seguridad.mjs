const BASE = 'https://alisa-mesas.prime-6d5.workers.dev';
const SALA = 'seg-' + Math.random().toString(36).slice(2, 7);
const post = async (a, c) => {
  const r = await fetch(`${BASE}/mesa/${SALA}/${a}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(c) });
  return { estado: r.status, d: await r.json() };
};

const ana = await post('sentarse', { quien: 'ana', tipo: 'agente', juego: 'ajedrez', semilla: 3 });
console.log(`1. ana se sienta: ${ana.estado} · recibe secreto: ${!!ana.d.secreto}`);

const bea = await post('sentarse', { quien: 'bea', tipo: 'agente' });
console.log(`2. bea se sienta: ${bea.estado} · recibe secreto: ${!!bea.d.secreto}`);

const tres = await post('sentarse', { quien: 'colado', tipo: 'agente' });
console.log(`3. un TERCERO en un ajedrez: ${tres.estado} — ${String(tres.d.error ?? '').slice(0, 70)}`);

const sinSecreto = await post('jugar', { quien: 'ana', jugada: 'e2e4' });
console.log(`4. jugar SIN secreto: ${sinSecreto.estado} — ${String(sinSecreto.d.error ?? '').slice(0, 60)}`);

const suplantando = await post('jugar', { quien: 'ana', jugada: 'e2e4', secreto: bea.d.secreto });
console.log(`5. jugar con el secreto de OTRA: ${suplantando.estado} — ${String(suplantando.d.error ?? '').slice(0, 60)}`);

const bien = await post('jugar', { quien: 'ana', jugada: 'e2e4', secreto: ana.d.secreto });
console.log(`6. jugar con el secreto propio: ${bien.estado} · jugadas ${bien.d.jugadas}`);

const mirar = await (await fetch(`${BASE}/mesa/${SALA}?quien=bea`)).json();
const fuga = JSON.stringify(mirar).includes(ana.d.secreto) || JSON.stringify(mirar).includes(bea.d.secreto ?? 'xxx');
console.log(`7. el estado publico filtra algun secreto: ${fuga}`);
