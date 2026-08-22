# Censo de géneros: qué cubrimos y qué falta de verdad

> Medido, no opinado. Los números de sillas salen de ejecutar los 26 juegos; los
> ejes, de `matriz_generos.mjs`; los entornos nativos, del catálogo del gym.

## La pregunta está mal planteada, y conviene decirlo antes

«¿Cuántos géneros nos faltan?» no tiene respuesta útil, porque un género comercial
es **una estructura de decisión más una presentación**. Ajedrez y go se venden en
estanterías distintas y plantean el mismo problema. Un shooter y un juego de
plataformas comparten casi toda su estructura y ninguna de su presentación.

Lo que se puede contar son estructuras. Y en presentación, este motor tiene 179
piezas y 25 factorías: el traje no es el cuello de botella.

## Lo que hay hoy, medido

**Siete ejes de decisión, los siete sostenidos** (`/generos.html`): geometría,
información oculta, otra silla que decide, agentes autónomos, jugadas sin vuelta
atrás, decisión simultánea y recompensa compartida.

**Sillas: de una a cuatro.** No era obvio y lo daba por peor:

| sillas | juegos |
|---|---|
| 1 (solitario) | snake, fagocito, peatón, guerra, sokoban, cripta |
| 2 | ajedrez, go, reversi, damas, xiangqi, mancala, blackjack, póker, entropy, flota, defensa, sigilo, frentes, relevo |
| 3 | gofish |
| 4 | brisca, tute, hearts, spades, unit |

**Y seis entornos nativos que la matriz NO mira**, que es el hallazgo incómodo de
este censo:

- **Asteroids, Marabunta, Raccoon Space** — tiempo real, acción, física propia
- **Cabinet Escape** — sala de escape / aventura de objetos
- **Corp Building** — espacio de acciones semántico, pensado para agentes de lenguaje
- **Chopper Terrarium** — simulación procedural, el mundo entero sale de la semilla

> ⚠️ **La matriz de géneros mide 26 juegos e ignora estos 6.** Si me hubiera
> fiado sólo de ella habría concluido que no tenemos acción en tiempo real —
> y sí la tenemos, con física propia y todo. Un instrumento que no dice **de qué
> no habla** invita a leer sus silencios como ausencias. Está apuntado como
> arreglo: o los cubre, o lo declara en la propia página.

## Lo que falta de verdad

Cuatro estructuras, ordenadas por lo que valen para un banco de pruebas de
modelos de lenguaje. No son cuarenta géneros: son cuatro huecos.

### 1. Comunicación entre jugadores — el hueco grande

Hoy una silla sólo puede decirle algo a otra **jugando**. No hay canal. Eso deja
fuera de un plumazo:

- deducción social — Werewolf, Resistance, Among Us
- negociación y comercio — Diplomacy, los tratos de Catan
- cooperativo con pistas limitadas — Hanabi

Y es **exactamente donde un modelo de lenguaje debería arrasar a cualquier FSM**,
porque la habilidad es hablar, convencer y detectar la mentira. Que nos falte
justo eso, teniendo un banco de pruebas para modelos de lenguaje, es la ironía
más cara del catálogo.

No rompe la suposición del motor: las pistas y las acusaciones se pueden ofrecer
como acciones enumerables, igual que hace Hanabi. Cuesta un canal, no un motor.

### 2. El lenguaje como mecánica

Wordle, Scrabble, crucigramas, ahorcado, familias de palabras. Acciones
perfectamente enumerables —una lista de palabras válidas— y baratísimo de
implementar.

Es la única familia donde un modelo de lenguaje debería ganar a **todas** nuestras
políticas de casa sin discusión, y no tenemos ni uno. Un banco de pruebas sin
ninguna prueba que el candidato deba dominar tiene un punto ciego.

### 3. Horizonte largo con progresión

RPG, 4X, construcción de mazo (Dominion, drafts). Lo que los distingue no es la
duración sino que **lo que puedes hacer cambia con lo que has hecho**: el espacio
de acciones crece, se especializa, y una decisión de la jugada 5 condiciona la
100.

`defensa` roza la economía, pero su partida empieza y acaba con las mismas
opciones. Ninguno de los 26 tiene un árbol de mejoras.

### 4. Mercado y subasta con varios agentes

Pujas, precios que emergen de la oferta, faroles con dinero. Enumerable y barato,
y aprovecha que ya tenemos mesas de tres y cuatro sillas.

## Y una que NO falta del todo, aunque lo parezca

**Control analógico** — conducción, plataformas, lucha, apuntar con física.

La suposición del motor (`legal_moves` enumerable) parece excluirlo, pero los
entornos nativos ya hacen tiempo real con acciones discretas: Asteroids gira y
empuja con nueve acciones con nombre. Lo que queda fuera no es el género, es la
**precisión analógica como habilidad** — el milímetro del volante o el timing de
una parada de dieciséis milisegundos.

Y para medir modelos de lenguaje eso importa poco: nadie va a defender que un
LLM deba puntuar por reflejos.

## Resumen honrado

De la taxonomía clásica, la mayor parte de los géneros son presentación sobre
estructuras que ya están demostradas y jugables. **Faltan cuatro estructuras**, y
dos de ellas —comunicación y lenguaje— son baratas y son precisamente las que
más miden a un modelo de lenguaje.

Ese es el orden en que conviene atacarlas, y no por dificultad: por lo que dicen
del candidato.
