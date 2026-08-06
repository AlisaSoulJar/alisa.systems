# `colonia_privada/` — lo que es de la colonia, no del motor

Esto **no se publica**. Está fuera de `public/`, así que no entra en el paquete
ni se despliega. Sigue en el repositorio porque no se borra nada, y porque su
sitio definitivo es un proyecto aparte.

## La raya, y por qué no es «narrativa fuera»

Separar la colonia del motor no significa quitarle la ficción al producto. El
huevo, la Sala, la voz — eso **es** el producto, y ningún banco de pruebas del
mercado tiene una sala por la que se anda. Si separásemos por «esto suena a
ficción» nos cargaríamos justo lo que nos distingue.

La raya es una pregunta con respuesta medible:

> **¿Funciona para un desconocido que no tiene el hub?**

Medido sobre el sitio: **el 88% pasa**. Pasa el huevo, pasa la Sala, pasa el
gym, pasan los 19 juegos. Lo que no pasa es la maquinaria privada —la fundición
de avatares, el JobBoard, `beings/queen/think`, el MCP— y eso es lo que vive
aquí.

## Qué hay dentro y por qué

| | por qué no es del motor |
|---|---|
| `rooms/room_queen_office.html` | pide `/system` al hub |
| `rooms/room_core_waiting.html` | pide `/hormones` |
| `rooms/room_css3d_monitor_hub.html` | cinco llamadas al hub, incluida `/mcp/...` |
| `js/AlisaAgentBridge.js` | habla con `/beings/queen/think`. **No lo importaba nadie** |

## La dirección de la dependencia

La colonia usa el motor para renderizarse. **El motor no sabe que la colonia
existe**, y ese es el contrato entero: una sola dirección. Por eso pueden vivir
en repositorios distintos con ritmos distintos — el motor quiere versiones
estables y la colonia cambia cada día.

Lo vigila `check_vanilla_boundary.py`, que ya cazó una vez que
`AlisaRenderCore` auto-registraba un plugin contra `127.0.0.1:8741`: cualquier
escena hecha con el motor, incluida una copia descargada por un desconocido,
arrancaba hablando con un hub privado.

## Lo que queda dentro de `public/` y está bien que se quede

Trece ficheros llaman al hub **de adorno**: el teletipo, la incubación del
huevo, el `scumm/stream`. Todos degradan solos y la página funciona igual sin
colonia — se comprobó abriéndolos en un navegador sin hub: montan y no sueltan
un error. Conectarse es una mejora, no un requisito.

Y `extensions/alisa-colony/` sigue bajo `src/` a propósito: es la extensión que
la colonia enchufa al motor, y el guardián la exceptúa explícitamente. El día
que la colonia tenga su repositorio, se muda entera y con ella estos ficheros.
