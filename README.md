

# 🧬 Ebola RDC

### Observatoire des cas et décès

## 🌍 Présentation

**Ebola RDC** rassemble les cas et les décès dans une interface qui facilite la lecture des chiffres, leur évolution dans le temps et leur répartition par zone de santé.

L’application exploite le fichier consolidé publié sur **Humanitarian Data Exchange (HDX)**. Chaque indicateur conserve sa date de référence pour permettre une lecture fidèle aux observations disponibles.

> [!NOTE]
> L’application inclut une copie réelle des données HDX. La période couverte et la date de récupération sont affichées dans le tableau de bord.

## ✨ Fonctionnalités

| | Fonctionnalité | Ce que vous pouvez faire |
| :---: | :--- | :--- |
| 📊 | **Indicateurs clés** | Consulter les cumuls de cas, de décès et la létalité brute lorsque le calcul est possible. |
| 📈 | **Évolution temporelle** | Explorer les observations publiées sur une période sélectionnée. |
| 📍 | **Zones de santé** | Choisir un périmètre et consulter le classement des zones documentées. |
| 🎛️ | **Filtres** | Séparer les cas confirmés des cas suspects et ajuster les dates. |
| 🔎 | **Tableau détaillé** | Rechercher une zone, trier les résultats et parcourir les pages. |
| 📥 | **Export CSV** | Télécharger les observations correspondant aux filtres sélectionnés. |
| 🔄 | **Actualisation HDX** | Récupérer les données depuis la source lorsque le serveur fonctionne. |
| 📱 | **Interface adaptative** | Consulter le tableau de bord sur ordinateur ou téléphone. |

## 📸 Captures d’écran

### Évolution des cas et classement des zones

<img width="470" height="857" alt="apercu" src="https://github.com/user-attachments/assets/686c3722-8a73-4793-a883-be0ecd036607" />

### 📈 Évolution des cas et décès

<img width="1920" height="1020" alt="Capture d&#39;écran 2026-10-31 135756" src="https://github.com/user-attachments/assets/3c2e493f-f3bb-4ecd-9dec-7189dcd2e831" />


### 📍 Données par zone de santé

<img width="1920" height="1020" alt="Capture d&#39;écran 2026-10-31 135814" src="https://github.com/user-attachments/assets/488c5309-6de2-4f91-ae7c-b44216089f33" />

## 🚀 Démarrage rapide

### Avec actualisation des données

**Prérequis : Node.js 22 ou une version plus récente.** Aucune dépendance à installer.

Depuis le dossier du projet :

```bash
npm start
```

Ouvrez ensuite **[http://127.0.0.1:4173](http://127.0.0.1:4173)** dans votre navigateur.

Sous Windows, vous pouvez aussi double-cliquer sur **`Demarrer.cmd`**. Gardez la fenêtre du serveur ouverte pendant l’utilisation ; `Ctrl+C` permet de l’arrêter.

### Consulter la copie locale

Ouvrez directement **`index.html`** dans un navigateur. Les filtres, graphiques, tableaux et exports fonctionnent avec les données incluses. L’actualisation depuis HDX nécessite le serveur.

## 🗂️ Structure du projet

```text
ebola-rdc/
├── index.html          # Structure de l’interface
├── style.css           # Styles et adaptation aux écrans
├── app.js              # Graphiques, filtres, tableau et export
├── model.js            # Sélection des observations et calculs
├── server.mjs          # Serveur local et actualisation HDX
├── lib.mjs             # Lecture CSV et normalisation des données
├── data.js             # Copie utilisable directement dans le navigateur
├── data/
│   ├── snapshot.json   # Observations normalisées et métadonnées
│   └── source.csv      # Fichier source complet
├── docs/captures/      # Captures d’écran du README
├── tests.mjs           # Vérifications des données et des calculs
├── package.json        # Commandes du projet
├── Demarrer.cmd        # Lancement sous Windows
└── README.md
```

## 🔗 Source et actualisation

**Jeu de données :** [République démocratique du Congo : Cas et Décès d’Ebola — HDX](https://data.humdata.org/dataset/republique-democratique-du-congo-cas-et-deces-d-ebola).

**Provenance indiquée dans les observations :** INRB-UMIE, rapports de situation INSP.

Le serveur récupère les métadonnées du jeu de données via l’API CKAN, puis télécharge sa ressource CSV :

```text
https://data.humdata.org/api/3/action/package_show?id=republique-democratique-du-congo-cas-et-deces-d-ebola
```

- **Vérification automatique :** lors d’une visite si la copie a plus de 24 heures, et toutes les 24 heures tant que le serveur fonctionne.
- **Vérification manuelle :** bouton **Actualiser**, avec au moins 60 secondes entre les tentatives.
- **Source inaccessible :** conservation de la dernière copie valide et affichage d’un message dans l’interface.

> [!TIP]
> La date de récupération indique quand l’application a téléchargé les fichiers. La date des observations indique jusqu’à quand les données sont disponibles : ces deux dates peuvent différer.

## 🧭 Comprendre les indicateurs

| Règle | Application dans le tableau de bord |
| :--- | :--- |
| **National et local séparés** | Les totaux nationaux ne sont jamais additionnés aux valeurs des zones de santé. |
| **Cumuls publiés** | Les cumuls de dates successives ne sont pas additionnés. |
| **Dates de référence visibles** | Chaque indicateur utilise le dernier relevé disponible au plus tard à la date de fin sélectionnée. |
| **Début de période** | Il filtre le graphique et l’export ; il ne transforme pas les cumuls en nouveaux cas. |
| **Classifications distinctes** | Les cas confirmés et suspects sont consultés séparément. |
| **Valeurs manquantes** | Le symbole `—` signale une absence de donnée ; une valeur manquante ne devient pas zéro. |
| **Zones non identifiées** | Les lignes concernées restent dans le fichier source et sont exclues du classement et du décompte des zones. |
| **Qualité de la source** | Les signalements disponibles, dont les saisies manuelles, sont conservés. |

La **létalité brute** est calculée ainsi :

```text
Létalité brute (%) = décès cumulés / cas cumulés × 100
```

Le calcul nécessite une même date, une même classification, un même périmètre et un nombre de cas supérieur à zéro.

> [!IMPORTANT]
> Les totaux nationaux publiés peuvent différer de la somme des zones de santé. L’application conserve ces niveaux séparément. La létalité brute est un rapport descriptif des observations publiées, pas une estimation individuelle du risque.

## 🧪 Vérifications

```bash
npm test
```

Les vérifications couvrent notamment la lecture CSV, la séparation des niveaux géographiques, les dates historiques, les classifications, les données manquantes, les doublons et le calcul de la létalité.

## 🛠️ Technologies

**Interface :** HTML, CSS, JavaScript et graphiques SVG.  
**Serveur :** Node.js et modules natifs, sans framework.  
**Données :** API CKAN HDX, CSV et JSON.

## 📦 État de la version

La version fournie fonctionne **localement**. Le serveur écoute sur `127.0.0.1` ; une publication sur Internet nécessite un hébergement adapté. Aucune URL de démonstration publique n’est incluse.

---

<div align="center">

**🇨🇩 Ebola RDC · Des données lisibles, une source traçable.**

</div>
