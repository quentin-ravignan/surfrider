/* Page « Membres » (admins uniquement) : administrateurs, Saytoukat Géej, adhérent·e·s.
   Les annuaires sont lus dans les Google Sheets avec le compte Google de l'admin
   connecté : rien n'est stocké dans le site. Les colonnes sensibles (CNI, Wave)
   ne sont jamais affichées. */
(function () {
  const C = window.SF_CONFIG;
  const t = (s, v) => (window.T ? window.T(s, v) : s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const HIDDEN = /cni|carte d'identit|wave|passeport|password|mot de passe/i;
  const NAMES = {
    "babacar@surfrider.sn": ["Babacar Thiaw", "Président"],
    "claire@surfrider.sn": ["Claire Stragier", "Directrice générale"],
    "paulele@surfrider.sn": ["Paulèle Cissé", "Trésorière"],
    "adama@surfrider.sn": ["Adama Samba", "Secrétaire"],
    "quentin@surfrider.sn": ["Quentin de Ravignan", "Responsable partenariats"],
    "quentin.ravignan@gmail.com": ["Quentin de Ravignan", "Responsable partenariats"],
    "marlene@surfrider.sn": ["Marlène Menoux", "Responsable projets"],
    "contact@surfrider.sn": ["Surfrider Sénégal", "Compte de l'association"]
  };
  const tidy = (s) => String(s || "").trim().replace(/\s+/g, " ");
  const siteName = (s) => { s = tidy(s); return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/ngor/, "Ngor") : "—"; };
  let token = null;

  async function getToken() {
    if (token) return token;
    token = await SF_AUTH.sheetsToken(SF_AUTH.getUser()?.email);
    return token;
  }

  function adminsPanel(el) {
    const rows = C.admins.map((e) => [e, ...(NAMES[e.toLowerCase()] || ["", ""])]);
    const say = (C.saytoukat || []);
    el.innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>${t("Administrateur·rice·s")}</span><strong>${C.admins.length}</strong></div>
        <div class="kpi"><span>${t("Comptes Saytoukat autorisés")}</span><strong>${say.includes("*") ? t("Tous") : say.length}</strong></div>
      </div>
      <div class="table-scroll"><table class="data-table">
        <thead><tr><th>${t("Nom")}</th><th>${t("Rôle")}</th><th>${t("Email")}</th><th>${t("Accès")}</th></tr></thead>
        <tbody>${rows.map(([e, n, r]) => `<tr><td>${esc(n || "—")}</td><td>${esc(r ? t(r) : "")}</td><td><a href="mailto:${esc(e)}">${esc(e)}</a></td><td><span class="tag tag-live">Admin</span></td></tr>`).join("")}
        ${say.filter((e) => e !== "*").map((e) => `<tr><td>—</td><td>Saytoukat Géej</td><td><a href="mailto:${esc(e)}">${esc(e)}</a></td><td><span class="tag">Saytoukat</span></td></tr>`).join("")}</tbody>
      </table></div>
      <p class="notice notice-blue" style="margin-top:16px">${t("Pour donner ou retirer un accès, modifier les listes <code>admins</code> et <code>saytoukat</code> dans <code>assets/js/config.js</code>. Penser aussi à partager l'application AppSheet correspondante avec la personne.")}</p>`;
  }

  async function sheetPanel(el, sheetId, tab, kind) {
    if (!sheetId) {
      el.innerHTML = `<div class="card"><h3>${t("Liste des adhérent·e·s")}</h3><p>${t("Aucune liste d'adhérent·e·s n'est encore reliée. Créer une Google Sheet avec un onglet « Membres » (colonnes : Nom, Email, Téléphone, Date d'adhésion, Cotisation…), puis renseigner son identifiant dans <code>membersSheetId</code> (assets/js/config.js).")}</p></div>`;
      return;
    }
    if (!C.googleClientId) { el.innerHTML = `<p class="notice">${t("La connexion Google doit être configurée pour lire les annuaires.")}</p>`; return; }
    el.innerHTML = `<div class="card" style="text-align:center"><p>${t("Autorise la lecture de la feuille pour afficher l'annuaire.")}</p><button class="btn btn-blue" type="button">${t("Charger les données")}</button></div>`;
    await new Promise((r) => el.querySelector("button").addEventListener("click", r, { once: true }));
    el.innerHTML = `<p>${t("Chargement…")}</p>`;
    let rows;
    try { rows = await SF_AUTH.readSheet(await getToken(), sheetId, `'${tab}'`); }
    catch (e) { token = null; el.innerHTML = `<p class="notice">${t("Impossible de lire la feuille : {err}", { err: esc(e.message || e.error || e) })}</p>`; return; }
    if (!rows || rows.length < 2) { el.innerHTML = `<p class="notice">${t("L'onglet est vide.")}</p>`; return; }

    const head = rows[0].map(tidy);
    const keep = head.map((h, i) => (h && !HIDDEN.test(h) ? i : -1)).filter((i) => i >= 0);
    const data = rows.slice(1).filter((r) => tidy(r[0]));
    const cSite = head.findIndex((h) => /^site/i.test(h));
    const isPhone = (h) => /whatsapp|t[ée]l[ée]phone|num[ée]ro sn|portable/i.test(h);
    const bySite = {};
    if (cSite >= 0) data.forEach((r) => { const s = siteName(r[cSite]); bySite[s] = (bySite[s] || 0) + 1; });

    el.innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>${kind === "saytoukat" ? "Saytoukat Géej" : t("Adhérent·e·s")}</span><strong>${data.length}</strong></div>
        ${Object.entries(bySite).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s, n]) => `<div class="kpi"><span>${esc(s)}</span><strong>${n}</strong></div>`).join("")}
      </div>
      <div class="controls">
        <input type="search" placeholder="${t("Rechercher un nom, un site…")}" aria-label="${t("Rechercher")}" style="font:inherit;padding:10px 14px;border-radius:12px;border:2px solid var(--line);min-width:min(320px,100%)">
        ${cSite >= 0 ? `<select aria-label="Site"><option value="">${t("Tous les sites")}</option>${Object.keys(bySite).sort().map((s) => `<option>${esc(s)}</option>`).join("")}</select>` : ""}
        <span class="tag" data-count></span>
      </div>
      <div class="table-scroll"><table class="data-table">
        <thead><tr>${keep.map((i) => `<th>${esc(head[i])}</th>`).join("")}</tr></thead>
        <tbody></tbody>
      </table></div>
      <p style="font-size:.9rem;color:var(--muted);margin-top:8px">${t("Données personnelles : usage interne à l'association uniquement. Les colonnes CNI et Wave sont masquées.")}</p>`;

    const tbody = el.querySelector("tbody"), q = el.querySelector("input"), sel = el.querySelector("select");
    function draw() {
      const term = q.value.toLowerCase().trim(), site = sel ? sel.value : "";
      const list = data.filter((r) => (!site || siteName(r[cSite]) === site) && (!term || r.join(" ").toLowerCase().includes(term)));
      el.querySelector("[data-count]").textContent = t("{n} résultat(s)", { n: list.length });
      tbody.innerHTML = list.map((r) => `<tr>${keep.map((i) => {
        const v = tidy(r[i]);
        if (v && isPhone(head[i])) {
          const digits = v.replace(/\D/g, "");
          const intl = digits.startsWith("00") ? digits.slice(2) : digits.length === 9 ? "221" + digits : digits;
          return `<td><a href="https://wa.me/${intl}" target="_blank" rel="noopener">${esc(v)}</a></td>`;
        }
        return `<td>${esc(i === cSite ? siteName(v) : v)}</td>`;
      }).join("")}</tr>`).join("");
    }
    q.addEventListener("input", draw); if (sel) sel.addEventListener("change", draw);
    draw();
  }

  document.addEventListener("DOMContentLoaded", () => {
    SF_AUTH.guard({
      need: "admin", root: "#app", title: t("Accès administrateurs"),
      render: (el) => {
        el.innerHTML = `
          <div class="tabs" role="tablist">
            <button role="tab" aria-selected="true" data-tab="admins">Admins</button>
            <button role="tab" aria-selected="false" data-tab="saytoukat">Saytoukat Géej</button>
            <button role="tab" aria-selected="false" data-tab="membres">Adhérent·e·s</button>
          </div>
          <div data-panel="admins"></div>
          <div data-panel="saytoukat" hidden></div>
          <div data-panel="membres" hidden></div>`;
        const loaded = {};
        const open = (k) => {
          el.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-selected", x.dataset.tab === k));
          el.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== k));
          if (loaded[k]) return; loaded[k] = true;
          const p = el.querySelector(`[data-panel="${k}"]`);
          if (k === "admins") adminsPanel(p);
          if (k === "saytoukat") sheetPanel(p, C.saytoukatSheetId, C.saytoukatTab, "saytoukat");
          if (k === "membres") sheetPanel(p, C.membersSheetId, C.membersTab, "membres");
        };
        el.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => open(b.dataset.tab)));
        open("admins");
      }
    });
  });
})();
