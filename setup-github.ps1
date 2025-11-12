Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  World Radio Map - GitHub Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Get user information
Write-Host "Let's set up your Git configuration..." -ForegroundColor Yellow
Write-Host ""

$name = Read-Host "Enter your name (for Git commits)"
$email = Read-Host "Enter your email (GitHub email)"
$username = Read-Host "Enter your GitHub username"
$repoName = Read-Host "Enter repository name (e.g., world-radio-map)"

Write-Host ""
Write-Host "Configuring Git..." -ForegroundColor Green

# Configure Git
git config user.name "$name"
git config user.email "$email"

Write-Host "✓ Git configured successfully!" -ForegroundColor Green
Write-Host ""

# Create commit
Write-Host "Creating initial commit..." -ForegroundColor Green
git add .
git commit -m "Initial commit: World Radio Map with 10,000+ stations, music visualizer, and mobile responsive design"

Write-Host "✓ Commit created successfully!" -ForegroundColor Green
Write-Host ""

# Add remote
$remoteUrl = "https://github.com/$username/$repoName.git"
Write-Host "Adding GitHub remote: $remoteUrl" -ForegroundColor Green
git remote add origin $remoteUrl

Write-Host "✓ Remote added successfully!" -ForegroundColor Green
Write-Host ""

# Rename branch
Write-Host "Renaming branch to main..." -ForegroundColor Green
git branch -M main

Write-Host "✓ Branch renamed successfully!" -ForegroundColor Green
Write-Host ""

# Display next steps
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to GitHub and create a new repository:" -ForegroundColor Yellow
Write-Host "   https://github.com/new" -ForegroundColor White
Write-Host ""
Write-Host "2. Repository name: $repoName" -ForegroundColor Yellow
Write-Host "3. DO NOT initialize with README" -ForegroundColor Yellow
Write-Host "4. Click 'Create repository'" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. After creating the repo, run:" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$push = Read-Host "Have you created the GitHub repository? (y/n)"

if ($push -eq "y" -or $push -eq "Y") {
    Write-Host ""
    Write-Host "Pushing to GitHub..." -ForegroundColor Green
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==================================" -ForegroundColor Green
        Write-Host "  SUCCESS! " -ForegroundColor Green
        Write-Host "==================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your project is now on GitHub!" -ForegroundColor Green
        Write-Host "Visit: https://github.com/$username/$repoName" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To enable GitHub Pages:" -ForegroundColor Yellow
        Write-Host "1. Go to repository Settings > Pages" -ForegroundColor White
        Write-Host "2. Select 'main' branch as source" -ForegroundColor White
        Write-Host "3. Your site will be live at:" -ForegroundColor White
        Write-Host "   https://$username.github.io/$repoName" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "Push failed. You might need to:" -ForegroundColor Red
        Write-Host "1. Create the repository on GitHub first" -ForegroundColor Yellow
        Write-Host "2. Use a Personal Access Token instead of password" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "See GITHUB-SETUP.md for detailed instructions" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "No problem! When you're ready:" -ForegroundColor Yellow
    Write-Host "1. Create the repository on GitHub" -ForegroundColor White
    Write-Host "2. Run: git push -u origin main" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
