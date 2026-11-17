/* Espace membres › Recherche de projets (membres du CA et admin)
   ---------------------------------------------------------------------------
   • Veille : opportunités de financement trouvées chaque jour sur le web
     (data/funding.json, produit par scripts/fetch_funding.py via GitHub Actions)
   • Suivi : les opportunités retenues, enregistrées dans l'onglet
     « Recherche financements » de la feuille des finances (partagé par le CA),
     avec statut, avancement, responsable, prochaine étape, notes
   • Alertes : dates limites proches, ajout à Google Agenda
   • Aide à la réponse : trame de dossier pré-remplie + liste des pièces + Claude */
(function () {
  const C = window.SF_CONFIG;
  const D = window.SF_DATA;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tidy = (s) => String(s ?? "").trim().replace(/\s+/g, " ");
  const pad = (n) => String(n).padStart(2, "0");
  const frDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { s = tidy(s); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return new Date(+m[1], m[2] - 1, +m[3]); m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3], m[2] - 1, +m[1]) : null; };
  const daysLeft = (d) => (d ? Math.ceil((d - new Date(new Date().toDateString())) / 864e5) : null);
  const dlBadge = (d) => {
    const n = daysLeft(d);
    if (n == null) return `<span class="dl dl-none">Date limite non précisée</span>`;
    const cls = n < 0 ? "dl-past" : n <= 7 ? "dl-red" : n <= 30 ? "dl-orange" : "dl-ok";
    return `<span class="dl ${cls}">${n < 0 ? "Clôturé" : n === 0 ? "Aujourd'hui !" : "J-" + n} · ${frDate(d)}</span>`;
  };

  const TAB = "Recherche financements";
  const HEAD = ["ID", "Titre", "Financeur", "Lien", "Montant", "Date limite", "Statut", "Responsable", "Prochaine étape", "Notes", "Ajouté le", "Source"];
  const STATUSES = [["À étudier", 10], ["On y va", 25], ["En rédaction", 55], ["Soumis", 85], ["Accepté", 100], ["Refusé", 100], ["Abandonné", 0]];
  const ACTIVE = ["À étudier", "On y va", "En rédaction", "Soumis"];
  const progressOf = (s) => (STATUSES.find((x) => x[0] === s) || [s, 10])[1];
  const team = () => [...new Set(Object.entries(C.people || {}).filter(([e]) => (C.ca || []).concat(C.admins || []).includes(e)).map(([, v]) => v[0].split(" ")[0]))];

  const S = { el: null, user: null, news: null, rows: null, sheet: null, hidden: new Set() };
  try { S.hidden = new Set(JSON.parse(localStorage.getItem("sf-funding-hidden") || "[]")); } catch (e) {}
  const saveHidden = () => { try { localStorage.setItem("sf-funding-hidden", JSON.stringify([...S.hidden])); } catch (e) {} };

  async function loadFeed() {
    if (S.news) return S.news;
    const r = await fetch("data/funding.json?t=" + Math.floor(Date.now() / 36e5));
    if (!r.ok) throw new Error("Veille indisponible");
    S.news = await r.json();
    return S.news;
  }
  async function loadTracking(interactive = true) {
    S.sheet = D.financeSheet();
    if (!S.sheet) throw new Error("La feuille des finances n'est pas reliée (config.js › financeSheetId).");
    const info = await D.tabs(S.sheet, interactive);
    const rows = info.tabs.includes(TAB) ? await D.read(S.sheet, TAB, "", interactive) : [HEAD];
    S.rows = rows.slice(1).map((r, i) => ({ row: i + 2, v: HEAD.map((h, k) => tidy(r[k])) })).filter((x) => x.v[0] || x.v[1]);
    return S.rows;
  }
  const field = (x, name) => x.v[HEAD.indexOf(name)];
  const tracked = (id) => (S.rows || []).find((x) => field(x, "ID") === id);

  /* Chiffres pour la tuile du tableau de bord */
  async function kpi(interactive) {
    const feed = await loadFeed();
    const open = feed.items.filter((o) => !o.deadline || daysLeft(parse(o.deadline)) >= 0);
    let sub = `opportunités ouvertes · veille du ${frDate(new Date(feed.updated))}`;
    try {
      await loadTracking(interactive);
      const act = S.rows.filter((x) => ACTIVE.includes(field(x, "Statut")));
      const soon = act.filter((x) => { const n = daysLeft(parse(field(x, "Date limite"))); return n != null && n >= 0 && n <= 14; });
      sub = `${act.length} en suivi · ${soon.length} date(s) limite(s) sous 14 j`;
    } catch (e) { if (e.code === "auth") throw e; }
    return { n: open.length, sub };
  }

  /* ---------------- Montage ---------------- */
  function mount(panel, user, subTabs) {
    S.el = panel; S.user = user;
    return subTabs(panel, "Recherche de projets", [
      ["veille", "Veille", tabVeille],
      ["suivi", "Suivi & alertes", tabSuivi],
      ["aide", "Aide à la réponse", tabAide],
    ], "veille");
  }

  /* ---------------- Veille ---------------- */
  async function tabVeille(body, open) {
    const feed = await loadFeed();
    try { await loadTracking(true); } catch (e) { if (e.code !== "auth") console.warn(e); }
    const regions = [...new Set(feed.items.map((o) => o.region).filter(Boolean))].sort();
    const sources = [...new Set(feed.items.map((o) => o.source))].sort();
    body.innerHTML = `
      <p class="muted">Veille automatique mise à jour chaque jour (${frDate(new Date(feed.updated))}) : portail de financement de l'Union européenne, Grants.gov, fundsforNGOs et Google Actualités, filtrés sur l'océan, le littoral et la pollution marine. Les informations (montants, éligibilité) sont à <strong>vérifier sur la page de l'appel</strong>.</p>
      <div class="controls">
        <input type="search" placeholder="Rechercher (mot-clé, financeur…)" aria-label="Rechercher">
        <select data-f="region" aria-label="Zone"><option value="">Toutes les zones</option>${regions.map((r) => `<option>${esc(r)}</option>`).join("")}</select>
        <select data-f="source" aria-label="Source"><option value="">Toutes les sources</option>${sources.map((r) => `<option>${esc(r)}</option>`).join("")}</select>
        <select data-f="when" aria-label="Date limite"><option value="">Toutes les dates</option><option value="30">Date limite sous 30 j</option><option value="90">Sous 90 jours</option><option value="dated">Avec date limite</option></select>
        <select data-f="sort" aria-label="Tri"><option value="score">Plus pertinentes</option><option value="deadline">Date limite la plus proche</option><option value="new">Plus récentes</option></select>
        <label class="chk"><input type="checkbox" data-f="hidden"> Afficher les ignorées</label>
        <span class="tag" data-count></span>
      </div>
      <details class="add-opp"><summary>+ Ajouter une opportunité trouvée ailleurs</summary>
        <form class="form grid-form" data-add>
          <label>Titre *<input name="title" required></label>
          <label>Financeur<input name="funder"></label>
          <label>Lien<input name="url" type="url" placeholder="https://…"></label>
          <label>Montant<input name="amount" placeholder="ex. 50 000 €"></label>
          <label>Date limite<input name="deadline" type="date"></label>
          <div class="form-actions"><button class="btn btn-blue" type="submit">Ajouter au suivi</button><span class="form-msg"></span></div>
        </form></details>
      <div class="opp-list"></div>`;
    const list = body.querySelector(".opp-list");
    const q = body.querySelector("input[type=search]");
    const f = (n) => body.querySelector(`[data-f="${n}"]`);
    const draw = () => {
      const term = q.value.toLowerCase().trim();
      let L = feed.items.filter((o) => (f("hidden").checked || !S.hidden.has(o.id))
        && (!f("region").value || o.region === f("region").value) && (!f("source").value || o.source === f("source").value)
        && (!term || [o.title, o.funder, o.summary, o.region].join(" ").toLowerCase().includes(term)));
      const w = f("when").value;
      if (w === "dated") L = L.filter((o) => o.deadline);
      else if (w) L = L.filter((o) => { const n = daysLeft(parse(o.deadline)); return n != null && n >= 0 && n <= +w; });
      const sort = f("sort").value;
      L.sort((a, b) => sort === "deadline" ? (a.deadline || "9999").localeCompare(b.deadline || "9999") : sort === "new" ? (b.first_seen || "").localeCompare(a.first_seen || "") : b.score - a.score);
      body.querySelector("[data-count]").textContent = L.length + " opportunité(s)";
      list.innerHTML = L.map((o) => {
        const t = tracked(o.id);
        return `<article class="opp ${S.hidden.has(o.id) ? "is-hidden" : ""}" data-id="${esc(o.id)}">
          <div class="opp-top">${dlBadge(parse(o.deadline))}<span class="stars" title="Pertinence">${"★".repeat(Math.max(1, Math.min(5, Math.round(o.score / 2))))}</span>${o.region ? `<span class="tag">${esc(o.region)}</span>` : ""}<span class="muted">${esc(o.source)}</span></div>
          <h4><a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.title)}</a></h4>
          <div class="opp-figs">${o.funder ? `<span>Financeur : <strong>${esc(o.funder)}</strong></span>` : ""}<span>Montant : <strong>${esc(o.amount || "voir l'appel")}</strong></span></div>
          ${o.summary ? `<p>${esc(o.summary)}</p>` : ""}
          ${o.eligibility ? `<p class="elig">⚠ ${esc(o.eligibility)}</p>` : ""}
          <div class="opp-actions">
            <a class="btn btn-outline btn-sm" href="${esc(o.url)}" target="_blank" rel="noopener">Voir l'appel ↗</a>
            ${t ? `<span class="tag tag-live">Suivi : ${esc(field(t, "Statut"))}</span>` : `<button class="btn btn-blue btn-sm" type="button" data-follow>Suivre</button>`}
            <button class="btn btn-sm linklike" type="button" data-hide>${S.hidden.has(o.id) ? "Ne plus ignorer" : "Ignorer"}</button>
          </div></article>`;
      }).join("") || "<p class='muted'>Aucune opportunité avec ces filtres.</p>";
      list.querySelectorAll("[data-follow]").forEach((b) => b.addEventListener("click", async () => {
        const o = feed.items.find((x) => x.id === b.closest(".opp").dataset.id);
        b.disabled = true; b.textContent = "Ajout…";
        try { await follow(o); draw(); } catch (e) { b.disabled = false; b.textContent = "Suivre"; alert(e.code === "auth" ? "Autorise l'accès Google (bouton en haut) puis réessaie." : "Impossible d'ajouter : " + e.message); }
      }));
      list.querySelectorAll("[data-hide]").forEach((b) => b.addEventListener("click", () => {
        const id = b.closest(".opp").dataset.id;
        if (S.hidden.has(id)) S.hidden.delete(id); else S.hidden.add(id);
        saveHidden(); draw();
      }));
    };
    body.querySelectorAll("input,select").forEach((x) => x.addEventListener(x.type === "search" ? "input" : "change", draw));
    body.querySelector("[data-add]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fm = e.target, msg = fm.querySelector(".form-msg");
      const v = (n) => fm[n].value.trim();
      if (!v("title")) return;
      msg.textContent = "Ajout…";
      try {
        await follow({ id: "manuel-" + Date.now().toString(36), title: v("title"), funder: v("funder"), url: v("url"), amount: v("amount"), deadline: v("deadline"), source: "Ajout manuel" });
        fm.reset(); msg.textContent = "Ajouté au suivi ✓";
      } catch (err) { msg.textContent = "Échec : " + err.message; }
    });
    draw();
  }

  async function follow(o) {
    if (!S.rows) await loadTracking(true);
    await D.ensureTab(S.sheet, TAB, HEAD);
    const d = parse(o.deadline);
    const row = [o.id, o.title, o.funder || "", o.url || "", o.amount || "", d ? frDate(d) : "", "À étudier", (S.user.name || "").split(" ")[0], "Lire l'appel et vérifier l'éligibilité", "", frDate(new Date()), o.source || ""];
    await D.append(S.sheet, TAB, row);
    await loadTracking(true);
  }

  /* ---------------- Suivi & alertes ---------------- */
  async function tabSuivi(body, open) {
    await loadTracking(true);
    const rows = S.rows;
    const act = rows.filter((x) => ACTIVE.includes(field(x, "Statut")));
    const soon = act.map((x) => [x, daysLeft(parse(field(x, "Date limite")))]).filter(([, n]) => n != null && n >= 0 && n <= 21).sort((a, b) => a[1] - b[1]);
    const cal = (x) => {
      const d = parse(field(x, "Date limite")); if (!d) return "";
      const day = iso(d).replace(/-/g, ""), next = iso(new Date(d.getTime() + 864e5)).replace(/-/g, "");
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Date limite : " + field(x, "Titre"))}&dates=${day}/${next}&details=${encodeURIComponent((field(x, "Lien") || "") + "\nSuivi : Espace membres Surfrider › Recherche de projets")}`;
    };
    body.innerHTML = `
      ${soon.length ? `<div class="alerts"><h3>🔔 Dates limites proches</h3><ul>${soon.map(([x, n]) => `<li class="${n <= 7 ? "is-red" : ""}"><strong>${n === 0 ? "Aujourd'hui" : "J-" + n}</strong> · ${esc(field(x, "Titre"))} <span class="muted">(${esc(field(x, "Statut"))}${field(x, "Responsable") ? ", " + esc(field(x, "Responsable")) : ""})</span> <a href="${cal(x)}" target="_blank" rel="noopener">+ Agenda</a></li>`).join("")}</ul></div>`
        : `<p class="notice notice-blue">Aucune date limite dans les 21 prochains jours.</p>`}
      ${rows.length ? "" : `<p class="notice">Aucune opportunité suivie pour l'instant : cliquez sur « Suivre » dans l'onglet Veille.</p>`}
      <div class="kanban">${STATUSES.map(([s]) => {
        const L = rows.filter((x) => (field(x, "Statut") || "À étudier") === s).sort((a, b) => (parse(field(a, "Date limite")) || 9e15) - (parse(field(b, "Date limite")) || 9e15));
        return `<section class="kcol"><h4>${s} <span class="count">${L.length}</span></h4>${L.map((x) => card(x)).join("")}</section>`;
      }).join("")}</div>
      <p class="muted small-print">Enregistré dans la feuille <a href="https://docs.google.com/spreadsheets/d/${S.sheet}/edit" target="_blank" rel="noopener">${esc(TAB)} ↗</a>, partagée par les membres du CA.</p>`;

    function card(x) {
      const st = field(x, "Statut") || "À étudier", p = progressOf(st), d = parse(field(x, "Date limite"));
      return `<article class="kcard" data-row="${x.row}">
        <a class="kt" href="${esc(field(x, "Lien") || "#")}" target="_blank" rel="noopener">${esc(field(x, "Titre"))}</a>
        <div class="kfig">${dlBadge(d)}${field(x, "Montant") ? `<span>${esc(field(x, "Montant"))}</span>` : ""}${field(x, "Financeur") ? `<span class="muted">${esc(field(x, "Financeur"))}</span>` : ""}</div>
        <div class="progress" title="Avancement ${p} %"><span style="width:${p}%"></span></div>
        <details><summary>Modifier · ${esc(field(x, "Responsable") || "sans responsable")}</summary>
          <form class="form kform">
            <label>Statut<select name="Statut">${STATUSES.map(([s]) => `<option${s === st ? " selected" : ""}>${s}</option>`).join("")}</select></label>
            <label>Responsable<input name="Responsable" list="sf-team" value="${esc(field(x, "Responsable"))}"></label>
            <label>Date limite<input name="Date limite" type="date" value="${d ? iso(d) : ""}"></label>
            <label>Montant<input name="Montant" value="${esc(field(x, "Montant"))}"></label>
            <label>Prochaine étape<input name="Prochaine étape" value="${esc(field(x, "Prochaine étape"))}"></label>
            <label>Notes<textarea name="Notes" rows="3">${esc(field(x, "Notes"))}</textarea></label>
            <div class="form-actions"><button class="btn btn-blue btn-sm" type="submit">Enregistrer</button>
              <button class="btn btn-outline btn-sm" type="button" data-aide>Préparer la réponse</button>
              ${d ? `<a class="btn btn-sm linklike" href="${cal(x)}" target="_blank" rel="noopener">+ Google Agenda</a>` : ""}<span class="form-msg"></span></div>
          </form></details>
      </article>`;
    }
    body.insertAdjacentHTML("beforeend", `<datalist id="sf-team">${team().map((n) => `<option value="${esc(n)}">`).join("")}</datalist>`);
    body.querySelectorAll(".kform").forEach((fm) => {
      const x = rows.find((r) => r.row === +fm.closest(".kcard").dataset.row);
      fm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const msg = fm.querySelector(".form-msg"); msg.textContent = "Enregistrement…";
        const v = x.v.slice();
        ["Statut", "Responsable", "Montant", "Prochaine étape", "Notes"].forEach((n) => { v[HEAD.indexOf(n)] = fm.elements[n].value.trim(); });
        const dl = fm.elements["Date limite"].value; v[HEAD.indexOf("Date limite")] = dl ? frDate(parse(dl)) : "";
        try { await D.setRow(S.sheet, TAB, x.row, v); x.v = v; msg.textContent = "Enregistré ✓"; setTimeout(() => open("suivi"), 600); }
        catch (err) { msg.textContent = "Échec : " + err.message; }
      });
      fm.querySelector("[data-aide]").addEventListener("click", () => { S.aideId = field(x, "ID"); open("aide"); });
    });
  }

  /* ---------------- Aide à la réponse ---------------- */
  const DOCS = ["Statuts de l'association", "Récépissé de déclaration / NINEA", "Liste des membres du CA", "Dernier rapport d'activité", "Comptes / budget de l'année", "RIB de l'association", "Budget détaillé du projet", "Lettres de soutien des partenaires", "CV de l'équipe projet", "Photos et résultats (qualité de l'eau)"];
  async function tabAide(body) {
    if (!S.rows) await loadTracking(true);
    const rows = S.rows.filter((x) => field(x, "Statut") !== "Abandonné");
    if (!rows.length) { body.innerHTML = `<p class="notice">Commencez par suivre une opportunité (onglet Veille).</p>`; return; }
    const projects = (window.SF_PROJECTS || []).filter((p) => p.status === "live");
    const cur = rows.find((x) => field(x, "ID") === S.aideId) || rows[0];
    body.innerHTML = `
      <div class="grid-form">
        <label>Opportunité<select data-opp>${rows.map((x) => `<option value="${esc(field(x, "ID"))}"${x === cur ? " selected" : ""}>${esc(field(x, "Titre"))}</option>`).join("")}</select></label>
        <label>Projet à présenter<select data-proj>${projects.map((p, i) => `<option value="${i}">${esc(p.title)}</option>`).join("")}<option value="-1">Nouveau projet (à décrire)</option></select></label>
      </div>
      <div class="aide-grid">
        <div>
          <h3>Trame de réponse</h3>
          <textarea class="draft" rows="22" aria-label="Trame de réponse"></textarea>
          <div class="form-actions"><button class="btn btn-blue btn-sm" type="button" data-copy>Copier</button><a class="btn btn-outline btn-sm" data-claude target="_blank" rel="noopener">Améliorer avec Claude ↗</a><span class="form-msg"></span></div>
        </div>
        <aside>
          <h3>Pièces à préparer</h3>
          <ul class="checklist">${DOCS.map((d, i) => `<li><label><input type="checkbox" data-doc="${i}"> ${d}</label></li>`).join("")}</ul>
          <h3>Conseils</h3>
          <ul class="tips"><li>Lire en entier les critères d'éligibilité (pays, statut juridique, cofinancement).</li><li>Reprendre les mots-clés de l'appel dans les objectifs.</li><li>Chiffrer les résultats : sites suivis, prélèvements, personnes sensibilisées.</li><li>Prévoir une relecture par un autre membre du CA 3 jours avant la date limite.</li></ul>
        </aside>
      </div>`;
    const sel = body.querySelector("[data-opp]"), psel = body.querySelector("[data-proj]"), ta = body.querySelector(".draft");
    const ckKey = () => "sf-aide-" + sel.value;
    const render = () => {
      const x = rows.find((r) => field(r, "ID") === sel.value);
      const p = projects[+psel.value];
      const d = parse(field(x, "Date limite"));
      ta.value = [
        `DOSSIER DE CANDIDATURE — ${field(x, "Titre")}`,
        `Financeur : ${field(x, "Financeur") || "…"} · Montant visé : ${field(x, "Montant") || "…"} · Date limite : ${d ? frDate(d) : "…"}`,
        `Appel : ${field(x, "Lien") || "…"}`, "",
        "1. PRÉSENTATION DE L'ASSOCIATION",
        "Surfrider Foundation Sénégal (créée en novembre 2020) est le premier chapter d'Afrique subsaharienne du réseau Surfrider Foundation. L'association protège l'océan, le littoral et ceux qui en profitent, par le suivi citoyen de la qualité des eaux de baignade, la sensibilisation et le plaidoyer.",
        "Chiffres clés : 6 sites de baignade suivis à Dakar (Virage, Baie des Carpes, Ngor, Secret, Ouakam, Yoff) ; plus de 460 prélèvements depuis octobre 2023 ; un réseau de Saytoukat Géej (gardien·ne·s de la mer) formés ; analyses réalisées avec l'Institut Pasteur de Dakar.",
        "Partenaires : Ministère de l'Environnement, Ville de Dakar, communes de Ouakam, Ngor et Yoff, Institut Pasteur, IRD, GRET, Surfrider Foundation Europe, ambassades de France, du Portugal et d'Irlande.", "",
        "2. PROJET PROPOSÉ",
        p ? `${p.title} (${p.period}) — ${p.text}` : "Titre, lieu, durée, bénéficiaires…",
        ...(p && p.points ? p.points.map((t) => "• " + t) : []), "",
        "3. CONTEXTE ET PROBLÈME",
        "Pollution des eaux de baignade (rejets d'eaux usées, déchets plastiques), pression sur le littoral dakarois, manque de données publiques… (adapter aux priorités de l'appel)", "",
        "4. OBJECTIFS ET RÉSULTATS ATTENDUS",
        "Objectif général : …\nObjectifs spécifiques : 1) … 2) … 3) …\nIndicateurs : nombre de prélèvements, de sites suivis, de personnes sensibilisées, de décideurs mobilisés…", "",
        "5. ACTIVITÉS ET CALENDRIER", "Mois 1-3 : …\nMois 4-9 : …\nMois 10-12 : …", "",
        "6. BUDGET",
        `Montant demandé : ${field(x, "Montant") || "…"}\nPostes : analyses en laboratoire, matériel de prélèvement, indemnités des Saytoukat, sensibilisation, communication, frais de fonctionnement (≤ 10 %), cofinancements…`, "",
        "7. SUIVI-ÉVALUATION ET PÉRENNITÉ", "Rapports d'étape, données publiées sur surfrider.sn (carte de la qualité de l'eau), restitution publique…", "",
        "8. CONTACT", `Surfrider Foundation Sénégal — ${C.email} — ${C.phone}`,
      ].join("\n");
      const prompt = `Tu aides l'association Surfrider Foundation Sénégal à répondre à un appel à projets.\nAppel : ${field(x, "Titre")} (${field(x, "Lien") || "lien non renseigné"}).\nVoici notre trame ; améliore-la pour cet appel (critères, mots-clés, budget), en français, sans inventer de chiffres :\n\n${ta.value}`;
      body.querySelector("[data-claude]").href = "https://claude.ai/new?q=" + encodeURIComponent(prompt.slice(0, 6000));
      let ck = []; try { ck = JSON.parse(localStorage.getItem(ckKey()) || "[]"); } catch (e) {}
      body.querySelectorAll("[data-doc]").forEach((c) => { c.checked = ck.includes(+c.dataset.doc); });
    };
    sel.addEventListener("change", render); psel.addEventListener("change", render);
    body.querySelectorAll("[data-doc]").forEach((c) => c.addEventListener("change", () => {
      try { localStorage.setItem(ckKey(), JSON.stringify([...body.querySelectorAll("[data-doc]:checked")].map((x) => +x.dataset.doc))); } catch (e) {}
    }));
    body.querySelector("[data-copy]").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(ta.value); body.querySelector(".form-msg").textContent = "Copié ✓"; } catch (e) { ta.select(); }
    });
    render();
  }

  window.SF_RECHERCHE = { mount, kpi };
})();
