---
name: eshop-performance-testing-and-log-analysis
description: Reusable Agent Skill for designing data-driven JMeter Load/Stress/Spike/Endurance test plans, auditing raw .jtl logs against AI misinterpretations, and proposing Continuous Performance Testing pipelines for REST APIs.
---

# EShop Performance Testing & JTL Log-Analysis Skill

## 1. Purpose & Scope
This Agent Skill automates and standardizes end-to-end API Performance Testing (Bloom-AI **G9.2 Apply**, **G9.3 Analyse**, **G9.4 Collaborate**, **G9.6 Disrupt**):
1. **Endpoint Group Classification**: Maps any REST API workflow into **Auth-heavy**, **Read-heavy**, and **Transactional** groups without duplicating teammate coverage.
2. **Data-Driven JMeter Plan Generation**: Produces parameterized `.jmx` test plans (Load, Stress, Spike, Endurance) with `CSVDataSet`, `JSONPostProcessor` correlation, `GaussianRandomTimer`, `ResponseAssertion`, and distinct listeners (**Summary Report**, **Aggregate Report**, **View Results Tree**, **Response Time Graph**).
3. **Controlled Execution & Resource Capture**: Boots the target SUT cleanly, seeds test data via REST API, monitors backend CPU/RAM/Threads/Handles, and resets auth lockouts between runs.
4. **Ground-Truth `.jtl` Verification (Anti-Hallucination)**: Parses raw CSV `.jtl` files via `scripts/analyze_jtl.js` to calculate exact percentiles (`p50`, `p90`, `p95`, `p99`), throughput (RPS), error rates, and 30-second soak stability windows, enabling a rigorous human **Misinterpretation Hunt** against AI summaries.

## 2. Inputs Required
- Target SUT Base URL & port (e.g., `http://localhost:3000`)
- Selected non-duplicated workflow covering:
  - **Auth-heavy** endpoint (e.g., `POST /api/login`)
  - **Read-heavy** endpoints (e.g., `GET /api/admin/orders`, `GET /api/admin/users`, `GET /api/categories`)
  - **Transactional** endpoints (e.g., `POST /api/products` -> `PUT /api/products/:id` -> `DELETE /api/products/:id`)
- CSV datasets (`data/admin_credentials.csv`, `data/products_payload.csv`)
- Student ID & date (`{StudentID}_{ScenarioType}_{YYYYMMDD}`)

## 3. Step-by-Step Execution Workflow
1. **Generate `.jmx` Plans**:
   ```bash
   node scripts/generate-jmx.js
   ```
2. **Execute Scenarios & Monitor Backend Resources**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-scenario.ps1 -Scenario load
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-scenario.ps1 -Scenario stress
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-scenario.ps1 -Scenario spike
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-scenario.ps1 -Scenario endurance
   ```
   > Between Stress and Spike runs, restart the backend (or reset `login_attempts = 0, locked_until = NULL`) to clear any triggered account-lockout state.
3. **Compute Ground-Truth Metrics from Raw `.jtl`**:
   ```bash
   node Agent-Skill/scripts/analyze_jtl.js results/load/20120397_Load_20261122.jtl evidence/resource-usage-load.csv
   ```
4. **Human Misinterpretation Hunt**:
   - Feed a summary or subset of metrics to an LLM for baseline interpretation and optimization advice.
   - Cross-check every metric (`p95`, `avg`, `RPS`, `error%`) against `analyze_jtl.js` raw `.jtl` output.
   - Audit every suggested optimization (e.g., WAL mode, connection pool, indexing) against actual SUT source code (`server.js`, `database.js`) to tag **Feasible** vs **Hallucinated**.

## 4. Bundled Scripts & Deliverables
- `scripts/analyze_jtl.js` — Deterministic raw `.jtl` & resource CSV analyzer.
- `DEMO_VIDEO_GUIDE.md` — End-to-end demonstration walkthrough script for recording the skill execution on an endpoint group.
