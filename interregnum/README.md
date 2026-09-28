# Interregnum Tracker

A falsifier dashboard for the "Hegemonic Interregnum" framework memo (issued 2026-09-28). It covers the four build tasks from §8: the dashboard, the event feed, the loop diagram, and the monthly falsification check.

It is a static page (`index.html` + `app.js` + `style.css`) that reads JSON from `data/`. On GitHub Pages it is served at `/interregnum/`. To run it locally, use `python3 -m http.server` from the repo root and open `http://localhost:8000/interregnum/`. The page uses `fetch()`, so opening it from `file://` won't work.

## Files

| Path | What it is | Who writes it |
|---|---|---|
| `predictions.json` | The seven predictions, falsifiers, auto rules, Polymarket markets, GDELT queries, keyword tag rules | You |
| `data/series.json` | Time series + market odds | `fetch.py` |
| `data/news.json` | Rolling 120-day tagged news feed | `fetch.py` (merges across runs) |
| `data/status.json` | Auto falsifier signal per prediction + source errors | `fetch.py` |
| `data/events.json` | Curated events worth keeping | You |
| `data/manual.json` | Series with no free API (war-risk premiums, EU diesel, non-dollar oil settlement, CIPS, open-weight lag, East-West pipeline) | You |
| `data/checks.json` | Monthly verdict log | You |
| `checks/YYYY-MM.md` | Monthly check draft (auto signals + the month's tagged headlines, blank verdicts) | `monthly_check.py` on the 1st |

## Sources

| Indicator | Source | Frequency |
|---|---|---|
| Brent, WTI | FRED `DCOILBRENTEU`, `DCOILWTICO` (EIA) | Daily, ~1 week lag |
| US diesel | FRED `GASDESW` | Weekly |
| EU natural gas | FRED `PNGASEUUSDM` (World Bank) | Monthly, ~2 month lag |
| Hormuz, Bab el-Mandeb transits | IMF PortWatch daily chokepoints (AIS-based) | Daily, ~1 week lag |
| USD / CNY share of FX reserves | IMF COFER (SDMX API) | Quarterly, ~1 quarter lag |
| Escalation odds | Polymarket (gamma + CLOB price history) | Daily |
| News | GDELT DOC 2.0 API, keyword-tagged | Daily |

What each source can't do:
- **"Normal" traffic.** Hormuz uses its 2025 mean. Bab el-Mandeb uses Jan–Oct 2023, because Houthi attacks had already cut 2024–25 traffic by more than half. Measured against a crisis-era baseline, the strait would look "reopened" too early.
- **Kpler** (named in the memo) is paywalled. PortWatch counts transits from AIS, and ships running dark are undercounted. That undercount can bias P1 toward "holding".
- **GDELT tags are keyword matches.** They sort headlines; they don't weigh evidence. GDELT also rate-limits hard (HTTP 429). Queries that fail are retried and then skipped, and the next run fills the gap because the feed merges across runs.

## Auto signals

Only P1–P3 have falsifiers the data can measure. The rules are in `predictions.json` (`auto`) and implemented in `fetch.py` (`status_p1..p3`):

- **P1** is *broken* if both straits' 30-day mean is ≥80% of normal on or before 2026-12-31, and *wobbling* if either reaches ≥60%. Houthi withdrawal still needs a human verdict.
- **P2** is *broken* on 30 consecutive Brent closes below $80, and *wobbling* if any of the last 30 closes left the $90–130 band.
- **P3** is *broken* if the USD share is >59% for two consecutive quarters, and *wobbling* if the share is up year on year.

P4–P7 are judged by a person in the monthly check.

## Refreshing

`.github/workflows/interregnum-data.yml` runs daily at 06:17 UTC and commits changed data. It also drafts the monthly check on the 1st. Scheduled workflows only run from the default branch, so it starts once this is merged. You can also trigger it by hand from the Actions tab (`workflow_dispatch`).

To refresh by hand:

```sh
python3 scripts/interregnum/fetch.py          # 3–10 min, mostly GDELT backoff
python3 scripts/interregnum/monthly_check.py  # optional: YYYY-MM argument
```

The scripts use the standard library only; there is nothing to install.
