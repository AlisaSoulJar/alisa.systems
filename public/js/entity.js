/**
 * [ALISA Entity Pathfinding & DOM Rendering]
 * 1. Pathfinder delegado al browser usando EasyStar.js
 * 2. Renderizado de Entidades estilo SCUMM sobre DOM (Híbrido)
 */

// --- 1. A* PATHFINDING DELEGATOR ---
const ColonyPathfinder = {
    easystar: typeof EasyStar !== 'undefined' ? new EasyStar.js() : null,
    gridDimensions: { w: 1, h: 1 },
    gridMap: [],

    init: function() {
        if (!this.easystar) {
            console.warn("EasyStar NO CARGADO. El muñeco no esquivará paredes.");
            return;
        }
        this.easystar.setAcceptableTiles([0]);
        // Las diagonales son vitales en isométrica para verse natural
        this.easystar.enableDiagonals(); 
        this.easystar.enableCornerCutting();
    },

    updateGridFromTiles: function(tiles, dimensions, entities) {
        if (!this.easystar || !dimensions || !tiles) return;

        // Limpiar matriz a 1 (obstruido)
        const w = dimensions.w;
        const h = dimensions.h;
        this.gridMap = Array(h).fill(0).map(() => Array(w).fill(1));

        // Rellenar basado en Muros y Caminos
        for (let t of tiles) {
            if (t.x >= 0 && t.x < w && t.y >= 0 && t.y < h) {
                if (t.type === "WALL" || t.type === "WATER") {
                    this.gridMap[t.y][t.x] = 1; // Unwalkable
                } else {
                    this.gridMap[t.y][t.x] = 0; // Walkable
                }
            }
        }
        
        // Añadir Footprints de Edificios (Volúmenes 3D) como obstáculos
        if (entities) {
            for (let e of entities) {
                const isVolumetric = (e.type === "building" || e.type === "feature" || e.target_domain || 
                                     e.type === "flora" || e.type === "mineral" || e.type === "scrap");
                if (isVolumetric) {
                    const width = e.width || 1;
                    const height = e.height || 1;
                    for (let y = e.y; y < e.y + height; y++) {
                        for (let x = e.x; x < e.x + width; x++) {
                            if (x >= 0 && x < w && y >= 0 && y < h) {
                                this.gridMap[y][x] = 1; // Unwalkable (Building Base)
                            }
                        }
                    }
                }
            }
        }

        this.easystar.setGrid(this.gridMap);
        this.gridDimensions = dimensions;
    },

    requestPath: function(start, end, callback) {
        if (!this.easystar) {
            // Fallback (línea recta suicida) si no hay librería
            callback([{x: start.x, y: start.y}, {x: end.x, y: end.y}]);
            return;
        }

        // Clip coords to map
        const sx = Math.max(0, Math.min(Math.round(start.x), this.gridDimensions.w - 1));
        const sy = Math.max(0, Math.min(Math.round(start.y), this.gridDimensions.h - 1));
        const ex = Math.max(0, Math.min(Math.round(end.x), this.gridDimensions.w - 1));
        const ey = Math.max(0, Math.min(Math.round(end.y), this.gridDimensions.h - 1));

        this.easystar.findPath(sx, sy, ex, ey, function(path) {
            if (path === null) {
                // No path found
                callback([]);
            } else {
                // Convert {x,y} objects back to plain vectors for our lerp
                callback(path.map(p => ({ x: p.x, y: p.y })));
            }
        });

        // EasyStar requires manual compute ticks if not async, but the web version does setTimeout internally
        this.easystar.calculate();
    }
};

// Initialize Pathfinder statically
if (typeof EasyStar !== 'undefined') {
    ColonyPathfinder.init();
}

// --- 2. SCUMM DOM RENDERER ---
/**
 * Pinta la estructura CSS y HMTL del Sprite en un contenedor Div Absoluto
 */
function renderDOMEntity(div, entity) {
    let icon = "❓";
    let color = "white";
    let pulseCss = "";
    
    // Asignación rápida Minimalista (Emoji/Texto)
    if (entity.type === 'being') {
        icon = entity.id.startsWith("Q") ? "👑" : "🐝";
        color = "var(--neon-cyan)";
        pulseCss = `box-shadow: 0 0 10px ${color};`;
    } else if (entity.type === 'building') {
        icon = "🏭";
        color = "var(--neon-purple)";
        pulseCss = `border: 2px solid ${color};`;
    } else if (entity.type === 'feature' || entity.target_domain) {
        icon = "🌀"; // Portal / Gate
        color = "var(--neon-green)";
    } else if (entity.type === 'mineral' || entity.type === 'scrap') {
        icon = "🪨";
        color = "#888";
    } else if (entity.type === 'flora') {
        icon = "🌲";
        color = "#2d5a27";
    } else if (entity.type === 'fauna') {
        icon = "🐁";
        color = "#cda472";
    }

    // Graphic Assembly
    let graphicContent = `<div style="font-size: ${entity.type === 'building' ? '40px' : '30px'}; line-height: 1;">${icon}</div>`;
    
    if (typeof SpriteFactory !== 'undefined') {
        let sheetId = SpriteFactory.resolveSheet(entity);
        if (sheetId && SpriteFactory.sheets[sheetId]) {
            // Utilizamos el Sheet cargado como dataURL (sprites pre-cacheados on fly)
            let dataUrl = SpriteFactory.sheets[sheetId].toDataURL();

            // Animación via Keyframes CSS con steps(4) mapeando el frameW a background-position
            let animClass = "";
            if (entity.type === 'being' || entity.type === 'fauna') {
                animClass = (entity.action === 'idle' || !entity.action) ? 'scumm-anim-idle' : 'scumm-anim-walk';
            }
            
            graphicContent = `
                <div class="scumm-sprite ${animClass}" style="
                    width: ${SpriteFactory.frameW}px; 
                    height: ${SpriteFactory.frameH}px; 
                    background-image: url(${dataUrl});
                    background-position: 0px 0px; 
                    background-repeat: no-repeat;
                    ${pulseCss ? 'filter: drop-shadow(0 0 5px ' + color + ');' : ''}
                "></div>
            `;
        }
    }

    // HTML Structure
    const breatheDelay = (Math.random() * 2.0).toFixed(2); // 0-2s random offset
    const cpuPercent = Math.min(100, Math.max(0, (entity.cpu_glow || 0) * 100));
    const showBar = (entity.type === 'being');
    
    const htmlContent = `
        <div class="entity-scumm-wrapper" style="
            display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
            cursor: pointer; pointer-events: auto;
            text-shadow: 2px 2px 0px #000, -1px -1px 0px #000;
            --breathe-delay: ${breatheDelay}s;
        ">
            <!-- Label Accion -->
            ${entity.action && entity.action !== 'idle' ? `<div style="color:var(--neon-yellow); font-size:10px; font-family:'Share Tech Mono'; margin-bottom: 2px; text-transform:uppercase;">${entity.action}</div>` : ''}
            
            ${graphicContent}
            
            <!-- ID Label -->
            <div style="color:${color}; font-size:12px; font-family:'Orbitron'; font-weight:bold; background:rgba(0,0,0,0.5); padding:2px 4px; border-radius: 4px; margin-top:2px;">
                ${entity.id.substring(0,8)}
            </div>
            
            <!-- CPU/Activity Status Bar -->
            ${showBar ? `
            <div class="entity-status-bar-bg">
                <div class="entity-status-bar-fill" style="width: ${cpuPercent}%;"></div>
            </div>
            ` : ''}
        </div>
    `;

    div.innerHTML = htmlContent;
}

// Export functions to global scope (vanilla browser context)
window.ColonyPathfinder = ColonyPathfinder;
window.renderDOMEntity = renderDOMEntity;
