# 03. Hệ thống Báo cáo / Dashboard, Lộ trình Triển khai & Rà soát Đồng bộ

> **Dự án**: Hệ thống Quản lý Dự án Outsource Nội bộ (Outsource PM)

---

## 1. Hệ thống 7 Báo cáo & Cảnh báo Quản trị (Hiển thị Kép `md` & `mm`)

> **Quy ước tính toán**:
> * Chỉ tổng hợp trên các bản ghi hiệu lực (`is_deleted = FALSE` xuyên suốt chuỗi `PROJECT` → `REQUEST` → `ALLOCATION_BATCH` → `ALLOCATION_ITEM`).
> * Mọi phép cộng tổng đều tính trên đơn vị gốc `md` trước, sau đó mới quy đổi sang `mm = ROUND(md / 22, 2)` ở bước hiển thị cuối cùng để tránh sai số làm tròn cộng dồn.

| Mã BC | Tên Báo cáo / Khối | Nguồn dữ liệu | Công thức & Điều kiện lọc | Mục đích quản trị |
| :--- | :--- | :--- | :--- | :--- |
| **RPT-01** | **Nỗ lực phân bổ theo Dự án** | `PROJECT`, `REQUEST`, `ALLOCATION_BATCH`, `ALLOCATION_ITEM` | • `Ước tính` = `SUM(REQUEST.estimated_md)`<br>• `Chốt` = `SUM(REQUEST.locked_md)`<br>• `Đã phân bổ` = `SUM(ALLOCATION_ITEM.effort_md)`<br>• `Còn lại` = `Chốt - Đã phân bổ` | Theo dõi tổng quỹ nỗ lực (`md` & `mm`) của từng dự án và tiến độ giải ngân effort. |
| **RPT-02** | **Nỗ lực phân bổ theo Nhân sự** | `PERSONNEL`, `ALLOCATION_ITEM`, `ALLOCATION_BATCH`, `REQUEST` | Nhóm theo `personnel_id`:<br>• `Số PYC tham gia` = `COUNT(DISTINCT request_id)`<br>• `Tổng đã phân bổ (md)` = `SUM(effort_md)`<br>• `Quy đổi (mm)` = `SUM(effort_md) / 22`<br>• `Chi tiết theo PYC` | Xem khối lượng đóng góp của từng nhân sự qua các PYC và các tháng. |
| **RPT-03** | **Nỗ lực phân bổ theo Tháng** | `ALLOCATION_BATCH`, `ALLOCATION_ITEM` | Nhóm theo `month_period` (`YYYY-MM`):<br>• `Số đợt` = `COUNT(DISTINCT batch_id)`<br>• `Số PYC` = `COUNT(DISTINCT request_id)`<br>• `Tổng md tháng` = `SUM(effort_md)` (`mm = md/22`) | Đối chiếu sản lượng nghiệm thu từng tháng dương lịch. |
| **RPT-04** | **PYC còn nỗ lực chưa phân bổ** | `REQUEST`, `ALLOCATION_ITEM` | • `remaining_md = locked_md - allocated_md`<br>• Lọc: `remaining_md > 0` và `status != 'Đóng'` | Nhắc Leader các PYC còn dư nỗ lực cần phân bổ tiếp vào cuối tháng (kèm nút **Phân bổ ngay**). |
| **RPT-05** | **PYC đã phân bổ hết nhưng chưa có BBNT** | `REQUEST`, `ALLOCATION_ITEM`, `ACCEPTANCE_RECORD` | • Lọc: `locked_md > 0` VÀ `remaining_md == 0` VÀ chưa có bản ghi `ACCEPTANCE_RECORD` hiệu lực nào gắn với PYC | Cảnh báo các PYC đã làm hết 100% effort chốt nhưng chưa lập Biên bản nghiệm thu. |
| **RPT-06** | **Biên bản nghiệm thu chưa gửi khách** | `ACCEPTANCE_RECORD`, `REQUEST` | • Lọc: `delivery_status = 'chua_gui'` (và PYC cha chưa xóa mềm) | Nhắc gửi biên bản cho khách hàng để chốt nghiệm thu. |
| **RPT-07** | **PYC chậm hạn (Quá Deadline)** | `REQUEST` | • Lọc: `deadline < CURRENT_DATE` VÀ `status NOT IN ('Đã nghiệm thu', 'Đóng')` | Cảnh báo đỏ các PYC bị trễ hạn cam kết với khách hàng. |

---

## 2. Lộ trình Triển khai (MVP → Giai đoạn 2)

| Giai đoạn | Mốc (Milestone) | Hạng mục công việc | Ước lượng |
| :--- | :--- | :--- | :---: |
| **Giai đoạn 1: MVP**<br>*(10.5 – 12.5 md)* | **M1: Khởi tạo & Database**<br>*(2.0 md)* | • Khởi tạo cấu trúc dự án (Backend NestJS + SQLite, Frontend Angular).<br>• Định nghĩa Schema 9 bảng, Seed dữ liệu mẫu (`DA-01`, `DA-02`, `NS01`..`NS04`, `PYC-001`..`PYC-003`).<br>• Tích hợp Audit Log tự động & cơ chế Soft Delete. | ~2.0 md |
| | **M2: Quản lý Dự án, Nhân sự & PYC**<br>*(3.0 md)* | • API & UI Quản lý Dự án (Tạo, sửa, xóa mềm, chuyển đổi dự án).<br>• API & UI Danh mục Nhân sự.<br>• API & UI Quản lý PYC + Gán nhân sự vào PYC (`REQUEST_MEMBER`). | ~3.0 md |
| | **M3: Phân bổ Cuối tháng & Hồ sơ/BBNT**<br>*(3.5 md)* | • Form Phân bổ cuối tháng tính toán real-time (`Chốt`, `Đã PB`, `Đợt này`, `Còn lại`).<br>• Quản lý Hồ sơ dự án & Biên bản nghiệm thu (đổi trạng thái gửi khách).<br>• Màn hình Nhật ký thay đổi (Audit Log) & Đã xóa / Khôi phục. | ~3.5 md |
| | **M4: Báo cáo Dashboard & Excel**<br>*(3.0 md)* | • Màn hình Báo cáo & Dashboard (7 khối báo cáo `md` & `mm`).<br>• Import/Export Excel thực tế (SheetJS/ExcelJS) với Dry-run & Upsert.<br>• Kiểm thử toàn bộ Test Cases `TC-01` → `TC-08`. | ~3.0 md |
| **Giai đoạn 2: Mở rộng**<br>*(7.5 – 9.0 md)* | **M5: Upload File Trực tiếp**<br>*(3.0 md)* | • Cho phép đính kèm file vật lý (PDF/DOCX/XLSX) bên cạnh link SharePoint/Drive.<br>• Xem trước (Preview) PDF biên bản trên trình duyệt. | ~3.0 md |
| | **M6: Sinh Biên bản Tự động từ Word Template**<br>*(2.5 md)* | • Xuất Biên bản nghiệm thu ra file `.docx` theo mẫu chuẩn của công ty/khách hàng từ dữ liệu PYC & đợt phân bổ. | ~2.5 md |
| | **M7: Sao lưu Tự động & Đa đợt linh hoạt**<br>*(2.5 md)* | • Tùy chọn cho phép nhiều đợt nghiệm thu trong cùng 1 tháng (nếu khách yêu cầu).<br>• Tự động sao lưu file SQLite định kỳ. | ~2.5 md |

---

## 3. Bảng Rà soát Đồng bộ Toàn cục (Lượt A – Lượt B – Lượt C – Prototype)

| STT | Điểm rà soát | Quy tắc thống nhất |
| :--- | :--- | :--- |
| **1** | **Quản lý Đa Dự án (`PROJECT`)** | Đã bổ sung đầy đủ vào cả DB Schema, API và giao diện Prototype: chọn dự án ở Sidebar / Thanh công cụ, tạo/sửa/xóa mềm dự án, tự động lọc PYC, Đợt phân bổ, Hồ sơ, BBNT theo dự án đang chọn. |
| **2** | **Khôi phục bản ghi từ Thùng rác** | Khi khôi phục Đợt phân bổ (`ALLOCATION_BATCH`), hệ thống kiểm tra tổng nỗ lực sau khôi phục có vượt `locked_md` của PYC không (`BR-01`). Nếu vượt, chặn khôi phục và thông báo rõ số `md` bị vượt. |
| **3** | **Tự động cập nhật trạng thái PYC khi phân bổ** | Khi PYC đang ở trạng thái `Mới` và được tạo đợt phân bổ đầu tiên hợp lệ (`> 0 md`), hệ thống tự động chuyển trạng thái PYC sang `Đang làm`. |
| **4** | **Đồng bộ công thức `man-month (mm)`** | Mọi báo cáo và thẻ KPI hiển thị `mm = (md / 22).toFixed(2)`. Phép tính tổng luôn cộng trên `md` trước rồi mới chia `22`. |
