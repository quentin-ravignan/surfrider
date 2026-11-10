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

  /* ---- Qualité de l'eau (Google Sheet « Surfrider Prélèvements ») -------
     La feuille doit être partagée « Tous les utilisateurs disposant du lien »
     en lecture pour que la carte se mette à jour automatiquement.
     Sinon, le site utilise l'instantané data/water-quality.json. */
  waterSheetId: "1Xlvqgqq6q4tiKu8tO3GrhI3ddBcH2ToRTxeHRWHADWM",
  waterSheetTab: "Synthèse",
  waterSheetRange: "A2:FM11",

  /* ---- Paiement Wave ---------------------------------------------------
     Lien de paiement marchand Wave Business de l'association.
     À récupérer dans l'app Wave Business > « Lien de paiement ».
     Exemple : "https://pay.wave.com/m/M_sn_XXXXXXXX/c/sn/"
     Le montant est ajouté automatiquement (?amount=…).
     Tant que ce champ est vide, la commande est envoyée par WhatsApp. */
  waveMerchantLink: "",

  /* ---- Espace membres (connexion Google) --------------------------------
     1. Créer un « ID client OAuth » (type Application Web) sur
        https://console.cloud.google.com/apis/credentials
     2. Ajouter l'URL du site dans « Origines JavaScript autorisées »
        (ex : https://quentin-ravignan.github.io)
     3. Coller l'ID ci-dessous. */
  googleClientId: "",

  /* Administrateurs : accès aux pages Finances et Projets (gestion) */
  admins: [
    "babacar@surfrider.sn",
    "claire@surfrider.sn",
    "paulele@surfrider.sn",
    "quentin@surfrider.sn",
    "marlene@surfrider.sn",
    "adama@surfrider.sn",
    "contact@surfrider.sn",
    "quentin.ravignan@gmail.com"
  ],

  /* Saytoukat Géej : accès à la page Prélèvements.
     Ajouter ici les adresses Gmail des gardien·ne·s de la mer.
     Les administrateurs y ont aussi accès. Pour ouvrir à tout compte
     connecté, mettre ["*"]. */
  saytoukat: [],

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

  /* Tableau de bord financier : ID de la Google Sheet qui alimente l'app
     AppSheet « SurfriderFoundation » (onglet Décaissements).
     Les données sont lues avec le compte Google de l'admin connecté :
     elles ne sont jamais publiques. Laisser vide pour masquer le tableau. */
  financeSheetId: "",
  financeSheetTab: "Décaissements",
  projectsSheetTab: "Projets"
};
