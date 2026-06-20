import { Card, GridUnit, Grid, BattleLog } from '../types';

export interface CombatEngagementResult {
  nextGrid: Grid;
  playerHQDmg: number;
  opponentHQDmg: number;
  logs: { message: string; tag: BattleLog['tag'] }[];
}

export interface MoveTriggersResult {
  nextGrid: Grid;
  activeTraps: any[];
  playerHQDmg: number;
  opponentHQDmg: number;
  logs: { message: string; tag: BattleLog['tag'] }[];
  soundEffect?: 'explosion' | null;
}

export interface DeployEffectsResult {
  nextGrid: Grid;
  activeTraps: any[];
  playerHQArmorDiff: number;
  opponentHQArmorDiff: number;
  logs: { message: string; tag: BattleLog['tag'] }[];
  soundEffect?: 'explosion' | null;
}

// --------------------------------------------------------------------------
// 1. PURE COMBAT ENGAGEMENT ENGINE
// --------------------------------------------------------------------------
export function resolveCombatEngagement(
  attackerInput: GridUnit,
  defenderInput: GridUnit,
  attPos: { r: number; c: number },
  defPos: { r: number; c: number },
  grid: Grid,
  isPlayerAttacking: boolean
): CombatEngagementResult {
  const nextGrid = grid.map((row) => [...row]);
  const logs: { message: string; tag: BattleLog['tag'] }[] = [];
  let playerHQDmg = 0;
  let opponentHQDmg = 0;

  // Clone attackers to avoid mutating outside objects
  const attacker = { ...attackerInput };
  const defender = { ...defenderInput };

  const isAttackerArmor = ['us_m113_acav', 'us_m48_patton', 'arvn_7th_armoured'].includes(attacker.id);
  const isDefenderArmor = ['us_m113_acav', 'us_m48_patton', 'arvn_7th_armoured'].includes(defender.id);

  // Initial Attack values
  let attAtk = attacker.atk;
  let defAtk = defender.atk;

  // 1. Synergy - 320th Steel Division (Heavy Armor Breakers: Deals +1 ATK vs armored units)
  if (attacker.id === 'nva_320th_steel' && isDefenderArmor) {
    attAtk += 1;
    logs.push({ message: `ARMOR BREAKER: 320th Steel Division deals +1 ATK vs Armored ${defender.name}.`, tag: 'BUFF' });
  }
  if (defender.id === 'nva_320th_steel' && isAttackerArmor) {
    defAtk += 1;
    logs.push({ message: `ARMOR BREAKER: 320th Steel Division defends with +1 ATK vs Armored ${attacker.name}.`, tag: 'BUFF' });
  }

  // 2. Synergy - Heavy Machine Gun Team (Anti-Air Flak: Deals x2 damage to Helicopters / Aircraft units)
  if (attacker.id === 'nva_hmg_team' && defender.unitType === 'Aircraft') {
    attAtk *= 2;
    logs.push({ message: `ANTI-AIR FLAK: Heavy Machine Gun Team deals x2 damage (${attAtk} ATK) vs Aircraft ${defender.name}!`, tag: 'BUFF' });
  }
  if (defender.id === 'nva_hmg_team' && attacker.unitType === 'Aircraft') {
    defAtk *= 2;
    logs.push({ message: `ANTI-AIR FLAK: Heavy Machine Gun Team defends with x2 damage (${defAtk} ATK) vs Aircraft ${attacker.name}!`, tag: 'BUFF' });
  }

  // 3. Synergy - 9th Riverines (+2 ATK inside row index 1 / Conflict Zone)
  if (attacker.id === 'us_9th_riverines' && attPos.r === 1) {
    attAtk += 2;
    logs.push({ message: `SWAMP MASTERY: 9th Riverines gains +2 ATK in the Conflict Zone.`, tag: 'BUFF' });
  }
  if (defender.id === 'us_9th_riverines' && defPos.r === 1) {
    defAtk += 2;
    logs.push({ message: `SWAMP MASTERY: 9th Riverines defends with +2 ATK in the Conflict Zone.`, tag: 'BUFF' });
  }

  let attackerDef = attacker.def;
  let defenderDef = defender.def;

  // 4. Combat damage assignment & retaliation exemption
  let attackerDmgTaken = defAtk;
  let defenderDmgTaken = attAtk;

  if (attacker.unitType === 'Artillery') {
    attackerDmgTaken = 0; // artillery takes no retaliation when attacking
  } else if (attacker.unitType === 'Aircraft') {
    if (defender.unitType === 'Infantry') {
      attackerDmgTaken = Math.ceil(defAtk * 0.5); // aircraft takes half damage from infantry
    }
  }

  if (defender.unitType === 'Artillery') {
    attackerDmgTaken = 0; // cannot retaliate core melee
  }

  // 5. First-Strike AMBUSH Synergy (Local Guerrilla Cell): Always deals damage first, neutralizing melee
  const isMelee = (u: GridUnit) => u.unitType === 'Infantry' || u.unitType === 'Tank';
  let isAmbushTriggered = false;

  if (defender.id === 'vc_guerrilla_cell' && isMelee(attacker) && attacker.unitType !== 'Aircraft' && attacker.unitType !== 'Artillery') {
    isAmbushTriggered = true;
    logs.push({ message: `AMBUSH! Local Guerrilla Cell triggers defensive first-strike vs ${attacker.name}!`, tag: 'BUFF' });
    attackerDef -= attackerDmgTaken;
    if (attackerDef > 0) {
      defenderDef -= defenderDmgTaken;
    } else {
      logs.push({ message: `AMBUSH SUCCESS! ${attacker.name} was neutralized in the bush before returning fire.`, tag: 'DEATH' });
      defenderDmgTaken = 0;
    }
  } else if (attacker.id === 'vc_guerrilla_cell' && isMelee(defender) && attacker.unitType !== 'Aircraft' && attacker.unitType !== 'Artillery') {
    isAmbushTriggered = true;
    logs.push({ message: `AMBUSH! Local Guerrilla Cell triggers offensive first-strike vs ${defender.name}!`, tag: 'BUFF' });
    defenderDef -= defenderDmgTaken;
    if (defenderDef > 0) {
      attackerDef -= attackerDmgTaken;
    } else {
      logs.push({ message: `AMBUSH SUCCESS! Blockade ${defender.name} was eliminated before reacting.`, tag: 'DEATH' });
      attackerDmgTaken = 0;
    }
  }

  if (!isAmbushTriggered) {
    // Escort - 7th Armored Cav (reduces ranged and incoming artillery/airstrike damage taken by 1)
    const isRangedAttacker = attacker.unitType === 'Artillery' || attacker.unitType === 'Aircraft';
    if (defender.id === 'arvn_7th_armoured' && isRangedAttacker) {
      defenderDmgTaken = Math.max(0, defenderDmgTaken - 1);
      logs.push({ message: `ESCORT: 7th Armored Cav heavy steel armor reduces all ranged and incoming artillery/airstrike damage taken by 1 point.`, tag: 'BUFF' });
    }
    const isRangedDefender = defender.unitType === 'Artillery' || defender.unitType === 'Aircraft';
    if (attacker.id === 'arvn_7th_armoured' && isRangedDefender) {
      attackerDmgTaken = Math.max(0, attackerDmgTaken - 1);
      logs.push({ message: `ESCORT: 7th Armored Cav heavy steel armor reduces all ranged and incoming artillery/airstrike damage taken by 1 point.`, tag: 'BUFF' });
    }

    defenderDef -= defenderDmgTaken;
    attackerDef -= attackerDmgTaken;
  }

  // 6. Synergy - M48 Patton (Overkill Excess damage direct to enemy HQ Base)
  if (attacker.id === 'us_m48_patton' && defenderDef < 0) {
    const overkill = Math.abs(defenderDef);
    if (isPlayerAttacking) {
      opponentHQDmg = overkill;
      logs.push({ message: `OVERKILL! Allied M48 Patton blast ripples directly to Opponent HQ for ${overkill} damage!`, tag: 'HQ' });
    } else {
      playerHQDmg = overkill;
      logs.push({ message: `OVERKILL! Enemy M48 Patton blast ripples directly to player HQ for ${overkill} damage!`, tag: 'HQ' });
    }
  }

  // Apply values to modified objects
  attacker.def = attackerDef;
  defender.def = defenderDef;

  const createAcavSquad = (): GridUnit => ({
    id: 'us_acav_squad',
    name: 'ACAV Squad',
    faction: 'US',
    k: 0,
    o: 1,
    atk: 2,
    def: 2,
    maxDef: 2,
    type: 'Unit',
    unitType: 'Infantry',
    rarity: 'Common',
    ability: 'Deployed from destroyed M113 ACAV.',
    artworkKeyword: 'screaming_eagles',
    instanceId: `acav-squad-${Date.now()}-${Math.random()}`,
    hasMovedOrAttackedThisTurn: true,
    hasMovedThisTurn: true,
    hasAttackedThisTurn: true,
    camouflage: false,
    frozenTurns: 0,
    armor: 0,
    isAmphibious: false,
  });

  // 7. Resolve Defender demise
  if (defenderDef <= 0) {
    logs.push({ message: `${defender.name} was neutralized in direct engagement.`, tag: 'DEATH' });
    nextGrid[defPos.r][defPos.c] = null;
    if (defender.id === 'us_m113_acav') {
      nextGrid[defPos.r][defPos.c] = createAcavSquad();
      logs.push({ message: `ACAV RESCUE: ACAV Squad deployed from wreckage of destroyed M113 Armor Carrier.`, tag: 'DEPLOY' });
    }

    // Special 'On Kill' Synergy - Green Beret (5th Special Forces: heals to full and unlocks another action)
    if (attacker.id === 'us_5th_specops' && attackerDef > 0) {
      attacker.def = attacker.maxDef;
      attacker.hasMovedOrAttackedThisTurn = false;
      attacker.hasMovedThisTurn = false;
      attacker.hasAttackedThisTurn = false;
      logs.push({ message: `GREEN BERETS: 5th Special Forces neutralized target, fully healed DEF, and gained extra turn movement action link!`, tag: 'BUFF' });
    }
  } else {
    nextGrid[defPos.r][defPos.c] = defender;
    // Battle Hardened - ARVN 1st Infantry gains permanently +1 ATK when surviving defending engagement
    if (defender.id === 'arvn_1st_infantry' && defenderDef > 0) {
      defender.baseAtk = (defender.baseAtk ?? defender.atk) + 1;
      defender.atk = defender.baseAtk;
      logs.push({ message: `BATTLE HARDENED: ARVN 1st Infantry survived attack, permanently gaining +1 ATK (Now ATK:${defender.atk})!`, tag: 'BUFF' });
    }
  }

  // 8. Resolve Attacker demise
  if (attackerDef <= 0) {
    logs.push({ message: `${attacker.name} fell in the line of duty.`, tag: 'DEATH' });
    nextGrid[attPos.r][attPos.c] = null;
    if (attacker.id === 'us_m113_acav') {
      nextGrid[attPos.r][attPos.c] = createAcavSquad();
      logs.push({ message: `ACAV RESCUE: ACAV Squad deployed from wreckage of destroyed M113 Armor Carrier.`, tag: 'DEPLOY' });
    }
  } else {
    nextGrid[attPos.r][attPos.c] = {
      ...attacker,
      hasAttackedThisTurn: attacker.id === 'us_5th_specops' ? attacker.hasAttackedThisTurn : true,
      hasMovedOrAttackedThisTurn: attacker.id === 'us_5th_specops' ? attacker.hasMovedOrAttackedThisTurn : true,
      hasMovedThisTurn: attacker.id === 'us_5th_specops' ? attacker.hasMovedThisTurn : true
    };
  }

  return {
    nextGrid,
    playerHQDmg,
    opponentHQDmg,
    logs
  };
}

// --------------------------------------------------------------------------
// 2. PURE MOVEMENT TRIGGER ENGINE
// --------------------------------------------------------------------------
export function checkMoveTriggers(
  r: number,
  c: number,
  activeUnitInput: GridUnit,
  grid: Grid,
  isPlayerMoving: boolean,
  activeTraps: any[],
  faction: 'USA' | 'NVA',
  playerSideFactions: string[]
): MoveTriggersResult {
  const nextGrid = grid.map((row) => [...row]);
  const logs: { message: string; tag: BattleLog['tag'] }[] = [];
  let playerHQDmg = 0;
  let opponentHQDmg = 0;
  let soundEffect: 'explosion' | null = null;
  let nextTraps = [...activeTraps];

  const activeUnit = { ...activeUnitInput };

  // A. Punji / Ambush Trap Mine triggers
  const isEnemyEnteringZone = r === 1 && !playerSideFactions.includes(activeUnit.faction);
  const isPlayerEnteringZone = r === 1 && playerSideFactions.includes(activeUnit.faction);

  if (r === 1) {
    if (isEnemyEnteringZone) {
      const isAmbushActive = nextTraps.some((t) => t.faction === faction && t.cardId === 'nva_trap_amber');
      if (isAmbushActive) {
        soundEffect = 'explosion';
        logs.push({
          message: `BOOM! Countermeasure: "Trận địa Phục kích" triggers! Punji bamboo stakes hit ${activeUnit.name} for 3 DEF damage!`,
          tag: 'ATTACK'
        });
        activeUnit.def -= 3;
        nextTraps = nextTraps.filter((t) => !(t.faction === faction && t.cardId === 'nva_trap_amber'));

        if (activeUnit.def <= 0) {
          logs.push({ message: `Enemy ${activeUnit.name} was neutralized by Amber Trap.`, tag: 'DEATH' });
          nextGrid[r][c] = null;
          return { nextGrid, activeTraps: nextTraps, playerHQDmg, opponentHQDmg, logs, soundEffect };
        } else {
          nextGrid[r][c] = activeUnit;
        }
      }
    } else if (isPlayerEnteringZone) {
      const isAmbushActive = nextTraps.some((t) => t.faction !== faction && t.cardId === 'nva_trap_amber');
      if (isAmbushActive) {
        soundEffect = 'explosion';
        logs.push({
          message: `BOOM! Enemy Countermeasure: "Trận địa Phục kích" triggers! Punji spike traps hit ${activeUnit.name} for 3 DEF damage!`,
          tag: 'ATTACK'
        });
        activeUnit.def -= 3;
        nextTraps = nextTraps.filter((t) => !(t.faction !== faction && t.cardId === 'nva_trap_amber'));

        if (activeUnit.def <= 0) {
          logs.push({ message: `Allied ${activeUnit.name} fell to Punji stakes.`, tag: 'DEATH' });
          nextGrid[r][c] = null;
          return { nextGrid, activeTraps: nextTraps, playerHQDmg, opponentHQDmg, logs, soundEffect };
        } else {
          nextGrid[r][c] = activeUnit;
        }
      }
    }
  }

  // B. Demolition Strike (126th SpecOps 'vc_126th_specops')
  const isVCSpecOps = activeUnit.id === 'vc_126th_specops';
  if (isVCSpecOps) {
    const reachedTargetRow = isPlayerMoving ? (r === 0) : (r === 2);
    if (reachedTargetRow) {
      soundEffect = 'explosion';
      logs.push({
        message: `DEMOLITION STRIKE! 126th SpecOps reached target Support Line. Commencing self-destruct operation...`,
        tag: 'BUFF'
      });

      // Find enemy Artillery or Aircraft unit on that row to destroy
      let strikeTargetIndex = -1;
      for (let idx = 0; idx < 5; idx++) {
        const targetUnit = nextGrid[r][idx];
        if (targetUnit && !playerSideFactions.includes(targetUnit.faction) === isPlayerMoving) {
          if (targetUnit.unitType === 'Artillery' || targetUnit.unitType === 'Aircraft') {
            strikeTargetIndex = idx;
            break;
          }
        }
      }

      if (strikeTargetIndex !== -1) {
        const victim = nextGrid[r][strikeTargetIndex]!;
        logs.push({
          message: `BOOM! Demolition satchel charge completely obliterated enemy secondary defense unit: ${victim.name}!`,
          tag: 'DEATH'
        });
        nextGrid[r][strikeTargetIndex] = null;
      } else {
        logs.push({
          message: `No valid Artillery or Aircraft found on Support Row. Saboteurs blew up local fuel depot instead (HQ takes 2 damage!).`,
          tag: 'HQ'
        });
        if (isPlayerMoving) {
          opponentHQDmg = 2;
        } else {
          playerHQDmg = 2;
        }
      }

      // Self-destruct 126th SpecOps!
      nextGrid[r][c] = null;
    }
  }

  return {
    nextGrid,
    activeTraps: nextTraps,
    playerHQDmg,
    opponentHQDmg,
    logs,
    soundEffect
  };
}

// --------------------------------------------------------------------------
// 3. PURE DEPLOY EFFECTS ENGINE
// --------------------------------------------------------------------------
export function executeDeployEffects(
  card: Card,
  grid: Grid,
  isPlayerDeploying: boolean,
  activeTraps: any[],
  playerSideFactions: string[],
  opponentSideFactions: string[]
): DeployEffectsResult {
  const nextGrid = grid.map((row) => [...row]);
  const logs: { message: string; tag: BattleLog['tag'] }[] = [];
  let playerHQArmorDiff = 0;
  let opponentHQArmorDiff = 0;
  let soundEffect: 'explosion' | null = null;
  let nextTraps = [...activeTraps];

  if (card.id === 'us_combat_engineers') {
    if (isPlayerDeploying) {
      playerHQArmorDiff = 3;
      nextTraps = nextTraps.filter((t) => t.faction !== 'NVA');
      logs.push({ message: `Combat Engineers cleared active guerrilla traps.`, tag: 'BUFF' });
    }
  }

  if (card.id === 'nva_mig17_pilot') {
    const enemyFactions = isPlayerDeploying ? opponentSideFactions : playerSideFactions;
    let targetUnit: GridUnit | null = null;
    let targetPos: { r: number; c: number } | null = null;

    // MiG-17 Pilot works on rows 0, 1, 2
    for (let tr = 0; tr < 3; tr++) {
      for (let tc = 0; tc < 5; tc++) {
        const u = nextGrid[tr][tc];
        if (u && enemyFactions.includes(u.faction) && u.unitType === 'Aircraft') {
          targetUnit = u;
          targetPos = { r: tr, c: tc };
          break;
        }
      }
      if (targetUnit) break;
    }

    if (targetUnit && targetPos) {
      soundEffect = 'explosion';
      targetUnit.def -= 4;
      if (isPlayerDeploying) {
        logs.push({
          message: `AIR SUPREMACY! MiG-17 Fighter Pilot intercepted and struck aircraft ${targetUnit.name} for 4 damage!`,
          tag: 'ATTACK'
        });
      } else {
        logs.push({
          message: `AIR SUPREMACY! Enemy MiG-17 Fighter Pilot has intercepted and struck your aircraft ${targetUnit.name} during deployment for 4 DEF damage!`,
          tag: 'ATTACK'
        });
      }

      if (targetUnit.def <= 0) {
        if (isPlayerDeploying) {
          logs.push({ message: `Enemy ${targetUnit.name} was shot down in the sky!`, tag: 'DEATH' });
        } else {
          logs.push({ message: `Your aircraft ${targetUnit.name} was shot down!`, tag: 'DEATH' });
        }
        nextGrid[targetPos.r][targetPos.c] = null;
      } else {
        nextGrid[targetPos.r][targetPos.c] = targetUnit;
      }
    } else {
      logs.push({
        message: `No enemy aircraft on board for MiG-17 Pilot to intercept upon deployment.`,
        tag: 'SYSTEM'
      });
    }
  }

  return {
    nextGrid,
    activeTraps: nextTraps,
    playerHQArmorDiff,
    opponentHQArmorDiff,
    logs,
    soundEffect
  };
}
