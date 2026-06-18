#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
DaVinci Resolve launcher: audio/video -> SRT -> Text+ subtitle clips.

Install this file alongside TextPlusSubtitleGenerator.py in Resolve's
Fusion Scripts/Utility folder.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict


def script_dir() -> Path:
    try:
        path = Path(__file__).resolve().parent
        if path.exists() and path.name == "TextPlusSubtitleGenerator":
            return path
    except NameError:
        pass

    appdata = os.environ.get("APPDATA")
    if appdata:
        installed = (
            Path(appdata)
            / "Blackmagic Design"
            / "DaVinci Resolve"
            / "Support"
            / "Fusion"
            / "Scripts"
            / "Utility"
            / "TextPlusSubtitleGenerator"
        )
        if installed.exists():
            return installed
    return Path.cwd()


def writable_dir() -> Path:
    appdata = os.environ.get("APPDATA")
    if appdata:
        path = (
            Path(appdata)
            / "Blackmagic Design"
            / "DaVinci Resolve"
            / "Support"
            / "Fusion"
            / "Scripts"
            / "Utility"
            / "TextPlusSubtitleGenerator"
        )
    else:
        path = script_dir()
    path.mkdir(parents=True, exist_ok=True)
    return path


def load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def choose_audio_file(configured: str) -> Path:
    if configured:
        path = Path(configured).expanduser()
        if path.exists():
            return path

    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        selected = filedialog.askopenfilename(
            title="音声または動画ファイルを選択",
            filetypes=[
                ("Audio/Video", "*.wav *.mp3 *.m4a *.aac *.flac *.mp4 *.mov *.mkv *.avi"),
                ("All files", "*.*"),
            ],
        )
        root.destroy()
        if selected:
            return Path(selected)
    except Exception:
        pass

    raise RuntimeError("transcription_settings.json の audio_input に音声/動画ファイルの絶対パスを設定してください。")


def show_error(message: str) -> None:
    print(message)
    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("Audio To Text+ Subtitle Generator", message)
        root.destroy()
    except Exception:
        pass


def run_transcription(audio_path: Path, output_srt: Path, settings_path: Path, settings: Dict[str, Any]) -> None:
    python_executable = str(settings.get("python_executable", "python") or "python")
    transcribe_script = script_dir() / "TranscribeAudioToSrt.py"
    command = [
        python_executable,
        str(transcribe_script),
        "--input",
        str(audio_path),
        "--output",
        str(output_srt),
        "--settings",
        str(settings_path),
    ]
    completed = subprocess.run(
        command,
        cwd=str(script_dir()),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        encoding="utf-8",
        errors="replace",
    )
    log_path = writable_dir() / "transcription_runner.log"
    log_path.write_text(completed.stdout, encoding="utf-8")
    if completed.returncode != 0:
        raise RuntimeError(
            "音声認識に失敗しました。transcription_runner.log を確認してください。\n\n"
            + completed.stdout[-1200:]
        )


def main() -> None:
    root = script_dir()
    settings_path = root / "transcription_settings.json"
    transcription_settings = load_json(settings_path)
    audio_path = choose_audio_file(str(transcription_settings.get("audio_input", "")).strip())

    configured_output = str(transcription_settings.get("output_srt", "")).strip()
    output_srt = (
        Path(configured_output).expanduser()
        if configured_output
        else writable_dir() / "generated_srt" / f"{audio_path.stem}.whisper.srt"
    )

    run_transcription(audio_path, output_srt, settings_path, transcription_settings)

    sys.path.insert(0, str(root))
    import TextPlusSubtitleGenerator

    TextPlusSubtitleGenerator.set_resolve_context(globals())
    textplus_settings = TextPlusSubtitleGenerator.load_settings()
    textplus_settings["input_srt"] = str(output_srt)
    TextPlusSubtitleGenerator.generate_textplus_subtitles(output_srt, textplus_settings)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        show_error(str(exc))
        raise
