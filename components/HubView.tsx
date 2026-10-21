'use client';

import React, {useState} from 'react';
import {
  Civilization,
  DayOfWeek,
  EsportsPlayer,
  FacilityUpgrade,
  PlayerRole,
  SponsorContract,
  StaffMember,
  TeamProfile,
  TrainingActivityType,
  WeeklySchedule,
} from '@/lib/types';
import {
  computeEffectiveMicro,
  computePlayerAverages,
  computeSynergyModifier,
} from '@/lib/tick-engine';
import TeamVisualAssetShowcase from './TeamVisualAssetShowcase';
import {soundEngine} from '@/lib/sound';
import {
  Activity,
  BatteryCharging,
  Brain,
  Calendar,
  CheckCircle2,
  Crosshair,
  Sliders,
  Sparkles,
  Swords,
} from 'lucide-react';

interface HubViewProps {
  teamProfile: TeamProfile;
  roster: EsportsPlayer[];
  civilizations: Civilization[];
  staff: StaffMember[];
  facilities: FacilityUpgrade[];
  sponsors: SponsorContract[];
  teamBudget: number;
  seasonDay: number;
  weeklySchedule: WeeklySchedule;
  onUpdateWeeklySchedule: (nextSchedule: WeeklySchedule) => void;
  onExecuteWeeklySchedule: () => {
    summary: string;
    totalGains: number;
  };
  onUpdatePlayer: (updated: EsportsPlayer) => void;
  onTeamScrim: () => void;
  onRestRoster: () => void;
  onOpenCreatorWizard: () => void;
  onNavigateToMatch: () => void;
}

const ROLE_LABELS: Record<PlayerRole, {title: string; desc: string}> = {
  IGL_STRATEGIST: {
    title: 'IGL / Stratège DAG',
    desc: '+6 % efficacité sur toutes les bifurcations tactiques et lecture du scouting.',
  },
  ENTRY_AGGRESSOR: {
    title: 'Entry / Agresseur',
    desc: '+8 % force militaire sur les ouvertures Scout Rush et raids Féodaux.',
  },
  SUPPORT_DEFENDER: {
    title: 'Support / Défenseur',
    desc: '+7 % sur les timings d’Archers, Quickwalling et contre-attaques.',
  },
  MACRO_SPECIALIST: {
    title: 'Spécialiste Macro',
    desc: '+9 % sur les Build Orders Fast Castle Boom (3 Forums) et fin de partie Impériale.',
  },
};

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'LUN',
  'MAR',
  'MER',
  'JEU',
  'VEN',
  'SAM',
  'DIM',
];

export const TRAINING_ACTIVITIES: Record<
  TrainingActivityType,
  {
    label: string;
    shortLabel: string;
    colorClass: string;
    energyDelta: number;
    synergyDelta: number;
    effectText: string;
  }
> = {
  MACRO_DRILL: {
    label: 'Drill Macro & Boom 3-TC',
    shortLabel: 'Macro Boom',
    colorClass: 'border-emerald-600/80 text-emerald-300 bg-emerald-950/40',
    energyDelta: -6,
    synergyDelta: 1,
    effectText: '+1 Boom/Split Macro · -6% Énergie',
  },
  MICRO_QUICKWALL: {
    label: 'Arène Micro & Quickwall',
    shortLabel: 'Micro / Wall',
    colorClass: 'border-sky-600/80 text-sky-300 bg-sky-950/40',
    energyDelta: -7,
    synergyDelta: 0,
    effectText: '+1 Stutter/Quickwall · -7% Énergie',
  },
  VOD_SCOUTING: {
    label: 'Analyse VOD & DAG Scouting',
    shortLabel: 'VOD & DAG',
    colorClass: 'border-amber-600/80 text-amber-300 bg-amber-950/40',
    energyDelta: -4,
    synergyDelta: 2,
    effectText: '+1 Exécution DAG/Scouting · +2% Synergie · -4% Énergie',
  },
  TEAM_SCRIM: {
    label: 'Scrim Collectif (Bo3 Interne)',
    shortLabel: 'Scrim Équipe',
    colorClass: 'border-purple-600/80 text-purple-300 bg-purple-950/40',
    energyDelta: -9,
    synergyDelta: 4,
    effectText: '+4% Synergie · +1 Mental Clutch · -9% Énergie',
  },
  REST_RECOVERY: {
    label: 'Repos Cryo & Psychologie',
    shortLabel: 'Repos Cryo',
    colorClass: 'border-slate-600 text-slate-200 bg-slate-800/70',
    energyDelta: 14,
    synergyDelta: 0,
    effectText: '+14% Énergie · +1 Résistance Tilt',
  },
};

const ACTIVITY_ORDER: TrainingActivityType[] = [
  'MACRO_DRILL',
  'MICRO_QUICKWALL',
  'VOD_SCOUTING',
  'TEAM_SCRIM',
  'REST_RECOVERY',
];

export default function HubView({
  teamProfile,
  roster,
  civilizations,
  staff,
  facilities,
  sponsors,
  teamBudget,
  seasonDay,
  weeklySchedule,
  onUpdateWeeklySchedule,
  onExecuteWeeklySchedule,
  onUpdatePlayer,
  onTeamScrim,
  onRestRoster,
  onOpenCreatorWizard,
  onNavigateToMatch,
}: HubViewProps) {
  const [subView, setSubView] = useState<'VECTORS' | 'SCHEDULE'>('VECTORS');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    roster[0]?.id || ''
  );
  const [activeBrush, setActiveBrush] = useState<TrainingActivityType | null>(
    null
  );
  const [weekReportBanner, setWeekReportBanner] = useState<string | null>(null);

  const selectedPlayer =
    roster.find((p) => p.id === selectedPlayerId) || roster[0];

  const hasHeadCoach = staff.some((s) => s.role === 'HEAD_COACH' && s.hired);
  const wellnessLevel =
    facilities.find((f) => f.category === 'WELLNESS_CENTER')?.level || 1;

  if (!selectedPlayer) return null;

  const avg = computePlayerAverages(selectedPlayer);
  const microState = computeEffectiveMicro(selectedPlayer);
  const synergyState = computeSynergyModifier(selectedPlayer, hasHeadCoach);

  const handleTrainAttribute = (
    category: 'micro' | 'macro' | 'tactical' | 'mental',
    key: string
  ) => {
    if (selectedPlayer.energy < 15) return;
    soundEngine.playUiClick();
    const updated = structuredClone(selectedPlayer);
    const catObj = updated[category] as unknown as Record<string, number>;
    catObj[key] = Math.min(100, catObj[key] + 2);
    updated.energy = Math.max(10, updated.energy - 9);
    onUpdatePlayer(updated);
  };

  const handleIndividualRest = (player: EsportsPlayer) => {
    soundEngine.playUiClick();
    const gain = 18 + wellnessLevel * 4;
    onUpdatePlayer({
      ...player,
      energy: Math.min(100, player.energy + gain),
      morale: Math.min(100, player.morale + 4),
    });
  };

  const handleCellClick = (playerId: string, day: DayOfWeek) => {
    soundEngine.playUiClick();
    const playerWeek = weeklySchedule[playerId] || {
      LUN: 'MACRO_DRILL',
      MAR: 'MICRO_QUICKWALL',
      MER: 'VOD_SCOUTING',
      JEU: 'TEAM_SCRIM',
      VEN: 'MACRO_DRILL',
      SAM: 'REST_RECOVERY',
      DIM: 'REST_RECOVERY',
    };
    const currentAct = playerWeek[day] || 'MACRO_DRILL';
    const nextAct =
      activeBrush ||
      ACTIVITY_ORDER[(ACTIVITY_ORDER.indexOf(currentAct) + 1) % ACTIVITY_ORDER.length];

    onUpdateWeeklySchedule({
      ...weeklySchedule,
      [playerId]: {
        ...playerWeek,
        [day]: nextAct,
      },
    });
  };

  const applySchedulePreset = (
    preset: 'BALANCED' | 'INTENSIVE_SKILL' | 'SYNERGY_BOOTCAMP' | 'FULL_RECOVERY'
  ) => {
    soundEngine.playUiClick();
    const next: WeeklySchedule = {};
    roster.forEach((p) => {
      if (preset === 'BALANCED') {
        next[p.id] = {
          LUN: 'MACRO_DRILL',
          MAR: 'MICRO_QUICKWALL',
          MER: 'REST_RECOVERY',
          JEU: 'VOD_SCOUTING',
          VEN: 'TEAM_SCRIM',
          SAM: 'REST_RECOVERY',
          DIM: 'REST_RECOVERY',
        };
      } else if (preset === 'INTENSIVE_SKILL') {
        next[p.id] = {
          LUN: 'MICRO_QUICKWALL',
          MAR: 'MACRO_DRILL',
          MER: 'VOD_SCOUTING',
          JEU: 'MICRO_QUICKWALL',
          VEN: 'MACRO_DRILL',
          SAM: 'VOD_SCOUTING',
          DIM: 'REST_RECOVERY',
        };
      } else if (preset === 'SYNERGY_BOOTCAMP') {
        next[p.id] = {
          LUN: 'TEAM_SCRIM',
          MAR: 'VOD_SCOUTING',
          MER: 'REST_RECOVERY',
          JEU: 'TEAM_SCRIM',
          VEN: 'TEAM_SCRIM',
          SAM: 'REST_RECOVERY',
          DIM: 'REST_RECOVERY',
        };
      } else {
        next[p.id] = {
          LUN: 'VOD_SCOUTING',
          MAR: 'REST_RECOVERY',
          MER: 'REST_RECOVERY',
          JEU: 'VOD_SCOUTING',
          VEN: 'REST_RECOVERY',
          SAM: 'REST_RECOVERY',
          DIM: 'REST_RECOVERY',
        };
      }
    });
    onUpdateWeeklySchedule(next);
  };

  const totalWins = roster.reduce((acc, p) => acc + p.careerStats.wins, 0);
  const totalMatches = roster.reduce(
    (acc, p) => acc + p.careerStats.matchesPlayed,
    0
  );
  const globalWinRate =
    totalMatches > 0 ? Math.round((totalWins / totalMatches) * 1000) / 10 : 0;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
      {/* Section 1 : Vitrine Dynamique des Assets Graphiques (CEO, Maillot, Blason & Bannière) */}
      <TeamVisualAssetShowcase profile={teamProfile} sponsors={sponsors} />

      {/* Bandeau supérieur de synthèse du Quartier Général */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#1E293B]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums mb-1">
            <span className="text-amber-400 font-semibold">
              [{teamProfile.tag}] {teamProfile.name}
            </span>
            <span aria-hidden="true">·</span>
            <span>JOUR DE SAISON {seasonDay}</span>
            <span aria-hidden="true">·</span>
            <span>TRÉSORERIE {teamBudget.toLocaleString('fr-FR')} €</span>
            <span aria-hidden="true">·</span>
            <span>WIN-RATE GLOBAL {globalWinRate}%</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
            style={{fontFamily: 'var(--font-cinzel), serif'}}
          >
            01. Modélisation des Joueurs & Semainier d’Entraînement
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              soundEngine.playUiClick();
              onOpenCreatorWizard();
            }}
            className="px-3.5 py-2 bg-[#131B2E] hover:bg-[#1E293B] border border-amber-500/50 text-amber-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Mode Créateur (Écurie & CEO)
          </button>

          {/* Sélecteur de sous-vue : Vecteurs 1-100 vs Semainier Lundi-Dimanche */}
          <div className="flex items-center gap-1 p-1 bg-[#131B2E] border border-slate-800 rounded-lg">
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setSubView('VECTORS');
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                subView === 'VECTORS'
                  ? 'bg-[#D97706] text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vecteurs (1–100) & Fatigue
            </button>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setSubView('SCHEDULE');
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                subView === 'SCHEDULE'
                  ? 'bg-[#D97706] text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Semainier (Lun–Dim)
            </button>
          </div>

          <button
            onClick={() => {
              soundEngine.playAgeUpFanfare();
              onNavigateToMatch();
            }}
            className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Préparer la Série 1v1 (Draft)
          </button>
        </div>
      </div>

      {weekReportBanner && (
        <div className="p-4 rounded-lg bg-[#131B2E] border border-emerald-600/60 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-300 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{weekReportBanner}</span>
          </div>
          <button
            onClick={() => setWeekReportBanner(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* --- SOUS-VUE B : SEMAINIER D'ENTRAÎNEMENT INTERACTIF (LUNDI -> DIMANCHE) --- */}
      {subView === 'SCHEDULE' ? (
        <div className="space-y-6">
          {/* Barre d'outils du Semainier : Pinceau d'activité + Presets + Bouton d'Exécution */}
          <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
              <div>
                <h2 className="text-base font-bold text-white">
                  Planificateur Hebdomadaire (Lundi – Dimanche) par Joueur
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cliquez sur un créneau journalier pour ajuster l’entraînement de chaque
                  duelliste tout en surveillant la réserve d’énergie projetée (seuil critique :
                  75 %).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => applySchedulePreset('BALANCED')}
                  className="px-3 py-1.5 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  Preset : Équilibré
                </button>
                <button
                  onClick={() => applySchedulePreset('INTENSIVE_SKILL')}
                  className="px-3 py-1.5 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-xs text-sky-300 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  Preset : Intensif Micro/Macro
                </button>
                <button
                  onClick={() => applySchedulePreset('SYNERGY_BOOTCAMP')}
                  className="px-3 py-1.5 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-xs text-purple-300 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  Preset : Bootcamp Synergie
                </button>
                <button
                  onClick={() => applySchedulePreset('FULL_RECOVERY')}
                  className="px-3 py-1.5 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-xs text-emerald-300 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  Preset : Récupération Pré-Bo5
                </button>

                <button
                  onClick={() => {
                    soundEngine.playAgeUpFanfare();
                    const res = onExecuteWeeklySchedule();
                    setWeekReportBanner(res.summary);
                  }}
                  className="px-5 py-2 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold rounded-lg shadow transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Exécuter la Semaine (+7 Jours)
                </button>
              </div>
            </div>

            {/* Sélecteur de pinceau rapide */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="text-slate-400 font-medium mr-1">
                Pinceau d’attribution rapide :
              </span>
              <button
                onClick={() => setActiveBrush(null)}
                className={`px-2.5 py-1 rounded border cursor-pointer ${
                  activeBrush === null
                    ? 'bg-white text-slate-900 border-white font-semibold'
                    : 'bg-[#0B0F17] text-slate-400 border-slate-800'
                }`}
              >
                Rotation au clic
              </button>
              {ACTIVITY_ORDER.map((actKey) => {
                const info = TRAINING_ACTIVITIES[actKey];
                const isSelected = activeBrush === actKey;
                return (
                  <button
                    key={actKey}
                    onClick={() => {
                      soundEngine.playUiClick();
                      setActiveBrush(isSelected ? null : actKey);
                    }}
                    className={`px-3 py-1 rounded border cursor-pointer transition-all ${
                      info.colorClass
                    } ${isSelected ? 'ring-2 ring-white font-semibold' : 'opacity-80 hover:opacity-100'}`}
                  >
                    {info.shortLabel} ({info.effectText})
                  </button>
                );
              })}
            </div>

            {/* Grille matricielle Lundi -> Dimanche */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="py-3 px-3 min-w-[180px]">Joueur & État Actuel</th>
                    {DAYS_OF_WEEK.map((day) => (
                      <th key={day} className="py-3 px-2 text-center min-w-[115px]">
                        {day}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-right min-w-[210px]">
                      Bilan Projeté (Fin de Semaine)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {roster.map((player) => {
                    const pSchedule = weeklySchedule[player.id] || {
                      LUN: 'MACRO_DRILL',
                      MAR: 'MICRO_QUICKWALL',
                      MER: 'VOD_SCOUTING',
                      JEU: 'TEAM_SCRIM',
                      VEN: 'MACRO_DRILL',
                      SAM: 'REST_RECOVERY',
                      DIM: 'REST_RECOVERY',
                    };

                    // Calcul de la projection sur 7 jours
                    let projEnergy = player.energy;
                    let projSynergy = player.synergyWithTeam;
                    let skillPoints = 0;

                    DAYS_OF_WEEK.forEach((d) => {
                      const act = pSchedule[d] || 'MACRO_DRILL';
                      const meta = TRAINING_ACTIVITIES[act];
                      const energyMod =
                        act === 'REST_RECOVERY'
                          ? meta.energyDelta + wellnessLevel * 2
                          : meta.energyDelta;
                      projEnergy = Math.max(10, Math.min(100, projEnergy + energyMod));
                      projSynergy = Math.min(100, projSynergy + meta.synergyDelta);
                      if (act !== 'REST_RECOVERY') skillPoints += 1;
                    });

                    const isBelowThreshold = projEnergy < 75;

                    return (
                      <tr key={player.id} className="hover:bg-[#0B0F17]/40">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-white text-sm">
                            {player.handle}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                            Énergie : {player.energy}% · Synergie :{' '}
                            {player.synergyWithTeam}%
                          </div>
                        </td>

                        {DAYS_OF_WEEK.map((day) => {
                          const act = pSchedule[day] || 'MACRO_DRILL';
                          const meta = TRAINING_ACTIVITIES[act];
                          return (
                            <td key={day} className="p-1.5">
                              <button
                                onClick={() => handleCellClick(player.id, day)}
                                className={`w-full p-2 rounded border text-left transition-all cursor-pointer ${meta.colorClass}`}
                              >
                                <div className="font-semibold text-[11px] whitespace-nowrap">
                                  {meta.shortLabel}
                                </div>
                                <div className="font-mono text-[10px] opacity-80 tabular-nums mt-0.5">
                                  {meta.energyDelta > 0
                                    ? `+${meta.energyDelta + wellnessLevel * 2}% Én.`
                                    : `${meta.energyDelta}% Én.`}
                                </div>
                              </button>
                            </td>
                          );
                        })}

                        <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                          <div
                            className={`text-xs font-bold ${
                              isBelowThreshold ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            Énergie proj. : {projEnergy}%{' '}
                            {isBelowThreshold ? '(<75% Risque Fatigue)' : '(Nominal)'}
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5">
                            Synergie : {projSynergy}% · +{skillPoints} pts Attributs
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* --- SOUS-VUE A : VECTEURS D'ATTRIBUTS (1-100) & COURBE DE FATIGUE EXPONENTIELLE --- */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Colonne Gauche (5 cols) : Rotation 1v1 de l'équipe */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">
                Effectif & Rotation Duels 1v1 ({roster.length} joueurs)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    soundEngine.playUiClick();
                    onTeamScrim();
                  }}
                  className="px-2.5 py-1 bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-slate-200 text-[11px] rounded cursor-pointer"
                >
                  Scrim (+8% Syn)
                </button>
                <button
                  onClick={() => {
                    soundEngine.playUiClick();
                    onRestRoster();
                  }}
                  className="px-2.5 py-1 bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-emerald-300 text-[11px] rounded cursor-pointer"
                >
                  Repos Général
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {roster.map((player, index) => {
                const pAvg = computePlayerAverages(player);
                const pMicro = computeEffectiveMicro(player);
                const pSyn = computeSynergyModifier(player, hasHeadCoach);
                const isSelected = player.id === selectedPlayer.id;
                const favCiv = civilizations.find(
                  (c) => c.id === player.favoriteCivId
                );

                return (
                  <div
                    key={player.id}
                    onClick={() => {
                      soundEngine.playUiClick();
                      setSelectedPlayerId(player.id);
                    }}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#131B2E] border-[#D97706]'
                        : 'bg-[#131B2E]/60 border-[#1E293B] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[#D97706] tabular-nums">
                            #{index + 1}
                          </span>
                          <span className="text-base font-bold text-white">
                            {player.handle}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({player.nationality})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{ROLE_LABELS[player.role].title}</span>
                          <span aria-hidden="true">·</span>
                          <span>Civ : {favCiv?.name || 'Francs'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {player.elo} ELO
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono tabular-nums">
                        <div className="text-lg font-bold text-white">
                          {pAvg.overall}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Indice Global
                        </div>
                      </div>
                    </div>

                    {/* Barres d'état : Énergie (seuil 75%) et Synergie (seuil 60%) */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#1E293B] text-xs font-mono tabular-nums">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">Énergie</span>
                          <span
                            className={
                              pMicro.isBelowCriticalThreshold
                                ? 'text-amber-400 font-semibold'
                                : 'text-emerald-400'
                            }
                          >
                            {player.energy}%{' '}
                            {pMicro.isBelowCriticalThreshold
                              ? `(Micro -${pMicro.penaltyPercent}%)`
                              : '(Nominal)'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden relative">
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                            style={{left: '75%'}}
                          />
                          <div
                            className={`h-full transition-all ${
                              pMicro.isBelowCriticalThreshold
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{width: `${player.energy}%`}}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400">Synergie</span>
                          <span
                            className={
                              pSyn.hasMalus
                                ? 'text-rose-400 font-semibold'
                                : 'text-sky-400'
                            }
                          >
                            {player.synergyWithTeam}%{' '}
                            {pSyn.hasMalus
                              ? `(Malus -${pSyn.malusPercent}%)`
                              : `(×${pSyn.modifier})`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              pSyn.hasMalus ? 'bg-rose-500' : 'bg-sky-500'
                            }`}
                            style={{width: `${player.synergyWithTeam}%`}}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Colonne Droite (7 cols) : Inspection détaillée du vecteur d'attributs (1-100) */}
          <div className="lg:col-span-7 bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1E293B]">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                  <span>{selectedPlayer.fullName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedPlayer.age} ans</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedPlayer.daysInTeam} jours au club</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    APM effectif : {selectedPlayer.careerStats.avgEffectiveApm}
                  </span>
                </div>
                <h3
                  className="text-2xl font-bold text-white mt-1"
                  style={{fontFamily: 'var(--font-cinzel), serif'}}
                >
                  Vecteur Quantitatif de {selectedPlayer.handle}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleIndividualRest(selectedPlayer)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <BatteryCharging className="w-3.5 h-3.5" />
                  Séance Récupération (+{18 + wellnessLevel * 4}% Énergie)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-[#1E293B]">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Spécificité du Rôle dans l’Équipe
                </label>
                <select
                  value={selectedPlayer.role}
                  onChange={(e) => {
                    soundEngine.playUiClick();
                    onUpdatePlayer({
                      ...selectedPlayer,
                      role: e.target.value as PlayerRole,
                    });
                  }}
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D97706]"
                >
                  {(Object.keys(ROLE_LABELS) as PlayerRole[]).map((roleKey) => (
                    <option key={roleKey} value={roleKey}>
                      {ROLE_LABELS[roleKey].title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {ROLE_LABELS[selectedPlayer.role].desc}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Civilisation Principale (Bonus de Maîtrise)
                </label>
                <select
                  value={selectedPlayer.favoriteCivId}
                  onChange={(e) => {
                    soundEngine.playUiClick();
                    onUpdatePlayer({
                      ...selectedPlayer,
                      favoriteCivId: e.target.value,
                    });
                  }}
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D97706]"
                >
                  {civilizations.map((civ) => (
                    <option key={civ.id} value={civ.id}>
                      {civ.name} — {civ.specialty}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
                  Salaire :{' '}
                  {selectedPlayer.contract.monthlySalary.toLocaleString('fr-FR')}{' '}
                  €/mois · Clause :{' '}
                  {selectedPlayer.contract.buyoutClause.toLocaleString('fr-FR')} €
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Exécution mécanique (Micro) */}
              <div className="p-4 rounded-lg bg-[#0B0F17] border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-sky-400" />
                    <h4 className="text-sm font-semibold text-white">
                      Exécution Mécanique (Micro)
                    </h4>
                  </div>
                  <span className="font-mono text-xs text-sky-400 tabular-nums">
                    Brut {microState.rawMicro} → Eff. {microState.effectiveMicro}
                  </span>
                </div>

                {[
                  {
                    key: 'stutterStepping',
                    label: 'Précision Stutter-Stepping',
                    val: selectedPlayer.micro.stutterStepping,
                  },
                  {
                    key: 'reactionSpeed',
                    label: 'Vitesse de Réaction (Esquive)',
                    val: selectedPlayer.micro.reactionSpeed,
                  },
                  {
                    key: 'quickwalling',
                    label: 'Quickwalling & Défense',
                    val: selectedPlayer.micro.quickwalling,
                  },
                  {
                    key: 'aimPrecision',
                    label: 'Précision Focus-Fire / Siège',
                    val: selectedPlayer.micro.aimPrecision,
                  },
                ].map((attr) => (
                  <div key={attr.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{attr.label}</span>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-white font-semibold">
                          {attr.val}/100
                        </span>
                        <button
                          onClick={() => handleTrainAttribute('micro', attr.key)}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-sky-300 rounded cursor-pointer"
                          title="Entraîner (+2 attribut, -9% énergie)"
                        >
                          +2
                        </button>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-sky-500"
                        style={{width: `${attr.val}%`}}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 2. Vision macro-économique */}
              <div className="p-4 rounded-lg bg-[#0B0F17] border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-semibold text-white">
                      Vision Macro-Économique
                    </h4>
                  </div>
                  <span className="font-mono text-xs text-emerald-400 tabular-nums">
                    Moy. {avg.macroAvg}/100
                  </span>
                </div>

                {[
                  {
                    key: 'boomProduction',
                    label: 'Gestion Production (Boom 3-TC)',
                    val: selectedPlayer.macro.boomProduction,
                  },
                  {
                    key: 'resourceSplit',
                    label: 'Répartition des Ressources',
                    val: selectedPlayer.macro.resourceSplit,
                  },
                  {
                    key: 'mapControl',
                    label: 'Contrôle de la Carte & Collines',
                    val: selectedPlayer.macro.mapControl,
                  },
                ].map((attr) => (
                  <div key={attr.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{attr.label}</span>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-white font-semibold">
                          {attr.val}/100
                        </span>
                        <button
                          onClick={() => handleTrainAttribute('macro', attr.key)}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-300 rounded cursor-pointer"
                          title="Entraîner (+2 attribut, -9% énergie)"
                        >
                          +2
                        </button>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{width: `${attr.val}%`}}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. Compréhension tactique */}
              <div className="p-4 rounded-lg bg-[#0B0F17] border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-white">
                      Compréhension Tactique
                    </h4>
                  </div>
                  <span className="font-mono text-xs text-amber-400 tabular-nums">
                    Moy. {avg.tacticalAvg}/100
                  </span>
                </div>

                {[
                  {
                    key: 'buildOrderExecution',
                    label: 'Exécution des Build Orders (DAG)',
                    val: selectedPlayer.tactical.buildOrderExecution,
                  },
                  {
                    key: 'adaptability',
                    label: 'Adaptabilité & Transitions',
                    val: selectedPlayer.tactical.adaptability,
                  },
                  {
                    key: 'scouting',
                    label: 'Scouting & Lecture Adverse',
                    val: selectedPlayer.tactical.scouting,
                  },
                ].map((attr) => (
                  <div key={attr.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{attr.label}</span>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-white font-semibold">
                          {attr.val}/100
                        </span>
                        <button
                          onClick={() =>
                            handleTrainAttribute('tactical', attr.key)
                          }
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 rounded cursor-pointer"
                          title="Entraîner (+2 attribut, -9% énergie)"
                        >
                          +2
                        </button>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{width: `${attr.val}%`}}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 4. Facteurs mentaux et physiques */}
              <div className="p-4 rounded-lg bg-[#0B0F17] border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-semibold text-white">
                      Facteurs Mentaux & Physiques
                    </h4>
                  </div>
                  <span className="font-mono text-xs text-purple-400 tabular-nums">
                    Moy. {avg.mentalAvg}/100
                  </span>
                </div>

                {[
                  {
                    key: 'tiltResistance',
                    label: 'Résistance au Tilt (Anti-GG Précoce)',
                    val: selectedPlayer.mental.tiltResistance,
                  },
                  {
                    key: 'staminaBoSeries',
                    label: 'Endurance Séries Longues (Bo5/Bo7)',
                    val: selectedPlayer.mental.staminaBoSeries,
                  },
                  {
                    key: 'clutchFactor',
                    label: 'Capacité Sous Pression (Clutch)',
                    val: selectedPlayer.mental.clutchFactor,
                  },
                ].map((attr) => (
                  <div key={attr.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{attr.label}</span>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-white font-semibold">
                          {attr.val}/100
                        </span>
                        <button
                          onClick={() => handleTrainAttribute('mental', attr.key)}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-purple-300 rounded cursor-pointer"
                          title="Entraîner (+2 attribut, -9% énergie)"
                        >
                          +2
                        </button>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{width: `${attr.val}%`}}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Courbe Mathématique de Dégradation Exponentielle de la Fatigue (<75%) */}
            <div className="p-4 rounded-lg bg-[#0B0F17] border border-[#1E293B]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#D97706]" />
                  <span className="text-xs font-semibold text-white">
                    Modèle de Fatigue Exponentielle (Seuil Critique 75%) & Cohésion d’Équipe
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  Micro_eff = Micro × exp(-1.35 × (75 - E)/75)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="sm:col-span-2">
                  <svg
                    viewBox="0 0 360 90"
                    className="w-full h-24 bg-[#131B2E]/60 rounded border border-slate-800"
                  >
                    <line
                      x1="30"
                      y1="15"
                      x2="340"
                      y2="15"
                      stroke="#1E293B"
                      strokeWidth="1"
                    />
                    <line
                      x1="30"
                      y1="75"
                      x2="340"
                      y2="75"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <line
                      x1="262.5"
                      y1="10"
                      x2="262.5"
                      y2="75"
                      stroke="#F59E0B"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="205"
                      y="26"
                      fill="#F59E0B"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      Seuil 75%
                    </text>

                    <path
                      d="M 30 62 Q 110 52, 180 36 T 262.5 15 L 340 15"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2.5"
                    />

                    {(() => {
                      const px = 30 + (selectedPlayer.energy / 100) * 310;
                      const ratio =
                        selectedPlayer.energy >= 75
                          ? 1
                          : Math.exp(-1.35 * ((75 - selectedPlayer.energy) / 75));
                      const py = 75 - ratio * 60;
                      return (
                        <g>
                          <circle
                            cx={px}
                            cy={py}
                            r="5"
                            fill={
                              selectedPlayer.energy < 75 ? '#F59E0B' : '#10B981'
                            }
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                          />
                          <text
                            x={Math.min(295, Math.max(35, px - 20))}
                            y={Math.max(12, py - 8)}
                            fill="#FFFFFF"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            E={selectedPlayer.energy}%
                          </text>
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                <div className="space-y-2 text-xs font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Réserve Énergie :</span>
                    <span className="text-white font-semibold">
                      {selectedPlayer.energy}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pénalité Micro :</span>
                    <span
                      className={
                        microState.isBelowCriticalThreshold
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {microState.isBelowCriticalThreshold
                        ? `-${microState.penaltyPercent}% (Sous 75%)`
                        : '0% (Nominal)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cohésion Tactique :</span>
                    <span
                      className={
                        synergyState.hasMalus ? 'text-rose-400' : 'text-sky-400'
                      }
                    >
                      {synergyState.hasMalus
                        ? `-${synergyState.malusPercent}% (Malus Synergie)`
                        : `×${synergyState.modifier} (Synergie OK)`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
