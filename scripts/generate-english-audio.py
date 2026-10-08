#!/usr/bin/env python3
"""Regenerate the public lesson clips with installed, offline FFmpeg + Flite.
No network calls, package installation, or learner/progress input.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'audio' / 'english'
html = (ROOT / 'english.html').read_text()
data = json.loads(re.search(r'const D=(\{.*?\}); const U=', html).group(1))
VOICE = 'slt'
FILTER = 'atempo=0.88,loudnorm=I=-18:TP=-2:LRA=7,adelay=80:all=1,apad=pad_dur=0.18'

def spoken_text(text):
    text = re.sub(r'\bsb\s*/\s*sth\b', 'somebody or something', text, flags=re.I)
    text = re.sub(r'\bsb\b', 'somebody', text, flags=re.I)
    text = re.sub(r'\bsth\b', 'something', text, flags=re.I)
    # A documented approximation: Flite maps Daming to /d ae m ih ng/,
    # while the separated alias yields /d aa m ih ng/. Display/answers stay intact.
    return re.sub(r'\bDaming\b', 'Dah Ming', text)

OUTPUT.mkdir(parents=True, exist_ok=True)
tracks = []
with tempfile.TemporaryDirectory(prefix='english-audio-') as temp:
    source = Path(temp) / 'text.txt'
    for group, rows in data.items():
        for index, row in enumerate(rows, 1):
            spoken = spoken_text(row[1])
            source.write_text(spoken, encoding='utf-8')
            filename = f'{group}-{index:02d}.mp3'
            destination = OUTPUT / filename
            subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
                '-f', 'lavfi', '-i', f'flite=textfile={source}:voice={VOICE}',
                '-af', FILTER, '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k',
                '-map_metadata', '-1', str(destination)], check=True)
            probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error',
                '-show_entries', 'format=duration', '-of', 'json', str(destination)]))
            tracks.append({'group': group, 'index': index, 'text': row[1], 'spokenText': spoken,
                'file': filename, 'durationSeconds': round(float(probe['format']['duration']), 3),
                'bytes': destination.stat().st_size,
                'sha256': hashlib.sha256(destination.read_bytes()).hexdigest()})
manifest = {'version': 1, 'engine': 'Flite via installed FFmpeg flite filter',
    'voice': VOICE, 'accent': 'US English, synthetic female voice',
    'audioFormat': 'MP3, mono, 22050 Hz, 48 kbit/s', 'filter': FILTER,
    'source': 'Existing public English lesson text only; no learner data.', 'tracks': tracks}
(OUTPUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'Generated {len(tracks)} offline clips; {sum(t["bytes"] for t in tracks)} bytes total.')
