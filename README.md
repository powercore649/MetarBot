# 🛫 FlightUtilities — Bot Discord

**FlightUtilities** apporte les outils de l'aviation mondiale directement dans votre serveur Discord.
Idéal pour pilotes virtuels, stagiaires ATC et communautés de simulation de vol (MSFS, X-Plane, P3D, VATSIM/IVAO).

> ⚠️ **Ce bot est destiné à la simulation uniquement.** Il ne doit **jamais** être utilisé pour des opérations aériennes réelles.

---

## 📌 Fonctionnalités

### 🌤️ Météo
- **`/metar`** — Dernier METAR d'une station (**Formaté**, **Brut** ou **Les deux**)
  - Décodage complet : vent, visibilité, temps significatif, nuages, température/rosée, QNH, catégorie de vol (VFR/MVFR/IFR/LIFR)
  - Données en direct via NOAA / aviationweather.gov
- **`/taf`** — Dernier TAF, périodes et évolutions décodées

### 🏙️ Information aéroport
- **`/airport`** — Recherche par code ICAO (IATA accepté) :
  - Nom, ville, pays, coordonnées, altitude terrain
  - Détail des pistes (longueurs, surfaces, éclairage)
  - Fréquences (DEL, GND, TWR, ATIS, APP, DEP… si disponibles)
  - Base de données OurAirports (~10 000 aéroports) + repli automatique sur les stations météo connues

### 🎧 Réseaux en ligne
- **`/vatsim`** — Qui est en ligne sur votre aéroport :
  - Couverture DEL / GND / TWR / APP / DEP ✅/❌ avec fréquences
  - ATIS décodé, brut ou masqué
  - **Secteurs CTR/FSS englobants détectés automatiquement** (règle ICAO + table ARTCC pour les États-Unis)
  - Pilotes proches : indicatif, route, vitesse sol, type d'appareil
- **`/ivao`** — Identique, propulsé par le flux Whazzup d'IVAO

### 📡 Outils supplémentaires
- Liste des pilotes proches avec routes et groundspeeds
- Détection de l'ATC englobant par rayon géographique et par indicatif
- Pied de page d'avertissement « simulation uniquement » sur toutes les sorties

## 🖼️ Exemples

```
/metar icao:KLAX mode:formatted
/taf icao:EGLL
/airport code:YSSY
/vatsim icao:EGLL atis:decoded rayon_km:40
/ivao icao:LFPG
/help
```

## ⚙️ Installation

**Prérequis** : Node.js ≥ 18.17

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer
cp .env.example .env
#   → renseigner DISCORD_TOKEN et DISCORD_CLIENT_ID
#   (créez l'application sur https://discord.com/developers/applications,
#    onglet Bot, et invitez-la avec le scope applications.commands)

# 3. Enregistrer les commandes slash (global, ou instantané si DISCORD_GUILD_ID est défini)
npm run deploy

# 4. Lancer
npm start
```

Aucune configuration supplémentaire n'est requise : invitez le bot et utilisez les commandes.
Aucune donnée personnelle n'est collectée.

## ⚙️ Configuration (`.env`)

| Variable | Requis | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Token du bot |
| `DISCORD_CLIENT_ID` | ✅ | ID de l'application |
| `DISCORD_GUILD_ID` | ❌ | Serveur de test pour un enregistrement instantané des commandes |

## 🔌 Sources de données (publiques, sans clé API)

| Source | Usage |
|---|---|
| `aviationweather.gov` (NOAA) | METAR / TAF + cache des stations |
| `data.vatsim.net/v3` | Pilotes, ATC et ATIS VATSIM |
| `api.ivao.aero/v2` (Whazzup) | Pilotes, ATC et ATIS IVAO |
| OurAirports (`davidmegginson/ourairports-data`) | Aéroports, pistes, fréquences |

## 👨‍✈️ Pour qui ?

Communautés VATSIM/IVAO, compagnies virtuelles, serveurs Discord de simulation de vol, formation pilote/ATC.

## ⚠️ Avertissement

Ce bot est un outil de **simulation de vol uniquement**. Ne l'utilisez pas pour des opérations aériennes réelles. Les données affichées peuvent être incomplètes, retardées ou erronées.
