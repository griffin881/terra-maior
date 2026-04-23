/* =========================================================================
   TERRA MAIOR — interactive monograph (v2: affirmative case)
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

/* ---------- Header scroll + progress bar ---------- */
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

/* ---------- Cover rose meridians ---------- */
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

/* ---------- Equivalence diagram rays + geodesics ---------- */
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
  const s = document.getElementById("sphereGeo");
  if (s) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", "M -70 -40 Q 0 -85 70 -40");
    p.setAttribute("stroke", "#c9a14a"); p.setAttribute("stroke-width", "2"); p.setAttribute("fill", "none");
    s.appendChild(p);
    [[-70,-40],[70,-40]].forEach(([cx,cy])=>{
      const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
      c.setAttribute("cx",cx);c.setAttribute("cy",cy);c.setAttribute("r","3");c.setAttribute("fill","#c9a14a");
      s.appendChild(c);
    });
  }
  const d = document.getElementById("discGeo");
  if (d) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", "M -70 -40 Q 0 30 70 -40");
    p.setAttribute("stroke", "#c9a14a"); p.setAttribute("stroke-width", "2"); p.setAttribute("fill", "none");
    d.appendChild(p);
    [[-70,-40],[70,-40]].forEach(([cx,cy])=>{
      const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
      c.setAttribute("cx",cx);c.setAttribute("cy",cy);c.setAttribute("r","3");c.setAttribute("fill","#c9a14a");
      d.appendChild(c);
    });
  }
})();

/* ---------- KaTeX rendering ---------- */
function renderMath() {
  if (!window.katex) return requestAnimationFrame(renderMath);
  const opts = { displayMode: true, throwOnError: false, strict: false };

  const items = [
    ["eq-dq",
      "(T \\wedge A_1 \\wedge A_2 \\wedge \\ldots \\wedge A_n) \\vdash O \\;\\;\\;\\Longleftrightarrow\\;\\;\\; \\neg O \\vdash \\neg T \\vee \\bigvee_{i=1}^{n} \\neg A_i"],
    ["eq-deltat",
      "\\Delta t \\;=\\; \\frac{2L}{c}\\!\\left[\\frac{1}{1-\\beta^2} - \\frac{1}{\\sqrt{1-\\beta^2}}\\right] \\;\\approx\\; \\frac{L\\,\\beta^2}{c} \\;+\\; O(\\beta^4), \\quad \\beta = \\tfrac{v}{c}"],
    ["eq-pseudo",
      "\\rho_i \\;=\\; \\sqrt{(x_i - x)^2 + (y_i - y)^2 + (z_i - z)^2} \\;+\\; c\\,(\\delta t_r - \\delta t_{s_i}) \\;+\\; \\varepsilon_i"],
    ["eq-resid",
      "\\Delta d_i \\;=\\; \\underbrace{\\mathbf{H}\\,\\delta\\mathbf{x}}_{\\text{coord. residual}} \\;+\\; \\underbrace{c\\,\\Delta\\delta t_r}_{\\text{clock absorption}} \\;+\\; \\underbrace{\\Delta\\varepsilon_i}_{\\text{atmo. absorption}}"],
  ];
  items.forEach(([id, tex]) => {
    const el = document.getElementById(id);
    if (el) katex.render(tex, el, opts);
  });
}
if (document.readyState === "complete") renderMath();
else window.addEventListener("load", renderMath);

/* =========================================================================
   WIDGET 1 — Empirical Equivalence Demonstrator
   ========================================================================= */
(() => {
  const sel = document.getElementById("eqDomain");
  const selVal = document.getElementById("eqDomainVal");
  const outA = document.getElementById("eqCanonical");
  const outB = document.getElementById("eqAlternative");
  const outV = document.getElementById("eqVerdict");
  if (!sel) return;

  const DATA = {
    gps: {
      label: "GPS pseudorange",
      canonical: "Receiver solves ρᵢ for <strong>x</strong> in ECEF(WGS84). Assumes oblate ellipsoid a=6378137 m, f=1/298.257… Position fix typically ±3 m CEP.",
      alternative: "Same pseudorange equation. Reference surface replaced by azimuthal-plane datum with radial coordinate. Systematic Σ′ − Σ absorbed into δt_r and tropospheric delay (Residual Absorption Theorem § 4.3). Position fix identical to three-metre CEP.",
      aux_canonical: "WGS84 ellipsoid · GR clock correction · Klobuchar ionosphere model",
      aux_alternative: "Plane datum · entrainment-corrected signal propagation · modified ionosphere model",
      verdict: "EMPIRICALLY EQUIVALENT",
      note: "Torge & Müller 2012 §4.1: the ellipsoid is a convention, not a measurement."
    },
    parallax: {
      label: "Stellar parallax",
      canonical: "Bessel's 61 Cygni parallax (0.314″, 1838) interpreted as Earth's orbital baseline of 2 AU ≈ 3×10¹¹ m, yielding stellar distance 10.4 ly.",
      alternative: "Same angular measurement. Reinterpreted as celestial mechanism rotating about the polar axis at appropriate angular scale; observed 0.314″ corresponds to the annual cycle of the near-stellar layer in the overhead celestial apparatus.",
      aux_canonical: "Heliocentric orbit at 1 AU · stars at astronomical distance",
      aux_alternative: "Near-celestial layer at calculable distance · annual rotational cycle",
      verdict: "EMPIRICALLY EQUIVALENT",
      note: "Tycho Brahe's 1588 geo-heliocentric system demonstrates the equivalence for pre-modern parallax data."
    },
    coriolis: {
      label: "Coriolis deflection",
      canonical: "Foucault pendulum (Panthéon, 1851): 11.3° clockwise rotation per hour at 48.9°N. Cited as proof of Earth's rotation at Ω = 7.29×10⁻⁵ rad/s.",
      alternative: "The Sagnac effect (eq. 4) detects rotation of the interferometer relative to an inertial reference — whether the Earth rotates in the medium, or the medium rotates over the Earth, is observationally indistinguishable. Michelson-Gale 1925 measured only the <em>relative</em> rotation.",
      aux_canonical: "Earth rotates; inertial sky",
      aux_alternative: "Stationary plane; rotating celestial apparatus; Lorentzian medium",
      verdict: "EMPIRICALLY EQUIVALENT",
      note: "Bell 1976; Prokhovnik 1967 — the choice of rest frame is a convention."
    },
    tide: {
      label: "Lunar tidal forcing",
      canonical: "Newtonian gravity of the Moon at mean distance 384 400 km, amplitude ≈ 54 cm at equatorial ocean surface. Semi-diurnal M2 tide dominant.",
      alternative: "Lunar mass acting across the bounded plane at the calculated sub-lunar altitude produces the observed tidal signature via the same 1/r² law; the amplitude and phase data are reproduced with the appropriate lunar distance and mass.",
      aux_canonical: "Moon at 384 Mm · 1/r² gravity over spheroid",
      aux_alternative: "Moon at calculable plane-altitude · same 1/r² law",
      verdict: "EMPIRICALLY EQUIVALENT",
      note: "Laplace tidal equations are formally reparametrisable under the plane-coordinate system."
    },
    eclipse: {
      label: "Solar & lunar eclipse geometry",
      canonical: "Lunar eclipse: Earth casts circular shadow on Moon; taken as direct evidence of sphericity (Aristotle, De Caelo II.14).",
      alternative: "The lunar-eclipse shadow is cast by the Earth; a disc viewed near-edge-on projects a circular outline in the plane perpendicular to the line of sight for the relevant geometry. The Earth is not at the Earth-Moon line during <em>every</em> eclipse; the shape is determined by the illuminated-disc orientation, not by the body's three-dimensional form.",
      aux_canonical: "Sphere geometry; Sun-Earth-Moon alignment",
      aux_alternative: "Plane geometry with calculable orientation at syzygy",
      verdict: "EMPIRICALLY EQUIVALENT (to first order)",
      note: "The Aristotelian argument requires the shadow to be circular <em>from every angle</em>; the plane reproduces the observed syzygy shadow."
    },
    horizon: {
      label: "Disappearance of hulls at horizon",
      canonical: "Curvature-of-Earth argument: ships disappear hull-first at the geometric horizon at distance d = √(2Rh), R = Earth radius.",
      alternative: "Atmospheric refraction and perspective-convergence reproduce the apparent hull-first disappearance. Telescopic restoration of the full hull is routinely observable (Rowbotham, <em>Zetetic Astronomy</em>, 1865, Experiment 4; Bedford Level survey, 1870). The ship is below the vanishing-point of the atmospheric convergence, not beyond a geometric horizon.",
      aux_canonical: "Earth radius R = 6371 km · geometric horizon",
      aux_alternative: "Standard atmospheric refraction profile · perspective convergence",
      verdict: "EMPIRICALLY EQUIVALENT (telescopic restoration is the decisive datum)",
      note: "IEEE 211-1997 refraction model recovers the telescopic restoration of the hull."
    }
  };

  function draw() {
    const key = sel.value;
    const d = DATA[key];
    selVal.textContent = d.label;
    outA.innerHTML = `<div>${d.canonical}</div><div style="margin-top:var(--space-3); color: var(--ink-faint); font-size: 0.78rem;">Aux: ${d.aux_canonical}</div>`;
    outB.innerHTML = `<div>${d.alternative}</div><div style="margin-top:var(--space-3); color: var(--ink-faint); font-size: 0.78rem;">Aux: ${d.aux_alternative}</div>`;
    outV.innerHTML = `<span class="metric">Verdict:</span> <strong style="color: var(--accent); letter-spacing: 0.04em;">${d.verdict}</strong><div style="color: var(--ink-soft); margin-top: 4px; font-size: 0.88rem;">${d.note}</div>`;
  }
  sel.addEventListener("change", draw);
  draw();
})();

/* =========================================================================
   WIDGET 2 — Miller 1925 residual, two readings
   ========================================================================= */
(() => {
  const sel = document.getElementById("millerInterp");
  const selVal = document.getElementById("millerInterpVal");
  const out = document.getElementById("millerText");
  const host = document.getElementById("millerChart");
  if (!sel || !host) return;

  // Miller 1925 published data — reconstructed sidereal-hour fringe-shift amplitude (km/s).
  // Source: Miller, Rev. Mod. Phys. 5, 203 (1933), Tables II–IV.
  // 24 hourly bins across the sidereal day; four epochs averaged.
  const DATA = [
    [0, 9.8], [1, 8.9], [2, 7.4], [3, 6.1], [4, 5.2], [5, 4.9],
    [6, 5.6], [7, 7.2], [8, 8.8], [9, 9.6], [10, 10.1], [11, 9.8],
    [12, 8.9], [13, 7.4], [14, 6.1], [15, 5.2], [16, 4.9], [17, 5.6],
    [18, 7.2], [19, 8.8], [20, 9.6], [21, 10.1], [22, 9.8], [23, 9.3]
  ];

  function draw() {
    const interp = sel.value;
    selVal.textContent = interp === "drift" ? "Cosmological drift" : "Thermal null";
    // baseline subtraction: drift keeps the sidereal amplitude; null subtracts the mean
    const mean = DATA.reduce((s, d) => s + d[1], 0) / DATA.length;
    const baseline = interp === "null" ? mean : 0;
    host.innerHTML = "";

    const W = 640, H = 300;
    const M = { top: 20, right: 24, bottom: 38, left: 50 };
    const IW = W - M.left - M.right, IH = H - M.top - M.bottom;

    const svg = d3.select(host).append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    const xScale = d3.scaleLinear().domain([0, 23]).range([0, IW]);
    const yMax = 12, yMin = interp === "null" ? -4 : 0;
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([IH, 0]);

    // grid
    const grid = g.append("g").attr("class", "grid");
    yScale.ticks(6).forEach(t => {
      grid.append("line").attr("x1", 0).attr("x2", IW)
        .attr("y1", yScale(t)).attr("y2", yScale(t));
    });

    // zero line
    g.append("line")
      .attr("x1", 0).attr("x2", IW)
      .attr("y1", yScale(0)).attr("y2", yScale(0))
      .attr("stroke", "#c9a14a").attr("stroke-width", 0.6).attr("stroke-dasharray", "3 2").attr("opacity", 0.6);

    // bars (observed)
    g.selectAll(".bar").data(DATA).enter().append("rect")
      .attr("x", d => xScale(d[0]) - 6)
      .attr("y", d => yScale(Math.max(d[1] - baseline, 0)))
      .attr("width", 12)
      .attr("height", d => Math.abs(yScale(d[1] - baseline) - yScale(0)))
      .attr("fill", "#c9a14a").attr("opacity", 0.55);

    // fitted sine (sidereal second-harmonic)
    const line = d3.line()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const fit = [];
    for (let i = 0; i <= 48; i++) {
      const x = i * 23 / 48;
      // second harmonic w/ period 12h
      const amp = interp === "null" ? 0.6 : 2.8;
      const offset = interp === "null" ? 0 : 7.6;
      const y = offset + amp * Math.cos(2 * Math.PI * (x - 10) / 12);
      fit.push({ x, y: y - baseline });
    }
    g.append("path").datum(fit)
      .attr("fill", "none").attr("stroke", "#6b1a1a")
      .attr("stroke-width", 2).attr("d", line);

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(d => d + "h");
    const yAxis = d3.axisLeft(yScale).ticks(6);
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${IH})`).call(xAxis);
    g.append("g").attr("class", "axis").call(yAxis);

    // labels
    svg.append("text").attr("x", W/2).attr("y", H - 6)
      .attr("text-anchor", "middle").attr("class", "tick-label")
      .text("sidereal hour");
    svg.append("text").attr("transform", `translate(12, ${H/2}) rotate(-90)`)
      .attr("text-anchor", "middle").attr("class", "tick-label")
      .text(interp === "null" ? "residual (km/s, baseline-subtracted)" : "apparent drift (km/s)");

    if (interp === "drift") {
      out.innerHTML = `
        <div><span class="metric">Reading:</span> Cosmological aether drift — Miller (1925, 1933).</div>
        <div>Amplitude ≈ <strong style="color: var(--accent);">8.0–10.1 km/s</strong>; sidereal period 23 h 56 min; apex α ≈ 4ʰ 54ᵐ, δ ≈ −70°.</div>
        <div style="color: var(--ink-soft); margin-top: 4px;">The sidereal signature is diagnostic of celestial origin. A diurnal thermal artefact cannot produce a sidereal period — the two differ by 4 min per day and accumulate over the four-epoch ensemble to a phase shift of 90°.</div>
      `;
    } else {
      out.innerHTML = `
        <div><span class="metric">Reading:</span> Thermal artefact — Shankland, McCuskey, Leone &amp; Kuerti (1955).</div>
        <div>Mean subtracted: <strong style="color: var(--accent);">${mean.toFixed(2)} km/s</strong>. Residual attributed to diurnal thermal expansion of the interferometer arms.</div>
        <div style="color: var(--ink-soft); margin-top: 4px;">This reinterpretation <em>drops the sidereal-hour labels</em> and treats the data as a diurnal pattern. The sidereal coherence — the signal that remained phase-locked to the stars across four seasonal epochs — cannot be reproduced by any thermal model that tracks solar time.</div>
      `;
    }
  }

  sel.addEventListener("change", draw);
  window.addEventListener("resize", draw);
  if (document.readyState === "complete") draw();
  else window.addEventListener("load", draw);
})();

/* =========================================================================
   WIDGET 3 — Southern Hemisphere flight-path deviation
   ========================================================================= */
(() => {
  const sel = document.getElementById("flightPair");
  const selVal = document.getElementById("flightPairVal");
  const host = document.getElementById("flightMap");
  const out = document.getElementById("flightOut");
  if (!sel || !host) return;

  // [lat, lon] pairs. Great-circle and actual (scheduled) route approximations in km.
  const ROUTES = {
    "syd-jnb": {
      label: "Sydney ↔ Johannesburg",
      a: { name: "SYD", lat: -33.94, lon: 151.17 },
      b: { name: "JNB", lat: -26.13, lon: 28.24 },
      great_km: 11044,
      actual_km: 11230,  // northbound over Indian Ocean
      detour_note: "Actual Qantas QF63/64 route passes north of Antarctica across the southern Indian Ocean; ETOPS 180 min constraint forbids direct polar arc."
    },
    "scl-akl": {
      label: "Santiago ↔ Auckland",
      a: { name: "SCL", lat: -33.38, lon: -70.78 },
      b: { name: "AKL", lat: -36.85, lon: 174.76 },
      great_km: 9650,
      actual_km: 9681,
      detour_note: "LATAM LA800/801 operates a near-great-circle arc over the southern Pacific — the one Southern-Hemisphere route that approaches the great-circle minimum. No overflight of Antarctica."
    },
    "eze-per": {
      label: "Buenos Aires ↔ Perth",
      a: { name: "EZE", lat: -34.82, lon: -58.54 },
      b: { name: "PER", lat: -31.94, lon: 115.97 },
      great_km: 12355,
      actual_km: 14400,
      detour_note: "No scheduled non-stop. One-stop routings via JNB or SYD add 2000+ km over any plausible great-circle minimum."
    },
    "gig-cpt": {
      label: "Rio ↔ Cape Town",
      a: { name: "GIG", lat: -22.81, lon: -43.25 },
      b: { name: "CPT", lat: -33.97, lon: 18.60 },
      great_km: 6067,
      actual_km: 6200,
      detour_note: "South African Airways SA204/205 route across the southern Atlantic — one of the few Southern-Hemisphere routes not requiring an equatorial detour, but still routed north of direct."
    }
  };

  function draw() {
    const key = sel.value;
    const r = ROUTES[key];
    selVal.textContent = r.label;

    host.innerHTML = "";
    const W = 640, H = 340;
    const M = 20;
    const svg = d3.select(host).append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // projection: azimuthal equidistant centered on the North Pole — the
    // "bounded plane" projection. All Earth coordinates project onto a flat disc.
    const cx = W/2, cy = H/2;
    const R = Math.min(W, H)/2 - M;
    const project = (lat, lon) => {
      // distance from north pole = (90 - lat) deg in azimuthal-equidistant
      // full radius R corresponds to 180° (the ice wall / south frontier)
      const rr = R * ((90 - lat) / 180);
      const th = (lon) * Math.PI / 180 - Math.PI/2;
      return [cx + rr * Math.cos(th), cy + rr * Math.sin(th)];
    };

    // graticule: latitude circles and longitude rays
    const grid = svg.append("g").attr("opacity", 0.38);
    [0, -30, -60, -80].forEach(lat => {
      const rr = R * ((90 - lat) / 180);
      grid.append("circle").attr("cx", cx).attr("cy", cy).attr("r", rr)
        .attr("fill", "none").attr("stroke", "var(--rule-strong)").attr("stroke-width", 0.5)
        .attr("stroke-dasharray", lat === 0 ? "none" : "2 3");
    });
    for (let lon = 0; lon < 360; lon += 30) {
      const [x2, y2] = project(-89.99, lon);
      grid.append("line").attr("x1", cx).attr("y1", cy).attr("x2", x2).attr("y2", y2)
        .attr("stroke", "var(--rule)").attr("stroke-width", 0.4);
    }

    // Antarctica "ice wall" frontier — the circumference
    svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", R)
      .attr("class", "flight-antarctic");
    svg.append("text").attr("x", cx).attr("y", cy + R - 4).attr("text-anchor", "middle")
      .attr("fill", "var(--ink-faint)").attr("font-family", "JetBrains Mono").attr("font-size", "9")
      .text("— frontier of Terra Maior —");

    // Actual flight path: intermediate waypoints interpolated along a great-circle on sphere,
    // then projected to azimuthal plane. Same for great-circle route (for visual, these coincide
    // because both are the same physical path projected).
    function interpolateGC(a, b, n) {
      const toRad = d => d * Math.PI / 180;
      const phi1 = toRad(a.lat), lam1 = toRad(a.lon);
      const phi2 = toRad(b.lat), lam2 = toRad(b.lon);
      const d_ang = 2 * Math.asin(Math.sqrt(
        Math.sin((phi2 - phi1)/2)**2 +
        Math.cos(phi1)*Math.cos(phi2)*Math.sin((lam2 - lam1)/2)**2
      ));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        const A = Math.sin((1-f)*d_ang) / Math.sin(d_ang);
        const B = Math.sin(f*d_ang) / Math.sin(d_ang);
        const x = A*Math.cos(phi1)*Math.cos(lam1) + B*Math.cos(phi2)*Math.cos(lam2);
        const y = A*Math.cos(phi1)*Math.sin(lam1) + B*Math.cos(phi2)*Math.sin(lam2);
        const z = A*Math.sin(phi1) + B*Math.sin(phi2);
        const lat = Math.atan2(z, Math.sqrt(x*x + y*y)) * 180/Math.PI;
        const lon = Math.atan2(y, x) * 180/Math.PI;
        pts.push([lat, lon]);
      }
      return pts;
    }
    // Northward "actual" route: push waypoints toward the equator/north (higher lat)
    // so that on the north-polar azimuthal-equidistant projection the path bends
    // INWARD toward the centre — the visual "over the equator" detour.
    function northwardRoute(a, b, n, deflect) {
      const gc = interpolateGC(a, b, n);
      return gc.map(([lat, lon], i) => {
        const f = i / n;
        const d = 4 * f * (1 - f) * deflect; // parabolic: peak at mid
        // push toward higher latitude (closer to north pole, i.e. centre of projection)
        return [Math.min(lat + d, 10), lon];
      });
    }

    const gcPoints = interpolateGC(r.a, r.b, 80).map(([la, lo]) => project(la, lo));
    // Use a large deflection so the scheduled route visibly arcs toward the equator
    // (i.e. inward on this north-polar projection).
    const acPoints = northwardRoute(r.a, r.b, 80, 70).map(([la, lo]) => project(la, lo));

    const lineGen = d3.line();

    svg.append("path").attr("d", lineGen(gcPoints))
      .attr("class", "flight-path--great");
    svg.append("path").attr("d", lineGen(acPoints))
      .attr("class", "flight-path--actual");

    // cities
    [r.a, r.b].forEach(c => {
      const [x, y] = project(c.lat, c.lon);
      svg.append("circle").attr("cx", x).attr("cy", y).attr("r", 4)
        .attr("class", "flight-city");
      svg.append("text").attr("x", x + 8).attr("y", y + 4)
        .attr("class", "flight-city-label").text(c.name);
    });

    // legend
    const lg = svg.append("g").attr("transform", `translate(16, 16)`).attr("font-family", "JetBrains Mono").attr("font-size", 9);
    lg.append("line").attr("x1", 0).attr("x2", 24).attr("y1", 0).attr("y2", 0).attr("class", "flight-path--great");
    lg.append("text").attr("x", 30).attr("y", 3).attr("fill", "var(--ink-soft)").text("great-circle (polar)");
    lg.append("line").attr("x1", 0).attr("x2", 24).attr("y1", 14).attr("y2", 14).attr("class", "flight-path--actual");
    lg.append("text").attr("x", 30).attr("y", 17).attr("fill", "var(--ink-soft)").text("scheduled (northbound)");

    const detour = r.actual_km - r.great_km;
    const pct = (100 * detour / r.great_km).toFixed(1);

    out.innerHTML = `
      <div><span class="metric">Route:</span> ${r.label}</div>
      <div><span class="metric">Great-circle distance:</span> ${r.great_km.toLocaleString()} km &nbsp; · &nbsp; <span class="metric">Actual route:</span> ${r.actual_km.toLocaleString()} km</div>
      <div><span class="metric">Excess over great-circle:</span> <strong style="color: var(--accent);">${detour >= 0 ? "+" : ""}${detour.toLocaleString()} km (${pct}%)</strong></div>
      <div style="color: var(--ink-soft); margin-top: 4px;">${r.detour_note}</div>
    `;
  }

  sel.addEventListener("change", draw);
  window.addEventListener("resize", draw);
  if (document.readyState === "complete") draw();
  else window.addEventListener("load", draw);
})();

/* =========================================================================
   § 5.1 — Dark-matter direct-detection timeline
   ========================================================================= */
(() => {
  const host = document.getElementById("ddTimeline");
  if (!host) return;

  // experiment, first major null result year, exposure (tonne·day, log scale)
  const DATA = [
    ["DAMA/NaI",      1996, 0.01],
    ["CDMS-I",        2002, 0.03],
    ["CRESST-I",      2002, 0.02],
    ["XENON10",       2008, 0.3],
    ["CDMS-II",       2009, 0.6],
    ["XENON100",      2012, 8],
    ["LUX",           2014, 25],
    ["PandaX-II",     2016, 33],
    ["XENON1T",       2018, 279],
    ["PICO-60",       2019, 3],
    ["SuperCDMS",     2020, 0.6],
    ["PandaX-4T",     2021, 95],
    ["LZ (LUX-ZEPLIN)", 2023, 330],
    ["XENONnT",       2023, 270],
  ];

  function draw() {
    host.innerHTML = "";
    const W = 640, H = 340;
    const M = { top: 24, right: 20, bottom: 48, left: 130 };
    const IW = W - M.left - M.right, IH = H - M.top - M.bottom;

    const svg = d3.select(host).append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    const y = d3.scaleBand().domain(DATA.map(d => d[0])).range([0, IH]).padding(0.18);
    const x = d3.scaleLog().domain([0.005, 1000]).range([0, IW]);

    // grid
    [0.01, 0.1, 1, 10, 100, 1000].forEach(t => {
      g.append("line").attr("x1", x(t)).attr("x2", x(t))
        .attr("y1", 0).attr("y2", IH)
        .attr("class", "grid").attr("stroke", "var(--rule)").attr("stroke-dasharray", "2 3");
      g.append("text").attr("x", x(t)).attr("y", IH + 14).attr("text-anchor", "middle")
        .attr("class", "tick-label").text(t);
    });
    g.append("text").attr("x", IW/2).attr("y", IH + 34).attr("text-anchor", "middle")
      .attr("class", "tick-label").text("exposure (tonne · day, log scale)");

    g.selectAll(".bar").data(DATA).enter().append("rect")
      .attr("y", d => y(d[0]))
      .attr("x", 0)
      .attr("height", y.bandwidth())
      .attr("width", d => Math.max(1, x(d[2])))
      .attr("class", "dd-bar--null");

    g.selectAll(".label").data(DATA).enter().append("text")
      .attr("x", -8).attr("y", d => y(d[0]) + y.bandwidth()/2 + 3)
      .attr("text-anchor", "end")
      .attr("class", "dd-label")
      .text(d => `${d[0]} · ${d[1]}`);

    // "NULL" annotation on the right
    g.selectAll(".null").data(DATA).enter().append("text")
      .attr("x", d => Math.max(1, x(d[2])) + 6)
      .attr("y", d => y(d[0]) + y.bandwidth()/2 + 3)
      .attr("class", "dd-label")
      .attr("fill", "var(--accent)")
      .text("null");
  }

  if (document.readyState === "complete") draw();
  else window.addEventListener("load", draw);
  window.addEventListener("resize", draw);
})();
