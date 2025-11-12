# GitHub Setup Instructions

## Step 1: Configure Git (First Time Only)

Open PowerShell or Command Prompt and run these commands:

```bash
# Set your name (replace with your actual name)
git config --global user.name "Your Name"

# Set your email (use the email associated with your GitHub account)
git config --global user.email "your.email@example.com"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `world-radio-map` (or your preferred name)
3. Description: "Interactive world map to discover and listen to 10,000+ radio stations"
4. Choose: Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 3: Push to GitHub

After creating the repository on GitHub, run these commands in PowerShell:

```bash
# Navigate to your project
cd c:\Users\psant\Desktop\radio

# Configure git identity (if you haven't done Step 1)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Create initial commit
git add .
git commit -m "Initial commit: World Radio Map with 10,000+ stations, music visualizer, and mobile responsive design"

# Add your GitHub repository as remote (replace USERNAME and REPO-NAME)
git remote add origin https://github.com/USERNAME/REPO-NAME.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 4: Quick Commands (Copy & Paste)

**Replace these values:**
- `USERNAME` → Your GitHub username
- `REPO-NAME` → Your repository name
- `Your Name` → Your actual name
- `your.email@example.com` → Your GitHub email

```powershell
# All-in-one setup (customize first!)
cd c:\Users\psant\Desktop\radio
git config user.name "Your Name"
git config user.email "your.email@example.com"
git add .
git commit -m "Initial commit: World Radio Map"
git remote add origin https://github.com/USERNAME/REPO-NAME.git
git branch -M main
git push -u origin main
```

## Step 5: Verify

After pushing, visit:
`https://github.com/USERNAME/REPO-NAME`

You should see all your files!

## Step 6: Enable GitHub Pages (Optional)

To host your site for free:

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Click "Pages" in left sidebar
4. Under "Source", select "main" branch
5. Click "Save"
6. Your site will be live at: `https://USERNAME.github.io/REPO-NAME`

## Troubleshooting

### Authentication Error?

If you get authentication errors when pushing, you need to use a Personal Access Token:

1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "World Radio Map"
4. Select scopes: `repo` (full control)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)
7. When git asks for password, paste the token instead

### Already have a repository?

To push to an existing repository:

```bash
git remote add origin https://github.com/USERNAME/EXISTING-REPO.git
git branch -M main
git push -f origin main  # Force push (WARNING: overwrites existing content)
```

## Future Updates

To push future changes:

```bash
git add .
git commit -m "Description of changes"
git push
```

## Need Help?

- GitHub Docs: https://docs.github.com/en/get-started
- Git Docs: https://git-scm.com/doc
- Create an issue in this repo if you need assistance
