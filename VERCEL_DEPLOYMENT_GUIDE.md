# Harbor & Thread — Vercel Deployment Guide

Your codebase is now **100% Vercel Ready**. All static pages and backend API endpoints are configured with serverless routing.

---

## What Has Been Configured for Vercel

1. **`vercel.json`**: Configures clean URLs, security headers, and automatic routing of all `/api/*` endpoints to the serverless function.
2. **`api/index.js`**: Dedicated Vercel serverless function entrypoint supporting all REST endpoints:
   - `GET /api/products` (Catalog & New Arrivals)
   - `POST /api/orders` & `GET /api/orders` (Guest & Member Checkout + Lookup)
   - `POST /api/newsletter` (Subscription + Instant Confirmation Email)
   - `POST /api/feedback` & `GET /api/feedback` (Atelier Customer Reviews)
   - `GET /api/health`
3. **`package.json`**: Added standard `"build"` script for Vercel pipeline.
4. **`.gitignore`**: Added `.vercel` and secrets protection.

---

## Option 1: Deploy with Vercel CLI (Recommended & Fastest)

If you have Node.js and a terminal open:

1. In your terminal in this project folder (`f:\Responsive Webpage with Chatgpt`), run:
   ```bash
   npx vercel
   ```
2. Follow the 3 prompts:
   - **Set up and deploy?** Press `y` (Enter)
   - **Which scope?** Select your Vercel account
   - **Link to existing project?** Press `n` (Enter)
   - **What's your project's name?** Press Enter (or type `harbor-and-thread`)
   - **In which directory is your code located?** Press Enter (`./`)
3. Vercel will build and deploy your site in ~30 seconds and give you a live production URL:
   ```text
   ✅ Production: https://harbor-and-thread.vercel.app
   ```

---

## Option 2: Deploy via Vercel Web Dashboard (GitHub / GitLab)

1. Upload or push this folder to your GitHub / GitLab account:
   ```bash
   git init
   git add .
   git commit -m "Harbor & Thread full-stack fashion website"
   git branch -M main
   git remote add origin https://github.com/<your-username>/harbor-and-thread.git
   git push -u origin main
   ```
2. Go to **[vercel.com/new](https://vercel.com/new)** and sign in.
3. Click **"Import"** next to your `harbor-and-thread` repository.
4. Leave all default build settings as is (Vercel automatically detects `vercel.json`).
5. Click **"Deploy"**.

---

## Environment Variables on Vercel (Optional)

In your Vercel Project Settings → **Environment Variables**, you can optionally add:
- `SUPABASE_URL`: `https://nyjtsnwlnrmgiqladvsa.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_vJxuCCdiIRv2rEK1dgj1mA_0hnkx8E4`
- `DB_PASSWORD`: `@8Ve4C-9!xcuRua`
