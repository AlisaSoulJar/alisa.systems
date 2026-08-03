# `/colonia/` — la portada anterior, conservada

Esto es **la página que alisa.systems servía como portada** hasta esta
publicación. No es código nuevo ni una demo: es el sitio anterior, guardado tal
cual estaba.

Se conserva por la regla de la casa —*nada se borra, se archiva*— y porque quien
tuviera el enlace no debería encontrarse un 404. La portada pasa a ser la Sala
del Huevo; esto sigue vivo aquí.

## Se recuperó de git, no del disco

Cuando fui a moverla ya no existía como fichero: una sesión anterior había
sustituido `index.html` (63,9 KB) por otro de 8,5 KB. La versión que estaba
**publicada** sólo seguía existiendo en el historial, y se sacó de ahí con
`git show HEAD:index.html`.

Merece quedar escrito: *el fichero de trabajo y lo que hay desplegado pueden
llevar días siendo cosas distintas*, y el segundo no se recupera si nadie mira.

## Dos avisos honestos

1. **Carga `pixi.js` desde un CDN.** El resto del repositorio no llama a ninguna
   red —hay un laboratorio que lo comprueba espiando `fetch`, y las librerías van
   copiadas en `public/vendor/`—, pero esta página es anterior a esa regla. No se
   ha tocado: cambiarla sería lo contrario de conservarla. Así que la promesa de
   «funciona sin conexión» cubre el motor, los juegos y la sala, **no este
   recuerdo**.

2. **No está mantenida.** No entra en `npm test`, no se calibra y no tiene
   recibo verificable. Si algún día deja de funcionar, es una pieza de museo, no
   una regresión.
