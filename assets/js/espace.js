/* Espace membres — tableau de bord
   ---------------------------------------------------------------------------
   Cinq parties, chacune avec ses chiffres clés ; un clic sur une tuile ouvre
   la partie en dessous :
     • Prélèvements  : saisie d'un prélèvement + suivi (Google Sheet « Surfrider Prélèvements »)
     • Membres       : admins, Saytoukat Géej, adhérent·e·s
     • Communication : réseaux sociaux + revue de presse (data/news.json, mise à jour chaque jour)
     • Finances      : demande de décaissement, suivi, tableau de bord (Google Sheet des finances)
     • Projets       : liste des projets et avancement
   Les données sont lues/écrites avec le compte Google de la personne connectée
   (voir gdata.js) : il faut avoir accès aux feuilles concernées. */
(function () {
  const C = window.SF_CONFIG;
  const D = window.SF_DATA;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tidy = (s) => String(s ?? "").trim().replace(/\s+/g, " ");
  const label = (h) => tidy(h).replace(/\s*:\s*$/, "");
  const nf = new Intl.NumberFormat("fr-FR");
  const money = (n) => nf.format(Math.round(n)) + " FCFA";
  const pad = (n) => String(n).padStart(2, "0");
  const frDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const frTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const stamp = (d = new Date()) => `${frDate(d)} ${frTime(d)}`;
  /* « 17/11/2026 », « 17/11/2026 09:12:00 », « 2026-11-17 » → Date */
  function parseDate(s) {
    s = tidy(s);
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (m) { let y = +m[3]; if (y < 100) y += 2000; return new Date(y, m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)); }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], m[2] - 1, +m[3]);
    return null;
  }
  const num = (v) => { const n = parseFloat(String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\s/g, "").replace(",", ".")); return isFinite(n) ? n : 0; };
  const daysAgo = (d) => Math.floor((Date.now() - d.getTime()) / 864e5);
  const ago = (d) => { const n = daysAgo(d); return n <= 0 ? "aujourd'hui" : n === 1 ? "hier" : n < 31 ? `il y a ${n} j` : frDate(d); };
  const findCol = (head, re) => head.findIndex((h) => re.test(label(h)));

  const ICON = {
    prelevements: '<svg viewBox="0 0 24 24"><path d="M12 2.5S5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 2.5 12 2.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 15a3 3 0 0 0 3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    membres: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="17" cy="9" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17.5 14.6c2.2.4 3.6 2 4 4.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    communication: '<svg viewBox="0 0 24 24"><path d="M4 10v4h3l6 4V6L7 10H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    finances: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 10h19" stroke="currentColor" stroke-width="2"/><circle cx="16.5" cy="14.5" r="1.6" fill="currentColor"/></svg>',
    projets: '<svg viewBox="0 0 24 24"><path d="M4 20V5h10l-1.5 3.5L14 12H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4 20h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };
  ICON.recherche = '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.5 10.5h6M10.5 7.5v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  ICON.communaute = '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.4" fill="currentColor"/></svg>';
  const MODULES = [
    // admin : tout · ca (membres du CA) : Finances, Membres, Projets · saytoukat : dépôt d'un prélèvement · adherent : rien
    { id: "prelevements", title: "Prélèvements", roles: ["admin", "saytoukat"] },
    { id: "membres", title: "Membres", roles: ["admin", "ca"] },
    { id: "communication", title: "Communication", roles: ["admin"] },
    { id: "finances", title: "Finances", roles: ["admin", "ca"] },
    { id: "projets", title: "Projets", roles: ["admin", "ca"] },
    { id: "recherche", title: "Recherche de projets", roles: ["admin", "ca"] },
    { id: "communaute", title: "Communauté", roles: ["admin", "ca"] },
  ];

  const S = { user: null, data: {}, el: null, current: null };

  /* ---------------- Chargement des données (avec cache) ---------------- */
  const loaders = {
    async prelevements(i) { return D.read((C.dataSheetId || C.waterSheetId), "Prélèvements", "", i); },
    async saytoukat(i) { return D.read(C.saytoukatSheetId, C.saytoukatTab, "", i); },
    async members(i) { return C.membersSheetId ? D.read(C.membersSheetId, C.membersTab, "", i) : null; },
    async news() { const r = await fetch("data/news.json?t=" + Math.floor(Date.now() / 36e5)); if (!r.ok) throw new Error("Revue de presse indisponible"); return r.json(); },
    async finance(i) {
      const id = D.financeSheet();
      if (!id) return null;
      const info = await D.tabs(id, i);
      const dec = info.tabs.find((t) => t === C.financeSheetTab) || info.tabs.find((t) => /d[ée]caiss/i.test(t)) || info.tabs[0];
      const pro = info.tabs.find((t) => t === C.projectsSheetTab) || info.tabs.find((t) => /projet/i.test(t));
      const [rows, prows] = await Promise.all([D.read(id, dec, "", i), pro ? D.read(id, pro, "", i) : Promise.resolve(null)]);
      return { id, title: info.title, tab: dec, rows, ptab: pro, prows };
    },
  };
  function load(key, interactive = true, force = false) {
    if (!force && S.data[key]) return S.data[key];
    S.data[key] = loaders[key](interactive).catch((e) => { delete S.data[key]; throw e; });
    return S.data[key];
  }

  /* ---------------- Tableau de bord ---------------- */
  function render(el, user) {
    S.el = el; S.user = user;
    const mods = MODULES.filter((m) => m.roles.includes(user.role));
    if (!mods.length) {
      el.innerHTML = `<div class="card adherent-card"><h3>Bienvenue ${esc(user.name || "")} !</h3>
        <p>Ton compte est un compte <strong>adhérent·e</strong> : merci de soutenir la Surfrider Foundation Sénégal. Toutes nos actions, la qualité de l'eau et les projets sont à retrouver sur le site.</p>
        <div class="form-actions"><a class="btn btn-blue" href="qualite-eau.html">Qualité de l'eau</a><a class="btn btn-outline" href="projets.html">Nos projets</a><a class="btn btn-outline" href="shop.html">Le shop</a></div>
        <p class="muted" style="margin-top:12px">Saytoukat Géej ou membre du CA ? Demande à l'administrateur d'ajouter ton adresse Google.</p></div>`;
      return;
    }
    el.innerHTML = `
      <div class="dash-tiles" role="tablist" aria-label="Tableau de bord">
        ${mods.map((m) => `<button type="button" class="dash-tile dash-${m.id}" role="tab" aria-selected="false" data-m="${m.id}">
          <span class="dash-ico" aria-hidden="true">${ICON[m.id]}</span>
          <span class="dash-title">${m.title}</span>
          <strong class="dash-num" data-kpi="${m.id}">…</strong>
          <span class="dash-sub" data-sub="${m.id}"></span>
        </button>`).join("")}
      </div>
      <div class="dash-auth" hidden>
        <p>Pour afficher les chiffres et enregistrer des données, autorise le site à accéder aux Google Sheets de l'association avec ton compte.</p>
        <button type="button" class="btn btn-blue">Autoriser l'accès Google</button>
      </div>
      <section class="dash-panel" aria-live="polite"></section>`;
    el.querySelectorAll(".dash-tile").forEach((b) => b.addEventListener("click", () => focus(b.dataset.m, true)));
    el.querySelector(".dash-auth button").addEventListener("click", async () => {
      try { await D.token(true); el.querySelector(".dash-auth").hidden = true; refreshKpis(true); if (S.current) focus(S.current); }
      catch (e) { el.querySelector(".dash-auth p").textContent = "Accès refusé ou fenêtre bloquée : " + e.message; }
    });
    refreshKpis(false);
    const want = location.hash.slice(1);
    if (mods.some((m) => m.id === want)) focus(want);
    window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h && h !== S.current && mods.some((m) => m.id === h)) focus(h); });
  }

  function setKpi(id, n, sub) {
    const a = S.el.querySelector(`[data-kpi="${id}"]`), b = S.el.querySelector(`[data-sub="${id}"]`);
    if (a) a.textContent = n; if (b) b.innerHTML = sub || "";
  }
  async function refreshKpis(interactive) {
    const has = (id) => !!S.el.querySelector(`[data-kpi="${id}"]`);
    let needAuth = false;
    const guard = (id, p) => p.catch((e) => { if (e.code === "auth") { needAuth = true; setKpi(id, "—", "Autorisation Google requise"); } else setKpi(id, "—", esc(e.message)); });
    const jobs = [];
    if (has("prelevements")) jobs.push(guard("prelevements", load("prelevements", interactive).then((rows) => {
      const list = prelevList(rows);
      const last = list[0];
      const year = new Date().getFullYear();
      setKpi("prelevements", nf.format(list.length), last ? `${list.filter((p) => p.date && p.date.getFullYear() === year).length} en ${year} · dernier ${ago(last.date)}` : "Aucun prélèvement");
    })));
    if (has("membres")) jobs.push(guard("membres", Promise.all([load("saytoukat", interactive), load("members", interactive)]).then(([say, mem]) => {
      const nSay = say ? Math.max(0, say.slice(1).filter((r) => tidy(r[0])).length) : 0;
      const nMem = mem ? Math.max(0, mem.slice(1).filter((r) => tidy(r[0])).length) : 0;
      setKpi("membres", nf.format(nMem || C.ca.length + nSay), `${(C.ca || []).length} membres du CA · ${nSay} Saytoukat${mem ? ` · ${nMem} adhérent·e·s` : ""}`);
    })));
    if (has("communication")) jobs.push(guard("communication", load("news").then((n) => {
      const recent = n.items.filter((a) => daysAgo(new Date(a.date)) <= 30);
      const ours = n.items.filter((a) => a.cat === "nous");
      setKpi("communication", nf.format(recent.length), `actus sur 30 jours · ${ours.length} articles sur nous`);
    })));
    if (has("finances")) jobs.push(guard("finances", load("finance", interactive).then((f) => {
      if (!f) return setKpi("finances", "—", "Feuille des finances à relier");
      const m = financeModel(f);
      setKpi("finances", money(m.total), `de dépenses · ${m.out.length} demandes · ${m.pending.length} en attente`);
    })));
    if (has("projets")) jobs.push(guard("projets", projectsModel(interactive).then((p) => {
      setKpi("projets", String(p.live.length), `en cours · ${p.done.length} réalisés${p.avg != null ? ` · avancement moyen ${p.avg} %` : ""}`);
    })));
    if (has("recherche") && window.SF_RECHERCHE) jobs.push(guard("recherche", SF_RECHERCHE.kpi(interactive).then((k) => setKpi("recherche", String(k.n), k.sub))));
    if (has("communaute") && window.SF_COMMUNAUTE_UI) jobs.push(guard("communaute", SF_COMMUNAUTE_UI.kpi(interactive).then((k) => setKpi("communaute", k.n, k.sub))));
    await Promise.all(jobs);
    S.el.querySelector(".dash-auth").hidden = !needAuth;
  }

  function focus(id, scroll) {
    S.current = id;
    S.el.querySelectorAll(".dash-tile").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.m === id)));
    S.el.classList.add("has-focus");
    if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
    const panel = S.el.querySelector(".dash-panel");
    panel.className = "dash-panel dash-panel-" + id;
    panel.innerHTML = `<p class="muted">Chargement…</p>`;
    const run = { prelevements: panelPrelevements, membres: panelMembres, communication: panelCommunication, finances: panelFinances, projets: panelProjets, recherche: (p) => SF_RECHERCHE.mount(p, S.user, subTabs), communaute: (p) => SF_COMMUNAUTE_UI.mount(p, S.user, subTabs) }[id];
    Promise.resolve(run(panel)).catch((e) => {
      panel.innerHTML = e.code === "auth"
        ? `<div class="notice">Autorise l'accès Google (bouton au-dessus) pour afficher cette partie.</div>`
        : `<div class="notice">Impossible de charger cette partie : ${esc(e.message)}</div>`;
    });
    if (scroll) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function subTabs(panel, title, tabs, start) {
    panel.innerHTML = `<div class="panel-head"><h2>${title}</h2><div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-t="${k}" aria-selected="false">${l}</button>`).join("")}</div></div><div class="panel-body"></div>`;
    const body = panel.querySelector(".panel-body");
    const open = (k) => {
      panel.querySelectorAll("[data-t]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.t === k)));
      body.innerHTML = `<p class="muted">Chargement…</p>`;
      const fn = tabs.find((t) => t[0] === k)[2];
      Promise.resolve(fn(body, open)).catch((e) => { body.innerHTML = `<div class="notice">${e.code === "auth" ? "Autorise l'accès Google (bouton au-dessus) pour continuer." : "Erreur : " + esc(e.message)}</div>`; if (e.code === "auth") S.el.querySelector(".dash-auth").hidden = false; });
    };
    panel.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => open(b.dataset.t)));
    open(start || tabs[0][0]);
    return open;
  }

  const toast = (el, msg, ok = true) => { const p = document.createElement("p"); p.className = "notice " + (ok ? "notice-green" : ""); p.innerHTML = msg; el.prepend(p); p.scrollIntoView({ behavior: "smooth", block: "center" }); return p; };

  /* ======================================================================
     PRÉLÈVEMENTS
     ====================================================================== */
  const SITES = ["Virage", "Yoff", "Ngor", "Ouakam", "Baie des carpes", "Secret"];
  const PF = {
    maree: ["Basse", "Mi-Marée", "Haute"],
    pluie: ["Pas de pluie", "Le jour même", "La veille", "2 jours avant", "3 jours avant", "4 jours avant", "5 jours avant", "La semaine d'avant"],
    peu: ["Non", "Un peu", "Beaucoup"],
    population: ["Rien", "Baigneurs", "Sportifs sur la plage", "Sportifs nautiques", "Pécheurs", "Animaux", "Autres"],
    odeur: ["Non", "Oui"],
    odeurDesc: ["Egouts", "Eaux usées", "Acide (algues toxiques)", "Essence", "Produits chimiques", "Poisson mort"],
    intensite: ["Faible", "Moyenne", "Forte"],
    couleur: ["Bleue", "Verte", "Marron"],
    aspect: ["Transparente", "Normale", "Mousseuse", "Mousseuse au bord", "Grasse", "Eau trouble"],
  };
  function prelevList(rows) {
    const head = rows[0] || [];
    const c = { ts: 0, who: findCol(head, /watertester|nom/i), site: findCol(head, /^site/i), date: findCol(head, /date du pr/i), hour: findCol(head, /heure/i), maree: findCol(head, /mar[ée]e/i), couleur: findCol(head, /couleur/i), odeur: findCol(head, /^sentez/i), dechets: findCol(head, /d[ée]chets dans l'eau/i), com: findCol(head, /commentaire/i), photoP: findCol(head, /photo de la plage/i), photoM: findCol(head, /photo de la mer/i) };
    return rows.slice(1).map((r, i) => ({ r, row: i + 2, ts: parseDate(r[0]), date: parseDate(r[c.date]) || parseDate(r[0]), c }))
      .filter((p) => tidy(p.r[0]))
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }

  function panelPrelevements(panel) {
    const tabs = [["new", "Nouveau prélèvement", prelevForm]];
    if (S.user.role === "admin") tabs.push(["suivi", "Suivi des prélèvements", prelevSuivi]); // les Saytoukat déposent seulement
    subTabs(panel, "Prélèvements", tabs, S.user.role === "admin" ? "suivi" : "new");
  }

  const chips = (name, opts, multi) => `<div class="chips" data-name="${name}">${opts.map((o) => `<label class="chip"><input type="${multi ? "checkbox" : "radio"}" name="${name}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("")}</div>`;

  async function prelevForm(body, open) {
    let testers = [];
    try { const say = await load("saytoukat", false); if (say) testers = say.slice(1).map((r) => tidy(r[0])).filter(Boolean); } catch (e) {}
    const now = new Date();
    body.innerHTML = `
      <form class="form pform" novalidate>
        <fieldset><legend>Le prélèvement</legend>
          <div class="grid-form">
            <label>Nom du Watertester *<input name="who" required list="pf-testers" value="${esc(S.user.name || "")}" autocomplete="name"><datalist id="pf-testers">${testers.map((n) => `<option value="${esc(n)}">`).join("")}</datalist></label>
            <label>Site *<select name="site" required><option value="">Choisir…</option>${SITES.map((s) => `<option>${s}</option>`).join("")}</select></label>
            <label>Date du prélèvement *<input type="date" name="date" required value="${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}"></label>
            <label>Heure du prélèvement *<input type="time" name="hour" required value="${pad(now.getHours())}:${pad(now.getMinutes())}"></label>
            <label class="span-2">Position GPS<span class="row-inline"><input name="gps" placeholder="14.7417, -17.5208"><button type="button" class="btn btn-outline btn-sm" data-gps>📍 Ma position</button></span></label>
            <label>Température de l'air (°C)<input type="number" name="temp" step="0.5" inputmode="decimal" placeholder="28"></label>
          </div>
          <p class="q">Quelle est la marée ? *</p>${chips("maree", PF.maree)}
          <p class="q">Quand a-t-il plu la dernière fois ? *</p>${chips("pluie", PF.pluie)}
        </fieldset>
        <fieldset><legend>La plage</legend>
          <p class="q">Y a-t-il des déchets sur la plage ? *</p>${chips("dechetsPlage", PF.peu)}
          <label class="file">Photo de la plage<input type="file" name="photoPlage" accept="image/*" capture="environment"></label>
          <p class="q">Quelle est la population sur le site ?</p>${chips("population", PF.population, true)}
          <div class="grid-form">
            <label>Si autres, précisez<input name="autres"></label>
            <label>Quantité de personnes (environ)<input type="number" name="nb" min="0" inputmode="numeric"></label>
          </div>
        </fieldset>
        <fieldset><legend>L'eau</legend>
          <p class="q">Sentez-vous une odeur particulière au bord de l'eau ? *</p>${chips("odeur", PF.odeur)}
          <div class="if-odeur" hidden>
            <p class="q">Décrivez cette odeur</p>${chips("odeurDesc", PF.odeurDesc, true)}
            <p class="q">Intensité de l'odeur</p>${chips("intensite", PF.intensite)}
          </div>
          <p class="q">Quelle est la couleur de l'eau ? *</p>${chips("couleur", PF.couleur, true)}
          <p class="q">Y a-t-il des déchets dans l'eau ? *</p>${chips("dechetsEau", PF.peu)}
          <label class="file">Photo de la mer<input type="file" name="photoMer" accept="image/*" capture="environment"></label>
          <p class="q">Aspect de l'eau *</p>${chips("aspect", PF.aspect, true)}
          <label>Commentaires ou remarques (discussion avec des usagers, conditions…)<textarea name="com" rows="3"></textarea></label>
        </fieldset>
        <div class="form-actions"><button class="btn btn-blue btn-lg" type="submit">Enregistrer le prélèvement</button><span class="form-msg" role="status"></span></div>
      </form>`;
    const f = body.querySelector("form");
    const val = (n) => { const els = [...f.querySelectorAll(`[name="${n}"]`)]; if (!els.length) return ""; if (els[0].type === "radio") return (els.find((e) => e.checked) || {}).value || ""; if (els[0].type === "checkbox") return els.filter((e) => e.checked).map((e) => e.value); return els[0].value.trim(); };
    f.querySelectorAll('[name="odeur"]').forEach((r) => r.addEventListener("change", () => { f.querySelector(".if-odeur").hidden = val("odeur") !== "Oui"; }));
    f.querySelector("[data-gps]").addEventListener("click", (e) => {
      const b = e.currentTarget; b.disabled = true; b.textContent = "Localisation…";
      navigator.geolocation.getCurrentPosition(
        (p) => { f.gps.value = `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`; b.disabled = false; b.textContent = "📍 Ma position"; },
        () => { b.disabled = false; b.textContent = "📍 Position indisponible"; }, { enableHighAccuracy: true, timeout: 15000 });
    });
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = f.querySelector(".form-msg");
      const required = [["who", "le nom"], ["site", "le site"], ["date", "la date"], ["hour", "l'heure"], ["maree", "la marée"], ["pluie", "la pluie"], ["dechetsPlage", "les déchets sur la plage"], ["odeur", "l'odeur"], ["couleur", "la couleur de l'eau"], ["dechetsEau", "les déchets dans l'eau"], ["aspect", "l'aspect de l'eau"]];
      const miss = required.filter(([n]) => { const v = val(n); return Array.isArray(v) ? !v.length : !v; }).map(([, l]) => l);
      if (miss.length) { msg.className = "form-msg is-err"; msg.textContent = "À compléter : " + miss.join(", ") + "."; return; }
      const btn = f.querySelector("[type=submit]"); btn.disabled = true;
      try {
        const ts = new Date();
        const [y, mo, d] = val("date").split("-");
        const base = `${val("site")} ${y}${mo}${d}`;
        msg.className = "form-msg"; msg.textContent = "Envoi…";
        const photo = async (n, what) => { const file = f.querySelector(`[name="${n}"]`).files[0]; if (!file) return ""; msg.textContent = `Envoi de la photo ${what}…`; return D.uploadPhoto(file, `${base} - Photo ${what}`); };
        const pPlage = await photo("photoPlage", "de la plage");
        const pMer = await photo("photoMer", "de la mer");
        const rows = await load("prelevements", true);
        const head = rows[0];
        const set = {
          "horodateur": stamp(ts), "watertester": val("who"), "^site": val("site"), "gps": val("gps"),
          "date du pr": `${d}/${mo}/${y}`, "heure du pr": val("hour") + ":00", "mar[ée]e": val("maree"),
          "temp[ée]rature": val("temp"), "plu": val("pluie"), "d[ée]chets sur la plage": val("dechetsPlage"),
          "photo de la plage": pPlage, "population sur": val("population").join(" , "), "si autres": val("autres"),
          "quantit[ée] de population": val("nb"), "^sentez": val("odeur"), "d[ée]crivez cette odeur": val("odeurDesc").join(" , "),
          "intensit[ée]": val("intensite"), "couleur": val("couleur").join(", "), "d[ée]chets dans l'eau": val("dechetsEau"),
          "photo de la mer": pMer, "aspect": val("aspect").join(" , "), "commentaire": val("com"),
        };
        const row = head.map((h) => { for (const k in set) if (new RegExp(k, "i").test(label(h))) return set[k]; return ""; });
        // en-tête manquant : ordre des colonnes de la feuille d'origine
        const ORDER = Object.keys(set);
        ORDER.forEach((k, i) => { if (!label(head[i] || "") && !row[i]) row[i] = set[k]; });
        while (row.length < ORDER.length) row.push(set[ORDER[row.length]]);
        await D.append((C.dataSheetId || C.waterSheetId), "Prélèvements", row);
        load("prelevements", true, true); refreshKpis(false);
        body.innerHTML = "";
        toast(body, `<strong>Merci ! Prélèvement de ${esc(val("site") || "")} enregistré</strong> dans la feuille « Surfrider Prélèvements ».`);
        const again = document.createElement("div"); again.className = "form-actions";
        again.innerHTML = `<button class="btn btn-blue" type="button">Saisir un autre prélèvement</button>${S.user.role === "admin" ? `<button class="btn btn-outline" type="button">Voir le suivi</button>` : ""}`;
        body.append(again);
        again.children[0].addEventListener("click", () => open("new"));
        if (again.children[1]) again.children[1].addEventListener("click", () => open("suivi"));
      } catch (err) {
        btn.disabled = false;
        msg.className = "form-msg is-err";
        msg.textContent = err.code === "auth" ? "Autorise l'accès Google (bouton en haut) puis réessaie." : "Échec de l'enregistrement : " + err.message;
      }
    });
  }

  async function prelevSuivi(body) {
    const rows = await load("prelevements", true);
    const list = prelevList(rows);
    const c = list[0]?.c || {};
    const years = [...new Set(list.map((p) => p.date && p.date.getFullYear()).filter(Boolean))].sort((a, b) => b - a);
    const bySite = {};
    list.forEach((p) => { const s = tidy(p.r[c.site]) || "—"; (bySite[s] = bySite[s] || []).push(p); });
    body.innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>Prélèvements</span><strong>${nf.format(list.length)}</strong></div>
        <div class="kpi"><span>Cette année</span><strong>${list.filter((p) => p.date && p.date.getFullYear() === new Date().getFullYear()).length}</strong></div>
        <div class="kpi"><span>30 derniers jours</span><strong>${list.filter((p) => p.date && daysAgo(p.date) <= 30).length}</strong></div>
        <div class="kpi"><span>Watertesters</span><strong>${new Set(list.map((p) => tidy(p.r[c.who]).toLowerCase())).size}</strong></div>
      </div>
      <h3>Par site</h3>
      <div class="site-grid">${Object.entries(bySite).sort().map(([s, l]) => `<button type="button" class="site-card" data-site="${esc(s)}"><strong>${esc(s)}</strong><span>${l.length} prélèvements</span><small>Dernier : ${l[0].date ? ago(l[0].date) : "—"}</small></button>`).join("")}</div>
      <div class="controls" style="margin-top:18px">
        <input type="search" placeholder="Rechercher (nom, commentaire…)" aria-label="Rechercher">
        <select data-f="site" aria-label="Site"><option value="">Tous les sites</option>${Object.keys(bySite).sort().map((s) => `<option>${esc(s)}</option>`).join("")}</select>
        <select data-f="year" aria-label="Année"><option value="">Toutes les années</option>${years.map((y) => `<option>${y}</option>`).join("")}</select>
        <span class="tag" data-count></span>
      </div>
      <div class="table-scroll"><table class="data-table">
        <thead><tr><th>Date</th><th>Site</th><th>Watertester</th><th>Marée</th><th>Couleur</th><th>Odeur</th><th>Déchets eau</th><th>Photos</th><th>Commentaire</th></tr></thead>
        <tbody></tbody></table></div>`;
    const q = body.querySelector("input[type=search]"), fs = body.querySelector('[data-f="site"]'), fy = body.querySelector('[data-f="year"]');
    const link = (v, l) => /^https?:/.test(tidy(v)) ? `<a href="${esc(tidy(v))}" target="_blank" rel="noopener">${l}</a>` : (tidy(v) ? `<span title="Photo dans l'ancienne app AppSheet">${l}</span>` : "");
    const draw = () => {
      const term = q.value.toLowerCase().trim();
      const L = list.filter((p) => (!fs.value || tidy(p.r[c.site]) === fs.value) && (!fy.value || (p.date && p.date.getFullYear() === +fy.value)) && (!term || p.r.join(" ").toLowerCase().includes(term)));
      body.querySelector("[data-count]").textContent = L.length + " résultat(s)";
      body.querySelector("tbody").innerHTML = L.slice(0, 300).map((p) => `<tr>
        <td>${p.date ? frDate(p.date) : "—"}${tidy(p.r[c.hour]) ? `<br><small>${esc(tidy(p.r[c.hour]).slice(0, 5))}</small>` : ""}</td>
        <td>${esc(p.r[c.site])}</td><td>${esc(p.r[c.who])}</td><td>${esc(p.r[c.maree])}</td><td>${esc(p.r[c.couleur])}</td>
        <td>${esc(p.r[c.odeur])}</td><td>${esc(p.r[c.dechets])}</td>
        <td>${[link(p.r[c.photoP], "plage"), link(p.r[c.photoM], "mer")].filter(Boolean).join(" · ")}</td>
        <td class="cell-long">${esc(p.r[c.com])}</td></tr>`).join("") || `<tr><td colspan="9">Aucun prélèvement.</td></tr>`;
    };
    [q, fs, fy].forEach((x) => x.addEventListener("input", draw));
    body.querySelectorAll(".site-card").forEach((b) => b.addEventListener("click", () => { fs.value = b.dataset.site; draw(); fs.scrollIntoView({ behavior: "smooth", block: "center" }); }));
    draw();
  }

  /* ======================================================================
     MEMBRES (annuaire existant)
     ====================================================================== */
  function panelMembres(panel) {
    panel.innerHTML = `<div class="panel-head"><h2>Membres</h2></div><div class="panel-body"></div>`;
    window.SF_ANNUAIRE.mount(panel.querySelector(".panel-body"));
  }

  /* ======================================================================
     COMMUNICATION
     ====================================================================== */
  const CATS = { all: "Tout", nous: "La Surfrider Sénégal dans les médias", senegal: "Littoral & océan au Sénégal", reseau: "Réseau Surfrider", monde: "Océans dans le monde" };
  async function panelCommunication(panel) {
    const n = await load("news");
    const social = [
      ["Instagram", C.instagram, "@surfridersenegal", "ig"], ["Facebook", C.facebook, "Surfrider Sénégal", "fb"],
      ["LinkedIn", C.linkedin, "Surfrider Foundation Sénégal", "in"], ["WhatsApp", "https://wa.me/" + C.whatsapp, C.phone, "wa"],
    ];
    const upd = new Date(n.updated);
    panel.innerHTML = `
      <div class="panel-head"><h2>Communication</h2></div>
      <div class="social-grid">${social.map(([name, url, handle, k]) => `<a class="social-card social-${k}" href="${esc(url)}" target="_blank" rel="noopener"><strong>${name}</strong><span>${esc(handle)}</span><small>Ouvrir ↗</small></a>`).join("")}</div>
      <div class="comm-grid">
        <div>
          <h3>Revue de presse</h3>
          <p class="muted" style="margin-top:-6px">Articles trouvés automatiquement sur Google Actualités, mis à jour chaque jour (dernière mise à jour : ${frDate(upd)}).</p>
          <div class="chips chips-filter">${Object.entries(CATS).map(([k, l], i) => `<button type="button" class="chip-btn" data-c="${k}" aria-pressed="${i === 0}">${l} <b>${k === "all" ? n.items.length : n.items.filter((a) => a.cat === k).length}</b></button>`).join("")}</div>
          <ul class="news-list"></ul>
        </div>
        <aside>
          <h3>Facebook</h3>
          <div class="fb-frame"><iframe title="Publications Facebook de Surfrider Sénégal" loading="lazy" src="https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(C.facebook)}&tabs=timeline&width=340&height=640&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false" width="340" height="640" style="border:none;overflow:hidden;max-width:100%" scrolling="no" allow="encrypted-media"></iframe></div>
        </aside>
      </div>`;
    const ul = panel.querySelector(".news-list");
    const draw = (cat) => {
      const L = n.items.filter((a) => cat === "all" || a.cat === cat);
      ul.innerHTML = L.map((a) => { const d = new Date(a.date); return `<li class="news-item news-${a.cat}"><a href="${esc(a.link)}" target="_blank" rel="noopener"><strong>${esc(a.title)}</strong></a><span>${esc(a.source)} · ${ago(d)}${a.cat === "nous" ? ' · <em class="tag tag-live">Nous</em>' : ""}</span></li>`; }).join("") || "<li>Aucun article.</li>";
    };
    panel.querySelectorAll("[data-c]").forEach((b) => b.addEventListener("click", () => { panel.querySelectorAll("[data-c]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); draw(b.dataset.c); }));
    draw("all");
  }

  /* ======================================================================
     FINANCES
     ====================================================================== */
  function financeModel(f) {
    const head = f.rows[0] || [];
    const c = {
      ts: findCol(head, /horodateur|timestamp/i), date: findCol(head, /^date/i), amount: findCol(head, /montant|amount|somme|co[uû]t/i),
      status: findCol(head, /statut|status|[ée]tat/i), project: findCol(head, /^projet|project/i), cat: findCol(head, /cat[ée]gorie|poste|ligne budg/i),
      who: findCol(head, /demandeur|nom|qui|e-?mail|adresse/i), what: findCol(head, /objet|motif|description|libell|d[ée]tail|pourquoi/i),
      type: findCol(head, /^type/i), method: findCol(head, /m[ée]thode|moyen de paiement/i), payee: findCol(head, /b[ée]n[ée]ficiaire/i),
    };
    // sens du mouvement : « Entrée » / « Sortie » (colonne Type) ; les réapprovisionnements entre comptes ne comptent pas
    const kindOf = (r) => {
      const t = tidy(r[c.type]), mth = tidy(r[c.method]);
      if (/r[ée]app?ro/i.test(mth)) return "transfer";
      if (/entr[ée]e/i.test(t) || /entrant|d[ée]p[oô]t/i.test(mth)) return "in";
      return "out";
    };
    const all = f.rows.slice(1).map((r, i) => ({ r, row: i + 2, amount: c.amount >= 0 ? num(r[c.amount]) : 0, status: tidy(r[c.status]), kind: kindOf(r), date: parseDate(r[c.date >= 0 ? c.date : c.ts]) || parseDate(r[c.ts]) }))
      .filter((x) => x.r.some((v) => tidy(v)));
    const isPending = (s) => !s || /attente|demand|nouveau|soumis|à valider|a valider|en cours/i.test(s);
    const isPaid = (s) => /pay|vers|d[ée]caiss[ée]|r[ée]gl|effectu|termin/i.test(s);
    const isRefused = (s) => /refus|rejet|annul/i.test(s);
    const out = all.filter((x) => x.kind === "out");
    return {
      head, c, rows: all, out, ins: all.filter((x) => x.kind === "in"),
      total: out.filter((x) => !isRefused(x.status)).reduce((a, x) => a + x.amount, 0),
      pending: out.filter((x) => isPending(x.status) && !isPaid(x.status) && !isRefused(x.status)), isPaid, isRefused, isPending,
    };
  }

  async function panelFinances(panel) {
    if (!D.financeSheet()) return financeSetup(panel);
    let f = await load("finance", true);
    if (!f) f = await load("finance", true, true);
    if (!f) return financeSetup(panel);
    subTabs(panel, "Finances", [["comptes", "Comptes Wave & NSIA", (b) => financeComptes(b, f)], ["dash", "Tableau de bord", (b) => financeDash(b, f)], ["suivi", "Suivi des décaissements", (b) => financeSuivi(b, f)], ["new", "Demande de décaissement", (b, open) => financeForm(b, f, open)]], "comptes");
    const foot = document.createElement("p");
    foot.className = "muted small-print";
    foot.innerHTML = `Feuille : <a href="https://docs.google.com/spreadsheets/d/${f.id}/edit" target="_blank" rel="noopener">${esc(f.title)} › ${esc(f.tab)} ↗</a>${C.financeSheetId ? "" : ` · <button type="button" class="linklike" data-unlink>changer de feuille</button>`}`;
    panel.append(foot);
    const ul = foot.querySelector("[data-unlink]");
    if (ul) ul.addEventListener("click", () => { D.setFinanceSheet(""); delete S.data.finance; focus("finances"); });
  }

  function financeSetup(panel) {
    panel.innerHTML = `
      <div class="panel-head"><h2>Finances</h2></div>
      <div class="card">
        <h3>Relier la Google Sheet des finances</h3>
        <p>Les demandes et le suivi des décaissements sont enregistrés dans la même Google Sheet que celle utilisée par l'application AppSheet « SurfriderFoundation » (onglets <em>Décaissements</em> et <em>Projets</em>). Colle ici son lien (le bouton « Partager » de la feuille, ou l'adresse dans la barre du navigateur).</p>
        <form class="form row-inline" data-link><input name="url" placeholder="https://docs.google.com/spreadsheets/d/…" required style="flex:1;min-width:240px"><button class="btn btn-blue" type="submit">Relier</button></form>
        <p class="muted" style="margin-top:10px">Le lien est retenu sur cet appareil. Pour qu'il soit valable pour tous les admins, il doit être ajouté dans <code>financeSheetId</code> (assets/js/config.js).</p>
      </div>`;
    panel.querySelector("[data-link]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = D.sheetIdFrom(e.target.url.value);
      if (!id || id.length < 20) return;
      D.setFinanceSheet(id); delete S.data.finance;
      refreshKpis(true); focus("finances");
    });
  }

  function bars(entries, fmt = money) {
    const max = Math.max(1, ...entries.map((e) => e[1]));
    return `<div class="bars">${entries.map(([k, v]) => `<div class="bar-row"><span class="label">${esc(k)}</span><span class="track"><span class="fill" style="width:${(v / max) * 100}%"></span></span><span class="val">${fmt(v)}</span></div>`).join("") || "<p class='muted'>Pas de données.</p>"}</div>`;
  }
  function sumBy(rows, idx) { const o = {}; rows.forEach((x) => { const k = tidy(x.r[idx]) || "—"; o[k] = (o[k] || 0) + x.amount; }); return Object.entries(o).sort((a, b) => b[1] - a[1]); }

  function financeDash(body, f) {
    const m = financeModel(f);
    const paid = m.out.filter((x) => m.isPaid(x.status));
    const year = new Date().getFullYear();
    const thisYear = m.out.filter((x) => x.date && x.date.getFullYear() === year && !m.isRefused(x.status));
    const sum = (L) => L.reduce((a, x) => a + x.amount, 0);
    const byStatus = {}; m.out.forEach((x) => { const s = m.isPaid(x.status) ? "Payé" : m.isRefused(x.status) ? "Refusé" : (x.status || "Sans statut"); byStatus[s] = byStatus[s] || [0, 0]; byStatus[s][0]++; byStatus[s][1] += x.amount; });
    const months = []; for (let i = 11; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push([d.getFullYear(), d.getMonth()]); }
    const perMonth = months.map(([y, mo]) => [new Date(y, mo, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }), sum(m.out.filter((x) => x.date && x.date.getFullYear() === y && x.date.getMonth() === mo && !m.isRefused(x.status)))]);
    const maxM = Math.max(1, ...perMonth.map((p) => p[1]));
    body.innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>Décaissé / payé (${paid.length})</span><strong>${money(sum(paid))}</strong></div>
        <div class="kpi"><span>En attente (${m.pending.length})</span><strong>${money(sum(m.pending))}</strong></div>
        <div class="kpi"><span>Dépenses ${year} (${thisYear.length})</span><strong>${money(sum(thisYear))}</strong></div>
        <div class="kpi"><span>Entrées enregistrées (${m.ins.length})</span><strong>${money(sum(m.ins))}</strong></div>
      </div>
      ${m.c.amount < 0 ? `<p class="notice">Aucune colonne « Montant » trouvée dans l'onglet ${esc(f.tab)} : les totaux sont à 0.</p>` : ""}
      <div class="grid grid-2 fin-grid">
        <div class="card"><h3>Par statut</h3>${bars(Object.entries(byStatus).sort((a, b) => b[1][1] - a[1][1]).map(([k, v]) => [`${k} (${v[0]})`, v[1]]))}</div>
        <div class="card"><h3>12 derniers mois</h3><div class="month-chart">${perMonth.map(([l, v]) => `<div class="mcol" title="${l} : ${money(v)}"><span class="mbar" style="height:${(v / maxM) * 100}%"></span><small>${l}</small></div>`).join("")}</div></div>
        ${m.c.project >= 0 ? `<div class="card"><h3>Dépenses par projet</h3>${bars(sumBy(m.out.filter((x) => !m.isRefused(x.status)), m.c.project).slice(0, 10))}</div>` : ""}
        ${m.c.cat >= 0 ? `<div class="card"><h3>Par catégorie</h3>${bars(sumBy(m.out, m.c.cat).slice(0, 10))}</div>`
          : m.c.method >= 0 ? `<div class="card"><h3>Par moyen de paiement</h3>${bars(sumBy(m.out.filter((x) => !m.isRefused(x.status)), m.c.method).slice(0, 8))}</div>` : ""}
      </div>`;
  }


  /* ---------- Comptes Wave & NSIA : soldes, réconciliation ----------
     Chaque mouvement de l'onglet Décaissements est rattaché à un compte d'après
     sa colonne « Méthode » : Wave… → Wave ; Virement / Chèque → NSIA ;
     « Réapro Wave » = virement de NSIA vers Wave. Les soldes partent du dernier
     relevé saisi dans l'onglet « Soldes comptes » (relevé Wave / relevé NSIA),
     puis ajoutent les mouvements effectués depuis. */
  const ACCTS = {
    wave: { name: "Wave", sub: "Wave Business", logo: "assets/img/banques/wave.png", color: "#1DC8FF" },
    nsia: { name: "NSIA Banque", sub: "Compte bancaire", logo: "assets/img/banques/nsia.png", color: "#B8892B" },
  };
  const SOLDES_TAB = "Soldes comptes";
  const SOLDES_HEAD = ["Date du relevé", "Compte", "Solde relevé", "Saisi par", "Saisi le", "Note"];

  function accountMoves(m) {
    const moves = [];
    m.rows.forEach((x) => {
      const mth = tidy(x.r[m.c.method]);
      const done = x.kind === "out" ? m.isPaid(x.status) : !m.isRefused(x.status) && !(x.status && m.isPending(x.status) && !m.isPaid(x.status));
      const base = { x, date: x.date, done, what: tidy(x.r[m.c.what]).split(/\n| {2,}/)[0], who: tidy(x.r[m.c.payee]) };
      if (x.kind === "transfer") {
        moves.push({ ...base, acct: "nsia", delta: -x.amount, transfer: true });
        moves.push({ ...base, acct: "wave", delta: x.amount, transfer: true });
        return;
      }
      const acct = /wave/i.test(mth) ? "wave" : /virement|ch[eè]que|nsia|banque/i.test(mth) ? "nsia" : null;
      moves.push({ ...base, acct, delta: x.kind === "in" ? x.amount : -x.amount });
    });
    return moves;
  }

  async function loadSoldes(f) {
    try {
      const info = await D.tabs(f.id, false);
      if (!info.tabs.includes(SOLDES_TAB)) return [];
      const rows = await D.read(f.id, SOLDES_TAB, "", false);
      return rows.slice(1).map((r) => {
        const acct = /wave/i.test(r[1]) ? "wave" : /nsia|banque/i.test(r[1]) ? "nsia" : null;
        return { date: parseDate(r[0]), acct, amount: num(r[2]), who: tidy(r[3]), note: tidy(r[5]) };
      }).filter((s) => s.date && s.acct).sort((a, b) => a.date - b.date);
    } catch (e) { return []; }
  }

  /* fin de journée du relevé : les mouvements du même jour sont réputés inclus */
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  const between = (mv, from, to) => mv.done && mv.date && (!from || mv.date > endOfDay(from)) && (!to || mv.date <= endOfDay(to));

  function accountState(key, moves, soldes) {
    const mv = moves.filter((x) => x.acct === key);
    const refs = soldes.filter((s) => s.acct === key);
    const last = refs[refs.length - 1] || null, prev = refs[refs.length - 2] || null;
    const since = mv.filter((x) => between(x, last && last.date));
    const sum = (L, sign) => L.filter((x) => sign > 0 ? x.delta > 0 : x.delta < 0).reduce((a, x) => a + Math.abs(x.delta), 0);
    const balance = last ? last.amount + since.reduce((a, x) => a + x.delta, 0) : null;
    let gap = null;
    if (last && prev) {
      const expected = prev.amount + mv.filter((x) => between(x, prev.date, last.date)).reduce((a, x) => a + x.delta, 0);
      gap = { expected, actual: last.amount, diff: last.amount - expected, from: prev.date, to: last.date };
    }
    const year = new Date().getFullYear();
    const yearMv = mv.filter((x) => x.done && x.date && x.date.getFullYear() === year);
    const recent = mv.filter((x) => x.date).sort((a, b) => b.date - a.date).slice(0, 8);
    return { key, mv, last, balance, gap, since, inSince: sum(since, 1), outSince: sum(since, -1),
      inYear: sum(yearMv, 1), outYear: sum(yearMv, -1), pending: mv.filter((x) => !x.done && x.delta < 0 && !m_isRefused(x)), recent };
  }
  const m_isRefused = (x) => /refus|rejet|annul/i.test(x.x.status);

  function pie(parts) {
    const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0);
    if (!total) return `<div class="pie pie-empty" aria-hidden="true"></div>`;
    let acc = 0;
    const stops = parts.map((p) => { const a = acc; acc += Math.max(0, p.value) / total * 100; return `${p.color} ${a}% ${acc}%`; }).join(", ");
    const label = parts.map((p) => `${p.label} ${Math.round(Math.max(0, p.value) / total * 100)} %`).join(", ");
    return `<div class="pie" role="img" aria-label="${esc(label)}" style="background:conic-gradient(${stops})"></div>`;
  }

  async function financeComptes(body, f) {
    body.innerHTML = `<p class="muted">Chargement des comptes…</p>`;
    const m = financeModel(f);
    const moves = accountMoves(m);
    const soldes = await loadSoldes(f);
    const st = { wave: accountState("wave", moves, soldes), nsia: accountState("nsia", moves, soldes) };
    const unassigned = moves.filter((x) => !x.acct && x.done);
    const known = st.wave.balance != null && st.nsia.balance != null;
    const share = known
      ? { title: "Répartition des fonds", note: "D'après les soldes calculés de chaque compte.", parts: ["wave", "nsia"].map((k) => ({ label: ACCTS[k].name, color: ACCTS[k].color, value: st[k].balance })) }
      : { title: "Répartition des dépenses payées", note: `Année ${new Date().getFullYear()}. Saisis un solde de relevé pour chaque compte pour voir la répartition des fonds.`, parts: ["wave", "nsia"].map((k) => ({ label: ACCTS[k].name, color: ACCTS[k].color, value: st[k].outYear })) };
    const tot = share.parts.reduce((a, p) => a + Math.max(0, p.value), 0) || 1;
    const fmtDelta = (d) => `<span class="${d < 0 ? "neg" : "pos"}">${d < 0 ? "−" : "+"} ${money(Math.abs(d))}</span>`;
    const gapLine = (s) => !s.gap ? `<li class="muted">Pas encore deux relevés : l'écart sera calculé au prochain relevé.</li>`
      : Math.abs(s.gap.diff) < 1 ? `<li class="rec-ok">✓ Rapproché : le relevé du ${frDate(s.gap.to)} correspond aux mouvements saisis.</li>`
      : `<li class="rec-gap">Écart de <strong>${money(Math.abs(s.gap.diff))}</strong> au relevé du ${frDate(s.gap.to)} (${s.gap.diff > 0 ? "plus" : "moins"} d'argent que prévu par les mouvements saisis depuis le ${frDate(s.gap.from)}).</li>`;

    const card = (k) => {
      const s = st[k], A = ACCTS[k];
      return `<article class="card acct acct-${k}">
        <header class="acct-head"><img src="${A.logo}" alt="Logo ${A.name}"><div><h3>${A.name}</h3><small class="muted">${A.sub}</small></div></header>
        <div class="acct-bal"><span>Solde calculé</span><strong>${s.balance == null ? "—" : money(s.balance)}</strong>
          <small class="muted">${s.last ? `Relevé du ${frDate(s.last.date)} : ${money(s.last.amount)}, puis ${s.since.length} mouvement${s.since.length > 1 ? "s" : ""}` : "Aucun relevé saisi pour ce compte"}</small></div>
        <div class="acct-figs">
          <div><span>Entrées ${s.last ? "depuis le relevé" : new Date().getFullYear()}</span><strong class="pos">${money(s.last ? s.inSince : s.inYear)}</strong></div>
          <div><span>Sorties ${s.last ? "depuis le relevé" : new Date().getFullYear()}</span><strong class="neg">${money(s.last ? s.outSince : s.outYear)}</strong></div>
          <div><span>En attente</span><strong>${money(s.pending.reduce((a, x) => a + Math.abs(x.delta), 0))}</strong></div>
        </div>
        <h4>Derniers mouvements</h4>
        <ul class="acct-moves">${s.recent.map((x) => `<li${x.done ? "" : ' class="is-pending"'}><span class="d">${frDate(x.date)}</span><span class="w">${x.transfer ? "↔ Réapprovisionnement Wave" : esc(x.who || x.what || "—")}${x.done ? "" : ' <em class="muted">(en attente)</em>'}</span>${fmtDelta(x.delta)}</li>`).join("") || "<li class='muted'>Aucun mouvement.</li>"}</ul>
      </article>`;
    };

    body.innerHTML = `
      <section class="card rec">
        <div class="rec-pie">
          ${pie(share.parts)}
          <div>
            <h3>${share.title}</h3>
            <ul class="rec-legend">${share.parts.map((p) => `<li><i style="background:${p.color}"></i>${p.label} <strong>${Math.round(Math.max(0, p.value) / tot * 100)} %</strong> <span class="muted">${money(p.value)}</span></li>`).join("")}</ul>
            <p class="muted small-print">${share.note}</p>
          </div>
        </div>
        <div class="rec-body">
          <h3>Réconciliation</h3>
          <div class="kpis kpis-3">
            <div class="kpi"><span>Total des deux comptes</span><strong>${known ? money(st.wave.balance + st.nsia.balance) : "—"}</strong></div>
            <div class="kpi"><span>Réappros NSIA → Wave (${new Date().getFullYear()})</span><strong>${money(moves.filter((x) => x.transfer && x.acct === "wave" && x.done && x.date && x.date.getFullYear() === new Date().getFullYear()).reduce((a, x) => a + x.delta, 0))}</strong></div>
            <div class="kpi"><span>Mouvements sans compte</span><strong>${unassigned.length}</strong></div>
          </div>
          <ul class="rec-list">
            <li><strong>Wave</strong></li>${gapLine(st.wave)}
            <li><strong>NSIA</strong></li>${gapLine(st.nsia)}
            ${unassigned.length ? `<li class="muted">${unassigned.length} mouvement${unassigned.length > 1 ? "s" : ""} payé${unassigned.length > 1 ? "s" : ""} sans méthode Wave / Virement / Chèque (${money(unassigned.reduce((a, x) => a + Math.abs(x.delta), 0))}) : non comptés dans les soldes.</li>` : ""}
          </ul>
          <details class="add-opp">
            <summary>+ Saisir un solde de relevé</summary>
            <form class="form row-inline" data-solde>
              <label>Compte <select name="acct"><option value="Wave">Wave</option><option value="NSIA">NSIA</option></select></label>
              <label>Date du relevé <input type="date" name="date" required value="${new Date().toISOString().slice(0, 10)}"></label>
              <label>Solde (FCFA) <input name="amount" inputmode="numeric" required placeholder="1 250 000"></label>
              <label style="flex:1;min-width:180px">Note <input name="note" placeholder="Relevé mensuel, capture Wave…"></label>
              <button class="btn btn-blue" type="submit">Enregistrer</button><span class="form-msg" role="status"></span>
            </form>
            <p class="muted small-print">Relève le solde affiché dans Wave Business ou sur le relevé NSIA. Il sert de point de départ au solde calculé, et le relevé suivant montre l'écart avec les mouvements saisis. Enregistré dans l'onglet « ${SOLDES_TAB} » de la feuille des finances.</p>
          </details>
        </div>
      </section>
      <div class="grid grid-2 acct-grid">${card("wave")}${card("nsia")}</div>`;

    body.querySelector("[data-solde]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fm = e.target, msg = fm.querySelector(".form-msg");
      const amount = num(fm.amount.value);
      const [y, mo, d] = fm.date.value.split("-");
      msg.textContent = "Enregistrement…";
      try {
        await D.ensureTab(f.id, SOLDES_TAB, SOLDES_HEAD);
        await D.append(f.id, SOLDES_TAB, [`${d}/${mo}/${y}`, fm.acct.value, amount, S.user.name || S.user.email, stamp(), fm.note.value]);
        financeComptes(body, f);
      } catch (err) { msg.textContent = "Erreur : " + err.message; }
    });
  }

  function financeSuivi(body, f) {
    const m = financeModel(f);
    // statuts proposés : les 4 usuels + ceux employés au moins 3 fois (les « Payé par Wave le … » restent affichés tels quels)
    const freq = {}; m.rows.forEach((x) => { if (x.status) freq[x.status] = (freq[x.status] || 0) + 1; });
    const statuses = ["En attente", "Validé", "Payé", "Refusé"];
    Object.keys(freq).forEach((s) => { if (freq[s] >= 3 && !statuses.some((x) => x.toLowerCase() === s.toLowerCase())) statuses.push(s); });
    const wanted = [m.c.ts, m.c.who, m.c.type, m.c.project, m.c.what, m.c.payee, m.c.method, m.c.amount].filter((i) => i >= 0);
    const show = wanted.length >= 4 ? wanted : m.head.map((h, i) => i).filter((i) => tidy(m.head[i]) && i !== m.c.status).slice(0, 8);
    body.innerHTML = `
      <div class="controls">
        <input type="search" placeholder="Rechercher (objet, projet, demandeur…)" aria-label="Rechercher">
        <div class="chips chips-filter">${["Tous", "En attente", ...statuses.filter((s) => !/^en attente$/i.test(s))].map((s, i) => `<button type="button" class="chip-btn" data-s="${esc(s)}" aria-pressed="${i === 0}">${esc(s)}</button>`).join("")}</div>
      </div>
      <p class="muted"><span data-count></span> · Total affiché : <strong data-total></strong> · Le statut se change directement dans la liste (enregistré dans la feuille). <button type="button" class="link-btn" data-reset hidden>Effacer les filtres de colonnes</button></p>
      <div class="table-scroll"><table class="data-table table-compact">
        <thead><tr>${show.map((i) => `<th>${esc(label(m.head[i]))}</th>`).join("")}<th>Statut</th></tr>
        <tr class="col-filters">${[...show, "st"].map((i) => colFilter(i)).join("")}</tr></thead><tbody></tbody></table></div>`;
    // un filtre sous chaque intitulé : liste déroulante quand la colonne a peu de valeurs, sinon texte libre
    function colFilter(i) {
      const lab = i === "st" ? "Statut" : label(m.head[i]);
      const vals = i === "st" ? [...new Set(m.rows.map((x) => tidy(x.status)).filter(Boolean))]
        : i === m.c.ts || i === m.c.amount ? [] : [...new Set(m.rows.map((x) => tidy(x.r[i])).filter(Boolean))];
      if (i === m.c.amount) return `<th><input type="number" min="0" step="1" data-cf="${i}" data-op="min" placeholder="Min." aria-label="${esc(lab)} minimum"></th>`;
      if (vals.length && vals.length <= 40) return `<th><select data-cf="${i}" aria-label="Filtrer ${esc(lab)}"><option value="">Tous</option>${vals.sort((a, b) => a.localeCompare(b, "fr")).map((v) => `<option>${esc(v)}</option>`).join("")}</select></th>`;
      return `<th><input type="search" data-cf="${i}" placeholder="${i === m.c.ts ? "ex : 11/2026" : "Filtrer…"}" aria-label="Filtrer ${esc(lab)}"></th>`;
    }
    let filt = "Tous";
    const q = body.querySelector("input");
    const cf = {};
    const shortDate = (v) => tidy(v).replace(/\s+\d{1,2}:\d{2}(:\d{2})?$/, "");
    const fmt = (i, v) => (i === m.c.amount ? money(num(v)) : i === m.c.ts ? esc(shortDate(v)) : /^https?:\/\//.test(tidy(v)) ? `<a href="${esc(tidy(v))}" target="_blank" rel="noopener">Ouvrir ↗</a>` : esc(v));
    const colOk = (x) => Object.entries(cf).every(([k, v]) => {
      if (k === "st") return tidy(x.status) === v;
      const i = +k;
      if (i === m.c.amount) return num(x.r[i]) >= +v;
      const el = body.querySelector(`[data-cf="${k}"]`);
      return el.tagName === "SELECT" ? tidy(x.r[i]) === v : tidy(x.r[i]).toLowerCase().includes(v.toLowerCase());
    });
    const draw = () => {
      const term = q.value.toLowerCase().trim();
      const L = m.rows.filter((x) => (filt === "Tous" || (filt === "En attente" ? m.pending.includes(x) : filt === "Payé" ? m.isPaid(x.status) : filt === "Refusé" ? m.isRefused(x.status) : x.status.toLowerCase() === filt.toLowerCase())) && (!term || x.r.join(" ").toLowerCase().includes(term)) && colOk(x))
        .sort((a, b) => (b.date || 0) - (a.date || 0));
      body.querySelector("[data-reset]").hidden = !Object.keys(cf).length;
      body.querySelector("[data-count]").textContent = L.length + " demande(s)";
      body.querySelector("[data-total]").textContent = money(L.filter((x) => x.kind === "out").reduce((a, x) => a + x.amount, 0)) + " de sorties";
      body.querySelector("tbody").innerHTML = L.map((x) => `<tr data-row="${x.row}">${show.map((i) => `<td class="${i === m.c.what ? "cell-long" : ""}">${fmt(i, x.r[i])}</td>`).join("")}
        <td>${x.kind === "in" ? '<span class="tag tag-live">Entrée</span> ' : ""}${m.c.status >= 0 ? `<select class="status-sel ${m.isPaid(x.status) ? "is-paid" : m.isRefused(x.status) ? "is-refused" : "is-pending"}" aria-label="Statut">${(x.status && !statuses.includes(x.status) ? [x.status, ...statuses] : statuses).map((s) => `<option${s === x.status ? " selected" : ""}>${esc(s)}</option>`).join("")}${x.status ? "" : '<option selected value="">—</option>'}</select>` : "—"}</td></tr>`).join("") || `<tr><td colspan="${show.length + 1}">Aucune demande.</td></tr>`;
      body.querySelectorAll(".status-sel").forEach((sel) => sel.addEventListener("change", async () => {
        const tr = sel.closest("tr"), row = +tr.dataset.row, x = m.rows.find((y) => y.row === row);
        sel.disabled = true;
        try {
          await D.setCell(f.id, f.tab, row, m.c.status + 1, sel.value);
          x.status = sel.value; x.r[m.c.status] = sel.value;
          sel.className = "status-sel " + (m.isPaid(x.status) ? "is-paid" : m.isRefused(x.status) ? "is-refused" : "is-pending");
          m.pending = m.rows.filter((y) => m.isPending(y.status) && !m.isPaid(y.status) && !m.isRefused(y.status));
          refreshKpis(false);
        } catch (e) { alert("Statut non enregistré : " + e.message); sel.value = x.status; }
        sel.disabled = false;
      }));
    };
    q.addEventListener("input", draw);
    body.querySelectorAll("[data-cf]").forEach((el) => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
      const v = el.value.trim();
      if (v) cf[el.dataset.cf] = v; else delete cf[el.dataset.cf];
      el.classList.toggle("is-on", !!v);
      draw();
    }));
    body.querySelector("[data-reset]").addEventListener("click", () => {
      body.querySelectorAll("[data-cf]").forEach((el) => { el.value = ""; el.classList.remove("is-on"); });
      Object.keys(cf).forEach((k) => delete cf[k]);
      draw();
    });
    body.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { filt = b.dataset.s; body.querySelectorAll("[data-s]").forEach((y) => y.setAttribute("aria-pressed", String(y === b))); draw(); }));
    draw();
  }

  /* Formulaire généré à partir des colonnes de l'onglet Décaissements */
  function financeForm(body, f, open) {
    const m = financeModel(f);
    const pTitle = f.prows ? Math.max(0, findCol(f.prows[0] || [], /^projet|^nom/i)) : 0;
    const projects = f.prows ? [...new Set(f.prows.slice(1).map((r) => tidy(r[pTitle])).filter((t) => t && !/^totale?s?$/i.test(t)))] : [];
    // colonnes calculées ou gérées par le bureau : jamais demandées dans le formulaire
    const SKIP = /d[ée]pens[ée] sur|restant|solde|validation|^buyer|classe de compte|date du mouvement|photos? [23]|fichier [23]/i;
    const statusDefault = m.rows.map((x) => x.status).find((s) => /attente|demand|nouveau|soumis/i.test(s)) || "En attente";
    const fields = m.head.map((h, i) => {
      const l = label(h);
      if (!l) return null;
      if (i === m.c.ts) return { i, auto: () => stamp() };
      if (i === m.c.status) return { i, auto: () => statusDefault };
      if (/^id$|row ?id|_rownumber|cl[ée] ?unique/i.test(l)) return { i, auto: () => Math.random().toString(36).slice(2, 10) };
      if (SKIP.test(l)) return null;
      const distinct = [...new Set(m.rows.map((x) => tidy(x.r[i])).filter(Boolean))];
      let type = "text", opts = null;
      if (i === m.c.amount) type = "money";
      else if (/date/i.test(l)) type = "date";
      else if (/e-?mail|adresse mail/i.test(l)) type = "email";
      else if (/justif|facture|re[çc]u|pi[èe]ce|photo|devis|document|fichier/i.test(l)) type = "file";
      else if (i === m.c.project) { type = "select"; opts = [...new Set([...projects, ...distinct])]; }
      else if (i === m.c.what || /commentaire|remarque|description|d[ée]tail/i.test(l)) type = "textarea";
      else if (distinct.length && distinct.length <= 15 && m.rows.length >= 5) { type = "list"; opts = distinct; }
      let value = "";
      if (type === "email") value = S.user.email;
      else if (i === m.c.who && !/mail/i.test(l)) value = (S.user.name || S.user.email).split(/\s+/)[0]; // prénom, comme dans la feuille
      else if (i === m.c.type && opts && opts.includes("Sortie")) value = "Sortie";
      return { i, l, type, opts, value, required: i === m.c.amount || i === m.c.what || i === m.c.project };
    }).filter(Boolean);
    const input = (fd) => {
      const id = "ff" + fd.i, req = fd.required ? " required" : "";
      if (fd.type === "money") return `<label for="${id}">${esc(fd.l)} *</label><div class="row-inline"><input id="${id}" name="${fd.i}" type="number" min="0" step="1" inputmode="numeric"${req}><span class="unit">FCFA</span></div>`;
      if (fd.type === "date") return `<label for="${id}">${esc(fd.l)}</label><input id="${id}" name="${fd.i}" type="date">`;
      if (fd.type === "file") return `<label for="${id}">${esc(fd.l)}</label><input id="${id}" name="${fd.i}" type="file" accept="image/*,application/pdf" capture="environment">`;
      if (fd.type === "textarea") return `<label for="${id}">${esc(fd.l)}${fd.required ? " *" : ""}</label><textarea id="${id}" name="${fd.i}" rows="3"${req}></textarea>`;
      if (fd.type === "select") return `<label for="${id}">${esc(fd.l)}${fd.required ? " *" : ""}</label><select id="${id}" name="${fd.i}"${req}><option value="">Choisir…</option>${fd.opts.map((o) => `<option>${esc(o)}</option>`).join("")}<option value="__autre">Autre…</option></select><input name="${fd.i}-autre" placeholder="Préciser" hidden>`;
      if (fd.type === "list") return `<label for="${id}">${esc(fd.l)}</label><input id="${id}" name="${fd.i}" list="${id}-l" value="${esc(fd.value)}"><datalist id="${id}-l">${fd.opts.map((o) => `<option value="${esc(o)}">`).join("")}</datalist>`;
      return `<label for="${id}">${esc(fd.l)}${fd.required ? " *" : ""}</label><input id="${id}" name="${fd.i}" type="${fd.type === "email" ? "email" : "text"}" value="${esc(fd.value)}"${req}>`;
    };
    const visible = fields.filter((x) => !x.auto);
    body.innerHTML = `
      <form class="form fform" novalidate>
        <p class="muted">Les champs reprennent les colonnes de l'onglet « ${esc(f.tab)} ». La demande est enregistrée avec la date du jour et le statut « ${esc(statusDefault)} ».</p>
        <div class="grid-form">${visible.map((fd) => `<div class="field ${fd.type === "textarea" ? "span-2" : ""}">${input(fd)}</div>`).join("")}</div>
        <div class="form-actions"><button class="btn btn-blue btn-lg" type="submit">Envoyer la demande</button><span class="form-msg" role="status"></span></div>
      </form>`;
    const fm = body.querySelector("form");
    fm.querySelectorAll("select").forEach((s) => s.addEventListener("change", () => { const o = fm.querySelector(`[name="${s.name}-autre"]`); if (o) o.hidden = s.value !== "__autre"; }));
    fm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = fm.querySelector(".form-msg");
      const get = (fd) => {
        const el = fm.querySelector(`[name="${fd.i}"]`);
        if (fd.type === "select" && el.value === "__autre") return fm.querySelector(`[name="${fd.i}-autre"]`).value.trim();
        if (fd.type === "date") { if (!el.value) return ""; const [y, mo, d] = el.value.split("-"); return `${d}/${mo}/${y}`; }
        return el.type === "file" ? el.files[0] : el.value.trim();
      };
      const miss = visible.filter((fd) => fd.required && !get(fd)).map((fd) => fd.l);
      if (miss.length) { msg.className = "form-msg is-err"; msg.textContent = "À compléter : " + miss.join(", ") + "."; return; }
      const btn = fm.querySelector("[type=submit]"); btn.disabled = true; msg.className = "form-msg"; msg.textContent = "Envoi…";
      try {
        const row = new Array(m.head.length).fill("");
        for (const fd of fields) {
          if (fd.auto) { row[fd.i] = fd.auto(); continue; }
          let v = get(fd);
          if (fd.type === "file") v = v ? await D.uploadPhoto(v, `Décaissement ${frDate(new Date()).replace(/\//g, "-")} - ${fd.l}`) : "";
          row[fd.i] = v;
        }
        await D.append(f.id, f.tab, row);
        delete S.data.finance; refreshKpis(false);
        const nf2 = await load("finance", true);
        body.innerHTML = "";
        toast(body, "<strong>Demande de décaissement enregistrée.</strong> Elle apparaît dans le suivi avec le statut « " + esc(statusDefault) + " ».");
        const again = document.createElement("div"); again.className = "form-actions";
        again.innerHTML = `<button class="btn btn-blue" type="button">Nouvelle demande</button><button class="btn btn-outline" type="button">Voir le suivi</button>`;
        body.append(again);
        f.rows = nf2.rows;
        again.children[0].addEventListener("click", () => open("new"));
        again.children[1].addEventListener("click", () => open("suivi"));
      } catch (err) {
        btn.disabled = false; msg.className = "form-msg is-err";
        msg.textContent = err.code === "auth" ? "Autorise l'accès Google (bouton en haut) puis réessaie." : "Échec : " + err.message;
      }
    });
  }

  /* ======================================================================
     PROJETS
     ====================================================================== */
  async function projectsModel(interactive) {
    let f = null;
    try { f = await load("finance", interactive); } catch (e) { /* les projets publics suffisent */ }
    const fin = f ? financeModel(f) : null;
    let list;
    if (f && f.prows && f.prows.length > 1) {
      const h = f.prows[0];
      const ci = {
        title: Math.max(0, findCol(h, /^projet|^nom/i)), status: findCol(h, /statut|status|[ée]tat/i), prog: findCol(h, /avancement|progress|%/i),
        budget: findCol(h, /budget/i), spent: findCol(h, /d[ée]penses/i), rest: findCol(h, /^reste/i),
        start: findCol(h, /d[ée]but/i), end: findCol(h, /fin/i), desc: findCol(h, /description|objectif|r[ée]sum/i),
        owner: findCol(h, /responsable|r[ée]f[ée]rent|chef/i), funder: findCol(h, /buyer|bailleur|financeur/i),
      };
      const today = new Date();
      list = f.prows.slice(1).filter((r) => tidy(r[ci.title]) && !/^(total|autre)s?$/i.test(tidy(r[ci.title]))).map((r) => { // lignes de synthèse exclues
        const st = tidy(r[ci.status]);
        const end = parseDate(r[ci.end]);
        const prog = ci.prog >= 0 && tidy(r[ci.prog]) ? Math.max(0, Math.min(100, num(r[ci.prog]) <= 1 && /\./.test(String(r[ci.prog])) ? num(r[ci.prog]) * 100 : num(r[ci.prog]))) : null;
        const done = /termin|r[ée]alis|clos|fini/i.test(st) || prog === 100 || (!st && end && end < today);
        const budget = ci.budget >= 0 ? num(r[ci.budget]) : null;
        const sheetSpent = ci.spent >= 0 && tidy(r[ci.spent]) ? num(r[ci.spent]) : null;
        const period = [tidy(r[ci.start]), tidy(r[ci.end])].filter(Boolean).join(" → ");
        return { title: tidy(r[ci.title]), status: done ? "done" : "live", statusLabel: st || (done ? "Terminé" : "En cours"), progress: prog, budget, sheetSpent, rest: ci.rest >= 0 && tidy(r[ci.rest]) ? num(r[ci.rest]) : null, period, text: tidy(r[ci.desc]), owner: tidy(r[ci.owner]), funder: tidy(r[ci.funder]), src: "sheet" };
      });
    } else {
      list = (window.SF_PROJECTS || []).map((p) => Object.assign({}, p, { statusLabel: p.status === "live" ? "En cours" : "Réalisé", progress: p.progress ?? (p.status === "done" ? 100 : null), src: "site" }));
    }
    if (fin && fin.c.project >= 0) {
      const spent = {}; fin.rows.filter((x) => !fin.isRefused(x.status)).forEach((x) => { const k = tidy(x.r[fin.c.project]).toLowerCase(); spent[k] = (spent[k] || 0) + x.amount; });
      list.forEach((p) => { p.spent = spent[p.title.toLowerCase()] || 0; });
    }
    // dépenses de l'onglet Projets (calculées par la feuille) prioritaires ; budget consommé en %
    list.forEach((p) => { if (p.sheetSpent) p.spent = p.sheetSpent; if (p.budget && p.spent != null) p.consumed = Math.round((p.spent / p.budget) * 100); });
    const withP = list.filter((p) => p.progress != null && p.status === "live");
    return { list, live: list.filter((p) => p.status === "live"), done: list.filter((p) => p.status === "done"), avg: withP.length ? Math.round(withP.reduce((a, p) => a + p.progress, 0) / withP.length) : null, fromSheet: list[0]?.src === "sheet" };
  }

  async function panelProjets(panel) {
    const pm = await projectsModel(true);
    const card = (p) => `<article class="card proj-card ${p.status}">
      <div class="meta"><span class="tag ${p.status === "live" ? "tag-live" : "tag-done"}">${esc(p.statusLabel || (p.status === "live" ? "En cours" : "Réalisé"))}</span>${p.theme ? `<span class="tag">${esc(p.theme)}</span>` : ""}${p.period ? `<span class="muted">${esc(p.period)}</span>` : ""}</div>
      <h3>${esc(p.title)}</h3>
      ${p.progress != null ? `<div class="progress" role="progressbar" aria-valuenow="${Math.round(p.progress)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p.progress}%"></span></div><small class="muted">Avancement : ${Math.round(p.progress)} %</small>`
        : p.consumed != null ? `<div class="progress${p.consumed > 100 ? " is-over" : ""}" role="progressbar" aria-valuenow="${p.consumed}" aria-valuemin="0" aria-valuemax="100" aria-label="Budget consommé"><span style="width:${Math.min(100, p.consumed)}%"></span></div><small class="muted">Budget consommé : ${p.consumed} %${p.consumed > 100 ? " (dépassement)" : ""}</small>`
        : `<small class="muted">Avancement non renseigné</small>`}
      ${p.text ? `<p>${esc(p.text.length > 220 ? p.text.slice(0, 217) + "…" : p.text)}</p>` : ""}
      <div class="proj-figs">${p.funder ? `<span>Financeur : ${esc(p.funder)}</span>` : ""}${p.owner ? `<span>👤 ${esc(p.owner)}</span>` : ""}${p.budget ? `<span>Budget : ${money(p.budget)}</span>` : ""}${p.spent ? `<span>Dépensé : ${money(p.spent)}</span>` : ""}${p.rest != null && p.rest !== 0 ? `<span>Reste : ${money(p.rest)}</span>` : ""}</div>
    </article>`;
    panel.innerHTML = `
      <div class="panel-head"><h2>Projets</h2></div>
      <div class="kpis">
        <div class="kpi"><span>En cours</span><strong>${pm.live.length}</strong></div>
        <div class="kpi"><span>Réalisés</span><strong>${pm.done.length}</strong></div>
        <div class="kpi"><span>${pm.avg != null ? "Avancement moyen" : "Budgets cumulés"}</span><strong>${pm.avg != null ? pm.avg + " %" : pm.list.some((p) => p.budget) ? money(pm.list.reduce((a, p) => a + (p.budget || 0), 0)) : "—"}</strong></div>
        <div class="kpi"><span>Dépensé sur projets</span><strong>${pm.list.some((p) => p.spent != null) ? money(pm.list.reduce((a, p) => a + (p.spent || 0), 0)) : "—"}</strong></div>
      </div>
      ${pm.fromSheet ? "" : `<p class="notice notice-blue">Liste issue de la page publique « Nos projets ». Une fois la Google Sheet des finances reliée (partie Finances), les projets et leur avancement viendront de son onglet « Projets ». En attendant, l'avancement se renseigne dans <code>data/projects.js</code> (champ <code>progress</code>).</p>`}
      <h3>En cours</h3><div class="grid grid-2">${pm.live.map(card).join("") || "<p class='muted'>Aucun projet en cours.</p>"}</div>
      <h3 style="margin-top:28px">Réalisés</h3><div class="grid grid-2">${pm.done.map(card).join("") || "<p class='muted'>—</p>"}</div>`;
  }

  window.SF_ESPACE = { render };
})();
