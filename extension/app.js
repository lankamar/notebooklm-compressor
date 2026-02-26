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
let selectedFiles = [];
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
            if (selectedFiles.length > 0) compressBtn.disabled = false;
        } else throw new Error();
    } catch (e) {
        serverOnline = false;
        serverDot.className = 'status-dot offline tooltip';
        serverStatusText.innerText = 'Servidor Local Desconectado';
        tooltiptext.innerText = 'Doble clic en INICIAR_SERVIDOR_OCULTO.vbs.';
        compressBtn.disabled = true;
    }
}

// File Events
function handleFiles(files) {
    if (!files || files.length === 0) return;
    selectedFiles = Array.from(files);

    if (selectedFiles.length === 1) {
        fileNameDisplay.innerText = selectedFiles[0].name;
        fileSizeDisplay.innerText = formatBytes(selectedFiles[0].size);
    } else {
        fileNameDisplay.innerText = `${selectedFiles.length} archivos seleccionados`;
        const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
        fileSizeDisplay.innerText = `Peso total: ${formatBytes(totalSize)}`;
    }

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
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFiles(e.target.files); });

// Compress Logic (Sequential Queue)
compressBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    compressBtn.disabled = true;
    dropZone.classList.add('hidden');
    progressContainer.classList.remove('hidden');

    // Process files one by one to avoid memory overload
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        statusText.innerText = `[${i + 1}/${selectedFiles.length}] Transfiriendo ${file.name}...`;
        progressFill.classList.remove('indeterminate');
        progressFill.style.width = '5%';
        progressFill.style.background = 'linear-gradient(90deg, #6366f1, #ec4899)';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${SERVER_URL}/compress`, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Error al iniciar compresión');

            const data = await response.json();
            const jobId = data.job_id;
            const outputFilename = data.output_filename;

            // Wait for completion using a Promise wrapper around setInterval
            await new Promise((resolve, reject) => {
                const interval = setInterval(async () => {
                    try {
                        const res = await fetch(`${SERVER_URL}/status/${jobId}`);
                        if (!res.ok) return;
                        const statusData = await res.json();

                        if (statusData.status === "processing" || statusData.status === "uploading") {
                            let progress = statusData.progress || 0;
                            progressFill.style.width = `${Math.max(5, progress)}%`;
                            statusText.innerText = `[${i + 1}/${selectedFiles.length}] ${progress}% - Comprimiendo ${file.name}...`;
                        } else if (statusData.status === "completed") {
                            clearInterval(interval);

                            // Ask user where to save it
                            chrome.downloads.download({
                                url: `${SERVER_URL}/download/${jobId}`,
                                filename: outputFilename,
                                saveAs: true
                            });

                            resolve(); // Continue to next file
                        } else if (statusData.status === "error") {
                            clearInterval(interval);
                            reject(new Error(statusData.error || "Falla en FFmpeg"));
                        }
                    } catch (pollErr) {
                        // Ignore temporary fetch failures
                    }
                }, 1000); // 1-second polling
            });

        } catch (error) {
            progressFill.style.background = '#ef4444'; // Red
            progressFill.style.width = '100%';
            statusText.innerText = `Error con ${file.name}: ${error.message}`;
            compressBtn.disabled = false;
            compressBtn.innerText = 'Reintentar fallidos';
            selectedFiles = selectedFiles.slice(i); // Keep only failed/remaining files for retry
            return; // Stop the queue
        }
    }

    // All files completed
    progressFill.style.width = '100%';
    progressFill.style.background = '#10b981'; // Green
    statusText.innerText = `100% - ¡${selectedFiles.length} Archivos procesados de un tirón!`;

    compressBtn.classList.add('hidden');
    successButtons.classList.remove('hidden');
});

// Reset UI
newCompressBtn.addEventListener('click', () => {
    selectedFiles = [];
    dropZone.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    progressContainer.classList.add('hidden');
    successButtons.classList.add('hidden');
    compressBtn.classList.remove('hidden');
    compressBtn.innerText = 'Comprimir Archivos';
    compressBtn.disabled = true;

    // reset input so the same files can't cause issues if selected again
    fileInput.value = '';
});

checkServerStatus();
setInterval(checkServerStatus, 5000);
