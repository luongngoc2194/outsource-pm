# Outsource PM — Hệ thống Quản lý Dự án Outsource Nội bộ (MVP)

Ứng dụng quản lý nỗ lực (`md` / `man-month = md / 22`) và nghiệm thu dự án outsource dành cho Project Leader (1 người dùng, không đăng nhập, tích hợp CSDL SQLite cục bộ, Audit Log, Xóa mềm / Khôi phục, và Nhập / Xuất Excel).

---

## 1. Truy cập & Chạy Ứng dụng

### 🚀 Khởi động nhanh bằng 1 cú Click-đúp (Khuyên dùng)
Ngay trên **Desktop (Màn hình chính)** của bạn đã có sẵn các biểu tượng:
* **`Outsource PM`** (Icon màu xanh ngọc): Click đúp để khởi động ngầm cực êm (không hiện cửa sổ đen CMD) và tự động mở trình duyệt `http://localhost:3000`.
* **`Outsource PM - Console`**: Click đúp để khởi động kèm cửa sổ dòng lệnh CMD (dùng khi muốn theo dõi log trực tiếp).
* **`Dừng Outsource PM`**: Click đúp để tắt hoàn toàn máy chủ khi không dùng nữa.

### Các file script tiện ích trong thư mục `d:\qlduan`
* **`start.bat`**: Khởi động server chuẩn, kiểm tra môi trường, tự mở trình duyệt `http://localhost:3000`.
* **`start-hidden.vbs`**: Chạy ngầm server không hiện cửa sổ console, tự mở web.
* **`stop.bat`**: Tắt nhanh server và giải phóng cổng 3000.
* **`tao-shortcut-desktop.bat`**: Tự động tạo lại các Shortcut ra Desktop (tiện lợi khi clone dự án về máy mới).
* **`bat-khoi-dong-cung-windows.bat`**: Bật tự động khởi động Outsource PM cùng Windows (Startup).
* **`tat-khoi-dong-cung-windows.bat`**: Tắt tự động khởi động cùng Windows.

---

## 2. Cấu trúc Thư mục Dự án

* **[backend/db.js](./backend/db.js)**: Khởi tạo CSDL SQLite (`node:sqlite`), định nghĩa 9 bảng dữ liệu (`PROJECT`, `PERSONNEL`, `REQUEST`, `REQUEST_MEMBER`, `ALLOCATION_BATCH`, `ALLOCATION_ITEM`, `DOCUMENT`, `ACCEPTANCE_RECORD`, `AUDIT_LOG`), thực thi toàn bộ Business Rules (`BR-01` → `BR-09`), Dry-run & Upsert Excel.
* **[backend/server.js](./backend/server.js)**: REST API Server (`/api/*`) + phục vụ giao diện Web tại `http://localhost:3000`.
* **[backend/data/outsource-pm.db](./backend/data/outsource-pm.db)**: File CSDL SQLite lưu trữ bền vững toàn bộ dữ liệu.
* **[backend/test-rules.js](./backend/test-rules.js)**: Bộ kiểm thử tự động (`TC-01` → `TC-08`) kiểm tra các quy tắc nghiệp vụ trên SQLite.
* **[Main.dc.html](./Main.dc.html)** / **[index.html](./index.html)**: Giao diện người dùng chính thức (theo đúng thiết kế đã chốt, kết nối trực tiếp với REST API SQLite).
* **[frontend/src/app/](./frontend/src/app/app.component.ts)**: Source code module Angular (`AppComponent`, `PmApiService`).
* **[docs/README.md](./docs/README.md)**: Bộ tài liệu thiết kế hệ thống đầy đủ (Lượt A, B, C).
