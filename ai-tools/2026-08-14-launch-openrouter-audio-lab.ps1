$ErrorActionPreference = "Stop"
$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $toolDir "..")
$generator = Join-Path $toolDir "2026-08-14-openrouter-audio-lab.py"
$dashboard = Join-Path $toolDir "2026-08-14-openrouter-audio-lab-review.html"

Write-Host ""
Write-Host "DIG GAME - OPENROUTER AUDIO REVIEW LAB" -ForegroundColor Cyan
Write-Host "Review-only: this does not modify the Phaser runtime." -ForegroundColor DarkGray
Write-Host "The key is hidden, passed only to the generator process, and never saved." -ForegroundColor DarkGray
Write-Host ""

$secureKey = Read-Host "Paste your OpenRouter API key, then press Enter" -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $temporaryKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
    if ([string]::IsNullOrWhiteSpace($temporaryKey)) {
        throw "No API key was entered."
    }
    $env:OPENROUTER_API_KEY = $temporaryKey
    $temporaryKey = $null
    Write-Host ""
    Write-Host "Generating 20 voice comparisons, 3 experimental SFX, and 4 transcript checks..." -ForegroundColor Yellow
    & python $generator
    $generatorExit = $LASTEXITCODE
}
finally {
    Remove-Item Env:OPENROUTER_API_KEY -ErrorAction SilentlyContinue
    if ($keyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    }
    $secureKey = $null
}

if ($generatorExit -eq 0) {
    Write-Host ""
    Write-Host "Done. Opening the playable comparison dashboard." -ForegroundColor Green
    Start-Process $dashboard
} else {
    Write-Host ""
    Write-Host "The batch did not produce playable samples. Review the safe errors in the dashboard/status file." -ForegroundColor Red
    if (Test-Path $dashboard) { Start-Process $dashboard }
}

Write-Host ""
Write-Host "You can close this window. Press Enter to finish." -ForegroundColor DarkGray
Read-Host | Out-Null
exit $generatorExit
