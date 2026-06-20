# Vietnam War Card Game - Bug Tracking System (BUG.md)

## QUY TẮC THỬ THÁCH 5 LƯỢT CHAT BẤT BIẾN (5-Turn Verification Rule)
Để đảm bảo tính ổn định tuyệt đối và ngăn chặn triệt để tình trạng hồi quy lỗi (regression), mọi lỗi được vá thành công phải trải qua một quy trình kiểm duyệt nghiêm ngặt qua 5 lượt phản hồi liên tiếp trước khi được coi là hoàn toàn giải quyết.
1. **Trạng thái khởi đầu**: Khi lỗi được vá, chuyển trạng thái thành `Fixed - Verification Pending [1/5]`.
2. **Tăng tiến trình**: Sau mỗi lượt tương tác/báo cáo tiến độ kế tiếp với người dùng mà không phát hiện lỗi tái phát, bộ đếm tăng thêm 1 đơn vị, từ `[1/5]` -> `[2/5]` -> ... -> `[5/5]`.
3. **Di chuyển vào Lưu trữ**: Lỗi chỉ được phép chuyển xuống bảng `Resolved Archive` khi bộ đếm đạt đủ mức tối đa `[5/5]`.
4. **Xử lý hồi quy**: Nếu lỗi xuất hiện lại ở bất kỳ thời điểm nào trước khi đạt `[5/5]`, bộ đếm sẽ lập tức reset về `Open` hoặc `In Progress` để tiến hành sửa lại.

---

## DANH SÁCH LỖI ĐANG THEO DÕI (ACTIVE BUG TRACKING)

| ID | Mô tả lỗi | Phạm vi ảnh hưởng | Trạng thái hiện tại | Lượt xác minh |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | 5th Special Forces Action Override | Gameplay / Ability Action | Fixed - Verification Pending | `[2/5]` |
| **BUG-002** | 126th SpecOps Boundary Directionality Bug | Pathfinding / Movement | Fixed - Verification Pending | `[2/5]` |
| **BUG-003** | HQ Armor Overkill Calculation Bypass | Battle Engine / Damage calc | Fixed - Verification Pending | `[2/5]` |
| **BUG-004** | Safari Private Mode LocalStorage Quota Exceeded Crash | Client persistence | Fixed - Verification Pending | `[2/5]` |
| **BUG-005** | Mobile Viewport / Iframe Mulligan Stretched & Height Overflow Bug | UI/UX / Mulligan Overlay / CardFrame | **Open - Proposed Solution Pending Review** | `[0/5]` |

---

## THÔNG TIN CHI TIẾT BÁO CÁO LỖI (DETAILED REPORTS)

### BUG-005: Mulligan Screen Layout Stretched & Height Overflow on Mobile/Iframe Viewport
- **Hiện tượng**: Trên các thiết bị di động hoặc trong môi trường hiển thị qua hợt/iFrame (view dọc), các thẻ bài thuộc Mulligan Overlay bị kéo giãn chiều cao, hiển thị quá to, tràn dọc và xếp chồng theo cột đứng đơn lẻ thay vì dàn trải thành bố cục gọn gàng, gây mất khả năng quan sát tổng thể và tràn khỏi khu vực hiển thị của màn hình.
- **Nguyên nhân cốt lõi**:
  1. `CardFrame` tính toán động chiều cao dựa trên tỉ lệ vàng: `height = width * 1.4`. Tuy nhiên, phần tử bọc ngoài trong `MulliganOverlay.tsx` (`<div className="relative">`) không có thuộc tính khống chế kích cỡ `flex-shrink` hoặc chiều rộng/cao cố định đối với container flex-wrap, làm kích thước bị ảnh hưởng bởi không gian trống hoặc hành vi co giãn tự động của trình duyệt.
  2. Việc chỉ dựa vào `Math.min(180, (windowWidth - 48) / 2)` trên màn hình dọc nhỏ khiến thẻ bài chiếm dòng riêng lẻ (do thiết kế flex-wrap dồn hàng), làm cho thẻ bài dãn cục bộ.
  3. Màn hình dọc trên di động có chiều cao rất giới hạn. Khi hiển thị toàn bộ 4 thẻ bài trên 2 hàng kèm theo tiêu đề lớn và nút bấm dài, tổng chiều cao vượt quá chiều cao viewport dẫn đến tràn viền nặng.
- **Giải pháp đề xuất (Proposed Solutions)**:
  - Xem chi tiết trong báo cáo gửi Tech Lead để phê duyệt trước khi thực thi.

---

## BẢNG LƯU TRỮ LỖI ĐÃ GIẢI QUYẾT (RESOLVED ARCHIVE)
*(Hiện chưa có lỗi nào hoàn thành đủ 5 lượt xác minh)*
