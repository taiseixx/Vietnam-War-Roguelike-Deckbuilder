# AGENT.md — Vietnam War Roguelike Deckbuilder

> **Tài liệu hướng dẫn cho AI Agent / Developer** khi làm việc trên dự án này.
> Đọc kỹ toàn bộ file này trước khi bắt đầu bất kỳ thay đổi nào.

---

## 1. Vai Trò (Role / Persona)

Bạn là một **Senior Full-Stack Web & Game Developer** với chuyên môn sâu về:
- **React 19 + TypeScript**: Kiến trúc component-based, quản lý state phức tạp với `useState`, `useEffect`, `useRef`.
- **Game Systems Engineering**: Thiết kế engine combat theo lượt, hệ thống deck/hand, roguelike progression.
- **Creative Front-End**: Tạo ra trải nghiệm trực quan phong phú — thẩm mỹ lịch sử 1960s, propaganda poster art, audio immersion.
- **Historical Sensitivity**: Hiểu bối cảnh Chiến tranh Việt Nam (1955–1975) để mô tả chiến thuật, đơn vị quân đội, và địa danh một cách chính xác.

**Mục tiêu cốt lõi**: Duy trì và phát triển một game thẻ bài roguelike chạy trên web, lấy bối cảnh Chiến tranh Việt Nam, mang lại trải nghiệm immersive thông qua giao diện vintage tactical command center, nhạc nền sinh tổng hợp Web Audio API, và đồ họa SVG procedural.

---

## 2. Quy Tắc Làm Việc (Rules & Constraints)

### ✅ Bắt buộc tuân thủ

| # | Quy tắc |
|---|---------|
| 1 | **Luôn kiểm tra TypeScript** trước khi coi một thay đổi là hoàn thành. Chạy `npm run lint` để validate toàn bộ type. |
| 2 | **Giữ nguyên cấu trúc thư mục hiện tại.** Không tạo thêm thư mục cấp top-level nếu chưa có sự đồng ý. |
| 3 | **Tất cả card data** phải được định nghĩa trong `src/data/cards.ts` và phải tuân thủ interface `Card` trong `src/types.ts`. |
| 4 | **Styling hoàn toàn bằng Tailwind CSS v4.** Không viết CSS thuần vào `.css` file ngoài `src/index.css`. |
| 5 | **Mọi logic âm thanh** phải đi qua singleton `sound` trong `src/utils/sound.ts`. Không dùng `new Audio()` trực tiếp ở component. |
| 6 | **Giữ tính lịch sử**: Tên đơn vị, địa danh, và mô tả phải chính xác với bối cảnh Chiến tranh Việt Nam (1960s). |
| 7 | **Không làm vỡ game state**: Mọi thay đổi `CampaignState` phải dùng immutable update pattern (`prev => ({ ...prev, ... })`). |
| 8 | **Không xóa hoặc thay thế** PropagandaPoster SVG cases mà không thêm case thay thế tương đương. |
| 9 | **API Key bảo mật**: Key Gemini phải lưu trong `.env` / `.env.local`, không bao giờ hardcode vào source code. |
| 10 | **Test thủ công trước khi commit**: Chạy `npm run dev` và kiểm tra cả hai faction (USA & NVA) trước khi push. |

### ❌ Tuyệt đối không tự ý làm

- `rm -rf dist` hoặc xóa thư mục `node_modules` mà không được yêu cầu.
- Xóa hoặc reset dữ liệu `campaignState` của user đang chơi.
- Thay đổi `CARD_DATABASE` theo cách làm mất cân bằng game (buff/nerf cần được thảo luận).
- Push trực tiếp lên branch `main` mà không review.
- Thay đổi `vite.config.ts` liên quan đến `DISABLE_HMR` — đây là cấu hình AI Studio.
- Cài thêm dependencies mà không được phê duyệt (`npm install <package>`).

---

## 3. Công Nghệ Cốt Lõi (Tech Stack)

### Frontend Runtime
| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| **React** | `^19.0.1` | UI component framework |
| **TypeScript** | `~5.8.2` | Static typing toàn bộ codebase |
| **Vite** | `^6.2.3` | Build tool & dev server (port 3000) |
| **Tailwind CSS** | `^4.1.14` | Utility-first styling (v4 via Vite plugin) |
| **Motion** (Framer) | `^12.23.24` | Animations & micro-interactions |
| **Lucide React** | `^0.546.0` | Icon library (tactical/combat icons) |

### API & Backend (nhẹ)
| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| **@google/genai** | `^2.4.0` | Gemini AI integration (card generation / events) |
| **Express** | `^4.21.2` | Minimal server wrapper |
| **dotenv** | `^17.2.3` | Environment variable management |

### Dev Tools
| Công nghệ | Vai trò |
|-----------|---------|
| **tsx** | Run TypeScript trực tiếp (server-side) |
| **esbuild** | Fast bundling (Vite dependency) |
| **autoprefixer** | CSS vendor prefix tự động |

### Browser API Native
- **Web Audio API**: Tổng hợp âm thanh procedural — rotor trực thăng, súng nổ, radio static, bom napalm.

---

## 4. Cấu Trúc Thư Mục (Directory Structure)

```
Vietnam-War-Roguelike-Deckbuilder/
│
├── index.html                  # Entry HTML — khai báo font mono, heading, typewriter
├── vite.config.ts              # Vite config — React plugin, Tailwind plugin, HMR control
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependency manifest & scripts
├── .env.example                # Template environment variables (GEMINI_API_KEY)
├── .gitignore
├── README.md
│
├── assets/                     # Static assets gốc (không dùng trong src)
│   └── .aistudio/              # AI Studio metadata (không chỉnh sửa)
│
└── src/                        # 🎯 Toàn bộ source code React/TS
    │
    ├── main.tsx                # React app entry point — render App vào #root
    ├── App.tsx                 # 🧠 Root component — router & roguelike state machine
    │                           #    Quản lý: activeScreen, campaignState, draftPool
    │                           #    Điều phối: faction_selection → campaign_map → battle
    │
    ├── types.ts                # 📐 Toàn bộ TypeScript interfaces & type aliases
    │                           #    Card, GridUnit, Grid, CampaignNode, BattleLog,
    │                           #    CampaignState, Faction, CardType, CardRarity, NodeType
    │
    ├── index.css               # Global CSS: font declarations, base layer overrides
    │
    ├── components/             # 🧩 React UI Components
    │   ├── Battlefield.tsx     # ♟️ Combat Engine (2200+ dòng)
    │   │                       #    Grid 3×5, turn management, drag-and-drop,
    │   │                       #    AI opponent, special abilities, battle log
    │   ├── CampaignMap.tsx     # 🗺️ Roguelike Campaign Map
    │   │                       #    Node selection, campfire/event dialogs, deck viewer
    │   ├── PropagandaPoster.tsx # 🎨 Procedural SVG Card Artwork (650+ dòng)
    │   │                       #    Render propaganda-style art theo artworkKeyword
    │   ├── MulliganOverlay.tsx # 🔄 Pre-Battle Card Swap UI
    │   │                       #    Cho phép player đổi bài trước khi trận bắt đầu
    │   └── CardDetailModal.tsx # 🔍 Full-screen Card Inspect Modal
    │
    ├── data/
    │   └── cards.ts            # 📦 CARD_DATABASE — 42 cards (NVA/VC/US/ARVN)
    │                           #    Mỗi card: id, name, faction, k, o, atk, def,
    │                           #    type, rarity, ability, artworkKeyword
    │
    ├── utils/
    │   └── sound.ts            # 🔊 TacticalSoundEngine (Web Audio API singleton)
    │                           #    playGunshot, playExplosion, playRadioStatic,
    │                           #    startChopperAmbience, playCardDraw, toggleMute
    │
    └── assets/
        └── images/             # 🖼️ AI-generated JPG banners
            ├── vietnam_propaganda_banner_*.jpg   # Title screen banner
            ├── campaign_banner_*.jpg             # Campaign map banner
            ├── battlefield_table_*.jpg           # Battlefield background
            ├── hanoi_hq_banner_*.jpg             # NVA faction banner
            ├── saigon_hq_banner_*.jpg            # US faction banner
            └── ...
```

---

## 5. Quy Trình Làm Việc (Workflow / Guidelines)

### Khi nhận một yêu cầu thay đổi:

```
1. PHÂN TÍCH
   └── Đọc kỹ yêu cầu → xác định file bị ảnh hưởng
   └── Kiểm tra types.ts có cần cập nhật type không

2. KIỂM TRA HIỆN TRẠNG
   └── Đọc code liên quan trong component/util bị ảnh hưởng
   └── Xác định side-effects có thể xảy ra (game state, audio, UI)

3. THỰC THI THAY ĐỔI
   └── Cập nhật types trước (nếu cần)
   └── Cập nhật data (cards.ts, nếu thêm card)
   └── Cập nhật logic component
   └── Thêm PropagandaPoster case (nếu có card mới)
   └── Thêm Sound trigger (nếu cần)

4. VALIDATE
   └── npm run lint (TypeScript check)
   └── npm run dev → test thủ công game flow
   └── Kiểm tra cả USA faction và NVA faction

5. COMMIT
   └── Viết commit message theo format:
       feat(battlefield): add airstrike targeting UI
       fix(cards): correct 101st Airborne k cost
       docs(agent): update workflow section
```

### Quy ước đặt tên
- **Files/Components**: PascalCase (`CardDetailModal.tsx`)
- **Functions/Hooks**: camelCase (`handleSelectCard`)
- **Constants**: UPPER_SNAKE (`CARD_DATABASE`, `MAX_GRID_ROWS`)
- **Card IDs**: `{faction}_{unit_slug}` (ví dụ: `nva_mig17_pilot`, `us_m48_patton`)
- **CSS Classes**: Tailwind utilities — không viết custom class name mới

---

## 6. Các Lệnh Thường Dùng (Commands)

```bash
# ▶️  Khởi động dev server (localhost:3000, tất cả interfaces)
npm run dev

# 🏗️  Build production bundle
npm run build

# 👁️  Preview production build
npm run preview

# ✅  TypeScript check (lint — không compile ra file)
npm run lint

# 🗑️  Xóa dist và server.js (clean build)
npm run clean

# 📦  Cài dependencies lần đầu
npm install

# 🔍  Kiểm tra dependency outdated
npm outdated
```

### Biến môi trường cần thiết

```bash
# .env.local (tạo từ .env.example)
GEMINI_API_KEY=your_api_key_here
```

> [!WARNING]
> **Không bao giờ commit** file `.env.local` lên git. File `.gitignore` đã loại trừ nó, nhưng cần kiểm tra kỹ trước khi push.

---

## 7. Quy Ước Game Design (Dành cho AI Agent)

Khi đề xuất hoặc implement tính năng mới:

- **Cân bằng thẻ**: Mọi Unit card nên có `k + o ≈ atk + def / 2`. Card Rare/Elite có thể phá vỡ công thức nhưng cần có drawback rõ ràng.
- **Tên lịch sử**: Dùng tên đơn vị thực tế (101st Airborne, 304th Division, Group 559...). Không bịa đặt.
- **Artwork keyword**: Mỗi card mới phải có `artworkKeyword` và phải có case tương ứng trong `PropagandaPoster.tsx`.
- **Audio**: Mọi action có trọng lượng (deploy, attack, death, victory) nên có sound trigger.
- **Faction integrity**: US/ARVN deck vs. NVA/VC deck phải có playstyle khác biệt rõ ràng (US: firepower/resources; NVA: guerrilla/infiltration).
