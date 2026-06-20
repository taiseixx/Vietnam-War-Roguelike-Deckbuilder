export type Faction = 'USA' | 'NVA';

export type CardRarity = 'Common' | 'Uncommon' | 'Rare' | 'Elite';

export type CardType = 'Unit' | 'Order' | 'Countermeasure';

export type UnitType = 'Infantry' | 'Tank' | 'Aircraft' | 'Artillery';

export interface EffectAction<TActionType extends string> {
  type: TActionType;
  value?: number;
  spawnCardId?: string; // Dùng cho ACAV spawn-on-death, v.v.
}

export interface Effect<TTrigger extends string, TActionType extends string> {
  trigger: TTrigger;
  condition?: {
    targetUnitType?: UnitType;
    targetIsArmored?: boolean;
    locationRow?: number;        // Ví dụ: 1 cho Conflict Zone
    isRangedAttack?: boolean;    // Dùng cho Escort
    isMeleeAttack?: boolean;     // Dùng cho Ambush
    row?: number;                // Dùng cho OnReachRow (Movement)
  };
  action: EffectAction<TActionType>;
}

// Khai báo cụ thể các nhóm hiệu ứng
export type CombatEffect = Effect<
  'onAttack' | 'onDefend' | 'onKill' | 'onDeath' | 'onSurviveDefend',
  'addAtk' | 'multAtk' | 'firstStrike' | 'reduceDmgTaken' | 'overkillToHQ' | 'spawnUnit' | 'healFullAndExtraAction' | 'permanentAtkBuff'
>;

export type MovementEffect = Effect<
  'onReachRow',
  'demolitionStrike'
>;

export type DeployEffect = Effect<
  'onDeploy',
  'addArmorToHQ' | 'clearEnemyTraps' | 'interceptAircraft'
>;

export interface ArtTemplateConfig {
  templateType: 'infantry' | 'tank' | 'aircraft' | 'artillery' | 'order' | 'countermeasure';
  overlayIconId?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface Card {
  id: string;
  name: string;
  faction: 'US' | 'NVA' | 'VC' | 'ARVN';
  k: number; // Kredit cost
  o: number; // Operation cost
  atk: number;
  def: number;
  maxDef: number;
  type: CardType;
  unitType?: UnitType;
  rarity: CardRarity;
  ability: string;
  artworkKeyword: string; // Used for rendering gorgeous poster artwork
  artConfig?: ArtTemplateConfig; // Data-driven art pipeline config (CR-003)
  isArmored?: boolean; // Trait tĩnh để kiểm tra xe bọc thép
  isAirmobile?: boolean; // Trait tĩnh bỏ qua summoning sickness
  combatEffects?: CombatEffect[];
  movementEffects?: MovementEffect[];
  deployEffects?: DeployEffect[];
}

export interface GridUnit extends Card {
  instanceId: string;
  hasMovedOrAttackedThisTurn: boolean;
  hasMovedThisTurn?: boolean;
  hasAttackedThisTurn?: boolean;
  camouflage: boolean;
  frozenTurns: number;
  armor: number; // Additional defense
  isAmphibious: boolean;
  baseAtk?: number; // Base attack before dynamic presence-based auras are applied
}

export type Grid = (GridUnit | null)[][]; // 5 rows x 5 columns
// Row 0 = NVA HQ
// Row 1 = NVA Infiltration Line
// Row 2 = Conflict Zone (Swamp/Jungle)
// Row 3 = US Support Line
// Row 4 = US HQ

export type NodeType = 'Combat' | 'Elite' | 'Campfire' | 'Event' | 'Boss';

export interface CampaignNode {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  completed: boolean;
  gridY: number; // Row index on maps (0-4)
  gridX: number; // Column index (0-2)
  enemies?: Card[];
}

export interface BattleLog {
  id: string;
  message: string;
  tag: 'DEPLOY' | 'MOVE' | 'ATTACK' | 'HQ' | 'ORDER' | 'SYSTEM' | 'DEATH' | 'BUFF';
  time: string;
}

export interface CampaignState {
  currentFaction: Faction;
  maxKredits: number;
  currentKredits: number;
  playerDeck: Card[];
  playerHand: Card[];
  opponentHand: Card[];
  playerHQDef: number;
  opponentHQDef: number;
  activeBattleNode: string | null; // node id
  completedNodes: string[];
  currentNodeId: string;
  nodes: CampaignNode[];
  gold: number; // military supplies
  xp: number;
  level: number;
}
