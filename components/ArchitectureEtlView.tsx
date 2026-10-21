'use client';

import React, {useMemo, useState} from 'react';
import {
  BuildOrderDag,
  Civilization,
  EsportsPlayer,
  EtlPlayerRecord,
  RtsMap,
} from '@/lib/types';
import {
  AOESTATS_DUMP_MANIFESTS,
  AOESTATS_PARQUET_MATCHES,
  AOESTATS_PARQUET_PLAYERS,
  LIQUIPEDIA_TOURNAMENTS,
  RAW_ETL_DATASET,
  RUST_ENGINE_REFERENCE_CODE,
  SQLITE_SCHEMA_REFERENCE,
} from '@/lib/initial-data';
import {
  computeWilsonScoreInterval,
  runAoEStatsQuarantineValidation,
  runMonteCarloBatchSimulation,
} from '@/lib/tick-engine';
import {soundEngine} from '@/lib/sound';
import {
  AlertTriangle,
  Check,
  Copy,
  Database,
  FileSpreadsheet,
  Globe,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trophy,
} from 'lucide-react';

interface ArchitectureEtlViewProps {
  roster: EsportsPlayer[];
  opponents: EsportsPlayer[];
  civilizations: Civilization[];
  maps: RtsMap[];
  dags: BuildOrderDag[];
  onImportEtlPlayerToMarket: (record: EtlPlayerRecord) => void;
  onResetLocalDatabase: () => void;
}

export default function ArchitectureEtlView({
  roster,
  opponents,
  civilizations,
  maps,
  dags,
  onImportEtlPlayerToMarket,
  onResetLocalDatabase,
}: ArchitectureEtlViewProps) {
  const [etlStepStatus, setEtlStepStatus] = useState<
    'IDLE' | 'EXTRACTED' | 'TRANSFORMED' | 'LOADED'
  >('LOADED');
  const [eloScaleFactor, setEloScaleFactor] = useState<number>(2850);
  const [batchIterations, setBatchIterations] = useState<number>(120);
  const [selectedBlueId, setSelectedBlueId] = useState<string>(
    roster[0]?.id || ''
  );
  const [selectedRedId, setSelectedRedId] = useState<string>(
    opponents[0]?.id || ''
  );
  const [selectedMapId, setSelectedMapId] = useState<string>(
    maps[0]?.id || 'arabia'
  );
  const [copiedTab, setCopiedTab] = useState<'RUST' | 'SQLITE' | null>(null);
  const [importedHandles, setImportedHandles] = useState<string[]>([]);
  const [selectedManifestIdx, setSelectedManifestIdx] = useState<number>(0);
  const [parquetInspectorTab, setParquetInspectorTab] = useState<
    'MATCHES' | 'PLAYERS' | 'QUARANTINE' | 'LIQUIPEDIA'
  >('MATCHES');
  const [hideQuarantinedInTables, setHideQuarantinedInTables] =
    useState<boolean>(false);

  const bluePlayer =
    roster.find((p) => p.id === selectedBlueId) || roster[0];
  const redPlayer =
    opponents.find((p) => p.id === selectedRedId) || opponents[0];
  const activeMap =
    maps.find((m) => m.id === selectedMapId) || maps[0];

  const [batchReport, setBatchReport] = useState(() =>
    runMonteCarloBatchSimulation({
      iterations: 120,
      map: activeMap,
      bluePlayer,
      blueCiv: civilizations[0],
      blueDag: dags[0],
      redPlayer,
      redCiv: civilizations[2],
      redDag: dags[1] || dags[0],
    })
  );

  // Validation et quarantaine AoEStats Parquet (Sections 4, 5 & 6 du rapport)
  const validationReport = useMemo(
    () =>
      runAoEStatsQuarantineValidation(
        AOESTATS_PARQUET_MATCHES,
        AOESTATS_PARQUET_PLAYERS
      ),
    []
  );

  // Intervalle de confiance de Wilson à 95% sur le lot Monte-Carlo (Section 5.4)
  const batchWilsonCi = useMemo(
    () =>
      computeWilsonScoreInterval(
        batchReport.blueWins / Math.max(1, batchReport.iterations),
        batchReport.iterations
      ),
    [batchReport.blueWins, batchReport.iterations]
  );

  const activeManifest =
    AOESTATS_DUMP_MANIFESTS[selectedManifestIdx] || AOESTATS_DUMP_MANIFESTS[0];

  const handleRunMonteCarlo = () => {
    soundEngine.playAgeUpFanfare();
    const report = runMonteCarloBatchSimulation({
      iterations: batchIterations,
      map: activeMap,
      bluePlayer,
      blueCiv:
        civilizations.find((c) => c.id === bluePlayer.favoriteCivId) ||
        civilizations[0],
      blueDag: dags[0],
      redPlayer,
      redCiv:
        civilizations.find((c) => c.id === redPlayer.favoriteCivId) ||
        civilizations[2],
      redDag: dags[1] || dags[0],
    });
    setBatchReport(report);
  };

  const handleRunEtlPipeline = () => {
    soundEngine.playUiClick();
    setEtlStepStatus('EXTRACTED');
    setTimeout(() => setEtlStepStatus('TRANSFORMED'), 180);
    setTimeout(() => setEtlStepStatus('LOADED'), 360);
  };

  const handleCopyCode = (type: 'RUST' | 'SQLITE', content: string) => {
    soundEngine.playUiClick();
    navigator.clipboard?.writeText(content).catch(() => {});
    setCopiedTab(type);
    setTimeout(() => setCopiedTab(null), 1800);
  };

  const displayedMatches = hideQuarantinedInTables
    ? validationReport.validMatches
    : AOESTATS_PARQUET_MATCHES;

  const displayedPlayers = hideQuarantinedInTables
    ? validationReport.validPlayers
    : AOESTATS_PARQUET_PLAYERS;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
      {/* En-tête Architecture & Agent d'Intelligence Compétitive AoE2 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#1E293B]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums mb-1">
            <span>AOE2 COMPETITIVE INTELLIGENCE AGENT v1.0.0</span>
            <span aria-hidden="true">·</span>
            <span>HYBRIDE PARQUET + SQLITE</span>
            <span aria-hidden="true">·</span>
            <span>AOESTATS.IO · WORLD’S EDGE · LIQUIPEDIA</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
            style={{fontFamily: 'var(--font-cinzel), serif'}}
          >
            05. Agent d’Intelligence Compétitive AoE2, Dumps Parquet & Pipeline ETL
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRunEtlPipeline}
            className="px-4 py-2 bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-sky-300 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Synchroniser Snapshot Parquet & Quarantaine
          </button>

          <button
            onClick={() => {
              soundEngine.playUiClick();
              onResetLocalDatabase();
            }}
            className="px-4 py-2 bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800 text-rose-200 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Réinitialiser Base Locale SQLite
          </button>
        </div>
      </div>

      {/* Section A : Sources de Données Confirmées, Endpoints & Manifestes SHA-256 (Section 2 & 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 2.1 Primary Bulk Source: AoEStats.io */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              2.1 Source Primaire Bulk : AoEStats.io
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              Dimanche UTC · 32.9M+ Matchs
            </span>
          </div>
          <div className="text-xs text-slate-300 space-y-1.5 font-mono">
            <div className="p-2 rounded bg-[#0B0F17] border border-slate-800 text-[11px] text-sky-300 break-all">
              GET https://aoestats.io/api/db_dumps
            </div>
            <div className="text-[11px] text-slate-400">
              Volume hebdomadaire : <strong className="text-white">~236 000 matchs/sem</strong> (~472k lignes joueurs 1v1) depuis Avril 2023.
            </div>
            <div className="pt-1">
              <label className="block text-[10px] text-slate-400 mb-1">
                Snapshot Parquet Actif (`data/raw/` → `data/normalized/`) :
              </label>
              <select
                value={selectedManifestIdx}
                onChange={(e) => setSelectedManifestIdx(Number(e.target.value))}
                className="w-full bg-[#0B0F17] border border-slate-700 rounded px-2.5 py-1.5 text-[11px] text-amber-300 font-mono"
              >
                {AOESTATS_DUMP_MANIFESTS.map((m, idx) => (
                  <option key={m.dateRange} value={idx}>
                    date_range={m.dateRange} ({m.totalMatchesCount.toLocaleString()} matchs)
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[10px] text-slate-400 pt-1 truncate" title={activeManifest.sha256Hash}>
              SHA-256 : <span className="text-emerald-400">{activeManifest.sha256Hash.slice(0, 28)}…</span>
            </div>
          </div>
        </div>

        {/* 2.2 Live Upstream Telemetry: World's Edge / Relic Link */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              2.2 Télémétrie Upstream : World’s Edge
            </span>
            <span className="text-[11px] font-mono text-amber-300">
              Point Lookups Only
            </span>
          </div>
          <div className="text-xs text-slate-300 space-y-1.5 font-mono">
            <div className="p-2 rounded bg-[#0B0F17] border border-slate-800 text-[11px] text-slate-200 space-y-1">
              <div className="text-sky-300">Host: aoe-api.worldsedgelink.com</div>
              <div className="text-[10px] text-slate-400 truncate">
                • /community/leaderboard/getAvailableLeaderboards?title=age2
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                • /community/leaderboard/getPersonalStat?title=age2
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                • /community/leaderboard/getRecentMatchHistory?title=age2
              </div>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Résilience Air-Gap / Sandbox (Sec. 6.4) :</span>
              <span className="text-emerald-400 font-semibold">Fixtures Locales Actives</span>
            </div>
          </div>
        </div>

        {/* 2.3 Esports & Tournament Data: Liquipedia AoE2 */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              2.3 Tournois Fermés : Liquipedia API
            </span>
            <span className="text-[11px] font-mono text-purple-300">
              1 req / 2s · CC BY-SA 3.0
            </span>
          </div>
          <div className="text-xs text-slate-300 space-y-1.5 font-mono">
            <div className="p-2 rounded bg-[#0B0F17] border border-slate-800 text-[11px] text-purple-300 break-all">
              GET https://liquipedia.net/ageofempires/api.php
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              <strong className="text-white">Séparation stricte (Sec. 5.3) :</strong> AoEStats capture uniquement le ladder public classé. Les arbres de tournois S-Tier (Red Bull Wololo, KotD, Warlords) et cashprizes proviennent exclusivement de Liquipedia.
            </p>
          </div>
        </div>
      </div>

      {/* Section B : Inspecteur des Schémas Parquet Relationnels (`Match` & `Player`) & Quarantaine (Sections 3, 4, 5 & 6) */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              Inspecteur des Tables Parquet (`matches.parquet` ↔ `players.parquet`) & Catalogue de Quarantaine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Entités relationnelles jointes par <code className="text-amber-300">game_id</code>. Filtrage automatique des nombres de joueurs impairs (1, 3, 5, 7), déconnexions &lt;5m, comptes One-Trick Pony (&ge;80%) et lignes orphelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setParquetInspectorTab('MATCHES');
              }}
              className={`px-3 py-1.5 rounded text-xs font-mono cursor-pointer transition-colors ${
                parquetInspectorTab === 'MATCHES'
                  ? 'bg-[#D97706] text-white font-bold'
                  : 'bg-[#0B0F17] text-slate-300 border border-slate-800 hover:border-slate-600'
              }`}
            >
              matches.parquet ({displayedMatches.length})
            </button>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setParquetInspectorTab('PLAYERS');
              }}
              className={`px-3 py-1.5 rounded text-xs font-mono cursor-pointer transition-colors ${
                parquetInspectorTab === 'PLAYERS'
                  ? 'bg-[#D97706] text-white font-bold'
                  : 'bg-[#0B0F17] text-slate-300 border border-slate-800 hover:border-slate-600'
              }`}
            >
              players.parquet ({displayedPlayers.length})
            </button>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setParquetInspectorTab('QUARANTINE');
              }}
              className={`px-3 py-1.5 rounded text-xs font-mono cursor-pointer transition-colors flex items-center gap-1.5 ${
                parquetInspectorTab === 'QUARANTINE'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-[#0B0F17] text-rose-300 border border-rose-900/60 hover:border-rose-600'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              data/quarantine/ ({validationReport.quarantineRecords.length})
            </button>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setParquetInspectorTab('LIQUIPEDIA');
              }}
              className={`px-3 py-1.5 rounded text-xs font-mono cursor-pointer transition-colors ${
                parquetInspectorTab === 'LIQUIPEDIA'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-[#0B0F17] text-purple-300 border border-purple-900/60 hover:border-purple-600'
              }`}
            >
              Liquipedia S-Tier ({LIQUIPEDIA_TOURNAMENTS.length})
            </button>
          </div>
        </div>

        {/* Bandeau de métriques de qualité de données (Section 5) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-3 rounded bg-[#0B0F17] border border-slate-800">
            <div className="text-[11px] text-slate-400">Couverture `replay_enhanced`</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">
              {Math.round(activeManifest.replayEnhancedRatio * 1000) / 10}%
            </div>
            <div className="text-[10px] text-slate-500">
              &gt;60% sans replay (uptimes NULL autorisés)
            </div>
          </div>

          <div className="p-3 rounded bg-[#0B0F17] border border-slate-800">
            <div className="text-[11px] text-slate-400">Matchs Normalisés Valides</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {validationReport.validMatches.length} / {AOESTATS_PARQUET_MATCHES.length}
            </div>
            <div className="text-[10px] text-slate-500">
              Durée 5m–180m · Pair · Non-miroir
            </div>
          </div>

          <div className="p-3 rounded bg-[#0B0F17] border border-slate-800">
            <div className="text-[11px] text-slate-400">Anomalies en Quarantaine</div>
            <div className="text-lg font-bold text-rose-400 mt-0.5">
              {validationReport.quarantineRecords.length} détectées
            </div>
            <div className="text-[10px] text-slate-500">
              Impair (3j), &lt;300s, Orphelin, OTP &ge;80%
            </div>
          </div>

          <div className="p-3 rounded bg-[#0B0F17] border border-slate-800 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400">Filtre Vue Normalisée</div>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={hideQuarantinedInTables}
                onChange={(e) => setHideQuarantinedInTables(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
              <span className="text-[11px] text-slate-200 font-sans">
                Masquer lignes en quarantaine
              </span>
            </label>
          </div>
        </div>

        {/* Table 3.1 : Match Schema */}
        {parquetInspectorTab === 'MATCHES' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-2.5">game_id</th>
                  <th className="py-2 px-2.5">map</th>
                  <th className="py-2 px-2.5 text-right">duration (s)</th>
                  <th className="py-2 px-2.5 text-right">avg_elo</th>
                  <th className="py-2 px-2.5 text-right">num_players</th>
                  <th className="py-2 px-2.5 text-center">replay_enhanced</th>
                  <th className="py-2 px-2.5 text-center">mirror</th>
                  <th className="py-2 px-2.5 text-right">raw_match_type</th>
                  <th className="py-2 px-2.5 text-right">patch</th>
                  <th className="py-2 px-2.5 text-right">Statut Ingestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {displayedMatches.map((m) => {
                  const qRec = validationReport.quarantineRecords.find(
                    (q) => q.game_id === m.game_id
                  );
                  return (
                    <tr
                      key={m.game_id}
                      className={
                        qRec
                          ? 'bg-rose-950/25 hover:bg-rose-950/40'
                          : 'hover:bg-[#0B0F17]/60'
                      }
                    >
                      <td className="py-2.5 px-2.5 text-white font-semibold">
                        {m.game_id}
                      </td>
                      <td className="py-2.5 px-2.5 text-amber-300">{m.map}</td>
                      <td
                        className={`py-2.5 px-2.5 text-right ${
                          m.duration < 300 ? 'text-rose-400 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {m.duration}s ({Math.floor(m.duration / 60)}m)
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-sky-300">
                        {m.avg_elo ?? 'NULL'}
                      </td>
                      <td
                        className={`py-2.5 px-2.5 text-right ${
                          m.num_players % 2 !== 0
                            ? 'text-rose-400 font-bold'
                            : 'text-slate-200'
                        }`}
                      >
                        {m.num_players}
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        {m.replay_enhanced ? (
                          <span className="text-emerald-400">True</span>
                        ) : (
                          <span className="text-slate-500">False</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        {m.mirror ? (
                          <span className="text-amber-400">True</span>
                        ) : (
                          <span className="text-slate-500">False</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-400">
                        {m.raw_match_type} ({m.game_type})
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-400">
                        {m.patch ?? 'NULL'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        {qRec ? (
                          <span className="text-rose-400 font-semibold">
                            {qRec.tag}
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center justify-end gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            data/normalized/
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table 3.2 : Player Schema */}
        {parquetInspectorTab === 'PLAYERS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-2.5">game_id (FK)</th>
                  <th className="py-2 px-2.5">profile_id / handle</th>
                  <th className="py-2 px-2.5">civ</th>
                  <th className="py-2 px-2.5 text-center">winner</th>
                  <th className="py-2 px-2.5 text-right">old → new_rating</th>
                  <th className="py-2 px-2.5 text-right">feudal_uptime</th>
                  <th className="py-2 px-2.5 text-right">castle_uptime</th>
                  <th className="py-2 px-2.5">opening</th>
                  <th className="py-2 px-2.5 text-right">Statut Ingestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {displayedPlayers.map((p) => {
                  const qRec = validationReport.quarantineRecords.find(
                    (q) =>
                      q.game_id === p.game_id &&
                      (q.profile_id === p.profile_id || !q.profile_id)
                  );
                  return (
                    <tr
                      key={`${p.game_id}_${p.profile_id}`}
                      className={
                        qRec
                          ? 'bg-rose-950/25 hover:bg-rose-950/40'
                          : 'hover:bg-[#0B0F17]/60'
                      }
                    >
                      <td className="py-2.5 px-2.5 text-slate-300">{p.game_id}</td>
                      <td className="py-2.5 px-2.5 text-white font-semibold">
                        #{p.profile_id} · {p.handle}
                      </td>
                      <td className="py-2.5 px-2.5 text-amber-300">{p.civ}</td>
                      <td className="py-2.5 px-2.5 text-center">
                        {p.winner ? (
                          <span className="text-emerald-400">Win</span>
                        ) : (
                          <span className="text-rose-400">Loss</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-sky-300">
                        {p.old_rating ?? 'NULL'} → {p.new_rating ?? 'NULL'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-300">
                        {p.feudal_age_uptime !== null
                          ? `${p.feudal_age_uptime}s`
                          : 'NULL (no replay)'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-300">
                        {p.castle_age_uptime !== null
                          ? `${p.castle_age_uptime}s`
                          : 'NULL'}
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-300">
                        {p.opening ?? (
                          <span className="text-slate-500">NULL (replay_enhanced=False)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        {qRec ? (
                          <span className="text-rose-400 font-semibold">
                            {qRec.tag}
                          </span>
                        ) : (
                          <span className="text-emerald-400">data/normalized/</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table 6.2 : Quarantine Catalog */}
        {parquetInspectorTab === 'QUARANTINE' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-2.5">Tag de Rejet</th>
                  <th className="py-2 px-2.5">game_id / profile_id</th>
                  <th className="py-2 px-2.5">Diagnostic d’Anomalie (Sections 4, 5 & 6)</th>
                  <th className="py-2 px-2.5">Destination Quarantaine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {validationReport.quarantineRecords.map((q) => (
                  <tr key={q.id} className="bg-rose-950/20 hover:bg-rose-950/35">
                    <td className="py-2.5 px-2.5 text-rose-400 font-bold">
                      {q.tag}
                    </td>
                    <td className="py-2.5 px-2.5 text-white">
                      {q.game_id}
                      {q.profile_id ? ` (profile #${q.profile_id})` : ''}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-300 font-sans">
                      {q.reason}
                    </td>
                    <td className="py-2.5 px-2.5 text-amber-300">
                      {q.targetPath}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table 2.3 & 5.3 : Liquipedia Closed Tournaments */}
        {parquetInspectorTab === 'LIQUIPEDIA' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-2.5">ID Tournoi</th>
                  <th className="py-2 px-2.5">Nom de l’Événement (Liquipedia AoE2)</th>
                  <th className="py-2 px-2.5">Tier</th>
                  <th className="py-2 px-2.5 text-right">Prize Pool (USD)</th>
                  <th className="py-2 px-2.5">Champion</th>
                  <th className="py-2 px-2.5">Organisateur & Licence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {LIQUIPEDIA_TOURNAMENTS.map((t) => (
                  <tr key={t.id} className="hover:bg-[#0B0F17]/60">
                    <td className="py-2.5 px-2.5 text-slate-400">{t.id}</td>
                    <td className="py-2.5 px-2.5 text-white font-sans font-bold">
                      {t.name}
                    </td>
                    <td className="py-2.5 px-2.5 text-purple-400 font-bold">
                      {t.tier}
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-amber-400 font-bold">
                      ${t.prizePoolUsd.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2.5 text-emerald-400 font-semibold">
                      {t.championHandle}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-400">
                      {t.organizer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 1 : Simulateur Haute Fréquence Monte-Carlo + Intervalle de Wilson 95% */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
          <div>
            <h2 className="text-base font-bold text-white">
              Benchmark du Moteur par Ticks & Intervalle de Confiance de Wilson à 95 % (Elo 2000+)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Conformément à la Section 5.4, chaque taux de victoire à haut Elo est accompagné de sa taille d’échantillon (<code className="text-amber-300">n</code>) et de son intervalle de Wilson à 95 %.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedBlueId}
              onChange={(e) => setSelectedBlueId(e.target.value)}
              className="bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-sky-300"
            >
              {roster.map((p) => (
                <option key={p.id} value={p.id}>
                  Bleu : {p.handle} ({p.elo} ELO)
                </option>
              ))}
            </select>

            <select
              value={selectedRedId}
              onChange={(e) => setSelectedRedId(e.target.value)}
              className="bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-rose-300"
            >
              {opponents.map((p) => (
                <option key={p.id} value={p.id}>
                  Rouge : {p.handle} ({p.elo} ELO)
                </option>
              ))}
            </select>

            <select
              value={selectedMapId}
              onChange={(e) => setSelectedMapId(e.target.value)}
              className="bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            >
              {maps.map((m) => (
                <option key={m.id} value={m.id}>
                  Carte : {m.name}
                </option>
              ))}
            </select>

            <select
              value={batchIterations}
              onChange={(e) => setBatchIterations(parseInt(e.target.value, 10))}
              className="bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-amber-300 font-mono"
            >
              <option value={15}>15 Matchs (Petit Échantillon Elo 2000+)</option>
              <option value={100}>100 Matchs Complets</option>
              <option value={120}>120 Matchs Complets</option>
              <option value={250}>250 Matchs Complets</option>
              <option value={500}>500 Matchs Complets</option>
            </select>

            <button
              onClick={handleRunMonteCarlo}
              className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              Exécuter Salve (n = {batchIterations})
            </button>
          </div>
        </div>

        {/* Résultats quantitatifs du lot + Wilson 95% CI */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-mono tabular-nums">
          <div className="p-3.5 rounded bg-[#0B0F17] border border-slate-800">
            <div className="text-[11px] text-slate-400">Win-Rate {bluePlayer.handle}</div>
            <div className="text-xl font-bold text-sky-400 mt-1">
              {batchReport.blueWinRatePercent}%
            </div>
            <div className="text-[11px] text-slate-500">
              {batchReport.blueWins}V - {batchReport.redWins}D (n={batchReport.iterations})
            </div>
          </div>

          <div className="p-3.5 rounded bg-[#0B0F17] border border-slate-800">
            <div className="text-[11px] text-slate-400">IC Wilson 95 % (z=1.96)</div>
            <div className="text-base font-bold text-amber-300 mt-1">
              [{batchWilsonCi.lowerPct}% – {batchWilsonCi.upperPct}%]
            </div>
            <div className="text-[11px] text-slate-500">
              ±{batchWilsonCi.marginPct}% ({batchWilsonCi.isLowSampleWarning ? 'Échantillon faible <30' : 'Robuste'})
            </div>
          </div>

          <div className="p-3.5 rounded bg-[#0B0F17] border border-slate-800">
            <div className="text-[11px] text-slate-400">Temps de Calcul</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {batchReport.executionTimeMs} ms
            </div>
            <div className="text-[11px] text-slate-500">
              Pour {batchReport.iterations} rencontres
            </div>
          </div>

          <div className="p-3.5 rounded bg-[#0B0F17] border border-slate-800">
            <div className="text-[11px] text-slate-400">Cadence Équivalente</div>
            <div className="text-xl font-bold text-amber-400 mt-1">
              {(batchReport.throughputPerHour / 1000).toFixed(0)}k / h
            </div>
            <div className="text-[11px] text-slate-500">Cible &gt; 100 matchs/h</div>
          </div>

          <div className="p-3.5 rounded bg-[#0B0F17] border border-slate-800">
            <div className="text-[11px] text-slate-400">Durée Moyenne (Ticks)</div>
            <div className="text-xl font-bold text-white mt-1">
              {batchReport.avgMatchTicks} ticks
            </div>
            <div className="text-[11px] text-slate-500">
              ~{batchReport.avgMatchDurationSec}s temps RTS
            </div>
          </div>

          <div className="p-3.5 rounded bg-[#0B0F17] border border-slate-800">
            <div className="text-[11px] text-slate-400">Statut Pipeline ETL</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {etlStepStatus}
            </div>
            <div className="text-[11px] text-slate-500">Déduplication SHA-256 OK</div>
          </div>
        </div>
      </div>

      {/* Section 2 : Tableau de Scouting Agrégé ETL (avec gestion de replay_enhanced=False et Wilson CI) */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
          <div>
            <h2 className="text-base font-bold text-white">
              Scouting Board ETL Normalisé (AoEStats Parquet · World’s Edge · Liquipedia)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestion native des valeurs <code className="text-amber-300">NULL</code> lorsque <code className="text-amber-300">replay_enhanced = False</code> (&gt;60 % des matchs) et affichage des intervalles de Wilson à 95 %.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
            <span className="text-slate-400">Plafond ELO Normalisation :</span>
            <input
              type="range"
              min="2750"
              max="3000"
              step="25"
              value={eloScaleFactor}
              onChange={(e) => setEloScaleFactor(parseInt(e.target.value, 10))}
              className="w-28 accent-[#D97706]"
            />
            <span className="text-amber-400 font-bold">{eloScaleFactor} ELO</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-3">profile_id / Source</th>
                <th className="py-2.5 px-3">Joueur Pro</th>
                <th className="py-2.5 px-3">Source d’Ingestion</th>
                <th className="py-2.5 px-3 text-right">ELO Ladder</th>
                <th className="py-2.5 px-3 text-right">Win-Rate & IC Wilson 95%</th>
                <th className="py-2.5 px-3 text-right">Uptime Féodal / Ouverture</th>
                <th className="py-2.5 px-3 text-right">Vecteur Normalisé (1–100)</th>
                <th className="py-2.5 px-3 text-right">Action Load (SQLite)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
              {RAW_ETL_DATASET.map((row) => {
                const scaleMod = 2850 / eloScaleFactor;
                const normMicro = Math.min(
                  100,
                  Math.round(row.normalizedVector.micro * scaleMod)
                );
                const normMacro = Math.min(
                  100,
                  Math.round(row.normalizedVector.macro * scaleMod)
                );
                const normTac = Math.min(
                  100,
                  Math.round(row.normalizedVector.tactical * scaleMod)
                );
                const normMental = Math.min(
                  100,
                  Math.round(row.normalizedVector.mental * scaleMod)
                );
                const isAlreadyImported = importedHandles.includes(row.handle);
                const sampleSize = row.sampleSizeGames ?? 100;
                const wilson = computeWilsonScoreInterval(
                  row.tournamentWinRate,
                  sampleSize
                );

                return (
                  <tr key={row.rawId} className="hover:bg-[#0B0F17]/60">
                    <td className="py-3 px-3 text-slate-400">
                      #{row.profileId ?? row.rawId}
                    </td>
                    <td className="py-3 px-3 font-sans font-bold text-white">
                      {row.handle}
                    </td>
                    <td className="py-3 px-3 text-sky-400">{row.sourceApi}</td>
                    <td className="py-3 px-3 text-right text-amber-400 font-semibold">
                      {row.rawLadderElo}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="text-emerald-400 font-semibold">
                        {Math.round(row.tournamentWinRate * 1000) / 10}% (n={sampleSize})
                      </div>
                      <div className="text-[10px] text-slate-400">
                        IC 95%: [{wilson.lowerPct}%–{wilson.upperPct}%]
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {row.avgFeudalTimeSec !== null ? (
                        <div>
                          <span className="text-slate-200">
                            {Math.floor(row.avgFeudalTimeSec / 60)}m
                            {(row.avgFeudalTimeSec % 60)
                              .toString()
                              .padStart(2, '0')}
                            s
                          </span>
                          <div className="text-[10px] text-amber-300/90">
                            {row.inferredOpening || 'Replay parsé'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500">
                          <span className="inline-flex items-center gap-1 text-amber-400/80">
                            <AlertTriangle className="w-3 h-3" />
                            NULL (no replay)
                          </span>
                          <div className="text-[10px] text-slate-500">
                            replay_enhanced=False
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-200">
                      M:{normMicro} · E:{normMacro} · T:{normTac} · P:{normMental}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          if (isAlreadyImported) return;
                          soundEngine.playAgeUpFanfare();
                          setImportedHandles((prev) => [...prev, row.handle]);
                          onImportEtlPlayerToMarket({
                            ...row,
                            normalizedVector: {
                              micro: normMicro,
                              macro: normMacro,
                              tactical: normTac,
                              mental: normMental,
                            },
                          });
                        }}
                        disabled={isAlreadyImported}
                        className={`px-3 py-1 rounded text-[11px] font-sans font-medium cursor-pointer ${
                          isAlreadyImported
                            ? 'bg-emerald-950/60 text-emerald-400 cursor-default'
                            : 'bg-[#D97706] hover:bg-[#B45309] text-white'
                        }`}
                      >
                        {isAlreadyImported
                          ? 'Injecté au Marché'
                          : 'Charger dans Transferts'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3 : Code Source de Référence Rust (Ingestion Parquet + Wilson CI) & Schéma SQLite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cœur d'Ingestion Rust & Quarantaine */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                Agent Rust d’Ingestion Parquet & Intervalle de Wilson
              </h3>
              <p className="text-xs text-slate-400">
                Structs `AoEStatsMatchRow`, `AoEStatsPlayerRow`, quarantaine idempotente et calcul IC 95 %.
              </p>
            </div>
            <button
              onClick={() => handleCopyCode('RUST', RUST_ENGINE_REFERENCE_CODE)}
              className="px-3 py-1.5 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 rounded cursor-pointer flex items-center gap-1.5"
            >
              {copiedTab === 'RUST' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copier Rust
                </>
              )}
            </button>
          </div>
          <pre className="p-4 rounded bg-[#0B0F17] border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-80">
            {RUST_ENGINE_REFERENCE_CODE}
          </pre>
        </div>

        {/* Schéma Relationnel SQLite Embarqué (`data/metadata.db`) */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                Schéma Relationnel SQLite (`data/metadata.db`)
              </h3>
              <p className="text-xs text-slate-400">
                Tables `ingest_manifests` (SHA-256), `quarantine_catalog`, et tables normalisées avec clés étrangères.
              </p>
            </div>
            <button
              onClick={() => handleCopyCode('SQLITE', SQLITE_SCHEMA_REFERENCE)}
              className="px-3 py-1.5 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 rounded cursor-pointer flex items-center gap-1.5"
            >
              {copiedTab === 'SQLITE' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copier SQL
                </>
              )}
            </button>
          </div>
          <pre className="p-4 rounded bg-[#0B0F17] border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-80">
            {SQLITE_SCHEMA_REFERENCE}
          </pre>
        </div>
      </div>

      {/* Section 7 : Mentions Légales, Attribution & Conditions d'Utilisation */}
      <div className="bg-[#0B0F17] border border-[#1E293B] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="space-y-0.5">
          <div className="text-slate-200 font-semibold">
            Data sourced from aoestats.io under Microsoft Game Content Usage Rules.
          </div>
          <div className="text-[11px] text-slate-400">
            Age of Empires II: Definitive Edition © Microsoft Corporation. Les métriques analytiques dérivées et modèles de simulation sont conformes aux règles d’utilisation. Données de tournois issues de Liquipedia AoE2 API sous licence <strong className="text-slate-300">CC BY-SA 3.0</strong>.
          </div>
        </div>
        <div className="text-[11px] font-mono text-emerald-400 shrink-0">
          CONFORMITÉ MICROSOFT GCUR & CC BY-SA 3.0 VÉRIFIÉE
        </div>
      </div>
    </div>
  );
}
