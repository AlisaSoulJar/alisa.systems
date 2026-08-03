// KataSequenceEngine.js - Deterministic Headless Choreography Engine

export class KataSequenceSystem {
    constructor() {
        this.sequence = [];
        this.elapsedMs = 0;
        this.currentIndex = 0;
        this.isPlaying = false;
        
        // Built-in sequences
        this.library = {
            'ninja_1': [
                { delay: 0, action: 'acrobat', force: 1.0, type: 'front' },         
                { delay: 1100, action: 'attack' },                                  
                { delay: 1800, action: 'acrobat', force: 0.0, type: 'back' },         
                { delay: 2600, action: 'crouch' },                                  
                { delay: 3500, action: 'block' },                                   
                { delay: 4500, action: 'idle' }                                     
            ],
            'dance_1': [
                { delay: 0, action: 'idle', pose: 'tpose' },
                { delay: 800, pose: 'right_up' },
                { delay: 1600, pose: 'zombie' },
                { delay: 2600, pose: 'naruto', action: 'move' },
                { delay: 4200, pose: 'none', action: 'idle' }
            ],
            'zelda_combat': [
                { delay: 0, action: 'attack' },
                { delay: 1000, action: 'acrobat_left', force: 1.0 },
                { delay: 2000, action: 'block' },
                { delay: 2800, action: 'acrobat_right', force: 0.5 },
                { delay: 3800, action: 'acrobat_back', force: 1.0 },
                { delay: 4800, action: 'idle' }
            ]
        };
    }

    /**
     * Start playing a sequence by name or direct array
     * @param {string|Array} kata Sequence name or array of sequence objects
     */
    play(kata) {
        if (typeof kata === 'string') {
            this.sequence = this.library[kata] || [];
        } else {
            this.sequence = kata;
        }
        
        // Sort by delay to ensure linear progression
        this.sequence.sort((a, b) => a.delay - b.delay);
        
        this.elapsedMs = 0;
        this.currentIndex = 0;
        this.isPlaying = this.sequence.length > 0;
    }

    stop() {
        this.isPlaying = false;
        this.elapsedMs = 0;
        this.currentIndex = 0;
    }

    /**
     * Progress time and return actions that should trigger
     * @param {number} dt Delta time in seconds
     * @returns {Array} Array of actions triggered in this frame
     */
    tick(dt) {
        if (!this.isPlaying) return [];

        const dtMs = dt * 1000;
        this.elapsedMs += dtMs;
        
        const triggered = [];
        
        while (this.currentIndex < this.sequence.length) {
            const step = this.sequence[this.currentIndex];
            if (this.elapsedMs >= step.delay) {
                triggered.push(step);
                this.currentIndex++;
            } else {
                break; // Not reached yet
            }
        }
        
        if (this.currentIndex >= this.sequence.length) {
            this.isPlaying = false;
        }
        
        return triggered;
    }
}
