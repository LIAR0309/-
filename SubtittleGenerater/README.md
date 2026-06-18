# DaVinci Resolve Text+ Subtitle Generator

SRT字幕を読み込み、DaVinci Resolveのタイムラインに `Text+` タイトルとして字幕クリップを生成するスクリプトです。

音声/動画ファイルからWhisperで字幕を自動生成し、そのまま `Text+` に変換する入口も同梱しています。

## インストール

Windows PowerShellでこのフォルダを開き、次を実行します。

```powershell
.\install_windows.ps1
```

手動で入れる場合は、このフォルダを次の場所にコピーしてください。

```text
%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility\TextPlusSubtitleGenerator
```

macOS:

```text
~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/TextPlusSubtitleGenerator
```

Linux:

```text
~/.local/share/DaVinciResolve/Fusion/Scripts/Utility/TextPlusSubtitleGenerator
```

Resolveを再起動すると、`Workspace > Scripts > Utility > TextPlusSubtitleGenerator > TextPlusSubtitleGenerator` から実行できます。

音声認識も使う場合は、通常のPowerShellで依存関係を追加します。

```powershell
.\install_transcription_deps_windows.ps1
```

Resolveから通常の `python` が見つからない場合は、`transcription_settings.json` の `python_executable` に `python.exe` の絶対パスを入れてください。

## 使い方

### SRTからText+を作る

1. 字幕を置きたいタイムラインを開きます。
2. `TextPlusSubtitleGenerator` を実行します。
3. ファイル選択画面で `.srt` を選びます。
4. SRTの開始・終了時刻に合わせて `Text+` クリップが作成されます。

ファイル選択画面が出ない環境では、`subtitle_settings.json` の `input_srt` にSRTの絶対パスを設定してください。

### 音声/動画から自動生成する

1. 字幕を置きたいタイムラインを開きます。
2. `AudioToTextPlusSubtitleGenerator` を実行します。
3. 音声または動画ファイルを選びます。
4. Whisperが `.whisper.srt` を生成します。
5. 生成されたSRTを使って `Text+` クリップが作成されます。

タイムライン上の音声を使いたい場合は、Resolveから先にWAVを書き出して、そのWAVを選ぶのが一番安定します。動画ファイルを直接選んでも動きますが、形式によっては音声抽出に失敗することがあります。

## 必要なResolve設定

- `Preferences > System > General > External scripting using` は、通常は `Local` のままで動きます。
- 外部Pythonから実行する場合だけ `Local` または `Network` を有効化し、Resolveを再起動してください。
- `Workspace > Scripts` メニューから実行する場合は、Resolve内蔵のPython環境が使われます。
- 日本語フォント名はOSにインストール済みのPostScript名またはResolveで認識されるフォント名を指定してください。
- タイムラインのフレームレートは、SRT読み込み前に確定しておいてください。生成後にFPSを変えると位置がずれます。

## 設定項目

### Text+設定

`subtitle_settings.json` で調整します。

| 項目 | 内容 |
| --- | --- |
| `input_srt` | 空なら実行時に選択。固定したい場合はSRTの絶対パス |
| `title_name` | 挿入するタイトル名。通常は `Text+` |
| `gap_frames` | 各字幕の末尾を短くするフレーム数 |
| `minimum_duration_frames` | 最短字幕尺 |
| `max_chars_per_line` | 自動改行の目安文字数 |
| `wrap_enabled` | 自動改行を有効化 |
| `text.font` | フォント名 |
| `text.style` | Regular、Boldなどのスタイル名 |
| `text.size` | Text+の文字サイズ |
| `text.line_spacing` | 行間 |
| `text.tracking` | 字間 |
| `text.all_caps` | アルファベットを大文字化 |
| `layout.horizontal_anchor` | 横位置。0左、0.5中央、1右 |
| `layout.vertical_anchor` | 縦位置。0下、1上のResolve/Fusion座標 |
| `layout.alignment` | `left`、`center`、`right` |
| `color` | 文字色RGBA |
| `outline` | 縁取りの有無、色、太さ |
| `shadow` | 影の有無、色、位置、ぼかし |
| `background` | 背景ボックス用。ResolveのText+プリセット差により効かない場合があります |
| `logging` | ログファイル出力 |

### 音声認識設定

`transcription_settings.json` で調整します。

| 項目 | 内容 |
| --- | --- |
| `audio_input` | 空なら実行時に選択。固定したい場合は音声/動画の絶対パス |
| `output_srt` | 空なら入力ファイル横に `.whisper.srt` を作成 |
| `python_executable` | `faster-whisper` を入れたPython。例: `C:\\Users\\name\\AppData\\Local\\Programs\\Python\\Python312\\python.exe` |
| `model` | Whisperモデル。軽い順に `tiny`、`base`、`small`、`medium`、高精度なら `large-v3` |
| `language` | 日本語なら `ja`。空文字にすると自動判定 |
| `task` | 通常は `transcribe`。翻訳したい場合は `translate` |
| `device` | CPUなら `cpu`、NVIDIA GPUなら `cuda` |
| `compute_type` | CPUなら `int8`、GPUなら `float16` または `int8_float16` |
| `beam_size` | 認識精度寄りの探索数。通常は `5` |
| `vad_filter` | 無音区間を除外 |
| `condition_on_previous_text` | 文脈を引き継いで認識 |
| `initial_prompt` | 表記ゆれ防止のヒント。固有名詞や動画ジャンルを書けます |
| `max_line_width` | SRT生成時の1行あたり目安文字数 |
| `max_line_count` | SRT生成時の最大行数 |

## モデルの目安

| モデル | 速度 | 精度 | 用途 |
| --- | --- | --- | --- |
| `base` | 速い | 低め | ラフ確認 |
| `small` | そこそこ速い | 実用 | 初期設定 |
| `medium` | 遅め | 高め | 日本語字幕の本番寄り |
| `large-v3` | 重い | 最高寄り | 品質優先 |

最初は `small` で確認し、誤認識が多い場合は `medium` に上げるのがおすすめです。

## フォントについて

このリポジトリがフォントパック用なら、先に使いたいフォントをOSへインストールしてください。設定例:

```json
{
  "text": {
    "font": "Noto Sans CJK JP",
    "style": "Bold",
    "size": 0.08
  }
}
```

Resolve側のText+で一度フォントを選び、表示名を確認してから同じ名前を設定すると確実です。

## 注意

ResolveのスクリプトAPIはバージョンやタイトルプリセットによって、クリップのトリムやFusionツール名が少し変わる場合があります。生成後に尺が合わない場合は、`subtitle_generator.log` を確認してください。

音声認識は初回実行時にWhisperモデルをダウンロードします。ネットワーク環境と空き容量が必要です。
