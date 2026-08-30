param(
    [Parameter(Mandatory = $true)]
    [string]$PythonExecutable
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$generator = Join-Path $PSScriptRoot '2026-08-26-generate-elevenlabs-material-stems-v4.py'
$batchRoot = Join-Path $workspaceRoot 'sound\library-v2\SoundLibrary_Review\00_INBOX_RAW_EXPORTS\elevenlabs-material-stems-v4-pilot-2026-08-26'
$planPath = Join-Path $batchRoot '2026-08-26-elevenlabs-material-stems-v4-plan.json'

if (-not (Test-Path -LiteralPath $PythonExecutable -PathType Leaf)) {
    throw "Python executable not found: $PythonExecutable"
}
if (-not (Test-Path -LiteralPath $planPath -PathType Leaf)) {
    throw "Prepared V4 plan not found: $planPath"
}

$plan = Get-Content -Raw -LiteralPath $planPath | ConvertFrom-Json
$maxGenerations = [int]$plan.plannedJobs
$maxCreditUnits = [int]$plan.conservativeCreditCeiling

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$form = [System.Windows.Forms.Form]::new()
$form.Text = 'ElevenLabs V4 temporary key'
$form.ClientSize = [System.Drawing.Size]::new(560, 178)
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.TopMost = $true
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
$form.MaximizeBox = $false
$form.MinimizeBox = $false

$label = [System.Windows.Forms.Label]::new()
$label.Text = "Paste a temporary ElevenLabs key. It stays in memory and is cleared after the capped $maxGenerations-request run."
$label.Location = [System.Drawing.Point]::new(18, 18)
$label.Size = [System.Drawing.Size]::new(525, 42)
$keyBox = [System.Windows.Forms.TextBox]::new()
$keyBox.Location = [System.Drawing.Point]::new(18, 69)
$keyBox.Size = [System.Drawing.Size]::new(525, 28)
$keyBox.UseSystemPasswordChar = $true
$cancel = [System.Windows.Forms.Button]::new()
$cancel.Text = 'Cancel'
$cancel.Location = [System.Drawing.Point]::new(370, 119)
$cancel.Size = [System.Drawing.Size]::new(80, 30)
$cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$run = [System.Windows.Forms.Button]::new()
$run.Text = 'Generate'
$run.Location = [System.Drawing.Point]::new(463, 119)
$run.Size = [System.Drawing.Size]::new(80, 30)
$run.DialogResult = [System.Windows.Forms.DialogResult]::OK
$form.Controls.AddRange(@($label, $keyBox, $cancel, $run))
$form.AcceptButton = $run
$form.CancelButton = $cancel
$form.Add_Shown({ $keyBox.Focus() })

$dialogResult = $form.ShowDialog()
if ($dialogResult -ne [System.Windows.Forms.DialogResult]::OK -or [string]::IsNullOrWhiteSpace($keyBox.Text)) {
    $keyBox.Clear()
    $form.Dispose()
    Write-Host 'Generation cancelled; no API requests were made.'
    exit 3
}

$apiKey = $keyBox.Text.Trim()
$keyBox.Clear()
$form.Dispose()
$runExit = 1
try {
    $env:ELEVENLABS_API_KEY = $apiKey
    & $PythonExecutable -B $generator --execute `
        --max-generations $maxGenerations `
        --max-credit-units $maxCreditUnits
    $runExit = $LASTEXITCODE
}
finally {
    Remove-Item Env:ELEVENLABS_API_KEY -ErrorAction SilentlyContinue
    $apiKey = $null
}

exit $runExit
