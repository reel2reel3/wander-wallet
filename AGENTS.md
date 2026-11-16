# Wander Wallet — Workspace Rules

1. **Always Commit & Push to GitHub Automatically**:
   - After making code or UI changes, always stage, commit, and run `git push origin WanderWallet-app` automatically without asking for confirmation first. The live Railway deployment (`wander-wallet`) builds from `origin/WanderWallet-app`.
2. **Cache-Busting & Static Sync**:
   - Whenever `public/app.js`, `public/index.html`, or `public/styles.css` is modified, increment the query string version in `public/index.html` (e.g., `app.js?v=...`) and `CACHE_NAME` in `public/sw.js`, and copy `public/*` to `docs/*` before committing and pushing.
3. **App Focus (Rewards & Loyalty + Trip Expenses)**:
   - Keep all Trip and Expense views focused on travel rewards, loyalty programs, and trip expenses. Do not tie trip expenses or budgets to "Production", "YouTube", "Shoot", or "Sponsors & AdSense" metrics. The standalone Sponsors & AdSense tab is controlled exclusively by the ON/OFF toggle in **Admin**.
