#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Transcribe an audio/video file to SRT using faster-whisper.

This script is intentionally Resolve-independent. Run it with a normal Python
environment that has faster-whisper installed.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


DEFAULT_TRANSCRIPTION_SETTINGS: Dict[str, Any] = {
    "audio_input": "",
    "output_srt": "",
    "model": "small",
    "language": "ja",
    "task": "transcribe",
    "device": "cpu",
    "compute_type": "int8",
    "beam_size": 5,
    "vad_filter": True,
    "condition_on_previous_text": True,
    "initial_prompt": "日本語の動画です。句読点を自然に付けてください。",
    "max_line_width": 24,
    "max_line_count": 2,
}


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


def deep_merge(base: Dict[str, Any], overrides: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(base)
    for key, value in overrides.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def load_settings(path: Optional[Path]) -> Dict[str, Any]:
    settings_path = path or (script_dir() / "transcription_settings.json")
    if not settings_path.exists():
        return DEFAULT_TRANSCRIPTION_SETTINGS
    with settings_path.open("r", encoding="utf-8-sig") as f:
        return deep_merge(DEFAULT_TRANSCRIPTION_SETTINGS, json.load(f))


def choose_audio_file() -> Path:
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
    raise RuntimeError("音声/動画ファイルが指定されていません。")


def seconds_to_srt_time(seconds: float) -> str:
    milliseconds = int(round(seconds * 1000))
    hours, remainder = divmod(milliseconds, 3600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def wrap_line(text: str, max_width: int, max_lines: int) -> str:
    text = re.sub(r"\s+", " ", text.strip())
    if max_width <= 0 or len(text) <= max_width:
        return text

    lines: List[str] = []
    rest = text
    while rest and (max_lines <= 0 or len(lines) < max_lines - 1):
        split_at = max(
            rest.rfind(" ", 0, max_width + 1),
            rest.rfind("　", 0, max_width + 1),
            rest.rfind("、", 0, max_width + 1),
            rest.rfind("。", 0, max_width + 1),
        )
        if split_at < max_width // 2:
            split_at = max_width
        lines.append(rest[:split_at].strip())
        rest = rest[split_at:].strip()
        if len(rest) <= max_width:
            break
    if rest:
        lines.append(rest)
    return "\n".join(line for line in lines if line)


def write_srt(segments: Iterable[Any], output_path: Path, settings: Dict[str, Any]) -> int:
    max_width = int(settings.get("max_line_width", 24))
    max_lines = int(settings.get("max_line_count", 2))
    count = 0
    with output_path.open("w", encoding="utf-8", newline="\n") as f:
        for segment in segments:
            text = wrap_line(str(segment.text), max_width, max_lines)
            if not text:
                continue
            count += 1
            f.write(f"{count}\n")
            f.write(f"{seconds_to_srt_time(float(segment.start))} --> {seconds_to_srt_time(float(segment.end))}\n")
            f.write(text + "\n\n")
    return count


def transcribe_to_srt(input_path: Path, output_path: Path, settings: Dict[str, Any]) -> int:
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError(
            "faster-whisper が見つかりません。install_transcription_deps_windows.ps1 を実行してください。"
        ) from exc

    model_name = str(settings.get("model", "small"))
    language = str(settings.get("language", "ja") or "").strip() or None
    task = str(settings.get("task", "transcribe"))
    device = str(settings.get("device", "cpu"))
    compute_type = str(settings.get("compute_type", "int8"))
    initial_prompt = settings.get("initial_prompt") or None

    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, _info = model.transcribe(
        str(input_path),
        language=language,
        task=task,
        beam_size=int(settings.get("beam_size", 5)),
        vad_filter=bool(settings.get("vad_filter", True)),
        condition_on_previous_text=bool(settings.get("condition_on_previous_text", True)),
        initial_prompt=str(initial_prompt) if initial_prompt is not None else None,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    return write_srt(segments, output_path, settings)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate SRT subtitles from audio/video.")
    parser.add_argument("--input", dest="input_path", help="Audio/video file path")
    parser.add_argument("--output", dest="output_path", help="Output SRT file path")
    parser.add_argument("--settings", dest="settings_path", help="transcription_settings.json path")
    parser.add_argument("--model", help="Whisper model name, e.g. small, medium, large-v3")
    parser.add_argument("--language", help="Language code, e.g. ja, en. Empty means auto-detect")
    parser.add_argument("--device", help="cpu or cuda")
    parser.add_argument("--compute-type", dest="compute_type", help="int8, float16, int8_float16, etc.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    settings = load_settings(Path(args.settings_path) if args.settings_path else None)
    for key, value in (
        ("model", args.model),
        ("language", args.language),
        ("device", args.device),
        ("compute_type", args.compute_type),
    ):
        if value is not None:
            settings[key] = value

    configured_input = str(args.input_path or settings.get("audio_input") or "").strip()
    if configured_input:
        input_path = Path(configured_input).expanduser()
    else:
        input_path = choose_audio_file()
    if not input_path.exists():
        raise RuntimeError(f"Audio/video file does not exist: {input_path}")

    configured_output = str(args.output_path or settings.get("output_srt") or "").strip()
    output_path = (
        Path(configured_output).expanduser()
        if configured_output
        else writable_dir() / "generated_srt" / f"{input_path.stem}.whisper.srt"
    )

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Model: {settings.get('model')} / language: {settings.get('language')} / device: {settings.get('device')}")
    count = transcribe_to_srt(input_path, output_path, settings)
    print(f"Done. Wrote {count} subtitle segments.")


if __name__ == "__main__":
    main()
