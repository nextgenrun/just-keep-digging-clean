$ErrorActionPreference = "Stop"
$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$generator = Join-Path $toolDir "2026-08-14-openrouter-sfx-first-lab-v2.py"
$dashboard = Join-Path $toolDir "2026-08-14-openrouter-sfx-first-review-v2.html"

Write-Host ""
Write-Host "DIG GAME - SFX-FIRST OPENROUTER LAB V2" -ForegroundColor Cyan
Write-Host "Review-only: no sounds are wired into the game." -ForegroundColor DarkGray
Write-Host "Your key is hidden, used only by this process, and never written to disk." -ForegroundColor DarkGray
Write-Host ""
Write-Host "This batch builds:" -ForegroundColor Yellow
Write-Host "  - 16 comparisons from existing handpicked SFX"
Write-Host "  - 6 audio capability diagnostics across GPT Audio + Mini"
Write-Host "  - up to 24 generated SFX (only if probes succeed)"
Write-Host "  - 20 focused voice variants across 9 model families"
Write-Host ""

$secureKey = Read-Host "Paste your OpenRouter API key, then press Enter" -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
$generatorExit = 1
try {
    $temporaryKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
    if ([string]::IsNullOrWhiteSpace($temporaryKey)) {
        throw "No API key was entered."
    }
    $env:OPENROUTER_API_KEY = $temporaryKey
    $temporaryKey = $null
    Write-Host ""
    Write-Host "Building the SFX-first comparison library..." -ForegroundColor Yellow
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

Write-Host ""
if ($generatorExit -eq 0) {
    Write-Host "Done. Opening the playable V2 comparison dashboard." -ForegroundColor Green
} else {
    Write-Host "The batch reported an error. Opening the dashboard so you can inspect safe diagnostics." -ForegroundColor Red
}
if (Test-Path -LiteralPath $dashboard) {
    Start-Process $dashboard
}

Write-Host ""
Write-Host "Press Enter after reviewing the summary above." -ForegroundColor DarkGray
Read-Host | Out-Null
exit $generatorExit
