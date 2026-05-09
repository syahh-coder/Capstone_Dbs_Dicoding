// ==================== Waveform Visualizer ====================
const Visualizer = {
    canvas: null,
    ctx: null,
    analyser: null,
    animationId: null,
    audioCtx: null,

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.drawIdle();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * (window.devicePixelRatio || 1);
        this.canvas.height = rect.height * (window.devicePixelRatio || 1);
        this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    },

    connectStream(stream) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioCtx.createMediaStreamSource(stream);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        this.draw();
    },

    draw() {
        if (!this.analyser) return;
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const w = this.canvas.getBoundingClientRect().width;
        const h = this.canvas.getBoundingClientRect().height;
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6c5ce7';

        const render = () => {
            this.animationId = requestAnimationFrame(render);
            this.analyser.getByteFrequencyData(dataArray);
            this.ctx.clearRect(0, 0, w, h);

            const barW = (w / bufferLength) * 1.5;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const barH = (dataArray[i] / 255) * h * 0.85;
                const gradient = this.ctx.createLinearGradient(0, h, 0, h - barH);
                gradient.addColorStop(0, accent);
                gradient.addColorStop(1, '#ff6b81');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(x, h - barH, barW - 1, barH);
                x += barW;
            }
        };
        render();
    },

    drawIdle() {
        const w = this.canvas.getBoundingClientRect().width;
        const h = this.canvas.getBoundingClientRect().height;
        this.ctx.clearRect(0, 0, w, h);
        this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#606080';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, h / 2);
        this.ctx.lineTo(w, h / 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    },

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.audioCtx) {
            this.audioCtx.close().catch(() => {});
            this.audioCtx = null;
        }
        this.analyser = null;
        this.drawIdle();
    }
};
