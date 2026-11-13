---
name: visual-check
description: Check pages in a real browser at desktop and phone widths for sideways overflow, JavaScript errors and failed requests, and take screenshots to review. Use after any UI change, before saying a page "looks right", and when the user reports a layout problem.
---

# Visual check

`node scripts/visual-check.mjs [baseUrl] [/path ...] [--out dir]`

- **Base URL:** defaults to the local dev server, `http://localhost:3457`. Pass `https://irishpropertydata.com` to check production.
- **Pages:** with no paths given, it checks the home page, `/areas`, an area page, `/reports`, the blog, one article and the sample report.
- **Result:** exits 1 on problems, and names the element causing any overflow.

After running it, **look at the screenshots** with the Read tool, at both widths. The script catches broken layouts, not ugly ones. In particular, check:
- 3D scenes (`.rp-diorama`, `.rp-bars3d`): bars risen, labels not colliding.
- Text wrapping in the nav and buttons on a 390px phone.
- The hero above the fold.

To screenshot a single element (one chart, say), use Playwright from `scraper/node_modules/playwright` with `locator.screenshot()`.

Known traps in this codebase:
- **Hidden tables widen the page.** A `<table>` ignores the visually-hidden 1px size, so wrap it in a `<div className="rp-visually-hidden">`.
- **Floating labels need clipping.** Absolutely positioned 3D labels must sit inside an `overflow: hidden` stage.
- **The dev badge isn't the page.** The Next.js dev badge (a dark "N" circle, bottom left) appears only in dev screenshots.
