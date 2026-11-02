# 02. Thiết kế Giao diện (UI/UX), REST API & Quy cách Import/Export Excel

> **Dự án**: Hệ thống Quản lý Dự án Outsource Nội bộ (Outsource PM)
> **Tham chiếu Prototype**: [Main.dc.html](../Main.dc.html) / [prototype.html](../prototype.html)

---

## 1. Kiến trúc Giao diện & Design System (Theo Prototype Đã Chốt)

### 1.1. Bảng màu & Typography
* **Font chữ**:
  * Giao diện chung: `'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (`13px`).
  * Mã định danh & Số liệu nỗ lực (`md`, `mm`, ngày tháng): `'IBM Plex Mono', monospace` (`font-variant-numeric: tabular-nums`).
* **Bảng màu chuẩn**:
  * Background chính: `#F6F7F9` (`--bg`), Surface/Card: `#FFFFFF`, Surface phụ: `#FAFBFD`.
  * Viền: `#E3E6EC` (`--border`), `#EDEFF3` (`--border-soft`).
  * Text: `#111418` (`--text`), `#525866` (`--text-2`), `#868C98` (`--text-3`).
  * Primary: `#1E40AF` (Hover `#1E3A8A`, Soft `#EFF4FF`).
  * Success (Hợp lệ / Đã gửi / Còn dư): `#15803D` (Soft `#ECFDF3`).
  * Warning (Còn ít / Chưa gửi): `#B45309` (Soft `#FFFBEB`).
  * Danger (Vượt chốt / Trễ hạn / Xóa): `#B91C1C` (Soft `#FEF2F2`).

### 1.2. Bố cục Khung Ứng dụng (App Shell)
* **Sidebar trái cố định (`232px`)**:
  * **Brand**: Logo `OP` + `Outsource PM` (`Leader Workspace · v1.0`).
  * **Khối Dự án đang chọn**: Hiển thị `{{curProj.code}} · {{curProj.name}}`, tên khách hàng và nút **`+ Dự án`** để tạo nhanh dự án mới.
  * **Điều hướng chính**:
    1. **Dự án & PYC**: Quản lý dự án và 5 tab chi tiết (badge số PYC hiệu lực).
    2. **Danh mục nhân sự**: Quản lý nhân sự toàn hệ thống (badge số NS đang làm).
    3. **Báo cáo & Dashboard**: 7 báo cáo quản trị `md` & `mm`.
  * **Hệ thống**:
    4. **Nhật ký thay đổi**: Tra cứu Audit Log (badge tổng số log).
    5. **Đã xóa / Khôi phục**: Thùng rác khôi phục bản ghi xóa mềm (badge số mục đã xóa).
  * **Footer Sidebar**: Quy ước `1 tháng = 22 md · Bước 0.1 md`.
* **Topbar (`52px`)**:
  * Breadcrumb động theo màn hình + dự án đang chọn.
  * Pill quy ước `Đơn vị: md · 1 mm = 22 md`.
  * Nút **Nhập / Xuất Excel** và nút **`+ Tạo đợt phân bổ cuối tháng`**.

### 1.3. Chi tiết Màn hình Dự án & 5 Tab Nghiệp vụ
1. **Thanh Chọn & Quản lý Dự án**:
   * Dropdown chuyển đổi dự án (`DA-01`, `DA-02`, ...), nút **`Sửa dự án`**, **`Xóa dự án`**, **`+ Thêm dự án`**.
   * Khối Header Dự án + 4 thẻ tổng hợp nỗ lực: **Ước tính**, **Nỗ lực chốt**, **Đã phân bổ**, **Còn lại** (hiển thị kép `md` và `mm` + thanh tiến độ `%`).
2. **Tab 1 — Danh sách PYC**:
   * Bộ lọc tìm kiếm, lọc Loại PYC, lọc Trạng thái, nút `+ Thêm PYC`.
   * Bảng PYC: Mã PYC, Tên & Mô tả (kèm người yêu cầu & link ngoài), Loại, Nhận / Hạn (cảnh báo đỏ nếu trễ hạn), Ước tính, **Chốt**, **Đã phân bổ** (kèm progress bar), **Còn lại**, Nhân sự gán (avatar/tag), Trạng thái, Thao tác (`Phân bổ`, `Sửa`, `Xóa`).
3. **Tab 2 — Nhân sự tham gia PYC**:
   * Chọn PYC (kèm nút nhảy nhanh giữa các PYC), nút `+ Gán nhân sự từ danh mục`.
   * Bảng nhân sự trong PYC: Mã NS, Họ tên, Vai trò gốc, **Vai trò trong PYC** (sửa trực tiếp qua dropdown), Trạng thái NS, Đã phân bổ trong PYC này (`md` & `mm`), nút `Gỡ`.
4. **Tab 3 — Phân bổ nỗ lực theo đợt (cuối tháng)**:
   * Lọc theo PYC, nút `+ Tạo đợt phân bổ mới`.
   * Danh sách các Card Đợt phân bổ (`Tháng YYYY-MM` · Mã PYC · Ghi chú đợt · Tổng `md`/`mm` của đợt · Nút `Sửa đợt`, `Xóa mềm đợt`) và bảng các dòng nhân sự bên trong.
5. **Tab 4 — Hồ sơ dự án**:
   * Quản lý link tài liệu gắn với Dự án (tùy chọn gắn PYC), nút `Sửa`, `Xóa`.
6. **Tab 5 — Biên bản nghiệm thu (BBNT)**:
   * Quản lý biên bản theo PYC, trạng thái `Chưa gửi` / `Đã gửi (YYYY-MM-DD)`, nút chuyển nhanh **`Đánh dấu đã gửi`** / **`Chuyển chưa gửi`**, nút `Xuất Excel danh sách BBNT`.

---

## 2. Thiết kế REST API

### 2.1. Danh mục Endpoints

| Phân hệ | Method | Endpoint | Mô tả nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **Dự án (`projects`)** | `GET` | `/api/projects` | Danh sách dự án kèm thống kê nỗ lực (`est_md`, `locked_md`, `allocated_md`, `remaining_md`) |
| | `POST` | `/api/projects` | Tạo mới dự án (kiểm tra trùng `code`) |
| | `PUT` | `/api/projects/:id` | Cập nhật thông tin dự án |
| | `DELETE` | `/api/projects/:id` | Xóa mềm dự án |
| **PYC (`requests`)** | `GET` | `/api/projects/:projectId/requests` | Danh sách PYC của dự án (hỗ trợ lọc `search`, `type`, `status`) |
| | `POST` | `/api/projects/:projectId/requests` | Tạo PYC mới trong dự án |
| | `PUT` | `/api/requests/:id` | Sửa PYC (kiểm tra BR-02 nếu giảm `locked_md`, BR-05 nếu đổi `code`) |
| | `DELETE` | `/api/requests/:id` | Xóa mềm PYC |
| **Gán NS (`members`)** | `POST` | `/api/requests/:id/members` | Gán nhân sự vào PYC (`personnel_id`, `role_in_request`) |
| | `PATCH` | `/api/requests/:id/members/:personnelId` | Đổi vai trò của nhân sự trong PYC |
| | `DELETE` | `/api/requests/:id/members/:personnelId` | Gỡ nhân sự khỏi PYC |
| **Phân bổ (`batches`)** | `GET` | `/api/projects/:projectId/batches` | Danh sách đợt phân bổ trong dự án (lọc theo `request_id`, `month_period`) |
| | `POST` | `/api/requests/:id/batches` | Tạo đợt phân bổ + các dòng chi tiết (kiểm tra BR-01, BR-03, BR-07, BR-08) |
| | `PUT` | `/api/batches/:id` | Cập nhật đợt phân bổ + các dòng chi tiết |
| | `DELETE` | `/api/batches/:id` | Xóa mềm đợt phân bổ |
| **Hồ sơ (`documents`)** | `GET` | `/api/projects/:projectId/documents` | Danh sách hồ sơ tài liệu của dự án |
| | `POST` | `/api/projects/:projectId/documents` | Thêm mới link hồ sơ tài liệu |
| | `PUT` | `/api/documents/:id` | Sửa hồ sơ tài liệu |
| | `DELETE` | `/api/documents/:id` | Xóa mềm hồ sơ tài liệu |
| **Nghiệm thu (`bbnts`)** | `GET` | `/api/projects/:projectId/acceptance-records` | Danh sách biên bản nghiệm thu trong dự án |
| | `POST` | `/api/acceptance-records` | Tạo biên bản nghiệm thu mới |
| | `PUT` | `/api/acceptance-records/:id` | Cập nhật biên bản nghiệm thu |
| | `PATCH` | `/api/acceptance-records/:id/toggle-status` | Chuyển đổi trạng thái `Chưa gửi` ↔ `Đã gửi` |
| | `DELETE` | `/api/acceptance-records/:id` | Xóa mềm biên bản nghiệm thu |
| **Nhân sự (`staff`)** | `GET` | `/api/personnel` | Danh sách nhân sự toàn hệ thống |
| | `POST` | `/api/personnel` | Thêm mới nhân sự |
| | `PUT` | `/api/personnel/:id` | Sửa thông tin / trạng thái nhân sự |
| | `DELETE` | `/api/personnel/:id` | Xóa mềm nhân sự |
| **Báo cáo (`reports`)** | `GET` | `/api/reports/dashboard` | Dữ liệu tổng hợp cho 7 báo cáo quản trị & KPI |
| **Audit & Trash** | `GET` | `/api/audit-logs` | Danh sách nhật ký thay đổi (lọc theo `table_name`, `action`) |
| | `GET` | `/api/trash` | Danh sách tất cả bản ghi đang bị xóa mềm (`is_deleted = true`) |
| | `POST` | `/api/trash/:table/:id/restore` | Khôi phục bản ghi đã xóa mềm |
| **Excel** | `POST` | `/api/excel/import/:type` | Import Excel (`staff`, `pycs`, `batches`) hỗ trợ `dryRun=true/false` |
| | `GET` | `/api/excel/export/:type` | Xuất file Excel (`pycs`, `batches`, `reports`, `bbnts`, `staff`) |

---

### 2.2. Payload Mẫu cho Nghiệp vụ Trọng tâm

#### A. Tạo / Cập nhật Đợt phân bổ (`POST /api/requests/:id/batches`)
* **Request**:
```json
{
  "month_period": "2026-11",
  "note": "Phân bổ cuối tháng 11/2026",
  "lines": [
    { "personnel_id": "NS01", "effort_md": 8.0, "note": "Xử lý bất đồng bộ + xuất PDF" },
    { "personnel_id": "NS03", "effort_md": 3.5, "note": "Kiểm thử tích hợp + hiệu năng" }
  ]
}
```
* **Response `201 Created`**:
```json
{
  "id": "DOT-02",
  "request_id": "PYC-001",
  "month_period": "2026-11",
  "batch_total_md": 11.5,
  "pyc_balance": {
    "locked_md": 30.0,
    "allocated_md": 28.0,
    "remaining_md": 2.0,
    "remaining_mm": 0.09
  }
}
```

#### B. Lỗi vượt nỗ lực chốt (`422 Unprocessable Entity`)
```json
{
  "error": "BR01_EXCEED_LOCKED_MD",
  "message": "Vượt nỗ lực chốt! Tổng sau đợt sẽ là 31.0 md > chốt 30.0 md (vượt 1.0 md)."
}
```

---

## 3. Quy cách Import / Export Excel

### 3.1. Cấu trúc Cột của 3 File Import Mẫu

1. **Danh mục Nhân sự (`Template_NhanSu.xlsx`)**:
   * Cột: `Ma_NS` (*), `Ho_Ten` (*), `Vai_Tro_Chinh` (*), `Trang_Thai` (`dang_lam` / `nghi`), `Ghi_Chu`.
2. **Danh sách PYC (`Template_PYC.xlsx`)**:
   * Cột: `Ma_Du_An` (*), `Ma_PYC` (trống sẽ tự sinh), `Ten_PYC` (*), `Loai` (`CR` / `Bug` / `Dự án mới` / `Hỗ trợ`), `Ngay_Nhan` (`YYYY-MM-DD`), `Han_Hoan_Thanh` (`YYYY-MM-DD`), `No_Luc_Uoc_Tinh` (bước `0.1`), `No_Luc_Chot` (*, bước `0.1`), `Nguoi_Yeu_Cau`, `Link_Ngoai`.
3. **Đợt phân bổ nỗ lực (`Template_PhanBo.xlsx`)**:
   * Cột: `Ma_Du_An` (*), `Ma_PYC` (*), `Thang` (`YYYY-MM`, *), `Ma_NS` (*), `No_Luc_MD` (*, bước `0.1`), `Ghi_Chu`.

### 3.2. Quy tắc Validate & Chế độ Upsert Không Tạo Trùng
* **Dry-run theo dòng**: Khi tải file lên, hệ thống kiểm tra từng dòng theo các quy tắc `BR-01` → `BR-08` và hiển thị bảng kết quả kiểm tra từng dòng (`Hợp lệ: Tạo mới`, `Hợp lệ: Cập nhật (Upsert)`, hoặc `Bị chặn: Lỗi ở dòng #N`).
* **Upsert thông minh (Idempotent)**:
  * Import lại file Nhân sự trùng `Ma_NS` → Cập nhật thông tin nhân sự đó, không nhân bản dòng.
  * Import lại file PYC trùng `(Ma_Du_An, Ma_PYC)` → Cập nhật thông tin PYC (vẫn kiểm tra `No_Luc_Chot >= Đã phân bổ`).
  * Import lại file Phân bổ trùng `(Ma_PYC, Thang, Ma_NS)` → Cập nhật lại `No_Luc_MD` của dòng đó và kiểm tra tổng không vượt số chốt.
