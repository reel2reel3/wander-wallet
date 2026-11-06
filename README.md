# WanderWallet — Creator Road Finance & Travel Expense Tracker

A full-stack, mobile-ready Progressive Web App (PWA) built for traveling YouTube channels to itemize hotels, crew meals, flights, gear, and permits across multiple currencies while tracking trip budget burn rates and sponsorship/AdSense ROI.

## Key Features
- **Organize by Production Trip / Destination**: Group expenses by shoot (e.g., *Japan Shoot - Nov 2026*, *Iceland Ring Road - Oct 2026*, *Swiss Alps Rail Series - Sep 2026*).
- **Mobile "Quick Add" & Camera Receipt Capture**: Responsive mobile bottom navigation bar + one-tap Quick Expense modal with phone camera (`capture="environment"`) receipt compression and SQLite storage.
- **Multi-Currency Entry & Auto-Conversion**: Enter expenses in local currency (`JPY`, `EUR`, `GBP`, `CHF`, `ISK`, `CAD`, `AUD`, `KRW`, `MXN`, `THB`, `USD`) with automatic conversion to your home currency (`USD`) and editable FX rates.
- **Trip Budgets & Daily Burn Rate**: Visual progress bars, remaining runway alerts, cost-per-video breakdown, and daily spend timeline charts.
- **Sponsorship & AdSense ROI Tracking**: Log brand integrations and YouTube AdSense revenue per trip to see real-time net profit and ROI multiples.
- **Accountant-Ready CSV & PDF Tax Exports**: One-click CSV export with IRS Schedule C categories, original currency, FX rate, USD total, meal deduction rules (100% on-camera vs. 50% travel meal toggle), and crew reimbursement flags.

## Deploying to Railway (Hobby Plan)
This repository is pre-configured for **Railway** (`railway.json` + `Dockerfile` + `/api/health` endpoint):

1. In your [Railway Dashboard](https://railway.com/dashboard), click **New Project** → **Deploy from GitHub repo** and select `reel2reel3/wayfarer-creator-finance`.
2. In your Railway service settings, make sure the branch is set to **`feat/wayfarer-app`** (the default branch).
3. **(Recommended for Persistent SQLite Storage)**: Right-click on the Railway canvas (or press `Cmd/Ctrl + K`) → **Add Volume**, attach it to your service, and set the mount path to:
   ```text
   /app/data
   ```
   (`server.js` automatically detects `RAILWAY_VOLUME_MOUNT_PATH` or `/app/data` so your trips, expenses, and receipt photos stay saved permanently across redeployments.)
4. Go to **Settings** → **Networking** → click **Generate Domain** to get your live `.up.railway.app` URL!
5. Open your Railway URL on your desktop, laptop, and phone (on iPhone Safari or Android Chrome, tap **Share → Add to Home Screen** to install **WanderWallet** as a full-screen mobile app).

## Running Locally
Requires Node.js 22.5+ (uses built-in `node:sqlite` and `node:http` with zero external npm dependencies required):

```bash
npm start
```
