$ErrorActionPreference = "Stop"
$voiceToolDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$voiceBuilder = Join-Path $voiceToolDir "2026-08-30-build-player-leo-runtime-catalog.py"
$voiceGenerator = Join-Path $voiceToolDir "2026-08-30-generate-player-leo-library.py"
$voicePython = "C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$voiceExit = 1

Write-Host ""
Write-Host "UNDERSTAR - THE MINER / LEO EVENT VOICE LIBRARY" -ForegroundColor Cyan
Write-Host "96 authored clips, 16 gameplay-event families, one approved Titan take preserved." -ForegroundColor White
Write-Host "Planned provider work: 95 clips / 9,239 characters / approximately USD 0.138585." -ForegroundColor White
Write-Host "Hard local cap: USD 1.00. User maximum remains EUR 5.00." -ForegroundColor Yellow
Write-Host "The key is masked, process-local, and cleared after this run." -ForegroundColor DarkGray
Write-Host ""

& $voicePython $voiceBuilder
if ($LASTEXITCODE -ne 0) {
    Write-Host "Runtime catalog build failed before any key was requested." -ForegroundColor Red
    Read-Host "Press Enter to close" | Out-Null
    exit $LASTEXITCODE
}
& $voicePython $voiceGenerator --validate-only
if ($LASTEXITCODE -ne 0) {
    Write-Host "Library validation failed before any key was requested." -ForegroundColor Red
    Read-Host "Press Enter to close" | Out-Null
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Paste a fresh OpenRouter key below. Input is masked." -ForegroundColor Green
$voiceSecureKey = Read-Host "OpenRouter key" -AsSecureString
$voiceKeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($voiceSecureKey)
try {
    $voiceTemporaryKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($voiceKeyPointer)
    if ([string]::IsNullOrWhiteSpace($voiceTemporaryKey)) {
        throw "No API key was entered."
    }
    $env:OPENROUTER_API_KEY = $voiceTemporaryKey
    $voiceTemporaryKey = $null
    & $voicePython $voiceGenerator
    $voiceExit = $LASTEXITCODE
}
finally {
    Remove-Item Env:OPENROUTER_API_KEY -ErrorAction SilentlyContinue
    if ($voiceKeyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($voiceKeyPointer)
    }
    $voiceSecureKey = $null
}

Write-Host ""
if ($voiceExit -eq 0) {
    Write-Host "LEO library generation completed. The key has been cleared." -ForegroundColor Green
} else {
    Write-Host "Generation stopped. Fix the reported key/account issue and rerun; valid completed clips are reused." -ForegroundColor Red
}
Read-Host "Press Enter to close" | Out-Null
exit $voiceExit
