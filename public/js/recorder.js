// ==================== Recorder Module ====================
const Recorder = {
    mediaRecorder: null,
    audioChunks: [],
    stream: null,
    recordingBlob: null,
    timerInterval: null,
    seconds: 0,
    isRecording: false,

    init() {
        const recordBtn = document.getElementById('record-btn');
        const discardBtn = document.getElementById('discard-recording');

        recordBtn.addEventListener('click', () => {
            if (this.isRecording) this.stop();
            else this.start();
        });

        discardBtn.addEventListener('click', () => this.discard());
        Visualizer.init('waveform-canvas');
    },

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            const micError = document.getElementById('mic-error');
            const micText = document.getElementById('mic-error-text');
            micError.style.display = 'flex';
            if (err.name === 'NotAllowedError') {
                micText.textContent = 'Akses mikrofon ditolak. Izinkan di pengaturan browser Anda.';
            } else if (err.name === 'NotFoundError') {
                micText.textContent = 'Mikrofon tidak ditemukan pada perangkat Anda.';
            } else {
                micText.textContent = 'Gagal mengakses mikrofon: ' + err.message;
            }
            return;
        }

        document.getElementById('mic-error').style.display = 'none';
        this.audioChunks = [];
        this.recordingBlob = null;

        // Determine supported MIME type
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
            mimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
        }

        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.audioChunks.push(e.data);
        };
        this.mediaRecorder.onstop = () => this.onRecordingDone();

        this.mediaRecorder.start(100);
        this.isRecording = true;

        // UI
        const btn = document.getElementById('record-btn');
        btn.classList.add('recording');
        document.getElementById('record-hint').textContent = 'Merekam... Klik untuk berhenti';
        document.getElementById('record-timer').classList.add('recorder__timer--active');
        document.getElementById('record-info').style.display = 'none';

        // Timer
        this.seconds = 0;
        this.updateTimer();
        this.timerInterval = setInterval(() => { this.seconds++; this.updateTimer(); }, 1000);

        // Visualizer
        Visualizer.connectStream(this.stream);
    },

    stop() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.isRecording = false;
        clearInterval(this.timerInterval);

        // Stop mic
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }

        // UI
        const btn = document.getElementById('record-btn');
        btn.classList.remove('recording');
        document.getElementById('record-hint').textContent = 'Rekaman selesai';
        document.getElementById('record-timer').classList.remove('recorder__timer--active');

        Visualizer.stop();
    },

    onRecordingDone() {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        this.recordingBlob = new Blob(this.audioChunks, { type: mimeType });

        // Show preview
        const info = document.getElementById('record-info');
        const meta = document.getElementById('record-meta');
        const player = document.getElementById('audio-player-record');

        const sizeMB = (this.recordingBlob.size / (1024 * 1024)).toFixed(2);
        const min = Math.floor(this.seconds / 60);
        const sec = String(this.seconds % 60).padStart(2, '0');
        meta.textContent = `${sizeMB} MB • ${min}:${sec}`;

        const url = URL.createObjectURL(this.recordingBlob);
        player.src = url;
        info.style.display = 'block';

        App.onFileReady();
    },

    discard() {
        this.recordingBlob = null;
        this.audioChunks = [];
        this.seconds = 0;
        this.updateTimer();

        document.getElementById('record-info').style.display = 'none';
        document.getElementById('record-hint').textContent = 'Klik tombol untuk mulai merekam';

        const player = document.getElementById('audio-player-record');
        if (player.src) { URL.revokeObjectURL(player.src); player.src = ''; }

        App.onFileClear();
    },

    updateTimer() {
        const min = String(Math.floor(this.seconds / 60)).padStart(2, '0');
        const sec = String(this.seconds % 60).padStart(2, '0');
        document.getElementById('record-timer').textContent = `${min}:${sec}`;
    },

    getFile() {
        if (!this.recordingBlob) return null;
        const ext = this.recordingBlob.type.includes('webm') ? 'webm' : 'ogg';
        return new File([this.recordingBlob], `recording.${ext}`, { type: this.recordingBlob.type });
    }
};
