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

1. **Ya no depende de nadie.** Cargaba `pixi.js` desde un CDN, y aquí llegó a
   decir que la promesa de «funciona sin conexión» no cubría este recuerdo.
   Estaba mal: lo dijo la puerta automática antes de publicar —`preflight.py`
   bloqueó por «una página carga código desde un CDN»— y tenía razón. **Una
   página que depende de un tercero no está conservada, está prestada**: el día
   que ese CDN cambie de política, el recuerdo se apaga solo.

   Así que la librería vive en `public/vendor/pixi-7.3.2/` y la página apunta
   ahí. Es la única línea que se le ha tocado, y se le ha tocado precisamente
   para que siga siendo la misma dentro de diez años.

2. **No está mantenida.** No entra en `npm test`, no se calibra y no tiene
   recibo verificable. Si algún día deja de funcionar, es una pieza de museo, no
   una regresión.
