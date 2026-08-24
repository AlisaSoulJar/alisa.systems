// CroupierEngine.js - Mathematical Card/Token Layout Generator

export class CroupierSystem {
    /**
     * @param {Object} config Configurations
     * @param {number} config.deckX Origin X where cards spawn
     * @param {number} config.deckY Origin Y where cards spawn
     * @param {number} config.deckZ Origin Z where cards spawn
     * @param {number} config.spreadSpacing
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get reproducible 'messy' piles.
     */
    constructor(config = {}) {
        this.deckX = config.deckX || 0;
        this.deckY = config.deckY || 0;
        this.deckZ = config.deckZ || 0;
        this.spreadSpacing = config.spreadSpacing || 0.05;
        // Semilla inyectable. Sin ella el layout 'messy' desordena las cartas de
        // forma distinta cada vez, y una mesa no se puede volver a repartir
        // igual. Ver `prueba_semillas.mjs`.
        this.rng = config.rng || (() => Math.random());
    }

    /**
     * Calculates deterministic transform sequences for player hands.
     * @param {number} numPlayers 
     * @param {number} cardsPerPlayer 
     * @param {string} layout 'fan', 'pile', 'messy', 'line', 'grid'
     * @param {boolean} isHidden Whether cards are dealt face-down
     * @returns {Array} Array of player hands, each containing an array of Card Transform objects
     */
    calculatePlayerHands(numPlayers, cardsPerPlayer, layout = 'fan', isHidden = true) {
        const hands = [];
        const finalLayout = layout === 'messy' ? 'pile' : layout;
        const jitterForce = layout === 'messy' ? 3.0 : 0;
        
        for (let p = 0; p < numPlayers; p++) {
            const playerTransforms = [];
            
            // Polar Coordinates
            const angle = (p / numPlayers) * Math.PI * 2 + (Math.PI / 2);
            
            // Radius adjustment
            const r = finalLayout === 'line' ? 0.3 : 0.4;
            const px = this.deckX + Math.cos(angle) * r;
            const pz = this.deckZ + Math.sin(angle) * r;
            
            // Default Rotation
            let rotX = isHidden ? Math.PI : 0; // Face up or face down
            let rotZ = finalLayout !== 'pile' ? (-angle - Math.PI/2) : 0;

            for (let c = 0; c < cardsPerPlayer; c++) {
                // Layout Specific Offsets
                let ox = 0, oy = 0, oz = 0;
                let cRotZ = rotZ;

                if (finalLayout === 'line') {
                    // Spread along local X
                    const localShift = (c - (cardsPerPlayer-1)/2) * this.spreadSpacing;
                    ox = Math.cos(angle - Math.PI/2) * localShift;
                    oz = Math.sin(angle - Math.PI/2) * localShift;
                }
                else if (finalLayout === 'fan') {
                    // Small angle offset + small spread
                    const fanSpread = 0.2;
                    const angleShift = (c - (cardsPerPlayer-1)/2) * fanSpread;
                    cRotZ += angleShift;
                    
                    const localShiftX = Math.sin(angleShift) * 0.05;
                    const localShiftZ = Math.cos(angleShift) * 0.05 - 0.05;
                    
                    ox = Math.cos(angle - Math.PI/2) * localShiftX + Math.cos(angle) * localShiftZ;
                    oz = Math.sin(angle - Math.PI/2) * localShiftX + Math.sin(angle) * localShiftZ;
                }
                else if (finalLayout === 'pile') {
                    // Slight vertical offset
                    oy = c * 0.001; 
                    if (jitterForce > 0) {
                        ox = (this.rng() - 0.5) * 0.02 * jitterForce;
                        oz = (this.rng() - 0.5) * 0.02 * jitterForce;
                        cRotZ += (this.rng() - 0.5) * 0.2 * jitterForce;
                    }
                }
                else if (finalLayout === 'grid') {
                    const row = Math.floor(c / 5);
                    const col = c % 5;
                    ox = Math.cos(angle - Math.PI/2) * (col * this.spreadSpacing);
                    oz = Math.sin(angle - Math.PI/2) * (col * this.spreadSpacing) + Math.cos(angle) * (row * this.spreadSpacing * 1.5);
                }

                playerTransforms.push({
                    targetX: px + ox,
                    targetY: this.deckY + oy,
                    targetZ: pz + oz,
                    rotationX: rotX,
                    rotationY: 0,
                    rotationZ: cRotZ
                });
            }
            hands.push(playerTransforms);
        }
        return hands;
    }

    /**
     * Calculates a linear layout across the center of the table (Community Cards)
     */
    calculateCommunity(numCards, isHidden = false, shiftOffset = 0) {
        const transforms = [];
        const rotX = isHidden ? Math.PI : 0;
        
        let shiftX = (numCards * 0.08) / 2;
        const originX = this.deckX - shiftX + shiftOffset;
        const originZ = this.deckZ - 0.15; // slightly pushed up

        for (let i = 0; i < numCards; i++) {
            transforms.push({
                targetX: originX + (i * 0.08),
                targetY: this.deckY + (i * 0.001),
                targetZ: originZ,
                rotationX: rotX,
                rotationY: 0,
                rotationZ: 0
            });
        }
        return transforms;
    }
}
