// Modélisation complète des types pour Aegis Empire Manager

export type PlayerRole =
  | 'IGL_STRATEGIST'
  | 'ENTRY_AGGRESSOR'
  | 'SUPPORT_DEFENDER'
  | 'MACRO_SPECIALIST';

export interface PlayerMicroAttributes {
  stutterStepping: number; // 1-100
  reactionSpeed: number; // 1-100
  quickwalling: number; // 1-100
  aimPrecision: number; // 1-100 (focus fire / mangonel shots)
}

export interface PlayerMacroAttributes {
  boomProduction: number; // 1-100 (production continue de villageois / forums)
  resourceSplit: number; // 1-100 (équilibrage bois/nourriture/or/pierre)
  mapControl: number; // 1-100 (avant-postes, reliques, collines)
}

export interface PlayerTacticalAttributes {
  buildOrderExecution: number; // 1-100 (précision d'exécution du DAG)
  adaptability: number; // 1-100 (transition d'unités sur bifurcation)
  scouting: number; // 1-100 (détection des bâtiments adverses)
}

export interface PlayerMentalPhysicalAttributes {
  tiltResistance: number; // 1-100 (résistance à la perte de moral sur raid)
  staminaBoSeries: number; // 1-100 (endurance sur Bo5/Bo7)
  clutchFactor: number; // 1-100 (bonus sous haute pression / fin de partie)
}

export interface EsportsPlayer {
  id: string;
  handle: string;
  fullName: string;
  nationality: string;
  age: number;
  elo: number;
  role: PlayerRole;
  favoriteCivId: string;
  energy: number; // 0-100 (Seuil critique à 75% -> pénalité exponentielle)
  morale: number; // 0-100
  synergyWithTeam: number; // 0-100 (Si < 60%, malus de 12% à 15% sur la cohésion tactique)
  daysInTeam: number;
  micro: PlayerMicroAttributes;
  macro: PlayerMacroAttributes;
  tactical: PlayerTacticalAttributes;
  mental: PlayerMentalPhysicalAttributes;
  contract: {
    monthlySalary: number;
    buyoutClause: number;
    prizeCutPercent: number;
    monthsRemaining: number;
  };
  careerStats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    ggCallsForced: number;
    avgEffectiveApm: number;
  };
  isStarter: boolean;
}

export type DayOfWeek = 'LUN' | 'MAR' | 'MER' | 'JEU' | 'VEN' | 'SAM' | 'DIM';

export type TrainingActivityType =
  | 'MACRO_DRILL'
  | 'MICRO_QUICKWALL'
  | 'VOD_SCOUTING'
  | 'TEAM_SCRIM'
  | 'REST_RECOVERY';

export type WeeklySchedule = Record<string, Record<DayOfWeek, TrainingActivityType>>;

export type DagConditionType =
  | 'DEFAULT'
  | 'ENEMY_AGGRESSION_DETECTED'
  | 'ENEMY_GREED_DETECTED'
  | 'RESOURCE_THRESHOLD';

export type UnitCategory = 'INFANTRY' | 'ARCHERS' | 'CAVALRY' | 'SIEGE' | 'MONKS';

export type AgePhase = 1 | 2 | 3 | 4; // I: Sombre, II: Féodal, III: Châteaux, IV: Impérial

export interface DagNode {
  id: string;
  title: string;
  age: AgePhase;
  targetTick: number; // Tick cible indicatif (1 tick = 5s)
  description: string;
  villagerAllocation: {
    food: number; // %
    wood: number; // %
    gold: number; // %
    stone: number; // %
  };
  primaryUnitFocus: UnitCategory;
  powerSpikeBonus: number; // Multiplicateur ex: 1.18 (+18% force militaire sur la fenêtre)
  techUnlocked: string;
  x: number; // Position visuelle dans l'éditeur DAG
  y: number;
}

export interface DagEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  condition: DagConditionType;
  conditionLabel: string;
}

export interface BuildOrderDag {
  id: string;
  name: string;
  archetype: 'RUSH_AGGRESSIVE' | 'FAST_CASTLE_BOOM' | 'ARCHER_TIMING' | 'ADAPTIVE_COUNTER';
  author: string;
  description: string;
  nodes: DagNode[];
  edges: DagEdge[];
}

export interface Civilization {
  id: string;
  name: string;
  specialty: string;
  primaryUnit: UnitCategory;
  uniqueUnitName: string;
  ecoBonusType: 'FOOD' | 'WOOD' | 'GOLD' | 'STONE' | 'BALANCED';
  ecoBonusRate: number; // ex: 1.06
  militaryBonusRate: number; // ex: 1.06
  // Asymétries prononcées mais strictement équilibrées (Win-Rate 48%-52%)
  gatherMultipliers: {
    food: number;
    wood: number;
    gold: number;
    stone: number;
  };
  ageUpSpeedMultiplier: number; // ex: 1.12 (+12% vitesse de passage d'âge)
  techCostDiscount: number; // ex: 0.15 (-15% coût des technologies)
  beatsCivIds: string[]; // Matrice Beats
  losesToCivIds: string[]; // Matrice Loses_to
  crestColor: string;
  winRatesByMap: Record<string, number>; // Strictement compris entre 0.480 et 0.520
}

export interface RtsMap {
  id: string;
  name: string;
  terrainType: 'OPEN_PLAINS' | 'CLOSED_FORTRESS' | 'CENTER_GOLD' | 'DENSE_WOODLAND';
  scaleFactor: number; // Échelle ×5
  rushDistance: number; // Distance effective à traverser (ex: 18 à 42 segments)
  villagerWalkDistance: number; // Distance moyenne de trajet vers les ressources espacées
  neutralRelicsCount: number;
  chokepointFactor: number; // 0.0 à 1.0 (avantage quickwall / siège)
  elevationBonus: number; // 1.05 à 1.25 (modificateur de terrain colline)
  description: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'HEAD_COACH' | 'DATA_ANALYST' | 'SPORTS_PSYCHOLOGIST';
  specialtyLabel: string;
  skillRating: number; // 1-100
  monthlySalary: number;
  hired: boolean;
  effectDescription: string;
}

export interface FacilityUpgrade {
  id: string;
  name: string;
  category: 'GAMING_HOUSE' | 'BOOTCAMP_LAB' | 'WELLNESS_CENTER' | 'FIBER_TELEMETRY';
  level: number;
  maxLevel: number;
  upgradeCost: number;
  maintenanceMonthly: number;
  bonusDescription: string;
}

export interface SponsorContract {
  id: string;
  brandName: string;
  sector: string;
  monthlyPayout: number;
  winBonus: number;
  objectiveDescription: string;
  requiredWinRate: number; // ex: 0.55
  active: boolean;
}

export interface TickSideState {
  playerId: string;
  playerHandle: string;
  civId: string;
  age: AgePhase;
  resources: {
    food: number;
    wood: number;
    gold: number;
    stone: number;
  };
  villagers: number;
  scoutsCount: number; // Unité d'éclairage obligatoire dès le départ
  scoutingIntelPercent: number; // 0-100% de carte/ennemi révélé à travers le Brouillard de Guerre
  enemyRevealed: boolean; // Si false sous Fog of War, aucun ciblage militaire direct n'est possible
  armyTransitProgress: number; // 0-100% progression sur la carte ×5 selon la Rush Distance
  relicsCaptured: number;
  militaryUnits: Record<UnitCategory, number>;
  activeDagNodeId: string;
  effectiveMicro: number;
  effectiveMacro: number;
  synergyModifier: number; // ex: 0.86 si malus de -14%
  effectiveMilitaryForce: number; // F_m(t)
  morale: number; // 0-100
  townCenterHp: number; // 0-6500 (PV augmentés pour des sièges tactiques prolongés)
  maxTownCenterHp: number; // 6500
  castlesBuilt: number;
  raidsInflicted: number;
  villagersLost: number;
}

export interface MatchTickEvent {
  tick: number;
  timeSeconds: number;
  type:
    | 'ECONOMY'
    | 'SCOUTING_FOG'
    | 'DAG_TRANSITION'
    | 'ENGAGEMENT'
    | 'CRITICAL_MICRO'
    | 'MORALE_SHOCK'
    | 'COACH_CALL'
    | 'GG_CALL';
  side: 'BLUE' | 'RED' | 'NEUTRAL';
  title: string;
  detail: string;
  formulaSnapshot?: string;
}

export interface TickHistorySnapshot {
  tick: number;
  timeSeconds: number;
  blueForce: number;
  redForce: number;
  blueEco: number;
  redEco: number;
  blueScore: number;
  redScore: number;
  blueMorale: number;
  redMorale: number;
  blueIntel: number;
  redIntel: number;
  blueState: TickSideState;
  redState: TickSideState;
}

export interface LiveMatchState {
  matchId: string;
  seriesFormat: 'BO1' | 'BO3' | 'BO5';
  currentGameNumber: number;
  blueSeriesScore: number;
  redSeriesScore: number;
  mapId: string;
  fogOfWarEnabled: boolean; // Brouillard de guerre activable/désactivable
  tick: number; // 1 tick = 5s
  timeSeconds: number;
  status: 'DRAFTING' | 'RUNNING' | 'PAUSED' | 'FINISHED';
  winnerSide?: 'BLUE' | 'RED';
  winReason?: 'GG_CALL' | 'TOWN_CENTER_DESTROYED' | 'TIME_SCORE_VICTORY';
  blue: TickSideState;
  red: TickSideState;
  events: MatchTickEvent[];
  history: TickHistorySnapshot[];
}

export interface EtlPlayerRecord {
  rawId: string;
  handle: string;
  sourceApi: 'WorldsEdge_API' | 'SiegeEngineers_Dump' | 'CaptainsMode_Drafts';
  rawLadderElo: number;
  tournamentWinRate: number;
  avgFeudalTimeSec: number;
  avgeApm: number;
  normalizedVector: {
    micro: number;
    macro: number;
    tactical: number;
    mental: number;
  };
}

// --- MODE CRÉATEUR : IDENTITÉ DE L'ÉCURIE & DU CEO ---

export type EmblemShape =
  | 'SHIELD'
  | 'EAGLE'
  | 'SWORD'
  | 'WOLF'
  | 'CROWN'
  | 'FORTRESS';

export type CeoArchetype =
  | 'PRODIGY_EX_PRO'
  | 'MAGNATE_FINANCIER'
  | 'STRATEGIST_VISIONARY';

export type CeoAvatarStyle =
  | 'IMPERIAL_COMMANDER'
  | 'CYBER_TACTICIAN'
  | 'EXECUTIVE_MOGUL'
  | 'VETERAN_CHAMPION';

export type OriginRegionCode = 'FR' | 'KR' | 'DE' | 'SE' | 'BR' | 'NA';

export type StartingBudgetTier =
  | 'SURVIVAL_LOCAL'
  | 'STANDARD_CONTENDER'
  | 'INVESTOR_SYNDICATE';

export type LeagueDivisionTier =
  | 'REGIONAL_OPEN'
  | 'CHALLENGER_LEAGUE'
  | 'IMPERIAL_MAJOR';

export type BuyoutSeverity = 'RELAXED' | 'STANDARD' | 'STRICT_CLAUSE';

export interface CeoProfile {
  firstName: string;
  lastName: string;
  archetype: CeoArchetype;
  avatarStyle: CeoAvatarStyle;
  customAvatarDataUrl?: string;
}

export interface TeamSimulationSettings {
  startingBudgetTier: StartingBudgetTier;
  initialBudgetAmount: number;
  divisionTier: LeagueDivisionTier;
  fogOfWarMandatoryScout: boolean;
  exponentialFatigueBurnout: boolean;
  buyoutSeverity: BuyoutSeverity;
}

export interface TeamProfile {
  id: string;
  name: string;
  tag: string; // 3 à 4 lettres majuscules (ex: AEG)
  foundedYear: number;
  countryOrigin: OriginRegionCode;
  primaryColor: string; // Code hexadécimal (ex: #D97706)
  secondaryColor: string; // Code hexadécimal (ex: #1E3A8A)
  emblemShape: EmblemShape;
  customLogoDataUrl?: string;
  ceo: CeoProfile;
  settings: TeamSimulationSettings;
}

