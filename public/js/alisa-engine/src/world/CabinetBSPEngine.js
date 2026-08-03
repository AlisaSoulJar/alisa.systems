import { SeededRNG } from './core/SeededRNG.js';

export class CabinetBSPEngine {
   /**
    * @param {number} cuts  profundidad de la partición (2–8)
    * @param {number} seed
    *
    * ⚠️ `cuts` SE VALIDA, y no es paranoia.
    *
    * El corte de la recursión es `depth >= maxDepth`. Si `maxDepth` llega como
    * `NaN` —cosa fácil: basta un `undefined + 1` en quien llama— esa comparación
    * es SIEMPRE falsa y la función se llama a sí misma hasta reventar la pila.
    * Pasó de verdad: `randomizeCuts()` calculaba `this.sys.episodes + 1` con
    * `episodes` sin inicializar, y el juego del archivador moría al arrancar con
    * un «Maximum call stack size exceeded» que no decía nada del porqué.
    *
    * Una recursión cuyo fondo depende de un parámetro tiene que comprobar ese
    * parámetro. `NaN` no es un número pequeño: es un número que nunca cumple
    * ninguna comparación.
    */
   fractalPartition(cuts, seed) {
       const profundidad = Number(cuts);
       if (!Number.isFinite(profundidad) || profundidad < 1) {
           throw new RangeError(
               `CabinetBSPEngine.fractalPartition: 'cuts' debe ser un número finito ≥ 1, ` +
               `y ha llegado ${cuts}. Con NaN o undefined la partición no para nunca.`);
       }
       const maxCortes = Math.min(Math.floor(profundidad), 8);   // 2^8 hojas ya es de sobra

       const rng = new SeededRNG(seed);
       const leaves = [];
       const planks = [];

       const splitNode = (node, depth, maxDepth) => {
           if (depth >= maxDepth) { leaves.push(node); return; }
           
           const isVert = node.w > node.h;
           const sRate = 0.3 + rng.next() * 0.4;
           
           if (isVert) {
               const left = {x: node.x, y: node.y, w: node.w * sRate, h: node.h, bspPath: node.bspPath + 'L'};
               const right = {x: node.x + node.w * sRate, y: node.y, w: node.w * (1 - sRate), h: node.h, bspPath: node.bspPath + 'R'};
               planks.push({x: node.x + node.w * sRate - 0.015, y: node.y, w: 0.03, h: node.h, isVert: true});
               splitNode(left, depth + 1, maxDepth);
               splitNode(right, depth + 1, maxDepth);
           } else {
               const top = {x: node.x, y: node.y, w: node.w, h: node.h * sRate, bspPath: node.bspPath + 'T'};
               const bottom = {x: node.x, y: node.y + node.h * sRate, w: node.w, h: node.h * (1 - sRate), bspPath: node.bspPath + 'B'};
               planks.push({x: node.x, y: node.y + node.h * sRate - 0.015, w: node.w, h: 0.03, isVert: false});
               splitNode(top, depth + 1, maxDepth);
               splitNode(bottom, depth + 1, maxDepth);
           }
       };

       splitNode({x: 0, y: 0, w: 1, h: 1, bspPath: ''}, 0, maxCortes);
       return { leaves, planks, maxDepth: maxCortes };
   }

   bspDistance(pathA, pathB) {
       let i = 0;
       while (i < pathA.length && i < pathB.length && pathA[i] === pathB[i]) i++;
       return (pathA.length - i) + (pathB.length - i);
   }

   syncState(tried, montyRevealed, targetId, snakeIds, partition) {
       this.tried = tried;
       this.montyRevealed = montyRevealed;
       this.targetId = targetId;
       this.snakeIds = snakeIds;
       this.partition = partition;
   }

   countAdjacentItems(idx) {
       let snakes = 0;
       let rabbit = 0;
       const pA = this.partition.leaves[idx].bspPath;
       for (let i = 0; i < this.partition.leaves.length; i++) {
           if (i !== idx) {
               const pB = this.partition.leaves[i].bspPath;
               if (this.bspDistance(pA, pB) <= 2) {
                   if (this.snakeIds.includes(i)) snakes++;
                   if (i === this.targetId) rabbit++;
               }
           }
       }
       return { snakes, rabbit };
   }

   getBspNeighbors(idx) {
       const pA = this.partition.leaves[idx].bspPath;
       const nb = [];
       for (let i = 0; i < this.partition.leaves.length; i++) {
           if (i !== idx && this.bspDistance(pA, this.partition.leaves[i].bspPath) <= 2) nb.push(i);
       }
       return nb;
   }
   
   selectRandom() {
       const available = [];
       for (let i = 0; i < this.partition.leaves.length; i++) {
           if (!this.tried[i] && !this.montyRevealed.includes(i)) available.push(i);
       }
       if (available.length === 0) return -1;
       return available[Math.floor(Math.random() * available.length)];
   }
   
   selectAreaGreedy() {
       const available = [];
       for (let i = 0; i < this.partition.leaves.length; i++) {
           if (!this.tried[i] && !this.montyRevealed.includes(i)) available.push({id: i, area: this.partition.leaves[i].w * this.partition.leaves[i].h});
       }
       if (available.length === 0) return -1;
       available.sort((a,b) => b.area - a.area);
       return available[0].id;
   }
}
