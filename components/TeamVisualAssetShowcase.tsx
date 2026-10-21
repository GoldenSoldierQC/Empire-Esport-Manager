'use client';

import React from 'react';
import {
  CeoAvatarStyle,
  EmblemShape,
  SponsorContract,
  TeamProfile,
} from '@/lib/types';
import {CEO_ARCHETYPES_META, ORIGIN_REGIONS_META} from '@/lib/initial-data';

interface TeamVisualAssetShowcaseProps {
  profile: TeamProfile;
  sponsors?: SponsorContract[];
  compact?: boolean;
}

export function DynamicTeamEmblemSvg({
  shape,
  primaryColor,
  secondaryColor,
  tag,
  customLogoDataUrl,
  size = 88,
}: {
  shape: EmblemShape;
  primaryColor: string;
  secondaryColor: string;
  tag: string;
  customLogoDataUrl?: string;
  size?: number;
}) {
  if (customLogoDataUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderColor: primaryColor,
          backgroundColor: secondaryColor,
        }}
        className="rounded-xl border-2 overflow-hidden flex items-center justify-center shadow-lg shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={customLogoDataUrl}
          alt={`Logo ${tag}`}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-[0_6px_16px_rgba(0,0,0,0.5)]"
      aria-label={`Emblème ${tag}`}
    >
      {/* Fond d'écusson principal */}
      <path
        d="M50 6L88 20V48C88 71.5 71.5 88 50 95C28.5 88 12 71.5 12 48V20L50 6Z"
        fill={secondaryColor}
        stroke={primaryColor}
        strokeWidth="4"
      />
      <path
        d="M50 13L81 24.5V47.5C81 66.5 67.5 80.5 50 86.5C32.5 80.5 19 66.5 19 47.5V24.5L50 13Z"
        fill="#0B0F17"
        stroke={primaryColor}
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />

      {/* Motif central selon la bibliothèque d'emblèmes */}
      {shape === 'SHIELD' && (
        <g>
          <path
            d="M50 24L70 33V48C70 60 61 68 50 72C39 68 30 60 30 48V33L50 24Z"
            fill={primaryColor}
            fillOpacity="0.88"
          />
          <path d="M50 24V72" stroke="#0B0F17" strokeWidth="2.5" />
          <path d="M30 46H70" stroke="#0B0F17" strokeWidth="2.5" />
        </g>
      )}

      {shape === 'EAGLE' && (
        <g>
          <path
            d="M24 38L42 44L50 28L58 44L76 38L66 56L50 68L34 56L24 38Z"
            fill={primaryColor}
          />
          <circle cx="45" cy="40" r="2" fill="#0B0F17" />
          <circle cx="55" cy="40" r="2" fill="#0B0F17" />
        </g>
      )}

      {shape === 'SWORD' && (
        <g>
          <path d="M50 20L55 30V58H45V30L50 20Z" fill="#F8FAFC" />
          <rect x="34" y="56" width="32" height="6" rx="2" fill={primaryColor} />
          <rect x="47" y="62" width="6" height="12" fill={primaryColor} />
        </g>
      )}

      {shape === 'WOLF' && (
        <g>
          <path
            d="M32 28L41 40H59L68 28L64 56L50 70L36 56L32 28Z"
            fill={primaryColor}
          />
          <polygon points="41,48 46,48 44,53" fill="#0B0F17" />
          <polygon points="59,48 54,48 56,53" fill="#0B0F17" />
        </g>
      )}

      {shape === 'CROWN' && (
        <g>
          <path
            d="M26 56L32 32L44 45L50 26L56 45L68 32L74 56H26Z"
            fill={primaryColor}
          />
          <rect x="28" y="59" width="44" height="7" rx="2" fill="#FDE68A" />
        </g>
      )}

      {shape === 'FORTRESS' && (
        <g>
          <rect x="32" y="30" width="8" height="8" fill={primaryColor} />
          <rect x="46" y="30" width="8" height="8" fill={primaryColor} />
          <rect x="60" y="30" width="8" height="8" fill={primaryColor} />
          <rect x="32" y="38" width="36" height="28" fill={primaryColor} />
          <rect x="44" y="50" width="12" height="16" rx="6" fill="#0B0F17" />
        </g>
      )}

      {/* Tag d'équipe gravé au bas du blason */}
      <rect
        x="26"
        y="71"
        width="48"
        height="15"
        rx="3"
        fill="#0B0F17"
        stroke={primaryColor}
        strokeWidth="1.5"
      />
      <text
        x="50"
        y="81.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="10"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {(tag || 'AEG').slice(0, 4).toUpperCase()}
      </text>
    </svg>
  );
}

export function DynamicCeoAvatarSvg({
  avatarStyle,
  primaryColor,
  secondaryColor,
  customAvatarDataUrl,
  size = 76,
}: {
  avatarStyle: CeoAvatarStyle;
  primaryColor: string;
  secondaryColor: string;
  customAvatarDataUrl?: string;
  size?: number;
}) {
  if (customAvatarDataUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderColor: primaryColor,
        }}
        className="rounded-lg border-2 overflow-hidden bg-[#0B0F17] shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={customAvatarDataUrl}
          alt="Avatar CEO"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="rounded-lg border border-slate-700 bg-[#0B0F17] shrink-0"
      style={{imageRendering: 'pixelated'}}
      aria-label="Avatar Pixel Art du CEO"
    >
      {/* Arrière-plan bicolore */}
      <rect width="64" height="64" fill="#0B0F17" />
      <rect x="4" y="4" width="56" height="56" fill={secondaryColor} fillOpacity="0.35" />

      {/* Épaules & Veste de Manager / Armure Impériale en Pixel Art */}
      <rect x="12" y="42" width="40" height="18" fill={secondaryColor} />
      <rect x="20" y="42" width="24" height="18" fill={primaryColor} />
      <rect x="28" y="44" width="8" height="16" fill="#0B0F17" />

      {/* Tête Pixel Art */}
      <rect x="20" y="16" width="24" height="24" fill="#FDBA74" />
      {/* Yeux */}
      <rect x="24" y="25" width="4" height="4" fill="#0F172A" />
      <rect x="36" y="25" width="4" height="4" fill="#0F172A" />

      {/* Accessoires selon le style d'avatar du CEO */}
      {avatarStyle === 'IMPERIAL_COMMANDER' && (
        <g>
          {/* Couronne / Laurier de Stratège Impérial */}
          <rect x="18" y="12" width="28" height="6" fill={primaryColor} />
          <rect x="22" y="8" width="4" height="4" fill="#FDE047" />
          <rect x="30" y="6" width="4" height="6" fill="#FDE047" />
          <rect x="38" y="8" width="4" height="4" fill="#FDE047" />
          <rect x="24" y="34" width="16" height="4" fill="#78350F" />
        </g>
      )}

      {avatarStyle === 'CYBER_TACTICIAN' && (
        <g>
          {/* Visière Télémétrique DAG & Casque */}
          <rect x="18" y="11" width="28" height="7" fill="#1E293B" />
          <rect x="20" y="24" width="24" height="6" fill="#38BDF8" fillOpacity="0.85" />
          <rect x="14" y="20" width="4" height="14" fill={primaryColor} />
          <rect x="46" y="20" width="4" height="14" fill={primaryColor} />
        </g>
      )}

      {avatarStyle === 'EXECUTIVE_MOGUL' && (
        <g>
          {/* Coiffure & Lunettes de Financier */}
          <rect x="18" y="11" width="28" height="7" fill="#334155" />
          <rect x="22" y="24" width="8" height="6" fill="#0F172A" />
          <rect x="34" y="24" width="8" height="6" fill="#0F172A" />
          <rect x="30" y="26" width="4" height="2" fill="#FACC15" />
        </g>
      )}

      {avatarStyle === 'VETERAN_CHAMPION' && (
        <g>
          {/* Bandeau d'Ancien Pro & Casque Audio */}
          <rect x="18" y="10" width="28" height="6" fill="#475569" />
          <rect x="18" y="16" width="28" height="4" fill={primaryColor} />
          <rect x="15" y="22" width="4" height="10" fill="#E2E8F0" />
          <rect x="45" y="22" width="4" height="10" fill="#E2E8F0" />
        </g>
      )}
    </svg>
  );
}

export function DynamicProJerseySvg({
  primaryColor,
  secondaryColor,
  tag,
  sponsorName,
  size = 104,
}: {
  primaryColor: string;
  secondaryColor: string;
  tag: string;
  sponsorName?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)]"
      aria-label="Maillot officiel de l'écurie"
    >
      {/* Silhouette du maillot esport */}
      <path
        d="M36 16L48 22H72L84 16L108 34L96 54L84 46V104H36V46L24 54L12 34L36 16Z"
        fill={secondaryColor}
        stroke={primaryColor}
        strokeWidth="3"
      />
      {/* Bandes diagonales dynamiques */}
      <path
        d="M36 42L84 28V52L36 66V42Z"
        fill={primaryColor}
        fillOpacity="0.85"
      />
      {/* Col en V */}
      <path
        d="M48 22L60 34L72 22"
        stroke={primaryColor}
        strokeWidth="3.5"
        fill="#0B0F17"
      />
      {/* Tag de l'écurie sur le torse */}
      <text
        x="60"
        y="53"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {(tag || 'AEG').slice(0, 4).toUpperCase()}
      </text>
      {/* Patch Sponsor principal */}
      <rect
        x="43"
        y="72"
        width="34"
        height="11"
        rx="2"
        fill="#0B0F17"
        stroke={primaryColor}
        strokeWidth="1"
      />
      <text
        x="60"
        y="79.5"
        textAnchor="middle"
        fill="#E2E8F0"
        fontSize="6.5"
        fontFamily="monospace"
      >
        {(sponsorName || 'HYPERION').slice(0, 10).toUpperCase()}
      </text>
    </svg>
  );
}

/**
 * Composant d'affichage dynamique des assets graphiques du CEO, du maillot,
 * de la bannière et du logo de l'écurie (Section 1 : [IMAGE_PLACEHOLDER])
 */
export default function TeamVisualAssetShowcase({
  profile,
  sponsors = [],
  compact = false,
}: TeamVisualAssetShowcaseProps) {
  const regionMeta =
    ORIGIN_REGIONS_META[profile.countryOrigin] || ORIGIN_REGIONS_META.FR;
  const archetypeMeta =
    CEO_ARCHETYPES_META[profile.ceo.archetype] ||
    CEO_ARCHETYPES_META.STRATEGIST_VISIONARY;
  const activeSponsors = sponsors.filter((s) => s.active);

  return (
    <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg overflow-hidden shadow-xl">
      {/* Bannière Dynamique de l'Écurie avec Dégradé Hexadécimal Personnalisé */}
      <div
        className="relative p-4 sm:p-5 border-b border-[#1E293B]"
        style={{
          background: `linear-gradient(135deg, ${profile.secondaryColor}E6 0%, #0B0F17 60%, ${profile.primaryColor}40 100%)`,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-300 mb-3">
          <span className="px-2 py-0.5 rounded bg-[#0B0F17]/80 border border-slate-700 text-amber-300">
            STUDIO ASSETS GRAPHIQUES DYNAMIQUES (2D / PIXEL ART)
          </span>
          <span className="px-2 py-0.5 rounded bg-[#0B0F17]/80 border border-slate-700">
            FONDÉE EN {profile.foundedYear} · RÉGION {regionMeta.flagCode}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <DynamicTeamEmblemSvg
              shape={profile.emblemShape}
              primaryColor={profile.primaryColor}
              secondaryColor={profile.secondaryColor}
              tag={profile.tag}
              customLogoDataUrl={profile.customLogoDataUrl}
              size={compact ? 68 : 84}
            />

            <div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 text-xs font-mono font-bold rounded text-white"
                  style={{backgroundColor: profile.primaryColor}}
                >
                  [{profile.tag || 'AEG'}]
                </span>
                <span className="text-xs font-mono text-slate-300">
                  {regionMeta.label}
                </span>
              </div>
              <h3
                className="text-xl sm:text-2xl font-bold text-white mt-1 tracking-tight"
                style={{fontFamily: 'var(--font-cinzel), serif'}}
              >
                {profile.name || 'Nouvelle Écurie'}
              </h3>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-300 mt-1">
                <span>
                  Couleurs :{' '}
                  <span style={{color: profile.primaryColor}}>
                    {profile.primaryColor}
                  </span>{' '}
                  /{' '}
                  <span style={{color: profile.secondaryColor}}>
                    {profile.secondaryColor}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Vitrine Maillot Pro + Avatar CEO */}
          <div className="flex items-center gap-4 bg-[#0B0F17]/75 border border-slate-800/90 rounded-lg p-2.5 self-start sm:self-center">
            <div className="text-center">
              <DynamicProJerseySvg
                primaryColor={profile.primaryColor}
                secondaryColor={profile.secondaryColor}
                tag={profile.tag}
                sponsorName={activeSponsors[0]?.brandName || 'HYPERION'}
                size={compact ? 64 : 76}
              />
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                Maillot Pro
              </div>
            </div>

            <div className="h-12 w-px bg-slate-800" />

            <div className="flex items-center gap-2.5">
              <DynamicCeoAvatarSvg
                avatarStyle={profile.ceo.avatarStyle}
                primaryColor={profile.primaryColor}
                secondaryColor={profile.secondaryColor}
                customAvatarDataUrl={profile.ceo.customAvatarDataUrl}
                size={compact ? 56 : 68}
              />
              <div className="text-xs">
                <div className="text-[10px] font-mono text-amber-400">
                  FONDATEUR & CEO
                </div>
                <div className="font-bold text-white">
                  {profile.ceo.firstName} {profile.ceo.lastName}
                </div>
                <div className="text-[11px] text-slate-300">
                  {archetypeMeta.title}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pied de carte : Badges de Sponsors & Impact Régional / Philosophie CEO */}
      {!compact && (
        <div className="p-4 bg-[#0B0F17]/70 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded bg-[#131B2E] border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400">
              BASSIN RÉGIONAL ({regionMeta.flagCode})
            </div>
            <div className="text-emerald-400 font-medium mt-0.5">
              {regionMeta.sponsorBonusLabel}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {regionMeta.scoutingPoolLabel}
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#131B2E] border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400">
              DOCTRINE DU CEO
            </div>
            <div className="text-sky-300 font-medium mt-0.5">
              {archetypeMeta.pros}
            </div>
            <div className="text-[11px] text-amber-300/90 mt-0.5">
              Contrepartie : {archetypeMeta.cons}
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#131B2E] border border-slate-800 flex flex-col justify-between">
            <div className="text-[10px] font-mono text-slate-400">
              BADGES SPONSORS & LIGUE D’ENTRÉE
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="px-2 py-0.5 rounded bg-[#0B0F17] border border-amber-500/40 text-[11px] font-mono text-amber-300">
                {profile.settings.divisionTier === 'REGIONAL_OPEN'
                  ? 'Division Régionale / Open'
                  : profile.settings.divisionTier === 'CHALLENGER_LEAGUE'
                    ? 'Challenger Tier'
                    : 'Ligue Majeure Impériale'}
              </span>
              {(activeSponsors.length > 0
                ? activeSponsors
                : [{id: 'sp_default', brandName: 'Hyperion Peripherals'}]
              ).map((sp) => (
                <span
                  key={sp.id}
                  className="px-2 py-0.5 rounded bg-[#0B0F17] border border-slate-700 text-[11px] font-mono text-slate-200"
                >
                  ★ {sp.brandName}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
