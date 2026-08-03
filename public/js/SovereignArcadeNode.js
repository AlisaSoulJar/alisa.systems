window.initLegacyRoom = function() {
            window.loadGame = function(gameId) {
                const hudBlock = document.getElementById('game-hud-block');
                
                if (window.tableFactory.currentGameSet) scene.remove(window.tableFactory.currentGameSet);
                hudBlock.style.display = 'none';

                if (gameId === 'none') return;
                
                let gameSet = new THREE.Group();
                let bGroup = new THREE.Group();
                let pGroup = new THREE.Group();
                gameSet.add(bGroup);
                gameSet.add(pGroup);

                if (gameId === 'chess') {
                    boardGroup = bGroup; piecesGroup = pGroup;
                    buildBoard(); forgePieces();
                    const customFEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'; 
                    window.spawnChessPieces(customFEN);
                    gameSet.scale.set(0.05, 0.05, 0.05);
                    document.getElementById('hud-moves').innerText = 'CUSTOM INSTANCE: ' + customFEN;
                } 
                else if (gameId === 'checkers') { buildCheckersBoard(bGroup, pGroup); gameSet.scale.set(0.05, 0.05, 0.05); document.getElementById('hud-moves').innerText = 'B-14-18, W-23-19...'; }
                else if (gameId === 'reversi') { buildReversiBoard(bGroup, pGroup); gameSet.scale.set(0.05, 0.05, 0.05); document.getElementById('hud-moves').innerText = 'WHITE: 2 | BLACK: 2'; }
                else if (gameId === 'mancala') { buildMancalaBoard(bGroup, pGroup); gameSet.scale.set(0.04, 0.04, 0.04); document.getElementById('hud-moves').innerText = 'WAITING FOR SOWING...'; }
                else if (gameId === 'go') { buildGoBoard(bGroup, pGroup); gameSet.scale.set(0.04, 0.04, 0.04); document.getElementById('hud-moves').innerText = 'W: 1 | B: 1 | P: 0'; }
                else if (gameId === 'xiangqi') { buildXiangqiBoard(bGroup, pGroup); gameSet.scale.set(0.04, 0.04, 0.04); document.getElementById('hud-moves').innerText = 'RED: START | BLACK: START'; }

                gameSet.position.set(-2.5, 0.75, 0);
                window.tableFactory.setGameSet(gameSet);

                hudBlock.style.display = 'flex';
                document.getElementById('hud-turn').innerText = 'WHITE';
                document.getElementById('hud-state').innerText = 'ACTIVE';
            };

            window.loadGame(document.getElementById('gameSelect').value);
        } // End initLegacyRoom()


        // ═══════════════════════════════════════════════════
        //  CASINO CARD ENGINE INTEGRATION (DEMO)
        // ═══════════════════════════════════════════════════
        let cardEngine = null;
        function initCardEngine() {
            if (cardEngine) return;
            cardEngine = new SovereignCardEngine({ gameId: 'demo' });
            cardEngine.scene = scene; // Map Engine to Room Scene
            cardEngine.renderer = renderer;
            cardEngine.camera = camera; // FIX: Raycaster needs the camera
            cardEngine.tableY = 0.76; // Elevate cards perfectly over the table mat
            
            // Re-scale Card Geometry to match absolute physical proportions mapped in meters
            cardEngine.cardGeo = new THREE.BoxGeometry(0.088, 0.123, 0.001); // 1.4x scale for readability 
            cardEngine.cardMatFront = new THREE.MeshLambertMaterial({color: 0xE8ECEF});
            cardEngine.cardMatBack = new THREE.MeshLambertMaterial({color: 0x882222});

            // FIX: Bind pointer events manually (init3D is skipped in room context)
            renderer.domElement.addEventListener('pointerdown', cardEngine.onPointerDown);
            renderer.domElement.addEventListener('pointermove', cardEngine.onPointerMove);
            window.addEventListener('pointerup', cardEngine.onPointerUp);
        }

        const FULL_DECK = [];
        ['S','H','D','C'].forEach(suit => {
            ['2','3','4','5','6','7','8','9','10','J','Q','K','A'].forEach(r => FULL_DECK.push(suit + '_' + r));
        });
        let sandboxDeck = [...FULL_DECK];

        // ═══════════════════════════════════════════════════
        //  CARD GAME LOADER (Schema-Driven)
        // ═══════════════════════════════════════════════════
        let cardLibrary = null;
        let activeGameSchema = null;

        // Load library once
        fetch('../../arcade/data/card_library.json')
            .then(r => r.json())
            .then(lib => {
                cardLibrary = lib;
                console.log(`[ALISA] Card Library loaded: ${Object.keys(lib.games).length} games, ${Object.keys(lib.decks).length} decks`);
            })
            .catch(e => console.warn('[ALISA] Card library not found, sandbox-only mode.'));

        window.loadCardGame = function(gameId) {
            // Clear table
            if (typeof demoCollectCards === 'function') demoCollectCards();
            
            const info = document.getElementById('card-game-info');
            
            if (gameId === 'sandbox' || !cardLibrary) {
                activeGameSchema = null;
                if (info) info.textContent = 'Free play — use sandbox controls below';
                return;
            }
            
            const game = cardLibrary.games[gameId];
            if (!game) {
                if (info) info.textContent = 'Schema not found: ' + gameId;
                return;
            }
            
            activeGameSchema = game;
            const deck = cardLibrary.decks[game.deck];
            
            // Auto-configure sandbox controls from schema
            const pMin = game.players.min;
            const pMax = game.players.max;
            const handZone = game.zones?.hand;
            const cardsPerPlayer = handZone?.max_cards || handZone?.cards_per_player || 5;
            const hidden = handZone?.hidden !== false;
            
            // Set UI controls
            document.getElementById('crup_players').value = Math.min(pMax, 4);
            document.getElementById('crup_cards').value = cardsPerPlayer;
            document.getElementById('crup_p_hidden').value = hidden ? '1' : '0';
            document.getElementById('crup_p_layout').value = handZone?.layout || 'fan';
            
            // Build correct deck from schema
            sandboxDeck = [];
            if (deck) {
                (deck.suits || []).forEach(s => {
                    (deck.ranks || []).forEach(r => {
                        sandboxDeck.push(s.id + '_' + r);
                    });
                });
            }
            if (sandboxDeck.length === 0) sandboxDeck = [...FULL_DECK];
            sandboxDeck.sort(() => Math.random() - 0.5);
            
            // Show info
            const deckName = deck?.name || game.deck;
            if (info) info.innerHTML = `<span style="color:#FF9800">${game.name}</span> · ${deckName} (${sandboxDeck.length}) · ${pMin}-${pMax}p · ${game.category}`;
            
            // Auto-deal opening hand
            if (!cardEngine) initCardEngine();
            
            // Set card back style based on deck type
            const deckBackMap = {
                'spanish_40': 'spanish_gold', 'spanish_48': 'spanish_gold',
                'uno_108': 'uno_black',
                'tarot_78': 'tarot_purple',
            };
            cardEngine.activeDeckBack = deckBackMap[game.deck] || 'classic_red';
            cardEngine.cachedMaterials = {}; // Clear cache for new back style
            
            // Load court card images (hybrid: uses images when available)
            cardEngine.preloadCourtImages('/arcade/assets/cards/courts');
            
            spawnDeckPile();
            setTimeout(() => croupierDealPlayers(), 300);
            
            // If game has a board/community phase, deal those too
            const boardPhase = (game.phases || []).find(p => p.to === 'board');
            if (boardPhase) {
                setTimeout(() => {
                    // Override community count from schema
                    croupierDealCommunity(boardPhase.count || 3, boardPhase.hidden !== false);
                }, 900);
            }
        };

        // ═══════════════════════════════════════════════════
        //  DECK SHOWCASE — Display entire deck face-up
        // ═══════════════════════════════════════════════════
        window.showcaseDeck = function() {
            if (!cardLibrary) { alert('Card library not loaded yet'); return; }
            const deckId = document.getElementById('deckSelect').value;
            const deck = cardLibrary.decks[deckId];
            if (!deck) return;
            
            // Clear table
            if (typeof demoCollectCards === 'function') demoCollectCards();
            if (!cardEngine) initCardEngine();
            
            // Set back style
            const backMap = {
                'spanish_40': 'spanish_gold', 'spanish_48': 'spanish_gold',
                'uno_108': 'uno_black', 'tarot_78': 'tarot_purple',
            };
            cardEngine.activeDeckBack = backMap[deckId] || 'classic_red';
            cardEngine.cachedMaterials = {};
            
            // Build full deck card IDs
            const cards = [];
            (deck.suits || []).forEach(s => {
                (deck.ranks || []).forEach(r => {
                    cards.push(s.id + '_' + r);
                });
            });
            // Add jokers
            for (let i = 0; i < (deck.jokers || 0); i++) {
                cards.push('JK' + (i+1));
            }
            // Add major arcana for tarot
            (deck.major_arcana || []).forEach(a => {
                cards.push('MAJOR_' + a);
            });
            
            if (cards.length === 0) return;
            
            // Calculate grid dimensions
            const cols = Math.ceil(Math.sqrt(cards.length * 1.5)); // wider than tall
            const rows = Math.ceil(cards.length / cols);
            const spacing = 0.045;
            const totalW = cols * spacing;
            const totalH = rows * spacing * 1.5;
            const startX = 2.5 - totalW / 2;
            const startZ = 0 - totalH / 2;
            
            // Deal all cards face-up in grid
            cards.forEach((cardId, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = startX + col * spacing;
                const z = startZ + row * spacing * 1.5;
                const y = 0.77 + (i * 0.0003); // Tiny Y offset to avoid z-fighting
                
                const zoneId = 'showcase_' + i;
                setTimeout(() => {
                    cardEngine.drawZone([cardId], zoneId, x, z, {
                        layout: 'line',
                        hidden: false,
                        originX: 2.5, originZ: 0, originY: 0.76,
                        sequenceDelay: 0
                    });
                }, i * 15); // Stagger animation — each card 15ms apart
            });
            
            // Update info
            const info = document.getElementById('card-game-info');
            if (info) info.innerHTML = `<span style="color:#4CAF50">SHOWCASE</span> · ${deck.name} · ${cards.length} cards · ${(deck.suits||[]).length} suits`;
        };

        // ═══════════════════════════════════════════════════
        //  CROUPIER MATHEMATICS & KINEMATICS
        // ═══════════════════════════════════════════════════

        // Global physical coordinates of the Casino Deck in the real world
        const DECK_X = 2.5 + 0.35; // Center + Offset to the right
        const DECK_Z = 0;
        const DECK_Y = 0.77;

        // Spawn visible deck pile on the table
        function spawnDeckPile() {
            if (!cardEngine) initCardEngine();
            // Stack of 5 "back" cards to look like a pile
            for (let i = 0; i < 5; i++) {
                const materials = cardEngine.getProceduralMaterial('back_deck');
                const mesh = new THREE.Mesh(cardEngine.cardGeo, materials);
                mesh.position.set(DECK_X, DECK_Y + i * 0.001, DECK_Z);
                mesh.rotation.set(Math.PI / 2, 0, 0); // face down
                mesh.userData.visualId = 'back_deck';
                mesh.userData.restY = DECK_Y + i * 0.001;
                scene.add(mesh);
                cardEngine.cardMeshes['deck_pile_' + i] = mesh;
            }
        }
        // Auto-spawn the deck pile
        setTimeout(spawnDeckPile, 200);

        window.croupierDealPlayers = function() {
            if (!cardEngine) initCardEngine();
            cardEngine.setMat({zones:{}}, 2.5, 0); 
            
            const players = parseInt(document.getElementById('crup_players').value) || 4;
            const cards = parseInt(document.getElementById('crup_cards').value) || 2;
            const isHidden = document.getElementById('crup_p_hidden').value === "1";
            const layoutType = document.getElementById('crup_p_layout').value;
            
            sandboxDeck = [...FULL_DECK];
            sandboxDeck.sort(() => Math.random() - 0.5);
            demoCollectCards();
            
            const delayMs = 120; 
            const jitterForce = layoutType === 'messy' ? 3.0 : false;
            const finalLayout = layoutType === 'messy' ? 'pile' : layoutType;
            
            if (!window.croupierEngine) return;
            const dealTransforms = window.croupierEngine.calculatePlayerHands(players, cards, finalLayout, isHidden);
            
            for(let p=0; p < players; p++) {
                let handIds = [];
                for(let c=0; c < cards; c++) handIds.push(sandboxDeck.pop());
                
                const rootT = dealTransforms[p][0];
                const rootPx = rootT.targetX;
                const rootPz = rootT.targetZ;
                let rotAngle = rootT.rotationZ;
                if (finalLayout === 'line' || finalLayout === 'grid') rotAngle -= Math.PI/2;
                
                cardEngine.drawZone(handIds, 'crup_p'+p+'_'+Date.now(), rootPx, rootPz, {
                    layout: finalLayout,
                    faceDown: isHidden,
                    rotation: (rotAngle * 180) / Math.PI, 
                    originX: DECK_X, originZ: DECK_Z, originY: DECK_Y, 
                    sequenceDelay: delayMs,
                    jitter: jitterForce,
                    spacing: 0.05
                });
            }
        };

        window.croupierDealCommunity = function() {
            if (!cardEngine) initCardEngine();
            cardEngine.setMat({zones:{}}, 2.5, 0); 
            
            const num = parseInt(document.getElementById('crup_comm').value) || 3;
            const isHidden = document.getElementById('crup_hidden').value === "1";
            
            if (sandboxDeck.length < num) return; 
            
            let hand = [];
            for(let i=0; i<num; i++) hand.push(sandboxDeck.pop());
            
            if (!window.croupierEngine) return;
            const comTransforms = window.croupierEngine.calculateCommunity(num, isHidden);
            const anchorPx = comTransforms[0].targetX;
            const anchorPz = comTransforms[0].targetZ;
            
            cardEngine.drawZone(hand, 'crup_comm_'+Date.now(), anchorPx, anchorPz, {
                layout: 'line',
                spacing: 0.08,
                faceDown: isHidden,
                originX: DECK_X, originZ: DECK_Z, originY: DECK_Y,
                sequenceDelay: 150
            });
        };

        window.croupierRevealPlayers = function() {
            if (!cardEngine) return;
            
            let delayIndex = 0;
            Object.keys(cardEngine.cardMeshes).forEach(trackId => {
                if (trackId.startsWith('crup_p')) {
                    const mesh = cardEngine.cardMeshes[trackId];
                    if (mesh.rotation.x > 0) { // Math.PI/2 is faceDown
                        const localDelay = delayIndex * 150; // Sequential reveal
                        
                        // Hop Tween
                        new TWEEN.Tween(mesh.position).to({ y: mesh.position.y + 0.15 }, 200).delay(localDelay).easing(TWEEN.Easing.Quadratic.Out).onComplete(() => {
                            // Drop Tween
                            new TWEEN.Tween(mesh.position).to({ y: mesh.position.y - 0.15 }, 300).easing(TWEEN.Easing.Quadratic.In).start();
                        }).start();
                        
                        // Flip Tween
                        new TWEEN.Tween(mesh.rotation).to({ x: -Math.PI/2 }, 500).delay(localDelay).easing(TWEEN.Easing.Cubic.InOut).start();
                        
                        delayIndex++;
                    }
                }
            });
        };

        window.croupierRevealNext = function() {
            if (!cardEngine) return;
            
            const nToReveal = parseInt(document.getElementById('crup_reveal_n').value) || 1;
            let revealedCount = 0;
            let delayIndex = 0;
            
            Object.keys(cardEngine.cardMeshes).forEach(trackId => {
                if (revealedCount < nToReveal && trackId.startsWith('crup_comm_')) {
                    const mesh = cardEngine.cardMeshes[trackId];
                    if (mesh.rotation.x > 0) { // Math.PI/2 is faceDown
                        const localDelay = delayIndex * 150;
                        
                        new TWEEN.Tween(mesh.position).to({ y: mesh.position.y + 0.15 }, 200).delay(localDelay).easing(TWEEN.Easing.Quadratic.Out).onComplete(() => {
                            new TWEEN.Tween(mesh.position).to({ y: mesh.position.y - 0.15 }, 300).easing(TWEEN.Easing.Quadratic.In).start();
                        }).start();
                        new TWEEN.Tween(mesh.rotation).to({ x: -Math.PI/2 }, 500).delay(localDelay).easing(TWEEN.Easing.Cubic.InOut).start();
                        
                        revealedCount++;
                        delayIndex++;
                    }
                }
            });
        };

        // ═══════════════════════════════════════════════════
        //  UNIVERSAL VERBS (Taxonomía Completa)
        // ═══════════════════════════════════════════════════

        // DISCARD PILE physical coordinates (left of center table)
        const DISCARD_X = 2.5 - 0.45;
        const DISCARD_Z = 0;

        // VERB 1: DRAW — Top card from deck flies to Player 0's hand
        window.croupierDraw = function() {
            if (!cardEngine) initCardEngine();
            if (sandboxDeck.length < 1) { sandboxDeck = [...FULL_DECK]; sandboxDeck.sort(() => Math.random() - 0.5); }
            
            const card = sandboxDeck.pop();
            // Find Player 0 position (bottom of table)
            const angle = Math.PI / 2;
            const px = 2.5 + Math.cos(angle) * 0.4;
            const pz = 0 + Math.sin(angle) * 0.4;
            
            cardEngine.drawZone([card], 'draw_' + Date.now(), px, pz, {
                layout: 'line',
                faceDown: false,
                originX: DECK_X, originZ: DECK_Z, originY: DECK_Y,
                sequenceDelay: 0,
                spacing: 0.08
            });
        };

        // VERB 2: DISCARD — First player card flies to discard pile
        window.croupierDiscard = function() {
            if (!cardEngine) return;
            // Find first player card mesh
            const playerKey = Object.keys(cardEngine.cardMeshes).find(k => k.startsWith('crup_p') || k.startsWith('draw_'));
            if (!playerKey) return;
            
            const mesh = cardEngine.cardMeshes[playerKey];
            const jitterX = (Math.random() - 0.5) * 0.06;
            const jitterZ = (Math.random() - 0.5) * 0.06;
            const jitterR = (Math.random() - 0.5) * 0.15;
            
            // Arc trajectory: lift → fly → drop with jitter
            new TWEEN.Tween(mesh.position)
                .to({ y: 3 }, 200).easing(TWEEN.Easing.Quadratic.Out)
                .onComplete(() => {
                    new TWEEN.Tween(mesh.position)
                        .to({ x: DISCARD_X + jitterX, z: DISCARD_Z + jitterZ, y: 0.78 }, 400)
                        .easing(TWEEN.Easing.Quadratic.In).start();
                    new TWEEN.Tween(mesh.rotation)
                        .to({ x: -Math.PI/2, z: mesh.rotation.z + jitterR }, 400).start();
                }).start();
        };

        // VERB 3: TAP — Rotate first untapped card 90° on Z axis (Grimorio style)
        window.croupierTap = function() {
            if (!cardEngine) return;
            for (const [tid, mesh] of Object.entries(cardEngine.cardMeshes)) {
                // Find a card that isn't already tapped (rotZ near 0 or its base)
                if (!mesh.userData.tapped) {
                    mesh.userData.tapped = true;
                    new TWEEN.Tween(mesh.rotation)
                        .to({ z: mesh.rotation.z + Math.PI/2 }, 300)
                        .easing(TWEEN.Easing.Back.Out).start();
                    // Slight lift for visual feedback
                    new TWEEN.Tween(mesh.position)
                        .to({ y: mesh.position.y + 0.1 }, 150)
                        .easing(TWEEN.Easing.Quadratic.Out)
                        .onComplete(() => {
                            new TWEEN.Tween(mesh.position)
                                .to({ y: mesh.position.y - 0.1 }, 150)
                                .easing(TWEEN.Easing.Quadratic.In).start();
                        }).start();
                    return;
                }
            }
            // If all tapped, untap all
            for (const [tid, mesh] of Object.entries(cardEngine.cardMeshes)) {
                if (mesh.userData.tapped) {
                    mesh.userData.tapped = false;
                    new TWEEN.Tween(mesh.rotation)
                        .to({ z: mesh.rotation.z - Math.PI/2 }, 300)
                        .easing(TWEEN.Easing.Back.Out).start();
                }
            }
        };

        // VERB 4: PASS — First card from Player 0 zone flies to Player 1 zone
        window.croupierPass = function() {
            if (!cardEngine) return;
            
            // Find first P0 card
            const p0Key = Object.keys(cardEngine.cardMeshes).find(k => k.includes('crup_p0'));
            if (!p0Key) return;
            const mesh = cardEngine.cardMeshes[p0Key];
            
            // Player 1 coordinates (next around the circle)
            const players = parseInt(document.getElementById('crup_players').value) || 4;
            const angle1 = (1 / players) * Math.PI * 2 + (Math.PI / 2);
            const destX = 2.5 + Math.cos(angle1) * 0.4;
            const destZ = 0 + Math.sin(angle1) * 0.4;
            
            // Low arc pass across the table
            new TWEEN.Tween(mesh.position)
                .to({ y: 2.5 }, 200).easing(TWEEN.Easing.Quadratic.Out)
                .onComplete(() => {
                    new TWEEN.Tween(mesh.position)
                        .to({ x: destX, z: destZ, y: 0.78 }, 500)
                        .easing(TWEEN.Easing.Quadratic.InOut).start();
                }).start();
        };

        // VERB 5: TUCK — All community cards fly together to Player 0's corner
        window.croupierTuck = function() {
            if (!cardEngine) return;
            
            // Player 0 treasure corner (slightly offset from hand)
            const tuckX = 2.5 + 0.55;
            const tuckZ = 0 + 0.55;
            let delayIdx = 0;
            
            Object.keys(cardEngine.cardMeshes).forEach(trackId => {
                if (trackId.startsWith('crup_comm_')) {
                    const mesh = cardEngine.cardMeshes[trackId];
                    const d = delayIdx * 80;
                    
                    // Converge: lift slightly then slide to pile
                    new TWEEN.Tween(mesh.position)
                        .to({ y: 1.5 }, 150).delay(d)
                        .easing(TWEEN.Easing.Quadratic.Out)
                        .onComplete(() => {
                            new TWEEN.Tween(mesh.position)
                                .to({ x: tuckX + (Math.random()-0.5)*0.02, z: tuckZ + (Math.random()-0.5)*0.02, y: 0.78 + delayIdx * 0.003 }, 350)
                                .easing(TWEEN.Easing.Quadratic.In).start();
                        }).start();
                    
                    // Flip face up if hidden
                    if (mesh.rotation.x > 0) {
                        new TWEEN.Tween(mesh.rotation).to({ x: -Math.PI/2 }, 400).delay(d).start();
                    }
                    delayIdx++;
                }
            });
        };

        window.demoMacroLayout = function() {
            if (!cardEngine) initCardEngine();
            cardEngine.setMat({zones:{}}, 2.5, 0);
            
            const m = document.getElementById('sb_macro').value;
            let hand = [];
            // Give 15 cards for macros to look good
            sandboxDeck = [...FULL_DECK]; sandboxDeck.sort(() => Math.random() - 0.5);
            for(let i=0; i<15; i++) hand.push(sandboxDeck.pop());
            
            demoCollectCards();
            
            cardEngine.drawZone(hand, 'macro_'+Date.now(), 2.5, 0, {
                layout: m,
                originX: DECK_X, originZ: DECK_Z, originY: DECK_Y,
                sequenceDelay: 100,
                spacing: (m === 'cascade' || m === 'grid') ? 0.05 : 0.02
            });
        };

        window.demoCollectCards = function() {
            if (!cardEngine) return;
            // Clear tracking & Remove meshes
            Object.keys(cardEngine.cardMeshes).forEach(k => {
                scene.remove(cardEngine.cardMeshes[k]);
                delete cardEngine.cardMeshes[k];
            });
            // Clear texture cache so new deck types render fresh
            cardEngine.cachedMaterials = {};
        };

        // CAPSULE SCREEN KINEMATICS (Resurrection Lab Style)
        // CLICK on a card = fullscreen inspect. DRAG = move card.
        window.addEventListener('cardInspect', (e) => {
            const vid = e.detail.cardId;
            const cv = document.getElementById('capsule-view');
            const destCtx = document.getElementById('capsule-canvas').getContext('2d');
            const label = document.getElementById('capsule-label');
            
            const srcCanvas = cardEngine.getCardCanvas(vid);
            destCtx.clearRect(0, 0, 256, 384);
            destCtx.drawImage(srcCanvas, 0, 0);
            
            // Parse card identity for the label
            const parsed = cardEngine.parseCardId(vid);
            if (parsed.suit) {
                label.innerHTML = `<span style="color:${parsed.color}">${parsed.suit}</span> ${parsed.rank} <span style="color:${parsed.color}">${parsed.suit}</span>`;
            } else {
                label.textContent = vid;
            }
            
            // Fade in
            cv.style.opacity = '0';
            cv.style.display = 'block';
            cv.style.pointerEvents = 'auto'; // Allow clicking to dismiss
            requestAnimationFrame(() => {
                cv.style.transition = 'opacity 0.2s ease-out';
                cv.style.opacity = '1';
            });
        });

        // Click anywhere on the overlay to dismiss
        document.getElementById('capsule-view').addEventListener('click', () => {
            const cv = document.getElementById('capsule-view');
            cv.style.transition = 'opacity 0.15s ease-in';
            cv.style.opacity = '0';
            cv.style.pointerEvents = 'none';
            setTimeout(() => cv.style.display = 'none', 150);
        });

        // Also dismiss on drop (in case drag started from inspect)
        window.addEventListener('cardDropped', () => {
            const cv = document.getElementById('capsule-view');
            if (cv.style.display !== 'none') {
                cv.style.transition = 'opacity 0.1s ease-in';
                cv.style.opacity = '0';
                cv.style.pointerEvents = 'none';
                setTimeout(() => cv.style.display = 'none', 100);
            }
        });

        // ═══════════════════════════════════════════════════
        //  RL TELEMETRY INJECTION (LIVE CASINO HUD)
        // ═══════════════════════════════════════════════════
        let currentRLSocket = null;
        
        window.connectRLStream = function(gameId) {
            disconnectRLStream(); // Clean state
            
            if (!cardEngine) initCardEngine();
            // Clear current table
            if (typeof demoCollectCards === 'function') demoCollectCards();
            
            const infoDiv = document.getElementById('card-game-info');
            if(infoDiv) infoDiv.innerHTML = `<span style="color:#00ffaa" class="pulsing">CONNECTING TO ML DOJO...</span>`;
            
            // Auto-configure the table aesthetic depending on the agent
            if (gameId === 'poker') {
                cardEngine.activeDeckBack = 'classic_red';
                cardEngine.cachedMaterials = {};
            } else if (gameId === 'blackjack') {
                cardEngine.activeDeckBack = 'classic_blue';
                cardEngine.cachedMaterials = {};
            } else if (gameId === 'usura') {
                cardEngine.activeDeckBack = 'tarot_purple';
                cardEngine.cachedMaterials = {};
            }
            
            // Connect to real RL Python Hub
            const wsUrl = `ws://${window.location.hostname}:8741/ws/arcade/${gameId}`;
            currentRLSocket = new WebSocket(wsUrl);
            
            currentRLSocket.onopen = () => {
                if(infoDiv) infoDiv.innerHTML = `<span style="color:#00ffaa; font-weight:bold;">LIVE AGENT STREAM ENABLED: ${gameId.toUpperCase()}</span>`;
            };
            
            currentRLSocket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    // Standardize telemetry routing to the SovereignCardEngine
                    if (gameId === 'poker') {
                        const comm = payload.community_cards || [];
                        const p0 = payload.player_hand || [];
                        const opp = payload.opponent_hand || ['back','back'];
                        
                        cardEngine.gcCards();
                        
                        // Origin set to DECK_X, DECK_Z for dealing animation from croupier position
                        const oX = DECK_X, oZ = DECK_Z, oY = DECK_Y;
                        
                        if (comm.length > 0) cardEngine.drawZone(comm, 'community', 2.5 - ((comm.length-1)*0.9)/2, 0, { layout: 'line', hidden: false, originY: oY, originX: oX, originZ: oZ});
                        if (p0.length > 0) cardEngine.drawZone(p0, 'player_0', 2.5 - 0.5, 0.6, { layout: 'fan', hidden: false, originY: oY, originX: oX, originZ: oZ});
                        if (opp.length > 0) cardEngine.drawZone(opp, 'player_2', 2.5 - 0.5, -0.6, { layout: 'fan', hidden: true, originY: oY, originX: oX, originZ: oZ});
                    }
                    else if (gameId === 'blackjack') {
                        const pHand = payload.player_hand || [];
                        const dHand = payload.dealer_hand || [];
                        
                        cardEngine.gcCards();
                        const oX = DECK_X, oZ = DECK_Z, oY = DECK_Y;
                        
                        if (pHand.length > 0) cardEngine.drawZone(pHand, 'player_0', 2.5 - ((pHand.length-1)*0.6)/2, 0.5, { layout: 'fan', hidden: false, originY: oY, originX: oX, originZ: oZ });
                        if (dHand.length > 0) {
                            if (dHand.length === 2 && payload.status === 'Playing') {
                                cardEngine.drawZone([dHand[0]], 'dealer_hole', 2.5 - 0.3, -0.5, { layout: 'line', hidden: true, originY: oY, originX: oX, originZ: oZ });
                                cardEngine.drawZone([dHand[1]], 'dealer_up', 2.5 + 0.3, -0.5, { layout: 'line', hidden: false, originY: oY, originX: oX, originZ: oZ });
                            } else {
                                cardEngine.drawZone(dHand, 'dealer', 2.5 - ((dHand.length-1)*0.9)/2, -0.5, { layout: 'line', hidden: false, originY: oY, originX: oX, originZ: oZ });
                            }
                        }
                    }
                    else if (gameId === 'usura') {
                        const h = payload.hand || [];
                        const p = payload.played || [];
                        const oX = DECK_X, oZ = DECK_Z, oY = DECK_Y;
                        
                        cardEngine.gcCards();
                        if (h.length > 0) cardEngine.drawZone(h, 'hand', 2.5 - ((h.length-1)*0.9)/2, 0.7, { layout: 'fan', hidden: false, originY: oY, originX: oX, originZ: oZ });
                        if (p.length > 0) cardEngine.drawZone(p, 'played', 2.5 - ((p.length-1)*1.2)/2, -0.2, { layout: 'line', hidden: false, originY: oY, originX: oX, originZ: oZ });
                    }
                } catch(e) { console.error("Telemetry Error", e); }
            };
            
            currentRLSocket.onerror = (e) => {
                if(infoDiv) infoDiv.innerHTML = `<span style="color:#ff3366">RL STREAM FAILED. IS PYTHON HUB TRAINING?</span>`;
            };
            currentRLSocket.onclose = () => {
                if(infoDiv && infoDiv.innerHTML.includes('LIVE')) infoDiv.innerHTML = `<span style="color:#ff9800">RL STREAM CLOSED</span>`;
            };
        };
        
        window.disconnectRLStream = function() {
            if (currentRLSocket) {
                currentRLSocket.close();
                currentRLSocket = null;
            }
        };

        // Override loadCardGame to intercept RL hooks
        if (typeof window.loadCardGame === 'function') {
            const originalLoadCardGame = window.loadCardGame;
            window.loadCardGame = function(gameId) {
                // First disconnect any active RL sockets when changing game modes
                disconnectRLStream();
                
                // Route stochastic algorithms natively to the table
                if (gameId.startsWith('rl_')) {
                    connectRLStream(gameId.replace('rl_', ''));
                    return;
                }
                
                originalLoadCardGame(gameId);
            };
        }

    