/**
 * Shop Surfrider Sénégal — paiement Wave Business (API Checkout)
 * ---------------------------------------------------------------------------
 * Ce script Google Apps Script fait le lien entre le site (statique) et Wave :
 *   1. le site lui envoie le panier ;
 *   2. il recalcule le total avec SES prix (le navigateur n'est pas cru sur parole),
 *      crée une session de paiement Wave et renvoie le lien de paiement ;
 *   3. au retour sur le site, il vérifie auprès de Wave que le paiement a réussi,
 *      met à jour la commande et prévient l'équipe par email.
 * Les commandes sont enregistrées dans l'onglet « Commandes » de la Google Sheet
 * à laquelle ce script est rattaché.
 * Il sert aussi le Hall of Fame du jeu « Surf & Nettoie » (game.html) : onglet
 * « Hall of Fame » de la même feuille (actions « score » et « hof »).
 *
 * La clé API Wave reste ici, côté serveur (jamais dans le site) : elle se met
 * dans Paramètres du projet › Propriétés du script › WAVE_API_KEY.
 * Installation pas à pas : voir wave/README.md.
 */

/* Prix en FCFA : doivent correspondre à ceux affichés dans assets/js/shop.js */
var PRICES = {
  'tee-poche': 10000,
  'tee-senegal': 10000,
  'hoodie': 20000
};
var DON_MIN = 500;              // don libre : montant minimum
var SITE_SHOP_URL = 'https://quentin-ravignan.github.io/surfrider/shop.html';
var NOTIFY_EMAIL = 'contact@surfrider.sn';
/* Google Sheet des commandes (laisser vide si le script est créé depuis la feuille : Extensions › Apps Script) */
var ORDERS_SHEET_ID = '1QVJnesri0SoOlpadunoAcIrQlIbCc80jMRdFEWUBaGg'; // « Site Web 2.0 Data » (onglet Commandes)
var SHEET_NAME = 'Commandes';
var HEADERS = ['Date', 'Référence', 'Statut', 'Total (FCFA)', 'Nom', 'Téléphone', 'Livraison / retrait', 'Articles', 'Session Wave', 'Payé le', 'ID transaction Wave'];

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (req.action === 'checkout') return json_(checkout_(req));
    if (req.action === 'score') return json_(addScore_(req));
    return json_({ error: 'Action inconnue' });
  } catch (err) {
    return json_({ error: String(err && err.message || err) });
  }
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === 'status' && p.ref) return json_(status_(String(p.ref)));
    if (p.action === 'hof') return json_(hallOfFame_(String(p.spot || '')));
    return json_({ ok: true, service: 'Surfrider Sénégal – paiement Wave' });
  } catch (err) {
    return json_({ error: String(err && err.message || err) });
  }
}

/* ---------- Création de la session de paiement ---------- */
function checkout_(req) {
  var items = Array.isArray(req.items) ? req.items : [];
  if (!items.length || items.length > 30) throw new Error('Panier vide ou invalide');
  var c = req.customer || {};
  var name = clean_(c.name, 80), phone = clean_(c.phone, 30), delivery = clean_(c.delivery, 200);
  if (!name || !phone) throw new Error('Nom et téléphone obligatoires');

  var total = 0, lines = [];
  items.forEach(function (it) {
    var id = String(it.id || '');
    var qty = Math.floor(Number(it.qty));
    if (!(qty >= 1 && qty <= 20)) throw new Error('Quantité invalide');
    var unit;
    if (id === 'don') {
      unit = Math.floor(Number(it.amount));
      if (!(unit >= DON_MIN && unit <= 5000000)) throw new Error('Montant du don invalide');
    } else if (PRICES.hasOwnProperty(id)) {
      unit = PRICES[id];
    } else {
      throw new Error('Article inconnu : ' + id);
    }
    total += unit * qty;
    var opts = [clean_(it.variant, 60), clean_(it.size, 20)].filter(String).join(', ');
    lines.push(qty + ' × ' + clean_(it.name, 80) + (opts ? ' (' + opts + ')' : '') + ' — ' + unit * qty + ' FCFA');
  });

  var ref = 'SFS-' + Utilities.formatDate(new Date(), 'Africa/Dakar', 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  var session = wave_('post', '/v1/checkout/sessions', {
    amount: String(total),
    currency: 'XOF',
    client_reference: ref,
    success_url: SITE_SHOP_URL + '?paiement=ok&ref=' + encodeURIComponent(ref),
    error_url: SITE_SHOP_URL + '?paiement=erreur&ref=' + encodeURIComponent(ref)
  });

  sheet_().appendRow([new Date(), ref, 'En attente de paiement', total, name, "'" + phone, delivery, lines.join('\n'), session.id, '', '']);
  return { ref: ref, url: session.wave_launch_url, total: total };
}

/* ---------- Vérification du paiement au retour sur le site ---------- */
function status_(ref) {
  if (!/^SFS-[0-9]{6}-[A-Z0-9]{5}$/.test(ref)) throw new Error('Référence invalide');
  var sh = sheet_();
  var data = sh.getDataRange().getValues();
  var rowIdx = -1;
  for (var i = 1; i < data.length; i++) if (data[i][1] === ref) { rowIdx = i; break; }
  if (rowIdx < 0) throw new Error('Commande introuvable');
  var row = data[rowIdx];
  if (row[2] === 'Payée') return { ref: ref, status: 'succeeded', total: row[3] };

  var s = wave_('get', '/v1/checkout/sessions/' + encodeURIComponent(row[8]));
  var status = s.payment_status === 'succeeded' ? 'succeeded'
    : s.checkout_status === 'expired' ? 'expired'
    : s.payment_status === 'cancelled' ? 'cancelled' : 'processing';
  var label = { succeeded: 'Payée', expired: 'Expirée (non payée)', cancelled: 'Paiement échoué', processing: 'En attente de paiement' }[status];
  sh.getRange(rowIdx + 1, 3).setValue(label);
  if (status === 'succeeded') {
    sh.getRange(rowIdx + 1, 10).setValue(s.when_completed ? new Date(s.when_completed) : new Date());
    sh.getRange(rowIdx + 1, 11).setValue(s.transaction_id || '');
    try {
      MailApp.sendEmail(NOTIFY_EMAIL, 'Shop : nouvelle commande payée ' + ref,
        'Commande ' + ref + ' payée par Wave (' + row[3] + ' FCFA).\n\n' +
        'Nom : ' + row[4] + '\nTéléphone : ' + String(row[5]) + '\nLivraison / retrait : ' + row[6] + '\n\n' + row[7] +
        '\n\nToutes les commandes : ' + book_().getUrl());
    } catch (e) { /* l'email est un bonus : la commande reste enregistrée */ }
  }
  return { ref: ref, status: status, total: row[3] };
}

/* ---------- Utilitaires ---------- */
function wave_(method, path, body) {
  var key = PropertiesService.getScriptProperties().getProperty('WAVE_API_KEY');
  if (!key) throw new Error('Clé API Wave manquante (propriété WAVE_API_KEY)');
  var opts = { method: method, headers: { Authorization: 'Bearer ' + key }, muteHttpExceptions: true };
  if (body) { opts.contentType = 'application/json'; opts.payload = JSON.stringify(body); }
  var r = UrlFetchApp.fetch('https://api.wave.com' + path, opts);
  var txt = r.getContentText();
  var data = {};
  try { data = JSON.parse(txt); } catch (e) {}
  if (r.getResponseCode() >= 300) throw new Error('Wave : ' + (data.message || data.code || r.getResponseCode()));
  return data;
}

/* ---------- Jeu « Surf & Nettoie » : Hall of Fame ----------
   Les scores sont enregistrés dans l'onglet « Hall of Fame » de la même feuille.
   Le jeu affiche le meilleur score de chaque pseudo (tous spots et par spot). */
var HOF_SHEET = 'Hall of Fame';
var HOF_HEADERS = ['Date', 'Pseudo', 'Score', 'Spot', 'Surfeur', 'Océan propre (%)', 'Langue'];
var HOF_MAX_SCORE = 500000;   // au-delà, score refusé (impossible en 30 secondes)
var HOF_SPOTS = ['ouakam', 'secret', 'virage', 'ngor'];

function hofSheet_() {
  var ss = book_();
  var sh = ss.getSheetByName(HOF_SHEET);
  if (!sh) {
    sh = ss.insertSheet(HOF_SHEET);
    sh.appendRow(HOF_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HOF_HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function addScore_(req) {
  var name = clean_(req.name, 16).replace(/[<>"`]/g, '');
  var score = Math.round(Number(req.score));
  var spot = clean_(req.spot, 20).toLowerCase();
  if (name.length < 2) throw new Error('Pseudo trop court');
  if (!isFinite(score) || score <= 0 || score > HOF_MAX_SCORE) throw new Error('Score invalide');
  if (HOF_SPOTS.indexOf(spot) < 0) throw new Error('Spot inconnu');
  // anti-abus simple : 40 scores par minute au maximum pour tout le site
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get('hof-rate') || 0);
  if (n >= 40) throw new Error('Trop de scores en même temps, réessaie dans une minute');
  cache.put('hof-rate', String(n + 1), 60);
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    hofSheet_().appendRow([new Date(), name, score, spot, clean_(req.char, 30), Math.max(0, Math.min(100, Math.round(Number(req.clean) || 0))), clean_(req.lang, 2)]);
  } finally { lock.releaseLock(); }
  cache.remove('hof-all'); cache.remove('hof-' + spot);
  var hof = hallOfFame_(spot);
  hof.rank = rankOf_(name, score, spot);
  return hof;
}

/* Meilleur score par pseudo : top 10 tous spots + top 10 du spot demandé */
function hallOfFame_(spot) {
  var cache = CacheService.getScriptCache();
  var key = spot ? 'hof-' + spot : 'hof-all';
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var rows = hofRows_();
  var out = { ok: true, all: top_(rows, ''), spot: spot, spotTop: spot ? top_(rows, spot) : [], players: countPlayers_(rows) };
  cache.put(key, JSON.stringify(out), 60);
  return out;
}

function hofRows_() {
  var sh = hofSheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 5).getValues().map(function (r) {
    return { date: r[0], name: String(r[1]), score: Number(r[2]) || 0, spot: String(r[3]), char: String(r[4]) };
  });
}

function best_(rows, spot) {
  var by = {};
  rows.forEach(function (r) {
    if (spot && r.spot !== spot) return;
    var k = r.name.toLowerCase();
    if (!by[k] || r.score > by[k].score) by[k] = r;
  });
  return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.score - a.score; });
}

function top_(rows, spot) {
  return best_(rows, spot).slice(0, 10).map(function (r) {
    return { name: r.name, score: r.score, spot: r.spot, char: r.char, date: Utilities.formatDate(new Date(r.date), 'Africa/Dakar', 'dd/MM/yyyy') };
  });
}

function rankOf_(name, score, spot) {
  var rows = hofRows_(), k = name.toLowerCase();
  var place = function (list) { for (var i = 0; i < list.length; i++) if (list[i].name.toLowerCase() === k) return i + 1; return 0; };
  return { all: place(best_(rows, '')), spot: place(best_(rows, spot)) };
}

function countPlayers_(rows) { var s = {}; rows.forEach(function (r) { s[r.name.toLowerCase()] = 1; }); return Object.keys(s).length; }

function book_() { return ORDERS_SHEET_ID ? SpreadsheetApp.openById(ORDERS_SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_() {
  var ss = book_();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function clean_(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* À lancer une fois à l'installation : crée l'onglet « Commandes » (et fait autoriser le script) */
function setup() {
  sheet_();
  Logger.log('Onglet « ' + SHEET_NAME + ' » prêt : ' + book_().getUrl());
  Logger.log(PropertiesService.getScriptProperties().getProperty('WAVE_API_KEY') ? 'Clé API Wave présente.' : 'Clé API Wave à ajouter (Paramètres du projet › Propriétés du script › WAVE_API_KEY).');
}

/* À lancer une fois depuis l'éditeur pour vérifier la clé : Exécuter › testWave */
function testWave() {
  var s = wave_('post', '/v1/checkout/sessions', {
    amount: '100', currency: 'XOF', client_reference: 'TEST',
    success_url: SITE_SHOP_URL, error_url: SITE_SHOP_URL
  });
  Logger.log('OK, session de test créée : ' + s.id + ' → ' + s.wave_launch_url);
  wave_('post', '/v1/checkout/sessions/' + s.id + '/expire');
  Logger.log('Session de test fermée.');
}
