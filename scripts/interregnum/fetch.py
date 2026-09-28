#!/usr/bin/env python3
"""Fetch the Interregnum tracker's data and compute the auto-falsifier signals.

Stdlib only. Writes to interregnum/data/:
  series.json  - Brent, WTI, US diesel, EU gas (FRED); Hormuz & Bab el-Mandeb
                 transits (IMF PortWatch); USD & CNY reserve shares (IMF COFER);
                 prediction-market odds (Polymarket)
  news.json    - rolling keyword-tagged news feed (GDELT), merged across runs
  status.json  - per-prediction auto signal: holding / wobbling / broken / manual

Each source fails independently: a dead source keeps its previous data and is
reported in status.json's "errors" list rather than killing the run.
"""
import csv
import datetime as dt
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "interregnum"
DATA = ROOT / "data"
START = "2025-01-01"
# FRED drops connections from non-curl user agents.
UA = {"User-Agent": "curl/8.5.0 (terra-maior-interregnum-tracker)"}

FRED = {
    "brent": ("DCOILBRENTEU", "Brent crude, USD/bbl", "daily"),
    "wti": ("DCOILWTICO", "WTI crude, USD/bbl", "daily"),
    "us_diesel": ("GASDESW", "US on-highway diesel, USD/gal", "weekly"),
    "eu_gas": ("PNGASEUUSDM", "EU natural gas (TTF), USD/MMBtu", "monthly"),
}
PORTWATCH = "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query"
CHOKEPOINTS = {"hormuz": "chokepoint6", "bab_el_mandeb": "chokepoint4"}
# "Normal" traffic for each strait. Bab el-Mandeb was already under Houthi
# attack through 2024-25, so its baseline is the pre-campaign 2023 window.
BASELINES = {
    "hormuz": ("2025-01-01", "2025-12-31", "2025"),
    "bab_el_mandeb": ("2023-01-01", "2023-10-31", "Jan–Oct 2023"),
}
COFER = "https://api.imf.org/external/sdmx/2.1/data/IMF.STA,COFER/"


def get(url, retries=3, timeout=45):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8")
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2 ** (attempt + 1))


def fred(series_id):
    text = get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={START}")
    rows = csv.reader(io.StringIO(text))
    next(rows)
    return [[d, round(float(v), 3)] for d, v in rows if v not in ("", ".")]


def portwatch(portid):
    out, offset = [], 0
    while True:
        q = urllib.parse.urlencode({
            "where": f"portid='{portid}' AND date >= DATE '2023-01-01'",
            "outFields": "date,n_total,n_tanker",
            "orderByFields": "date ASC",
            "resultOffset": offset,
            "resultRecordCount": 1000,
            "f": "json",
        })
        feats = json.loads(get(f"{PORTWATCH}?{q}")).get("features", [])
        out += [[f["attributes"]["date"], f["attributes"]["n_total"], f["attributes"]["n_tanker"]] for f in feats]
        if len(feats) < 1000:
            return out
        offset += 1000


def cofer(key):
    text = get(f"{COFER}{key}?startPeriod=2016")
    series = {}
    for m in re.finditer(r"<Series ([^>]*)>(.*?)</Series>", text, re.S):
        cur = re.search(r'FXR_CURRENCY="([^"]+)"', m.group(1)).group(1)
        obs = re.findall(r'TIME_PERIOD="([^"]+)" OBS_VALUE="([^"]+)"', m.group(2))
        series[cur] = {p: float(v) for p, v in obs}
    return series


def reserves():
    usd = cofer("G001.AFXRA.CI_USD.SHRO_PT.Q")["CI_USD"]
    lv = cofer("G001.AFXRA.CI_CNY+CI_T.NV_USD.Q")
    cny = {p: round(100 * v / lv["CI_T"][p], 3) for p, v in lv["CI_CNY"].items() if lv["CI_T"].get(p)}
    return {
        "usd_share": [[p, round(v, 3)] for p, v in sorted(usd.items())],
        "cny_share": sorted([p, v] for p, v in cny.items()),
    }


def markets(specs):
    out = []
    for spec in specs:
        m = json.loads(get(f"https://gamma-api.polymarket.com/markets?slug={spec['slug']}"))
        if not m:
            continue
        m = m[0]
        yes_token = json.loads(m["clobTokenIds"])[0]
        hist = json.loads(get(f"https://clob.polymarket.com/prices-history?market={yes_token}&interval=max&fidelity=1440"))["history"]
        out.append({
            "slug": spec["slug"],
            "question": m["question"],
            "bears_on": spec["bears_on"],
            "end": (m.get("endDate") or "")[:10],
            "closed": m.get("closed", False),
            "yes": [[dt.datetime.fromtimestamp(h["t"], dt.timezone.utc).date().isoformat(), h["p"]] for h in hist],
        })
    return out


def clean_title(t):
    """Undo GDELT's tokenizer spacing: 'U . S . strikes , $11 . 6 bn' -> 'U.S. strikes, $11.6 bn'."""
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"(\d) \. (\d)", r"\1.\2", t)
    t = re.sub(r"(\d) , (\d{3})", r"\1,\2", t)
    t = re.sub(r"\b([A-Z]) \. (?=[A-Z] \.)", r"\1.", t)
    t = re.sub(r"\b([A-Z]) \.(?= |$)", r"\1.", t)
    t = re.sub(r" ([.,:;?!%)])", r"\1", t)
    t = re.sub(r"\( ", "(", t)
    t = re.sub(r"(\w) - (?=\w)", r"\1-", t)
    t = re.sub(r"(\w) ' (s|t|re|ll|ve|d)\b", r"\1'\2", t)
    return t


def news(queries, rules, previous):
    seen = {a["url"]: {**a, "title": clean_title(a["title"])} for a in previous}
    compiled = {pid: re.compile(rx, re.I) for pid, rx in rules.items()}
    skipped = []
    for i, q in enumerate(queries):
        if i:
            time.sleep(8)  # GDELT asks for at most one request every 5 s
        url = "https://api.gdeltproject.org/api/v2/doc/doc?" + urllib.parse.urlencode({
            "query": f"{q} sourcelang:english", "mode": "artlist", "format": "json",
            "maxrecords": 75, "timespan": "3d", "sort": "datedesc",
        })
        arts = None
        for wait in (0, 20, 40):  # GDELT rate-limits per IP with 429s
            time.sleep(wait)
            try:
                arts = json.loads(get(url, retries=1, timeout=40)).get("articles", [])
                break
            except Exception:
                continue
        if arts is None:
            skipped.append(q)
            continue
        for a in arts:
            title = clean_title(a.get("title", ""))
            tags = [pid for pid, rx in compiled.items() if rx.search(title)]
            if not tags or a["url"] in seen:
                continue
            s = a["seendate"]
            seen[a["url"]] = {
                "date": f"{s[0:4]}-{s[4:6]}-{s[6:8]}T{s[9:11]}:{s[11:13]}Z",
                "title": title, "url": a["url"], "domain": a.get("domain", ""),
                "country": a.get("sourcecountry", ""), "tags": tags,
            }
    cutoff = (dt.date.today() - dt.timedelta(days=120)).isoformat()
    # Collapse syndicated copies: same title seen from several outlets.
    by_title = {}
    for a in sorted(seen.values(), key=lambda a: a["date"]):
        if a["date"] >= cutoff:
            by_title.setdefault(a["title"].lower(), a)
    return sorted(by_title.values(), key=lambda a: a["date"], reverse=True)[:600], skipped


# ---------------------------------------------------------------- status ----

def mean(xs):
    return sum(xs) / len(xs) if xs else None


def status_p1(s, today):
    ratios, detail = {}, []
    for key, label in (("hormuz", "Hormuz"), ("bab_el_mandeb", "Bab el-Mandeb")):
        rows = s.get(key, [])
        lo, hi, span = BASELINES[key]
        base = mean([r[1] for r in rows if lo <= r[0] <= hi])
        recent = mean([r[1] for r in rows[-30:]])
        if not base or recent is None:
            return {"signal": "no-data", "detail": f"missing {label} transits"}
        ratios[key] = recent / base
        detail.append(f"{label} 30-day mean {recent:.1f}/day = {ratios[key]:.0%} of {span} baseline ({base:.1f})")
    both = all(r >= 0.8 for r in ratios.values())
    either = any(r >= 0.6 for r in ratios.values())
    if both and today <= "2026-12-31":
        sig = "broken"
        detail.append("both waterways at >=80% of baseline; confirm Houthi withdrawal manually")
    elif either:
        sig = "wobbling"
    else:
        sig = "holding"
    return {"signal": sig, "detail": "; ".join(detail)}


def status_p2(s):
    closes = s.get("brent", [])
    if len(closes) < 30:
        return {"signal": "no-data", "detail": "fewer than 30 Brent closes"}
    run = 0
    longest_below = 0
    for _, v in closes:
        run = run + 1 if v < 80 else 0
        longest_below = max(longest_below, run)
    last30 = [v for _, v in closes[-30:]]
    lo, hi = min(last30), max(last30)
    d = f"latest ${closes[-1][1]:.2f} ({closes[-1][0]}); last 30 closes ${lo:.2f}–{hi:.2f}; current run below $80: {run}"
    if run >= 30:
        return {"signal": "broken", "detail": d}
    if lo < 90 or hi > 130:
        return {"signal": "wobbling", "detail": d + "; band exited"}
    return {"signal": "holding", "detail": d}


def status_p3(s):
    usd = s.get("usd_share", [])
    if len(usd) < 5:
        return {"signal": "no-data", "detail": "not enough COFER quarters"}
    (p0, v0), (p1, v1) = usd[-2], usd[-1]
    ya_p, ya_v = usd[-5]
    d = f"USD share {v1:.2f}% in {p1} (vs {ya_v:.2f}% in {ya_p})"
    if v0 > 59 and v1 > 59:
        return {"signal": "broken", "detail": d + "; above 59% two quarters running"}
    if v1 > ya_v:
        return {"signal": "wobbling", "detail": d + "; share is up year on year, the wrong direction for P3"}
    return {"signal": "holding", "detail": d}


def main():
    spec = json.loads((ROOT / "predictions.json").read_text())
    DATA.mkdir(parents=True, exist_ok=True)
    series_path, news_path = DATA / "series.json", DATA / "news.json"
    old = json.loads(series_path.read_text()) if series_path.exists() else {"series": {}, "markets": []}
    series, meta, errors = dict(old["series"]), dict(old.get("meta", {})), []

    for key, (sid, label, freq) in FRED.items():
        try:
            series[key] = fred(sid)
            meta[key] = {"label": label, "freq": freq, "source": f"FRED {sid}", "url": f"https://fred.stlouisfed.org/series/{sid}"}
        except Exception as e:
            errors.append(f"FRED {sid}: {e}")
    for key, portid in CHOKEPOINTS.items():
        try:
            rows = portwatch(portid)
            series[key] = [[d, n] for d, n, _ in rows]
            series[key + "_tankers"] = [[d, t] for d, _, t in rows]
            lo, hi, span = BASELINES[key]
            meta[key] = {"label": "Daily transits, all vessels", "freq": "daily", "source": f"IMF PortWatch {portid}", "url": "https://portwatch.imf.org/pages/chokepoints",
                         "baseline": {"span": span, "value": round(mean([n for d, n, _ in rows if lo <= d <= hi]), 1)}}
        except Exception as e:
            errors.append(f"PortWatch {portid}: {e}")
    try:
        series.update(reserves())
        meta["usd_share"] = {"label": "USD share of FX reserves, %", "freq": "quarterly", "source": "IMF COFER", "url": "https://data.imf.org/en/datasets/IMF.STA:COFER"}
        meta["cny_share"] = {"label": "CNY share of FX reserves, %", "freq": "quarterly", "source": "IMF COFER", "url": "https://data.imf.org/en/datasets/IMF.STA:COFER"}
    except Exception as e:
        errors.append(f"IMF COFER: {e}")
    try:
        mkts = markets(spec["markets"])
    except Exception as e:
        errors.append(f"Polymarket: {e}")
        mkts = old.get("markets", [])

    now = dt.datetime.now(dt.timezone.utc)
    series_path.write_text(json.dumps({"updated": now.isoformat(timespec="seconds"), "meta": meta, "series": series, "markets": mkts}, separators=(",", ":")))

    prev_news = json.loads(news_path.read_text())["items"] if news_path.exists() else []
    try:
        items, skipped = news(spec["news_queries"], spec["tag_rules"], prev_news)
        errors += [f"GDELT gave up on query {q}" for q in skipped]
    except Exception as e:
        errors.append(f"GDELT: {e}")
        items = prev_news
    news_path.write_text(json.dumps({"updated": now.isoformat(timespec="seconds"), "items": items}, indent=0))

    today = now.date().isoformat()
    auto = {"P1": status_p1(series, today), "P2": status_p2(series), "P3": status_p3(series)}
    status = {
        "updated": now.isoformat(timespec="seconds"),
        "predictions": {p["id"]: auto.get(p["id"], {"signal": "manual", "detail": "no automatic falsifier; judge in the monthly check"}) for p in spec["predictions"]},
        "errors": errors,
    }
    (DATA / "status.json").write_text(json.dumps(status, indent=2))
    for pid, st in status["predictions"].items():
        print(f"{pid}: {st['signal']:9} {st['detail']}")
    for e in errors:
        print("ERROR", e, file=sys.stderr)
    return 1 if len([e for e in errors if not e.startswith("GDELT")]) > 2 else 0


if __name__ == "__main__":
    sys.exit(main())
