# CR.md — Change Request Log
## Vietnam War Roguelike Deckbuilder

> [⬅️ Quay lại ROADMAP.md](ROADMAP.md)

> Tài liệu theo dõi các yêu cầu thay đổi lớn (Change Requests) đối với kiến trúc/scope game.
> Khác với AGENT.md (quy trình cho từng task nhỏ), CR.md theo dõi các initiative đa-bước, có rủi ro,
> cần rationale rõ ràng. KHÔNG xóa CR sau khi Done — giữ lại làm lịch sử quyết định.

## Quy ước
- **Status**: `Proposed` → `Approved` → `In Progress` → `Done` | `Rejected` | `Superseded`
- Mỗi CR PHẢI có: Mục tiêu, Scope (in/out), Risk & Rollback, Acceptance Criteria
- Khi CR chuyển `Done`: PHẢI update GDD.md/TDD.md nếu có thay đổi design/architecture tương ứng
- Đánh số tuần tự: CR-001, CR-002, ... không tái sử dụng số đã dùng

---

## CR-001: Data-driven Combat Synergy System

**Status**: Approved
**Priority**: P0
**Ngày tạo**: 2026-06-20
**Liên quan**: TDD.md Section VIII (dòng "AI Opponent đơn giản", "Battlefield.tsx quá lớn")

### Mục tiêu
Loại bỏ hardcode synergy theo `card.id` literal trong `resolveCombatEngagement`, thay bằng hệ thống effect khai báo (declarative) để mỗi card mới ở Gói 2/3/4 không cần sửa trực tiếp vào core combat function.

### Scope
**In scope:**
- Thiết kế schema effect (trigger/condition/action) gắn vào `Card` type
- Migrate TOÀN BỘ synergy hiện có sang schema mới, giữ nguyên 100% behavior:
  - 320th Steel Division (Armor Breaker +1 ATK vs Armor)
  - Heavy Machine Gun Team (Anti-Air Flak x2)
  - 9th Riverines (+2 ATK ở Conflict Zone)
  - Local Guerrilla Cell (First-Strike Ambush)
  - 7th Armored Cav (Escort -1 dmg từ ranged)
  - M48 Patton (Overkill → HQ damage)
  - M113 ACAV (spawn ACAV Squad khi chết)
  - 5th Special Forces (heal full + extra action khi kill)
  - ARVN 1st Infantry (Battle Hardened +1 ATK vĩnh viễn khi sống sót)
  - 126th SpecOps (Demolition Strike), MiG-17 (Air Supremacy) — và toàn bộ effect khác liệt kê ở GDD.md C11
- Viết test harness cho 16-case combat matrix (GDD.md C7) làm regression baseline TRƯỚC khi refactor

**Out of scope:**
- Không đổi bất kỳ giá trị ATK/DEF/Cost nào của card hiện có
- Không thêm card mới (đó là CR riêng cho Gói 2)
- Không động vào AI opponent logic (giữ nguyên `executeOpponentAITurn`)

### Risk & Rollback
- **Risk chính**: refactor động vào hàm trung tâm nhất của game — nếu sai, MỌI trận đấu vỡ.
- **Giảm risk**: viết test matrix TRƯỚC, chạy lại SAU mỗi synergy migrate — không migrate hàng loạt cùng lúc.
- **Rollback**: giữ `resolveCombatEngagement` cũ trong git history, chỉ merge khi toàn bộ test matrix + manual playtest pass.

### Acceptance Criteria
- [ ] 16/16 case trong combat matrix (GDD C7) cho kết quả giống behavior cũ
- [ ] Toàn bộ synergy liệt kê ở "Scope" hoạt động giống cũ (verify bằng test + log message)
- [ ] `resolveCombatEngagement` không còn literal `card.id ===` check nào cho mục đích synergy
- [ ] `npm run lint` pass, không TypeScript error mới
- [ ] GDD.md C11 được update để mô tả effect schema mới (không xóa mô tả synergy, chỉ đổi cách implement)

---

## CR-002: Campaign Persistence (localStorage)

**Status**: Approved
**Priority**: P0
**Ngày tạo**: 2026-06-20
**Liên quan**: TDD.md "No persistence | Medium"

### Mục tiêu
Lưu campaign progress vào `localStorage` để refresh trang không làm mất tiến trình. KHÔNG lưu mid-battle state (quyết định có chủ đích — xem Rationale).

### Scope
**In scope:**
- Audit `CampaignState` type — phân loại field nào thực sự campaign-meta (nên persist) vs field nhìn giống battle-state vestigial (`playerHand`, `opponentHand`, `playerHQDef`, `opponentHQDef`, `activeBattleNode` — cần xác nhận lại, có thể dọn dẹp type)
- Persist: `currentFaction`, `playerDeck`, `completedNodes`, `currentNodeId`, `nodes`, `gold`, `xp`, `level`
- Save trigger: sau mỗi lần campaign state thay đổi có ý nghĩa (hoàn thành node, draft card, campfire choice)
- Load: khi app khởi động, kiểm tra `localStorage` — có save thì hydrate, không có thì campaign mới

**Out of scope:**
- Mid-battle grid/turn state — nếu user refresh giữa trận, trận đó mất, quay về campaign map ở node hiện tại (chưa hoàn thành)
- Multi-save-slot — chỉ 1 save duy nhất
- Cloud sync

### Rationale
Mid-battle persistence yêu cầu serialize toàn bộ `Grid`, turn state, animation state — phức tạp hóa không tương xứng với giá trị (user quyết định: chấp nhận mất 1 trận nếu refresh, không chấp nhận mất cả campaign).

### Risk & Rollback
- **Risk**: nếu `CampaignState` type thực sự lẫn battle-state field (cần audit), serialize sai có thể gây bug khi load lại.
- **Rollback**: tính năng cộng thêm (additive) — nếu lỗi, disable load mà không ảnh hưởng gameplay khác.

### Acceptance Criteria
- [ ] Refresh trang giữa campaign (không trong trận) → giữ nguyên deck, gold, xp, node đã hoàn thành
- [ ] Refresh giữa trận → quay về campaign map, node đó chưa completed (không crash, không state rác)
- [ ] Field nào KHÔNG được persist phải được document rõ trong TDD.md
- [ ] Có cơ chế "New Campaign" để xóa save cũ và bắt đầu lại

---

## CR-003: Data-driven Art Pipeline (Temporary Solution)

**Status**: Done
**Priority**: P1 (sau CR-001, CR-002)
**Ngày tạo**: 2026-06-20
**Liên quan**: TDD.md "PropagandaPoster case list | Low" — nâng priority vì roadmap 4 gói content

### Mục tiêu
Tạo hệ thống template SVG tham số hóa (config-driven) để card mới ở Gói 2+ không cần vẽ tay 1 switch-case riêng. Đây là giải pháp TẠM THỜI (chấp nhận chất lượng art thấp hơn 1-1 hand-drawn) để không chặn content pipeline.

### Scope
**In scope:**
- Thiết kế 4-6 template silhouette tái sử dụng (Infantry/Tank/Aircraft/Artillery/Order/Countermeasure) tham số hóa theo: màu chủ đạo (theo faction), icon overlay (theo unit), badge hiếm
- Card MỚI (Gói 2 trở đi) dùng template system này qua config object ngắn, không viết SVG case
- Card CŨ (42 cards Gói 1 hiện có): GIỮ NGUYÊN switch-case cũ, không migrate — tránh risk regression hình ảnh không cần thiết

**Out of scope:**
- Không vẽ lại/migrate 42 card hiện có sang template mới
- Không phải giải pháp final — ghi rõ trong TDD.md đây là temporary, sẽ revisit khi có resource art

### Acceptance Criteria
- [x] Thêm 1 card mới (test case) chỉ cần viết config object, không cần thêm SVG case
- [x] 42 card cũ render y nguyên như trước (zero visual regression)
- [x] TDD.md ghi rõ "temporary" + điều kiện để revisit (ví dụ: khi có dedicated artist hoặc image-gen pipeline)

---

## Lịch sử thay đổi
| Ngày | CR | Status | Note |
|------|-----|--------|------|
| 2026-06-20 | CR-001, CR-002, CR-003 | Approved | Khởi tạo sau code audit toàn diện |
| 2026-06-20 | CR-003 | Done | Tích hợp hệ thống ArtTemplateConfig vào PropagandaPoster |
