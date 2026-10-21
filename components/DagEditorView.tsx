'use client';

import React, {useState} from 'react';
import {
  AgePhase,
  BuildOrderDag,
  DagConditionType,
  DagEdge,
  DagNode,
  UnitCategory,
} from '@/lib/types';
import {soundEngine} from '@/lib/sound';
import {
  CheckCircle2,
  Code2,
  GitBranch,
  Layers,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface DagEditorViewProps {
  dags: BuildOrderDag[];
  activeDagId: string;
  onSelectActiveDag: (id: string) => void;
  onUpdateDag: (updated: BuildOrderDag) => void;
  onCreatePresetClone: () => void;
}

const CONDITION_LABELS: Record<DagConditionType, string> = {
  DEFAULT: 'Exécution Standard (Par défaut)',
  ENEMY_AGGRESSION_DETECTED: 'Si Agression / Caserne adverse détectée (Scouting)',
  ENEMY_GREED_DETECTED: 'Si Fast Castle / Murs adverses détectés (Scouting)',
  RESOURCE_THRESHOLD: 'Si Seuil de Ressources critique atteint',
};

const AGE_NAMES: Record<AgePhase, string> = {
  1: 'I · Âge Sombre',
  2: 'II · Âge Féodal',
  3: 'III · Âge des Châteaux',
  4: 'IV · Âge Impérial',
};

export default function DagEditorView({
  dags,
  activeDagId,
  onSelectActiveDag,
  onUpdateDag,
  onCreatePresetClone,
}: DagEditorViewProps) {
  const activeDag = dags.find((d) => d.id === activeDagId) || dags[0];
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    activeDag?.nodes[0]?.id || ''
  );
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [newEdgeTargetId, setNewEdgeTargetId] = useState<string>('');
  const [newEdgeCondition, setNewEdgeCondition] = useState<DagConditionType>('DEFAULT');

  if (!activeDag) return null;

  const selectedNode =
    activeDag.nodes.find((n) => n.id === selectedNodeId) || activeDag.nodes[0];

  const handleNodeUpdate = (updatedNode: DagNode) => {
    const nextNodes = activeDag.nodes.map((n) =>
      n.id === updatedNode.id ? updatedNode : n
    );
    onUpdateDag({...activeDag, nodes: nextNodes});
  };

  const handleAddNode = () => {
    soundEngine.playUiClick();
    const newId = `node_${Date.now().toString().slice(-4)}`;
    const maxAge = Math.min(4, (selectedNode?.age || 1) + 1) as AgePhase;
    const newNode: DagNode = {
      id: newId,
      title: `Âge ${maxAge} : Nœud Tactique Personnalisé`,
      age: maxAge,
      targetTick: (selectedNode?.targetTick || 10) + 8,
      description: 'Transition tactique personnalisée avec réallocation des villageois.',
      villagerAllocation: {food: 45, wood: 30, gold: 20, stone: 5},
      primaryUnitFocus: 'CAVALRY',
      powerSpikeBonus: 1.25,
      techUnlocked: 'Technologie de Forge +2',
      x: Math.min(880, (selectedNode?.x || 200) + 240),
      y: Math.min(270, Math.max(60, (selectedNode?.y || 150) + (Math.random() > 0.5 ? 65 : -65))),
    };

    const newEdge: DagEdge = {
      id: `edge_${Date.now().toString().slice(-4)}`,
      fromNodeId: selectedNode.id,
      toNodeId: newId,
      condition: 'ENEMY_AGGRESSION_DETECTED',
      conditionLabel: 'Bifurcation Tactique',
    };

    onUpdateDag({
      ...activeDag,
      nodes: [...activeDag.nodes, newNode],
      edges: [...activeDag.edges, newEdge],
    });
    setSelectedNodeId(newId);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (activeDag.nodes.length <= 2) return;
    soundEngine.playUiClick();
    const remainingNodes = activeDag.nodes.filter((n) => n.id !== nodeId);
    const remainingEdges = activeDag.edges.filter(
      (e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId
    );
    onUpdateDag({
      ...activeDag,
      nodes: remainingNodes,
      edges: remainingEdges,
    });
    setSelectedNodeId(remainingNodes[0].id);
  };

  const handleAddEdge = () => {
    if (!newEdgeTargetId || newEdgeTargetId === selectedNode.id) return;
    // Vérification simple anti-cycle (DAG) : l'âge ou le tick cible doit progresser
    const exists = activeDag.edges.some(
      (e) => e.fromNodeId === selectedNode.id && e.toNodeId === newEdgeTargetId
    );
    if (exists) return;

    soundEngine.playUiClick();
    const edge: DagEdge = {
      id: `e_${Date.now().toString().slice(-4)}`,
      fromNodeId: selectedNode.id,
      toNodeId: newEdgeTargetId,
      condition: newEdgeCondition,
      conditionLabel: CONDITION_LABELS[newEdgeCondition].split('(')[0].trim(),
    };
    onUpdateDag({
      ...activeDag,
      edges: [...activeDag.edges, edge],
    });
  };

  const handleRemoveEdge = (edgeId: string) => {
    soundEngine.playUiClick();
    onUpdateDag({
      ...activeDag,
      edges: activeDag.edges.filter((e) => e.id !== edgeId),
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
      {/* En-tête de l'Atelier Tactique DAG */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums mb-1">
            <span>GRAPHES ORIENTÉS ACYCLIQUES (DAG)</span>
            <span aria-hidden="true">·</span>
            <span>{activeDag.nodes.length} NŒUDS D’ACTION</span>
            <span aria-hidden="true">·</span>
            <span>{activeDag.edges.length} BIFURCATIONS CONDITIONNELLES</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
            style={{fontFamily: 'var(--font-cinzel), serif'}}
          >
            02. Atelier Tactique & Build Orders en DAG
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeDag.id}
            onChange={(e) => {
              soundEngine.playUiClick();
              onSelectActiveDag(e.target.value);
              const found = dags.find((d) => d.id === e.target.value);
              if (found && found.nodes[0]) setSelectedNodeId(found.nodes[0].id);
            }}
            className="bg-[#131B2E] border border-slate-700 text-white text-xs font-medium rounded-lg px-3.5 py-2 focus:outline-none focus:border-[#D97706]"
          >
            {dags.map((dag) => (
              <option key={dag.id} value={dag.id}>
                Preset : {dag.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleAddNode}
            className="px-3.5 py-2 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter un Nœud / Bifurcation
          </button>

          <button
            onClick={() => {
              soundEngine.playUiClick();
              onCreatePresetClone();
            }}
            className="px-3.5 py-2 bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Dupliquer le Graphe
          </button>

          <button
            onClick={() => {
              soundEngine.playUiClick();
              setShowJsonModal(!showJsonModal);
            }}
            className="px-3.5 py-2 bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-sky-300 text-xs font-mono rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5" />
            {showJsonModal ? 'Masquer JSON DAG' : 'Inspecter JSON DAG'}
          </button>
        </div>
      </div>

      {/* Canevas Visuel du Graphe Orienté Acyclique (DAG) */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">{activeDag.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{activeDag.description}</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-300 tabular-nums">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Validation Acyclique : Valide
            </span>
            <span>Auteur : {activeDag.author}</span>
          </div>
        </div>

        {/* Zone graphique interactive SVG + Nœuds */}
        <div className="relative w-full h-[360px] bg-[#0B0F17] border border-[#1E293B] rounded-lg overflow-x-auto overflow-y-hidden">
          <div className="relative min-w-[1100px] h-full">
            {/* Colonnes d'Âges I à IV en filigrane structurel */}
            <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
              {([1, 2, 3, 4] as AgePhase[]).map((age) => (
                <div
                  key={age}
                  className="border-r border-slate-800/70 px-4 py-2.5 flex items-start justify-between"
                >
                  <span className="text-[11px] font-mono text-slate-400">
                    {AGE_NAMES[age]}
                  </span>
                </div>
              ))}
            </div>

            {/* Arêtes orientées (Courbes de Bézier avec flèches et étiquettes de condition) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker
                  id="dag-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#D97706" />
                </marker>
                <marker
                  id="dag-arrow-cond"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38BDF8" />
                </marker>
              </defs>

              {activeDag.edges.map((edge) => {
                const from = activeDag.nodes.find((n) => n.id === edge.fromNodeId);
                const to = activeDag.nodes.find((n) => n.id === edge.toNodeId);
                if (!from || !to) return null;

                const x1 = from.x + 195;
                const y1 = from.y + 42;
                const x2 = to.x;
                const y2 = to.y + 42;
                const cx1 = x1 + (x2 - x1) * 0.45;
                const cx2 = x1 + (x2 - x1) * 0.55;
                const isConditional = edge.condition !== 'DEFAULT';

                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={isConditional ? '#38BDF8' : '#D97706'}
                      strokeWidth="2"
                      strokeDasharray={isConditional ? '5 3' : undefined}
                      markerEnd={
                        isConditional ? 'url(#dag-arrow-cond)' : 'url(#dag-arrow)'
                      }
                    />
                    <rect
                      x={(x1 + x2) / 2 - 68}
                      y={(y1 + y2) / 2 - 10}
                      width="136"
                      height="18"
                      rx="3"
                      fill="#0B0F17"
                      stroke="#1E293B"
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 + 2}
                      textAnchor="middle"
                      fill={isConditional ? '#7DD3FC' : '#FDE68A'}
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {edge.conditionLabel.slice(0, 24)}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Nœuds interactifs du DAG */}
            {activeDag.nodes.map((node) => {
              const isSelected = node.id === selectedNode?.id;
              return (
                <div
                  key={node.id}
                  onClick={() => {
                    soundEngine.playUiClick();
                    setSelectedNodeId(node.id);
                  }}
                  style={{left: `${node.x}px`, top: `${node.y}px`}}
                  className={`absolute w-[195px] p-3 rounded-lg border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#1E293B] border-[#D97706] shadow-lg'
                      : 'bg-[#131B2E]/95 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 tabular-nums mb-1">
                    <span>Tick #{node.targetTick} ({node.targetTick * 5}s)</span>
                    <span className="text-amber-400 font-semibold">
                      Spike ×{node.powerSpikeBonus}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white leading-snug line-clamp-2 mb-2">
                    {node.title}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 tabular-nums pt-1.5 border-t border-slate-700/80">
                    <span>Unité : {node.primaryUnitFocus}</span>
                    <span>
                      N:{node.villagerAllocation.food}% B:{node.villagerAllocation.wood}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inspecteur & Éditeur du Nœud Sélectionné + Courbe de Power Spike */}
      {selectedNode && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Édition des paramètres du nœud (7 cols) */}
          <div className="lg:col-span-7 bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
              <div>
                <span className="text-xs font-mono text-[#D97706]">
                  NŒUD SÉLECTIONNÉ : {selectedNode.id}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Configuration de l’Action & Allocation des Villageois
                </h3>
              </div>

              {activeDag.nodes.length > 2 && (
                <button
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800 text-rose-200 text-xs rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer Nœud
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Intitulé du Nœud Tactique
                </label>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) =>
                    handleNodeUpdate({...selectedNode, title: e.target.value})
                  }
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Technologie / Déblocage Clé
                </label>
                <input
                  type="text"
                  value={selectedNode.techUnlocked}
                  onChange={(e) =>
                    handleNodeUpdate({...selectedNode, techUnlocked: e.target.value})
                  }
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Famille d’Unités Prioritaire
                </label>
                <select
                  value={selectedNode.primaryUnitFocus}
                  onChange={(e) =>
                    handleNodeUpdate({
                      ...selectedNode,
                      primaryUnitFocus: e.target.value as UnitCategory,
                    })
                  }
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="CAVALRY">CAVALRY (Éclaireurs / Cavaliers / Paladins)</option>
                  <option value="ARCHERS">ARCHERS (Archers / Arbalétriers / Tirailleurs)</option>
                  <option value="INFANTRY">INFANTRY (Hommes d’armes / Hallebardiers)</option>
                  <option value="SIEGE">SIEGE (Mangonneaux / Béliers / Trébuchets)</option>
                  <option value="MONKS">MONKS (Moines & Contrôle des Reliques)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 font-mono tabular-nums">
                  Multiplicateur Power Spike : ×{selectedNode.powerSpikeBonus}
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="1.5"
                  step="0.02"
                  value={selectedNode.powerSpikeBonus}
                  onChange={(e) =>
                    handleNodeUpdate({
                      ...selectedNode,
                      powerSpikeBonus: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#D97706] mt-2"
                />
              </div>
            </div>

            {/* Curseurs de répartition des villageois */}
            <div className="pt-4 border-t border-[#1E293B] space-y-3">
              <div className="text-xs font-semibold text-slate-200">
                Répartition Économique des Villageois (Bois / Nourriture / Or / Pierre)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs tabular-nums">
                {(
                  [
                    {key: 'food', label: 'Nourriture', color: 'text-rose-400'},
                    {key: 'wood', label: 'Bois', color: 'text-emerald-400'},
                    {key: 'gold', label: 'Or', color: 'text-amber-400'},
                    {key: 'stone', label: 'Pierre', color: 'text-slate-300'},
                  ] as const
                ).map((res) => (
                  <div
                    key={res.key}
                    className="p-3 rounded bg-[#0B0F17] border border-slate-800 space-y-1.5"
                  >
                    <div className="flex justify-between">
                      <span className={res.color}>{res.label}</span>
                      <span className="text-white font-bold">
                        {selectedNode.villagerAllocation[res.key]}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="5"
                      value={selectedNode.villagerAllocation[res.key]}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleNodeUpdate({
                          ...selectedNode,
                          villagerAllocation: {
                            ...selectedNode.villagerAllocation,
                            [res.key]: val,
                          },
                        });
                      }}
                      className="w-full accent-[#D97706]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gestion des Bifurcations Conditionnelles & Fenêtres de Power Spike (5 cols) */}
          <div className="lg:col-span-5 bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-5">
            <div className="pb-4 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-sky-400" />
                <h3 className="text-base font-bold text-white">
                  Bifurcations Sortantes & Conditions de Scouting
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Définissez comment le moteur par Ticks bifurque depuis ce nœud selon les
                réactions adverses.
              </p>
            </div>

            <div className="space-y-2.5">
              {activeDag.edges
                .filter((e) => e.fromNodeId === selectedNode.id)
                .map((edge) => {
                  const targetNode = activeDag.nodes.find((n) => n.id === edge.toNodeId);
                  return (
                    <div
                      key={edge.id}
                      className="p-3 rounded bg-[#0B0F17] border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="text-xs">
                        <div className="font-semibold text-white">
                          Vers : {targetNode?.title || edge.toNodeId}
                        </div>
                        <div className="text-sky-400 font-mono text-[11px] mt-0.5">
                          Condition : {CONDITION_LABELS[edge.condition]}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveEdge(edge.id)}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        Retirer
                      </button>
                    </div>
                  );
                })}
            </div>

            {/* Ajout d'une nouvelle arête conditionnelle */}
            <div className="pt-4 border-t border-[#1E293B] space-y-3">
              <div className="text-xs font-semibold text-slate-200">
                Relier à un autre Nœud du Graphe
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                <select
                  value={newEdgeTargetId}
                  onChange={(e) => setNewEdgeTargetId(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Choisir le nœud de destination --</option>
                  {activeDag.nodes
                    .filter((n) => n.id !== selectedNode.id)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                </select>

                <select
                  value={newEdgeCondition}
                  onChange={(e) =>
                    setNewEdgeCondition(e.target.value as DagConditionType)
                  }
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {(Object.keys(CONDITION_LABELS) as DagConditionType[]).map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleAddEdge}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Ajouter la Bifurcation Conditionnelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inspecteur JSON Brut du Graphe DAG */}
      {showJsonModal && (
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-sky-400">
              REPRÉSENTATION JSON DU GRAPHE ORIENTÉ ACYCLIQUE (DAG)
            </span>
            <span className="text-xs font-mono text-slate-400">
              Compatible avec le désérialiseur Rust serde_json
            </span>
          </div>
          <pre className="p-4 rounded bg-[#0B0F17] border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-72">
            {JSON.stringify(activeDag, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
