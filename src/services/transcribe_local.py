#!/usr/bin/env python3
# Transcripción local gratuita de notas de voz con faster-whisper.
# Uso: python transcribe_local.py <archivo_audio> [idioma]
import sys
from faster_whisper import WhisperModel

_model = None

def get_model():
    global _model
    if _model is None:
        # tiny = rápido y ligero; suficiente para español en notas cortas.
        _model = WhisperModel("tiny", device="cpu", compute_type="int8")
    return _model

def main():
    if len(sys.argv) < 2:
        print("USO: transcribe_local.py <audio> [idioma]")
        sys.exit(1)
    path = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 else "es"
    segments, info = get_model().transcribe(path, language=lang, beam_size=1, vad_filter=True)
    text = " ".join(seg.text.strip() for seg in segments if seg.text and seg.text.strip())
    print(text.strip())

if __name__ == "__main__":
    main()
