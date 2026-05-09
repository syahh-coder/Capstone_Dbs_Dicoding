# 📄 Product Requirements Document (PRD)

## Audio Deepfake Detector — Web Application

| Field             | Detail                                                        |
| ----------------- | ------------------------------------------------------------- |
| **Project Name**  | Audio Deepfake Detector                                       |
| **Version**       | 1.0                                                           |
| **Author**        | —                                                             |
| **Date**          | 9 Mei 2026                                                    |
| **Status**        | Draft                                                         |
| **Backend**       | HuggingFace Spaces (FastAPI)                                  |
| **Endpoint**      | `https://syahhh01-audio-capst-detector.hf.space`              |

---

## 1. Ringkasan Eksekutif

Proyek ini bertujuan membangun sebuah **website front-end** yang memungkinkan pengguna mendeteksi apakah suatu file audio merupakan **suara asli (real)** atau **deepfake (fake)**. Website akan berkomunikasi dengan backend model **Hybrid Audio CNN** yang sudah di-deploy di HuggingFace Spaces.

Pengguna dapat:
1. **Mengunggah file audio** (`.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`, `.aac`, `.webm`, dll.)
2. **Merekam suara langsung** dari mikrofon browser

Hasil prediksi ditampilkan secara visual dengan **probabilitas real vs fake**, label prediksi, dan tingkat kepercayaan (confidence).

---

## 2. Latar Belakang & Masalah

### 2.1 Konteks
Teknologi deepfake audio semakin canggih dan dapat digunakan untuk penipuan, manipulasi informasi, dan kejahatan siber. Diperlukan alat yang mudah diakses oleh masyarakat umum untuk memverifikasi keaslian suatu rekaman audio.

### 2.2 Masalah yang Diselesaikan
- Tidak adanya tool **mudah diakses** (web-based) untuk deteksi deepfake audio.
- Pengguna non-teknis membutuhkan antarmuka yang **intuitif** tanpa perlu instalasi software.
- Kebutuhan untuk bisa langsung **merekam suara** dan mendapat hasil instan.

---

## 3. Tujuan & Sasaran

| # | Tujuan                                                                 | Metrik Keberhasilan                              |
|---|------------------------------------------------------------------------|--------------------------------------------------|
| 1 | Menyediakan antarmuka web yang intuitif untuk deteksi deepfake audio   | User dapat selesai upload & lihat hasil < 30 dtk |
| 2 | Mendukung upload berbagai format audio                                 | Minimal 5 format audio didukung                  |
| 3 | Mendukung perekaman suara langsung dari browser                        | Rekaman berfungsi di Chrome, Firefox, Edge        |
| 4 | Menampilkan hasil prediksi secara visual dan informatif                | Ditampilkan label, confidence, dan chart          |
| 5 | Responsif di berbagai perangkat (desktop, tablet, mobile)              | Tampilan optimal di viewport 320px – 1920px       |

---

## 4. Target Pengguna

| Persona             | Deskripsi                                                                                   |
|----------------------|---------------------------------------------------------------------------------------------|
| **Masyarakat Umum**  | Ingin mengecek keaslian audio yang diterima via WhatsApp, sosial media, dll.                |
| **Jurnalis**         | Memverifikasi rekaman audio sebelum dipublikasikan.                                         |
| **Penegak Hukum**    | Screening awal terhadap bukti audio.                                                        |
| **Peneliti AI**      | Menguji performa model deepfake detection.                                                  |
| **Mahasiswa/Pelajar**| Belajar dan bereksperimen dengan teknologi AI audio.                                        |

---

## 5. Arsitektur Sistem

### 5.1 Backend API (Sudah Tersedia)

**Base URL:** `https://syahhh01-audio-capst-detector.hf.space`

#### Endpoint: `GET /`
- **Deskripsi:** Health check
- **Response:**
```json
{
  "message": "Audio Deepfake Detector (Hybrid CNN) API is running!"
}
```

#### Endpoint: `POST /predict-audio`
- **Deskripsi:** Menerima file audio dan mengembalikan prediksi deepfake
- **Content-Type:** `multipart/form-data`
- **Parameter:**

| Parameter | Tipe       | Wajib | Deskripsi                          |
|-----------|------------|-------|------------------------------------|
| `file`    | UploadFile | Ya    | File audio (wav, mp3, ogg, dll.)   |

- **Response (Success - 200):**
```json
{
  "filename": "sample.wav",
  "prediction": [0.92, 0.08],
  "label": "real",
  "confidence": 0.92,
  "details": {
    "real_probability": 0.92,
    "fake_probability": 0.08
  }
}
```

- **Response (Error - 400):**
```json
{
  "detail": "Gagal memproses file audio. Pastikan file valid. Detail: ..."
}
```

- **Response (Error - 500):**
```json
{
  "detail": "Gagal menyimpan file audio sementara."
}
```

### 5.2 Model Details
| Parameter          | Nilai                   |
|--------------------|-------------------------|
| Arsitektur         | HybridAudioCNN          |
| Input              | Raw waveform + MFCC     |
| Output Classes     | 2 (`real`, `fake`)      |
| Sample Rate        | 16000 Hz                |
| MFCC Coefficients  | 40                      |
| Mel Bands          | 64                      |
| Framework          | PyTorch + torchaudio    |

---

## 6. Fitur & Spesifikasi Fungsional

### 6.1 Upload Audio File

| ID    | Requirement                                                                                  |
|-------|----------------------------------------------------------------------------------------------|
| F-01  | User dapat memilih file audio via tombol upload atau **drag-and-drop**                       |
| F-02  | Format yang didukung: `.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`, `.aac`, `.webm`               |
| F-03  | Validasi file di sisi client: cek ekstensi dan MIME type sebelum upload                      |
| F-04  | Tampilkan **preview/player audio** setelah file dipilih (sebelum submit)                     |
| F-05  | Tampilkan nama file, ukuran file, dan durasi (jika memungkinkan)                             |
| F-06  | Batas ukuran file: **maksimal 10 MB** (validasi di client)                                   |
| F-07  | Tampilkan **progress indicator** saat file sedang diunggah dan diproses                      |

### 6.2 Rekam Suara (Voice Recording)

| ID    | Requirement                                                                                  |
|-------|----------------------------------------------------------------------------------------------|
| F-08  | User dapat merekam suara langsung menggunakan mikrofon browser                               |
| F-09  | Tampilkan tombol **Start Recording / Stop Recording** yang jelas                             |
| F-10  | Tampilkan **real-time waveform visualizer** saat merekam (menggunakan Web Audio API)         |
| F-11  | Tampilkan **timer/durasi** selama perekaman berlangsung                                      |
| F-12  | Setelah stop, tampilkan preview rekaman dan opsi untuk **re-record** atau **submit**         |
| F-13  | Rekaman dikirim sebagai format `.wav` atau `.webm` ke backend                                |
| F-14  | Minta izin mikrofon dengan **UI yang jelas** saat pertama kali                               |
| F-15  | Tampilkan pesan error yang ramah jika mikrofon ditolak / tidak tersedia                      |

### 6.3 Hasil Prediksi (Result Display)

| ID    | Requirement                                                                                  |
|-------|----------------------------------------------------------------------------------------------|
| F-16  | Tampilkan **label prediksi** secara prominent: "REAL" (hijau) atau "FAKE" (merah)            |
| F-17  | Tampilkan **confidence score** dalam bentuk persentase                                       |
| F-18  | Tampilkan **progress/gauge bar** visual untuk probabilitas real vs fake                      |
| F-19  | Tampilkan **detail probabilitas** (real_probability dan fake_probability)                    |
| F-20  | Tampilkan nama file yang dianalisis                                                          |
| F-21  | Berikan **ikon/animasi** yang sesuai dengan hasil (checkmark untuk real, warning untuk fake) |
| F-22  | Tampilkan **penjelasan singkat** tentang apa arti hasil prediksi                             |
| F-23  | Tombol **"Analisis Lagi"** untuk mengulangi dengan file/rekaman baru                         |

### 6.4 Fitur Pendukung

| ID    | Requirement                                                                                  |
|-------|----------------------------------------------------------------------------------------------|
| F-24  | **Loading state** yang menarik selama proses prediksi (skeleton/spinner/animasi)              |
| F-25  | **Error handling** yang ramah pengguna untuk semua skenario error                            |
| F-26  | **Riwayat analisis** dalam satu sesi (opsional, menggunakan sessionStorage)                  |
| F-27  | **Dark/Light mode** toggle                                                                   |
| F-28  | **Bagian FAQ / Cara Kerja** yang menjelaskan teknologi di balik deteksi                      |
| F-29  | **Footer** dengan credit dan link ke repository/model                                        |

---

## 7. Spesifikasi Non-Fungsional

| ID     | Requirement                                                                    |
|--------|--------------------------------------------------------------------------------|
| NF-01  | **Responsif** — tampilan optimal di desktop (1920px), tablet (768px), mobile (360px) |
| NF-02  | **Performa** — First Contentful Paint (FCP) < 1.5 detik                        |
| NF-03  | **Kompatibilitas** — Chrome 90+, Firefox 90+, Edge 90+, Safari 15+            |
| NF-04  | **Aksesibilitas** — WCAG 2.1 Level AA (keyboard navigation, screen reader)    |
| NF-05  | **Keamanan** — HTTPS only, no data storage di server, CORS compliant           |
| NF-06  | **SEO** — meta tags, Open Graph, proper heading structure                      |
| NF-07  | **Offline indicator** — tampilkan pesan jika tidak ada koneksi internet         |

---

## 8. Desain UI/UX

### 8.1 Halaman Utama — Layout

```
+-----------------------------------------------------+
|                    NAVBAR                            |
|  Audio Deepfake Detector            [Dark Mode]      |
+-----------------------------------------------------+
|                                                     |
|              HERO SECTION                           |
|   "Deteksi Audio Deepfake dengan AI"                |
|   "Powered by Hybrid CNN Model"                     |
|                                                     |
+-----------------------------------------------------+
|                                                     |
|   [Upload Tab]    [Record Tab]      <- Tab Switch   |
|                                                     |
|   +-----------------------------------+             |
|   |                                   |             |
|   |    Drag & Drop Area               |             |
|   |    atau                           |             |
|   |    [Choose File]                  |             |
|   |                                   |             |
|   |    Formats: mp3, wav, ogg, ...    |             |
|   +-----------------------------------+             |
|                                                     |
|   +- Audio Preview -------------------+             |
|   |  > ==================== 0:03      |             |
|   +-----------------------------------+             |
|                                                     |
|           [Analisis Sekarang]                        |
|                                                     |
+-----------------------------------------------------+
|                                                     |
|              HASIL PREDIKSI                         |
|                                                     |
|      +---------------------------+                  |
|      |     REAL                   |                  |
|      |   Confidence: 92%          |                  |
|      |                            |                  |
|      |   Real  ========-- 92%     |                  |
|      |   Fake  =--------   8%     |                  |
|      |                            |                  |
|      |  [Analisis Lagi]           |                  |
|      +---------------------------+                  |
|                                                     |
+-----------------------------------------------------+
|              CARA KERJA / FAQ                       |
+-----------------------------------------------------+
|              FOOTER                                 |
+-----------------------------------------------------+
```

### 8.2 Design System

| Element          | Spesifikasi                                                    |
|------------------|----------------------------------------------------------------|
| **Font**         | Inter / Outfit (Google Fonts)                                  |
| **Primary Color**| Deep Blue `#1a1a2e` / Electric Blue `#4361ee`                  |
| **Success**      | Emerald Green `#10b981`                                        |
| **Danger**       | Rose Red `#ef4444`                                             |
| **Background**   | Dark: `#0f0f23` / Light: `#f8fafc`                             |
| **Card Style**   | Glassmorphism (backdrop-filter: blur) dengan border halus      |
| **Animations**   | Smooth transitions 300ms, micro-animations pada hover          |
| **Border Radius**| 12px - 16px untuk card, 8px untuk button                       |
| **Shadows**      | Subtle glow effects, terutama pada hasil prediksi              |

---

## 9. Tech Stack Frontend

| Layer          | Teknologi                                                       |
|----------------|-----------------------------------------------------------------|
| **Markup**     | HTML5 Semantic                                                  |
| **Styling**    | Vanilla CSS (CSS Variables, Flexbox, Grid)                      |
| **Logic**      | Vanilla JavaScript (ES6+)                                      |
| **Audio**      | Web Audio API (visualizer), MediaRecorder API (recording)       |
| **HTTP**       | Fetch API (multipart/form-data)                                 |
| **Hosting**    | Static hosting (GitHub Pages / Vercel / Netlify)                |

---

## 10. API Integration Detail

### 10.1 Upload File Audio

```javascript
async function analyzeAudio(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
        'https://syahhh01-audio-capst-detector.hf.space/predict-audio',
        {
            method: 'POST',
            body: formData
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Terjadi kesalahan');
    }

    return await response.json();
}
```

### 10.2 Kirim Rekaman Audio

```javascript
// Setelah MediaRecorder stop, dapatkan Blob
mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
    analyzeAudio(audioFile);
};
```

### 10.3 Response Handling

```javascript
// Contoh response dari API
const result = {
    filename: "sample.wav",
    prediction: [0.92, 0.08],       // [real_prob, fake_prob]
    label: "real",                    // "real" atau "fake"
    confidence: 0.92,                 // Probabilitas tertinggi
    details: {
        real_probability: 0.92,
        fake_probability: 0.08
    }
};
```

---

## 11. Error Handling Matrix

| Skenario                        | HTTP Code | User Message                                                    | Aksi UI                        |
|---------------------------------|-----------|-----------------------------------------------------------------|--------------------------------|
| File terlalu besar (> 10MB)     | —         | "File terlalu besar. Maksimal 10 MB."                           | Highlight drag-drop area merah |
| Format tidak didukung           | —         | "Format file tidak didukung. Gunakan MP3, WAV, OGG, dll."      | Tampilkan format yang valid    |
| Gagal proses audio di server    | 400       | "File audio tidak dapat diproses. Pastikan file tidak corrupt." | Tombol "Coba Lagi"            |
| Server error                    | 500       | "Server sedang mengalami gangguan. Coba beberapa saat lagi."    | Tombol "Coba Lagi"            |
| Timeout (> 30 detik)            | —         | "Proses terlalu lama. Coba dengan file audio yang lebih kecil." | Tombol "Coba Lagi"            |
| Mikrofon ditolak                | —         | "Akses mikrofon ditolak. Izinkan di pengaturan browser."        | Link ke panduan browser        |
| Mikrofon tidak tersedia         | —         | "Mikrofon tidak ditemukan di perangkat Anda."                   | Sembunyikan tab rekam          |
| Tidak ada koneksi internet      | —         | "Tidak ada koneksi internet. Periksa jaringan Anda."            | Overlay offline indicator      |
| HuggingFace cold start          | —         | "Model sedang dimuat, mohon tunggu... (bisa sampai 1-2 menit)"  | Progress indeterminate         |

---

## 12. Struktur File Proyek

```
web_audio_detector/
├── index.html              # Halaman utama
├── css/
│   └── style.css           # Seluruh styling (design system + komponen)
├── js/
│   ├── app.js              # Logic utama (tab switching, UI state)
│   ├── upload.js           # Logic upload & drag-drop
│   ├── recorder.js         # Logic perekaman suara (MediaRecorder)
│   ├── api.js              # Komunikasi dengan backend API
│   └── visualizer.js       # Audio waveform visualizer (Web Audio API)
├── assets/
│   └── images/             # Icons, illustrations
├── backend-app.py          # Referensi kode backend (tidak di-deploy di sini)
└── PRD.md                  # Dokumen ini
```

---

## 13. Milestones & Timeline

| Phase | Milestone                              | Durasi Estimasi | Deliverable                            |
|-------|----------------------------------------|-----------------|----------------------------------------|
| 1     | Setup Project & Design System          | 1 hari          | HTML skeleton + CSS design system      |
| 2     | Upload Audio Feature                   | 1 hari          | Drag-drop, preview, kirim ke API       |
| 3     | Voice Recording Feature                | 1 hari          | MediaRecorder, visualizer, preview     |
| 4     | Result Display & Visualization         | 1 hari          | Gauge bar, label, confidence, animasi  |
| 5     | Polish, Responsive, Error Handling     | 1 hari          | Dark mode, responsif, error states     |
| 6     | Testing & Deployment                   | 1 hari          | Cross-browser test, deploy ke hosting  |
|       | **Total**                              | **~6 hari**     |                                        |

---

## 14. Risiko & Mitigasi

| Risiko                                         | Dampak  | Mitigasi                                                        |
|------------------------------------------------|---------|-----------------------------------------------------------------|
| HuggingFace Spaces cold start lambat           | Tinggi  | Tampilkan loading message, panggil `GET /` saat page load       |
| CORS blocking dari HuggingFace                 | Tinggi  | Uji CORS, jika perlu gunakan proxy atau hubungi HF support      |
| MediaRecorder API tidak support di semua browser| Sedang | Feature detection, fallback ke upload-only mode                 |
| Audio format tidak didukung oleh torchaudio     | Sedang | Konversi ke WAV di client-side menggunakan Web Audio API        |
| File besar menyebabkan timeout                 | Sedang | Batasi ukuran file (10 MB), compress jika diperlukan            |
| API rate limiting dari HuggingFace             | Rendah  | Debounce submit button, tampilkan cooldown message              |

---

## 15. Acceptance Criteria

Fitur dianggap **selesai** jika memenuhi kriteria berikut:

- [ ] User dapat upload file audio (mp3, wav, ogg, flac, m4a) dan melihat hasil prediksi
- [ ] User dapat merekam suara dari mikrofon dan melihat hasil prediksi
- [ ] Hasil prediksi menampilkan label (real/fake), confidence, dan probabilitas detail
- [ ] Drag-and-drop upload berfungsi
- [ ] Audio preview/player ditampilkan sebelum analisis
- [ ] Loading state ditampilkan selama proses analisis
- [ ] Error handling berfungsi untuk semua skenario di Error Matrix
- [ ] Tampilan responsif di mobile (360px) dan desktop (1920px)
- [ ] Dark mode dan light mode berfungsi
- [ ] Website dapat diakses secara publik melalui URL hosting

---

## 16. Referensi

| Item                   | Link / Detail                                                          |
|------------------------|------------------------------------------------------------------------|
| Backend Endpoint       | `https://syahhh01-audio-capst-detector.hf.space`                       |
| API Docs (Swagger)     | `https://syahhh01-audio-capst-detector.hf.space/docs`                  |
| Backend Source Code    | `backend-app.py` (dalam repo ini)                                      |
| Model Architecture     | HybridAudioCNN (1D CNN waveform + 2D CNN MFCC)                        |
| MediaRecorder API      | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) |
| Web Audio API          | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) |
