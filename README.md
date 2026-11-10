# Site web — Surfrider Foundation Sénégal

Site statique (HTML/CSS/JS, sans étape de build), prêt pour **GitHub Pages**.

## Pages

| Page | Fichier | Accès |
|---|---|---|
| Accueil | `index.html` | Public |
| Qualité de l'eau (carte + historique) | `qualite-eau.html` | Public |
| Nos projets | `projets.html` | Public |
| Partenaires | `partenaires.html` | Public |
| Shop (paiement Wave) | `shop.html` | Public |
| Contact & équipe | `contact.html` | Public |
| Game (jeu de surf 3D) | `game.html` | Public |
| Espace membres | `membres.html` | Compte Google |
| Prélèvements (AppSheet) | `prelevements.html` | Saytoukat + admins |
| Finances (décaissements + tableau de bord) | `finances.html` | Admins |
| Gestion des projets (AppSheet) | `gestion-projets.html` | Admins |

## Configuration — un seul fichier : `assets/js/config.js`

### 1. Paiement Wave (shop)
Dans l'app **Wave Business**, récupérer le lien de paiement marchand et le coller dans `waveMerchantLink`.
Tant qu'il est vide, les commandes partent sur WhatsApp et l'équipe envoie le lien de paiement.
Les **prix** et produits sont dans `assets/js/shop.js` (valeurs indicatives à ajuster).

### 2. Connexion Google (espace membres)
1. Aller sur <https://console.cloud.google.com/apis/credentials> avec le compte de l'association.
2. *Créer des identifiants > ID client OAuth > Application Web*.
3. Dans **Origines JavaScript autorisées**, ajouter l'adresse du site (ex. `https://quentin-ravignan.github.io` et/ou `https://www.surfrider.sn`).
4. Activer l'API **Google Sheets** dans le projet (pour le tableau de bord financier).
5. Coller l'ID client dans `googleClientId`.

Listes d'accès : `admins` (Finances + Projets + Prélèvements) et `saytoukat` (Prélèvements).

### 3. Tableau de bord financier
Renseigner `financeSheetId` avec l'identifiant de la Google Sheet qui alimente l'app AppSheet « SurfriderFoundation »
(onglets `Décaissements` et `Projets`). Les données sont lues **avec le compte de la personne connectée** :
elles ne sont jamais publiées dans ce dépôt.

### 4. Qualité de l'eau
La carte lit en direct l'onglet **Synthèse** de la feuille « Surfrider Prélèvements » (`waterSheetId`).
Si la feuille n'est plus publique, le site utilise l'instantané `data/water-quality.json`.

## Langues : Français · English · Wolof
Le site est écrit en français ; un sélecteur **FR / EN / WO** dans le menu bascule la langue (mémorisée dans le navigateur, et reprise par le jeu).
- Les traductions sont dans `assets/i18n/en.js` et `assets/i18n/wo.js` : clé = texte français exact, valeur = traduction.
- Pour corriger une traduction, modifier directement la valeur dans ces fichiers (ou dans `assets/i18n/translations.py`, qui contient les 3 langues côte à côte, puis lancer `python assets/i18n/translations.py assets/i18n`).
- Un texte ajouté ou modifié en français et absent du dictionnaire reste affiché en français. Pour lister les textes d'une page : ouvrir la console du navigateur et taper `SF_I18N.extract()`.
- ⚠️ Le **wolof** a été rédigé avec soin mais doit être relu par un·e locuteur·rice natif·ve avant diffusion.

## ⚠️ Sécurité
Le site est statique : la connexion Google sert à orienter les membres, **elle ne protège pas des données à elle seule**.
La vraie protection est assurée par :
- **AppSheet** : n'autoriser que les comptes voulus (*Share app* > utilisateurs, « Require sign-in »).
- **Google Sheets** : ne partager les feuilles financières qu'avec les membres du bureau.

Ne jamais mettre de données personnelles (téléphones, CNI, montants…) dans ce dépôt, qui est public.

## Mise en ligne (GitHub Pages)
*Settings > Pages > Build and deployment > Deploy from a branch > `main` / `(root)`*.
Pour garder le domaine `www.surfrider.sn`, ajouter un fichier `CNAME` contenant `www.surfrider.sn`
et faire pointer le DNS vers GitHub Pages.

## Tester en local
```bash
python -m http.server 8000
```
puis ouvrir <http://localhost:8000>.
