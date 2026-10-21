'use client';

import React, {useEffect, useState} from 'react';
import {
  BuildOrderDag,
  DayOfWeek,
  EsportsPlayer,
  EtlPlayerRecord,
  FacilityUpgrade,
  LiveMatchState,
  SponsorContract,
  StaffMember,
  TeamProfile,
  WeeklySchedule,
} from '@/lib/types';
import {
  CEO_ARCHETYPES_META,
  CIVILIZATIONS,
  INITIAL_DAG_PRESETS,
  INITIAL_FACILITIES,
  INITIAL_ROSTER,
  INITIAL_SPONSORS,
  INITIAL_STAFF,
  INITIAL_TEAM_PROFILE,
  OPPONENT_DUELLISTS,
  RTS_MAPS,
  TRANSFER_MARKET_PLAYERS,
} from '@/lib/initial-data';
import TitleScreen from '@/components/TitleScreen';
import CreatorWizardView from '@/components/CreatorWizardView';
import HubView, {
  DAYS_OF_WEEK,
  TRAINING_ACTIVITIES,
} from '@/components/HubView';
import DagEditorView from '@/components/DagEditorView';
import MatchArenaView from '@/components/MatchArenaView';
import TransfersStaffView from '@/components/TransfersStaffView';
import ArchitectureEtlView from '@/components/ArchitectureEtlView';
import {soundEngine} from '@/lib/sound';

type ShellMode = 'TITLE_SCREEN' | 'WORKSPACE';
type WorkspaceTab =
  | 'CREATOR_WIZARD'
  | 'HUB'
  | 'DAG_EDITOR'
  | 'MATCH_ARENA'
  | 'TRANSFERS_STAFF'
  | 'ARCHITECTURE_ETL';

const STORAGE_KEY = 'aegis_empire_manager_state_v2';

function createDefaultWeeklySchedule(roster: EsportsPlayer[]): WeeklySchedule {
  const sched: WeeklySchedule = {};
  roster.forEach((p) => {
    sched[p.id] = {
      LUN: 'MACRO_DRILL',
      MAR: 'MICRO_QUICKWALL',
      MER: 'VOD_SCOUTING',
      JEU: 'TEAM_SCRIM',
      VEN: 'MACRO_DRILL',
      SAM: 'REST_RECOVERY',
      DIM: 'REST_RECOVERY',
    };
  });
  return sched;
}

export default function HomePage() {
  const [shellMode, setShellMode] = useState<ShellMode>('TITLE_SCREEN');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('HUB');

  const [teamProfile, setTeamProfile] =
    useState<TeamProfile>(INITIAL_TEAM_PROFILE);
  const [roster, setRoster] = useState<EsportsPlayer[]>(INITIAL_ROSTER);
  const [marketPlayers, setMarketPlayers] = useState<EsportsPlayer[]>(
    TRANSFER_MARKET_PLAYERS
  );
  const [dags, setDags] = useState<BuildOrderDag[]>(INITIAL_DAG_PRESETS);
  const [activeDagId, setActiveDagId] = useState<string>(
    INITIAL_DAG_PRESETS[0].id
  );
  const [staff, setStaff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [facilities, setFacilities] =
    useState<FacilityUpgrade[]>(INITIAL_FACILITIES);
  const [sponsors, setSponsors] = useState<SponsorContract[]>(INITIAL_SPONSORS);
  const [teamBudget, setTeamBudget] = useState<number>(145000);
  const [seasonDay, setSeasonDay] = useState<number>(12);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(() =>
    createDefaultWeeklySchedule(INITIAL_ROSTER)
  );
  const [savedReplays, setSavedReplays] = useState<LiveMatchState[]>([]);

  // Chargement de la persistance locale au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.teamProfile) setTeamProfile(parsed.teamProfile);
        if (parsed.roster) setRoster(parsed.roster);
        if (parsed.marketPlayers) setMarketPlayers(parsed.marketPlayers);
        if (parsed.dags) setDags(parsed.dags);
        if (parsed.staff) setStaff(parsed.staff);
        if (parsed.facilities) setFacilities(parsed.facilities);
        if (parsed.sponsors) setSponsors(parsed.sponsors);
        if (typeof parsed.teamBudget === 'number')
          setTeamBudget(parsed.teamBudget);
        if (typeof parsed.seasonDay === 'number')
          setSeasonDay(parsed.seasonDay);
        if (parsed.weeklySchedule) setWeeklySchedule(parsed.weeklySchedule);
        if (parsed.savedReplays) setSavedReplays(parsed.savedReplays);
      }
    } catch {
      // Ignore erreurs de lecture
    }
  }, []);

  // Sauvegarde automatique dans la base locale (React state -> LocalStorage / SQLite)
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          teamProfile,
          roster,
          marketPlayers,
          dags,
          staff,
          facilities,
          sponsors,
          teamBudget,
          seasonDay,
          weeklySchedule,
          savedReplays: savedReplays.slice(0, 6),
        })
      );
    } catch {
      // Ignore
    }
  }, [
    teamProfile,
    roster,
    marketPlayers,
    dags,
    staff,
    facilities,
    sponsors,
    teamBudget,
    seasonDay,
    weeklySchedule,
    savedReplays,
  ]);

  // Validation du Mode Créateur : applique l'identité de l'écurie, les bonus du CEO et les règles de démarrage
  const handleSaveTeamProfile = (newProfile: TeamProfile) => {
    setTeamProfile(newProfile);
    setTeamBudget(newProfile.settings.initialBudgetAmount);

    const archMeta = CEO_ARCHETYPES_META[newProfile.ceo.archetype];
    const houseLevel =
      newProfile.settings.startingBudgetTier === 'SURVIVAL_LOCAL'
        ? 1
        : newProfile.settings.startingBudgetTier === 'INVESTOR_SYNDICATE'
          ? 3
          : 2;

    // Mise à jour du niveau de Gaming House selon le mode financier choisi
    setFacilities((prev) =>
      prev.map((fac) =>
        fac.category === 'GAMING_HOUSE' ? {...fac, level: houseLevel} : fac
      )
    );

    // Bonus de synergie et de respect si le CEO est "Le Prodige / Ancien Pro" ou "Stratège"
    if (archMeta.synergyBonus > 0) {
      setRoster((prev) =>
        prev.map((p) => ({
          ...p,
          synergyWithTeam: Math.min(
            100,
            p.synergyWithTeam + archMeta.synergyBonus
          ),
          morale: Math.min(
            100,
            p.morale +
              (newProfile.ceo.archetype === 'PRODIGY_EX_PRO' ? 8 : 3)
          ),
        }))
      );
    }

    // Ajustement de la sévérité des clauses de rachat du marché des transferts
    const buyoutMultiplier =
      (newProfile.settings.buyoutSeverity === 'RELAXED'
        ? 0.75
        : newProfile.settings.buyoutSeverity === 'STRICT_CLAUSE'
          ? 1.35
          : 1.0) *
      (newProfile.ceo.archetype === 'MAGNATE_FINANCIER' ? 0.85 : 1.0);

    setMarketPlayers(
      TRANSFER_MARKET_PLAYERS.map((mp) => ({
        ...mp,
        contract: {
          ...mp.contract,
          buyoutClause: Math.round(mp.contract.buyoutClause * buyoutMultiplier),
        },
      }))
    );

    setShellMode('WORKSPACE');
    setActiveTab('HUB');
  };

  const handleUpdatePlayer = (updated: EsportsPlayer) => {
    setRoster((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleTeamScrim = () => {
    setSeasonDay((d) => d + 1);
    setRoster((prev) =>
      prev.map((p) => ({
        ...p,
        synergyWithTeam: Math.min(100, p.synergyWithTeam + 8),
        energy: Math.max(15, p.energy - 10),
        daysInTeam: p.daysInTeam + 1,
      }))
    );
  };

  const handleRestRoster = () => {
    const wellnessLevel =
      facilities.find((f) => f.category === 'WELLNESS_CENTER')?.level || 1;
    const gain = 16 + wellnessLevel * 3;
    setSeasonDay((d) => d + 1);
    setRoster((prev) =>
      prev.map((p) => ({
        ...p,
        energy: Math.min(100, p.energy + gain),
        morale: Math.min(100, p.morale + 5),
        daysInTeam: p.daysInTeam + 1,
      }))
    );
  };

  const handleExecuteWeeklySchedule = () => {
    const wellnessLevel =
      facilities.find((f) => f.category === 'WELLNESS_CENTER')?.level || 1;
    const isVisionaryCeo =
      teamProfile.ceo.archetype === 'STRATEGIST_VISIONARY';
    let totalGains = 0;

    setRoster((prev) =>
      prev.map((player) => {
        const pSched = weeklySchedule[player.id] || {
          LUN: 'MACRO_DRILL',
          MAR: 'MICRO_QUICKWALL',
          MER: 'VOD_SCOUTING',
          JEU: 'TEAM_SCRIM',
          VEN: 'MACRO_DRILL',
          SAM: 'REST_RECOVERY',
          DIM: 'REST_RECOVERY',
        };
        const next = structuredClone(player);

        DAYS_OF_WEEK.forEach((day: DayOfWeek) => {
          const act = pSched[day] || 'MACRO_DRILL';
          const meta = TRAINING_ACTIVITIES[act];
          const energyDelta =
            act === 'REST_RECOVERY'
              ? meta.energyDelta + wellnessLevel * 2
              : meta.energyDelta;

          next.energy = Math.max(10, Math.min(100, next.energy + energyDelta));
          next.synergyWithTeam = Math.min(
            100,
            next.synergyWithTeam + meta.synergyDelta
          );

          if (act === 'MACRO_DRILL') {
            next.macro.boomProduction = Math.min(
              100,
              next.macro.boomProduction + 1
            );
            next.macro.resourceSplit = Math.min(
              100,
              next.macro.resourceSplit + 1
            );
            totalGains += 2;
          } else if (act === 'MICRO_QUICKWALL') {
            next.micro.stutterStepping = Math.min(
              100,
              next.micro.stutterStepping + 1
            );
            next.micro.quickwalling = Math.min(
              100,
              next.micro.quickwalling + 1
            );
            totalGains += 2;
          } else if (act === 'VOD_SCOUTING') {
            const vodGain = isVisionaryCeo ? 2 : 1;
            next.tactical.buildOrderExecution = Math.min(
              100,
              next.tactical.buildOrderExecution + vodGain
            );
            next.tactical.scouting = Math.min(100, next.tactical.scouting + 1);
            totalGains += vodGain + 1;
          } else if (act === 'TEAM_SCRIM') {
            next.mental.clutchFactor = Math.min(
              100,
              next.mental.clutchFactor + 1
            );
            next.tactical.adaptability = Math.min(
              100,
              next.tactical.adaptability + 1
            );
            totalGains += 2;
          } else if (act === 'REST_RECOVERY') {
            next.mental.tiltResistance = Math.min(
              100,
              next.mental.tiltResistance + 1
            );
            next.morale = Math.min(100, next.morale + 3);
            totalGains += 1;
          }
        });

        next.daysInTeam += 7;
        return next;
      })
    );

    setSeasonDay((d) => d + 7);
    return {
      summary: `Semaine d'entraînement exécutée (+7 jours) pour [${teamProfile.tag}] : +${totalGains} points d'attributs cumulés sur l'effectif, synergie et réserves d'énergie mises à jour.`,
      totalGains,
    };
  };

  const handleSaveReplay = (completedMatch: LiveMatchState) => {
    setSavedReplays((prev) => {
      const exists = prev.some((r) => r.matchId === completedMatch.matchId);
      if (exists) return prev;
      return [completedMatch, ...prev].slice(0, 6);
    });
  };

  const handleUpdateDag = (updatedDag: BuildOrderDag) => {
    setDags((prev) =>
      prev.map((d) => (d.id === updatedDag.id ? updatedDag : d))
    );
  };

  const handleCloneDag = () => {
    const current = dags.find((d) => d.id === activeDagId) || dags[0];
    if (!current) return;
    const cloneId = `dag_custom_${Date.now().toString().slice(-4)}`;
    const cloned: BuildOrderDag = {
      ...structuredClone(current),
      id: cloneId,
      name: `${current.name} (Variante)`,
    };
    setDags((prev) => [...prev, cloned]);
    setActiveDagId(cloneId);
  };

  const handleRecruitPlayer = (
    player: EsportsPlayer,
    negotiatedSalary: number
  ) => {
    const cost = player.contract.buyoutClause + negotiatedSalary;
    if (teamBudget < cost) return;
    setTeamBudget((b) => b - cost);
    setMarketPlayers((prev) => prev.filter((p) => p.id !== player.id));
    setRoster((prev) => [
      ...prev,
      {
        ...player,
        contract: {
          ...player.contract,
          monthlySalary: negotiatedSalary,
        },
        daysInTeam: 1,
      },
    ]);
  };

  const handleReleasePlayer = (playerId: string) => {
    const target = roster.find((p) => p.id === playerId);
    if (!target || roster.length <= 2) return;
    setRoster((prev) => prev.filter((p) => p.id !== playerId));
    setMarketPlayers((prev) => [...prev, {...target, synergyWithTeam: 40}]);
  };

  const handleToggleStaff = (staffId: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === staffId ? {...s, hired: !s.hired} : s))
    );
  };

  const handleUpgradeFacility = (facilityId: string) => {
    const fac = facilities.find((f) => f.id === facilityId);
    if (!fac || fac.level >= fac.maxLevel || teamBudget < fac.upgradeCost)
      return;
    setTeamBudget((b) => b - fac.upgradeCost);
    setFacilities((prev) =>
      prev.map((f) =>
        f.id === facilityId
          ? {
              ...f,
              level: f.level + 1,
              upgradeCost: Math.round(f.upgradeCost * 1.45),
            }
          : f
      )
    );
  };

  const handleToggleSponsor = (sponsorId: string) => {
    setSponsors((prev) =>
      prev.map((sp) =>
        sp.id === sponsorId ? {...sp, active: !sp.active} : sp
      )
    );
  };

  const handleMatchCompleted = (result: {
    winnerSide: 'BLUE' | 'RED';
    bluePlayerId: string;
    prizeEarned: number;
  }) => {
    const activeSponsorBonuses =
      result.winnerSide === 'BLUE'
        ? sponsors
            .filter((s) => s.active)
            .reduce((sum, s) => sum + s.winBonus, 0)
        : 0;

    setTeamBudget((b) => b + result.prizeEarned + activeSponsorBonuses);
    setSeasonDay((d) => d + 1);

    setRoster((prev) =>
      prev.map((p) => {
        if (p.id !== result.bluePlayerId) {
          return {
            ...p,
            energy: Math.min(100, p.energy + 6),
          };
        }
        const staminaMitigation = Math.round(
          (100 - p.mental.staminaBoSeries) * 0.15
        );
        const energyCost = teamProfile.settings.exponentialFatigueBurnout
          ? 14 + staminaMitigation
          : 6;
        return {
          ...p,
          energy: Math.max(10, p.energy - energyCost),
          synergyWithTeam: Math.min(100, p.synergyWithTeam + 3),
          careerStats: {
            ...p.careerStats,
            matchesPlayed: p.careerStats.matchesPlayed + 1,
            wins:
              result.winnerSide === 'BLUE'
                ? p.careerStats.wins + 1
                : p.careerStats.wins,
            losses:
              result.winnerSide === 'RED'
                ? p.careerStats.losses + 1
                : p.careerStats.losses,
          },
        };
      })
    );
  };

  const handleImportEtlPlayer = (record: EtlPlayerRecord) => {
    const newPlayer: EsportsPlayer = {
      id: `etl_${record.rawId}`,
      handle: record.handle,
      fullName: `${record.handle} (Pro ETL)`,
      nationality: 'INT',
      age: 22,
      elo: record.rawLadderElo,
      role: 'IGL_STRATEGIST',
      favoriteCivId: 'mayans',
      energy: 92,
      morale: 94,
      synergyWithTeam: 40,
      daysInTeam: 0,
      micro: {
        stutterStepping: record.normalizedVector.micro,
        reactionSpeed: record.normalizedVector.micro,
        quickwalling: Math.min(100, record.normalizedVector.micro + 1),
        aimPrecision: record.normalizedVector.micro,
      },
      macro: {
        boomProduction: record.normalizedVector.macro,
        resourceSplit: record.normalizedVector.macro,
        mapControl: record.normalizedVector.macro,
      },
      tactical: {
        buildOrderExecution: record.normalizedVector.tactical,
        adaptability: record.normalizedVector.tactical,
        scouting: record.normalizedVector.tactical,
      },
      mental: {
        tiltResistance: record.normalizedVector.mental,
        staminaBoSeries: record.normalizedVector.mental,
        clutchFactor: record.normalizedVector.mental,
      },
      contract: {
        monthlySalary: 8800,
        buyoutClause: 38000,
        prizeCutPercent: 18,
        monthsRemaining: 18,
      },
      careerStats: {
        matchesPlayed: 220,
        wins: Math.round(220 * record.tournamentWinRate),
        losses: Math.round(220 * (1 - record.tournamentWinRate)),
        ggCallsForced: 115,
        avgEffectiveApm: record.avgeApm,
      },
      isStarter: false,
    };

    setMarketPlayers((prev) => [newPlayer, ...prev]);
  };

  const handleResetLocalDatabase = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTeamProfile(INITIAL_TEAM_PROFILE);
    setRoster(INITIAL_ROSTER);
    setMarketPlayers(TRANSFER_MARKET_PLAYERS);
    setDags(INITIAL_DAG_PRESETS);
    setStaff(INITIAL_STAFF);
    setFacilities(INITIAL_FACILITIES);
    setSponsors(INITIAL_SPONSORS);
    setTeamBudget(145000);
    setSeasonDay(12);
    setWeeklySchedule(createDefaultWeeklySchedule(INITIAL_ROSTER));
    setSavedReplays([]);
  };

  if (shellMode === 'TITLE_SCREEN') {
    return (
      <TitleScreen
        teamProfile={teamProfile}
        onStartGame={() => {
          setShellMode('WORKSPACE');
          setActiveTab('HUB');
        }}
        onOpenCreatorWizard={() => {
          setShellMode('WORKSPACE');
          setActiveTab('CREATOR_WIZARD');
        }}
        onLaunchQuickMatch={() => {
          setShellMode('WORKSPACE');
          setActiveTab('MATCH_ARENA');
        }}
      />
    );
  }

  const hasHeadCoach = staff.some((s) => s.role === 'HEAD_COACH' && s.hired);
  const hasAnalyst = staff.some((s) => s.role === 'DATA_ANALYST' && s.hired);
  const hasPsychologist = staff.some(
    (s) => s.role === 'SPORTS_PSYCHOLOGIST' && s.hired
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-[#F1F5F9]">
      {/* Barre de navigation supérieure respectant strictement le Top Bar Contract (3 zones séparées par gap-8) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0B0F17] border-b border-[#1E293B]">
        {/* Zone 1 : Wordmark dynamique sur une seule ligne */}
        <button
          onClick={() => {
            soundEngine.playUiClick();
            setShellMode('TITLE_SCREEN');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
          style={{fontFamily: 'var(--font-cinzel), serif'}}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{backgroundColor: teamProfile.primaryColor}}
          />
          <span>
            [{teamProfile.tag}] {teamProfile.name}
          </span>
        </button>

        {/* Zone 2 : Liens de navigation concis sur une seule ligne */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-400 overflow-x-auto">
          {(
            [
              {id: 'HUB', label: 'Quartier Général'},
              {id: 'CREATOR_WIZARD', label: 'Mode Créateur'},
              {id: 'DAG_EDITOR', label: 'Atelier DAG'},
              {id: 'MATCH_ARENA', label: 'Arène & Draft'},
              {id: 'TRANSFERS_STAFF', label: 'Transferts & Staff'},
              {id: 'ARCHITECTURE_ETL', label: 'Architecture & ETL'},
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                soundEngine.playUiClick();
                setActiveTab(item.id);
              }}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-0.5 ${
                activeTab === item.id
                  ? 'text-white underline decoration-[#D97706] decoration-2 underline-offset-8'
                  : 'hover:text-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3 : 1 bouton d'action principal */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => {
              soundEngine.playAgeUpFanfare();
              setActiveTab('MATCH_ARENA');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#D97706] hover:bg-[#B45309] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Jouer le Prochain Match
          </button>
        </div>
      </header>

      {/* Contenu principal selon la vue sélectionnée */}
      <main className="flex-1">
        {activeTab === 'CREATOR_WIZARD' && (
          <CreatorWizardView
            initialProfile={teamProfile}
            sponsors={sponsors}
            onSaveProfileAndLaunch={handleSaveTeamProfile}
            onCancel={() => setActiveTab('HUB')}
          />
        )}

        {activeTab === 'HUB' && (
          <HubView
            teamProfile={teamProfile}
            roster={roster}
            civilizations={CIVILIZATIONS}
            staff={staff}
            facilities={facilities}
            sponsors={sponsors}
            teamBudget={teamBudget}
            seasonDay={seasonDay}
            weeklySchedule={weeklySchedule}
            onUpdateWeeklySchedule={setWeeklySchedule}
            onExecuteWeeklySchedule={handleExecuteWeeklySchedule}
            onUpdatePlayer={handleUpdatePlayer}
            onTeamScrim={handleTeamScrim}
            onRestRoster={handleRestRoster}
            onOpenCreatorWizard={() => setActiveTab('CREATOR_WIZARD')}
            onNavigateToMatch={() => setActiveTab('MATCH_ARENA')}
          />
        )}

        {activeTab === 'DAG_EDITOR' && (
          <DagEditorView
            dags={dags}
            activeDagId={activeDagId}
            onSelectActiveDag={setActiveDagId}
            onUpdateDag={handleUpdateDag}
            onCreatePresetClone={handleCloneDag}
          />
        )}

        {activeTab === 'MATCH_ARENA' && (
          <MatchArenaView
            roster={roster}
            opponents={OPPONENT_DUELLISTS}
            civilizations={CIVILIZATIONS}
            maps={RTS_MAPS}
            dags={dags}
            hasHeadCoach={hasHeadCoach}
            hasAnalyst={hasAnalyst}
            hasPsychologist={hasPsychologist}
            savedReplays={savedReplays}
            onSaveReplay={handleSaveReplay}
            onMatchCompleted={handleMatchCompleted}
            onExitArena={() => setActiveTab('HUB')}
          />
        )}

        {activeTab === 'TRANSFERS_STAFF' && (
          <TransfersStaffView
            roster={roster}
            marketPlayers={marketPlayers}
            staff={staff}
            facilities={facilities}
            sponsors={sponsors}
            teamBudget={teamBudget}
            onRecruitPlayer={handleRecruitPlayer}
            onReleasePlayer={handleReleasePlayer}
            onToggleStaff={handleToggleStaff}
            onUpgradeFacility={handleUpgradeFacility}
            onToggleSponsor={handleToggleSponsor}
          />
        )}

        {activeTab === 'ARCHITECTURE_ETL' && (
          <ArchitectureEtlView
            roster={roster}
            opponents={OPPONENT_DUELLISTS}
            civilizations={CIVILIZATIONS}
            maps={RTS_MAPS}
            dags={dags}
            onImportEtlPlayerToMarket={handleImportEtlPlayer}
            onResetLocalDatabase={handleResetLocalDatabase}
          />
        )}
      </main>
    </div>
  );
}
