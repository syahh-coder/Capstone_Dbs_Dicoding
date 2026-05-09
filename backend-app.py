import os
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
import torch
import torch.nn as nn
import torchaudio
import torchcodec  # Added as requested to handle audio parsing
import soundfile  # noqa: F401  — diperlukan sebagai backend torchaudio
import numpy as np

app = FastAPI()

# =============== KONFIGURASI ==================
SR = 16000
N_MFCC = 40
N_MELS = 64
# Sesuai urutan label pada dataset (0: real, 1: fake)
LABELS = ["real", "fake"]

# =============== ARSITEKTUR MODEL ==================
class HybridAudioCNN(nn.Module):
    def __init__(self, num_classes=2):
        super().__init__()
        # 1D CNN for waveform
        self.waveform_branch = nn.Sequential(
            nn.Conv1d(1, 32, 5, stride=2, padding=2), nn.BatchNorm1d(32), nn.ReLU(),
            nn.Conv1d(32, 64, 5, stride=2, padding=2), nn.BatchNorm1d(64), nn.ReLU(),
            nn.Conv1d(64, 128, 5, stride=2, padding=2), nn.BatchNorm1d(128), nn.ReLU(),
            nn.AdaptiveAvgPool1d(32)   # -> [B,128,32]
        )
        # 2D CNN for MFCC
        self.mfcc_branch = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(),
            nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(),
            nn.AdaptiveAvgPool2d((8, 8))   # -> [B,128,8,8]
        )
        self.classifier = nn.Sequential(
            nn.Linear(128 * (32 + 8*8), 256),
            nn.ReLU(), nn.Dropout(0.4),
            nn.Linear(256, num_classes)
        )

    def forward(self, waveform, mfcc):
        x1 = waveform.unsqueeze(1)                 
        x1 = self.waveform_branch(x1)              
        x1 = x1.flatten(1)                         

        x2 = mfcc.unsqueeze(1)                     
        x2 = self.mfcc_branch(x2)                  
        x2 = x2.flatten(1)                         

        x = torch.cat([x1, x2], dim=1)
        return self.classifier(x)

# =============== INISIALISASI MODEL ==================
model = HybridAudioCNN(num_classes=2)
# Pastikan file best_hybrid_cnn.pth (atau last_model.pth) ada di folder yang sama
try:
    model.load_state_dict(torch.load("best_hybrid_cnn.pth", map_location=torch.device('cpu')))
    model.eval()
except Exception as e:
    print(f"Peringatan: Gagal memuat model. Pastikan file best_hybrid_cnn.pth tersedia. Error: {e}")

# =============== AUDIO PREPROCESSING ==================
def load_and_preprocess_audio(file_path):
    # Load audio (will use torchcodec automatically if available)
    waveform, sample_rate = torchaudio.load(file_path)
    
    # Konversi ke Mono jika Stereo
    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)
        
    # Resample ke target Sample Rate (16000)
    if sample_rate != SR:
        resample_transform = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=SR)
        waveform = resample_transform(waveform)
        
    waveform = waveform.squeeze(0) # Bentuk menjadi [T]

    # Komputasi MFCC
    mfcc_transform = torchaudio.transforms.MFCC(
        sample_rate=SR, n_mfcc=N_MFCC,
        melkwargs={
            "n_fft": 512,
            "n_mels": N_MELS,
            "hop_length": 160,
            "f_min": 80,
            "f_max": 7600
        }
    )
    mfcc = mfcc_transform(waveform)
    
    # Normalisasi MFCC
    mfcc = (mfcc - mfcc.mean()) / (mfcc.std() + 1e-6)
    
    return waveform, mfcc

# =============== API ENDPOINTS ==================
@app.get("/")
async def root():
    return {"message": "Audio Deepfake Detector (Hybrid CNN) API is running!"}

@app.post("/predict-audio")
async def predict_audio(file: UploadFile = File(...)):
    # 1. Simpan file yang diunggah ke temporary file agar bisa dibaca torchaudio
    try:
        ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
        if not ext:
            ext = ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_file:
            tmp_file.write(await file.read())
            tmp_path = tmp_file.name
    except Exception as e:
        raise HTTPException(status_code=500, detail="Gagal menyimpan file audio sementara.")

    # 2. Proses Audio dan Hapus Temp File
    try:
        waveform, mfcc = load_and_preprocess_audio(tmp_path)
    except Exception as e:
        os.remove(tmp_path) # Bersihkan file error
        raise HTTPException(status_code=400, detail=f"Gagal memproses file audio. Pastikan file valid. Detail: {str(e)}")
    
    os.remove(tmp_path) # Bersihkan file berhasil

    # 3. Bentuk ulang tensor untuk input model [Batch, ...]
    waveform_tensor = waveform.unsqueeze(0) # [1, T]
    mfcc_tensor = mfcc.unsqueeze(0)         # [1, F, time]

    # 4. Inferensi Model
    with torch.no_grad():
        output = model(waveform_tensor, mfcc_tensor)
        probs = torch.softmax(output, dim=1)[0].numpy().tolist()

    # 5. Ekstrak Hasil
    pred_idx = int(np.argmax(probs))
    pred_label = LABELS[pred_idx]
    confidence = probs[pred_idx]

    return {
        "filename": file.filename,
        "prediction": probs,
        "label": pred_label,
        "confidence": confidence,
        "details": {
            "real_probability": probs[0],
            "fake_probability": probs[1]
        }
    }