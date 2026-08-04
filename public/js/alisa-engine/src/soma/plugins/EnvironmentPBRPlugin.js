import * as THREE from 'three';

/**
 * EnvironmentPBRPlugin
 * Inyecta un entorno HDR procedimental seguro para no romper el Bloom.
 */
export class EnvironmentPBRPlugin {
    constructor(app, config = {}) {
        this.name = 'EnvironmentPBR';
        this.app = app;
        this.intensity = config.intensity !== undefined ? config.intensity : 0.5;
        this.pmremGenerator = new THREE.PMREMGenerator(this.app.renderer);
        this.pmremGenerator.compileEquirectangularShader();
    }

    onInit() {
        // Crear una escena dummy para generar reflejos metálicos (luces genéricas)
        // en lugar de usar la escena principal, que tiene el Bloom y la niebla (y causa pantallazo blanco).
        const dummyScene = new THREE.Scene();
        dummyScene.background = new THREE.Color(0x0a0a0a);
        
        // Luces para dar reflejos chulos a los metales
        const light1 = new THREE.DirectionalLight(0xffffff, 2.0);
        light1.position.set(5, 5, 5);
        dummyScene.add(light1);
        
        const light2 = new THREE.PointLight(0x00ffff, 3.0); // Cyan tint
        light2.position.set(-5, 0, -5);
        dummyScene.add(light2);

        this.envMap = this.pmremGenerator.fromScene(dummyScene).texture;
        
        // Aplicar a la escena
        this.app.scene.environment = this.envMap;
        this.app.scene.environmentIntensity = this.intensity;
        
        // HEMOS QUITADO el toneMapping porque ALISA usa UnrealBloomPass
        // y ACESFilmicToneMapping multiplicaba el brillo del agujero negro por 100 (sala blanca).
    }

    onUpdate(dt) {}
}
