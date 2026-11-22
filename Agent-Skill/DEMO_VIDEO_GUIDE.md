# Agent Skill Demonstration Video Guide (Mục 7 — YouTube Link)

> Tài liệu này hướng dẫn bạn quay **Video Demo Agent Skill** (riêng hoặc ghép thành phần cuối của video demo tổng >= 6 phút) để chứng minh việc áp dụng `Agent-Skill/SKILL.md` end-to-end trên nhóm endpoint đã chọn (`Web Admin Dashboard & Product CRUD`).

## Bố cục Video Demo Agent Skill (~2–3 phút)

1. **Giới thiệu Skill (`0:00 – 0:30`)**
   - Mở `Agent-Skill/SKILL.md` và `Agent-Skill/scripts/analyze_jtl.js` trong editor.
   - Giải thích bằng tiếng Việt: Skill chuẩn hóa 4 bước từ phân nhóm endpoint (Auth-heavy, Read-heavy, Transactional), sinh test plan JMeter có CSV + Correlation + Assertions, chạy đo tài nguyên, đến kiểm chứng `.jtl` thô bằng script để phát hiện AI hallucination.

2. **Demo chạy lại Skill trên nhóm endpoint (`0:30 – 1:45`)**
   - Mở terminal tại `D:\KTPM\HW05\20120397`.
   - Chạy lệnh sinh test plan hoặc chạy analyzer trực tiếp trên raw `.jtl`:
     ```powershell
     node Agent-Skill/scripts/analyze_jtl.js results/load/20120397_Load_20261122.jtl evidence/resource-usage-load.csv
     ```
   - Cho thấy script xuất ra JSON chính xác: `samples`, `errorPct`, `throughputRps`, `p50Ms`, `p90Ms`, `p95Ms`, `p99Ms`, `perEndpoint`, `timeWindows30s`, cùng với `workingSetMaxMb` và `cpu1CoreMaxPct`.

3. **Đối chiếu Skill với bài toán chống AI sai lệch (`1:45 – 2:30`)**
   - Mở `main-report.md` phần **Task 2 (Misinterpretation Hunt)** và chỉ ra cách output từ `analyze_jtl.js` lật tẩy các con số AI đọc nhầm hoặc các đề xuất tối ưu hóa ảo (hallucinated).
   - Upload video ở chế độ **Unlisted** trên YouTube và dán link vào `README.md` + `main-report.md`.
