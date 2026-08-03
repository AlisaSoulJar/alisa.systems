# El benchmark: dónde vive cada cosa

Motor y juegos, **gratis**. El benchmark, **nuestro**. Este documento dice cómo
se sostiene eso técnicamente y qué cuesta.

---

## La arruga del planteamiento inicial

> *"que puedan descargarse solo el protohub y con eso jugar en nuestra web"*

Si juegan **en nuestra web**, no descargan nada: el ProtoHub ya es JavaScript que
sirve nuestro propio sitio. Descargar y jugar-en-nuestra-web son el mismo hecho
visto desde dos lados.

Lo que sí tiene sentido, y es mejor, es separar **dónde corre** de **quién
puntúa**:

| | dónde juega | quién guarda el resultado |
|---|---|---|
| **A** · web | nuestro sitio | nosotros |
| **B** · descarga | su máquina | nosotros, si él lo envía |
| **C** · integrado | su propio proyecto | nosotros, si él lo envía |

Los tres acaban igual: **una partida enviada que verificamos**. Y da lo mismo
dónde se jugó, porque no nos fiamos de su palabra — la repetimos.

---

## Lo que hace esto posible

Dos propiedades, y las dos están medidas, no supuestas:

**1. Las reglas son deterministas.** Misma semilla ⇒ mismo mundo. Los PRNG usan
mulberry32 (solo enteros de 32 bits ⇒ idéntico en cualquier máquina) y no se
toca el reloj.

> *Esto no salió gratis: el verificador cazó que **Snake colocaba la comida con
> `Math.random()` sin semilla**. Las partidas eran correctas y no se podían
> repetir. Sin determinismo no hay benchmark, por muy buenas que sean las reglas.*

**2. Las reglas son JavaScript puro.** Cero `document`, `window`, `THREE` o
imports — comprobado en los 8 ficheros. **El mismo fichero que juega en el
navegador verifica en el servidor.** Sin reimplementar las reglas en otro
lenguaje y sin que cliente y servidor se desincronicen nunca.

---

## Qué se envía

Una partida **no es una puntuación**: es la semilla y las jugadas.

```json
{ "juego": "reversi", "semilla": 7,
  "jugadas": ["d3","c5","f6", "..."], "puntos": 47 }
```

**355 bytes** para una partida de 60 jugadas. Diez mil partidas ≈ **3,4 MB**.

Y aquí está lo bueno: **eso ES el conjunto de datos.** No hacen falta capturas ni
telemetría — la traza de decisiones es exactamente lo que tiene valor para
estudiar cómo juegan humanos, FSM y LLM.

## Cómo se verifica

Se vuelve a jugar. Medido: **0,58 ms por partida.**

Probado contra seis formas de hacer trampa — **las seis caen**:

| truco | qué pasa |
|---|---|
| inflar la puntuación | *"dice 9999, sale 47"* |
| colar una jugada ilegal | *"jugada 4 ilegal: '99'"* |
| cambiar la semilla | *"dice 200, sale 0"* |
| jugar tras el final | *"la jugada 23 llega con la partida ya terminada"* |
| inventarse un juego | *"juego desconocido: 'tetris'"* |
| reordenar las jugadas | *"jugada 1 ilegal"* |

### Lo que esto NO impide — dicho claro

Nadie puede inventarse una puntuación ni colar una jugada ilegal. Pero **sí**
puede dejar que un programa juegue por él y declararlo como humano. Eso no lo
arregla la criptografía: se arregla con **categorías separadas** (humano / FSM /
LLM) y **admitiendo que la de humano es declarada**. Mejor decirlo que fingir una
garantía que no existe.

---

## El alojamiento

**alisa.systems** (Cloudflare Pages) — *pendiente de pagar, ahora mismo caído*.

| pieza | dónde | coste |
|---|---|---|
| motor + juegos (estático) | Cloudflare Pages | **0 €** (ilimitado) |
| recibir y verificar partidas | Cloudflare Workers | **0 €** hasta 100.000/día |
| tabla de resultados | Workers KV o D1 | **0 €** en el plan gratuito |
| repositorio + espejo | GitHub + GitHub Pages | **0 €** |

El Worker gratuito da **10 ms de CPU** por petición y verificar cuesta **0,58 ms**.
Cabe con margen de sobra.

> **El único gasto real es el dominio.** Todo lo demás entra en los planes
> gratuitos hasta un volumen que ya sería una buena noticia.

GitHub Pages sirve de espejo del estático, pero **no puede verificar** — no
ejecuta código en servidor. Para eso hace falta el Worker.

---

## Antes de recoger un solo dato

Esto no es burocracia, es obligación:

1. **Decirlo.** Que se guarda la partida, qué contiene y para qué.
2. **Que se pueda jugar sin enviar nada.** Enviar es un botón, no un peaje.
3. **Nada de datos personales.** La identidad es una clave pública generada en
   su máquina; la privada no sale de ahí. No hacen falta nombre ni correo.
4. **Si se publica el conjunto de datos, decirlo desde el principio** — no
   después de haberlo recogido.

El diseño ya ayuda: lo que se envía son **jugadas**, no personas.

---

## Lo que falta para encenderlo

- [ ] Pagar el dominio y levantar alisa.systems
- [ ] El Worker: `POST /benchmark/submit` → verificar → guardar
- [ ] La tabla de resultados (KV o D1)
- [ ] El aviso de datos y el botón de enviar
- [ ] Decidir si el conjunto de datos se publica, y con qué licencia

Lo que **ya está**: reglas deterministas, verificador probado contra seis
trampas, identidad por par de claves y recibos encadenados y firmados.
