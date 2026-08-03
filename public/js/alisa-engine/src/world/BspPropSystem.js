// WORLD Layer: BSP Prop System
// Deterministic geometry generator using BSP partitioning logic for props (Lockers, Shelves)

function mulberry32(a) {
    return function() {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        var t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export class BspPropSystem {
    
    // Generates a random procedural shelf via BSP
    static generateBspShelf(w, h, d, cuts, seed) {
        const parts = [];
        const t = 0.02; // Thickness of wood

        // Outer Shell definitions
        parts.push({ shape:'box', size:[w, t, d], pos:[0, t/2, 0], partType: 'shell_top_bottom' }); // Bottom
        parts.push({ shape:'box', size:[w, t, d], pos:[0, h - t/2, 0], partType: 'shell_top_bottom' }); // Top
        parts.push({ shape:'box', size:[t, h-t*2, d], pos:[-w/2 + t/2, h/2, 0], partType: 'shell_side' }); // Left
        parts.push({ shape:'box', size:[t, h-t*2, d], pos:[w/2 - t/2, h/2, 0], partType: 'shell_side' }); // Right
        parts.push({ shape:'box', size:[w-t*2, h-t*2, t], pos:[0, h/2, -d/2 + t/2], partType: 'shell_back' }); // Back
        
        const rng = mulberry32(seed);

        function splitSpace(cx, cy, cw, ch, depth) {
            if (depth <= 0 || cw < 0.2 || ch < 0.2) return;

            let splitHoriz = rng() > 0.3; // Mostly shelves
            if (ch > cw * 1.5) splitHoriz = true;
            if (cw > ch * 1.5) splitHoriz = false;

            let r = 0.3 + rng() * 0.4; // 30% to 70%

            if (splitHoriz) {
                let bottomH = ch * r;
                let topH = ch * (1-r);
                parts.push({ shape:'box', size:[cw+t, t, d-t], pos:[cx, cy - ch/2 + bottomH, t/2], partType: 'inner_shelf' });
                splitSpace(cx, cy - ch/2 + bottomH/2, cw, bottomH - t, depth - 1);
                splitSpace(cx, cy + ch/2 - topH/2, cw, topH - t, depth - 1);
            } else {
                let leftW = cw * r;
                let rightW = cw * (1-r);
                parts.push({ shape:'box', size:[t, ch+t, d-t], pos:[cx - cw/2 + leftW, cy, t/2], partType: 'inner_divider' });
                splitSpace(cx - cw/2 + leftW/2, cy, leftW - t, ch, depth - 1);
                splitSpace(cx + cw/2 - rightW/2, cy, rightW - t, ch, depth - 1);
            }
        }

        splitSpace(0, h/2, w - t*2, h - t*2, cuts);
        return parts;
    }

    // Generates a uniform deterministic grid (lockers, vending)
    static generateGridStorage(w, h, d, cols, rows) {
        const parts = [];
        const t = 0.02;
        
        // Outer Shell
        parts.push({ shape:'box', size:[w, t, d], pos:[0, t/2, 0], partType: 'shell_base' }); 
        parts.push({ shape:'box', size:[w, t, d], pos:[0, h - t/2, 0], partType: 'shell_base' }); 
        parts.push({ shape:'box', size:[w-t*2, h-t*2, t], pos:[0, h/2, -d/2 + t/2], partType: 'shell_base' }); 
        
        parts.push({ shape:'box', size:[t, h-t*2, d], pos:[-w/2 + t/2, h/2, 0], partType: 'shell_side' }); 
        parts.push({ shape:'box', size:[t, h-t*2, d], pos:[w/2 - t/2, h/2, 0], partType: 'shell_side' }); 

        // Inner Grid
        const cw = (w - t*2) / cols;
        for(let c=1; c<cols; c++) {
            parts.push({ shape:'box', size:[t, h-t*2, d-t], pos:[-w/2 + t + c*cw, h/2, t/2], partType: 'inner_divider' });
        }
        
        const ch = (h - t*2) / rows;
        for(let r=1; r<rows; r++) {
            parts.push({ shape:'box', size:[w-t*2, t, d-t], pos:[0, t + r*ch, t/2], partType: 'inner_shelf' });
        }

        // Front Doors
        for(let c=0; c<cols; c++) {
            for(let r=0; r<rows; r++) {
                const doorW = cw - 0.005;
                const doorH = ch - 0.005;
                const cx = -w/2 + t + c*cw + cw/2;
                const cy = t + r*ch + ch/2;
                const cz = d/2 + t/2; 
                
                parts.push({
                    shape:'box', size:[doorW, doorH, t], pos:[cx, cy, cz],
                    partType: 'door_front',
                    isInteractable: true
                });
            }
        }
        return parts;
    }
}
