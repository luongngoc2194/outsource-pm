# Tài liệu Thiết kế Hệ thống Quản lý Dự án Outsource (Outsource PM)

Bộ tài liệu này tổng hợp toàn bộ thiết kế đã chốt qua 3 lượt (Lượt A, Lượt B, Lượt C) và đã được đồng bộ 100% với bản Prototype tương tác.

## Danh mục Tài liệu

1. **[01-SRS-ERD-Business-Rules-TestCases.md](./01-SRS-ERD-Business-Rules-TestCases.md)**
   * Đề xuất kiến trúc công nghệ (Angular + NestJS + SQLite).
   * Phạm vi nghiệp vụ, Actor, Giả định chuẩn hóa (`1 mm = 22 md`, bước nhập `0.1 md`).
   * Danh sách Use Case (`UC-01` → `UC-09`).
   * Sơ đồ ERD (Mermaid) & Đặc tả chi tiết 9 bảng dữ liệu (`PROJECT`, `PERSONNEL`, `REQUEST`, `REQUEST_MEMBER`, `ALLOCATION_BATCH`, `ALLOCATION_ITEM`, `DOCUMENT`, `ACCEPTANCE_RECORD`, `AUDIT_LOG`).
   * Bảng 9 Quy tắc nghiệp vụ (`BR-01` → `BR-09`) & 8 Ca kiểm thử chuẩn (`TC-01` → `TC-08`).

2. **[02-UI-API-Excel-Specification.md](./02-UI-API-Excel-Specification.md)**
   * Đặc tả Giao diện & Design System theo Prototype ([Main.dc.html](../Main.dc.html) / [prototype.html](../prototype.html)).
   * Danh sách REST API Endpoints & JSON Payload mẫu.
   * Quy cách Import / Export Excel (Định dạng cột, Dry-run kiểm tra lỗi theo dòng, Upsert chống trùng lặp).

3. **[03-Reports-Dashboard-Roadmap.md](./03-Reports-Dashboard-Roadmap.md)**
   * Đặc tả 7 Báo cáo & Cảnh báo quản trị trên Dashboard (hiển thị kép `md` và `mm = md/22`).
   * Lộ trình triển khai từ MVP (Giai đoạn 1) lên Giai đoạn 2.
   * Bảng rà soát đồng bộ toàn cục giữa Lượt A – B – C và Prototype.

## Prototype Giao diện Đã Chốt
* [Main.dc.html](../Main.dc.html) (hoặc [prototype.html](../prototype.html))
