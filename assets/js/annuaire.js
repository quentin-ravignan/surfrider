/* Espace membres › Membres (admin et membres du CA)
   Ordre : administrateur · membres du CA · Saytoukat Géej · adhérent·e·s.
   Les rôles viennent de assets/js/config.js (admins, ca, saytoukat) ; les listes
   Saytoukat et adhérent·e·s sont lues dans les Google Sheets avec le compte
   Google de la personne connectée : rien n'est stocké dans le site.
   Les colonnes sensibles (CNI, Wave, date de naissance…) ne sont jamais affichées. */
(function () {
  const C = window.SF_CONFIG;
  const t = (s, v) => (window.T ? window.T(s, v) : s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const HIDDEN = /cni|carte d'identit|wave|passeport|password|mot de passe|naissance/i;
  const tidy = (s) => String(s || "").trim().replace(/\s+/g, " ");
  const siteName = (s) => { s = tidy(s); return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/ngor/, "Ngor") : "—"; };
  const PEOPLE = C.people || {};

  const ROLES = {
    admin: { label: "Administrateur", tag: "tag-admin", rights: "Voit et peut tout faire : prélèvements, membres, communication, finances, projets." },
    ca: { label: "Membre du CA", tag: "tag-ca", rights: "Voit les parties Finances, Membres (adhérent·e·s) et Projets." },
    saytoukat: { label: "Saytoukat Géej", tag: "tag-say", rights: "Peut déposer un prélèvement de qualité de l'eau." },
    adherent: { label: "Adhérent·e", tag: "tag-adh", rights: "Accès au site public uniquement." },
  };

  /* Regroupe les adresses d'une même personne (ex. adresse pro + Gmail) */
  function persons(emails) {
    const by = new Map();
    (emails || []).filter((e) => e && e !== "*").forEach((e) => {
      const [name, fn] = PEOPLE[e.toLowerCase()] || ["", ""];
      const key = name || e;
      if (!by.has(key)) by.set(key, { name, fn, emails: [] });
      by.get(key).emails.push(e);
    });
    return [...by.values()];
  }
  const initials = (n) => (n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const personCard = (p, role) => `
    <article class="person-card">
      <span class="person-ini" aria-hidden="true">${esc(initials(p.name || p.emails[0]))}</span>
      <div><strong>${esc(p.name || p.emails[0])}</strong>${p.fn ? `<small>${esc(t(p.fn))}</small>` : ""}
        <span class="person-mails">${p.emails.map((e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`).join(" · ")}</span></div>
      <span class="tag ${ROLES[role].tag}">${ROLES[role].label}</span>
    </article>`;

  function section(role, title, count, body) {
    return `<section class="role-sec role-${role}">
      <div class="role-head"><h3>${title}${count != null ? ` <span class="count">${count}</span>` : ""}</h3><p>${ROLES[role].rights}</p></div>
      ${body}
    </section>`;
  }

  async function sheetPanel(el, sheetId, tab, kind) {
    if (!sheetId) {
      el.innerHTML = `<p class="muted">${t("Aucune liste reliée.")}</p>`;
      return;
    }
    if (!(await SF_DATA.token(false))) {
      el.innerHTML = `<div class="card" style="text-align:center"><p>${t("Autorise la lecture de la feuille pour afficher la liste.")}</p><button class="btn btn-blue" type="button">${t("Charger les données")}</button></div>`;
      await new Promise((r) => el.querySelector("button").addEventListener("click", r, { once: true }));
    }
    el.innerHTML = `<p>${t("Chargement…")}</p>`;
    let rows;
    try { rows = await SF_DATA.read(sheetId, tab); }
    catch (e) { el.innerHTML = `<p class="notice">${t("Impossible de lire la feuille : {err}", { err: esc(e.message || e) })}</p>`; return; }
    if (!rows || rows.length < 2) { el.innerHTML = `<p class="notice">${t("L'onglet est vide.")}</p>`; return; }

    const head = rows[0].map(tidy);
    // adhésions (formulaire) : seulement l'essentiel ; Saytoukat : toutes les colonnes non sensibles
    const ADH = /horodateur|e-?mail|pr[ée]nom|^nom|t[ée]l[ée]phone|p[ôo]le/i;
    const keep = head.map((h, i) => (h && !HIDDEN.test(h) && (kind !== "adherent" || ADH.test(h)) ? i : -1)).filter((i) => i >= 0);
    const label = (h) => (kind === "adherent" && /horodateur/i.test(h) ? "Adhésion le" : kind === "adherent" && /p[ôo]le/i.test(h) ? "Pôle souhaité" : h.replace(/\s*\(.*$/, "").replace(/\s*:\s*$/, ""));
    let data = rows.slice(1).filter((r) => r.some((v) => tidy(v)));
    const cTs = head.findIndex((h) => /horodateur/i.test(h));
    if (cTs >= 0) { // adhésions les plus récentes d'abord
      const d = (s) => { const m = tidy(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3], m[2] - 1, +m[1]).getTime() : 0; };
      data = data.sort((a, b) => d(b[cTs]) - d(a[cTs]));
    }
    const cSite = head.findIndex((h) => /^site/i.test(h));
    const isPhone = (h) => /whatsapp|t[ée]l[ée]phone|num[ée]ro sn|portable/i.test(h);
    const isMail = (h) => /e-?mail/i.test(h);
    const bySite = {};
    if (cSite >= 0) data.forEach((r) => { const s = siteName(r[cSite]); bySite[s] = (bySite[s] || 0) + 1; });

    el.innerHTML = `
      <div class="controls">
        <input type="search" placeholder="${t("Rechercher un nom, un site…")}" aria-label="${t("Rechercher")}">
        ${cSite >= 0 ? `<select aria-label="Site"><option value="">${t("Tous les sites")}</option>${Object.keys(bySite).sort().map((s) => `<option>${esc(s)}</option>`).join("")}</select>` : ""}
        <span class="tag" data-count></span>
        <a class="btn btn-outline btn-sm" href="https://docs.google.com/spreadsheets/d/${sheetId}/edit" target="_blank" rel="noopener">${t("Ouvrir la feuille ↗")}</a>
      </div>
      <div class="table-scroll"><table class="data-table">
        <thead><tr>${keep.map((i) => `<th>${esc(label(head[i]))}</th>`).join("")}</tr></thead>
        <tbody></tbody>
      </table></div>`;
    el.closest(".role-sec").querySelector(".count").textContent = data.length;

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
        if (v && isMail(head[i])) return `<td><a href="mailto:${esc(v)}">${esc(v)}</a></td>`;
        if (kind === "adherent" && i === cTs) return `<td>${esc(v.slice(0, 10))}</td>`;
        return `<td>${esc(i === cSite ? siteName(v) : v)}</td>`;
      }).join("")}</tr>`).join("") || `<tr><td colspan="${keep.length}">${t("Aucun résultat.")}</td></tr>`;
    }
    q.addEventListener("input", draw); if (sel) sel.addEventListener("change", draw);
    draw();
  }

  /* Monte la partie Membres dans un élément */
  function mount(el) {
    const admins = persons(C.admins), ca = persons(C.ca);
    const sayAccounts = (C.saytoukat || []).filter((e) => e !== "*");
    el.innerHTML = `
      ${section("admin", "Administrateur", null, `<div class="people">${admins.map((p) => personCard(p, "admin")).join("")}</div>`)}
      ${section("ca", "Membres du CA", ca.length, `<div class="people">${ca.map((p) => personCard(p, "ca")).join("")}</div>`)}
      ${section("saytoukat", "Saytoukat Géej", "…", `
        <p class="muted small-print">${sayAccounts.length
          ? t("Comptes Google autorisés à déposer : {list}", { list: sayAccounts.map(esc).join(", ") })
          : t("Aucun compte Google Saytoukat n'est encore autorisé : ajouter leurs adresses dans <code>saytoukat</code> (assets/js/config.js).")}</p>
        <div data-list="saytoukat"></div>`)}
      ${section("adherent", "Adhérent·e·s", "…", `<div data-list="adherent"></div>`)}
      <p class="notice notice-blue" style="margin-top:20px">${t("Pour changer le rôle de quelqu'un : listes <code>admins</code>, <code>ca</code> et <code>saytoukat</code> dans <code>assets/js/config.js</code> (tout autre compte connecté est adhérent·e). Penser aussi à partager les Google Sheets concernées avec la personne.")}</p>`;
    sheetPanel(el.querySelector('[data-list="saytoukat"]'), C.saytoukatSheetId, C.saytoukatTab, "saytoukat");
    sheetPanel(el.querySelector('[data-list="adherent"]'), C.membersSheetId, C.membersTab, "adherent");
  }
  window.SF_ANNUAIRE = { mount };
})();
