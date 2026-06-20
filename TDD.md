# TDD.md — Technical Design Document
## Vietnam War Roguelike Deckbuilder

> **Phiên bản**: 1.0 | **Ngày**: Tháng 6, 2026
> Tài liệu kỹ thuật chi tiết về kiến trúc hệ thống, cấu trúc dữ liệu, luồng xử lý state, và các implementation đặc biệt trong dự án.

---

## I. KIẾN TRÚC TỔNG QUAN (System Architecture)

### Stack Layer Diagram

```
┌─────────────────────────────────────────────────┐
│               BROWSER (Client-side SPA)          │
├─────────────────────────────────────────────────┤
│  React 19 + TypeScript                          │
│  ┌─────────────────────────────────────────┐    │
│  │            App.tsx (Root Router)         │    │
│  │  State: activeScreen, campaignState      │    │
│  │  Screens:                                │    │
│  │   • faction_selection (inline JSX)       │    │
│  │   • campaign_map → <CampaignMap />       │    │
│  │   • battle → <Battlefield />             │    │
│  │   • campaign_over (inline JSX)           │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │ CampaignMap  │  │     Battlefield         │   │
│  │ .tsx         │  │     .tsx (2200+ lines)  │   │
│  │ • Node tree  │  │ • Grid 3×5 engine       │   │
│  │ • Campfire   │  │ • Turn management       │   │
│  │ • Event      │  │ • AI opponent logic     │   │
│  │ • DeckViewer │  │ • Special abilities     │   │
│  └──────────────┘  └────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ Shared Components                         │   │
│  │  PropagandaPoster.tsx  (SVG generator)   │   │
│  │  MulliganOverlay.tsx   (pre-battle UI)   │   │
│  │  CardDetailModal.tsx   (card inspect)    │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────┐     │
│  │ Data Layer   │  │ Utils Layer           │     │
│  │ cards.ts     │  │ sound.ts              │     │
│  │ types.ts     │  │ (Web Audio API)       │     │
│  └──────────────┘  └──────────────────────┘     │
├─────────────────────────────────────────────────┤
│  Vite 6 Dev Server (port 3000) / Build Tool     │
│  Tailwind CSS v4 (via @tailwindcss/vite plugin) │
│  Motion (Framer Motion v12) — Animations        │
├─────────────────────────────────────────────────┤
│  Express.js (minimal server — dotenv loading)   │
│  @google/genai (Gemini API)                     │
└─────────────────────────────────────────────────┘
```

---

## II. DATA MODELS & TYPE SYSTEM (src/types.ts)

### 2.1 Core Types

```typescript
// Hai phe lịch sử chính
type Faction = 'USA' | 'NVA';

// Bốn sub-faction trên thẻ bài
type CardFaction = 'US' | 'NVA' | 'VC' | 'ARVN';

// Ba loại thẻ
type CardType = 'Unit' | 'Order' | 'Countermeasure';

// Bốn cấp độ hiếm
type CardRarity = 'Common' | 'Uncommon' | 'Rare' | 'Elite';

// Năm loại node trên bản đồ chiến dịch
type NodeType = 'Combat' | 'Elite' | 'Campfire' | 'Event' | 'Boss';
```

### 2.2 Interface: Card

```typescript
interface Card {
  id: string;           // Unique ID: "{faction}_{unit_slug}"
  name: string;         // Tên hiển thị
  faction: CardFaction; // 'US' | 'NVA' | 'VC' | 'ARVN'
  k: number;            // Kredit cost — chi phí deploy từ tay
  o: number;            // Operation cost — chi phí move/attack
  atk: number;          // Attack damage value
  def: number;          // Current defense (HP) — giảm khi bị damage
  maxDef: number;       // Maximum DEF (để reset heal)
  type: CardType;       // 'Unit' | 'Order' | 'Countermeasure'
  rarity: CardRarity;   // Ảnh hưởng badge color và draft priority
  ability: string;      // Mô tả ability text (UI display)
  artworkKeyword: string; // Key để PropagandaPoster render đúng SVG art
}
```

### 2.3 Interface: GridUnit (extends Card)

```typescript
// GridUnit = Card đã được deploy lên board — có thêm runtime state
interface GridUnit extends Card {
  instanceId: string;               // Unique instance ID (UUID) — tránh trùng
  hasMovedOrAttackedThisTurn: boolean; // Cooldown: 1 action per turn
  camouflage: boolean;              // Ẩn với ranged attacks
  frozenTurns: number;              // Số lượt còn bị đóng băng
  armor: number;                    // Extra shield absorb damage trước DEF
  isAmphibious: boolean;            // Không bị terrain penalty
  isAir: boolean;                   // Helicopter/Aircraft — immune terrain
  isArtillery: boolean;             // Ranged — no retaliation damage received
  baseAtk?: number;                 // Base attack before dynamic presence-based auras are applied
}
```

### 2.4 Type: Grid

```typescript
// 3 hàng × 5 cột — null = ô trống
type Grid = (GridUnit | null)[][];

// Layout ý nghĩa:
// grid[0][*] → Opponent base line (NVA HQ ở [0][2])
// grid[1][*] → Conflict Zone (Swamp/Jungle)
// grid[2][*] → Player base line (US HQ ở [2][2])
```

### 2.5 Interface: CampaignState

```typescript
interface CampaignState {
  currentFaction: Faction;       // 'USA' | 'NVA'
  maxKredits: number;            // Kredit cap hiện tại (ramp mỗi lượt)
  currentKredits: number;        // Kredit còn lại trong lượt này
  playerDeck: Card[];            // Toàn bộ deck (không phân chia draw pile/discard)
  playerHand: Card[];            // Bài đang trên tay (battle context)
  opponentHand: Card[];          // Bài trên tay đối thủ (battle context)
  playerHQDef: number;           // Commander HP (persistent giữa các node)
  opponentHQDef: number;         // Enemy HQ HP per battle
  activeBattleNode: string | null; // ID của node đang trong battle
  completedNodes: string[];      // Danh sách nodes đã hoàn thành
  currentNodeId: string;         // Node hiện tại đang active
  nodes: CampaignNode[];         // Toàn bộ 5 nodes của campaign
  gold: number;                  // Military Supplies — currency inter-battle
  xp: number;                    // Experience points (future use)
  level: number;                 // Commander level (future use)
}
```

### 2.6 Interface: BattleLog

```typescript
interface BattleLog {
  id: string;       // Unique log entry ID
  message: string;  // Log text
  tag: 'DEPLOY' | 'MOVE' | 'ATTACK' | 'HQ' | 'ORDER' | 'SYSTEM' | 'DEATH' | 'BUFF';
  time: string;     // Timestamp "HH:MM:SS"
}
```

---

## III. COMPONENT BREAKDOWN

### 3.1 App.tsx — Root Router & Roguelike State Machine

**Vai trò**: Điều phối toàn bộ app. Quản lý screen routing và campaign-level state.

**State variables:**
```typescript
activeScreen: 'faction_selection' | 'campaign_map' | 'battle' | 'campaign_over'
campaignState: CampaignState          // Roguelike persistent state
activeBattleNode: CampaignNode | null // Node đang được đánh
activeEventNode: CampaignNode | null  // Event node đang hiển thị dialog
showDraftPool: boolean                // Toggle draft card panel
draftPool: Card[]                     // 3 random cards offered for draft
```

**Key functions:**
```typescript
selectFactionAndStart(faction: Faction)
// → Initialize 30-card starter deck (balanced by rarity limits)
// → Create 5 campaign nodes
// → Set activeScreen = 'campaign_map'

handleSelectNode(node: CampaignNode)
// → Route to 'battle' (Combat/Elite/Boss)
// → Route to Event dialog
// → Route to Campfire dialog (handled in CampaignMap)

handleBattleVictory(suppliesReward: number)
// → Mark node as completed
// → Add gold reward
// → Add XP
// → Advance to next node
// → Check campaign completion

handleBattleDefeat()
// → setActiveScreen('campaign_over')

handleCampfireSelection(action: 'heal' | 'draft')
// → 'heal': playerHQDef += 8 (max 20)
// → 'draft': triggerDraftPool()

triggerDraftPool()
// → Filter CARD_DATABASE theo faction
// → Random pick 3 cards
// → setShowDraftPool(true)

handleChooseDraftCard(card: Card)
// → playerDeck.push(card)
// → advanceToNextNode()
```

**Screen routing logic:**
```
activeScreen === 'faction_selection' → Render faction select UI (inline JSX)
activeScreen === 'campaign_map'      → Render <CampaignMap />
activeScreen === 'battle'            → Render <Battlefield />
activeScreen === 'campaign_over'     → Render victory/defeat screen
```

---

### 3.2 Battlefield.tsx — Combat Engine

**Vai trò**: Toàn bộ logic trận đấu. Component lớn nhất (~2200 dòng).

#### State Architecture

```typescript
// === HQ Health ===
playerHQ: number          // Player HQ HP (starts 20)
playerHQArmor: number     // Extra shield on player HQ
opponentHQ: number        // Enemy HQ HP (starts 20)
opponentHQArmor: number   // Extra shield on enemy HQ

// === Kredit Economy ===
maxKredits: number        // Current kredit cap (ramping)
playerKredits: number     // Kredits available this turn
opponentKredits: number   // AI opponent kredits

// === Hand & Deck ===
playerDeckRemaining: Card[]  // Draw pile
playerHand: Card[]           // Cards in hand (max ~7)
opponentHand: Card[]         // AI opponent hand

// === Board ===
grid: Grid                   // 3×5 GridUnit matrix

// === Active Effects ===
activeTraps: { faction: Faction; cardId: string }[]

// === UI State ===
showMulligan: boolean
mulliganSelected: string[]
battlePhase: 'deploy' | 'resolve' | 'gameover'
currentTurnOwner: Faction      // 'USA' | 'NVA'
selectedOrderCard: Card | null // Order card được chọn để target
selectedHandUnit: Card | null  // Unit trong tay đã click
selectedBoardUnit: { r: number; c: number } | null // Unit trên board đã click
targetingIndex: { r: number; c: number } | null
detailedCard: Card | null      // Card đang mở modal detail

// === Drag & Drop ===
activeDrag: { card, sourceType, sourceR?, sourceC?, startX, startY, currentX, currentY } | null
```

#### Turn Flow (Player Side)

```
handleEndTurn()
    │
    ├─ 1. Reset hasMovedOrAttackedThisTurn cho tất cả player units
    ├─ 2. currentTurnOwner = 'NVA'
    ├─ 3. runOpponentTurn() [async, setTimeout sequence]
    │         ├─ AI Draw phase
    │         ├─ AI Deploy phase (deploy affordable units)
    │         ├─ AI Attack phase (attack reachable player units)
    │         └─ AI End Turn → back to player
    └─ 4. Player draw 1 card
       5. maxKredits++, playerKredits = maxKredits
```

#### Special Abilities System — `applyAuraBuffs(grid)`

**Kiến trúc giải quyết Chỉ Số Ảo (Phantom Stats Anti-corruption Flow)**:
Để kiểm soát triệt để các lỗi cộng dồn dồn ứ chỉ số khi di chuyển đơn vị hoặc luân hồi lượt mới, `applyAuraBuffs` được vận hành qua chu trình hai pha nghiêm ngặt:

1. **Pha Làm Sạch & Đồng Bộ Baseline**:
   - Trích xuất hoặc khởi tạo lười (lazy-initialize) chỉ số `baseAtk` cho từng đơn vị trên bàn cờ nếu chưa được khai báo:
     ```typescript
     let baseAtk = unit.baseAtk !== undefined ? unit.baseAtk : CARD_DATABASE.find((c) => c.id === unit.id)?.atk ?? unit.atk;
     ```
   - Đồng bộ hoàn trả thuộc tính `atk = baseAtk` tạm thời để gột rửa tuyệt đối bất kỳ tàn dư hào quang hay buff hiện diện nào đã tính toán từ bước trước.

2. **Pha Tính Toán Hào Quang & Loại Trừ HQ**:
   - Thực hiện đếm số lượng nguồn kích hoạt hào quang đồng minh trên bàn đấu (ví dụ: số lượng `PAVN High Command Vanguard`).
   - Cộng dồn lực công kích động lên toàn bộ các đơn vị đáp ứng điều kiện.
   - **Chặn an toàn HQ**: HQs (`hq_player` và `hq_opponent`) luôn được chặn và loại trừ rõ ràng khỏi các vòng lặp hào quang, duy trì lực công lượng bằng `0` bất di bất dịch:
     ```typescript
     if (unit && unit.id !== 'hq_player' && unit.id !== 'hq_opponent') {
       unit.atk += auraCount;
     }
     ```

**Auras hiện tại hỗ trợ:**
- **PAVN High Command Vanguard** (*Synergy Aura*): +1 ATK/DEF cho toàn bộ đơn vị NVA/VC trên sân đấu (ngoại trừ chính nó và các HQ).
- **MAAG Advisors**: ×2 ATK lực chiến của ARVN units khi đứng liên kề trực tiếp (trái/phải).
- **Group 559 Logistics**: Giảm -1 Operation cost cho các đơn vị đồng minh kề cạnh.

#### Combat Calculation — `executeCombat(attackerPos, targetPos)`

```typescript
// 1. Lấy attacker và target từ grid
// 2. Áp dụng aura buffs vào atk/def hiện tại
// 3. Tính damage sau khi xét special bonuses:
//    - isArtillery: không nhận retaliation
//    - camouflage: immune với ranged (trừ khi đã tấn công)
//    - frozenTurns: không thể hành động
//    - armor: absorb damage trước DEF
// 4. Apply damage lên target.def
// 5. Nếu target.def <= 0: destroy unit, trigger death effects
//    (M113 ACAV spawn infantry, Green Berets heal on kill)
// 6. Nếu không có retaliation: attacker nhận counter-damage
// 7. Log kết quả vào battleReportLogs
```

#### AI Opponent Logic

```typescript
runOpponentTurn()
// Strategy (simple greedy AI):
// 1. Draw nếu hand < 5
// 2. Với mỗi card trong tay (sort by ATK desc):
//    - Nếu đủ Kredit → deploy vào ô trống hàng 0
// 3. Với mỗi unit trên hàng 0 và 1:
//    - Nếu có player unit liền kề → attack
//    - Else nếu có ô trống phía trước → advance
// 4. Nếu unit đến được hàng 2 → attack HQ trực tiếp
```

---

### 3.3 PropagandaPoster.tsx — Procedural SVG Art Engine

**Vai trò**: Render artwork SVG cho từng card, theo phong cách poster tuyên truyền 1960s. Không dùng file ảnh — toàn bộ là code SVG.

**Props:**
```typescript
interface PropagandaPosterProps {
  keyword: string;    // artworkKeyword từ Card data
  faction: CardFaction; // Quyết định color palette
  name: string;       // Dùng cho fallback display
  artConfig?: ArtTemplateConfig; // Config dạng Data-driven SVG templates (Giảm tải switch-case)
}
```

**Color Palette Logic:**
```typescript
const isEastern = faction === 'NVA' || faction === 'VC';
primaryColor = isEastern ? '#A8201A' : '#3E4E30'; // Đỏ Cách Mạng vs Xanh Olive
bgAccent    = isEastern ? '#F9C80E' : '#CBBF99';  // Vàng Sao vs Khaki
textColor   = isEastern ? '#F9C80E' : '#E8E5DA';  // Text contrast
```

**Hệ thống Template Tạm Thời (Data-driven Art Pipeline - CR-003):** 
Card mới sinh ra ở Gói 2+ không cần viết thêm case SVG. Chỉ cần nhúng config:
```typescript
interface ArtTemplateConfig {
  template: 'infantry' | 'tank' | 'aircraft' | 'artillery' | 'order' | 'countermeasure';
  overlayIcon?: 'star' | 'crosshairs' | 'shield' | 'wings' | 'bomb' | 'skull' | 'radio' | 'flag';
}
```
*Ghi chú: Lộ trình này là "temporary fallback" giúp scale số lượng card mà không bottleneck khâu vẽ SVG. Sẽ revisit nếu có dedicated artist resource ở Gói DLC tương lai.*

**Keyword → SVG Cases Truyền Thống (Giữ nguyên cho core 42 cards ban đầu):**

| Keyword | Card | SVG Elements |
|---------|------|-------------|
| `militia` | Local Militia | Pith helmet, palm trees, red star, "DU KÍCH ĐỊA PHƯƠNG" |
| `regulars` | 304th Division | Sunburst rays, star medal, "QUYẾT CHIẾN QUYẾT THẮNG" |
| `steel_division` | 320th Steel | Bayonets, gear circle, "THÉP TỔ QUỐC" |
| `logistics` | Group 559 | Mountain backdrop, Ho Chi Minh Trail dotted line, bicycle |
| `river_boats` | 803rd Riverine | Rising red sun, river waves, gunboat |
| `sapper` | Sapper Recon | Night scene, mud-painted face, flashlight beam |
| `machine_gun` | HMG Team | Anti-air tracers, turret silhouette |
| `artillery` | 40th Artillery | Cannon barrel, shell burst, "PHÁO BINH" |
| `jet` | MiG-17 | Speed lines, fighter silhouette |
| `officer` | PAVN Command | Command star, military regalia |
| `huey` | 1st Cav Airmobile | Helicopter rotor overhead view |
| `phantom` | F-4 Phantom | Fighter jet contrails |
| `patton_tank` | M48 Patton | Heavy tank treads, cannon |
| `green_beret` | 5th Special Forces | SF beret, jungle camo |
| `hq_hanoi` / `hq_saigon` | HQ Cards | HQ building illustration |
| `order_*` | Order cards | Abstract command imagery |
| `trap_*` | Countermeasures | Hidden trap visual |
| ... | ... | ... |

---

### 3.4 CampaignMap.tsx — Roguelike Progression UI

**Vai trò**: Hiển thị bản đồ chiến dịch dạng node tree, quản lý dialog Campfire/Event, và cung cấp Deck Viewer.

**Key UI Elements:**
1. **Campaign Banner**: AI-generated JPG banner phía trên
2. **HUD Bar**: Faction info, Gold count, Commander HP, Deck view button
3. **Node Tree**: SVG connecting lines + node buttons (grid layout)
4. **Campfire Modal**: Inline dialog chọn Heal hoặc Draft
5. **Event Modal**: Dialog với 3 lựa chọn chiến lược
6. **Draft Panel**: 3 card options hiển thị dạng grid (dùng PropagandaPoster)
7. **Deck Viewer**: Full-screen overlay xem toàn bộ bài trong deck

**Node Rendering Logic:**
```typescript
// Mỗi node render dựa trên:
const isCurrentNode = node.id === currentNodeId;
const isCompleted   = node.completed;
const isLocked      = !isCompleted && node.id !== currentNodeId;

// Visual states:
// Current: amber border, animated pulse icon
// Completed: green checkmark, dimmed
// Locked: stone/gray, pointer-events-none
```

---

### 3.5 MulliganOverlay.tsx — Pre-Battle Card Swap

**Vai trò**: Overlay xuất hiện ngay đầu mỗi trận, cho phép người chơi đổi bài không muốn.

**Logic:**
```typescript
// User toggles cards to swap
// On confirm:
cardsToSwap = initialHand.filter(c => selectedIds.includes(c.id))
cardsToKeep = initialHand.filter(c => !selectedIds.includes(c.id))
// Swapped cards return to deck, draw fresh cards
```

---

### 3.6 CardDetailModal.tsx — Card Inspector

**Vai trò**: Full-screen/overlay hiển thị chi tiết đầy đủ của một card khi click.

---

## IV. AUDIO ENGINE — TacticalSoundEngine (src/utils/sound.ts)

### 4.1 Architecture

```typescript
class TacticalSoundEngine {
  private ctx: AudioContext | null     // Web Audio context (lazy init)
  private helicopterNode: OscillatorNode | null
  private helicopterGain: GainNode | null
  private helicopterThrum: OscillatorNode | null
  public isMuted: boolean
}

// Singleton export
export const sound = new TacticalSoundEngine();
```

### 4.2 Khởi tạo Context (Lazy Init)

```typescript
private initCtx() {
  // AudioContext chỉ được tạo sau user interaction (browser requirement)
  if (!this.ctx) {
    this.ctx = new AudioContext();
  }
  if (this.ctx.state === 'suspended') {
    this.ctx.resume(); // Resume nếu bị browser suspend
  }
}
```

### 4.3 Huey Helicopter Ambient Synthesis

**Kỹ thuật**: FM Synthesis (Frequency Modulation)

```
Modulator Oscillator (sine, 7.2 Hz)  →  ModulatorGain (depth: 15)
                                              │
                                              ▼
Carrier Oscillator (sawtooth, 55 Hz)  ← frequency input
        │
        ▼
LowPass BiquadFilter (cutoff: 180 Hz)  ← muffle effect (helmet/radio)
        │
        ▼
Main GainNode (volume: 0.04)  →  AudioContext.destination
```

- **55 Hz sawtooth**: Âm trầm của động cơ turbine
- **7.2 Hz modulation**: Tốc độ quay của rotor Huey (≈430 RPM)
- **Lowpass 180 Hz**: Lọc tần số cao → nghe như qua vách kính cockpit

### 4.4 Gunshot Synthesis

**Kỹ thuật**: Filtered White Noise + Exponential Decay

```
White Noise Buffer (0.4s)
        │
        ▼
BandPass Filter (center: 800 Hz, Q: 2.0)  ← sharp crack frequency
        │
        ▼
GainNode (0.35 → 0.001 trong 0.35s)  ← exponential decay
        │
        ▼
AudioContext.destination
```

### 4.5 Explosion Synthesis

**Kỹ thuật**: Noise + LowPass + Sub-Oscillator

```
White Noise Buffer (1.5s)
        │
        ▼
LowPass Filter (cutoff: 120 Hz)  ← heavy bass shockwave
        │                         
        ▼
GainNode (0.5 → 0.001 trong 1.5s)
        │
        ▼
AudioContext.destination
```

Đồng thời:
```
Sub Oscillator (sine, 60 Hz)  ← rumble frequency
        │
        ▼
GainNode (0.3 → 0.001 trong 0.8s)
        │
        ▼
AudioContext.destination
```

### 4.6 Radio Static Synthesis

**Kỹ thuật**: Short Noise Burst + BandPass

```
White Noise Buffer (0.15s — rất ngắn)
        │
        ▼
BandPass Filter (center: 1000 Hz, Q: 3.0)  ← midrange radio frequency
        │
        ▼
GainNode (0.08 → 0.001 trong 0.12s)
        │
        ▼
AudioContext.destination
```

### 4.7 Sound Trigger Map

| Method | Trigger Point | Game Event |
|--------|---------------|------------|
| `startChopperAmbience()` | `useEffect` mount in Battlefield | Trận bắt đầu |
| `stopChopperAmbience()` | `useEffect` cleanup | Rời Battlefield |
| `playGunshot()` | Unit attack resolves | Đơn vị tấn công |
| `playExplosion()` | Unit destroyed / Order played | Đơn vị chết / Lệnh lớn |
| `playRadioStatic()` | Faction select / Order played | Chọn phe / Ra lệnh |
| `playCardDraw()` | Draw phase / Deck view open | Rút bài |
| `toggleMute()` | Mute button | Toggle toàn bộ |

---

## V. CARD DATABASE (src/data/cards.ts)

### 5.1 Database Overview

```typescript
export const CARD_DATABASE: Card[] = [...]
// Tổng: 42 cards
// NVA (North Vietnam Army): 16 cards
//   → 10 Units + 5 Orders + 1 Countermeasure
// US (United States Army): 16 cards
//   → 10 Units + 5 Orders + 1 Countermeasure
// VC (Viet Cong sub-faction): 5 cards
//   → 3 Units + 2 Orders
// ARVN (Army of Republic of Vietnam sub-faction): 5 cards
//   → 3 Units + 2 Orders
```

### 5.2 Card Pool theo Faction

**NVA/VC Deck Pool** (khả dụng cho phe NVA trong game):
```
NVA Units: Local Militia, 304th Division Regulars, 320th Steel Division,
           PAVN Transportation Unit (Group 559), 803rd Riverine Regiment,
           Sapper Reconnaissance, Heavy Machine Gun Team,
           40th Artillery Regiment, MiG-17 Fighter Pilot,
           PAVN High Command Vanguard

NVA Orders: Rapid March, Foliage Camouflage, Surround & Isolate,
            Emulation Appeal, Truong Son Drive

NVA Countermeasure: Ambush Trap

VC Units: Local Guerrilla Cell, 126th Special Forces Unit,
          Regional Artillery - 7th Regiment

VC Orders: Scorched Earth, Cu Chi Tunnel Transport
```

**US/ARVN Deck Pool** (khả dụng cho phe USA trong game):
```
US Units: MAAG Advisors, Military Police (MP), Combat Engineers,
          9th Division Riverines, M113 ACAV Squad,
          101st Screaming Eagles, 1st Cav Airmobile,
          F-4 Phantom Squadron, 5th Special Forces, M48 Patton Tank

US Orders: Strategic Hamlet Program, Logistical Superiority,
           Intelligence Briefing, Operation Chopper (1962), Airstrike Support

US Countermeasure: Radar Alert Response

ARVN Units: ARVN Regional Forces, ARVN 1st Infantry Division,
            7th Armoured Cavalry

ARVN Orders: Pacification Scheme, General Mobilization
```

### 5.3 Card Stat Ranges

| Faction | Avg K | Avg O | Avg ATK | Avg DEF |
|---------|-------|-------|---------|---------|
| NVA Units | 2.6 | 2.1 | 2.9 | 3.0 |
| US Units | 3.9 | 0.9 | 3.5 | 4.2 |
| VC Units | 1.7 | 3.0 | 2.3 | 2.0 |
| ARVN Units | 3.0 | 1.0 | 3.0 | 3.7 |

> **Nhận xét**: US units có Operation cost thấp hơn many (0.9 vs 2.1) nhưng Kredit cost cao hơn — thể hiện "high quality, expensive" vs "cheap, many" asymmetry.

---

## V. THE CENTRALTACTICS COMMON ENG-ARCHITECTURE (Central Combat & Move Engine)

Hệ thống điều vận chiến trường được tái thiết kế và "common hóa" tuyệt đối thông qua ba bộ giải trình trung tâm trong tệp `src/components/Battlefield.tsx`:

### 5.4 Hàm Giải Quyết Giao Chiến `resolveCombatEngagement`
Bộ phận trung tâm chịu trách nhiệm thu nạp các thực thể giao đấu, giải phóng các kỹ năng và điều phối thiệt hại một cách chính thống:
```typescript
function resolveCombatEngagement(
  attacker: GridUnit,
  defender: GridUnit,
  attackerPos: { r: number; c: number },
  defenderPos: { r: number; c: number },
  nextGrid: Grid,
  isPlayerTurn: boolean
): void
```
- **Xử lý Armor AP (Xuyên Giáp)**:
  - Nếu `attacker.id === 'nva_d44_85mm'` (Pháo chống tăng D-44 85mm) hoặc mang thuộc tính xuyên giáp, lượng Giáp của `defender.armor` tức khắc bị coi là 0 (bỏ qua giáp).
- **Hấp Thụ Giáp Thiết Giáp (Heavy Armor Shielding)**:
  - Nếu xe tăng hay bọc thép đối phương gánh chịu sát thương cận chiến/oanh kích mà có giáp:
    `const absorption = Math.min(defender.armor, baseDmg);`
    `defender.armor -= absorption;` và sát thương thực chất vào DEF chỉ gánh `realDmg = baseDmg - absorption`.
- **Yếu Tố Phục Kích Địa Đạo (Guerrilla Ambush)**:
  - Hàng ngũ bộ binh bị thu hút trước *Local Guerrilla Cell*. Guerrilla Cell tiến hành phát súng đầu tiên chấn động triệt hạ trực tiếp đối phương trước khi gánh chịu bất kỳ phản sát thương nào. Nếu phản súng hạ gục mục tiêu, sát thương Guerrilla nhận là 0.
- **Patton Overkill HQ (Sát thương tràn Patton)**:
  - Khi xe tăng M48 Patton hạ gục bộ binh địch, sát thương dư thừa không gánh bởi bộ binh sẽ giáng thẳng trực diện nổ tung phòng tuyến bộ chỉ huy HQ địch.
- **Sát Thương Di Sản (ARVN 1st Infantry & Green Berets & ACAV)**:
  - Trực tiếp liên kết với các callback của React state như `setOpponentHQ`, `setPlayerHQ`, gọi hồi máu +2 HP cho Green Beret khi hạ gục địch, hay tự động hóa nhảy dù lính bộ binh ACAV 2/2 ra ngoài trận địa lúc xe bọc thép M113 bị tiêu diệt.

### 5.5 Hàm Kiểm Tra Cạm Bẫy và Kích Hoạt Di Chuyển `checkMoveTriggers`
Mỗi khi một thực thể chuyển dịch trên lưới 3x5, cạm bẫy và các thế trận cơ động đầm lầy được tính toán đồng bộ:
```typescript
function checkMoveTriggers(
  r: number,
  c: number,
  movingUnit: GridUnit,
  nextGrid: Grid,
  isPlayerMoving: boolean
): void
```
- **Bộc Phá Đặc Công Nước 126th SpecOps**:
  - Khi luồn sâu chạm hậu tuyến địch, SpecOps tự bạo tiêu diệt 1 pháo binh/không chiến địch cùng hàng.
- **Kích Nổ Bẫy Mìn Punji / Amber Trap / Landmines**:
  - Kích nổ bẫy mìn: gây 3 sát thương, loại bỏ bẫy khỏi tệp tin hoạt động và phong tỏa bằng Đóng Băng `frozenTurns = 1`.
- **Thải Loại Phạt Vùng Địa Hình (Amphibious/Swamp Operations)**:
  - Đơn vị được gán là Amphibious (Sông ngòi) cơ động vượt sông rạch vùng sớ lầm sình lầy Conflict Zone (Hàng 1) mà không gặp bất kỳ chậm trễ hay chi phí cản trở nào.

---

## VI. STYLING SYSTEM

### 6.1 Tailwind CSS v4 Integration

Tailwind v4 được tích hợp qua Vite plugin (không cần `tailwind.config.js`):

```typescript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
plugins: [react(), tailwindcss()]
```

```css
/* src/index.css */
@import "tailwindcss"; /* v4 syntax */
```

### 6.2 Design System (Informal)

**Color Palette:**
- `stone-950/900/800` — Dark backgrounds (command center)
- `amber-500/400` — Primary accent (gold, US currency)
- `red-500/700/950` — Danger, NVA faction, damage
- `emerald-400/500` — Health/DEF, success states
- `cyan-400/500` — Air units, tech elements
- `teal-600` — Uncommon rarity badge

**Typography Classes:**
- `font-mono` — Base UI, stats, tactical readouts
- `font-typewriter` — Card ability text (vintage feel)
- `font-heading` — Display titles, node names
- `font-sans` — Card names

**Recurring Patterns:**
```
Border: border-stone-800 / border-amber-500/40
Shadow: shadow-2xl / shadow-amber-950/60
Hover: hover:border-amber-500, hover:-translate-y-2
Animation: animate-pulse (boss nodes, warnings)
Backdrop: backdrop-blur-sm / bg-stone-950
```

### 6.3 Responsive Breakpoints

- **Mobile**: Stacked layout, mobile log toggle button
- **md (768px)**: Side panels appear
- **lg (1024px)**: Full desktop layout — grid-cols-12 campaign map

---

## VII. BUILD & DEPLOYMENT

### 7.1 Build Pipeline

```
npm run dev
    └─ vite --port=3000 --host=0.0.0.0
           ├─ HMR (disabled in AI Studio via DISABLE_HMR=true)
           ├─ @vitejs/plugin-react (Babel transform)
           ├─ @tailwindcss/vite (CSS JIT compiler)
           └─ Path alias: '@' → project root

npm run build
    └─ vite build
           ├─ TypeScript compile check
           ├─ Tree-shaking unused exports
           ├─ Asset hashing (JPG images in src/assets/images)
           └─ Output: dist/
```

### 7.2 Environment Variables

```bash
# Required
GEMINI_API_KEY=<your-key>    # Google Gemini AI access

# Optional (AI Studio integration)
DISABLE_HMR=true             # Disable Hot Module Replacement
```

### 7.3 AI Studio Integration

Dự án được sinh ra và host trên **Google AI Studio**. Một số config đặc biệt:
- `vite.config.ts`: `hmr` và `watch` được control bởi `DISABLE_HMR` env var
- `assets/.aistudio/`: Metadata của AI Studio (không chỉnh sửa thủ công)

---

## VIII. KNOWN TECHNICAL DEBT & IMPROVEMENT AREAS

| Issue | Severity | Mô tả |
|-------|----------|-------|
| `Battlefield.tsx` quá lớn | Medium | 2200+ dòng — nên tách ra `useGameState`, `useCombatEngine`, `useAIOpponent` hooks |
| AI Opponent đơn giản | Low | Greedy AI — chưa có pathfinding thực sự hoặc threat assessment |
| ~~No persistence~~ | ~~Medium~~ | **[CR-002 Solved]** Game state được save an toàn vào localStorage |
| Grid hardcoded 3×5 | Low | Grid size không configurable — khó mở rộng nếu cần 5×5 |
| ~~PropagandaPoster case list~~ | ~~Low~~ | **[CR-003 Mitigated]** Tích hợp Data-driven Pipeline ArtConfig thay vì SVG Hardcoding toàn phần |
| No unit tests | High | Đã có combat matrices unit tests, nhưng behavior hooks vẫn thiếu |
| Type assertion `(window as any)` | Low | Trong sound.ts cho webkitAudioContext |

### Refactoring Targets (Theo Độ Ưu Tiên)

1. ~~**High**: Thêm `localStorage` persistence cho `campaignState`~~ (Done)
2. **High**: Tách Battlefield thành sub-hooks (`useCombatEngine.ts`, `useAIOpponent.ts`)
3. **Medium**: Thêm full unit tests cho combat calculation functions 
4. **Medium**: Cải thiện AI opponent với basic threat scoring
5. ~~**Low**: Data-driven PropagandaPoster (SVG config JSON thay vì switch-case)~~ (Done via CR-003)
