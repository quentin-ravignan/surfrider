/* Tableaux de bord admins : lecture des Google Sheets avec le compte connecté.
   Les colonnes sont détectées par leur nom (Montant, Statut, Projet, Date…),
   ce qui évite de figer la structure de la feuille dans le code. */
(function () {
  const C = window.SF_CONFIG;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = (v) => Math.round(v).toLocaleString("fr-FR") + " FCFA";
  const findCol = (headers, re) => headers.findIndex((h) => re.test(String(h).toLowerCase()));
  const toNum = (v) => typeof v === "number" ? v : parseFloat(String(v || "").replace(/[^\d,.-]/g, "").replace(/\s/g, "").replace(",", ".")) || 0;
  function parseDate(v) {
    const m = String(v || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }

  function setupNotice(what) {
    return `<div class="card"><h3>Tableau de bord ${what}</h3>
      <p>Pour afficher ici les chiffres en direct :</p>
      <ol>
        <li>Renseigner <code>googleClientId</code> (connexion Google) dans <code>assets/js/config.js</code>.</li>
        <li>Renseigner <code>financeSheetId</code> : l'identifiant de la Google Sheet qui alimente l'application AppSheet « SurfriderFoundation » (dans AppSheet : <em>Data &gt; Tables &gt; Décaissements &gt; Source</em>).</li>
      </ol>
      <p style="margin:0">Les données sont lues avec le compte Google de la personne connectée : elles ne sont jamais publiées sur le site.</p></div>`;
  }

  async function loadTab(el, tab) {
    if (!C.googleClientId || !C.financeSheetId) { el.innerHTML = setupNotice(tab === C.financeSheetTab ? "financier" : "projets"); return null; }
    el.innerHTML = `<div class="card" style="text-align:center"><p>Autorise la lecture de la feuille pour afficher le tableau de bord.</p><button class="btn btn-blue" type="button">Charger les données</button></div>`;
    await new Promise((r) => el.querySelector("button").addEventListener("click", r, { once: true }));
    el.innerHTML = `<p>Chargement…</p>`;
    try {
      const token = await SF_AUTH.sheetsToken(SF_AUTH.getUser()?.email);
      const rows = await SF_AUTH.readSheet(token, C.financeSheetId, `'${tab}'`);
      if (rows.length < 2) { el.innerHTML = `<p class="notice">L'onglet « ${esc(tab)} » est vide.</p>`; return null; }
      return { headers: rows[0], rows: rows.slice(1).filter((r) => r.some((c) => c !== "" && c != null)) };
    } catch (e) {
      el.innerHTML = `<p class="notice">${T("Impossible de lire la feuille : {err}", { err: esc(e.message || e.error || e) })}</p>`;
      return null;
    }
  }

  function bars(title, map, fmt) {
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const max = Math.max(1, ...entries.map((e) => e[1]));
    return `<div class="card"><h3>${title}</h3><div class="bars">${entries.map(([k, v]) => `
      <div class="bar-row"><span title="${esc(k)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(k || "—")}</span>
      <div class="track"><div class="fill" style="width:${(v / max) * 100}%"></div></div><strong>${fmt(v)}</strong></div>`).join("")}</div></div>`;
  }

  function table(headers, rows, limit) {
    return `<div class="table-scroll"><table class="data-table"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.slice(0, limit).map((r) => `<tr>${headers.map((_, i) => `<td>${esc(r[i])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  async function financeDashboard(el) {
    const d = await loadTab(el, C.financeSheetTab);
    if (!d) return;
    const H = d.headers;
    const cAmt = findCol(H, /montant|amount|somme/), cStat = findCol(H, /statut|status/), cProj = findCol(H, /projet|project/),
          cDate = findCol(H, /horodateur|date/), cCat = findCol(H, /cat[ée]gorie|nature|type|ligne/);
    const amt = (r) => (cAmt >= 0 ? toNum(r[cAmt]) : 0);
    const total = d.rows.reduce((s, r) => s + amt(r), 0);
    const isPending = (r) => cStat >= 0 && /attente|pending|soumis|à valider|en cours/i.test(r[cStat]);
    const isDone = (r) => cStat >= 0 && /valid|pay|approuv|done|effectu/i.test(r[cStat]);
    const group = (col, fn = amt) => d.rows.reduce((m, r) => { const k = col >= 0 ? String(r[col] || "—") : "—"; m[k] = (m[k] || 0) + fn(r); return m; }, {});
    const byMonth = {};
    if (cDate >= 0) d.rows.forEach((r) => { const dt = parseDate(r[cDate]); if (dt) { const k = dt.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }); byMonth[k] = (byMonth[k] || 0) + amt(r); } });
    const sorted = cDate >= 0 ? [...d.rows].sort((a, b) => (parseDate(b[cDate]) || 0) - (parseDate(a[cDate]) || 0)) : d.rows;

    el.innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>Total demandé</span><strong>${money(total)}</strong></div>
        <div class="kpi"><span>Demandes</span><strong>${d.rows.length}</strong></div>
        <div class="kpi"><span>En attente</span><strong style="color:var(--mid)">${d.rows.filter(isPending).length}</strong></div>
        <div class="kpi"><span>Validé / payé</span><strong style="color:var(--good)">${money(d.rows.filter(isDone).reduce((s, r) => s + amt(r), 0))}</strong></div>
      </div>
      <div class="grid grid-2" style="margin-bottom:20px">
        ${cProj >= 0 ? bars("Par projet", group(cProj), money) : ""}
        ${cStat >= 0 ? bars("Par statut", group(cStat, () => 1), (v) => v) : ""}
        ${cCat >= 0 ? bars("Par catégorie", group(cCat), money) : ""}
        ${Object.keys(byMonth).length ? bars("Par mois", byMonth, money) : ""}
      </div>
      <h3>Dernières demandes</h3>
      ${table(H, sorted, 30)}`;
  }

  async function projectsBoard(el) {
    const d = await loadTab(el, C.projectsSheetTab);
    if (!d) return;
    const H = d.headers;
    const cName = Math.max(0, findCol(H, /nom|projet|titre|name/)), cStat = findCol(H, /statut|status|état/),
          cBud = findCol(H, /budget|montant/), cResp = findCol(H, /respons|porteur|chef/), cDesc = findCol(H, /desc|objectif|résumé/);
    const kpiStatus = d.rows.reduce((m, r) => { const k = cStat >= 0 ? String(r[cStat] || "—") : "—"; m[k] = (m[k] || 0) + 1; return m; }, {});
    el.innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>Projets</span><strong>${d.rows.length}</strong></div>
        ${cBud >= 0 ? `<div class="kpi"><span>Budget total</span><strong>${money(d.rows.reduce((s, r) => s + toNum(r[cBud]), 0))}</strong></div>` : ""}
        ${Object.entries(kpiStatus).slice(0, 2).map(([k, v]) => `<div class="kpi"><span>${esc(k)}</span><strong>${v}</strong></div>`).join("")}
      </div>
      <div class="grid grid-3">${d.rows.map((r) => `
        <div class="card card-accent">
          ${cStat >= 0 ? `<span class="tag">${esc(r[cStat])}</span>` : ""}
          <h3 style="margin-top:8px">${esc(r[cName])}</h3>
          ${cDesc >= 0 ? `<p>${esc(String(r[cDesc] || "").slice(0, 220))}</p>` : ""}
          ${cResp >= 0 ? `<p><small>${T("Responsable : {name}", { name: esc(r[cResp]) })}</small></p>` : ""}
          ${cBud >= 0 ? `<strong>${money(toNum(r[cBud]))}</strong>` : ""}
        </div>`).join("")}</div>`;
  }

  window.SF_ADMIN = { financeDashboard, projectsBoard };
})();
