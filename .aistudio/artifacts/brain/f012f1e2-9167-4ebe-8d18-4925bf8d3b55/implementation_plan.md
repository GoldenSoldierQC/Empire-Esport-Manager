# Aegis Empire Manager — Phase II : Télémétrie Live, Semainier d'Entraînement & Replay Tick-par-Tick

Suite à l'audit comparatif avec la spécification *Age of Empires II Competitive Management Simulator*, cette mise à jour enrichit l'application avec les trois briques fondamentales retenues : **les courbes graphiques de télémétrie en direct en match** (score, économie, force militaire et décompte d'unités), **le semainier d'entraînement interactif (Lundi–Dimanche) par joueur**, et **le Mode Replay Post-Match avec scrubbing tick-par-tick et export JSON**.

---

## Revue Utilisateur & Décisions Clés Validées

> [!IMPORTANT]
> Les choix suivants ont été confirmés lors de l'analyse comparative du document de spécification et guident cette évolution.

- **Brique Spécification Retenue** : **Courbes live de score, économie et force militaire en match** (Section 4.C *Live Match Viewer* du document de référence — affichage graphique temps réel des courbes comparatives Bleu vs Rouge, répartition des unités militaires par famille et ajout de la carte *Nomad* mentionnée dans le document).
- **Planification Hors-Match Retenue** : **Semainier interactif (Lundi–Dimanche) avec blocs par joueur** (Section 1 & 4.A *Training Schedules* — programmation quotidienne par joueur avec prévisualisation de l'impact sur la réserve d'énergie par rapport au seuil critique de 75 %, la synergie d'équipe et la progression des attributs AoE2 : *Macro Speed*, *Micro Control*, *Wall/Defense Awareness*, *Adaptability*, *Mental Resilience*).
- **Nouvelle Brique Majeure (Brainstorming)** : **Mode Replay Post-Match avec analyse Tick-par-Tick et Export JSON** (curseur temporel interactif permettant de rejouer et d'inspecter n'importe quel tick d'une rencontre passée, visualiser l'état exact de l'arène et des formules $F_m(t)$, et exporter l'archive JSON complète).

---

## 1. Vue d'Ensemble & Audit de Couverture de la Spécification

- **Déjà Couvert dans l'Application** :
  - Architecture de référence **Tauri + React + Rust + SQLite** et pipeline **ETL** (*SiegeEngineers/aoe2techtree* & *aoestats.io*).
  - Modélisation des attributs joueurs (1–100), dégradation exponentielle de la fatigue sous 75 %, synergie d'équipe, contrats, clauses de rachat, staff (Coach, Analyste, Psychologue) et sponsors.
  - Éditeur visuel de Build Orders en **DAG** et moteur de simulation par **Ticks (5s)** couplé à l'arène RTS Pixel Art à 60 FPS.
- **Ce que cette Mise à Jour Ajoute** :
  1. **Superposition Graphique de Télémétrie Live en Match** : Panneau graphique rabattable en périphérie de l'arène permettant de basculer en direct entre la courbe de **Force Militaire Effective $F_m(t)$**, la courbe de **Ressources & Score Économique Cumulé**, la courbe de **Moral & Pression de Tilt**, et l'histogramme comparatif des **Escouades Militaires actives** (Infanterie, Archers, Cavalerie, Siège, Moines).
  2. **Semainier d'Entraînement Interactif (Lundi – Dimanche)** : Intégré au Quartier Général, il permet d'attribuer à chaque joueur son programme sur les 7 jours de la semaine (*Drill Macro Boom*, *Arène Micro & Quickwall*, *Étude VOD & Scouting*, *Scrim Collectif*, *Repos Cryo/Psychologique*) et de simuler la semaine avec rapport de progression.
  3. **Studio Replay Post-Match & Archive JSON** : Accessible dès la fin d'une manche ou depuis l'historique des rencontres, ce studio offre une timeline interactive (`Tick 0` $\rightarrow$ `Tick Final`) qui synchronise les courbes, l'état exact des ressources, le nœud DAG actif, le journal d'événements stochastiques et le bouton **Exporter Replay JSON**.

---

## 2. Expérience Utilisateur & Design Visuel

### Parcours Utilisateur des Nouvelles Fonctionnalités

1. **Planification du Semainier (Quartier Général)** :
   - Le manager ouvre l'onglet *Semainier d'Entraînement (Lundi–Dimanche)* dans le Quartier Général.
   - Une grille matricielle affiche les joueurs en lignes et les 7 jours de la semaine en colonnes. Cliquer sur un créneau fait défiler ou sélectionne le module d'entraînement.
   - Un indicateur prédictif calcule en temps réel l'énergie projetée en fin de semaine (avec alerte si un joueur risque de passer sous le seuil critique de **75 %** avant le match du week-end).
   - Le bouton `Exécuter la Semaine d'Entraînement` applique tous les gains d'attributs, ajuste la synergie et fait avancer le calendrier.
2. **Télémétrie Graphique Temps Réel (Arène & Draft)** :
   - Pendant le duel RTS à 60 FPS, un bouton `Courbes Live` dans le bandeau périphérique déploie un moniteur vectoriel `<svg>` non-intrusif (maintenant plus de 85 % du champ de bataille dégagé).
   - Trois onglets de courbes temps réel sont disponibles : **Score & Économie**, **Force Militaire $F_m(t)$**, et **Moral & Unités**.
3. **Inspection Tick-par-Tick (Mode Replay Post-Match)** :
   - À l'issue d'un match (ou via le bouton `Ouvrir Studio Replay`), le manager accède au lecteur temporel.
   - Faire glisser le curseur sur le `Tick #t` met à jour instantanément les compteurs des deux joueurs à cet instant précis, place un marqueur vertical sur les courbes SVG, affiche la composition militaire exacte et permet de télécharger le fichier `.json` complet de la télémétrie du match.

### Cohérence Esthétique & Typographique

- **Respect de la Discipline 60-30-10** : Canevas `#0B0F17`, surfaces `#131B2E` avec bordures fines `#1E293B` d'un pixel, et accents fonctionnels (`#3B82F6` courbe Bleue, `#EF4444` courbe Rouge, `#D97706` marqueur de Tick / Power Spike, `#10B981` récupération).
- **Discipline Tabulaire** : Toutes les valeurs de ticks, deltas d'attributs, projections d'énergie et coordonnées de courbes utilisent `JetBrains Mono` avec `tabular-nums`. Zéro badge décoratif ("zero-pill discipline") sur les métadonnées statiques.

---

## 3. Décisions Produit & Arbitrages Techniques

- **Décision 1 : Rendu SVG Natif Haute Fréquence pour les Courbes Live et le Replay**
  - *Approche choisie* : Générer des polylignes et aires vectorielles `<svg>` directement à partir du tableau `matchState.history` enrichi à chaque tick.
  - *Pourquoi* : Zéro dépendance externe lourde, fluidité maximale à 60 FPS en parallèle du `<canvas>` pixel art, et précision au pixel près pour le curseur d'inspection du Mode Replay.
- **Décision 2 : Enregistrement Complet des Snapshots par Tick pour le Mode Replay**
  - *Approche choisie* : Étendre chaque entrée de `matchState.history` pour stocker l'instantané complet des deux duellistes à chaque tick (`resources`, `villagers`, `militaryUnits`, `activeDagNodeId`, `effectiveMilitaryForce`, `morale`, `townCenterHp`, `score`).
  - *Pourquoi* : Permet un scrubbing temporel instantané en $O(1)$ sur n'importe quel tick passé et produit un export JSON auto-portant exploitable par des outils d'analyse externes.

---

## 4. Architecture Technique & Flux de Données

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     QUARTIER GÉNÉRAL (HUB & ENTRAÎNEMENT)                        │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │ Vecteur Joueur (1-100) & Fatigue   │  │ Semainier Interactif (Lun -> Dim)  │  │
│  │ (Macro Speed, Micro, Wall/Defense, │◄─┤ • Blocs : Macro, Micro, VOD,       │  │
│  │  Adaptability, Mental Resilience)  │  │   Scrim Collectif, Repos Cryo      │  │
│  └────────────────────────────────────┘  │ • Projection Énergie (Seuil 75%)   │  │
│                                          └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┬────────────────────┘
                                                              │
                                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                 ARÈNE RTS TEMPS RÉEL & STUDIO REPLAY POST-MATCH                  │
│  ┌───────────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐  │
│  │ Canvas Pixel Art 60 FPS   │  │ Moniteur Courbes Live │  │ Studio Replay    │  │
│  │ + Carte Nomad ajoutée     │  │ • Courbe Score & Éco  │  │ • Scrubber Tick  │  │
│  │ + HUD Périphérique <15%   │  │ • Courbe Force F_m(t) │  │   0 -> Final     │  │
│  │                           │  │ • Compteurs d'Unités  │  │ • Inspecteur DAG │  │
│  └─────────────┬─────────────┘  └───────────┬───────────┘  │ • Export JSON    │  │
│                │                            │              └────────▲─────────┘  │
│                └────────────────────────────┼───────────────────────┘            │
│                                             │                                    │
│                                  [ Snapshots TickHistory[] ]                     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Modèle d'État des Nouvelles Fonctionnalités

1. **Types du Semainier (`WeeklyTrainingSchedule`)** :
   - Chaque jour (`LUN`, `MAR`, `MER`, `JEU`, `VEN`, `SAM`, `DIM`) associe à chaque joueur un `TrainingActivityType` (`MACRO_DRILL` | `MICRO_QUICKWALL` | `VOD_SCOUTING` | `TEAM_SCRIM` | `REST_RECOVERY`).
   - La résolution hebdomadaire calcule pour chaque joueur : $\Delta \text{Micro}$, $\Delta \text{Macro}$, $\Delta \text{Tactical}$, $\Delta \text{Mental}$, $\Delta \text{Synergie}$ et $\Delta \text{Énergie}$ tout en vérifiant la règle exponentielle de fatigue sous 75 %.
2. **Snapshots de Replay (`TickSnapshot`)** :
   - Stocke à chaque tick $t \in [0, T]$ l'état complet `blue` et `red`, le score composite AoE2 ($\text{Score} = \text{Militaire} + \text{Économie} + \text{Technologie}$), et les événements survenus à ce tick, avec sérialisation directe en fichier `aegis_replay_<matchId>.json`.
