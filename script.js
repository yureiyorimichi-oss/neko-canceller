<script>
    let isConverting = false;
    let currentMode = "ねこ";
    let audioCtx, analyser, dataArray, inputGain, masterGain;
    let audioBuffers = {};
    let isTidying = false;

    const mainBtn = document.getElementById('main-action-btn');
    const btnIcon = document.getElementById('btn-icon');
    const baseLayer = document.getElementById('base-layer');
    const statusLabel = document.getElementById('status-label');
    const wrappers = { "normal": document.getElementById('wrapper-normal'), "ねこ": document.getElementById('wrapper-neko'), "なみ": document.getElementById('wrapper-nami'), "たきび": document.getElementById('wrapper-takibi') };

    // 音声ファイルのプリロード（エラーログを追加）
    async function preload() {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const files = { "ねこ": "meow.mp3", "なみ": "海岸4.mp3", "たきび": "焚き火ループ.mp3" };
        for (const [key, url] of Object.entries(files)) {
            try {
                const res = await fetch(url);
                const buf = await res.arrayBuffer();
                audioBuffers[key] = await ctx.decodeAudioData(buf);
                console.log(`${key} の読み込み成功`);
            } catch (e) {
                console.error(`${key} (${url}) の読み込みに失敗しました。ファイル名を確認してください。`, e);
            }
        }
        audioCtx = ctx;
    }
    preload();

    async function initMicrophone() {
        if (!analyser) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const source = audioCtx.createMediaStreamSource(stream);
                analyser = audioCtx.createAnalyser();
                inputGain = audioCtx.createGain();
                masterGain = audioCtx.createGain();
                
                source.connect(inputGain);
                inputGain.connect(analyser);
                masterGain.connect(audioCtx.destination);

                analyser.fftSize = 256;
                dataArray = new Uint8Array(analyser.frequencyBinCount);
                console.log("マイク接続成功");
                detectSound();
            } catch (e) {
                console.error("マイクの許可が得られませんでした:", e);
                alert("マイクの使用を許可してください。");
            }
        }
    }

    function detectSound() {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        // 判定をしきい値に連動（少し反応しやすく調整）
        const threshold = parseInt(document.getElementById('threshold-val').innerText);
        
        // デバッグ用：音を拾っているか確認したい場合は下のコメントを外してください
        // if(volume > 1) console.log("Current Vol:", volume, "Threshold:", threshold);

        if (isConverting && volume > threshold && !isTidying) {
            triggerEffect();
        }
        requestAnimationFrame(detectSound);
    }

    function triggerEffect() {
        if (!audioBuffers[currentMode]) return;
        
        isTidying = true;
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffers[currentMode];
        source.connect(masterGain);

        const gainVal = parseInt(document.getElementById('gain-val').innerText) / 5; // 音量を少し上げめに調整
        masterGain.gain.setValueAtTime(gainVal, audioCtx.currentTime);

        if (currentMode === "ねこ") {
            source.playbackRate.value = 0.8 + Math.random() * 0.7; 
            source.start(0);
            setTimeout(() => { isTidying = false; }, 300); // 連続で鳴りやすく間隔を短縮
        } 
        else if (currentMode === "なみ") {
            const duration = 5 + Math.random() * 3;
            const offset = Math.random() * Math.max(0, source.buffer.duration - duration);
            source.start(0, offset, duration);
            setTimeout(() => { isTidying = false; }, duration * 1000);
        } 
        else if (currentMode === "たきび") {
            source.start(0);
            setTimeout(() => { isTidying = false; }, 500);
        }
    }

    function updateVisuals() {
        Object.values(wrappers).forEach(w => w.style.display = 'none');
        if (isConverting) {
            baseLayer.src = 'img/neko-canceller_03.png';
            btnIcon.src = 'img/neko-canceller_30.png';
            statusLabel.innerText = 'ネコ語変換中！';
            mainBtn.style.backgroundColor = '#ffdb4d';
            wrappers[currentMode].style.display = 'flex';
        } else {
            baseLayer.src = 'img/neko-canceller_04.png';
            btnIcon.src = 'img/neko-canceller_29.png';
            statusLabel.innerText = '集音中〜';
            mainBtn.style.backgroundColor = '#fff';
            wrappers["normal"].style.display = 'flex';
        }
    }

    mainBtn.addEventListener('click', async () => {
        if (!audioCtx) await preload();
        await initMicrophone();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        isConverting = !isConverting;
        updateVisuals();
    });

    function selectMode(element) {
        document.querySelectorAll('.mode-item').forEach(item => item.classList.remove('active'));
        element.classList.add('active');
        currentMode = element.getAttribute('data-mode');
        if (isConverting) updateVisuals();
    }

    function adjust(type, amount) {
        const target = document.getElementById(type + '-val');
        let val = parseInt(target.innerText);
        val = Math.max(0, Math.min(20, val + amount));
        target.innerText = val;
    }
</script>