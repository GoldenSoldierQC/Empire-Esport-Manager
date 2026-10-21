import {
  BuildOrderDag,
  CeoArchetype,
  Civilization,
  EsportsPlayer,
  EtlPlayerRecord,
  FacilityUpgrade,
  OriginRegionCode,
  RtsMap,
  SponsorContract,
  StaffMember,
  TeamProfile,
} from './types';

export const CIVILIZATIONS: Civilization[] = [
  {
    id: 'franks',
    name: 'Francs',
    specialty: 'Fermes gratuites (+15% cueillette/fermes) & Cavalerie lourde (+20% PV)',
    primaryUnit: 'CAVALRY',
    uniqueUnitName: 'Lanceur de hache / Paladin',
    ecoBonusType: 'FOOD',
    ecoBonusRate: 1.06,
    militaryBonusRate: 1.07,
    gatherMultipliers: {food: 1.15, wood: 0.96, gold: 0.98, stone: 0.95},
    ageUpSpeedMultiplier: 1.0,
    techCostDiscount: 0.08,
    beatsCivIds: ['britons', 'mayans'],
    losesToCivIds: ['byzantines', 'teutons'],
    crestColor: '#3B82F6',
    winRatesByMap: {
      arabia: 0.512,
      arena: 0.491,
      nomad: 0.504,
      gold_rush: 0.509,
      black_forest: 0.488,
    },
  },
  {
    id: 'britons',
    name: 'Britons',
    specialty: 'Portée d’archers +2, Bergers +20% & Forums -50% bois en Châteaux',
    primaryUnit: 'ARCHERS',
    uniqueUnitName: 'Fantassin à arc long',
    ecoBonusType: 'WOOD',
    ecoBonusRate: 1.05,
    militaryBonusRate: 1.06,
    gatherMultipliers: {food: 1.08, wood: 1.12, gold: 0.96, stone: 0.94},
    ageUpSpeedMultiplier: 1.03,
    techCostDiscount: 0.1,
    beatsCivIds: ['teutons', 'byzantines'],
    losesToCivIds: ['franks', 'mongols'],
    crestColor: '#EF4444',
    winRatesByMap: {
      arabia: 0.506,
      arena: 0.502,
      nomad: 0.485,
      gold_rush: 0.514,
      black_forest: 0.511,
    },
  },
  {
    id: 'mongols',
    name: 'Mongols',
    specialty: 'Chasse +40%, Vision Éclaireurs +2 & Passage Féodal ultra-rapide (+14%)',
    primaryUnit: 'CAVALRY',
    uniqueUnitName: 'Mangudaï & Siège Rapide',
    ecoBonusType: 'FOOD',
    ecoBonusRate: 1.07,
    militaryBonusRate: 1.05,
    gatherMultipliers: {food: 1.18, wood: 0.98, gold: 0.95, stone: 0.92},
    ageUpSpeedMultiplier: 1.14,
    techCostDiscount: 0.05,
    beatsCivIds: ['britons', 'teutons'],
    losesToCivIds: ['mayans', 'byzantines'],
    crestColor: '#F59E0B',
    winRatesByMap: {
      arabia: 0.514,
      arena: 0.482,
      nomad: 0.518,
      gold_rush: 0.512,
      black_forest: 0.496,
    },
  },
  {
    id: 'teutons',
    name: 'Teutons',
    specialty: 'Fermes -40% bois, Armure de mêlée gratuite (+2) & Siège blindé',
    primaryUnit: 'INFANTRY',
    uniqueUnitName: 'Chevalier Teutonique & Onagre',
    ecoBonusType: 'STONE',
    ecoBonusRate: 1.05,
    militaryBonusRate: 1.07,
    gatherMultipliers: {food: 1.06, wood: 1.08, gold: 0.94, stone: 1.12},
    ageUpSpeedMultiplier: 0.94,
    techCostDiscount: 0.14,
    beatsCivIds: ['franks', 'mayans'],
    losesToCivIds: ['britons', 'mongols'],
    crestColor: '#94A3B8',
    winRatesByMap: {
      arabia: 0.484,
      arena: 0.519,
      nomad: 0.489,
      gold_rush: 0.494,
      black_forest: 0.517,
    },
  },
  {
    id: 'mayans',
    name: 'Mayas',
    specialty: 'Ressources durent +15%, +1 Villageois initial & Archers -20% coût',
    primaryUnit: 'ARCHERS',
    uniqueUnitName: 'Archer à plumes & Guerrier Aigle',
    ecoBonusType: 'GOLD',
    ecoBonusRate: 1.06,
    militaryBonusRate: 1.05,
    gatherMultipliers: {food: 1.04, wood: 1.06, gold: 1.15, stone: 1.02},
    ageUpSpeedMultiplier: 1.08,
    techCostDiscount: 0.12,
    beatsCivIds: ['mongols', 'byzantines'],
    losesToCivIds: ['franks', 'teutons'],
    crestColor: '#10B981',
    winRatesByMap: {
      arabia: 0.517,
      arena: 0.492,
      nomad: 0.508,
      gold_rush: 0.511,
      black_forest: 0.483,
    },
  },
  {
    id: 'byzantines',
    name: 'Byzantins',
    specialty: 'Contre-unités -25% coût, Passage Impérial -33% & Bâtiments +40% PV',
    primaryUnit: 'MONKS',
    uniqueUnitName: 'Cataphractaire & Chamelier Impérial',
    ecoBonusType: 'BALANCED',
    ecoBonusRate: 1.05,
    militaryBonusRate: 1.06,
    gatherMultipliers: {food: 1.03, wood: 1.03, gold: 1.06, stone: 1.14},
    ageUpSpeedMultiplier: 1.11,
    techCostDiscount: 0.22,
    beatsCivIds: ['franks', 'mongols'],
    losesToCivIds: ['britons', 'mayans'],
    crestColor: '#A855F7',
    winRatesByMap: {
      arabia: 0.496,
      arena: 0.514,
      nomad: 0.506,
      gold_rush: 0.498,
      black_forest: 0.505,
    },
  },
];

export const RTS_MAPS: RtsMap[] = [
  {
    id: 'arabia',
    name: 'Arabia (Échelle ×5)',
    terrainType: 'OPEN_PLAINS',
    scaleFactor: 5,
    rushDistance: 18,
    villagerWalkDistance: 1.18,
    neutralRelicsCount: 7,
    chokepointFactor: 0.25,
    elevationBonus: 1.22,
    description:
      'Vaste désert ouvert (surface ×5) avec gisements d’or secondaires éloignés. Le temps de traversée rend le scouting à l’Éclaireur indispensable avant tout raid.',
  },
  {
    id: 'arena',
    name: 'Arena (Échelle ×5)',
    terrainType: 'CLOSED_FORTRESS',
    scaleFactor: 5,
    rushDistance: 34,
    villagerWalkDistance: 1.06,
    neutralRelicsCount: 9,
    chokepointFactor: 0.85,
    elevationBonus: 1.05,
    description:
      'Immenses citadelles fortifiées séparées par un vaste no-man’s-land forestier. Favorise le contrôle des 9 reliques et les sièges prolongés.',
  },
  {
    id: 'nomad',
    name: 'Nomad (Échelle ×5)',
    terrainType: 'OPEN_PLAINS',
    scaleFactor: 5,
    rushDistance: 24,
    villagerWalkDistance: 1.26,
    neutralRelicsCount: 8,
    chokepointFactor: 0.35,
    elevationBonus: 1.18,
    description:
      'Carte continentale géante (×5) à départ dispersé. Le Brouillard de Guerre y est critique : impossible d’engager l’ennemi sans l’avoir localisé à l’Éclaireur.',
  },
  {
    id: 'gold_rush',
    name: 'Gold Rush (Échelle ×5)',
    terrainType: 'CENTER_GOLD',
    scaleFactor: 5,
    rushDistance: 22,
    villagerWalkDistance: 1.22,
    neutralRelicsCount: 7,
    chokepointFactor: 0.45,
    elevationBonus: 1.25,
    description:
      "Les mines d'or principales sont espacées dans le cratère central à longue distance de marche des Forums initiaux.",
  },
  {
    id: 'black_forest',
    name: 'Black Forest (Échelle ×5)',
    terrainType: 'DENSE_WOODLAND',
    scaleFactor: 5,
    rushDistance: 40,
    villagerWalkDistance: 1.14,
    neutralRelicsCount: 8,
    chokepointFactor: 0.92,
    elevationBonus: 1.10,
    description:
      'Massif forestier profond (×5) aux longs couloirs sinueux. Les trajets d’armée très longs imposent des avant-postes et des ateliers de siège avancés.',
  },
];

export const INITIAL_ROSTER: EsportsPlayer[] = [
  {
    id: 'p_valerius',
    handle: 'Valerius',
    fullName: 'Lucas Moreau',
    nationality: 'FR',
    age: 22,
    elo: 2640,
    role: 'IGL_STRATEGIST',
    favoriteCivId: 'byzantines',
    energy: 88,
    morale: 92,
    synergyWithTeam: 91,
    daysInTeam: 410,
    micro: {
      stutterStepping: 84,
      reactionSpeed: 82,
      quickwalling: 93,
      aimPrecision: 86,
    },
    macro: {
      boomProduction: 89,
      resourceSplit: 94,
      mapControl: 92,
    },
    tactical: {
      buildOrderExecution: 96,
      adaptability: 95,
      scouting: 94,
    },
    mental: {
      tiltResistance: 93,
      staminaBoSeries: 88,
      clutchFactor: 91,
    },
    contract: {
      monthlySalary: 6800,
      buyoutClause: 85000,
      prizeCutPercent: 15,
      monthsRemaining: 14,
    },
    careerStats: {
      matchesPlayed: 142,
      wins: 98,
      losses: 44,
      ggCallsForced: 67,
      avgEffectiveApm: 315,
    },
    isStarter: true,
  },
  {
    id: 'p_kestrel',
    handle: 'Kestrel',
    fullName: 'Soren Lindqvist',
    nationality: 'NO',
    age: 19,
    elo: 2710,
    role: 'ENTRY_AGGRESSOR',
    favoriteCivId: 'mongols',
    energy: 68, // Sous le seuil critique de 75% pour démontrer la pénalité exponentielle !
    morale: 85,
    synergyWithTeam: 84,
    daysInTeam: 245,
    micro: {
      stutterStepping: 98,
      reactionSpeed: 97,
      quickwalling: 94,
      aimPrecision: 96,
    },
    macro: {
      boomProduction: 81,
      resourceSplit: 83,
      mapControl: 91,
    },
    tactical: {
      buildOrderExecution: 88,
      adaptability: 86,
      scouting: 92,
    },
    mental: {
      tiltResistance: 74,
      staminaBoSeries: 79,
      clutchFactor: 94,
    },
    contract: {
      monthlySalary: 7400,
      buyoutClause: 110000,
      prizeCutPercent: 18,
      monthsRemaining: 10,
    },
    careerStats: {
      matchesPlayed: 118,
      wins: 84,
      losses: 34,
      ggCallsForced: 71,
      avgEffectiveApm: 392,
    },
    isStarter: true,
  },
  {
    id: 'p_bastion',
    handle: 'Bastion',
    fullName: 'Lukas Weber',
    nationality: 'DE',
    age: 25,
    elo: 2585,
    role: 'MACRO_SPECIALIST',
    favoriteCivId: 'teutons',
    energy: 94,
    morale: 90,
    synergyWithTeam: 88,
    daysInTeam: 520,
    micro: {
      stutterStepping: 79,
      reactionSpeed: 78,
      quickwalling: 88,
      aimPrecision: 82,
    },
    macro: {
      boomProduction: 98,
      resourceSplit: 97,
      mapControl: 90,
    },
    tactical: {
      buildOrderExecution: 93,
      adaptability: 84,
      scouting: 85,
    },
    mental: {
      tiltResistance: 95,
      staminaBoSeries: 96,
      clutchFactor: 86,
    },
    contract: {
      monthlySalary: 5900,
      buyoutClause: 65000,
      prizeCutPercent: 12,
      monthsRemaining: 18,
    },
    careerStats: {
      matchesPlayed: 165,
      wins: 106,
      losses: 59,
      ggCallsForced: 49,
      avgEffectiveApm: 278,
    },
    isStarter: true,
  },
  {
    id: 'p_aether',
    handle: 'Aether',
    fullName: 'Mateo Silva',
    nationality: 'BR',
    age: 20,
    elo: 2560,
    role: 'SUPPORT_DEFENDER',
    favoriteCivId: 'mayans',
    energy: 82,
    morale: 86,
    synergyWithTeam: 46, // Nouvelle recrue (< 60% -> applique le malus de synergie de -13.5%)
    daysInTeam: 14,
    micro: {
      stutterStepping: 91,
      reactionSpeed: 89,
      quickwalling: 95,
      aimPrecision: 90,
    },
    macro: {
      boomProduction: 86,
      resourceSplit: 88,
      mapControl: 87,
    },
    tactical: {
      buildOrderExecution: 85,
      adaptability: 89,
      scouting: 87,
    },
    mental: {
      tiltResistance: 88,
      staminaBoSeries: 85,
      clutchFactor: 84,
    },
    contract: {
      monthlySalary: 4800,
      buyoutClause: 55000,
      prizeCutPercent: 10,
      monthsRemaining: 24,
    },
    careerStats: {
      matchesPlayed: 64,
      wins: 41,
      losses: 23,
      ggCallsForced: 28,
      avgEffectiveApm: 340,
    },
    isStarter: false,
  },
];

export const TRANSFER_MARKET_PLAYERS: EsportsPlayer[] = [
  {
    id: 'm_viperion',
    handle: 'Viperion',
    fullName: 'Henrik Solberg',
    nationality: 'SE',
    age: 24,
    elo: 2765,
    role: 'IGL_STRATEGIST',
    favoriteCivId: 'mayans',
    energy: 91,
    morale: 94,
    synergyWithTeam: 38,
    daysInTeam: 0,
    micro: {
      stutterStepping: 95,
      reactionSpeed: 94,
      quickwalling: 99,
      aimPrecision: 95,
    },
    macro: {
      boomProduction: 96,
      resourceSplit: 95,
      mapControl: 97,
    },
    tactical: {
      buildOrderExecution: 97,
      adaptability: 98,
      scouting: 96,
    },
    mental: {
      tiltResistance: 97,
      staminaBoSeries: 95,
      clutchFactor: 98,
    },
    contract: {
      monthlySalary: 9500,
      buyoutClause: 42000,
      prizeCutPercent: 20,
      monthsRemaining: 12,
    },
    careerStats: {
      matchesPlayed: 310,
      wins: 242,
      losses: 68,
      ggCallsForced: 184,
      avgEffectiveApm: 380,
    },
    isStarter: false,
  },
  {
    id: 'm_hyrkan',
    handle: 'Hyrkan',
    fullName: 'Jin-Woo Park',
    nationality: 'KR',
    age: 18,
    elo: 2630,
    role: 'ENTRY_AGGRESSOR',
    favoriteCivId: 'franks',
    energy: 96,
    morale: 89,
    synergyWithTeam: 40,
    daysInTeam: 0,
    micro: {
      stutterStepping: 97,
      reactionSpeed: 98,
      quickwalling: 91,
      aimPrecision: 94,
    },
    macro: {
      boomProduction: 84,
      resourceSplit: 82,
      mapControl: 90,
    },
    tactical: {
      buildOrderExecution: 89,
      adaptability: 85,
      scouting: 91,
    },
    mental: {
      tiltResistance: 80,
      staminaBoSeries: 88,
      clutchFactor: 90,
    },
    contract: {
      monthlySalary: 5200,
      buyoutClause: 24000,
      prizeCutPercent: 12,
      monthsRemaining: 24,
    },
    careerStats: {
      matchesPlayed: 75,
      wins: 52,
      losses: 23,
      ggCallsForced: 41,
      avgEffectiveApm: 415,
    },
    isStarter: false,
  },
  {
    id: 'm_cassian',
    handle: 'Cassian',
    fullName: 'Tomasz Kowalski',
    nationality: 'PL',
    age: 23,
    elo: 2610,
    role: 'MACRO_SPECIALIST',
    favoriteCivId: 'britons',
    energy: 90,
    morale: 88,
    synergyWithTeam: 42,
    daysInTeam: 0,
    micro: {
      stutterStepping: 88,
      reactionSpeed: 86,
      quickwalling: 89,
      aimPrecision: 93,
    },
    macro: {
      boomProduction: 95,
      resourceSplit: 94,
      mapControl: 92,
    },
    tactical: {
      buildOrderExecution: 94,
      adaptability: 90,
      scouting: 89,
    },
    mental: {
      tiltResistance: 91,
      staminaBoSeries: 93,
      clutchFactor: 88,
    },
    contract: {
      monthlySalary: 5600,
      buyoutClause: 28000,
      prizeCutPercent: 14,
      monthsRemaining: 18,
    },
    careerStats: {
      matchesPlayed: 130,
      wins: 88,
      losses: 42,
      ggCallsForced: 53,
      avgEffectiveApm: 310,
    },
    isStarter: false,
  },
];

export const OPPONENT_DUELLISTS: EsportsPlayer[] = [
  {
    id: 'opp_drakon',
    handle: 'GL.Drakon',
    fullName: 'Aleksandar Petrov',
    nationality: 'RS',
    age: 23,
    elo: 2675,
    role: 'ENTRY_AGGRESSOR',
    favoriteCivId: 'franks',
    energy: 89,
    morale: 90,
    synergyWithTeam: 88,
    daysInTeam: 380,
    micro: {
      stutterStepping: 93,
      reactionSpeed: 92,
      quickwalling: 89,
      aimPrecision: 91,
    },
    macro: {
      boomProduction: 88,
      resourceSplit: 89,
      mapControl: 92,
    },
    tactical: {
      buildOrderExecution: 91,
      adaptability: 88,
      scouting: 90,
    },
    mental: {
      tiltResistance: 86,
      staminaBoSeries: 87,
      clutchFactor: 90,
    },
    contract: {
      monthlySalary: 7000,
      buyoutClause: 90000,
      prizeCutPercent: 15,
      monthsRemaining: 12,
    },
    careerStats: {
      matchesPlayed: 150,
      wins: 102,
      losses: 48,
      ggCallsForced: 69,
      avgEffectiveApm: 355,
    },
    isStarter: true,
  },
  {
    id: 'opp_solaris',
    handle: 'GL.Solaris',
    fullName: 'David Vance',
    nationality: 'CA',
    age: 21,
    elo: 2650,
    role: 'MACRO_SPECIALIST',
    favoriteCivId: 'britons',
    energy: 92,
    morale: 91,
    synergyWithTeam: 90,
    daysInTeam: 440,
    micro: {
      stutterStepping: 90,
      reactionSpeed: 88,
      quickwalling: 92,
      aimPrecision: 94,
    },
    macro: {
      boomProduction: 94,
      resourceSplit: 95,
      mapControl: 91,
    },
    tactical: {
      buildOrderExecution: 93,
      adaptability: 91,
      scouting: 89,
    },
    mental: {
      tiltResistance: 90,
      staminaBoSeries: 92,
      clutchFactor: 89,
    },
    contract: {
      monthlySalary: 6600,
      buyoutClause: 80000,
      prizeCutPercent: 15,
      monthsRemaining: 12,
    },
    careerStats: {
      matchesPlayed: 138,
      wins: 91,
      losses: 47,
      ggCallsForced: 58,
      avgEffectiveApm: 325,
    },
    isStarter: true,
  },
  {
    id: 'opp_talon',
    handle: 'GL.Talon',
    fullName: 'Marco Rossi',
    nationality: 'IT',
    age: 24,
    elo: 2620,
    role: 'IGL_STRATEGIST',
    favoriteCivId: 'mongols',
    energy: 86,
    morale: 88,
    synergyWithTeam: 85,
    daysInTeam: 300,
    micro: {
      stutterStepping: 89,
      reactionSpeed: 90,
      quickwalling: 87,
      aimPrecision: 88,
    },
    macro: {
      boomProduction: 89,
      resourceSplit: 90,
      mapControl: 93,
    },
    tactical: {
      buildOrderExecution: 92,
      adaptability: 94,
      scouting: 95,
    },
    mental: {
      tiltResistance: 89,
      staminaBoSeries: 86,
      clutchFactor: 91,
    },
    contract: {
      monthlySalary: 6100,
      buyoutClause: 75000,
      prizeCutPercent: 15,
      monthsRemaining: 12,
    },
    careerStats: {
      matchesPlayed: 129,
      wins: 83,
      losses: 46,
      ggCallsForced: 54,
      avgEffectiveApm: 332,
    },
    isStarter: true,
  },
];

export const INITIAL_DAG_PRESETS: BuildOrderDag[] = [
  {
    id: 'dag_scout_knights',
    name: '19 Pop Scout Rush -> Double Écurie Cavaliers',
    archetype: 'RUSH_AGGRESSIVE',
    author: 'Valerius (IGL)',
    description:
      'Ouverture agressive à la cavalerie légère en Âge Féodal avec bifurcation conditionnelle vers des Archers/Tirailleurs si l’adversaire érige des murs complets.',
    nodes: [
      {
        id: 'n_dark_boar',
        title: 'Âge I : 6 Moutons · 3 Bois · 2 Sangliers',
        age: 1,
        targetTick: 1,
        description: 'Exécution millimétrée du luring de sangliers et poussée de cerfs au Forum.',
        villagerAllocation: {food: 65, wood: 30, gold: 5, stone: 0},
        primaryUnitFocus: 'CAVALRY',
        powerSpikeBonus: 1.05,
        techUnlocked: 'Métier à tisser (Loom)',
        x: 60,
        y: 150,
      },
      {
        id: 'n_feudal_scouts',
        title: 'Âge II : Écurie Immédiate & 4 Éclaireurs',
        age: 2,
        targetTick: 10,
        description: 'Pression sur les bûcherons et chercheurs d’or adverses dès 09:15.',
        villagerAllocation: {food: 55, wood: 35, gold: 10, stone: 0},
        primaryUnitFocus: 'CAVALRY',
        powerSpikeBonus: 1.22,
        techUnlocked: 'Hache à double tranchant & Lignes de sang',
        x: 310,
        y: 85,
      },
      {
        id: 'n_feudal_skirms',
        title: 'Âge II (Adaptation) : Camp de Tir & Tirailleurs',
        age: 2,
        targetTick: 12,
        description: 'Réponse défensive si le scouting détecte une masse d’archers + lanciers.',
        villagerAllocation: {food: 45, wood: 45, gold: 10, stone: 0},
        primaryUnitFocus: 'ARCHERS',
        powerSpikeBonus: 1.15,
        techUnlocked: 'Empennage (Fletching)',
        x: 310,
        y: 235,
      },
      {
        id: 'n_castle_knights',
        title: 'Âge III : Power Spike 2 Écuries Cavaliers',
        age: 3,
        targetTick: 22,
        description: 'Transition vers Cavaliers lourds avec Armure de plaques +2 pour plier le centre.',
        villagerAllocation: {food: 48, wood: 24, gold: 28, stone: 0},
        primaryUnitFocus: 'CAVALRY',
        powerSpikeBonus: 1.34,
        techUnlocked: 'Barde en chaîne (+2 Armure) & Élevage',
        x: 590,
        y: 110,
      },
      {
        id: 'n_castle_boom',
        title: 'Âge III (Macro) : 3 Forums & Siège Défensif',
        age: 3,
        targetTick: 24,
        description: 'Ajout de 2 Forums supplémentaires et atelier de siège contre la gourmandise adverse.',
        villagerAllocation: {food: 45, wood: 35, gold: 12, stone: 8},
        primaryUnitFocus: 'SIEGE',
        powerSpikeBonus: 1.20,
        techUnlocked: 'Scie à archet & Mangonneau',
        x: 590,
        y: 250,
      },
      {
        id: 'n_imp_paladin',
        title: 'Âge IV : Déferlante Impériale & Trébuchets',
        age: 4,
        targetTick: 36,
        description: 'Point culminant du graphe : siège des châteaux et destruction du Forum.',
        villagerAllocation: {food: 42, wood: 23, gold: 30, stone: 5},
        primaryUnitFocus: 'SIEGE',
        powerSpikeBonus: 1.45,
        techUnlocked: 'Chimie, Conscription & Cavaliers Lourds',
        x: 860,
        y: 165,
      },
    ],
    edges: [
      {
        id: 'e1',
        fromNodeId: 'n_dark_boar',
        toNodeId: 'n_feudal_scouts',
        condition: 'DEFAULT',
        conditionLabel: 'Ouverture Standard (Carte Ouverte)',
      },
      {
        id: 'e2',
        fromNodeId: 'n_dark_boar',
        toNodeId: 'n_feudal_skirms',
        condition: 'ENEMY_AGGRESSION_DETECTED',
        conditionLabel: 'Si Caserne + 2 Camps de Tir adverses détectés',
      },
      {
        id: 'e3',
        fromNodeId: 'n_feudal_scouts',
        toNodeId: 'n_castle_knights',
        condition: 'DEFAULT',
        conditionLabel: 'Avantage d’Or & Contrôle Carte acquis',
      },
      {
        id: 'e4',
        fromNodeId: 'n_feudal_skirms',
        toNodeId: 'n_castle_boom',
        condition: 'ENEMY_GREED_DETECTED',
        conditionLabel: 'Si l’adversaire se mure et passe Châteaux',
      },
      {
        id: 'e5',
        fromNodeId: 'n_feudal_scouts',
        toNodeId: 'n_castle_boom',
        condition: 'ENEMY_GREED_DETECTED',
        conditionLabel: 'Si Murs de Pierre adverses détectés',
      },
      {
        id: 'e6',
        fromNodeId: 'n_castle_knights',
        toNodeId: 'n_imp_paladin',
        condition: 'RESOURCE_THRESHOLD',
        conditionLabel: 'Seuil : 1000 Nourriture + 800 Or',
      },
      {
        id: 'e7',
        fromNodeId: 'n_castle_boom',
        toNodeId: 'n_imp_paladin',
        condition: 'DEFAULT',
        conditionLabel: '110 Villageois atteints -> Impérial',
      },
    ],
  },
  {
    id: 'dag_archer_timing',
    name: 'Double Camp d’Archers -> Arbalétriers Timing Push',
    archetype: 'ARCHER_TIMING',
    author: 'Kestrel (Entry)',
    description:
      'Accumulation d’archers dès l’Âge Féodal pour profiter du Power Spike instantané de l’amélioration Arbalétrier + Pointe d’acier à l’Âge des Châteaux.',
    nodes: [
      {
        id: 'a_dark',
        title: 'Âge I : 6 Moutons · 4 Bois · Or Précoce',
        age: 1,
        targetTick: 1,
        description: 'Envoi de 3 villageois sur l’or avant le clic Féodal pour produire en continu.',
        villagerAllocation: {food: 55, wood: 33, gold: 12, stone: 0},
        primaryUnitFocus: 'ARCHERS',
        powerSpikeBonus: 1.06,
        techUnlocked: 'Métier à tisser',
        x: 60,
        y: 160,
      },
      {
        id: 'a_feudal_archers',
        title: 'Âge II : 2 Camps de Tir & Forge Empennage',
        age: 2,
        targetTick: 10,
        description: 'Masse critique de 14 Archers avec focus-fire et micro stutter-step.',
        villagerAllocation: {food: 35, wood: 40, gold: 25, stone: 0},
        primaryUnitFocus: 'ARCHERS',
        powerSpikeBonus: 1.25,
        techUnlocked: 'Empennage (+1 Portée/Attaque)',
        x: 340,
        y: 160,
      },
      {
        id: 'a_castle_xbows',
        title: 'Âge III : Timing Push Arbalétriers + Mangonneau',
        age: 3,
        targetTick: 21,
        description: 'Fenêtre de puissance chirurgicale de 120 secondes avant les Chevaliers adverses.',
        villagerAllocation: {food: 38, wood: 34, gold: 28, stone: 0},
        primaryUnitFocus: 'ARCHERS',
        powerSpikeBonus: 1.38,
        techUnlocked: 'Arbalétrier, Pointe d’acier & Balistique',
        x: 620,
        y: 160,
      },
      {
        id: 'a_imp_arbalester',
        title: 'Âge IV : Fantassins à Arc Lourd & Chimie',
        age: 4,
        targetTick: 35,
        description: 'Domination à distance soutenue par des Hallebardiers en écran frontal.',
        villagerAllocation: {food: 40, wood: 30, gold: 25, stone: 5},
        primaryUnitFocus: 'ARCHERS',
        powerSpikeBonus: 1.42,
        techUnlocked: 'Chimie & Bague de pouce',
        x: 880,
        y: 160,
      },
    ],
    edges: [
      {
        id: 'ae1',
        fromNodeId: 'a_dark',
        toNodeId: 'a_feudal_archers',
        condition: 'DEFAULT',
        conditionLabel: 'Transition Féodale Directe',
      },
      {
        id: 'ae2',
        fromNodeId: 'a_feudal_archers',
        toNodeId: 'a_castle_xbows',
        condition: 'DEFAULT',
        conditionLabel: '18 Archers en vie conservés',
      },
      {
        id: 'ae3',
        fromNodeId: 'a_castle_xbows',
        toNodeId: 'a_imp_arbalester',
        condition: 'RESOURCE_THRESHOLD',
        conditionLabel: 'Contrôle Colline Centrale acquis',
      },
    ],
  },
  {
    id: 'dag_fast_castle_boom',
    name: '26+2 Fast Castle -> 3 Forums Boom & Reliques',
    archetype: 'FAST_CASTLE_BOOM',
    author: 'Bastion (Macro)',
    description:
      'Stratégie macro-économique privilégiée sur Arena et Black Forest : murs complets, passage rapide à l’Âge des Châteaux et explosion économique.',
    nodes: [
      {
        id: 'fc_dark',
        title: 'Âge I : Murs Complets & 26 Villageois',
        age: 1,
        targetTick: 1,
        description: 'Économie optimisée sans armée à l’Âge Sombre, fermeture des goulets.',
        villagerAllocation: {food: 60, wood: 28, gold: 12, stone: 0},
        primaryUnitFocus: 'MONKS',
        powerSpikeBonus: 1.02,
        techUnlocked: 'Murs de Palissade / Pierre',
        x: 70,
        y: 160,
      },
      {
        id: 'fc_feudal_skip',
        title: 'Âge II : Marché + Forge (Saut Féodal)',
        age: 2,
        targetTick: 12,
        description: 'Construction immédiate des deux bâtiments requis et clic Âge des Châteaux.',
        villagerAllocation: {food: 58, wood: 27, gold: 15, stone: 0},
        primaryUnitFocus: 'MONKS',
        powerSpikeBonus: 1.04,
        techUnlocked: 'Passage Châteaux Rapide (14:10)',
        x: 340,
        y: 160,
      },
      {
        id: 'fc_castle_3tc',
        title: 'Âge III : 3 Forums + Monastère Reliques',
        age: 3,
        targetTick: 19,
        description: 'Production simultanée sur 3 Forums et collecte des 5 reliques de la carte.',
        villagerAllocation: {food: 52, wood: 32, gold: 10, stone: 6},
        primaryUnitFocus: 'INFANTRY',
        powerSpikeBonus: 1.28,
        techUnlocked: 'Brouette, Charrette à bras & Sainteté',
        x: 610,
        y: 160,
      },
      {
        id: 'fc_imp_siege',
        title: 'Âge IV : Rouleau Compresseur Infanterie + Onagres',
        age: 4,
        targetTick: 32,
        description: 'Surnombre économique massif converti en 6 Casernes et 3 Ateliers de Siège.',
        villagerAllocation: {food: 44, wood: 26, gold: 22, stone: 8},
        primaryUnitFocus: 'SIEGE',
        powerSpikeBonus: 1.48,
        techUnlocked: 'Onagre de Siège & Champion',
        x: 880,
        y: 160,
      },
    ],
    edges: [
      {
        id: 'fce1',
        fromNodeId: 'fc_dark',
        toNodeId: 'fc_feudal_skip',
        condition: 'DEFAULT',
        conditionLabel: 'Murs intacts à 08:30',
      },
      {
        id: 'fce2',
        fromNodeId: 'fc_feudal_skip',
        toNodeId: 'fc_castle_3tc',
        condition: 'DEFAULT',
        conditionLabel: '800 Nourriture + 200 Or',
      },
      {
        id: 'fce3',
        fromNodeId: 'fc_castle_3tc',
        toNodeId: 'fc_imp_siege',
        condition: 'RESOURCE_THRESHOLD',
        conditionLabel: '125 Villageois + 3 Reliques',
      },
    ],
  },
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'st_coach',
    name: 'Marc "Tactician" Delacroix',
    role: 'HEAD_COACH',
    specialtyLabel: 'Architecture DAG & Synergie d’équipe',
    skillRating: 91,
    monthlySalary: 4200,
    hired: true,
    effectDescription:
      'Réduit de 50 % le malus de synergie des nouvelles recrues et accélère l’intégration tactique (+6 % précision DAG).',
  },
  {
    id: 'st_analyst',
    name: 'Elena Rostova',
    role: 'DATA_ANALYST',
    specialtyLabel: 'Scouting ETL & Matrices de Contre',
    skillRating: 89,
    monthlySalary: 3600,
    hired: true,
    effectDescription:
      'Débloque les probabilités exactes de victoire lors du Draft Pick/Ban et améliore la détection des bifurcations adverses.',
  },
  {
    id: 'st_psych',
    name: 'Dr. Arthur Vermeulen',
    role: 'SPORTS_PSYCHOLOGIST',
    specialtyLabel: 'Gestion du Tilt & Récupération Bo5/Bo7',
    skillRating: 94,
    monthlySalary: 4500,
    hired: false,
    effectDescription:
      'Restaure +18 % d’énergie entre les manches d’un Bo3/Bo5 et réduit de 35 % les chocs de moral provoquant un GG Call précoce.',
  },
];

export const INITIAL_FACILITIES: FacilityUpgrade[] = [
  {
    id: 'fac_house',
    name: 'Gaming House Impériale (Quartier Général)',
    category: 'GAMING_HOUSE',
    level: 2,
    maxLevel: 5,
    upgradeCost: 35000,
    maintenanceMonthly: 2800,
    bonusDescription: '+4 % gain de synergie hebdomadaire et réduction de la fatigue de base.',
  },
  {
    id: 'fac_bootcamp',
    name: 'Salle de Scrims & Simulateur Tactique DAG',
    category: 'BOOTCAMP_LAB',
    level: 2,
    maxLevel: 5,
    upgradeCost: 42000,
    maintenanceMonthly: 2200,
    bonusDescription: '+5 % vitesse d’exécution des Build Orders et bonus de Power Spike.',
  },
  {
    id: 'fac_wellness',
    name: 'Centre de Récupération & Cryo-Endurance',
    category: 'WELLNESS_CENTER',
    level: 1,
    maxLevel: 5,
    upgradeCost: 28000,
    maintenanceMonthly: 1800,
    bonusDescription:
      'Augmente la régénération d’énergie après chaque match pour maintenir les joueurs au-dessus du seuil critique de 75 %.',
  },
];

export const INITIAL_SPONSORS: SponsorContract[] = [
  {
    id: 'sp_hyperion',
    brandName: 'Hyperion Peripherals',
    sector: 'Claviers Mécaniques Optiques',
    monthlyPayout: 18500,
    winBonus: 4500,
    objectiveDescription: 'Maintenir un taux de victoire global supérieur à 55 % cette saison.',
    requiredWinRate: 0.55,
    active: true,
  },
  {
    id: 'sp_aegis_cloud',
    brandName: 'Aegis Telemetry Cloud',
    sector: 'Infrastructure Data & IA Esport',
    monthlyPayout: 14000,
    winBonus: 6000,
    objectiveDescription: 'Remporter une série Bo3 ou Bo5 contre הגל (GamerLegion / Top Seed).',
    requiredWinRate: 0.60,
    active: true,
  },
  {
    id: 'sp_kronos',
    brandName: 'Kronos Energy Nutrition',
    sector: 'Performance & Endurance',
    monthlyPayout: 11500,
    winBonus: 3200,
    objectiveDescription: 'Aligner au moins 2 joueurs différents lors d’une série victorieuse.',
    requiredWinRate: 0.50,
    active: false,
  },
];

export const RAW_ETL_DATASET: EtlPlayerRecord[] = [
  {
    rawId: 'we_99412',
    handle: 'TheViper_AOE',
    sourceApi: 'WorldsEdge_API',
    rawLadderElo: 2792,
    tournamentWinRate: 0.742,
    avgFeudalTimeSec: 552,
    avgeApm: 385,
    normalizedVector: {micro: 97, macro: 96, tactical: 98, mental: 97},
  },
  {
    rawId: 'se_88301',
    handle: 'Hera_RTS',
    sourceApi: 'SiegeEngineers_Dump',
    rawLadderElo: 2815,
    tournamentWinRate: 0.768,
    avgFeudalTimeSec: 546,
    avgeApm: 428,
    normalizedVector: {micro: 99, macro: 97, tactical: 96, mental: 95},
  },
  {
    rawId: 'cm_77214',
    handle: 'Liereyy_Micro',
    sourceApi: 'CaptainsMode_Drafts',
    rawLadderElo: 2754,
    tournamentWinRate: 0.715,
    avgFeudalTimeSec: 550,
    avgeApm: 412,
    normalizedVector: {micro: 99, macro: 92, tactical: 94, mental: 93},
  },
  {
    rawId: 'we_66509',
    handle: 'Yo_Macro',
    sourceApi: 'WorldsEdge_API',
    rawLadderElo: 2710,
    tournamentWinRate: 0.684,
    avgFeudalTimeSec: 561,
    avgeApm: 295,
    normalizedVector: {micro: 89, macro: 98, tactical: 96, mental: 96},
  },
  {
    rawId: 'se_55120',
    handle: 'Tatoh_Strategist',
    sourceApi: 'SiegeEngineers_Dump',
    rawLadderElo: 2690,
    tournamentWinRate: 0.665,
    avgFeudalTimeSec: 558,
    avgeApm: 320,
    normalizedVector: {micro: 91, macro: 94, tactical: 98, mental: 92},
  },
];

export const ORIGIN_REGIONS_META: Record<
  OriginRegionCode,
  {
    label: string;
    flagCode: string;
    sponsorBonusLabel: string;
    scoutingPoolLabel: string;
  }
> = {
  FR: {
    label: 'France (Europe Ouest)',
    flagCode: 'FR',
    sponsorBonusLabel: '+12 % dotation des sponsors Périphériques & Tech EU',
    scoutingPoolLabel: 'Bassin riche en IGL Stratèges & spécialistes DAG',
  },
  KR: {
    label: 'Corée du Sud (Asie-Pacifique)',
    flagCode: 'KR',
    sponsorBonusLabel: '+15 % contrats Télécoms & Fibre Haute Fréquence',
    scoutingPoolLabel: 'Viviers de prodiges Micro (APM > 390, Stutter-step)',
  },
  DE: {
    label: 'Allemagne (DACH)',
    flagCode: 'DE',
    sponsorBonusLabel: '+10 % stabilité des commanditaires Ingénierie & Cloud',
    scoutingPoolLabel: 'Spécialistes Macro-Économiques (Boom 3-TC & Siège)',
  },
  SE: {
    label: 'Suède (Scandinavie)',
    flagCode: 'SE',
    sponsorBonusLabel: '+12 % primes de victoire en tournois internationaux',
    scoutingPoolLabel: 'Joueurs hybrides à haute résistance au Tilt (Bo5/Bo7)',
  },
  BR: {
    label: 'Brésil (Amérique Latine)',
    flagCode: 'BR',
    sponsorBonusLabel: '+15 % engagement communautaire & sponsors Énergie',
    scoutingPoolLabel: 'Duellistes ultra-agressifs (Scout Rush & Quickwall)',
  },
  NA: {
    label: 'Amérique du Nord (USA / Canada)',
    flagCode: 'NA',
    sponsorBonusLabel: '+18 % capital-risque & contrats Venture Esport',
    scoutingPoolLabel: 'Profils polyvalents Captains Mode & Analystes ETL',
  },
};

export const CEO_ARCHETYPES_META: Record<
  CeoArchetype,
  {
    title: string;
    subtitle: string;
    pros: string;
    cons: string;
    synergyBonus: number;
    budgetModifier: number;
    dagResearchBonusPct: number;
  }
> = {
  PRODIGY_EX_PRO: {
    title: 'Le Prodige / Ancien Pro',
    subtitle: 'Légende retirée du ladder AoE2 devenue fondateur d’écurie',
    pros: '+15 % de synergie d’équipe immédiate et respect total du vestiaire (+8 Moral)',
    cons: 'Réseau de sponsors institutionnels à bâtir de zéro (-15 000 € de capital initial)',
    synergyBonus: 15,
    budgetModifier: -15000,
    dagResearchBonusPct: 5,
  },
  MAGNATE_FINANCIER: {
    title: 'Le Magnat / Financier',
    subtitle: 'Stratège en capital-investissement et négociation de clauses',
    pros: '+45 000 € de capital initial supplémentaire & -15 % sur les clauses de rachat',
    cons: 'Pression des investisseurs accrue dès la Saison 1 (+5 % Win-Rate exigé par les sponsors)',
    synergyBonus: 0,
    budgetModifier: 45000,
    dagResearchBonusPct: 0,
  },
  STRATEGIST_VISIONARY: {
    title: 'Le Stratège / Visionnaire',
    subtitle: 'Architecte Data, théorie des jeux et graphes orientés acycliques (DAG)',
    pros: '+14 % vitesse de déblocage des technologies DAG & efficacité accrue des séances VOD',
    cons: 'Budget initial serré (-10 000 €) investi dans l’infrastructure analytique',
    synergyBonus: 5,
    budgetModifier: -10000,
    dagResearchBonusPct: 14,
  },
};

export const INITIAL_TEAM_PROFILE: TeamProfile = {
  id: 'team_aegis_01',
  name: 'Aegis Empire Gaming',
  tag: 'AEG',
  foundedYear: 2026,
  countryOrigin: 'FR',
  primaryColor: '#D97706',
  secondaryColor: '#1E3A8A',
  emblemShape: 'SHIELD',
  ceo: {
    firstName: 'Alexandre',
    lastName: 'Valerius',
    archetype: 'STRATEGIST_VISIONARY',
    avatarStyle: 'IMPERIAL_COMMANDER',
  },
  settings: {
    startingBudgetTier: 'STANDARD_CONTENDER',
    initialBudgetAmount: 145000,
    divisionTier: 'CHALLENGER_LEAGUE',
    fogOfWarMandatoryScout: true,
    exponentialFatigueBurnout: true,
    buyoutSeverity: 'STANDARD',
  },
};

export const RUST_ENGINE_REFERENCE_CODE = `// src-tauri/src/simulation/tick_engine.rs
use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection, Result};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CeoProfile {
    pub first_name: String,
    pub last_name: String,
    pub archetype: String, // PRODIGY_EX_PRO | MAGNATE_FINANCIER | STRATEGIST_VISIONARY
    pub avatar_style: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamProfile {
    pub id: String,
    pub name: String,
    pub tag: String,       // 3..=4 uppercase chars (e.g. "AEG")
    pub founded_year: u16,
    pub country_origin: String,
    pub primary_color: String,
    pub secondary_color: String,
    pub emblem_shape: String,
    pub ceo: CeoProfile,
    pub fog_of_war_mandatory_scout: bool,
    pub exponential_fatigue_burnout: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerVector {
    pub id: String,
    pub handle: String,
    pub micro: f64,      // 1.0..=100.0 (Stutter-step, Quickwall, Aim)
    pub macro_eco: f64,  // 1.0..=100.0 (Boom, Resource Split, Map Control)
    pub tactical: f64,   // 1.0..=100.0 (DAG Execution, Scouting)
    pub mental: f64,     // 1.0..=100.0 (Tilt Resistance, Bo5 Stamina, Clutch)
    pub energy: f64,     // 0.0..=100.0 (Critical threshold at 75.0%)
    pub synergy: f64,    // 0.0..=100.0 (<60% triggers 12%-15% cohesion malus)
}

impl PlayerVector {
    /// Dégradation exponentielle de la capacité mécanique sous le seuil de 75 %
    pub fn effective_micro(&self) -> f64 {
        if self.energy >= 75.0 {
            self.micro
        } else {
            let deficit_ratio = (75.0 - self.energy) / 75.0;
            self.micro * (-1.35 * deficit_ratio).exp()
        }
    }

    /// Modificateur de cohésion tactique (-12% à -15% en cas de déficit de synergie)
    pub fn synergy_modifier(&self) -> f64 {
        if self.synergy >= 60.0 {
            1.0 + ((self.synergy - 60.0) / 40.0) * 0.05
        } else {
            0.85 + (self.synergy / 60.0) * 0.03 // Malus entre -12% et -15%
        }
    }
}

#[tauri::command]
pub async fn save_team_and_ceo_profile(profile: TeamProfile) -> Result<String, String> {
    // Persistance transactionnelle dans SQLite via le pont IPC Tauri
    Ok(format!("Écurie [{}] {} sauvegardée avec succès", profile.tag, profile.name))
}`;

export const SQLITE_SCHEMA_REFERENCE = `-- migrations/001_esport_rts_schema.sql
CREATE TABLE IF NOT EXISTS team_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tag TEXT NOT NULL CHECK(length(tag) BETWEEN 3 AND 4),
    founded_year INTEGER NOT NULL,
    country_origin TEXT NOT NULL,
    primary_color TEXT NOT NULL,
    secondary_color TEXT NOT NULL,
    emblem_shape TEXT NOT NULL,
    ceo_first_name TEXT NOT NULL,
    ceo_last_name TEXT NOT NULL,
    ceo_archetype TEXT NOT NULL CHECK(ceo_archetype IN ('PRODIGY_EX_PRO','MAGNATE_FINANCIER','STRATEGIST_VISIONARY')),
    ceo_avatar_style TEXT NOT NULL,
    starting_budget_tier TEXT NOT NULL,
    division_tier TEXT NOT NULL,
    fog_of_war_mandatory_scout INTEGER NOT NULL DEFAULT 1,
    exponential_fatigue_burnout INTEGER NOT NULL DEFAULT 1,
    buyout_severity TEXT NOT NULL DEFAULT 'STANDARD'
);

CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    handle TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('IGL_STRATEGIST','ENTRY_AGGRESSOR','SUPPORT_DEFENDER','MACRO_SPECIALIST')),
    elo INTEGER NOT NULL,
    energy REAL NOT NULL DEFAULT 100.0,
    synergy REAL NOT NULL DEFAULT 75.0,
    micro_stutter INTEGER NOT NULL,
    micro_reaction INTEGER NOT NULL,
    micro_quickwall INTEGER NOT NULL,
    macro_boom INTEGER NOT NULL,
    macro_split INTEGER NOT NULL,
    tactical_dag INTEGER NOT NULL,
    mental_tilt INTEGER NOT NULL,
    mental_stamina INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS build_order_dags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    archetype TEXT NOT NULL,
    dag_json TEXT NOT NULL -- Graphe Orienté Acyclique sérialisé
);

CREATE TABLE IF NOT EXISTS match_ticks_telemetry (
    match_id TEXT NOT NULL,
    tick_index INTEGER NOT NULL,
    blue_effective_force REAL NOT NULL,
    red_effective_force REAL NOT NULL,
    blue_morale REAL NOT NULL,
    red_morale REAL NOT NULL,
    gg_called INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (match_id, tick_index)
);`;

