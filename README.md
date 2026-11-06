# Wayfarer — Creator Road Finance & Travel Expense Tracker

A full-stack, mobile-ready Progressive Web App (PWA) built for traveling YouTube channels to itemize hotels, crew meals, flights, gear, and permits across multiple currencies while tracking trip budget burn rates and sponsorship/AdSense ROI.

## Key Features
- **Organize by Production Trip / Destination**: Group expenses by shoot (e.g., *Japan Shoot - Nov 2026*, *Iceland Ring Road - Oct 2026*, *Swiss Alps Rail Series - Sep 2026*).
- **Mobile "Quick Add" & Camera Receipt Capture**: Responsive mobile bottom navigation bar + one-tap Quick Expense modal with phone camera (`capture="environment"`) receipt compression and SQLite storage.
- **Multi-Currency Entry & Auto-Conversion**: Enter expenses in local currency (`JPY`, `EUR`, `GBP`, `CHF`, `ISK`, `CAD`, `AUD`, `KRW`, `MXN`, `THB`, `USD`) with automatic conversion to your home currency (`USD`) and editable FX rates.
- **Trip Budgets & Daily Burn Rate**: Visual progress bars, remaining runway alerts, cost-per-video breakdown, and daily spend timeline charts.
- **Sponsorship & AdSense ROI Tracking**: Log brand integrations and YouTube AdSense revenue per trip to see real-time net profit and ROI multiples.
- **Accountant-Ready CSV & PDF Tax Exports**: One-click CSV export with IRS Schedule C categories, original currency, FX rate, USD total, meal deduction rules (100% on-camera vs. 50% travel meal toggle), and crew reimbursement flags.

## Running Locally
Requires Node.js 22.5+ (uses built-in `node:sqlite` and `node:http` with zero external npm dependencies required):

```bash
npm start
```

## Deploying for Cross-Device Access (Desktop, Laptop & Phone)
1. Push this repository to GitHub.
2. Connect the repository to **Railway**, **Render**, or **Fly.io** (uses the included `Dockerfile` or `npm start`).
3. Mount a persistent volume to `/app/data` so your SQLite database (`data/finance.db`) persists across deploys.
4. On your phone (iOS Safari or Android Chrome), open your deployed URL and tap **"Add to Home Screen"** to install Wayfarer as a standalone full-screen mobile app.
