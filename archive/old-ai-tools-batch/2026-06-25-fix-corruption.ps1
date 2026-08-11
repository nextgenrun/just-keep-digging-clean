# Fix corrupted XML tags appended to all source files
$root = "c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned"
$extensions = @("*.js", "*.html", "*.bat", "*.py", "*.md")
$count = 0
foreach ($ext in $extensions) {
    Get-ChildItem -Path $root -Recurse -Filter $ext | ForEach-Object {
        $content = Get-Content -Path $_.FullName -Raw
        if ($content -match "") {
            $clean = $content -replace "(?s)\s*\s*\s*", ""
            Set-Content -Path $_.FullName -Value $clean -Force -NoNewline
            Write-Host "FIXED: $($_.Name)"
            $count++
        }
    }
}
Write-Host "Fixed $count files"
