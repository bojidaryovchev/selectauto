# Manually start the full inventory backfill Step Function.
#
# Reads the state machine ARN from the Pulumi stack output and starts an
# execution with the full-backfill input (mode=full, no minutes, per_page=1000).
#
# Usage:
#   $env:AWS_PROFILE = "your-sso-profile"
#   ./scripts/start-backfill.ps1                 # start from page 1
#   ./scripts/start-backfill.ps1 -StartPage 42   # resume from a checkpoint page

param(
    [int]$StartPage = 1,
    [int]$PerPage = 1000
)

Push-Location "$PSScriptRoot/../infra"
try {
    $arn = pulumi stack output stateMachineArns --show-secrets | ConvertFrom-Json | Select-Object -ExpandProperty fullInventoryBackfill
} finally {
    Pop-Location
}

if (-not $arn) {
    Write-Host "Could not read fullInventoryBackfill ARN from Pulumi outputs." -ForegroundColor Red
    exit 1
}

$payload = @{
    flowType = "full_backfill"
    mode     = "full"
    page     = $StartPage
    perPage  = $PerPage
} | ConvertTo-Json -Compress

# Pass the input via a temp file (file://) rather than inline. PowerShell mangles
# the embedded double-quotes when a JSON string is passed directly as a CLI arg,
# which the AWS CLI then rejects ("was expecting double-quote..."). A UTF-8 file
# (no BOM) sidesteps all shell quoting.
$inputFile = Join-Path $env:TEMP "backfill-input-$(Get-Date -Format yyyyMMddHHmmss).json"
[System.IO.File]::WriteAllText($inputFile, $payload, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Starting backfill on $arn from page $StartPage (per_page=$PerPage)..." -ForegroundColor Cyan

try {
    aws stepfunctions start-execution `
        --state-machine-arn $arn `
        --name "backfill-$(Get-Date -Format yyyyMMdd-HHmmss)" `
        --input "file://$inputFile"
} finally {
    Remove-Item $inputFile -ErrorAction SilentlyContinue
}
