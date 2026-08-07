// BSPEngine.js - Binary Space Partitioning for Dungeon Generation

class Leaf {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.leftChild = null;
        this.rightChild = null;
        this.room = null;
        this.halls = [];
    }
}

export class BSPSystem {
    /**
     * @param {Object} config Configuration parameters
     * @param {number} config.minLeafSize Minimum size of a partitioned leaf
     * @param {number} config.maxLeafSize Maximum size of a partitioned leaf
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get reproducible dungeons.
     */
    constructor(config = {}) {
        this.minLeafSize = config.minLeafSize || 10;
        this.maxLeafSize = config.maxLeafSize || 30;
        /**
         * ⚠️ WHY THIS PARAMETER EXISTS.
         *
         * This generator called `this.rng()` in eleven places, which made it
         * usable for a demo and unusable for anything that has to be REPLAYED:
         * a benchmark run, a bug report, a match receipt. Same seed, different
         * dungeon — so `{game, seed, moves}` no longer reproduces the game, and
         * a verifiable result stops being verifiable.
         *
         * It is not a design flaw, it is a missing parameter. Injecting the
         * source of randomness costs one line and is backwards compatible: every
         * existing caller keeps the exact behaviour it had.
         */
        this.rng = config.rng || Math.random;
    }

    /**
     * @param {number} width Grid width
     * @param {number} height Grid height
     * @param {number} iterations Split depth
     * @returns {Object} { rooms: Array, halls: Array, tree: Leaf }
     */
    generate(width, height, iterations = 4) {
        const root = new Leaf(0, 0, width, height);
        const leaves = [root];

        let didSplit = true;
        // 1. Partitioning Space
        while (didSplit) {
            didSplit = false;
            for (let i = 0; i < leaves.length; i++) {
                const leaf = leaves[i];
                if (leaf.leftChild === null && leaf.rightChild === null) {
                    if (leaf.width > this.maxLeafSize || leaf.height > this.maxLeafSize || this.rng() > 0.25) {
                        if (this._splitLeaf(leaf)) {
                            leaves.push(leaf.leftChild);
                            leaves.push(leaf.rightChild);
                            didSplit = true;
                        }
                    }
                }
            }
        }

        // 2. Room Generation
        const rooms = [];
        const halls = [];
        
        root.room = this._createRooms(root, rooms);
        this._createHalls(root, halls);

        return {
            rooms,
            halls,
            tree: root
        };
    }

    _splitLeaf(leaf) {
        let splitHorizontally = this.rng() > 0.5;

        // Force orientation if proportion is skewed
        if (leaf.width > leaf.height && leaf.width / leaf.height >= 1.25) splitHorizontally = false;
        else if (leaf.height > leaf.width && leaf.height / leaf.width >= 1.25) splitHorizontally = true;

        const max = (splitHorizontally ? leaf.height : leaf.width) - this.minLeafSize;
        if (max <= this.minLeafSize) return false; // Too small

        const split = Math.floor(this.rng() * (max - this.minLeafSize)) + this.minLeafSize;

        if (splitHorizontally) {
            leaf.leftChild = new Leaf(leaf.x, leaf.y, leaf.width, split);
            leaf.rightChild = new Leaf(leaf.x, leaf.y + split, leaf.width, leaf.height - split);
        } else {
            leaf.leftChild = new Leaf(leaf.x, leaf.y, split, leaf.height);
            leaf.rightChild = new Leaf(leaf.x + split, leaf.y, leaf.width - split, leaf.height);
        }
        return true;
    }

    _createRooms(leaf, roomsArray) {
        if (leaf.leftChild !== null || leaf.rightChild !== null) {
            if (leaf.leftChild !== null) this._createRooms(leaf.leftChild, roomsArray);
            if (leaf.rightChild !== null) this._createRooms(leaf.rightChild, roomsArray);
            // (dead block removed: it called _getRoom twice and used neither
            //  result. Harmless while randomness was global, but _getRoom draws
            //  from the rng, so with a seeded generator it silently shifted the
            //  whole sequence — a dungeon that changed for no visible reason.)
        } else {
            // Leaf is a room
            const roomSize = {
                x: Math.floor(this.rng() * (leaf.width - 3)) + 3,
                y: Math.floor(this.rng() * (leaf.height - 3)) + 3
            };
            const roomPos = {
                x: Math.floor(this.rng() * (leaf.width - roomSize.x - 1)) + 1,
                y: Math.floor(this.rng() * (leaf.height - roomSize.y - 1)) + 1
            };
            
            leaf.room = {
                x: leaf.x + roomPos.x,
                y: leaf.y + roomPos.y,
                width: roomSize.x,
                height: roomSize.y
            };
            roomsArray.push(leaf.room);
        }
    }

    _getRoom(leaf) {
        if(leaf.room !== null) return leaf.room;
        let lRoom = null, rRoom = null;
        if(leaf.leftChild !== null) lRoom = this._getRoom(leaf.leftChild);
        if(leaf.rightChild !== null) rRoom = this._getRoom(leaf.rightChild);
        
        if(lRoom === null && rRoom === null) return null;
        if(rRoom === null) return lRoom;
        if(lRoom === null) return rRoom;
        return this.rng() > 0.5 ? lRoom : rRoom;
    }
    
    _createHalls(leaf, hallsArray) {
        if (leaf.leftChild === null || leaf.rightChild === null) return;

        this._createHalls(leaf.leftChild, hallsArray);
        this._createHalls(leaf.rightChild, hallsArray);

        const lRoom = this._getRoom(leaf.leftChild);
        const rRoom = this._getRoom(leaf.rightChild);

        if (!lRoom || !rRoom) return;

        // Find center of each room
        const point1 = {
            x: Math.floor(lRoom.x + (lRoom.width / 2)),
            y: Math.floor(lRoom.y + (lRoom.height / 2))
        };
        const point2 = {
            x: Math.floor(rRoom.x + (rRoom.width / 2)),
            y: Math.floor(rRoom.y + (rRoom.height / 2))
        };

        const w = point2.x - point1.x;
        const h = point2.y - point1.y;

        if (w < 0) {
            if (h < 0) {
                if (this.rng() < 0.5) {
                    hallsArray.push({ x: point2.x, y: point1.y, width: Math.abs(w), height: 1 });
                    hallsArray.push({ x: point2.x, y: point2.y, width: 1, height: Math.abs(h) });
                } else {
                    hallsArray.push({ x: point2.x, y: point2.y, width: Math.abs(w), height: 1 });
                    hallsArray.push({ x: point1.x, y: point2.y, width: 1, height: Math.abs(h) });
                }
            } else if (h > 0) {
                if (this.rng() < 0.5) {
                    hallsArray.push({ x: point2.x, y: point1.y, width: Math.abs(w), height: 1 });
                    hallsArray.push({ x: point2.x, y: point1.y, width: 1, height: Math.abs(h) });
                } else {
                    hallsArray.push({ x: point2.x, y: point2.y, width: Math.abs(w), height: 1 });
                    hallsArray.push({ x: point1.x, y: point1.y, width: 1, height: Math.abs(h) });
                }
            } else {
                hallsArray.push({ x: point2.x, y: point2.y, width: Math.abs(w), height: 1 });
            }
        } else if (w > 0) {
            if (h < 0) {
                if (this.rng() < 0.5) {
                    hallsArray.push({ x: point1.x, y: point2.y, width: Math.abs(w), height: 1 });
                    hallsArray.push({ x: point1.x, y: point2.y, width: 1, height: Math.abs(h) });
                } else {
                    hallsArray.push({ x: point1.x, y: point1.y, width: Math.abs(w), height: 1 });
                    hallsArray.push({ x: point2.x, y: point2.y, width: 1, height: Math.abs(h) });
                }
            } else if (h > 0) {
                if (this.rng() < 0.5) {
                    hallsArray.push({ x: point1.x, y: point1.y, width: Math.abs(w), height: 1 });
                    hallsArray.push({ x: point2.x, y: point1.y, width: 1, height: Math.abs(h) });
                } else {
                    hallsArray.push({ x: point1.x, y: point2.y, width: Math.abs(w), height: 1 });
                    hallsArray.push({ x: point1.x, y: point1.y, width: 1, height: Math.abs(h) });
                }
            } else {
                hallsArray.push({ x: point1.x, y: point1.y, width: Math.abs(w), height: 1 });
            }
        } else {
            if (h < 0) {
                hallsArray.push({ x: point2.x, y: point2.y, width: 1, height: Math.abs(h) });
            } else if (h > 0) {
                hallsArray.push({ x: point1.x, y: point1.y, width: 1, height: Math.abs(h) });
            }
        }
    }
}
