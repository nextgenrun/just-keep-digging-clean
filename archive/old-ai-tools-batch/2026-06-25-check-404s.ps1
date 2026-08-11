# Quick Powershell script to check import paths that might cause 404s
Write-Host "Checking for remaining broken import patterns..."
$files = Get-ChildItem -Recurse -Filter *.js -Path "C:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned"

$patterns = @(
    "values/constants",
    "values/audio/audioConfig",
    "values/input/",
    "values/ui/uiColors",
    "overlays/PhaserUiKit",
    "../shared/",
    "./shared/"
)

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    foreach ($pattern in $patterns) {
        if ($content -match $pattern) {
            $rel = [System.IO.Path]::GetRelativePath("C:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned", $file.FullName)
            Write-Host "  $rel : $pattern" -ForegroundColor Yellow
        }
    }
}
Write-Host "Done."