#!/usr/bin/env python3
"""Draft this month's falsification check as interregnum/checks/YYYY-MM.md.

The draft carries the auto signals, last month's verdicts, and the month's
tagged headlines per prediction. The verdicts are left blank on purpose: a
person fills them in and copies the result into data/checks.json.
Run after fetch.py. Does nothing if the month's draft already exists.
"""
import datetime as dt
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "interregnum"


def main():
    month = sys.argv[1] if len(sys.argv) > 1 else dt.date.today().strftime("%Y-%m")
    out = ROOT / "checks" / f"{month}.md"
    if out.exists():
        print(f"{out} exists; not overwriting")
        return
    spec = json.loads((ROOT / "predictions.json").read_text())
    status = json.loads((ROOT / "data" / "status.json").read_text())
    checks = json.loads((ROOT / "data" / "checks.json").read_text())["checks"]
    news = json.loads((ROOT / "data" / "news.json").read_text())["items"]
    events = json.loads((ROOT / "data" / "events.json").read_text())["items"]

    since = (dt.date.fromisoformat(month + "-01") - dt.timedelta(days=31)).isoformat()
    prev = checks[0] if checks else None

    lines = [
        f"# Falsification check: {month}",
        "",
        f"Auto signals as of {status['updated']}. Previous check: {prev['date'] if prev else 'none'}.",
        "",
        "For each prediction, is it holding, wobbling, or broken? Update the predictions; don't defend them.",
        "When a prediction breaks, write what replaces it, not why it was secretly right.",
        "",
    ]
    for p in spec["predictions"]:
        st = status["predictions"].get(p["id"], {})
        pv = (prev or {}).get("verdicts", {}).get(p["id"], {})
        tagged = [e for e in events if p["id"] in e.get("tags", []) and e["date"] >= since]
        heads = [n for n in news if p["id"] in n.get("tags", []) and n["date"] >= since]
        lines += [
            f"## {p['id']}: {p['title']}",
            "",
            f"- **Falsifier:** {p['falsifier']}",
            f"- **Auto signal:** {st.get('signal', 'n/a')}: {st.get('detail', '')}",
            f"- **Last verdict:** {pv.get('verdict', 'n/a')}: {pv.get('note', '')}",
            f"- **Horizon:** {p['horizon']}",
            "",
        ]
        if tagged:
            lines += ["Curated events since " + since + ":", ""] + [f"- {e['date']} {e['title']}" for e in tagged] + [""]
        if heads:
            lines += [f"Auto-tagged headlines since {since} ({len(heads)}; first 12, keyword tags, so verify):", ""]
            lines += [f"- {n['date'][:10]} [{n['title']}]({n['url']})" for n in heads[:12]] + [""]
        lines += ["**Verdict:** holding / wobbling / broken", "", "**Why:**", "", ""]
    lines += [
        "---",
        "",
        "When done, add an entry at the top of `interregnum/data/checks.json`:",
        "",
        "```json",
        json.dumps({"date": dt.date.today().isoformat(), "kind": "monthly", "note": "",
                    "verdicts": {p["id"]: {"verdict": "", "note": ""} for p in spec["predictions"]}}, indent=2),
        "```",
        "",
    ]
    out.parent.mkdir(exist_ok=True)
    out.write_text("\n".join(lines))
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
