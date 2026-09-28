(function () {
  "use strict";

  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DAY = 864e5;

  // ------------------------------------------------------------ theme ----
  const themeBtn = $("#theme-btn");
  const themes = ["auto", "light", "dark"];
  function paintThemeBtn() {
    themeBtn.textContent = "Theme: " + (document.documentElement.dataset.theme || "auto");
  }
  themeBtn.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || "auto";
    const next = themes[(themes.indexOf(cur) + 1) % themes.length];
    if (next === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    try { next === "auto" ? localStorage.removeItem("interregnum-theme") : localStorage.setItem("interregnum-theme", next); } catch (e) {}
    paintThemeBtn();
  });
  paintThemeBtn();

  // ------------------------------------------------------------ utils ----
  function toTime(d) {
    const q = /^(\d{4})-Q([1-4])$/.exec(d);
    if (q) return Date.UTC(+q[1], (+q[2] - 1) * 3 + 1, 15); // mid-quarter
    return Date.parse(d.length === 10 ? d + "T00:00:00Z" : d);
  }
  const fmtDate = (t) => new Date(t).toISOString().slice(0, 10);
  const fmtMonth = (t) => new Date(t).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
  const last = (a) => a[a.length - 1];
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

  function rolling(rows, n) {
    const out = [];
    for (let i = n - 1; i < rows.length; i++) {
      out.push([rows[i][0], mean(rows.slice(i - n + 1, i + 1).map((r) => r[1]))]);
    }
    return out;
  }

  function niceTicks(lo, hi, count) {
    const span = hi - lo || 1;
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
    const ticks = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(+v.toFixed(10));
    return ticks;
  }

  function signalChip(sig) {
    const map = {
      holding: ["✓", "Holding"], wobbling: ["!", "Wobbling"], broken: ["✕", "Broken"],
      manual: ["✎", "Manual"], "no-data": ["?", "No data"], issued: ["·", "Issued"],
    };
    const [icon, label] = map[sig] || ["?", sig || "—"];
    return `<span class="chip ${esc(sig)}"><span class="dot" aria-hidden="true">${icon}</span>${label}</span>`;
  }

  // ------------------------------------------------------------ chart ----
  // opts: { title, sub, series:[{name, color, rows:[[date,val]]}], fmt, refs:[{y,label}],
  //         band:{lo,hi,label}, yMin, yMax, ranges:true, defaultRange, tipExtra }
  function lineChart(host, opts) {
    const ranges = opts.ranges ? [["3M", 92], ["6M", 183], ["1Y", 366], ["All", Infinity]] : null;
    let range = opts.defaultRange || "All";
    host.innerHTML = `
      <div class="chart-head">
        <div><h3>${esc(opts.title)}</h3>${opts.sub ? `<div class="sub">${opts.sub}</div>` : ""}</div>
        ${ranges ? `<div class="seg" role="group" aria-label="Time range">${ranges.map(([k]) => `<button type="button" data-r="${k}" aria-pressed="${k === range}">${k}</button>`).join("")}</div>` : ""}
      </div>
      <div class="legend"></div>
      <div class="chart"></div>
      <details class="table"><summary>Data table</summary><div class="scroll-x tbl"></div></details>`;
    const legend = $(".legend", host);
    const items = [];
    if (opts.series.length > 1 || opts.legendAlways) opts.series.forEach((s) => items.push(`<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`));
    if (opts.band) items.push(`<span><i class="bandkey"></i>${esc(opts.band.label)}</span>`);
    (opts.refs || []).forEach((r) => items.push(`<span><i class="dash"></i>${esc(r.label)}</span>`));
    legend.innerHTML = items.join("");
    if (!items.length) legend.remove();

    const box = $(".chart", host);
    const all = opts.series.map((s) => ({ ...s, pts: s.rows.map(([d, v]) => [toTime(d), v]) }));
    if (!all.some((s) => s.pts.length > 1)) { box.innerHTML = `<div class="empty">No data yet.</div>`; return; }

    // Data table: the newest 30 rows, series aligned by date.
    const byDate = new Map();
    all.forEach((s, i) => s.pts.forEach(([t, v]) => { if (!byDate.has(t)) byDate.set(t, []); byDate.get(t)[i] = v; }));
    const rowsT = [...byDate.keys()].sort((a, b) => b - a).slice(0, 30);
    $(".tbl", host).innerHTML = `<table><thead><tr><th>Date</th>${all.map((s) => `<th class="num">${esc(s.name)}</th>`).join("")}</tr></thead><tbody>${rowsT.map((t) => `<tr><td>${fmtDate(t)}</td>${all.map((_, i) => `<td class="num">${byDate.get(t)[i] == null ? "—" : opts.fmt(byDate.get(t)[i])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

    const tip = document.createElement("div");
    tip.className = "tip"; tip.hidden = true;

    function draw() {
      const W = Math.max(280, box.clientWidth);
      const H = opts.height || 240;
      const m = { t: 10, r: 12, b: 24, l: 44 };
      const tMax = Math.max(...all.map((s) => (s.pts.length ? last(s.pts)[0] : -Infinity)));
      const days = ranges ? ranges.find(([k]) => k === range)[1] : Infinity;
      const tMin = Math.max(Math.min(...all.map((s) => (s.pts.length ? s.pts[0][0] : Infinity))), tMax - days * DAY);
      const vis = all.map((s) => ({ ...s, pts: s.pts.filter(([t]) => t >= tMin) }));
      const vals = vis.flatMap((s) => s.pts.map((p) => p[1]));
      (opts.refs || []).forEach((r) => vals.push(r.y));
      if (opts.band) vals.push(opts.band.lo, opts.band.hi);
      let lo = opts.yMin != null ? opts.yMin : Math.min(...vals);
      let hi = opts.yMax != null ? opts.yMax : Math.max(...vals);
      const pad = (hi - lo) * 0.06 || 1;
      if (opts.yMin == null) lo -= pad;
      if (opts.yMax == null) hi += pad;
      const ticks = niceTicks(lo, hi, 5);
      lo = Math.min(lo, ticks[0]); hi = Math.max(hi, last(ticks));
      const x = (t) => m.l + ((t - tMin) / (tMax - tMin || 1)) * (W - m.l - m.r);
      const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);

      let svg = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(opts.title)}">`;
      if (opts.band) svg += `<rect class="band" x="${m.l}" width="${W - m.l - m.r}" y="${y(opts.band.hi)}" height="${y(opts.band.lo) - y(opts.band.hi)}"/>`;
      ticks.forEach((v) => {
        svg += `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`;
        svg += `<text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${opts.fmtTick ? opts.fmtTick(v) : v}</text>`;
      });
      svg += `<line class="baseline" x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}"/>`;
      // x ticks: ~one per 90px, snapped to month starts
      const nX = Math.max(2, Math.floor((W - m.l - m.r) / 90));
      const spanDays = (tMax - tMin) / DAY;
      const monthStep = Math.max(1, Math.ceil(spanDays / 30.4 / nX));
      const d0 = new Date(tMin);
      for (let d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1)); d.getTime() <= tMax; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + monthStep, 1))) {
        if (monthStep >= 12 && d.getUTCMonth() !== 0) { d = new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 1)); if (d.getTime() > tMax) break; }
        const lbl = monthStep >= 12 ? d.getUTCFullYear() : fmtMonth(d.getTime());
        svg += `<text x="${x(d.getTime())}" y="${H - 6}" text-anchor="middle">${lbl}</text>`;
      }
      (opts.refs || []).forEach((r) => {
        svg += `<line class="ref" x1="${m.l}" x2="${W - m.r}" y1="${y(r.y)}" y2="${y(r.y)}"/>`;
      });
      vis.forEach((s) => {
        if (s.pts.length < 2) return;
        const d = s.pts.map(([t, v], i) => `${i ? "L" : "M"}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join("");
        svg += `<path class="line" d="${d}" style="stroke:${s.color}"/>`;
      });
      svg += `<g class="hover" visibility="hidden"><line class="cross" y1="${m.t}" y2="${H - m.b}"/>${vis.map((s) => `<circle class="hover-dot" r="4.5" style="fill:${s.color}"/>`).join("")}</g>`;
      svg += `<rect x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}" fill="transparent" class="hit"/>`;
      svg += `</svg>`;
      box.innerHTML = svg;
      box.appendChild(tip);

      const hover = $(".hover", box);
      const hit = $(".hit", box);
      function nearest(pts, t) {
        let lo2 = 0, hi2 = pts.length - 1;
        while (lo2 < hi2) { const mid = (lo2 + hi2) >> 1; if (pts[mid][0] < t) lo2 = mid + 1; else hi2 = mid; }
        if (lo2 > 0 && Math.abs(pts[lo2 - 1][0] - t) < Math.abs(pts[lo2][0] - t)) lo2--;
        return pts[lo2];
      }
      function move(ev) {
        const r = box.getBoundingClientRect();
        const px = ev.clientX - r.left;
        const t = tMin + ((px - m.l) / (W - m.l - m.r)) * (tMax - tMin);
        const hits = vis.map((s) => (s.pts.length ? nearest(s.pts, t) : null));
        const ref = hits.filter(Boolean).reduce((a, b) => (Math.abs(b[0] - t) < Math.abs(a[0] - t) ? b : a));
        hover.setAttribute("visibility", "visible");
        $(".cross", hover).setAttribute("x1", x(ref[0]));
        $(".cross", hover).setAttribute("x2", x(ref[0]));
        hover.querySelectorAll("circle").forEach((c, i) => {
          if (!hits[i]) { c.setAttribute("visibility", "hidden"); return; }
          c.setAttribute("visibility", "visible");
          c.setAttribute("cx", x(hits[i][0])); c.setAttribute("cy", y(hits[i][1]));
        });
        tip.hidden = false;
        tip.innerHTML = `<div class="d">${opts.quarterly ? vis[0].rows.find((r) => toTime(r[0]) === ref[0])?.[0] || fmtDate(ref[0]) : fmtDate(ref[0])}</div>` +
          vis.map((s, i) => hits[i] ? `<div class="r"><i style="background:${s.color}"></i>${esc(s.name)}<b>${opts.fmt(hits[i][1])}</b></div>` : "").join("") +
          (opts.tipExtra ? opts.tipExtra(ref[0]) : "");
        const tw = tip.offsetWidth;
        let left = x(ref[0]) + 12;
        if (left + tw > W) left = x(ref[0]) - tw - 12;
        tip.style.left = Math.max(0, left) + "px";
        tip.style.top = "8px";
      }
      hit.addEventListener("pointermove", move);
      hit.addEventListener("pointerdown", move);
      hit.addEventListener("pointerleave", () => { hover.setAttribute("visibility", "hidden"); tip.hidden = true; });
    }

    host.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => {
      range = b.dataset.r;
      host.querySelectorAll(".seg button").forEach((o) => o.setAttribute("aria-pressed", o === b));
      draw();
    }));
    draw();
    let lastW = box.clientWidth;
    new ResizeObserver(() => { if (Math.abs(box.clientWidth - lastW) > 2) { lastW = box.clientWidth; draw(); } }).observe(box);
  }

  // ------------------------------------------------------------ render ----
  const C1 = "var(--series-1)", C2 = "var(--series-2)";

  function renderBoard(spec, status, checks) {
    const latestVerdict = (pid) => {
      for (const c of checks.checks) if (c.verdicts && c.verdicts[pid]) return { ...c.verdicts[pid], date: c.date };
      return null;
    };
    const issued = toTime(spec.issued);
    const now = Date.now();
    $("#pred-grid").innerHTML = spec.predictions.map((p) => {
      const st = (status.predictions || {})[p.id] || { signal: "no-data", detail: "" };
      const v = latestVerdict(p.id);
      const end = toTime(p.horizon);
      const frac = Math.min(1, Math.max(0, (now - issued) / (end - issued)));
      const daysLeft = Math.max(0, Math.round((end - now) / DAY));
      return `<article class="card pred" id="${p.id}">
        <div class="pred-head"><span class="pred-id">${p.id}</span><h3>${esc(p.title)}</h3></div>
        <div class="signals">
          <span><span class="lbl">Auto</span>${signalChip(st.signal)}</span>
          <span><span class="lbl">Verdict</span>${v ? signalChip(v.verdict) : signalChip("issued")}</span>
        </div>
        <div class="falsifier"><b>Falsifier:</b> ${esc(p.falsifier)}</div>
        ${st.detail && st.signal !== "manual" ? `<div class="detail">${esc(st.detail)}</div>` : ""}
        <div>
          <div class="horizon" role="img" aria-label="${Math.round(frac * 100)}% of horizon elapsed"><i style="width:${(frac * 100).toFixed(1)}%"></i></div>
          <div class="detail" style="margin-top:4px">Horizon ${esc(p.horizon)} · ${daysLeft} days left</div>
        </div>
        <details class="more"><summary>Mechanism, tracking, latest verdict</summary>
          <p>${esc(p.claim)}</p>
          <p><b>Mechanism.</b> ${esc(p.mechanism)}</p>
          <ul>${p.track.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          ${p.auto ? `<p><b>Auto rule.</b> ${esc(p.auto)}</p>` : ""}
          ${v ? `<p><b>Verdict ${esc(v.date)}.</b> ${esc(v.note || "")}</p>` : ""}
        </details>
      </article>`;
    }).join("");
  }

  function tile(k, v, s) { return `<div class="card tile"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`; }

  function renderIndicators(data) {
    const S = data.series, M = data.meta;
    const tiles = [];
    const pct = (a, b) => ((a / b) * 100).toFixed(0) + "%";
    if (S.brent && S.brent.length) {
      const b = last(S.brent), prev = S.brent[S.brent.length - 6];
      tiles.push(tile("Brent", "$" + b[1].toFixed(2), `${b[0]} · ${prev ? (b[1] >= prev[1] ? "+" : "−") + "$" + Math.abs(b[1] - prev[1]).toFixed(2) + " vs 5 closes ago" : ""}`));
    }
    [["hormuz", "Hormuz transits"], ["bab_el_mandeb", "Bab el-Mandeb transits"]].forEach(([k, name]) => {
      if (!S[k] || !S[k].length) return;
      const r7 = mean(S[k].slice(-7).map((r) => r[1]));
      const base = M[k] && M[k].baseline;
      tiles.push(tile(name, r7.toFixed(1) + "/day", `7-day mean to ${last(S[k])[0]}${base ? ` · ${pct(r7, base.value)} of ${esc(base.span)} normal` : ""}`));
    });
    if (S.usd_share && S.usd_share.length) {
      const u = last(S.usd_share), p = S.usd_share[S.usd_share.length - 2];
      tiles.push(tile("USD share of reserves", u[1].toFixed(2) + "%", `${u[0]} · ${(u[1] - p[1] >= 0 ? "+" : "−") + Math.abs(u[1] - p[1]).toFixed(2)} pts q/q · falsifier 59%`));
    }
    if (S.us_diesel && S.us_diesel.length) {
      const d = last(S.us_diesel);
      tiles.push(tile("US diesel", "$" + d[1].toFixed(2) + "/gal", `week of ${d[0]}`));
    }
    $("#tiles").innerHTML = tiles.join("");

    const src = (k) => (M[k] ? `<a href="${esc(M[k].url)}">${esc(M[k].source)}</a>` : "");
    lineChart($("#c-oil"), {
      title: "Crude oil, USD/bbl", sub: `Daily closes · ${src("brent")}, ${src("wti")}`,
      series: [{ name: "Brent", color: C1, rows: S.brent || [] }, { name: "WTI", color: C2, rows: S.wti || [] }],
      band: { lo: 90, hi: 130, label: "P2 band $90–130" }, refs: [{ y: 80, label: "P2 falsifier $80" }],
      fmt: (v) => "$" + v.toFixed(2), ranges: true, defaultRange: "1Y",
    });

    const idx = (k) => {
      const base = M[k] && M[k].baseline;
      if (!S[k] || !base) return [];
      return rolling(S[k], 7).map(([d, v]) => [d, (v / base.value) * 100]);
    };
    const rawBy = (k) => new Map(rolling(S[k] || [], 7).map(([d, v]) => [toTime(d), v]));
    const rawH = rawBy("hormuz"), rawB = rawBy("bab_el_mandeb");
    lineChart($("#c-choke"), {
      title: "Chokepoint transits, % of normal",
      sub: `7-day mean of daily transits. Normal: Hormuz = 2025 mean (${M.hormuz?.baseline?.value ?? "—"}/day); Bab el-Mandeb = Jan–Oct 2023, before the Houthi campaign (${M.bab_el_mandeb?.baseline?.value ?? "—"}/day) · ${src("hormuz")}`,
      series: [{ name: "Hormuz", color: C1, rows: idx("hormuz") }, { name: "Bab el-Mandeb", color: C2, rows: idx("bab_el_mandeb") }],
      refs: [{ y: 80, label: "P1 reopening threshold 80%" }], yMin: 0,
      fmt: (v) => v.toFixed(0) + "%", fmtTick: (v) => v + "%", ranges: true, defaultRange: "1Y",
      tipExtra: (t) => `<div class="d" style="margin-top:4px">Raw: Hormuz ${rawH.has(t) ? rawH.get(t).toFixed(1) : "—"}/day · Bab el-Mandeb ${rawB.has(t) ? rawB.get(t).toFixed(1) : "—"}/day</div>`,
    });
    lineChart($("#c-usd"), {
      title: "USD share of global FX reserves, %", sub: `Quarterly · ${src("usd_share")}`,
      series: [{ name: "USD share", color: C1, rows: S.usd_share || [] }],
      refs: [{ y: 59, label: "P3 falsifier 59%" }], fmt: (v) => v.toFixed(2) + "%", quarterly: true,
    });
    lineChart($("#c-cny"), {
      title: "CNY share of global FX reserves, %", sub: `Quarterly · ${src("cny_share")}`,
      series: [{ name: "CNY share", color: C1, rows: S.cny_share || [] }], yMin: 0,
      fmt: (v) => v.toFixed(2) + "%", quarterly: true,
    });
    lineChart($("#c-diesel"), {
      title: "US on-highway diesel, USD/gal", sub: `Weekly · ${src("us_diesel")}`,
      series: [{ name: "US diesel", color: C1, rows: S.us_diesel || [] }], fmt: (v) => "$" + v.toFixed(3),
    });
    lineChart($("#c-eugas"), {
      title: "EU natural gas, USD/MMBtu", sub: `Monthly, lags ~2 months · ${src("eu_gas")}`,
      series: [{ name: "EU gas", color: C1, rows: S.eu_gas || [] }], fmt: (v) => "$" + v.toFixed(2), yMin: 0,
    });
  }

  function renderManual(manual) {
    const host = $("#manual");
    const entries = Object.entries(manual.series || {});
    const charted = entries.filter(([, s]) => s.rows.length >= 2);
    const pending = entries.filter(([, s]) => s.rows.length < 2);
    host.innerHTML = `<div class="grid two">${charted.map(([k]) => `<div id="m-${k}"></div>`).join("")}</div>` +
      (pending.length ? `<ul class="manual-list">${pending.map(([, s]) => `<li>${esc(s.label)} <span class="w">· bears on ${s.bears_on.join(", ")} · ${s.rows.length ? "1 row" : "no rows yet"} · source: ${esc(s.where)}</span></li>`).join("")}</ul>` : "");
    charted.forEach(([k, s]) => lineChart($("#m-" + k), { title: s.label, sub: "Hand-entered · bears on " + s.bears_on.join(", "), series: [{ name: s.label, color: C1, rows: s.rows }], fmt: (v) => String(+v.toFixed(3)) }));
  }

  function renderMarkets(markets) {
    const grid = $("#market-grid");
    if (!markets.length) { grid.innerHTML = `<div class="card empty">No markets configured.</div>`; return; }
    grid.innerHTML = markets.map((_, i) => `<div class="card" id="mk-${i}"></div>`).join("");
    markets.forEach((m, i) => {
      const cur = m.yes.length ? last(m.yes)[1] : null;
      lineChart($("#mk-" + i), {
        title: m.question,
        sub: `Yes ${cur == null ? "—" : (cur * 100).toFixed(1) + "%"} · bears on ${m.bears_on.join(", ")} · resolves ${esc(m.end)} · <a href="https://polymarket.com/market/${esc(m.slug)}">market</a>`,
        series: [{ name: "Yes", color: C1, rows: m.yes.map(([d, p]) => [d, p * 100]) }],
        yMin: 0, yMax: 100, fmt: (v) => v.toFixed(1) + "%", fmtTick: (v) => v + "%", height: 170,
      });
    });
  }

  function renderFeed(events, news) {
    const items = [
      ...events.items.map((e) => ({ ...e, curated: true, t: toTime(e.date) })),
      ...news.items.map((n) => ({ ...n, t: toTime(n.date) })),
    ].sort((a, b) => b.t - a.t || (b.curated ? 1 : 0) - (a.curated ? 1 : 0));
    const tags = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"];
    const active = new Set();
    let q = "", shown = 60;
    const filters = $("#feed-filters");
    filters.insertAdjacentHTML("beforeend", `<button type="button" class="tagbtn" data-cur="1" aria-pressed="false">Curated only</button>` + tags.map((t) => `<button type="button" class="tagbtn" data-tag="${t}" aria-pressed="false">${t}</button>`).join(""));
    let curatedOnly = false;
    function paint() {
      const hits = items.filter((it) =>
        (!curatedOnly || it.curated) &&
        (!active.size || (it.tags || []).some((t) => active.has(t))) &&
        (!q || (it.title + " " + (it.note || "") + " " + (it.domain || "")).toLowerCase().includes(q)));
      $("#feed-list").innerHTML = hits.slice(0, shown).map((it) => {
        const link = it.url || (/^https?:/.test(it.source || "") ? it.source : null);
        return `<li><div class="when">${esc((it.date || "").slice(0, 10))}</div><div>
          <div class="t">${link ? `<a href="${esc(link)}" rel="noopener" target="_blank">${esc(it.title)}</a>` : esc(it.title)}</div>
          ${it.note ? `<div class="note">${esc(it.note)}</div>` : ""}
          <div class="m">${it.curated ? `<span class="curated">Curated</span>` : ""}${(it.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}<span>${esc(it.domain || (!link ? it.source : "") || "")}</span></div>
        </div></li>`;
      }).join("") || `<li><div></div><div class="empty">Nothing matches.</div></li>`;
      $("#feed-more").hidden = hits.length <= shown;
    }
    filters.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.cur) { curatedOnly = !curatedOnly; b.setAttribute("aria-pressed", curatedOnly); }
      else { const t = b.dataset.tag; active.has(t) ? active.delete(t) : active.add(t); b.setAttribute("aria-pressed", active.has(t)); }
      shown = 60; paint();
    });
    $("#feed-q").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); shown = 60; paint(); });
    $("#feed-more").addEventListener("click", () => { shown += 60; paint(); });
    paint();
  }

  // ------------------------------------------------------------ loops ----
  const NODES = {
    J: [95, 55, "Nuclear deterrence"],
    O: [290, 55, "Interdependence"],
    I: [485, 55, "US overmatch + alliances"],
    A: [290, 160, "Conflict at chokepoints"],
    B: [470, 280, "Oil price"],
    C: [290, 400, "Western inflation + political pain"],
    D: [110, 280, "US response latitude"],
    H: [545, 470, "Shale · SPR · demand destruction"],
    E: [800, 55, "Dollar weaponization"],
    F: [800, 280, "Dedollarization / alt rails"],
    G: [800, 470, "Dollar network effects"],
    K: [120, 640, "AI capability"],
    L: [400, 640, "Returns → investment"],
    M: [630, 640, "Chinese industrial scale"],
    N: [900, 640, "Surplus → BRI investment"],
  };
  // [from, to, sign, bend, delayLabel, delayPosition 0..1]
  const EDGES = [
    ["A", "B", "+", 0.18], ["B", "C", "+", 0.18], ["C", "D", "−", 0.18], ["D", "A", "−", 0.18],
    ["B", "H", "+", 0.35, "months", 0.3], ["H", "B", "−", 0.35],
    ["I", "A", "−", 0], ["J", "A", "−", 0], ["O", "A", "−", 0],
    ["E", "F", "+", 0, "years"], ["F", "G", "−", 0.35], ["G", "F", "−", 0.35],
    ["B", "F", "+", 0],
    ["K", "L", "+", 0.4], ["L", "K", "+", 0.4],
    ["M", "N", "+", 0.4], ["N", "M", "+", 0.4],
  ];
  const LOOP_LABELS = [
    [290, 280, "R", "P2"], [600, 360, "B", "N2"], [855, 375, "R", "P1"],
    [260, 640, "R", "P3"], [765, 640, "R", "P4"], [110, 175, "B", "N1·3·4"],
  ];
  const LOOP_KEY = [
    ["R · P1", "Weaponization → exit", "Dollar weaponization → dedollarization → thinner network effects → cheaper exit → more dedollarization. Delay: alternative rails take years."],
    ["R · P2", "War → price → pain → latitude", "Conflict → oil price → Western inflation and political pain → less US latitude → more room for conflict. Iran's deliberate strategy."],
    ["R · P3", "AI concentration", "AI capability → military/economic returns → investment → more capability."],
    ["R · P4", "Industrial scale", "Chinese output → surpluses → overseas industrial investment (BRI) → demand for Chinese capital goods → more scale."],
    ["B · N1", "Overmatch", "US military superiority and alliances cap how far challengers push."],
    ["B · N2", "Price mechanism", "High oil → shale response, SPR releases, demand destruction → lower oil. Delay: months."],
    ["B · N3", "Deterrence", "Nuclear weapons cap escalation into direct great-power war."],
    ["B · N4", "Interdependence", "Mutual vulnerability: everyone needs oil to flow somewhere."],
  ];

  function renderLoops() {
    const W = 1000, H = 710, bw = 170, bh = 44;
    const P = (id) => NODES[id];
    // Where the segment from a node's centre toward (tx,ty) leaves its box.
    function exitPt(id, tx, ty) {
      const [cx, cy] = P(id), dx = tx - cx, dy = ty - cy;
      const s = Math.min(Math.abs((bw / 2 + 4) / (dx || 1e-9)), Math.abs((bh / 2 + 4) / (dy || 1e-9)));
      return [cx + dx * s, cy + dy * s];
    }
    let edges = "", signs = "", delays = "";
    EDGES.forEach(([f, t, sign, bend, delay, delayAt]) => {
      const [x1, y1] = P(f), [x2, y2] = P(t);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
      const cx = mx - dy * bend, cy = my + dx * bend; // bend to the right of travel
      const [sx, sy] = exitPt(f, cx, cy), [ex, ey] = exitPt(t, cx, cy);
      edges += `<path class="edge" d="M${sx},${sy} Q${cx},${cy} ${ex},${ey}" marker-end="url(#arr)"/>`;
      // sign sits just before the arrowhead, offset to the outside of the curve
      const tt = 0.8, qx = (1 - tt) ** 2 * sx + 2 * (1 - tt) * tt * cx + tt * tt * ex, qy = (1 - tt) ** 2 * sy + 2 * (1 - tt) * tt * cy + tt * tt * ey;
      const len = Math.hypot(dx, dy) || 1, ox = (-dy / len) * 13, oy = (dx / len) * 13;
      signs += `<text class="sign" x="${qx + ox}" y="${qy + oy + 5}" text-anchor="middle">${sign}</text>`;
      if (delay) {
        const tm = delayAt || 0.5, px = (1 - tm) ** 2 * sx + 2 * (1 - tm) * tm * cx + tm * tm * ex, py = (1 - tm) ** 2 * sy + 2 * (1 - tm) * tm * cy + tm * tm * ey;
        const tx = 2 * (1 - tm) * (cx - sx) + 2 * tm * (ex - cx), ty = 2 * (1 - tm) * (cy - sy) + 2 * tm * (ey - cy), tl = Math.hypot(tx, ty) || 1;
        const nx = -ty / tl, ny = tx / tl, ux = tx / tl, uy = ty / tl;
        [-3, 3].forEach((o) => { delays += `<line class="delay" x1="${px + ux * o - nx * 8}" y1="${py + uy * o - ny * 8}" x2="${px + ux * o + nx * 8}" y2="${py + uy * o + ny * 8}"/>`; });
        const lx = px + nx * 16, anchor = Math.abs(nx) < 0.3 ? "middle" : nx > 0 ? "start" : "end";
        delays += `<text class="delay-label" x="${lx}" y="${py + ny * 16 + (Math.abs(nx) < 0.3 ? (ny > 0 ? 12 : -4) : 4)}" text-anchor="${anchor}">delay: ${delay}</text>`;
      }
    });
    const nodes = Object.entries(NODES).map(([id, [x, y, label]]) => {
      const words = label.split(" "), lines = [];
      words.forEach((w) => { if (lines.length && (lines[lines.length - 1] + " " + w).length <= 20) lines[lines.length - 1] += " " + w; else lines.push(w); });
      const tl = lines.map((l, i) => `<tspan x="${x}" y="${y + 5 + (i - (lines.length - 1) / 2) * 15}">${esc(l)}</tspan>`).join("");
      return `<g class="node"><rect x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="8"/><text text-anchor="middle">${tl}</text></g>`;
    }).join("");
    const labels = LOOP_LABELS.map(([x, y, kind, name]) => `<g class="loop-label"><circle cx="${x}" cy="${y}" r="${name.length > 3 ? 30 : 22}"/><text x="${x}" y="${y - 1}">${kind}</text><text x="${x}" y="${y + 13}" style="font-weight:500;font-size:11px">${name}</text></g>`).join("");
    const clusters = `
      <rect class="cluster" x="10" y="10" width="630" height="505" rx="14"/><text class="cluster-label" x="24" y="508">War · price · politics</text>
      <rect class="cluster" x="690" y="10" width="300" height="505" rx="14"/><text class="cluster-label" x="704" y="508">Money</text>
      <rect class="cluster" x="10" y="575" width="980" height="125" rx="14"/><text class="cluster-label" x="24" y="693">Productive forces</text>`;
    $("#loop-diagram").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Causal loop diagram of loops P1–P4 and N1–N4">
      <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
      ${clusters}${edges}${nodes}${delays}${signs}${labels}</svg>`;
    $("#loop-key").innerHTML = LOOP_KEY.map(([id, name, chain]) => `<div><b>${id}</b> ${esc(name)}<div class="chain">${esc(chain)}</div></div>`).join("");
  }

  function renderChecks(spec, checks) {
    const ids = spec.predictions.map((p) => p.id);
    const rows = checks.checks;
    $("#checks-table").innerHTML = `<table class="matrix"><thead><tr><th>Check</th>${ids.map((id) => `<th>${id}</th>`).join("")}</tr></thead><tbody>${rows.map((c) => `<tr><td><b>${esc(c.date)}</b><div class="note">${esc(c.kind || "")}${c.note ? " · " + esc(c.note) : ""}</div></td>${ids.map((id) => {
      const v = (c.verdicts || {})[id];
      return `<td class="v">${v ? signalChip(v.verdict) + (v.note ? `<div class="note">${esc(v.note)}</div>` : "") : "—"}</td>`;
    }).join("")}</tr>`).join("")}</tbody></table>`;
  }

  // ------------------------------------------------------------ boot ----
  const load = (p) => fetch(p, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(p + " " + r.status); return r.json(); });
  renderLoops();
  Promise.all(["predictions.json", "data/series.json", "data/status.json", "data/checks.json", "data/events.json", "data/news.json", "data/manual.json"].map((p) => load(p).catch((e) => ({ _error: String(e) }))))
    .then(([spec, series, status, checks, events, news, manual]) => {
      const failed = [spec, series, status, checks, events, news, manual].filter((x) => x._error).map((x) => x._error);
      if (!series.series) series = { series: {}, meta: {}, markets: [] };
      if (!status.predictions) status = { predictions: {}, errors: [] };
      if (!checks.checks) checks = { checks: [] };
      if (!events.items) events = { items: [] };
      if (!news.items) news = { items: [] };
      if (!manual.series) manual = { series: {} };
      $("#meta").textContent = `Predictions issued ${spec.issued || "—"} · data refreshed ${series.updated ? series.updated.replace("T", " ").slice(0, 16) + " UTC" : "—"}`;
      const errs = failed.concat(status.errors || []);
      if (errs.length) $("#errors").innerHTML = `<div class="errors"><b>Some sources failed on the last refresh</b> (older data is shown where available): ${errs.map(esc).join("; ")}</div>`;
      if (spec.predictions) { renderBoard(spec, status, checks); renderChecks(spec, checks); }
      renderIndicators(series);
      renderManual(manual);
      renderMarkets(series.markets || []);
      renderFeed(events, news);
    });
})();
