import os
import subprocess
import shutil
import tempfile
import uuid
import asyncio
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path

app = FastAPI(title="NotebookLM Audio Compressor")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = Path.home() / "Documents" / "NotebookLM_Audio"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Global dictionary to track job progress
jobs = {}

def get_seconds(time_str):
    """Convert HH:MM:SS.ms to seconds"""
    try:
        h, m, s = time_str.split(':')
        return int(h)*3600 + int(m)*60 + float(s)
    except:
        return 0

def process_video_sync(input_path: str, output_path: str, job_id: str):
    jobs[job_id]["status"] = "processing"
    jobs[job_id]["progress"] = 0

    ffmpeg_cmd = [
        "ffmpeg",
        "-i", input_path,
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "libmp3lame",
        "-b:a", "32k",
        "-y", 
        output_path
    ]

    try:
        # Use simple subprocess redirection
        process = subprocess.Popen(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )

        duration_secs = 0

        # Read stderr line by line since ffmpeg logs progress there
        for line in process.stderr:
            if "Duration:" in line and duration_secs == 0:
                # Example: Duration: 00:03:45.12, start: 0.000000, bitrate: 2167 kb/s
                try:
                    time_str = line.split("Duration:")[1].split(",")[0].strip()
                    duration_secs = get_seconds(time_str)
                except:
                    pass

            if "time=" in line and duration_secs > 0:
                # Example: size=    1536kB time=00:00:15.55 bitrate= 809.0kbits/s speed=30.6x
                try:
                    time_str = line.split("time=")[1].split(" ")[0].strip()
                    current_secs = get_seconds(time_str)
                    progress = int((current_secs / duration_secs) * 100)
                    jobs[job_id]["progress"] = min(progress, 99)
                except:
                    pass

        process.wait()
        
        if process.returncode == 0:
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["progress"] = 100
            jobs[job_id]["result"] = output_path
        else:
            jobs[job_id]["status"] = "error"
            jobs[job_id]["error"] = "FFmpeg fracasó."

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
    finally:
        # Cleanup temp file
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except:
                pass


@app.post("/compress")
async def start_compression(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Receives the file, saves it, and starts FFmpeg in the background."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Ningún archivo enviado")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "uploading", "progress": 0, "result": None, "error": None}

    base_name = os.path.splitext(file.filename)[0]
    output_filename = f"{base_name}_comprimido.mp3"
    output_path = OUTPUT_DIR / output_filename
    
    # Save the huge file securely to a temp path
    fd, temp_input_path = tempfile.mkstemp(suffix=os.path.splitext(file.filename)[1])
    try:
        with os.fdopen(fd, 'wb') as temp_file:
            shutil.copyfileobj(file.file, temp_file)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al escribir archivo temporal")
    finally:
        file.file.close()

    # Dispatch to background task
    background_tasks.add_task(process_video_sync, temp_input_path, str(output_path), job_id)

    return {"job_id": job_id, "output_filename": output_filename}


@app.get("/status/{job_id}")
def check_status(job_id: str):
    """Returns the current progress of the FFmpeg job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return jobs[job_id]


@app.get("/download/{job_id}")
def download_file(job_id: str):
    """Downloads the completed MP3."""
    if job_id not in jobs or jobs[job_id]["status"] != "completed":
        raise HTTPException(status_code=404, detail="Archivo no listo")
        
    file_path = jobs[job_id]["result"]
    filename = os.path.basename(file_path)
    return FileResponse(path=file_path, media_type='audio/mpeg', filename=filename)


@app.get("/ping")
def ping():
    return {"status": "ok", "message": "Server is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
