'use client';

import React, {useEffect, useRef} from 'react';
import {LiveMatchState, RtsMap, UnitCategory} from '@/lib/types';
import {soundEngine} from '@/lib/sound';

interface PixelRtsCanvasProps {
  matchState?: LiveMatchState | null;
  mapData?: RtsMap;
  cinematicMode?: boolean;
  onCanvasUnitInspect?: (info: {
    side: 'BLUE' | 'RED';
    label: string;
    detail: string;
  }) => void;
}

interface VisualUnit {
  id: number;
  side: 'BLUE' | 'RED';
  category: UnitCategory | 'VILLAGER' | 'SCOUT';
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  hitFlashTimer: number;
  attackCooldown: number;
  squash: number;
  carryingResource?: 'WOOD' | 'GOLD' | 'FOOD' | 'STONE';
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Projectile {
  active: boolean;
  x: number;
  y: number;
  tx: number;
  ty: number;
  progress: number;
  speed: number;
  isSiege: boolean;
  side: 'BLUE' | 'RED';
}

export default function PixelRtsCanvas({
  matchState,
  mapData,
  cinematicMode = false,
  onCanvasUnitInspect,
}: PixelRtsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchStateRef = useRef<LiveMatchState | null | undefined>(matchState);
  const mapRef = useRef<RtsMap | undefined>(mapData);
  const inspectCallbackRef = useRef(onCanvasUnitInspect);

  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  useEffect(() => {
    mapRef.current = mapData;
  }, [mapData]);

  useEffect(() => {
    inspectCallbackRef.current = onCanvasUnitInspect;
  }, [onCanvasUnitInspect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Échelle ×5 : Surface effective considérablement agrandie (3600 × 2200)
    const WORLD_W = 3600;
    const WORLD_H = 2200;
    const BLUE_TC_X = 480;
    const BLUE_TC_Y = 1100;
    const RED_TC_X = 3120;
    const RED_TC_Y = 1100;

    // État de la caméra et des entrées maintenues (WASD / Flèches)
    const camera = {
      x: 120,
      y: 620,
      shakeTimer: 0,
      shakeIntensity: 0,
    };

    const heldKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      heldKeys.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      heldKeys.delete(e.code);
    };

    const handleBlur = () => {
      heldKeys.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    // Génération déterministe des éléments sur la carte Échelle ×5 (forêts, or espacé, pierre, reliques)
    const trees: Array<{x: number; y: number; shade: string}> = [];
    const goldNodes: Array<{x: number; y: number}> = [];
    const stoneNodes: Array<{x: number; y: number}> = [];
    const relicNodes: Array<{x: number; y: number}> = [
      {x: 1180, y: 520},
      {x: 1180, y: 1680},
      {x: 1800, y: 420},
      {x: 1800, y: 1100},
      {x: 1800, y: 1780},
      {x: 2420, y: 520},
      {x: 2420, y: 1680},
    ];

    for (let i = 0; i < 240; i++) {
      const angle = (i / 240) * Math.PI * 2;
      const dist = 780 + (i % 9) * 85;
      const tx = Math.cos(angle) * dist * 1.45 + WORLD_W / 2;
      const ty = Math.sin(angle) * dist * 0.85 + WORLD_H / 2;
      if (tx > 80 && tx < WORLD_W - 80 && ty > 80 && ty < WORLD_H - 80) {
        trees.push({
          x: Math.round(tx / 8) * 8,
          y: Math.round(ty / 8) * 8,
          shade: i % 2 === 0 ? '#164E35' : '#1E6040',
        });
      }
    }

    // Massifs forestiers espacés sur la carte ×5 (augmente la distance de trajet des bûcherons)
    const clusterCoords = [
      {cx: 320, cy: 680},
      {cx: 340, cy: 1520},
      {cx: 880, cy: 760},
      {cx: 920, cy: 1440},
      {cx: 1520, cy: 620},
      {cx: 1520, cy: 1580},
      {cx: 2080, cy: 620},
      {cx: 2080, cy: 1580},
      {cx: 2720, cy: 760},
      {cx: 2680, cy: 1440},
      {cx: 3280, cy: 680},
      {cx: 3260, cy: 1520},
    ];
    clusterCoords.forEach((c, idx) => {
      for (let j = 0; j < 22; j++) {
        trees.push({
          x: c.cx + ((j * 23) % 130) - 65,
          y: c.cy + ((j * 31) % 100) - 50,
          shade: (idx + j) % 2 === 0 ? '#14532D' : '#166534',
        });
      }
    });

    // Gisements d'or principaux et secondaires espacés (Échelle ×5)
    const goldClusters = [
      {gx: 720, gy: 860},
      {gx: 760, gy: 1360},
      {gx: 1350, gy: 980},
      {gx: 1800, gy: 1080},
      {gx: 2250, gy: 1220},
      {gx: 2880, gy: 860},
      {gx: 2840, gy: 1360},
    ];
    goldClusters.forEach((gc) => {
      goldNodes.push(
        {x: gc.gx, y: gc.gy},
        {x: gc.gx + 22, y: gc.gy + 14},
        {x: gc.gx - 18, y: gc.gy + 18},
        {x: gc.gx + 10, y: gc.gy - 16}
      );
    });

    // Gisements de pierre espacés
    const stoneClusters = [
      {sx: 640, sy: 1420},
      {sx: 1280, sy: 1380},
      {sx: 2320, sy: 820},
      {sx: 2960, sy: 1420},
    ];
    stoneClusters.forEach((sc) => {
      stoneNodes.push(
        {x: sc.sx, y: sc.sy},
        {x: sc.sx + 20, y: sc.sy + 14},
        {x: sc.sx - 16, y: sc.sy + 12}
      );
    });

    // Pool de particules et projectiles
    const particles: Particle[] = Array.from({length: 160}, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      color: '#FBBF24',
      size: 4,
    }));

    const projectiles: Projectile[] = Array.from({length: 70}, () => ({
      active: false,
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      progress: 0,
      speed: 2.5,
      isSiege: false,
      side: 'BLUE',
    }));

    const spawnParticles = (x: number, y: number, color: string, count: number, size = 4) => {
      let spawned = 0;
      for (const p of particles) {
        if (!p.active && spawned < count) {
          p.active = true;
          p.x = x;
          p.y = y;
          const angle = Math.random() * Math.PI * 2;
          const spd = 25 + Math.random() * 85;
          p.vx = Math.cos(angle) * spd;
          p.vy = Math.sin(angle) * spd;
          p.life = 0;
          p.maxLife = 0.25 + Math.random() * 0.35;
          p.color = color;
          p.size = size;
          spawned++;
        }
      }
    };

    const spawnProjectile = (
      x: number,
      y: number,
      tx: number,
      ty: number,
      side: 'BLUE' | 'RED',
      isSiege: boolean
    ) => {
      for (const proj of projectiles) {
        if (!proj.active) {
          proj.active = true;
          proj.x = x;
          proj.y = y;
          proj.tx = tx;
          proj.ty = ty;
          proj.progress = 0;
          proj.speed = isSiege ? 1.35 : 3.2;
          proj.isSiege = isSiege;
          proj.side = side;
          break;
        }
      }
    };

    const units: VisualUnit[] = [];
    let unitIdCounter = 1;
    let hitstopTimer = 0;
    let lastSoundTimestamp = 0;

    // Synchronisation des unités visuelles (incluant l'Éclaireur obligatoire SCOUT)
    const syncUnitsWithMatch = () => {
      const m = matchStateRef.current;
      const desiredBlueVils = m ? Math.min(22, Math.max(6, Math.floor(m.blue.villagers / 5))) : 12;
      const desiredRedVils = m ? Math.min(22, Math.max(6, Math.floor(m.red.villagers / 5))) : 12;
      const desiredBlueScouts = m ? Math.max(1, m.blue.scoutsCount) : 2;
      const desiredRedScouts = m ? Math.max(1, m.red.scoutsCount) : 2;

      const ensureCount = (
        side: 'BLUE' | 'RED',
        category: VisualUnit['category'],
        desired: number
      ) => {
        const current = units.filter((u) => u.side === side && u.category === category);
        if (current.length < desired) {
          const toAdd = desired - current.length;
          for (let i = 0; i < toAdd; i++) {
            const baseX = side === 'BLUE' ? BLUE_TC_X : RED_TC_X;
            const baseY = BLUE_TC_Y + (Math.random() - 0.5) * 320;
            units.push({
              id: unitIdCounter++,
              side,
              category,
              x: baseX + (Math.random() - 0.5) * 110,
              y: baseY,
              vx: 0,
              vy: 0,
              targetX:
                category === 'VILLAGER'
                  ? side === 'BLUE'
                    ? 720
                    : 2880
                  : category === 'SCOUT'
                    ? side === 'BLUE'
                      ? RED_TC_X - 240
                      : BLUE_TC_X + 240
                    : WORLD_W / 2,
              targetY: BLUE_TC_Y + (Math.random() - 0.5) * 420,
              hp: category === 'SIEGE' ? 160 : category === 'SCOUT' ? 95 : 70,
              maxHp: category === 'SIEGE' ? 160 : category === 'SCOUT' ? 95 : 70,
              hitFlashTimer: 0,
              attackCooldown: Math.random() * 0.8,
              squash: 1,
              carryingResource:
                category === 'VILLAGER'
                  ? (['WOOD', 'GOLD', 'FOOD', 'STONE'][i % 4] as
                      | 'WOOD'
                      | 'GOLD'
                      | 'FOOD'
                      | 'STONE')
                  : undefined,
            });
          }
        } else if (current.length > desired) {
          let toRemove = current.length - desired;
          for (let i = units.length - 1; i >= 0 && toRemove > 0; i--) {
            if (units[i].side === side && units[i].category === category) {
              spawnParticles(
                units[i].x,
                units[i].y,
                side === 'BLUE' ? '#60A5FA' : '#F87171',
                6,
                4
              );
              units.splice(i, 1);
              toRemove--;
            }
          }
        }
      };

      ensureCount('BLUE', 'SCOUT', desiredBlueScouts);
      ensureCount('RED', 'SCOUT', desiredRedScouts);
      ensureCount('BLUE', 'VILLAGER', desiredBlueVils);
      ensureCount('RED', 'VILLAGER', desiredRedVils);

      const categories: UnitCategory[] = ['INFANTRY', 'ARCHERS', 'CAVALRY', 'SIEGE', 'MONKS'];
      categories.forEach((cat) => {
        const bCount = m
          ? Math.min(14, Math.ceil(m.blue.militaryUnits[cat] * 0.65))
          : cat === 'CAVALRY' || cat === 'ARCHERS'
            ? 5
            : 2;
        const rCount = m
          ? Math.min(14, Math.ceil(m.red.militaryUnits[cat] * 0.65))
          : cat === 'CAVALRY' || cat === 'INFANTRY'
            ? 5
            : 2;
        ensureCount('BLUE', cat, bCount);
        ensureCount('RED', cat, rCount);
      });
    };

    syncUnitsWithMatch();

    // Gestion du clic sur la Minimap (×5) ou sur une unité du monde
    const handleCanvasClick = (e: MouseEvent) => {
      if (cinematicMode) return;
      const rect = canvas.getBoundingClientRect();
      const screenX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const screenY = (e.clientY - rect.top) * (canvas.height / rect.height);

      // Clic dans la Minimap Tactique (coin inférieur gauche : 16, canvas.height - 230, 220x135)
      const mmX = 16;
      const mmY = canvas.height - 225;
      const mmW = 220;
      const mmH = 134;
      if (
        screenX >= mmX &&
        screenX <= mmX + mmW &&
        screenY >= mmY &&
        screenY <= mmY + mmH
      ) {
        const normX = (screenX - mmX) / mmW;
        const normY = (screenY - mmY) / mmH;
        camera.x = Math.max(
          0,
          Math.min(WORLD_W - canvas.width, normX * WORLD_W - canvas.width / 2)
        );
        camera.y = Math.max(
          0,
          Math.min(WORLD_H - canvas.height, normY * WORLD_H - canvas.height / 2)
        );
        soundEngine.playUiClick();
        return;
      }

      const clickX = screenX + camera.x;
      const clickY = screenY + camera.y;

      spawnParticles(clickX, clickY, '#F59E0B', 8, 3);
      soundEngine.playUiClick();

      if (Math.hypot(clickX - BLUE_TC_X, clickY - BLUE_TC_Y) < 75) {
        inspectCallbackRef.current?.({
          side: 'BLUE',
          label: 'Forum Impérial (Joueur Bleu)',
          detail: `Centre économique fortifié · PV ${matchStateRef.current?.blue.townCenterHp ?? 6500}/${matchStateRef.current?.blue.maxTownCenterHp ?? 6500}`,
        });
        return;
      }
      if (Math.hypot(clickX - RED_TC_X, clickY - RED_TC_Y) < 75) {
        inspectCallbackRef.current?.({
          side: 'RED',
          label: 'Forum Impérial (Adversaire Rouge)',
          detail: `Centre économique adverse · PV ${matchStateRef.current?.red.townCenterHp ?? 6500}/${matchStateRef.current?.red.maxTownCenterHp ?? 6500}`,
        });
        return;
      }

      const clickedUnit = units.find((u) => Math.hypot(u.x - clickX, u.y - clickY) < 30);
      if (clickedUnit) {
        inspectCallbackRef.current?.({
          side: clickedUnit.side,
          label:
            clickedUnit.category === 'SCOUT'
              ? `Éclaireur de Reconnaissance (${clickedUnit.side === 'BLUE' ? 'Bleu' : 'Rouge'})`
              : `Escouade ${clickedUnit.category} (${clickedUnit.side === 'BLUE' ? 'Bleu' : 'Rouge'})`,
          detail: `Carte ×5 Pos (${Math.round(clickedUnit.x)}, ${Math.round(clickedUnit.y)}) · PV ${Math.round(clickedUnit.hp)}/${clickedUnit.maxHp}`,
        });
      }
    };

    canvas.addEventListener('click', handleCanvasClick);

    let lastTime = performance.now();
    let animFrameId: number;
    let syncAccumulator = 0;
    let cinematicAngle = 0;

    const renderLoop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = Math.max(640, canvas.clientWidth);
        canvas.height = Math.max(360, canvas.clientHeight);
      }

      syncAccumulator += dt;
      if (syncAccumulator > 0.45) {
        syncUnitsWithMatch();
        syncAccumulator = 0;
      }

      // Contrôle caméra sur la carte ×5 (3600 × 2200)
      if (cinematicMode) {
        cinematicAngle += dt * 0.18;
        camera.x =
          WORLD_W / 2 -
          canvas.width / 2 +
          Math.cos(cinematicAngle) * Math.min(950, (WORLD_W - canvas.width) * 0.4);
        camera.y =
          WORLD_H / 2 -
          canvas.height / 2 +
          Math.sin(cinematicAngle * 0.8) * Math.min(480, (WORLD_H - canvas.height) * 0.38);
      } else {
        const camSpeed = 680 * dt;
        if (heldKeys.has('KeyW') || heldKeys.has('ArrowUp')) camera.y -= camSpeed;
        if (heldKeys.has('KeyS') || heldKeys.has('ArrowDown')) camera.y += camSpeed;
        if (heldKeys.has('KeyA') || heldKeys.has('ArrowLeft')) camera.x -= camSpeed;
        if (heldKeys.has('KeyD') || heldKeys.has('ArrowRight')) camera.x += camSpeed;

        camera.x = Math.max(0, Math.min(WORLD_W - canvas.width, camera.x));
        camera.y = Math.max(0, Math.min(WORLD_H - canvas.height, camera.y));
      }

      if (hitstopTimer > 0) {
        hitstopTimer -= dt;
      } else {
        const m = matchStateRef.current;
        const isPaused = m?.status === 'PAUSED' || m?.status === 'FINISHED';

        if (!isPaused) {
          // Calcul de la ligne de front dynamique sur la carte ×5
          const blueTransit = m ? m.blue.armyTransitProgress / 100 : 0.7;
          const redTransit = m ? m.red.armyTransitProgress / 100 : 0.7;
          const frontLineX = m
            ? BLUE_TC_X +
              (RED_TC_X - BLUE_TC_X) *
                Math.max(
                  0.18,
                  Math.min(
                    0.82,
                    0.5 +
                      ((m.blue.effectiveMilitaryForce * blueTransit -
                        m.red.effectiveMilitaryForce * redTransit) /
                        Math.max(
                          30,
                          m.blue.effectiveMilitaryForce + m.red.effectiveMilitaryForce
                        )) *
                        0.38
                  )
                )
            : WORLD_W / 2;

          for (const u of units) {
            if (u.hitFlashTimer > 0) u.hitFlashTimer -= dt;
            if (u.squash > 1) u.squash = Math.max(1, u.squash - dt * 2.5);

            if (u.category === 'VILLAGER') {
              // Trajets de récolte allongés sur la carte ×5
              const tcX = u.side === 'BLUE' ? BLUE_TC_X : RED_TC_X;
              const tcY = BLUE_TC_Y;
              const resX =
                u.carryingResource === 'GOLD'
                  ? u.side === 'BLUE'
                    ? 720
                    : 2880
                  : u.carryingResource === 'STONE'
                    ? u.side === 'BLUE'
                      ? 640
                      : 2960
                    : u.carryingResource === 'WOOD'
                      ? u.side === 'BLUE'
                        ? 330
                        : 3270
                      : u.side === 'BLUE'
                        ? BLUE_TC_X
                        : RED_TC_X;
              const resY =
                u.carryingResource === 'GOLD'
                  ? 860
                  : u.carryingResource === 'STONE'
                    ? 1420
                    : u.carryingResource === 'WOOD'
                      ? 690
                      : 1100;

              if (Math.hypot(u.x - u.targetX, u.y - u.targetY) < 16) {
                if (Math.hypot(u.targetX - tcX, u.targetY - tcY) < 35) {
                  u.targetX = resX + (Math.random() - 0.5) * 40;
                  u.targetY = resY + (Math.random() - 0.5) * 40;
                } else {
                  u.targetX = tcX + (Math.random() - 0.5) * 28;
                  u.targetY = tcY + (Math.random() - 0.5) * 28;
                  spawnParticles(u.x, u.y, '#FBBF24', 2, 2);
                }
              }
              const angle = Math.atan2(u.targetY - u.y, u.targetX - u.x);
              u.x += Math.cos(angle) * 62 * dt;
              u.y += Math.sin(angle) * 62 * dt;
            } else if (u.category === 'SCOUT') {
              // Unité d'Éclaireur obligatoire : traverse activement la carte ×5 pour lever le Brouillard de Guerre
              if (Math.hypot(u.x - u.targetX, u.y - u.targetY) < 40) {
                const enemyTcX = u.side === 'BLUE' ? RED_TC_X : BLUE_TC_X;
                // Patrouille entre le centre, les reliques et la périphérie de la base ennemie
                u.targetX =
                  Math.random() < 0.55
                    ? enemyTcX + (u.side === 'BLUE' ? -280 : 280) + (Math.random() - 0.5) * 220
                    : WORLD_W / 2 + (Math.random() - 0.5) * 900;
                u.targetY = 450 + Math.random() * 1300;
              }
              const angle = Math.atan2(u.targetY - u.y, u.targetX - u.x);
              u.x += Math.cos(angle) * 145 * dt;
              u.y += Math.sin(angle) * 145 * dt;
            } else {
              // Règle stricte du Brouillard de Guerre :
              // Aucun ciblage ou attaque militaire directe tant que l'ennemi n'est pas révélé par le scouting !
              const ownSideState = u.side === 'BLUE' ? m?.blue : m?.red;
              const canTargetEnemy =
                cinematicMode || !m?.fogOfWarEnabled || (ownSideState?.enemyRevealed ?? true);

              if (!canTargetEnemy) {
                // Patrouille défensive autour de sa propre base en attendant le rapport de l'Éclaireur
                const guardX =
                  (u.side === 'BLUE' ? BLUE_TC_X + 260 : RED_TC_X - 260) +
                  Math.cos(u.id + now * 0.001) * 90;
                const guardY = BLUE_TC_Y + Math.sin(u.id * 1.3 + now * 0.001) * 240;
                const angle = Math.atan2(guardY - u.y, guardX - u.x);
                u.x += Math.cos(angle) * 55 * dt;
                u.y += Math.sin(angle) * 55 * dt;
                continue;
              }

              // Une fois l'ennemi révélé, recherche de cible et traversée de la Rush Distance
              let nearestEnemy: VisualUnit | null = null;
              let minDist = 9999;
              for (const other of units) {
                if (other.side !== u.side && other.category !== 'VILLAGER') {
                  const d = Math.hypot(other.x - u.x, other.y - u.y);
                  if (d < minDist) {
                    minDist = d;
                    nearestEnemy = other;
                  }
                }
              }

              const attackRange =
                u.category === 'ARCHERS'
                  ? 155
                  : u.category === 'SIEGE'
                    ? 230
                    : u.category === 'MONKS'
                      ? 135
                      : 30;

              if (nearestEnemy && minDist <= attackRange) {
                u.attackCooldown -= dt;
                if (u.attackCooldown <= 0) {
                  u.attackCooldown = u.category === 'SIEGE' ? 1.8 : 0.75 + Math.random() * 0.3;
                  u.squash = 1.32;
                  nearestEnemy.hitFlashTimer = 0.14;

                  if (u.category === 'ARCHERS' || u.category === 'SIEGE') {
                    spawnProjectile(
                      u.x,
                      u.y,
                      nearestEnemy.x,
                      nearestEnemy.y,
                      u.side,
                      u.category === 'SIEGE'
                    );
                  } else {
                    spawnParticles(nearestEnemy.x, nearestEnemy.y, '#FDE047', 4, 3);
                    if (!cinematicMode && now - lastSoundTimestamp > 380) {
                      soundEngine.playSwordClash();
                      lastSoundTimestamp = now;
                    }
                  }
                }
              } else {
                const desiredX = nearestEnemy
                  ? nearestEnemy.x
                  : frontLineX + (u.side === 'BLUE' ? -40 : 40);
                const desiredY = nearestEnemy
                  ? nearestEnemy.y
                  : BLUE_TC_Y + Math.sin(u.id * 1.7 + now * 0.001) * 260;
                const angle = Math.atan2(desiredY - u.y, desiredX - u.x);
                const speed =
                  u.category === 'CAVALRY' ? 108 : u.category === 'SIEGE' ? 48 : 74;
                u.x += Math.cos(angle) * speed * dt;
                u.y += Math.sin(angle) * speed * dt;
              }
            }
          }

          // Mise à jour des projectiles
          for (const proj of projectiles) {
            if (!proj.active) continue;
            proj.progress += proj.speed * dt;
            if (proj.progress >= 1) {
              proj.active = false;
              if (proj.isSiege) {
                spawnParticles(proj.tx, proj.ty, '#F97316', 14, 5);
                camera.shakeTimer = 0.18;
                camera.shakeIntensity = 5;
                hitstopTimer = 0.045;
                if (!cinematicMode && now - lastSoundTimestamp > 450) {
                  soundEngine.playSiegeImpact();
                  lastSoundTimestamp = now;
                }
              } else {
                spawnParticles(proj.tx, proj.ty, '#E2E8F0', 4, 2);
              }
            }
          }

          // Mise à jour des particules
          for (const p of particles) {
            if (!p.active) continue;
            p.life += dt;
            if (p.life >= p.maxLife) {
              p.active = false;
            } else {
              p.x += p.vx * dt;
              p.y += p.vy * dt;
            }
          }
        }
      }

      // Décroissance du Camera Shake
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (camera.shakeTimer > 0) {
        camera.shakeTimer -= dt;
        shakeOffsetX = (Math.random() - 0.5) * camera.shakeIntensity * 2;
        shakeOffsetY = (Math.random() - 0.5) * camera.shakeIntensity * 2;
      }

      const m = matchStateRef.current;
      const fogActive = !cinematicMode && (m?.fogOfWarEnabled ?? false);
      const blueIntel = m?.blue.scoutingIntelPercent ?? 100;
      const blueEnemyRevealed = m?.blue.enemyRevealed ?? true;

      // Vérifie si un point (wx, wy) est dans le champ de vision Bleu sous Brouillard de Guerre
      const isPointVisibleToBlue = (wx: number, wy: number) => {
        if (!fogActive) return true;
        // Vision autour du Forum Bleu et des bâtiments alliés
        if (Math.hypot(wx - BLUE_TC_X, wy - BLUE_TC_Y) <= 560) return true;
        // Vision étendue progressive grâce au scouting
        const dynamicCenterVision = 320 + (blueIntel / 100) * 1450;
        if (Math.hypot(wx - BLUE_TC_X, wy - BLUE_TC_Y) <= dynamicCenterVision) return true;
        // Si l'Éclaireur a localisé la base ennemie, le secteur Rouge est révélé
        if (blueEnemyRevealed && Math.hypot(wx - RED_TC_X, wy - RED_TC_Y) <= 560) return true;
        // Vision directe autour des unités Bleues (notamment l'Éclaireur SCOUT)
        for (const u of units) {
          if (u.side === 'BLUE') {
            const sight = u.category === 'SCOUT' ? 380 : 230;
            if (Math.hypot(wx - u.x, wy - u.y) <= sight) return true;
          }
        }
        return false;
      };

      // --- RENDU PIXEL ART TOP-DOWN (CARTE ×5) ---
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#0D1912';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.translate(-Math.round(camera.x + shakeOffsetX), -Math.round(camera.y + shakeOffsetY));

      // 1. Grille de tuiles Pixel Art
      const tileSize = 32;
      const startCol = Math.max(0, Math.floor(camera.x / tileSize));
      const endCol = Math.min(
        Math.ceil(WORLD_W / tileSize),
        Math.ceil((camera.x + canvas.width) / tileSize) + 1
      );
      const startRow = Math.max(0, Math.floor(camera.y / tileSize));
      const endRow = Math.min(
        Math.ceil(WORLD_H / tileSize),
        Math.ceil((camera.y + canvas.height) / tileSize) + 1
      );

      const terrainType = mapRef.current?.terrainType || 'OPEN_PLAINS';

      for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
          const hash = (c * 37 + r * 17) % 7;
          if (terrainType === 'OPEN_PLAINS') {
            ctx.fillStyle = hash === 0 ? '#1B3B2B' : hash < 3 ? '#173325' : '#142C20';
          } else if (terrainType === 'CENTER_GOLD') {
            ctx.fillStyle = hash === 0 ? '#243822' : '#1B2D1B';
          } else {
            ctx.fillStyle = hash === 0 ? '#162E26' : '#11251E';
          }
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);

          if (hash === 1) {
            ctx.fillStyle = '#254D38';
            ctx.fillRect(c * tileSize + 8, r * tileSize + 12, 4, 4);
            ctx.fillRect(c * tileSize + 14, r * tileSize + 8, 4, 4);
          }
        }
      }

      // Plateaux / Collines stratégiques espacées (Bonus d'élévation sur carte ×5)
      const hills = [
        {hx: 1560, hy: 860, hw: 480, hh: 480},
        {hx: 1080, hy: 420, hw: 260, hh: 240},
        {hx: 2260, hy: 1520, hw: 260, hh: 240},
      ];
      hills.forEach((h) => {
        ctx.fillStyle = '#224230';
        ctx.fillRect(h.hx, h.hy, h.hw, h.hh);
        ctx.strokeStyle = '#335C45';
        ctx.lineWidth = 4;
        ctx.strokeRect(h.hx, h.hy, h.hw, h.hh);
      });

      // Grande route commerciale impériale traversant la carte ×5
      ctx.fillStyle = '#3E3124';
      ctx.fillRect(BLUE_TC_X, BLUE_TC_Y - 18, RED_TC_X - BLUE_TC_X, 36);
      ctx.fillStyle = '#4D3D2D';
      for (let rx = BLUE_TC_X + 20; rx < RED_TC_X - 20; rx += 32) {
        ctx.fillRect(rx, BLUE_TC_Y - 8, 14, 6);
        ctx.fillRect(rx + 10, BLUE_TC_Y + 6, 12, 4);
      }

      // Murs de pierre si Arena
      if (terrainType === 'CLOSED_FORTRESS') {
        ctx.fillStyle = '#64748B';
        ctx.fillRect(920, 620, 16, 420);
        ctx.fillRect(920, 1160, 16, 420);
        ctx.fillRect(2660, 620, 16, 420);
        ctx.fillRect(2660, 1160, 16, 420);
      }

      // 2. Gisements d'Or, Pierre & Reliques Sacrées
      for (const g of goldNodes) {
        ctx.fillStyle = '#78350F';
        ctx.fillRect(g.x - 10, g.y - 10, 20, 20);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(g.x - 8, g.y - 8, 12, 12);
        ctx.fillStyle = '#FDE68A';
        ctx.fillRect(g.x - 4, g.y - 4, 6, 6);
      }

      for (const s of stoneNodes) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(s.x - 10, s.y - 10, 20, 20);
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(s.x - 6, s.y - 6, 12, 12);
      }

      for (const rel of relicNodes) {
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(rel.x - 6, rel.y - 6, 12, 12);
        ctx.fillStyle = '#D97706';
        ctx.fillRect(rel.x - 2, rel.y - 9, 4, 18);
        ctx.fillRect(rel.x - 9, rel.y - 2, 18, 4);
      }

      // 3. Arbres en Pixel Art
      for (const t of trees) {
        if (
          t.x < camera.x - 40 ||
          t.x > camera.x + canvas.width + 40 ||
          t.y < camera.y - 40 ||
          t.y > camera.y + canvas.height + 40
        ) {
          continue;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(t.x - 8, t.y + 8, 20, 8);
        ctx.fillStyle = '#452719';
        ctx.fillRect(t.x - 3, t.y + 2, 6, 10);
        ctx.fillStyle = t.shade;
        ctx.fillRect(t.x - 12, t.y - 10, 24, 14);
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(t.x - 8, t.y - 16, 16, 8);
      }

      // 4. Bâtiments (Forums à PV étendus 6500+, Casernes, Châteaux)
      const drawTownCenter = (
        x: number,
        y: number,
        side: 'BLUE' | 'RED',
        age: number,
        hp: number,
        maxHp: number
      ) => {
        if (side === 'RED' && !isPointVisibleToBlue(x, y)) return;

        const primary = side === 'BLUE' ? '#2563EB' : '#DC2626';
        const highlight = side === 'BLUE' ? '#60A5FA' : '#F87171';

        const farmOffsets = [
          {fx: -88, fy: -76},
          {fx: -88, fy: 34},
          {fx: 34, fy: -76},
          {fx: 34, fy: 34},
        ];
        farmOffsets.forEach((f) => {
          ctx.fillStyle = '#3F4E26';
          ctx.fillRect(x + f.fx, y + f.fy, 52, 42);
          ctx.fillStyle = '#A16207';
          for (let row = 4; row < 38; row += 8) {
            ctx.fillRect(x + f.fx + 4, y + f.fy + row, 44, 3);
          }
        });

        ctx.fillStyle = '#1E293B';
        ctx.fillRect(x - 42, y - 38, 84, 76);
        ctx.fillStyle = '#475569';
        ctx.fillRect(x - 38, y - 34, 76, 68);

        ctx.fillStyle = primary;
        ctx.fillRect(x - 34, y - 30, 68, 36);
        ctx.fillStyle = highlight;
        ctx.fillRect(x - 24, y - 24, 48, 18);

        if (age >= 3) {
          ctx.fillStyle = '#F59E0B';
          ctx.fillRect(x - 8, y - 42, 16, 14);
        }

        const hpRatio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(x - 38, y - 50, 76, 8);
        ctx.fillStyle = hpRatio > 0.5 ? '#10B981' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444';
        ctx.fillRect(x - 37, y - 49, Math.round(74 * hpRatio), 6);
      };

      drawTownCenter(
        BLUE_TC_X,
        BLUE_TC_Y,
        'BLUE',
        m?.blue.age ?? 2,
        m?.blue.townCenterHp ?? 6500,
        m?.blue.maxTownCenterHp ?? 6500
      );
      drawTownCenter(
        RED_TC_X,
        RED_TC_Y,
        'RED',
        m?.red.age ?? 2,
        m?.red.townCenterHp ?? 6500,
        m?.red.maxTownCenterHp ?? 6500
      );

      const drawMilitaryBuilding = (
        x: number,
        y: number,
        side: 'BLUE' | 'RED',
        isCastle: boolean
      ) => {
        if (side === 'RED' && !isPointVisibleToBlue(x, y)) return;
        ctx.fillStyle = isCastle ? '#64748B' : '#334155';
        const w = isCastle ? 58 : 42;
        const h = isCastle ? 58 : 38;
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.fillStyle = side === 'BLUE' ? '#3B82F6' : '#EF4444';
        ctx.fillRect(x - w / 2 + 4, y - h / 2 + 4, w - 8, 10);
        if (isCastle) {
          ctx.fillStyle = '#94A3B8';
          ctx.fillRect(x - 28, y - 34, 12, 12);
          ctx.fillRect(x + 16, y - 34, 12, 12);
        }
      };

      drawMilitaryBuilding(BLUE_TC_X + 180, BLUE_TC_Y - 90, 'BLUE', false);
      drawMilitaryBuilding(BLUE_TC_X + 180, BLUE_TC_Y + 90, 'BLUE', false);
      if ((m?.blue.castlesBuilt ?? 0) > 0 || cinematicMode) {
        drawMilitaryBuilding(BLUE_TC_X + 340, BLUE_TC_Y - 50, 'BLUE', true);
      }

      drawMilitaryBuilding(RED_TC_X - 180, RED_TC_Y - 90, 'RED', false);
      drawMilitaryBuilding(RED_TC_X - 180, RED_TC_Y + 90, 'RED', false);
      if ((m?.red.castlesBuilt ?? 0) > 0 || cinematicMode) {
        drawMilitaryBuilding(RED_TC_X - 340, RED_TC_Y + 50, 'RED', true);
      }

      // 5. Rendu des Unités (masquées sous le Brouillard de Guerre si ennemies et hors vision)
      for (const u of units) {
        if (u.side === 'RED' && !isPointVisibleToBlue(u.x, u.y)) {
          continue;
        }

        ctx.save();
        ctx.translate(Math.round(u.x), Math.round(u.y));
        ctx.scale(u.squash, 2 - u.squash);

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(-6, 6, 12, 4);

        const teamColor =
          u.hitFlashTimer > 0
            ? '#FFFFFF'
            : u.side === 'BLUE'
              ? '#3B82F6'
              : '#EF4444';
        const trimColor =
          u.hitFlashTimer > 0
            ? '#FEF08A'
            : u.side === 'BLUE'
              ? '#93C5FD'
              : '#FCA5A5';

        if (u.category === 'SCOUT') {
          // Éclaireur rapide avec halo de reconnaissance doré
          ctx.strokeStyle = u.side === 'BLUE' ? 'rgba(56,189,248,0.45)' : 'rgba(248,113,113,0.45)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#92400E';
          ctx.fillRect(-9, -2, 18, 8);
          ctx.fillStyle = teamColor;
          ctx.fillRect(-4, -11, 8, 9);
          ctx.fillStyle = '#FACC15';
          ctx.fillRect(-2, -14, 5, 3); // Panache d'Éclaireur
        } else if (u.category === 'VILLAGER') {
          ctx.fillStyle = teamColor;
          ctx.fillRect(-4, -6, 8, 10);
          ctx.fillStyle = '#FDBA74';
          ctx.fillRect(-3, -10, 6, 4);
          if (u.carryingResource === 'GOLD') {
            ctx.fillStyle = '#FACC15';
            ctx.fillRect(3, -5, 5, 5);
          } else if (u.carryingResource === 'WOOD') {
            ctx.fillStyle = '#78350F';
            ctx.fillRect(3, -5, 6, 4);
          } else if (u.carryingResource === 'STONE') {
            ctx.fillStyle = '#94A3B8';
            ctx.fillRect(3, -5, 5, 5);
          }
        } else if (u.category === 'CAVALRY') {
          ctx.fillStyle = '#78350F';
          ctx.fillRect(-8, -2, 16, 8);
          ctx.fillStyle = teamColor;
          ctx.fillRect(-4, -10, 8, 9);
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(u.side === 'BLUE' ? 4 : -12, -8, 8, 2);
        } else if (u.category === 'SIEGE') {
          ctx.fillStyle = '#92400E';
          ctx.fillRect(-12, -8, 24, 14);
          ctx.fillStyle = teamColor;
          ctx.fillRect(-8, -6, 16, 6);
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(-10, 6, 6, 4);
          ctx.fillRect(4, 6, 6, 4);
        } else if (u.category === 'ARCHERS') {
          ctx.fillStyle = teamColor;
          ctx.fillRect(-4, -7, 8, 11);
          ctx.fillStyle = trimColor;
          ctx.fillRect(-3, -11, 6, 4);
          ctx.fillStyle = '#FDE047';
          ctx.fillRect(u.side === 'BLUE' ? 4 : -7, -6, 3, 8);
        } else {
          ctx.fillStyle = u.category === 'MONKS' ? '#F59E0B' : teamColor;
          ctx.fillRect(-5, -8, 10, 12);
          ctx.fillStyle = '#CBD5E1';
          ctx.fillRect(-3, -12, 6, 4);
        }

        ctx.restore();
      }

      // 6. Projectiles & Particules
      for (const proj of projectiles) {
        if (!proj.active) continue;
        const px = proj.x + (proj.tx - proj.x) * proj.progress;
        const arc = Math.sin(proj.progress * Math.PI) * (proj.isSiege ? 42 : 16);
        const py = proj.y + (proj.ty - proj.y) * proj.progress - arc;
        if (!isPointVisibleToBlue(px, py)) continue;

        if (proj.isSiege) {
          ctx.fillStyle = '#F97316';
          ctx.fillRect(px - 5, py - 5, 10, 10);
          ctx.fillStyle = '#FEF08A';
          ctx.fillRect(px - 2, py - 2, 4, 4);
        } else {
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(px - 3, py - 1, 6, 2);
        }
      }

      for (const p of particles) {
        if (!p.active) continue;
        if (!isPointVisibleToBlue(p.x, p.y)) continue;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }

      // 7. Rendu du Brouillard de Guerre (Fog of War) par tuiles tactiques
      if (fogActive) {
        const fogStep = 64;
        const fStartCol = Math.max(0, Math.floor(camera.x / fogStep));
        const fEndCol = Math.min(
          Math.ceil(WORLD_W / fogStep),
          Math.ceil((camera.x + canvas.width) / fogStep) + 1
        );
        const fStartRow = Math.max(0, Math.floor(camera.y / fogStep));
        const fEndRow = Math.min(
          Math.ceil(WORLD_H / fogStep),
          Math.ceil((camera.y + canvas.height) / fogStep) + 1
        );

        ctx.fillStyle = 'rgba(6, 10, 18, 0.78)';
        for (let fr = fStartRow; fr < fEndRow; fr++) {
          for (let fc = fStartCol; fc < fEndCol; fc++) {
            const cx = fc * fogStep + fogStep / 2;
            const cy = fr * fogStep + fogStep / 2;
            if (!isPointVisibleToBlue(cx, cy)) {
              ctx.fillRect(fc * fogStep, fr * fogStep, fogStep + 1, fogStep + 1);
            }
          }
        }
      }

      ctx.restore();

      // 8. Minimap Tactique Interactive (Échelle ×5 : 3600 × 2200) en bas à gauche
      if (!cinematicMode) {
        const mmX = 16;
        const mmY = canvas.height - 225;
        const mmW = 220;
        const mmH = 134;

        ctx.save();
        ctx.fillStyle = 'rgba(11, 15, 23, 0.92)';
        ctx.fillRect(mmX, mmY, mmW, mmH);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(mmX, mmY, mmW, mmH);

        // Reliques sur la minimap
        ctx.fillStyle = '#FACC15';
        relicNodes.forEach((rel) => {
          const rx = mmX + (rel.x / WORLD_W) * mmW;
          const ry = mmY + (rel.y / WORLD_H) * mmH;
          ctx.fillRect(rx - 1.5, ry - 1.5, 3, 3);
        });

        // Forum Bleu
        ctx.fillStyle = '#3B82F6';
        ctx.fillRect(
          mmX + (BLUE_TC_X / WORLD_W) * mmW - 4,
          mmY + (BLUE_TC_Y / WORLD_H) * mmH - 4,
          8,
          8
        );

        // Forum Rouge (affiché si révélé ou Fog désactivé)
        if (!fogActive || blueEnemyRevealed) {
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(
            mmX + (RED_TC_X / WORLD_W) * mmW - 4,
            mmY + (RED_TC_Y / WORLD_H) * mmH - 4,
            8,
            8
          );
        }

        // Unités sur la minimap
        for (const u of units) {
          if (u.side === 'RED' && fogActive && !isPointVisibleToBlue(u.x, u.y)) continue;
          ctx.fillStyle =
            u.category === 'SCOUT'
              ? '#FDE047'
              : u.side === 'BLUE'
                ? '#60A5FA'
                : '#F87171';
          const ux = mmX + (u.x / WORLD_W) * mmW;
          const uy = mmY + (u.y / WORLD_H) * mmH;
          ctx.fillRect(ux - 1.5, uy - 1.5, u.category === 'SCOUT' ? 4 : 2.5, u.category === 'SCOUT' ? 4 : 2.5);
        }

        // Voile de Brouillard sur la minimap si non exploré
        if (fogActive && !blueEnemyRevealed) {
          ctx.fillStyle = 'rgba(6, 10, 18, 0.72)';
          const shroudStartX = mmX + mmW * Math.min(0.75, 0.28 + (blueIntel / 100) * 0.48);
          ctx.fillRect(shroudStartX, mmY + 1, mmX + mmW - shroudStartX - 1, mmH - 2);
        }

        // Cadre de la caméra active
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(
          mmX + (camera.x / WORLD_W) * mmW,
          mmY + (camera.y / WORLD_H) * mmH,
          Math.min(mmW, (canvas.width / WORLD_W) * mmW),
          Math.min(mmH, (canvas.height / WORLD_H) * mmH)
        );

        // Légende Minimap
        ctx.fillStyle = '#94A3B8';
        ctx.font = '10px monospace';
        ctx.fillText(
          `CARTE ×5 (3600×2200) · ${fogActive ? `INTEL ${Math.round(blueIntel)}%` : 'VISION TOTALE'}`,
          mmX + 6,
          mmY + mmH - 6
        );
        ctx.restore();
      }

      animFrameId = requestAnimationFrame(renderLoop);
    };

    animFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [cinematicMode]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0B0F17]">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
        aria-label="Arène tactique RTS Pixel Art Échelle x5"
      />
    </div>
  );
}
