import sys
import os
import subprocess
from pathlib import Path

# Provide absolute paths to avoid issues when running from arbitrary folders
OUTPUT_DIR = Path.home() / "Documents" / "NotebookLM_Audio"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def compress_file(input_path):
    if not os.path.exists(input_path):
        print(f"Error: File '{input_path}' not found.")
        input("Press Enter to exit...")
        return

    file_name = os.path.basename(input_path)
    base_name = os.path.splitext(file_name)[0]
    output_filename = f"{base_name}_compressed_16kHz.mp3"
    output_path = OUTPUT_DIR / output_filename
    
    print("=" * 50)
    print(f"  NotebookLM Compressor  ")
    print("=" * 50)
    print(f"\nProcessing: {file_name}")
    print(f"Destination: {output_path}")
    print("\nCompressing... Please wait (this window will close when finished).\n")
    
    ffmpeg_cmd = [
        "ffmpeg",
        "-i", input_path,
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "libmp3lame",
        "-b:a", "32k",
        "-y", 
        str(output_path)
    ]

    try:
        # Run FFmpeg and wait for completion
        subprocess.run(ffmpeg_cmd, check=True)
        print(f"\n✅ Compression complete!")
        print(f"Saved to: {output_path}")
        
        # Open the folder automatically in Windows Explorer and select the new file
        subprocess.run(f'explorer /select,"{output_path}"')
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ FFmpeg Error: {e}")
        input("Press Enter to exit...")
    except FileNotFoundError:
        print("\n❌ FFmpeg not found! Please make sure FFmpeg is installed and added to the PATH.")
        input("Press Enter to exit...")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        compress_file(input_file)
    else:
        print("Usage: python context_menu_script.py <path_to_video_or_audio_file>")
        input("Press Enter to exit...")
