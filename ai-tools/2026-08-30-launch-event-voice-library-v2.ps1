$ErrorActionPreference = "Stop"
$toolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$generator = Join-Path $toolDir "2026-08-30-generate-event-voice-library-v2.py"
$python = "C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$generatorExit = 1

Write-Host ""
Write-Host "UNDERSTAR - GROK EVENT VOICE LIBRARY V2" -ForegroundColor Cyan
Write-Host "45 review clips, five voices, ten gameplay event families plus casting." -ForegroundColor White
Write-Host "Hard local estimate cap: USD 0.25. User maximum remains EUR 5." -ForegroundColor Yellow
Write-Host "The rejected V1 clip is not regenerated." -ForegroundColor DarkGray
Write-Host ""

& $python $generator --validate-only
if ($LASTEXITCODE -ne 0) {
    Write-Host "Library validation failed before any key was requested." -ForegroundColor Red
    Read-Host "Press Enter to close" | Out-Null
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Paste a fresh OpenRouter key below. Input is masked." -ForegroundColor Green
$secureKey = Read-Host "OpenRouter key" -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $temporaryKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
    if ([string]::IsNullOrWhiteSpace($temporaryKey)) {
        throw "No API key was entered."
    }
    $env:OPENROUTER_API_KEY = $temporaryKey
    $temporaryKey = $null
    & $python $generator
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
    Write-Host "Library generation completed. The key has been cleared." -ForegroundColor Green
} else {
    Write-Host "Generation stopped. Correct the reported key/account issue and rerun; completed clips will be reused." -ForegroundColor Red
}
Read-Host "Press Enter to close" | Out-Null
exit $generatorExit
