# Daily Deals & Finds (Auto)

Hands-off programmatic content:
- Pulls RSS/Atom feeds
- Creates roundup posts
- Auto-affiliates links with Skimlinks
- Builds static site
- Notifies Zapier/Make to create a beehiiv email (draft/send)

## One-time setup (high level)
1) Create accounts: GitHub, Cloudflare Pages (or Netlify), Skimlinks, beehiiv, Zapier (or Make).
2) Add repo secrets (GitHub → Settings → Secrets and variables → Actions):
   - SKIMLINKS_PID
   - BEEHIIV_URL
   - ZAPIER_WEBHOOK_URL (optional)
   - CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_PAGES_PROJECT (if using Cloudflare)
   - OR NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID (if using Netlify and editing the workflow)
3) Update `src/sources.json` with any feeds you want.
4) Run the workflow (manual or scheduled).

### Notes
- Skimlinks script is injected via `layout.html` using the env secret.
- About/Disclosures pages are generated automatically.
- Adjust `daily_posts` in `src/sources.json`.
