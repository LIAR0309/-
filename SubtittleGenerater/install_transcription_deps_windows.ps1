param(
    [string]$Python = "python",
    [string]$VenvPath = "..\.venv"
)

$ErrorActionPreference = "Stop"

$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvFullPath = Join-Path $sourceDir $VenvPath
$venvPython = Join-Path $venvFullPath "Scripts\python.exe"

if (!(Test-Path -LiteralPath $venvPython)) {
    Write-Host "Creating virtual environment: $venvFullPath"
    & $Python -m venv $venvFullPath
}

Write-Host "Installing faster-whisper into Python: $venvPython"
& $venvPython -m pip install --upgrade pip faster-whisper

Write-Host ""
Write-Host "Done."
Write-Host "Set transcription_settings.json > python_executable to:"
Write-Host $venvPython
