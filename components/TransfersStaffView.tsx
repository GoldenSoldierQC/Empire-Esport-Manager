'use client';

import React, {useState} from 'react';
import {
  EsportsPlayer,
  FacilityUpgrade,
  SponsorContract,
  StaffMember,
} from '@/lib/types';
import {computePlayerAverages} from '@/lib/tick-engine';
import {soundEngine} from '@/lib/sound';
import {
  Building2,
  Coins,
  Handshake,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from 'lucide-react';

interface TransfersStaffViewProps {
  roster: EsportsPlayer[];
  marketPlayers: EsportsPlayer[];
  staff: StaffMember[];
  facilities: FacilityUpgrade[];
  sponsors: SponsorContract[];
  teamBudget: number;
  onRecruitPlayer: (player: EsportsPlayer, negotiatedSalary: number) => void;
  onReleasePlayer: (playerId: string) => void;
  onToggleStaff: (staffId: string) => void;
  onUpgradeFacility: (facilityId: string) => void;
  onToggleSponsor: (sponsorId: string) => void;
}

export default function TransfersStaffView({
  roster,
  marketPlayers,
  staff,
  facilities,
  sponsors,
  teamBudget,
  onRecruitPlayer,
  onReleasePlayer,
  onToggleStaff,
  onUpgradeFacility,
  onToggleSponsor,
}: TransfersStaffViewProps) {
  const [salaryOfferMultiplier, setSalaryOfferMultiplier] = useState<
    Record<string, number>
  >({});

  const totalPlayerPayroll = roster.reduce(
    (sum, p) => sum + p.contract.monthlySalary,
    0
  );
  const totalStaffPayroll = staff
    .filter((s) => s.hired)
    .reduce((sum, s) => sum + s.monthlySalary, 0);
  const totalFacilityMaintenance = facilities.reduce(
    (sum, f) => sum + f.maintenanceMonthly * f.level,
    0
  );
  const totalSponsorIncome = sponsors
    .filter((sp) => sp.active)
    .reduce((sum, sp) => sum + sp.monthlyPayout, 0);

  const monthlyNetBalance =
    totalSponsorIncome -
    (totalPlayerPayroll + totalStaffPayroll + totalFacilityMaintenance);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
      {/* En-tête Financier & Bilan Mensuel */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums mb-1">
            <span>TRÉSORERIE : {teamBudget.toLocaleString('fr-FR')} €</span>
            <span aria-hidden="true">·</span>
            <span>
              MASSE SALARIALE : {(totalPlayerPayroll + totalStaffPayroll).toLocaleString('fr-FR')} €/MOIS
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={
                monthlyNetBalance >= 0 ? 'text-emerald-400' : 'text-amber-400'
              }
            >
              SOLDE MENSUEL : {monthlyNetBalance >= 0 ? '+' : ''}
              {monthlyNetBalance.toLocaleString('fr-FR')} €/MOIS
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
            style={{fontFamily: 'var(--font-cinzel), serif'}}
          >
            04. Marché des Transferts, Encadrement & Infrastructures
          </h1>
        </div>
      </div>

      {/* Section 1 : Scouting & Marché des Transferts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
            <div>
              <h2 className="text-base font-bold text-white">
                Marché des Transferts & Cellule de Scouting
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Négociez les clauses de rachat (buyout) et salaires. Attention : toute nouvelle
                recrue démarre avec une synergie basse (&lt;60%), appliquant un malus temporaire
                de cohésion de 12 % à 15 %.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {marketPlayers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-[#0B0F17] rounded-lg border border-slate-800">
                Tous les joueurs repérés sur le marché ont rejoint votre effectif. Utilisez le
                pipeline ETL dans l’onglet Architecture pour importer de nouveaux talents.
              </div>
            ) : (
              marketPlayers.map((mp) => {
                const avg = computePlayerAverages(mp);
                const mult = salaryOfferMultiplier[mp.id] || 1.0;
                const negotiatedSalary = Math.round(
                  mp.contract.monthlySalary * mult
                );
                const totalUpfront = mp.contract.buyoutClause + negotiatedSalary;
                const canAfford = teamBudget >= totalUpfront;

                return (
                  <div
                    key={mp.id}
                    className="p-4 rounded-lg bg-[#0B0F17] border border-slate-800 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">
                            {mp.handle}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({mp.fullName} · {mp.nationality} · {mp.age} ans)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums mt-0.5">
                          <span>{mp.elo} ELO</span>
                          <span aria-hidden="true">·</span>
                          <span>Rôle : {mp.role}</span>
                          <span aria-hidden="true">·</span>
                          <span>APM : {mp.careerStats.avgEffectiveApm}</span>
                        </div>
                      </div>

                      <div className="text-right font-mono tabular-nums">
                        <div className="text-sm font-bold text-amber-400">
                          Buyout : {mp.contract.buyoutClause.toLocaleString('fr-FR')} €
                        </div>
                        <div className="text-xs text-slate-300">
                          Salaire : {negotiatedSalary.toLocaleString('fr-FR')} €/mois · Prime{' '}
                          {mp.contract.prizeCutPercent}%
                        </div>
                      </div>
                    </div>

                    {/* Aperçu du vecteur 1-100 */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono tabular-nums">
                      <div>
                        <span className="text-slate-400">Micro:</span>{' '}
                        <span className="text-sky-400 font-semibold">{avg.microAvg}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Macro:</span>{' '}
                        <span className="text-emerald-400 font-semibold">{avg.macroAvg}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Tactique:</span>{' '}
                        <span className="text-amber-400 font-semibold">{avg.tacticalAvg}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Mental:</span>{' '}
                        <span className="text-purple-400 font-semibold">{avg.mentalAvg}</span>
                      </div>
                    </div>

                    {/* Négociation salariale & Signature */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                        <span className="text-slate-400">Offre salariale :</span>
                        <input
                          type="range"
                          min="0.9"
                          max="1.25"
                          step="0.05"
                          value={mult}
                          onChange={(e) =>
                            setSalaryOfferMultiplier({
                              ...salaryOfferMultiplier,
                              [mp.id]: parseFloat(e.target.value),
                            })
                          }
                          className="w-28 accent-[#D97706]"
                        />
                        <span className="text-white">{Math.round(mult * 100)}%</span>
                      </div>

                      <button
                        onClick={() => {
                          if (!canAfford) return;
                          soundEngine.playAgeUpFanfare();
                          onRecruitPlayer(mp, negotiatedSalary);
                        }}
                        disabled={!canAfford}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          canAfford
                            ? 'bg-[#D97706] hover:bg-[#B45309] text-white'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {canAfford
                          ? `Payer Clause & Signer (${totalUpfront.toLocaleString('fr-FR')} €)`
                          : 'Budget Insuffisant'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Gestion des Contrats Actuels & Encadrement Technique (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Staff Technique (Coach, Analyste, Psychologue du sport) */}
          <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Encadrement Technique & Psychologie du Sport
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Indispensable pour absorber le stress des Bo5 et accélérer la synergie.
              </p>
            </div>

            <div className="space-y-3">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-white">{member.name}</div>
                      <div className="text-xs text-amber-400 font-mono">
                        {member.specialtyLabel} · Note {member.skillRating}/100
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        soundEngine.playUiClick();
                        onToggleStaff(member.id);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        member.hired
                          ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                          : 'bg-[#D97706] hover:bg-[#B45309] text-white'
                      }`}
                    >
                      {member.hired
                        ? `En Poste (${member.monthlySalary} €/m)`
                        : `Recruter (${member.monthlySalary} €/m)`}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {member.effectDescription}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Contrats de l'Effectif Actuel */}
          <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-white">
              Contrats de l’Effectif Actif ({roster.length} joueurs)
            </h2>
            <div className="space-y-2.5">
              {roster.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded bg-[#0B0F17] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{p.handle}</span>
                    <span className="text-slate-400 ml-2 font-mono tabular-nums">
                      {p.contract.monthlySalary.toLocaleString('fr-FR')} €/mois ·{' '}
                      {p.contract.monthsRemaining} mois restants
                    </span>
                  </div>
                  {roster.length > 2 && (
                    <button
                      onClick={() => {
                        soundEngine.playUiClick();
                        onReleasePlayer(p.id);
                      }}
                      className="text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      Libérer
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 : Infrastructures Gaming House & Objectifs Sponsors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Infrastructures */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">
              Infrastructures & Gaming House
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Investissez dans vos installations pour réduire la dégradation de la fatigue.
            </p>
          </div>

          <div className="space-y-3">
            {facilities.map((fac) => {
              const isMax = fac.level >= fac.maxLevel;
              const canUpgrade = !isMax && teamBudget >= fac.upgradeCost;
              return (
                <div
                  key={fac.id}
                  className="p-4 rounded-lg bg-[#0B0F17] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{fac.name}</span>
                      <span className="text-xs font-mono text-amber-400 tabular-nums">
                        Niveau {fac.level}/{fac.maxLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{fac.bonusDescription}</p>
                  </div>

                  <button
                    onClick={() => {
                      if (!canUpgrade) return;
                      soundEngine.playAgeUpFanfare();
                      onUpgradeFacility(fac.id);
                    }}
                    disabled={!canUpgrade}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 font-mono tabular-nums ${
                      isMax
                        ? 'bg-slate-800 text-emerald-400 cursor-default'
                        : canUpgrade
                          ? 'bg-[#D97706] hover:bg-[#B45309] text-white'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isMax
                      ? 'Niveau Max'
                      : `Améliorer (${fac.upgradeCost.toLocaleString('fr-FR')} €)`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sponsors */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">
              Portefeuille Sponsors & Objectifs de Saison
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Activez vos contrats partenaires et encaissez les primes de victoire en tournoi.
            </p>
          </div>

          <div className="space-y-3">
            {sponsors.map((sp) => (
              <div
                key={sp.id}
                className="p-4 rounded-lg bg-[#0B0F17] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{sp.brandName}</span>
                    <span className="text-xs text-slate-400">({sp.sector})</span>
                  </div>
                  <p className="text-xs text-slate-300">{sp.objectiveDescription}</p>
                  <div className="text-xs font-mono text-emerald-400 tabular-nums">
                    Dotation : {sp.monthlyPayout.toLocaleString('fr-FR')} €/mois · Prime victoire :{' '}
                    +{sp.winBonus.toLocaleString('fr-FR')} €
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundEngine.playUiClick();
                    onToggleSponsor(sp.id);
                  }}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    sp.active
                      ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  {sp.active ? 'Contrat Actif' : 'Signer Partenariat'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
