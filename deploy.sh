#!/bin/bash

# Deploy CV to GitHub Pages
# Run this script from the cv-repo directory

REPO_NAME="cv"
GITHUB_USER="mahmoodhamdi"

echo "🚀 Setting up GitHub repo and deploying to Pages..."

# Configure git
git config user.name "Mahmoud Hamdy"
git config user.email "hmdy7486@gmail.com"

# Add and commit
git add -A
git commit -m "feat: add professional bilingual portfolio CV"

# Create GitHub repo (requires gh CLI authenticated)
gh repo create "$REPO_NAME" --public --source=. --remote=origin --description "Professional bilingual portfolio CV — English & Arabic" 2>/dev/null

# If gh not available, set remote manually
if [ $? -ne 0 ]; then
    echo "⚠️  gh CLI not available. Setting remote manually..."
    echo "Make sure you created the repo '$REPO_NAME' on GitHub first!"
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git" 2>/dev/null
fi

# Push to main
git push -u origin main

# Enable GitHub Pages via gh CLI
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/$GITHUB_USER/$REPO_NAME/pages" \
  -f "source[branch]=main" \
  -f "source[path]=/" 2>/dev/null

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Done! Your CV is live at:"
    echo "🔗 https://$GITHUB_USER.github.io/$REPO_NAME"
else
    echo ""
    echo "⚠️  Enable GitHub Pages manually:"
    echo "   1. Go to https://github.com/$GITHUB_USER/$REPO_NAME/settings/pages"
    echo "   2. Source → Deploy from a branch"
    echo "   3. Branch → main, folder → / (root)"
    echo "   4. Click Save"
    echo ""
    echo "🔗 Your CV will be at: https://$GITHUB_USER.github.io/$REPO_NAME"
fi
