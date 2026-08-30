$ErrorActionPreference = "Stop"
$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$generator = Join-Path $toolDir "2026-08-30-generate-event-voice-sample.py"
$projectRoot = Resolve-Path (Join-Path $toolDir "..")
$audioPath = Join-Path $projectRoot "sound\voice-lines\event-driven-grok-v1\earthquake-warning-rex.mp3"
$python = "C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$generatorExit = 1

Write-Host ""
Write-Host "UNDERSTAR - ONE GROK EVENT VOICE SAMPLE" -ForegroundColor Cyan
Write-Host "One request only. Estimated cost is below USD 0.001." -ForegroundColor DarkGray
Write-Host "The key is hidden, process-local, and never saved." -ForegroundColor DarkGray
Write-Host ""

$secureKey = Read-Host "Paste the temporary OpenRouter key, then press Enter" -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $temporaryKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
    if ([string]::IsNullOrWhiteSpace($temporaryKey)) {
        throw "No API key was entered."
    }
    $env:OPENROUTER_API_KEY = $temporaryKey
    $temporaryKey = $null
    & $python $generator --force
    $generatorExit = $LASTEXITCODE
}
finally {
    Remove-Item Env:OPENROUTER_API_KEY -ErrorAction SilentlyContinue
    if ($keyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    }
    $secureKey = $null
}

if ($generatorExit -eq 0 -and (Test-Path -LiteralPath $audioPath)) {
    Write-Host ""
    Write-Host "Sample ready. Opening it for playback." -ForegroundColor Green
    Start-Process -FilePath $audioPath
} else {
    Write-Host ""
    Write-Host "No playable sample was generated." -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to close" | Out-Null
exit $generatorExit
