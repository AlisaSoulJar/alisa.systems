// Sonda mínima: una clase Durable Object y un fetch que la toca.
// No hace nada útil — sólo comprobar que la cuenta puede desplegarla.
export class MesaSonda {
  constructor(estado) { this.estado = estado; }
  async fetch() {
    const n = (await this.estado.storage.get('n')) ?? 0;
    await this.estado.storage.put('n', n + 1);
    return new Response(JSON.stringify({ vivo: true, visitas: n + 1 }),
                        { headers: { 'content-type': 'application/json' } });
  }
}

export default {
  async fetch(request, env) {
    const id = env.MESA.idFromName('sonda');
    return env.MESA.get(id).fetch(request);
  },
};
