# Outsource PM — Hệ thống Quản lý Dự án Outsource Nội bộ (MVP)

Ứng dụng quản lý nỗ lực (`md` / `man-month = md / 22`) và nghiệm thu dự án outsource dành cho Project Leader (1 người dùng, không đăng nhập, tích hợp CSDL SQLite cục bộ, Audit Log, Xóa mềm / Khôi phục, và Nhập / Xuất Excel).

---

## 1. Truy cập & Chạy Ứng dụng

Server đã được khởi chạy sẵn tại:
* **Web UI (Full-stack SQLite)**: http://localhost:3000
* **REST API State**: http://localhost:3000/api/state
* **Mở trực tiếp file HTML**: [Main.dc.html](./Main.dc.html) hoặc [index.html](./index.html) (tự động kết nối tới `http://localhost:3000/api` và hiển thị huy hiệu `● SQLite Online` ở góc dưới Sidebar trái).

### Lệnh điều khiển trong thư mục `d:\qlduan`
```powershell
# Khởi động Backend + SQLite + Web UI tại http://localhost:3000
npm start

# Chạy bộ kiểm thử tự động 8 Test Cases (TC-01 -> TC-08) trên SQLite
npm test
```

---

## 2. Cấu trúc Thư mục Dự án

* **[backend/db.js](./backend/db.js)**: Khởi tạo CSDL SQLite (`node:sqlite`), định nghĩa 9 bảng dữ liệu (`PROJECT`, `PERSONNEL`, `REQUEST`, `REQUEST_MEMBER`, `ALLOCATION_BATCH`, `ALLOCATION_ITEM`, `DOCUMENT`, `ACCEPTANCE_RECORD`, `AUDIT_LOG`), thực thi toàn bộ Business Rules (`BR-01` → `BR-09`), Dry-run & Upsert Excel.
* **[backend/server.js](./backend/server.js)**: REST API Server (`/api/*`) + phục vụ giao diện Web tại `http://localhost:3000`.
* **[backend/data/outsource-pm.db](./backend/data/outsource-pm.db)**: File CSDL SQLite lưu trữ bền vững toàn bộ dữ liệu.
* **[backend/test-rules.js](./backend/test-rules.js)**: Bộ kiểm thử tự động (`TC-01` → `TC-08`) kiểm tra các quy tắc nghiệp vụ trên SQLite.
* **[Main.dc.html](./Main.dc.html)** / **[index.html](./index.html)**: Giao diện người dùng chính thức (theo đúng thiết kế đã chốt, kết nối trực tiếp với REST API SQLite).
* **[frontend/src/app/](./frontend/src/app/app.component.ts)**: Source code module Angular (`AppComponent`, `PmApiService`).
* **[docs/README.md](./docs/README.md)**: Bộ tài liệu thiết kế hệ thống đầy đủ (Lượt A, B, C).
