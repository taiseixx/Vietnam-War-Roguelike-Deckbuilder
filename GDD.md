# GDD.md — Game Design Document
## Vietnam War Roguelike Deckbuilder

> **Phiên bản**: 1.0 | **Ngày**: Tháng 6, 2026
> Tài liệu này mô tả toàn bộ thiết kế game theo khung **Mechanics → Dynamics → Aesthetics (MDA)**.

---

## I. TỔNG QUAN (Overview)

### Khái niệm cốt lõi
**Vietnam War Roguelike Deckbuilder** là một game thẻ bài chiến thuật theo lượt (turn-based tactical card game) mang tính roguelike, lấy bối cảnh Chiến tranh Việt Nam (1960–1975). Người chơi chọn một trong hai phe lịch sử, xây dựng bộ bài từ các đơn vị quân đội và mệnh lệnh chiến thuật thực tế, rồi triển khai chúng trên một chiến trường lưới 3×5 để đánh bại Bộ Tư Lệnh (HQ) của đối phương.

### Elevator Pitch
> *"Chiến trường Việt Nam trong lòng bàn tay — Chỉ huy một chiến dịch, đưa ra quyết định sinh tử, và viết lại lịch sử từng ô vuông một."*

### Thể loại & Đối tượng
- **Thể loại**: Turn-based Tactical Card Game + Roguelike Campaign
- **Nền tảng**: Web Browser (Desktop-first, hỗ trợ Mobile)
- **Đối tượng**: Người chơi yêu thích chiến lược và lịch sử, 16+
- **Thời gian một session**: 20–40 phút (1 chiến dịch hoàn chỉnh)

---

## II. MDA FRAMEWORK

> **MDA** (Mechanics → Dynamics → Aesthetics) là khung thiết kế nhìn từ hai hướng:
> - **Nhà thiết kế** tạo ra *Mechanics* → dẫn đến *Dynamics* → tạo ra *Aesthetics*.
> - **Người chơi** trải nghiệm *Aesthetics* → được tạo ra bởi *Dynamics* → xuất phát từ *Mechanics*.

---

### A. AESTHETICS — Những Cảm Xúc Cốt Lõi

*Đây là những gì người chơi nên cảm nhận khi chơi.*

#### A1. Sensation — Ngập tràn giác quan lịch sử
- **Nhạc nền**: Tiếng rotor trực thăng Huey tổng hợp bằng Web Audio API — cảm giác như đang ở trong buồng lái, nhìn xuống rừng rậm Trường Sơn.
- **Hiệu ứng âm thanh**: Tiếng nổ súng M16/AK, static radio khi ra lệnh, tiếng bom napalm rung màn hình.
- **Hình ảnh**: Card artwork theo phong cách poster tuyên truyền vintage 1960s — đỏ/vàng cho NVA, xanh olive cho US/ARVN. Typography retro monospace.
- **Giao diện**: "Tactical Command Center" tối màu, font mono, border amber/stone — như màn hình radar trong phòng chiến.

#### A2. Narrative — Trọng lượng lịch sử
- Mỗi node campaign mang tên địa danh thực tế: **Vũng Tàu, A Shau Valley, Firebase Bravo, Iron Triangle, Khe Sanh**.
- Mỗi thẻ bài đại diện cho một đơn vị lịch sử thực tế: **101st Screaming Eagles, Group 559, MAAG Advisors, 304th Division**.
- Event nodes đặt người chơi vào những tình huống đạo đức khó: *"Đốt làng để ngăn tiếp tế? Hay bảo toàn dân thường?"*

#### A3. Challenge — Căng thẳng chiến thuật
- Quản lý đồng thời hai loại tài nguyên: **Kredit** (triển khai quân) và **Operation Cost** (hành động quân).
- Mỗi lượt đòi hỏi ưu tiên: *Triển khai đơn vị mới? Hay di chuyển quân hiện tại để chiếm vị trí tốt hơn?*
- Đối thủ AI hành động bất ngờ — không biết bài nào sẽ xuất hiện tiếp.

#### A4. Discovery — Khám phá combo & chiến thuật
- Khám phá ra synergy bất ngờ: MAAG Advisors + ARVN Regional Forces = ATK nhân đôi.
- Thẻ Countermeasure (bẫy) kích hoạt bất ngờ khi đối thủ không ngờ.
- Mỗi campaign run tạo ra tập bài khác nhau (random draft pool).

---

### B. DYNAMICS — Hành Vi Nổi Lên Trong Lúc Chơi

*Đây là những chiến lược, pattern và kịch bản thực tế xuất hiện từ mechanics.*

#### B1. Quản lý tài nguyên kép (Resource Management)
- Người chơi liên tục phải cân nhắc: *"Dùng Kredit để triển khai thêm quân, hay tiết kiệm vì Operation Cost của trận này cao?"*
- NVA có xu hướng deploy thêm quân (nhiều bài ít Kredit) → áp lực số lượng.
- US có xu hướng deploy ít quân mạnh hơn (nhiều Kredit, ít Operation) → chất lượng.

#### B2. Kiểm soát địa hình (Board Control)
- **Conflict Zone (Hàng 1 — trung tâm)** là điểm nóng — ai kiểm soát hàng này có lợi thế tấn công.
- Đơn vị Amphibious/Artillery có thể hoạt động mà không bị penalty địa hình.
- Đơn vị Camouflage trở nên "vô hình" với các đòn đánh từ xa — tạo ra lớp meta "bẫy và phục kích".

#### B3. Xây dựng deck qua chiến dịch (Roguelike Progression)
- Sau mỗi node, người chơi có thể draft thêm 1 thẻ từ pool ngẫu nhiên.
- Campfire choice: *Hồi phục HQ* hay *lấy thẻ mới*? — Đánh đổi ngắn hạn vs. dài hạn.
- Event nodes tạo ra trade-off: thêm Gold nhưng mất HP, hoặc buff nhẹ nhàng để bảo toàn sức lực.

#### B4. Mulligan Meta
- Trước mỗi trận, người chơi có thể đổi bất kỳ bài nào trong tay.
- Dẫn đến chiến lược: giữ lại bài combo quan trọng dù Kredit cost cao, đổi bài đơn độc không synergy.

#### B5. Tempo & Initiative
- Phe đi trước (US) có lợi thế early board nhưng opponent kéo 5 bài (NVA kéo nhiều hơn).
- Countermeasure cards tạo ra "trap meta" — buộc đối thủ phải chơi quanh các bẫy tiềm ẩn.

---

### C. MECHANICS — Luật Chơi Chi Tiết

#### C1. Cấu Trúc Chiến Dịch (Campaign Structure)

**Màn hình Chọn phe (Faction Selection)**
- Người chơi chọn **USA/ARVN** hoặc **NVA/VC**.
- Mỗi phe có bộ bài starter 15 thẻ riêng, phong cách hoàn toàn khác nhau.

**Bản đồ chiến dịch (Campaign Map)**
- 5 node theo trình tự tuyến tính, mỗi node là một địa danh lịch sử:

| Node | Tên | Loại | Đặc điểm |
|------|-----|------|-----------|
| 0 | Vũng Tàu Patrol Sector | `Combat` | Trận mở đầu — dễ nhất |
| 1 | A Shau Tactical Dilemma | `Event` | Lựa chọn đạo đức — thêm Gold hay giữ HP |
| 2 | Firebase Bravo | `Campfire` | Hồi phục +8 HQ hoặc draft thêm thẻ |
| 3 | Iron Triangle Trench Nest | `Elite` | Trận khó — enemy mạnh hơn |
| 4 | Siege of Khe Sanh Highlands | `Boss` | Final Boss — không có HQ heal sau đây |

#### C2. Tài Nguyên (Resources)

| Tài nguyên | Ký hiệu | Vai trò |
|------------|---------|---------|
| **Kredits** (K) | `$` / `🎫` | Chi phí triển khai (deploy) một thẻ lên board. Tăng +1 mỗi lượt (max không giới hạn). |
| **Operation Cost** (O) | `Op Cost` | Chi phí để di chuyển hoặc tấn công với đơn vị đã triển khai. |
| **Gold / Supplies** | `gold` | Tài nguyên chiến dịch. Thu từ chiến thắng, dùng ở Event nodes. |
| **HQ Defense** | `DEF` | "Máu" của Bộ Tư Lệnh. Bắt đầu ở 20. Giảm xuống 0 = thua. |

**Cơ chế Kredit ramp**: Mỗi lượt, Kredit tối đa tăng thêm 1 (bắt đầu từ 1). Mỗi lượt mới bổ sung đầy Kredit hiện tại. Điều này tạo ra curve rõ ràng — early game dùng thẻ rẻ, late game mở ra thẻ Elite đắt.

#### C3. Loại Thẻ (Card Types)

**Unit** — Đơn vị chiến đấu triển khai lên board
- Có ATK, DEF, Kredit cost, Operation cost
- Đứng trên grid và thực hiện hành động từng lượt
- Bị tiêu diệt khi DEF về 0

**Order** — Mệnh lệnh chiến thuật (tức thì)
- Hiệu ứng ngay lập tức khi chơi, không ở lại board
- ATK/DEF = 0 (không có stats)
- Ví dụ: Rapid March (+2 ATK), Truong Son Drive (draw 2 bài free)

**Countermeasure** — Bẫy phục kích (reactive)
- Đặt xuống board ở trạng thái ẩn
- Kích hoạt tự động khi điều kiện thỏa mãn
- Ví dụ: Ambush Trap (gây 3 damage khi enemy vào Conflict Zone)

#### C4. Hệ Thống Grid (Board Layout)

```
ROW 0: ████ [ OPPONENT HQ ] ████████████████████  ← Enemy Territory
        col0  col1  col2  col3  col4
       ┌────┬─────┬──────┬──────┬─────┐
  R0   │    │     │ 👁️HQ │     │     │  NVA Base Line
       ├────┼─────┼──────┼──────┼─────┤
  R1   │    │     │      │     │     │  Conflict Zone (Swamp/Jungle)
       ├────┼─────┼──────┼──────┼─────┤
  R2   │    │     │ 🏛️HQ │     │     │  US Support / Player Base Line
       └────┴─────┴──────┴──────┴─────┘
ROW 2: ████ [ PLAYER HQ ] █████████████████████  ← Friendly Territory
```

- **3 hàng × 5 cột** = 15 ô (trừ 2 ô HQ cố định)
- **Hàng 0**: Vùng deploy của đối thủ / Base Line địch
- **Hàng 1**: Conflict Zone — vùng giao tranh, terrain penalties cho non-Amphibious units
- **Hàng 2**: Vùng deploy của người chơi / Base Line ta

#### C5. Lượt Chơi (Turn Structure)

```
START OF TURN
    │
    ├─ [1] Ramp Kredits: maxKredits += 1; playerKredits = maxKredits
    │
    ├─ [2] Draw Phase: Rút 1 thẻ từ deck
    │
    ├─ [3] Action Phase (không giới hạn thời gian):
    │       ├─ Play Cards từ tay:
    │       │     • Unit: trả K → đặt lên ô trống trong hàng của mình
    │       │     • Order: trả K → hiệu ứng ngay lập tức
    │       │     • Countermeasure: trả K → đặt bẫy
    │       │
    │       └─ Điều khiển đơn vị trên board:
    │             • Di chuyển: trả O → dịch chuyển 1 ô
    │             • Tấn công: trả O → gây ATK damage vào mục tiêu
    │             • Mỗi đơn vị chỉ thực hiện 1 action/lượt
    │
    └─ [4] End Turn → AI Opponent thực hiện lượt của mình
```

#### C6. Độ Hiếm Thẻ (Card Rarity)

| Độ hiếm | Badge | Đặc điểm |
|---------|-------|-----------|
| **Common** | Stone | Thẻ cơ bản, giá rẻ, không có ability phức tạp |
| **Uncommon** | Teal | Có 1 ability có điều kiện |
| **Rare** | Amber | Ability mạnh, thường có synergy hoặc range attack |
| **Elite** | Red | Thẻ mạnh nhất — aura buff toàn board hoặc game-changing effect |

#### C7. Đặc Tính Đơn Vị (Unit Traits)

| Trait | Mô tả | Đơn vị ví dụ |
|-------|-------|--------------|
| `isAir` | Đơn vị không quân — không bị ảnh hưởng terrain | 1st Cav Airmobile, F-4 Phantom, MiG-17 |
| `isArtillery` | Ranged attack — không nhận retaliation damage | 40th Artillery Regiment |
| `isAmphibious` | Bỏ qua terrain penalty ở Conflict Zone | 803rd Riverine, 9th Division Riverines |
| `camouflage` | Ẩn với ranged/artillery — chỉ lộ khi tấn công | Foliage Camouflage Order |
| `frozenTurns` | Đơn vị bị đóng băng — không thể hành động | Surround & Isolate Order |
| `armor` | Lớp giáp bổ sung — hấp thụ damage trước DEF | Combat Engineers (HQ armor) |

#### C8. Các Phe (Factions)

**🇺🇸 USA / ARVN Alliance**
- **Phong cách**: Fire superiority — ít quân nhưng mạnh, nhiều support orders
- **Ưu điểm**: Kredits dồi dào, air superiority (heli/phantom), heavy armor, airstrike orders
- **Sub-faction ARVN**: Guard abilities, synergy bonus khi đứng cạnh US units

**🇻🇳 NVA / Viet Cong**
- **Phong cách**: Guerrilla warfare — nhiều quân, infiltration, traps
- **Ưu điểm**: Nhiều bài rẻ, tunnel transport, ambush traps, Ho Chi Minh Trail logistics
- **Sub-faction VC**: First-strike ambush, demolition strike, scorched earth retreat

---

## III. THIẾT KẾ CAMPAIGN (Roguelike Loop)

```
[FACTION SELECTION]
        │
        ▼
[CAMPAIGN MAP - Node Selection]
        │
        ├──▶ COMBAT/ELITE/BOSS Node
        │         │
        │         ├──▶ [BATTLE] Win → Reward Gold → Advance
        │         └──▶ [BATTLE] Lose → Campaign Over
        │
        ├──▶ EVENT Node
        │         └──▶ [CHOICE] A: +Gold/-HP | B: +HP/-Gold | C: Random card
        │
        └──▶ CAMPFIRE Node
                  └──▶ [CHOICE] Heal HQ (+8 DEF) | Draft card (add to deck)

[CAMPAIGN VICTORY / DEFEAT SCREEN]
        └──▶ Restart → Back to Faction Selection
```

---

## IV. THIẾT KẾ ÂM THANH (Audio Design)

| Sự kiện | Âm thanh | Cơ chế tổng hợp |
|---------|---------|-----------------|
| Ambient (battle) | Huey rotor thrum | Oscillator FM synthesis (55Hz carrier + 7.2Hz modulator) |
| Deploy card | Card draw thwick | BufferSource + bandpass filter |
| Attack / Gunshot | Rifle crack | White noise + bandpass 800Hz |
| Explosion / Order | Artillery boom | Noise + lowpass bass surge |
| Radio command | Radio static | White noise + bandpass 1000Hz |
| Select faction | Radio click | Short static burst |

---

## V. CÂN BẰNG GAME (Balance Philosophy)

### Công thức hướng dẫn
- **Common Unit**: `k ≈ 1–2`, `o ≈ 1–3`, `atk + def ≈ 3–5`
- **Uncommon Unit**: `k ≈ 2–3`, ability đơn giản, `atk + def ≈ 5–8`
- **Rare Unit**: `k ≈ 4–5`, ability mạnh, `atk + def ≈ 7–9`
- **Elite Unit**: `k ≈ 4–6`, game-changing ability, `atk + def ≈ 10–12`
- **Orders**: `k ≈ 1–5`, `o = 0` (không tốn Operation)
- **Countermeasures**: `k ≈ 1–3`, reactive trigger, zero upfront power

### Nguyên tắc asymmetry
- NVA có nhiều Common/Uncommon cards hơn → swarm strategy
- US có nhiều Rare/Elite cards hơn → quality over quantity
- VC specialty: trap và mobility (tunnel)
- ARVN specialty: defensive bonus khi synergy với US

---

## VI. ROADMAP MỞ RỘNG (Potential Future Features)

| Tính năng | Mô tả | Độ ưu tiên |
|-----------|-------|-----------|
| Multiplayer PvP | Chơi online 1v1 real-time | Cao |
| Extended Campaign | 10+ nodes với branching paths | Cao |
| Card Crafting | Dùng Gold để tạo/nâng cấp thẻ | Trung bình |
| Historical Scenarios | Pre-built decks cho trận đánh lịch sử | Trung bình |
| Sound Expansion | Import audio files (nhạc authentic 1960s) | Thấp |
| Mobile App | React Native port | Thấp |
