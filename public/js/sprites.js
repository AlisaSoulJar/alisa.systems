/**
 * [ALISA SpriteFactory v2]
 * Procedural Zomboid/ISO-CORE-style mannequin generator.
 * Draws all character sprites on offscreen canvases at init.
 * v2: Adds per-character accessories (crowns, capes, halos, weapons)
 *     and subtle idle breathing animation.
 */

const SpriteFactory = {
    frameW: 48,
    frameH: 72,
    sheets: {},
    globalTick: 0,
    _tickInterval: null,

    init() {
        // Animation tick at ~8fps (walk cycle speed)
        this._tickInterval = setInterval(() => this.globalTick++, 125);

        // --- Named Characters with accessories ---
        // generateSheet(id, headColor, bodyColor, legColor, accessories)
        this.generateSheet('default',   '#f0f0f0', '#e0e0e0', '#cccccc', {});
        this.generateSheet('queen',     '#00ffff', '#00bbcc', '#008899', { crown: true, halo: '#00ffff' });
        this.generateSheet('princess',  '#ffaacc', '#ff69b4', '#cc4488', { crown: true, halo: '#ff69b4' });
        this.generateSheet('oscar',     '#ffcda3', '#2a2a2a', '#111111', { hat: 'beret' });
        this.generateSheet('zazu',      '#ffcda3', '#ff8800', '#0044cc', { cape: '#ff8800' });
        this.generateSheet('alisa',     '#ffe8d0', '#ffffff', '#eeddcc', { halo: '#ffe8d0' });
        this.generateSheet('metatron',  '#ffdd44', '#cc9900', '#886600', { weapon: 'sword', halo: '#ffdd44' });
        this.generateSheet('codex',     '#88ff88', '#33aa33', '#226622', { visor: '#88ff88' });
        this.generateSheet('darkagora', '#aa44ff', '#663399', '#331166', { cape: '#9933cc', horns: true });

        // --- Fauna (WorldBox-inspired: small, bright, distinct silhouettes) ---
        this.generateSheet('fauna',         '#bba488', '#9e8872', '#7a6650', { small: true });
        this.generateSheet('animal_mouse',  '#c8a878', '#b09468', '#8a7050', { small: true });
        this.generateSheet('animal_rabbit', '#e8d8c8', '#d0c0a0', '#a09070', { small: true, ears: true });
        this.generateSheet('animal_bird',   '#44aaff', '#2288dd', '#1166aa', { small: true, wings: true });
        this.generateSheet('animal_fish',   '#66ddff', '#44bbee', '#2299cc', { small: true });
        this.generateSheet('yokai',         '#cc44ff', '#9900cc', '#660088', { horns: true, halo: '#cc44ff' });
        this.generateSheet('yokai_entropy', '#ff2266', '#cc0044', '#880022', { horns: true, halo: '#ff2266' });

        // --- Flora & Entorno Estático ---
        this.generateStatic('tree_pine', '#1a331a', '#264d26', 'cone');
        this.generateStatic('flora_bush', '#2d5a27', '#3d7a36', 'bush');
        this.generateStatic('mineral', '#555555', '#777777', 'rock');
        this.generateStatic('rock_boulder', '#555555', '#777777', 'rock');
        this.generateStatic('mineral_deposit', '#667788', '#8899aa', 'rock');
        this.generateStatic('tech_scrap', '#334444', '#556666', 'rock');
        this.generateStatic('server_debris', '#223344', '#445566', 'rock');

        console.log('[SpriteFactory v2] All sprite sheets generated (WorldBox fauna + accessories).');
    },

    generateStatic(id, colorDark, colorLight, shape) {
        const canvas = document.createElement('canvas');
        canvas.width = this.frameW * 4;
        canvas.height = this.frameH * 2;
        const ctx = canvas.getContext('2d');
        const cx = this.frameW / 2;
        const by = this.frameH - 4;

        ctx.save();
        
        // Shadow (base)
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, by, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        if (shape === 'cone') {
            // Pine Tree Root
            ctx.fillStyle = '#3a2311';
            ctx.fillRect(cx - 4, by - 12, 8, 12);
            // Pine Leaves (Layers)
            ctx.fillStyle = colorDark;
            ctx.beginPath(); ctx.moveTo(cx, by - 55); ctx.lineTo(cx - 18, by - 20); ctx.lineTo(cx + 18, by - 20); ctx.fill();
            ctx.fillStyle = colorLight;
            ctx.beginPath(); ctx.moveTo(cx, by - 65); ctx.lineTo(cx - 15, by - 30); ctx.lineTo(cx + 15, by - 30); ctx.fill();
        } else if (shape === 'bush') {
            ctx.fillStyle = colorDark;
            ctx.beginPath(); ctx.arc(cx - 6, by - 10, 10, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 6, by - 10, 10, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = colorLight;
            ctx.beginPath(); ctx.arc(cx, by - 18, 12, 0, Math.PI*2); ctx.fill();
        } else if (shape === 'rock') {
            ctx.fillStyle = colorDark;
            ctx.beginPath(); ctx.arc(cx, by - 8, 14, 0, Math.PI, true); ctx.fill();
            ctx.fillStyle = colorLight;
            ctx.beginPath(); ctx.arc(cx, by - 12, 8, 0, Math.PI, true); ctx.fill();
        }

        ctx.restore();
        
        // Copy static frame to all slots so animation loop just sees the same image
        for(let i = 1; i < 4; i++) {
            ctx.drawImage(canvas, 0, 0, this.frameW, this.frameH, i * this.frameW, 0, this.frameW, this.frameH);
        }
        for(let i = 0; i < 4; i++) {
            ctx.drawImage(canvas, i * this.frameW, 0, this.frameW, this.frameH, i * this.frameW, this.frameH, this.frameW, this.frameH);
        }
        this.sheets[id] = canvas;
    },

    generateSheet(id, headColor, bodyColor, legColor, accessories = {}) {
        const cols = 4; // 4 animation frames
        const rows = 2; // row 0 = idle, row 1 = walk
        const canvas = document.createElement('canvas');
        canvas.width = this.frameW * cols;
        canvas.height = this.frameH * rows;
        const ctx = canvas.getContext('2d');

        for (let f = 0; f < cols; f++) {
            this._drawFrame(ctx, f * this.frameW, 0, f, false, headColor, bodyColor, legColor, accessories);
            this._drawFrame(ctx, f * this.frameW, this.frameH, f, true, headColor, bodyColor, legColor, accessories);
        }

        this.sheets[id] = canvas;
    },

    _drawFrame(ctx, ox, oy, frame, isWalk, headCol, bodyCol, legCol, acc) {
        const cx = ox + this.frameW / 2;
        const by = oy + this.frameH - 4; // ground baseline
        const isSmall = acc.small || false;
        const scale = isSmall ? 0.55 : 1.0;

        // Walk cycle phase
        const phase = frame * Math.PI / 2;
        const bob = isWalk ? Math.sin(phase) * 2 : Math.sin(phase * 0.5) * 0.8;
        const legSwing = isWalk ? Math.sin(phase) * 6 : 0;
        const armSwing = isWalk ? Math.sin(phase) * 5 : 0;

        ctx.save();
        if (isSmall) {
            ctx.translate(cx, by);
            ctx.scale(scale, scale);
            ctx.translate(-cx, -by);
        }
        
        // --- WorldBox-style ears (rabbits) ---
        if (acc.ears) {
            ctx.fillStyle = headCol;
            const earBob = Math.sin(phase * 0.7) * 1.5;
            ctx.beginPath();
            ctx.ellipse(cx - 4, by - 65 - bob + earBob, 2.5, 7, -0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 4, by - 65 - bob - earBob, 2.5, 7, 0.15, 0, Math.PI * 2);
            ctx.fill();
            // Inner ear pink
            ctx.fillStyle = '#ffaaaa';
            ctx.beginPath();
            ctx.ellipse(cx - 4, by - 65 - bob + earBob, 1.2, 4, -0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 4, by - 65 - bob - earBob, 1.2, 4, 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // --- WorldBox-style wings (birds) ---
        if (acc.wings) {
            const wingPhase = isWalk ? Math.sin(phase * 2) * 8 : Math.sin(phase * 0.5) * 3;
            ctx.fillStyle = bodyCol;
            ctx.globalAlpha = 0.8;
            // Left wing
            ctx.beginPath();
            ctx.moveTo(cx - 8, by - 40 - bob);
            ctx.lineTo(cx - 18 - wingPhase, by - 45 - bob);
            ctx.lineTo(cx - 12, by - 35 - bob);
            ctx.fill();
            // Right wing
            ctx.beginPath();
            ctx.moveTo(cx + 8, by - 40 - bob);
            ctx.lineTo(cx + 18 + wingPhase, by - 45 - bob);
            ctx.lineTo(cx + 12, by - 35 - bob);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // --- Shadow ---
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx, by, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // --- Halo (behind character) ---
        if (acc.halo) {
            ctx.save();
            ctx.globalAlpha = 0.15 + Math.sin(phase * 0.5) * 0.05;
            ctx.fillStyle = acc.halo;
            ctx.beginPath();
            ctx.ellipse(cx, by - 38 - bob, 18, 22, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // --- Cape (behind character) ---
        if (acc.cape) {
            ctx.fillStyle = acc.cape;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            const capeWave = isWalk ? Math.sin(phase) * 3 : 0;
            ctx.moveTo(cx - 8, by - 40 - bob);
            ctx.lineTo(cx - 10 - capeWave, by - 12);
            ctx.lineTo(cx + 10 + capeWave, by - 12);
            ctx.lineTo(cx + 8, by - 40 - bob);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // --- Legs ---
        ctx.lineCap = 'round';
        ctx.lineWidth = 4;

        // Left leg
        ctx.strokeStyle = legCol;
        ctx.beginPath();
        ctx.moveTo(cx - 4, by - 26 - bob);
        ctx.lineTo(cx - 4 + legSwing, by - 4);
        ctx.stroke();

        // Right leg
        ctx.beginPath();
        ctx.moveTo(cx + 4, by - 26 - bob);
        ctx.lineTo(cx + 4 - legSwing, by - 4);
        ctx.stroke();

        // --- Feet ---
        ctx.fillStyle = legCol;
        ctx.beginPath();
        ctx.ellipse(cx - 4 + legSwing, by - 3, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 4 - legSwing, by - 3, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // --- Torso ---
        const torsoX = cx - 9;
        const torsoY = by - 44 - bob;
        const torsoW = 18;
        const torsoH = 20;

        ctx.fillStyle = bodyCol;
        ctx.beginPath();
        const r = 4;
        ctx.moveTo(torsoX + r, torsoY);
        ctx.lineTo(torsoX + torsoW - r, torsoY);
        ctx.quadraticCurveTo(torsoX + torsoW, torsoY, torsoX + torsoW, torsoY + r);
        ctx.lineTo(torsoX + torsoW, torsoY + torsoH - r);
        ctx.quadraticCurveTo(torsoX + torsoW, torsoY + torsoH, torsoX + torsoW - r, torsoY + torsoH);
        ctx.lineTo(torsoX + r, torsoY + torsoH);
        ctx.quadraticCurveTo(torsoX, torsoY + torsoH, torsoX, torsoY + torsoH - r);
        ctx.lineTo(torsoX, torsoY + r);
        ctx.quadraticCurveTo(torsoX, torsoY, torsoX + r, torsoY);
        ctx.closePath();
        ctx.fill();

        // Subtle outline
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // --- Arms ---
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = headCol;

        // Left arm
        ctx.beginPath();
        ctx.moveTo(cx - 9, by - 40 - bob);
        ctx.lineTo(cx - 12, by - 28 - bob + armSwing);
        ctx.stroke();
        ctx.fillStyle = headCol;
        ctx.beginPath();
        ctx.arc(cx - 12, by - 27 - bob + armSwing, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Right arm
        ctx.beginPath();
        ctx.moveTo(cx + 9, by - 40 - bob);
        ctx.lineTo(cx + 12, by - 28 - bob - armSwing);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 12, by - 27 - bob - armSwing, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // --- Weapon (right hand) ---
        if (acc.weapon === 'sword') {
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx + 12, by - 27 - bob - armSwing);
            ctx.lineTo(cx + 14, by - 42 - bob - armSwing);
            ctx.stroke();
            // Hilt
            ctx.strokeStyle = '#886600';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx + 10, by - 27 - bob - armSwing);
            ctx.lineTo(cx + 16, by - 27 - bob - armSwing);
            ctx.stroke();
        }

        // --- Neck ---
        ctx.strokeStyle = headCol;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, by - 44 - bob);
        ctx.lineTo(cx, by - 49 - bob);
        ctx.stroke();

        // --- Head ---
        ctx.fillStyle = headCol;
        ctx.beginPath();
        ctx.arc(cx, by - 54 - bob, 8, 0, Math.PI * 2);
        ctx.fill();

        // Head outline
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Eyes (two small dark dots)
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(cx - 3, by - 55 - bob, 1.2, 0, Math.PI * 2);
        ctx.arc(cx + 3, by - 55 - bob, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // --- Crown ---
        if (acc.crown) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            const crownBase = by - 62 - bob;
            ctx.moveTo(cx - 7, crownBase);
            ctx.lineTo(cx - 6, crownBase - 6);
            ctx.lineTo(cx - 3, crownBase - 2);
            ctx.lineTo(cx, crownBase - 8);
            ctx.lineTo(cx + 3, crownBase - 2);
            ctx.lineTo(cx + 6, crownBase - 6);
            ctx.lineTo(cx + 7, crownBase);
            ctx.closePath();
            ctx.fill();
            // Crown jewel
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.arc(cx, crownBase - 5, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- Horns ---
        if (acc.horns) {
            ctx.strokeStyle = '#553377';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 5, by - 60 - bob);
            ctx.lineTo(cx - 9, by - 70 - bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 5, by - 60 - bob);
            ctx.lineTo(cx + 9, by - 70 - bob);
            ctx.stroke();
        }

        // --- Visor (tech goggles) ---
        if (acc.visor) {
            ctx.strokeStyle = acc.visor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 6, by - 55 - bob);
            ctx.lineTo(cx + 6, by - 55 - bob);
            ctx.stroke();
            ctx.fillStyle = acc.visor;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(cx - 6, by - 57 - bob, 12, 3);
            ctx.globalAlpha = 1.0;
        }

        // --- Hat (beret for Oscar) ---
        if (acc.hat === 'beret') {
            ctx.fillStyle = '#111111';
            ctx.beginPath();
            ctx.ellipse(cx - 2, by - 61 - bob, 9, 4, -0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    /**
     * Resolve which sheet ID to use for a given entity.
     * Priority: exact ID match → exact skin_tag match → skin_tag substring → type fallback
     */
    resolveSheet(entity) {
        // 1. Named character mapping (exact ID)
        const idMap = {
            'Queen': 'queen', 'Princess': 'princess', 'Oscar': 'oscar',
            'Zazu': 'zazu', 'Alisa': 'alisa', 'Metatron': 'metatron',
            'Codex': 'codex', 'DarkAgora': 'darkagora'
        };
        if (idMap[entity.id]) return idMap[entity.id];
        
        // 2. Exact skin_tag match (backend sends e.g. 'animal_mouse')
        if (entity.skin_tag && this.sheets[entity.skin_tag]) {
            return entity.skin_tag;
        }

        // 3. Skin_tag substring matching (e.g. 'zazu_npc' → 'zazu')
        if (entity.skin_tag) {
            const tag = entity.skin_tag.toLowerCase();
            // Named being skin_tags from backend
            for (const [key, sheetId] of Object.entries(idMap)) {
                if (tag.includes(key.toLowerCase())) return sheetId;
            }
            // Fauna variants
            if (tag.includes('yokai'))  return tag.includes('entropy') ? 'yokai_entropy' : 'yokai';
            if (tag.includes('mouse'))  return 'animal_mouse';
            if (tag.includes('rabbit')) return 'animal_rabbit';
            if (tag.includes('bird'))   return 'animal_bird';
            if (tag.includes('fish'))   return 'animal_fish';
            // Flora variants
            if (tag.includes('pine'))   return 'tree_pine';
            if (tag.includes('bush'))   return 'flora_bush';
            // Mineral/scrap variants
            if (tag.includes('boulder') || tag.includes('deposit') || tag.includes('mineral')) return 'mineral';
            if (tag.includes('scrap') || tag.includes('debris')) return 'tech_scrap';
        }

        // 4. Type-based fallback
        if (entity.type === 'fauna')    return 'fauna';
        if (entity.type === 'flora')    return 'tree_pine';
        if (entity.type === 'mineral' || entity.type === 'scrap') return 'mineral';
        if (entity.type === 'being')    return 'default';
        
        return null; // Not a character — use procedural HTML rendering
    },

    /**
     * Draw a sprite frame on the given canvas context.
     */
    draw(ctx, sheetId, screenX, screenY, isWalking, cpuGlow) {
        const sheet = this.sheets[sheetId] || this.sheets['default'];
        if (!sheet) return;

        const frameIdx = this.globalTick % 4;
        const row = isWalking ? 1 : 0;
        const sx = frameIdx * this.frameW;
        const sy = row * this.frameH;

        ctx.save();
        if (cpuGlow > 0.05) {
            ctx.shadowBlur = cpuGlow * 35;
            ctx.shadowColor = 'rgba(255, 80, 80, 0.9)';
        }

        ctx.drawImage(
            sheet,
            sx, sy, this.frameW, this.frameH,
            screenX - this.frameW / 2,
            screenY - this.frameH + 4,
            this.frameW, this.frameH
        );
        ctx.restore();
    }
};
