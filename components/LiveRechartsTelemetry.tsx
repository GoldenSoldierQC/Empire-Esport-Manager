'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {TickHistorySnapshot, UnitCategory} from '@/lib/types';
import {soundEngine} from '@/lib/sound';
import {Activity} from 'lucide-react';

export type LiveTelemetryTab = 'SCORE' | 'ECO' | 'FORCE' | 'UNITS';

interface LiveRechartsTelemetryProps {
  history: TickHistorySnapshot[];
  tickIntervalMs: number;
  simSpeed: 1 | 2 | 5;
  isRunning: boolean;
  blueHandle: string;
  redHandle: string;
  blueUnits: Record<UnitCategory, number>;
  redUnits: Record<UnitCategory, number>;
}

export default function LiveRechartsTelemetry({
  history,
  tickIntervalMs,
  simSpeed,
  isRunning,
  blueHandle,
  redHandle,
  blueUnits,
  redUnits,
}: LiveRechartsTelemetryProps) {
  const [activeTab, setActiveTab] = useState<LiveTelemetryTab>('SCORE');
  const [interpProgress, setInterpProgress] = useState<number>(1);

  // Interpolation fluide synchronisée exactement sur la durée du tick (tickIntervalMs)
  useEffect(() => {
    if (!isRunning || history.length < 2) {
      setInterpProgress(1);
      return;
    }

    let rafId: number;
    const startPerf = performance.now();

    const animateSubTick = (now: number) => {
      const elapsed = now - startPerf;
      const rawT = Math.min(1, elapsed / Math.max(120, tickIntervalMs));
      // Courbe d'assouplissement cubique (cubic-bezier)
      const easedT = 1 - Math.pow(1 - rawT, 3);
      setInterpProgress(easedT);

      if (rawT < 1) {
        rafId = requestAnimationFrame(animateSubTick);
      }
    };

    rafId = requestAnimationFrame(animateSubTick);
    return () => cancelAnimationFrame(rafId);
  }, [history.length, tickIntervalMs, isRunning]);

  // Données interpolées pour que le dernier point glisse en continu au rythme du Tick Rate
  const chartData = useMemo(() => {
    if (history.length === 0) return [];
    if (history.length === 1) {
      const h = history[0];
      return [
        {
          tickLabel: `T${h.tick}`,
          tick: h.tick,
          timeSec: h.timeSeconds,
          blueScore: h.blueScore,
          redScore: h.redScore,
          blueEco: h.blueEco,
          redEco: h.redEco,
          blueForce: h.blueForce,
          redForce: h.redForce,
        },
      ];
    }

    const baseSlice = history.slice(0, -1).map((h) => ({
      tickLabel: `T${h.tick}`,
      tick: h.tick,
      timeSec: h.timeSeconds,
      blueScore: h.blueScore,
      redScore: h.redScore,
      blueEco: h.blueEco,
      redEco: h.redEco,
      blueForce: h.blueForce,
      redForce: h.redForce,
    }));

    const prev = history[history.length - 2];
    const curr = history[history.length - 1];
    const lerp = (a: number, b: number) =>
      Math.round((a + (b - a) * interpProgress) * 10) / 10;

    baseSlice.push({
      tickLabel: `T${curr.tick}`,
      tick: curr.tick,
      timeSec: curr.timeSeconds,
      blueScore: Math.round(lerp(prev.blueScore, curr.blueScore)),
      redScore: Math.round(lerp(prev.redScore, curr.redScore)),
      blueEco: Math.round(lerp(prev.blueEco, curr.blueEco)),
      redEco: Math.round(lerp(prev.redEco, curr.redEco)),
      blueForce: lerp(prev.blueForce, curr.blueForce),
      redForce: lerp(prev.redForce, curr.redForce),
    });

    return baseSlice.slice(-24); // Fenêtre glissante des 24 derniers ticks pour une lisibilité optimale
  }, [history, interpProgress]);

  const unitBarData = useMemo(() => {
    const categories: Array<{key: UnitCategory; label: string}> = [
      {key: 'INFANTRY', label: 'Infanterie'},
      {key: 'ARCHERS', label: 'Archers'},
      {key: 'CAVALRY', label: 'Cavalerie'},
      {key: 'SIEGE', label: 'Siège'},
      {key: 'MONKS', label: 'Moines'},
    ];
    return categories.map((c) => ({
      name: c.label,
      Bleu: blueUnits[c.key] || 0,
      Rouge: redUnits[c.key] || 0,
    }));
  }, [blueUnits, redUnits]);

  const latest = chartData[chartData.length - 1];
  const syncAnimDuration = Math.max(160, Math.round(tickIntervalMs * 0.82));

  return (
    <div className="w-[380px] sm:w-[420px] bg-[#0B0F17]/95 border border-[#1E293B] rounded-lg p-3.5 pointer-events-auto shadow-xl space-y-2.5">
      {/* En-tête des onglets Recharts & Synchronisation Tick Rate */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-[#131B2E] p-1 rounded-md border border-slate-800">
          {(
            [
              {id: 'SCORE', label: 'Score'},
              {id: 'ECO', label: 'Économie'},
              {id: 'FORCE', label: 'Force F_m(t)'},
              {id: 'UNITS', label: 'Unités'},
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                soundEngine.playUiClick();
                setActiveTab(tab.id);
              }}
              className={`px-2.5 py-1 text-[10px] font-mono rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#D97706] text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 tabular-nums">
          <Activity className="w-3 h-3 text-[#D97706]" />
          <span>
            Sync {simSpeed}x ({tickIntervalMs}ms)
          </span>
        </div>
      </div>

      {/* Conteneur graphique Recharts */}
      <div className="w-full h-[145px] bg-[#131B2E]/40 rounded border border-slate-800/90 p-1.5">
        {activeTab === 'SCORE' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{top: 6, right: 8, left: -20, bottom: 0}}
            >
              <defs>
                <linearGradient id="liveBlueScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="liveRedScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis
                dataKey="tickLabel"
                stroke="#64748B"
                fontSize={9}
                tickLine={false}
              />
              <YAxis stroke="#64748B" fontSize={9} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B0F17',
                  borderColor: '#334155',
                  fontSize: '11px',
                  fontFamily: 'var(--font-jetbrains), monospace',
                }}
              />
              <Area
                type="monotone"
                dataKey="blueScore"
                name={`Score ${blueHandle}`}
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#liveBlueScore)"
                isAnimationActive={true}
                animationDuration={syncAnimDuration}
                animationEasing="ease-in-out"
              />
              <Area
                type="monotone"
                dataKey="redScore"
                name={`Score ${redHandle}`}
                stroke="#EF4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#liveRedScore)"
                isAnimationActive={true}
                animationDuration={syncAnimDuration}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'ECO' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{top: 6, right: 8, left: -20, bottom: 0}}
            >
              <defs>
                <linearGradient id="liveBlueEco" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="liveRedEco" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F87171" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F87171" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis
                dataKey="tickLabel"
                stroke="#64748B"
                fontSize={9}
                tickLine={false}
              />
              <YAxis stroke="#64748B" fontSize={9} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B0F17',
                  borderColor: '#334155',
                  fontSize: '11px',
                  fontFamily: 'var(--font-jetbrains), monospace',
                }}
              />
              <Area
                type="monotone"
                dataKey="blueEco"
                name={`Ressources ${blueHandle}`}
                stroke="#38BDF8"
                strokeWidth={2}
                fill="url(#liveBlueEco)"
                isAnimationActive={true}
                animationDuration={syncAnimDuration}
                animationEasing="ease-in-out"
              />
              <Area
                type="monotone"
                dataKey="redEco"
                name={`Ressources ${redHandle}`}
                stroke="#F87171"
                strokeWidth={2}
                fill="url(#liveRedEco)"
                isAnimationActive={true}
                animationDuration={syncAnimDuration}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'FORCE' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{top: 6, right: 8, left: -20, bottom: 0}}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis
                dataKey="tickLabel"
                stroke="#64748B"
                fontSize={9}
                tickLine={false}
              />
              <YAxis stroke="#64748B" fontSize={9} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B0F17',
                  borderColor: '#334155',
                  fontSize: '11px',
                  fontFamily: 'var(--font-jetbrains), monospace',
                }}
              />
              <Line
                type="monotone"
                dataKey="blueForce"
                name={`F_m(t) ${blueHandle}`}
                stroke="#3B82F6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{r: 4, fill: '#60A5FA'}}
                isAnimationActive={true}
                animationDuration={syncAnimDuration}
                animationEasing="ease-in-out"
              />
              <Line
                type="monotone"
                dataKey="redForce"
                name={`F_m(t) ${redHandle}`}
                stroke="#EF4444"
                strokeWidth={2.5}
                dot={false}
                activeDot={{r: 4, fill: '#F87171'}}
                isAnimationActive={true}
                animationDuration={syncAnimDuration}
                animationEasing="ease-in-out"
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'UNITS' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={unitBarData}
              layout="vertical"
              margin={{top: 4, right: 10, left: 10, bottom: 0}}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis type="number" stroke="#64748B" fontSize={9} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#94A3B8"
                fontSize={9}
                width={58}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B0F17',
                  borderColor: '#334155',
                  fontSize: '11px',
                  fontFamily: 'var(--font-jetbrains), monospace',
                }}
              />
              <Bar
                dataKey="Bleu"
                fill="#3B82F6"
                radius={[0, 3, 3, 0]}
                isAnimationActive={true}
                animationDuration={syncAnimDuration}
              />
              <Bar
                dataKey="Rouge"
                fill="#EF4444"
                radius={[0, 3, 3, 0]}
                isAnimationActive={true}
                animationDuration={syncAnimDuration}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pied de lecture numérique instantanée */}
      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300 pt-0.5">
        <span className="text-sky-400">
          {blueHandle}:{' '}
          {activeTab === 'SCORE'
            ? `${latest?.blueScore ?? 240} pts`
            : activeTab === 'ECO'
              ? `${latest?.blueEco ?? 700} res`
              : `${latest?.blueForce ?? 12} F_m`}
        </span>
        <span className="text-slate-500">Transition Recharts Fluide</span>
        <span className="text-rose-400">
          {redHandle}:{' '}
          {activeTab === 'SCORE'
            ? `${latest?.redScore ?? 240} pts`
            : activeTab === 'ECO'
              ? `${latest?.redEco ?? 700} res`
              : `${latest?.redForce ?? 12} F_m`}
        </span>
      </div>
    </div>
  );
}
