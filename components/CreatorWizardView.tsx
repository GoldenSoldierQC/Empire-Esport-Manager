'use client';

import React, {useMemo, useState} from 'react';
import {
  BuyoutSeverity,
  CeoArchetype,
  CeoAvatarStyle,
  EmblemShape,
  LeagueDivisionTier,
  OriginRegionCode,
  SponsorContract,
  StartingBudgetTier,
  TeamProfile,
} from '@/lib/types';
import {CEO_ARCHETYPES_META, ORIGIN_REGIONS_META} from '@/lib/initial-data';
import TeamVisualAssetShowcase from './TeamVisualAssetShowcase';
import {soundEngine} from '@/lib/sound';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Palette,
  Shield,
  Sliders,
  Sparkles,
  Upload,
  UserCheck,
} from 'lucide-react';

interface CreatorWizardViewProps {
  initialProfile: TeamProfile;
  sponsors: SponsorContract[];
  onSaveProfileAndLaunch: (newProfile: TeamProfile) => void;
  onCancel?: () => void;
}

const EMBLEM_OPTIONS: Array<{id: EmblemShape; label: string}> = [
  {id: 'SHIELD', label: 'Bouclier Impérial'},
  {id: 'EAGLE', label: 'Aigle Royal'},
  {id: 'SWORD', label: 'Épée Croisée'},
  {id: 'WOLF', label: 'Loup du Nord'},
  {id: 'CROWN', label: 'Couronne d’Or'},
  {id: 'FORTRESS', label: 'Citadelle / Tour'},
];

const AVATAR_OPTIONS: Array<{id: CeoAvatarStyle; label: string}> = [
  {id: 'IMPERIAL_COMMANDER', label: 'Commandeur Impérial'},
  {id: 'CYBER_TACTICIAN', label: 'Tacticien Analytique'},
  {id: 'EXECUTIVE_MOGUL', label: 'Magnat Exécutif'},
  {id: 'VETERAN_CHAMPION', label: 'Vétéran Pro AoE2'},
];

const COLOR_PRESETS: Array<{name: string; primary: string; secondary: string}> = [
  {name: 'Or Impérial & Cobalt', primary: '#D97706', secondary: '#1E3A8A'},
  {name: 'Émeraude & Onyx', primary: '#10B981', secondary: '#064E3B'},
  {name: 'Pourpre Byzantin & Argent', primary: '#A855F7', secondary: '#3B0764'},
  {name: 'Écarlate Teuton & Acier', primary: '#EF4444', secondary: '#1E293B'},
  {name: 'Cyan Vortex & Nuit', primary: '#06B6D4', secondary: '#0F172A'},
];

const BUDGET_TIERS: Record<
  StartingBudgetTier,
  {
    title: string;
    baseAmount: number;
    houseLevel: number;
    desc: string;
  }
> = {
  SURVIVAL_LOCAL: {
    title: 'Mode Survie (Petit Local)',
    baseAmount: 65000,
    houseLevel: 1,
    desc: 'Budget très serré (65 000 €), petit local associatif (Gaming House Niv. 1). Chaque recrutement et victoire compte pour éviter la banqueroute.',
  },
  STANDARD_CONTENDER: {
    title: 'Carrière Classique (Challenger)',
    baseAmount: 145000,
    houseLevel: 2,
    desc: 'Équilibre compétitif (145 000 €) avec une Gaming House fonctionnelle (Niv. 2) et une marge de manœuvre tactique réaliste.',
  },
  INVESTOR_SYNDICATE: {
    title: 'Mode Investisseurs / Sandbox',
    baseAmount: 260000,
    houseLevel: 3,
    desc: 'Fonds confortables (260 000 €) soutenus par un fonds d’investissement et une Gaming House moderne (Niv. 3) dès le Jour 1.',
  },
};

export default function CreatorWizardView({
  initialProfile,
  sponsors,
  onSaveProfileAndLaunch,
  onCancel,
}: CreatorWizardViewProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<TeamProfile>(() =>
    structuredClone(initialProfile)
  );
  const [showSqlPreview, setShowSqlPreview] = useState<boolean>(false);

  // Validation en temps réel des champs
  const validation = useMemo(() => {
    const errors: Record<string, string> = {};
    if (draft.name.trim().length < 3) {
      errors.name = 'Le nom de l’écurie doit comporter au moins 3 caractères.';
    }
    if (!/^[A-Z0-9]{3,4}$/.test(draft.tag.trim())) {
      errors.tag = 'Le Tag doit contenir 3 à 4 caractères majuscules (ex: AEG).';
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(draft.primaryColor)) {
      errors.primaryColor = 'Code hexadécimal principal invalide (ex: #D97706).';
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(draft.secondaryColor)) {
      errors.secondaryColor = 'Code hexadécimal secondaire invalide.';
    }
    if (draft.ceo.firstName.trim().length < 2) {
      errors.firstName = 'Prénom du CEO requis (min. 2 caractères).';
    }
    if (draft.ceo.lastName.trim().length < 2) {
      errors.lastName = 'Nom du CEO requis (min. 2 caractères).';
    }

    return {
      errors,
      step1Valid:
        !errors.name &&
        !errors.tag &&
        !errors.primaryColor &&
        !errors.secondaryColor,
      step2Valid: !errors.firstName && !errors.lastName,
      allValid: Object.keys(errors).length === 0,
    };
  }, [draft]);

  // Calcul dynamique du budget initial effectif (Tier + Bonus/Malus d'Archétype CEO)
  const effectiveInitialBudget = useMemo(() => {
    const base = BUDGET_TIERS[draft.settings.startingBudgetTier].baseAmount;
    const archMod = CEO_ARCHETYPES_META[draft.ceo.archetype].budgetModifier;
    return Math.max(30000, base + archMod);
  }, [draft.settings.startingBudgetTier, draft.ceo.archetype]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'LOGO' | 'CEO_AVATAR'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      soundEngine.playUiClick();
      if (target === 'LOGO') {
        setDraft((prev) => ({...prev, customLogoDataUrl: result}));
      } else {
        setDraft((prev) => ({
          ...prev,
          ceo: {...prev.ceo, customAvatarDataUrl: result},
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFinalize = () => {
    if (!validation.allValid) return;
    soundEngine.playAgeUpFanfare();
    const finalized: TeamProfile = {
      ...draft,
      tag: draft.tag.trim().toUpperCase(),
      settings: {
        ...draft.settings,
        initialBudgetAmount: effectiveInitialBudget,
      },
    };
    onSaveProfileAndLaunch(finalized);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
      {/* En-tête du Mode Créateur (Wizard UX) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-mono tabular-nums mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MODE CRÉATEUR D’ÉCURIE & FONDATEUR (WIZARD UX)</span>
            <span aria-hidden="true">·</span>
            <span>PERSISTANCE REACT & SQLITE</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
            style={{fontFamily: 'var(--font-cinzel), serif'}}
          >
            Fondation de l’Écurie, Identité du CEO & Règles de Simulation
          </h1>
        </div>

        {/* Indicateur des 3 étapes du Wizard */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              {num: 1, label: '1. Identité Écurie & Blason'},
              {num: 2, label: '2. CEO & Philosophie'},
              {num: 3, label: '3. Difficulté & Simulation'},
            ] as const
          ).map((s) => (
            <button
              key={s.num}
              onClick={() => {
                soundEngine.playUiClick();
                setStep(s.num);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                step === s.num
                  ? 'bg-[#D97706] text-white font-bold shadow-md'
                  : 'bg-[#131B2E] text-slate-300 border border-slate-800 hover:border-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1 : Espace Réservé pour les Visuels / Assets (Rendu Temps Réel) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>
            PRÉVISUALISATION INSTANTANÉE DES ASSETS GRAPHIQUES (LOGO, MAILLOT, BANNIÈRE & AVATAR CEO)
          </span>
          <span
            className={
              validation.allValid ? 'text-emerald-400' : 'text-amber-400'
            }
          >
            {validation.allValid
              ? '✓ Validation Temps Réel : Profil Complet & Conforme'
              : '⚠ Vérifiez les champs signalés ci-dessous'}
          </span>
        </div>
        <TeamVisualAssetShowcase
          profile={{
            ...draft,
            settings: {
              ...draft.settings,
              initialBudgetAmount: effectiveInitialBudget,
            },
          }}
          sponsors={sponsors}
        />
      </div>

      {/* Corps du Wizard en 12 colonnes : Formulaire d'étape (7 cols) + Résumé Technique & Impacts (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Colonne Gauche : Étape Active du Wizard (7 cols) */}
        <div className="lg:col-span-7 bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-6">
          {/* ÉTAPE 1 : IDENTITÉ DE L'ÉCURIE & IDENTITÉ VISUELLE */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1E293B]">
                <Shield className="w-5 h-5 text-[#D97706]" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    Étape 1 : Identité de l’Écurie & Charte Graphique
                  </h2>
                  <p className="text-xs text-slate-400">
                    Définissez le nom officiel, le tag compétitif, l’origine régionale et les couleurs hexadécimales.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nom de l’Équipe (ex: Aegis Gaming, Vortex Esport)
                  </label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({...draft, name: e.target.value})
                    }
                    placeholder="Ex: Aegis Empire Gaming"
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:border-[#D97706] outline-none"
                  />
                  {validation.errors.name && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validation.errors.name}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tag / Abréviation (3-4 car.)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={draft.tag}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        tag: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                      })
                    }
                    placeholder="AEG"
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3.5 py-2 text-sm font-mono font-bold text-amber-400 uppercase focus:border-[#D97706] outline-none"
                  />
                  {validation.errors.tag && (
                    <p className="text-[11px] text-rose-400 mt-1">
                      {validation.errors.tag}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Année de Fondation
                  </label>
                  <input
                    type="number"
                    min={1999}
                    max={2030}
                    value={draft.foundedYear}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        foundedYear: parseInt(e.target.value, 10) || 2026,
                      })
                    }
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3.5 py-2 text-sm font-mono text-white"
                  />
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Pays / Région d’Origine (Impacte Sponsors & Recrutement)
                  </label>
                  <select
                    value={draft.countryOrigin}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        countryOrigin: e.target.value as OriginRegionCode,
                      })
                    }
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white"
                  >
                    {(Object.keys(ORIGIN_REGIONS_META) as OriginRegionCode[]).map(
                      (code) => (
                        <option key={code} value={code}>
                          [{code}] {ORIGIN_REGIONS_META[code].label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* Couleurs Hexadécimales Principale & Secondaire */}
              <div className="space-y-3 pt-2 border-t border-[#1E293B]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-[#D97706]" />
                    Couleurs Hexadécimales (Maillot, Bannière & Blason)
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setDraft({
                            ...draft,
                            primaryColor: preset.primary,
                            secondaryColor: preset.secondary,
                          });
                        }}
                        className="px-2 py-1 text-[10px] bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 rounded flex items-center gap-1 cursor-pointer"
                        title={preset.name}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{backgroundColor: preset.primary}}
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{backgroundColor: preset.secondary}}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-[#0B0F17] p-2.5 rounded-lg border border-slate-800">
                    <input
                      type="color"
                      value={
                        /^#[0-9A-Fa-f]{6}$/.test(draft.primaryColor)
                          ? draft.primaryColor
                          : '#D97706'
                      }
                      onChange={(e) =>
                        setDraft({...draft, primaryColor: e.target.value.toUpperCase()})
                      }
                      className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
                    />
                    <div className="flex-1">
                      <label className="block text-[11px] text-slate-400">
                        Couleur Principale (Hex)
                      </label>
                      <input
                        type="text"
                        value={draft.primaryColor}
                        onChange={(e) =>
                          setDraft({...draft, primaryColor: e.target.value})
                        }
                        className="w-full bg-transparent text-xs font-mono text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-[#0B0F17] p-2.5 rounded-lg border border-slate-800">
                    <input
                      type="color"
                      value={
                        /^#[0-9A-Fa-f]{6}$/.test(draft.secondaryColor)
                          ? draft.secondaryColor
                          : '#1E3A8A'
                      }
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          secondaryColor: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
                    />
                    <div className="flex-1">
                      <label className="block text-[11px] text-slate-400">
                        Couleur Secondaire (Hex)
                      </label>
                      <input
                        type="text"
                        value={draft.secondaryColor}
                        onChange={(e) =>
                          setDraft({...draft, secondaryColor: e.target.value})
                        }
                        className="w-full bg-transparent text-xs font-mono text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bibliothèque d'Emblèmes Vectoriels / Pixel Art ou Import Personnalisé */}
              <div className="space-y-3 pt-2 border-t border-[#1E293B]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-white">
                    Bibliothèque d’Emblèmes (ou Import Personnalisé)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 rounded text-xs text-sky-300 cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      Importer un Logo (PNG/SVG)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'LOGO')}
                        className="hidden"
                      />
                    </label>
                    {draft.customLogoDataUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({...draft, customLogoDataUrl: undefined})
                        }
                        className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Réinitialiser Logo
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {EMBLEM_OPTIONS.map((emb) => {
                    const isSelected =
                      !draft.customLogoDataUrl && draft.emblemShape === emb.id;
                    return (
                      <button
                        key={emb.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setDraft({
                            ...draft,
                            emblemShape: emb.id,
                            customLogoDataUrl: undefined,
                          });
                        }}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#1E293B] border-[#D97706] text-white font-semibold'
                            : 'bg-[#0B0F17] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {emb.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : PERSONNALISATION DU CEO & PHILOSOPHIE DE MANAGEMENT */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1E293B]">
                <UserCheck className="w-5 h-5 text-[#D97706]" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    Étape 2 : Personnalisation du CEO (Le Joueur) & Archétype
                  </h2>
                  <p className="text-xs text-slate-400">
                    Configurez l’identité du fondateur, son avatar pixel-art et sa philosophie de management.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Prénom du Fondateur / CEO
                  </label>
                  <input
                    type="text"
                    value={draft.ceo.firstName}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        ceo: {...draft.ceo, firstName: e.target.value},
                      })
                    }
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white"
                  />
                  {validation.errors.firstName && (
                    <p className="text-[11px] text-rose-400 mt-1">
                      {validation.errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nom de Famille / Pseudo Officiel
                  </label>
                  <input
                    type="text"
                    value={draft.ceo.lastName}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        ceo: {...draft.ceo, lastName: e.target.value},
                      })
                    }
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white"
                  />
                  {validation.errors.lastName && (
                    <p className="text-[11px] text-rose-400 mt-1">
                      {validation.errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Sélection de l'Avatar Pixel Art du CEO ou Import */}
              <div className="space-y-2.5 pt-2 border-t border-[#1E293B]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-white">
                    Apparence / Avatar 2D Pixel Art du CEO
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 rounded text-xs text-sky-300 cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      Importer Portrait CEO
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'CEO_AVATAR')}
                        className="hidden"
                      />
                    </label>
                    {draft.ceo.customAvatarDataUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            ceo: {...draft.ceo, customAvatarDataUrl: undefined},
                          })
                        }
                        className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Réinitialiser Avatar
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {AVATAR_OPTIONS.map((av) => {
                    const isSelected =
                      !draft.ceo.customAvatarDataUrl &&
                      draft.ceo.avatarStyle === av.id;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setDraft({
                            ...draft,
                            ceo: {
                              ...draft.ceo,
                              avatarStyle: av.id,
                              customAvatarDataUrl: undefined,
                            },
                          });
                        }}
                        className={`p-2.5 rounded-lg border text-xs text-center transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#1E293B] border-[#D97706] text-white font-semibold'
                            : 'bg-[#0B0F17] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {av.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Philosophie de Management (3 Archétypes de départ) */}
              <div className="space-y-3 pt-2 border-t border-[#1E293B]">
                <label className="block text-xs font-semibold text-white">
                  Profil & Philosophie de Management (Archétype Fondateur)
                </label>
                <div className="space-y-3">
                  {(Object.keys(CEO_ARCHETYPES_META) as CeoArchetype[]).map(
                    (archKey) => {
                      const meta = CEO_ARCHETYPES_META[archKey];
                      const isChosen = draft.ceo.archetype === archKey;
                      return (
                        <div
                          key={archKey}
                          onClick={() => {
                            soundEngine.playUiClick();
                            setDraft({
                              ...draft,
                              ceo: {...draft.ceo, archetype: archKey},
                            });
                          }}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            isChosen
                              ? 'bg-[#1E293B] border-[#D97706]'
                              : 'bg-[#0B0F17] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-white">
                              {meta.title}
                            </span>
                            {isChosen && (
                              <span className="px-2 py-0.5 text-[10px] font-mono bg-[#D97706] text-white rounded">
                                SÉLECTIONNÉ
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mb-2">
                            {meta.subtitle}
                          </p>
                          <div className="text-xs space-y-1 font-mono">
                            <div className="text-emerald-400">
                              ✓ Avantage : {meta.pros}
                            </div>
                            <div className="text-amber-400">
                              ⚠ Contrepartie : {meta.cons}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : PARAMÈTRES DE DÉMARRAGE & DIFFICULTÉ (SANDBOX VS CARRIÈRE) */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1E293B]">
                <Sliders className="w-5 h-5 text-[#D97706]" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    Étape 3 : Capital Initial, Division & Règles Avancées
                  </h2>
                  <p className="text-xs text-slate-400">
                    Choisissez votre difficulté financière (Mode Survie vs Investisseurs) et vos règles de simulation RTS.
                  </p>
                </div>
              </div>

              {/* Capital Financier Initial */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-white">
                  1. Capital Financier Initial & Infrastructures de Départ
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {(Object.keys(BUDGET_TIERS) as StartingBudgetTier[]).map(
                    (tierKey) => {
                      const info = BUDGET_TIERS[tierKey];
                      const isChosen =
                        draft.settings.startingBudgetTier === tierKey;
                      return (
                        <div
                          key={tierKey}
                          onClick={() => {
                            soundEngine.playUiClick();
                            setDraft({
                              ...draft,
                              settings: {
                                ...draft.settings,
                                startingBudgetTier: tierKey,
                              },
                            });
                          }}
                          className={`p-3.5 rounded-lg border cursor-pointer transition-colors ${
                            isChosen
                              ? 'bg-[#1E293B] border-[#D97706]'
                              : 'bg-[#0B0F17] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">
                              {info.title}
                            </span>
                            <span className="text-xs font-mono text-emerald-400 font-semibold tabular-nums">
                              Base : {info.baseAmount.toLocaleString('fr-FR')} €
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {info.desc}
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Division / Niveau de Ligue d'Entrée */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1E293B]">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    2. Division / Ligue d’Entrée
                  </label>
                  <select
                    value={draft.settings.divisionTier}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        settings: {
                          ...draft.settings,
                          divisionTier: e.target.value as LeagueDivisionTier,
                        },
                      })
                    }
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="REGIONAL_OPEN">
                      Division Régionale / Open Qualifier
                    </option>
                    <option value="CHALLENGER_LEAGUE">
                      Challenger Tier (Semi-Pro / Inter)
                    </option>
                    <option value="IMPERIAL_MAJOR">
                      Ligue Majeure Impériale (S-Tier)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    3. Sévérité des Clauses de Rachat (Transferts)
                  </label>
                  <select
                    value={draft.settings.buyoutSeverity}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        settings: {
                          ...draft.settings,
                          buyoutSeverity: e.target.value as BuyoutSeverity,
                        },
                      })
                    }
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="RELAXED">
                      Marché Ouvert (Clauses de rachat -25 %)
                    </option>
                    <option value="STANDARD">
                      Standard Compétitif (Clauses 100 %)
                    </option>
                    <option value="STRICT_CLAUSE">
                      Mercato Verrouillé (Clauses de rachat +35 %)
                    </option>
                  </select>
                </div>
              </div>

              {/* Options de Simulation & Règles Avancées */}
              <div className="space-y-3 pt-2 border-t border-[#1E293B]">
                <div className="text-xs font-semibold text-white">
                  4. Options de Simulation & Règles Avancées du Tick Engine
                </div>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-[#0B0F17] border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.settings.fogOfWarMandatoryScout}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        settings: {
                          ...draft.settings,
                          fogOfWarMandatoryScout: e.target.checked,
                        },
                      })
                    }
                    className="mt-0.5 w-4 h-4 accent-[#D97706] rounded cursor-pointer"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-white">
                      Brouillard de Guerre (Fog of War) & Éclaireur Obligatoire
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      Assigne 1 Éclaireur au départ et empêche tout ciblage ou raid militaire direct tant que la base adverse n’a pas été révélée sur la carte ×5.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-[#0B0F17] border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.settings.exponentialFatigueBurnout}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        settings: {
                          ...draft.settings,
                          exponentialFatigueBurnout: e.target.checked,
                        },
                      })
                    }
                    className="mt-0.5 w-4 h-4 accent-[#D97706] rounded cursor-pointer"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-white">
                      Fatigue Exponentielle (&lt;75 % Énergie) & Risque de Burnout
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      Applique la loi de dégradation exponentielle sur la Micro des joueurs sous 75 % d’énergie lors des séries Bo3/Bo5.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Barre de Navigation du Wizard (Précédent / Suivant / Fonder l'Écurie) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1E293B]">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setStep((s) => (s === 3 ? 2 : 1));
                  }}
                  className="px-4 py-2 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Étape Précédente
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onCancel();
                  }}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Retour sans modifier
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setStep((s) => (s === 1 ? 2 : 3));
                  }}
                  className="px-5 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  Étape Suivante ({step}/3)
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={!validation.allValid}
                  className={`px-6 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-lg ${
                    validation.allValid
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Valider & Fonder l’Écurie [{draft.tag || 'AEG'}]
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Colonne Droite : Récapitulatif Financier, Modificateurs & Structure SQLite (5 cols) */}
        <div className="lg:col-span-5 bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <div>
              <h3 className="text-base font-bold text-white">
                Bilan d’Initialisation & Persistance SQLite
              </h3>
              <p className="text-xs text-slate-400">
                Synthèse des bonus appliqués à votre carrière dès la validation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setShowSqlPreview(!showSqlPreview);
              }}
              className="px-2.5 py-1 bg-[#0B0F17] hover:bg-slate-800 border border-slate-700 rounded text-[11px] font-mono text-sky-300 cursor-pointer flex items-center gap-1"
            >
              <Database className="w-3 h-3" />
              {showSqlPreview ? 'Masquer SQL/JSON' : 'Schéma SQL/JSON'}
            </button>
          </div>

          <div className="space-y-3 text-xs font-mono tabular-nums">
            <div className="p-3.5 rounded bg-[#0B0F17] border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Capital Initial Effectif :</span>
              <span className="text-base font-bold text-emerald-400">
                {effectiveInitialBudget.toLocaleString('fr-FR')} €
              </span>
            </div>

            <div className="p-3.5 rounded bg-[#0B0F17] border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Niveau Gaming House :</span>
                <span className="text-white font-semibold">
                  Niveau{' '}
                  {BUDGET_TIERS[draft.settings.startingBudgetTier].houseLevel} / 5
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bonus Synergie CEO :</span>
                <span className="text-sky-400 font-semibold">
                  +{CEO_ARCHETYPES_META[draft.ceo.archetype].synergyBonus} %
                  cohésion
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bonus Recherche DAG :</span>
                <span className="text-amber-400 font-semibold">
                  +{CEO_ARCHETYPES_META[draft.ceo.archetype].dagResearchBonusPct} %
                  vitesse Tech
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Brouillard & Éclaireur :</span>
                <span className="text-emerald-400">
                  {draft.settings.fogOfWarMandatoryScout
                    ? 'ACTIF (1 Éclaireur requis)'
                    : 'DÉSACTIVÉ'}
                </span>
              </div>
            </div>
          </div>

          {showSqlPreview ? (
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-sky-400">
                STRUCTURE TYPESCRIPT / SQLITE (TeamProfile & CeoProfile)
              </div>
              <pre className="p-3 rounded bg-[#0B0F17] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64">
                {JSON.stringify(
                  {
                    ...draft,
                    customLogoDataUrl: draft.customLogoDataUrl
                      ? '[BASE64_IMAGE_ASSET]'
                      : undefined,
                    ceo: {
                      ...draft.ceo,
                      customAvatarDataUrl: draft.ceo.customAvatarDataUrl
                        ? '[BASE64_AVATAR_ASSET]'
                        : undefined,
                    },
                    settings: {
                      ...draft.settings,
                      initialBudgetAmount: effectiveInitialBudget,
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          ) : (
            <div className="p-4 rounded bg-[#0B0F17] border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
              <div className="font-semibold text-white">
                Impact de vos paramètres sur la simulation :
              </div>
              <p>
                • <strong>Origine [{draft.countryOrigin}]</strong> :{' '}
                {ORIGIN_REGIONS_META[draft.countryOrigin].sponsorBonusLabel}.
              </p>
              <p>
                • <strong>Archétype CEO</strong> :{' '}
                {CEO_ARCHETYPES_META[draft.ceo.archetype].pros}.
              </p>
              <p>
                • <strong>Mercato & Clauses</strong> :{' '}
                {draft.settings.buyoutSeverity === 'RELAXED'
                  ? 'Les clauses de rachat des joueurs sur le marché des transferts sont réduites de 25 %.'
                  : draft.settings.buyoutSeverity === 'STRICT_CLAUSE'
                    ? 'Les clauses de rachat sur le marché des transferts sont majorées de 35 %.'
                    : 'Les clauses de rachat respectent les montants standards du circuit pro.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
