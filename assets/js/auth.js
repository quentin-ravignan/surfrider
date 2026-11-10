/* Espace membres — connexion Google (Google Identity Services).
   ---------------------------------------------------------------------------
   IMPORTANT — sécurité : ce site est statique (GitHub Pages). Ce contrôle
   d'accès sert à orienter les membres ; il ne protège pas des données à lui
   seul. Les données sensibles restent protégées là où elles sont stockées :
     • les applications AppSheet n'acceptent que les comptes autorisés dans
       AppSheet (Partager > utilisateurs) ;
     • le tableau de bord financier lit la Google Sheet avec le compte Google
       de la personne connectée : sans droit d'accès à la feuille, rien ne
       s'affiche.
   Aucune donnée privée n'est enregistrée dans ce dépôt. */
(function () {
  const C = window.SF_CONFIG;
  const KEY = "sf-member";

  const decode = (jwt) => {
    const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(b).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
  };
  const lower = (a) => (a || []).map((x) => x.toLowerCase());

  function roleOf(email) {
    email = (email || "").toLowerCase();
    if (lower(C.admins).includes(email)) return "admin";
    const s = lower(C.saytoukat);
    if (s.includes("*") || s.includes(email)) return "saytoukat";
    return "visitor";
  }
  // "member" : tout compte connecté (la page d'accueil de l'espace adapte ce qu'elle montre)
  const allowed = (role, need) => need === "member" ? true : need === "admin" ? role === "admin" : role === "admin" || role === "saytoukat";

  function getUser() {
    try {
      const u = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (u && u.exp * 1000 > Date.now()) return u;
    } catch (e) {}
    return null;
  }
  function setUser(u) { try { sessionStorage.setItem(KEY, JSON.stringify(u)); } catch (e) {} }
  function signOut() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
    location.reload();
  }

  function loadGIS() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve();
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client"; s.async = true;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const ROLE_LABEL = { get admin() { return T("Administrateur·rice"); }, saytoukat: "Saytoukat Géej", get visitor() { return T("Visiteur"); } };

  function memberBar(u) {
    return `<div class="member-bar">
      <div class="member-who">${u.picture ? `<img src="${u.picture}" alt="" referrerpolicy="no-referrer">` : ""}
        <div><strong>${u.name || u.email}</strong><br><small>${u.email} · ${ROLE_LABEL[u.role]}</small></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-outline btn-sm" href="membres.html">Espace membres</a>
      <button class="btn btn-dark btn-sm" type="button" id="sf-signout">Se déconnecter</button></div></div>`;
  }

  /* Affiche l'écran de connexion ou le contenu.
     need : "member" (tout compte connecté), "saytoukat", "admin". */
  async function guard({ need, root, title, render }) {
    const el = document.querySelector(root);
    const user = getUser();
    if (user && allowed(user.role, need)) {
      el.innerHTML = memberBar(user) + `<div id="sf-content"></div>`;
      document.getElementById("sf-signout").addEventListener("click", signOut);
      render(document.getElementById("sf-content"), user);
      return;
    }
    const denied = user && !allowed(user.role, need);
    el.innerHTML = `<div class="gate"><div class="card">
      <img src="assets/img/logo-symbole-couleur.jpg" alt="" style="width:90px;margin:0 auto 12px;border-radius:16px">
      <h2 style="font-size:2rem">${title}</h2>
      ${denied
        ? `<p class="notice" style="text-align:left">${T("Le compte {email} n'a pas accès à cette page. Contacte un·e administrateur·rice de l'association pour obtenir l'accès.", { email: "<strong>" + user.email + "</strong>" })}</p>
           <button class="btn btn-outline" type="button" id="sf-signout">Changer de compte</button>`
        : `<p>Connecte-toi avec ton compte Google pour accéder à cet espace réservé.</p><div id="sf-google-btn" style="display:flex;justify-content:center;min-height:44px"></div>`}
      <div id="sf-gate-extra"></div>
    </div></div>`;
    if (denied) { document.getElementById("sf-signout").addEventListener("click", signOut); return; }

    if (!C.googleClientId) {
      document.getElementById("sf-google-btn").outerHTML = `<p class="notice" style="text-align:left"><strong>Connexion Google pas encore configurée.</strong> Renseigne <code>googleClientId</code> dans <code>assets/js/config.js</code> (voir le README). En attendant, l'accès se fait directement par l'application AppSheet, qui vérifie elle-même ton compte.</p>`;
      if (guard.fallback) document.getElementById("sf-gate-extra").innerHTML = guard.fallback(need);
      return;
    }
    try {
      await loadGIS();
      google.accounts.id.initialize({
        client_id: C.googleClientId,
        auto_select: true,
        callback: (resp) => {
          const p = decode(resp.credential);
          if (!p.email_verified) return;
          setUser({ email: p.email, name: p.name, picture: p.picture, exp: p.exp, role: roleOf(p.email) });
          guard({ need, root, title, render });
        }
      });
      google.accounts.id.renderButton(document.getElementById("sf-google-btn"), { theme: "filled_blue", size: "large", shape: "pill", text: "signin_with", locale: "fr" });
    } catch (e) {
      document.getElementById("sf-google-btn").innerHTML = `<p class="notice">Impossible de charger la connexion Google. Vérifie ta connexion internet.</p>`;
    }
  }

  /* Jeton d'accès Google Sheets (lecture seule) avec le compte connecté */
  function sheetsToken(hint) {
    return new Promise(async (resolve, reject) => {
      try {
        await loadGIS();
        const client = google.accounts.oauth2.initTokenClient({
          client_id: C.googleClientId,
          scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
          hint, prompt: "",
          callback: (r) => (r.error ? reject(r) : resolve(r.access_token))
        });
        client.requestAccessToken();
      } catch (e) { reject(e); }
    });
  }
  async function readSheet(token, sheetId, range) {
    const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`, { headers: { Authorization: "Bearer " + token } });
    if (!r.ok) throw new Error(r.status === 403 ? "Ton compte n'a pas accès à cette feuille." : "Erreur " + r.status);
    return (await r.json()).values || [];
  }

  /* Bloc AppSheet : iframe + bouton d'ouverture dans un nouvel onglet */
  function appsheetBlock(url, label) {
    const embed = url.includes("?") ? url : url.replace("#", "?platform=desktop#");
    return `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <a class="btn btn-blue" href="${url}" target="_blank" rel="noopener">${label} ↗</a>
      </div>
      <iframe class="embed" src="${embed}" title="${label}" loading="lazy" allow="geolocation; camera"></iframe>
      <p style="font-size:.9rem;color:var(--muted);margin-top:8px">Si l'application ne s'affiche pas ici (connexion bloquée par le navigateur), utilise le bouton « ${label} ».</p>`;
  }

  window.SF_AUTH = { guard, getUser, signOut, roleOf, sheetsToken, readSheet, appsheetBlock };
})();
