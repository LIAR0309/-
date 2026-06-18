# Vtuber Text+ Effect Presets

DaVinci Resolve 21向けのText+字幕プリセットです。SRTから字幕を作るときに、`subtitle_settings.json` の `effect_preset` を変えるだけで見た目と簡易アニメーションを切り替えられます。

## 使い方

`subtitle_settings.json` の先頭付近を編集します。

```json
{
  "effect_preset": "bold_outline",
  "effect_preset_cycle": [],
  "effect_auto_rules_enabled": false,
  "font_preset": "",
  "font_preset_cycle": []
}
```

Resolveを再起動し、`Workspace > Scripts > Utility > TextPlusSubtitleGenerator > TextPlusSubtitleGenerator` を実行します。

## プリセット

| プリセット | 日本語エイリアス | 用途 |
| --- | --- | --- |
| `bold_outline` | `太縁字幕` | 通常字幕。白文字、黒太縁、影つき |
| `keyword_highlight` | `キーワード色分け字幕` | 重要語句を目立たせたい字幕 |
| `impact_zoom` | `ドンッ！拡大` | 爆笑、絶叫、強いツッコミ |
| `tremble` | `ぷるぷる震え` | 焦り、恐怖、困惑 |
| `tsukkomi_red` | `ツッコミ赤文字` | 編集者コメント、視聴者代弁 |
| `countdown` | `カウントダウン` | 3、2、1などの数字演出 |
| `teaser` | `オチ前予告` | このあと、数秒後、伏線など |
| `typewriter` | `一文字ずつ出る字幕` | ため、ホラー、意味深発言 |
| `comment_flow` | `コメント風テロップ` | ニコ動風、チャット風の横流し |
| `whisper_small` | `ささやき字幕` | 小声、内緒、ボソッとした発言 |
| `warning_blink` | `警告点滅` | 危険、まずい、注意喚起 |
| `question_float` | `疑問符ふわふわ` | 困惑、？？？、理解不能な場面 |
| `silence_dots` | `沈黙テロップ` | 無言、間、気まずい空気 |
| `stamp_pop` | `スタンプ風` | 草、天才、圧などの短い反応 |
| `speaker_blue` | `話者青` | コラボ用の話者A字幕 |
| `speaker_pink` | `話者ピンク` | コラボ用の話者B字幕 |
| `black_bar_teaser` | `黒帯予告` | オチ前の映画風・予告風テロップ |

日本語名でも指定できます。

```json
{
  "effect_preset": "ツッコミ赤文字"
}
```

## フォントプリセット

`font_preset` を指定すると、エフェクトはそのままにフォントだけ差し替えられます。

```json
{
  "effect_preset": "ツッコミ赤文字",
  "font_preset": "やわらか丸文字"
}
```

| プリセット | 日本語エイリアス | 用途 |
| --- | --- | --- |
| `default_jp` | `標準日本語` | Noto Sans CJK JP系の標準字幕 |
| `readable_gothic` | `読みやすいゴシック` | 視認性重視の通常字幕 |
| `impact_gothic` | `インパクトゴシック` | ドン、叫び、強調 |
| `soft_round` | `やわらか丸文字` | かわいい、ゆるい、明るい場面 |
| `comment_font` | `コメント風フォント` | ニコ動・チャット風 |
| `serif_teaser` | `明朝予告` | オチ前、ホラー、意味深 |
| `latin_impact` | `英字インパクト` | 英字や短いスタンプ |
| `tech_clean` | `テック字幕` | 無機質、ゲームUI風 |

フォント名はResolveが認識する表示名に依存します。表示されない場合は、ResolveのText+でフォントを一度選び、その表示名を `subtitle_settings.json` の `text.font` に直接入れてください。

## フォントを順番適用

`font_preset_cycle` に複数指定すると、字幕ごとに順番で切り替わります。コラボ切り抜きや話者別字幕の下地に使えます。

```json
{
  "font_preset_cycle": [
    "読みやすいゴシック",
    "やわらか丸文字"
  ]
}
```

## 字幕ごとにプリセットを順番適用

`effect_preset_cycle` に複数指定すると、字幕ごとに順番で切り替わります。

```json
{
  "effect_preset_cycle": [
    "bold_outline",
    "keyword_highlight",
    "impact_zoom"
  ]
}
```

## 自動ルール

`effect_auto_rules_enabled` を `true` にすると、字幕テキストから簡易判定してプリセットを自動選択します。

```json
{
  "effect_auto_rules_enabled": true
}
```

例:

- 数字だけの字幕: `countdown`
- `このあと`、`数秒後`、`伏線`: `teaser`
- `！？`、`草`、`無理`、`終わった`: `impact_zoom`
- `危険`、`警告`、`まずい`: `warning_blink`
- `いや`、`なんで`、`待って`: `tsukkomi_red`
- `???`、`なにこれ`: `question_float`
- `小声`、`内緒`: `whisper_small`
- `怖い`、`無理無理`: `tremble`
- `...`、`…`: `typewriter`

## 注意

これはOFXプラグインではなく、Resolve/FusionスクリプトでText+に設定とキーフレームを入れるプリセット集です。ResolveのバージョンやText+テンプレート差により、一部のアニメーション入力名が効かない場合があります。その場合でも、通常のText+字幕生成は継続します。
