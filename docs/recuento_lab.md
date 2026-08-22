# Recuento del lab: lo que es, frente a lo que dice ser

Auditoría de las 67 tarjetas de `public/labs/`, 2026-08-07. Medida y abierta a
mano, no deducida.

## El titular

**Quince capacidades del motor están escritas, funcionando y sin demo que las
enseñe.** No les falta código: les falta que la página las llame bien.

## Cómo se llegó ahí

Las 24 páginas pequeñas (~1,9 KB) parecían esqueletos. **No lo son**: son
delgadas a propósito, el patrón `montarMesa` antes de que lo inventáramos —una
página que es sólo configuración y delega en un módulo del motor.

Y los módulos son de verdad:

```
CarverEnvironmentFactory   59 KB      EcosystemSystem         23 KB
AssetManager               33 KB      VoxelGlitchFactory      16 KB
LocomotionEnvironmentFactory 15 KB    WorldBuilderSystem      12,8 KB
ProportionalAtlas          11 KB      IDMSystem                9,6 KB
```

## ⚠️ EL FALLO: LA PÁGINA NO USA EL MÓDULO, LO ADIVINA

Las 22 páginas de esa familia comparten este lanzador:

```js
const engine = new CarverEnvironmentFactory();      // ← sin argumentos
if (engine.init)    engine.init(app.scene);
if (engine.setCore) engine.setCore(app);
app.startLoop((dt) => { if (engine.update) engine.update(dt); });
```

Cada llamada va detrás de un `if`. **Si la API real se llama de otra forma, no
se ejecuta nada y no falla nada.**

`CarverEnvironmentFactory` de verdad es:

```js
constructor(scene, carverGrid)      buildAll(_c)      build()
```

O sea que la página la construye **sin escena**, y luego pide tres métodos que
**no existen ninguno**. Resultado: una rejilla vacía, cero errores en consola, y
un cartel que dice «Powered by CarverEnvironmentFactory».

### El recuento

| | |
|---|---|
| páginas con el lanzador genérico | **22** |
| cuyo módulo **sí** tiene `init`/`update` (funcionan) | **7** |
| cuyo módulo **no** los tiene → escena vacía, sin error | **15** |

Las quince, con el módulo que se queda sin enseñar:

```
thermodynamics_lab            EcosystemSystem          23 KB
world_builder                 WorldBuilderSystem       12,8 KB  (+ SkyRenderPlugin)
math_proportional_atlas       ProportionalAtlas        11 KB
peaton_boids                  IDMSystem                9,6 KB
rosetta_master                ScummInteractionPlugin   9,5 KB
rig_vending_machine           ProceduralRigging        8,9 KB
volumetric_powers             VolumetricsPlugin        8,9 KB
holographic_decal_calibration VolumetricsPlugin        8,9 KB
resonance_isomorphism         ResonanceFieldPlugin     6,6 KB
scanner_lab                   CabinetBSPPlugin         6,2 KB
math_matrioshka               MatrioshkaPlugin         5,0 KB
tfjs_driving                  NeuralDrivingSystem      3,8 KB
ui_item_catalog               ProceduralItem           2,7 KB
fx_voxel_glitch               AssetManager             33 KB
procgen_carver                CarverEnvironmentFactory 59 KB
```

## Lo que esto significa

**El trabajo no es escribir demos: es conectar las que hay.** Y hay dos formas:

1. **Por página** — abrir cada módulo, leer su API real y llamarla bien. Quince
   veces. Seguro pero lento, y produce quince lanzadores distintos: la misma
   enfermedad que ya hemos curado tres veces hoy.
2. **Un lanzador que no adivine** — que el módulo DECLARE cómo se arranca, igual
   que las páginas del escaparate declaran si son públicas. El lanzador deja de
   suponer y pasa a leer.

La segunda es la que encaja con todo lo demás. Y tiene una propiedad que la
primera no: **un módulo sin declaración se nota**, en vez de dibujar una rejilla
vacía con un cartel bonito encima.

## Estado de las abiertas a mano

✅ **En el escaparate** (10): mesa, chess, go, reversi, xiangqi, blackjack,
`webgpu_anomalia` (WebGPU + TSL, ~52 fps), `marabunta` (bullet-heaven jugable),
`math_orbital_shmup` (shmup de neón), `math_boids_flock` (400 boids).

⚠️ **Vistas y descartadas por ahora**
- `katamari_swarm` — corre, pero son cucarachas flotando y «Chunks Consumed: 0»
  sin forma visible de mover la bola. Funciona ≠ se entiende.
- `procgen_carver` — el caso de estudio de arriba.
- `chopper_aquarium` — buena pinta (modo «AI Agent»), pero tiene rastros de casa.

🚫 **Fuera por la colonia** (10): `terminal`, `vanilla_check`, `interaction_lab`,
`avatar_integration_test`, `phantom_predator`, `digital_twin_test`,
`scumm_overworld`, `verificacion_servidor`, `sin_hub`, `chopper_aquarium`.

## Dos advertencias sobre mis propias herramientas

1. **Conviven dos convenciones de importmap** (`@alisa-engine/` → `.../` o
   → `.../src/`). Las dos funcionan. Mi comprobador asumió una, marcó dos páginas
   sanas como rotas, **las "arreglé" y las rompí**. Revertido.
2. De ahí la regla: **un detector equivocado es más peligroso que ninguno**,
   porque invita a actuar. Antes de arreglar lo que un script señala, abrir la
   página.
