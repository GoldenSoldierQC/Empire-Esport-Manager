'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BuildOrderDag,
  Civilization,
  LiveMatchState,
  RtsMap,
  UnitCategory,
} from '@/lib/types';
import {soundEngine} from '@/lib/sound';
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  Pause,
  Play,
  X,
} from 'lucide-react';

interface ReplayStudioModalProps {
  match: LiveMatchState;
  mapData?: RtsMap;
  blueCiv?: Civilization;
  redCiv?: Civilization;
  blueDag?: BuildOrderDag;
  redDag?: BuildOrderDag;
  onClose: () => void;
}

type ChartMetric = 'SCORE' | 'FORCE' | 'ECO' | 'MORALE';

export default function ReplayStudioModal({
  match,
  mapData,
  blueCiv,
  redCiv,
  blueDag,
  redDag,
  onClose,
}: ReplayStudioModalProps) {
  const maxTick = Math.max(0, match.history.length - 1);
  const [scrubTick, setScrubTick] = useState<number>(maxTick);
  const [isPlayingReplay, setIsPlayingReplay] = useState<boolean>(false);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('SCORE');
  const [showJsonPreview, setShowJsonPreview] = useState<boolean>(false);

  useEffect(() => {
    setScrubTick(Math.max(0, match.history.length - 1));
  }, [match.matchId, match.history.length]);

  useEffect(() => {
    if (!isPlayingReplay) return;
    const timer = setInterval(() => {
      setScrubTick((prev) => {
        if (prev >= maxTick) {
          setIsPlayingReplay(false);
          return maxTick;
        }
        return prev + 1;
      });
    }, 320);
    return () => clearInterval(timer);
  }, [isPlayingReplay, maxTick]);

  const currentSnap =
    match.history[scrubTick] || match.history[match.history.length - 1];

  const rechartsData = useMemo(() => {
    return match.history.map((h) => ({
      tick: h.tick,
      tickLabel: `T${h.tick}`,
      blueVal:
        chartMetric === 'SCORE'
          ? h.blueScore || 240
          : chartMetric === 'FORCE'
            ? h.blueForce
            : chartMetric === 'ECO'
              ? h.blueEco
              : h.blueMorale,
      redVal:
        chartMetric === 'SCORE'
          ? h.redScore || 240
          : chartMetric === 'FORCE'
            ? h.redForce
            : chartMetric === 'ECO'
              ? h.redEco
              : h.redMorale,
    }));
  }, [match.history, chartMetric]);

  if (!currentSnap) return null;

  const bState = currentSnap.blueState || match.blue;
  const rState = currentSnap.redState || match.red;

  const blueActiveNode = blueDag?.nodes.find(
    (n) => n.id === bState.activeDagNodeId
  );
  const redActiveNode = redDag?.nodes.find(
    (n) => n.id === rState.activeDagNodeId
  );

  const handleExportJson = () => {
    soundEngine.playUiClick();
    const payload = {
      exportedAt: new Date().toISOString(),
      simulator: 'Aegis Empire Manager - Tick Engine v2',
      matchId: match.matchId,
      map: mapData?.name || match.mapId,
      seriesFormat: match.seriesFormat,
      winnerSide: match.winnerSide,
      winReason: match.winReason,
      totalTicks: match.tick,
      totalDurationSeconds: match.timeSeconds,
      blueDuellist: {
        handle: match.blue.playerHandle,
        civilization: blueCiv?.name || match.blue.civId,
        buildOrderDag: blueDag?.name,
      },
      redDuellist: {
        handle: match.red.playerHandle,
        civilization: redCiv?.name || match.red.civId,
        buildOrderDag: redDag?.name,
      },
      events: match.events,
      tickByTickSnapshots: match.history,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aegis_replay_${match.matchId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getMetricPair = (snap: typeof currentSnap) => {
    if (chartMetric === 'SCORE')
      return {b: snap.blueScore || 240, r: snap.redScore || 240};
    if (chartMetric === 'FORCE') return {b: snap.blueForce, r: snap.redForce};
    if (chartMetric === 'ECO') return {b: snap.blueEco, r: snap.redEco};
    return {b: snap.blueMorale, r: snap.redMorale};
  };

  const eventsUpToTick = match.events.filter((e) => e.tick <= currentSnap.tick);

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F17]/90 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-[1220px] w-full bg-[#131B2E] border border-[#D97706] rounded-lg p-6 space-y-6 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
        {/* En-tête du Studio Replay */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400 tabular-nums">
              <span>STUDIO REPLAY POST-MATCH (RECHARTS)</span>
              <span aria-hidden="true">·</span>
              <span>CARTE : {mapData?.name || match.mapId}</span>
              <span aria-hidden="true">·</span>
              <span>
                TICK #{currentSnap.tick} / #{maxTick} ({currentSnap.timeSeconds}s)
              </span>
            </div>
            <h2
              className="text-xl sm:text-2xl font-bold text-white mt-0.5"
              style={{fontFamily: 'var(--font-cinzel), serif'}}
            >
              Analyse Temporelle Tick-par-Tick : {match.blue.playerHandle} vs{' '}
              {match.red.playerHandle}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setShowJsonPreview(!showJsonPreview);
              }}
              className="px-3.5 py-2 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs font-mono rounded-lg cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showJsonPreview ? 'Masquer JSON' : 'Aperçu JSON'}
            </button>

            <button
              onClick={handleExportJson}
              className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Exporter Replay JSON
            </button>

            <button
              onClick={() => {
                soundEngine.playUiClick();
                onClose();
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
              title="Fermer le Studio Replay"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Graphe multi-courbes Recharts interactif + Scrubber temporel */}
        <div className="bg-[#0B0F17] border border-[#1E293B] rounded-lg p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-[#131B2E] border border-slate-800 rounded-lg">
              {(
                [
                  {id: 'SCORE', label: 'Score AoE2'},
                  {id: 'FORCE', label: 'Force Militaire F_m(t)'},
                  {id: 'ECO', label: 'Ressources Éco'},
                  {id: 'MORALE', label: 'Moral (%)'},
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    soundEngine.playUiClick();
                    setChartMetric(tab.id);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    chartMetric === tab.id
                      ? 'bg-[#D97706] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <span className="text-sky-400 font-semibold">
                Bleu ({match.blue.playerHandle}) : {getMetricPair(currentSnap).b}
              </span>
              <span className="text-rose-400 font-semibold">
                Rouge ({match.red.playerHandle}) : {getMetricPair(currentSnap).r}
              </span>
            </div>
          </div>

          {/* Courbe Recharts avec ReferenceLine synchronisée au Tick */}
          <div className="w-full h-52 bg-[#131B2E]/40 rounded border border-slate-800 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={rechartsData}
                onClick={(state) => {
                  if (
                    state &&
                    typeof state.activeTooltipIndex === 'number' &&
                    state.activeTooltipIndex >= 0
                  ) {
                    soundEngine.playUiClick();
                    setScrubTick(
                      Math.min(maxTick, Math.max(0, state.activeTooltipIndex))
                    );
                  }
                }}
              >
                <defs>
                  <linearGradient id="repBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="repRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="tick"
                  stroke="#64748B"
                  fontSize={10}
                  tickFormatter={(v) => `T${v}`}
                />
                <YAxis stroke="#64748B" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B0F17',
                    borderColor: '#334155',
                    fontSize: '12px',
                    fontFamily: 'var(--font-jetbrains), monospace',
                  }}
                />
                <ReferenceLine
                  x={currentSnap.tick}
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
                <Area
                  type="monotone"
                  dataKey="blueVal"
                  name={match.blue.playerHandle}
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fill="url(#repBlue)"
                  isAnimationActive={true}
                  animationDuration={260}
                  animationEasing="ease-in-out"
                />
                <Area
                  type="monotone"
                  dataKey="redVal"
                  name={match.red.playerHandle}
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  fill="url(#repRed)"
                  isAnimationActive={true}
                  animationDuration={260}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Barre de Scrubbing Tick-par-Tick */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => {
                soundEngine.playUiClick();
                if (scrubTick >= maxTick) setScrubTick(0);
                setIsPlayingReplay(!isPlayingReplay);
              }}
              className="px-3 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {isPlayingReplay ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Lecture Replay
                </>
              )}
            </button>

            <button
              onClick={() => {
                soundEngine.playUiClick();
                setScrubTick((t) => Math.max(0, t - 1));
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
              title="Tick précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={0}
              max={maxTick}
              value={scrubTick}
              onChange={(e) => setScrubTick(parseInt(e.target.value, 10))}
              className="flex-1 accent-[#D97706]"
            />

            <button
              onClick={() => {
                soundEngine.playUiClick();
                setScrubTick((t) => Math.min(maxTick, t + 1));
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
              title="Tick suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs text-amber-400 tabular-nums whitespace-nowrap shrink-0">
              Tick #{currentSnap.tick} ·{' '}
              {Math.floor(currentSnap.timeSeconds / 60)
                .toString()
                .padStart(2, '0')}
              :{(currentSnap.timeSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Inspection comparative des 2 duellistes à l'instant T */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* État détaillé Bleu (4 cols) */}
          <div className="lg:col-span-4 bg-[#0B0F17] border border-sky-500/40 rounded-lg p-4 space-y-3 font-mono text-xs tabular-nums">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-sans text-sm font-bold text-sky-400">
                {bState.playerHandle} ({blueCiv?.name || bState.civId})
              </span>
              <span className="text-amber-400">Âge {bState.age}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>Score AoE2 : {currentSnap.blueScore}</div>
              <div>Force F_m(t) : {bState.effectiveMilitaryForce}</div>
              <div>Villageois : {bState.villagers}</div>
              <div>Moral : {bState.morale}%</div>
              <div>
                PV Forum : {bState.townCenterHp}/{bState.maxTownCenterHp || 6500}
              </div>
              <div>
                Intel / Reliques : {bState.scoutingIntelPercent ?? 100}% ·{' '}
                {bState.relicsCaptured ?? 0} rel.
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-slate-400 mb-1">Ressources en Stock :</div>
              <div className="grid grid-cols-4 gap-1 text-[11px]">
                <span className="text-rose-300">N:{bState.resources.food}</span>
                <span className="text-emerald-300">B:{bState.resources.wood}</span>
                <span className="text-amber-300">O:{bState.resources.gold}</span>
                <span className="text-slate-300">P:{bState.resources.stone}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-slate-400 mb-1">Composition Militaire :</div>
              <div className="grid grid-cols-5 gap-1 text-[11px]">
                {(
                  ['INFANTRY', 'ARCHERS', 'CAVALRY', 'SIEGE', 'MONKS'] as UnitCategory[]
                ).map((cat) => (
                  <div key={cat} className="bg-[#131B2E] p-1.5 rounded text-center">
                    <div className="text-[9px] text-slate-400">{cat.slice(0, 3)}</div>
                    <div className="font-bold text-white">
                      {bState.militaryUnits[cat]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 font-sans">
              <div className="text-[11px] text-slate-400">Nœud DAG Actif :</div>
              <div className="text-xs font-semibold text-sky-300">
                {blueActiveNode?.title || bState.activeDagNodeId}
              </div>
            </div>
          </div>

          {/* Journal des événements filtré au Tick sélectionné (4 cols) */}
          <div className="lg:col-span-4 bg-[#0B0F17] border border-[#1E293B] rounded-lg p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-white border-b border-slate-800 pb-2 mb-2.5">
                Journal Tactique jusqu’au Tick #{currentSnap.tick}
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {eventsUpToTick.map((ev, idx) => {
                  const isExactTick = ev.tick === currentSnap.tick;
                  return (
                    <div
                      key={`${ev.tick}_${idx}`}
                      className={`p-2 rounded border text-xs ${
                        isExactTick
                          ? 'bg-[#1E293B] border-[#D97706]'
                          : 'bg-[#131B2E]/50 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 tabular-nums">
                        <span>
                          Tick #{ev.tick} ({ev.timeSeconds}s)
                        </span>
                        <span
                          className={
                            ev.side === 'BLUE'
                              ? 'text-sky-400'
                              : ev.side === 'RED'
                                ? 'text-rose-400'
                                : 'text-amber-400'
                          }
                        >
                          {ev.type}
                        </span>
                      </div>
                      <div className="font-semibold text-white mt-0.5">
                        {ev.title}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        {ev.detail}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* État détaillé Rouge (4 cols) */}
          <div className="lg:col-span-4 bg-[#0B0F17] border border-rose-500/40 rounded-lg p-4 space-y-3 font-mono text-xs tabular-nums">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-sans text-sm font-bold text-rose-400">
                {rState.playerHandle} ({redCiv?.name || rState.civId})
              </span>
              <span className="text-amber-400">Âge {rState.age}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>Score AoE2 : {currentSnap.redScore}</div>
              <div>Force F_m(t) : {rState.effectiveMilitaryForce}</div>
              <div>Villageois : {rState.villagers}</div>
              <div>Moral : {rState.morale}%</div>
              <div>
                PV Forum : {rState.townCenterHp}/{rState.maxTownCenterHp || 6500}
              </div>
              <div>
                Intel / Reliques : {rState.scoutingIntelPercent ?? 100}% ·{' '}
                {rState.relicsCaptured ?? 0} rel.
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-slate-400 mb-1">Ressources en Stock :</div>
              <div className="grid grid-cols-4 gap-1 text-[11px]">
                <span className="text-rose-300">N:{rState.resources.food}</span>
                <span className="text-emerald-300">B:{rState.resources.wood}</span>
                <span className="text-amber-300">O:{rState.resources.gold}</span>
                <span className="text-slate-300">P:{rState.resources.stone}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-slate-400 mb-1">Composition Militaire :</div>
              <div className="grid grid-cols-5 gap-1 text-[11px]">
                {(
                  ['INFANTRY', 'ARCHERS', 'CAVALRY', 'SIEGE', 'MONKS'] as UnitCategory[]
                ).map((cat) => (
                  <div key={cat} className="bg-[#131B2E] p-1.5 rounded text-center">
                    <div className="text-[9px] text-slate-400">{cat.slice(0, 3)}</div>
                    <div className="font-bold text-white">
                      {rState.militaryUnits[cat]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 font-sans">
              <div className="text-[11px] text-slate-400">Nœud DAG Actif :</div>
              <div className="text-xs font-semibold text-rose-300">
                {redActiveNode?.title || rState.activeDagNodeId}
              </div>
            </div>
          </div>
        </div>

        {/* Aperçu JSON Brut si activé */}
        {showJsonPreview && (
          <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 space-y-2">
            <div className="text-xs font-mono text-sky-400">
              SNAPSHOT JSON DU TICK #{currentSnap.tick}
            </div>
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56">
              {JSON.stringify(currentSnap, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
