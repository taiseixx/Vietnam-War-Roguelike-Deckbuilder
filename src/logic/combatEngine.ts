import { Card, GridUnit, Grid, BattleLog, CombatEffect, MovementEffect, DeployEffect, UnitType } from '../types';

export interface BattleStateContext {
  playerHQDef: number;
  opponentHQDef: number;
  playerHQArmor: number;
  opponentHQArmor: number;
}

export interface CombatEngagementResult {
  nextGrid: Grid;
  nextContext: BattleStateContext;
  logs: { message: string; tag: BattleLog['tag'] }[];
  playerHQDmg?: number;
  opponentHQDmg?: number;
}

export interface MoveTriggersResult {
  nextGrid: Grid;
  nextContext: BattleStateContext;
  activeTraps: any[];
  logs: { message: string; tag: BattleLog['tag'] }[];
  soundEffect?: 'explosion' | null;
}

export interface DeployEffectsResult {
  nextGrid: Grid;
  nextContext: BattleStateContext;
  activeTraps: any[];
  logs: { message: string; tag: BattleLog['tag'] }[];
  soundEffect?: 'explosion' | null;
}

// Default fallback context
export const DEFAULT_BATTLE_CONTEXT: BattleStateContext = {
  playerHQDef: 20,
  opponentHQDef: 20,
  playerHQArmor: 0,
  opponentHQArmor: 0
};

// --------------------------------------------------------------------------
// OPTIMIZED SELECTIVE DEEP CLONING
// --------------------------------------------------------------------------
export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) =>
    row.map((unit) => {
      if (!unit) return null;
      return {
        ...unit,
        // Deep clone nested effects arrays and action objects to fully isolate mutable parameters
        combatEffects: unit.combatEffects
          ? unit.combatEffects.map((e) => ({ ...e, action: { ...e.action } }))
          : undefined,
        movementEffects: unit.movementEffects
          ? unit.movementEffects.map((e) => ({ ...e, action: { ...e.action } }))
          : undefined,
        deployEffects: unit.deployEffects
          ? unit.deployEffects.map((e) => ({ ...e, action: { ...e.action } }))
          : undefined,
      };
    })
  );
}

// --------------------------------------------------------------------------
// DECLARATIVE CARD EFFECT EXTRACTORS
// --------------------------------------------------------------------------
export function getUnitCombatEffects(unit: GridUnit): CombatEffect[] {
  return unit.combatEffects || [];
}

export function getUnitMovementEffects(unit: GridUnit): MovementEffect[] {
  return unit.movementEffects || [];
}

export function getUnitDeployEffects(card: Card | GridUnit): DeployEffect[] {
  return card.deployEffects || [];
}

// --------------------------------------------------------------------------
// CONTEXT DAMAGE ROUTING TO ACCURATELY CONSUME ARMOR
// --------------------------------------------------------------------------
export function applyDamageToHQ(
  context: BattleStateContext,
  isPlayer: boolean,
  damage: number,
  logs: { message: string; tag: BattleLog['tag'] }[]
): BattleStateContext {
  const nextContext = { ...context };
  if (damage <= 0) return nextContext;

  const initialHQName = isPlayer ? "Allied HQ" : "Opponent HQ";
  if (isPlayer) {
    const armor = nextContext.playerHQArmor;
    if (armor > 0) {
      if (armor >= damage) {
        nextContext.playerHQArmor -= damage;
        logs.push({
          message: `${initialHQName} Armor absorbed ${damage} damage completely! (Remaining Armor: ${nextContext.playerHQArmor})`,
          tag: 'HQ'
        });
      } else {
        const remainingDamage = damage - armor;
        nextContext.playerHQArmor = 0;
        nextContext.playerHQDef = Math.max(0, nextContext.playerHQDef - remainingDamage);
        logs.push({
          message: `${initialHQName} Armor was depleted absorbing ${armor} damage. ${remainingDamage} damage hit core HQ defense! (Remaining HP: ${nextContext.playerHQDef})`,
          tag: 'HQ'
        });
      }
    } else {
      nextContext.playerHQDef = Math.max(0, nextContext.playerHQDef - damage);
      logs.push({
        message: `${initialHQName} took ${damage} direct damage! (Remaining HP: ${nextContext.playerHQDef})`,
        tag: 'HQ'
      });
    }
  } else {
    const armor = nextContext.opponentHQArmor;
    if (armor > 0) {
      if (armor >= damage) {
        nextContext.opponentHQArmor -= damage;
        logs.push({
          message: `${initialHQName} Armor absorbed ${damage} damage completely! (Remaining Armor: ${nextContext.opponentHQArmor})`,
          tag: 'HQ'
        });
      } else {
        const remainingDamage = damage - armor;
        nextContext.opponentHQArmor = 0;
        nextContext.opponentHQDef = Math.max(0, nextContext.opponentHQDef - remainingDamage);
        logs.push({
          message: `${initialHQName} Armor was depleted absorbing ${armor} damage. ${remainingDamage} damage hit core HQ defense! (Remaining HP: ${nextContext.opponentHQDef})`,
          tag: 'HQ'
        });
      }
    } else {
      nextContext.opponentHQDef = Math.max(0, nextContext.opponentHQDef - damage);
      logs.push({
        message: `${initialHQName} took ${damage} direct damage! (Remaining HP: ${nextContext.opponentHQDef})`,
        tag: 'HQ'
      });
    }
  }
  return nextContext;
}

export function applyArmorGainToHQ(
  context: BattleStateContext,
  isPlayer: boolean,
  amount: number,
  logs: { message: string; tag: BattleLog['tag'] }[]
): BattleStateContext {
  const nextContext = { ...context };
  if (isPlayer) {
    nextContext.playerHQArmor += amount;
    logs.push({ message: `Allied HQ gained +${amount} Armor defence.`, tag: 'BUFF' });
  } else {
    nextContext.opponentHQArmor += amount;
    logs.push({ message: `Opponent HQ gained +${amount} Armor defence.`, tag: 'BUFF' });
  }
  return nextContext;
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
  isPlayerAttacking: boolean,
  context: BattleStateContext = DEFAULT_BATTLE_CONTEXT
): CombatEngagementResult {
  const nextGrid = cloneGrid(grid);
  let nextContext = { ...context };
  const logs: { message: string; tag: BattleLog['tag'] }[] = [];

  const attacker = { ...attackerInput };
  const defender = { ...defenderInput };

  const isArmored = (u: GridUnit) => !!u.isArmored;
  const isMelee = (u: GridUnit) => u.unitType === 'Infantry' || u.unitType === 'Tank';
  const isRanged = (u: GridUnit) => u.unitType === 'Artillery' || u.unitType === 'Aircraft';

  let attAtk = attacker.atk;
  let defAtk = defender.atk;

  const attEffects = getUnitCombatEffects(attacker);
  const defEffects = getUnitCombatEffects(defender);

  // Apply additive ATK buffs on Attack/Defend triggers
  attEffects.forEach((eff) => {
    if (eff.trigger === 'onAttack') {
      let conMet = true;
      if (eff.condition?.targetIsArmored && !isArmored(defender)) conMet = false;
      if (eff.condition?.targetUnitType && defender.unitType !== eff.condition.targetUnitType) conMet = false;
      if (eff.condition?.locationRow !== undefined && attPos.r !== eff.condition.locationRow) conMet = false;

      if (conMet && eff.action.type === 'addAtk') {
        attAtk += eff.action.value || 0;
        logs.push({
          message: `ARMOR BREAKER/SWAMP MASTERY: ${attacker.name} gets ATK boost to ${attAtk}!`,
          tag: 'BUFF'
        });
      }
    }
  });

  defEffects.forEach((eff) => {
    if (eff.trigger === 'onDefend') {
      let conMet = true;
      if (eff.condition?.targetIsArmored && !isArmored(attacker)) conMet = false;
      if (eff.condition?.targetUnitType && attacker.unitType !== eff.condition.targetUnitType) conMet = false;
      if (eff.condition?.locationRow !== undefined && defPos.r !== eff.condition.locationRow) conMet = false;

      if (conMet && eff.action.type === 'addAtk') {
        defAtk += eff.action.value || 0;
        logs.push({
          message: `ARMOR BREAKER/SWAMP MASTERY: ${defender.name} defends with ATK boost to ${defAtk}!`,
          tag: 'BUFF'
        });
      }
    }
  });

  // Apply multiplicative ATK buffs
  attEffects.forEach((eff) => {
    if (eff.trigger === 'onAttack') {
      let conMet = true;
      if (eff.condition?.targetUnitType && defender.unitType !== eff.condition.targetUnitType) conMet = false;

      if (conMet && eff.action.type === 'multAtk') {
        const factor = eff.action.value || 1;
        attAtk *= factor;
        logs.push({
          message: `ANTI-AIR FLAK: ${attacker.name} scales damage (scaled ATK: ${attAtk}) vs Aircraft ${defender.name}!`,
          tag: 'BUFF'
        });
      }
    }
  });

  defEffects.forEach((eff) => {
    if (eff.trigger === 'onDefend') {
      let conMet = true;
      if (eff.condition?.targetUnitType && attacker.unitType !== eff.condition.targetUnitType) conMet = false;

      if (conMet && eff.action.type === 'multAtk') {
        const factor = eff.action.value || 1;
        defAtk *= factor;
        logs.push({
          message: `ANTI-AIR FLAK: ${defender.name} defends with scaled damage (scaled ATK: ${defAtk}) vs Aircraft ${attacker.name}!`,
          tag: 'BUFF'
        });
      }
    }
  });

  let attackerDef = attacker.def;
  let defenderDef = defender.def;

  let attackerDmgTaken = defAtk;
  let defenderDmgTaken = attAtk;

  // Base mechanical retaliation overrides
  if (attacker.unitType === 'Artillery') {
    attackerDmgTaken = 0;
  } else if (attacker.unitType === 'Aircraft') {
    if (defender.unitType === 'Infantry') {
      attackerDmgTaken = Math.ceil(defAtk * 0.5);
    }
  }

  if (defender.unitType === 'Artillery') {
    attackerDmgTaken = 0;
  }

  // Combat Execution
  let isAmbushTriggered = false;
  const defFirstStrike = defEffects.find((eff) => eff.trigger === 'onDefend' && eff.action.type === 'firstStrike');
  const attFirstStrike = attEffects.find((eff) => eff.trigger === 'onAttack' && eff.action.type === 'firstStrike');

  if (defFirstStrike && isMelee(attacker) && attacker.unitType !== 'Aircraft' && attacker.unitType !== 'Artillery') {
    isAmbushTriggered = true;
    logs.push({ message: `AMBUSH! ${defender.name} triggers defensive first-strike vs ${attacker.name}!`, tag: 'BUFF' });
    attackerDef -= defAtk;
    if (attackerDef > 0) {
      defenderDef -= attAtk;
    } else {
      logs.push({ message: `AMBUSH SUCCESS! ${attacker.name} was neutralized in the bush before returning fire.`, tag: 'DEATH' });
      defenderDmgTaken = 0;
    }
  } else if (attFirstStrike && isMelee(defender) && attacker.unitType !== 'Aircraft' && attacker.unitType !== 'Artillery') {
    isAmbushTriggered = true;
    logs.push({ message: `AMBUSH! ${attacker.name} triggers offensive first-strike vs ${defender.name}!`, tag: 'BUFF' });
    defenderDef -= attAtk;
    if (defenderDef > 0) {
      attackerDef -= defAtk;
    } else {
      logs.push({ message: `AMBUSH SUCCESS! Blockade ${defender.name} was eliminated before reacting.`, tag: 'DEATH' });
      attackerDmgTaken = 0;
    }
  }

  if (!isAmbushTriggered) {
    const isRangedAttacker = isRanged(attacker);
    const isRangedDefender = isRanged(defender);

    const defReduce = defEffects.find((eff) => eff.trigger === 'onDefend' && eff.action.type === 'reduceDmgTaken');
    if (defReduce && isRangedAttacker) {
      const red = defReduce.action.value || 0;
      defenderDmgTaken = Math.max(0, defenderDmgTaken - red);
      logs.push({
        message: `ESCORT: ${defender.name} heavy steel armor reduces incoming ranged/artillery damage taken by ${red} point.`,
        tag: 'BUFF'
      });
    }

    const attReduce = attEffects.find((eff) => eff.trigger === 'onAttack' && eff.action.type === 'reduceDmgTaken');
    if (attReduce && isRangedDefender) {
      const red = attReduce.action.value || 0;
      attackerDmgTaken = Math.max(0, attackerDmgTaken - red);
      logs.push({
        message: `ESCORT: ${attacker.name} heavy steel armor reduces incoming ranged/artillery damage taken by ${red} point.`,
        tag: 'BUFF'
      });
    }

    defenderDef -= defenderDmgTaken;
    attackerDef -= attackerDmgTaken;
  }

  // Overkill to HQ Base calculation
  let playerHQDmg = 0;
  let opponentHQDmg = 0;
  const attOverkill = attEffects.find((eff) => eff.trigger === 'onAttack' && eff.action.type === 'overkillToHQ');
  if (attOverkill && defenderDef < 0) {
    const overkill = Math.abs(defenderDef);
    nextContext = applyDamageToHQ(nextContext, !isPlayerAttacking, overkill, logs);
    if (!isPlayerAttacking) {
      playerHQDmg = overkill;
    } else {
      opponentHQDmg = overkill;
    }
  }

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

  // Resolve defender demise/survival
  if (defenderDef <= 0) {
    logs.push({ message: `${defender.name} was neutralized in direct engagement.`, tag: 'DEATH' });
    nextGrid[defPos.r][defPos.c] = null;

    const defDeath = defEffects.find((eff) => eff.trigger === 'onDeath' && eff.action.type === 'spawnUnit');
    if (defDeath && defDeath.action.spawnCardId === 'us_acav_squad') {
      nextGrid[defPos.r][defPos.c] = createAcavSquad();
      logs.push({ message: `ACAV RESCUE: ACAV Squad deployed from wreckage of destroyed M113 Armor Carrier.`, tag: 'DEPLOY' });
    }

    const attKill = attEffects.find((eff) => eff.trigger === 'onKill' && eff.action.type === 'healFullAndExtraAction');
    if (attKill && attackerDef > 0) {
      attacker.def = attacker.maxDef;
      attacker.hasMovedOrAttackedThisTurn = false;
      attacker.hasMovedThisTurn = false;
      attacker.hasAttackedThisTurn = false;
      logs.push({ message: `GREEN BERETS: 5th Special Forces neutralized target, fully healed DEF, and gained extra turn movement action link!`, tag: 'BUFF' });
    }
  } else {
    nextGrid[defPos.r][defPos.c] = defender;
    
    const defSurvive = defEffects.find((eff) => eff.trigger === 'onSurviveDefend' && eff.action.type === 'permanentAtkBuff');
    if (defSurvive && defenderDef > 0) {
      const amt = defSurvive.action.value || 1;
      defender.baseAtk = (defender.baseAtk ?? defender.atk) + amt;
      defender.atk = defender.baseAtk;
      logs.push({ message: `BATTLE HARDENED: ${defender.name} survived attack, permanently gaining +${amt} ATK (Now ATK:${defender.atk})!`, tag: 'BUFF' });
    }
  }

  // Resolve attacker demise
  if (attackerDef <= 0) {
    logs.push({ message: `${attacker.name} fell in the line of duty.`, tag: 'DEATH' });
    nextGrid[attPos.r][attPos.c] = null;

    const attDeath = attEffects.find((eff) => eff.trigger === 'onDeath' && eff.action.type === 'spawnUnit');
    if (attDeath && attDeath.action.spawnCardId === 'us_acav_squad') {
      nextGrid[attPos.r][attPos.c] = createAcavSquad();
      logs.push({ message: `ACAV RESCUE: ACAV Squad deployed from wreckage of destroyed M113 Armor Carrier.`, tag: 'DEPLOY' });
    }
  } else {
    nextGrid[attPos.r][attPos.c] = {
      ...attacker,
      hasAttackedThisTurn: (attacker.combatEffects?.some(e => e.action.type === 'healFullAndExtraAction')) ? attacker.hasAttackedThisTurn : true,
      hasMovedOrAttackedThisTurn: (attacker.combatEffects?.some(e => e.action.type === 'healFullAndExtraAction')) ? attacker.hasMovedOrAttackedThisTurn : true,
      hasMovedThisTurn: (attacker.combatEffects?.some(e => e.action.type === 'healFullAndExtraAction')) ? attacker.hasMovedThisTurn : true
    };
  }

  return {
    nextGrid,
    nextContext,
    logs,
    playerHQDmg,
    opponentHQDmg
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
  playerSideFactions: string[],
  context: BattleStateContext = DEFAULT_BATTLE_CONTEXT
): MoveTriggersResult {
  const nextGrid = cloneGrid(grid);
  let nextContext = { ...context };
  const logs: { message: string; tag: BattleLog['tag'] }[] = [];
  let soundEffect: 'explosion' | null = null;
  let nextTraps = [...activeTraps];

  const activeUnit = { ...activeUnitInput };

  // A. Punji / Ambush Trap triggers
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
          return { nextGrid, nextContext, activeTraps: nextTraps, logs, soundEffect };
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
          return { nextGrid, nextContext, activeTraps: nextTraps, logs, soundEffect };
        } else {
          nextGrid[r][c] = activeUnit;
        }
      }
    }
  }

  // B. Declarative Demolition Strike on reach row
  const moveEffects = getUnitMovementEffects(activeUnit);
  const reachedRowEffect = moveEffects.find((eff) => eff.trigger === 'onReachRow' && eff.action.type === 'demolitionStrike');
  
  if (reachedRowEffect) {
    const reachedTargetRow = isPlayerMoving ? (r === 0) : (r === 2);
    if (reachedTargetRow) {
      soundEffect = 'explosion';
      logs.push({
        message: `DEMOLITION STRIKE! ${activeUnit.name} reached target Support Line. Commencing self-destruct operation...`,
        tag: 'BUFF'
      });

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
        nextContext = applyDamageToHQ(nextContext, !isPlayerMoving, 2, logs);
      }

      // Self-destruct SpecOps!
      nextGrid[r][c] = null;
    }
  }

  return {
    nextGrid,
    nextContext,
    activeTraps: nextTraps,
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
  opponentSideFactions: string[],
  context: BattleStateContext = DEFAULT_BATTLE_CONTEXT
): DeployEffectsResult {
  const nextGrid = cloneGrid(grid);
  let nextContext = { ...context };
  const logs: { message: string; tag: BattleLog['tag'] }[] = [];
  let soundEffect: 'explosion' | null = null;
  let nextTraps = [...activeTraps];

  const depEffects = getUnitDeployEffects(card);

  // Apply addArmorToHQ Effect
  const armorEffect = depEffects.find((eff) => eff.trigger === 'onDeploy' && eff.action.type === 'addArmorToHQ');
  if (armorEffect) {
    const amt = armorEffect.action.value || 3;
    nextContext = applyArmorGainToHQ(nextContext, isPlayerDeploying, amt, logs);
  }

  // Apply clearEnemyTraps Effect
  const clearTrapsEffect = depEffects.find((eff) => eff.trigger === 'onDeploy' && eff.action.type === 'clearEnemyTraps');
  if (clearTrapsEffect) {
    if (isPlayerDeploying) {
      nextTraps = nextTraps.filter((t) => t.faction !== 'NVA');
      logs.push({ message: `Combat Engineers cleared active guerrilla traps.`, tag: 'BUFF' });
    } else {
      nextTraps = nextTraps.filter((t) => t.faction === 'NVA');
      logs.push({ message: `Viet Cong sappers cleared MACV security countermeasures.`, tag: 'BUFF' });
    }
  }

  // Apply interceptAircraft Effect
  const interceptEffect = depEffects.find((eff) => eff.trigger === 'onDeploy' && eff.action.type === 'interceptAircraft');
  if (interceptEffect) {
    const enemyFactions = isPlayerDeploying ? opponentSideFactions : playerSideFactions;
    let targetUnit: GridUnit | null = null;
    let targetPos: { r: number; c: number } | null = null;

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
      const dmg = interceptEffect.action.value || 4;
      targetUnit.def -= dmg;
      if (isPlayerDeploying) {
        logs.push({
          message: `AIR SUPREMACY! MiG-17 Fighter Pilot intercepted and struck aircraft ${targetUnit.name} for ${dmg} damage!`,
          tag: 'ATTACK'
        });
      } else {
        logs.push({
          message: `AIR SUPREMACY! Enemy MiG-17 Fighter Pilot has intercepted and struck your aircraft ${targetUnit.name} during deployment for ${dmg} DEF damage!`,
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
    nextContext,
    activeTraps: nextTraps,
    logs,
    soundEffect
  };
}
