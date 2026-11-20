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
  // Connexion = un seul clic : identité Google + accès aux Google Sheets de l'association,
  // pour que les chiffres s'affichent tout de suite (plus d'étape « Autoriser » séparée).
  const TOKEN_KEY = "sf-gtoken";
  const SHEETS_SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file"; // = gdata.js
  const LAST = "sf-last-email";
  const store = window.localStorage; // garde la session entre les onglets (jeton Google valable 1 h)

  const decode = (jwt) => {
    const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(b).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
  };
  const lower = (a) => (a || []).map((x) => x.toLowerCase());

  function roleOf(email) {
    email = (email || "").toLowerCase();
    if (lower(C.admins).includes(email)) return "admin";
    if (lower(C.ca).includes(email)) return "ca";
    const s = lower(C.saytoukat);
    if (s.includes("*") || s.includes(email)) return "saytoukat";
    return "adherent";
  }
  // "member" : tout compte connecté (le tableau de bord adapte ce qu'il montre au rôle)
  const allowed = (role, need) => need === "member" ? true : need === "admin" ? role === "admin" : need === "ca" ? role === "admin" || role === "ca" : role === "admin" || role === "saytoukat";

  function getUser() {
    try {
      const u = JSON.parse(store.getItem(KEY) || "null");
      if (u && u.exp * 1000 > Date.now()) return Object.assign(u, { role: roleOf(u.email) }); // rôle recalculé à chaque visite
    } catch (e) {}
    return null;
  }
  function setUser(u) { try { store.setItem(KEY, JSON.stringify(u)); store.setItem(LAST, u.email); } catch (e) {} }
  function signOut() {
    try { store.removeItem(KEY); store.removeItem(TOKEN_KEY); sessionStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  }

  /* Connexion : une seule fenêtre Google qui donne l'identité ET l'accès aux feuilles */
  function signIn() {
    return new Promise(async (resolve, reject) => {
      try {
        await loadGIS();
        let hint = ""; try { hint = store.getItem(LAST) || ""; } catch (e) {}
        const client = google.accounts.oauth2.initTokenClient({
          client_id: C.googleClientId,
          scope: "openid email profile " + SHEETS_SCOPES,
          hint, prompt: "",
          callback: async (r) => {
            if (r.error) return reject(new Error(r.error_description || r.error));
            try {
              const info = await (await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: "Bearer " + r.access_token } })).json();
              if (!info.email || info.email_verified === false) throw new Error("Adresse Google non vérifiée");
              const exp = Date.now() + (r.expires_in || 3600) * 1000;
              setUser({ email: info.email, name: info.name, picture: info.picture, exp: Math.floor(exp / 1000), role: roleOf(info.email) });
              // accès aux feuilles accordé (la personne peut le décocher dans la fenêtre Google)
              if (google.accounts.oauth2.hasGrantedAllScopes(r, ...SHEETS_SCOPES.split(" "))) {
                try { store.setItem(TOKEN_KEY, JSON.stringify({ token: r.access_token, exp, scope: SHEETS_SCOPES })); } catch (e) {}
              }
              resolve();
            } catch (e) { reject(e); }
          },
          error_callback: (e) => reject(new Error(e.type === "popup_closed" ? "Fenêtre Google fermée" : "La fenêtre Google a été bloquée"))
        });
        client.requestAccessToken();
      } catch (e) { reject(e); }
    });
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

  const ROLE_LABEL = { get admin() { return T("Administrateur·rice"); }, get ca() { return T("Membre du CA"); }, saytoukat: "Saytoukat Géej", get adherent() { return T("Adhérent·e"); } };

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
        : `<p>Connecte-toi avec ton compte Google pour accéder à cet espace réservé.</p><div id="sf-google-btn" style="display:flex;flex-direction:column;align-items:center;gap:8px;min-height:44px"></div>`}
      <div id="sf-gate-extra"></div>
    </div></div>`;
    if (denied) { document.getElementById("sf-signout").addEventListener("click", signOut); return; }

    if (!C.googleClientId) {
      document.getElementById("sf-google-btn").outerHTML = `<p class="notice" style="text-align:left"><strong>Connexion Google pas encore configurée.</strong> Renseigne <code>googleClientId</code> dans <code>assets/js/config.js</code> (voir le README). En attendant, l'accès se fait directement par l'application AppSheet, qui vérifie elle-même ton compte.</p>`;
      if (guard.fallback) document.getElementById("sf-gate-extra").innerHTML = guard.fallback(need);
      return;
    }
    const box = document.getElementById("sf-google-btn");
    box.innerHTML = `<button type="button" class="btn-google"><svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z"/><path fill="#FBBC05" d="M10.6 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg><span>Se connecter avec Google</span></button><p class="muted" style="font-size:.85rem;margin:0"></p>`;
    const btn = box.querySelector("button"), msg = box.querySelector("p");
    btn.addEventListener("click", async () => {
      btn.disabled = true; msg.textContent = "";
      try { await signIn(); guard({ need, root, title, render }); }
      catch (e) { btn.disabled = false; msg.textContent = "Connexion impossible : " + e.message; }
    });
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

  window.SF_AUTH = { guard, getUser, signOut, signIn, roleOf, sheetsToken, readSheet, appsheetBlock };
})();
