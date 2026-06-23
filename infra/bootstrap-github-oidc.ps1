# Bootstrap script to create GitHub OIDC provider and IAM role for GitHub Actions
# Run this ONCE to enable passwordless AWS auth from GitHub Actions

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubOrg,  # Your GitHub username or organization
    
    [Parameter(Mandatory=$true)]
    [string]$GitHubRepo, # Your repository name (e.g., "ecommerce-store")
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-central-1",
    
    [Parameter(Mandatory=$false)]
    [string]$Profile,
    
    [Parameter(Mandatory=$false)]
    [string]$RoleName = "github-actions-pulumi"
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

Write-Host "AWS Account: $AccountId" -ForegroundColor Cyan
Write-Host "Setting up GitHub OIDC for $GitHubOrg/$GitHubRepo" -ForegroundColor Cyan

# Step 1: Create OIDC Identity Provider (may already exist)
Write-Host ""
Write-Host "Step 1: Creating GitHub OIDC Provider..." -ForegroundColor Yellow

$oidcArn = "arn:aws:iam::${AccountId}:oidc-provider/token.actions.githubusercontent.com"

# Check if provider exists
$null = & aws iam get-open-id-connect-provider --open-id-connect-provider-arn $oidcArn @awsArgs 2>$null

if ($LASTEXITCODE -ne 0) {
    # Create OIDC provider
    & aws iam create-open-id-connect-provider `
        --url "https://token.actions.githubusercontent.com" `
        --client-id-list "sts.amazonaws.com" `
        --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" "1c58a3a8518e8759bf075b76b750d4f2df264fcd" `
        @awsArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OIDC Provider created" -ForegroundColor Green
    } else {
        Write-Host "  Failed to create OIDC Provider" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  OIDC Provider already exists" -ForegroundColor Green
}

# Step 2: Create IAM Role Trust Policy
Write-Host ""
Write-Host "Step 2: Creating IAM Role..." -ForegroundColor Yellow

# Build trust policy JSON
$trustPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Principal = @{
                Federated = "arn:aws:iam::${AccountId}:oidc-provider/token.actions.githubusercontent.com"
            }
            Action = "sts:AssumeRoleWithWebIdentity"
            Condition = @{
                StringEquals = @{
                    "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
                }
                StringLike = @{
                    "token.actions.githubusercontent.com:sub" = "repo:${GitHubOrg}/${GitHubRepo}:*"
                }
            }
        }
    )
} | ConvertTo-Json -Depth 10 -Compress

# Create the role
$null = & aws iam create-role `
    --role-name $RoleName `
    --assume-role-policy-document $trustPolicy `
    --description "Role for GitHub Actions to deploy Pulumi infrastructure" `
    @awsArgs 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  IAM Role created" -ForegroundColor Green
} else {
    Write-Host "  Role may already exist, updating trust policy..." -ForegroundColor Yellow
    & aws iam update-assume-role-policy `
        --role-name $RoleName `
        --policy-document $trustPolicy `
        @awsArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Trust policy updated" -ForegroundColor Green
    } else {
        Write-Host "  Failed to update trust policy" -ForegroundColor Red
    }
}

# Step 3: Attach policies to the role
Write-Host ""
Write-Host "Step 3: Attaching policies..." -ForegroundColor Yellow

& aws iam attach-role-policy `
    --role-name $RoleName `
    --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess" `
    @awsArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "  AdministratorAccess policy attached" -ForegroundColor Green
} else {
    Write-Host "  Policy may already be attached" -ForegroundColor Yellow
}

Write-Host "  Consider using a more restrictive policy for production!" -ForegroundColor Yellow

# Output
$roleArn = "arn:aws:iam::${AccountId}:role/${RoleName}"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " GitHub OIDC Setup Complete!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add these secrets to your GitHub repository:" -ForegroundColor Yellow
Write-Host "  Settings -> Secrets and variables -> Actions -> New repository secret" -ForegroundColor White
Write-Host ""
Write-Host "  AWS_ROLE_ARN:" -ForegroundColor Cyan
Write-Host "    $roleArn" -ForegroundColor White
Write-Host ""
Write-Host "  PULUMI_CONFIG_PASSPHRASE:" -ForegroundColor Cyan
Write-Host "    (the passphrase you set when creating the Pulumi stack)" -ForegroundColor White
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
