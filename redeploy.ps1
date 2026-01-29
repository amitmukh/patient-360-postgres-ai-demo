# =============================================================================
# Patient 360 - Quick Redeploy Script
# =============================================================================
# Use this to manually redeploy after code changes
# Run: .\redeploy.ps1 -Component frontend  (or backend)
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("frontend", "backend", "both")]
    [string]$Component
)

$ErrorActionPreference = "Stop"

# Configuration
$RESOURCE_GROUP = "patient360-rg"
$ACR_NAME = "patient360acr"
$BACKEND_APP_NAME = "patient360-backend"
$FRONTEND_APP_NAME = "patient360-frontend"
$BACKEND_URL = "https://patient360-backend.ashystone-2d6419e3.eastus.azurecontainerapps.io"

# Run from project root
Set-Location $PSScriptRoot

if ($Component -eq "backend" -or $Component -eq "both") {
    Write-Host "🔨 Building Backend..." -ForegroundColor Cyan
    az acr build `
        --registry $ACR_NAME `
        --image patient360-backend:latest `
        .\backend\
    
    Write-Host "🚀 Updating Container App..." -ForegroundColor Cyan
    az containerapp update `
        --name $BACKEND_APP_NAME `
        --resource-group $RESOURCE_GROUP `
        --image "$ACR_NAME.azurecr.io/patient360-backend:latest"
    
    Write-Host "✅ Backend deployed!" -ForegroundColor Green
}

if ($Component -eq "frontend" -or $Component -eq "both") {
    Write-Host "🔨 Building Frontend..." -ForegroundColor Cyan
    az acr build `
        --registry $ACR_NAME `
        --image patient360-frontend:latest `
        --build-arg NEXT_PUBLIC_API_BASE_URL="$BACKEND_URL" `
        .\frontend\
    
    Write-Host "🚀 Restarting Web App..." -ForegroundColor Cyan
    az webapp restart -g $RESOURCE_GROUP -n $FRONTEND_APP_NAME
    
    Write-Host "✅ Frontend deployed!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "Frontend: https://patient360-frontend.azurewebsites.net" -ForegroundColor Yellow
Write-Host "Backend:  $BACKEND_URL" -ForegroundColor Yellow
