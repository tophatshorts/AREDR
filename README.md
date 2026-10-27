# AREDR — All Rated Extreme Demon RNG

The ultimate Geometry Dash Extreme Demon RNG web application, featuring all 1644 ranked Extreme Demons from AREDL, CS:GO-style spinner animations, cinematic cutscenes, upgrade vaults, personal codexes, and verified global leaderboards.

---

## 🚀 How to Publish & Deploy to GitHub Pages

This project is pre-configured for **GitHub Pages** with automated builds and deployments via GitHub Actions.

### Step 1: Push the Code to GitHub
If you haven't initialized git yet:
```bash
git init
git add .
git commit -m "Initial commit - AREDR extreme demon RNG"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

### Step 2: Enable GitHub Pages in Repository Settings
1. Open your repository on **GitHub**.
2. Click on the **Settings** tab at the top.
3. In the left sidebar, click **Pages** (under "Code and automation").
4. Under **Build and deployment** > **Source**, select **GitHub Actions**.
5. That's it! GitHub will automatically trigger the included workflow (`.github/workflows/deploy.yml`), build the site, and publish it at:
   `https://<YOUR_USERNAME>.github.io/<YOUR_REPO_NAME>/`

---

## 🔑 Firebase Setup for GitHub Pages

To allow Google Sign-In and Cloud Saves on your GitHub Pages site:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **`gen-lang-client-0358715185`** (or your own Firebase project).
3. In the left navigation, click **Authentication** > **Settings** tab > **Authorized domains**.
4. Click **Add domain** and enter your GitHub Pages domain:
   - `your-username.github.io`
5. Click **Save**. Now players can log in and sync leaderboards directly from GitHub Pages!

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```
