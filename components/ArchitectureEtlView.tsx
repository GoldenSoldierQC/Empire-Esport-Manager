'use client';

import React, {useState} from 'react';
import {
  BuildOrderDag,
  Civilization,
  EsportsPlayer,
  EtlPlayerRecord,
  RtsMap,
} from '@/lib/types';
import {
  RAW_ETL_DATASET,
  RUST_ENGINE_REFERENCE_CODE,
  SQLITE_SCHEMA_REFERENCE,
} from '@/lib/initial-data';
import {runMonteCarloBatchSimulation} from '@/lib/tick-engine';
import {soundEngine} from '@/lib/sound';
import {
  Check,
  Copy,
  Cpu,
  Database,
  Download,
  Play,
  RefreshCw,
  Terminal,
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

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
      {/* En-tête Architecture & Pipeline ETL */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums mb-1">
            <span>ARCHITECTURE TAURI + REACT + RUST + SQLITE</span>
            <span aria-hidden="true">·</span>
            <span>PIPELINE ETL WORLD’S EDGE / SIEGE ENGINEERS</span>
            <span aria-hidden="true">·</span>
            <span>CADENCE : 100+ MATCHS / HEURE</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
            style={{fontFamily: 'var(--font-cinzel), serif'}}
          >
            05. Architecture Logicielle, Simulateur Monte-Carlo & Pipeline ETL
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRunEtlPipeline}
            className="px-4 py-2 bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-sky-300 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Relancer Pipeline ETL (Extract → Transform → Load)
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

      {/* Section 1 : Simulateur Haute Fréquence Monte-Carlo (100+ matchs en rafale) */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
          <div>
            <h2 className="text-base font-bold text-white">
              Benchmark du Moteur par Ticks (Simulation Monte-Carlo Haute Fréquence)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enchaînez plus de 100 simulations complètes (économie, DAG, matrice de contre et GG
              Calls) sans bloquer l’interface utilisateur.
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
              Exécuter Salve ({batchIterations} Matchs)
            </button>
          </div>
        </div>

        {/* Résultats quantitatifs du lot */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-mono tabular-nums">
          <div className="p-3.5 rounded bg-[#0B0F17] border border-slate-800">
            <div className="text-[11px] text-slate-400">Win-Rate {bluePlayer.handle}</div>
            <div className="text-xl font-bold text-sky-400 mt-1">
              {batchReport.blueWinRatePercent}%
            </div>
            <div className="text-[11px] text-slate-500">
              {batchReport.blueWins}V - {batchReport.redWins}D
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
            <div className="text-[11px] text-slate-400">Taux de GG Call</div>
            <div className="text-xl font-bold text-purple-400 mt-1">
              {batchReport.ggCallRatePercent}%
            </div>
            <div className="text-[11px] text-slate-500">Abandons sur moral &lt;18%</div>
          </div>

          <div className="p-3.5 rounded bg-[#0B0F17] border border-slate-800">
            <div className="text-[11px] text-slate-400">Statut Pipeline ETL</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {etlStepStatus}
            </div>
            <div className="text-[11px] text-slate-500">SQLite Statique Prêt</div>
          </div>
        </div>
      </div>

      {/* Section 2 : Pipeline d'Ingestion ETL (Extract -> Transform -> Load) */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
          <div>
            <h2 className="text-base font-bold text-white">
              Pipeline d’Ingestion ETL (World’s Edge · Siege Engineers · Captains Mode)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Conversion des classements ELO bruts en vecteurs de compétences normalisés (1–100)
              et injection directe dans le marché des transferts.
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
                <th className="py-2.5 px-3">ID Source</th>
                <th className="py-2.5 px-3">Joueur Pro (Dump)</th>
                <th className="py-2.5 px-3">API d’Extraction</th>
                <th className="py-2.5 px-3 text-right">ELO Brut</th>
                <th className="py-2.5 px-3 text-right">Win-Rate</th>
                <th className="py-2.5 px-3 text-right">Temps Féodal</th>
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

                return (
                  <tr key={row.rawId} className="hover:bg-[#0B0F17]/60">
                    <td className="py-3 px-3 text-slate-400">{row.rawId}</td>
                    <td className="py-3 px-3 font-sans font-bold text-white">
                      {row.handle}
                    </td>
                    <td className="py-3 px-3 text-sky-400">{row.sourceApi}</td>
                    <td className="py-3 px-3 text-right text-amber-400 font-semibold">
                      {row.rawLadderElo}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400">
                      {Math.round(row.tournamentWinRate * 1000) / 10}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      {Math.floor(row.avgFeudalTimeSec / 60)}m
                      {(row.avgFeudalTimeSec % 60).toString().padStart(2, '0')}s
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

      {/* Section 3 : Code Source de Référence Rust (Tick Engine + Tauri IPC) & Schéma SQLite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cœur de Simulation Rust & Pont IPC Tauri */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                Cœur de Simulation Rust & Pont IPC Tauri
              </h3>
              <p className="text-xs text-slate-400">
                Implémentation des structs, pénalité exponentielle (&lt;75%) et commande IPC
                asynchrone.
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

        {/* Schéma Relationnel SQLite Embarqué */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                Schéma Relationnel SQLite Embarqué
              </h3>
              <p className="text-xs text-slate-400">
                Tables de persistance hors-ligne pour les vecteurs joueurs, graphes DAG et
                télémétrie de ticks.
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
    </div>
  );
}
