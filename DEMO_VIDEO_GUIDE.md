# Hướng Dẫn Quay Video Demo & Chụp Ảnh Minh Chứng Thủ Công (HW05)

> Theo **Mục 6 (Task 1)** và **Mục 11 (Anti-AI-Cheat Constraints)** của đề bài:
> - Video YouTube **Unlisted** dài **ít nhất 6 phút** (có thể ghép 1 video dài hoặc chia clip theo kịch bản), quay **cửa sổ công cụ JMeter và Resource Monitor (Task Manager) trong cùng một khung hình**, kèm **giọng thuyết minh tiếng Việt của chính bạn**.
> - Có video demo **Agent Skill** (Mục 7) — có thể quay nối tiếp thành 1 video ~7–8 phút hoặc 2 link Unlisted riêng.

---

## Phần A: Chuẩn Bị Khung Hình Trước Khi Quay (Bắt Buộc)

1. **Mở Terminal 1 (SUT Backend):**
   ```powershell
   cd D:\KTPM\eshop-sut\backend
   node server.js
   ```
   Mở thêm Terminal 2 chạy script seed 9 tài khoản admin + 5 đơn hàng mẫu:
   ```powershell
   node D:\KTPM\HW05\20120397\scripts\seed-sut.js
   ```
2. **Mở Task Manager (`Ctrl + Shift + Esc`):**
   - Chọn tab **Processes** (hoặc **Details** / **Performance**), tìm tiến trình **`Node.js JavaScript Runtime`** (`server.js`) để thấy rõ cột **CPU %** và **Memory (MB)** theo thời gian thực.
3. **Mở Apache JMeter GUI:**
   - Chạy `D:\KTPM\jmeter\apache-jmeter-5.6.3\apache-jmeter-5.6.3\bin\jmeter.bat`.
   - Sắp xếp **JMeter bên trái** và **Task Manager bên phải** sao cho **cả hai nằm cùng một khung hình**!
4. **Chụp ảnh màn hình `dxdiag` + JMeter + Task Manager:**
   - Bấm `Win + R` -> gõ `dxdiag` -> Enter -> chụp ảnh tab **System** (thấy rõ `Computer Name: Tung`, CPU `AMD Ryzen 7 4800H`, `16384MB RAM`), lưu thành:
     `D:\KTPM\HW05\20120397\evidence\dxdiag-tung.png`
   - Khi chạy từng test plan trong JMeter GUI (hoặc mở `.jtl` vào Listener của từng `.jmx`), chụp ảnh màn hình có **JMeter (đang hiển thị Listener tương ứng) + Task Manager (thấy `node.exe`) trong cùng một ảnh**:
     - `D:\KTPM\HW05\20120397\evidence\screenshot-load-jmeter-taskmgr.png` (mở `20120397_Load_20261122.jmx` -> chọn `Summary Report`)
     - `D:\KTPM\HW05\20120397\evidence\screenshot-stress-jmeter-taskmgr.png` (mở `20120397_Stress_20261122.jmx` -> chọn `Aggregate Report`)
     - `D:\KTPM\HW05\20120397\evidence\screenshot-spike-jmeter-taskmgr.png` (mở `20120397_Spike_20261122.jmx` -> chọn `View Results Tree`)
     - `D:\KTPM\HW05\20120397\evidence\screenshot-endurance-jmeter-taskmgr.png` (mở `20120397_Endurance_20261122.jmx` -> chọn `Response Time Graph`)

> **Mẹo hay:** Bạn có thể mở từng `.jmx` trong JMeter GUI, bấm vào Listener (`Summary Report` / `Aggregate Report` / `View Results Tree`), ở ô **Filename** chọn **`Browse...`** trỏ tới file `.jtl` đã chạy sẵn trong `results/<scenario>/` để hiển thị ngay toàn bộ dữ liệu thật lên bảng GUI, hoặc bấm nút **Start** chạy trực tiếp vài giây trong lúc quay video!

---

## Phần B: Kịch Bản Thuyết Minh Tiếng Việt (Tổng Thời Lượng >= 6 Phút)

### Đoạn 1: Giới thiệu đề bài, Hardware & Workflow (`0:00 – 1:15`)
- *"Chào thầy/cô và các anh/chị trợ giảng, em là sinh viên MSSV 20120397. Hôm nay em xin trình bày bài tập HW05 – Performance Testing trên hệ thống EShop SUT."*
- Mở `evidence/hardware-spec.txt` hoặc `dxdiag` trên màn hình: *"Máy thực nghiệm có hostname là Tung, trùng khớp với các bài HW trước, CPU AMD Ryzen 7 4800H 16 luồng, RAM 16 GB, Windows 11, Node.js v24 và Apache JMeter 5.6.3."*
- *"Để không trùng lặp workflow với thành viên khác trong nhóm, em chọn luồng **Web Admin Dashboard & Product CRUD**, bao phủ 3 nhóm endpoint:*
  - *Auth-heavy: `POST /api/login` (FR-02), có xử lý cơ chế khóa tài khoản.*
  - *Read-heavy: `GET /api/admin/orders` (FR-18, câu JOIN SQL), `GET /api/admin/users` (FR-19), `GET /api/categories` (FR-14).*
  - *Transactional: `POST /api/products` -> trích xuất `created_product_id` -> `PUT /api/products/:id` -> `DELETE /api/products/:id` (FR-15)."*

### Đoạn 2: Kiểm thử Kịch bản 1 — Load Test (`1:15 – 2:30`)
- Mở `test-plans/20120397_Load_20261122.jmx` trong JMeter GUI (cạnh Task Manager).
- Chỉ vào `CSV Data Set Config` (`admin_credentials.csv`, `products_payload.csv`), `JSON Extractor` (`jwt_token`, `created_product_id`), `Response Assertions` và Listener **`Summary Report`**.
- *"Kịch bản Load chạy 20 virtual users, ramp-up 20 giây, kéo dài 120 giây, Think Time Gaussian 500±200ms. Trong Task Manager bên phải, tiến trình `node.exe` tiêu thụ CPU và RAM rất ổn định, không rò rỉ bộ nhớ, error rate thấp."*

### Đoạn 3: Kiểm thử Kịch bản 2 — Stress Test & Lockout Reset (`2:30 – 3:50`)
- Mở `test-plans/20120397_Stress_20261122.jmx` trong JMeter GUI, chọn Listener **`Aggregate Report`** (khác loại với Summary Report).
- *"Kịch bản Stress đẩy lên 100 virtual users, ramp-up 60 giây. Các bạn có thể thấy ở đây p90, p95, p99 tăng rõ khi SQLite và Node.js đơn luồng xử lý ghi đồng thời."*
- Giải thích quy trình reset lockout giữa các lần chạy (restart `server.js` kích hoạt `initDatabase()` + chạy `seed-sut.js` hoặc `UPDATE users SET login_attempts = 0, locked_until = NULL`).

### Đoạn 4: Kiểm thử Kịch bản 3 — Spike Test (`3:50 – 4:50`)
- Mở `test-plans/20120397_Spike_20261122.jmx` trong JMeter GUI, chọn Listener **`View Results Tree`** (loại thứ 3 khác biệt).
- *"Kịch bản Spike bơm đột ngột 150 users chỉ trong 5 giây ramp-up để kiểm tra khả năng chịu tải tức thời. Quan sát Response Code và Latency từng request trong View Results Tree cùng mức CPU tăng vọt ở Task Manager."*

### Đoạn 5: Endurance (Soak Test 10 phút), Task 2 Misinterpretation Hunt, Task 3 & Agent Skill (`4:50 – 6:45`)
- Mở `results/endurance/html-report/index.html` và `evidence/chart-endurance-soak.png`, đọc lại đúng ngưỡng chịu đựng (max stable RPS, RAM ceiling, p95) từ kết quả đo thực tế 10 phút.
- Mở terminal chạy `node Agent-Skill/scripts/analyze_jtl.js results/stress/20120397_Stress_20261122.jtl evidence/resource-usage-stress.csv` để minh họa **Agent Skill** hoạt động thực tế.
- Tóm tắt ngắn gọn 1–2 lỗi AI đọc nhầm số liệu `.jtl` trong **Task 2** và sơ đồ **Continuous Performance Testing** trong **Task 3**.

---

## Phần C: Sau Khi Quay & Chụp Xong
1. Upload video lên YouTube ở chế độ **Unlisted** (lấy URL).
2. Mở `D:\KTPM\HW05\20120397\README.md` và `main-report.md`, thay `[Cập nhật link YouTube sau khi quay]` bằng link YouTube thật.
3. Chạy lại `node D:\KTPM\HW05\20120397\scripts\generate-pdfs.js` để cập nhật `README.pdf` và `main-report.pdf` với ảnh chụp thật & link YouTube thật.
4. Tạo file nén nộp Moodle: `20120397_HW05_AI_Performance_<SelfAssessedGrade>.zip`.
