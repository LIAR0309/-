$ErrorActionPreference = "Stop"

$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetDir = Join-Path $env:APPDATA "Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility\TextPlusSubtitleGenerator"

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$files = @(
    "TextPlusSubtitleGenerator.py",
    "AudioToTextPlusSubtitleGenerator.py",
    "TranscribeAudioToSrt.py",
    "InstallFontPackToolboxTemplates.py",
    "subtitle_settings.json",
    "transcription_settings.json",
    "VTUBER_TEXTPLUS_EFFECTS.md",
    "install_transcription_deps_windows.ps1",
    "README.md"
)

foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $sourceDir $file) -Destination $targetDir -Force
}

Write-Host "Installing FontPack templates into Resolve Effects Library..."
& python (Join-Path $sourceDir "InstallFontPackToolboxTemplates.py")

Write-Host "Installed to: $targetDir"
Write-Host "Restart DaVinci Resolve, then run one of these scripts:"
Write-Host "- Workspace > Scripts > Utility > TextPlusSubtitleGenerator > TextPlusSubtitleGenerator"
Write-Host "- Workspace > Scripts > Utility > TextPlusSubtitleGenerator > AudioToTextPlusSubtitleGenerator"
Write-Host "FontPack templates are available under Effects Library > FontPack after restarting Resolve."
