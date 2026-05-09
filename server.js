require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const HF_API_URL = process.env.HF_API_URL;

if (!HF_API_URL) {
    console.error('ERROR: HF_API_URL is not set. Please set it in your .env file.');
    process.exit(1);
}

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== MULTER CONFIG ====================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (req, file, cb) => {
        // Accept any audio MIME type
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Format file tidak didukung. Hanya file audio yang diterima.'), false);
        }
    }
});

// ==================== ROUTES ====================

// Health check - also warms up the HuggingFace model
app.get('/api/health', async (req, res) => {
    try {
        const response = await axios.get(HF_API_URL, { timeout: 15000 });
        res.json({
            status: 'ok',
            backend: response.data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            status: 'warming_up',
            message: 'Model sedang dimuat, mohon tunggu...',
            timestamp: new Date().toISOString()
        });
    }
});

// Main prediction endpoint - proxy to HuggingFace
app.post('/api/predict', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            error: 'File audio tidak ditemukan. Silakan upload file audio.'
        });
    }

    try {
        // Build FormData to forward to HuggingFace
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'audio.wav',
            contentType: req.file.mimetype
        });

        // Forward request to HuggingFace
        const response = await axios.post(`${HF_API_URL}/predict-audio`, formData, {
            headers: {
                ...formData.getHeaders()
            },
            timeout: 120000, // 2 minutes (HF cold start can be slow)
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        // Return prediction result
        res.json({
            success: true,
            data: response.data
        });

    } catch (error) {
        if (error.response) {
            // HuggingFace returned an error
            const status = error.response.status;
            const detail = error.response.data?.detail || 'Gagal memproses file audio.';
            res.status(status).json({ error: detail });
        } else if (error.code === 'ECONNABORTED') {
            res.status(504).json({
                error: 'Waktu pemrosesan habis. Model mungkin sedang dimuat ulang (cold start). Silakan coba lagi.'
            });
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            res.status(503).json({
                error: 'Server AI tidak dapat dihubungi. Silakan coba beberapa saat lagi.'
            });
        } else {
            console.error('Prediction error:', error.message);
            res.status(500).json({
                error: 'Terjadi kesalahan internal. Silakan coba lagi.'
            });
        }
    }
});

// Multer error handler
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: 'File terlalu besar. Maksimal ukuran file adalah 10 MB.'
            });
        }
        return res.status(400).json({ error: error.message });
    }
    if (error.message) {
        return res.status(400).json({ error: error.message });
    }
    next(error);
});

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== START SERVER ====================
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`\n🎵 Audio Deepfake Detector`);
        console.log(`   Server running on http://localhost:${PORT}`);
        console.log(`   HuggingFace API: ${HF_API_URL}\n`);
    });
}

module.exports = app;
