![Kojo-Deploy Banner](./assets/banner.png)

# Kojo-Deploy 🚀

[![npm package](https://img.shields.io/badge/npm-kojo--deploy-blue)](https://www.npmjs.com/package/kojo-deploy)
[![github repo](https://img.shields.io/badge/github-repo-black?logo=github)](https://github.com/KojoShaddy/Kojo-Deploy)

A lightweight, npm-integrated CLI utility designed to simplify the developer experience when hosting applications on Google Cloud Platform.

## Features
- **One-Command Deployment**: `npx kojo-deploy` handles everything.
- **Auto-Auth**: Automatically checks and prompts for GCP authentication.
- **Smart Defaults**: Infers service names and project settings.
- **Zero-Config Docker**: Generates a Dockerfile if one is missing.
- **Cloud Run Ready**: Scales your app from zero to hero automatically.
- **Live URL**: Instant production URL provided at the end.
- **Upcoming**: Real-time log streaming with `--logs` flag (coming soon!)

![Kojo-Deploy Demo](./assets/demo.jpg)


## Prerequisites
- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) installed.
- A GCP Project with Billing enabled.

## Quick Start
### Option 1
You can deploy your project in seconds without even installing it:
```bash
npx kojo-deploy 
```

### Option 2
1. **Add Kojo-Deploy to your project:**
   ```bash
   npm install --save-dev kojo-deploy
   ```

2. **Deploy:**
   ```bash
   npm run kojo-deploy
   ```

## Workflow
1. **Authentication**: Checks if you are logged in; opens browser if not.
2. **Configuration**: Prompts for Project ID and Service Name.
3. **Containerization**: Builds your app using Google Cloud Build.
4. **Deployment**: Deploys the image to Cloud Run (Managed) with unauthenticated access enabled.

## Authentication Under the Hood

The authentication check essentially **delegates** to GCP's own authentication system rather than reimplementing it. 

### What It Does vs. Doesn't Do

| What Kojo-Deploy Does | What It Doesn't Do |
| :----------------------- | :-------------------- |
| ✅ Leverages GCP's native auth system | ❌ Doesn't store credentials |
| ✅ Uses secure Google OAuth flow | ❌ Doesn't handle token refresh manually |
| ✅ Works across all platforms (Windows, Mac, Linux) | ❌ Doesn't reinvent the wheel |
| ✅ Automatically uses your existing GCP sessions | ❌ Doesn't require additional setup |
| ✅ Supports multi-account scenarios | ❌ Doesn't manage multiple auth providers |

### The Flow in Action

```txt
User runs kojo-deploy
    ↓
✅ checkGcloud() → Confirms gcloud exists
    ↓
✅ checkAuth() → Queries gcloud auth list
    ↓
    ├─→ Active account found? → Continue deployment 
    ├─→ No active account? → Spawn browser login 
    │                         → gcloud auth login
    │                         → OAuth redirect to Google
    │                         → User authenticates
    │                         → Return to terminal with fresh session
    │                         → Continue deployment 
    └─→ Error? → Exit gracefully 
```

### The Bottom Line 

Kojo-Deploy doesn't play authentication, it plays orchestra conductor. It orchestrates Google Cloud's battle-tested authentication system through elegant CLI commands and smart error handling. This is why it's so reliable, so secure, and so effortless for users.

## Environment Variables & Secrets
### Local Environment Variables
If a `.env` file is present in your project's root directory, Kojo-Deploy will automatically read it and inject the environment variables into your Cloud Run service during deployment. **Note:** `.env` is typically excluded from version control by `.gitignore` automatically.

### Google Secret Manager Integration
For sensitive values (like database passwords or API keys) in production, you should use Google Secret Manager rather than plain text environment variables. Kojo-Deploy automatically enables the Secret Manager API in your GCP project.

You can securely pass secrets to your service using the `--secrets` flag, mapping the environment variable name to the Secret Manager path:
```bash
npx kojo-deploy --secrets "DB_PASS=projects/PROJECT_ID/secrets/db_password/versions/latest"
```
If using an npm script, pass the arguments like this:
```bash
npm run kojo-deploy -- --secrets "API_KEY=projects/PROJECT_ID/secrets/my_api_key/versions/latest"
```


Kojo-Deploy acts as a "digital engine" for developers making cloud infrastructure accessible and fast, so developers can focus on writing code rather than managing console.

---
Created with ❤️ by [Shadrack Inusah](https://kojoshaddy.pages.dev/)
