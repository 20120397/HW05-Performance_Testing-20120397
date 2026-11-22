# Báo Cáo Kiểm Toán Tương Tác AI (AI Audit Report)

**Tuyên bố bắt buộc (Mandatory Declaration — Mục 9):**  
> **I use AI tools for the following tasks:**  
> 1. Phân tích đặc tả API (`api_specification.md`) và mã nguồn (`server.js`, `database.js`) để chọn luồng End-to-End Web Admin Dashboard & Product CRUD không trùng lặp với thành viên cùng nhóm, phân tách thành 3 nhóm endpoint (Auth-heavy, Read-heavy, Transactional).  
> 2. Thiết kế từng bước 4 kịch bản JMeter `.jmx` có tham số hóa CSV (`admin_credentials.csv`, `products_payload.csv`), JSON correlation (`jwt_token`, `created_product_id`), timer và 3 loại report listener khác nhau.  
> 3. Xây dựng script tự động khởi chạy SUT, seed dữ liệu qua API, giám sát CPU/RAM tiến trình `node.exe`, phân tích raw `.jtl` (`analyze_jtl.js`) và phản biện lại các lỗi diễn giải / đề xuất ảo của AI.  
> 4. Đề xuất mô hình Continuous Performance Testing (CPT), đóng gói Agent Skill (`SKILL.md`), và xuất bản bộ tài liệu báo cáo Markdown/PDF.

---

## Nhật Ký Chi Tiết Từng Tương Tác AI (Interaction Log)

### Tương tác 1 — Lựa chọn Workflow & Phân nhóm Endpoint (Chuẩn bị Scope)
- **Tên công cụ AI (Name of the AI tool):** Antigravity Assistant (Gemini)
- **Ngày và giờ (Date and time):** 2026-11-22 21:31 (+07:00)
- **Prompt đầu vào (User Prompt):**
  > Đọc đề bài `2026.HW05.Performance Testing_En.pdf`, `api_specification.md` và `eshop-sut/backend/server.js`. Đề xuất các luồng End-to-End khác hoàn toàn với workflow của thành viên cùng nhóm (`Login -> Search products -> Product detail -> Add to cart -> Checkout không coupon`) mà vẫn phủ đủ 3 nhóm Auth-heavy, Read-heavy và Transactional.
- **Kết quả phản hồi của AI (AI Output):**
  - Đề xuất 3 lựa chọn phân tách rõ ràng; sau khi người dùng chọn **Option 2 — Web Admin Dashboard & Product CRUD**, AI ánh xạ 7 API cụ thể: `POST /api/login` (Auth-heavy, FR-02), `GET /api/admin/orders`, `GET /api/admin/users`, `GET /api/categories` (Read-heavy, FR-18/FR-19/FR-14), và `POST /api/products` -> `PUT /api/products/:id` -> `DELETE /api/products/:id` (Transactional, FR-15).
- **Đánh giá & Chỉnh sửa của Con người (Human Review & Action):**
  - Xác nhận không trùng bất kỳ endpoint nào với thành viên cùng nhóm (trừ khái niệm đăng nhập chung nhưng ở đây sử dụng vai trò Admin và dữ liệu `admin_credentials.csv` riêng biệt).

---

### Tương tác 2 — Thiết kế Tham số & Sinh 4 JMeter Test Plans (Task 1 — Design & Generate)
- **Tên công cụ AI (Name of the AI tool):** Antigravity Assistant (Gemini)
- **Ngày và giờ (Date and time):** 2026-11-22 21:42 (+07:00)
- **Prompt đầu vào (User Prompt):**
  > Thiết kế thông số Thread Count, Ramp-up, Duration và Gaussian Random Timer cho 4 kịch bản Load, Stress, Spike và Endurance (10 phút). Tạo hai tệp CSV `admin_credentials.csv` và `products_payload.csv`, đồng thời sinh 4 tệp `.jmx` đúng chuẩn JMeter 5.6.3 với 3 loại Listener không trùng lặp cho Load/Stress/Spike (`Summary Report`, `Aggregate Report`, `View Results Tree`) và `Response Time Graph` cho Endurance.
- **Kết quả phản hồi của AI (AI Output):**
  - Sinh `scripts/generate-jmx.js` tạo ra `20120397_Load_20261122.jmx` (20 VU/20s/120s), `20120397_Stress_20261122.jmx` (100 VU/60s/120s), `20120397_Spike_20261122.jmx` (150 VU/5s/60s), và `20120397_Endurance_20261122.jmx` (15 VU/15s/600s).
- **Đánh giá & Chỉnh sửa của Con người (Human Review & Action):**
  - Rà soát và bổ sung: (1) seed thêm 9 tài khoản `admin1..admin9@eshop.com` và 5 đơn hàng thật để `GET /api/admin/orders` thực hiện phép `LEFT JOIN` thật thay vì trả mảng rỗng; (2) thêm kiểm tra chuỗi JSON body (`"token"`, `"Product created"`, `"Product updated"`, `"Product deleted"`) thay vì chỉ kiểm tra mã `200`; (3) tạo `scripts/log4j2-cli.xml` để loại bỏ `GuiLogEvent` khỏi CLI logging.

---

### Tương tác 3 — Thực thi Kiểm thử, Giám sát Tài nguyên & Xác minh Lockout (Task 1 — Execution)
- **Tên công cụ AI (Name of the AI tool):** Antigravity Assistant (Gemini)
- **Ngày và giờ (Date and time):** 2026-11-22 21:45 (+07:00) -> 22:04 (+07:00)
- **Prompt đầu vào (User Prompt):**
  > Xây dựng `scripts/run-scenario.ps1` khởi động `node server.js`, seed dữ liệu, đo CPU/RAM tiến trình `node.exe` mỗi 2 giây và chạy lần lượt 4 kịch bản JMeter để thu raw `.jtl` cùng HTML report. Đồng thời chạy `scripts/verify-lockout-and-bugs.js` để kiểm chứng cơ chế lockout và lỗi bảo mật API.
- **Kết quả phản hồi của AI (AI Output):**
  - Chạy thành công `verify` và cả 4 kịch bản: Load (`4,371` samples), Stress (`37,719` samples), Spike (`36,610` samples), Endurance 10 phút (`17,496` samples) với đầy đủ raw `.jtl`, HTML dashboard và `resource-usage-*.csv`.
- **Đánh giá & Chỉnh sửa của Con người (Human Review & Action):**
  - Phát hiện JMeter non-GUI mặc định vẫn khởi tạo `GuiPackage` gây lỗi truy cập Registry `Software\JavaSoft\Prefs` trong sandbox; đã chuyển chạy ngoài sandbox có kiểm soát (`BypassSandbox: true`) và thêm xử lý pipe xuống dòng tránh lệnh `pause` trong `jmeter.bat` treo tiến trình khi lỗi.

---

### Tương tác 4 — Phân tích Kết quả Bằng AI & Truy tìm Lỗi Diễn giải (Task 2 — Misinterpretation Hunt)
- **Tên công cụ AI (Name of the AI tool):** Antigravity Assistant (Gemini)
- **Ngày và giờ (Date and time):** 2026-11-22 22:05 (+07:00)
- **Prompt đầu vào (User Prompt):**
  > Từ bản tóm tắt kết quả Load, Stress, Spike và mức CPU tổng thể (tối đa 5.98%), hãy nhận xét hiệu năng hệ thống, đặt ngưỡng chịu đựng và đề xuất 6 giải pháp tối ưu hóa backend cho EShop.
- **Kết quả phản hồi của AI (AI Output):**
  - AI đưa ra nhận định ban đầu đánh giá thấp tắc nghẽn ở Stress Test (dựa vào `p50 = 7 ms` và CPU hệ thống `4.60%–5.98%`), giả định có lỗi `500/SQLITE_BUSY`, và đề xuất một loạt giải pháp bao gồm bật SQLite WAL, đánh index DB, PM2 Cluster, dựng connection pool 50 kết nối kiểu PgBouncer, hạ `bcrypt` rounds từ 12 xuống 8, và thêm Redis Cluster cho `/api/categories`.
- **Đánh giá & Chỉnh sửa của Con người (Human Review & Action):**
  - Dùng `Agent-Skill/scripts/analyze_jtl.js` đối chiếu trực tiếp raw `.jtl` và đọc lại `server.js`/`database.js` để chỉ ra 5 lỗi diễn giải số liệu (ví dụ Stress `90–120s` `p95` vọt lên `231 ms`, Spike CPU đơn nhân chạm `95.73%`, thực tế `0` HTTP errors) và phân loại rõ 3 đề xuất **Hallucinated** (PgBouncer pool cho SQLite nhúng, `bcrypt` không tồn tại vì `server.js:46` so sánh plaintext, Redis cho bảng 3 dòng).

---

### Tương tác 5 — Đề xuất Pipeline CPT, Đóng gói Agent Skill & Báo cáo (Task 3, Mục 7, 10, 14)
- **Tên công cụ AI (Name of the AI tool):** Antigravity Assistant (Gemini)
- **Ngày và giờ (Date and time):** 2026-11-22 22:08 (+07:00)
- **Prompt đầu vào (User Prompt):**
  > Thiết kế mô hình Continuous Performance Testing kèm sơ đồ luồng và phân tích trade-off (chi phí, báo động giả), đóng gói `Agent-Skill`, viết `main-report.md`, `bug-report.md`, `ai-critique.md` (200–300 từ), `README.md`, xuất toàn bộ sang PDF và lập `double_check.md`.
- **Kết quả phản hồi của AI (AI Output):**
  - Tạo đầy đủ bộ tài liệu Markdown, sơ đồ SVG/PNG, file PDF và các script tái sử dụng.
- **Đánh giá & Chỉnh sửa của Con người (Human Review & Action):**
  - Tự động kiểm đếm số từ cho `reports/ai-critique.md` bảo đảm nằm đúng khoảng `[200, 300]`, kiểm tra 100% số liệu trong `main-report.md` khớp `evidence/ground-truth-metrics.json`, và tách danh sách phần việc thủ công (quay video YouTube >= 6 phút, chụp ảnh `dxdiag` + JMeter/Task Manager).
