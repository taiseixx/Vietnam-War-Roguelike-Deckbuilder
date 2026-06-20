import { strict as assert } from 'assert';
import { resolveCombatEngagement, checkMoveTriggers, executeDeployEffects } from '../logic/combatEngine.js';
import { Grid, GridUnit, Card } from '../types.js';
import { CARD_DATABASE } from '../data/cards.js';

// Helper to create mock units
function makeUnit(
  id: string,
  name: string,
  unitType: 'Infantry' | 'Tank' | 'Aircraft' | 'Artillery',
  faction: 'US' | 'NVA' | 'VC' | 'ARVN',
  atk: number,
  def: number,
  maxDef?: number
): GridUnit {
  const baseCard = CARD_DATABASE.find(c => c.id === id);
  return {
    id,
    name,
    faction,
    k: 2,
    o: 1,
    atk,
    def,
    maxDef: maxDef ?? (baseCard?.maxDef ?? def),
    type: 'Unit',
    unitType: baseCard?.unitType ?? unitType,
    rarity: baseCard?.rarity ?? 'Common',
    ability: baseCard?.ability ?? '',
    artworkKeyword: 'test',
    instanceId: `test-${id}-${Math.floor(Math.random() * 100000)}`,
    hasMovedOrAttackedThisTurn: false,
    camouflage: false,
    frozenTurns: 0,
    armor: 0,
    isAmphibious: false,
    isArmored: baseCard?.isArmored,
    combatEffects: baseCard?.combatEffects,
    movementEffects: baseCard?.movementEffects,
    deployEffects: baseCard?.deployEffects
  };
}

function makeEmptyGrid(): Grid {
  return Array.from({ length: 5 }, () => Array(5).fill(null));
}

// Global counters
let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[\x1b[32mPASS\x1b[0m] ${name}`);
  } catch (error: any) {
    console.error(`[\x1b[31mFAIL\x1b[0m] ${name}`);
    console.error(error);
  }
}

console.log("===============================================================================");
console.log("                EAST ASIA THEATER COMBAT MATRIX TEST RETRIEVER                 ");
console.log("===============================================================================");

// =============================================================================
// I. BASIC COMBAT MATRIX SCENARIOS (16 CASES: 4x4 ATTACKER vs DEFENDER)
// =============================================================================

runTest("1. Infantry vs Infantry (Standard melee brawl, reciprocal full damage)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_inf', 'US Platoon', 'Infantry', 'US', 3, 4);
  const defender = makeUnit('generic_inf_2', 'NVA Squad', 'Infantry', 'NVA', 3, 4);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  // Both should retal full damage: 4 - 3 = 1
  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  assert.ok(finalAttacker && finalAttacker.def === 1, "Attacker should have 1 DEF remaining");
  assert.ok(finalDefender && finalDefender.def === 1, "Defender should have 1 DEF remaining");
});

runTest("2. Infantry vs Tank (Reciprocal damage to armored steel)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_inf', 'US Platoon', 'Infantry', 'US', 2, 4);
  const defender = makeUnit('generic_tank', 'NVA T-54', 'Tank', 'NVA', 3, 5);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  assert.ok(finalAttacker && finalAttacker.def === 1, "Attacker should take 3 damage (1 DEF left)");
  assert.ok(finalDefender && finalDefender.def === 3, "Defender should take 2 damage (3 DEF left)");
});

runTest("3. Infantry vs Aircraft (reciprocal damage under default ground encounter)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_inf', 'US Platoon', 'Infantry', 'US', 2, 4);
  const defender = makeUnit('generic_air', 'NVA Mig', 'Aircraft', 'NVA', 3, 4);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  // Reciprocal damage is standard if aircraft defends:
  assert.ok(finalAttacker && finalAttacker.def === 1, "Attacker takes 3 damage");
  assert.ok(finalDefender && finalDefender.def === 2, "Defender takes 2 damage");
});

runTest("4. Infantry vs Artillery (Artillery cannot retal core melee under support)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_inf', 'US Platoon', 'Infantry', 'US', 2, 4);
  const defender = makeUnit('generic_arty', 'NVA Howitzer', 'Artillery', 'NVA', 3, 4);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  // Defender is artillery, so defender retaliates with 0 damage to attacker!
  assert.ok(finalAttacker && finalAttacker.def === 4, "Attacker should take 0 retaliation");
  assert.ok(finalDefender && finalDefender.def === 2, "Defender should take 2 damage");
});

runTest("5. Tank vs Infantry (High crushing power)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_tank', 'US Patton', 'Tank', 'US', 4, 6);
  const defender = makeUnit('generic_inf', 'NVA Squad', 'Infantry', 'NVA', 2, 4);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  assert.ok(finalAttacker && finalAttacker.def === 4, "Attacker takes 2 damage");
  assert.equal(finalDefender, null, "Defender should be neutralized (4 - 4 = 0 DEF)");
});

runTest("6. Tank vs Tank (Heavy metal mutual escalation)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_tank', 'US Patton', 'Tank', 'US', 3, 5);
  const defender = makeUnit('generic_tank_2', 'NVA T-54', 'Tank', 'NVA', 3, 5);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  assert.ok(finalAttacker && finalAttacker.def === 2, "Attacker takes 3 damage");
  assert.ok(finalDefender && finalDefender.def === 2, "Defender takes 3 damage");
});

runTest("7. Tank vs Aircraft (Aircraft retaliation is standard)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_tank', 'US Patton', 'Tank', 'US', 3, 5);
  const defender = makeUnit('generic_air', 'NVA Heli', 'Aircraft', 'NVA', 2, 4);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  assert.ok(finalAttacker && finalAttacker.def === 3, "Attacker takes 2 damage");
  assert.ok(finalDefender && finalDefender.def === 1, "Defender takes 3 damage");
});

runTest("8. Tank vs Artillery (Artillery cannot retaliate direct melee)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_tank', 'US Patton', 'Tank', 'US', 3, 5);
  const defender = makeUnit('generic_arty', 'NVA Howitzer', 'Artillery', 'NVA', 2, 3);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  assert.ok(finalAttacker && finalAttacker.def === 5, "Attacker takes 0 damage");
  assert.equal(finalDefender, null, "Defender is destroyed");
});

runTest("9. Aircraft vs Infantry (Aircraft only takes half retaliation damage from infantry)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_air', 'US Huey Heli', 'Aircraft', 'US', 3, 5);
  const defender = makeUnit('generic_inf', 'NVA Squad', 'Infantry', 'NVA', 3, 5);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  // Attacker is Aircraft, defending is Infantry. Attacker takes Math.ceil(3 * 0.5) = 2 damage.
  assert.ok(finalAttacker && finalAttacker.def === 3, "Aircraft should have taken 2 damage instead of 3");
  assert.ok(finalDefender && finalDefender.def === 2, "Infantry takes 3 full damage");
});

runTest("10. Aircraft vs Tank (Aircraft takes full retaliation from armored tank)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_air', 'US Huey Heli', 'Aircraft', 'US', 3, 5);
  const defender = makeUnit('generic_tank', 'NVA T-54', 'Tank', 'NVA', 2, 5);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  // Reciprocal damage from tank is full
  assert.ok(finalAttacker && finalAttacker.def === 3, "Aircraft takes full 2 damage");
  assert.ok(finalDefender && finalDefender.def === 2, "Tank takes 3 damage");
});

runTest("11. Aircraft vs Aircraft (Dogfight in the skies, full mutual damage)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_air', 'US Skyhawk', 'Aircraft', 'US', 3, 4);
  const defender = makeUnit('generic_air_2', 'NVA Mig', 'Aircraft', 'NVA', 2, 4);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  assert.ok(finalAttacker && finalAttacker.def === 2, "Attacker takes 2 damage");
  assert.ok(finalDefender && finalDefender.def === 1, "Defender takes 3 damage");
});

runTest("12. Aircraft vs Artillery (No retaliation from support artillery)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_air', 'US Skyhawk', 'Aircraft', 'US', 2, 4);
  const defender = makeUnit('generic_arty', 'NVA Gun', 'Artillery', 'NVA', 2, 3);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  assert.ok(finalAttacker && finalAttacker.def === 4, "Aircraft should take 0 damage");
  assert.ok(finalDefender && finalDefender.def === 1, "Arty takes 2 damage");
});

runTest("13. Artillery vs Infantry (Artillery takes no retaliation on offense)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_arty', 'US Howitzer', 'Artillery', 'US', 3, 4);
  const defender = makeUnit('generic_inf', 'NVA Platoon', 'Infantry', 'NVA', 3, 5);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  assert.ok(finalAttacker && finalAttacker.def === 4, "Artillery takes 0 damage");
  assert.ok(finalDefender && finalDefender.def === 2, "Infantry takes 3 damage");
});

runTest("14. Artillery vs Tank (Zero retaliation from dense armor)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_arty', 'US Howitzer', 'Artillery', 'US', 2, 4);
  const defender = makeUnit('generic_tank', 'NVA Tank', 'Tank', 'NVA', 3, 5);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  assert.ok(finalAttacker && finalAttacker.def === 4, "Artillery takes 0 damage");
  assert.ok(finalDefender && finalDefender.def === 3, "Tank takes 2 damage");
});

runTest("15. Artillery vs Aircraft (Zero retaliation from high-altitude fighter)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_arty', 'US Howitzer', 'Artillery', 'US', 2, 4);
  const defender = makeUnit('generic_air', 'NVA Mig', 'Aircraft', 'NVA', 3, 4);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  assert.ok(finalAttacker && finalAttacker.def === 4, "Artillery takes 0 damage");
  assert.ok(finalDefender && finalDefender.def === 2, "Aircraft takes 2 damage");
});

runTest("16. Artillery vs Artillery (Zero retaliation on artillery duel combat engagement)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_arty', 'US Howitzer', 'Artillery', 'US', 3, 4);
  const defender = makeUnit('generic_arty_2', 'NVA mortar', 'Artillery', 'NVA', 3, 4);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  assert.ok(finalAttacker && finalAttacker.def === 4, "Attacker takes 0 damage");
  assert.ok(finalDefender && finalDefender.def === 1, "Defender takes 3 damage");
});


// =============================================================================
// II. NAMED SYNERGIES & SPECIAL ABILITIES (12 DEEP TRACING CASES)
// =============================================================================

runTest("17. 320th Steel Division (Heavy Armor Breakers deals +1 ATK vs Armored on offensive)", () => {
  const grid = makeEmptyGrid();
  // 320th Steel Division (nva_320th_steel) attacks ARVN 7th Armoured (arvn_7th_armoured)
  const attacker = makeUnit('nva_320th_steel', '320th Division', 'Infantry', 'NVA', 3, 4);
  const defender = makeUnit('arvn_7th_armoured', 'ARVN APC', 'Tank', 'ARVN', 2, 4);

  const res = resolveCombatEngagement(attacker, defender, { r: 1, c: 2 }, { r: 2, c: 2 }, grid, false);

  const finalDefender = res.nextGrid[2][2];

  // 320th Steel gets +1 ATK vs armored (atk becomes 4)
  // defender arvn_7th_armoured takes 4 damage and dies
  assert.equal(finalDefender, null, "Armored defender should be destroyed");
});

runTest("18. 320th Steel Division (Heavy Armor Breakers defends with +1 ATK vs Armored)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('us_m48_patton', 'M48 Patton', 'Tank', 'US', 3, 5);
  const defender = makeUnit('nva_320th_steel', '320th Division', 'Infantry', 'NVA', 3, 4);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];

  // Defender 320th Steel Division gets +1 ATK when defending vs armored attacker (such as M48 Patton)
  // Thus defAtk becomes 4 instead of 3. Attacker (M48 Patton) should take 4 damage (1 Def remaining)
  assert.ok(finalAttacker && finalAttacker.def === 1, "M48 Patton should take 4 damage and have 1 DEF left");
});

runTest("19. Heavy Machine Gun Team (Anti-Air Flak deals x2 damage vs Aircraft)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('nva_hmg_team', 'NVA HMG', 'Infantry', 'NVA', 2, 4);
  const defender = makeUnit('generic_air', 'US Cobra', 'Aircraft', 'US', 2, 5);

  const res = resolveCombatEngagement(attacker, defender, { r: 1, c: 2 }, { r: 2, c: 2 }, grid, false);

  const finalDefender = res.nextGrid[2][2];

  // HMG deals x2 vs Aircraft -> 4 ATK. defender cobra def becomes 5 - 4 = 1.
  assert.ok(finalDefender && finalDefender.def === 1, "Aircraft should have 1 DEF left");
});

runTest("20. Heavy Machine Gun Team (Anti-Air Flak defends with x2 damage vs Aircraft)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_air', 'US Cobra', 'Aircraft', 'US', 2, 2);
  const defender = makeUnit('nva_hmg_team', 'NVA HMG', 'Infantry', 'NVA', 2, 4);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];

  // defending HMG gets x2 ATK vs Aircraft -> 4 ATK. Attacker cobra takes 4 damage and dies.
  assert.equal(finalAttacker, null, "Aircraft attacker should be shot down");
});

runTest("21. 9th Riverines Swamp Mastery (+2 ATK when inside row index 1)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('us_9th_riverines', '9th Riverines', 'Infantry', 'US', 2, 4);
  const defender = makeUnit('generic_inf', 'NVA Platoon', 'Infantry', 'NVA', 2, 4);

  // Position is row 1
  const res = resolveCombatEngagement(attacker, defender, { r: 1, c: 2 }, { r: 0, c: 2 }, grid, true);

  const finalDefender = res.nextGrid[0][2];

  // 9th Riverines gets +2 ATK in Conflict Zone (row index 1) -> Atk becomes 4. Defender dies.
  assert.equal(finalDefender, null, "Defender should be wiped out via Swamp Mastery");
});

runTest("22. Local Guerrilla Cell Ambush (First-strike defensive ambush vs Melee)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_inf', 'US Platoon', 'Infantry', 'US', 2, 2); // 2 ATK, 2 DEF
  const defender = makeUnit('vc_guerrilla_cell', 'VC Guerrillas', 'Infantry', 'VC', 2, 3); // 2 ATK, 3 DEF

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];
  const finalDefender = res.nextGrid[1][2];

  // Defensive ambush: defAtk hits attacker first. Attacker takes 2 damage and dies.
  // Defender does not take any damage since the attacker dies first!
  assert.equal(finalAttacker, null, "Melee attacker should have died first");
  assert.ok(finalDefender && finalDefender.def === 3, "Guerrilla cell should have suffered 0 damage");
});

runTest("23. 7th Armored Cav (Escort heavy armor reduces incoming ranged by 1)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_arty', 'US Howitzer', 'Artillery', 'US', 3, 4);
  const defender = makeUnit('arvn_7th_armoured', 'ARVN APC', 'Tank', 'ARVN', 2, 5);

  const res = resolveCombatEngagement(attacker, defender, { r: 3, c: 2 }, { r: 2, c: 2 }, grid, true);

  const finalDefender = res.nextGrid[2][2];

  // Arty deals 3. 7th Armoured Escort absorbs 1 -> Takes 2. Defender def becomes 5 - 2 = 3.
  assert.ok(finalDefender && finalDefender.def === 3, "7th Armoured should absorb 1 ranged damage point");
});

runTest("24. M48 Patton Overkill (Excess damage direct to enemy HQ)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('us_m48_patton', 'M48 Patton', 'Tank', 'US', 5, 5);
  const defender = makeUnit('generic_inf', 'NVA Platoon', 'Infantry', 'NVA', 1, 2);

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  // Defender has 2 DEF. Attacker deals 5. Overkill: abs(2 - 5) = 3.
  assert.equal(res.opponentHQDmg, 3, "Should direct 3 overkill damage to opponent HQ");
});

runTest("25. M113 ACAV (Spawns an ACAV Squad on destruction)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_tank', 'NVA Heavy', 'Tank', 'NVA', 5, 5);
  const defender = makeUnit('us_m113_acav', 'M113 carrier', 'Tank', 'US', 2, 2);

  const res = resolveCombatEngagement(attacker, defender, { r: 1, c: 2 }, { r: 2, c: 2 }, grid, false);

  const spawnedUnit = res.nextGrid[2][2];

  // Defender is destroyed and M113 ACAV spawns a US ACAV Squad at def position
  assert.ok(spawnedUnit && spawnedUnit.id === 'us_acav_squad', "ACAV Squad should spawn at wreckage position");
  assert.equal(spawnedUnit.def, 2, "Spawned ACAV Squad should have 2 DEF");
});

runTest("26. 5th Special Forces Green Berets (Heals to full and resets action capacity on kill)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('us_5th_specops', '5th Special Forces', 'Infantry', 'US', 4, 1, 4); // Max 4, Current 1
  const defender = makeUnit('generic_inf', 'NVA Platoon', 'Infantry', 'NVA', 0, 3); // Dies

  const res = resolveCombatEngagement(attacker, defender, { r: 2, c: 2 }, { r: 1, c: 2 }, grid, true);

  const finalAttacker = res.nextGrid[2][2];

  assert.ok(finalAttacker && finalAttacker.def === 4, "Green Berets should have healed to max (4)");
  assert.ok(finalAttacker && !finalAttacker.hasMovedOrAttackedThisTurn, "Action capacity should reset");
});

runTest("27. ARVN 1st Infantry Battle Hardened (+1 ATK permanently after defensive survival)", () => {
  const grid = makeEmptyGrid();
  const attacker = makeUnit('generic_inf', 'NVA Infantry', 'Infantry', 'NVA', 1, 4);
  const defender = makeUnit('arvn_1st_infantry', 'ARVN 1st', 'Infantry', 'ARVN', 2, 4);

  const res = resolveCombatEngagement(attacker, defender, { r: 1, c: 2 }, { r: 2, c: 2 }, grid, false);

  const finalDefender = res.nextGrid[2][2];

  // Defender survives with 3 DEF, gets +1 ATK (baseAtk becomes 3, atk becomes 3)
  assert.ok(finalDefender && finalDefender.def === 3, "Should survive");
  assert.ok(finalDefender && finalDefender.atk === 3, "Battle Hardened should boost ATK from 2 to 3");
});


// =============================================================================
// III. MOVEMENT REGINA & RELATIVE RANGE TRIGGERS
// =============================================================================

runTest("28. vc_126th_specops Demolition Strike (Support Line demolition - player moving up)", () => {
  const grid = makeEmptyGrid();
  
  // Place an enemy Artillery on the target row (Row 0 for player moving up)
  const enemyArty = makeUnit('generic_arty', 'Enemy Howitzer', 'Artillery', 'US', 3, 4);
  grid[0][1] = enemyArty;

  const specOps = makeUnit('vc_126th_specops', '126th SpecOps', 'Infantry', 'VC', 2, 2);

  // Moving to Row 0 as player (isPlayerMoving = true)
  const res = checkMoveTriggers(0, 2, specOps, grid, true, [], 'NVA', ['NVA', 'VC']);

  // Enemy Artillery on row 0 should be annihilated!
  assert.equal(res.nextGrid[0][1], null, "Enemy Artillery on target row should be annihilated");
  assert.equal(res.nextGrid[0][2], null, "126th SpecOps should have self-destructed");
});

runTest("126th SpecOps Relative Directional Trigger (AI moving down to Row 2)", () => {
  const grid = makeEmptyGrid();

  // Place player Artillery on Row 2
  const playerArty = makeUnit('generic_arty', 'Player Howitzer', 'Artillery', 'US', 2, 3);
  grid[2][1] = playerArty;

  const specOps = makeUnit('vc_126th_specops', '126th SpecOps', 'Infantry', 'VC', 2, 2);

  // AI SpecOps moving DOWN to Row 2 (isPlayerMoving = false)
  const res = checkMoveTriggers(2, 2, specOps, grid, false, [], 'USA', ['US', 'ARVN']);

  // Player Artillery on Row 2 should be destroyed
  assert.equal(res.nextGrid[2][1], null, "Player artillery on Row 2 should be demolished");
  // SpecOps self destructs
  assert.equal(res.nextGrid[2][2], null, "SpecOps should have self-destructed");
});


// =============================================================================
// IV. DEPLOY EFFECTS (CR-001 COMPLETION TESTS)
// =============================================================================

runTest("29. us_combat_engineers (onDeploy -> addArmorToHQ +3)", () => {
  const grid = makeEmptyGrid();
  const card: Card = {
    id: 'us_combat_engineers',
    name: 'Engineers',
    faction: 'US',
    k: 3, o: 1, atk: 2, def: 4, maxDef: 4,
    type: 'Unit', unitType: 'Infantry', rarity: 'Common',
    ability: 'Test', artworkKeyword: 'test',
    deployEffects: [{ trigger: 'onDeploy', action: { type: 'addArmorToHQ', value: 3 } }]
  };

  const context = { playerHQDef: 20, opponentHQDef: 20, playerHQArmor: 0, opponentHQArmor: 0 };
  const res = executeDeployEffects(card, grid, true, [], ['US'], ['NVA'], context);

  assert.equal(res.nextContext.playerHQArmor, 3, "Allied HQ should have gained 3 Armor");
});

runTest("30. nva_mig17_pilot (onDeploy -> interceptAircraft deals 4 damage)", () => {
  const grid = makeEmptyGrid();
  // Place an enemy Aircraft
  const enemyAir = makeUnit('generic_air', 'Huey', 'Aircraft', 'US', 2, 5);
  grid[2][2] = enemyAir;

  const pilotCard: Card = {
    id: 'nva_mig17_pilot',
    name: 'MiG-17',
    faction: 'NVA',
    k: 4, o: 2, atk: 4, def: 2, maxDef: 2,
    type: 'Unit', unitType: 'Aircraft', rarity: 'Rare',
    ability: 'Test', artworkKeyword: 'test',
    deployEffects: [{ trigger: 'onDeploy', action: { type: 'interceptAircraft', value: 4 } }]
  };

  const res = executeDeployEffects(pilotCard, grid, true, [], ['NVA'], ['US']);

  const finalEnemy = res.nextGrid[2][2];
  assert.ok(finalEnemy && finalEnemy.def === 1, "Enemy aircraft should have taken 4 damage (5 - 4 = 1)");
});


console.log("===============================================================================");
console.log(`TEST RUN COMPLETE: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log("===============================================================================");
