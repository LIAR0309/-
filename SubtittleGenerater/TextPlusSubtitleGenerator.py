#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
DaVinci Resolve Text+ subtitle generator.

Install this file into Resolve's Fusion Scripts/Utility folder, then run it from
Workspace > Scripts > Utility > TextPlusSubtitleGenerator.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


DEFAULT_SETTINGS: Dict[str, Any] = {
    "input_srt": "",
    "title_name": "Text+",
    "effect_preset": "bold_outline",
    "effect_preset_cycle": [],
    "effect_auto_rules_enabled": False,
    "font_preset": "",
    "font_preset_cycle": [],
    "gap_frames": 0,
    "minimum_duration_frames": 2,
    "max_chars_per_line": 24,
    "wrap_enabled": True,
    "replace_newlines_with_spaces_before_wrap": False,
    "text": {
        "font": "Noto Sans CJK JP",
        "style": "Regular",
        "size": 0.075,
        "line_spacing": 1.0,
        "tracking": 1.0,
        "all_caps": False,
    },
    "layout": {
        "horizontal_anchor": 0.5,
        "vertical_anchor": 0.86,
        "alignment": "center",
    },
    "color": {
        "red": 1.0,
        "green": 1.0,
        "blue": 1.0,
        "alpha": 1.0,
    },
    "outline": {
        "enabled": True,
        "red": 0.0,
        "green": 0.0,
        "blue": 0.0,
        "alpha": 1.0,
        "width": 0.018,
    },
    "shadow": {
        "enabled": True,
        "red": 0.0,
        "green": 0.0,
        "blue": 0.0,
        "alpha": 0.45,
        "offset_x": 0.006,
        "offset_y": -0.006,
        "blur": 0.35,
    },
    "background": {
        "enabled": False,
        "red": 0.0,
        "green": 0.0,
        "blue": 0.0,
        "alpha": 0.45,
        "padding": 0.08,
        "roundness": 0.18,
    },
    "logging": {
        "write_log_file": True,
        "log_file": "",
    },
}

VTUBER_EFFECT_PRESETS: Dict[str, Dict[str, Any]] = {
    "bold_outline": {
        "aliases": ["太縁字幕", "太縁", "basic", "default"],
        "text": {"size": 0.078, "style": "Bold", "tracking": 1.0},
        "layout": {"horizontal_anchor": 0.5, "vertical_anchor": 0.86, "alignment": "center"},
        "color": {"red": 1.0, "green": 1.0, "blue": 1.0, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.022, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.55, "offset_x": 0.007, "offset_y": -0.007, "blur": 0.28},
        "background": {"enabled": False},
        "animation": {"type": "fade_pop", "frames": 4, "start_size_factor": 0.96},
    },
    "keyword_highlight": {
        "aliases": ["キーワード色分け字幕", "キーワード", "keyword"],
        "text": {"size": 0.082, "style": "Bold"},
        "color": {"red": 1.0, "green": 0.92, "blue": 0.1, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.024, "red": 0.02, "green": 0.02, "blue": 0.02, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.6, "offset_x": 0.007, "offset_y": -0.007, "blur": 0.26},
        "animation": {"type": "pop", "frames": 5, "peak_size_factor": 1.12},
    },
    "impact_zoom": {
        "aliases": ["ドンッ！拡大", "ドンッ拡大", "ドン", "impact", "don"],
        "text": {"size": 0.105, "style": "Bold"},
        "layout": {"horizontal_anchor": 0.5, "vertical_anchor": 0.5, "alignment": "center"},
        "color": {"red": 1.0, "green": 0.98, "blue": 0.86, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.032, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.75, "offset_x": 0.01, "offset_y": -0.01, "blur": 0.22},
        "animation": {"type": "impact_zoom", "frames": 6, "start_size_factor": 0.78, "peak_size_factor": 1.22},
    },
    "tremble": {
        "aliases": ["ぷるぷる震え", "震え", "ぷるぷる", "shake", "tremble"],
        "text": {"size": 0.082, "style": "Bold"},
        "color": {"red": 0.9, "green": 0.98, "blue": 1.0, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.023, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.55, "offset_x": 0.006, "offset_y": -0.006, "blur": 0.32},
        "animation": {"type": "tremble", "frames": 16, "amount_x": 0.008, "amount_y": 0.006},
    },
    "tsukkomi_red": {
        "aliases": ["ツッコミ赤文字", "ツッコミ", "赤文字", "red"],
        "text": {"size": 0.092, "style": "Bold"},
        "layout": {"horizontal_anchor": 0.5, "vertical_anchor": 0.78, "alignment": "center"},
        "color": {"red": 1.0, "green": 0.05, "blue": 0.02, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.025, "red": 1.0, "green": 1.0, "blue": 1.0, "alpha": 1.0},
        "shadow": {"enabled": True, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 0.75, "offset_x": 0.008, "offset_y": -0.008, "blur": 0.2},
        "animation": {"type": "slide_in", "frames": 6, "from_x": -0.12},
    },
    "countdown": {
        "aliases": ["カウントダウン", "countdown", "timer"],
        "text": {"size": 0.16, "style": "Bold"},
        "layout": {"horizontal_anchor": 0.5, "vertical_anchor": 0.53, "alignment": "center"},
        "color": {"red": 1.0, "green": 0.18, "blue": 0.08, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.034, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.8, "offset_x": 0.01, "offset_y": -0.012, "blur": 0.18},
        "animation": {"type": "pulse", "frames": 8, "peak_size_factor": 1.18},
    },
    "teaser": {
        "aliases": ["オチ前予告", "予告", "teaser"],
        "text": {"size": 0.072, "style": "Bold", "tracking": 1.02},
        "layout": {"horizontal_anchor": 0.5, "vertical_anchor": 0.17, "alignment": "center"},
        "color": {"red": 1.0, "green": 0.95, "blue": 0.62, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.02, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.65, "offset_x": 0.006, "offset_y": -0.006, "blur": 0.36},
        "background": {"enabled": True, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 0.45, "roundness": 0.05},
        "animation": {"type": "fade_pop", "frames": 8, "start_size_factor": 0.94},
    },
    "typewriter": {
        "aliases": ["一文字ずつ出る字幕", "一文字ずつ", "タイプライター", "typewriter"],
        "text": {"size": 0.076, "style": "Bold", "tracking": 1.04},
        "color": {"red": 1.0, "green": 1.0, "blue": 1.0, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.021, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.5, "offset_x": 0.006, "offset_y": -0.006, "blur": 0.34},
        "animation": {"type": "typewriter", "frames": 18},
    },
    "comment_flow": {
        "aliases": ["コメント風テロップ", "コメント風", "ニコ動", "chat", "comment"],
        "text": {"size": 0.052, "style": "Bold"},
        "layout": {"horizontal_anchor": 1.12, "vertical_anchor": 0.68, "alignment": "left"},
        "color": {"red": 1.0, "green": 1.0, "blue": 1.0, "alpha": 0.92},
        "outline": {"enabled": True, "width": 0.012, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 0.9},
        "shadow": {"enabled": True, "alpha": 0.35, "offset_x": 0.004, "offset_y": -0.004, "blur": 0.22},
        "background": {"enabled": False},
        "animation": {"type": "comment_flow", "frames": 72, "from_x": 1.12, "to_x": -0.2},
    },
    "whisper_small": {
        "aliases": ["ささやき字幕", "小声", "whisper"],
        "text": {"size": 0.052, "style": "Regular", "tracking": 1.08},
        "layout": {"horizontal_anchor": 0.5, "vertical_anchor": 0.82, "alignment": "center"},
        "color": {"red": 0.88, "green": 0.95, "blue": 1.0, "alpha": 0.86},
        "outline": {"enabled": True, "width": 0.012, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 0.8},
        "shadow": {"enabled": True, "alpha": 0.3, "offset_x": 0.004, "offset_y": -0.004, "blur": 0.42},
        "animation": {"type": "fade_pop", "frames": 10, "start_size_factor": 0.98},
    },
    "warning_blink": {
        "aliases": ["警告点滅", "警告", "warning", "alert"],
        "text": {"size": 0.096, "style": "Bold"},
        "layout": {"horizontal_anchor": 0.5, "vertical_anchor": 0.38, "alignment": "center"},
        "color": {"red": 1.0, "green": 0.08, "blue": 0.02, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.028, "red": 1.0, "green": 1.0, "blue": 0.92, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.75, "offset_x": 0.009, "offset_y": -0.009, "blur": 0.18},
        "animation": {"type": "blink", "frames": 18},
    },
    "question_float": {
        "aliases": ["疑問符ふわふわ", "困惑", "？？？", "question"],
        "text": {"size": 0.088, "style": "Bold", "tracking": 1.06},
        "layout": {"horizontal_anchor": 0.5, "vertical_anchor": 0.72, "alignment": "center"},
        "color": {"red": 0.7, "green": 0.95, "blue": 1.0, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.023, "red": 0.0, "green": 0.02, "blue": 0.08, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.45, "offset_x": 0.005, "offset_y": -0.006, "blur": 0.3},
        "animation": {"type": "float", "frames": 18, "amount_y": 0.025},
    },
    "silence_dots": {
        "aliases": ["沈黙テロップ", "間テロップ", "沈黙", "silence"],
        "text": {"size": 0.09, "style": "Bold", "tracking": 1.12},
        "layout": {"horizontal_anchor": 0.5, "vertical_anchor": 0.55, "alignment": "center"},
        "color": {"red": 0.92, "green": 0.92, "blue": 0.92, "alpha": 0.95},
        "outline": {"enabled": True, "width": 0.02, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 0.9},
        "shadow": {"enabled": True, "alpha": 0.55, "offset_x": 0.006, "offset_y": -0.006, "blur": 0.38},
        "animation": {"type": "typewriter", "frames": 14},
    },
    "stamp_pop": {
        "aliases": ["スタンプ風", "草スタンプ", "stamp"],
        "text": {"size": 0.118, "style": "Bold"},
        "layout": {"horizontal_anchor": 0.66, "vertical_anchor": 0.58, "alignment": "center"},
        "color": {"red": 0.05, "green": 1.0, "blue": 0.42, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.03, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.7, "offset_x": 0.012, "offset_y": -0.012, "blur": 0.16},
        "animation": {"type": "impact_zoom", "frames": 5, "start_size_factor": 0.65, "peak_size_factor": 1.18},
    },
    "speaker_blue": {
        "aliases": ["話者青", "青字幕", "speaker_a"],
        "text": {"size": 0.076, "style": "Bold"},
        "layout": {"horizontal_anchor": 0.36, "vertical_anchor": 0.86, "alignment": "left"},
        "color": {"red": 0.6, "green": 0.9, "blue": 1.0, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.021, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.48, "offset_x": 0.006, "offset_y": -0.006, "blur": 0.3},
        "animation": {"type": "slide_in", "frames": 5, "from_x": -0.08},
    },
    "speaker_pink": {
        "aliases": ["話者ピンク", "ピンク字幕", "speaker_b"],
        "text": {"size": 0.076, "style": "Bold"},
        "layout": {"horizontal_anchor": 0.64, "vertical_anchor": 0.78, "alignment": "right"},
        "color": {"red": 1.0, "green": 0.62, "blue": 0.86, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.021, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.48, "offset_x": 0.006, "offset_y": -0.006, "blur": 0.3},
        "animation": {"type": "slide_in", "frames": 5, "from_x": 0.08},
    },
    "black_bar_teaser": {
        "aliases": ["黒帯予告", "映画風予告", "black_bar"],
        "text": {"size": 0.068, "style": "Bold", "tracking": 1.06},
        "layout": {"horizontal_anchor": 0.5, "vertical_anchor": 0.5, "alignment": "center"},
        "color": {"red": 1.0, "green": 0.94, "blue": 0.72, "alpha": 1.0},
        "outline": {"enabled": True, "width": 0.017, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 1.0},
        "shadow": {"enabled": True, "alpha": 0.65, "offset_x": 0.005, "offset_y": -0.005, "blur": 0.34},
        "background": {"enabled": True, "red": 0.0, "green": 0.0, "blue": 0.0, "alpha": 0.72, "roundness": 0.0},
        "animation": {"type": "fade_pop", "frames": 8, "start_size_factor": 0.96},
    },
}

FONT_PRESETS: Dict[str, Dict[str, Any]] = {
    "default_jp": {
        "aliases": ["標準日本語", "default"],
        "text": {"font": "Noto Sans CJK JP", "style": "Regular", "tracking": 1.0},
    },
    "readable_gothic": {
        "aliases": ["読みやすいゴシック", "ゴシック", "gothic"],
        "text": {"font": "BIZ UDPGothic", "style": "Bold", "tracking": 1.0},
    },
    "impact_gothic": {
        "aliases": ["インパクトゴシック", "太ゴシック", "impact_font"],
        "text": {"font": "Yu Gothic", "style": "Bold", "tracking": 1.0},
    },
    "soft_round": {
        "aliases": ["やわらか丸文字", "丸文字", "soft"],
        "text": {"font": "Meiryo", "style": "Bold", "tracking": 1.02},
    },
    "comment_font": {
        "aliases": ["コメント風フォント", "コメント", "chat_font"],
        "text": {"font": "MS PGothic", "style": "Regular", "tracking": 1.0},
    },
    "serif_teaser": {
        "aliases": ["明朝予告", "明朝", "serif"],
        "text": {"font": "BIZ UDPMincho", "style": "Regular", "tracking": 1.08},
    },
    "latin_impact": {
        "aliases": ["英字インパクト", "arial_black"],
        "text": {"font": "Arial Black", "style": "Regular", "tracking": 0.98},
    },
    "tech_clean": {
        "aliases": ["テック字幕", "tech"],
        "text": {"font": "Bahnschrift", "style": "Bold", "tracking": 1.02},
    },
}

AUTO_RULES: Tuple[Tuple[str, str], ...] = (
    (r"^[0-9０-９]+$", "countdown"),
    (r"(危険|警告|注意|まずい|ヤバい|やばい)", "warning_blink"),
    (r"(このあと|数秒後|[0-9０-９]+秒後|伏線|地獄)", "teaser"),
    (r"(草|ｗｗ|www|天才|圧)$", "stamp_pop"),
    (r"(！？|!!|！！|ｗｗ|草|無理|終わった|やば|ヤバ)", "impact_zoom"),
    (r"(いや|なんで|何して|おい|待って)", "tsukkomi_red"),
    (r"(\?\?\?|\？\？\？|なにこれ|え\？|は\？)", "question_float"),
    (r"(小声|こっそり|内緒|ひそひそ)", "whisper_small"),
    (r"(怖|こわ|震|無理無理|助け)", "tremble"),
    (r"(\.\.\.|…|。。。)", "typewriter"),
)

RESOLVE_CONTEXT: Dict[str, Any] = {}


@dataclass
class Subtitle:
    index: int
    start_seconds: float
    end_seconds: float
    text: str


def deep_merge(base: Dict[str, Any], overrides: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(base)
    for key, value in overrides.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def normalize_preset_name(name: Any) -> str:
    raw = str(name or "").strip()
    if not raw:
        return "bold_outline"
    if raw in VTUBER_EFFECT_PRESETS:
        return raw
    lowered = raw.lower()
    for preset_name, preset in VTUBER_EFFECT_PRESETS.items():
        if lowered == preset_name.lower():
            return preset_name
        aliases = [str(alias).lower() for alias in preset.get("aliases", [])]
        if lowered in aliases:
            return preset_name
    return "bold_outline"


def normalize_font_preset_name(name: Any) -> str:
    raw = str(name or "").strip()
    if not raw:
        return ""
    if raw in FONT_PRESETS:
        return raw
    lowered = raw.lower()
    for preset_name, preset in FONT_PRESETS.items():
        if lowered == preset_name.lower():
            return preset_name
        aliases = [str(alias).lower() for alias in preset.get("aliases", [])]
        if lowered in aliases:
            return preset_name
    return ""


def choose_effect_preset(text: str, settings: Dict[str, Any], subtitle_index: int = 1) -> str:
    cycle = settings.get("effect_preset_cycle") or []
    if isinstance(cycle, list) and cycle:
        return normalize_preset_name(cycle[(subtitle_index - 1) % len(cycle)])

    if bool(settings.get("effect_auto_rules_enabled", False)):
        compact = re.sub(r"\s+", "", text)
        for pattern, preset_name in AUTO_RULES:
            if re.search(pattern, compact, flags=re.IGNORECASE):
                return preset_name

    return normalize_preset_name(settings.get("effect_preset", "bold_outline"))


def choose_font_preset(settings: Dict[str, Any], subtitle_index: int = 1) -> str:
    cycle = settings.get("font_preset_cycle") or []
    if isinstance(cycle, list) and cycle:
        return normalize_font_preset_name(cycle[(subtitle_index - 1) % len(cycle)])
    return normalize_font_preset_name(settings.get("font_preset", ""))


def settings_with_effect_preset(settings: Dict[str, Any], text: str, subtitle_index: int = 1) -> Dict[str, Any]:
    preset_name = choose_effect_preset(text, settings, subtitle_index)
    preset = VTUBER_EFFECT_PRESETS.get(preset_name, VTUBER_EFFECT_PRESETS["bold_outline"])
    merged = deep_merge(settings, preset)
    merged["active_effect_preset"] = preset_name

    font_preset_name = choose_font_preset(settings, subtitle_index)
    if font_preset_name:
        merged = deep_merge(merged, FONT_PRESETS[font_preset_name])
        merged["active_font_preset"] = font_preset_name
    return merged


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
    path = script_dir()
    try:
        path.mkdir(parents=True, exist_ok=True)
        test_path = path / ".write_test"
        test_path.write_text("", encoding="utf-8")
        test_path.unlink(missing_ok=True)
        return path
    except Exception:
        pass

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
        path.mkdir(parents=True, exist_ok=True)
        return path
    return Path.cwd()


def load_settings() -> Dict[str, Any]:
    settings_path = script_dir() / "subtitle_settings.json"
    if not settings_path.exists():
        return DEFAULT_SETTINGS
    with settings_path.open("r", encoding="utf-8-sig") as f:
        return deep_merge(DEFAULT_SETTINGS, json.load(f))


def set_resolve_context(context: Dict[str, Any]) -> None:
    RESOLVE_CONTEXT.clear()
    RESOLVE_CONTEXT.update(context)


def context_object(name: str) -> Any:
    if name in globals():
        return globals()[name]
    return RESOLVE_CONTEXT.get(name)


class Logger:
    def __init__(self, settings: Dict[str, Any]) -> None:
        log_path = settings.get("logging", {}).get("log_file") or str(writable_dir() / "subtitle_generator.log")
        self.path = Path(log_path)
        self.enabled = bool(settings.get("logging", {}).get("write_log_file", True))

    def write(self, message: str) -> None:
        print(message)
        if self.enabled:
            with self.path.open("a", encoding="utf-8") as f:
                f.write(message + "\n")


TIMESTAMP_RE = re.compile(
    r"(?P<h>\d{1,2}):(?P<m>\d{2}):(?P<s>\d{2})(?P<ms>[,.]\d{1,3})?"
)


def parse_timestamp(value: str) -> float:
    match = TIMESTAMP_RE.search(value.strip())
    if not match:
        raise ValueError(f"Invalid SRT timestamp: {value!r}")
    hours = int(match.group("h"))
    minutes = int(match.group("m"))
    seconds = int(match.group("s"))
    ms = match.group("ms") or ".0"
    fraction = float("0" + ms.replace(",", "."))
    return hours * 3600 + minutes * 60 + seconds + fraction


def parse_srt(srt_text: str) -> List[Subtitle]:
    normalized = srt_text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return []
    blocks = re.split(r"\n\s*\n", normalized)
    subtitles: List[Subtitle] = []
    for fallback_index, block in enumerate(blocks, start=1):
        lines = [line.rstrip("\ufeff") for line in block.split("\n") if line.strip()]
        if len(lines) < 2:
            continue

        index = fallback_index
        time_line_index = 0
        if lines[0].strip().isdigit():
            index = int(lines[0].strip())
            time_line_index = 1

        if time_line_index >= len(lines) or "-->" not in lines[time_line_index]:
            continue

        start_raw, end_raw = lines[time_line_index].split("-->", 1)
        text = "\n".join(lines[time_line_index + 1 :]).strip()
        if not text:
            continue
        subtitles.append(Subtitle(index, parse_timestamp(start_raw), parse_timestamp(end_raw), text))
    return subtitles


def wrap_text(text: str, settings: Dict[str, Any]) -> str:
    if settings.get("text", {}).get("all_caps", False):
        text = text.upper()
    if not settings.get("wrap_enabled", True):
        return text
    max_chars = int(settings.get("max_chars_per_line", 24))
    if max_chars <= 0:
        return text
    if settings.get("replace_newlines_with_spaces_before_wrap", False):
        text = re.sub(r"\s+", " ", text)

    wrapped_lines: List[str] = []
    for source_line in text.splitlines():
        line = source_line.strip()
        while len(line) > max_chars:
            split_at = max(
                line.rfind(" ", 0, max_chars + 1),
                line.rfind("　", 0, max_chars + 1),
                line.rfind("、", 0, max_chars + 1),
                line.rfind("。", 0, max_chars + 1),
            )
            if split_at < max_chars // 2:
                split_at = max_chars
            wrapped_lines.append(line[:split_at].strip())
            line = line[split_at:].strip()
        wrapped_lines.append(line)
    return "\n".join(wrapped_lines)


def get_resolve() -> Any:
    errors: List[str] = []

    for global_name in ("resolve", "app"):
        candidate = context_object(global_name)
        if candidate is not None:
            try:
                if hasattr(candidate, "GetProjectManager") and candidate.GetProjectManager() is not None:
                    return candidate
                if hasattr(candidate, "GetResolve"):
                    resolve = candidate.GetResolve()
                    if resolve is not None:
                        return resolve
                errors.append(f"{global_name} was present but was not a Resolve project API object")
            except Exception as exc:
                errors.append(f"{global_name} fallback failed: {exc}")

    try:
        import DaVinciResolveScript as dvr_script  # type: ignore

        resolve = dvr_script.scriptapp("Resolve")
        if resolve is not None:
            return resolve
        errors.append('DaVinciResolveScript.scriptapp("Resolve") returned None')
    except Exception as exc:
        errors.append(f'DaVinciResolveScript.scriptapp("Resolve") failed: {exc}')

    try:
        bmd_app = context_object("bmd")
        if bmd_app is None:
            raise RuntimeError("bmd is not available")
        resolve = bmd_app.scriptapp("Resolve")
        if resolve is not None:
            return resolve
        errors.append('bmd.scriptapp("Resolve") returned None')
    except Exception as exc:
        errors.append(f'bmd.scriptapp("Resolve") failed: {exc}')

    for global_name in ("fusion", "fu"):
        try:
            fusion_app = context_object(global_name)
            if fusion_app is not None:
                resolve = fusion_app.GetResolve()
                if resolve is not None:
                    return resolve
                errors.append(f"{global_name}.GetResolve() returned None")
        except Exception as exc:
            errors.append(f"{global_name}.GetResolve() failed: {exc}")

    try:
        bmd_app = context_object("bmd")
        if bmd_app is None:
            raise RuntimeError("bmd is not available")
        fusion_app = bmd_app.scriptapp("Fusion")
        if fusion_app is not None:
            resolve = fusion_app.GetResolve()
            if resolve is not None:
                return resolve
            errors.append('bmd.scriptapp("Fusion").GetResolve() returned None')
        else:
            errors.append('bmd.scriptapp("Fusion") returned None')
    except Exception as exc:
        errors.append(f'bmd.scriptapp("Fusion").GetResolve() failed: {exc}')

    detail = "\n".join(f"- {error}" for error in errors)
    raise RuntimeError(
        "DaVinci Resolve project API could not be found. "
        "Run this from DaVinci Resolve's Workspace > Scripts menu with a project and timeline open. "
        "Also enable Preferences > System > General > External scripting using: Local, then restart Resolve.\n"
        + detail
    )


def choose_srt_file(settings: Dict[str, Any]) -> Path:
    configured = str(settings.get("input_srt", "")).strip()
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
            title="SRTファイルを選択",
            filetypes=[("SRT subtitles", "*.srt"), ("All files", "*.*")],
        )
        root.destroy()
        if selected:
            return Path(selected)
    except Exception:
        pass

    raise RuntimeError("subtitle_settings.json の input_srt にSRTファイルの絶対パスを設定してください。")


def seconds_to_frames(seconds: float, fps: float) -> int:
    return int(round(seconds * fps))


def frames_to_timecode(frame: int, fps: float) -> str:
    fps_int = int(round(fps))
    hours = frame // (fps_int * 3600)
    frame %= fps_int * 3600
    minutes = frame // (fps_int * 60)
    frame %= fps_int * 60
    seconds = frame // fps_int
    frames = frame % fps_int
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}:{frames:02d}"


def get_timeline_start_frame(timeline: Any) -> int:
    try:
        return int(timeline.GetStartFrame())
    except Exception:
        return 0


def as_float(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def set_tool_input(tool: Any, name: str, value: Any) -> None:
    try:
        tool.SetInput(name, value)
    except Exception:
        try:
            tool[name] = value
        except Exception:
            pass


def set_tool_input_at(tool: Any, name: str, value: Any, frame: int) -> None:
    try:
        tool.SetInput(name, value, int(frame))
    except Exception:
        if frame == 0:
            set_tool_input(tool, name, value)


def set_any_tool_input_at(tool: Any, names: Iterable[str], value: Any, frame: int) -> None:
    for name in names:
        set_tool_input_at(tool, name, value, frame)


def point_value(x: float, y: float) -> Dict[int, float]:
    return {1: x, 2: y}


def apply_textplus_animation(tool: Any, settings: Dict[str, Any], log: Logger) -> None:
    animation = settings.get("animation", {})
    effect_type = str(animation.get("type", "")).strip()
    if not effect_type:
        return

    text_settings = settings.get("text", {})
    layout = settings.get("layout", {})
    base_size = as_float(text_settings.get("size"), 0.075)
    base_x = as_float(layout.get("horizontal_anchor"), 0.5)
    base_y = as_float(layout.get("vertical_anchor"), 0.86)
    frames = max(1, int(as_float(animation.get("frames"), 6)))

    try:
        if effect_type == "fade_pop":
            set_tool_input_at(tool, "Alpha1", 0.0, 0)
            set_tool_input_at(tool, "Size", base_size * as_float(animation.get("start_size_factor"), 0.95), 0)
            set_tool_input_at(tool, "Alpha1", as_float(settings.get("color", {}).get("alpha"), 1.0), frames)
            set_tool_input_at(tool, "Size", base_size, frames)
        elif effect_type == "pop":
            set_tool_input_at(tool, "Size", base_size, 0)
            set_tool_input_at(tool, "Size", base_size * as_float(animation.get("peak_size_factor"), 1.12), frames // 2)
            set_tool_input_at(tool, "Size", base_size, frames)
        elif effect_type == "impact_zoom":
            set_tool_input_at(tool, "Size", base_size * as_float(animation.get("start_size_factor"), 0.78), 0)
            set_tool_input_at(tool, "Size", base_size * as_float(animation.get("peak_size_factor"), 1.22), max(1, frames // 2))
            set_tool_input_at(tool, "Size", base_size, frames)
        elif effect_type == "pulse":
            set_tool_input_at(tool, "Size", base_size, 0)
            set_tool_input_at(tool, "Size", base_size * as_float(animation.get("peak_size_factor"), 1.18), max(1, frames // 2))
            set_tool_input_at(tool, "Size", base_size, frames)
        elif effect_type == "slide_in":
            from_x = base_x + as_float(animation.get("from_x"), -0.12)
            set_tool_input_at(tool, "Center", point_value(from_x, base_y), 0)
            set_tool_input_at(tool, "Center", point_value(base_x, base_y), frames)
        elif effect_type == "tremble":
            amount_x = as_float(animation.get("amount_x"), 0.008)
            amount_y = as_float(animation.get("amount_y"), 0.006)
            offsets = [(amount_x, 0), (-amount_x, amount_y), (amount_x * 0.5, -amount_y), (-amount_x * 0.5, 0)]
            for frame in range(0, frames + 1, 2):
                dx, dy = offsets[(frame // 2) % len(offsets)]
                set_tool_input_at(tool, "Center", point_value(base_x + dx, base_y + dy), frame)
            set_tool_input_at(tool, "Center", point_value(base_x, base_y), frames + 1)
        elif effect_type == "typewriter":
            write_names = ("WriteOnEnd", "End", "Write On End")
            set_any_tool_input_at(tool, write_names, 0.0, 0)
            set_any_tool_input_at(tool, write_names, 1.0, frames)
        elif effect_type == "comment_flow":
            from_x = as_float(animation.get("from_x"), 1.12)
            to_x = as_float(animation.get("to_x"), -0.2)
            set_tool_input_at(tool, "Center", point_value(from_x, base_y), 0)
            set_tool_input_at(tool, "Center", point_value(to_x, base_y), frames)
        elif effect_type == "blink":
            alpha = as_float(settings.get("color", {}).get("alpha"), 1.0)
            for frame in range(0, frames + 1, 3):
                set_tool_input_at(tool, "Alpha1", alpha if (frame // 3) % 2 == 0 else 0.25, frame)
            set_tool_input_at(tool, "Alpha1", alpha, frames + 1)
        elif effect_type == "float":
            amount_y = as_float(animation.get("amount_y"), 0.02)
            set_tool_input_at(tool, "Center", point_value(base_x, base_y), 0)
            set_tool_input_at(tool, "Center", point_value(base_x, base_y + amount_y), max(1, frames // 2))
            set_tool_input_at(tool, "Center", point_value(base_x, base_y), frames)
    except Exception as exc:
        log.write(f"WARN: Text+ animation could not be applied: {exc}")


def find_text_tool(comp: Any) -> Optional[Any]:
    candidates = []
    for name in ("Template", "Text1", "TextPlus1", "StyledText"):
        try:
            tool = comp.FindTool(name)
            if tool:
                candidates.append(tool)
        except Exception:
            pass
    if candidates:
        return candidates[0]

    try:
        tools = comp.GetToolList(False, "TextPlus")
        if tools:
            return list(tools.values())[0]
    except Exception:
        pass
    try:
        tools = comp.GetToolList(False, "Text")
        if tools:
            return list(tools.values())[0]
    except Exception:
        pass
    return None


def apply_textplus_settings(item: Any, text: str, settings: Dict[str, Any], log: Logger, subtitle_index: int = 1) -> None:
    settings = settings_with_effect_preset(settings, text, subtitle_index)

    comp = None
    try:
        comp = item.GetFusionCompByIndex(1)
    except Exception:
        pass
    if comp is None:
        try:
            comp = item.AddFusionComp()
        except Exception:
            comp = None
    if comp is None:
        log.write("WARN: Fusion composition could not be opened for one subtitle clip.")
        return

    tool = find_text_tool(comp)
    if tool is None:
        log.write("WARN: Text+ tool could not be found in one subtitle clip.")
        return

    text_settings = settings.get("text", {})
    layout = settings.get("layout", {})
    color = settings.get("color", {})
    outline = settings.get("outline", {})
    shadow = settings.get("shadow", {})
    background = settings.get("background", {})

    try:
        comp.StartUndo("Apply Text+ subtitle settings")
        comp.Lock()
    except Exception:
        pass

    set_tool_input(tool, "StyledText", text)
    set_tool_input(tool, "Font", text_settings.get("font", "Noto Sans CJK JP"))
    set_tool_input(tool, "Style", text_settings.get("style", "Regular"))
    set_tool_input(tool, "Size", as_float(text_settings.get("size"), 0.075))
    set_tool_input(tool, "LineSpacing", as_float(text_settings.get("line_spacing"), 1.0))
    set_tool_input(tool, "CharacterSpacing", as_float(text_settings.get("tracking"), 1.0))
    set_tool_input(tool, "Red1", as_float(color.get("red"), 1.0))
    set_tool_input(tool, "Green1", as_float(color.get("green"), 1.0))
    set_tool_input(tool, "Blue1", as_float(color.get("blue"), 1.0))
    set_tool_input(tool, "Alpha1", as_float(color.get("alpha"), 1.0))
    set_tool_input(tool, "Center", {
        1: as_float(layout.get("horizontal_anchor"), 0.5),
        2: as_float(layout.get("vertical_anchor"), 0.86),
    })

    alignment = str(layout.get("alignment", "center")).lower()
    set_tool_input(tool, "HorizontalJustificationNew", {"left": 0, "center": 1, "right": 2}.get(alignment, 1))
    set_tool_input(tool, "VerticalJustificationNew", 1)

    if bool(outline.get("enabled", True)):
        set_tool_input(tool, "Enabled2", 1)
        set_tool_input(tool, "Red2", as_float(outline.get("red"), 0.0))
        set_tool_input(tool, "Green2", as_float(outline.get("green"), 0.0))
        set_tool_input(tool, "Blue2", as_float(outline.get("blue"), 0.0))
        set_tool_input(tool, "Alpha2", as_float(outline.get("alpha"), 1.0))
        set_tool_input(tool, "Thickness2", as_float(outline.get("width"), 0.018))

    if bool(shadow.get("enabled", True)):
        set_tool_input(tool, "Enabled3", 1)
        set_tool_input(tool, "Red3", as_float(shadow.get("red"), 0.0))
        set_tool_input(tool, "Green3", as_float(shadow.get("green"), 0.0))
        set_tool_input(tool, "Blue3", as_float(shadow.get("blue"), 0.0))
        set_tool_input(tool, "Alpha3", as_float(shadow.get("alpha"), 0.45))
        set_tool_input(tool, "Offset3", {
            1: as_float(shadow.get("offset_x"), 0.006),
            2: as_float(shadow.get("offset_y"), -0.006),
        })
        set_tool_input(tool, "Softness3", as_float(shadow.get("blur"), 0.35))

    if bool(background.get("enabled", False)):
        set_tool_input(tool, "Enabled4", 1)
        set_tool_input(tool, "Red4", as_float(background.get("red"), 0.0))
        set_tool_input(tool, "Green4", as_float(background.get("green"), 0.0))
        set_tool_input(tool, "Blue4", as_float(background.get("blue"), 0.0))
        set_tool_input(tool, "Alpha4", as_float(background.get("alpha"), 0.45))
        set_tool_input(tool, "Round4", as_float(background.get("roundness"), 0.18))

    apply_textplus_animation(tool, settings, log)

    try:
        comp.Unlock()
        comp.EndUndo(True)
    except Exception:
        pass


def set_item_duration(item: Any, start_frame: int, end_frame: int, log: Logger) -> None:
    # Resolve exposes slightly different trim/property surfaces across versions.
    attempts: Iterable[Tuple[str, Tuple[Any, ...]]] = (
        ("SetStart", (start_frame,)),
        ("SetEnd", (end_frame,)),
    )
    for method_name, args in attempts:
        try:
            getattr(item, method_name)(*args)
        except Exception:
            pass

    for key, value in (("Start", start_frame), ("End", end_frame), ("Duration", end_frame - start_frame)):
        try:
            item.SetProperty(key, value)
        except Exception:
            pass


def insert_textplus_clip(timeline: Any, settings: Dict[str, Any]) -> Optional[Any]:
    title_name = settings.get("title_name", "Text+")
    for method_name in ("InsertTitleIntoTimeline", "InsertFusionTitleIntoTimeline", "InsertGeneratorIntoTimeline"):
        try:
            method = getattr(timeline, method_name)
            item = method(title_name)
            if item:
                return item
        except Exception:
            continue
    return None


def generate_textplus_subtitles(srt_path: Path, settings: Optional[Dict[str, Any]] = None) -> int:
    settings = settings or load_settings()
    log = Logger(settings)
    log.write("=== Text+ subtitle generation started ===")

    subtitles = parse_srt(srt_path.read_text(encoding="utf-8-sig"))
    if not subtitles:
        raise RuntimeError(f"No subtitles were found in {srt_path}")

    resolve = get_resolve()
    project_manager = resolve.GetProjectManager()
    if project_manager is None:
        raise RuntimeError(
            "Resolve project manager could not be opened. "
            "DaVinci Resolveでプロジェクトを開いた状態で、Workspace > Scripts から実行してください。"
        )
    project = project_manager.GetCurrentProject()
    if project is None:
        raise RuntimeError("No current Resolve project.")
    timeline = project.GetCurrentTimeline()
    if timeline is None:
        raise RuntimeError("No current Resolve timeline.")

    fps = as_float(timeline.GetSetting("timelineFrameRate"), 0.0)
    if fps <= 0:
        fps = as_float(project.GetSetting("timelineFrameRate"), 24.0)
    gap_frames = int(settings.get("gap_frames", 0))
    min_duration = int(settings.get("minimum_duration_frames", 2))
    timeline_start_frame = get_timeline_start_frame(timeline)

    log.write(f"SRT: {srt_path}")
    log.write(f"Subtitles: {len(subtitles)}")
    log.write(f"Timeline FPS: {fps}")
    log.write(f"Timeline start frame: {timeline_start_frame}")

    created = 0
    for subtitle in subtitles:
        start_frame = seconds_to_frames(subtitle.start_seconds, fps)
        end_frame = seconds_to_frames(subtitle.end_seconds, fps) - gap_frames
        end_frame = max(end_frame, start_frame + min_duration)
        absolute_start_frame = timeline_start_frame + start_frame
        absolute_end_frame = timeline_start_frame + end_frame

        try:
            timeline.SetCurrentTimecode(frames_to_timecode(absolute_start_frame, fps))
        except Exception:
            log.write(f"WARN: Could not move playhead to subtitle {subtitle.index}.")

        item = insert_textplus_clip(timeline, settings)
        if item is None:
            log.write(f"ERROR: Could not insert Text+ title for subtitle {subtitle.index}.")
            continue

        set_item_duration(item, absolute_start_frame, absolute_end_frame, log)
        apply_textplus_settings(item, wrap_text(subtitle.text, settings), settings, log, subtitle.index)
        created += 1
        log.write(
            f"Created {created}/{len(subtitles)}: "
            f"#{subtitle.index} {frames_to_timecode(absolute_start_frame, fps)}"
        )

    log.write(f"Done. Created {created} Text+ subtitle clips.")
    return created


def main() -> None:
    settings = load_settings()
    srt_path = choose_srt_file(settings)
    generate_textplus_subtitles(srt_path, settings)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        message = f"Text+ subtitle generation failed: {exc}"
        print(message)
        try:
            import tkinter as tk
            from tkinter import messagebox

            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("Text+ Subtitle Generator", message)
            root.destroy()
        except Exception:
            pass
        raise
