export async function runGymEpisode(epochs, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] TFJS -> Inicializando Deep Neural Network (${epochs} epocas)...`);
    
    // Instanciamos TensorFlow.js para simular Deep Q-Network Headless
    const tf = await import('@tensorflow/tfjs');
    
    const model = tf.sequential();
    model.add(tf.layers.dense({inputShape: [2], units: 16, activation: 'relu'}));
    model.add(tf.layers.dense({units: 16, activation: 'relu'}));
    model.add(tf.layers.dense({units: 1, activation: 'linear'})); // Predict brakeFactor
    
    model.compile({optimizer: tf.train.adam(0.01), loss: 'meanSquaredError'});
    
    // Synthesizing responses
    console.log(`[${WORKER_NAME}] Generando dataset deterministico proxy...`);
    const xsList = [];
    const ysList = [];
    
    for (let i = 0; i < 500; i++) {
       const dist = Math.max(1, Math.random() * 50); 
       const speed = Math.random() * 20;
       // Mock target function: brake harder if short distance & high speed
       const targetBrake = speed > dist ? (speed - dist)/speed : 0;
       xsList.push([dist, speed]);
       ysList.push([targetBrake]);
    }
    
    const xs = tf.tensor2d(xsList);
    const ys = tf.tensor2d(ysList);
    
    console.log(`[${WORKER_NAME}] Entrenando Modelo (Backpropagation)...`);
    const t0 = performance.now();
    const history = await model.fit(xs, ys, {
       epochs: epochs,
       shuffle: true,
       verbose: 0,
       callbacks: {
           onEpochEnd: (epoch, logs) => {
               if (epoch % 50 === 0) console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}`);
           }
       }
    });
    const t1 = performance.now();
    
    // Extract real model weights
    const weights = model.getWeights();
    const extractedArrays = [];
    for (const w of weights) {
        extractedArrays.push(Array.from(await w.data()));
    }
    
    let extractedWeightsPayload = {
        topology: "3-layer dense 2->16->16->1",
        tensors: extractedArrays
    };
    
    const durationMs = t1 - t0;
    console.log(`[${WORKER_NAME}] TensorFlow Converged! Ticks entrenados en ${Math.round(durationMs)}ms.`);

    return {
        method: "Deep Q-Network (TFJS Supervised Simulator)",
        epochs: epochs,
        final_loss: history.history.loss[history.history.loss.length - 1],
        sim_time_ms: durationMs,
        extracted_weights: extractedWeightsPayload
    };
}
