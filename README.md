# Vietnam War Roguelike Deckbuilder 🇻🇳⚔️
> **Quyết chiến tại Đông Dương** — Trò chơi bài roguelike chiến thuật tái hiện chiến tranh Việt Nam với lối chơi đấu trí đỉnh cao trên sa bàn 3x5.

---

## 🗺️ Tài liệu Chỉ huy Chiến lược (Strategic Command)
**[ROADMAP.md](ROADMAP.md)**: Tài liệu thượng tầng quản lý lộ trình phát triển, các Milestone và danh mục tài liệu toàn dự án.

---

**Vietnam War Roguelike Deckbuilder** là một tựa game chiến thuật thẻ bài roguelike màn hình ngang, nơi người chơi bước vào vai trò chỉ huy quân đội chiến đấu trên một sa bàn ô lưới 3x5 đầy rẫy hiểm nguy. Trò chơi là sự kết hợp sâu sắc giữa công tác hậu cần (Kredits), quy hoạch quân nhu, tuyến tác xạ phòng thủ bọc phá, và các học thuyết quân sự lịch sử dưới góc nhìn chiến thuật chân thực và khách quan.

---

## 1. Điểm Nhấn Kiến Trúc (Architectural Highlights)

Dự án được xây dựng dựa trên nguyên lý **Clean Architecture** và các phương pháp thiết kế phần mềm tiên tiến nhằm đảm bảo tính bảo trì, khả năng mở rộng cao, và cách ly hoàn toàn các tác vụ side-effect khỏi nhân xử lý nghiệp vụ (Core Engine).

### 🛡️ Decoupled Combat Engine (SOLID & DRY)
Động cơ tính toán giao tranh hoàn toàn độc lập và thuần khiết (Pure Engine) được tách biệt khỏi luồng render của React tại mục `src/logic/combatEngine.ts`. 
- **Không có React State / Hook**: Tất cả các hành vi di chuyển, tác xạ, phản kích, bộc phá sát thương đều là các hàm thuần khiết (Pure Functions) nhận tham số đầu vào và trả ra trạng thái mới rời rạc.
- **Tối ưu hóa Hiệu năng (Shallow & Selective Deep Cloning)**: Loại bỏ triệt để phép sao chép sâu đắt đỏ `JSON.parse(JSON.stringify(grid))` cũ bằng cơ chế **Structural Sharing** thông minh (sao chép mảng hai chiều nông, đồng thời nhân bản sâu chọn lọc các mảng hiệu ứng lồng nhau `combatEffects`, `movementEffects`, và `deployEffects`). Cách tiếp cận này giúp cô lập hoàn toàn trạng thái giữa Grid cũ và Grid mới, ngăn ngừa rò rỉ đột biến (mutability leaks) mà vẫn giữ nguyên tốc độ xử lý vượt trội.

### 🧩 Data-Driven Synergy Schema (Trigger-Condition-Action Model)
Các hiệp lực tinh nhuệ (Synergies) của 12+ đơn vị quân sự lịch sử (như *Sư Đoàn 320 Thép*, *Đặc công Thủy 126*, *Trận địa Phục kích Punji*, *Xe bọc thép ACAV*) được cấu trúc hóa theo mô hình khai báo Declarative Schema. Thay vì viết hardcode kiểm tra ID thẻ bài rải rác trong UI, engine đọc trực tiếp mảng hiệu ứng động từ `types.ts`:

```typescript
export interface CombatEffect {
  trigger: 'onAttack' | 'onDefend' | 'onDeath' | 'onKill' | 'onSurviveDefend';
  condition?: {
    targetIsArmored?: boolean;
    targetUnitType?: UnitType;
    locationRow?: number;
    isMeleeAttack?: boolean;
    isRangedAttack?: boolean;
  };
  action: {
    type: 'addAtk' | 'multAtk' | 'reduceDmgTaken' | 'overkillToHQ' | 'spawnUnit' | 'healFullAndExtraAction' | 'permanentAtkBuff';
    value?: number;
    spawnCardId?: string;
  };
}
```

*Ví dụ cấu hình của thẻ bài **Nhóm Đặc nhiệm 5th Special Forces (Green Berets)***:
```json
{
  "id": "us_5th_specops",
  "name": "5th Special Forces (Green Berets)",
  "combatEffects": [
    {
      "trigger": "onKill",
      "action": { "type": "healFullAndExtraAction" }
    }
  ]
}
```

### 🧪 Deterministic Test Suite
Bộ kiểm thử hồi quy gồm **29 ca tác xạ tiêu chuẩn** được xây dựng trong `src/utils/combat_test.ts` nhằm chạy kiểm thử tự động, nhanh chóng mà không cần nạp môi trường trình duyệt JSDOM phức tạp.
- Sử dụng trực tiếp `tsx` thực thi qua Node.js để chạy kiểm tra độ chính xác của bảng ma trận khắc chế binh chủng (Infantry, Tank, Aircraft, Artillery), các cơ chế giảm sát thương giáp, tính toán bộc phá và sát thương tràn overkill dội thẳng vào HQ.

### 💾 Safe Persistence Layer & Over-Quota Protections
Cơ chế tự động lưu tiến trình chiến dịch vào `localStorage` được thiết kế cực kỳ an toàn tại `src/logic/campaignPersistence.ts`:
- **Đóng gói Dữ liệu Tuần tự (Metadata Versioning Wrapper)**: Lưu trữ trạng thái thông qua lớp cấu trúc bọc gồm `version` quản lý phiên bản và `timestamp`, loại bỏ triệt để lỗi thời dữ liệu (zombie states).
- **Phòng thủ Trình duyệt Giới hạn / Ẩn danh (Defensive Error Mitigation)**: Quấn tất cả mã hóa lưu trữ trong các khối lệnh `try / catch` tinh tế. Nếu người dùng mở tab ẩn danh (Private Browsing) hoặc dung lượng lưu trữ đầy phát sinh lỗi `QuotaExceededError`, tiến trình game vẫn vận hành mượt mà bình thường thay vì gây sụp hay đóng băng (freeze) luồng kết xuất chính của React.
- **Tương thích ngược & Cấu chuẩn Hydration (Backward Compatibility & Safe Hydration)**: Hồi phục dữ liệu cũ thông qua bộ kiểm duyệt có hỗ trợ bọc dữ liệu trực tiếp hoặc tự động phục hồi cấu hình an toàn mặc định nếu phát hiện phá vỡ cấu trúc dữ liệu.

---

## 2. Sơ Đồ Cấu Trúc Thư Mục (Directory Layout)

```text
├── src/
│   ├── components/           # UI Components (React)
│   │   ├── Battlefield.tsx       # Sa bàn tác chiến 3x5 & Core Gameplay UI
│   │   ├── CampaignMap.tsx       # Bản đồ chiến dịch Roguelike Nodes
│   │   ├── CardDetailModal.tsx   # Panel chi tiết thông số & hiệu ứng thẻ bài
│   │   ├── CardFrame.tsx         # Thành phần hiển thị thẻ bài nguyên tử & Responsive
│   │   ├── MulliganOverlay.tsx   # Giao diện thay bài (Mulligan) đầu trận
│   │   └── PropagandaPoster.tsx  # Thành phần nghệ thuật & Visual Identity
│   ├── logic/                # Động cơ Game & Hệ thống Lưu trữ (Pure Logic)
│   │   ├── combatEngine.ts       # Nhân xử lý giao tranh (Deterministic Engine)
│   │   └── campaignPersistence.ts# Bộ điều phối & Bảo mật dữ liệu LocalStorage
│   ├── data/                 # Cơ sở dữ liệu tĩnh
│   │   └── cards.ts              # Database 42+ thẻ bài quân sự (TCA Schema)
│   ├── utils/                # Tiện ích bổ trợ & Test Suite
│   │   ├── combat_test.ts        # Hệ thống kiểm thử tự động 29 kịch bản
│   │   ├── deck.ts               # Logic sinh bài & Xử lý bộ bài Faction
│   │   ├── uiHelper.ts           # Tiện ích tính toán Responsive & Debounce
│   │   └── sound.ts              # Quản lý hiệu ứng âm thanh & Radio Static
│   ├── assets/               # Tài nguyên hình ảnh & Âm thanh
│   ├── types.ts              # Hệ thống định nghĩa Model & TCA Effect Schema
│   ├── App.tsx               # Root Component & Quản lý State chiến dịch
│   ├── main.tsx              # Entry point của ứng dụng (Vite)
│   ├── index.css             # Global Styles & Tailwind Configuration
│   └── vite-env.d.ts         # Khai báo môi trường TypeScript
├── package.json              # Script vận hành, Test & Dependency Management
├── vite.config.ts            # Cấu hình Build tool & Plugin React
├── ROADMAP.md                # Tài liệu chỉ huy chiến lược & Master Index
├── GDD.md                    # Game Design Document (Mô tả hệ thống & Thiết kế màng chơi)
├── TDD.md                    # Technical Design Document (Cấu trúc Kỹ thuật & Luồng dữ liệu)
├── CR.md                     # Code Review Data (Nhật ký Audit & Phê duyệt mã nguồn)
├── BUG.md                    # Hệ thống theo dõi lỗi & Quy trình xác minh 5 lượt chat
├── AGENT.md                  # Hướng dẫn quy tắc (Instructions parameters) cho Agent
└── README.md                 # Tài liệu hướng dẫn dự án (Production-Grade)
```

---

## 3. Quy Tắc Trận Đánh (Gameplay Mechanics)

Trò chơi phân định thắng thua dựa trên chỉ số Sinh mệnh phòng thủ của **Bộ Chỉ Huy (HQ)** (mặc định 20 HP).

### Sa Bàn Ô Lưới (Grid Layout)
Chiến trường bao gồm 3 hàng ngang và 5 cột dọc:
- **Tuyến Hậu Phương (Support Row)**: Nơi triển khai pháo binh tầm xa (Artillery) hoặc không kích phối thuộc (Aircraft).
- **Tuyến Tranh Chấp (Conflict Zone)**: Nơi diễn ra các trận áp sát giáp chiến oanh liệt của bộ binh (Infantry) và xe tăng thiết giáp (Tank).
- **Tuyến Đối Phương**: Nơi án ngữ các đơn vị phòng tuyến và pháo đài của kẻ thù.

### Tác Xạ & Phản Kích (Combat Matrix)
- **Cận Chiến (Infantry / Tank)**: Tấn công trực diện hàng kế cận, cả hai đơn vị đồng thời gây sát thương toàn phần lên nhau. Tuy nhiên, đơn vị có hiệp lực **Ambush** (Phục kích) tấn công trước và tiêu diệt mục tiêu mà không chịu bất cứ phản kích nào.
- **Yểm Trợ Bắn Loạt (Artillery)**: Tác xạ từ xa, bắn phá mục tiêu mà không chịu bất kỳ sát thương phản kích nào từ binh chủng bộ binh/xe tăng cận chiến.
- **Thống Trị Bầu Trời (Aircraft)**: Các trực thăng và máy bay ném bom chỉ nhận **50%** sát thương phản kích từ Bộ binh đất đối không, nhưng phải chịu **100%** sát thương phản kích đầy đủ từ Xe tăng trang bị pháo tháp và bộ đôi súng máy Heavy Machine Gun (Flak gấp 2 lần sát thương).

---

## 4. Hướng Dẫn Vận Hành Hệ Thống (Developer Guide)

> Hãy đảm bảo bạn đã cài đặt môi trường **Node.js LTS v18+**.

### Cài đặt các thư viện thiết yếu
```bash
npm install
```

### Chạy máy chủ phát triển cục bộ (Local Development)
```bash
npm run dev
```
*Giao diện phòng tác chiến sẽ khởi chạy tại địa chỉ mặc định: [http://localhost:3000](http://localhost:3000)*

### Thực thi Suite kiểm thử nghiệm thuần khiết (Isolated Core Testing)
```bash
npm run test
```
*Lệnh này sẽ khởi động trình thông dịch siêu tốc `tsx` để quét toàn bộ 29 ca kiểm thử logic tác xạ ngặt nghèo trong `src/utils/combat_test.ts`*:
```text
===============================================================================
                EAST ASIA THEATER COMBAT MATRIX TEST RETRIEVER                 
===============================================================================
[PASS] 1. Infantry vs Infantry (Standard melee brawl, reciprocal full damage)
[PASS] 2. Infantry vs Tank (Reciprocal damage to armored steel)
...
[PASS] 28. vc_126th_specops Demolition Strike (Support Line demolition - player moving up)
[PASS] 29. 126th SpecOps Relative Directional Trigger (AI moving down to Row 2)
===============================================================================
TEST RUN COMPLETE: 29/29 TESTS PASSED SUCCESSFULLY!
===============================================================================
```

### Đóng gói sản phẩm (Production Build)
```bash
npm run build
```

---

## 5. Danh Sách Hiệp Lực Thẻ Bài Tiêu Biểu (Named Synergies Showcase)

| ID Thẻ bài | Tên Đơn vị | Binh chủng | Tác dụng Hiệp lực đặc trưng |
| :--- | :--- | :--- | :--- |
| `nva_320th_steel` | **Sư Đoàn 320 Thép** | Infantry | **Armor Breakers**: Đạt thêm +1 ATK dũng mãnh cả khi công hoặc thủ trước Xe tăng. |
| `nva_hmg_team` | **Tổ Súng máy Hạng nặng** | Infantry | **Anti-Air Flak**: Đóng vai trò phòng không, nhân x2 sát thương dội ngược lên Aircraft của không lực kẻ địch. |
| `vc_guerrilla_cell`| **Tổ Du kích Địa phương** | Infantry | **Ambusher**: Đạt tính năng tác xạ trước tiên, hủy diệt đối phương cận chiến cận kề không tốn máu. |
| `us_combat_engineers`| **Công binh Thủy quân Lục chiến** | Infantry | **Mine Sweeper**: Loại bỏ toàn bộ các bẫy mìn chôn giấu của Viet Cong trên sa bàn Conflict hàng 1 khi deploy. |
| `us_9th_riverines` | **Lữ đoàn 9 Thủy bộ** | Infantry | **Swamp Mastery**: Tăng thêm +2 ATK khi tác chiến dưới dầm lầy sông ngòi (hàng Conflict 1). |

---

> 📢 **Bản quyền**: Bản phát hành trò chơi mang tính giáo dục, phục hồi tư liệu lịch sử dưới dạng chiến thuật thuần khiết lành mạnh. Hãy trải nghiệm trực quan để cảm nhận sâu sắc những câu chuyện lịch sử hào hùng của dân tộc Việt Nam.
