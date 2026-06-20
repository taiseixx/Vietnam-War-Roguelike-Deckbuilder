# ROADMAP.md — Strategic Roadmap & Master Index
## Vietnam War Roguelike Deckbuilder

> Tài liệu định hướng chiến lược thượng tầng của dự án. 
> Quản lý các Cột mốc (Milestones), lộ trình phát hành tính năng và liên kết trực tiếp tới các tài liệu chuyên biệt.

---

## 🗺️ Bản đồ Liên kết Tài liệu (Documentation Registry)

Mọi chỉnh sửa trong dự án phải tuân thủ luồng tham chiếu phân cấp dưới đây:
1. **Chiến lược tổng thể**: [ROADMAP.md](ROADMAP.md) (Quản lý tiến độ Milestones).
2. **Quản lý thay đổi**: [CR.md](CR.md) (Nhật ký các sáng kiến thay đổi kiến trúc lớn, được liên kết từ ROADMAP).
3. **Đặc tả thiết kế game**: [GDD.md](GDD.md) (Cập nhật quy tắc chơi game sau khi mỗi CR chuyển sang `Done`).
4. **Đặc tả kỹ thuật**: [TDD.md](TDD.md) (Cập nhật giải pháp công nghệ và cấu trúc dữ liệu sau khi mỗi CR chuyển sang `Done`).
5. **Kiểm soát chất lượng**: [BUG.md](BUG.md) (Theo dõi lỗi phát sinh trong quá trình thực hiện các Milestone).

---

## 📅 Lộ trình Phát triển & Các Cột mốc Chiến lược (Project Milestones)

### 📍 Milestone 1: Tái cấu trúc nền tảng & Khử nợ kỹ thuật (Foundation & Core Refactoring)
* **Mục tiêu**: Tách biệt hoàn toàn lõi tính toán game khỏi UI React, chuyển đổi sang cơ chế khai báo (data-driven) cho cả tác xạ (combat), di chuyển (movement), và dựng hình đồ họa (rendering).
* **Trạng thái**: **HOÀN THÀNH (DONE)**
* **Thay đổi kiến trúc liên quan**:
  - [CR-001: Data-driven Combat Synergy System](CR.md#cr-001-data-driven-combat-synergy-system) $\rightarrow$ Đã chuyển sang `Done`. Cập nhật đặc tả tại [GDD.md Section C11](GDD.md) và [TDD.md Section VIII](TDD.md).
  - [CR-002: Campaign Persistence (localStorage)](CR.md#cr-002-campaign-persistence-localstorage) $\rightarrow$ Đã chuyển sang `Done`. Cập nhật giải pháp an toàn dữ liệu tại [TDD.md](TDD.md).
  - [CR-003: Data-driven Art Pipeline (Temporary Solution)](CR.md#cr-003-data-driven-art-pipeline-temporary-solution) $\rightarrow$ Đã chuyển sang `Done`. Cập nhật cơ chế tối ưu SVG tại [TDD.md](TDD.md).
* **Kiểm soát chất lượng**:
  - [BUG-001, BUG-002, BUG-003, BUG-004](BUG.md) đã được vá và đang trong thời gian thử thách 5 lượt chat để đóng hoàn toàn.

---

### 📍 Milestone 2: Tối ưu hóa Trải nghiệm Di động (Mobile UX/UI Optimization)
* **Mục tiêu**: Hợp nhất hiển thị thẻ bài thông qua một Component nguyên tử duy nhất, tối ưu hóa diện tích hiển thị trên mobile bằng giải pháp co giãn đồng dạng (Scale-based viewport).
* **Trạng thái**: **ĐANG TRIỂN KHAI (IN PROGRESS)**
* **Thay đổi kiến trúc liên quan**:
  - `CR-005: Unified Card Frame & Proportional Viewport Scaling` (Đang triển khai - xem [CR.md](CR.md)).
* **Kiểm soát chất lượng**:
  - [BUG-005: Mobile Viewport / Iframe Mulligan Stretched & Height Overflow Bug](BUG.md) $\rightarrow$ Fixed - Verification Pending [1/5].
* **Đặc tả chịu ảnh hưởng**:
  - [TDD.md](TDD.md) (Bổ sung cấu trúc `CardFrame.tsx`, `uiHelper.ts` và cơ chế tính toán đơn vị tương đối).

---

### 📍 Milestone 3: Hệ thống Giả lập Cân bằng & Đo lường Tự động (Telemetry & Balancing)
* **Mục tiêu**: Xây dựng bộ giả lập không đầu (headless simulator) chạy 1,000 trận đấu AI vs AI tự động để thu thập dữ liệu cân bằng của 42 quân bài Gói 1 và tự động cập nhật nhật ký cân bằng.
* **Trạng thái**: **TẠM HOÃN (PAUSED - Ưu tiên nâng cao độ ổn định)**
* **Thay đổi kiến trúc liên quan**:
  - [CR-004: Automated Game Balancing Simulation](CR.md#cr-004-automated-game-balancing-simulation--telemetry-system) $\rightarrow$ Trạng thái: `Approved` (Tạm dừng để dọn dẹp lỗi và tối ưu UI mobile).
* **Đặc tả chịu ảnh hưởng**:
  - Khởi tạo tài liệu [BALANCE.md](BALANCE.md) để ghi nhận Baseline thực tế của 1,000 trận đấu.

---

### 📍 Milestone 4: Gói nội dung mở rộng số 1 (Content Pack 2 DLC)
* **Mục tiêu**: Phát hành 20 thẻ bài mới, giới thiệu các cơ chế đặc biệt mới dựa hoàn toàn trên hệ thống Effect khai báo đã hoàn thiện ở Milestone 1 mà không cần can thiệp vào core logic code.
* **Trạng thái**: **LÊN KẾ HOẠCH (PLANNED)**
* **Thay đổi kiến trúc liên quan**:
  - Sẽ khởi tạo `CR-006` khi bước vào giai đoạn thiết kế nội dung.

---

## 📈 Quy tắc Đồng bộ Tài liệu Bắt buộc (Synchronization Protocol)
Khi bất kỳ Change Request (CR) nào chuyển trạng thái sang `Done`:
1. Dev bắt buộc phải rà soát và cập nhật nội dung thay đổi tương ứng vào [GDD.md](GDD.md) (nếu thay đổi luật chơi) và [TDD.md](TDD.md) (nếu thay đổi cấu trúc mã nguồn/kiểu dữ liệu).
2. Cập nhật trạng thái và ngày hoàn thành của CR đó trong [CR.md](CR.md).
3. Đánh dấu mốc tiến độ tương ứng trong [ROADMAP.md](ROADMAP.md).
