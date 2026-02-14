# 📜 Project Constitution — SRSMA Student Dashboard

> **This file is LAW.** All schemas, rules, and architectural invariants live here.

---

## Data Schemas

### Input: Excel File Schema

**Folder Hierarchy:** `Data/ → {ClassName}/ → {Subject}.xlsx`

**Each Tab (= one Topic):**
| Row | Col A | Col B | Col C | Col D |
|-----|-------|-------|-------|-------|
| 1 | `"Date"` | Date value (datetime) | `"Total Marks"` | Integer (e.g. 60) |
| 2 | `"Name"` | `"Marks"` | `"Comments"` | *(empty)* |
| 3+ | Student name (string) | Marks (int) or `"AB"` | Comments (string\|null) | *(empty)* |

**LoginData.xlsx (Sheet1):**
| Col A | Col B |
|-------|-------|
| `"username"` | `"password"` |
| Student name | Password string |

### Output: Processed JSON Schema

```json
{
  "SubjectData": {
    "subjectName": "string",
    "className": "string",
    "topics": [{
      "topicName": "string",
      "date": "ISO-8601 string",
      "totalMarks": "number",
      "students": [{
        "name": "string",
        "marks": "number | null",
        "percentage": "number | null",
        "rank": "number | null",
        "comments": "string | null"
      }],
      "classAverage": "number",
      "topperMarks": "number"
    }]
  }
}
```

---

## Behavioral Rules

1. **AB/ABS = Absent**: Marks value `"AB"` or `"ABS"` → `null`. Excluded from rank calculations and class averages. Displayed as "Absent" in the UI.
2. **Rank Tie-Breaking**: Equal marks → same rank. Next rank skips (1, 2, 2, 4).
3. **Parent Isolation**: A logged-in parent sees ONLY their child's data. Username = student name.
4. **Teacher Read-Only**: Teachers view class-wide data but cannot edit via the dashboard.
5. **Comments are Optional**: Null comments → display empty cell, no error.
6. **Date Ordering**: Topics are sorted chronologically by date for all charts.

---

## Architectural Invariants

1. **Data-First**: No tool code written until schemas above are confirmed.
2. **Deterministic Tools**: All scripts in `tools/` are pure-logic, testable, atomic.
3. **SOP-Before-Code**: Architecture SOPs in `architecture/` updated before code changes.
4. **Intermediates are Ephemeral**: Temp data → `.tmp/`, safely deletable.
5. **Payload is Sacred**: Final outputs go to their confirmed cloud destination only.
6. **Schema Validation**: Parser must validate Row 1 headers before processing. Report specific errors (file, sheet, cell).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Vanilla CSS + CSS Modules |
| Charting | Recharts |
| Excel Parsing | SheetJS (`xlsx`) |
| Auth | NextAuth.js + bcrypt |
| Fonts | Inter, Outfit (Google Fonts) |

---

## Maintenance Log

| Date | Change | By |
|------|--------|----|
| 2026-02-14 | Initialized project constitution | System Pilot |
| 2026-02-14 | Added confirmed data schemas from Excel inspection | System Pilot |
| 2026-02-14 | Added behavioral rules and tech stack | System Pilot |
