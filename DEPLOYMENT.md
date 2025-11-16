# Deployment Guide

## Initial Setup

After merging this PR to the `main` branch, you'll need to configure GitHub Pages to use GitHub Actions:

1. Go to your repository settings on GitHub
2. Navigate to **Pages** (under "Code and automation")
3. Under "Build and deployment", change the **Source** to **GitHub Actions**
4. Save the changes

## Automatic Deployment

Once configured, every push to the `main` branch will automatically:
1. Build the Angular application
2. Create a production-optimized bundle
3. Deploy to GitHub Pages

The workflow is defined in `.github/workflows/deploy.yml`.

## Manual Deployment

If you need to deploy manually, you can:

1. Build the project locally:
   ```bash
   npm run deploy
   ```

2. The built files will be in `dist/browser/`

3. Deploy using GitHub CLI or your preferred method

## First Deployment

For the first deployment after merging this PR:

1. Ensure the branch is merged to `main`
2. Configure GitHub Pages settings as described above
3. The GitHub Action will run automatically
4. Your site will be available at `https://kiwifan1.github.io/`

## Troubleshooting

### Routes not working
- Ensure the `404.html` file exists in the deployment (it's automatically created)
- Verify the `.nojekyll` file is present (prevents Jekyll processing)

### Build fails
- Check that Node.js version 20 or higher is being used
- Verify all dependencies are installed (`npm ci`)
- Review build logs in the Actions tab

### Assets not loading
- Ensure the `res/` directory is included in the build
- Check that paths in templates use absolute paths (`/res/...`)
