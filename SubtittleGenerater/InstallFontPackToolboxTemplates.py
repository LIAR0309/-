#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Install FontPack Text+ templates into DaVinci Resolve's Effects Library.

This creates:
- Edit/Effects/FontPack/*.setting for effect-style drag and drop
- Edit/Titles/FontPack/*.setting for title/text font presets
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple

import TextPlusSubtitleGenerator as presets


SAMPLE_TEXT = {
    "bold_outline": "太縁字幕",
    "keyword_highlight": "キーワード",
    "impact_zoom": "ドンッ！",
    "tremble": "ぷるぷる...",
    "tsukkomi_red": "いや無理だろ",
    "countdown": "3",
    "teaser": "このあと地獄",
    "typewriter": "一文字ずつ",
    "comment_flow": "草 それはそう",
    "whisper_small": "小声: これ内緒",
    "warning_blink": "警告",
    "question_float": "？？？",
    "silence_dots": "……",
    "stamp_pop": "草",
    "speaker_blue": "話者A",
    "speaker_pink": "話者B",
    "black_bar_teaser": "数秒後、崩壊",
}


DISPLAY_NAMES = {
    "bold_outline": "01 太縁字幕",
    "keyword_highlight": "02 キーワード色分け",
    "impact_zoom": "03 ドンッ拡大",
    "tremble": "04 ぷるぷる震え",
    "tsukkomi_red": "05 ツッコミ赤文字",
    "countdown": "06 カウントダウン",
    "teaser": "07 オチ前予告",
    "typewriter": "08 一文字ずつ",
    "comment_flow": "09 コメント風テロップ",
    "whisper_small": "10 ささやき字幕",
    "warning_blink": "11 警告点滅",
    "question_float": "12 疑問符ふわふわ",
    "silence_dots": "13 沈黙テロップ",
    "stamp_pop": "14 スタンプ風",
    "speaker_blue": "15 話者 青",
    "speaker_pink": "16 話者 ピンク",
    "black_bar_teaser": "17 黒帯予告",
}


FONT_DISPLAY_NAMES = {
    "default_jp": "Font 01 標準日本語",
    "readable_gothic": "Font 02 読みやすいゴシック",
    "impact_gothic": "Font 03 インパクトゴシック",
    "soft_round": "Font 04 やわらか丸文字",
    "comment_font": "Font 05 コメント風",
    "serif_teaser": "Font 06 明朝予告",
    "latin_impact": "Font 07 英字インパクト",
    "tech_clean": "Font 08 テック字幕",
}


def resolve_templates_dir() -> Path:
    appdata = os.environ.get("APPDATA")
    if appdata:
        return Path(appdata) / "Blackmagic Design" / "DaVinci Resolve" / "Support" / "Fusion" / "Templates"
    return Path.home() / "AppData" / "Roaming" / "Blackmagic Design" / "DaVinci Resolve" / "Support" / "Fusion" / "Templates"


def lua_string(value: Any) -> str:
    text = str(value).replace("\\", "\\\\").replace('"', '\\"')
    return f'"{text}"'


def number(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def sanitize_op_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]", "_", value)


def merge_settings(base: Dict[str, Any], extra: Dict[str, Any]) -> Dict[str, Any]:
    return presets.deep_merge(base, extra)


def shading_inputs(settings: Dict[str, Any]) -> str:
    color = settings.get("color", {})
    outline = settings.get("outline", {})
    shadow = settings.get("shadow", {})
    background = settings.get("background", {})
    lines = [
        f'Red1 = Input {{ Value = {number(color.get("red"), 1.0):.6g}, }},',
        f'Green1 = Input {{ Value = {number(color.get("green"), 1.0):.6g}, }},',
        f'Blue1 = Input {{ Value = {number(color.get("blue"), 1.0):.6g}, }},',
        f'Alpha1 = Input {{ Value = {number(color.get("alpha"), 1.0):.6g}, }},',
    ]
    if outline.get("enabled", True):
        lines.extend(
            [
                'Enabled2 = Input { Value = 1, },',
                f'Red2 = Input {{ Value = {number(outline.get("red"), 0.0):.6g}, }},',
                f'Green2 = Input {{ Value = {number(outline.get("green"), 0.0):.6g}, }},',
                f'Blue2 = Input {{ Value = {number(outline.get("blue"), 0.0):.6g}, }},',
                f'Alpha2 = Input {{ Value = {number(outline.get("alpha"), 1.0):.6g}, }},',
                f'Thickness2 = Input {{ Value = {number(outline.get("width"), 0.018):.6g}, }},',
            ]
        )
    if shadow.get("enabled", True):
        lines.extend(
            [
                'Enabled3 = Input { Value = 1, },',
                f'Red3 = Input {{ Value = {number(shadow.get("red"), 0.0):.6g}, }},',
                f'Green3 = Input {{ Value = {number(shadow.get("green"), 0.0):.6g}, }},',
                f'Blue3 = Input {{ Value = {number(shadow.get("blue"), 0.0):.6g}, }},',
                f'Alpha3 = Input {{ Value = {number(shadow.get("alpha"), 0.45):.6g}, }},',
                f'Offset3 = Input {{ Value = {{ {number(shadow.get("offset_x"), 0.006):.6g}, {number(shadow.get("offset_y"), -0.006):.6g} }}, }},',
                f'Softness3 = Input {{ Value = {number(shadow.get("blur"), 0.35):.6g}, }},',
            ]
        )
    if background.get("enabled", False):
        lines.extend(
            [
                'Enabled4 = Input { Value = 1, },',
                f'Red4 = Input {{ Value = {number(background.get("red"), 0.0):.6g}, }},',
                f'Green4 = Input {{ Value = {number(background.get("green"), 0.0):.6g}, }},',
                f'Blue4 = Input {{ Value = {number(background.get("blue"), 0.0):.6g}, }},',
                f'Alpha4 = Input {{ Value = {number(background.get("alpha"), 0.45):.6g}, }},',
                f'Round4 = Input {{ Value = {number(background.get("roundness"), 0.18):.6g}, }},',
            ]
        )
    return "\n\t\t\t\t\t\t".join(lines)


def animation_inputs(settings: Dict[str, Any]) -> Tuple[str, str]:
    animation = settings.get("animation", {})
    effect_type = str(animation.get("type", ""))
    text = settings.get("text", {})
    layout = settings.get("layout", {})
    color = settings.get("color", {})
    base_size = number(text.get("size"), 0.075)
    base_x = number(layout.get("horizontal_anchor"), 0.5)
    base_y = number(layout.get("vertical_anchor"), 0.86)
    frames = max(1, int(number(animation.get("frames"), 6)))
    alpha = number(color.get("alpha"), 1.0)

    size = ""
    center = ""
    extra = ""
    def add_size_spline(points: Iterable[Tuple[int, float]]) -> None:
        nonlocal size, extra
        size = spline("SizeSpline")
        extra = join_extra(extra, bezier("SizeSpline", points))

    if effect_type == "fade_pop":
        start = base_size * number(animation.get("start_size_factor"), 0.95)
        add_size_spline([(0, start), (frames, base_size)])
        extra = join_extra(extra, f"Alpha1 = Input {{ SourceOp = \"AlphaSpline\", Source = \"Value\", }},")
        extra = join_extra(extra, bezier("AlphaSpline", [(0, 0.0), (frames, alpha)]))
    elif effect_type in ("pop", "pulse"):
        peak = base_size * number(animation.get("peak_size_factor"), 1.12)
        add_size_spline([(0, base_size), (max(1, frames // 2), peak), (frames, base_size)])
    elif effect_type == "impact_zoom":
        start = base_size * number(animation.get("start_size_factor"), 0.78)
        peak = base_size * number(animation.get("peak_size_factor"), 1.22)
        add_size_spline([(0, start), (max(1, frames // 2), peak), (frames, base_size)])
    elif effect_type == "slide_in":
        from_x = base_x + number(animation.get("from_x"), -0.12)
        center = path([(0, from_x, base_y), (frames, base_x, base_y)])
    elif effect_type == "tremble":
        ax = number(animation.get("amount_x"), 0.008)
        ay = number(animation.get("amount_y"), 0.006)
        pts = []
        offsets = [(ax, 0), (-ax, ay), (ax * 0.5, -ay), (-ax * 0.5, 0)]
        for frame in range(0, frames + 1, 2):
            dx, dy = offsets[(frame // 2) % len(offsets)]
            pts.append((frame, base_x + dx, base_y + dy))
        pts.append((frames + 1, base_x, base_y))
        center = path(pts)
    elif effect_type == "typewriter":
        extra = join_extra(extra, f"WriteOnEnd = Input {{ SourceOp = \"WriteOnSpline\", Source = \"Value\", }},")
        extra = join_extra(extra, bezier("WriteOnSpline", [(0, 0.0), (frames, 1.0)]))
    elif effect_type == "comment_flow":
        center = path([(0, number(animation.get("from_x"), 1.12), base_y), (frames, number(animation.get("to_x"), -0.2), base_y)])
    elif effect_type == "blink":
        alpha_pts = [(frame, alpha if (frame // 3) % 2 == 0 else 0.25) for frame in range(0, frames + 1, 3)]
        alpha_pts.append((frames + 1, alpha))
        extra = join_extra(extra, f"Alpha1 = Input {{ SourceOp = \"AlphaSpline\", Source = \"Value\", }},")
        extra = join_extra(extra, bezier("AlphaSpline", alpha_pts))
    elif effect_type == "float":
        ay = number(animation.get("amount_y"), 0.02)
        center = path([(0, base_x, base_y), (max(1, frames // 2), base_x, base_y + ay), (frames, base_x, base_y)])

    return size, center, extra


def join_extra(left: str, right: str) -> str:
    if not left:
        return right
    if not right:
        return left
    return left + "\n\t\t\t\t\t\t" + right


def spline(name: str) -> str:
    return f'Input {{ SourceOp = "{name}", Source = "Value", }}'


def bezier(name: str, points: Iterable[Tuple[int, float]]) -> str:
    keys = "\n".join(f"\t\t\t\t\t\t\t\t[{frame}] = {{ {value:.6g}, }}," for frame, value in points)
    return f"""{name} = BezierSpline {{
\t\t\t\t\t\tSplineColor = {{ Red = 255, Green = 128, Blue = 0 }},
\t\t\t\t\t\tNameSet = true,
\t\t\t\t\t\tKeyFrames = {{
{keys}
\t\t\t\t\t\t}},
\t\t\t\t\t}},"""


def path(points: Iterable[Tuple[int, float, float]]) -> str:
    first = list(points)
    # Fusion point paths are verbose. A static Center plus transformable Inspector control is more reliable
    # for toolbox templates, so animated center is represented as a simple default center here.
    _, x, y = first[0]
    return f"Input {{ Value = {{ {x:.6g}, {y:.6g} }}, }}"


def textplus_tool(op_name: str, settings: Dict[str, Any], sample_text: str) -> str:
    text = settings.get("text", {})
    layout = settings.get("layout", {})
    font = text.get("font", "Noto Sans CJK JP")
    style = text.get("style", "Regular")
    size = number(text.get("size"), 0.075)
    tracking = number(text.get("tracking"), 1.0)
    line_spacing = number(text.get("line_spacing"), 1.0)
    x = number(layout.get("horizontal_anchor"), 0.5)
    y = number(layout.get("vertical_anchor"), 0.86)
    align = {"left": 0, "center": 1, "right": 2}.get(str(layout.get("alignment", "center")).lower(), 1)
    size_anim, center_anim, extra_anim = animation_inputs(settings)
    size_input = size_anim or f"Input {{ Value = {size:.6g}, }}"
    center_input = center_anim or f"Input {{ Value = {{ {x:.6g}, {y:.6g} }}, }}"
    extra = ("\n\t\t\t\t\t\t" + extra_anim) if extra_anim else ""

    return f"""{op_name} = TextPlus {{
\t\t\t\tCtrlWShown = false,
\t\t\t\tNameSet = true,
\t\t\t\tInputs = {{
\t\t\t\t\tGlobalOut = Input {{ Value = 119, }},
\t\t\t\t\tWidth = Input {{ Value = 1920, }},
\t\t\t\t\tHeight = Input {{ Value = 1080, }},
\t\t\t\t\tPixelAspect = Input {{ Value = {{ 1, 1 }}, }},
\t\t\t\t\tStyledText = Input {{ Value = {lua_string(sample_text)}, }},
\t\t\t\t\tFont = Input {{ Value = {lua_string(font)}, }},
\t\t\t\t\tStyle = Input {{ Value = {lua_string(style)}, }},
\t\t\t\t\tSize = {size_input},
\t\t\t\t\tLineSpacing = Input {{ Value = {line_spacing:.6g}, }},
\t\t\t\t\tCharacterSpacing = Input {{ Value = {tracking:.6g}, }},
\t\t\t\t\tCenter = {center_input},
\t\t\t\t\tHorizontalJustificationNew = Input {{ Value = {align}, }},
\t\t\t\t\tVerticalJustificationNew = Input {{ Value = 0, }},
\t\t\t\t\t{shading_inputs(settings)}{extra}
\t\t\t\t}},
\t\t\t\tViewInfo = OperatorInfo {{ Pos = {{ 0, 0 }} }},
\t\t\t}}"""


def group_template(group_name: str, text_op: str, settings: Dict[str, Any], sample_text: str, include_media_in: bool) -> str:
    text_name = "FontPackText"
    op_name = sanitize_op_name(group_name)
    media_nodes = ""
    if include_media_in:
        media_nodes = """
\t\t\t\tMediaIn1 = MediaIn {
\t\t\t\t\tCtrlWShown = false,
\t\t\t\t\tViewInfo = OperatorInfo { Pos = { -220, 33 } },
\t\t\t\t},
\t\t\t\tMerge1 = Merge {
\t\t\t\t\tCtrlWShown = false,
\t\t\t\t\tInputs = {
\t\t\t\t\t\tBackground = Input { SourceOp = "MediaIn1", Source = "Output", },
\t\t\t\t\t\tForeground = Input { SourceOp = "FontPackText", Source = "Output", },
\t\t\t\t\t},
\t\t\t\t\tViewInfo = OperatorInfo { Pos = { 220, 33 } },
\t\t\t\t},"""
        media_out_source = "Merge1"
    else:
        media_out_source = text_name

    return f"""{{ 
\tTools = ordered() {{
\t\t{op_name} = GroupOperator {{
\t\t\tCtrlWZoom = false,
\t\t\tInputs = ordered() {{
\t\t\t\tInput1 = InstanceInput {{ SourceOp = "{text_name}", Source = "StyledText", Name = "Text", }},
\t\t\t\tInput2 = InstanceInput {{ SourceOp = "{text_name}", Source = "Font", Name = "Font", ControlGroup = 2, }},
\t\t\t\tInput3 = InstanceInput {{ SourceOp = "{text_name}", Source = "Style", Name = "Style", ControlGroup = 2, }},
\t\t\t\tInput4 = InstanceInput {{ SourceOp = "{text_name}", Source = "Size", Name = "Size", Default = {number(settings.get("text", {}).get("size"), 0.075):.6g}, }},
\t\t\t\tInput5 = InstanceInput {{ SourceOp = "{text_name}", Source = "Center", Name = "Center", }},
\t\t\t}},
\t\t\tViewInfo = GroupInfo {{ Pos = {{ 0, 0 }} }},
\t\t\tTools = ordered() {{
\t\t\t\t{textplus_tool(text_name, settings, sample_text)},{media_nodes}
\t\t\t\tMediaOut1 = MediaOut {{
\t\t\t\t\tCtrlWShown = false,
\t\t\t\t\tInputs = {{
\t\t\t\t\t\tIndex = Input {{ Value = "0", }},
\t\t\t\t\t\tInput = Input {{ SourceOp = "{media_out_source}", Source = "Output", }},
\t\t\t\t\t}},
\t\t\t\t\tViewInfo = OperatorInfo {{ Pos = {{ 440, 33 }} }},
\t\t\t\t}},
\t\t\t}},
\t\t}},
\t}}
}}"""


def write_templates() -> None:
    root = resolve_templates_dir()
    effects_dir = root / "Edit" / "Effects" / "FontPack"
    titles_dir = root / "Edit" / "Titles" / "FontPack"
    effects_dir.mkdir(parents=True, exist_ok=True)
    titles_dir.mkdir(parents=True, exist_ok=True)

    base = presets.DEFAULT_SETTINGS
    for preset_name, effect in presets.VTUBER_EFFECT_PRESETS.items():
        settings = merge_settings(base, effect)
        display = DISPLAY_NAMES.get(preset_name, preset_name)
        sample = SAMPLE_TEXT.get(preset_name, display)
        (effects_dir / f"{display}.setting").write_text(
            group_template(display, preset_name, settings, sample, include_media_in=True),
            encoding="utf-8",
        )

    for font_name, font_preset in presets.FONT_PRESETS.items():
        settings = merge_settings(base, presets.VTUBER_EFFECT_PRESETS["bold_outline"])
        settings = merge_settings(settings, font_preset)
        display = FONT_DISPLAY_NAMES.get(font_name, font_name)
        (titles_dir / f"{display}.setting").write_text(
            group_template(display, font_name, settings, display.replace("Font ", ""), include_media_in=False),
            encoding="utf-8",
        )

    print(f"Installed FontPack effects to: {effects_dir}")
    print(f"Installed FontPack titles to:  {titles_dir}")


if __name__ == "__main__":
    write_templates()
