// ==================== Upload Module ====================
const Upload = {
    file: null,
    dropzone: null,
    fileInput: null,

    init() {
        this.dropzone = document.getElementById('dropzone');
        this.fileInput = document.getElementById('file-input');
        const browseBtn = document.getElementById('browse-btn');
        const removeBtn = document.getElementById('remove-file');

        // Click to browse
        browseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.fileInput.click(); });
        this.dropzone.addEventListener('click', () => this.fileInput.click());

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleFile(e.target.files[0]);
        });

        // Drag & Drop
        this.dropzone.addEventListener('dragover', (e) => { e.preventDefault(); this.dropzone.classList.add('dropzone--active'); });
        this.dropzone.addEventListener('dragleave', () => this.dropzone.classList.remove('dropzone--active'));
        this.dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropzone.classList.remove('dropzone--active');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFile(file);
        });

        // Remove file
        removeBtn.addEventListener('click', () => this.clear());
    },

    handleFile(file) {
        // Validate type
        if (!file.type.startsWith('audio/')) {
            App.showError('Format Tidak Didukung', 'Silakan pilih file audio (MP3, WAV, OGG, FLAC, dll.)');
            return;
        }
        // Validate size (10 MB)
        if (file.size > 10 * 1024 * 1024) {
            App.showError('File Terlalu Besar', 'Maksimal ukuran file adalah 10 MB.');
            return;
        }

        this.file = file;
        this.showFileInfo(file);
        App.onFileReady();
    },

    showFileInfo(file) {
        const info = document.getElementById('file-info');
        const name = document.getElementById('file-name');
        const meta = document.getElementById('file-meta');
        const player = document.getElementById('audio-player-upload');

        name.textContent = file.name;
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        meta.textContent = `${sizeMB} MB • ${file.type || 'audio'}`;

        // Audio preview
        const url = URL.createObjectURL(file);
        player.src = url;
        player.onloadedmetadata = () => {
            const dur = Math.round(player.duration);
            const min = Math.floor(dur / 60);
            const sec = String(dur % 60).padStart(2, '0');
            meta.textContent = `${sizeMB} MB • ${min}:${sec} • ${file.type || 'audio'}`;
        };

        this.dropzone.style.display = 'none';
        info.style.display = 'block';
    },

    clear() {
        this.file = null;
        this.fileInput.value = '';
        document.getElementById('file-info').style.display = 'none';
        this.dropzone.style.display = 'block';
        const player = document.getElementById('audio-player-upload');
        if (player.src) { URL.revokeObjectURL(player.src); player.src = ''; }
        App.onFileClear();
    },

    getFile() {
        return this.file;
    }
};
