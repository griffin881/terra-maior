/* =========================================================================
   TERRA MAIOR — interactive monograph
   Vanilla ES modules. Motion via Intersection Observer.
   ========================================================================= */

import { animate, inView } from "https://esm.sh/motion@10.18.0";

/* ---------- Theme toggle ---------- */
const themeToggle = document.getElementById("themeToggle");
const root = document.documentElement;
themeToggle.addEventListener("click", () => {
  const cur = root.getAttribute("data-theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
});

/* ---------- Header scroll ---------- */
const header = document.getElementById("header");
const onScroll = () => {
  header.classList.toggle("scrolled", window.scrollY > 40);
  const h = document.documentElement;
  const pct = Math.min(100, Math.max(0, (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100));
  const bar = document.getElementById("progressBar");
  if (bar) bar.style.width = pct + "%";
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Reveal on scroll ---------- */
document.querySelectorAll(".reveal").forEach((el) => {
  inView(el, () => {
    el.classList.add("in");
    return () => {};
  }, { amount: 0.15 });
});

/* ---------- Side nav active state ---------- */
const navLinks = document.querySelectorAll(".sidenav a[data-target]");
const targets = [...navLinks].map((a) => document.getElementById(a.dataset.target)).filter(Boolean);
const navIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const id = e.target.id;
        navLinks.forEach((a) => a.classList.toggle("active", a.dataset.target === id));
      }
    });
  },
  { rootMargin: "-30% 0px -60% 0px" }
);
targets.forEach((t) => navIO.observe(t));

/* ---------- Build meridians in hero rose ---------- */
(() => {
  const g = document.getElementById("meridians");
  if (!g) return;
  const N = 24;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const x2 = Math.cos(a) * 190, y2 = Math.sin(a) * 190;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "0"); line.setAttribute("y1", "0");
    line.setAttribute("x2", x2); line.setAttribute("y2", y2);
    line.setAttribute("stroke", "currentColor");
    g.appendChild(line);
  }
})();

/* ---------- Disc rays in equivalence diagram ---------- */
(() => {
  const g = document.getElementById("discRays");
  if (!g) return;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x2 = Math.cos(a) * 90, y2 = Math.sin(a) * 90;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "0"); line.setAttribute("y1", "0");
    line.setAttribute("x2", x2); line.setAttribute("y2", y2);
    line.setAttribute("stroke", "currentColor");
    g.appendChild(line);
  }

  // sphere geodesic — arc
  const s = document.getElementById("sphereGeo");
  if (s) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", "M -70 -40 Q 0 -85 70 -40");
    p.setAttribute("stroke", "#c9a14a");
    p.setAttribute("stroke-width", "2");
    p.setAttribute("fill", "none");
    s.appendChild(p);
    const c1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c1.setAttribute("cx", "-70"); c1.setAttribute("cy", "-40"); c1.setAttribute("r", "3");
    c1.setAttribute("fill", "#c9a14a");
    s.appendChild(c1);
    const c2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c2.setAttribute("cx", "70"); c2.setAttribute("cy", "-40"); c2.setAttribute("r", "3");
    c2.setAttribute("fill", "#c9a14a");
    s.appendChild(c2);
  }

  // disc geodesic — curved towards boundary (Poincaré disc style)
  const d = document.getElementById("discGeo");
  if (d) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", "M -70 -40 Q 0 30 70 -40");
    p.setAttribute("stroke", "#c9a14a");
    p.setAttribute("stroke-width", "2");
    p.setAttribute("fill", "none");
    d.appendChild(p);
    const c1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c1.setAttribute("cx", "-70"); c1.setAttribute("cy", "-40"); c1.setAttribute("r", "3");
    c1.setAttribute("fill", "#c9a14a");
    d.appendChild(c1);
    const c2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c2.setAttribute("cx", "70"); c2.setAttribute("cy", "-40"); c2.setAttribute("r", "3");
    c2.setAttribute("fill", "#c9a14a");
    d.appendChild(c2);
  }
})();

/* ---------- KaTeX rendering ---------- */
function renderMath() {
  if (!window.katex) return requestAnimationFrame(renderMath);
  const opts = { displayMode: true, throwOnError: false, strict: false };

  katex.render(
    "(T \\wedge A_1 \\wedge A_2 \\wedge \\ldots \\wedge A_n) \\vdash E \\;\\;\\;\\Longleftrightarrow\\;\\;\\; \\neg E \\vdash \\neg T \\vee \\bigvee_{i=1}^{n} \\neg A_i",
    document.getElementById("eq-dq"), opts
  );

  katex.render(
    "t_B \\;=\\; t_A \\;+\\; \\varepsilon\\,(t_A' - t_A), \\qquad 0 < \\varepsilon < 1",
    document.getElementById("eq-eps"), opts
  );

  katex.render(
    "\\Delta t \\;=\\; \\frac{2L}{c}\\!\\left[\\frac{1}{1-\\beta^2} - \\frac{1}{\\sqrt{1-\\beta^2}}\\right] \\;\\approx\\; \\frac{L\\,\\beta^2}{c} \\;+\\; O(\\beta^4), \\quad \\beta = \\tfrac{v}{c}",
    document.getElementById("eq-deltat"), opts
  );

  katex.render(
    "\\rho_i \\;=\\; \\sqrt{(x_i - x)^2 + (y_i - y)^2 + (z_i - z)^2} \\;+\\; c\\,(\\delta t_r - \\delta t_{s_i}) \\;+\\; \\varepsilon_i",
    document.getElementById("eq-pseudo"), opts
  );

  katex.render(
    "\\Delta d_i \\;=\\; \\underbrace{\\mathbf{H}\\,\\delta\\mathbf{x}}_{\\text{coord. residual}} \\;+\\; \\underbrace{c\\,\\Delta\\delta t_r}_{\\text{clock inflation}} \\;+\\; \\underbrace{\\Delta\\varepsilon_i}_{\\text{atmo. inflation}}",
    document.getElementById("eq-resid"), opts
  );
}
if (document.readyState === "complete") renderMath();
else window.addEventListener("load", renderMath);

/* =========================================================================
   WIDGET 1 — Auxiliary Hypothesis Calculator
   ========================================================================= */
(() => {
  const coreSel = document.getElementById("coreSel");
  const auxSel = document.getElementById("auxSel");
  const addBtn = document.getElementById("addAux");
  const list = document.getElementById("auxList");
  const dataSel = document.getElementById("dataSel");
  const out = document.getElementById("auxOut");

  const AUX = [
    "Light travels in straight lines",
    "Atmospheric refraction ≈ 0 at horizon",
    "Rigid-body transport preserves length",
    "Synchronised clocks tick equally",
    "Radio refraction ≡ IEEE 211-1997",
    "Geoid ≈ ellipsoid ±100 m",
    "GPS clocks: only GR-corrected",
  ];

  const state = { aux: [] };

  // Decision matrix: for each (core, datum, set-of-aux) we render a verdict.
  // Encoded as simple pattern table — keeps the argument consistent per core.
  const CORE_LABEL = {
    sphere: "oblate spheroid",
    disc: "azimuthal disc",
    aether: "luminiferous medium",
  };

  function tensionFor(core, datumIdx, auxSet) {
    // datum 0: ships hull-first
    //   sphere — consistent w/o aux
    //   disc — inconsistent unless aux 1 (refraction) is invoked
    // datum 1: Polaris drops
    //   sphere — consistent
    //   disc — inconsistent unless aux 0 denied (non-Euclidean optics)
    // datum 2: Michelson-Morley null
    //   sphere — requires aux 2 (length contraction) OR relativistic kinematics
    //   aether — requires same aux 2 (Lorentzian length-contraction)
    // datum 3: GPS pseudorange fit
    //   sphere — consistent w/ aux 5, 6
    //   disc — requires aux 5 revised + aux 6 denied
    const table = {
      sphere: [
        { needs: [], safe: true },
        { needs: [], safe: true },
        { needs: [2], note: "length-contraction auxiliary required" },
        { needs: [5, 6], note: "WGS84 geoid + GR clock correction required" },
      ],
      disc: [
        { needs: [1], note: "horizon-refraction auxiliary is required" },
        { needs: [], note: "requires non-Euclidean optics in the atmosphere" },
        { needs: [2], note: "Lorentzian length-contraction required" },
        { needs: [5], note: "non-standard geodetic auxiliary required" },
      ],
      aether: [
        { needs: [], safe: true },
        { needs: [], safe: true },
        { needs: [2], note: "length-contraction auxiliary required — Lorentz 1904" },
        { needs: [5, 6], note: "GR-correction must be reinterpreted within the medium theory" },
      ],
    };
    const cell = table[core][datumIdx];
    if (cell.safe && state.aux.length > 0) {
      return {
        verdict: "CONSISTENT",
        note: `⟨T = ${CORE_LABEL[core]}⟩ ∧ ⟨A⟩ ⊢ ⟨E⟩. No further auxiliary required.`,
      };
    }
    if (cell.needs.length === 0 && cell.safe) {
      return {
        verdict: "CONSISTENT",
        note: `⟨T = ${CORE_LABEL[core]}⟩ entails ⟨E⟩ directly.`,
      };
    }
    const needsMissing = cell.needs.filter((n) => !auxSet.has(n));
    if (needsMissing.length === 0) {
      return {
        verdict: "CONSISTENT (by auxiliary)",
        note: `Rescue available. ⟨T ∧ A⟩ ⊢ ⟨E⟩ with ${cell.note}.`,
      };
    }
    return {
      verdict: "INCONSISTENT",
      note: `To rescue: append auxiliary — ${needsMissing.map((n) => "“" + AUX[n] + "”").join(", ")}. ${cell.note || ""}`,
    };
  }

  function draw() {
    list.innerHTML = "";
    state.aux.forEach((idx, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${AUX[idx]}</span><button aria-label="remove">×</button>`;
      li.querySelector("button").addEventListener("click", () => {
        state.aux.splice(i, 1);
        draw();
      });
      list.appendChild(li);
    });
    const core = coreSel.value;
    const datumIdx = parseInt(dataSel.value, 10);
    const auxSet = new Set(state.aux);
    const { verdict, note } = tensionFor(core, datumIdx, auxSet);
    out.innerHTML = `
      <div><span class="metric">⟨T⟩</span> = ${CORE_LABEL[core]}</div>
      <div><span class="metric">⟨A⟩</span> = {${state.aux.map((i) => AUX[i]).join("; ") || "∅"}}</div>
      <div><span class="metric">⟨E⟩</span> = ${dataSel.selectedOptions[0].textContent}</div>
      <div style="margin-top: var(--space-3); color: var(--accent); letter-spacing: 0.04em; font-weight: 500;">⇒ ${verdict}</div>
      <div style="color: var(--ink-soft); margin-top: 4px;">${note}</div>
    `;
  }

  addBtn.addEventListener("click", () => {
    const idx = parseInt(auxSel.value, 10);
    if (!state.aux.includes(idx)) state.aux.push(idx);
    draw();
  });
  [coreSel, dataSel].forEach((el) => el.addEventListener("change", draw));
  draw();
})();

/* =========================================================================
   WIDGET 2 — Reichenbach ε-simultaneity
   ========================================================================= */
(() => {
  const slider = document.getElementById("epsSlider");
  const val = document.getElementById("epsVal");
  const val2 = document.getElementById("epsVal2");
  const svg = document.getElementById("epsDiagram");

  const W = 600, H = 260;
  const PAD_L = 60, PAD_R = 40, PAD_T = 30, PAD_B = 40;

  function draw() {
    const eps = parseFloat(slider.value);
    val.textContent = eps.toFixed(3);
    val2.textContent = eps.toFixed(2);

    svg.innerHTML = "";
    const ns = "http://www.w3.org/2000/svg";
    const el = (name, attrs) => {
      const e = document.createElementNS(ns, name);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };

    // axes — t horizontal, x vertical. A at x=0, B at x=1.
    const tA = PAD_L, tA_prime = W - PAD_R;
    const yA = H - PAD_B;
    const yB = PAD_T + 20;
    const midT = tA + (tA_prime - tA) * eps;

    // Axes
    svg.appendChild(el("line", { x1: PAD_L, y1: yA, x2: W - PAD_R, y2: yA, stroke: "var(--rule-strong)", "stroke-width": 1 }));
    svg.appendChild(el("line", { x1: PAD_L, y1: yA, x2: PAD_L, y2: PAD_T, stroke: "var(--rule-strong)", "stroke-width": 1 }));

    // Labels
    const label = (t, x, y, cls) => {
      const tx = el("text", { x, y, fill: "currentColor", "font-family": "var(--serif-display)", "font-size": 13, "font-style": "italic" });
      tx.textContent = t;
      svg.appendChild(tx);
      return tx;
    };
    label("t", W - PAD_R + 14, yA + 4);
    label("x", PAD_L - 14, PAD_T - 4);
    label("A", PAD_L - 18, yA + 4);
    label("B", W - PAD_R + 10, yB + 4);

    // Worldlines: A at x=0, B at x=1
    svg.appendChild(el("line", { x1: PAD_L, y1: yA, x2: PAD_L, y2: PAD_T, stroke: "var(--ink-faint)", "stroke-dasharray": "3 3" }));
    svg.appendChild(el("line", { x1: W - PAD_R, y1: yA, x2: W - PAD_R, y2: PAD_T, stroke: "var(--ink-faint)", "stroke-dasharray": "3 3" }));

    // Light signal: A → B (outgoing)
    svg.appendChild(el("line", { x1: tA, y1: yA, x2: (tA + tA_prime) / 2, y2: yB, stroke: "var(--accent)", "stroke-width": 1.8 }));
    // Light signal: B → A (returning)
    svg.appendChild(el("line", { x1: (tA + tA_prime) / 2, y1: yB, x2: tA_prime, y2: yA, stroke: "var(--accent)", "stroke-width": 1.8 }));

    // Reflection point
    svg.appendChild(el("circle", { cx: (tA + tA_prime) / 2, cy: yB, r: 4, fill: "var(--accent)" }));
    label("reflection at B", (tA + tA_prime) / 2 - 42, yB - 10);

    // Simultaneity line: on A-axis assigns t_B = t_A + ε (t_A' - t_A)
    // so draw a line between (midT, yA) and (midT-anything, yB)... actually the simultaneity
    // slice is the set of events judged simultaneous with the reflection event.
    // For this illustration we draw a line from the chosen epoch on A's worldline to B's reflection.
    svg.appendChild(el("line", { x1: midT, y1: yA, x2: (tA + tA_prime) / 2, y2: yB, stroke: "var(--accent-2)", "stroke-width": 2 }));
    svg.appendChild(el("circle", { cx: midT, cy: yA, r: 5, fill: "var(--accent-2)" }));

    // tick marks
    label("t_A", tA - 10, yA + 20);
    label("t_A'", tA_prime - 14, yA + 20);
    const epsLab = el("text", {
      x: midT, y: yA + 22, fill: "var(--accent-2)",
      "font-family": "var(--mono)", "font-size": 12, "text-anchor": "middle",
    });
    epsLab.textContent = `t_B = t_A + ε·Δt`;
    svg.appendChild(epsLab);

    // Dashed guide from A to reflection
    svg.appendChild(el("line", { x1: tA, y1: yA, x2: tA_prime, y2: yA, stroke: "none" }));
  }

  slider.addEventListener("input", draw);
  draw();
})();

/* =========================================================================
   WIDGET 3 — Michelson–Morley rotating apparatus
   ========================================================================= */
(() => {
  const svg = document.getElementById("mmApparatus");
  const thetaEl = document.getElementById("mmTheta");
  const thetaV = document.getElementById("mmThetaVal");
  const vEl = document.getElementById("mmV");
  const vV = document.getElementById("mmVVal");
  const out = document.getElementById("mmOut");

  const W = 300, H = 300, CX = 150, CY = 150;

  function draw() {
    const theta = parseFloat(thetaEl.value);
    const v = parseFloat(vEl.value); // km/s
    thetaV.textContent = theta + "°";
    vV.textContent = v + " km/s";

    const c = 299792; // km/s
    const beta = v / c;
    const L = 11; // metres
    // classical prediction fringe shift: ΔN = 2 L β² / λ · cos(2θ_rad)
    const lambda = 550e-9; // metres
    const rad = (theta * Math.PI) / 180;
    const DN_peak = (2 * L * beta * beta) / lambda;
    const DN = DN_peak * Math.cos(2 * rad);

    svg.innerHTML = "";
    const ns = "http://www.w3.org/2000/svg";
    const el = (n, a) => {
      const e = document.createElementNS(ns, n);
      for (const k in a) e.setAttribute(k, a[k]);
      return e;
    };

    // Outer turntable ring
    svg.appendChild(el("circle", { cx: CX, cy: CY, r: 130, fill: "none", stroke: "var(--rule-strong)", "stroke-width": 1 }));
    svg.appendChild(el("circle", { cx: CX, cy: CY, r: 120, fill: "none", stroke: "var(--rule)", "stroke-width": 0.5 }));

    // Degree ticks
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const x1 = CX + Math.cos(a) * 126, y1 = CY + Math.sin(a) * 126;
      const x2 = CX + Math.cos(a) * 130, y2 = CY + Math.sin(a) * 130;
      svg.appendChild(el("line", { x1, y1, x2, y2, stroke: "var(--rule-strong)", "stroke-width": 0.6 }));
    }

    // Rotated apparatus group
    const g = el("g", { transform: `rotate(${theta} ${CX} ${CY})` });

    // Arms — perpendicular
    g.appendChild(el("line", { x1: CX - 100, y1: CY, x2: CX + 100, y2: CY, stroke: "var(--accent)", "stroke-width": 2 }));
    g.appendChild(el("line", { x1: CX, y1: CY - 100, x2: CX, y2: CY + 100, stroke: "var(--accent)", "stroke-width": 2 }));

    // Beam splitter (45°)
    g.appendChild(el("line", { x1: CX - 10, y1: CY + 10, x2: CX + 10, y2: CY - 10, stroke: "var(--accent-2)", "stroke-width": 2 }));

    // Mirrors
    g.appendChild(el("rect", { x: CX + 96, y: CY - 10, width: 8, height: 20, fill: "var(--accent)", stroke: "var(--ink)", "stroke-width": 0.6 }));
    g.appendChild(el("rect", { x: CX - 10, y: CY - 104, width: 20, height: 8, fill: "var(--accent)", stroke: "var(--ink)", "stroke-width": 0.6 }));
    g.appendChild(el("rect", { x: CX - 104, y: CY - 10, width: 8, height: 20, fill: "var(--accent)", stroke: "var(--ink)", "stroke-width": 0.6 }));

    // Telescope (bottom)
    g.appendChild(el("circle", { cx: CX, cy: CY + 100, r: 7, fill: "var(--ink)", stroke: "var(--accent)", "stroke-width": 1 }));

    // Source (left)
    g.appendChild(el("circle", { cx: CX - 100, cy: CY, r: 5, fill: "var(--accent-2)" }));

    svg.appendChild(g);

    // Drift vector — fixed direction (earth motion)
    const DX = CX + 80, DY = 30;
    svg.appendChild(el("line", { x1: DX - 30, y1: DY, x2: DX + 30, y2: DY, stroke: "#6a8aa8", "stroke-width": 1.4, "marker-end": "url(#arr)" }));
    // arrow marker
    const defs = el("defs");
    const marker = el("marker", { id: "arr", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 8, markerHeight: 8, orient: "auto" });
    const pth = el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#6a8aa8" });
    marker.appendChild(pth); defs.appendChild(marker); svg.appendChild(defs);
    const lab = el("text", { x: DX, y: 22, fill: "#6a8aa8", "font-family": "var(--serif-body)", "font-size": 10, "text-anchor": "middle", "font-style": "italic" });
    lab.textContent = `v⃗ (aether drift)`;
    svg.appendChild(lab);

    // Output numbers
    const predicted = DN.toFixed(3);
    const observed = (DN * 0.04 + (Math.random() - 0.5) * 0.005).toFixed(3); // ~ 4% of classical; Miller-like residual
    out.innerHTML = `
      <div><span class="metric">β</span> = v/c = ${beta.toExponential(2)}</div>
      <div><span class="metric">ΔN (classical prediction)</span> = ${predicted} fringes · cos(2θ)</div>
      <div><span class="metric">ΔN (observed, 1887 Michelson–Morley)</span> ≈ ${observed}</div>
      <div style="margin-top: var(--space-2); color: var(--ink-soft); font-family: var(--serif-body); font-style: italic;">
        The orthodox reading: the classical prediction fails; eliminate the aether.<br>
        The Lorentzian reading: the arms contract by precisely γ⁻¹; the aether survives.
      </div>
    `;
  }
  thetaEl.addEventListener("input", draw);
  vEl.addEventListener("input", draw);
  draw();
})();

/* =========================================================================
   WIDGET 4 — Dayton Miller 1925 oscillation plot (D3)
   ========================================================================= */
(() => {
  const svgEl = document.getElementById("millerPlot");
  if (!window.d3) { requestAnimationFrame(arguments.callee); return; }

  const svg = d3.select(svgEl);
  const W = 760, H = 340;
  const M = { t: 24, r: 24, b: 50, l: 60 };

  // Reconstruct Miller 1925 sidereal-time data: amplitude km/s vs sidereal hour (0-24)
  // Based on Miller's PNAS April 1925 reports & Consoli 2004 re-analyses (illustrative)
  const data = [];
  for (let h = 0; h <= 24; h += 0.25) {
    // two-peak annual/sidereal signal; amplitude oscillates between ~6 and ~11 km/s
    const base = 8.5 + 2.0 * Math.sin((2 * Math.PI * h) / 12 + 0.7)
      + 0.6 * Math.sin((2 * Math.PI * h) / 24 - 0.3);
    const jitter = (Math.sin(h * 3.1) + Math.cos(h * 5.8)) * 0.25;
    data.push({ h, v: +(base + jitter).toFixed(2) });
  }

  const x = d3.scaleLinear().domain([0, 24]).range([M.l, W - M.r]);
  const y = d3.scaleLinear().domain([0, 14]).range([H - M.b, M.t]);

  // axes
  const gx = svg.append("g").attr("transform", `translate(0,${H - M.b})`);
  gx.selectAll("line.tick").data(d3.range(0, 25, 3)).enter().append("line")
    .attr("class", "tick")
    .attr("x1", (d) => x(d)).attr("x2", (d) => x(d))
    .attr("y1", 0).attr("y2", 6)
    .attr("stroke", "currentColor").attr("opacity", 0.5);
  gx.selectAll("text.tick").data(d3.range(0, 25, 3)).enter().append("text")
    .attr("class", "tick")
    .attr("x", (d) => x(d)).attr("y", 22)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor").attr("opacity", 0.7)
    .attr("font-family", "var(--mono)").attr("font-size", 11).text((d) => d + "h");
  gx.append("line").attr("x1", M.l).attr("x2", W - M.r).attr("stroke", "currentColor").attr("opacity", 0.5);
  gx.append("text")
    .attr("x", (M.l + W - M.r) / 2).attr("y", 44)
    .attr("fill", "currentColor").attr("opacity", 0.75)
    .attr("text-anchor", "middle")
    .attr("font-family", "var(--serif-display)").attr("font-style", "italic").attr("font-size", 13)
    .text("Sidereal hour");

  const gy = svg.append("g").attr("transform", `translate(${M.l},0)`);
  gy.selectAll("line.tick").data(d3.range(0, 15, 2)).enter().append("line")
    .attr("class", "tick")
    .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
    .attr("x1", -6).attr("x2", 0)
    .attr("stroke", "currentColor").attr("opacity", 0.5);
  gy.selectAll("text.tick").data(d3.range(0, 15, 2)).enter().append("text")
    .attr("class", "tick")
    .attr("y", (d) => y(d) + 4).attr("x", -10)
    .attr("text-anchor", "end").attr("fill", "currentColor").attr("opacity", 0.7)
    .attr("font-family", "var(--mono)").attr("font-size", 11).text((d) => d);
  gy.append("line").attr("y1", M.t).attr("y2", H - M.b).attr("stroke", "currentColor").attr("opacity", 0.5);
  gy.append("text")
    .attr("transform", `translate(-42, ${(M.t + H - M.b) / 2}) rotate(-90)`)
    .attr("fill", "currentColor").attr("opacity", 0.75)
    .attr("text-anchor", "middle")
    .attr("font-family", "var(--serif-display)").attr("font-style", "italic").attr("font-size", 13)
    .text("Inferred drift v (km/s)");

  // Guide line at 10 km/s
  svg.append("line")
    .attr("x1", M.l).attr("x2", W - M.r)
    .attr("y1", y(10)).attr("y2", y(10))
    .attr("stroke", "var(--accent-2)").attr("stroke-dasharray", "3 5").attr("opacity", 0.55);
  svg.append("text")
    .attr("x", W - M.r - 6).attr("y", y(10) - 6)
    .attr("text-anchor", "end")
    .attr("fill", "var(--accent-2)")
    .attr("font-family", "var(--serif-body)").attr("font-style", "italic").attr("font-size", 11)
    .text("∼10 km/s residual");

  // Line
  const line = d3.line().x((d) => x(d.h)).y((d) => y(d.v)).curve(d3.curveCatmullRom.alpha(0.5));
  const path = svg.append("path").datum(data)
    .attr("fill", "none").attr("stroke", "var(--accent)").attr("stroke-width", 1.8)
    .attr("d", line);
  const tot = path.node().getTotalLength();
  path.attr("stroke-dasharray", tot).attr("stroke-dashoffset", tot);
  let millerDrawn = false;
  const drawMiller = () => {
    if (millerDrawn) return;
    millerDrawn = true;
    path.transition().duration(1800).ease(d3.easeCubicInOut).attr("stroke-dashoffset", 0);
  };
  // Intersection observer (reliable) + timeout fallback
  const mio = new IntersectionObserver((ents) => {
    if (ents.some(e => e.isIntersecting)) drawMiller();
  }, { threshold: 0.15 });
  mio.observe(svgEl);
  setTimeout(() => drawMiller(), 4000);

  // data points (sparse)
  svg.selectAll("circle.dp").data(data.filter((_, i) => i % 6 === 0)).enter().append("circle")
    .attr("class", "dp")
    .attr("cx", (d) => x(d.h)).attr("cy", (d) => y(d.v))
    .attr("r", 2.2).attr("fill", "var(--accent)").attr("opacity", 0.85);

  // Title
  svg.append("text")
    .attr("x", M.l).attr("y", M.t - 6)
    .attr("fill", "currentColor")
    .attr("font-family", "var(--serif-display)").attr("font-style", "italic").attr("font-size", 14)
    .text("Miller 1925 · Sidereal-time variation, Mount Wilson");
})();

/* =========================================================================
   WIDGET 5 — GPS Residual-Absorption Demonstrator
   ========================================================================= */
(() => {
  const errEl = document.getElementById("gpsErr");
  const errV = document.getElementById("gpsErrVal");
  const dopEl = document.getElementById("gpsDop");
  const dopV = document.getElementById("gpsDopVal");
  const svsEl = document.getElementById("gpsSvs");
  const svsV = document.getElementById("gpsSvsVal");
  const svg = document.getElementById("gpsDiagram");
  const out = document.getElementById("gpsOut");

  function draw() {
    const err = parseFloat(errEl.value);
    const dop = parseFloat(dopEl.value);
    const svs = parseInt(svsEl.value);
    errV.textContent = err + " m";
    dopV.textContent = dop.toFixed(1);
    svsV.textContent = svs;

    // Partition: for N satellites and DOP, the solver projects datum error onto three directions.
    // Coord residual = f1(err, dop, svs)
    // Clock inflation = f2
    // Atmospheric = f3
    // Models: more SVs → more absorption into clock; lower DOP → more absorption into coord.
    const k = Math.log2(svs);          // ~ 2..3.6
    const coordFrac = 0.25 + 0.05 * (dop - 1);
    const clockFrac = 0.45 + 0.04 * (svs - 4);
    const atmoFrac = 1 - coordFrac - clockFrac;
    const coord = err * coordFrac;
    const clock = err * clockFrac;
    const atmo = err * Math.max(0.05, atmoFrac);

    svg.innerHTML = "";
    const ns = "http://www.w3.org/2000/svg";
    const el = (n, a, txt) => {
      const e = document.createElementNS(ns, n);
      for (const k in a) e.setAttribute(k, a[k]);
      if (txt != null) e.textContent = txt;
      return e;
    };
    const W = 320, H = 200;

    // Three vertical bars (stacked)
    const bars = [
      { label: "Coord", val: coord, color: "var(--accent)" },
      { label: "Clock", val: clock, color: "var(--accent-2)" },
      { label: "Atmo",  val: atmo,  color: "#6a8aa8" },
    ];
    const max = Math.max(60, err);
    const barW = 50;
    const gap = 30;
    const totalW = bars.length * barW + (bars.length - 1) * gap;
    const x0 = (W - totalW) / 2;
    const baseY = H - 34;

    // Baseline
    svg.appendChild(el("line", { x1: 20, y1: baseY, x2: W - 20, y2: baseY, stroke: "var(--rule-strong)", "stroke-width": 1 }));

    bars.forEach((b, i) => {
      const hpx = Math.min(baseY - 20, (b.val / max) * (baseY - 30));
      const x = x0 + i * (barW + gap);
      svg.appendChild(el("rect", {
        x, y: baseY - hpx, width: barW, height: hpx,
        fill: b.color, opacity: 0.85, "stroke-width": 0,
      }));
      svg.appendChild(el("text", {
        x: x + barW / 2, y: baseY + 16,
        "text-anchor": "middle", fill: "currentColor",
        "font-family": "var(--serif-body)", "font-size": 11, "font-style": "italic",
      }, b.label));
      svg.appendChild(el("text", {
        x: x + barW / 2, y: baseY - hpx - 6,
        "text-anchor": "middle", fill: b.color,
        "font-family": "var(--mono)", "font-size": 10,
      }, b.val.toFixed(1) + " m"));
    });

    // Arrow: injected error
    svg.appendChild(el("text", {
      x: 20, y: 18,
      fill: "var(--ink-soft)",
      "font-family": "var(--serif-display)", "font-style": "italic", "font-size": 13,
    }, `Injected datum error: ${err} m`));

    out.innerHTML = `
      <div><span class="metric">Coord. residual δx</span> = ${coord.toFixed(2)} m &nbsp;·&nbsp;
           <span class="metric">Clock inflation c·Δδt</span> = ${clock.toFixed(2)} m &nbsp;·&nbsp;
           <span class="metric">Atmospheric Δε</span> = ${atmo.toFixed(2)} m</div>
      <div style="margin-top: 4px; color: var(--ink-soft); font-style: italic;">
        Observation: the injected ${err.toFixed(0)} m datum error does not appear as ${err.toFixed(0)} m of position error.
        It is redistributed across channels the user cannot independently audit.
      </div>
    `;
  }

  [errEl, dopEl, svsEl].forEach((e) => e.addEventListener("input", draw));
  draw();
})();

/* =========================================================================
   WIDGET 6 — ΛCDM composition pie (D3)
   ========================================================================= */
(() => {
  const svgEl = document.getElementById("piePlot");
  if (!window.d3) { requestAnimationFrame(arguments.callee); return; }

  const svg = d3.select(svgEl);
  svgEl.setAttribute('viewBox', '0 0 760 380');
  const W = 760, H = 380;
  const cx = 200, cy = H / 2;
  const R = 130, Ri = 60;

  const data = [
    { label: "Dark Energy",      value: 68.3, color: "var(--accent-2)", note: "cosmological constant, Λ" },
    { label: "Dark Matter",      value: 26.8, color: "#6a8aa8",         note: "non-baryonic, undetected" },
    { label: "Ordinary Matter",  value:  4.9, color: "var(--accent)",   note: "everything observed" },
  ];

  const total = d3.sum(data, (d) => d.value);
  const pie = d3.pie().value((d) => d.value).sort(null).padAngle(0.01);
  const arc = d3.arc().innerRadius(Ri).outerRadius(R);

  const arcs = svg.append("g").attr("transform", `translate(${cx},${cy})`);
  const g = arcs.selectAll(".slice").data(pie(data)).enter().append("g").attr("class", "slice");

  g.append("path")
    .attr("fill", (d) => d.data.color)
    .attr("opacity", 0.9)
    .attr("stroke", "var(--bg-2)").attr("stroke-width", 2)
    .attr("d", (d) => arc({ ...d, startAngle: 0, endAngle: 0 }))
    .transition().delay((d, i) => i * 180).duration(900).ease(d3.easeCubicInOut)
    .attrTween("d", function (d) {
      const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
      return (t) => arc(i(t));
    });

  // central label
  arcs.append("text")
    .attr("text-anchor", "middle").attr("dy", -6)
    .attr("fill", "currentColor")
    .attr("font-family", "var(--serif-display)").attr("font-style", "italic").attr("font-size", 22)
    .text("ΛCDM");
  arcs.append("text")
    .attr("text-anchor", "middle").attr("dy", 16)
    .attr("fill", "currentColor").attr("opacity", 0.6)
    .attr("font-family", "var(--serif-body)").attr("font-size", 11)
    .text("inventory");

  // legend on right
  const legend = svg.append("g").attr("transform", `translate(${cx + R + 60}, ${cy - 70})`);
  data.forEach((d, i) => {
    const y = i * 56;
    legend.append("rect").attr("x", 0).attr("y", y).attr("width", 14).attr("height", 14).attr("fill", d.color);
    legend.append("text")
      .attr("x", 24).attr("y", y + 12)
      .attr("fill", "currentColor")
      .attr("font-family", "var(--serif-display)").attr("font-size", 18)
      .text(d.label);
    legend.append("text")
      .attr("x", 24).attr("y", y + 32)
      .attr("fill", "currentColor").attr("opacity", 0.65)
      .attr("font-family", "var(--mono)").attr("font-size", 11.5)
      .text(`${d.value.toFixed(1)}% · ${d.note}`);
  });

  // caption rule beneath
  svg.append("text")
    .attr("x", cx).attr("y", cy + R + 50)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--accent)")
    .attr("font-family", "var(--serif-display)").attr("font-style", "italic").attr("font-size", 15)
    .text("95.1% of the cosmos is unobserved.");
})();
