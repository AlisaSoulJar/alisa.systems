export class ScummOverworldEngine {
    constructor() {
        this.state = {
            queen: {
                x: 400,
                y: 200,
                targetX: 400,
                targetY: 200,
                speed: 300, // Speed in pixels per second. Original was 3 per frame (at ~60fps this is 180-300).
                emotion: 'happy'
            },
            currentVerb: 'WALK TO',
            objects: [
                { id: 'throne', x: 100, y: 150, name: 'THRONE', color: '#8e44ad' },
                { id: 'terminal', x: 600, y: 300, name: 'TERMINAL', color: '#27ae60' }
            ]
        };
    }

    setTargetPosition(x, y) {
        this.state.queen.targetX = x;
        this.state.queen.targetY = y;
    }

    setVerb(verb) {
        this.state.currentVerb = verb;
    }

    resolveInteraction(x, y) {
        if (this.state.currentVerb === 'WALK TO') {
            this.setTargetPosition(x, y);
            return { action: 'WALK TO', target: null };
        } else {
            const hitObject = this.state.objects.find(obj => {
                const dist = Math.sqrt((obj.x - x) ** 2 + (obj.y - y) ** 2);
                return dist < 30; // 30px collision radius
            });
            if (hitObject) {
                return { action: this.state.currentVerb, target: hitObject };
            }
            return { action: 'MISS', target: null };
        }
    }

    syncStateOverride(x, y) {
        // Externeal API override
        this.state.queen.targetX = x;
        this.state.queen.targetY = y;
    }

    update(dt) {
        const q = this.state.queen;
        const dx = q.targetX - q.x;
        const dy = q.targetY - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
            const moveAmt = q.speed * dt;
            if (moveAmt >= dist) {
                // Arrived
                q.x = q.targetX;
                q.y = q.targetY;
            } else {
                q.x += (dx / dist) * moveAmt;
                q.y += (dy / dist) * moveAmt;
            }
        }
    }
}
