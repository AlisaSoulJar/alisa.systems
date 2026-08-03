// replays_visualizer.js

let currentDataset = null;
let currentFrame = 0;
let playing = false;
let playInterval = null;

async function fetchDatasets() {
    try {
        const res = await fetch('/arcade/datasets');
        const data = await res.json();
        
        const list = document.getElementById('fileList');
        list.innerHTML = '';
        
        if (data.status === 'ok') {
            document.getElementById('file-counter').innerText = `${data.datasets.length} Logs Available`;
            
            data.datasets.forEach(f => {
                const div = document.createElement('div');
                div.className = 'file-entry';
                // f is e.g. "2026-04/peaton_batch_xyz.json"
                const parts = f.split('/');
                const display = parts.length > 1 ? `[${parts[0]}] ${parts[1]}` : f;
                div.innerText = display;
                div.onclick = () => loadDataset(f, div);
                list.appendChild(div);
            });
        }
    } catch (e) {
        console.error("Failed to load list", e);
    }
}

async function loadDataset(filename, rowElement) {
    // UI Selection
    document.querySelectorAll('.file-entry').forEach(el => el.classList.remove('active'));
    if (rowElement) rowElement.classList.add('active');
    
    try {
        const res = await fetch(`/arcade/dataset/${filename}`);
        const data = await res.json();
        
        if (data.status === 'ok') {
            currentDataset = data.data;
            if (currentDataset.games && currentDataset.games.length > 0) {
                currentDataset.history = currentDataset.games[0].history;
            }
            setupPlayer();
        }
    } catch(e) { console.error(e); }
}

function setupPlayer() {
    if (!currentDataset || !currentDataset.history) return;
    
    document.getElementById('noData').style.display = 'none';
    const iframe = document.getElementById('gameFrame');
    iframe.style.display = 'block';
    document.getElementById('controls').style.display = 'flex';
    
    // Determine embedded engine
    let src = '';
    if (currentDataset.engine === 'reversi') src = 'reversi.html';
    else if (currentDataset.engine === 'backgammon') src = 'casino.html';
    else if (currentDataset.engine === 'peaton') src = 'ticks.html';
    else if (currentDataset.engine === 'chess') src = 'chess.html'; // PGN support needed separate parser
    
    // Only reload iframe if needed
    if (!iframe.src.endsWith(src)) {
        iframe.src = src;
        iframe.onload = () => {
            // Hijack native polling
            if (iframe.contentWindow) {
                // Clear the native setInterval to stop it from fighting us
                if (iframe.contentWindow.tickerInterval) clearInterval(iframe.contentWindow.tickerInterval);
                // For older ones without explicit var, try to mock fetchState
                iframe.contentWindow.fetchState = () => {}; 
                
                // Hide their HUD connections to avoid confusion
                const hud = iframe.contentWindow.document.querySelector('.hud-panel');
                if (hud) hud.style.opacity = '0.5';
            }
            
            // Wait a sec for iframe 3D to init, then push
            setTimeout(() => {
                currentFrame = 0;
                pushFrame();
            }, 500);
        };
    } else {
        currentFrame = 0;
        pushFrame();
    }
    
    const slider = document.getElementById('timeline');
    slider.max = currentDataset.history.length - 1;
    slider.value = 0;
    
    pause();
}

function pushFrame() {
    if (!currentDataset) return;
    
    const frameData = currentDataset.history[currentFrame];
    if (!frameData) return;
    
    const cw = document.getElementById('gameFrame').contentWindow;
    if (!cw) return;

    if (currentDataset.engine === 'reversi' && cw.syncFenToBoard) {
        cw.syncFenToBoard(frameData.fen);
        document.getElementById('frameCounter').innerText = `${currentFrame} [${frameData.move}]`;
    } 
    else if (currentDataset.engine === 'backgammon' && cw.syncStateToBoard) {
        cw.syncStateToBoard(frameData.state);
        document.getElementById('frameCounter').innerText = `${currentFrame} [${frameData.move}]`;
    }
    else if (currentDataset.engine === 'peaton' && cw.syncStateToBoard) {
        cw.syncStateToBoard(frameData.state);
        document.getElementById('frameCounter').innerText = `${currentFrame} [TICK ${frameData.tick}]`;
    }
    
    document.getElementById('timeline').value = currentFrame;
}

function togglePlay() {
    if (playing) pause();
    else play();
}

function play() {
    playing = true;
    document.getElementById('playPauseBtn').innerText = '⏸';
    playInterval = setInterval(() => {
        if (currentFrame < currentDataset.history.length - 1) {
            currentFrame++;
            pushFrame();
        } else {
            pause();
        }
    }, 1000); // 1 FPS for clear viewing
}

function pause() {
    playing = false;
    document.getElementById('playPauseBtn').innerText = '▶';
    clearInterval(playInterval);
}

function scrubTimeline() {
    pause();
    currentFrame = parseInt(document.getElementById('timeline').value);
    pushFrame();
}

// Boot
fetchDatasets();
