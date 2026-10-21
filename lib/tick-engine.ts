import {
  AoEStatsMatchRow,
  AoEStatsPlayerRow,
  BuildOrderDag,
  Civilization,
  EsportsPlayer,
  LiveMatchState,
  MatchTickEvent,
  QuarantineRecord,
  RtsMap,
  TickSideState,
  UnitCategory,
} from './types';

// Matrice de contre-stratégies d'unités (style Age of Empires)
// Lignes = Attaquant, Colonnes = Défenseur
const UNIT_COUNTER_MATRIX: Record<UnitCategory, Record<UnitCategory, number>> = {
  INFANTRY: {
    INFANTRY: 1.0,
    ARCHERS: 0.82,
    CAVALRY: 1.22, // Lanciers / Hallebardiers contre Cavalerie
    SIEGE: 1.25,
    MONKS: 0.94,
  },
  ARCHERS: {
    INFANTRY: 1.26, // Archers dominent l'infanterie
    ARCHERS: 1.0,
    CAVALRY: 0.84,
    SIEGE: 0.68, // Mangonneaux écrasent les groupes d'archers
    MONKS: 1.22,
  },
  CAVALRY: {
    INFANTRY: 0.86,
    ARCHERS: 1.24, // Cavaliers chargent les archers
    CAVALRY: 1.0,
    SIEGE: 1.38, // Cavalerie détruit les armes de siège
    MONKS: 0.72, // Moines convertissent les Chevaliers
  },
  SIEGE: {
    INFANTRY: 1.16,
    ARCHERS: 1.42,
    CAVALRY: 0.68,
    SIEGE: 1.0,
    MONKS: 0.86,
  },
  MONKS: {
    INFANTRY: 1.04,
    ARCHERS: 0.78,
    CAVALRY: 1.34,
    SIEGE: 1.12,
    MONKS: 1.0,
  },
};

export function computePlayerAverages(player: EsportsPlayer) {
  const microAvg =
    (player.micro.stutterStepping +
      player.micro.reactionSpeed +
      player.micro.quickwalling +
      player.micro.aimPrecision) /
    4;
  const macroAvg =
    (player.macro.boomProduction + player.macro.resourceSplit + player.macro.mapControl) / 3;
  const tacticalAvg =
    (player.tactical.buildOrderExecution +
      player.tactical.adaptability +
      player.tactical.scouting) /
    3;
  const mentalAvg =
    (player.mental.tiltResistance + player.mental.staminaBoSeries + player.mental.clutchFactor) /
    3;

  return {
    microAvg: Math.round(microAvg * 10) / 10,
    macroAvg: Math.round(macroAvg * 10) / 10,
    tacticalAvg: Math.round(tacticalAvg * 10) / 10,
    mentalAvg: Math.round(mentalAvg * 10) / 10,
    overall: Math.round(((microAvg + macroAvg + tacticalAvg + mentalAvg) / 4) * 10) / 10,
  };
}

/**
 * Loi de dégradation exponentielle de la fatigue :
 * Dès que l'énergie descend sous le seuil critique de 75 %, une pénalité exponentielle
 * réduit la capacité mécanique (Micro) du joueur.
 */
export function computeEffectiveMicro(player: EsportsPlayer): {
  rawMicro: number;
  effectiveMicro: number;
  penaltyPercent: number;
  isBelowCriticalThreshold: boolean;
} {
  const {microAvg} = computePlayerAverages(player);
  if (player.energy >= 75) {
    return {
      rawMicro: microAvg,
      effectiveMicro: microAvg,
      penaltyPercent: 0,
      isBelowCriticalThreshold: false,
    };
  }
  const deficitRatio = (75 - player.energy) / 75;
  // Formule : Micro_eff = Micro * exp(-1.35 * (75 - E) / 75)
  const multiplier = Math.exp(-1.35 * deficitRatio);
  const effectiveMicro = Math.round(microAvg * multiplier * 10) / 10;
  const penaltyPercent = Math.round((1 - multiplier) * 1000) / 10;
  return {
    rawMicro: microAvg,
    effectiveMicro,
    penaltyPercent,
    isBelowCriticalThreshold: true,
  };
}

/**
 * Malus de synergie d'équipe :
 * L'absence d'historique commun ou de synergie de rôle (<60%) applique un malus
 * de 12 % à 15 % sur la cohésion tactique (modéré par le Head Coach s'il est recruté).
 */
export function computeSynergyModifier(
  player: EsportsPlayer,
  hasHeadCoach: boolean = true
): {
  modifier: number;
  malusPercent: number;
  hasMalus: boolean;
} {
  if (player.synergyWithTeam >= 60) {
    const bonus = ((player.synergyWithTeam - 60) / 40) * 0.05;
    return {
      modifier: Number((1 + bonus).toFixed(3)),
      malusPercent: 0,
      hasMalus: false,
    };
  }
  // Malus de base entre 12% (0.12) et 15% (0.15)
  const rawMalus = 0.15 - (player.synergyWithTeam / 60) * 0.03;
  const effectiveMalus = hasHeadCoach ? rawMalus * 0.75 : rawMalus;
  return {
    modifier: Number((1 - effectiveMalus).toFixed(3)),
    malusPercent: Number((effectiveMalus * 100).toFixed(1)),
    hasMalus: true,
  };
}

/**
 * Bonus de spécificité de rôle selon l'archétype du DAG choisi
 */
export function computeRoleSpecificityBonus(
  player: EsportsPlayer,
  dag: BuildOrderDag
): number {
  if (player.role === 'ENTRY_AGGRESSOR' && dag.archetype === 'RUSH_AGGRESSIVE') return 1.06;
  if (player.role === 'MACRO_SPECIALIST' && dag.archetype === 'FAST_CASTLE_BOOM') return 1.06;
  if (player.role === 'IGL_STRATEGIST') return 1.05; // Polyvalent sur les bifurcations DAG
  if (player.role === 'SUPPORT_DEFENDER' && dag.archetype === 'ARCHER_TIMING') return 1.06;
  return 1.0;
}

/**
 * Matrice de contre-civilisations (Beats / Loses_to) :
 * Calibrée pour maintenir le Win-Rate global entre 48% et 52% sans civ OP ou TRASH.
 */
export function computeCivMatchupModifier(ownCiv: Civilization, enemyCiv: Civilization): number {
  if (ownCiv.beatsCivIds.includes(enemyCiv.id)) {
    return 1.038; // Avantage tactique modéré (+3.8%)
  }
  if (ownCiv.losesToCivIds.includes(enemyCiv.id)) {
    return 0.964; // Désavantage tactique modéré (-3.6%)
  }
  return 1.0;
}


export function createInitialMatchState(params: {
  matchId: string;
  seriesFormat: 'BO1' | 'BO3' | 'BO5';
  currentGameNumber: number;
  blueSeriesScore: number;
  redSeriesScore: number;
  map: RtsMap;
  fogOfWarEnabled?: boolean;
  bluePlayer: EsportsPlayer;
  blueCiv: Civilization;
  blueDag: BuildOrderDag;
  redPlayer: EsportsPlayer;
  redCiv: Civilization;
  redDag: BuildOrderDag;
  hasHeadCoach: boolean;
}): LiveMatchState {
  const fogOfWarEnabled = params.fogOfWarEnabled ?? true;
  const blueMicro = computeEffectiveMicro(params.bluePlayer);
  const redMicro = computeEffectiveMicro(params.redPlayer);
  const blueSynergy = computeSynergyModifier(params.bluePlayer, params.hasHeadCoach);
  const redSynergy = computeSynergyModifier(params.redPlayer, params.hasHeadCoach);
  const blueAvg = computePlayerAverages(params.bluePlayer);
  const redAvg = computePlayerAverages(params.redPlayer);

  const blueStartNode = params.blueDag.nodes[0]?.id || 'n_dark_boar';
  const redStartNode = params.redDag.nodes[0]?.id || 'n_dark_boar';

  // Asymétrie Byzantins (+PV Bâtiments) et Mayas (+1 Villageois initial)
  const blueMaxTcHp = params.blueCiv.id === 'byzantines' ? 7400 : 6500;
  const redMaxTcHp = params.redCiv.id === 'byzantines' ? 7400 : 6500;
  const blueStartVils = params.blueCiv.id === 'mayans' ? 4 : 3;
  const redStartVils = params.redCiv.id === 'mayans' ? 4 : 3;

  const initialBlue: TickSideState = {
    playerId: params.bluePlayer.id,
    playerHandle: params.bluePlayer.handle,
    civId: params.blueCiv.id,
    age: 1,
    resources: {food: 200, wood: 200, gold: 100, stone: 200},
    villagers: blueStartVils,
    scoutsCount: 1, // Unité d'éclairage obligatoire dès le départ (Scout Cavalry / Guerrier Aigle)
    scoutingIntelPercent: fogOfWarEnabled ? 12 : 100,
    enemyRevealed: !fogOfWarEnabled,
    armyTransitProgress: 0,
    relicsCaptured: 0,
    militaryUnits: {INFANTRY: 0, ARCHERS: 0, CAVALRY: 1, SIEGE: 0, MONKS: 0},
    activeDagNodeId: blueStartNode,
    effectiveMicro: blueMicro.effectiveMicro,
    effectiveMacro: blueAvg.macroAvg,
    synergyModifier: blueSynergy.modifier,
    effectiveMilitaryForce: 14,
    morale: params.bluePlayer.morale,
    townCenterHp: blueMaxTcHp,
    maxTownCenterHp: blueMaxTcHp,
    castlesBuilt: 0,
    raidsInflicted: 0,
    villagersLost: 0,
  };

  const initialRed: TickSideState = {
    playerId: params.redPlayer.id,
    playerHandle: params.redPlayer.handle,
    civId: params.redCiv.id,
    age: 1,
    resources: {food: 200, wood: 200, gold: 100, stone: 200},
    villagers: redStartVils,
    scoutsCount: 1, // Unité d'éclairage obligatoire dès le départ
    scoutingIntelPercent: fogOfWarEnabled ? 12 : 100,
    enemyRevealed: !fogOfWarEnabled,
    armyTransitProgress: 0,
    relicsCaptured: 0,
    militaryUnits: {INFANTRY: 0, ARCHERS: 0, CAVALRY: 1, SIEGE: 0, MONKS: 0},
    activeDagNodeId: redStartNode,
    effectiveMicro: redMicro.effectiveMicro,
    effectiveMacro: redAvg.macroAvg,
    synergyModifier: redSynergy.modifier,
    effectiveMilitaryForce: 14,
    morale: params.redPlayer.morale,
    townCenterHp: redMaxTcHp,
    maxTownCenterHp: redMaxTcHp,
    castlesBuilt: 0,
    raidsInflicted: 0,
    villagersLost: 0,
  };

  return {
    matchId: params.matchId,
    seriesFormat: params.seriesFormat,
    currentGameNumber: params.currentGameNumber,
    blueSeriesScore: params.blueSeriesScore,
    redSeriesScore: params.redSeriesScore,
    mapId: params.map.id,
    fogOfWarEnabled,
    tick: 0,
    timeSeconds: 0,
    status: 'RUNNING',
    blue: initialBlue,
    red: initialRed,
    events: [
      {
        tick: 0,
        timeSeconds: 0,
        type: 'SCOUTING_FOG',
        side: 'NEUTRAL',
        title: `Déploiement sur ${params.map.name} (Surface ×${params.map.scaleFactor})`,
        detail: `${params.bluePlayer.handle} (${params.blueCiv.name}) vs ${params.redPlayer.handle} (${params.redCiv.name}). 1 Éclaireur assigné par camp. ${
          fogOfWarEnabled
            ? 'Brouillard de Guerre ACTIF : reconnaissance obligatoire avant tout ciblage militaire.'
            : 'Brouillard de Guerre DÉSACTIVÉ : visibilité intégrale.'
        }`,
        formulaSnapshot: `Rush Distance: ${params.map.rushDistance} seg | Trajet Vill.: ×${params.map.villagerWalkDistance} | PV Forum: ${blueMaxTcHp}`,
      },
    ],
    history: [
      {
        tick: 0,
        timeSeconds: 0,
        blueForce: 14,
        redForce: 14,
        blueEco: 700,
        redEco: 700,
        blueScore: 260,
        redScore: 260,
        blueMorale: initialBlue.morale,
        redMorale: initialRed.morale,
        blueIntel: initialBlue.scoutingIntelPercent,
        redIntel: initialRed.scoutingIntelPercent,
        blueState: structuredClone(initialBlue),
        redState: structuredClone(initialRed),
      },
    ],
  };
}

/**
 * Exécute 1 Tick (5 secondes simulées) du moteur hybride :
 * 1. Reconnaissance & Brouillard de Guerre (Unité d'Éclaireur obligatoire sur carte ×5)
 * 2. Calcul Économique (Asymétries Civ + impact de la distance de marche ×5 + Reliques)
 * 3. Progression Technologique / Militaire via le Graphe DAG (ralentie et préparatoire)
 * 4. Transit d'Armée (Rush Distance) & Résolution des Engagements F_m(t) / Sièges prolongés
 */
export function stepMatchTick(
  state: LiveMatchState,
  context: {
    map: RtsMap;
    bluePlayer: EsportsPlayer;
    blueCiv: Civilization;
    blueDag: BuildOrderDag;
    redPlayer: EsportsPlayer;
    redCiv: Civilization;
    redDag: BuildOrderDag;
    hasPsychologist: boolean;
  }
): LiveMatchState {
  if (state.status === 'FINISHED') return state;

  const nextTick = state.tick + 1;
  const nextTime = nextTick * 5;
  const newEvents: MatchTickEvent[] = [];

  const blue: TickSideState = {
    ...state.blue,
    resources: {...state.blue.resources},
    militaryUnits: {...state.blue.militaryUnits},
  };
  const red: TickSideState = {
    ...state.red,
    resources: {...state.red.resources},
    militaryUnits: {...state.red.militaryUnits},
  };

  // Synchronisation immédiate si le joueur a désactivé le Brouillard de Guerre en cours de partie
  if (!state.fogOfWarEnabled) {
    blue.scoutingIntelPercent = 100;
    blue.enemyRevealed = true;
    red.scoutingIntelPercent = 100;
    red.enemyRevealed = true;
  }

  const blueNode =
    context.blueDag.nodes.find((n) => n.id === blue.activeDagNodeId) || context.blueDag.nodes[0];
  const redNode =
    context.redDag.nodes.find((n) => n.id === red.activeDagNodeId) || context.redDag.nodes[0];

  // --- OPÉRATION 0 : SCOUTING & BROUILLARD DE GUERRE SUR CARTE ÉCHELLE ×5 ---
  const stepScoutingAndFog = (
    side: TickSideState,
    sideLabel: 'BLUE' | 'RED',
    player: EsportsPlayer,
    civ: Civilization,
    enemySide: TickSideState
  ) => {
    // Chaque joueur maintient au minimum son Éclaireur (ou en produit à l'Âge Féodal)
    if (side.scoutsCount <= 0 && side.resources.food >= 80) {
      side.scoutsCount = 1;
      side.resources.food -= 80;
    }

    if (!state.fogOfWarEnabled) {
      side.scoutingIntelPercent = 100;
      side.enemyRevealed = true;
      return;
    }

    // Vitesse de reconnaissance affectée par la taille ×5 (rushDistance) et la compétence Scouting
    const mongolVisionBonus = civ.id === 'mongols' ? 1.28 : 1.0;
    const distanceFactor = 22 / Math.max(14, context.map.rushDistance);
    const scoutGain =
      side.scoutsCount *
      (2.4 + (player.tactical.scouting / 100) * 3.8) *
      mongolVisionBonus *
      distanceFactor;

    const prevRevealed = side.enemyRevealed;
    side.scoutingIntelPercent = Math.min(
      100,
      Math.round((side.scoutingIntelPercent + scoutGain) * 10) / 10
    );

    // Seuil de 35% d'exploration requis pour localiser le Forum et les bâtiments ennemis sur carte ×5
    if (side.scoutingIntelPercent >= 35) {
      side.enemyRevealed = true;
    }

    if (!prevRevealed && side.enemyRevealed) {
      newEvents.push({
        tick: nextTick,
        timeSeconds: nextTime,
        type: 'SCOUTING_FOG',
        side: sideLabel,
        title: `Base ennemie localisée par l'Éclaireur de ${side.playerHandle} !`,
        detail: `Après avoir traversé la carte (×${context.map.scaleFactor}), l'Éclaireur révèle la position de ${enemySide.playerHandle} (${side.scoutingIntelPercent}% exploré). Ciblage militaire débloqué.`,
        formulaSnapshot: `Intel: ${side.scoutingIntelPercent}% | Scouting: ${player.tactical.scouting}/100`,
      });
    }
  };

  stepScoutingAndFog(blue, 'BLUE', context.bluePlayer, context.blueCiv, red);
  stepScoutingAndFog(red, 'RED', context.redPlayer, context.redCiv, blue);

  // --- OPÉRATION 1 : CALCUL ÉCONOMIQUE (ASYMÉTRIES CIV + TRAJET ×5 + RELIQUES) ---
  const stepEconomy = (
    side: TickSideState,
    player: EsportsPlayer,
    civ: Civilization,
    activeNode: typeof blueNode,
    enemySide: TickSideState
  ) => {
    const macroFactor = 0.76 + (side.effectiveMacro / 100) * 0.48;

    // La pression de raid adverse ne s'applique QUE si l'ennemi a révélé notre base ET traversé la Rush Distance
    const enemyCanRaid =
      enemySide.enemyRevealed &&
      enemySide.armyTransitProgress >= 85 &&
      enemySide.effectiveMilitaryForce > side.effectiveMilitaryForce * 1.22;

    const raidPressure = enemyCanRaid
      ? Math.min(
          0.26,
          ((enemySide.effectiveMilitaryForce - side.effectiveMilitaryForce) /
            Math.max(30, side.effectiveMilitaryForce)) *
            0.14
        )
      : 0;

    // Production de villageois modérée pour allonger la montée en puissance
    const tcCount = side.age >= 3 ? 2 + (activeNode.primaryUnitFocus === 'SIEGE' ? 1 : 0) : 1;
    const britonTcBonus = civ.id === 'britons' && side.age >= 3 ? 1.12 : 1.0;
    const vilGrowth = Math.min(
      140 - side.villagers,
      Math.max(
        1,
        Math.round(tcCount * (0.34 + (player.macro.boomProduction / 100) * 0.36) * britonTcBonus)
      )
    );
    side.villagers += vilGrowth;

    // Impact de l'agrandissement ×5 : villagerWalkDistance réduit le rendement brut de récolte
    const walkEfficiency = 1 / Math.max(1.0, context.map.villagerWalkDistance);
    const baseGather =
      side.villagers * 1.48 * macroFactor * walkEfficiency * (1 - raidPressure);
    const alloc = activeNode.villagerAllocation;

    // Application des multiplicateurs asymétriques propres à chaque civilisation
    const foodGain = baseGather * (alloc.food / 100) * civ.gatherMultipliers.food;
    const woodGain = baseGather * (alloc.wood / 100) * civ.gatherMultipliers.wood;
    const goldGain = baseGather * (alloc.gold / 100) * civ.gatherMultipliers.gold;
    const stoneGain = baseGather * (alloc.stone / 100) * civ.gatherMultipliers.stone;

    // Contrôle des reliques espacées sur la carte ×5 à partir de l'Âge III
    const totalCapturedRelics = blue.relicsCaptured + red.relicsCaptured;
    if (
      side.age >= 3 &&
      side.militaryUnits.MONKS >= 1 &&
      totalCapturedRelics < context.map.neutralRelicsCount &&
      nextTick % 5 === 0
    ) {
      side.relicsCaptured += 1;
    }
    const relicGold = side.relicsCaptured * 9;

    side.resources.food = Math.round(side.resources.food + foodGain);
    side.resources.wood = Math.round(side.resources.wood + woodGain);
    side.resources.gold = Math.round(side.resources.gold + goldGain + relicGold);
    side.resources.stone = Math.round(side.resources.stone + stoneGain);
  };

  stepEconomy(blue, context.bluePlayer, context.blueCiv, blueNode, red);
  stepEconomy(red, context.redPlayer, context.redCiv, redNode, blue);

  // --- OPÉRATION 2 : PROGRESSION TECHNOLOGIQUE & MILITAIRE (CADENCE ÉTENDUE) ---
  const stepDagAndMilitary = (
    side: TickSideState,
    sideLabel: 'BLUE' | 'RED',
    player: EsportsPlayer,
    civ: Civilization,
    dag: BuildOrderDag,
    currentNode: typeof blueNode,
    enemySide: TickSideState
  ) => {
    const outgoingEdges = dag.edges.filter((e) => e.fromNodeId === currentNode.id);

    // Extension de la durée des matchs : les paliers d'âge prennent en compte ageUpSpeedMultiplier
    const scaledTargetTick = Math.round(
      (currentNode.targetTick * 1.55 + 10) / Math.max(0.85, civ.ageUpSpeedMultiplier)
    );

    if (outgoingEdges.length > 0 && nextTick >= scaledTargetTick) {
      let chosenEdge = outgoingEdges.find((e) => e.condition === 'DEFAULT') || outgoingEdges[0];

      const enemyTotalUnits = Object.values(enemySide.militaryUnits).reduce((a, b) => a + b, 0);
      const scoutingRoll = player.tactical.scouting / 100;

      // Les bifurcations réactives nécessitent d'avoir révélé l'ennemi à travers le Brouillard de Guerre
      if (side.enemyRevealed) {
        for (const edge of outgoingEdges) {
          if (
            edge.condition === 'ENEMY_AGGRESSION_DETECTED' &&
            enemyTotalUnits >= 10 &&
            scoutingRoll > 0.62
          ) {
            chosenEdge = edge;
            break;
          }
          if (
            edge.condition === 'ENEMY_GREED_DETECTED' &&
            enemySide.villagers > side.villagers + 4 &&
            scoutingRoll > 0.58
          ) {
            chosenEdge = edge;
            break;
          }
          if (
            edge.condition === 'RESOURCE_THRESHOLD' &&
            side.resources.food + side.resources.gold > 750 * (1 - civ.techCostDiscount)
          ) {
            chosenEdge = edge;
            break;
          }
        }
      }

      const nextNode = dag.nodes.find((n) => n.id === chosenEdge.toNodeId);
      if (nextNode && nextNode.id !== side.activeDagNodeId) {
        const previousAge = side.age;
        side.activeDagNodeId = nextNode.id;
        side.age = Math.max(side.age, nextNode.age) as 1 | 2 | 3 | 4;

        // En Âge II/III, ajout d'un éclaireur supplémentaire pour maintenir la vision sur carte ×5
        if (side.age > previousAge && side.scoutsCount < 3) {
          side.scoutsCount += 1;
        }

        newEvents.push({
          tick: nextTick,
          timeSeconds: nextTime,
          type: 'DAG_TRANSITION',
          side: sideLabel,
          title: `${side.playerHandle} -> ${nextNode.title}`,
          detail: `Bifurcation DAG [${chosenEdge.conditionLabel}] · Tech : ${nextNode.techUnlocked} (Coût Tech -${Math.round(civ.techCostDiscount * 100)}%)`,
          formulaSnapshot:
            side.age > previousAge
              ? `Passage à l'Âge ${side.age} (Vitesse Civ ×${civ.ageUpSpeedMultiplier})`
              : `Exécution DAG : ${player.tactical.buildOrderExecution}/100`,
        });
      }
    }

    // Conversion ralentie des ressources en unités pour des phases de préparation tactique réalistes
    const updatedNode = dag.nodes.find((n) => n.id === side.activeDagNodeId) || currentNode;
    const focusUnit = updatedNode.primaryUnitFocus;
    const baseUnitCost = focusUnit === 'SIEGE' ? 165 : focusUnit === 'CAVALRY' ? 115 : 85;
    // Remise technologique/militaire propre à la civilisation (ex: Mayas archers -20%, Byzantins contre-unités)
    const effectiveUnitCost = Math.round(baseUnitCost * (1 - civ.techCostDiscount * 0.45));
    const totalSpendable = side.resources.food + side.resources.wood + side.resources.gold;

    if (totalSpendable > effectiveUnitCost * 2.2) {
      const unitsProduced = Math.min(
        4, // Cadence de production plafonnée à 4 unités/tick pour étendre la durée des matchs
        Math.floor((totalSpendable * 0.24) / effectiveUnitCost)
      );
      if (unitsProduced > 0) {
        side.militaryUnits[focusUnit] += unitsProduced;
        const secondary: UnitCategory =
          focusUnit === 'CAVALRY'
            ? 'ARCHERS'
            : focusUnit === 'ARCHERS'
              ? 'INFANTRY'
              : 'MONKS';
        if (nextTick % 3 === 0) {
          side.militaryUnits[secondary] += 1;
        }
        const spent = unitsProduced * effectiveUnitCost;
        side.resources.food = Math.max(50, Math.round(side.resources.food - spent * 0.44));
        side.resources.wood = Math.max(50, Math.round(side.resources.wood - spent * 0.31));
        side.resources.gold = Math.max(30, Math.round(side.resources.gold - spent * 0.25));
      }
    }

    // Construction de Châteaux défensifs/offensifs dès l'Âge III
    const castleStoneCost = civ.id === 'franks' ? 520 : 650;
    if (side.age >= 3 && side.resources.stone >= castleStoneCost) {
      side.castlesBuilt += 1;
      side.resources.stone -= castleStoneCost;
    }
  };

  stepDagAndMilitary(
    blue,
    'BLUE',
    context.bluePlayer,
    context.blueCiv,
    context.blueDag,
    blueNode,
    red
  );
  stepDagAndMilitary(
    red,
    'RED',
    context.redPlayer,
    context.redCiv,
    context.redDag,
    redNode,
    blue
  );

  // --- OPÉRATION 3 : TRANSIT D'ARMÉE (RUSH DISTANCE ×5) & FORCE MILITAIRE EFFECTIVE F_m(t) ---
  const stepArmyTransit = (
    side: TickSideState,
    civ: Civilization,
    enemySide: TickSideState
  ) => {
    const totalMilitary = Object.values(side.militaryUnits).reduce((a, b) => a + b, 0);
    // Impossible d'envoyer l'armée cibler la base ennemie tant que l'Éclaireur ne l'a pas révélée sous Fog of War
    if (!side.enemyRevealed || totalMilitary < 4) {
      side.armyTransitProgress = Math.max(0, side.armyTransitProgress - 8);
      return;
    }

    // Vitesse de traversée de la carte ×5 inversement proportionnelle à la Rush Distance
    const cavalryRatio =
      (side.militaryUnits.CAVALRY + side.scoutsCount) / Math.max(1, totalMilitary);
    const siegeDrag = side.militaryUnits.SIEGE > 0 ? 0.86 : 1.0;
    const speedFactor = (1 + cavalryRatio * 0.38) * siegeDrag * (civ.id === 'mongols' ? 1.12 : 1.0);
    const stepAdvance = (320 / Math.max(16, context.map.rushDistance)) * speedFactor;

    side.armyTransitProgress = Math.min(
      100,
      Math.round((side.armyTransitProgress + stepAdvance) * 10) / 10
    );

    // Si l'armée adverse nous repousse violemment, le front recule
    if (enemySide.effectiveMilitaryForce > side.effectiveMilitaryForce * 1.45) {
      side.armyTransitProgress = Math.max(25, side.armyTransitProgress - 12);
    }
  };

  const computeForce = (
    own: TickSideState,
    enemy: TickSideState,
    player: EsportsPlayer,
    ownCiv: Civilization,
    enemyCiv: Civilization,
    dag: BuildOrderDag
  ) => {
    const activeNode = dag.nodes.find((n) => n.id === own.activeDagNodeId) || dag.nodes[0];
    const unitBaseWeights: Record<UnitCategory, number> = {
      INFANTRY: 10,
      ARCHERS: 12,
      CAVALRY: 17,
      SIEGE: 30,
      MONKS: 15,
    };

    const enemyTotal = Math.max(
      1,
      Object.values(enemy.militaryUnits).reduce((a, b) => a + b, 0)
    );

    let rawMilitarySum = own.scoutsCount * 9;
    (Object.keys(own.militaryUnits) as UnitCategory[]).forEach((cat) => {
      const count = own.militaryUnits[cat];
      if (count <= 0) return;

      let counterMultiplier = 0;
      (Object.keys(enemy.militaryUnits) as UnitCategory[]).forEach((enemyCat) => {
        const enemyShare = enemy.militaryUnits[enemyCat] / enemyTotal;
        counterMultiplier += enemyShare * UNIT_COUNTER_MATRIX[cat][enemyCat];
      });
      if (counterMultiplier === 0) counterMultiplier = 1.0;

      const civBonus = cat === ownCiv.primaryUnit ? ownCiv.militaryBonusRate : 1.0;
      rawMilitarySum += count * unitBaseWeights[cat] * counterMultiplier * civBonus;
    });

    // Châteaux à PV et puissance défensive renforcés
    const castlePower = ownCiv.id === 'byzantines' || ownCiv.id === 'teutons' ? 95 : 82;
    rawMilitarySum += own.castlesBuilt * castlePower;

    // Modificateurs équilibrés (Win-Rate cible 48% - 52%)
    const microModifier = 0.82 + (own.effectiveMicro / 100) * 0.38;
    const roleModifier = computeRoleSpecificityBonus(player, dag);
    const civMatchupMod = computeCivMatchupModifier(ownCiv, enemyCiv);
    const mapWinRateBias = ownCiv.winRatesByMap[context.map.id] || 0.5;
    // Calibration stricte de la carte pour éviter tout snowball excessif
    const terrainModifier =
      1 +
      (mapWinRateBias - 0.5) * 0.45 +
      ((player.macro.mapControl - 82) / 100) * (context.map.elevationBonus - 1) * 0.45;

    // Bonus de puissance du DAG tempéré pour prolonger les batailles
    const temperedSpike = 1 + (activeNode.powerSpikeBonus - 1) * 0.65;

    const effectiveForce =
      rawMilitarySum *
      microModifier *
      own.synergyModifier *
      roleModifier *
      civMatchupMod *
      temperedSpike *
      terrainModifier;

    return Math.max(10, Math.round(effectiveForce * 10) / 10);
  };

  blue.effectiveMilitaryForce = computeForce(
    blue,
    red,
    context.bluePlayer,
    context.blueCiv,
    context.redCiv,
    context.blueDag
  );
  red.effectiveMilitaryForce = computeForce(
    red,
    blue,
    context.redPlayer,
    context.redCiv,
    context.blueCiv,
    context.redDag
  );

  stepArmyTransit(blue, context.blueCiv, red);
  stepArmyTransit(red, context.redCiv, blue);

  // --- OPÉRATION 4 : ENGAGEMENTS CONDITIONNÉS AU SCOUTING & SIÈGES PROLONGÉS ---
  const bothSidesCanEngage =
    (!state.fogOfWarEnabled || (blue.enemyRevealed && red.enemyRevealed)) &&
    (blue.armyTransitProgress >= 55 || red.armyTransitProgress >= 55);

  if (nextTick >= 8 && bothSidesCanEngage) {
    const forceRatio = blue.effectiveMilitaryForce / Math.max(1, red.effectiveMilitaryForce);
    const stochasticRoll = Math.random();

    // Taux d'attrition ralenti pour que les armées s'affrontent sur la durée
    const blueCasualties = Math.max(
      0,
      Math.round((red.effectiveMilitaryForce / 260) * (0.65 + Math.random() * 0.4))
    );
    const redCasualties = Math.max(
      0,
      Math.round((blue.effectiveMilitaryForce / 260) * (0.65 + Math.random() * 0.4))
    );

    const applyCasualties = (side: TickSideState, losses: number) => {
      let rem = losses;
      const cats: UnitCategory[] = ['INFANTRY', 'CAVALRY', 'ARCHERS', 'MONKS', 'SIEGE'];
      for (const c of cats) {
        if (rem <= 0) break;
        const drop = Math.min(side.militaryUnits[c], rem);
        side.militaryUnits[c] -= drop;
        rem -= drop;
      }
    };

    applyCasualties(blue, blueCasualties);
    applyCasualties(red, redCasualties);

    // Raids et escarmouches uniquement si l'attaquant a révélé l'ennemi ET parcouru la Rush Distance
    if (stochasticRoll < 0.26) {
      if (
        blue.enemyRevealed &&
        blue.armyTransitProgress >= 75 &&
        (forceRatio > 1.12 || (stochasticRoll < 0.14 && blue.effectiveMicro >= red.effectiveMicro))
      ) {
        const vilsPicked = Math.min(
          red.villagers - 18,
          Math.max(1, Math.round(1 + (blue.effectiveMicro - 78) / 14))
        );
        if (vilsPicked > 0) {
          red.villagers -= vilsPicked;
          red.villagersLost += vilsPicked;
          blue.raidsInflicted += 1;
        }
        const moraleShock = Math.max(
          2,
          Math.round(7 * (1 - context.redPlayer.mental.tiltResistance / 145))
        );
        red.morale = Math.max(0, red.morale - moraleShock);
        blue.morale = Math.min(100, blue.morale + 2);

        newEvents.push({
          tick: nextTick,
          timeSeconds: nextTime,
          type: 'CRITICAL_MICRO',
          side: 'BLUE',
          title: `Raid longue distance de ${blue.playerHandle}`,
          detail: `Après traversée de la carte (Rush Dist ${context.map.rushDistance}), ${Math.max(1, vilsPicked)} villageois éliminés chez ${red.playerHandle}. Moral Rouge -${moraleShock}.`,
          formulaSnapshot: `F_m(t) Bleu ${blue.effectiveMilitaryForce} vs Rouge ${red.effectiveMilitaryForce}`,
        });
      } else if (red.enemyRevealed && red.armyTransitProgress >= 75) {
        if (context.bluePlayer.micro.quickwalling > 88 && Math.random() < 0.48) {
          blue.morale = Math.min(100, blue.morale + 3);
          newEvents.push({
            tick: nextTick,
            timeSeconds: nextTime,
            type: 'CRITICAL_MICRO',
            side: 'BLUE',
            title: `Quickwall salvateur de ${blue.playerHandle} !`,
            detail: `Palissades posées devant l'incursion de ${red.playerHandle}. Zéro villageois perdu !`,
            formulaSnapshot: `Quickwalling: ${context.bluePlayer.micro.quickwalling}/100`,
          });
        } else {
          const vilsPicked = Math.min(
            blue.villagers - 18,
            Math.max(1, Math.round(1 + (red.effectiveMicro - 78) / 14))
          );
          if (vilsPicked > 0) {
            blue.villagers -= vilsPicked;
            blue.villagersLost += vilsPicked;
            red.raidsInflicted += 1;
          }
          const psychMitigation = context.hasPsychologist ? 0.65 : 1.0;
          const moraleShock = Math.max(
            2,
            Math.round(7 * (1 - context.bluePlayer.mental.tiltResistance / 145) * psychMitigation)
          );
          blue.morale = Math.max(0, blue.morale - moraleShock);

          newEvents.push({
            tick: nextTick,
            timeSeconds: nextTime,
            type: 'MORALE_SHOCK',
            side: 'RED',
            title: `Incursion de ${red.playerHandle} sur l'économie lointaine`,
            detail: `${red.playerHandle} frappe un camp de ressources espacé (${Math.max(1, vilsPicked)} villageois perdus). Moral Bleu -${moraleShock}.`,
            formulaSnapshot: `F_m(t) Rouge ${red.effectiveMilitaryForce} vs Bleu ${blue.effectiveMilitaryForce}`,
          });
        }
      }
    }

    // Dégâts de siège sur les Châteaux et le Forum (PV augmentés à 6500+, nécessite transit = 100% et préparation)
    if (
      blue.enemyRevealed &&
      blue.armyTransitProgress >= 95 &&
      blue.effectiveMilitaryForce > red.effectiveMilitaryForce * 1.24 &&
      nextTick > 24
    ) {
      // Les châteaux adverses absorbent d'abord une partie majeure du siège
      const castleMitigation = 1 / (1 + red.castlesBuilt * 0.45);
      const rawSiege =
        (blue.effectiveMilitaryForce - red.effectiveMilitaryForce) *
        (0.55 + blue.militaryUnits.SIEGE * 0.22) *
        castleMitigation;
      const siegeDmg = Math.max(15, Math.round(rawSiege));
      red.townCenterHp = Math.max(0, red.townCenterHp - siegeDmg);
      red.morale = Math.max(0, red.morale - 3);
    } else if (
      red.enemyRevealed &&
      red.armyTransitProgress >= 95 &&
      red.effectiveMilitaryForce > blue.effectiveMilitaryForce * 1.24 &&
      nextTick > 24
    ) {
      const castleMitigation = 1 / (1 + blue.castlesBuilt * 0.45);
      const rawSiege =
        (red.effectiveMilitaryForce - blue.effectiveMilitaryForce) *
        (0.55 + red.militaryUnits.SIEGE * 0.22) *
        castleMitigation;
      const siegeDmg = Math.max(15, Math.round(rawSiege));
      blue.townCenterHp = Math.max(0, blue.townCenterHp - siegeDmg);
      blue.morale = Math.max(0, blue.morale - 3);
    }
  } else if (state.fogOfWarEnabled && nextTick % 7 === 0 && (!blue.enemyRevealed || !red.enemyRevealed)) {
    newEvents.push({
      tick: nextTick,
      timeSeconds: nextTime,
      type: 'SCOUTING_FOG',
      side: 'NEUTRAL',
      title: `Exploration du Brouillard de Guerre en cours`,
      detail: `Les Éclaireurs parcourent la carte ×5 (Intel Bleu: ${blue.scoutingIntelPercent}% | Rouge: ${red.scoutingIntelPercent}%). Aucun assaut direct possible avant détection.`,
    });
  }

  // --- VÉRIFICATION DU GG CALL OU DESTRUCTION DU FORUM (DURÉE DE MATCH ÉTENDUE) ---
  let status: LiveMatchState['status'] = state.status;
  let winnerSide: LiveMatchState['winnerSide'] = undefined;
  let winReason: LiveMatchState['winReason'] = undefined;

  if (
    red.townCenterHp <= 0 ||
    (nextTick >= 38 &&
      red.morale <= 12 &&
      blue.effectiveMilitaryForce > red.effectiveMilitaryForce * 1.75)
  ) {
    status = 'FINISHED';
    winnerSide = 'BLUE';
    winReason = red.townCenterHp <= 0 ? 'TOWN_CENTER_DESTROYED' : 'GG_CALL';
    newEvents.push({
      tick: nextTick,
      timeSeconds: nextTime,
      type: 'GG_CALL',
      side: 'BLUE',
      title:
        winReason === 'GG_CALL'
          ? `"GG WP" — ${red.playerHandle} concède la manche après une longue guerre d'usure !`
          : `Forum Impérial de ${red.playerHandle} détruit !`,
      detail: `${blue.playerHandle} s'impose au Tick #${nextTick} (${nextTime}s) avec une force F_m(t) de ${blue.effectiveMilitaryForce} contre ${red.effectiveMilitaryForce}.`,
      formulaSnapshot: `Moral Rouge: ${red.morale}% | PV Forum: ${red.townCenterHp}/${red.maxTownCenterHp}`,
    });
  } else if (
    blue.townCenterHp <= 0 ||
    (nextTick >= 38 &&
      blue.morale <= 12 &&
      red.effectiveMilitaryForce > blue.effectiveMilitaryForce * 1.75)
  ) {
    status = 'FINISHED';
    winnerSide = 'RED';
    winReason = blue.townCenterHp <= 0 ? 'TOWN_CENTER_DESTROYED' : 'GG_CALL';
    newEvents.push({
      tick: nextTick,
      timeSeconds: nextTime,
      type: 'GG_CALL',
      side: 'RED',
      title:
        winReason === 'GG_CALL'
          ? `GG Call — ${blue.playerHandle} abandonne la manche`
          : `Le Forum Impérial de ${blue.playerHandle} s'effondre`,
      detail: `${red.playerHandle} l'emporte au Tick #${nextTick} (${nextTime}s) avec F_m(t) ${red.effectiveMilitaryForce} vs ${blue.effectiveMilitaryForce}.`,
      formulaSnapshot: `Moral Bleu: ${blue.morale}% | PV Forum: ${blue.townCenterHp}/${blue.maxTownCenterHp}`,
    });
  } else if (nextTick >= 150) {
    // Limite de temps étendue à 150 ticks (750s) -> Décision Impériale au Score
    status = 'FINISHED';
    const blueScore =
      blue.effectiveMilitaryForce * 2.5 +
      blue.villagers * 12 +
      blue.townCenterHp * 0.15 +
      blue.relicsCaptured * 180;
    const redScore =
      red.effectiveMilitaryForce * 2.5 +
      red.villagers * 12 +
      red.townCenterHp * 0.15 +
      red.relicsCaptured * 180;
    winnerSide = blueScore >= redScore ? 'BLUE' : 'RED';
    winReason = 'TIME_SCORE_VICTORY';
    newEvents.push({
      tick: nextTick,
      timeSeconds: nextTime,
      type: 'GG_CALL',
      side: winnerSide,
      title: `Décision Impériale au Score (${winnerSide === 'BLUE' ? blue.playerHandle : red.playerHandle})`,
      detail: `Score final : ${Math.round(blueScore)} à ${Math.round(redScore)} après ${nextTime}s de campagne sur carte ×5.`,
    });
  }

  const blueTotalEco =
    blue.resources.food + blue.resources.wood + blue.resources.gold + blue.resources.stone;
  const redTotalEco =
    red.resources.food + red.resources.wood + red.resources.gold + red.resources.stone;

  const blueCompositeScore = Math.round(
    blue.effectiveMilitaryForce * 3.0 +
      blue.villagers * 12 +
      blueTotalEco * 0.22 +
      blue.age * 180 +
      blue.castlesBuilt * 180 +
      blue.relicsCaptured * 120
  );
  const redCompositeScore = Math.round(
    red.effectiveMilitaryForce * 3.0 +
      red.villagers * 12 +
      redTotalEco * 0.22 +
      red.age * 180 +
      red.castlesBuilt * 180 +
      red.relicsCaptured * 120
  );

  const nextHistory = [
    ...state.history,
    {
      tick: nextTick,
      timeSeconds: nextTime,
      blueForce: blue.effectiveMilitaryForce,
      redForce: red.effectiveMilitaryForce,
      blueEco: blueTotalEco,
      redEco: redTotalEco,
      blueScore: blueCompositeScore,
      redScore: redCompositeScore,
      blueMorale: blue.morale,
      redMorale: red.morale,
      blueIntel: blue.scoutingIntelPercent,
      redIntel: red.scoutingIntelPercent,
      blueState: structuredClone(blue),
      redState: structuredClone(red),
    },
  ];

  return {
    ...state,
    tick: nextTick,
    timeSeconds: nextTime,
    status,
    winnerSide,
    winReason,
    blue,
    red,
    events: [...newEvents, ...state.events].slice(0, 50),
    history: nextHistory,
  };
}

/**
 * Simulateur Haute Fréquence Monte-Carlo (100+ matchs en quelques millisecondes)
 * Calibré sur les nouvelles règles : Carte ×5, Brouillard de Guerre, Éclaireur obligatoire et méta équilibrée (48%-52%).
 */
export function runMonteCarloBatchSimulation(params: {
  iterations: number;
  map: RtsMap;
  fogOfWarEnabled?: boolean;
  bluePlayer: EsportsPlayer;
  blueCiv: Civilization;
  blueDag: BuildOrderDag;
  redPlayer: EsportsPlayer;
  redCiv: Civilization;
  redDag: BuildOrderDag;
}) {
  const startTime = performance.now();
  let blueWins = 0;
  let redWins = 0;
  let ggCallsCount = 0;
  let totalTicks = 0;
  const sampleWinRates: Array<{batch: number; blueWinRate: number}> = [];

  for (let i = 1; i <= params.iterations; i++) {
    let match = createInitialMatchState({
      matchId: `batch_${i}`,
      seriesFormat: 'BO1',
      currentGameNumber: 1,
      blueSeriesScore: 0,
      redSeriesScore: 0,
      map: params.map,
      fogOfWarEnabled: params.fogOfWarEnabled ?? true,
      bluePlayer: params.bluePlayer,
      blueCiv: params.blueCiv,
      blueDag: params.blueDag,
      redPlayer: params.redPlayer,
      redCiv: params.redCiv,
      redDag: params.redDag,
      hasHeadCoach: true,
    });

    while (match.status !== 'FINISHED' && match.tick < 155) {
      match = stepMatchTick(match, {
        map: params.map,
        bluePlayer: params.bluePlayer,
        blueCiv: params.blueCiv,
        blueDag: params.blueDag,
        redPlayer: params.redPlayer,
        redCiv: params.redCiv,
        redDag: params.redDag,
        hasPsychologist: true,
      });
    }

    totalTicks += match.tick;
    if (match.winnerSide === 'BLUE') blueWins++;
    else redWins++;
    if (match.winReason === 'GG_CALL') ggCallsCount++;

    if (i % 10 === 0 || i === params.iterations) {
      sampleWinRates.push({
        batch: i,
        blueWinRate: Math.round((blueWins / i) * 1000) / 10,
      });
    }
  }

  const durationMs = Math.max(1, Math.round((performance.now() - startTime) * 10) / 10);
  const throughputPerHour = Math.round((params.iterations / (durationMs / 1000)) * 3600);

  return {
    iterations: params.iterations,
    blueWins,
    redWins,
    blueWinRatePercent: Math.round((blueWins / params.iterations) * 1000) / 10,
    avgMatchTicks: Math.round((totalTicks / params.iterations) * 10) / 10,
    avgMatchDurationSec: Math.round((totalTicks / params.iterations) * 5),
    ggCallRatePercent: Math.round((ggCallsCount / params.iterations) * 1000) / 10,
    executionTimeMs: durationMs,
    throughputPerHour,
    convergenceSeries: sampleWinRates,
  };
}

/**
 * Intervalle de confiance de Wilson à 95 % (z = 1.96) — Section 5.4
 * Obligatoire pour les taux de victoire à haut Elo (2000+, ~1 % des parties)
 * où la taille d'échantillon par matchup peut descendre sous 10-50 parties par patch.
 */
export function computeWilsonScoreInterval(
  winRate: number,
  sampleSize: number,
  z: number = 1.96
): {
  centerPct: number;
  lowPct: number;
  highPct: number;
  lowerPct: number;
  upperPct: number;
  marginPct: number;
  sampleSize: number;
  isLowSampleWarning: boolean;
} {
  const n = Math.max(1, sampleSize);
  const p = Math.max(0, Math.min(1, winRate));
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const halfWidth = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;

  const lowerPct = Math.round(Math.max(0, center - halfWidth) * 1000) / 10;
  const upperPct = Math.round(Math.min(1, center + halfWidth) * 1000) / 10;
  const centerPct = Math.round(p * 1000) / 10;
  const marginPct = Math.round(((upperPct - lowerPct) / 2) * 10) / 10;

  return {
    centerPct,
    lowPct: lowerPct,
    highPct: upperPct,
    lowerPct,
    upperPct,
    marginPct,
    sampleSize: n,
    isLowSampleWarning: n < 30,
  };
}

/**
 * Pipeline de Validation & Quarantaine AoEStats Parquet (Sections 4, 5 & 6)
 * Sépare les lignes saines (`data/normalized/`) des anomalies détournées vers `data/quarantine/`.
 */
export function runAoEStatsQuarantineValidation(
  matches: AoEStatsMatchRow[],
  players: AoEStatsPlayerRow[]
): {
  validMatches: AoEStatsMatchRow[];
  validPlayers: AoEStatsPlayerRow[];
  quarantineRecords: QuarantineRecord[];
  replayEnhancedCoveragePct: number;
} {
  const validMatches: AoEStatsMatchRow[] = [];
  const validMatchIds = new Set<string>();
  const quarantineRecords: QuarantineRecord[] = [];
  const nowUtc = '2026-10-18T23:20:00Z';

  for (const m of matches) {
    // 1. Anomalie Section 5.1 : Dirty Player Counts (1, 3, 5, 7 joueurs)
    if (m.num_players % 2 !== 0 || m.num_players <= 0) {
      quarantineRecords.push({
        id: `q_odd_${m.game_id}`,
        game_id: m.game_id,
        tag: 'ERR_ODD_PLAYER_COUNT',
        reason: `Nombre de joueurs impair invalide (num_players = ${m.num_players}) détecté dans matches.parquet.`,
        targetPath: 'data/quarantine/odd_player_counts.parquet',
        detectedAtUtc: nowUtc,
      });
      continue;
    }

    // 2. Filtre Section 4.1 & 4.4 : Durée hors bornes (< 5 min early disconnect ou > 180 min)
    if (m.duration < 300 || m.duration > 10800) {
      quarantineRecords.push({
        id: `q_dur_${m.game_id}`,
        game_id: m.game_id,
        tag: 'ERR_DURATION_OUT_OF_BOUNDS',
        reason: `Durée de match hors bornes (${m.duration}s ; requis : 300s–10800s, déconnexion précoce exclue).`,
        targetPath: 'data/quarantine/duration_anomalies.parquet',
        detectedAtUtc: nowUtc,
      });
      continue;
    }

    // 3. Filtre Section 4.3 : Matchs miroirs exclus de l'agrégation Win-Rate des civilisations
    if (m.mirror) {
      quarantineRecords.push({
        id: `q_mir_${m.game_id}`,
        game_id: m.game_id,
        tag: 'WARN_MIRROR_MATCH_EXCLUDED',
        reason: 'Match miroir (civilisations identiques) exclu de l’agrégation Win-Rate.',
        targetPath: 'data/quarantine/mirror_matches.parquet',
        detectedAtUtc: nowUtc,
      });
      continue;
    }

    validMatches.push(m);
    validMatchIds.add(m.game_id);
  }

  const validPlayers: AoEStatsPlayerRow[] = [];
  for (const p of players) {
    // 4. Anomalie Section 6.2 : Intégrité référentielle (Orphan player row)
    if (!validMatchIds.has(p.game_id)) {
      const parentExistsInRaw = matches.some((m) => m.game_id === p.game_id);
      if (!parentExistsInRaw) {
        quarantineRecords.push({
          id: `q_orph_${p.game_id}_${p.profile_id}`,
          game_id: p.game_id,
          profile_id: p.profile_id,
          tag: 'ERR_ORPHAN_PLAYER_ROW',
          reason: `Violation d'intégrité référentielle : game_id '${p.game_id}' absent de matches.parquet.`,
          targetPath: 'data/quarantine/orphan_players.parquet',
          detectedAtUtc: nowUtc,
        });
      }
      continue;
    }

    // 5. Filtre Section 4.5 : Exclusion des comptes "One-Trick Pony" (>100 matchs avec >=80% pick rate sur 1 civ)
    if (
      (p.total_account_matches ?? 0) > 100 &&
      (p.single_civ_pick_rate ?? 0) >= 0.8
    ) {
      quarantineRecords.push({
        id: `q_otp_${p.game_id}_${p.profile_id}`,
        game_id: p.game_id,
        profile_id: p.profile_id,
        tag: 'ERR_ONE_TRICK_PONY_ACCOUNT',
        reason: `Compte One-Trick Pony exclu (${p.total_account_matches} matchs, ${Math.round(
          (p.single_civ_pick_rate ?? 0) * 100
        )}% sur ${p.civ}).`,
        targetPath: 'data/quarantine/otp_accounts.parquet',
        detectedAtUtc: nowUtc,
      });
      continue;
    }

    validPlayers.push(p);
  }

  const replayEnhancedCount = matches.filter((m) => m.replay_enhanced).length;
  const replayEnhancedCoveragePct =
    matches.length > 0
      ? Math.round((replayEnhancedCount / matches.length) * 1000) / 10
      : 0;

  return {
    validMatches,
    validPlayers,
    quarantineRecords,
    replayEnhancedCoveragePct,
  };
}

