export class CabinetJumpscareSystem {
    constructor() {
        this.resetState();
    }
    
    resetState() {
        this.active = false;
        this.phase = 'flicker'; // flicker -> rush -> drag -> gameover
        this.timer = 0;
        
        // References mapped from factory
        this.phantomGroup = null;
        this.seekerGroup = null;
        this.flashLight = null;
        this.volumetricBeam = null;
        this.camera = null;
        
        this.onCallback = null; // triggers UI updates
        this.phantomMixer = null;
        this.phantomAnimMap = null;
        this.phantomCurAnim = '';
        this.isComplete = false;
    }
    
    triggerJumpscare(phantomGroup, seekerGroup, flashLight, volumetricBeam, camera, phantomMixer, phantomAnimMap, cb) {
        this.active = true;
        this.phase = 'flicker';
        this.timer = 2.5;
        this.isComplete = false;
        
        this.phantomGroup = phantomGroup;
        this.seekerGroup = seekerGroup;
        this.flashLight = flashLight;
        this.volumetricBeam = volumetricBeam;
        this.camera = camera;
        
        this.phantomMixer = phantomMixer;
        this.phantomAnimMap = phantomAnimMap;
        this.onCallback = cb;
        
        if (this.phantomGroup) {
            this.phantomGroup.visible = false;
            this.phantomGroup.position.set(0, 0, 5);
        }
    }
    
    playAnim(state) {
        if (!this.phantomMixer || !this.phantomAnimMap || this.phantomCurAnim === state) return this.phantomCurAnim;
        if (this.phantomCurAnim && this.phantomAnimMap[this.phantomCurAnim]) {
            this.phantomAnimMap[this.phantomCurAnim].fadeOut(0.3);
        }
        if (this.phantomAnimMap[state]) {
            this.phantomAnimMap[state].reset().fadeIn(0.3).play();
            return state;
        }
        return this.phantomCurAnim;
    }

    update(dt) {
        if (!this.active || this.isComplete) return;
        
        this.timer -= dt;
        
        if (this.phase === 'flicker') {
            const show = Math.random() > 0.5;
            if (this.flashLight) this.flashLight.intensity = show ? 1.5 : 0;
            if (this.volumetricBeam) this.volumetricBeam.material.opacity = show ? 0.4 : 0;
            if (this.phantomGroup) this.phantomGroup.visible = show;
            
            if (this.timer <= 1.0) {
                this.phase = 'rush';
                if (this.flashLight) this.flashLight.intensity = 1.5;
                if (this.phantomGroup) {
                    this.phantomGroup.position.set(0, 0, -2.5);
                    this.phantomGroup.visible = true;
                    this.phantomCurAnim = this.playAnim('run');
                }
            }
            
        } else if (this.phase === 'rush') {
            if (this.phantomGroup && this.seekerGroup) {
                const dz = this.seekerGroup.position.z - this.phantomGroup.position.z;
                this.phantomGroup.position.z += dz * dt * 3.0;
                if (Math.abs(dz) < 1.0 || this.timer <= 0) {
                    this.phase = 'drag';
                    this.timer = 1.5;
                    if (this.onCallback) this.onCallback('drag'); // e.g. show "DRAGGED TO THE VOID"
                }
            }
            
        } else if (this.phase === 'drag') {
            if (this.seekerGroup) {
                this.seekerGroup.position.z += 8.0 * dt;
                if (this.camera) this.camera.rotation.z += Math.sin(this.timer * 20.0) * 0.05 * dt;
            }
            if (this.phantomGroup) {
                this.phantomGroup.position.z = (this.seekerGroup ? this.seekerGroup.position.z : 0) - 1.0;
                this.phantomGroup.position.y = Math.sin(this.timer * 20.0) * 0.2;
            }
            if (this.flashLight) {
                this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 2.0);
            }
            if (this.volumetricBeam && this.flashLight) {
                this.volumetricBeam.material.opacity = this.flashLight.intensity > 0 ? 0.3 : 0;
            }
            
            if (this.timer <= 0) {
                if (this.flashLight) this.flashLight.intensity = 0;
                if (this.volumetricBeam) this.volumetricBeam.material.opacity = 0;
                if (this.phantomGroup) this.phantomGroup.visible = false;
                
                this.isComplete = true;
                if (this.onCallback) this.onCallback('gameover');
            }
        }
    }
}
