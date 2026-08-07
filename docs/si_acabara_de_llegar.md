# Si acabara de llegar: cómo demostraría el motor

Pregunta de Oscar, 2026-08-07: *«imagina que no tienes nada renderizado —las
cartas y los tableros sí están bien— y que sólo ves los engines y las factories.
Demuestra que con este motor se pueden hacer todos los géneros y que todos valen
como gym, LLM y benchmark. ¿Cómo lo harías?»*

Respuesta corta: **no lo demostraría con gráficos.** Lo demostraría con el
contrato, y usaría los gráficos sólo donde salgan gratis.

---

## 1. El activo no es lo que parece

Llegando de fuera y mirando el repositorio, lo que impresiona **no** son las 25
factorías. Motores 3D con factorías hay a cientos y ninguno se distingue por eso.

Lo que no tiene nadie es esto:

> Una partida se verifica **volviéndola a jugar** desde `{juego, semilla, jugadas}`.
> La misma partida la juega una persona, una política determinista o un modelo de
> lenguaje **por la misma puerta**. Y el recibo lo puede comprobar un desconocido.

Eso ya funciona en 19 juegos. **Ése es el producto.** Las factorías son materia
prima; el contrato es lo que se vende.

⚠️ Y de ahí sale la primera decisión, que es de poda: **las demos recuperadas no
son un activo, son ruido.** Un escaparate con cuarenta cosas mediocres vale menos
que uno con ocho impecables, porque la mediocridad se contagia hacia atrás: quien
ve tres demos flojas deja de creerse la cuarta aunque sea buena. El escaparate por
declaración ya lo permite — sólo hay que tener la disciplina de **no declararlas
nunca**, ni siquiera cuando «funcionan».

## 2. Un género se demuestra por su ESTRUCTURA DE DECISIÓN, no por su aspecto

Esto es lo que cambia todo el plan.

Un tower defense no demuestra «torres bonitas»: demuestra **colocación espacial
con economía a lo largo del tiempo**. Un juego de sigilo demuestra **estado oculto
y predicción de patrullas**. Un roguelike demuestra **exploración con información
parcial**.

Todas esas estructuras se pueden servir en una rejilla ASCII o en un canvas 2D de
doscientas líneas — y siguen siendo pruebas de género legítimas. Es más: **son
MEJORES entornos de gym**, porque son legibles.

El listón de «género demostrado» no debería ser artístico. Debería ser este, que
además es comprobable por un tercero:

```
□ módulo de reglas propio            □ describe() que cuenta el estado
□ legal_moves enumerable             □ recibo que re-simula y verifica
□ marcador que cambia con quién juega
□ líneas base calibradas (primera · azar · casa) con hueco > ruido
```

Son los mismos seis que ya pasan los 19. Es una lista, no una opinión.

## 3. Lo que construiría, y en qué orden

### Fase A — el renderizador universal 2D (una semana de trabajo, no más)

`mesa.html` ya demostró la idea con cartas: **los botones son `legal_moves`**, una
página para diecinueve juegos. Falta su gemelo espacial: un canvas que dibuje
rejillas, fichas y agentes leyendo el mismo estado que lee el LLM.

Con eso, cada género nuevo sale jugable el día que tiene reglas. Sin artista, sin
modelos, sin iluminación. Y lo que se ve **es literalmente lo que lee el modelo**,
que es la mitad del argumento del proyecto.

### Fase B — ocho géneros, uno por estructura de decisión

No cuarenta. Ocho, distintos entre sí y baratos:

| género | qué estructura demuestra | materia prima que YA existe |
|---|---|---|
| tablero | información perfecta, por turnos | ✅ 6 juegos |
| cartas | información oculta y faroles | ✅ 10 juegos |
| puzle espacial (sokoban) | empujar/planificar, sin azar | — (200 líneas) |
| defensa de torres | economía + colocación en el tiempo | `TurretCombatSystem` |
| sigilo | adversario oculto, predicción | `CorporateSeekerSystem` |
| ecosistema | dinámica de poblaciones, multiagente | `FoodChainSystem`, `EcosystemSystem` |
| mazmorra procedural | exploración con información parcial | `BSPSystem` |
| tráfico | coordinación continua cuantizada | `IDMSystem` |

Seis de las ocho ya tienen motor escrito. **Lo que falta es la capa de reglas y el
recibo**, que es exactamente el trabajo que sabemos hacer bien.

### Fase C — el 3D, y sólo donde sume

Al final, opcional y por género. Un tablero 3D no hace mejor al ajedrez como
banco de pruebas; hace mejor la foto. Está bien querer la foto — pero después.

## 4. Cómo lo contaría al público

Una tabla, no un muro de capturas. Filas = géneros. Columnas = **humano · FSM ·
LLM · recibo verificado**. Cada celda es una comprobación de treinta segundos, y
**las celdas vacías se ven**.

Eso responde a la vez a las tres cosas que dice Oscar que hay que enseñar —«puedes
hacer el videojuego que quieras, un gimnasio headless, un banco de pruebas, o las
tres a la vez»— porque son literalmente las columnas.

Y la frase de cabecera no lleva adjetivos:

> N géneros · 3 puertas cada uno · toda partida re-verificable desde
> `{juego, semilla, jugadas}` · sin instalar nada, sin servidor propio.

## 5. Lo que NO haría

- **No arreglaría las 23 factorías sin datos todavía.** Son materia prima buena,
  pero arreglarlas no demuestra ningún género: demuestra que sabemos pasar
  argumentos.
- **No haría 3D antes que reglas.** Un género con 3D y sin recibo no cuenta para
  nada de lo que este proyecto promete.
- **No enseñaría nada que no se entienda solo.** `katamari_swarm` funciona y sigue
  fuera; un desconocido ve cucarachas flotando y se va.
- **No pelearía por rescatar demos perdidas.** Lo perdido eran juegos; lo que
  queda —el contrato y las reglas— es lo que valía.

## 6. La única cosa que haría hoy

Sokoban. Doscientas líneas de reglas, cero arte, `legal_moves` obvias, `describe()`
trivial, recibo que verifica, y tres líneas base que lo separan bien.

Sirve de plantilla para las otras cinco y **prueba la tesis entera en un día**:
un género nuevo, jugable por persona, política y modelo, verificable por un
desconocido. Si eso sale en un día, la afirmación «se puede hacer cualquier
género» deja de ser una promesa y pasa a ser una demostración con cronómetro.
