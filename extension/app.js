const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileNameDisplay = document.getElementById('file-name');
const fileSizeDisplay = document.getElementById('file-size');
const compressBtn = document.getElementById('compress-btn');
const newCompressBtn = document.getElementById('new-compress-btn');
const successButtons = document.getElementById('success-buttons');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const statusText = document.getElementById('status-text');
const serverDot = document.getElementById('server-dot');
const serverStatusText = document.getElementById('server-status-text');
const tooltiptext = document.querySelector('.tooltiptext');

const SERVER_URL = 'http://127.0.0.1:8000';
let selectedFile = null;
let serverOnline = false;

// Format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Ping Python Server
async function checkServerStatus() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(`${SERVER_URL}/ping`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            serverOnline = true;
            serverDot.className = 'status-dot online tooltip';
            serverStatusText.innerText = 'Servidor Local Conectado';
            tooltiptext.innerText = 'Listo.';
            if (selectedFile) compressBtn.disabled = false;
        } else throw new Error();
    } catch (e) {
        serverOnline = false;
        serverDot.className = 'status-dot offline tooltip';
        serverStatusText.innerText = 'Servidor Local Desconectado';
        tooltiptext.innerText = 'Inciar uvicorn server:app --reload en consola.';
        compressBtn.disabled = true;
    }
}

// File Events
function handleFile(file) {
    if (!file) return;
    selectedFile = file;
    fileNameDisplay.innerText = file.name;
    fileSizeDisplay.innerText = formatBytes(file.size);
    fileInfo.classList.remove('hidden');
    progressContainer.classList.add('hidden');
    successButtons.classList.add('hidden');
    compressBtn.classList.remove('hidden');

    if (serverOnline) compressBtn.disabled = false;
}

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });

// Compress Logic
compressBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    compressBtn.disabled = true;
    dropZone.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    statusText.innerText = '0% - Transfiriendo archivo al servidor local...';
    progressFill.classList.remove('indeterminate');
    progressFill.style.width = '5%';
    progressFill.style.background = 'linear-gradient(90deg, #6366f1, #ec4899)'; // reset color

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const response = await fetch(`${SERVER_URL}/compress`, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Error al iniciar compresión');

        const data = await response.json();
        const jobId = data.job_id;
        const outputFilename = data.output_filename;

        // Poll for progress
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${SERVER_URL}/status/${jobId}`);
                if (!res.ok) return;
                const statusData = await res.json();

                if (statusData.status === "processing" || statusData.status === "uploading") {
                    let progress = statusData.progress || 0;
                    progressFill.style.width = `${Math.max(5, progress)}%`;
                    statusText.innerText = `${progress}% - Comprimiendo (reduciendo sample rate a 16kHz)...`;
                } else if (statusData.status === "completed") {
                    clearInterval(interval);
                    progressFill.style.width = '100%';
                    progressFill.style.background = '#10b981'; // Green
                    statusText.innerText = '100% - ¡Comprimido! Por favor elegí dónde guardar el archivo pequeño.';

                    // Trigger native save dialog using extension downloads API
                    chrome.downloads.download({
                        url: `${SERVER_URL}/download/${jobId}`,
                        filename: outputFilename,
                        saveAs: true // Forces the "Save As" dialogue
                    });

                    // Update UI to show NotebookLM button
                    compressBtn.classList.add('hidden');
                    successButtons.classList.remove('hidden');

                } else if (statusData.status === "error") {
                    clearInterval(interval);
                    throw new Error(statusData.error || "Falla en FFmpeg");
                }
            } catch (pollErr) {
                // Ignore temporary fetch failures during polling
            }
        }, 1000);

    } catch (error) {
        progressFill.style.background = '#ef4444'; // Red
        progressFill.style.width = '100%';
        statusText.innerText = `Error: ${error.message}`;
        compressBtn.disabled = false;
        compressBtn.innerText = 'Reintentar';
    }
});

// Reset UI
newCompressBtn.addEventListener('click', () => {
    selectedFile = null;
    dropZone.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    progressContainer.classList.add('hidden');
    successButtons.classList.add('hidden');
    compressBtn.classList.remove('hidden');
    compressBtn.innerText = 'Comprimir Archivo';
    compressBtn.disabled = true;
});

checkServerStatus();
setInterval(checkServerStatus, 5000);
