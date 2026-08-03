# Seguridad

## Avisar de un fallo

Abre un *issue* si no es sensible. Si lo es —una credencial expuesta, una forma
de colar una partida falsa— escribe a **prime@alisa.systems** en vez de abrirlo
en público.

## Qué protege este proyecto y qué no

Esto es un banco de pruebas, así que la superficie interesante es **la
puntuación**, no los datos personales: no hay cuentas, ni contraseñas, ni datos
de nadie. Lo que sí hay es un incentivo para mentir sobre lo que has jugado.

**Lo que está resuelto.** No se envía una puntuación: se envía
`{juego, semilla, jugadas}` y el servidor **vuelve a jugar la partida** con el
mismo fichero de reglas. Inventarse un resultado o colar una jugada ilegal no
funciona, y no hace falta que ningún juez opine. Medido: 11 de 11 partidas
legítimas aceptadas, 25 de 25 trampas cazadas.

**Lo que NO está resuelto, y conviene decirlo:**

- **La verificación demuestra que la partida es consistente con las reglas, no
  quién la jugó.** Se puede dejar que un programa juegue y declarar que fue a
  mano. Eso no se arregla con criptografía sino con categorías separadas
  (humano / política / LLM), y la de «humano» es **declarada**.
- **En los juegos deterministas** (ajedrez, damas, go…) cambiar la semilla no
  invalida nada, porque la semilla no interviene. Ahí lo que autentica es la
  secuencia de jugadas.
- **La verificación en el navegador demuestra coherencia, no honradez**: quien
  juega manda en su navegador. La que da confianza es la del servidor
  (`servidor_verificador.mjs` o `functions/api/verificar.js`).

## Credenciales

Nunca hay claves en el repositorio. Antes de cada subida:

```bash
python check_secretos.py         # lo que git publicaría
python check_secretos.py --todo  # el disco entero, ignorados incluidos
```

No imprime el contenido de lo que encuentra, sólo dónde está: un informe que
copia la clave la vuelve a filtrar, ahora en tu terminal.

**Si aparece una credencial de verdad, el orden importa: primero se ROTA.**
Quitarla del fichero no la desactiva, y publicar no tiene marcha atrás — queda
en los clones, en las cachés y en los rastreadores que barren GitHub en minutos.

Y un aviso honesto sobre esa herramienta: un detector de patrones caza lo que
sabe nombrar. Es el último filtro, no un permiso para no mirar. El día que se
escribió, lo más peligroso que había en la raíz no era un secreto — era un
script que borraba `public/` entera con rutas obsoletas.
