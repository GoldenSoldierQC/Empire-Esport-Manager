'use client';

import React, {useEffect, useRef, useState} from 'react';
import {
  BuildOrderDag,
  Civilization,
  EsportsPlayer,
  LiveMatchState,
  RtsMap,
} from '@/lib/types';
import {
  computeCivMatchupModifier,
  computeEffectiveMicro,
  computeSynergyModifier,
  computeWilsonScoreInterval,
  createInitialMatchState,
  stepMatchTick,
} from '@/lib/tick-engine';
import PixelRtsCanvas from './PixelRtsCanvas';
import ReplayStudioModal from './ReplayStudioModal';
import LiveRechartsTelemetry from './LiveRechartsTelemetry';
import {soundEngine} from '@/lib/sound';
import {
  Activity,
  Compass,
  Eye,
  EyeOff,
  History,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface MatchArenaViewProps {
  roster: EsportsPlayer[];
  opponents: EsportsPlayer[];
  civilizations: Civilization[];
  maps: RtsMap[];
  dags: BuildOrderDag[];
  hasHeadCoach: boolean;
  hasAnalyst: boolean;
  hasPsychologist: boolean;
  savedReplays: LiveMatchState[];
  onSaveReplay: (completedMatch: LiveMatchState) => void;
  onMatchCompleted: (result: {
    winnerSide: 'BLUE' | 'RED';
    bluePlayerId: string;
    prizeEarned: number;
  }) => void;
  onExitArena: () => void;
}

export default function MatchArenaView({
  roster,
  opponents,
  civilizations,
  maps,
  dags,
  hasHeadCoach,
  hasAnalyst,
  hasPsychologist,
  savedReplays,
  onSaveReplay,
  onMatchCompleted,
  onExitArena,
}: MatchArenaViewProps) {
  // Configuration du Draft, du Brouillard de Guerre & de la Série Bo3/Bo5
  const [seriesFormat, setSeriesFormat] = useState<'BO3' | 'BO5'>('BO3');
  const [currentGameNumber, setCurrentGameNumber] = useState<number>(1);
  const [blueSeriesScore, setBlueSeriesScore] = useState<number>(0);
  const [redSeriesScore, setRedSeriesScore] = useState<number>(0);
  const [fogOfWarEnabled, setFogOfWarEnabled] = useState<boolean>(true);

  const [bannedMapId, setBannedMapId] = useState<string>('black_forest');
  const [selectedMapId, setSelectedMapId] = useState<string>('arabia');
  const [bannedCivId, setBannedCivId] = useState<string>('teutons');
  const [bluePlayerId, setBluePlayerId] = useState<string>(roster[0]?.id || '');
  const [blueCivId, setBlueCivId] = useState<string>(
    roster[0]?.favoriteCivId || 'franks'
  );
  const [blueDagId, setBlueDagId] = useState<string>(dags[0]?.id || '');

  const [redPlayerId, setRedPlayerId] = useState<string>(
    opponents[0]?.id || ''
  );
  const [redCivId, setRedCivId] = useState<string>('mongols');

  // État du match en direct
  const [matchState, setMatchState] = useState<LiveMatchState | null>(null);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 5>(1);
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.muted);
  const [showLiveCurves, setShowLiveCurves] = useState<boolean>(true);
  const [activeReplayMatch, setActiveReplayMatch] =
    useState<LiveMatchState | null>(null);
  const [inspectedEntity, setInspectedEntity] = useState<{
    side: 'BLUE' | 'RED';
    label: string;
    detail: string;
  } | null>(null);
  const handledFinishedMatchIdRef = useRef<string | null>(null);

  const selectedMap = maps.find((m) => m.id === selectedMapId) || maps[0];
  const bluePlayer = roster.find((p) => p.id === bluePlayerId) || roster[0];
  const redPlayer =
    opponents.find((p) => p.id === redPlayerId) || opponents[0];
  const blueCiv =
    civilizations.find((c) => c.id === blueCivId) || civilizations[0];
  const redCiv =
    civilizations.find((c) => c.id === redCivId) || civilizations[2];
  const blueDag = dags.find((d) => d.id === blueDagId) || dags[0];
  const redDag = dags[1] || dags[0];

  const startLiveDuel = () => {
    if (!bluePlayer || !redPlayer) return;
    soundEngine.playAgeUpFanfare();
    const initial = createInitialMatchState({
      matchId: `match_${Date.now().toString().slice(-6)}`,
      seriesFormat,
      currentGameNumber,
      blueSeriesScore,
      redSeriesScore,
      map: selectedMap,
      fogOfWarEnabled,
      bluePlayer,
      blueCiv,
      blueDag,
      redPlayer,
      redCiv,
      redDag,
      hasHeadCoach,
    });
    setMatchState(initial);
  };

  // Génération rapide d'un match simulé complet sur carte ×5 pour ouvrir directement le Studio Replay
  const handleInstantSimAndOpenReplay = () => {
    if (!bluePlayer || !redPlayer) return;
    soundEngine.playAgeUpFanfare();
    let sim = createInitialMatchState({
      matchId: `replay_${Date.now().toString().slice(-6)}`,
      seriesFormat,
      currentGameNumber,
      blueSeriesScore,
      redSeriesScore,
      map: selectedMap,
      fogOfWarEnabled,
      bluePlayer,
      blueCiv,
      blueDag,
      redPlayer,
      redCiv,
      redDag,
      hasHeadCoach,
    });
    while (sim.status !== 'FINISHED' && sim.tick < 155) {
      sim = stepMatchTick(sim, {
        map: selectedMap,
        bluePlayer,
        blueCiv,
        blueDag,
        redPlayer,
        redCiv,
        redDag,
        hasPsychologist,
      });
    }
    onSaveReplay(sim);
    setActiveReplayMatch(sim);
  };

  // Activation/Désactivation dynamique du Brouillard de Guerre (checkbox)
  const handleToggleFogOfWar = (checked: boolean) => {
    soundEngine.playUiClick();
    setFogOfWarEnabled(checked);
    setMatchState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        fogOfWarEnabled: checked,
        blue: {
          ...prev.blue,
          enemyRevealed: checked ? prev.blue.scoutingIntelPercent >= 35 : true,
          scoutingIntelPercent: checked ? prev.blue.scoutingIntelPercent : 100,
        },
        red: {
          ...prev.red,
          enemyRevealed: checked ? prev.red.scoutingIntelPercent >= 35 : true,
          scoutingIntelPercent: checked ? prev.red.scoutingIntelPercent : 100,
        },
      };
    });
  };

  // Boucle de simulation par Ticks (1 Tick logique = 5s de match RTS)
  useEffect(() => {
    if (!matchState || matchState.status !== 'RUNNING') return;

    const intervalMs = simSpeed === 5 ? 240 : simSpeed === 2 ? 550 : 1050;
    const timer = setInterval(() => {
      setMatchState((prev) => {
        if (!prev || prev.status !== 'RUNNING') return prev;
        return stepMatchTick(prev, {
          map: selectedMap,
          bluePlayer,
          blueCiv,
          blueDag,
          redPlayer,
          redCiv,
          redDag,
          hasPsychologist,
        });
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    matchState?.status,
    simSpeed,
    selectedMap,
    bluePlayer,
    blueCiv,
    blueDag,
    redPlayer,
    redCiv,
    redDag,
    hasPsychologist,
  ]);

  // Effet dédié de clôture de match hors du cycle de rendu de setMatchState
  useEffect(() => {
    if (!matchState || matchState.status !== 'FINISHED') return;
    if (handledFinishedMatchIdRef.current === matchState.matchId) return;

    handledFinishedMatchIdRef.current = matchState.matchId;
    soundEngine.playGgHorn();
    onSaveReplay(matchState);
    if (matchState.winnerSide === 'BLUE') {
      setBlueSeriesScore((s) => s + 1);
    } else {
      setRedSeriesScore((s) => s + 1);
    }
    onMatchCompleted({
      winnerSide: matchState.winnerSide || 'BLUE',
      bluePlayerId: bluePlayer.id,
      prizeEarned: matchState.winnerSide === 'BLUE' ? 4500 : 1000,
    });
  }, [matchState, bluePlayer.id, onMatchCompleted, onSaveReplay]);

  // Raccourcis clavier (Espace = Pause/Play)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!matchState || activeReplayMatch) return;
      if (e.code === 'Space' && matchState.status !== 'FINISHED') {
        e.preventDefault();
        soundEngine.playUiClick();
        setMatchState((prev) =>
          prev
            ? {
                ...prev,
                status: prev.status === 'RUNNING' ? 'PAUSED' : 'RUNNING',
              }
            : null
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [matchState, activeReplayMatch]);

  // Consignes tactiques du Coach en direct (incluant Reconnaissance Éclaireur sous Fog of War)
  const handleCoachCall = (
    callType: 'SCOUT_RECON' | 'QUICKWALL_ALERT' | 'ALL_IN_PUSH' | 'BOOM_RECOVERY'
  ) => {
    if (!matchState || matchState.status === 'FINISHED') return;
    soundEngine.playUiClick();

    setMatchState((prev) => {
      if (!prev) return null;
      const blue = {...prev.blue};
      let title = '';
      let detail = '';

      if (callType === 'SCOUT_RECON') {
        blue.scoutsCount = Math.min(4, blue.scoutsCount + 1);
        blue.scoutingIntelPercent = Math.min(100, blue.scoutingIntelPercent + 24);
        blue.enemyRevealed = blue.scoutingIntelPercent >= 35 || !prev.fogOfWarEnabled;
        title = `Consigne Coach : Patrouille d'Éclaireurs (Carte ×5)`;
        detail = `${blue.playerHandle} déploie un Éclaireur supplémentaire (+24% Intel Brouillard -> ${blue.scoutingIntelPercent}%). ${
          blue.enemyRevealed ? 'Position ennemie verrouillée !' : 'Exploration en cours.'
        }`;
      } else if (callType === 'QUICKWALL_ALERT') {
        blue.morale = Math.min(100, blue.morale + 8);
        blue.townCenterHp = Math.min(blue.maxTownCenterHp, blue.townCenterHp + 350);
        title = `Consigne Coach : Palissades & Réparation Forum`;
        detail = `${blue.playerHandle} consolide ses défenses (+8 Moral, +350 PV Forum).`;
      } else if (callType === 'ALL_IN_PUSH') {
        blue.effectiveMilitaryForce = Math.round(blue.effectiveMilitaryForce * 1.16);
        if (blue.enemyRevealed) {
          blue.armyTransitProgress = Math.min(100, blue.armyTransitProgress + 22);
        }
        title = `Consigne Coach : Marche Forcée sur la Rush Distance`;
        detail = blue.enemyRevealed
          ? `Troupes projetées vers la base adverse (Transit ${blue.armyTransitProgress}%, F_m(t) ${blue.effectiveMilitaryForce}).`
          : `Attention : F_m(t) préparée (${blue.effectiveMilitaryForce}), mais l'Éclaireur doit d'abord révéler l'ennemi !`;
      } else {
        blue.villagers = Math.min(140, blue.villagers + 5);
        blue.resources = {
          ...blue.resources,
          food: blue.resources.food + 160,
          gold: blue.resources.gold + 120,
        };
        title = `Consigne Coach : Relance Macro-Économique`;
        detail = `Optimisation des camps de récolte éloignés (+5 Villageois, +280 Ressources).`;
      }

      return {
        ...prev,
        blue,
        events: [
          {
            tick: prev.tick,
            timeSeconds: prev.timeSeconds,
            type: 'COACH_CALL',
            side: 'BLUE',
            title,
            detail,
          },
          ...prev.events,
        ],
      };
    });
  };

  // --- VUE 1 : SALLE DE DRAFT PICK/BAN (CARTE ×5, MÉTA 48-52% & BROUILLARD DE GUERRE) ---
  if (!matchState) {
    const blueMicro = computeEffectiveMicro(bluePlayer);
    const blueSyn = computeSynergyModifier(bluePlayer, hasHeadCoach);
    const matchupMod = computeCivMatchupModifier(blueCiv, redCiv);
    const baseMapWr = (blueCiv.winRatesByMap[selectedMap.id] || 0.5) * 100;
    const etlWinProb =
      Math.round(
        Math.max(
          46.0,
          Math.min(
            54.0,
            baseMapWr +
              (matchupMod - 1) * 55 +
              (bluePlayer.elo - redPlayer.elo) * 0.015
          )
        ) * 10
      ) / 10;
    // Échantillon haut Elo (2000+, ~1% des parties AoEStats) et intervalle de Wilson à 95%
    const highEloSampleSize =
      18 +
      ((blueCiv.id.charCodeAt(0) +
        redCiv.id.charCodeAt(0) +
        selectedMap.id.charCodeAt(0)) %
        24);
    const matchupWilsonCi = computeWilsonScoreInterval(
      etlWinProb / 100,
      highEloSampleSize
    );

    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#1E293B]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums mb-1">
              <span>SÉRIE {seriesFormat} EN ROTATION 1V1</span>
              <span aria-hidden="true">·</span>
              <span>CARTE ÉCHELLE ×5</span>
              <span aria-hidden="true">·</span>
              <span>MÉTA ÉQUILIBRÉE (WR 48%–52%)</span>
              <span aria-hidden="true">·</span>
              <span>
                SCORE : AEGIS {blueSeriesScore} - {redSeriesScore} GAMERLEGION
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
              style={{fontFamily: 'var(--font-cinzel), serif'}}
            >
              03. Phase de Draft (Captains Mode), Brouillard de Guerre & Replay
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Checkbox Brouillard de Guerre (Fog of War) & Éclaireur obligatoire */}
            <label className="flex items-center gap-2.5 px-3.5 py-2 bg-[#131B2E] border border-amber-500/40 rounded-lg cursor-pointer select-none">
              <input
                type="checkbox"
                checked={fogOfWarEnabled}
                onChange={(e) => handleToggleFogOfWar(e.target.checked)}
                className="w-4 h-4 accent-[#D97706] rounded cursor-pointer"
              />
              <div className="text-xs">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  {fogOfWarEnabled ? (
                    <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  Brouillard de Guerre (Fog of War)
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  1 Éclaireur initial · Ciblage bloqué avant scouting
                </div>
              </div>
            </label>

            <div className="flex items-center gap-1 p-1 bg-[#131B2E] border border-slate-800 rounded-lg">
              {(['BO3', 'BO5'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => {
                    soundEngine.playUiClick();
                    setSeriesFormat(fmt);
                  }}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                    seriesFormat === fmt
                      ? 'bg-[#D97706] text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Série {fmt}
                </button>
              ))}
            </div>

            <button
              onClick={handleInstantSimAndOpenReplay}
              className="px-4 py-2.5 bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-sky-300 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              Simuler & Ouvrir Studio Replay
            </button>

            <button
              onClick={startLiveDuel}
              className="px-6 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold rounded-lg shadow-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Déployer l’Arène RTS ×5 (Manche #{currentGameNumber})
            </button>
          </div>
        </div>

        {/* Bandeau d'accès aux Replays enregistrés */}
        {savedReplays.length > 0 && (
          <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <History className="w-4 h-4 text-[#D97706]" />
              <span className="font-semibold text-white">
                Archives Replays Post-Match ({savedReplays.length}) :
              </span>
              <span className="text-slate-400">
                Inspectez n’importe quel match passé tick par tick ou exportez son JSON.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {savedReplays.slice(0, 4).map((rep, idx) => (
                <button
                  key={rep.matchId}
                  onClick={() => {
                    soundEngine.playUiClick();
                    setActiveReplayMatch(rep);
                  }}
                  className="px-3 py-1.5 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-xs font-mono text-amber-300 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  Replay #{idx + 1}: {rep.blue.playerHandle} vs{' '}
                  {rep.red.playerHandle} ({rep.tick} ticks)
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sélection de la Carte Échelle ×5 & Bannissements (4 cols) */}
          <div className="lg:col-span-4 bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-5">
            <div>
              <h2 className="text-base font-bold text-white">
                1. Draft de la Carte (Surface Échelle ×5)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Distances de trajet des villageois, Rush Distance et reliques espacées multipliées par 5.
              </p>
            </div>

            <div className="space-y-2.5">
              {maps.map((m) => {
                const isBanned = m.id === bannedMapId;
                const isPicked = m.id === selectedMapId;
                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-lg border transition-colors ${
                      isBanned
                        ? 'bg-rose-950/25 border-rose-900/60 opacity-60'
                        : isPicked
                          ? 'bg-[#1E293B] border-[#D97706]'
                          : 'bg-[#0B0F17] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">
                        {m.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            soundEngine.playUiClick();
                            if (bannedMapId !== m.id) setSelectedMapId(m.id);
                          }}
                          disabled={isBanned}
                          className={`px-2 py-0.5 text-[11px] rounded cursor-pointer ${
                            isPicked
                              ? 'bg-[#D97706] text-white font-semibold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          Pick
                        </button>
                        <button
                          onClick={() => {
                            soundEngine.playUiClick();
                            setBannedMapId(m.id);
                            if (selectedMapId === m.id) {
                              const alt = maps.find((x) => x.id !== m.id);
                              if (alt) setSelectedMapId(alt.id);
                            }
                          }}
                          className={`px-2 py-0.5 text-[11px] rounded cursor-pointer ${
                            isBanned
                              ? 'bg-rose-700 text-white font-semibold'
                              : 'bg-slate-800 text-slate-400 hover:text-rose-300'
                          }`}
                        >
                          Ban
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-2">
                      {m.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-300 tabular-nums">
                      <span className="text-amber-300">Rush Dist: {m.rushDistance} seg</span>
                      <span aria-hidden="true">·</span>
                      <span>Trajet Vill.: ×{m.villagerWalkDistance}</span>
                      <span aria-hidden="true">·</span>
                      <span>{m.neutralRelicsCount} Reliques</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rotation du Joueur Titulaire 1v1 & Build Order DAG (4 cols) */}
          <div className="lg:col-span-4 bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-5">
            <div>
              <h2 className="text-base font-bold text-white">
                2. Rotation du Duelliste & Scouting Initial
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Chaque joueur débute obligatoirement avec 1 Éclaireur. La compétence Scouting accélère la levée du Brouillard.
              </p>
            </div>

            <div className="space-y-2.5">
              {roster.map((p) => {
                const micro = computeEffectiveMicro(p);
                const syn = computeSynergyModifier(p, hasHeadCoach);
                const isChosen = p.id === bluePlayer.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      soundEngine.playUiClick();
                      setBluePlayerId(p.id);
                      setBlueCivId(p.favoriteCivId);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isChosen
                        ? 'bg-[#1E293B] border-sky-500'
                        : 'bg-[#0B0F17] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-white">
                          {p.handle}
                        </span>
                        <span className="text-xs text-slate-400 ml-2 font-mono tabular-nums">
                          {p.elo} ELO
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono tabular-nums ${
                          micro.isBelowCriticalThreshold
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        Énergie {p.energy}%
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400 tabular-nums mt-1">
                      <span>Micro eff: {micro.effectiveMicro}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-sky-300">
                        Scouting: {p.tactical.scouting}/100
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Synergie:{' '}
                        {syn.hasMalus
                          ? `-${syn.malusPercent}%`
                          : `×${syn.modifier}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#1E293B] space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Build Order (Graphe DAG assigné)
                </label>
                <select
                  value={blueDag.id}
                  onChange={(e) => setBlueDagId(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {dags.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums space-y-1">
                <div className="text-slate-400">
                  Paramètres d’Engagement & Durée Étendue :
                </div>
                <div className="text-white">
                  Pool Initial :{' '}
                  <span className="text-amber-400 font-semibold">
                    1 Éclaireur (Scout Cavalry) +{' '}
                    {blueCiv.id === 'mayans' ? 4 : 3} Villageois
                  </span>
                </div>
                <div className="text-white">
                  PV Forum Impérial :{' '}
                  <span className="text-emerald-400 font-semibold">
                    {blueCiv.id === 'byzantines' ? 7400 : 6500} PV
                  </span>{' '}
                  (Sièges tactiques prolongés)
                </div>
              </div>
            </div>
          </div>

          {/* Draft des Civilisations Asymétriques & Meta-Balanced 48%-52% (4 cols) */}
          <div className="lg:col-span-4 bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">
                3. Civilisations Asymétriques (Win-Rate 48%–52%)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bonus uniques (récolte, vitesse d’âge, coûts tech) et matrice Beats / Loses_to sans civ OP ou TRASH.
              </p>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {civilizations.map((civ) => {
                const isBanned = civ.id === bannedCivId;
                const isBluePick = civ.id === blueCiv.id;
                const mapWinRate =
                  Math.round(
                    (civ.winRatesByMap[selectedMap.id] || 0.5) * 1000
                  ) / 10;

                return (
                  <div
                    key={civ.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      isBanned
                        ? 'bg-rose-950/25 border-rose-900/50 opacity-60'
                        : isBluePick
                          ? 'bg-[#1E293B] border-sky-500'
                          : 'bg-[#0B0F17] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {civ.name}
                          </span>
                          <span className="text-xs font-mono text-emerald-400 tabular-nums">
                            {mapWinRate}% WR
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          {civ.specialty}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            soundEngine.playUiClick();
                            if (!isBanned) setBlueCivId(civ.id);
                          }}
                          disabled={isBanned}
                          className={`px-2.5 py-1 text-[11px] rounded cursor-pointer ${
                            isBluePick
                              ? 'bg-sky-600 text-white font-semibold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          Bleu
                        </button>
                        <button
                          onClick={() => {
                            soundEngine.playUiClick();
                            setBannedCivId(civ.id);
                          }}
                          className={`px-2 py-1 text-[11px] rounded cursor-pointer ${
                            isBanned
                              ? 'bg-rose-700 text-white font-semibold'
                              : 'bg-slate-800 text-slate-400 hover:text-rose-300'
                          }`}
                        >
                          Ban
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400 tabular-nums mt-2 pt-1.5 border-t border-slate-800/80">
                      <span>
                        Âge ×{civ.ageUpSpeedMultiplier} · Tech -
                        {Math.round(civ.techCostDiscount * 100)}%
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-400">
                        Beats: {civ.beatsCivIds.join(', ')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-rose-400">
                        Loses: {civ.losesToCivIds.join(', ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#1E293B] space-y-2">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-slate-300">
                  Adversaire Rouge & Civ :
                </span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={redPlayer.id}
                    onChange={(e) => setRedPlayerId(e.target.value)}
                    className="bg-[#0B0F17] border border-slate-700 rounded px-2 py-1 text-xs text-rose-300"
                  >
                    {opponents.map((opp) => (
                      <option key={opp.id} value={opp.id}>
                        {opp.handle} ({opp.elo})
                      </option>
                    ))}
                  </select>
                  <select
                    value={redCiv.id}
                    onChange={(e) => setRedCivId(e.target.value)}
                    className="bg-[#0B0F17] border border-slate-700 rounded px-2 py-1 text-xs text-amber-300"
                  >
                    {civilizations.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {hasAnalyst && (
                <div className="p-2.5 rounded bg-[#0B0F17] border border-slate-800 text-xs font-mono text-emerald-400 tabular-nums space-y-1">
                  <div>
                    Matrice Méta (Elo 2000+) : {etlWinProb}% pour{' '}
                    {bluePlayer.handle} ({blueCiv.name} vs {redCiv.name} sur{' '}
                    {selectedMap.name}).
                  </div>
                  <div className="text-[11px] text-amber-300/90">
                    Échantillon AoEStats : n={matchupWilsonCi.sampleSize} matchs · IC Wilson 95% : [
                    {matchupWilsonCi.lowerPct}% – {matchupWilsonCi.upperPct}%] (±
                    {matchupWilsonCi.marginPct}%)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modale Studio Replay si ouverte depuis la salle de Draft */}
        {activeReplayMatch && (
          <ReplayStudioModal
            match={activeReplayMatch}
            mapData={maps.find((m) => m.id === activeReplayMatch.mapId)}
            blueCiv={civilizations.find(
              (c) => c.id === activeReplayMatch.blue.civId
            )}
            redCiv={civilizations.find(
              (c) => c.id === activeReplayMatch.red.civId
            )}
            blueDag={blueDag}
            redDag={redDag}
            onClose={() => setActiveReplayMatch(null)}
          />
        )}
      </div>
    );
  }

  // --- VUE 2 : ARÈNE RTS PIXEL ART ÉCHELLE ×5 (HUD BASSE-OCCLUSION + BROUILLARD DE GUERRE) ---
  const activeBlueNode =
    blueDag.nodes.find((n) => n.id === matchState.blue.activeDagNodeId) ||
    blueDag.nodes[0];

  const latestSnap =
    matchState.history[matchState.history.length - 1] || matchState.history[0];
  const tickIntervalMs = simSpeed === 5 ? 240 : simSpeed === 2 ? 550 : 1050;

  return (
    <div className="relative w-full h-[calc(100vh-57px)] overflow-hidden bg-[#0B0F17] select-none">
      {/* 1. Viewport Canvas 60fps isolé occupant 100% de l'espace */}
      <div className="absolute inset-0">
        <PixelRtsCanvas
          matchState={matchState}
          mapData={selectedMap}
          onCanvasUnitInspect={(info) => setInspectedEntity(info)}
        />
      </div>

      {/* 2. HUD Périphérique Basse-Occlusion */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
        {/* Bandeau Périphérique Supérieur */}
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-3 items-start">
            {/* Cluster Bleu (4 cols) */}
            <div className="col-span-5 lg:col-span-4 bg-[#0B0F17]/95 border border-sky-500/60 rounded-lg px-3.5 py-2.5 pointer-events-auto shadow-md space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sky-400">
                    {matchState.blue.playerHandle}
                  </span>
                  <span className="text-slate-300">({blueCiv.name})</span>
                  <span className="font-mono text-amber-400 tabular-nums">
                    Âge {matchState.blue.age}
                  </span>
                </div>
                <span className="font-mono text-xs text-white font-semibold tabular-nums">
                  Score: {latestSnap?.blueScore ?? 260} · F_m(t):{' '}
                  {matchState.blue.effectiveMilitaryForce}
                </span>
              </div>

              <div className="grid grid-cols-6 gap-1.5 text-[11px] font-mono tabular-nums text-slate-200 pt-1 border-t border-slate-800">
                <div>N: {matchState.blue.resources.food}</div>
                <div>B: {matchState.blue.resources.wood}</div>
                <div>O: {matchState.blue.resources.gold}</div>
                <div>P: {matchState.blue.resources.stone}</div>
                <div className="text-sky-300">
                  Vil: {matchState.blue.villagers}
                </div>
                <div
                  className={
                    matchState.blue.morale < 35
                      ? 'text-rose-400 font-bold'
                      : 'text-emerald-400'
                  }
                >
                  Mor: {matchState.blue.morale}%
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-400 pt-1 border-t border-slate-800/80">
                <span>
                  Éclaireurs: {matchState.blue.scoutsCount} · Intel:{' '}
                  {matchState.blue.scoutingIntelPercent}%
                </span>
                <span
                  className={
                    matchState.blue.enemyRevealed
                      ? 'text-emerald-400 font-semibold'
                      : 'text-amber-400'
                  }
                >
                  {matchState.blue.enemyRevealed
                    ? `Cible Révélée (Transit ${Math.round(matchState.blue.armyTransitProgress)}%)`
                    : 'Ciblage Bloqué (Scouting requis)'}
                </span>
                <span>
                  Forum: {matchState.blue.townCenterHp}/
                  {matchState.blue.maxTownCenterHp}
                </span>
              </div>
            </div>

            {/* Cluster Central : Horloge des Ticks, Checkbox Fog of War & Toggle Courbes Live (4 cols) */}
            <div className="col-span-2 lg:col-span-4 flex flex-col items-center gap-1.5">
              <div className="bg-[#0B0F17]/95 border border-[#D97706]/80 rounded-lg px-3.5 py-2 pointer-events-auto flex flex-wrap items-center justify-center gap-3 font-mono tabular-nums shadow-md">
                <div className="text-center">
                  <div className="text-[10px] text-slate-400">{seriesFormat}</div>
                  <div className="text-sm font-bold text-white">
                    <span className="text-sky-400">{blueSeriesScore}</span> -{' '}
                    <span className="text-rose-400">{redSeriesScore}</span>
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-800" />

                <div className="text-center">
                  <div className="text-[10px] text-amber-400">
                    TICK #{matchState.tick} · {selectedMap.name}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {Math.floor(matchState.timeSeconds / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(matchState.timeSeconds % 60).toString().padStart(2, '0')}
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-800" />

                {/* Checkbox Brouillard de Guerre en direct */}
                <label className="flex items-center gap-1.5 text-[11px] font-sans text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={matchState.fogOfWarEnabled}
                    onChange={(e) => handleToggleFogOfWar(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#D97706] rounded cursor-pointer"
                  />
                  <span>Fog of War</span>
                </label>

                <button
                  onClick={() => {
                    soundEngine.playUiClick();
                    setShowLiveCurves(!showLiveCurves);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-sans font-medium cursor-pointer flex items-center gap-1 ${
                    showLiveCurves
                      ? 'bg-[#D97706] text-white'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  Courbes
                </button>
              </div>
            </div>

            {/* Cluster Rouge (4 cols - Masque les détails sous Fog of War tant que non révélé) */}
            <div className="col-span-5 lg:col-span-4 bg-[#0B0F17]/95 border border-rose-500/60 rounded-lg px-3.5 py-2.5 pointer-events-auto shadow-md space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-xs text-white font-semibold tabular-nums">
                  {matchState.fogOfWarEnabled && !matchState.blue.enemyRevealed
                    ? 'Score: ??? · F_m(t): Brouillard'
                    : `Score: ${latestSnap?.redScore ?? 260} · F_m(t): ${matchState.red.effectiveMilitaryForce}`}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-400 tabular-nums">
                    Âge{' '}
                    {matchState.fogOfWarEnabled && !matchState.blue.enemyRevealed
                      ? '?'
                      : matchState.red.age}
                  </span>
                  <span className="text-slate-300">({redCiv.name})</span>
                  <span className="font-bold text-rose-400">
                    {matchState.red.playerHandle}
                  </span>
                </div>
              </div>

              {matchState.fogOfWarEnabled && !matchState.blue.enemyRevealed ? (
                <div className="text-[11px] font-mono text-amber-400/90 pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span>
                    Brouillard de Guerre actif : dépêchez votre Éclaireur (
                    {matchState.blue.scoutingIntelPercent}%/35%).
                  </span>
                  <span>Ciblage Verrouillé</span>
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-1.5 text-[11px] font-mono tabular-nums text-slate-200 pt-1 border-t border-slate-800">
                  <div>N: {matchState.red.resources.food}</div>
                  <div>B: {matchState.red.resources.wood}</div>
                  <div>O: {matchState.red.resources.gold}</div>
                  <div>P: {matchState.red.resources.stone}</div>
                  <div className="text-rose-300">
                    Vil: {matchState.red.villagers}
                  </div>
                  <div
                    className={
                      matchState.red.morale < 35
                        ? 'text-rose-400 font-bold'
                        : 'text-emerald-400'
                    }
                  >
                    Mor: {matchState.red.morale}%
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-400 pt-1 border-t border-slate-800/80">
                <span>
                  Éclaireurs: {matchState.red.scoutsCount} · Reliques:{' '}
                  {matchState.red.relicsCaptured}
                </span>
                <span>
                  Transit Rouge: {Math.round(matchState.red.armyTransitProgress)}%
                </span>
                <span>
                  Forum: {matchState.red.townCenterHp}/
                  {matchState.red.maxTownCenterHp}
                </span>
              </div>
            </div>
          </div>

          {/* Moniteur de Courbes Télémétriques Live Recharts (Synchronisé au Tick Rate) */}
          {showLiveCurves && (
            <div className="flex justify-end">
              <LiveRechartsTelemetry
                history={matchState.history}
                tickIntervalMs={tickIntervalMs}
                simSpeed={simSpeed}
                isRunning={matchState.status === 'RUNNING'}
                blueHandle={matchState.blue.playerHandle}
                redHandle={matchState.red.playerHandle}
                blueUnits={matchState.blue.militaryUnits}
                redUnits={matchState.red.militaryUnits}
              />
            </div>
          )}
        </div>

        {/* Bandeau Périphérique Inférieur : Contrôles Tick, Consignes Coach & Journal Stochastique */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end pl-0 lg:pl-[235px]">
          {/* Nœud DAG Actif & Commandes de Simulation (7 cols) */}
          <div className="lg:col-span-7 bg-[#0B0F17]/95 border border-[#1E293B] rounded-lg p-3 pointer-events-auto flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono text-amber-400 tabular-nums">
                NŒUD DAG ACTIF · CARTE ×5 (RUSH DIST {selectedMap.rushDistance})
              </div>
              <div className="text-xs font-bold text-white">
                {activeBlueNode?.title || 'Exécution Standard'}
              </div>
              {inspectedEntity && (
                <div className="text-[11px] font-mono text-sky-300">
                  Cible inspectée : {inspectedEntity.label} (
                  {inspectedEntity.detail})
                </div>
              )}
            </div>

            {/* Boutons de Coaching en direct */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleCoachCall('SCOUT_RECON')}
                className="px-2.5 py-1.5 bg-[#131B2E] hover:bg-slate-800 border border-amber-500/50 text-xs text-amber-300 rounded cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1"
              >
                <Compass className="w-3 h-3" />
                Scouting Éclaireur
              </button>
              <button
                onClick={() => handleCoachCall('QUICKWALL_ALERT')}
                className="px-2.5 py-1.5 bg-[#131B2E] hover:bg-slate-800 border border-slate-700 text-xs text-sky-300 rounded cursor-pointer whitespace-nowrap shrink-0"
              >
                Quickwall & Forum
              </button>
              <button
                onClick={() => handleCoachCall('ALL_IN_PUSH')}
                className="px-2.5 py-1.5 bg-[#131B2E] hover:bg-slate-800 border border-slate-700 text-xs text-rose-300 rounded cursor-pointer whitespace-nowrap shrink-0"
              >
                Marche Forcée F_m(t)
              </button>
              <button
                onClick={() => handleCoachCall('BOOM_RECOVERY')}
                className="px-2.5 py-1.5 bg-[#131B2E] hover:bg-slate-800 border border-slate-700 text-xs text-emerald-300 rounded cursor-pointer whitespace-nowrap shrink-0"
              >
                Relance Macro
              </button>
            </div>

            {/* Contrôles Vitesse & Audio */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <button
                onClick={() => {
                  soundEngine.playUiClick();
                  setMatchState((prev) =>
                    prev
                      ? {
                          ...prev,
                          status:
                            prev.status === 'RUNNING' ? 'PAUSED' : 'RUNNING',
                        }
                      : null
                  );
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer"
                title="Pause / Reprendre (Espace)"
              >
                {matchState.status === 'RUNNING' ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                onClick={() => {
                  soundEngine.playUiClick();
                  setMatchState((prev) =>
                    prev
                      ? stepMatchTick(prev, {
                          map: selectedMap,
                          bluePlayer,
                          blueCiv,
                          blueDag,
                          redPlayer,
                          redCiv,
                          redDag,
                          hasPsychologist,
                        })
                      : null
                  );
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
                title="Avancer d'un Tick (5s)"
              >
                +1 Tick
              </button>

              {([1, 2, 5] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => {
                    soundEngine.playUiClick();
                    setSimSpeed(spd);
                  }}
                  className={`px-2 py-1 rounded cursor-pointer ${
                    simSpeed === spd
                      ? 'bg-[#D97706] text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}

              <button
                onClick={() => {
                  const nextMute = soundEngine.toggleMute();
                  setIsMuted(nextMute);
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                title="Activer / Couper le synthétiseur Web Audio"
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </button>
            </div>
          </div>

          {/* Journal Compact des Événements Stochastiques & Scouting (5 cols) */}
          <div className="lg:col-span-5 bg-[#0B0F17]/95 border border-[#1E293B] rounded-lg p-3 pointer-events-auto max-h-28 overflow-y-auto space-y-1.5 shadow-md">
            {matchState.events.slice(0, 4).map((ev, idx) => (
              <div
                key={`${ev.tick}_${idx}`}
                className="text-[11px] flex items-start justify-between gap-2 border-b border-slate-800/80 pb-1 last:border-none last:pb-0"
              >
                <div>
                  <span
                    className={`font-mono font-semibold mr-1.5 ${
                      ev.side === 'BLUE'
                        ? 'text-sky-400'
                        : ev.side === 'RED'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                    }`}
                  >
                    [T{ev.tick}]
                  </span>
                  <span className="font-semibold text-white">{ev.title}</span>
                  <span className="text-slate-400 ml-1.5">{ev.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Modale de Fin de Manche / GG Call / Ouverture du Studio Replay */}
      {matchState.status === 'FINISHED' && !activeReplayMatch && (
        <div className="absolute inset-0 z-30 bg-[#0B0F17]/85 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-[#131B2E] border border-[#D97706] rounded-lg p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="text-xs font-mono text-[#D97706] tabular-nums">
                MANCHE #{currentGameNumber} TERMINÉE AU TICK #{matchState.tick} (
                {matchState.timeSeconds}S) · CARTE ×5
              </div>
              <h2
                className="text-2xl font-bold text-white"
                style={{fontFamily: 'var(--font-cinzel), serif'}}
              >
                {matchState.winnerSide === 'BLUE'
                  ? `Victoire Impériale de ${matchState.blue.playerHandle} !`
                  : `Défaite — ${matchState.red.playerHandle} remporte la manche`}
              </h2>
              <p className="text-xs text-slate-300">
                Motif de résolution :{' '}
                <span className="font-mono text-amber-300">
                  {matchState.winReason === 'GG_CALL'
                    ? 'Abandon anticipé (GG Call après guerre d’usure)'
                    : matchState.winReason === 'TOWN_CENTER_DESTROYED'
                      ? 'Siège complet et destruction du Forum Impérial'
                      : 'Décision Impériale au score militaire et économique'}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded bg-[#0B0F17] border border-slate-800 text-xs font-mono tabular-nums">
              <div className="space-y-1">
                <div className="text-sky-400 font-bold">
                  {matchState.blue.playerHandle} ({blueCiv.name})
                </div>
                <div>Score AoE2 : {latestSnap?.blueScore ?? 260}</div>
                <div>Force F_m(t) : {matchState.blue.effectiveMilitaryForce}</div>
                <div>
                  PV Forum : {matchState.blue.townCenterHp}/
                  {matchState.blue.maxTownCenterHp}
                </div>
                <div>
                  Intel Scouting : {matchState.blue.scoutingIntelPercent}% (
                  {matchState.blue.relicsCaptured} reliques)
                </div>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-rose-400 font-bold">
                  {matchState.red.playerHandle} ({redCiv.name})
                </div>
                <div>Score AoE2 : {latestSnap?.redScore ?? 260}</div>
                <div>Force F_m(t) : {matchState.red.effectiveMilitaryForce}</div>
                <div>
                  PV Forum : {matchState.red.townCenterHp}/
                  {matchState.red.maxTownCenterHp}
                </div>
                <div>
                  Intel Scouting : {matchState.red.scoutingIntelPercent}% (
                  {matchState.red.relicsCaptured} reliques)
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  soundEngine.playUiClick();
                  setActiveReplayMatch(matchState);
                }}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5" />
                Studio Replay (Tick-par-Tick & Export JSON)
              </button>

              <button
                onClick={() => {
                  soundEngine.playUiClick();
                  setCurrentGameNumber((n) => n + 1);
                  setMatchState(null);
                }}
                className="px-4 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Manche Suivante (Rotation & Draft)
              </button>

              <button
                onClick={() => {
                  soundEngine.playUiClick();
                  setMatchState(null);
                  onExitArena();
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Quartier Général
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Studio Replay Post-Match en plein écran */}
      {activeReplayMatch && (
        <ReplayStudioModal
          match={activeReplayMatch}
          mapData={selectedMap}
          blueCiv={blueCiv}
          redCiv={redCiv}
          blueDag={blueDag}
          redDag={redDag}
          onClose={() => setActiveReplayMatch(null)}
        />
      )}
    </div>
  );
}
