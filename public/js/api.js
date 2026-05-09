// ==================== API Module ====================
const API = {
    BASE_URL: '/api',

    async healthCheck() {
        try {
            const res = await fetch(`${this.BASE_URL}/health`, { signal: AbortSignal.timeout(15000) });
            return await res.json();
        } catch {
            return { status: 'error', message: 'Tidak dapat terhubung ke server' };
        }
    },

    async predict(file) {
        // Convert any audio format to WAV first (torchaudio on HF needs standard WAV)
        const wavFile = await this.convertToWav(file);

        const formData = new FormData();
        formData.append('file', wavFile);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

        try {
            const res = await fetch(`${this.BASE_URL}/predict`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Server error (${res.status})`);
            }

            const data = await res.json();
            if (data.success) return data.data;
            throw new Error(data.error || 'Respons tidak valid');
        } catch (err) {
            clearTimeout(timeout);
            if (err.name === 'AbortError') {
                throw new Error('Waktu pemrosesan habis. Model mungkin sedang cold start — coba lagi.');
            }
            throw err;
        }
    },

    /**
     * Convert any browser-playable audio to 16kHz mono WAV (PCM16).
     * This ensures torchaudio on the backend can always decode it.
     */
    async convertToWav(file) {
        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        let audioBuffer;
        try {
            audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        } catch (e) {
            audioCtx.close();
            throw new Error('Browser tidak dapat mendekode file audio ini. Coba format lain (WAV/MP3).');
        }

        // Resample to 16000 Hz mono (matches the model's expected SR)
        const TARGET_SR = 16000;
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * TARGET_SR), TARGET_SR);
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start(0);

        const renderedBuffer = await offlineCtx.startRendering();
        audioCtx.close();

        // Encode to WAV (PCM 16-bit)
        const wavBlob = this.encodeWav(renderedBuffer);
        const originalName = file.name ? file.name.replace(/\.[^.]+$/, '.wav') : 'audio.wav';
        return new File([wavBlob], originalName, { type: 'audio/wav' });
    },

    /**
     * Encode an AudioBuffer into a WAV Blob (PCM 16-bit, single channel).
     */
    encodeWav(audioBuffer) {
        const numChannels = 1;
        const sampleRate = audioBuffer.sampleRate;
        const samples = audioBuffer.getChannelData(0);
        const bitsPerSample = 16;
        const bytesPerSample = bitsPerSample / 8;
        const blockAlign = numChannels * bytesPerSample;
        const dataSize = samples.length * blockAlign;
        const headerSize = 44;
        const buffer = new ArrayBuffer(headerSize + dataSize);
        const view = new DataView(buffer);

        // Helper to write string
        const writeStr = (offset, str) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };

        // RIFF header
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeStr(8, 'WAVE');

        // fmt sub-chunk
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);           // sub-chunk size
        view.setUint16(20, 1, true);             // PCM format
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);

        // data sub-chunk
        writeStr(36, 'data');
        view.setUint32(40, dataSize, true);

        // Write PCM samples (float32 -> int16)
        let offset = 44;
        for (let i = 0; i < samples.length; i++) {
            let s = Math.max(-1, Math.min(1, samples[i]));
            s = s < 0 ? s * 0x8000 : s * 0x7FFF;
            view.setInt16(offset, s, true);
            offset += 2;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }
};
