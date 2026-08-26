import { mulberry32 } from '../core/DeterministicScope.js';

export const SHIP_GAUGES = {
    'VIPER': [
        { id:'SPEED', label:'SPEED' },
        { id:'MISSILE', label:'MISSILE' },
        { id:'DOUBLE', label:'DOUBLE' },
        { id:'LASER', label:'LASER' },
        { id:'OPTION', label:'OPTION' },
        { id:'SHIELD', label:'SHIELD' }
    ],
    'BEE': [
        { id:'SPEED', label:'SPEED' },
        { id:'ROCKET', label:'ROCKET' },
        { id:'SPREAD', label:'SPREAD' },
        { id:'TAIL', label:'TAILGUN' },
        { id:'OPTION', label:'OPTION' },
        { id:'SHIELD', label:'SHIELD' }
    ]
};

const AST_TYPES = {
    BASIC: { hp: 20, col: 0x887766 },
    FAST:  { hp: 10, col: 0x3366ff },
    GOLD:  { hp: 50, col: 0xffdd22 },
    MONO:  { hp: 999999, col: 0x111111 }
};

const BELL_COLORS = [0xffff33, 0x3388ff, 0xffffff, 0x33ff33, 0xff3333];

const WAVE_CYCLE = 60;
export const WAVES = [
    { name:'CALM',    emoji:'🌌', start:0.00, end:0.20, d:0.5, typeP:{basic:0.8, fast:0.1, gold:0.1, mono:0.0}, fog:0x020210 },
    { name:'DENSE',   emoji:'☄️',  start:0.20, end:0.40, d:1.8, typeP:{basic:0.7, fast:0.2, gold:0.1, mono:0.0}, fog:0x080415 },
    { name:'MONOLITH',emoji:'⬛',  start:0.40, end:0.60, d:0.8, typeP:{basic:0.3, fast:0.0, gold:0.1, mono:0.6}, fog:0x110202 },
    { name:'SWARM',   emoji:'🌪️', start:0.60, end:0.80, d:2.5, typeP:{basic:0.4, fast:0.5, gold:0.1, mono:0.0}, fog:0x0a1020 },
    { name:'BREATHE', emoji:'✨',  start:0.80, end:1.00, d:0.3, typeP:{basic:0.8, fast:0.0, gold:0.2, mono:0.0}, fog:0x001015 }
];

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist3(p1, p2) {
    let dx = p1.x - p2.x, dy = p1.y - p2.y, dz = p1.z - p2.z;
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
}
/**
 * ⚠️ RECIBE EL AZAR, NO LO BUSCA. Es una función SUELTA, no un método: al
 * enrutar los `Math.random()` de golpe, ésta quedó con un `this.rng()` que en un
 * módulo no existe — `this` es `undefined` y revienta a la primera llamada.
 *
 * Un reemplazo masivo no distingue entre un método y una función de arriba del
 * fichero. Se arregla pasándole el generador, que además es lo correcto: un
 * identificador de una partida sembrada tiene que salir de la misma semilla.
 */
function uuid(rng) { return rng().toString(36).substring(2, 9); }

export class AsteroidsSystem {
    /**
     * ⚠️ LA SEMILLA VIVE AQUÍ, NO EN EL ENTORNO. ÉSA ES LA PALANCA.
     *
     * `AsteroidsEnv` conseguía su determinismo parcheando `Math.random` GLOBAL
     * mientras corría el episodio, y su propio comentario lo llamaba «un puente
     * honesto hasta que los systems usen DeterministicMath de serie». Esto es
     * cruzar ese puente.
     *
     * El parche global funciona y tiene dos precios: no se pueden correr dos
     * episodios a la vez en el mismo hilo, y el System **no es reproducible por
     * sí mismo** — sólo puntúa desde el entorno que lo parchea. Con la semilla
     * dentro, el System se puede medir en un worker, en node y desde otra puerta
     * sin que nadie tenga que acordarse de envolverlo.
     *
     * ⚠️ Y AQUÍ NO HAY RESPALDO A `Math.random`: EL SYSTEM ES DETERMINISTA SIEMPRE.
     *
     * El primer intento dejaba `() => Math.random()` de reserva, y `prueba_semillas.mjs`
     * —que ya existía— lo cazó con la frase exacta: *«un sistema medio sembrado no
     * es reproducible, y encima lo parece: misma semilla, distinto mundo»*.
     * Tenía razón. Un motor que a veces se siembra y a veces no es peor que uno
     * que nunca se siembra, porque el segundo al menos no engaña.
     *
     * Así que la variedad la pone QUIEN LA QUIERE, no el motor: sin `rng` ni
     * `seed` esto juega siempre la misma partida, y eso es una propiedad, no una
     * carencia. `AsteroidsEngine` —el que monta la página para una persona— pasa
     * una semilla del reloj; el entorno del banco pasa la suya. El System no
     * conoce ni el reloj ni el azar del sistema.
     */
    constructor(config = {}) {
        /**
         * ⚠️ SE GUARDA CÓMO SE FABRICA EL AZAR, NO SÓLO EL AZAR.
         *
         * Sin esto, `reset()` devuelve el mundo a su sitio pero DEJA EL
         * GENERADOR DONDE ESTABA, así que la segunda partida de una instancia no
         * es la misma que la primera con la misma semilla. Medido al escribir el
         * `reset`: el sustrato tras resetear no coincidía con el de una
         * instancia recién construida, y ese es exactamente el fallo que hace
         * que un recibo no se pueda volver a jugar.
         *
         * Si el llamante trae su propio `rng`, es SUYO y no se toca: puede ser
         * un `DeterministicScope` que lleva la cuenta por fuera.
         */
        this._rngExterno = config.rng || null;
        this._semilla = (config.seed ?? 42) >>> 0;
        this.rng = this._rngExterno || mulberry32(this._semilla);
        this.ARENA_W = 40;
        this.ARENA_H = 25;
        this.VISIBLE_Z = 130;
        this.lastWallZ = 0;
        
        this.globalZ = 0;
        this.scrollSpeed = 20;
        this.baseScrollSpeed = 20;
        this.maxEnemies = 0;
        this.targetAsteroidDensity = 15;
        
        this.rank = 0;
        this.energy = 100;
        this.gaugeIndex = -1;
        this.selectedShipClass = 'VIPER';
        this.currentStage = 1;

        this.stats = { time: 0, score: 0, deaths: 0, graze: 0, streak: 0, bestStreak: 0, capsules: 0 };
        this.currentWave = WAVES[0];
        
        this.ship = null;
        this.asteroids = [];
        this.enemies = [];
        this.projectiles = [];
        this.items = [];
        this.particles = [];
        this.decorStars = [];
        
        this.events = [];
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  RESET — DEJAR EL MUNDO COMO ESTABA, Y LUEGO EMPEZAR
     * ═══════════════════════════════════════════════════════════════════════
     *
     * ⚠️ ESTO NO EXISTÍA, Y `start()` NO LO HACÍA: `start` SÓLO PUEBLA.
     *
     * Llamarlo dos veces sobre el mismo sistema no da ningún error — spawnea
     * OTRA nave, otras 300 estrellas y otros quince asteroides encima de los que
     * ya había. Una segunda partida en la misma instancia salía con el doble de
     * todo, y nadie lo veía porque en la práctica siempre se construía un
     * sistema nuevo. El día que alguien reutilice la instancia, la nota de esa
     * partida no significará nada.
     *
     * `GameContract` pide `reset()` justo por esto: con la misma semilla, la
     * misma partida. Sin él, un recibo no se puede volver a jugar.
     *
     * Se devuelve al estado del constructor a mano, y no con un `new`, porque
     * quien tiene la referencia —la página, el entorno— seguiría apuntando al
     * objeto viejo.
     */
    reset(config = {}) {
        // El azar vuelve al principio, o el mundo se reinicia y la partida no.
        // Un `rng` traído de fuera no se toca: lo lleva quien lo trajo.
        if (config.seed !== undefined) this._semilla = config.seed >>> 0;
        if (!this._rngExterno) this.rng = mulberry32(this._semilla);

        this.lastWallZ = 0;
        this.globalZ = 0;
        this.scrollSpeed = 20;
        this.baseScrollSpeed = 20;
        this.maxEnemies = 0;
        this.targetAsteroidDensity = 15;

        this.rank = 0;
        this.energy = 100;
        this.gaugeIndex = -1;
        this.selectedShipClass = 'VIPER';
        this.currentStage = 1;

        this.stats = { time: 0, score: 0, deaths: 0, graze: 0, streak: 0, bestStreak: 0, capsules: 0 };
        this.currentWave = WAVES[0];

        this.ship = null;
        this.asteroids = [];
        this.enemies = [];
        this.projectiles = [];
        this.items = [];
        this.particles = [];
        this.decorStars = [];
        this.events = [];

        this.start(config);
        return this.sustrato();
    }

    start(config) {
        this.currentStage = config.stage || 1;
        this.selectedShipClass = config.shipClass || 'VIPER';
        this.targetAsteroidDensity = config.asteroidDensity || 15;
        this.baseScrollSpeed = config.scrollSpeed || 20;
        this.scrollSpeed = this.baseScrollSpeed;
        if(this.currentStage === 2) this.maxEnemies = config.maxEnemies || 4;

        this.spawnShip();
        for(let i=0; i<300; i++) this.spawnStar();
        for(let i=0; i<this.targetAsteroidDensity; i++) this.spawnAsteroid(this.globalZ + this.rng()*this.VISIBLE_Z, false);
    }
    
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL SUSTRATO — Y AQUÍ EL SEGUNDO EJE DEL SUELO ES LA PROFUNDIDAD
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Mismo contrato que publican los 24 juegos del arcade, para que un
     * dibujante pueda pintar esto sin saber a qué se juega.
     *
     * ⚠️ LO QUE CAMBIA AQUÍ ES QUÉ ES «EL SUELO».
     *
     * Esto no es una arena vista desde arriba: es un TÚNEL por el que se avanza.
     * El plano interesante es «a lo ancho × a lo hondo» —x y z—, y la altura es
     * el eje que la nave usa para esquivar. Así que `y` del sustrato es la
     * profundidad y `alto` es la altura, igual que en ¡Busca!.
     *
     * Se dice porque leerlo al revés no daría ningún error: pintaría un juego
     * plano donde hay un túnel, y nadie lo notaría hasta jugarlo.
     *
     * ⚠️ Y NO ENTRAN NI LAS ESTRELLAS NI LAS PARTÍCULAS.
     * `decorStars` son 300 y `particles` nacen y mueren cada tick. Son decorado:
     * no cambian ninguna partida. El sustrato describe el estado del juego, y
     * meter 300 puntos de adorno lo haría ilegible justo donde hay que mirar.
     */
    sustrato() {
        const piezas = [];
        const s = this.ship;
        if (s) piezas.push({ x: s.x, y: s.z, alto: s.y, t: s.dead ? 'nave_rota' : 'nave', de: 0 });
        for (const a of this.asteroids) {
            piezas.push({ x: a.x, y: a.z, alto: a.y, t: (a.type ?? 'roca').toLowerCase(),
                          de: 1, r: a.radius, tier: a.tier });
        }
        for (const e of (this.enemies ?? [])) {
            piezas.push({ x: e.x, y: e.z, alto: e.y, t: 'dron', de: 2 });
        }
        for (const i of (this.items ?? [])) {
            piezas.push({ x: i.x, y: i.z, alto: i.y, t: (i.kind ?? i.type ?? 'suelo').toLowerCase(), de: 3 });
        }
        return {
            piezas,
            zonas: [],
            leyenda: {
                nave: 'tú', nave_rota: 'tú, reventado', dron: 'un dron',
                basic: 'roca normal', fast: 'roca rápida', gold: 'roca de oro',
                mono: 'monolito: no se rompe', suelo: 'algo que recoger',
            },
            simbolos: {
                nave: '@', nave_rota: 'x', dron: 'd',
                basic: 'o', fast: '>', gold: '$', mono: '#', suelo: '+',
            },
        };
    }

    spawnStar() {
        this.decorStars.push({
            id: uuid(this.rng),
            x: (this.rng()-0.5)*this.ARENA_W*3,
            y: (this.rng()-0.5)*this.ARENA_H*3,
            z: this.globalZ + this.rng()*this.VISIBLE_Z*2,
            size: this.rng()*0.3+0.1,
            opacity: this.rng()*0.8+0.2
        });
    }

    updateStars() {
        if(this.decorStars.length < 300) this.spawnStar();
        for(let i=this.decorStars.length-1; i>=0; i--) {
            let s = this.decorStars[i];
            if(s.z < this.globalZ - 20) {
                s.z = this.globalZ + this.VISIBLE_Z*1.5 + this.rng()*20;
                s.x = (this.rng()-0.5)*this.ARENA_W*3;
                s.y = (this.rng()-0.5)*this.ARENA_H*3;
            }
        }
    }

    spawnParticles(pos, color, count, speed=1) {
        this.events.push({ type: 'PARTICLES', pos: {x:pos.x, y:pos.y, z:pos.z}, color, count, speed });
    }

    advanceGauge() {
        this.gaugeIndex++;
        if(this.gaugeIndex >= SHIP_GAUGES[this.selectedShipClass].length) this.gaugeIndex = 0;
        this.events.push({ type: 'GAUGE_UPDATE', index: this.gaugeIndex });
    }

    activateGauge() {
        if(this.gaugeIndex === -1 || !this.ship || this.ship.dead) return;
        const layout = SHIP_GAUGES[this.selectedShipClass];
        const power = layout[this.gaugeIndex].id;
        
        this.ship.owns[power] = true;
        
        if (power === 'SPEED') this.ship.speedMult = Math.min(2.5, this.ship.speedMult + 0.3);
        else if (power === 'SHIELD') this.ship.shields = Math.min(3, this.ship.shields + 1);
        else if (['MISSILE', 'ROCKET'].includes(power)) this.ship.weaponAlt = power;
        else if (['DOUBLE', 'LASER', 'SPREAD', 'TAIL'].includes(power)) this.ship.weaponMain = power;
        else if (power === 'OPTION') { this.ship.fireRateMult *= 0.7; }
        
        this.events.push({ type: 'FLASH', flashType: 'powerup' });
        this.stats.score += 300;
        
        this.gaugeIndex = -1;
        this.events.push({ type: 'GAUGE_UPDATE', index: this.gaugeIndex });
    }

    updateWaveLogic(dt) {
        let t = (this.stats.time % WAVE_CYCLE) / WAVE_CYCLE;
        let newPhase = WAVES.find(w => t >= w.start && t < w.end) || WAVES[0];
        if (newPhase.name !== this.currentWave.name) {
            this.currentWave = newPhase;
            this.events.push({ type: 'WAVE_UPDATE', wave: this.currentWave });
        }
        this.rank += dt * 0.3;
        this.scrollSpeed = this.baseScrollSpeed * (1 + this.rank/150);
    }

    spawnShip() {
        this.ship = {
            id: 'ship_0',
            x: 0, y: 0, z: -10,
            rotX: 0, rotY: Math.PI, rotZ: 0,
            tx: 0, ty: 0, dead: false, deathT: 0, invuln: 2.0,
            shields: 0, speedMult: 1.0, fireRateMult: 1.0, 
            weaponMain: 'NONE', weaponAlt: null,
            fireCooldown: 0, owns: {}
        };
    }

    shipAI(dt) {
        if(!this.ship || this.ship.dead) return;
        let fx=0, fy=0;
        
        let obstacles = [...this.asteroids, ...this.enemies, ...this.projectiles.filter(p=>!p.isPlayer)];
        for(let o of obstacles) {
            let dz = o.z - this.globalZ;
            if(dz > 60 || dz < -10) continue; 
            let dx = this.ship.x - o.x;
            let dy = this.ship.y - o.y;
            let dist = Math.sqrt(dx*dx + dy*dy + dz*dz) - o.radius;
            
            let avoidDist = o.type === 'MONO' ? 25 : 15; 
            
            if(dist < avoidDist && dz > -5) {
                let repel = (o.type==='MONO' ? 300 : 100) / (dist*dist + 0.1);
                fx += (dx/dist)*repel;
                fy += (dy/dist)*repel;
            }
        }

        for(let i of this.items) {
            let dz = i.z - this.globalZ;
            if(dz < 0 || dz > 50) continue;
            let dx = i.x - this.ship.x;
            let dy = i.y - this.ship.y;
            let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if(dist < 40) {
                let hpull = (40 / (dist+1)) * 4.0;
                fx += dx * hpull; fy += dy * hpull;
            }
        }

        if(this.gaugeIndex !== -1) {
            const cw = SHIP_GAUGES[this.selectedShipClass][this.gaugeIndex].id;
            let want = false;
            if (cw === 'SPEED' && this.ship.speedMult < 1.6) want = true;
            if (['MISSILE', 'ROCKET'].includes(cw) && this.ship.weaponAlt !== cw) want = true;
            if (this.selectedShipClass === 'VIPER' && cw === 'LASER' && this.ship.weaponMain !== 'LASER') want = true;
            if (this.selectedShipClass === 'BEE' && cw === 'SPREAD' && this.ship.weaponMain !== 'SPREAD') want = true;
            if (cw === 'OPTION' && this.ship.fireRateMult > 0.5) want = true;
            if (cw === 'SHIELD' && this.ship.shields < 3) want = true;

            if (want) this.activateGauge();
        }

        if(this.ship.x < -this.ARENA_W/2) fx += 25; if(this.ship.x > this.ARENA_W/2) fx -= 25;
        if(this.ship.y < -this.ARENA_H/2) fy += 25; if(this.ship.y > this.ARENA_H/2) fy -= 25;
        fx -= this.ship.x * 0.1; fy -= this.ship.y * 0.1;

        let spd = 6 * this.ship.speedMult;
        // externalControl: un agente del Gym conduce (tx/ty los pone él). Saltamos el
        // piloto automático pero conservamos movimiento, rotación, disparo e invuln.
        if (!this.externalControl) { this.ship.tx += fx * dt; this.ship.ty += fy * dt; }
        this.ship.tx = clamp(this.ship.tx, -this.ARENA_W/2, this.ARENA_W/2);
        this.ship.ty = clamp(this.ship.ty, -this.ARENA_H/2, this.ARENA_H/2);

        this.ship.x += (this.ship.tx - this.ship.x) * spd * dt;
        this.ship.y += (this.ship.ty - this.ship.y) * spd * dt;
        this.ship.z = this.globalZ;

        this.ship.rotZ = lerp(this.ship.rotZ, -fx*0.03, 5*dt);
        this.ship.rotX = lerp(this.ship.rotX, fy*0.03, 5*dt);

        this.ship.fireCooldown -= dt;
        if(this.ship.fireCooldown <= 0) {
            let wantFire = false;
            if (this.externalControl) {
                // El agente (humano / FSM / LLM) decide CUÁNDO disparar.
                // Sin esto el disparo era automático = modo demo, y el espacio de
                // acciones quedaba incompleto (bastaba quedarse quieto para puntuar).
                wantFire = !!this.ship.wantFire;
            } else {
                for(let o of obstacles) {
                    if(o.z > this.globalZ && o.z < this.globalZ+60 && Math.abs(this.ship.x - o.x) < 8) { wantFire=true; break; }
                }
                wantFire = wantFire || this.ship.owns['SPREAD'] || this.ship.owns['TAIL'] || this.ship.weaponMain !== 'NONE';
            }
            if(wantFire) {
                if(this.ship.weaponMain === 'NONE') this.spawnProj({x:this.ship.x, y:this.ship.y, z:this.ship.z+2}, 0,0,80, 'laser', 0xaaaaaa);
                else if(this.ship.weaponMain === 'LASER') this.spawnProj({x:this.ship.x, y:this.ship.y, z:this.ship.z+2}, 0,0,80, 'laser', 0x00ffff);
                else if(this.ship.weaponMain === 'DOUBLE') { this.spawnProj({x:this.ship.x+1, y:this.ship.y, z:this.ship.z+2}, 0,0,80, 'laser', 0x00ffff); this.spawnProj({x:this.ship.x-1, y:this.ship.y, z:this.ship.z+2}, 0,0,80, 'laser', 0x00ffff); }
                else if(this.ship.weaponMain === 'SPREAD') { for(let a of [-0.3, 0, 0.3]) this.spawnProj({x:this.ship.x, y:this.ship.y, z:this.ship.z+2}, Math.sin(a)*80,0,Math.cos(a)*80, 'laser', 0x00ffaa); }
                else if(this.ship.weaponMain === 'TAIL') { this.spawnProj({x:this.ship.x, y:this.ship.y, z:this.ship.z+2}, 0,0,80, 'laser', 0x00ffaa); this.spawnProj({x:this.ship.x, y:this.ship.y, z:this.ship.z-2}, 0,0,-40, 'laser', 0x00ffaa); }
                
                if(this.ship.weaponAlt === 'MISSILE') this.spawnProj({x:this.ship.x, y:this.ship.y-1, z:this.ship.z+2}, 0,-10,40, 'missile', 0xff8800);
                if(this.ship.weaponAlt === 'ROCKET') this.spawnProj({x:this.ship.x, y:this.ship.y, z:this.ship.z+2}, 0,0,50, 'rocket', 0xffcc00);
                
                this.ship.fireCooldown = 0.3 * this.ship.fireRateMult;
            }
        }

        if(this.ship.invuln > 0) this.ship.invuln -= dt;
    }

    spawnAsteroid(z, isSplit=false, p=null, vx=0, vy=0, sz=0) {
        let type = 'BASIC';
        if(!isSplit) {
            let r = this.rng();
            let prob = this.currentWave.typeP;
            if(r < prob.mono && (z - this.lastWallZ) > 60) type = 'MONO'; 
            else if(r < prob.mono + prob.gold) type = 'GOLD';
            else if(r < prob.mono + prob.gold + prob.fast) type = 'FAST';
            sz = type === 'MONO' ? 5 : type === 'GOLD' ? 2 : type === 'FAST' ? 1 : (this.rng()>0.7?3:2);
        } else {
            type = 'BASIC';
        }

        if (type === 'MONO') {
            this.lastWallZ = z;
            const cols = [-16, -8, 0, 8, 16];
            let available = [...cols];
            let numGaps = this.rng() > 0.5 ? 2 : 1;
            for(let g=0; g<numGaps; g++) available.splice(Math.floor(this.rng() * available.length), 1);
            
            for (let px of available) {
                this.asteroids.push({
                    id: uuid(this.rng), x: px, y: 0, z: z,
                    rotX: 0, rotY: 0, rotZ: 0,
                    isMono: true, type, tier: sz, hp: 999999, radius: 4, 
                    vx: 0, vy: 0, vz: 0, rv: {x:0,y:0,z:0}, grazed: false
                });
            }
            return;
        } 

        let scale = sz === 3 ? 4.5 : sz === 2 ? 2.5 : 1.2;
        let radius = scale * 0.5;
        let px = p ? p.x : (this.rng()-0.5)*this.ARENA_W;
        let py = p ? p.y : (this.rng()-0.5)*this.ARENA_H;
        let baseVz = type==='FAST'?35 : type==='MONO'?0 : 15;
        
        this.asteroids.push({
            id: uuid(this.rng), x: px, y: py, z: z,
            rotX: this.rng()*6, rotY: this.rng()*6, rotZ: this.rng()*6,
            type, tier: sz, hp: AST_TYPES[type].hp*sz, radius, 
            vx: vx + (isSplit?0:(this.rng()-0.5)*4), vy: vy + (isSplit?0:(this.rng()-0.5)*4), 
            vz: isSplit ? (this.rng()-0.5)*5 : (baseVz + this.rng()*10),
            rv: {x:this.rng()-0.5, y:this.rng()-0.5, z:this.rng()-0.5}, grazed: false
        });
    }

    breakAsteroid(a) {
        if(a.type==='MONO') return;
        this.spawnParticles(a, AST_TYPES[a.type].col, 20*a.tier);
        
        if (a.type === 'GOLD') {
            this.spawnItem(a, 'BELL');
        } else if (a.tier > 1) {
            let ct = a.tier - 1;
            this.spawnAsteroid(a.z, true, a, 15, 5, ct);
            this.spawnAsteroid(a.z, true, a, -15, -5, ct);
        } else if (a.tier === 1 && this.rng() < 0.25) {
            this.spawnItem(a, 'CAPSULE');
        }
        
        a.dead = true;
    }

    spawnItem(pos, type) {
        this.items.push({
            id: uuid(this.rng), x: pos.x, y: pos.y, z: pos.z,
            rotX: 0, rotY: 0, rotZ: 0,
            iType: type, radius: 1.5, bColor: 0, dead: false
        });
    }

    collectItem(i) {
        this.events.push({ type: 'FLASH', flashType: 'powerup' });
        this.energy = Math.min(100, this.energy + 20);
        
        if (i.iType === 'CAPSULE') {
            this.stats.capsules++;
            this.advanceGauge();
        } else if (i.iType === 'BELL') {
            let bc = i.bColor;
            if(bc === 1) { this.ship.speedMult = 2.0; setTimeout(()=>{ if(this.ship)this.ship.speedMult=1.0;}, 8000); }
            else if(bc === 2) { 
                for(let a of this.asteroids) { if(a.type!=='MONO') this.breakAsteroid(a); }
            }
            else if(bc === 3) { this.ship.invuln = 15.0; }
            else if(bc === 4) { this.energy = 100; this.stats.score+=1000; }
            else { this.stats.score += 500; }
        }
        i.dead = true;
    }

    spawnProj(pos, vx, vy, vz, type, col) {
        this.projectiles.push({
            id: uuid(this.rng), x: pos.x, y: pos.y, z: pos.z,
            isPlayer: true, vx, vy, vz, type, life: 10, radius: type==='rocket'?1.2:0.5, color: col, dead: false
        });
    }

    spawnDrone() {
        if(this.globalZ < 100) return;
        const defs = [{c:0xff1111, hp:30, sp:15, t:'LINER'}, {c:0xffff11, hp:40, sp:12, t:'TRACKER'}, {c:0x11ff11, hp:30, sp:10, t:'SNIPER'}];
        let d = defs[Math.floor(this.rng()*defs.length)];
        
        this.enemies.push({
            ...d, id: uuid(this.rng), x: (this.rng()-0.5)*this.ARENA_W, y: this.ARENA_H/2, z: this.globalZ + this.VISIBLE_Z,
            radius: 2.0, fireT: 3, tx: 0, ty: 0, dead: false
        });
    }

    hitShip(instakill=false) {
        if(this.ship.shields > 0 && !instakill) {
            this.ship.shields--; this.ship.invuln = 1.0;
            this.events.push({ type: 'FLASH', flashType: 'graze' });
            this.spawnParticles(this.ship, 0x88ccff, 30);
        } else {
            this.ship.dead = true; this.ship.deathT = 2.5;
            this.spawnParticles(this.ship, 0x00aaff, 100, 2);
            this.stats.deaths++; this.stats.streak = 0; this.rank = Math.max(0, this.rank - 15);
            this.energy = 100; this.gaugeIndex = -1;
            this.events.push({ type: 'GAUGE_UPDATE', index: this.gaugeIndex });
            this.events.push({ type: 'FLASH', flashType: 'death' });
        }
    }

    processCollisions() {
        if(!this.ship || this.ship.dead) return;

        for(let i=this.projectiles.length-1; i>=0; i--) {
            let p = this.projectiles[i]; let hit=false;
            if(p.isPlayer) {
                for(let it of this.items) {
                    if(it.iType==='BELL' && dist3(p, it) < it.radius + p.radius) {
                        it.bColor = (it.bColor + 1) % BELL_COLORS.length;
                        hit=true; break;
                    }
                }
                if(hit){ p.dead = true; continue; }

                for(let a of this.asteroids) {
                    if(dist3(p, a) < a.radius + p.radius) {
                        if(a.type !== 'MONO') {
                            a.hp -= (p.type==='rocket'?50:20);
                            if(a.hp<=0) this.breakAsteroid(a); else this.spawnParticles(p, 0xffaa00, 5);
                        }
                        hit=true; break;
                    }
                }
                if(!hit) {
                    for(let e of this.enemies) {
                        if(dist3(p, e) < e.radius + p.radius) {
                            e.hp -= 20; hit=true; break;
                        }
                    }
                }
            } else {
                if(this.ship.invuln<=0 && dist3(p, this.ship)<2.0) { this.hitShip(); hit=true; }
            }
            if(hit) p.dead = true;
        }

        for(let a of this.asteroids) {
            let d = dist3(this.ship, a);
            if(this.ship.invuln<=0 && d < a.radius + 1.2) { 
                this.hitShip(a.type==='MONO'); 
                break; 
            }
            else if(d < a.radius + 4 && !a.grazed) {
                a.grazed=true; this.stats.graze++; this.stats.streak++; this.stats.score+=10*Math.max(1,this.stats.streak);
                this.energy = Math.min(100, this.energy+5); this.rank+=1.5; 
                this.events.push({ type: 'FLASH', flashType: 'graze' });
            }
        }
        
        for(let i=this.items.length-1; i>=0; i--) {
            if(dist3(this.ship, this.items[i]) < 3.0) this.collectItem(this.items[i]);
        }
    }

    tick(dt) {
        this.events = [];
        this.stats.time += dt;
        let dZ = this.scrollSpeed * dt;
        this.globalZ += dZ;

        this.updateWaveLogic(dt);
        this.updateStars();

        if(this.asteroids.length < this.targetAsteroidDensity * this.currentWave.d * (1+this.rank/100)) this.spawnAsteroid(this.globalZ + this.VISIBLE_Z);
        if(this.currentStage===2 && this.enemies.length < this.maxEnemies && this.rng()<0.01*(1+this.rank/100)) this.spawnDrone();

        if(this.ship) {
            if(this.ship.dead) {
                this.ship.deathT -= dt;
                if(this.ship.deathT <= 0) {
                    this.ship.dead=false; this.ship.x=0; this.ship.y=0; this.ship.z=this.globalZ;
                    this.ship.tx=0; this.ship.ty=0; this.ship.invuln=2.5; this.energy=100;
                }
            } else {
                this.shipAI(dt);
                this.energy -= dt * 4; if(this.energy<=0) this.hitShip(true);
            }
        }

        for(let i=this.asteroids.length-1; i>=0; i--) {
            let a = this.asteroids[i]; 
            if(a.type==='FAST') this.spawnParticles(a, 0x1133aa, 1, 0.2); 
            
            a.x += a.vx*dt; a.y += a.vy*dt; a.z -= a.vz*dt;
            a.rotX += a.rv.x*dt; a.rotY += a.rv.y*dt; a.rotZ += a.rv.z*dt;
            
            if(a.z < this.globalZ - 30) a.dead = true;
            if(a.dead) this.asteroids.splice(i,1);
        }

        for(let i=this.enemies.length-1; i>=0; i--) {
            let e = this.enemies[i]; 
            if(e.hp<=0) { this.spawnParticles(e, e.c, 40); if(this.rng()<0.5) this.spawnItem(e, 'CAPSULE'); e.dead=true; this.stats.score+=300; }
            else {
                if(e.t==='LINER') e.z -= e.sp*dt;
                if(e.t==='TRACKER' && this.ship) { e.x += (this.ship.x-e.x)*e.sp*dt*0.1; e.y += (this.ship.y-e.y)*e.sp*dt*0.1; e.z -= e.sp*dt*0.5;}
                if(e.t==='SNIPER') e.z = Math.max(e.z - e.sp*dt, this.globalZ+40);
                if(e.z < this.globalZ-30) e.dead = true;
            }
            if(e.dead) this.enemies.splice(i,1);
        }

        for(let i=this.items.length-1; i>=0; i--) {
            let it = this.items[i]; it.rotX+=dt; it.rotY+=dt; it.z -= 5*dt;
            if(it.z < this.globalZ-20) it.dead = true;
            if(it.dead) this.items.splice(i,1);
        }

        for(let i=this.projectiles.length-1; i>=0; i--) {
            let p = this.projectiles[i]; p.life -= dt;
            p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt;
            if(p.life<=0) p.dead = true;
            if(p.dead) this.projectiles.splice(i,1);
        }

        this.processCollisions();
    }
}
