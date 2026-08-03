// ==========================================
// SOVEREIGN ARCADE MATS (TAPESTRY BOARDS)
// Mathematical configurations for stochastic game layouts
// Maps abstract zone names to relative 3D physical constraints
// ==========================================

const ArcadeMats = {
    "poker": {
        // Center geometry coordinates. (Mat Center is usually X: 2.5 in Empty Lab, but engine translates globally via matCenterX)
        zones: {
            "deck":      { relX: 0.6,  relZ: -0.15, layout: "pile", faceDown: true },
            "community": { relX: -0.1, relZ: -0.15, layout: "line", faceDown: false, spacing: 0.08 },
            "player_0":  { relX: 0,    relZ: 0.4,   layout: "fan",  faceDown: false, spacing: 0.05 },                      // Hero (Bottom)
            "player_1":  { relX: -0.6, relZ: 0,     layout: "fan",  faceDown: false, spacing: 0.05, rotationZBase: -90 }, // Opponent L
            "player_2":  { relX: 0,    relZ: -0.5,  layout: "fan",  faceDown: false, spacing: 0.05, rotationZBase: 180 }, // Opponent T
            "player_3":  { relX: 0.6,  relZ: 0,     layout: "fan",  faceDown: false, spacing: 0.05, rotationZBase: 90  }  // Opponent R
        }
    },
    "blackjack": {
        zones: {
            "deck":      { relX: 0.6,  relZ: -0.35, layout: "pile", faceDown: true },
            "dealer":    { relX: 0,    relZ: -0.35, layout: "line", faceDown: false, spacing: 0.065 }, // Dealer Top Center
            "player_0":  { relX: 0,    relZ: 0.35,  layout: "line", faceDown: false, spacing: 0.065 }, // Hero Bottom Center
            // Future split hands
            "player_0_s1": { relX: -0.2, relZ: 0.35, layout: "cascade", cascadeZ: 0.03, spacing:0, cascadeX:0, faceDown: false }, 
            "player_0_s2": { relX: 0.2,  relZ: 0.35, layout: "cascade", cascadeZ: 0.03, spacing:0, cascadeX:0, faceDown: false }
        }
    },
    "default_sandbox": {
        zones: {
            "deck": { relX: 0.6, relZ: -0.2, layout: "pile", faceDown: true }
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ArcadeMats };
}
