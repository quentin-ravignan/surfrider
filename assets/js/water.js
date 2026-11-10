/* Page Qualité de l'eau : données en direct depuis la Google Sheet (onglet Synthèse),
   avec repli sur l'instantané data/water-quality.json. */
(function () {
  const C = window.SF_CONFIG;
  const SITES = {
    "Baie des carpes": { lat: 14.747811, lng: -17.519455, label: "Baie des Carpes" },
    "Ngor": { lat: 14.750175, lng: -17.510701, label: "Baie de Ngor" },
    "Ouakam": { lat: 14.715141, lng: -17.490002, label: "Ouakam" },
    "Secret": { lat: 14.740996, lng: -17.520825, label: "Secret – Corniche des Almadies" },
    "Virage": { lat: 14.754456, lng: -17.496178, label: "Virage" },
    "Yoff": { lat: 14.761662, lng: -17.467517, label: "Yoff BCEAO" }
  };
  const COLORS = { good: "#1E9E55", mid: "#F2A900", bad: "#E31B23", na: "#9AA7B4" };
  const t = (s, v) => (window.T ? window.T(s, v) : s.replace(/\{(\w+)\}/g, (m, k) => v[k]));
  const LABELS = { get good() { return t("Bonne"); }, get mid() { return t("Moyenne"); }, get bad() { return t("Mauvaise"); }, get na() { return t("Pas de donnée"); } };

  // Classification (onglet « Critères » de la feuille)
  function classify(s) {
    if (!s || (s.ecoli == null && s.entero == null)) return "na";
    const e = s.ecoli ?? 0, n = s.entero ?? 0;
    if (e > 1000 || n > 370) return "bad";
    if (e > 100 || n > 100) return "mid";
    return "good";
  }
  const fmtDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString((window.SF_I18N && SF_I18N.locale) || "fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const fmtNum = (v) => (v == null ? "–" : Math.round(v).toLocaleString("fr-FR"));

  /* ---- Lecture des données -------------------------------------------- */
  function parseCSV(text) {
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (ch !== "\r") cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  function toISO(s) {
    const m = (s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return null;
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const num = (s) => { const v = parseFloat(String(s || "").replace(/[\s ]/g, "").replace(",", ".")); return isNaN(v) ? null : v; };

  function fromSheet(rows) {
    const dates = rows[1] || [];
    const out = [];
    rows.forEach((r) => {
      if (!r || !SITES[r[0]]) return;
      const samples = [];
      for (let i = 3; i < r.length - 1; i += 2) {
        const date = toISO(dates[i]); const e = num(r[i]), n = num(r[i + 1]);
        if (date && (e != null || n != null) && !(e === 0 && n === 0)) samples.push({ date, ecoli: e, entero: n });
      }
      out.push({ site: r[0], ...SITES[r[0]], samples });
    });
    return out;
  }

  async function load() {
    const status = document.getElementById("data-status");
    try {
      const url = `https://docs.google.com/spreadsheets/d/${C.waterSheetId}/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(C.waterSheetTab)}&range=${C.waterSheetRange}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      const sites = fromSheet(parseCSV(await res.text()));
      if (!sites.length || !sites.some((s) => s.samples.length)) throw new Error("vide");
      status.textContent = t("Données en direct"); status.className = "tag tag-live";
      return sites;
    } catch (e) {
      const res = await fetch("data/water-quality.json");
      const json = await res.json();
      status.textContent = t("Données du {date}", { date: fmtDate(json.generated) }); status.className = "tag tag-done";
      return json.sites.map((s) => ({ ...s, ...SITES[s.site] }));
    }
  }

  /* ---- Rendu ----------------------------------------------------------- */
  let map, markers = {}, data = [], selected = null;

  function siteSummary(s, mode) {
    const last = s.samples[s.samples.length - 1];
    const counts = { good: 0, mid: 0, bad: 0 };
    s.samples.forEach((x) => { const c = classify(x); if (counts[c] != null) counts[c]++; });
    const total = s.samples.length || 1;
    let cls;
    if (mode === "last") cls = classify(last);
    else {
      const badShare = counts.bad / total, goodShare = counts.good / total;
      cls = !s.samples.length ? "na" : badShare >= 0.3 ? "bad" : goodShare >= 0.6 ? "good" : "mid";
    }
    return { last, counts, total: s.samples.length, cls };
  }

  function popupHTML(s, sum, mode) {
    const pct = (k) => Math.round((sum.counts[k] / (sum.total || 1)) * 100);
    return `<strong style="font-size:1.1em">${s.label}</strong><br>
      <span class="badge q-${sum.cls}" style="display:inline-block;margin:6px 0">${LABELS[sum.cls]}</span><br>
      ${sum.last ? `${t("Dernier prélèvement :")} <strong>${fmtDate(sum.last.date)}</strong><br>
      E. coli : <strong>${fmtNum(sum.last.ecoli)}</strong> · ${t("Entérocoques")} : <strong>${fmtNum(sum.last.entero)}</strong> UFC/100 ml<br>` : ""}
      <small>${t("{n} prélèvements : {g} % bons, {m} % moyens, {b} % mauvais", { n: sum.total, g: pct("good"), m: pct("mid"), b: pct("bad") })}</small>`;
  }

  function render() {
    const mode = document.getElementById("period").value;
    const list = document.getElementById("site-list");
    list.innerHTML = "";
    data.forEach((s) => {
      const sum = siteSummary(s, mode);
      const color = COLORS[sum.cls];
      if (markers[s.site]) map.removeLayer(markers[s.site]);
      const m = L.circleMarker([s.lat, s.lng], { radius: 13, color: "#fff", weight: 3, fillColor: color, fillOpacity: 1 })
        .addTo(map).bindPopup(popupHTML(s, sum, mode));
      m.on("click", () => select(s.site));
      markers[s.site] = m;

      const btn = document.createElement("button");
      btn.className = "site-row"; btn.type = "button";
      btn.setAttribute("aria-pressed", s.site === selected);
      btn.innerHTML = `<span class="dot" style="background:${color}"></span>
        <span><strong>${s.label}</strong><small>${sum.last ? t("Dernier : {date}", { date: fmtDate(sum.last.date) }) : t("Aucun prélèvement")}</small></span>
        <span class="badge q-${sum.cls}">${LABELS[sum.cls]}</span>`;
      btn.addEventListener("click", () => { select(s.site); markers[s.site].openPopup(); map.flyTo([s.lat, s.lng], 14, { duration: .6 }); });
      list.appendChild(btn);
    });
  }

  function select(site) {
    selected = site;
    document.querySelectorAll(".site-row").forEach((b, i) => b.setAttribute("aria-pressed", data[i].site === site));
    drawChart(data.find((s) => s.site === site));
  }

  function drawChart(s) {
    const el = document.getElementById("chart");
    document.getElementById("chart-title").textContent = t("Historique — {site}", { site: s.label });
    const pts = s.samples.filter((x) => x.ecoli != null || x.entero != null);
    if (!pts.length) { el.innerHTML = `<p>${t("Pas encore de données pour ce site.")}</p>`; return; }
    const W = 900, H = 340, P = { l: 56, r: 16, t: 16, b: 40 };
    const t0 = +new Date(pts[0].date), t1 = +new Date(pts[pts.length - 1].date);
    const x = (d) => P.l + ((+new Date(d) - t0) / Math.max(1, t1 - t0)) * (W - P.l - P.r);
    const lmin = 0, lmax = 5.5; // 1 à ~300 000
    const y = (v) => { const lv = Math.log10(Math.max(1, v)); return P.t + (1 - (lv - lmin) / (lmax - lmin)) * (H - P.t - P.b); };
    const line = (key) => pts.filter((p) => p[key] != null).map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p[key]).toFixed(1)}`).join("");
    const ticks = [1, 10, 100, 1000, 10000, 100000];
    const years = []; for (let yr = new Date(t0).getFullYear(); yr <= new Date(t1).getFullYear(); yr++) years.push(yr);
    const dots = (key, color) => pts.filter((p) => p[key] != null).map((p) =>
      `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p[key]).toFixed(1)}" r="3.6" fill="${COLORS[classify(p)]}" stroke="${color}" stroke-width="1.5"><title>${fmtDate(p.date)} — ${key === "ecoli" ? "E. coli" : t("Entérocoques")} : ${fmtNum(p[key])}</title></circle>`).join("");
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t("Graphique des concentrations bactériennes à {site}", { site: s.label })}">
      ${ticks.map((t) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}" stroke="#E3E8EE"/><text x="${P.l - 8}" y="${y(t) + 4}" text-anchor="end" font-size="12" fill="#5A6B7B">${t.toLocaleString("fr-FR")}</text>`).join("")}
      ${years.map((yr) => { const d = `${yr}-01-01`; if (+new Date(d) < t0) return ""; return `<line x1="${x(d)}" x2="${x(d)}" y1="${P.t}" y2="${H - P.b}" stroke="#CBD5E0" stroke-dasharray="2 4"/><text x="${x(d)}" y="${H - 14}" text-anchor="middle" font-size="13" font-weight="700" fill="#14212E">${yr}</text>`; }).join("")}
      <line x1="${P.l}" x2="${W - P.r}" y1="${y(100)}" y2="${y(100)}" stroke="${COLORS.good}" stroke-width="2" stroke-dasharray="6 5"/>
      <line x1="${P.l}" x2="${W - P.r}" y1="${y(1000)}" y2="${y(1000)}" stroke="${COLORS.bad}" stroke-width="2" stroke-dasharray="6 5"/>
      <path d="${line("ecoli")}" fill="none" stroke="#0072BC" stroke-width="2.2"/>
      <path d="${line("entero")}" fill="none" stroke="#0B1F33" stroke-width="1.6" stroke-dasharray="4 3"/>
      ${dots("ecoli", "#0072BC")}${dots("entero", "#0B1F33")}
    </svg>
    <div class="legend" style="margin-top:8px"><span><i style="background:#0072BC"></i>E. coli</span><span><i style="background:#0B1F33"></i>Entérocoques (pointillés)</span><span><i style="background:${COLORS.good}"></i>Seuil bonne qualité (100)</span><span><i style="background:${COLORS.bad}"></i>Seuil E. coli mauvaise qualité (1 000)</span></div>`;

    const sum = siteSummary(s, "all");
    const pct = (k) => Math.round((sum.counts[k] / (sum.total || 1)) * 100) + " %";
    const maxE = Math.max(...pts.map((p) => p.ecoli || 0));
    document.getElementById("site-stats").innerHTML = `
      <div class="kpi"><span>Prélèvements analysés</span><strong>${sum.total}</strong></div>
      <div class="kpi"><span>Bonne qualité</span><strong style="color:${COLORS.good}">${pct("good")}</strong></div>
      <div class="kpi"><span>Mauvaise qualité</span><strong style="color:${COLORS.bad}">${pct("bad")}</strong></div>
      <div class="kpi"><span>Pic d'E. coli</span><strong>${fmtNum(maxE)}</strong></div>`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    map = L.map("map", { scrollWheelZoom: false }).setView([14.742, -17.497], 12);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
    data = await load();
    selected = data[0]?.site;
    render();
    if (selected) select("Virage" in SITES && data.some((s) => s.site === "Virage") ? "Virage" : selected);
    document.getElementById("period").addEventListener("change", render);
  });
})();
