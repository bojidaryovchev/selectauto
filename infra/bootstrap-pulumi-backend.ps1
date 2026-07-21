# Bootstrap script to create S3 bucket for Pulumi state storage
# Run this ONCE before using Pulumi

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-central-1",

    [Parameter(Mandatory=$false)]
    [string]$Profile,

    # State bucket name. S3 bucket names are GLOBALLY unique, so a fixed name
    # (e.g. "pulumi-state-selectauto") can only ever exist in ONE account and
    # collides when you bootstrap a second account. Leave this empty to get an
    # account-scoped default ("pulumi-state-selectauto-<accountId>"), which is
    # collision-free across accounts and matches the login URL the README shows.
    # Pass an explicit value only to reuse a pre-existing bucket name.
    [Parameter(Mandatory=$false)]
    [string]$BucketName
)

# Build base AWS CLI arguments
$awsArgs = @()
if ($Profile) {
    $awsArgs += "--profile", $Profile
}

# Get AWS account ID dynamically
$callerIdentityJson = & aws sts get-caller-identity --output json @awsArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to get AWS caller identity. Make sure you're logged in." -ForegroundColor Red
    exit 1
}

$callerIdentity = $callerIdentityJson | ConvertFrom-Json
$AccountId = $callerIdentity.Account
if (-not $BucketName) {
    # Account-scoped default keeps each account's state bucket globally unique.
    $BucketName = "pulumi-state-selectauto-$AccountId"
}

Write-Host "AWS Account: $AccountId" -ForegroundColor Cyan
Write-Host "Creating Pulumi state bucket: $BucketName in $Region" -ForegroundColor Cyan

# Create the S3 bucket
# Note: eu-central-1 requires LocationConstraint, us-east-1 does not
if ($Region -eq "us-east-1") {
    & aws s3api create-bucket --bucket $BucketName --region $Region @awsArgs
} else {
    & aws s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration "LocationConstraint=$Region" @awsArgs
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Bucket may already exist or there was an error. Continuing..." -ForegroundColor Yellow
}

# Enable versioning (important for state file safety)
Write-Host "Enabling versioning..." -ForegroundColor Cyan
& aws s3api put-bucket-versioning --bucket $BucketName --versioning-configuration "Status=Enabled" --region $Region @awsArgs

# Block all public access
Write-Host "Blocking public access..." -ForegroundColor Cyan
& aws s3api put-public-access-block --bucket $BucketName --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" --region $Region @awsArgs

# Enable server-side encryption.
# NOTE: S3 already applies SSE-S3 (AES256) to every new bucket by default (since
# Jan 2023), so this is belt-and-suspenders. We pass AWS CLI *shorthand* rather
# than a JSON string because Windows PowerShell strips the inner double quotes
# from an inline JSON arg before the native `aws` exe sees it (Invalid JSON).
Write-Host "Enabling encryption..." -ForegroundColor Cyan
& aws s3api put-bucket-encryption --bucket $BucketName --region $Region @awsArgs `
    --server-side-encryption-configuration 'Rules=[{ApplyServerSideEncryptionByDefault={SSEAlgorithm=AES256}}]'

Write-Host ""
Write-Host "Pulumi backend bucket ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
if ($Profile) {
    Write-Host "1. Set your AWS profile: `$env:AWS_PROFILE = '$Profile'" -ForegroundColor White
}
Write-Host "2. Login to Pulumi backend: pulumi login s3://${BucketName}?region=$Region" -ForegroundColor White
Write-Host "3. Initialize stack: cd infra; pulumi stack init dev" -ForegroundColor White
Write-Host "4. Run preview: pulumi preview" -ForegroundColor White
Write-Host ""
Write-Host "GitHub Secret to add:" -ForegroundColor Yellow
Write-Host "  PULUMI_BACKEND_URL: s3://${BucketName}?region=$Region" -ForegroundColor White
