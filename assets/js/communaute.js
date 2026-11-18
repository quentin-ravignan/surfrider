/* Espace membres › Communauté (privé : admin et membres du CA)
   Projet « Réseau littoral » : carte des villes du littoral, acteurs à contacter,
   suivi des contacts et des actions (onglet « Communauté » de la feuille des
   finances). Données de base : data/communaute.js. */
(function () {
  const C = window.SF_CONFIG;
  const D = window.SF_DATA;
  const P = window.SF_COMMUNAUTE;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tidy = (s) => String(s ?? "").trim().replace(/\s+/g, " ");
  const pad = (n) => String(n).padStart(2, "0");
  const frDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const parse = (s) => { const m = tidy(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3], m[2] - 1, +m[1]) : null; };

  const TAB = "Communauté";
  const HEAD = ["ID", "Ville", "Organisation", "Type", "Personne contact", "Téléphone / email", "Statut", "Axes", "Dernier échange", "Prochaine étape", "Actions réalisées", "Notes", "Ajouté le"];
  const STATUSES = ["À contacter", "Contacté", "Rencontre faite", "Partenaire", "Actions en cours", "Relais Surfrider", "En pause"];
  const LEVEL = { "À contacter": 0, "En pause": 0, "Contacté": 1, "Rencontre faite": 2, "Partenaire": 3, "Actions en cours": 3, "Relais Surfrider": 4 };
  const LEVEL_COLOR = ["#9AA7B4", "#F2A900", "#F2A900", "#0B7A47", "#0273BE"];
  const LEVEL_LABEL = ["Aucun contact", "Contact en cours", "Rencontre faite", "Partenaires / actions", "Relais Surfrider"];

  const S = { rows: null, sheet: null, map: null, town: null, user: null };
  const f = (x, n) => x.v[HEAD.indexOf(n)];

  async function loadRows(interactive = true) {
    S.sheet = D.financeSheet();
    if (!S.sheet) throw new Error("La feuille des finances n'est pas reliée (config.js › financeSheetId).");
    const info = await D.tabs(S.sheet, interactive);
    const rows = info.tabs.includes(TAB) ? await D.read(S.sheet, TAB, "", interactive) : [HEAD];
    S.rows = rows.slice(1).map((r, i) => ({ row: i + 2, v: HEAD.map((h, k) => tidy(r[k])) })).filter((x) => f(x, "Organisation"));
    return S.rows;
  }
  const townRows = (t) => (S.rows || []).filter((x) => f(x, "Ville") === t.name);
  // niveau d'une ville : relais Surfrider déclaré dans les données, sinon meilleur statut des contacts
  const townLevel = (t) => Math.max(t.relay ? 4 : 0, ...townRows(t).map((x) => LEVEL[f(x, "Statut")] ?? 0));

  async function kpi(interactive) {
    await loadRows(interactive);
    const covered = P.towns.filter((t) => townLevel(t) >= 3).length;
    const act = S.rows.filter((x) => /actions|partenaire|relais/i.test(f(x, "Statut"))).length;
    return { n: `${covered}/${P.towns.length}`, sub: `villes avec partenaires ou relais · ${S.rows.length} contacts suivis · ${act} actifs` };
  }

  function mount(panel, user, subTabs) {
    S.user = user;
    return subTabs(panel, "Communauté", [
      ["carte", "Carte & villes", tabCarte],
      ["suivi", "Suivi des contacts", tabSuivi],
      ["projet", "Le projet", tabProjet],
    ], "carte");
  }

  /* ---------------- Le projet ---------------- */
  function tabProjet(body) {
    const pr = P.project;
    body.innerHTML = `
      <div class="com-hero"><h3>${esc(pr.title)}</h3><p>${esc(pr.pitch)}</p></div>
      <h3>Quatre axes de travail</h3>
      <div class="com-axes">${Object.values(P.axes).map((a) => `<div class="com-axe" style="--c:${a.color}"><strong>${esc(a.label)}</strong><p>${esc(a.desc)}</p></div>`).join("")}</div>
      <h3>Étapes</h3>
      <ol class="com-phases">${pr.phases.map(([t, d, txt]) => `<li><strong>${esc(t)}</strong> <span class="tag">${esc(d)}</span><p>${esc(txt)}</p></li>`).join("")}</ol>
      <h3>Indicateurs de suivi</h3>
      <ul class="tips">${pr.indicators.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
      <p class="muted small-print">${P.towns.length} villes du littoral, de Saint-Louis au Cap Skirring. Les fiches et les acteurs se complètent dans l'onglet « Carte & villes ».</p>`;
  }

  /* ---------------- Carte & villes ---------------- */
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    return new Promise((res, rej) => {
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(css);
      const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }

  async function tabCarte(body, open) {
    try { await loadRows(true); } catch (e) { if (e.code === "auth") throw e; S.rows = []; }
    body.innerHTML = `
      <div class="com-layout">
        <div>
          <div id="com-map" class="com-map" role="region" aria-label="Carte du littoral sénégalais"></div>
          <div class="com-legend">${LEVEL_LABEL.map((l, i) => `<span><i style="background:${LEVEL_COLOR[i]}"></i>${l}</span>`).join("")}</div>
        </div>
        <div class="com-towns">${P.towns.map((t) => {
          const lv = townLevel(t), n = townRows(t).length;
          return `<button type="button" class="com-town" data-town="${t.id}"><i style="background:${LEVEL_COLOR[lv]}"></i><span><strong>${esc(t.name)}</strong><small>${esc(t.zone)} · ${n} contact(s)</small></span></button>`;
        }).join("")}</div>
      </div>
      <div class="com-detail" aria-live="polite"></div>`;
    await loadLeaflet();
    if (S.map) { S.map.remove(); S.map = null; }
    const map = L.map(body.querySelector("#com-map"), { scrollWheelZoom: false }).setView([14.3, -16.9], 7);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);
    S.map = map;
    P.towns.forEach((t) => {
      const lv = townLevel(t);
      L.circleMarker([t.lat, t.lng], { radius: 9 + lv, color: "#fff", weight: 2, fillColor: LEVEL_COLOR[lv], fillOpacity: 0.95 })
        .addTo(map).bindTooltip(t.name).on("click", () => showTown(t.id));
    });
    body.querySelectorAll("[data-town]").forEach((b) => b.addEventListener("click", () => showTown(b.dataset.town)));
    setTimeout(() => map.invalidateSize(), 50);
    showTown(S.town || "cap-skirring", false); // carte d'ensemble à l'ouverture

    function showTown(id, fly = true) {
      const t = P.towns.find((x) => x.id === id); if (!t) return;
      S.town = id;
      body.querySelectorAll("[data-town]").forEach((b) => b.classList.toggle("is-on", b.dataset.town === id));
      if (fly) map.setView([t.lat, t.lng], Math.max(map.getZoom(), 9), { animate: true });
      const rows = townRows(t);
      const followed = new Set(rows.map((x) => f(x, "Organisation").toLowerCase()));
      const det = body.querySelector(".com-detail");
      det.innerHTML = `
        <div class="com-card">
          <div class="com-card-head"><h3>${esc(t.name)}</h3><span class="muted">${esc(t.region)} · ${esc(t.zone)}</span>${t.relay ? `<span class="tag tag-admin">${esc(t.relay)}</span>` : ""}</div>
          <p>${esc(t.issues)}</p>
          <div class="com-tags">${t.axes.map((a) => `<span class="tag" style="background:${P.axes[a].color}1a;color:${P.axes[a].color}">${esc(P.axes[a].label)}</span>`).join("")}</div>
          <h4>Acteurs à contacter</h4>
          <ul class="com-contacts">${t.contacts.map(([name, type], i) => `<li><span><strong>${esc(name)}</strong> <small class="muted">${esc(type)}</small></span>${followed.has(name.toLowerCase()) ? `<span class="tag tag-live">Suivi</span>` : `<button type="button" class="btn btn-outline btn-sm" data-add="${i}">Ajouter au suivi</button>`}</li>`).join("")}</ul>
          <h4>Suivi (${rows.length})</h4>
          ${rows.length ? `<ul class="com-follow">${rows.map((x) => `<li><strong>${esc(f(x, "Organisation"))}</strong> — <span class="tag">${esc(f(x, "Statut"))}</span>${f(x, "Prochaine étape") ? ` <span class="muted">· ${esc(f(x, "Prochaine étape"))}</span>` : ""}</li>`).join("")}</ul>` : `<p class="muted">Aucun contact suivi pour l'instant.</p>`}
          <details class="add-opp"><summary>+ Ajouter une association ou une personne</summary>
            <form class="form grid-form" data-new>
              <label>Organisation *<input name="org" required></label>
              <label>Type<input name="type" list="com-types" placeholder="Association, pêche, école…"></label>
              <label>Personne contact<input name="who"></label>
              <label>Téléphone / email<input name="tel"></label>
              <div class="form-actions"><button class="btn btn-blue btn-sm" type="submit">Ajouter</button><span class="form-msg"></span></div>
            </form></details>
          <datalist id="com-types">${["Association", "Pêche", "Femmes", "Aire protégée", "Collectivité", "École", "Surf", "Tourisme", "Recherche", "Relais Surfrider"].map((x) => `<option value="${x}">`).join("")}</datalist>
          <p><button type="button" class="linklike" data-goto>Voir le suivi détaillé →</button></p>
        </div>`;
      const add = async (org, type, who = "", tel = "") => {
        await D.ensureTab(S.sheet, TAB, HEAD);
        await D.append(S.sheet, TAB, ["c-" + Date.now().toString(36), t.name, org, type, who, tel, /relais surfrider/i.test(org) ? "Relais Surfrider" : "À contacter", t.axes.map((a) => P.axes[a].label).join(", "), "", "Premier contact", "", "", frDate(new Date())]);
        await loadRows(true);
      };
      det.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", async () => {
        const [org, type] = t.contacts[+b.dataset.add];
        b.disabled = true; b.textContent = "Ajout…";
        try { await add(org, type); open("carte"); } catch (e) { b.disabled = false; b.textContent = "Ajouter au suivi"; alert(e.code === "auth" ? "Autorise l'accès Google (bouton en haut) puis réessaie." : "Échec : " + e.message); }
      }));
      det.querySelector("[data-new]").addEventListener("submit", async (e) => {
        e.preventDefault();
        const fm = e.target, msg = fm.querySelector(".form-msg");
        msg.textContent = "Ajout…";
        try { await add(fm.org.value.trim(), fm.type.value.trim(), fm.who.value.trim(), fm.tel.value.trim()); open("carte"); }
        catch (err) { msg.textContent = "Échec : " + err.message; }
      });
      det.querySelector("[data-goto]").addEventListener("click", () => { S.filterTown = t.name; open("suivi"); });
    }
  }

  /* ---------------- Suivi des contacts ---------------- */
  async function tabSuivi(body, open) {
    await loadRows(true);
    const towns = P.towns.map((t) => t.name);
    body.innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>Contacts suivis</span><strong>${S.rows.length}</strong></div>
        <div class="kpi"><span>Villes avec contacts</span><strong>${new Set(S.rows.map((x) => f(x, "Ville"))).size}/${P.towns.length}</strong></div>
        <div class="kpi"><span>Partenaires et relais</span><strong>${S.rows.filter((x) => (LEVEL[f(x, "Statut")] || 0) >= 3).length}</strong></div>
        <div class="kpi"><span>À contacter</span><strong>${S.rows.filter((x) => f(x, "Statut") === "À contacter").length}</strong></div>
      </div>
      <div class="controls">
        <input type="search" placeholder="Rechercher (association, personne, action…)" aria-label="Rechercher">
        <select data-f="town" aria-label="Ville"><option value="">Toutes les villes</option>${towns.map((n) => `<option${n === S.filterTown ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>
        <select data-f="st" aria-label="Statut"><option value="">Tous les statuts</option>${STATUSES.map((s) => `<option>${s}</option>`).join("")}</select>
        <span class="tag" data-count></span>
        <a class="btn btn-outline btn-sm" href="https://docs.google.com/spreadsheets/d/${S.sheet}/edit" target="_blank" rel="noopener">Ouvrir la feuille ↗</a>
      </div>
      <div class="com-rows"></div>`;
    S.filterTown = "";
    const q = body.querySelector("input[type=search]"), ft = body.querySelector('[data-f="town"]'), fs = body.querySelector('[data-f="st"]');
    const order = (t) => { const i = towns.indexOf(t); return i < 0 ? 99 : i; };
    const draw = () => {
      const term = q.value.toLowerCase().trim();
      const L = S.rows.filter((x) => (!ft.value || f(x, "Ville") === ft.value) && (!fs.value || f(x, "Statut") === fs.value) && (!term || x.v.join(" ").toLowerCase().includes(term)))
        .sort((a, b) => order(f(a, "Ville")) - order(f(b, "Ville")));
      body.querySelector("[data-count]").textContent = L.length + " contact(s)";
      body.querySelector(".com-rows").innerHTML = L.map((x) => `
        <details class="com-row" data-row="${x.row}">
          <summary><i style="background:${LEVEL_COLOR[LEVEL[f(x, "Statut")] ?? 0]}"></i><span><strong>${esc(f(x, "Organisation"))}</strong> <small class="muted">${esc(f(x, "Ville"))}${f(x, "Type") ? " · " + esc(f(x, "Type")) : ""}</small></span><span class="tag">${esc(f(x, "Statut") || "À contacter")}</span>${f(x, "Dernier échange") ? `<small class="muted">${esc(f(x, "Dernier échange"))}</small>` : ""}</summary>
          <form class="form grid-form com-form">
            <label>Statut<select name="Statut">${STATUSES.map((s) => `<option${s === f(x, "Statut") ? " selected" : ""}>${s}</option>`).join("")}</select></label>
            <label>Dernier échange<input name="Dernier échange" type="date" value="${(() => { const d = parse(f(x, "Dernier échange")); return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : ""; })()}"></label>
            <label>Personne contact<input name="Personne contact" value="${esc(f(x, "Personne contact"))}"></label>
            <label>Téléphone / email<input name="Téléphone / email" value="${esc(f(x, "Téléphone / email"))}"></label>
            <label>Axes<input name="Axes" value="${esc(f(x, "Axes"))}"></label>
            <label>Prochaine étape<input name="Prochaine étape" value="${esc(f(x, "Prochaine étape"))}"></label>
            <label class="span-2">Actions réalisées<textarea name="Actions réalisées" rows="2">${esc(f(x, "Actions réalisées"))}</textarea></label>
            <label class="span-2">Notes<textarea name="Notes" rows="2">${esc(f(x, "Notes"))}</textarea></label>
            <div class="form-actions"><button class="btn btn-blue btn-sm" type="submit">Enregistrer</button>${/\d{6,}/.test(f(x, "Téléphone / email").replace(/\s/g, "")) ? `<a class="btn btn-outline btn-sm" href="https://wa.me/${(() => { const d = f(x, "Téléphone / email").replace(/\D/g, ""); return d.length === 9 ? "221" + d : d; })()}" target="_blank" rel="noopener">WhatsApp</a>` : ""}<span class="form-msg"></span></div>
          </form>
        </details>`).join("") || `<p class="muted">Aucun contact. Ajoutez-en depuis l'onglet « Carte & villes ».</p>`;
      body.querySelectorAll(".com-form").forEach((fm) => fm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const x = S.rows.find((r) => r.row === +fm.closest(".com-row").dataset.row);
        const msg = fm.querySelector(".form-msg"); msg.textContent = "Enregistrement…";
        const v = x.v.slice();
        ["Statut", "Personne contact", "Téléphone / email", "Axes", "Prochaine étape", "Actions réalisées", "Notes"].forEach((n) => { v[HEAD.indexOf(n)] = fm.elements[n].value.trim(); });
        const d = fm.elements["Dernier échange"].value; v[HEAD.indexOf("Dernier échange")] = d ? d.split("-").reverse().join("/") : "";
        try { await D.setRow(S.sheet, TAB, x.row, v); x.v = v; msg.textContent = "Enregistré ✓"; }
        catch (err) { msg.textContent = "Échec : " + err.message; }
      }));
    };
    [q, ft, fs].forEach((x) => x.addEventListener(x === q ? "input" : "change", draw));
    draw();
  }

  window.SF_COMMUNAUTE_UI = { mount, kpi };
})();
