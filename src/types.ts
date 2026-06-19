export type Faction = 'USA' | 'NVA';

export type CardRarity = 'Common' | 'Uncommon' | 'Rare' | 'Elite';

export type CardType = 'Unit' | 'Order' | 'Countermeasure';

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
  rarity: CardRarity;
  ability: string;
  artworkKeyword: string; // Used for rendering gorgeous poster artwork
}

export interface GridUnit extends Card {
  instanceId: string;
  hasMovedOrAttackedThisTurn: boolean;
  camouflage: boolean;
  frozenTurns: number;
  armor: number; // Additional defense
  isAmphibious: boolean;
  isAir: boolean; // Helicopters/Aircraft
  isArtillery: boolean;
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
