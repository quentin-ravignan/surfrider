# Paiement Wave du shop — installation (10 minutes)

Le site est statique (GitHub Pages) : il ne peut pas garder de secret. La clé API
Wave est donc placée dans un petit script Google Apps Script (gratuit) qui crée les
paiements et enregistre les commandes dans une Google Sheet.

## 1. Créer la feuille des commandes et le script
1. Avec le compte de l'association (contact@surfrider.sn), créer une Google Sheet
   « Shop – Commandes ».
2. Menu **Extensions › Apps Script**.
3. Remplacer le contenu de `Code.gs` par celui du fichier [`Code.gs`](Code.gs) de ce dossier.
   Vérifier en haut du fichier les prix (`PRICES`) et l'email de notification.

## 2. Ajouter la clé API Wave (jamais dans le site !)
1. Sur [business.wave.com/dev-portal](https://business.wave.com/dev-portal) (compte
   administrateur Wave Business) : créer une clé API avec le droit **Checkout API**.
2. Dans Apps Script : **⚙ Paramètres du projet › Propriétés du script › Ajouter** :
   - propriété : `WAVE_API_KEY`
   - valeur : la clé `wave_sn_prod_…`
3. Facultatif : sélectionner la fonction `testWave` et cliquer **Exécuter** (Google
   demande d'autoriser le script). Le journal doit afficher « OK, session de test créée ».

## 3. Publier le script
1. **Déployer › Nouveau déploiement › Type : Application Web**.
2. Exécuter en tant que : **Moi** · Qui a accès : **Tout le monde**.
3. Copier l'URL qui se termine par `/exec`.

## 4. Brancher le site
Coller l'URL dans `assets/js/config.js` :

```js
waveCheckoutUrl: "https://script.google.com/macros/s/XXXXXXXX/exec",
```

C'est tout : le bouton « Payer avec Wave » du panier ouvre alors Wave avec le bon
montant ; au retour, le site vérifie le paiement, la commande passe à « Payée »
dans la feuille et un email part vers contact@surfrider.sn.

## Bon à savoir
- **Changer un prix** : le modifier dans `assets/js/shop.js` (affichage) **et** dans
  `PRICES` de `Code.gs` (montant réellement demandé), puis **Déployer › Gérer les
  déploiements › Modifier › Nouvelle version**.
- Une session Wave expire au bout de 30 minutes : la commande reste alors « Expirée
  (non payée) » dans la feuille.
- Remboursement : depuis le portail Wave Business.
- Tant que `waveCheckoutUrl` est vide, le shop envoie la commande sur WhatsApp
  (comme avant).

## Hall of Fame du jeu « Surf & Nettoie »

Le même script enregistre les scores du jeu (game.html) dans l'onglet
« Hall of Fame » de la feuille des commandes (créé automatiquement au premier score).

Mise à jour du script (une fois, compte contact@surfrider.sn) :
1. Ouvrir le projet Apps Script « Shop Surfrider – Paiement Wave ».
2. Remplacer tout le contenu de `Code.gs` par celui de `wave/Code.gs`, puis Enregistrer.
3. Déployer › Gérer les déploiements › crayon sur « Shop - paiement Wave v1 »
   › Version : « Nouvelle version » › Déployer. L'URL `/exec` ne change pas.

Tant que ce n'est pas fait, le jeu garde les scores sur l'appareil du joueur.
Pour retirer un pseudo déplacé : supprimer sa ligne dans l'onglet « Hall of Fame »
(le classement se met à jour en une minute).
