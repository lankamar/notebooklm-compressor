# NotebookLM Media Compressor 🚀

A highly efficient, privacy-first, local audio and video compressor designed specifically to bypass NotebookLM's file size limits without sacrificing AI transcription quality.

## The Problem
Google's NotebookLM is an incredible AI tool, but it has a strict **200MB limit** per source. Uploading hours of high-quality video or audio directly is impossible, and using cloud converters is slow, compromises privacy, and often fails due to browser memory crashes.

## The Solution
This project provides a **100% local, ultra-fast compression pipeline** that runs on your own hardware. By intelligently downsampling media to the exact specifications optimized for Whisper and modern AI voice models (16kHz, Mono, 32kbps), it achieves massive file size reductions.

### 📈 Real-World Performance Metrics
In our stress tests, the compressor achieved:
- **Original File:** `1.57 GB` Educational `.mp4` Video (Duration: 2h 40m).
- **Compressed Output:** `~38.0 MB` `.mp3` Audio (Easily fits NotebookLM's 200MB limit).
- **Processing Time:** `~5 minutes` (Processed 100% locally).
- **Quality:** Superior transcription accuracy. By pre-processing the audio to 16kHz (the native frequency for most LLM voice models), the AI avoids on-the-fly downsampling errors, resulting in near-perfect text extraction.

---

## 🏗️ Architecture

The project consists of two highly optimized components to prevent browser memory exhaustion (Chrome tabs crashing on >2GB files):

1. **Python FastAPI Backend (The Engine):** 
   A lightweight local server that receives files via streaming directly to the hard drive, avoiding RAM saturation. It dispatches asynchronous FFmpeg background tasks to compress the media.

2. **Chrome Extension (The UI):** 
   A sleek, modern Glassmorphism interface. It uses `FormData` and `fetch` to stream files to the backend efficiently. Features real-time FFmpeg progress polling and native Chrome "Save As" dialogues.

---

## ⚙️ Installation & Usage

### 1. Prerequisites
- Python 3.8+
- [FFmpeg](https://ffmpeg.org/download.html) installed and added to your system's PATH.

### 2. Start the Backend Server
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```
*The server will start on `http://127.0.0.1:8000`.*

### 3. Install the Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top right corner).
3. Click **Load unpacked** and select the `extension` folder from this repository.

### 4. (Bonus) Windows Native Right-Click Integration
Want to compress files without even opening Chrome?
1. Edit the paths inside `install_context_menu.reg` to point to your local installation directory.
2. Double-click the `.reg` file to add it to your registry.
3. Now you can right-click any `.mp4` or `.mp3` file in Windows and select **"Comprimir para NotebookLM"**.

---

## 🛡️ Privacy
**100% Local.** No files are ever uploaded to the cloud. Your data remains entirely on your machine.
