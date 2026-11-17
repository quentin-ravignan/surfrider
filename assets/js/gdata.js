/* Espace membres — lecture ET écriture dans les Google Sheets de l'association
   ---------------------------------------------------------------------------
   Tout passe par le compte Google de la personne connectée :
     • lire une feuille  → il faut avoir accès à la feuille (lecteur) ;
     • ajouter/modifier → il faut être éditeur de la feuille.
   C'est le partage Google de chaque feuille qui protège réellement les données.
   Les photos sont envoyées dans le Google Drive de la personne connectée
   (dossier « Surfrider Sénégal – Photos prélèvements »), avec un lien
   enregistré dans la feuille. */
(function () {
  const C = window.SF_CONFIG;
  const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";
  const KEY = "sf-gtoken";
  let pending = null;

  function cached() {
    try {
      const t = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (t && t.exp > Date.now() + 60000 && t.scope === SCOPES) return t.token;
    } catch (e) {}
    return null;
  }

  /* Jeton d'accès. interactive=false : n'ouvre aucune fenêtre (renvoie null). */
  function token(interactive = true) {
    const c = cached();
    if (c) return Promise.resolve(c);
    if (!interactive) return Promise.resolve(null);
    if (pending) return pending;
    pending = new Promise((resolve, reject) => {
      const go = () => {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: C.googleClientId,
          scope: SCOPES,
          hint: SF_AUTH.getUser()?.email,
          prompt: "",
          callback: (r) => {
            pending = null;
            if (r.error) return reject(new Error(r.error_description || r.error));
            try { sessionStorage.setItem(KEY, JSON.stringify({ token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000, scope: SCOPES })); } catch (e) {}
            resolve(r.access_token);
          },
          error_callback: (e) => { pending = null; reject(new Error(e.type === "popup_closed" ? "Fenêtre Google fermée" : "La fenêtre Google a été bloquée")); }
        });
        client.requestAccessToken();
      };
      if (window.google?.accounts?.oauth2) go();
      else {
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client"; s.async = true;
        s.onload = go; s.onerror = () => { pending = null; reject(new Error("Connexion Google indisponible")); };
        document.head.appendChild(s);
      }
    });
    return pending;
  }
  function forget() { try { sessionStorage.removeItem(KEY); } catch (e) {} }

  async function api(url, opts = {}) {
    const tk = await token(opts.interactive !== false);
    if (!tk) throw Object.assign(new Error("auth"), { code: "auth" });
    const r = await fetch(url, Object.assign({}, opts, { headers: Object.assign({ Authorization: "Bearer " + tk }, opts.headers || {}) }));
    if (r.status === 401) { forget(); throw Object.assign(new Error("Session Google expirée, recharge la page."), { code: "auth" }); }
    if (!r.ok) {
      let msg = "Erreur " + r.status;
      try { msg = (await r.json()).error.message || msg; } catch (e) {}
      if (r.status === 403) msg = "Ton compte Google n'a pas les droits sur cette feuille (" + msg + ").";
      if (r.status === 404) msg = "Feuille introuvable : vérifie le lien.";
      throw new Error(msg);
    }
    return r.status === 204 ? null : r.json();
  }
  const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets/";
  const q = (tab) => `'${String(tab).replace(/'/g, "''")}'`;

  /* Lit un onglet entier (valeurs affichées, comme dans la feuille) */
  async function read(sheetId, tab, range = "", interactive = true) {
    const ref = q(tab) + (range ? "!" + range : "");
    const d = await api(`${SHEETS}${sheetId}/values/${encodeURIComponent(ref)}?valueRenderOption=FORMATTED_VALUE`, { interactive });
    return d.values || [];
  }
  /* Liste des onglets d'une feuille */
  async function tabs(sheetId, interactive = true) {
    const d = await api(`${SHEETS}${sheetId}?fields=properties.title,sheets.properties(title,sheetId)`, { interactive });
    return { title: d.properties.title, tabs: d.sheets.map((s) => s.properties.title) };
  }
  /* Ajoute une ligne à la fin d'un onglet */
  function append(sheetId, tab, row) {
    return api(`${SHEETS}${sheetId}/values/${encodeURIComponent(q(tab) + "!A1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: [row] })
    });
  }
  /* Modifie une cellule (ligne et colonne comptées à partir de 1) */
  function setCell(sheetId, tab, row, col, value) {
    return api(`${SHEETS}${sheetId}/values/${encodeURIComponent(q(tab) + "!" + colName(col) + row)}?valueInputOption=USER_ENTERED`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: [[value]] })
    });
  }
  function colName(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

  /* Photo → Google Drive (dossier créé par le site), renvoie le lien */
  const FOLDER = "Surfrider Sénégal – Photos prélèvements";
  async function folderId() {
    const found = await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)}&fields=files(id)`);
    if (found.files && found.files[0]) return found.files[0].id;
    const made = await api("https://www.googleapis.com/drive/v3/files?fields=id", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: FOLDER, mimeType: "application/vnd.google-apps.folder" })
    });
    return made.id;
  }
  async function shrink(file, max = 1600) {
    if (!/^image\//.test(file.type)) return file;
    try {
      const img = await createImageBitmap(file);
      const k = Math.min(1, max / Math.max(img.width, img.height));
      if (k >= 1 && file.size < 1.5e6) return file;
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((r) => c.toBlob((b) => r(b || file), "image/jpeg", 0.85));
    } catch (e) { return file; }
  }
  async function uploadPhoto(file, name) {
    const parent = await folderId();
    const blob = await shrink(file);
    const meta = { name: name + ".jpg", parents: [parent] };
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
    form.append("file", blob);
    const d = await api("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", { method: "POST", body: form });
    return d.webViewLink;
  }

  /* Identifiant de feuille depuis un lien complet */
  const sheetIdFrom = (s) => { const m = String(s || "").match(/\/d\/([a-zA-Z0-9_-]{20,})/); return m ? m[1] : String(s || "").trim(); };

  /* Feuille des finances : config.js, sinon réglage enregistré sur cet appareil */
  function financeSheet() {
    if (C.financeSheetId) return C.financeSheetId;
    try { return localStorage.getItem("sf-finance-sheet") || ""; } catch (e) { return ""; }
  }
  function setFinanceSheet(v) { try { localStorage.setItem("sf-finance-sheet", sheetIdFrom(v)); } catch (e) {} }

  window.SF_DATA = { token, forget, read, tabs, append, setCell, uploadPhoto, sheetIdFrom, financeSheet, setFinanceSheet, colName };
})();
