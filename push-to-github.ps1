# ============================================================
# Bank Brief — Push to GitHub
# Right-click → Run with PowerShell
# ============================================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Bank Brief — Pushing to GitHub" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = "C:\Personal\4_Website\bank-brief"
Set-Location $projectPath

# Check if git repo exists
if (-not (Test-Path ".git")) {
    Write-Host "Initialising git repo..." -ForegroundColor Yellow
    git init
    git branch -M main
    git remote add origin git@github.com:tarunpreet-kaur/Bank-Brief.git
}

# Verify remote is set correctly
$remote = git remote get-url origin 2>&1
Write-Host "Remote: $remote" -ForegroundColor Gray

# Show what will be committed
Write-Host ""
Write-Host "Files to be committed:" -ForegroundColor Yellow
git status --short

Write-Host ""

# Stage all (secrets are excluded by .gitignore)
git add .

# Confirm .env.local is NOT staged
$staged = git diff --cached --name-only
if ($staged -match "\.env") {
    Write-Host "WARNING: .env file detected in staged files!" -ForegroundColor Red
    Write-Host "Unstaging it now for safety..." -ForegroundColor Red
    git reset HEAD .env.local
    git reset HEAD .env
}

# Commit
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "chore: project setup — config files, gitignore, API guide ($timestamp)"

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "  Pushed successfully!" -ForegroundColor Green
    Write-Host "  https://github.com/tarunpreet-kaur/Bank-Brief" -ForegroundColor White
    Write-Host "=========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Push failed. Common fixes:" -ForegroundColor Red
    Write-Host "  1. Run: ssh -T git@github.com  (to test SSH)" -ForegroundColor White
    Write-Host "  2. Check the remote URL is correct" -ForegroundColor White
    Write-Host "  3. Make sure the GitHub repo exists" -ForegroundColor White
}

Write-Host ""
Read-Host "Press Enter to close"
