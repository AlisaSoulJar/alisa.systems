import { runGymEpisode } from './gym_runners/boids_gym.js';
import http from 'http';

async function main() {
    console.log("Running Boids Headless Evaluation v2...");
    const result = await runGymEpisode(500, "Queen");
    
    console.log("Evaluation complete. Submitting to JobBoard...");
    const payload = JSON.stringify({
        job_id: '70118a0e0dc517e5',
        being: 'queen',
        result: JSON.stringify(result)
    });
    
    const req = http.request({
        hostname: '127.0.0.1',
        port: 8741,
        path: '/jobboard/submit',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length
        }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log("JobBoard response:", data);
            
            // Now approve it
            console.log("Approving job...");
            const appReq = http.request({
                hostname: '127.0.0.1',
                port: 8741,
                path: '/jobboard/approve',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, (appRes) => {
                let appData = '';
                appRes.on('data', chunk => appData += chunk);
                appRes.on('end', () => {
                    console.log("Approve response:", appData);
                });
            });
            appReq.write(JSON.stringify({ job_id: '70118a0e0dc517e5' }));
            appReq.end();
        });
    });
    
    req.write(payload);
    req.end();
}

main();
