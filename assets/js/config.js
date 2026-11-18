/* =========================================================================
   Surfrider Foundation Sénégal — configuration centrale du site
   -------------------------------------------------------------------------
   Tout ce qui est susceptible de changer (liens, emails, numéros, prix…)
   se modifie ICI, sans toucher au reste du code.
   ========================================================================= */
window.SF_CONFIG = {
  /* ---- Contact & réseaux ------------------------------------------------ */
  email: "contact@surfrider.sn",
  phone: "+221 77 475 37 10",
  whatsapp: "221774753710",                 // format international sans « + »
  instagram: "https://www.instagram.com/surfridersenegal/",
  facebook: "https://www.facebook.com/surfridersenegal",
  linkedin: "https://www.linkedin.com/company/surfrider-foundation-senegal",

  /* ---- Données du site : Google Sheet « Site Web 2.0 Data » ------------
     Toutes les données de l'espace membres sont lues et écrites ici :
     prélèvements, Saytoukat, décaissements, projets, adhésions, soldes des
     comptes, recherche de financements, communauté. Elle contient des
     données personnelles et financières : ne JAMAIS la partager
     publiquement. La partager (éditeur) avec les admins, le CA et les
     Saytoukat. Les anciennes feuilles (« Surfrider Prélèvements » et
     « App Surfrider Foundation - BDD ») restent en archive pour AppSheet. */
  dataSheetId: "1QVJnesri0SoOlpadunoAcIrQlIbCc80jMRdFEWUBaGg",

  /* ---- Qualité de l'eau : carte publique ------------------------------
     La carte lit l'onglet « Synthèse ». Comme la feuille de données n'est
     pas publique, on publie SEULEMENT cet onglet : dans la feuille,
     Fichier > Partager > Publier sur le Web > onglet « Synthèse » > CSV,
     puis coller le lien ci-dessous (https://docs.google.com/…/pub?…output=csv).
     Tant que ce lien est vide, la carte lit l'ancienne feuille publique
     « Surfrider Prélèvements » (waterSheetId), puis l'instantané
     data/water-quality.json. */
  waterPublicCsv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSekpbHJ4ktWnnjxmq3UF1Rth-UDAgbkDEfpfbG5I0olnRXbIQVVQ259CtaqjLV0L01_iTbYY9g5JWE/pub?gid=744359313&single=true&output=csv",
  waterSheetId: "1Xlvqgqq6q4tiKu8tO3GrhI3ddBcH2ToRTxeHRWHADWM", // ancienne feuille publique (archive)
  waterSheetTab: "Synthèse",
  waterSheetRange: "A2:FM11",

  /* ---- Paiement Wave ---------------------------------------------------
     Lien de paiement marchand Wave Business de l'association.
     À récupérer dans l'app Wave Business > « Lien de paiement ».
     Exemple : "https://pay.wave.com/m/M_sn_XXXXXXXX/c/sn/"
     Le montant est ajouté automatiquement (?amount=…).
     Tant que ce champ est vide, la commande est envoyée par WhatsApp. */
  waveMerchantLink: "",

  /* Paiement Wave Business automatique (API Checkout) : URL « /exec » du
     script Google Apps Script qui garde la clé API Wave et enregistre les
     commandes. Installation : voir wave/README.md. Prioritaire sur
     waveMerchantLink une fois renseigné. */
  waveCheckoutUrl: "https://script.google.com/macros/s/AKfycbxW-uZzbtDc3GGdUE2ZWnAcfnUnHezOUlFW2oDfaNpezqz1OZtI2-RTPBzoDmS4hJQF/exec",

  /* ---- Espace membres (connexion Google) --------------------------------
     1. Créer un « ID client OAuth » (type Application Web) sur
        https://console.cloud.google.com/apis/credentials
     2. Ajouter l'URL du site dans « Origines JavaScript autorisées »
        (ex : https://quentin-ravignan.github.io)
     3. Coller l'ID ci-dessous. */
  googleClientId: "835654071271-9ol5lii5u1gkhtsnfr22dso679jtr6uf.apps.googleusercontent.com",

  /* ---- Rôles de l'espace membres (adresse du compte Google) -------------
     • admins    : tout voir, tout faire
     • ca        : membres du Conseil d'administration → Finances, Membres (adhérent·e·s), Projets
     • saytoukat : Saytoukat Géej → dépôt d'un prélèvement
     • tout autre compte connecté = adhérent·e → seulement le site public
     Le rôle est recalculé à chaque visite : une modification ici s'applique
     dès la publication. Penser aussi à partager les Google Sheets concernées
     (éditeur) avec les personnes. */
  admins: [
    "quentin@surfrider.sn",
    "quentin.ravignan@gmail.com",
    "contact@surfrider.sn"            // compte de l'association (propriétaire des feuilles et du script Wave)
  ],
  ca: [
    "babacar@surfrider.sn",
    "claire@surfrider.sn",
    "paulele@surfrider.sn",
    "adama@surfrider.sn",
    "marlene@surfrider.sn"
  ],
  saytoukat: [],
  /* Noms et fonctions affichés dans la partie Membres */
  people: {
    "quentin@surfrider.sn": ["Quentin de Ravignan", "Responsable partenariats"],
    "quentin.ravignan@gmail.com": ["Quentin de Ravignan", "Responsable partenariats"],
    "contact@surfrider.sn": ["Surfrider Foundation Sénégal", "Compte de l'association"],
    "babacar@surfrider.sn": ["Babacar Thiaw", "Président"],
    "claire@surfrider.sn": ["Claire Stragier", "Directrice générale"],
    "paulele@surfrider.sn": ["Paulèle Cissé", "Trésorière"],
    "adama@surfrider.sn": ["Adama Samba", "Secrétaire"],
    "marlene@surfrider.sn": ["Marlène Menoux", "Responsable projets"]
  },

  /* ---- Applications AppSheet ------------------------------------------- */
  appsheet: {
    prelevements:
      "https://www.appsheet.com/start/04a198a2-2f3d-446f-b36b-5bfdc3903e8d#appName=SurfriderPr%C3%A9l%C3%A8vements-5302107&page=form&row=&table=Pr%C3%A9l%C3%A8vements&view=Pr%C3%A9l%C3%A8vements_Form",
    decaissements:
      "https://www.appsheet.com/start/4cde05a3-3a38-416e-87f9-9d2f474f0912#appName=SurfriderFoundation-5302107&group=%5B%7B%22Column%22%3A%22Status+%3A%22%2C%22Order%22%3A%22Ascending%22%7D%5D&page=fastTable&sort=%5B%7B%22Column%22%3A%22Horodateur+%3A%22%2C%22Order%22%3A%22Descending%22%7D%5D&table=D%C3%A9caissements&view=D%C3%A9caissements",
    demandeDecaissement:
      "https://www.appsheet.com/start/4cde05a3-3a38-416e-87f9-9d2f474f0912#table=D%C3%A9caissements&page=form&defaults=%5B%5D",
    projets:
      "https://www.appsheet.com/start/4cde05a3-3a38-416e-87f9-9d2f474f0912#appName=SurfriderFoundation-5302107&group=%5B%5D&page=deck&sort=%5B%5D&table=Projets&view=Projets"
  },

  /* Finances (espace membres) : ID de la Google Sheet des décaissements
     (celle qui alimentait l'app AppSheet « SurfriderFoundation », onglets
     Décaissements et Projets). Le site y lit le suivi et y ajoute les
     demandes avec le compte Google de l'admin connecté (éditeur requis).
     Tant que ce champ est vide, chaque admin peut coller le lien de la
     feuille dans la partie Finances (retenu sur son appareil). */
  financeSheetId: "1QVJnesri0SoOlpadunoAcIrQlIbCc80jMRdFEWUBaGg", // « Site Web 2.0 Data »
  financeSheetTab: "Décaissements",
  projectsSheetTab: "Projets",

  /* Page « Membres » (admins) : annuaires lus avec le compte Google connecté.
     Les colonnes sensibles (CNI, numéro Wave) ne sont jamais affichées. */
  saytoukatSheetId: "1QVJnesri0SoOlpadunoAcIrQlIbCc80jMRdFEWUBaGg", // « Site Web 2.0 Data »
  saytoukatTab: "Saytoukat",
  /* Liste des adhérent·e·s de l'association (Google Sheet avec une ligne
     d'en-tête : Nom, Email, Téléphone, Date d'adhésion…). Laisser vide si
     elle n'existe pas encore. */
  membersSheetId: "1QVJnesri0SoOlpadunoAcIrQlIbCc80jMRdFEWUBaGg", // « Site Web 2.0 Data »
  membersTab: "Adhésions"
};
