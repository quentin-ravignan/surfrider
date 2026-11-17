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
var SHEET_NAME = 'Commandes';
var HEADERS = ['Date', 'Référence', 'Statut', 'Total (FCFA)', 'Nom', 'Téléphone', 'Livraison / retrait', 'Articles', 'Session Wave', 'Payé le', 'ID transaction Wave'];

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (req.action === 'checkout') return json_(checkout_(req));
    return json_({ error: 'Action inconnue' });
  } catch (err) {
    return json_({ error: String(err && err.message || err) });
  }
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === 'status' && p.ref) return json_(status_(String(p.ref)));
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
        '\n\nToutes les commandes : ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
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

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
