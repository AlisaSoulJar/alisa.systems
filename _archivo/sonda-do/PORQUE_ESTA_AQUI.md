# La sonda de Durable Objects

Doce líneas que contaban visitas. No hace nada útil y por eso está aquí.

## Qué preguntaba

Antes de escribir las mesas compartidas hacía falta saber una cosa que decidía
el diseño entero: **¿esta cuenta puede desplegar Durable Objects sin cambiar de
plan?** De la respuesta dependía si el multijugador se montaba sobre un árbitro
con estado o había que inventar un apaño sin él.

La documentación decía que sí desde que Cloudflare habilitó los DO respaldados
por SQLite en el plan gratuito. Pero lo que dice la documentación y lo que hace
una cuenta concreta no siempre coinciden, y aquí equivocarse costaba o 5 $/mes
que nadie había presupuestado o un rediseño a medias.

Así que se preguntó en vez de suponerlo: se desplegó, se llamó tres veces y
contestó `1`, `2`, `3`. Guardaba estado entre peticiones. Con eso ya se podía
escribir `worker-mesas/` sabiendo sobre qué se apoyaba.

## Por qué se guarda si ya cumplió

Porque la próxima duda de este tipo —¿tengo D1?, ¿tengo Colas?, ¿cuántas
escrituras aguanta esto?— se responde igual: doce líneas y un despliegue, no una
tarde leyendo. Esto es la plantilla.

El despliegue en sí (`alisa-sonda-do`) se retiró el 2026-08-06, ya respondida la
pregunta. Un worker vivo que no sirve a nadie es una cosa más que mantener y una
más que explicar a quien llegue.
