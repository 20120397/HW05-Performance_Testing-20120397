# HW05 — Performance Testing (EShop SUT)

- **Student ID:** `20120397`
- **Email:** `quangtung1112002@gmail.com`
- **Strategy:** AI-First with Human-in-the-loop (`Bloom-AI G9.2 Apply, G9.3 Analyse, G9.4 Collaborate, G9.6 Disrupt`)
- **Public GitHub Repository:** https://github.com/20120397/HW05-Performance_Testing-20120397.git
- **Unlisted YouTube Demo Video:** `[Cập nhật link YouTube Unlisted (>= 6 phút, thuyết minh tiếng Việt) sau khi quay theo DEMO_VIDEO_GUIDE.md]`
- **Agent Skill Demo Video (YouTube):** `[Cập nhật link YouTube demo Agent Skill hoặc gộp vào link video trên]`

---

## 1. Self-Assessment Table (Mục 15)

| No. | Criteria | Grade | Self-Assessed Grade |
| :---: | :--- | :---: | :---: |
| **1** | Task 1 — Load testing | 30 | **28** |
| **2** | Task 1 — Stress testing | 20 | **19** |
| **3** | Task 1 — Spike testing | 20 | **18** |
| **4** | Task 2 — AI analysis + misinterpretation hunt (with correct values from raw logs) | 10 | **10** |
| **5** | Task 3 — Continuous Performance Testing proposal (G9.6) | 10 | **10** |
| **6** | Agent Skills | 10 | **8** |
| | **Total** | **100** | **93** |

> *Lưu ý trước khi nén `.zip` nộp Moodle:* Sau khi hoàn tất quay video YouTube Unlisted (`>= 6 phút`) và chụp 5 ảnh màn hình `dxdiag` + JMeter/Task Manager theo hướng dẫn trong [DEMO_VIDEO_GUIDE.md](./DEMO_VIDEO_GUIDE.md), bạn có thể giữ nguyên hoặc điều chỉnh điểm tự đánh giá trong bảng trên sao cho khớp `<SelfAssessedGrade>` ở tên file `.zip` (`20120397_HW05_AI_Performance_093.zip`).

---

## 2. Test Summary Report (Mục 14)

| Hạng Mục Báo Cáo | Số Lượng / Kết Quả Thực Tế | Tài Liệu Tham Chiếu |
| :--- | :--- | :--- |
| **Workflow End-to-End (Không trùng nhóm)** | **Web Admin Dashboard & Product CRUD:** `Admin Login -> View Admin Orders -> View Admin Users -> View Categories -> Create Product -> Update Product -> Delete Product` | [main-report.md](./main-report.md) |
| **3 Nhóm Endpoint Đã Bao Phủ** | **Auth-heavy:** `POST /api/login` (`FR-02`) • **Read-heavy:** `GET /api/admin/orders` (`FR-18`), `GET /api/admin/users` (`FR-19`), `GET /api/categories` (`FR-14`) • **Transactional:** `POST/PUT/DELETE /api/products` (`FR-15`) | [test-plans/](./test-plans/), [data/](./data/) |
| **Các Kịch Bản Đã Thực Thi** | **4 kịch bản (tổng 96,196 samples, 0% HTTP errors):**<br>• **Load (20 VU / 120s, Summary Report):** `4,371` samples, `36.69 RPS`, `Avg 2.99 ms`, `p95 = 6 ms`, CPU 1-core max `13.25%`, RAM `86.96 MB`<br>• **Stress (100 VU / 120s, Aggregate Report):** `37,719` samples, `315.30 RPS` (đỉnh `481.97 RPS`, gãy tải ở `90–120s` còn `299.80 RPS` với `p95 = 231 ms`), CPU 1-core max `73.63%`, RAM `173.64 MB` (`209.59 MB` Private)<br>• **Spike (150 VU / 5s burst / 60s, View Results Tree):** `36,610` samples, `609.62 RPS` (đỉnh `788.27 RPS` ➔ rơi còn `432.07 RPS` với `p95 = 499 ms`), CPU 1-core max **`95.73%`**, RAM `136.93 MB`<br>• **Endurance / Soak (15 VU / 600s = 10 phút, Response Time Graph):** `17,496` samples, `29.20 RPS`, `Avg 2.97 ms`, `p95 = 6 ms`, CPU 1-core avg `5.51%`, RAM ổn định `82.20 MB` | [results/load/](./results/load/), [results/stress/](./results/stress/), [results/spike/](./results/spike/), [results/endurance/](./results/endurance/) |
| **Ngưỡng Chịu Đựng Phần Cứng (Endurance Threshold)** | Trên máy `Tung` (`AMD Ryzen 7 4800H 16 threads / 15.87 GB RAM`):<br>• **Ngưỡng Soak 10 phút kiểm chứng an toàn:** `29.20 – 36.69 RPS` (`15–20 VU`), `p95 <= 6 ms`, RAM `<= 87 MB` (không leak)<br>• **Trần chịu tải bền vững tối đa khuyến nghị:** **`~350 – 400 RPS`** (`~60–75 VU`), `p95 < 50 ms`<br>• **Điểm bão hòa / gãy tải:** Vượt `481.97 RPS` (`100–150 VU`) khiến CPU đơn nhân bão hòa `95.73%`, `p95` nhảy lên `231–499 ms`, RAM chạm trần `173.64 MB` Working Set (`209.59 MB` Private) | [evidence/ground-truth-metrics.json](./evidence/ground-truth-metrics.json), [evidence/hardware-spec.txt](./evidence/hardware-spec.txt) |
| **Số Lỗi / Vấn Đề Phát Hiện (Bugs & Performance Issues)** | **6 issues:** `BUG-PERF-01` (Stress `p95` tăng 17.7x), `BUG-PERF-02` (Spike bão hòa CPU 1-core `95.73%`), `BUG-AUTH-01` (`login_attempts + 2` khóa sau 2 lần sai), `BUG-SEC-01` (thiếu JWT trên Product CUD), `BUG-SEC-02` (thiếu kiểm tra `role=admin`), `BUG-FUNC-01` (`200 OK` giả với ID không tồn tại) | [reports/bug-report.md](./reports/bug-report.md), [scripts/create-github-issues-api.js](./scripts/create-github-issues-api.js) |
| **Task 2 & Task 3** | Truy tìm **5 lỗi AI diễn giải sai** (kèm số đối chiếu raw `.jtl`), phân loại **6 đề xuất tối ưu** (Feasible vs Hallucinated), và đề xuất pipeline **Continuous Performance Testing** kèm sơ đồ & phân tích trade-off | [main-report.md](./main-report.md), [evidence/cpt-pipeline-flowchart.png](./evidence/cpt-pipeline-flowchart.png) |
| **Agent Skill & Báo Cáo AI** | Reusable Skill (`Agent-Skill/SKILL.md`, `analyze_jtl.js`, `DEMO_VIDEO_GUIDE.md`), AI Audit Report, AI Critique (`273` từ), Git Commit Log | [Agent-Skill/SKILL.md](./Agent-Skill/SKILL.md), [reports/ai-audit-report.md](./reports/ai-audit-report.md), [reports/ai-critique.md](./reports/ai-critique.md), [git-commit-log.txt](./git-commit-log.txt) |
| **Link Video Demo (YouTube Unlisted)** | `[Cập nhật link YouTube sau khi quay theo DEMO_VIDEO_GUIDE.md]` | [DEMO_VIDEO_GUIDE.md](./DEMO_VIDEO_GUIDE.md) |
