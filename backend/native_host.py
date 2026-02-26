import sys
import json
import struct
import subprocess
import os

def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        return None
    message_length = struct.unpack('@I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def send_message(message):
    encoded = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('@I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

def main():
    try:
        msg = read_message()
        if msg and msg.get("action") == "start_server":
            # Launch the vbs script silently
            script_dir = os.path.dirname(os.path.abspath(__file__))
            vbs_path = os.path.join(script_dir, "INICIAR_SERVIDOR_OCULTO.vbs")
            subprocess.Popen(["wscript.exe", vbs_path], creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP)
            send_message({"status": "starting"})
        elif msg and msg.get("action") == "ping":
            send_message({"status": "ok"})
        else:
            send_message({"status": "unknown"})
    except Exception as e:
        send_message({"status": "error", "error": str(e)})

if __name__ == '__main__':
    main()
