'use client';

import React, {useEffect} from 'react';
import PixelRtsCanvas from './PixelRtsCanvas';
import {DynamicTeamEmblemSvg} from './TeamVisualAssetShowcase';
import {TeamProfile} from '@/lib/types';
import {soundEngine} from '@/lib/sound';

interface TitleScreenProps {
  teamProfile?: TeamProfile;
  onStartGame: () => void;
  onOpenCreatorWizard: () => void;
  onLaunchQuickMatch: () => void;
}

export default function TitleScreen({
  teamProfile,
  onStartGame,
  onOpenCreatorWizard,
  onLaunchQuickMatch,
}: TitleScreenProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        soundEngine.playAgeUpFanfare();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0B0F17] select-none">
      {/* Live-world camera pan en arrière-plan 60fps */}
      <div className="absolute inset-0">
        <PixelRtsCanvas cinematicMode />
      </div>

      {/* Voile de contraste mesuré garantissant >= 4.5:1 de lisibilité et >35% d'espace négatif */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/65 to-[#0B0F17]/30 pointer-events-none" />

      {/* Contenu central du Game Shell */}
      <div className="relative z-10 flex flex-col items-center justify-between w-full h-full px-6 py-12">
        {/* En-tête discret d'édition */}
        <div className="flex items-center gap-3 text-xs tracking-wider text-slate-300 font-mono tabular-nums">
          <span>SAISON COMPÉTITIVE {teamProfile?.foundedYear || 2026}</span>
          <span aria-hidden="true">·</span>
          <span>CARTE ÉCHELLE ×5 & BROUILLARD DE GUERRE</span>
          <span aria-hidden="true">·</span>
          <span>
            CEO : {teamProfile?.ceo.firstName || 'Alexandre'}{' '}
            {teamProfile?.ceo.lastName || 'Valerius'}
          </span>
        </div>

        {/* Emblème Dynamique de l'Écurie & Verrouillage Typographique Impérial */}
        <div className="flex flex-col items-center text-center max-w-3xl my-auto">
          <div className="mb-6">
            {teamProfile ? (
              <DynamicTeamEmblemSvg
                shape={teamProfile.emblemShape}
                primaryColor={teamProfile.primaryColor}
                secondaryColor={teamProfile.secondaryColor}
                tag={teamProfile.tag}
                customLogoDataUrl={teamProfile.customLogoDataUrl}
                size={96}
              />
            ) : (
              <svg
                width="92"
                height="92"
                viewBox="0 0 96 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_10px_25px_rgba(217,119,6,0.35)]"
                aria-hidden="true"
              >
                <path
                  d="M48 6L84 20V46C84 68.5 68.6 84.8 48 91C27.4 84.8 12 68.5 12 46V20L48 6Z"
                  fill="#131B2E"
                  stroke="#D97706"
                  strokeWidth="3"
                />
                <path
                  d="M48 14L76 25V45.5C76 63.5 63.8 77.2 48 82.5C32.2 77.2 20 63.5 20 45.5V25L48 14Z"
                  fill="#0B0F17"
                  stroke="#F59E0B"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <path
                  d="M30 42L36 30L48 38L60 30L66 42H30Z"
                  fill="#D97706"
                />
                <rect x="30" y="45" width="36" height="5" fill="#FDE68A" />
              </svg>
            )}
          </div>

          <h1
            className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white mb-4"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              textWrap: 'balance',
            }}
          >
            AEGIS EMPIRE MANAGER
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed mb-8">
            Dirigez l’écurie{' '}
            <span className="text-white font-semibold">
              [{teamProfile?.tag || 'AEG'}] {teamProfile?.name || 'Aegis Gaming'}
            </span>{' '}
            sur un RTS médiéval compétitif. Personnalisez votre CEO, modélisez la fatigue
            exponentielle, concevez vos Build Orders en DAG et orchestrez des séries 1v1 sur cartes ×5.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => {
                soundEngine.playAgeUpFanfare();
                onStartGame();
              }}
              className="px-7 py-3.5 bg-[#D97706] hover:bg-[#B45309] text-white font-semibold text-sm rounded-lg shadow-lg transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
            >
              Quartier Général [{teamProfile?.tag || 'AEG'}] (Entrée)
            </button>

            <button
              onClick={() => {
                soundEngine.playUiClick();
                onOpenCreatorWizard();
              }}
              className="px-6 py-3.5 bg-[#131B2E]/95 hover:bg-[#1E293B] text-amber-300 border border-amber-500/50 font-semibold text-sm rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
            >
              Mode Créateur (Écurie & CEO)
            </button>

            <button
              onClick={() => {
                soundEngine.playUiClick();
                onLaunchQuickMatch();
              }}
              className="px-6 py-3.5 bg-[#131B2E]/90 hover:bg-[#1E293B] text-slate-100 border border-slate-700 font-medium text-sm rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
            >
              Lancer un Duel RTS 1v1 Direct
            </button>
          </div>
        </div>

        {/* Ligne unique d'indication des contrôles (Control-hint line) */}
        <div className="text-xs font-mono text-slate-400 tracking-wide">
          WASD Déplacer Caméra · Espace Action / Pause Tick · Clic Inspecter Unité · Entrée Démarrer
        </div>
      </div>
    </div>
  );
}
