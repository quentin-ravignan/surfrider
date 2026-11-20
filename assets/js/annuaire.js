/* Espace membres › Membres (admin et membres du CA)
   Une seule table pour tout le monde : administrateurs, membres du CA,
   Saytoukat Géej et adhérent·e·s, avec le rôle bien visible.
   Les rôles viennent de assets/js/config.js (admins, ca, saytoukat) ; les listes
   Saytoukat et adhérent·e·s sont lues dans la Google Sheet avec le compte
   Google de la personne connectée : rien n'est stocké dans le site.
   Les colonnes sensibles (CNI, Wave, date de naissance…) ne sont jamais lues dans la table. */
(function () {
  const C = window.SF_CONFIG;
  const t = (s, v) => (window.T ? window.T(s, v) : String(s).replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? v[k] : m)));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tidy = (s) => String(s || "").trim().replace(/\s+/g, " ");
  const cap = (s) => tidy(s).toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  const siteName = (s) => { s = tidy(s); return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/ngor/, "Ngor") : ""; };
  const PEOPLE = C.people || {};

  const ROLES = {
    admin: { label: "Admin", long: "Administrateur", plural: "Administrateurs", tag: "tag-admin", rights: "Voit et peut tout faire : prélèvements, membres, communication, finances, projets." },
    ca: { label: "CA", long: "Membre du CA", plural: "Membres du CA", tag: "tag-ca", rights: "Voit les parties Finances, Membres et Projets." },
    saytoukat: { label: "Saytoukat Géej", long: "Saytoukat Géej", plural: "Saytoukat Géej", tag: "tag-say", rights: "Dépose les prélèvements de qualité de l'eau." },
    adherent: { label: "Adhérent·e", long: "Adhérent·e", plural: "Adhérent·e·s", tag: "tag-adh", rights: "Accès au site public." },
  };
  const ORDER = ["admin", "ca", "saytoukat", "adherent"];
  const badge = (r) => `<span class="role-badge ${ROLES[r].tag}" title="${esc(ROLES[r].rights)}">${ROLES[r].label}</span>`;

  /* Regroupe les adresses d'une même personne (ex. adresse pro + Gmail) */
  function persons(emails, role) {
    const by = new Map();
    (emails || []).filter((e) => e && e !== "*").forEach((e) => {
      const [name, fn] = PEOPLE[e.toLowerCase()] || ["", ""];
      const key = (name || e).toLowerCase();
      if (!by.has(key)) by.set(key, { name: name || e, fn, emails: [], phones: [], site: "", since: "", pole: "", roles: [role] });
      by.get(key).emails.push(e);
    });
    return [...by.values()];
  }
  const dmy = (s) => { const m = tidy(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); return m ? new Date(+(m[3].length === 2 ? "20" + m[3] : m[3]), m[2] - 1, +m[1]) : null; };
  const fmtDate = (d) => (d ? d.toLocaleDateString("fr-FR") : "");
  const col = (head, re) => head.findIndex((h) => re.test(h));
  const wa = (v) => {
    const digits = tidy(v).replace(/\D/g, "");
    if (!digits) return "";
    const intl = digits.startsWith("00") ? digits.slice(2) : digits.length === 9 ? "221" + digits : digits;
    return `<a href="https://wa.me/${intl}" target="_blank" rel="noopener">${esc(tidy(v))}</a>`;
  };

  async function readTab(id, tab) {
    if (!id || !tab) return null;
    try { return await SF_DATA.read(id, tab); } catch (e) { return { error: e.message || String(e) }; }
  }

  function fromSaytoukat(rows) {
    if (!rows || rows.error || rows.length < 2) return [];
    const head = rows[0].map(tidy);
    const cN = 0, cSite = col(head, /^site/i), cOrg = col(head, /organisation|fonction/i), cWa = col(head, /whatsapp/i), cSn = col(head, /num[ée]ro sn/i), cF = col(head, /formation/i);
    return rows.slice(1).filter((r) => tidy(r[cN])).map((r) => ({
      name: cap(r[cN]), fn: tidy(r[cOrg]), emails: [], phones: [tidy(r[cWa]) || tidy(r[cSn])].filter(Boolean),
      site: siteName(r[cSite]), sinceD: dmy(r[cF]), since: fmtDate(dmy(r[cF])), sinceLabel: "Formé·e le", pole: "", roles: ["saytoukat"],
    }));
  }
  function fromAdhesions(rows) {
    if (!rows || rows.error || rows.length < 2) return [];
    const head = rows[0].map(tidy);
    const cTs = col(head, /horodateur/i), cMail = col(head, /e-?mail/i), cP = col(head, /pr[ée]nom/i), cNom = col(head, /^nom/i), cTel = col(head, /t[ée]l[ée]phone/i), cPole = col(head, /p[ôo]le/i);
    return rows.slice(1).filter((r) => r.some((v) => tidy(v))).map((r) => ({
      name: cap([r[cP], r[cNom]].map(tidy).filter(Boolean).join(" ")) || tidy(r[cMail]), fn: "",
      emails: [tidy(r[cMail])].filter(Boolean), phones: [tidy(r[cTel])].filter(Boolean), site: "",
      sinceD: dmy(r[cTs]), since: fmtDate(dmy(r[cTs])), sinceLabel: "Adhésion le", pole: tidy(r[cPole]).replace(/\s*\(.*$/, ""), roles: ["adherent"],
    }));
  }

  /* Fusionne : une personne déjà Admin/CA qui a aussi adhéré n'apparaît qu'une fois, avec ses deux rôles */
  function merge(lists) {
    const out = [], byMail = new Map(), byName = new Map();
    for (const p of lists.flat()) {
      const key = p.emails.map((e) => e.toLowerCase()).find((e) => byMail.has(e));
      const same = (key && byMail.get(key)) || byName.get(p.name.toLowerCase());
      if (same) {
        p.roles.forEach((r) => { if (!same.roles.includes(r)) same.roles.push(r); });
        p.emails.forEach((e) => { if (!same.emails.some((x) => x.toLowerCase() === e.toLowerCase())) same.emails.push(e); });
        p.phones.forEach((x) => { if (!same.phones.includes(x)) same.phones.push(x); });
        for (const k of ["fn", "site", "since", "sinceD", "sinceLabel", "pole"]) if (!same[k] && p[k]) same[k] = p[k];
        continue;
      }
      out.push(p);
      p.emails.forEach((e) => byMail.set(e.toLowerCase(), p));
      byName.set(p.name.toLowerCase(), p);
    }
    out.forEach((p) => { p.roles.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)); p.rank = ORDER.indexOf(p.roles[0]); });
    return out.sort((a, b) => a.rank - b.rank || (a.rank >= 2 ? (b.sinceD || 0) - (a.sinceD || 0) : 0) || a.name.localeCompare(b.name, "fr"));
  }

  async function mount(el) {
    el.innerHTML = `<p>${t("Chargement…")}</p>`;
    if (!(await SF_DATA.token(false))) {
      el.innerHTML = `<div class="card" style="text-align:center"><p>${t("Autorise la lecture de la feuille pour afficher les membres.")}</p><button class="btn btn-blue" type="button">${t("Charger les données")}</button></div>`;
      await new Promise((r) => el.querySelector("button").addEventListener("click", r, { once: true }));
      el.innerHTML = `<p>${t("Chargement…")}</p>`;
    }
    const [say, adh] = await Promise.all([readTab(C.saytoukatSheetId, C.saytoukatTab), readTab(C.membersSheetId, C.membersTab)]);
    const all = merge([persons(C.admins, "admin"), persons(C.ca, "ca"), fromSaytoukat(say), fromAdhesions(adh)]);
    const errs = [say, adh].filter((x) => x && x.error).map((x) => x.error);
    const count = (r) => all.filter((p) => p.roles.includes(r)).length;
    const sites = [...new Set(all.map((p) => p.site).filter(Boolean))].sort();

    el.innerHTML = `
      ${errs.length ? `<p class="notice">${t("Une partie de la liste n'a pas pu être lue : {err}", { err: esc(errs.join(" · ")) })}</p>` : ""}
      <div class="role-legend">${ORDER.map((r) => `<button type="button" class="role-filter ${ROLES[r].tag}" data-r="${r}" aria-pressed="false" title="${esc(ROLES[r].rights)}"><strong>${count(r)}</strong><span>${count(r) > 1 ? ROLES[r].plural : ROLES[r].long}</span><small>${esc(ROLES[r].rights)}</small></button>`).join("")}</div>
      <div class="controls">
        <input type="search" placeholder="${t("Rechercher un nom, un site, un e-mail…")}" aria-label="${t("Rechercher")}">
        ${sites.length ? `<select aria-label="Site"><option value="">${t("Tous les sites")}</option>${sites.map((s) => `<option>${esc(s)}</option>`).join("")}</select>` : ""}
        <span class="tag" data-count></span>
      </div>
      <div class="table-scroll"><table class="data-table members-table">
        <thead><tr><th>Rôle</th><th>Nom</th><th>Fonction / organisation</th><th>Site</th><th>Contact</th><th>Depuis</th><th>Pôle souhaité</th></tr></thead>
        <tbody></tbody>
      </table></div>
      <p class="muted small-print" style="margin-top:14px">${t("Pour changer le rôle de quelqu'un : listes <code>admins</code>, <code>ca</code> et <code>saytoukat</code> dans <code>assets/js/config.js</code> (tout autre compte connecté est adhérent·e). Penser aussi à partager la Google Sheet avec la personne.")}</p>`;

    const tbody = el.querySelector("tbody"), q = el.querySelector("input"), sel = el.querySelector("select");
    let role = "";
    function draw() {
      const term = q.value.toLowerCase().trim(), site = sel ? sel.value : "";
      const list = all.filter((p) => (!role || p.roles.includes(role)) && (!site || p.site === site)
        && (!term || [p.name, p.fn, p.site, p.pole, ...p.emails, ...p.phones].join(" ").toLowerCase().includes(term)));
      el.querySelector("[data-count]").textContent = t("{n} membre(s)", { n: list.length });
      tbody.innerHTML = list.map((p) => `<tr class="row-${p.roles[0]}">
        <td class="roles-cell">${p.roles.map(badge).join("")}</td>
        <td><strong>${esc(p.name)}</strong></td>
        <td>${esc(p.fn ? t(p.fn) : "")}</td>
        <td>${esc(p.site)}</td>
        <td class="contact-cell">${[...p.emails.map((e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`), ...p.phones.map(wa)].join("<br>")}</td>
        <td>${p.since ? `<span title="${esc(p.sinceLabel || "")}">${esc(p.since)}</span>` : ""}</td>
        <td>${esc(p.pole)}</td></tr>`).join("") || `<tr><td colspan="7">${t("Aucun résultat.")}</td></tr>`;
    }
    el.querySelectorAll(".role-filter").forEach((b) => b.addEventListener("click", () => {
      role = role === b.dataset.r ? "" : b.dataset.r;
      el.querySelectorAll(".role-filter").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.r === role)));
      draw();
    }));
    q.addEventListener("input", draw); if (sel) sel.addEventListener("change", draw);
    draw();
  }
  window.SF_ANNUAIRE = { mount };
})();
