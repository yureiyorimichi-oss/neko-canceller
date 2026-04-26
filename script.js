const startBtn = document.getElementById('startBtn');
const btnImg = document.getElementById('btn-img');
const statusDiv = document.getElementById('status-area');
const groupBefore = document.getElementById('group-before');
const groupAfter = document.getElementById('group-after');
const gainDisplay = document.getElementById('gain-value');
const threshDisplay = document.getElementById('thresh-value');
const modeTexts = document.querySelectorAll('.sub-text');

let gainLevel = 10;
let threshold = 30;
let currentMode = 'neko';
let audioContext, analyser, gainNode, microphone;
let audioBuffers = { 'nami': [], 'neko': [], 'takibi': [] };
let isPlaying = false;
let isRunning = false; 
let animationId; 
let activeSource = null; 

const soundFiles = {
    'nami': ['海岸4.mp3'],
    'neko': ['meow.mp3'],
    'takibi': ['焚き火ループ.mp3']
};

modeTexts.forEach(text => {
    text.addEventListener('click', async () => {
        modeTexts.forEach(t => t.classList.remove('active'));
        text.classList.add('active');
        currentMode = text.id.replace('mode-', '');
        if (audioContext) await loadCurrentModeSounds();
    });
});

async function loadCurrentModeSounds() {
    const files = soundFiles[currentMode];
    if (audioBuffers[currentMode].length === 0) {
        for (const file of files) {
            try {
                const response = await fetch(file);
                const arrayBuffer = await response.arrayBuffer();
                const decodedData = await audioContext.decodeAudioData(arrayBuffer);
                audioBuffers[currentMode].push(decodedData);
            } catch (err) { console.error("音源ロード失敗:", file); }
        }
    }
}

startBtn.addEventListener('click', async () => {
    if (!isRunning) {
        startApp();
    } else {
        stopApp();
    }
});

async function startApp() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') await audioContext.resume();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        await loadCurrentModeSounds();
        
        microphone = audioContext.createMediaStreamSource(stream);
        gainNode = audioContext.createGain();
        gainNode.gain.value = gainLevel / 5;
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        microphone.connect(gainNode);
        gainNode.connect(analyser);

        isRunning = true;
        statusDiv.innerText = "\\ 集音中〜 /";
        btnImg.src = "とめるボタン.png"; // ここを修正しました
        groupBefore.style.display = "none";
        groupAfter.style.display = "block";
        checkVolume();
    } catch (err) {
        statusDiv.innerText = "マイク許可が必要です";
    }
}

function stopApp() {
    isRunning = false;
    cancelAnimationFrame(animationId);

    if (activeSource) {
        try { activeSource.stop(); } catch(e) {}
        activeSource = null;
    }
    isPlaying = false;

    if (microphone) {
        microphone.mediaStream.getTracks().forEach(track => track.stop());
        microphone.disconnect();
    }
    statusDiv.innerText = "";
    btnImg.src = "img/neko-canceller_29.png"; // ここも確認
    groupBefore.style.display = "block";
    groupAfter.style.display = "none";
}

function checkVolume() {
    if (!isRunning) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    let values = dataArray.reduce((a, b) => a + b, 0);
    const average = values / dataArray.length;
    
    if (average > threshold) playSound();
    animationId = requestAnimationFrame(checkVolume);
}

function playSound() {
    const buffers = audioBuffers[currentMode];
    if (isPlaying || !buffers || buffers.length === 0) return;
    isPlaying = true;

    const source = audioContext.createBufferSource();
    source.buffer = buffers[0];
    activeSource = source; 

    const now = audioContext.currentTime;

    if (currentMode === 'takibi') {
        source.connect(audioContext.destination);
        source.start(now);
    } else {
        const fadeGain = audioContext.createGain();
        source.connect(fadeGain);
        fadeGain.connect(audioContext.destination);

        let playDuration = 3; 
        if (currentMode === 'nami') {
            playDuration = 3 + Math.random() * 3;
        }

        const startTime = Math.max(0, Math.random() * (source.buffer.duration - playDuration));
        
        fadeGain.gain.setValueAtTime(1, now);
        fadeGain.gain.linearRampToValueAtTime(1, now + (playDuration - 1));
        fadeGain.gain.linearRampToValueAtTime(0, now + playDuration);

        source.start(now, startTime, playDuration);
    }
    
    source.onended = () => {
        isPlaying = false;
        if (activeSource === source) activeSource = null;
        source.disconnect();
    };
}

// 調整ボタン
document.getElementById('gainUp').onclick = (e) => { e.stopPropagation(); gainLevel = Math.min(100, gainLevel + 5); gainDisplay.innerText = gainLevel; if(gainNode) gainNode.gain.value = gainLevel/5; };
document.getElementById('gainDown').onclick = (e) => { e.stopPropagation(); gainLevel = Math.max(1, gainLevel - 5); gainDisplay.innerText = gainLevel; if(gainNode) gainNode.gain.value = gainLevel/5; };
document.getElementById('threshUp').onclick = (e) => { e.stopPropagation(); threshold = Math.min(100, threshold + 5); threshDisplay.innerText = threshold; };
document.getElementById('threshDown').onclick = (e) => { e.stopPropagation(); threshold = Math.max(1, threshold - 5); threshDisplay.innerText = threshold; };