// ==================== Main App Controller ====================
const App = {
    currentTab: 'upload', // 'upload' | 'record'

    init() {
        Upload.init();
        Recorder.init();
        this.initTabs();
        this.initTheme();
        this.initButtons();
        this.checkBackendHealth();
    },

    // ---- Tabs ----
    initTabs() {
        document.querySelectorAll('.tabs__btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    },

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.tabs__btn').forEach(b => b.classList.remove('tabs__btn--active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('tabs__btn--active');

        const indicator = document.getElementById('tabs-indicator');
        indicator.classList.toggle('tabs__indicator--right', tab === 'record');

        document.getElementById('panel-upload').classList.toggle('panel--active', tab === 'upload');
        document.getElementById('panel-record').classList.toggle('panel--active', tab === 'record');

        // Update analyze button state
        this.updateAnalyzeBtn();
        // Hide result/error
        this.hideStates();
    },

    // ---- Theme ----
    initTheme() {
        const saved = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        document.getElementById('theme-toggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    },

    // ---- Buttons ----
    initButtons() {
        document.getElementById('analyze-btn').addEventListener('click', () => this.analyze());
        document.getElementById('result-again').addEventListener('click', () => this.reset());
        document.getElementById('error-retry').addEventListener('click', () => this.reset());
    },

    // ---- File Ready / Clear Callbacks ----
    onFileReady() {
        document.getElementById('analyze-btn').disabled = false;
        this.hideStates();
    },

    onFileClear() {
        document.getElementById('analyze-btn').disabled = true;
    },

    updateAnalyzeBtn() {
        const hasFile = this.currentTab === 'upload' ? Upload.getFile() : Recorder.getFile();
        document.getElementById('analyze-btn').disabled = !hasFile;
    },

    // ---- Analyze ----
    async analyze() {
        const file = this.currentTab === 'upload' ? Upload.getFile() : Recorder.getFile();
        if (!file) return;

        this.showLoading('Mengkonversi audio ke WAV...');

        try {
            // Update text after conversion starts processing
            setTimeout(() => {
                const loadingText = document.getElementById('loading-text');
                if (loadingText && loadingText.textContent.includes('Mengkonversi')) {
                    loadingText.textContent = 'Mengirim ke server AI...';
                }
            }, 1500);
            const result = await API.predict(file);
            this.showResult(result, file.name);
        } catch (err) {
            this.showError('Gagal Menganalisis', err.message);
        }
    },

    // ---- State Management ----
    hideStates() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('result').style.display = 'none';
    },

    showLoading(text) {
        this.hideStates();
        document.getElementById('analyze-btn').style.display = 'none';
        document.getElementById('loading').style.display = 'block';
        if (text) document.getElementById('loading-text').textContent = text;
    },

    showError(title, message) {
        this.hideStates();
        document.getElementById('analyze-btn').style.display = 'flex';
        document.getElementById('error-state').style.display = 'block';
        document.getElementById('error-title').textContent = title;
        document.getElementById('error-message').textContent = message;
    },

    showResult(data, filename) {
        this.hideStates();
        document.getElementById('analyze-btn').style.display = 'none';

        const resultEl = document.getElementById('result');
        const isReal = data.label === 'real';
        const confidence = (data.confidence * 100).toFixed(1);
        const realPct = (data.details.real_probability * 100).toFixed(1);
        const fakePct = (data.details.fake_probability * 100).toFixed(1);

        // Set class
        resultEl.className = 'result ' + (isReal ? 'result--real' : 'result--fake');

        // Icon
        document.getElementById('result-icon').innerHTML = isReal
            ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
            : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

        // Label & confidence
        document.getElementById('result-label').textContent = isReal ? 'REAL' : 'FAKE';
        document.getElementById('result-confidence').textContent = `Confidence: ${confidence}%`;

        // Filename
        document.getElementById('result-filename').textContent = `File: ${data.filename || filename}`;

        // Explanation
        document.getElementById('result-explanation').textContent = isReal
            ? `Audio ini terdeteksi sebagai suara ASLI dengan tingkat kepercayaan ${confidence}%. Model tidak menemukan pola artefak deepfake yang signifikan.`
            : `Audio ini terdeteksi sebagai DEEPFAKE dengan tingkat kepercayaan ${confidence}%. Model menemukan pola sintesis yang mengindikasikan audio ini bukan suara asli.`;

        // Bars
        document.getElementById('result-real-pct').textContent = `${realPct}%`;
        document.getElementById('result-fake-pct').textContent = `${fakePct}%`;

        resultEl.style.display = 'block';

        // Animate bars after render
        requestAnimationFrame(() => {
            setTimeout(() => {
                document.getElementById('result-real-bar').style.width = `${realPct}%`;
                document.getElementById('result-fake-bar').style.width = `${fakePct}%`;
            }, 100);
        });

        // Scroll to result
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    reset() {
        this.hideStates();
        document.getElementById('analyze-btn').style.display = 'flex';

        // Reset bars
        document.getElementById('result-real-bar').style.width = '0%';
        document.getElementById('result-fake-bar').style.width = '0%';

        this.updateAnalyzeBtn();
    },

    // ---- Backend Health Check ----
    async checkBackendHealth() {
        const statusEl = document.getElementById('api-status');
        const textEl = statusEl.querySelector('.api-status__text');

        statusEl.className = 'api-status api-status--loading';
        textEl.textContent = 'Memeriksa...';

        const result = await API.healthCheck();
        if (result.status === 'ok') {
            statusEl.className = 'api-status api-status--ok';
            textEl.textContent = 'Model Siap';
        } else if (result.status === 'warming_up') {
            statusEl.className = 'api-status api-status--loading';
            textEl.textContent = 'Memuat Model...';
            // Retry after 30s
            setTimeout(() => this.checkBackendHealth(), 30000);
        } else {
            statusEl.className = 'api-status api-status--error';
            textEl.textContent = 'Offline';
            // Retry after 60s
            setTimeout(() => this.checkBackendHealth(), 60000);
        }
    }
};

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => App.init());
