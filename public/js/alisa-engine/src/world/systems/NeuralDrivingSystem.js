/**
 * NeuralDrivingEngine.js
 * 
 * ALISA One-Way Sync Engine Extraction Pattern
 * Pure mathematical logic for TensorFlow.js driving inference.
 * NO THREE.JS REFERENCES OR DOM MANIPULATIONS ALLOWED HERE.
 */
export class NeuralDrivingSystem {
    /**
     * @param {Object} config Configuration parameters
     * @param {() => number} [config.rng] Source of randomness, [0,1). Defaults to
     *        `Math.random`. Pass a seeded generator to get reproducible training samples.
     */
    constructor(config = {}) {
        this.modelReady = false;
        this.mlModel = null;
        // Semilla inyectable. Sin ella los 500 ejemplos sintéticos de entrenamiento
        // cambian en cada tirada y el modelo entrenado ya no es reproducible. Ver
        // `prueba_semillas.mjs`.
        this.rng = config.rng || (() => Math.random());

        // Agent Mathematical States
        this.leadSpeed = config.initialLeadSpeed || 10;
        this.followerSpeed = config.initialFollowerSpeed || 0;
        this.time = 0;
        
        this.leadZ = config.initialLeadZ || 10;
        this.followerZ = config.initialFollowerZ || 0;
        
        // Callbacks
        this.onLog = config.onLog || (() => {});
        this.onConverged = config.onConverged || (() => {});
    }

    async initAndTrainModel() {
        this.onLog("Initializing Sequential Model (16x16)...");
        const model = tf.sequential();
        // Input: [Distance To Lead, Speed difference]
        model.add(tf.layers.dense({inputShape: [2], units: 16, activation: 'relu'}));
        model.add(tf.layers.dense({units: 16, activation: 'relu'}));
        model.add(tf.layers.dense({units: 1, activation: 'linear'})); // Predict Acceleration!

        model.compile({optimizer: tf.train.adam(0.01), loss: 'meanSquaredError'});

        this.onLog("Generating 500 Synthetic IDM Samples...");
        const xsList = [];
        const ysList = [];
        
        for (let i = 0; i < 500; i++) {
            const dist = Math.max(1, this.rng() * 50);
            const speed = this.rng() * 20;

            // Ground Truth Approximation:
            const targetAccel = speed > dist ? -((speed - dist)/speed)*2 : 1.0; 
            xsList.push([dist, speed]);
            ysList.push([targetAccel]);
        }

        const xs = tf.tensor2d(xsList);
        const ys = tf.tensor2d(ysList);

        this.onLog("Starting Headless Backpropagation (200 Epochs)...");
        
        await model.fit(xs, ys, {
            epochs: 200,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logValues) => {
                    if (epoch % 50 === 0 || epoch === 199) {
                        this.onLog(`Epoch ${epoch}: Loss = ${logValues.loss.toFixed(4)}`);
                    }
                }
            }
        });

        this.onLog("Model Converged!");
        this.mlModel = model;
        this.modelReady = true;
        this.onConverged();
    }

    /**
     * Executes headless mathematical tick for the simulation.
     * Host just reads positions.
     */
    tick(dt) {
        if (!this.modelReady) return;

        this.time += dt;

        // Leader accelerates and brakes aggressively
        this.leadSpeed = 10 + Math.sin(this.time * 0.5) * 8; 
        this.leadZ += this.leadSpeed * dt;

        // Follower Neural Predict
        const dist = this.leadZ - this.followerZ - 4; // mathematical distance
        
        // Execute Inference
        let prediction = 0;
        tf.tidy(() => {
            const inputTensor = tf.tensor2d([[Math.max(1, dist), this.followerSpeed]]);
            const outputTensor = this.mlModel.predict(inputTensor);
            prediction = outputTensor.dataSync()[0];
        });

        // Apply prediction
        this.followerSpeed += prediction * dt * 5; 
        this.followerSpeed = Math.max(0, Math.min(25, this.followerSpeed)); // clamp
        this.followerZ += this.followerSpeed * dt;
        
        // The host extracts "leadZ", "followerZ", "followerSpeed", "prediction" for UI and visual mesh updates
        this.currentPrediction = prediction;
        this.currentDist = dist;
    }
}
