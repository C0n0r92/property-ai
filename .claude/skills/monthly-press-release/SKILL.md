---
name: monthly-press-release
description: Write the monthly Dublin over-asking press release and social posts from the live /reports page. Use at the start of each month, or when asked for press, PR, a newsletter or social content about the market.
---

# Monthly press release

The figures come from the latest complete month at `https://irishpropertydata.com/reports` (or `/reports/YYYY-MM`). Months need 150+ matched sales. The newest month can still grow as late registrations arrive, so prefer the latest month that is at least 3 weeks old.

1. Fetch the report page and read the figures:
   - the typical sale against asking, with its change on the previous month and the same month last year
   - the share sold above asking and the typical price
   - the hottest and coolest districts
   - the breakdowns by type and by asking-price band
   - the biggest jumps
2. Check the figures before writing:
   - Each number must appear on the page; never extrapolate.
   - Use "typical" for medians, not "average".
   - Changes are percentage **points** for shares and over-asking rates, and percent for prices.
3. Write:
   - **Press release** (≈350 words): headline with the figure and month, one-sentence summary, three findings, a short method note ("paired each Property Price Register sale with its advertised asking price; medians; recent months can shift with late registrations"), a quote line for the user to fill in, the contact `hello@irishpropertydata.com`, and the link to the report page.
   - **Three social posts:** X/Threads (≤270 characters), LinkedIn (≈80 words) and one Reddit-friendly plain summary. Each links to the report page and none oversells.
4. Save drafts to `press/YYYY-MM.md` and show them to the user. Never send or post anything yourself.

Tone: plain and factual, no hype words ("skyrocketing", "explosion"). Irish English spelling.

## Refresh the Google Ads import

The ads quote each area's latest figures, so regenerate them with the report:

    DATABASE_URL=postgres://gaff:gaff@localhost:55432/gaff npx tsx scripts/ads/build-ads.mts [--budget 10]

It writes `ads-export/irishpropertydata-search.txt` (import in Google Ads Editor: Account > Import > From file) and a `.csv` copy for a spreadsheet. Everything arrives Paused; nothing spends until someone enables it in Ads Editor and posts. Headline/description limits are tested in `scripts/ads/ads-lib.test.mjs` (run `node --test scripts/ads/ads-lib.test.mjs`).
