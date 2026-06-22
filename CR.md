# CR.md — Change Request Log
## Vietnam War Roguelike Deckbuilder

> [⬅️ Quay lại ROADMAP.md](ROADMAP.md)

> Tài liệu theo dõi các yêu cầu thay đổi lớn (Change Requests) đối với kiến trúc/scope game.
> Khác với AGENT.md (quy trình cho từng task nhỏ), CR.md theo dõi các initiative đa-bước, có rủi ro,
> cần rationale rõ ràng. KHÔNG xóa CR sau khi Done — giữ lại làm lịch sử quyết định.

### Quy ước Quản trị Tài liệu (Governance Rules)
1. Mọi tham chiếu CR-XXX mới thêm vào ROADMAP.md PHẢI đi kèm section CR-XXX tương ứng trong CR.md ngay trong cùng lần sửa — không cho phép tồn tại anchor link chỉ tới section chưa được tạo.
2. Trạng thái "Done" chỉ được thiết lập sau khi có sự xác nhận trực tiếp bằng văn bản từ Supervisor/Lead.

## Quy ước
- **Status**: `Proposed` → `Approved` → `In Progress` → `Done` | `Rejected` | `Superseded`
- Mỗi CR PHẢI có: Mục tiêu, Scope (in/out), Risk & Rollback, Acceptance Criteria
- Khi CR chuyển `Done`: PHẢI update GDD.md/TDD.md nếu có thay đổi design/architecture tương ứng
- Đánh số tuần tự: CR-001, CR-002, ... không tái sử dụng số đã dùng

---

## CR-001: Data-driven Combat Synergy System

**Status**: In Progress
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

**Status**: In Progress
**Priority**: P0
**Ngày tạo**: 2026-06-20
**Liên quan**: TDD.md "No persistence | Medium"

### Mục tiêu
Lưu campaign progress vào `localStorage` để refresh trang không làm mất tiến trình. `playerHQDef` là dữ liệu chiến dịch Meta cực kỳ quan trọng (Nhóm A), bắt buộc phải được duy trì xuyên suốt các trận đấu.

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

---

## CR-004: Automated Game Balancing Simulation & Telemetry System

**Status**: Paused
**Priority**: P2
**Ngày tạo**: 2026-06-20
**Liên quan**: ROADMAP.md Milestone 3, TDD.md risk table, future BALANCE.md

### Mục tiêu
Xây dựng hệ thống giả lập cân bằng tự động để chạy nhiều trận AI vs AI không cần giao diện, thu thập dữ liệu win-rate, tempo, survivability, card usage, và các outlier về sức mạnh thẻ.

### Scope
**In scope:**
- Thiết kế headless simulation runner có thể tái sử dụng combat/deck/campaign primitives hiện có.
- Ghi nhận telemetry tối thiểu cho card usage, faction win-rate, average turn count, damage output, và survival rate.
- Tạo baseline cho 42 card Gói 1 trước khi thêm Content Pack 2.
- Chuẩn bị cấu trúc tài liệu `BALANCE.md` để lưu kết quả chạy mô phỏng và khuyến nghị cân bằng.

**Out of scope:**
- Không tự động buff/nerf card mà không có review.
- Không thay thế playtest thủ công.
- Không thêm analytics/cloud telemetry cho người chơi thật.
- Không triển khai trước khi các lỗi ổn định UI mobile ưu tiên cao hơn được xử lý.

### Risk & Rollback
- **Risk**: mô phỏng sai luật có thể tạo dữ liệu cân bằng gây hiểu nhầm.
- **Giảm risk**: chỉ dùng runner sau khi combat regression tests pass và đối chiếu một số trận mẫu bằng log thủ công.
- **Rollback**: giữ telemetry là tooling tách biệt; nếu sai, bỏ kết quả mô phỏng mà không ảnh hưởng gameplay runtime.

### Acceptance Criteria
- [ ] Có runner chạy được tối thiểu 1,000 trận AI vs AI với seed hoặc cấu hình có thể tái lập.
- [ ] Xuất báo cáo win-rate, turn count, card usage, và outlier cards.
- [ ] `BALANCE.md` ghi baseline đầu tiên và giải thích cách đọc số liệu.
- [ ] Không thay đổi chỉ số card chỉ dựa trên simulation mà chưa có review.
- [ ] `npm run lint` và combat regression tests pass sau khi thêm tooling.

### Lý do tạm dừng
Tạm dừng để dọn dẹp lỗi và tối ưu UI mobile theo lộ trình Milestone 3 của ROADMAP.md.

---

## CR-005: Unified Card Frame & Proportional Viewport Scaling

**Status**: In Progress
**Priority**: P0
**Ngày tạo**: 2026-06-20
**Liên quan**: ROADMAP.md Milestone 2, BUG-005, `CardFrame.tsx`, `MulliganOverlay.tsx`, `Battlefield.tsx`

### Mục tiêu
Hợp nhất cách render card qua một khung hiển thị dùng chung và tối ưu trải nghiệm mobile bằng cơ chế scaling theo viewport, tránh tình trạng Mulligan hoặc Battlefield bị kéo dãn, tràn chiều cao, hoặc mất tỉ lệ trong iframe.

### Scope
**In scope:**
- Chuẩn hóa card presentation qua `CardFrame.tsx` cho các bề mặt UI cần hiển thị card.
- Tối ưu helper tính kích thước trong `src/utils/uiHelper.ts` để giữ tỉ lệ card ổn định trên mobile.
- Sửa layout render của `MulliganOverlay.tsx` và phần render/JSX liên quan trong `Battlefield.tsx` để tránh overflow.
- Kiểm tra ít nhất hai kích thước mobile trước khi tăng trạng thái verification cho BUG-005.

**Out of scope:**
- Không thay đổi turn/combat handlers hoặc logic xử lý trận.
- Không thay đổi dữ liệu card, combat effect, campaign persistence, hoặc AI behavior.
- Không đánh dấu BUG-005 là `Resolved` nếu chưa đủ quy trình xác nhận.

### Risk & Rollback
- **Risk**: thay đổi frame dùng chung có thể gây regression visual ở nhiều màn hình.
- **Giảm risk**: test từng bề mặt card chính, đặc biệt Mulligan và Battlefield mobile.
- **Rollback**: giới hạn thay đổi vào component/helper UI để có thể revert mà không ảnh hưởng combat state.

### Acceptance Criteria
- [ ] Card giữ đúng tỉ lệ trên desktop và mobile.
- [ ] Mulligan không bị stretched hoặc height overflow trong iframe/mobile viewport.
- [ ] Battlefield render không chồng lấn hoặc tràn chiều cao trên ít nhất hai mobile viewport.
- [ ] Không sửa handler logic/combat state trong `Battlefield.tsx`.
- [ ] BUG-005 verification counter được cập nhật đúng quy trình sau khi có bằng chứng test.

---

## CR-006: Content Pack 2 DLC

**Status**: Planned
**Priority**: P2
**Ngày tạo**: 2026-06-20
**Liên quan**: ROADMAP.md Milestone 4, CR-001, CR-003, GDD.md content roadmap

### Mục tiêu
Thiết kế và triển khai gói nội dung mở rộng đầu tiên với khoảng 20 thẻ bài mới, dựa trên hệ thống effect khai báo sau CR-001 và pipeline art data-driven sau CR-003.

### Scope
**In scope:**
- Thiết kế danh sách card mới có vai trò rõ ràng theo faction và archetype.
- Sử dụng `combatEffects`, `movementEffects`, `deployEffects`, hoặc schema tương đương sau khi CR-001 hoàn tất.
- Dùng pipeline art data-driven cho card mới thay vì thêm SVG case thủ công.
- Cập nhật GDD.md/TDD.md khi nội dung hoặc schema đã được xác nhận.

**Out of scope:**
- Không bắt đầu implement card mới trước khi CR-001 đủ ổn định.
- Không thêm mechanic yêu cầu hardcode mới trong combat core.
- Không thay đổi cân bằng Gói 1 như một phần của CR này trừ khi có CR cân bằng riêng.

### Risk & Rollback
- **Risk**: thêm nhiều card trước khi effect schema ổn định sẽ làm tăng nợ kỹ thuật.
- **Giảm risk**: chờ CR-001 được xác nhận, sau đó thêm card theo từng nhóm nhỏ có test.
- **Rollback**: card mới có thể bị feature-flag hoặc loại khỏi pool nếu gây lỗi hoặc mất cân bằng.

### Acceptance Criteria
- [ ] Danh sách card mới có mô tả faction, rarity, cost, stats, effect, và artwork keyword/config.
- [ ] Không cần sửa core combat logic để thêm bất kỳ card mới nào.
- [ ] Card mới render được qua pipeline art data-driven.
- [ ] Có test hoặc checklist regression cho effect mới.
- [ ] GDD.md và TDD.md được cập nhật khi nội dung chuyển từ planned sang implementation.
